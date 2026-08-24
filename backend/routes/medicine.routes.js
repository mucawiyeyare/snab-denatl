import express from 'express';
import {
  getMedicines,
  getMedicineById,
  createMedicine,
  updateMedicine,
  deleteMedicine,
  getPharmacyReports
} from '../controllers/medicine.controller.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/reports/sales-analytics', getPharmacyReports);

router.route('/')
  .get(getMedicines)
  .post(authorize('Admin'), createMedicine);

router.route('/:id')
  .get(getMedicineById)
  .put(authorize('Admin'), updateMedicine)
  .delete(authorize('Admin'), deleteMedicine);

export default router;