import mongoose from 'mongoose';

const labResultSchema = new mongoose.Schema({
  request_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LabRequest',
    required: true
  },
  visit_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Visit',
    required: true
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
  test_name: {
    type: String,
    required: true
  },
  cost: {
    type: Number,
    default: 0
  },
  result: {
    type: String,
    required: true
  },
  reference_range: {
    type: String,
    default: ''
  },
  clinical_interpretation: {
    type: String,
    enum: ['Normal', 'Abnormal', 'Reactive / Positive', 'Non-Reactive / Negative', 'Borderline / Inconclusive', 'Informative'],
    default: 'Normal'
  },
  notes: {
    type: String,
    default: ''
  },
  performed_by: {
    type: String,
    default: 'Lab Staff'
  },
  result_date: {
    type: Date,
    default: Date.now
  },
  verification_status: {
    type: String,
    enum: ['Pending Verification', 'Verified', 'Reviewed by Doctor'],
    default: 'Verified'
  },
  verified_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

export default mongoose.model('LabResult', labResultSchema);
