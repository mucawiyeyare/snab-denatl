import mongoose from 'mongoose';

const patientSchema = new mongoose.Schema({
  patient_number: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  telephone: {
    type: String,
    required: true,
    trim: true
  },
  age: {
    type: Number,
    required: true,
    min: 0,
    max: 130
  },
  gender: {
    type: String,
    enum: ['Male', 'Female'],
    required: true
  },
  address: {
    type: String,
    default: ''
  },
  emergency_contact: {
    name: { type: String, default: '' },
    phone: { type: String, default: '' },
    relationship: { type: String, default: '' }
  },
  registration_date: {
    type: Date,
    default: Date.now
  },
  assigned_doctor_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  assigned_doctor_name: {
    type: String,
    default: ''
  },
  primary_doctor_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  medical_info: {
    blood_group: { type: String, default: '' },
    allergies: [{ type: String }],
    chronic_conditions: [{ type: String }],
    current_medications: [{ type: String }],
    bleeding_disorder: { type: Boolean, default: false },
    pregnant: { type: Boolean, default: false },
    notes: { type: String, default: '' }
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive'],
    default: 'Active'
  }
}, { timestamps: true });

// Create text index for quick search by name, phone, or patient_number
patientSchema.index({ name: 'text', telephone: 'text', patient_number: 'text' });

export default mongoose.model('Patient', patientSchema);
