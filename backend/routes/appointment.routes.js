import express from 'express';
import {
  getAppointments,
  createAppointment,
  updateAppointmentStatus,
  deleteAppointment
} from '../controllers/appointment.controller.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getAppointments)
  .post(createAppointment);

router.route('/:id')
  .patch(updateAppointmentStatus)
  .delete(deleteAppointment);

export default router;
