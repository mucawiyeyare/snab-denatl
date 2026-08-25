import mongoose from 'mongoose';

const medicineSchema = new mongoose.Schema({
  medicine_code: {
    type: String,
    unique: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  generic_name: {
    type: String,
    default: '',
    trim: true
  },
  category: {
    type: String,
    required: true,
    enum: [
      'Antibiotics',
      'Pain Relief / Analgesic',
      'Anti-inflammatory (NSAID)',
      'Mouthwash & Antiseptic',
      'Anesthetics',
      'Injections & Cartridges',
      'Dermatologic & Topicals',
      'Vitamins & Supplements',
      'Other'
    ],
    default: 'Antibiotics'
  },
  dosage_form: {
    type: String,
    enum: [
      'Tablet',
      'Capsule',
      'Syrup',
      'Oral Gel / Cream',
      'Mouthwash',
      'Injection',
      'Injection (IM/IV/SC)',
      'Dental Cartridge (Anesthetic)',
      'Vial / Ampoule',
      'Drops',
      'Ointment'
    ],
    default: 'Tablet'
  },
  route_of_administration: {
    type: String,
    enum: [
      'Oral',
      'Dental Infiltration / Nerve Block',
      'Intramuscular (IM)',
      'Intravenous (IV)',
      'Subcutaneous (SC)',
      'Topical / Oral Mucosa',
      'Sublingual',
      'Ophthalmic',
      'Otic'
    ],
    default: 'Oral'
  },
  strength: {
    type: String,
    default: '500 mg'
  },
  is_injection: {
    type: Boolean,
    default: false
  },
  batch_number: {
    type: String,
    default: ''
  },
  expiry_date: {
    type: Date
  },
  unit_price: {
    type: Number,
    required: true,
    min: 0,
    default: 2.00
  },
  cost_price: {
    type: Number,
    min: 0,
    default: 1.00
  },
  stock_quantity: {
    type: Number,
    default: 100,
    min: 0
  },
  reorder_level: {
    type: Number,
    default: 20
  },
  instructions_default: {
    type: String,
    default: 'Take after meals as directed'
  },
  status: {
    type: String,
    enum: ['In Stock', 'Low Stock', 'Out of Stock', 'Expired', 'Expiring Soon', 'Inactive'],
    default: 'In Stock'
  }
}, { timestamps: true });

medicineSchema.pre('save', function() {
  if (this.stock_quantity <= 0) {
    this.status = 'Out of Stock';
  } else if (this.stock_quantity <= this.reorder_level) {
    this.status = 'Low Stock';
  } else if (this.status !== 'Inactive') {
    this.status = 'In Stock';
  }
});

export default mongoose.model('Medicine', medicineSchema);