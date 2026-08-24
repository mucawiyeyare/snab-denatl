import express from 'express';
import {
  getPrescriptions,
  getPrescriptionById,
  createPrescription,
  dispensePrescription
} from '../controllers/prescription.controller.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getPrescriptions)
  .post(authorize('Doctor', 'Admin'), createPrescription);

router.route('/:id')
  .get(getPrescriptionById);

router.post('/:id/dispense', authorize('Receptionist/Cashier', 'Admin'), dispensePrescription);

export default router;