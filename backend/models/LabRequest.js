import mongoose from 'mongoose';

const labRequestItemSchema = new mongoose.Schema({
  test_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LabTest'
  },
  test_name: {
    type: String,
    required: true
  },
  category: {
    type: String,
    default: 'General'
  },
  sample_type: {
    type: String,
    default: 'Whole Blood / Serum'
  },
  reference_range: {
    type: String,
    default: ''
  },
  cost: {
    type: Number,
    default: 0,
    min: 0
  },
  price: {
    type: Number,
    default: 0,
    min: 0
  },
  result: {
    type: String,
    default: ''
  },
  clinical_interpretation: {
    type: String,
    enum: ['Normal', 'Abnormal', 'Reactive / Positive', 'Non-Reactive / Negative', 'Borderline / Inconclusive', 'Informative'],
    default: 'Normal'
  },
  status: {
    type: String,
    enum: ['Pending', 'Completed'],
    default: 'Pending'
  }
}, { _id: true });

const labRequestSchema = new mongoose.Schema({
  request_number: {
    type: String,
    unique: true
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
  reason: {
    type: String,
    default: 'Pre-treatment screening'
  },
  // Grouped list of all requested tests under this single letter / order
  tests: [labRequestItemSchema],

  // Summary and backward compatibility fields
  test_name: {
    type: String,
    default: ''
  },
  total_cost: {
    type: Number,
    default: 0,
    min: 0
  },
  total_price: {
    type: Number,
    default: 0,
    min: 0
  },
  cost: {
    type: Number,
    default: 0,
    min: 0
  },
  price: {
    type: Number,
    default: 0,
    min: 0
  },
  result: {
    type: String,
    default: ''
  },
  notes: {
    type: String,
    default: ''
  },
  performed_by: {
    type: String,
    default: 'Cashier'
  },
  payment_status: {
    type: String,
    enum: ['Unpaid', 'Paid', 'Refunded'],
    default: 'Unpaid'
  },
  status: {
    type: String,
    enum: ['Pending', 'Completed', 'Cancelled', 'Payment Required', 'Paid', 'Requested'],
    default: 'Pending'
  },
  request_date: {
    type: Date,
    default: Date.now
  },
  completed_date: {
    type: Date
  }
}, { timestamps: true });

export default mongoose.model('LabRequest', labRequestSchema);
