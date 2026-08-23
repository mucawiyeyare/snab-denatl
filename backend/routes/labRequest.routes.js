import express from 'express';
import {
  getLabRequests,
  createLabRequest,
  processLabSession,
  updateLabRequestStatus,
  deleteLabRequest
} from '../controllers/labRequest.controller.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getLabRequests)
  .post(authorize('Doctor', 'Admin', 'Receptionist/Cashier'), createLabRequest);

router.post('/:id/process-session', processLabSession);
router.patch('/:id/status', updateLabRequestStatus);
router.delete('/:id', authorize('Admin', 'Receptionist/Cashier', 'Doctor'), deleteLabRequest);

export default router;
