import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  receipt_number: {
    type: String,
    required: true,
    unique: true
  },
  invoice_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice'
  },
  patient_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  doctor_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  visit_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Visit',
    required: true
  },
  payment_category: {
    type: String,
    enum: ['Consultation Fee', 'Laboratory Fee', 'Dental Treatment', 'Final Bill / Consolidated', 'Partial Payment'],
    default: 'Consultation Fee'
  },
  amount: {
    type: Number,
    required: true,
    min: 0.01
  },
  discount: {
    type: Number,
    default: 0,
    min: 0
  },
  remaining_balance: {
    type: Number,
    default: 0
  },
  payment_method: {
    type: String,
    enum: ['Cash', 'Card', 'Mobile Payment', 'Bank Transfer', 'Insurance'],
    default: 'Cash'
  },
  transaction_reference: {
    type: String,
    default: ''
  },
  received_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  received_by_name: {
    type: String
  },
  payment_date: {
    type: Date,
    default: Date.now
  },
  notes: {
    type: String,
    default: ''
  }
}, { timestamps: true });

export default mongoose.model('Payment', paymentSchema);
