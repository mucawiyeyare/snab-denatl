import express from 'express';
import {
  getInventory,
  getInventoryById,
  createInventoryItem,
  updateInventoryItem,
  recordItemUsage,
  deleteInventoryItem
} from '../controllers/inventory.controller.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getInventory)
  .post(authorize('Admin', 'Doctor'), createInventoryItem);

router.route('/:id')
  .get(getInventoryById)
  .put(authorize('Admin', 'Doctor'), updateInventoryItem)
  .delete(authorize('Admin'), deleteInventoryItem);

router.post('/:id/usage', authorize('Admin', 'Doctor'), recordItemUsage);

export default router;
