import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Layout from './components/layout/Layout.jsx';

// Pages
import Login from './pages/auth/Login.jsx';
import Signup from './pages/auth/Signup.jsx';
import Unauthorized from './pages/unauthorized/Unauthorized.jsx';
import Dashboard from './pages/dashboard/Dashboard.jsx';
import PatientList from './pages/patients/PatientList.jsx';
import PatientProfile from './pages/patients/PatientProfile.jsx';
import DoctorList from './pages/doctors/DoctorList.jsx';
import VisitList from './pages/visits/VisitList.jsx';
import ConsultationList from './pages/consultation/ConsultationList.jsx';
import TreatmentList from './pages/treatment/TreatmentList.jsx';
import ServiceList from './pages/services/ServiceList.jsx';
import DentalInventory from './pages/inventory/DentalInventory.jsx';
import LabManager from './pages/lab/LabManager.jsx';
import BillingManager from './pages/billing/BillingManager.jsx';
import PaymentList from './pages/payments/PaymentList.jsx';
import AppointmentList from './pages/appointments/AppointmentList.jsx';
import FollowupList from './pages/followups/FollowupList.jsx';
import EmployeeList from './pages/employees/EmployeeList.jsx';
import UserList from './pages/users/UserList.jsx';
import ReportsManager from './pages/reports/ReportsManager.jsx';
import AuditLogList from './pages/auditlog/AuditLogList.jsx';
import SettingsView from './pages/settings/SettingsView.jsx';

function App() {
  return (
    <Routes>
      {/* Public Auth Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/unauthorized" element={<Unauthorized />} />

      {/* Protected Main Layout */}
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          
          {/* Universal Dashboard */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />

          {/* Patients & Doctors */}
          <Route path="/patients" element={<PatientList />} />
          <Route path="/patients/:id" element={<PatientProfile />} />
          <Route path="/doctors" element={<DoctorList />} />

          {/* Visits & Live Queue */}
          <Route path="/visits" element={<VisitList />} />

          {/* Doctor Consultations & Treatments */}
          <Route path="/consultations" element={<ConsultationList />} />
          <Route path="/treatments" element={<TreatmentList />} />
          <Route path="/services" element={<ServiceList />} />

          {/* Dental Materials & Equipment Inventory */}
          <Route element={<ProtectedRoute allowedRoles={['Admin', 'Doctor']} />}>
            <Route path="/inventory" element={<DentalInventory />} />
          </Route>

          {/* Laboratory */}
          <Route path="/lab" element={<LabManager />} />
          <Route path="/lab/requests" element={<LabManager />} />
          <Route path="/lab/results" element={<LabManager />} />

          {/* Billing & Payments */}
          <Route path="/billing" element={<BillingManager />} />
          <Route path="/payments" element={<PaymentList />} />

          {/* Appointments & Follow-ups */}
          <Route path="/appointments" element={<AppointmentList />} />
          <Route path="/followups" element={<FollowupList />} />

          {/* Admin Exclusive: Staff Directory, User Management, Audit Logs, Settings */}
          <Route element={<ProtectedRoute allowedRoles={['Admin']} />}>
            <Route path="/employees" element={<EmployeeList />} />
            <Route path="/users" element={<UserList />} />
            <Route path="/audit-logs" element={<AuditLogList />} />
            <Route path="/settings" element={<SettingsView />} />
          </Route>

          {/* Reports & Analytics */}
          <Route path="/reports" element={<ReportsManager />} />
          <Route path="/reports/cashier" element={<PaymentList />} />

        </Route>
      </Route>

      {/* Catch-all fallback */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;
