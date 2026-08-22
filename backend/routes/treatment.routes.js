import express from 'express';
import {
  getTreatments,
  createTreatment,
  updateTreatment
} from '../controllers/treatment.controller.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getTreatments)
  .post(authorize('Doctor', 'Admin'), createTreatment);

router.route('/:id')
  .put(authorize('Doctor', 'Admin'), updateTreatment);

export default router;
