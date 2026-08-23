import express from 'express';
import {
  getInvoices,
  getInvoiceById,
  getVisitInvoice,
  applyDiscount,
  updateInvoice,
  deleteInvoice
} from '../controllers/invoice.controller.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/', getInvoices);
router.get('/visit/:visitId', getVisitInvoice);
router.get('/:id', getInvoiceById);
router.put('/:id', authorize('Admin', 'Receptionist/Cashier'), updateInvoice);
router.patch('/:id/discount', authorize('Admin', 'Receptionist/Cashier'), applyDiscount);
router.delete('/:id', authorize('Admin'), deleteInvoice);

export default router;
