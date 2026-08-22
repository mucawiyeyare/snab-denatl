import Visit from '../models/Visit.js';
import Patient from '../models/Patient.js';
import User from '../models/User.js';
import Invoice from '../models/Invoice.js';
import Setting from '../models/Setting.js';
import Consultation from '../models/Consultation.js';
import LabRequest from '../models/LabRequest.js';
import LabResult from '../models/LabResult.js';
import Treatment from '../models/Treatment.js';
import Payment from '../models/Payment.js';
import Followup from '../models/Followup.js';
import { generateVisitNumber, generateInvoiceNumber } from '../utils/generateId.js';
import { logAudit } from '../middleware/audit.js';

export const getVisits = async (req, res, next) => {
  try {
    const { status, doctor_id, patient_id, today, search } = req.query;
    let filter = {};

    if (status) filter.status = status;
    if (doctor_id) filter.doctor_id = doctor_id;
    if (patient_id) filter.patient_id = patient_id;

    if (today === 'true') {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);
      filter.visit_date = { $gte: startOfDay, $lte: endOfDay };
    }

    let visits = await Visit.find(filter)
      .populate('patient_id')
      .populate('doctor_id', 'full_name username email')
      .sort({ createdAt: -1 });

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      visits = visits.filter(v => 
        v.visit_number?.toLowerCase().includes(q) ||
        v.patient_id?.name?.toLowerCase().includes(q) ||
        v.patient_id?.telephone?.toLowerCase().includes(q) ||
        v.patient_id?.patient_number?.toLowerCase().includes(q)
      );
    }

    res.json({ success: true, count: visits.length, data: visits });
  } catch (error) {
    next(error);
  }
};

export const getVisitById = async (req, res, next) => {
  try {
    const visit = await Visit.findById(req.params.id)
      .populate('patient_id')
      .populate('doctor_id', 'full_name username email');

    if (!visit) {
      return res.status(404).json({ success: false, message: 'Visit not found' });
    }

    const [consultations, labRequests, labResults, treatments, invoices, payments, followups] = await Promise.all([
      Consultation.find({ visit_id: visit._id }).populate('doctor_id', 'full_name'),
      LabRequest.find({ visit_id: visit._id }).populate('doctor_id', 'full_name').populate('test_id'),
      LabResult.find({ visit_id: visit._id }).populate('doctor_id', 'full_name'),
      Treatment.find({ visit_id: visit._id }).populate('doctor_id', 'full_name').populate('service_id'),
      Invoice.find({ visit_id: visit._id }),
      Payment.find({ visit_id: visit._id }).populate('received_by', 'full_name username'),
      Followup.find({ visit_id: visit._id })
    ]);

    res.json({
      success: true,
      data: {
        visit,
        consultations,
        labRequests,
        labResults,
        treatments,
        invoices,
        payments,
        followups
      }
    });
  } catch (error) {
    next(error);
  }
};

export const createVisit = async (req, res, next) => {
  try {
    const { patient_id, doctor_id, reason, complaint, visit_type } = req.body;

    const patient = await Patient.findById(patient_id);
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    const isFirstVisit = visit_type === 'first';
    const visit_number = await generateVisitNumber();

    // Fetch consultation fee from settings or use provided value if this is a first visit
    let consultationFee = 0;
    if (isFirstVisit) {
      if (req.body.consultation_fee !== undefined && req.body.consultation_fee !== '' && !isNaN(Number(req.body.consultation_fee))) {
        consultationFee = Number(req.body.consultation_fee);
      } else {
        const settings = await Setting.findOne();
        consultationFee = settings?.consultation_fee !== undefined ? settings.consultation_fee : 3;
      }
    }

    const isFeeRequired = isFirstVisit && consultationFee > 0;

    const visit = await Visit.create({
      visit_number,
      patient_id,
      doctor_id,
      reason: reason || 'General Dental Consultation',
      complaint: complaint || '',
      visit_type: visit_type || 'follow-up',
      consultation_fee: isFirstVisit ? consultationFee : 0,
      consultation_paid: !isFeeRequired,
      status: isFeeRequired ? 'Waiting for Payment' : 'Waiting for Doctor',
      status_history: [{
        status: isFeeRequired ? 'Waiting for Payment' : 'Waiting for Doctor',
        changed_by: req.user._id,
        changed_at: new Date(),
        notes: isFeeRequired
          ? `First Visit - Consultation fee $${consultationFee} applied`
          : isFirstVisit
          ? 'First Visit - Free Consultation (No fee) - Queued for Doctor'
          : 'Visit created at Reception - Queued for Doctor'
      }]
    });

    // Create consultation invoice for first visits
    if (isFirstVisit && consultationFee > 0) {
      const invoice_number = await generateInvoiceNumber();
      await Invoice.create({
        invoice_number,
        visit_id:   visit._id,
        patient_id: patient._id,
        doctor_id:  doctor_id,
        items: [{
          item_type: 'Consultation',
          description: 'Consultation Fee – First Visit',
          quantity: 1,
          unit_price: consultationFee,
          total_price: consultationFee,
          paid_status: 'Unpaid'
        }],
        subtotal:     consultationFee,
        discount:     0,
        total_amount: consultationFee,
        paid_amount:  0,
        balance:      consultationFee,
        status:       'Unpaid'
      });
    }

    await logAudit({
      user: req.user,
      action: 'CREATE_VISIT',
      entity: 'Visit',
      entity_id: visit._id,
      details: { visit_number: visit.visit_number, patient_name: patient.name, visit_type, consultationFee }
    });

    const populatedVisit = await Visit.findById(visit._id).populate('patient_id').populate('doctor_id', 'full_name username');
    res.status(201).json({
      success: true,
      message: isFirstVisit
        ? `First visit created with $${consultationFee} consultation fee`
        : 'Patient visit created and queued for Doctor',
      data: populatedVisit
    });
  } catch (error) {
    next(error);
  }
};

export const updateVisitStatus = async (req, res, next) => {
  try {
    const { status, notes } = req.body;
    const visit = await Visit.findById(req.params.id);

    if (!visit) {
      return res.status(404).json({ success: false, message: 'Visit not found' });
    }

    visit.status = status;
    visit.status_history.push({
      status,
      changed_by: req.user._id,
      changed_at: new Date(),
      notes: notes || `Status updated to ${status}`
    });

    await visit.save();

    await logAudit({
      user: req.user,
      action: 'UPDATE_VISIT_STATUS',
      entity: 'Visit',
      entity_id: visit._id,
      details: { visit_number: visit.visit_number, new_status: status }
    });

    const updated = await Visit.findById(visit._id).populate('patient_id').populate('doctor_id', 'full_name username');
    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};
