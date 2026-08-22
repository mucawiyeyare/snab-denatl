import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  username: {
    type: String,
    default: 'System'
  },
  role: {
    type: String,
    default: ''
  },
  action: {
    type: String,
    required: true
  },
  entity: {
    type: String,
    required: true
  },
  entity_id: {
    type: String,
    default: ''
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  ip_address: {
    type: String,
    default: ''
  },
  date_time: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

export default mongoose.model('AuditLog', auditLogSchema);
