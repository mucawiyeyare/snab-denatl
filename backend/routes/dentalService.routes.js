import express from 'express';
import {
  getDentalServices,
  createDentalService,
  updateDentalService,
  deleteDentalService
} from '../controllers/dentalService.controller.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getDentalServices)
  .post(authorize('Admin'), createDentalService);

router.route('/:id')
  .put(authorize('Admin'), updateDentalService)
  .delete(authorize('Admin'), deleteDentalService);

export default router;
