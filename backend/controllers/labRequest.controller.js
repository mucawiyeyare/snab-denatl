import LabRequest from '../models/LabRequest.js';
import LabResult from '../models/LabResult.js';
import LabTest from '../models/LabTest.js';
import Visit from '../models/Visit.js';
import Invoice from '../models/Invoice.js';
import Payment from '../models/Payment.js';
import { generateLabRequestNumber, generateInvoiceNumber, generateReceiptNumber } from '../utils/generateId.js';
import { logAudit } from '../middleware/audit.js';

// Get all lab requests / sessions (supports filtering by status, visit_id, patient_id, search)
export const getLabRequests = async (req, res, next) => {
  try {
    const { visit_id, patient_id, doctor_id, status, payment_status, search } = req.query;
    let filter = {};

    // Strict Doctor Scoping: Doctors ONLY see their assigned lab requests
    if (req.user?.role === 'Doctor') {
      filter.doctor_id = req.user._id;
    } else if (doctor_id) {
      filter.doctor_id = doctor_id;
    }

    if (visit_id) filter.visit_id = visit_id;
    if (patient_id) filter.patient_id = patient_id;
    if (status) filter.status = status;
    if (payment_status) filter.payment_status = payment_status;

    let requests = await LabRequest.find(filter)
      .populate('patient_id', 'name patient_number telephone gender age')
      .populate('doctor_id', 'full_name username')
      .populate('tests.test_id')
      .populate('visit_id', 'visit_number status')
      .sort({ createdAt: -1 });

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      requests = requests.filter(r =>
        r.request_number?.toLowerCase().includes(q) ||
        r.test_name?.toLowerCase().includes(q) ||
        r.patient_id?.name?.toLowerCase().includes(q) ||
        r.patient_id?.telephone?.toLowerCase().includes(q) ||
        r.patient_id?.patient_number?.toLowerCase().includes(q) ||
        r.doctor_id?.full_name?.toLowerCase().includes(q) ||
        (r.tests && r.tests.some(t => t.test_name?.toLowerCase().includes(q)))
      );
    }

    res.json({ success: true, count: requests.length, data: requests });
  } catch (error) {
    next(error);
  }
};

// 1. Doctor sends patient to laboratory (Doctor selects tests & clinical reason -> CREATES ONE REQUEST LETTER)
export const createLabRequest = async (req, res, next) => {
  try {
    const { visit_id, patient_id, test_id, test_ids, reason } = req.body;

    const visit = await Visit.findById(visit_id).populate('patient_id');
    if (!visit) {
      return res.status(404).json({ success: false, message: 'Patient visit not found' });
    }

    // Determine target test IDs
    const targetTestIds = Array.isArray(test_ids) && test_ids.length > 0
      ? test_ids
      : (test_id ? [test_id] : []);

    if (targetTestIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Please select at least one laboratory test' });
    }

    const labTests = await LabTest.find({ _id: { $in: targetTestIds } });
    if (!labTests || labTests.length === 0) {
      return res.status(404).json({ success: false, message: 'Selected lab tests not found' });
    }

    const testItems = labTests.map(t => ({
      test_id: t._id,
      test_name: t.test_name,
      category: t.category || 'General',
      sample_type: t.sample_type || 'Whole Blood / Serum',
      reference_range: t.reference_range || '',
      cost: 0,
      price: 0,
      result: '',
      clinical_interpretation: 'Normal',
      status: 'Pending'
    }));

    const testNamesStr = testItems.map(t => t.test_name).join(', ');
    const request_number = await generateLabRequestNumber();

    // Create ONE unified laboratory request containing all requested tests
    const labRequest = await LabRequest.create({
      request_number,
      visit_id: visit._id,
      patient_id: patient_id || visit.patient_id?._id || visit.patient_id,
      doctor_id: req.user._id,
      tests: testItems,
      test_name: testNamesStr,
      total_cost: 0,
      total_price: 0,
      cost: 0,
      price: 0,
      reason: reason || 'Pre-treatment screening',
      payment_status: 'Unpaid',
      status: 'Pending',
      performed_by: 'Cashier'
    });

    // Update visit status to 'Waiting for Laboratory' so patient moves to Cashier / Lab Queue
    visit.status = 'Waiting for Laboratory';
    visit.status_history.push({
      status: 'Waiting for Laboratory',
      changed_by: req.user._id,
      changed_at: new Date(),
      notes: `Lab request created (${testItems.length} tests: ${testNamesStr}). Sent to Cashier.`
    });
    await visit.save();

    await logAudit({
      user: req.user,
      action: 'REQUEST_LAB_TEST',
      entity: 'LabRequest',
      entity_id: labRequest._id,
      details: {
        request_number,
        patient_name: visit.patient_id?.name,
        test_count: testItems.length,
        tests: testNamesStr
      }
    });

    const populated = await LabRequest.findById(labRequest._id)
      .populate('patient_id')
      .populate('doctor_id', 'full_name username')
      .populate('tests.test_id');

    res.status(201).json({
      success: true,
      message: `Laboratory request (${testItems.length} tests) created and sent to Cashier for ${visit.patient_id?.name || 'patient'}`,
      data: populated
    });
  } catch (error) {
    next(error);
  }
};

