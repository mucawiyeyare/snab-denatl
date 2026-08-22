import express from 'express';
import { getSettings, updateSettings } from '../controllers/setting.controller.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/', getSettings);
router.put('/', authorize('Admin'), updateSettings);

export default router;
