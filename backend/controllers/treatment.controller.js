import Treatment from '../models/Treatment.js';
import Visit from '../models/Visit.js';
import DentalService from '../models/DentalService.js';
import Invoice from '../models/Invoice.js';
import Followup from '../models/Followup.js';
import { generateInvoiceNumber } from '../utils/generateId.js';
import { logAudit } from '../middleware/audit.js';

export const getTreatments = async (req, res, next) => {
  try {
    const { visit_id, patient_id, doctor_id } = req.query;
    let filter = {};
    if (visit_id) filter.visit_id = visit_id;
    if (patient_id) filter.patient_id = patient_id;
    if (doctor_id) filter.doctor_id = doctor_id;

    const treatments = await Treatment.find(filter)
      .populate('patient_id', 'name patient_number telephone')
      .populate('doctor_id', 'full_name username')
      .populate('service_id')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: treatments.length, data: treatments });
  } catch (error) {
    next(error);
  }
};

export const createTreatment = async (req, res, next) => {
  try {
    const {
      visit_id,
      patient_id,
      service_id,
      tooth_number,
      tooth_numbers,
      diagnosis,
      procedure_details,
      treatment_notes,
      price,
      discount,
      followup_date,
      followup_instructions
    } = req.body;

    const visit = await Visit.findById(visit_id);
    if (!visit) {
      return res.status(404).json({ success: false, message: 'Visit not found' });
    }

    const service = await DentalService.findById(service_id);
    const servicePrice = price !== undefined ? Number(price) : (service?.price || 0);

    const teethTarget = tooth_numbers && Array.isArray(tooth_numbers)
      ? tooth_numbers.join(', ')
      : (tooth_number || 'Full Mouth');

    const treatment = await Treatment.create({
      visit_id,
      patient_id: patient_id || visit.patient_id,
      doctor_id: req.user._id,
      service_id,
      service_name: service?.service_name || 'Dental Procedure',
      tooth_number: teethTarget,
      diagnosis: diagnosis || '',
      procedure_details: procedure_details || '',
      treatment_notes: treatment_notes || '',
      price: servicePrice,
      payment_status: 'Unpaid',
      followup_date: followup_date ? new Date(followup_date) : undefined
    });

    // Auto-create followup if date provided
    if (followup_date) {
      await Followup.create({
        patient_id: visit.patient_id,
        visit_id: visit._id,
        doctor_id: req.user._id,
        followup_date: new Date(followup_date),
        reason: `Follow-up for ${service?.service_name || 'Treatment'} (Teeth: ${teethTarget})`,
        instructions: followup_instructions || 'Check healing and restoration integrity.',
        status: 'Pending'
      });
    }

    // Attach item to Visit Invoice
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
        discount: 0,
        status: 'Unpaid'
      });
    }

    invoice.items.push({
      item_type: 'Treatment',
      reference_id: treatment._id,
      description: `${service?.service_name || 'Dental Procedure'} (Tooth: ${teethTarget})`,
      quantity: 1,
      unit_price: servicePrice,
      total_price: servicePrice,
      paid_status: 'Unpaid'
    });

    // If Doctor provided a discount on this treatment/visit, add or update it
    if (discount && Number(discount) > 0) {
      invoice.discount = (invoice.discount || 0) + Number(discount);
    }

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
    visit.status = 'Payment Pending';
    visit.status_history.push({
      status: 'Payment Pending',
      changed_by: req.user._id,
      changed_at: new Date(),
      notes: `Treatment completed: ${service?.service_name || 'Procedure'} on ${teethTarget}`
    });
    await visit.save();

    await logAudit({
      user: req.user,
      action: 'RECORD_TREATMENT',
      entity: 'Treatment',
      entity_id: treatment._id,
      details: { service_name: service?.service_name, tooth: tooth_number, price: servicePrice }
    });

    const populated = await Treatment.findById(treatment._id)
      .populate('patient_id')
      .populate('doctor_id', 'full_name username')
      .populate('service_id');

    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    next(error);
  }
};

export const updateTreatment = async (req, res, next) => {
  try {
    const treatment = await Treatment.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    }).populate('service_id');

    if (!treatment) {
      return res.status(404).json({ success: false, message: 'Treatment not found' });
    }

    await logAudit({
      user: req.user,
      action: 'UPDATE_TREATMENT',
      entity: 'Treatment',
      entity_id: treatment._id,
      details: { service_name: treatment.service_name, tooth: treatment.tooth_number }
    });

    res.json({ success: true, data: treatment });
  } catch (error) {
    next(error);
  }
};
