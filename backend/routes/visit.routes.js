import express from 'express';
import {
  getVisits,
  getVisitById,
  createVisit,
  updateVisitStatus
} from '../controllers/visit.controller.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getVisits)
  .post(createVisit);

router.route('/:id')
  .get(getVisitById);

router.patch('/:id/status', updateVisitStatus);

export default router;
