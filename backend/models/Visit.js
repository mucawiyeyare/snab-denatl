import mongoose from 'mongoose';

export const VISIT_STATUSES = [
  'Registered',
  'Waiting for Payment',
  'Consultation Paid',
  'Waiting for Doctor',
  'With Doctor',
  'Laboratory Payment Required',
  'Laboratory Paid',
  'Waiting for Laboratory',
  'Laboratory Testing',
  'Laboratory Result Ready',
  'Returning to Doctor',
  'Treatment in Progress',
  'Treatment Completed',
  'Payment Pending',
  'Paid',
  'Completed',
  'Follow-up Required',
  'Cancelled'
];

const visitSchema = new mongoose.Schema({
  visit_number: {
    type: String,
    required: true,
    unique: true
  },
  patient_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  doctor_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  visit_date: {
    type: Date,
    default: Date.now
  },
  reason: {
    type: String,
    default: 'General Consultation'
  },
  complaint: {
    type: String,
    default: ''
  },
  visit_type: {
    type: String,
    enum: ['first', 'follow-up', 'emergency', 'review'],
    default: 'follow-up'
  },
  consultation_fee: {
    type: Number,
    required: true,
    default: 3
  },
  consultation_paid: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: VISIT_STATUSES,
    default: 'Registered'
  },
  status_history: [{
    status: { type: String, required: true },
    changed_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    changed_at: { type: Date, default: Date.now },
    notes: { type: String }
  }],
  notes: {
    type: String,
    default: ''
  }
}, { timestamps: true });

export default mongoose.model('Visit', visitSchema);
