import Invoice from '../models/Invoice.js';
import Visit from '../models/Visit.js';
import { logAudit } from '../middleware/audit.js';

export const getInvoices = async (req, res, next) => {
  try {
    const { status, patient_id, visit_id } = req.query;
    let filter = {};

    if (status) filter.status = status;
    if (patient_id) filter.patient_id = patient_id;
    if (visit_id) filter.visit_id = visit_id;

    const invoices = await Invoice.find(filter)
      .populate('patient_id', 'name patient_number telephone')
      .populate({
        path: 'visit_id',
        select: 'visit_number status doctor_id',
        populate: { path: 'doctor_id', select: 'full_name username specialization' }
      })
      .populate('doctor_id', 'full_name username specialization')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: invoices.length, data: invoices });
  } catch (error) {
    next(error);
  }
};

export const getInvoiceById = async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('patient_id')
      .populate({
        path: 'visit_id',
        populate: { path: 'doctor_id', select: 'full_name username specialization' }
      })
      .populate('doctor_id', 'full_name username specialization');

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    res.json({ success: true, data: invoice });
  } catch (error) {
    next(error);
  }
};

export const getVisitInvoice = async (req, res, next) => {
  try {
    const invoice = await Invoice.findOne({ visit_id: req.params.visitId })
      .populate('patient_id')
      .populate({
        path: 'visit_id',
        populate: { path: 'doctor_id', select: 'full_name username specialization' }
      })
      .populate('doctor_id', 'full_name username specialization');

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'No invoice found for this visit' });
    }

    res.json({ success: true, data: invoice });
  } catch (error) {
    next(error);
  }
};

export const applyDiscount = async (req, res, next) => {
  try {
    const { discount } = req.body;
    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    const discountAmount = Number(discount) || 0;
    invoice.discount = discountAmount;
    invoice.total_amount = Math.max(0, invoice.subtotal - discountAmount);
    invoice.balance = Math.max(0, invoice.total_amount - invoice.paid_amount);

    if (invoice.balance === 0 && invoice.total_amount > 0) {
      invoice.status = 'Paid';
      invoice.items.forEach(item => { item.paid_status = 'Paid'; });
      await LabRequest.updateMany(
        { visit_id: invoice.visit_id, payment_status: 'Unpaid' },
        { payment_status: 'Paid' }
      );
      await LabRequest.updateMany(
        { visit_id: invoice.visit_id, status: 'Payment Required' },
        { status: 'Paid' }
      );
      await Treatment.updateMany(
        { visit_id: invoice.visit_id },
        { payment_status: 'Paid' }
      );
    } else if (invoice.paid_amount > 0 && invoice.balance > 0) {
      invoice.status = 'Partially Paid';
    } else {
      invoice.status = 'Unpaid';
    }

    await invoice.save();

    await logAudit({
      user: req.user,
      action: 'APPLY_DISCOUNT',
      entity: 'Invoice',
      entity_id: invoice._id,
      details: { invoice_number: invoice.invoice_number, discount: discountAmount, new_total: invoice.total_amount }
    });

    res.json({ success: true, data: invoice });
  } catch (error) {
    next(error);
  }
};
