import mongoose from 'mongoose';

const labTestSchema = new mongoose.Schema({
  test_code: {
    type: String,
    unique: true
  },
  test_name: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    trim: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  sample_type: {
    type: String,
    default: 'Blood / Serum'
  },
  reference_range: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive'],
    default: 'Active'
  }
}, { timestamps: true });

export default mongoose.model('LabTest', labTestSchema);
