import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import connectDB from './config/db.js';
import errorHandler from './middleware/errorHandler.js';

// Route imports
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import employeeRoutes from './routes/employee.routes.js';
import patientRoutes from './routes/patient.routes.js';
import visitRoutes from './routes/visit.routes.js';
import consultationRoutes from './routes/consultation.routes.js';
import dentalServiceRoutes from './routes/dentalService.routes.js';
import treatmentRoutes from './routes/treatment.routes.js';
import labTestRoutes from './routes/labTest.routes.js';
import labRequestRoutes from './routes/labRequest.routes.js';
import labResultRoutes from './routes/labResult.routes.js';
import invoiceRoutes from './routes/invoice.routes.js';
import paymentRoutes from './routes/payment.routes.js';
import appointmentRoutes from './routes/appointment.routes.js';
import followupRoutes from './routes/followup.routes.js';
import reportRoutes from './routes/report.routes.js';
import auditLogRoutes from './routes/auditLog.routes.js';
import settingRoutes from './routes/setting.routes.js';
import inventoryRoutes from './routes/inventory.routes.js';

dotenv.config();

const app = express();

// Connect to MongoDB
connectDB();

// Core Middleware
app.use(helmet({
  crossOriginResourcePolicy: false
}));
app.use(cors({
  origin: '*',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Health check API
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    system: 'SNAB Dental Clinic Management System API',
    timestamp: new Date()
  });
});

// API Routes Mounting
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/visits', visitRoutes);
app.use('/api/consultations', consultationRoutes);
app.use('/api/services', dentalServiceRoutes);
app.use('/api/treatments', treatmentRoutes);
app.use('/api/lab-tests', labTestRoutes);
app.use('/api/lab-requests', labRequestRoutes);
app.use('/api/lab-results', labResultRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/followups', followupRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/inventory', inventoryRoutes);

// Fallback 404 handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `API endpoint not found: ${req.method} ${req.originalUrl}`
  });
});

// Global Error Handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`  SNAB Dental Clinic MS Backend running on port ${PORT}`);
  console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`======================================================\n`);
});

export default app;
