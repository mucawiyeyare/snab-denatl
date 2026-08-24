import mongoose from 'mongoose';

const expenseSchema = new mongoose.Schema({
  expense_code: {
    type: String,
    unique: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    enum: [
      'Dental Materials',
      'Dental Instruments',
      'Laboratory Expenses',
      'Dental Supplies',
      'Equipment Maintenance',
      'Equipment Purchases',
      'Medication & Pharmaceuticals',
      'Consumables & Disposables',
      'Staff Salaries & Allowances',
      'Clinic Operating Expenses',
      'Other Expenses'
    ],
    default: 'Dental Materials'
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  expense_date: {
    type: Date,
    default: Date.now
  },
  payment_method: {
    type: String,
    enum: ['Cash', 'Bank Transfer', 'Mobile Payment', 'Card', 'Cheque', 'Other'],
    default: 'Cash'
  },
  supplier: {
    type: String,
    default: '',
    trim: true
  },
  receipt_number: {
    type: String,
    default: '',
    trim: true
  },
  notes: {
    type: String,
    default: '',
    trim: true
  },
  recorded_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

export default mongoose.model('Expense', expenseSchema);
