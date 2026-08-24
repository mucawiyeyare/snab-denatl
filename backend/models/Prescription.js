import mongoose from 'mongoose';

const prescriptionItemSchema = new mongoose.Schema({
  medicine_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Medicine'
  },
  medicine_name: {
    type: String,
    required: true
  },
  dosage: {
    type: String,
    default: '500 mg'
  },
  frequency: {
    type: String,
    default: '3x daily'
  },
  duration: {
    type: String,
    default: '5 days'
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    default: 1
  },
  unit_price: {
    type: Number,
    default: 0,
    min: 0
  },
  total_price: {
    type: Number,
    default: 0,
    min: 0
  },
  instructions: {
    type: String,
    default: 'Take after meals'
  },
  prn: {
    type: Boolean,
    default: false
  },
  prn_reason: {
    type: String,
    default: ''
  },
  food_relation: {
    type: String,
    enum: ['After Meals', 'Before Meals', 'With Meals', 'Empty Stomach', 'Bedtime', 'Anytime'],
    default: 'After Meals'
  },
  route: {
    type: String,
    default: 'Oral'
  },
  is_injection: {
    type: Boolean,
    default: false
  },
  injection_details: {
    type: String,
    default: ''
  },
  allergy_warning_flag: {
    type: Boolean,
    default: false
  },
  allergy_note: {
    type: String,
    default: ''
  },
  is_purchased: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['Pending', 'Purchased', 'Dispensed', 'Declined / External'],
    default: 'Pending'
  }
}, { _id: true });

const prescriptionSchema = new mongoose.Schema({
  prescription_number: {
    type: String,
    required: true,
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
  items: [prescriptionItemSchema],
  total_amount: {
    type: Number,
    default: 0,
    min: 0
  },
  payment_status: {
    type: String,
    enum: ['Unpaid', 'Partially Paid', 'Paid'],
    default: 'Unpaid'
  },
  dispensed_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  dispensed_by_name: {
    type: String,
    default: ''
  },
  dispensed_date: {
    type: Date
  },
  notes: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['Pending', 'Completed', 'Dispensed', 'Cancelled'],
    default: 'Pending'
  }
}, { timestamps: true });

export default mongoose.model('Prescription', prescriptionSchema);