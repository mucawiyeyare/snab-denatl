import express from 'express';
import {
  getLabRequests,
  createLabRequest,
  updateLabRequestStatus
} from '../controllers/labRequest.controller.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getLabRequests)
  .post(authorize('Doctor', 'Admin'), createLabRequest);

router.patch('/:id/status', updateLabRequestStatus);

export default router;
