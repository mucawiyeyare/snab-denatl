import express from 'express';
import {
  getDashboardStats,
  getDoctorPerformanceReport,
  getServiceAnalytics
} from '../controllers/report.controller.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/dashboard-stats', getDashboardStats);
router.get('/doctor-performance', authorize('Admin'), getDoctorPerformanceReport);
router.get('/service-analytics', authorize('Admin', 'Receptionist/Cashier'), getServiceAnalytics);

export default router;
