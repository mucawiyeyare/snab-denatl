import express from 'express';
import {
  getPrescriptions,
  getPrescriptionById,
  createPrescription,
  updatePrescription,
  deletePrescription,
  dispensePrescription
} from '../controllers/prescription.controller.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getPrescriptions)
  .post(authorize('Doctor', 'Admin'), createPrescription);

router.route('/:id')
  .get(getPrescriptionById)
  .put(authorize('Doctor', 'Admin', 'Receptionist/Cashier'), updatePrescription)
  .delete(authorize('Doctor', 'Admin'), deletePrescription);

router.post('/:id/dispense', authorize('Receptionist/Cashier', 'Admin'), dispensePrescription);

export default router;