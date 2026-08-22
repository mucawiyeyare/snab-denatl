import express from 'express';
import {
  getLabTests,
  createLabTest,
  updateLabTest,
  deleteLabTest
} from '../controllers/labTest.controller.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getLabTests)
  .post(authorize('Admin'), createLabTest);

router.route('/:id')
  .put(authorize('Admin'), updateLabTest)
  .delete(authorize('Admin'), deleteLabTest);

export default router;
