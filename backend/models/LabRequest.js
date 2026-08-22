import mongoose from 'mongoose';

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
  test_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LabTest',
    required: true
  },
  test_name: {
    type: String
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  reason: {
    type: String,
    default: 'Pre-treatment screening / diagnostic investigation'
  },
  payment_status: {
    type: String,
    enum: ['Unpaid', 'Paid', 'Refunded'],
    default: 'Unpaid'
  },
  status: {
    type: String,
    enum: ['Requested', 'Payment Required', 'Paid', 'Sample Collected', 'Testing', 'Completed', 'Cancelled'],
    default: 'Payment Required'
  },
  request_date: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

export default mongoose.model('LabRequest', labRequestSchema);
