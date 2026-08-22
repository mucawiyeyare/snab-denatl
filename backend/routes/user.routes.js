import express from 'express';
import { getUsers, getDoctors, createUser, updateUser, deleteUser } from '../controllers/user.controller.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Allow authenticated users to fetch active doctors (needed by reception/cashier/doctor)
router.get('/doctors', protect, getDoctors);

// Admin-only endpoints
router.use(protect, authorize('Admin'));
router.route('/')
  .get(getUsers)
  .post(createUser);

router.route('/:id')
  .put(updateUser)
  .delete(deleteUser);

export default router;
