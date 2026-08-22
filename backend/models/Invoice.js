import mongoose from 'mongoose';

const invoiceItemSchema = new mongoose.Schema({
  item_type: {
    type: String,
    enum: ['Consultation', 'LabTest', 'Treatment', 'X-Ray', 'Other'],
    required: true
  },
  reference_id: {
    type: mongoose.Schema.Types.ObjectId
  },
  description: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    default: 1
  },
  unit_price: {
    type: Number,
    required: true,
    min: 0
  },
  total_price: {
    type: Number,
    required: true,
    min: 0
  },
  paid_status: {
    type: String,
    enum: ['Unpaid', 'Paid'],
    default: 'Unpaid'
  }
}, { _id: true });

const invoiceSchema = new mongoose.Schema({
  invoice_number: {
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
    ref: 'User'
  },
  visit_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Visit',
    required: true
  },
  items: [invoiceItemSchema],
  subtotal: {
    type: Number,
    required: true,
    default: 0
  },
  discount: {
    type: Number,
    default: 0
  },
  total_amount: {
    type: Number,
    required: true,
    default: 0
  },
  paid_amount: {
    type: Number,
    default: 0
  },
  balance: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['Unpaid', 'Partially Paid', 'Paid', 'Refunded', 'Cancelled'],
    default: 'Unpaid'
  },
  invoice_date: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

export default mongoose.model('Invoice', invoiceSchema);
