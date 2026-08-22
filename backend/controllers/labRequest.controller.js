import LabRequest from '../models/LabRequest.js';
import LabTest from '../models/LabTest.js';
import Visit from '../models/Visit.js';
import Invoice from '../models/Invoice.js';
import { generateLabRequestNumber, generateInvoiceNumber } from '../utils/generateId.js';
import { logAudit } from '../middleware/audit.js';

export const getLabRequests = async (req, res, next) => {
  try {
    const { visit_id, patient_id, status, payment_status } = req.query;
    let filter = {};

    if (visit_id) filter.visit_id = visit_id;
    if (patient_id) filter.patient_id = patient_id;
    if (status) filter.status = status;
    if (payment_status) filter.payment_status = payment_status;

    // Self-healing sync: update any unpaid lab requests whose visit invoice is already Paid or has balance 0
    try {
      const unpaidRequests = await LabRequest.find({ payment_status: 'Unpaid' });
      if (unpaidRequests.length > 0) {
        const visitIds = [...new Set(unpaidRequests.map(r => r.visit_id))];
        const paidInvoices = await Invoice.find({
          visit_id: { $in: visitIds },
          $or: [
            { status: 'Paid' },
            { balance: 0, paid_amount: { $gt: 0 } },
            { 'items.item_type': 'LabTest', 'items.paid_status': 'Paid' }
          ]
        });

        for (const inv of paidInvoices) {
          if (inv.status === 'Paid' || inv.balance === 0) {
            await LabRequest.updateMany(
              { visit_id: inv.visit_id, payment_status: 'Unpaid' },
              { payment_status: 'Paid' }
            );
            await LabRequest.updateMany(
              { visit_id: inv.visit_id, status: 'Payment Required' },
              { status: 'Paid' }
            );
          } else {
            for (const item of inv.items) {
              if (item.item_type === 'LabTest' && item.paid_status === 'Paid' && item.reference_id) {
                await LabRequest.updateOne(
                  { _id: item.reference_id, payment_status: 'Unpaid' },
                  { payment_status: 'Paid' }
                );
                await LabRequest.updateOne(
                  { _id: item.reference_id, status: 'Payment Required' },
                  { status: 'Paid' }
                );
              }
            }
          }
        }
      }
    } catch (syncErr) {
      console.error('Lab sync error:', syncErr);
    }

    const requests = await LabRequest.find(filter)
      .populate('patient_id', 'name patient_number telephone gender age')
      .populate('doctor_id', 'full_name username')
      .populate('test_id')
      .populate('visit_id', 'visit_number status')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: requests.length, data: requests });
  } catch (error) {
    next(error);
  }
};

export const createLabRequest = async (req, res, next) => {
  try {
    const { visit_id, patient_id, test_id, test_ids, reason } = req.body;

    const visit = await Visit.findById(visit_id);
    if (!visit) {
      return res.status(404).json({ success: false, message: 'Visit not found' });
    }

    // Determine target test IDs (supports multiple tests / bloods at one time)
    const targetTestIds = Array.isArray(test_ids) && test_ids.length > 0
      ? test_ids
      : (test_id ? [test_id] : []);

    if (targetTestIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Please select at least one laboratory test' });
    }

    const tests = await LabTest.find({ _id: { $in: targetTestIds } });
    if (!tests || tests.length === 0) {
      return res.status(404).json({ success: false, message: 'Selected lab tests not found' });
    }

    // Ensure or find Visit Invoice
    let invoice = await Invoice.findOne({ visit_id: visit._id });
    if (!invoice) {
      const invoice_number = await generateInvoiceNumber();
      invoice = await Invoice.create({
        invoice_number,
        patient_id: visit.patient_id,
        visit_id: visit._id,
        items: [],
        subtotal: 0,
        total_amount: 0,
        paid_amount: 0,
        balance: 0,
        status: 'Unpaid'
      });
    }

    const createdRequests = [];

    for (const test of tests) {
      const request_number = await generateLabRequestNumber();
      const request = await LabRequest.create({
        request_number,
        visit_id,
        patient_id: patient_id || visit.patient_id,
        doctor_id: req.user._id,
        test_id: test._id,
        test_name: test.test_name,
        price: test.price,
        reason: reason || 'Pre-treatment screening / diagnostic investigation',
        payment_status: 'Unpaid',
        status: 'Payment Required'
      });

      invoice.items.push({
        item_type: 'LabTest',
        reference_id: request._id,
        description: `Lab: ${test.test_name} (${test.category})`,
        quantity: 1,
        unit_price: test.price,
        total_price: test.price,
        paid_status: 'Unpaid'
      });

      await logAudit({
        user: req.user,
        action: 'REQUEST_LAB_TEST',
        entity: 'LabRequest',
        entity_id: request._id,
        details: { test_name: test.test_name, price: test.price, request_number }
      });

      createdRequests.push(request);
    }

    // Update Invoice totals
    invoice.subtotal = invoice.items.reduce((acc, item) => acc + item.total_price, 0);
    invoice.total_amount = Math.max(0, invoice.subtotal - (invoice.discount || 0));
    invoice.balance = Math.max(0, invoice.total_amount - (invoice.paid_amount || 0));
    if (invoice.balance > 0 && invoice.paid_amount > 0) {
      invoice.status = 'Partially Paid';
    } else if (invoice.balance > 0) {
      invoice.status = 'Unpaid';
    }
    await invoice.save();

    // Update visit status
    visit.status = 'Laboratory Payment Required';
    const testNamesStr = tests.map(t => t.test_name).join(', ');
    visit.status_history.push({
      status: 'Laboratory Payment Required',
      changed_by: req.user._id,
      changed_at: new Date(),
      notes: `Lab tests requested (${tests.length}): ${testNamesStr}`
    });
    await visit.save();

    const populatedList = await LabRequest.find({ _id: { $in: createdRequests.map(r => r._id) } })
      .populate('patient_id')
      .populate('doctor_id', 'full_name username')
      .populate('test_id');

    res.status(201).json({
      success: true,
      count: populatedList.length,
      data: targetTestIds.length === 1 ? populatedList[0] : populatedList
    });
  } catch (error) {
    next(error);
  }
};

export const updateLabRequestStatus = async (req, res, next) => {
  try {
    const { status, payment_status } = req.body;
    const request = await LabRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ success: false, message: 'Lab request not found' });
    }

    if (status) request.status = status;
    if (payment_status) request.payment_status = payment_status;

    await request.save();

    res.json({ success: true, data: request });
  } catch (error) {
    next(error);
  }
};
