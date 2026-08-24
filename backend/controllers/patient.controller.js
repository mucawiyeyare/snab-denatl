import Patient from '../models/Patient.js';
import Visit from '../models/Visit.js';
import Consultation from '../models/Consultation.js';
import LabResult from '../models/LabResult.js';
import Treatment from '../models/Treatment.js';
import Invoice from '../models/Invoice.js';
import Payment from '../models/Payment.js';
import Followup from '../models/Followup.js';
import Appointment from '../models/Appointment.js';
import LabRequest from '../models/LabRequest.js';
import Prescription from '../models/Prescription.js';
import User from '../models/User.js';
import { generatePatientNumber } from '../utils/generateId.js';
import { logAudit } from '../middleware/audit.js';
import { getDoctorAssignedPatientIds, isPatientAssignedToDoctor } from '../utils/doctorScope.js';

export const getPatients = async (req, res, next) => {
  try {
    const { search, limit = 50, page = 1 } = req.query;
    let query = {};

    // Strict Doctor Scoping: Doctors ONLY see patients assigned to them
    if (req.user?.role === 'Doctor') {
      const assignedIds = await getDoctorAssignedPatientIds(req.user._id);
      query._id = { $in: assignedIds };
    }

    if (search && search.trim()) {
      const searchRegex = { $regex: search.trim(), $options: 'i' };
      const searchConditions = [
        { name: searchRegex },
        { telephone: searchRegex },
        { patient_number: searchRegex }
      ];

      if (query._id) {
        query = {
          _id: query._id,
          $or: searchConditions
        };
      } else {
        query.$or = searchConditions;
      }
    }

    const skip = (Number(page) - 1) * Number(limit);
    const total = await Patient.countDocuments(query);
    const patients = await Patient.find(query)
      .populate('assigned_doctor_id', 'full_name username email')
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
    const patient = await Patient.findById(req.params.id)
      .populate('assigned_doctor_id', 'full_name username email');

    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    // Strict Doctor Scoping: verify patient is assigned to this doctor
    if (req.user?.role === 'Doctor') {
      const isAssigned = await isPatientAssignedToDoctor(req.user._id, patient._id);
      if (!isAssigned) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only view patients assigned to you.'
        });
      }
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
    const {
      name,
      telephone,
      age,
      gender,
      address,
      emergency_contact,
      medical_info,
      doctor_id,
      assigned_doctor_id
    } = req.body;

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

    // Determine assigned doctor
    let targetDoctorId = assigned_doctor_id || doctor_id || (req.user.role === 'Doctor' ? req.user._id : undefined);
    let targetDoctorName = '';

    if (targetDoctorId) {
      const docUser = await User.findById(targetDoctorId);
      if (docUser) {
        targetDoctorName = docUser.full_name || docUser.username;
      }
    }

    const patient = await Patient.create({
      patient_number,
      name: name?.trim() || '',
      telephone: cleanPhone,
      age: Number(age),
      gender: gender || 'Male',
      address: address ? address.trim() : '',
      emergency_contact: emergency_contact || {},
      medical_info: medical_info || {},
      assigned_doctor_id: targetDoctorId,
      assigned_doctor_name: targetDoctorName,
      primary_doctor_id: targetDoctorId
    });

    await logAudit({
      user: req.user,
      action: 'REGISTER_PATIENT',
      entity: 'Patient',
      entity_id: patient._id,
      details: { patient_number: patient.patient_number, name: patient.name, telephone: patient.telephone, assigned_doctor: targetDoctorName }
    });

    const populated = await Patient.findById(patient._id).populate('assigned_doctor_id', 'full_name username email');

    res.status(201).json({
      success: true,
      message: 'Patient registered successfully.',
      data: populated
    });
  } catch (error) {
    next(error);
  }
};

export const updatePatient = async (req, res, next) => {
  try {
    if (req.user?.role === 'Doctor') {
      const isAssigned = await isPatientAssignedToDoctor(req.user._id, req.params.id);
      if (!isAssigned) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only update patients assigned to you.'
        });
      }
    }

    if (req.body.assigned_doctor_id) {
      const docUser = await User.findById(req.body.assigned_doctor_id);
      if (docUser) {
        req.body.assigned_doctor_name = docUser.full_name || docUser.username;
      }
    }

    const patient = await Patient.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    }).populate('assigned_doctor_id', 'full_name username email');

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
    const patient = await Patient.findById(patientId)
      .populate('assigned_doctor_id', 'full_name username email');

    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    // Strict Doctor Scoping: verify patient is assigned to this doctor
    if (req.user?.role === 'Doctor') {
      const isAssigned = await isPatientAssignedToDoctor(req.user._id, patientId);
      if (!isAssigned) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only view records of patients assigned to you.'
        });
      }
    }

    const [visits, consultations, treatments, labResults, invoices, payments, followups, prescriptions] = await Promise.all([
      Visit.find({ patient_id: patientId }).populate('doctor_id', 'full_name username').sort({ visit_date: -1 }),
      Consultation.find({ patient_id: patientId }).populate('doctor_id', 'full_name').sort({ consultation_date: -1 }),
      Treatment.find({ patient_id: patientId }).populate('doctor_id', 'full_name').populate('service_id').sort({ treatment_date: -1 }),
      LabResult.find({ patient_id: patientId }).populate('doctor_id', 'full_name').sort({ result_date: -1 }),
      Invoice.find({ patient_id: patientId })
        .populate('doctor_id', 'full_name username specialization')
        .populate({ path: 'visit_id', select: 'visit_number doctor_id' })
        .sort({ invoice_date: -1 }),
      Payment.find({ patient_id: patientId })
        .populate('received_by', 'full_name username')
        .populate('invoice_id', 'invoice_number items')
        .sort({ payment_date: -1 }),
      Followup.find({ patient_id: patientId }).populate('doctor_id', 'full_name').sort({ followup_date: -1 }),
      Prescription.find({ patient_id: patientId })
        .populate('doctor_id', 'full_name username')
        .populate('visit_id', 'visit_number')
        .sort({ createdAt: -1 })
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
        followups,
        prescriptions
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete patient and cascade related clinical & financial records
// @route   DELETE /api/patients/:id
// @access  Private/Admin
export const deletePatient = async (req, res, next) => {
  try {
    const patient = await Patient.findById(req.params.id);

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    const patientId = patient._id;
    const patientDetails = {
      patient_number: patient.patient_number,
      name: patient.name,
      telephone: patient.telephone
    };

    // Cascade delete related records across all modules
    await Promise.all([
      Patient.findByIdAndDelete(patientId),
      Visit.deleteMany({ patient_id: patientId }),
      Consultation.deleteMany({ patient_id: patientId }),
      Treatment.deleteMany({ patient_id: patientId }),
      LabRequest.deleteMany({ patient_id: patientId }),
      LabResult.deleteMany({ patient_id: patientId }),
      Invoice.deleteMany({ patient_id: patientId }),
      Payment.deleteMany({ patient_id: patientId }),
      Appointment.deleteMany({ patient_id: patientId }),
      Followup.deleteMany({ patient_id: patientId })
    ]);

    await logAudit({
      user: req.user,
      action: 'DELETE_PATIENT',
      entity: 'Patient',
      entity_id: patientId,
      details: patientDetails
    });

    res.json({
      success: true,
      message: `Patient ${patient.name} (${patient.patient_number}) and all associated records deleted successfully.`
    });
  } catch (error) {
    next(error);
  }
};
