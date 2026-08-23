import Consultation from '../models/Consultation.js';
import Visit from '../models/Visit.js';
import { logAudit } from '../middleware/audit.js';

export const getConsultations = async (req, res, next) => {
  try {
    const { visit_id, patient_id, doctor_id } = req.query;
    let filter = {};

    // Strict Doctor Scoping: Doctors ONLY see their assigned consultations
    if (req.user?.role === 'Doctor') {
      filter.doctor_id = req.user._id;
    } else if (doctor_id) {
      filter.doctor_id = doctor_id;
    }

    if (visit_id) filter.visit_id = visit_id;
    if (patient_id) filter.patient_id = patient_id;

    const consultations = await Consultation.find(filter)
      .populate('doctor_id', 'full_name username')
      .populate('patient_id', 'name patient_number telephone')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: consultations.length, data: consultations });
  } catch (error) {
    next(error);
  }
};

export const createConsultation = async (req, res, next) => {
  try {
    const { visit_id, patient_id, complaint, examination, diagnosis, treatment_decision, prescriptions, doctor_notes } = req.body;

    const visit = await Visit.findById(visit_id);
    if (!visit) {
      return res.status(404).json({ success: false, message: 'Visit not found' });
    }

    const consultation = await Consultation.create({
      visit_id,
      patient_id: patient_id || visit.patient_id,
      doctor_id: req.user._id,
      complaint: complaint || {},
      examination: examination || {},
      diagnosis: diagnosis || { primary_diagnosis: 'Dental Examination' },
      treatment_decision: treatment_decision || 'Immediate Treatment',
      prescriptions: prescriptions || [],
      doctor_notes: doctor_notes || ''
    });

    // Automatically transition visit status based on decision
    let nextStatus = 'With Doctor';
    if (treatment_decision === 'Laboratory Test Required') {
      nextStatus = 'Laboratory Payment Required';
    } else if (treatment_decision === 'Immediate Treatment') {
      nextStatus = 'Treatment in Progress';
    }

    visit.status = nextStatus;
    visit.status_history.push({
      status: nextStatus,
      changed_by: req.user._id,
      changed_at: new Date(),
      notes: `Consultation recorded: ${diagnosis?.primary_diagnosis || 'Diagnosis entered'}`
    });
    await visit.save();

    await logAudit({
      user: req.user,
      action: 'RECORD_CONSULTATION',
      entity: 'Consultation',
      entity_id: consultation._id,
      details: { visit_id, diagnosis: diagnosis?.primary_diagnosis, decision: treatment_decision }
    });

    const populated = await Consultation.findById(consultation._id).populate('doctor_id', 'full_name');
    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    next(error);
  }
};

export const updateConsultation = async (req, res, next) => {
  try {
    const consultation = await Consultation.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    }).populate('doctor_id', 'full_name');

    if (!consultation) {
      return res.status(404).json({ success: false, message: 'Consultation not found' });
    }

    await logAudit({
      user: req.user,
      action: 'UPDATE_CONSULTATION',
      entity: 'Consultation',
      entity_id: consultation._id,
      details: { visit_id: consultation.visit_id }
    });

    res.json({ success: true, data: consultation });
  } catch (error) {
    next(error);
  }
};
