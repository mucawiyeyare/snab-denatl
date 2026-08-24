import express from 'express';
import {
  getDashboardStats,
  getDoctorPerformanceReport,
  getServiceAnalytics,
  globalSearch,
  getDailyIncomeReport,
  getFinancialSummaryReport,
  getDentalTreatmentAnalytics,
  getMedicationReport
} from '../controllers/report.controller.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/search', globalSearch);
router.get('/dashboard-stats', getDashboardStats);
router.get('/daily-income', getDailyIncomeReport);
router.get('/financial-summary', getFinancialSummaryReport);
router.get('/treatment-analytics', getDentalTreatmentAnalytics);
router.get('/medication-summary', getMedicationReport);
router.get('/doctor-performance', authorize('Admin'), getDoctorPerformanceReport);
router.get('/service-analytics', authorize('Admin', 'Receptionist/Cashier'), getServiceAnalytics);

export default router;
