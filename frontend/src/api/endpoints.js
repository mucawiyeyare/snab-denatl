import api from './axios.js';

// Auth
export const loginApi = (credentials) => api.post('/auth/login', credentials);
export const getMeApi = () => api.get('/auth/me');
export const updatePasswordApi = (data) => api.put('/auth/update-password', data);

// Patients
export const getPatientsApi = (params) => api.get('/patients', { params });
export const checkPatientPhoneApi = (phone) => api.get('/patients/check-phone', { params: { phone } });
export const getPatientByIdApi = (id) => api.get(`/patients/${id}`);
export const getPatientHistoryApi = (id) => api.get(`/patients/${id}/history`);
export const createPatientApi = (data) => api.post('/patients', data);
export const updatePatientApi = (id, data) => api.put(`/patients/${id}`, data);
export const deletePatientApi = (id) => api.delete(`/patients/${id}`);

// Visits
export const getVisitsApi = (params) => api.get('/visits', { params });
export const getVisitByIdApi = (id) => api.get(`/visits/${id}`);
export const createVisitApi = (data) => api.post('/visits', data);
export const updateVisitStatusApi = (id, data) => api.patch(`/visits/${id}/status`, data);

// Consultations
export const getConsultationsApi = (params) => api.get('/consultations', { params });
export const createConsultationApi = (data) => api.post('/consultations', data);
export const updateConsultationApi = (id, data) => api.put(`/consultations/${id}`, data);

// Dental Services
export const getServicesApi = (params) => api.get('/services', { params });
export const createServiceApi = (data) => api.post('/services', data);
export const updateServiceApi = (id, data) => api.put(`/services/${id}`, data);
export const deleteServiceApi = (id) => api.delete(`/services/${id}`);

// Treatments
export const getTreatmentsApi = (params) => api.get('/treatments', { params });
export const createTreatmentApi = (data) => api.post('/treatments', data);
export const updateTreatmentApi = (id, data) => api.put(`/treatments/${id}`, data);

// Lab Tests & Requests & Results
export const getLabTestsApi = (params) => api.get('/lab-tests', { params });
export const createLabTestApi = (data) => api.post('/lab-tests', data);
export const updateLabTestApi = (id, data) => api.put(`/lab-tests/${id}`, data);
export const deleteLabTestApi = (id) => api.delete(`/lab-tests/${id}`);

export const getLabRequestsApi = (params) => api.get('/lab-requests', { params });
export const createLabRequestApi = (data) => api.post('/lab-requests', data);
export const updateLabRequestStatusApi = (id, data) => api.patch(`/lab-requests/${id}/status`, data);

export const getLabResultsApi = (params) => api.get('/lab-results', { params });
export const createLabResultApi = (data) => api.post('/lab-results', data);
export const reviewLabResultApi = (id) => api.patch(`/lab-results/${id}/review`);

// Invoices & Payments
export const getInvoicesApi = (params) => api.get('/invoices', { params });
export const getInvoiceByIdApi = (id) => api.get(`/invoices/${id}`);
export const getVisitInvoiceApi = (visitId) => api.get(`/invoices/visit/${visitId}`);
export const applyDiscountApi = (id, data) => api.patch(`/invoices/${id}/discount`, data);

export const getPaymentsApi = (params) => api.get('/payments', { params });
export const getPaymentByIdApi = (id) => api.get(`/payments/${id}`);
export const recordPaymentApi = (data) => api.post('/payments', data);
export const getDailyCashierSummaryApi = () => api.get('/payments/daily-summary');

// Appointments & Follow-ups
export const getAppointmentsApi = (params) => api.get('/appointments', { params });
export const createAppointmentApi = (data) => api.post('/appointments', data);
export const updateAppointmentStatusApi = (id, data) => api.patch(`/appointments/${id}`, data);
export const deleteAppointmentApi = (id) => api.delete(`/appointments/${id}`);

export const getFollowupsApi = (params) => api.get('/followups', { params });
export const createFollowupApi = (data) => api.post('/followups', data);
export const updateFollowupStatusApi = (id, data) => api.patch(`/followups/${id}/status`, data);

// Employees & Users
export const getEmployeesApi = (params) => api.get('/employees', { params });
export const getEmployeeByIdApi = (id) => api.get(`/employees/${id}`);
export const createEmployeeApi = (data) => api.post('/employees', data);
export const updateEmployeeApi = (id, data) => api.put(`/employees/${id}`, data);
export const deleteEmployeeApi = (id) => api.delete(`/employees/${id}`);

export const getUsersApi = () => api.get('/users');
export const getDoctorsApi = () => api.get('/users/doctors');
export const createUserApi = (data) => api.post('/users', data);
export const updateUserApi = (id, data) => api.put(`/users/${id}`, data);
export const deleteUserApi = (id) => api.delete(`/users/${id}`);

// Dental Inventory
export const getInventoryApi = (params) => api.get('/inventory', { params });
export const getInventoryByIdApi = (id) => api.get(`/inventory/${id}`);
export const createInventoryApi = (data) => api.post('/inventory', data);
export const updateInventoryApi = (id, data) => api.put(`/inventory/${id}`, data);
export const recordItemUsageApi = (id, data) => api.post(`/inventory/${id}/usage`, data);
export const deleteInventoryApi = (id) => api.delete(`/inventory/${id}`);

// Reports & Audit & Settings
export const getDashboardStatsApi = () => api.get('/reports/dashboard-stats');
export const getDoctorPerformanceReportApi = () => api.get('/reports/doctor-performance');
export const getServiceAnalyticsApi = () => api.get('/reports/service-analytics');

export const getAuditLogsApi = (params) => api.get('/audit-logs', { params });

export const getSettingsApi = () => api.get('/settings');
export const updateSettingsApi = (data) => api.put('/settings', data);
