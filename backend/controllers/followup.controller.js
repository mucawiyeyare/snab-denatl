import Followup from '../models/Followup.js';
import { logAudit } from '../middleware/audit.js';

export const getFollowups = async (req, res, next) => {
  try {
    const { doctor_id, patient_id, status, upcoming } = req.query;
    let filter = {};

    if (doctor_id) filter.doctor_id = doctor_id;
    if (patient_id) filter.patient_id = patient_id;
    if (status) filter.status = status;

    if (upcoming === 'true') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      filter.followup_date = { $gte: today };
    }

    const followups = await Followup.find(filter)
      .populate('patient_id', 'name patient_number telephone age gender')
      .populate('doctor_id', 'full_name username')
      .populate('visit_id', 'visit_number')
      .sort({ followup_date: 1 });

    res.json({ success: true, count: followups.length, data: followups });
  } catch (error) {
    next(error);
  }
};

export const createFollowup = async (req, res, next) => {
  try {
    const { patient_id, visit_id, doctor_id, followup_date, reason, instructions } = req.body;

    const followup = await Followup.create({
      patient_id,
      visit_id,
      doctor_id: doctor_id || req.user._id,
      followup_date: new Date(followup_date),
      reason: reason || 'Dental treatment follow-up',
      instructions: instructions || '',
      status: 'Pending'
    });

    await logAudit({
      user: req.user,
      action: 'SCHEDULE_FOLLOWUP',
      entity: 'Followup',
      entity_id: followup._id,
      details: { followup_date, reason }
    });

    const populated = await Followup.findById(followup._id)
      .populate('patient_id')
      .populate('doctor_id', 'full_name');

    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    next(error);
  }
};

export const updateFollowupStatus = async (req, res, next) => {
  try {
    const { status, instructions } = req.body;
    const followup = await Followup.findById(req.params.id);

    if (!followup) {
      return res.status(404).json({ success: false, message: 'Follow-up record not found' });
    }

    if (status) followup.status = status;
    if (instructions !== undefined) followup.instructions = instructions;

    await followup.save();

    res.json({ success: true, data: followup });
  } catch (error) {
    next(error);
  }
};
