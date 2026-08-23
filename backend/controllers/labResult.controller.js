import LabResult from '../models/LabResult.js';
import LabRequest from '../models/LabRequest.js';
import Visit from '../models/Visit.js';
import { logAudit } from '../middleware/audit.js';

export const getLabResults = async (req, res, next) => {
  try {
    const { visit_id, patient_id, doctor_id } = req.query;
    let filter = {};

    // Strict Doctor Scoping: Doctors ONLY see their assigned lab results
    if (req.user?.role === 'Doctor') {
      filter.doctor_id = req.user._id;
    } else if (doctor_id) {
      filter.doctor_id = doctor_id;
    }

    if (visit_id) filter.visit_id = visit_id;
    if (patient_id) filter.patient_id = patient_id;

    const results = await LabResult.find(filter)
      .populate('patient_id', 'name patient_number telephone gender age')
      .populate('doctor_id', 'full_name username')
      .populate('request_id')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: results.length, data: results });
  } catch (error) {
    next(error);
  }
};

export const createLabResult = async (req, res, next) => {
  try {
    const {
      request_id,
      result,
      reference_range,
      clinical_interpretation,
      notes,
      performed_by
    } = req.body;

    const request = await LabRequest.findById(request_id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Lab request not found' });
    }

    const labResult = await LabResult.create({
      request_id: request._id,
      visit_id: request.visit_id,
      patient_id: request.patient_id,
      doctor_id: request.doctor_id,
      test_name: request.test_name,
      result,
      reference_range: reference_range || '',
      clinical_interpretation: clinical_interpretation || 'Normal',
      notes: notes || '',
      performed_by: performed_by || req.user.full_name || req.user.username,
      verification_status: 'Verified',
      verified_by: req.user._id,
      result_date: new Date()
    });

    // Mark request completed
    request.status = 'Completed';
    await request.save();

    // Update visit status to 'Returning to Doctor'
    const visit = await Visit.findById(request.visit_id);
    if (visit) {
      visit.status = 'Returning to Doctor';
      visit.status_history.push({
        status: 'Returning to Doctor',
        changed_by: req.user._id,
        changed_at: new Date(),
        notes: `Lab result entered for ${request.test_name}: ${result}`
      });
      await visit.save();
    }

    await logAudit({
      user: req.user,
      action: 'ENTER_LAB_RESULT',
      entity: 'LabResult',
      entity_id: labResult._id,
      details: { test_name: request.test_name, result, interpretation: clinical_interpretation }
    });

    const populated = await LabResult.findById(labResult._id)
      .populate('patient_id')
      .populate('doctor_id', 'full_name');

    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    next(error);
  }
};

export const reviewLabResult = async (req, res, next) => {
  try {
    const result = await LabResult.findById(req.params.id);
    if (!result) {
      return res.status(404).json({ success: false, message: 'Lab result not found' });
    }

    result.verification_status = 'Reviewed by Doctor';
    await result.save();

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};
