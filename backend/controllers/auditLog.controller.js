import AuditLog from '../models/AuditLog.js';

export const getAuditLogs = async (req, res, next) => {
  try {
    const { action, entity, user_id, search, limit = 100 } = req.query;
    let filter = {};

    if (action) filter.action = action;
    if (entity) filter.entity = entity;
    if (user_id) filter.user_id = user_id;
    if (search && search.trim()) {
      filter.$or = [
        { username: { $regex: search.trim(), $options: 'i' } },
        { action: { $regex: search.trim(), $options: 'i' } },
        { entity: { $regex: search.trim(), $options: 'i' } }
      ];
    }

    const logs = await AuditLog.find(filter)
      .populate('user_id', 'username full_name role')
      .sort({ createdAt: -1 })
      .limit(Number(limit));

    res.json({ success: true, count: logs.length, data: logs });
  } catch (error) {
    next(error);
  }
};