// 2. Cashier manages entire laboratory session once (enters cost for each test, enters result, updates billing, sends back to Doctor)
export const processLabSession = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      tests = [],
      cost,
      result,
      notes,
      payment_method = 'Cash',
      mark_paid = true,
      reference_range,
      clinical_interpretation
    } = req.body;

    const labRequest = await LabRequest.findById(id)
      .populate('patient_id')
      .populate('doctor_id');

    if (!labRequest) {
      return res.status(404).json({ success: false, message: 'Laboratory request not found' });
    }

    const staffName = req.user.full_name || req.user.username || 'Cashier';

    // Update test items array with individual costs and results
    let updatedTests = [];
    if (Array.isArray(tests) && tests.length > 0) {
      updatedTests = tests.map(t => {
        const itemCost = t.cost !== undefined && t.cost !== '' && !isNaN(Number(t.cost)) ? Number(t.cost) : 0;
        const itemResult = (t.result || '').trim();
        return {
          test_id: t.test_id || t._id,
          test_name: t.test_name,
          category: t.category || '',
          sample_type: t.sample_type || '',
          reference_range: t.reference_range || '',
          cost: itemCost,
          price: itemCost,
          result: itemResult,
          clinical_interpretation: t.clinical_interpretation || (
            itemResult.toLowerCase().includes('positive') || itemResult.toLowerCase().includes('reactive')
              ? 'Reactive / Positive'
              : itemResult.toLowerCase().includes('negative') || itemResult.toLowerCase().includes('non-reactive')
              ? 'Non-Reactive / Negative'
              : 'Normal'
          ),
          status: itemResult ? 'Completed' : 'Pending'
        };
      });
    } else if (labRequest.tests && labRequest.tests.length > 0) {
      const singleCost = cost !== undefined && !isNaN(Number(cost)) ? Number(cost) : 0;
      updatedTests = labRequest.tests.map((t, idx) => {
        const itemCost = idx === 0 && labRequest.tests.length === 1 ? singleCost : (t.cost || 0);
        const itemResult = idx === 0 && labRequest.tests.length === 1 ? (result || '').trim() : (t.result || '');
        return {
          test_id: t.test_id,
          test_name: t.test_name,
          category: t.category,
          sample_type: t.sample_type,
          reference_range: t.reference_range,
          cost: itemCost,
          price: itemCost,
          result: itemResult,
          clinical_interpretation: t.clinical_interpretation || 'Normal',
          status: itemResult ? 'Completed' : 'Pending'
        };
      });
    } else {
      const singleCost = cost !== undefined && !isNaN(Number(cost)) ? Number(cost) : 0;
      const itemResult = (result || '').trim();
      updatedTests = [{
        test_name: labRequest.test_name || 'Laboratory Test',
        cost: singleCost,
        price: singleCost,
        result: itemResult,
        clinical_interpretation: clinical_interpretation || 'Normal',
        status: itemResult ? 'Completed' : 'Pending'
      }];
    }

    // Unified Testing Cost: single flat rate for the entire lab session (default $3)
    const unifiedFee = cost !== undefined && cost !== '' && !isNaN(Number(cost))
      ? Number(cost)
      : (req.body.testing_fee !== undefined && req.body.testing_fee !== '' && !isNaN(Number(req.body.testing_fee))
        ? Number(req.body.testing_fee)
        : 3);

    const totalCost = unifiedFee;
    const combinedResultsStr = updatedTests.map(t => `${t.test_name}: ${t.result || 'Pending'}`).join(' | ');

    labRequest.tests = updatedTests;
    labRequest.total_cost = totalCost;
    labRequest.total_price = totalCost;
    labRequest.cost = totalCost;
    labRequest.price = totalCost;
    labRequest.result = combinedResultsStr;
    labRequest.notes = notes !== undefined ? notes.trim() : labRequest.notes;
    labRequest.performed_by = staffName;
    labRequest.payment_status = mark_paid && totalCost > 0 ? 'Paid' : (totalCost === 0 ? 'Paid' : 'Unpaid');
    labRequest.status = 'Completed';
    labRequest.completed_date = new Date();
    await labRequest.save();

    // Create / Update individual LabResult records so Doctor sees all results in clinical history
    const createdResults = [];
    for (const t of updatedTests) {
      if (t.result) {
        const labRes = await LabResult.create({
          request_id: labRequest._id,
          visit_id: labRequest.visit_id,
          patient_id: labRequest.patient_id?._id || labRequest.patient_id,
          doctor_id: labRequest.doctor_id?._id || labRequest.doctor_id,
          test_name: t.test_name,
          cost: totalCost,
          result: t.result,
          reference_range: t.reference_range || '',
          clinical_interpretation: t.clinical_interpretation || 'Normal',
          notes: notes || '',
          performed_by: staffName,
          verification_status: 'Verified',
          result_date: new Date()
        });
        createdResults.push(labRes);
      }
    }

    // Billing & Invoice integration: Single one-time testing fee item for the entire lab request
    if (totalCost > 0) {
      let invoice = await Invoice.findOne({ visit_id: labRequest.visit_id });
      if (!invoice) {
        const invoice_number = await generateInvoiceNumber();
        invoice = await Invoice.create({
          invoice_number,
          patient_id: labRequest.patient_id?._id || labRequest.patient_id,
          doctor_id: labRequest.doctor_id?._id || labRequest.doctor_id,
          visit_id: labRequest.visit_id,
          items: [],
          subtotal: 0,
          total_amount: 0,
          paid_amount: 0,
          balance: 0,
          status: 'Unpaid'
        });
      }

      // Check if Laboratory Testing Fee item already exists
      const testNamesSummary = updatedTests.map(t => t.test_name).join(', ');
      const existingIndex = invoice.items.findIndex(
        it => (it.reference_id?.toString() === labRequest._id.toString()) ||
              (it.item_type === 'LabTest')
      );

      if (existingIndex >= 0) {
        invoice.items[existingIndex].description = `Laboratory Testing Fee (${testNamesSummary})`;
        invoice.items[existingIndex].unit_price = totalCost;
        invoice.items[existingIndex].total_price = totalCost;
        invoice.items[existingIndex].paid_status = mark_paid ? 'Paid' : 'Unpaid';
      } else {
        invoice.items.push({
          item_type: 'LabTest',
          reference_id: labRequest._id,
          description: `Laboratory Testing Fee (${testNamesSummary})`,
          quantity: 1,
          unit_price: totalCost,
          total_price: totalCost,
          paid_status: mark_paid ? 'Paid' : 'Unpaid'
        });
      }

      invoice.subtotal = invoice.items.reduce((acc, item) => acc + item.total_price, 0);
      invoice.total_amount = Math.max(0, invoice.subtotal - (invoice.discount || 0));

      if (mark_paid) {
        invoice.paid_amount = Math.min(invoice.total_amount, (invoice.paid_amount || 0) + totalCost);
        
        // Single payment receipt for the $3 one-time testing fee
        const receipt_number = await generateReceiptNumber();
        await Payment.create({
          receipt_number,
          invoice_id: invoice._id,
          patient_id: labRequest.patient_id?._id || labRequest.patient_id,
          doctor_id: labRequest.doctor_id?._id || labRequest.doctor_id,
          visit_id: labRequest.visit_id,
          payment_category: 'Laboratory Fee',
          amount: totalCost,
          payment_method,
          received_by: req.user._id,
          received_by_name: staffName,
          notes: `Lab testing (${updatedTests.length} tests: ${testNamesSummary}) — Flat Fee: $${totalCost.toFixed(2)}`
        });
      }

      invoice.balance = Math.max(0, invoice.total_amount - (invoice.paid_amount || 0));
      if (invoice.balance === 0 && invoice.paid_amount > 0) {
        invoice.status = 'Paid';
      } else if (invoice.paid_amount > 0) {
        invoice.status = 'Partially Paid';
      } else {
        invoice.status = 'Unpaid';
      }
      await invoice.save();
    }

    // Update Visit status -> 'Returning to Doctor'
    const visit = await Visit.findById(labRequest.visit_id);
    if (visit) {
      visit.status = 'Returning to Doctor';
      visit.status_history.push({
        status: 'Returning to Doctor',
        changed_by: req.user._id,
        changed_at: new Date(),
        notes: `Laboratory results entered by Cashier (${updatedTests.length} tests, Total: $${totalCost}). Sent back to Doctor.`
      });
      await visit.save();
    }

    await logAudit({
      user: req.user,
      action: 'COMPLETE_LAB_SESSION',
      entity: 'LabRequest',
      entity_id: labRequest._id,
      details: {
        request_number: labRequest.request_number,
        test_count: updatedTests.length,
        total_cost: totalCost,
        patient_name: labRequest.patient_id?.name
      }
    });

    res.json({
      success: true,
      message: `Laboratory request (${updatedTests.length} tests) completed and sent back to Doctor!`,
      data: {
        request: labRequest,
        labResults: createdResults
      }
    });
  } catch (error) {
    next(error);
  }
};

// 3. Update status or delete lab request
export const updateLabRequestStatus = async (req, res, next) => {
  try {
    const { status, payment_status, cost, result, notes } = req.body;
    const request = await LabRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ success: false, message: 'Lab request not found' });
    }

    if (status) request.status = status;
    if (payment_status) request.payment_status = payment_status;
    if (cost !== undefined) request.cost = Number(cost);
    if (result !== undefined) request.result = result;
    if (notes !== undefined) request.notes = notes;

    await request.save();
    res.json({ success: true, data: request });
  } catch (error) {
    next(error);
  }
};

export const deleteLabRequest = async (req, res, next) => {
  try {
    const request = await LabRequest.findByIdAndDelete(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Lab request not found' });
    }

    await logAudit({
      user: req.user,
      action: 'DELETE_LAB_REQUEST',
      entity: 'LabRequest',
      entity_id: req.params.id,
      details: { test_name: request.test_name, request_number: request.request_number }
    });

    res.json({ success: true, message: 'Lab request deleted successfully' });
  } catch (error) {
    next(error);
  }
};

