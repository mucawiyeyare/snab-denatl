import mongoose from 'mongoose';

const followupSchema = new mongoose.Schema({
  patient_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  visit_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Visit',
    required: true
  },
  doctor_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  followup_date: {
    type: Date,
    required: true
  },
  reason: {
    type: String,
    default: 'Routine dental treatment follow-up & check-up'
  },
  instructions: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['Pending', 'Attended', 'Missed', 'Rescheduled', 'Cancelled'],
    default: 'Pending'
  }
}, { timestamps: true });

export default mongoose.model('Followup', followupSchema);
