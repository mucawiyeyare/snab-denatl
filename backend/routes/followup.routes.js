import express from 'express';
import {
  getFollowups,
  createFollowup,
  updateFollowupStatus
} from '../controllers/followup.controller.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getFollowups)
  .post(createFollowup);

router.patch('/:id/status', updateFollowupStatus);

export default router;
