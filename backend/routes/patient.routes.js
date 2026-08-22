import express from 'express';
import {
  getPatients,
  getPatientById,
  createPatient,
  updatePatient,
  getPatientHistory,
  checkTelephoneAvailability
} from '../controllers/patient.controller.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/check-phone', checkTelephoneAvailability);

router.route('/')
  .get(getPatients)
  .post(createPatient);

router.get('/:id/history', getPatientHistory);

router.route('/:id')
  .get(getPatientById)
  .put(updatePatient);

export default router;
