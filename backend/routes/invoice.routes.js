import express from 'express';
import {
  getInvoices,
  getInvoiceById,
  getVisitInvoice,
  applyDiscount
} from '../controllers/invoice.controller.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/', getInvoices);
router.get('/visit/:visitId', getVisitInvoice);
router.get('/:id', getInvoiceById);
router.patch('/:id/discount', authorize('Admin', 'Receptionist/Cashier'), applyDiscount);

export default router;
