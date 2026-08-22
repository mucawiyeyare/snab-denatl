import mongoose from 'mongoose';

const roleSchema = new mongoose.Schema({
  role_name: {
    type: String,
    required: true,
    unique: true,
    enum: ['Admin', 'Doctor', 'Receptionist/Cashier']
  },
  description: {
    type: String
  }
}, { timestamps: true });

export default mongoose.model('Role', roleSchema);
