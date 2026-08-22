import mongoose from 'mongoose';

const dentalInventorySchema = new mongoose.Schema({
  item_code: {
    type: String,
    unique: true
  },
  name: {
    type: String,
    required: [true, 'Device/Material name is required'],
    trim: true
  },
  category: {
    type: String,
    required: true,
    enum: [
      'Dental Materials & Composites',
      'Orthodontic Supplies',
      'Surgical Instruments & Burs',
      'Anesthetics & Pharmaceuticals',
      'Diagnostic & X-Ray Supplies',
      'PPE & Sterilization',
      'Prosthodontic & Impression',
      'Equipment & Handpieces',
      'General Consumables'
    ],
    default: 'Dental Materials & Composites'
  },
  quantity_purchased: {
    type: Number,
    required: [true, 'Quantity purchased is required'],
    min: 0,
    default: 0
  },
  unit_price: {
    type: Number,
    required: [true, 'Unit price is required'],
    min: 0,
    default: 0
  },
  total_purchase_cost: {
    type: Number,
    default: 0
  },
  supplier: {
    type: String,
    required: [true, 'Supplier is required'],
    trim: true
  },
  purchase_date: {
    type: Date,
    default: Date.now
  },
  quantity_used: {
    type: Number,
    default: 0,
    min: 0
  },
  quantity_available: {
    type: Number,
    default: 0,
    min: 0
  },
  expiry_date: {
    type: Date
  },
  batch_lot_number: {
    type: String,
    trim: true
  },
  reorder_level: {
    type: Number,
    default: 5
  },
  status: {
    type: String,
    enum: ['In Stock', 'Low Stock', 'Out of Stock', 'Expired'],
    default: 'In Stock'
  },
  notes: {
    type: String,
    trim: true
  }
}, { timestamps: true });

// Pre-save hook to calculate total cost and available stock & status
dentalInventorySchema.pre('save', function (next) {
  this.total_purchase_cost = (this.quantity_purchased || 0) * (this.unit_price || 0);
  this.quantity_available = Math.max(0, (this.quantity_purchased || 0) - (this.quantity_used || 0));

  // Determine stock status
  if (this.expiry_date && new Date(this.expiry_date) < new Date()) {
    this.status = 'Expired';
  } else if (this.quantity_available === 0) {
    this.status = 'Out of Stock';
  } else if (this.quantity_available <= (this.reorder_level || 5)) {
    this.status = 'Low Stock';
  } else {
    this.status = 'In Stock';
  }

  next();
});

export default mongoose.model('DentalInventory', dentalInventorySchema);
