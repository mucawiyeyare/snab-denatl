import Patient from '../models/Patient.js';
import Visit from '../models/Visit.js';
import Consultation from '../models/Consultation.js';
import LabResult from '../models/LabResult.js';
import Treatment from '../models/Treatment.js';
import Invoice from '../models/Invoice.js';
import Payment from '../models/Payment.js';
import Followup from '../models/Followup.js';
import { generatePatientNumber } from '../utils/generateId.js';
import { logAudit } from '../middleware/audit.js';

export const getPatients = async (req, res, next) => {
  try {
    const { search, limit = 50, page = 1 } = req.query;
    let query = {};

    if (search && search.trim()) {
      const searchRegex = { $regex: search.trim(), $options: 'i' };
      query = {
        $or: [
          { name: searchRegex },
          { telephone: searchRegex },
          { patient_number: searchRegex }
        ]
      };
    }

    const skip = (Number(page) - 1) * Number(limit);
    const total = await Patient.countDocuments(query);
    const patients = await Patient.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    res.json({
      success: true,
      count: patients.length,
      total,
      currentPage: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
      data: patients
    });
  } catch (error) {
    next(error);
  }
};

export const getPatientById = async (req, res, next) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }
    res.json({ success: true, data: patient });
  } catch (error) {
    next(error);
  }
};

export const checkTelephoneAvailability = async (req, res, next) => {
  try {
    const { phone } = req.query;
    if (!phone || !phone.trim()) {
      return res.json({ available: true });
    }
    const cleanPhone = phone.trim();
    const existing = await Patient.findOne({ telephone: cleanPhone });
    if (existing) {
      return res.json({
        available: false,
        message: 'This telephone number is already registered to another patient.',
        existingPatient: {
          _id: existing._id,
          name: existing.name,
          patient_number: existing.patient_number,
          telephone: existing.telephone
        }
      });
    }
    return res.json({
      available: true,
      message: 'Telephone number is available.'
    });
  } catch (error) {
    next(error);
  }
};

export const createPatient = async (req, res, next) => {
  try {
    const { name, telephone, age, gender, address, emergency_contact, medical_info } = req.body;

    if (!telephone || !telephone.trim()) {
      return res.status(400).json({ success: false, message: 'Telephone number is required.' });
    }

    const cleanPhone = telephone.trim();
    const existing = await Patient.findOne({ telephone: cleanPhone });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'This telephone number is already registered to another patient.',
        existingPatient: {
          _id: existing._id,
          name: existing.name,
          patient_number: existing.patient_number,
          telephone: existing.telephone
        }
      });
    }

    const patient_number = await generatePatientNumber();

    const patient = await Patient.create({
      patient_number,
      name: name?.trim() || '',
      telephone: cleanPhone,
      age: Number(age),
      gender: gender || 'Male',
      address: address ? address.trim() : '',
      emergency_contact: emergency_contact || {},
      medical_info: medical_info || {}
    });

    await logAudit({
      user: req.user,
      action: 'REGISTER_PATIENT',
      entity: 'Patient',
      entity_id: patient._id,
      details: { patient_number: patient.patient_number, name: patient.name, telephone: patient.telephone }
    });

    res.status(201).json({
      success: true,
      message: 'Patient registered successfully.',
      data: patient
    });
  } catch (error) {
    next(error);
  }
};

export const updatePatient = async (req, res, next) => {
  try {
    const patient = await Patient.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    await logAudit({
      user: req.user,
      action: 'UPDATE_PATIENT',
      entity: 'Patient',
      entity_id: patient._id,
      details: { patient_number: patient.patient_number, name: patient.name }
    });

    res.json({ success: true, data: patient });
  } catch (error) {
    next(error);
  }
};

// Complete Patient 360 Medical & Financial History
export const getPatientHistory = async (req, res, next) => {
  try {
    const patientId = req.params.id;
    const patient = await Patient.findById(patientId);

    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    const [visits, consultations, treatments, labResults, invoices, payments, followups] = await Promise.all([
      Visit.find({ patient_id: patientId }).populate('doctor_id', 'full_name username').sort({ visit_date: -1 }),
      Consultation.find({ patient_id: patientId }).populate('doctor_id', 'full_name').sort({ consultation_date: -1 }),
      Treatment.find({ patient_id: patientId }).populate('doctor_id', 'full_name').populate('service_id').sort({ treatment_date: -1 }),
      LabResult.find({ patient_id: patientId }).populate('doctor_id', 'full_name').sort({ result_date: -1 }),
      Invoice.find({ patient_id: patientId }).sort({ invoice_date: -1 }),
      Payment.find({ patient_id: patientId }).populate('received_by', 'full_name username').sort({ payment_date: -1 }),
      Followup.find({ patient_id: patientId }).populate('doctor_id', 'full_name').sort({ followup_date: -1 })
    ]);

    res.json({
      success: true,
      data: {
        patient,
        visits,
        consultations,
        treatments,
        labResults,
        invoices,
        payments,
        followups
      }
    });
  } catch (error) {
    next(error);
  }
};
