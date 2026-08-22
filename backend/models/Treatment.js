import mongoose from 'mongoose';

const treatmentSchema = new mongoose.Schema({
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
  service_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DentalService',
    required: true
  },
  service_name: {
    type: String
  },
  tooth_number: {
    type: String, // e.g. '18', '24', 'Upper Arch', 'General / Full Mouth'
    default: 'Full Mouth'
  },
  diagnosis: {
    type: String,
    default: ''
  },
  procedure_details: {
    type: String,
    default: ''
  },
  treatment_notes: {
    type: String,
    default: ''
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  payment_status: {
    type: String,
    enum: ['Unpaid', 'Pending', 'Paid', 'Cancelled'],
    default: 'Unpaid'
  },
  followup_date: {
    type: Date
  },
  treatment_date: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

export default mongoose.model('Treatment', treatmentSchema);
