import express from 'express';
import {
  getPayments,
  getPaymentById,
  recordPayment,
  getDailyCashierSummary
} from '../controllers/payment.controller.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/daily-summary', authorize('Admin', 'Receptionist/Cashier'), getDailyCashierSummary);

router.route('/')
  .get(getPayments)
  .post(authorize('Admin', 'Receptionist/Cashier'), recordPayment);

router.get('/:id', getPaymentById);

export default router;
