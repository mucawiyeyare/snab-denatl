import express from 'express';
import {
  getInventory,
  getInventoryById,
  createInventoryItem,
  updateInventoryItem,
  recordItemUsage,
  deleteInventoryItem,
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory
} from '../controllers/inventory.controller.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

// ── Category Management (Admin & Doctor) ──
router.route('/categories')
  .get(getCategories)
  .post(authorize('Admin', 'Doctor'), createCategory);

router.route('/categories/:id')
  .put(authorize('Admin', 'Doctor'), updateCategory)
  .delete(authorize('Admin', 'Doctor'), deleteCategory);

// ── Item Inventory CRUD & Usage ──
router.route('/')
  .get(getInventory)
  .post(authorize('Admin', 'Doctor'), createInventoryItem);

router.route('/:id')
  .get(getInventoryById)
  .put(authorize('Admin', 'Doctor'), updateInventoryItem)
  .delete(authorize('Admin', 'Doctor'), deleteInventoryItem);

router.post('/:id/usage', authorize('Admin', 'Doctor'), recordItemUsage);

export default router;
