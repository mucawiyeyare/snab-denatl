import Appointment from '../models/Appointment.js';
import { logAudit } from '../middleware/audit.js';

export const getAppointments = async (req, res, next) => {
  try {
    const { doctor_id, patient_id, date, status } = req.query;
    let filter = {};

    // Strict Doctor Scoping: Doctors ONLY see their assigned appointments
    if (req.user?.role === 'Doctor') {
      filter.doctor_id = req.user._id;
    } else if (doctor_id) {
      filter.doctor_id = doctor_id;
    }

    if (patient_id) filter.patient_id = patient_id;
    if (status) filter.status = status;

    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      filter.appointment_date = { $gte: start, $lte: end };
    }

    const appointments = await Appointment.find(filter)
      .populate('patient_id', 'name patient_number telephone age gender')
      .populate('doctor_id', 'full_name username email')
      .sort({ appointment_date: 1, appointment_time: 1 });

    res.json({ success: true, count: appointments.length, data: appointments });
  } catch (error) {
    next(error);
  }
};

export const createAppointment = async (req, res, next) => {
  try {
    const { patient_id, doctor_id, appointment_date, appointment_time, reason, notes } = req.body;

    const targetDoctorId = (req.user?.role === 'Doctor') ? req.user._id : (doctor_id || req.user._id);

    const appointment = await Appointment.create({
      patient_id,
      doctor_id: targetDoctorId,
      appointment_date: new Date(appointment_date),
      appointment_time,
      reason,
      notes: notes || '',
      status: 'Scheduled'
    });

    await logAudit({
      user: req.user,
      action: 'BOOK_APPOINTMENT',
      entity: 'Appointment',
      entity_id: appointment._id,
      details: { appointment_date, appointment_time, reason }
    });

    const populated = await Appointment.findById(appointment._id)
      .populate('patient_id')
      .populate('doctor_id', 'full_name username');

    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    next(error);
  }
};

export const updateAppointmentStatus = async (req, res, next) => {
  try {
    const { status, notes } = req.body;
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    if (req.user?.role === 'Doctor' && appointment.doctor_id?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied. You can only update your own appointments.' });
    }

    if (status) appointment.status = status;
    if (notes !== undefined) appointment.notes = notes;

    await appointment.save();

    res.json({ success: true, data: appointment });
  } catch (error) {
    next(error);
  }
};

export const deleteAppointment = async (req, res, next) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    if (req.user?.role === 'Doctor' && appointment.doctor_id?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied. You can only cancel your own appointments.' });
    }

    appointment.status = 'Cancelled';
    await appointment.save();

    res.json({ success: true, message: 'Appointment cancelled' });
  } catch (error) {
    next(error);
  }
};
