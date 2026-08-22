import express from 'express';
import {
  getConsultations,
  createConsultation,
  updateConsultation
} from '../controllers/consultation.controller.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getConsultations)
  .post(authorize('Doctor', 'Admin'), createConsultation);

router.route('/:id')
  .put(authorize('Doctor', 'Admin'), updateConsultation);

export default router;
