import Payment from '../models/Payment.js';
import Invoice from '../models/Invoice.js';
import Visit from '../models/Visit.js';
import LabRequest from '../models/LabRequest.js';
import Treatment from '../models/Treatment.js';
import { generateReceiptNumber } from '../utils/generateId.js';
import { logAudit } from '../middleware/audit.js';

export const getPayments = async (req, res, next) => {
  try {
    const { patient_id, visit_id, payment_method, date } = req.query;
    let filter = {};

    if (patient_id) filter.patient_id = patient_id;
    if (visit_id) filter.visit_id = visit_id;
    if (payment_method) filter.payment_method = payment_method;

    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      filter.payment_date = { $gte: start, $lte: end };
    }

    const payments = await Payment.find(filter)
      .populate('patient_id', 'name patient_number telephone')
      .populate({
        path: 'visit_id',
        select: 'visit_number doctor_id',
        populate: { path: 'doctor_id', select: 'full_name username specialization' }
      })
      .populate('doctor_id', 'full_name username specialization')
      .populate('received_by', 'full_name username')
      .sort({ payment_date: -1 });

    res.json({ success: true, count: payments.length, data: payments });
  } catch (error) {
    next(error);
  }
};

export const getPaymentById = async (req, res, next) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('patient_id')
      .populate({
        path: 'visit_id',
        populate: { path: 'doctor_id', select: 'full_name username specialization' }
      })
      .populate({
        path: 'invoice_id',
        populate: { path: 'doctor_id', select: 'full_name username specialization' }
      })
      .populate('doctor_id', 'full_name username specialization')
      .populate('received_by', 'full_name username');

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment receipt not found' });
    }

    res.json({ success: true, data: payment });
  } catch (error) {
    next(error);
  }
};

export const recordPayment = async (req, res, next) => {
  try {
    const { invoice_id, visit_id, patient_id, amount, discount, payment_method, payment_category, transaction_reference, notes } = req.body;

    const invoice = await Invoice.findById(invoice_id);
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    const visit = await Visit.findById(visit_id || invoice.visit_id);
    const payAmount = Number(amount);

    if (payAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Payment amount must be greater than 0' });
    }

    // Apply Cashier discount if provided
    const cashierDiscount = Number(discount) || 0;
    if (cashierDiscount > 0) {
      invoice.discount = (invoice.discount || 0) + cashierDiscount;
      invoice.total_amount = Math.max(0, invoice.subtotal - invoice.discount);
    }

    const receipt_number = await generateReceiptNumber();

    const payment = await Payment.create({
      receipt_number,
      invoice_id: invoice._id,
      patient_id: patient_id || invoice.patient_id,
      doctor_id: visit?.doctor_id || invoice?.doctor_id,
      visit_id: visit?._id || invoice.visit_id,
      payment_category: payment_category || 'Final Bill / Consolidated',
      amount: payAmount,
      payment_method: payment_method || 'Cash',
      transaction_reference: transaction_reference || '',
      received_by: req.user._id,
      received_by_name: req.user.full_name || req.user.username,
      notes: notes || (cashierDiscount > 0 ? `Cashier discount applied: $${cashierDiscount}` : '')
    });

    // Update Invoice balances
    invoice.paid_amount = (invoice.paid_amount || 0) + payAmount;
    invoice.balance = Math.max(0, invoice.total_amount - invoice.paid_amount);

    if (invoice.balance <= 0) {
      invoice.status = 'Paid';
      invoice.items.forEach(item => { item.paid_status = 'Paid'; });
    } else {
      invoice.status = 'Partially Paid';
    }
    await invoice.save();

    // Update Visit & related items status based on workflow
    if (visit) {
      // Sync LabRequest payment statuses if invoice is Paid OR if Laboratory Fee was paid
      if (invoice.balance <= 0 || payment_category === 'Laboratory Fee') {
        await LabRequest.updateMany(
          { visit_id: visit._id, payment_status: 'Unpaid' },
          { payment_status: 'Paid' }
        );
        await LabRequest.updateMany(
          { visit_id: visit._id, status: 'Payment Required' },
          { status: 'Paid' }
        );
      }

      if (payment_category === 'Consultation Fee') {
        visit.consultation_paid = true;
        visit.status = 'Waiting for Doctor';
        visit.status_history.push({
          status: 'Waiting for Doctor',
          changed_by: req.user._id,
          changed_at: new Date(),
          notes: `Consultation fee paid (${payAmount}). Directed to Doctor queue.`
        });
      } else if (payment_category === 'Laboratory Fee') {
        visit.status = 'Laboratory Paid';
        visit.status_history.push({
          status: 'Laboratory Paid',
          changed_by: req.user._id,
          changed_at: new Date(),
          notes: `Laboratory fee paid (${payAmount}). Sent for testing.`
        });
      } else {
        // Treatment / Final bill payment
        if (invoice.balance <= 0) {
          visit.status = 'Paid';
          visit.status_history.push({
            status: 'Paid',
            changed_by: req.user._id,
            changed_at: new Date(),
            notes: `Full payment completed (${payAmount}). Receipt: ${receipt_number}`
          });

          await Treatment.updateMany(
            { visit_id: visit._id },
            { payment_status: 'Paid' }
          );
        } else {
          visit.status = 'Payment Pending';
        }
      }
      await visit.save();
    }

    await logAudit({
      user: req.user,
      action: 'RECORD_PAYMENT',
      entity: 'Payment',
      entity_id: payment._id,
      details: { receipt_number, amount: payAmount, method: payment_method, category: payment_category }
    });

    const populatedPayment = await Payment.findById(payment._id)
      .populate('patient_id')
      .populate({
        path: 'visit_id',
        populate: { path: 'doctor_id', select: 'full_name username specialization' }
      })
      .populate({
        path: 'invoice_id',
        populate: { path: 'doctor_id', select: 'full_name username specialization' }
      })
      .populate('doctor_id', 'full_name username specialization')
      .populate('received_by', 'full_name username');

    res.status(201).json({
      success: true,
      message: 'Payment recorded and receipt generated successfully',
      data: populatedPayment
    });
  } catch (error) {
    next(error);
  }
};

export const getDailyCashierSummary = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endToday = new Date();
    endToday.setHours(23, 59, 59, 999);

    const payments = await Payment.find({
      payment_date: { $gte: today, $lte: endToday }
    }).populate('received_by', 'full_name username');

    const totalCollected = payments.reduce((acc, p) => acc + p.amount, 0);

    const byMethod = {
      Cash: 0,
      Card: 0,
      'Mobile Payment': 0,
      'Bank Transfer': 0,
      Insurance: 0
    };

    const byCategory = {
      'Consultation Fee': 0,
      'Laboratory Fee': 0,
      'Dental Treatment': 0,
      'Final Bill / Consolidated': 0,
      'Partial Payment': 0
    };

    payments.forEach(p => {
      if (byMethod[p.payment_method] !== undefined) byMethod[p.payment_method] += p.amount;
      if (byCategory[p.payment_category] !== undefined) byCategory[p.payment_category] += p.amount;
    });

    res.json({
      success: true,
      data: {
        date: today,
        transactionCount: payments.length,
        totalCollected,
        byMethod,
        byCategory,
        transactions: payments
      }
    });
  } catch (error) {
    next(error);
  }
};
