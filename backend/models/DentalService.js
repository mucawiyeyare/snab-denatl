import mongoose from 'mongoose';

const dentalServiceSchema = new mongoose.Schema({
  service_code: {
    type: String,
    unique: true
  },
  service_name: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    enum: ['General Dentistry', 'Orthodontics', 'Endodontics', 'Periodontics', 'Prosthodontics', 'Oral Surgery', 'Cosmetic Dentistry', 'Pediatric Dentistry', 'Diagnostic / X-Ray', 'Other'],
    default: 'General Dentistry'
  },
  description: {
    type: String,
    default: ''
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive'],
    default: 'Active'
  }
}, { timestamps: true });

export default mongoose.model('DentalService', dentalServiceSchema);
