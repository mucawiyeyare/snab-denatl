import AuditLog from '../models/AuditLog.js';

export const logAudit = async ({ user, action, entity, entity_id, details, ip_address }) => {
  try {
    await AuditLog.create({
      user_id: user?._id,
      username: user?.username || 'Anonymous',
      role: user?.role || 'Guest',
      action,
      entity,
      entity_id: entity_id?.toString() || '',
      details: details || {},
      ip_address: ip_address || ''
    });
  } catch (err) {
    console.error('[Audit Log Failure]:', err.message);
  }
};
