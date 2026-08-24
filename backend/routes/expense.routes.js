import express from 'express';
import {
  getExpenses,
  getExpenseById,
  createExpense,
  updateExpense,
  deleteExpense,
  getExpenseSummary
} from '../controllers/expense.controller.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/summary/stats', getExpenseSummary);

router.route('/')
  .get(getExpenses)
  .post(authorize('Admin', 'Receptionist/Cashier'), createExpense);

router.route('/:id')
  .get(getExpenseById)
  .put(authorize('Admin'), updateExpense)
  .delete(authorize('Admin'), deleteExpense);

export default router;
