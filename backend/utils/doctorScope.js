import User from '../models/User.js';
import Patient from '../models/Patient.js';
import Visit from '../models/Visit.js';
import Appointment from '../models/Appointment.js';
import Consultation from '../models/Consultation.js';
import Treatment from '../models/Treatment.js';

/**
 * Returns an array of Patient ObjectIds assigned to the given doctor.
 * Assignment includes:
 * 1. Patient.assigned_doctor_id or Patient.primary_doctor_id
 * 2. Any Visit where doctor_id matches
 * 3. Any Appointment where doctor_id matches
 * 4. Any Consultation where doctor_id matches
 * 5. Any Treatment where doctor_id matches
 */
export const getDoctorAssignedPatientIds = async (doctorId) => {
  if (!doctorId) return [];
  
  const doctorIds = [doctorId];
  try {
    const userDoc = await User.findById(doctorId);
    if (userDoc?.employee_id) {
      doctorIds.push(userDoc.employee_id);
    }
  } catch (e) {
    // ignore
  }

  const [pFromPatients, pFromVisits, pFromAppts, pFromConsults, pFromTreatments] = await Promise.all([
    Patient.find({
      $or: [
        { assigned_doctor_id: { $in: doctorIds } },
        { primary_doctor_id: { $in: doctorIds } }
      ]
    }).distinct('_id'),
    Visit.find({ doctor_id: { $in: doctorIds } }).distinct('patient_id'),
    Appointment.find({ doctor_id: { $in: doctorIds } }).distinct('patient_id'),
    Consultation.find({ doctor_id: { $in: doctorIds } }).distinct('patient_id'),
    Treatment.find({ doctor_id: { $in: doctorIds } }).distinct('patient_id')
  ]);

  const idSet = new Set([
    ...pFromPatients.map(id => id.toString()),
    ...pFromVisits.filter(Boolean).map(id => id.toString()),
    ...pFromAppts.filter(Boolean).map(id => id.toString()),
    ...pFromConsults.filter(Boolean).map(id => id.toString()),
    ...pFromTreatments.filter(Boolean).map(id => id.toString())
  ]);

  return Array.from(idSet);
};

/**
 * Checks if a specific patient is assigned to a doctor.
 */
export const isPatientAssignedToDoctor = async (doctorId, patientId) => {
  if (!doctorId || !patientId) return false;
  const pIdStr = patientId.toString();
  const assignedIds = await getDoctorAssignedPatientIds(doctorId);
  return assignedIds.includes(pIdStr);
};
