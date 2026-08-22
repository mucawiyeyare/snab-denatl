import express from 'express';
import { getAuditLogs } from '../controllers/auditLog.controller.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect, authorize('Admin'));

router.get('/', getAuditLogs);

export default router;
