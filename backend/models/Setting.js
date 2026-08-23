import mongoose from 'mongoose';

const settingSchema = new mongoose.Schema({
  clinic_name: {
    type: String,
    default: 'SNAB Dental Clinic'
  },
  tagline: {
    type: String,
    default: 'Specialized Dental Care & Oral Surgery'
  },
  phone: {
    type: String,
    default: '+252 61 5000000'
  },
  email: {
    type: String,
    default: 'info@snabdental.com'
  },
  address: {
    type: String,
    default: 'Mogadishu Main Road, KM4, Somalia'
  },
  website: {
    type: String,
    default: 'www.snabdental.com'
  },
  consultation_fee: {
    type: Number,
    default: 20
  },
  default_lab_test_fee: {
    type: Number,
    default: 3
  },
  currency: {
    type: String,
    default: 'USD'
  },
  currency_symbol: {
    type: String,
    default: '$'
  },
  tooth_numbering_system: {
    type: String,
    enum: ['FDI (Two-digit notation)', 'Universal (1-32)', 'Palmer Notation'],
    default: 'FDI (Two-digit notation)'
  },
  tax_percentage: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

export default mongoose.model('Setting', settingSchema);
