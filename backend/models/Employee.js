import mongoose from 'mongoose';

const employeeSchema = new mongoose.Schema({
  employee_id: {
    type: String,
    unique: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  position: {
    type: String,
    required: true,
    trim: true
  },
  department: {
    type: String,
    default: 'Dental Clinic'
  },
  specialization: {
    type: String,
    default: ''
  },
  hire_date: {
    type: Date,
    default: Date.now
  },
  salary: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['Active', 'On Leave', 'Inactive', 'Terminated'],
    default: 'Active'
  }
}, { timestamps: true });

export default mongoose.model('Employee', employeeSchema);
