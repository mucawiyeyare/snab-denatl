import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  getVisitsApi,
  getVisitByIdApi,
  createVisitApi,
  getPatientsApi,
  getDoctorsApi,
  updateVisitStatusApi,
  getServicesApi,
  getLabTestsApi,
  createConsultationApi,
  createLabRequestApi,
  createLabResultApi,
  createTreatmentApi,
  recordPaymentApi,
  getVisitInvoiceApi
} from '../../api/endpoints.js';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import Modal from '../../components/ui/Modal.jsx';
import ToothChart from '../../components/ui/ToothChart.jsx';
import ReceiptModal from '../../components/ui/ReceiptModal.jsx';
import ConsultationTokenModal from '../../components/ui/ConsultationTokenModal.jsx';
import {
  Activity,
  Search,
  Filter,
  Stethoscope,
  TestTube2,
  Receipt,
  CreditCard,
  CheckCircle,
  Clock,
  HeartPulse,
  DollarSign,
  AlertCircle,
  FileText,
  Ticket,
  Plus,
  UserCheck,
  UserPlus,
  Send,
  Users,
  Sparkles,
  Lock,
  AlertTriangle,
  Percent,
  ShieldCheck
} from 'lucide-react';
import SearchableSelect from '../../components/ui/SearchableSelect.jsx';

const VisitList = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [todayFilter, setTodayFilter] = useState('false');

  // Selected visit and details for actions
  const [selectedVisit, setSelectedVisit] = useState(null);
  const [visitDetails, setVisitDetails] = useState(null);

  // New Visit Modal State (Select Doctor Only - No Consultation Fee)
  const [isNewVisitModalOpen, setIsNewVisitModalOpen] = useState(false);
  const [patientsList, setPatientsList] = useState([]);
  const [doctorsList, setDoctorsList] = useState([]);
  const [newVisitForm, setNewVisitForm] = useState({
    patient_id: '',
    doctor_id: '',
    reason: 'General Dental Consultation',
    complaint: ''
  });

  // Modals
  const [isConsultationModalOpen, setIsConsultationModalOpen] = useState(false);
  const [isLabRequestModalOpen, setIsLabRequestModalOpen] = useState(false);
  const [isLabResultModalOpen, setIsLabResultModalOpen] = useState(false);
  const [isViewLabResultModalOpen, setIsViewLabResultModalOpen] = useState(false);
  const [viewingLabResultData, setViewingLabResultData] = useState(null);
  const [isTreatmentModalOpen, setIsTreatmentModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedVisitInvoice, setSelectedVisitInvoice] = useState(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isTokenModalOpen, setIsTokenModalOpen] = useState(false);
  const [currentPayment, setCurrentPayment] = useState(null);
  const [tokenVisit, setTokenVisit] = useState(null);

  // Catalogs
  const [services, setServices] = useState([]);
  const [labTests, setLabTests] = useState([]);

  // Form states
  // Consultation
  const [consultForm, setConsultForm] = useState({
    symptoms: '',
    duration: '',
    clinical_observations: '',
    dental_findings: '',
    blood_pressure: '120/80',
    primary_diagnosis: '',
    treatment_decision: 'Immediate Treatment',
    prescriptions: [{ medication_name: '', dosage: '', frequency: '', duration: '' }],
    doctor_notes: ''
  });

  // Lab Request
  const [labRequestForm, setLabRequestForm] = useState({
    test_id: '',
    reason: 'Pre-procedure screening'
  });

  // Lab Result
  const [labResultForm, setLabResultForm] = useState({
    request_id: '',
    result: '',
    reference_range: '',
    clinical_interpretation: 'Normal',
    notes: '',
    performed_by: ''
  });

  // Treatment
  const [treatmentForm, setTreatmentForm] = useState({
    service_id: '',
    tooth_number: '',
    procedure_details: '',
    treatment_notes: '',
    price: 0,
    followup_date: ''
  });

  // Payment
  const [paymentForm, setPaymentForm] = useState({
    invoice_id: '',
    amount: 0,
    discount: 0,
    payment_category: 'Consultation Fee',
    payment_method: 'Cash',
    notes: ''
  });

  // Financial computations for the active visit payment modal
  const visitInvoiceItems = selectedVisitInvoice?.items || [];
  const vTreatmentItems = visitInvoiceItems.filter(item => ['Treatment', 'Consultation'].includes(item.item_type));
  const vAdditionalItems = visitInvoiceItems.filter(item => !['Treatment', 'Consultation'].includes(item.item_type));
  
  const vTreatmentCost = vTreatmentItems.length > 0
    ? vTreatmentItems.reduce((acc, item) => acc + (Number(item.total_price) || 0), 0)
    : Number(selectedVisitInvoice?.subtotal || (paymentForm.payment_category === 'Consultation Fee' ? selectedVisit?.consultation_fee || 3 : 0));

  const vAdditionalCosts = vAdditionalItems.length > 0
    ? vAdditionalItems.reduce((acc, item) => acc + (Number(item.total_price) || 0), 0)
    : Math.max(0, Number(selectedVisitInvoice?.subtotal || 0) - vTreatmentCost);

  const vTotalPatientCost = Number(selectedVisitInvoice?.subtotal || (vTreatmentCost + vAdditionalCosts) || (paymentForm.payment_category === 'Consultation Fee' ? selectedVisit?.consultation_fee || 3 : 0));
  const vPreviouslyPaid = Number(selectedVisitInvoice?.paid_amount || 0);
  const vApprovedDiscount = Number(selectedVisitInvoice?.discount || 0);
  
  // Base Outstanding = Total Patient Cost - Previously Paid - Approved Discounts
  const vBaseOutstanding = Math.max(0, vTotalPatientCost - vPreviouslyPaid - vApprovedDiscount);

  // Cashier Discount control
  const vCurrentCashierDiscount = Math.max(0, Number(paymentForm.discount) || 0);
  const vCashierDiscountExceeded = vCurrentCashierDiscount > vBaseOutstanding + 0.001;

  // Effective Outstanding after applying Cashier discount
  const vEffectiveOutstanding = Math.max(0, vBaseOutstanding - vCurrentCashierDiscount);
  const vMaxPaymentAllowed = vEffectiveOutstanding;

  // Paying Now control
  const vPayingNow = Number(paymentForm.amount) || 0;
  const vPaymentExceeded = vPayingNow > vMaxPaymentAllowed + 0.001;
  const vIsZeroPayment = vPayingNow <= 0 && vEffectiveOutstanding > 0;
  const vRemainingBalance = Math.max(0, vEffectiveOutstanding - vPayingNow);

  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchVisits();
    getServicesApi().then(res => setServices(res.data?.data || [])).catch(() => {});
    getLabTestsApi().then(res => setLabTests(res.data?.data || [])).catch(() => {});
  }, [search, statusFilter, todayFilter]);

  const handleOpenNewVisitModal = async () => {
    try {
      const [patientsRes, doctorsRes] = await Promise.all([
        getPatientsApi({ limit: 150 }),
        getDoctorsApi()
      ]);
      setPatientsList(patientsRes.data?.data || []);
      setDoctorsList(doctorsRes.data?.data || []);
      setNewVisitForm({
        patient_id: '',
        doctor_id: '',
        visit_type: 'follow-up',
        reason: 'General Dental Consultation',
        complaint: ''
      });
      setErrorMsg('');
      setIsNewVisitModalOpen(true);
    } catch (err) {
      console.error('Error fetching patients/doctors for visit modal:', err);
    }
  };

  const submitNewVisit = async (e) => {
    e.preventDefault();
    if (!newVisitForm.patient_id) {
      setErrorMsg('Please select a patient');
      return;
    }
    if (!newVisitForm.doctor_id) {
      setErrorMsg('Please select an assigned doctor');
      return;
    }
    setSubmitting(true);
    setErrorMsg('');
    try {
      await createVisitApi(newVisitForm);
      setIsNewVisitModalOpen(false);
      fetchVisits();
    } catch (err) {
      console.error('Error creating visit:', err);
      setErrorMsg(err.response?.data?.message || 'Error creating patient visit');
    } finally {
      setSubmitting(false);
    }
  };

  const fetchVisits = async () => {
    setLoading(true);
    try {
      const res = await getVisitsApi({
        search,
        status: statusFilter || undefined,
        today: todayFilter === 'true' ? 'true' : undefined
      });
      setVisits(res.data?.data || []);
    } catch (err) {
      console.error('Error fetching visits:', err);
    } finally {
      setLoading(false);
    }
  };

  const openVisitDetails = async (visit) => {
    setSelectedVisit(visit);
    try {
      const res = await getVisitByIdApi(visit._id);
      setVisitDetails(res.data?.data);
      return res.data?.data;
    } catch (err) {
      console.error('Error fetching visit details:', err);
    }
  };

  // 1. Pay Consultation Fee
  const handleOpenConsultationPayment = async (visit) => {
    const details = await openVisitDetails(visit);
    const invoice = details?.invoices?.[0];
    setSelectedVisitInvoice(invoice || null);
    const initialAmount = visit.consultation_fee !== undefined ? visit.consultation_fee : (invoice?.balance || 3);
    setPaymentForm({
      invoice_id: invoice?._id || '',
      amount: initialAmount,
      discount: 0,
      payment_category: 'Consultation Fee',
      payment_method: 'Cash',
      notes: `Consultation fee for ${visit.visit_number}`
    });
    setIsPaymentModalOpen(true);
  };

  // 2. Open Consultation Form
  const handleOpenConsultation = async (visit) => {
    await openVisitDetails(visit);
    setConsultForm({
      symptoms: visit.complaint || '',
      duration: '',
      clinical_observations: '',
      dental_findings: '',
      blood_pressure: '120/80',
      primary_diagnosis: '',
      treatment_decision: 'Immediate Treatment',
      prescriptions: [{ medication_name: '', dosage: '', frequency: '', duration: '' }],
      doctor_notes: ''
    });
    setIsConsultationModalOpen(true);
  };

  // 3. Open Lab Request Form (Doctor selects tests & clinical reason, does not set prices)
  const handleOpenLabRequest = async (visit) => {
    await openVisitDetails(visit);
    setLabRequestForm({
      test_ids: [labTests[0]?._id].filter(Boolean),
      test_id: labTests[0]?._id || '',
      reason: 'Pre-treatment screening'
    });
    setIsLabRequestModalOpen(true);
  };

  // 4. Doctor Views Completed Lab Results
  const handleOpenViewLabResult = async (visit) => {
    const details = await openVisitDetails(visit);
    setViewingLabResultData({
      visit,
      results: details?.labResults || [],
      requests: details?.labRequests || []
    });
    setIsViewLabResultModalOpen(true);
  };

  // 5. Open Treatment Form
  const handleOpenTreatment = async (visit) => {
    await openVisitDetails(visit);
    const defaultSrv = services[0];
    setTreatmentForm({
      service_id: defaultSrv?._id || '',
      tooth_number: 'Full Mouth',
      procedure_details: '',
      treatment_notes: '',
      price: defaultSrv?.price || 50,
      followup_date: ''
    });
    setIsTreatmentModalOpen(true);
  };

  // 7. Pay Final Bill / Treatment
  const handleOpenFinalPayment = async (visit) => {
    const details = await openVisitDetails(visit);
    const invoice = details?.invoices?.[0];
    setSelectedVisitInvoice(invoice || null);
    const outstanding = invoice ? (invoice.balance !== undefined ? invoice.balance : Math.max(0, (invoice.total_amount || 0) - (invoice.paid_amount || 0))) : 0;
    setPaymentForm({
      invoice_id: invoice?._id || '',
      amount: outstanding > 0 ? outstanding : 0,
      discount: 0,
      payment_category: 'Final Bill / Consolidated',
      payment_method: 'Cash',
      notes: `Final payment for ${visit.visit_number}`
    });
    setIsPaymentModalOpen(true);
  };

  // Form Submissions
  const submitConsultation = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');
    try {
      const validPrescriptions = consultForm.prescriptions.filter(p => p.medication_name?.trim());
      await createConsultationApi({
        visit_id: selectedVisit._id,
        patient_id: selectedVisit.patient_id?._id,
        complaint: {
          main_complaint: selectedVisit.complaint,
          symptoms: consultForm.symptoms.split(',').map(s => s.trim()),
          duration: consultForm.duration
        },
        examination: {
          clinical_observations: consultForm.clinical_observations,
          dental_findings: consultForm.dental_findings,
          blood_pressure: consultForm.blood_pressure
        },
        diagnosis: {
          primary_diagnosis: consultForm.primary_diagnosis
        },
        treatment_decision: consultForm.treatment_decision,
        prescriptions: validPrescriptions,
        doctor_notes: consultForm.doctor_notes
      });
      setIsConsultationModalOpen(false);
      fetchVisits();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Error saving consultation record');
    } finally {
      setSubmitting(false);
    }
  };

  const submitLabRequest = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');
    try {
      const targetIds = labRequestForm.test_ids && labRequestForm.test_ids.length > 0
        ? labRequestForm.test_ids
        : (labRequestForm.test_id ? [labRequestForm.test_id] : []);

      if (targetIds.length === 0) {
        setErrorMsg('Please select at least one lab test');
        setSubmitting(false);
        return;
      }

      await createLabRequestApi({
        visit_id: selectedVisit._id,
        patient_id: selectedVisit.patient_id?._id,
        test_ids: targetIds,
        reason: labRequestForm.reason
      });
      setIsLabRequestModalOpen(false);
      fetchVisits();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Error creating lab request');
    } finally {
      setSubmitting(false);
    }
  };

  const submitLabResult = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');
    try {
      await createLabResultApi(labResultForm);
      setIsLabResultModalOpen(false);
      fetchVisits();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Error saving lab result');
    } finally {
      setSubmitting(false);
    }
  };

  const submitTreatment = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');
    try {
      await createTreatmentApi({
        visit_id: selectedVisit._id,
        patient_id: selectedVisit.patient_id?._id,
        service_id: treatmentForm.service_id,
        tooth_number: treatmentForm.tooth_number || 'Full Mouth',
        procedure_details: treatmentForm.procedure_details,
        treatment_notes: treatmentForm.treatment_notes,
        price: Number(treatmentForm.price),
        discount: Number(treatmentForm.discount || 0),
        followup_date: treatmentForm.followup_date || undefined
      });
      setIsTreatmentModalOpen(false);
      fetchVisits();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Error saving treatment');
    } finally {
      setSubmitting(false);
    }
  };

  const submitPayment = async (e) => {
    e.preventDefault();
    if (vPaymentExceeded) {
      setErrorMsg(`Payment amount cannot exceed the patient's outstanding balance of $${vMaxPaymentAllowed.toFixed(2)}.`);
      return;
    }
    if (vCashierDiscountExceeded) {
      setErrorMsg(`Cashier discount cannot exceed the outstanding balance of $${vBaseOutstanding.toFixed(2)}.`);
      return;
    }
    if (vIsZeroPayment) {
      setErrorMsg('Payment amount must be greater than $0.00.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');
    try {
      const res = await recordPaymentApi({
        ...paymentForm,
        visit_id: selectedVisit._id,
        patient_id: selectedVisit.patient_id?._id,
        amount: Number(paymentForm.amount),
        discount: Number(paymentForm.discount || 0)
      });
      setIsPaymentModalOpen(false);
      fetchVisits();
      if (res.data?.data) {
        setCurrentPayment(res.data.data);
        setIsReceiptModalOpen(true);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Error recording payment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Patient Visits & Live Flow</h1>
          <p className="text-xs text-slate-500">Track and advance patients through Reception, Doctor, Lab, Treatment, and Cashier</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setTodayFilter(todayFilter === 'true' ? 'false' : 'true')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition border cursor-pointer ${
              todayFilter === 'true'
                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {todayFilter === 'true' ? "Showing Today's Visits" : "Filter Today Only"}
          </button>

          <button
            onClick={handleOpenNewVisitModal}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/20 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Check-In / New Visit</span>
          </button>
        </div>
      </div>

      {/* Patient Journey Flow Diagram Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs overflow-x-auto">
        <div className="flex items-center justify-between min-w-[700px] text-[11px] font-bold text-slate-400">
          <span className="flex items-center gap-1.5 text-blue-600">1. Reception Arrival / Select Doctor</span>
          <span>→</span>
          <span className="flex items-center gap-1.5 text-indigo-600">2. Doctor Consultation & Exam</span>
          <span>→</span>
          <span className="flex items-center gap-1.5 text-purple-600">3. Lab Test (If needed)</span>
          <span>→</span>
          <span className="flex items-center gap-1.5 text-teal-600">4. Dental Treatment</span>
          <span>→</span>
          <span className="flex items-center gap-1.5 text-emerald-600">5. Final Bill & Receipt</span>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2 bg-white p-3 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-2">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Patient Name, Phone, or Visit Number..."
            className="w-full text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-hidden"
          />
        </div>

        <div className="bg-white p-2.5 rounded-2xl border border-slate-100 shadow-xs">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full text-xs font-bold text-slate-700 bg-transparent focus:outline-hidden"
          >
            <option value="">All Statuses (18 stages)</option>
            <option value="Waiting for Payment">Waiting for Payment</option>
            <option value="Consultation Paid">Consultation Paid</option>
            <option value="Waiting for Doctor">Waiting for Doctor</option>
            <option value="With Doctor">With Doctor</option>
            <option value="Laboratory Payment Required">Laboratory Payment Required</option>
            <option value="Laboratory Paid">Laboratory Paid</option>
            <option value="Returning to Doctor">Returning to Doctor</option>
            <option value="Treatment in Progress">Treatment in Progress</option>
            <option value="Treatment Completed">Treatment Completed</option>
            <option value="Payment Pending">Payment Pending</option>
            <option value="Paid">Paid</option>
            <option value="Completed">Completed</option>
          </select>
        </div>
      </div>

      {/* Visits Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : visits.length === 0 ? (
          <div className="text-center py-16 text-slate-400 text-xs">
            No visits match your current filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider">
                  <th className="py-3.5 px-6">Visit #</th>
                  <th className="py-3.5 px-4">Patient</th>
                  <th className="py-3.5 px-4">Doctor</th>
                  <th className="py-3.5 px-4">Current Status</th>
                  <th className="py-3.5 px-4">Visit Time</th>
                  <th className="py-3.5 px-6 text-right">Workflow Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {visits.map((v) => {
                  const status = v.status;
                  const patient = v.patient_id || {};

                  return (
                    <tr key={v._id} className="hover:bg-slate-50/80 transition">
                      <td className="py-4 px-6 font-mono font-bold text-blue-600">
                        {v.visit_number}
                      </td>
                      <td className="py-4 px-4">
                        <span className="font-bold text-slate-900 block">{patient.name}</span>
                        <span className="text-[11px] text-slate-400 font-mono">{patient.telephone}</span>
                      </td>
                      <td className="py-4 px-4 text-slate-700">
                        {v.doctor_id?.full_name || v.doctor_id?.username}
                      </td>
                      <td className="py-4 px-4">
                        <StatusBadge status={v.status} />
                      </td>
                      <td className="py-4 px-4 text-slate-500">
                        {new Date(v.visit_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          
                          {/* 1. If Waiting for Payment -> Pay Consultation */}
                          {status === 'Waiting for Payment' && (
                            <button
                              onClick={() => handleOpenConsultationPayment(v)}
                              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg transition shadow-2xs text-[11px] cursor-pointer"
                            >
                              💳 Receive Consult Fee (${v.consultation_fee})
                            </button>
                          )}

                          {/* 2. If Waiting for Doctor or Consultation Paid -> Start Consultation */}
                          {(status === 'Waiting for Doctor' || status === 'Consultation Paid' || status === 'With Doctor') && (
                            <button
                              onClick={() => handleOpenConsultation(v)}
                              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition shadow-2xs text-[11px] cursor-pointer"
                            >
                              🩺 Consult / Diagnosis
                            </button>
                          )}

                          {/* 3. If Waiting for Laboratory -> In Laboratory / Cashier */}
                          {(status === 'Waiting for Laboratory' || status === 'Laboratory Payment Required' || status === 'Laboratory Testing') && (
                            <span className="px-2.5 py-1 text-[11px] font-bold text-purple-700 bg-purple-50 border border-purple-200 rounded-lg flex items-center gap-1">
                              ⏳ With Cashier (Lab Session)
                            </span>
                          )}

                          {/* 4. If Returning to Doctor -> Doctor Reviews Lab Result & Starts Treatment */}
                          {status === 'Returning to Doctor' && (
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => handleOpenViewLabResult(v)}
                                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg transition shadow-2xs text-[11px] flex items-center gap-1 cursor-pointer"
                              >
                                🔬 View Lab Result
                              </button>
                              <button
                                onClick={() => handleOpenTreatment(v)}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition shadow-2xs text-[11px] flex items-center gap-1 cursor-pointer"
                              >
                                🦷 Start Treatment
                              </button>
                            </div>
                          )}

                          {/* 5. If Treatment in Progress -> Record Treatment */}
                          {status === 'Treatment in Progress' && (
                            <button
                              onClick={() => handleOpenTreatment(v)}
                              className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg transition shadow-2xs text-[11px] cursor-pointer"
                            >
                              🦷 Record Treatment
                            </button>
                          )}

                          {/* 6. If Payment Pending -> Pay Final Bill */}
                          {status === 'Payment Pending' && (
                            <button
                              onClick={() => handleOpenFinalPayment(v)}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition shadow-2xs text-[11px] cursor-pointer"
                            >
                              🧾 Finalize & Bill
                            </button>
                          )}

                          {/* Print Doctor Token Slip button */}
                          <button
                            onClick={() => {
                              setTokenVisit(v);
                              setIsTokenModalOpen(true);
                            }}
                            title="Print Doctor Consultation Token / Visit Pass"
                            className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-700 font-bold rounded-lg transition shadow-2xs text-[11px] flex items-center gap-1"
                          >
                            <Ticket className="w-3.5 h-3.5" />
                            <span>Token</span>
                          </button>

                          {/* View summary button */}
                          <button
                            onClick={() => navigate(`/patients/${patient._id}`)}
                            title="Patient 360 Profile"
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition"
                          >
                            <FileText className="w-4 h-4" />
                          </button>

                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* --- MODALS --- */}

      {/* 1. Consultation Modal */}
      <Modal
        isOpen={isConsultationModalOpen}
        onClose={() => setIsConsultationModalOpen(false)}
        title={`Doctor Consultation: ${selectedVisit?.patient_id?.name}`}
        maxWidth="max-w-3xl"
      >
        <form onSubmit={submitConsultation} className="space-y-4 text-xs">
          {errorMsg && <div className="p-3 bg-rose-50 text-rose-700 rounded-xl">{errorMsg}</div>}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Chief Symptoms</label>
              <input
                type="text"
                value={consultForm.symptoms}
                onChange={(e) => setConsultForm({ ...consultForm, symptoms: e.target.value })}
                placeholder="e.g. Throbbing pain, bleeding gum"
                className="w-full p-2.5 bg-slate-50 border rounded-xl"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Duration</label>
              <input
                type="text"
                value={consultForm.duration}
                onChange={(e) => setConsultForm({ ...consultForm, duration: e.target.value })}
                placeholder="e.g. 3 days"
                className="w-full p-2.5 bg-slate-50 border rounded-xl"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Blood Pressure (Vital)</label>
              <input
                type="text"
                value={consultForm.blood_pressure}
                onChange={(e) => setConsultForm({ ...consultForm, blood_pressure: e.target.value })}
                placeholder="120/80"
                className="w-full p-2.5 bg-slate-50 border rounded-xl font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Oral & Clinical Examination Findings</label>
            <textarea
              rows="2"
              value={consultForm.clinical_observations}
              onChange={(e) => setConsultForm({ ...consultForm, clinical_observations: e.target.value })}
              placeholder="Clinical observations, soft tissue status, caries, mobility..."
              className="w-full p-2.5 bg-slate-50 border rounded-xl"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Primary Diagnosis *</label>
              <input
                type="text"
                required
                value={consultForm.primary_diagnosis}
                onChange={(e) => setConsultForm({ ...consultForm, primary_diagnosis: e.target.value })}
                placeholder="e.g. Acute Irreversible Pulpitis, Gingivitis, Malocclusion"
                className="w-full p-2.5 bg-slate-50 border rounded-xl font-bold text-slate-900"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Treatment Decision *</label>
              <select
                value={consultForm.treatment_decision}
                onChange={(e) => setConsultForm({ ...consultForm, treatment_decision: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border rounded-xl font-bold text-blue-800"
              >
                <option value="Immediate Treatment">A. Perform Treatment Immediately</option>
                <option value="Laboratory Test Required">B. Request Laboratory Test First</option>
                <option value="Medication Only">C. Medication / Prescription Only</option>
                <option value="Follow-up Only">D. Follow-up / Observation Only</option>
              </select>
            </div>
          </div>

          {/* Quick Lab Request Shortcut if Lab Required */}
          {consultForm.treatment_decision === 'Laboratory Test Required' && (
            <div className="p-3 bg-purple-50 rounded-xl border border-purple-200">
              <p className="font-bold text-purple-900 text-xs">Laboratory Request will be created automatically upon saving.</p>
              <p className="text-purple-700 text-[11px]">Patient status will become 'Laboratory Payment Required' and be sent to Reception/Cashier.</p>
            </div>
          )}

          <div>
            <label className="block font-bold text-slate-700 mb-1">Prescription Medication (Optional)</label>
            <div className="grid grid-cols-4 gap-2">
              <input
                type="text"
                placeholder="Drug Name (e.g. Amoxicillin)"
                value={consultForm.prescriptions[0].medication_name}
                onChange={(e) => {
                  const arr = [...consultForm.prescriptions];
                  arr[0].medication_name = e.target.value;
                  setConsultForm({ ...consultForm, prescriptions: arr });
                }}
                className="p-2 bg-slate-50 border rounded-lg col-span-1"
              />
              <input
                type="text"
                placeholder="Dosage (500mg)"
                value={consultForm.prescriptions[0].dosage}
                onChange={(e) => {
                  const arr = [...consultForm.prescriptions];
                  arr[0].dosage = e.target.value;
                  setConsultForm({ ...consultForm, prescriptions: arr });
                }}
                className="p-2 bg-slate-50 border rounded-lg"
              />
              <input
                type="text"
                placeholder="Freq (TDS / 8hrly)"
                value={consultForm.prescriptions[0].frequency}
                onChange={(e) => {
                  const arr = [...consultForm.prescriptions];
                  arr[0].frequency = e.target.value;
                  setConsultForm({ ...consultForm, prescriptions: arr });
                }}
                className="p-2 bg-slate-50 border rounded-lg"
              />
              <input
                type="text"
                placeholder="Days (5 days)"
                value={consultForm.prescriptions[0].duration}
                onChange={(e) => {
                  const arr = [...consultForm.prescriptions];
                  arr[0].duration = e.target.value;
                  setConsultForm({ ...consultForm, prescriptions: arr });
                }}
                className="p-2 bg-slate-50 border rounded-lg"
              />
            </div>
          </div>

          <div className="flex justify-between items-center pt-3 border-t">
            <button
              type="button"
              onClick={() => {
                setIsConsultationModalOpen(false);
                handleOpenLabRequest(selectedVisit);
              }}
              className="px-3 py-1.5 bg-purple-50 text-purple-700 hover:bg-purple-100 font-bold rounded-lg"
            >
              + Add Specific Lab Test Request
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsConsultationModalOpen(false)}
                className="px-4 py-2 bg-slate-100 rounded-xl font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md"
              >
                {submitting ? 'Saving...' : 'Save Consultation Record'}
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* 2. Specific Lab Request Modal (Multi-select Blood & Lab Tests Supported) */}
      {/* 2. Doctor Lab Request Modal (Send Patient to Laboratory) */}
      <Modal
        isOpen={isLabRequestModalOpen}
        onClose={() => setIsLabRequestModalOpen(false)}
        title={`Request Lab Tests for ${selectedVisit?.patient_id?.name}`}
        maxWidth="max-w-lg"
      >
        <form onSubmit={submitLabRequest} className="space-y-4 text-xs">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-bold text-slate-700">
                Select Required Lab Tests ({labRequestForm.test_ids?.length || 0} selected) *
              </label>
            </div>

            {/* Test Selection list (no fixed prices displayed to doctor) */}
            <div className="grid grid-cols-1 gap-2 max-h-52 overflow-y-auto p-2 bg-slate-50 rounded-xl border">
              {labTests.map(t => {
                const isSelected = (labRequestForm.test_ids || []).includes(t._id);
                return (
                  <div
                    key={t._id}
                    onClick={() => {
                      const current = labRequestForm.test_ids || [];
                      const next = current.includes(t._id)
                        ? current.filter(id => id !== t._id)
                        : [...current, t._id];
                      setLabRequestForm({ ...labRequestForm, test_ids: next, test_id: next[0] || '' });
                    }}
                    className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 cursor-pointer transition ${
                      isSelected
                        ? 'bg-purple-50 border-purple-400 text-purple-900 shadow-2xs font-bold'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded flex items-center justify-center border ${
                        isSelected ? 'bg-purple-600 border-purple-600 text-white' : 'border-slate-300 bg-white'
                      }`}>
                        {isSelected && <CheckCircle className="w-3.5 h-3.5" />}
                      </div>
                      <span className="font-bold">{t.test_name}</span>
                    </div>
                    <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-sans">{t.category}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Clinical Reason / Indication</label>
            <input
              type="text"
              value={labRequestForm.reason}
              onChange={(e) => setLabRequestForm({ ...labRequestForm, reason: e.target.value })}
              placeholder="e.g. Pre-extraction coagulation screening, Pregnancy test before x-ray"
              className="w-full p-2.5 bg-slate-50 border rounded-xl"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <button
              type="button"
              onClick={() => setIsLabRequestModalOpen(false)}
              className="px-4 py-2 bg-slate-100 rounded-xl font-bold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || (labRequestForm.test_ids || []).length === 0}
              className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold shadow-md disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{submitting ? 'Sending...' : 'Send to Laboratory'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* 3. Doctor Views Completed Laboratory Results */}
      <Modal
        isOpen={isViewLabResultModalOpen}
        onClose={() => setIsViewLabResultModalOpen(false)}
        title={`Laboratory Result — ${viewingLabResultData?.visit?.patient_id?.name || 'Patient'}`}
        maxWidth="max-w-lg"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">Patient Name:</span>
              <span className="font-black text-slate-900 text-sm">{viewingLabResultData?.visit?.patient_id?.name}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">Visit Number:</span>
              <span className="font-mono font-bold text-slate-700">{viewingLabResultData?.visit?.visit_number}</span>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-bold text-slate-800 text-xs">Test Outcome(s):</h4>
            {(viewingLabResultData?.results || []).length === 0 && (viewingLabResultData?.requests || []).length === 0 ? (
              <p className="text-slate-400 italic text-center py-4">No lab results found for this visit.</p>
            ) : (
              (viewingLabResultData?.requests || []).map((req, idx) => {
                const resObj = viewingLabResultData?.results?.find(r => r.request_id?.toString() === req._id?.toString());
                const totalCostVal = req.total_cost || req.cost || req.price || resObj?.cost || 0;

                return (
                  <div key={idx} className="p-4 border border-purple-100 bg-purple-50/30 rounded-2xl space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider block font-mono">
                          Request #{req.request_number}
                        </span>
                        <span className="font-black text-slate-900 text-sm block mt-0.5">
                          {req.tests?.length > 0 ? `${req.tests.length} Laboratory Tests` : req.test_name}
                        </span>
                        <span className="text-[10px] text-slate-400">Clinical Reason: {req.reason || 'Pre-treatment screening'}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Cost</span>
                        <span className="text-sm font-black font-mono text-purple-900">${Number(totalCostVal).toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Individual Test Items Breakdown */}
                    {(req.tests && req.tests.length > 0) ? (
                      <div className="space-y-2">
                        {req.tests.map((t, tIdx) => {
                          const isPos = t.result?.toLowerCase().includes('positive') || t.result?.toLowerCase().includes('reactive');
                          const isNeg = t.result?.toLowerCase().includes('negative') || t.result?.toLowerCase().includes('non-reactive');

                          return (
                            <div key={tIdx} className="p-2.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-3 shadow-2xs">
                              <div>
                                <span className="font-bold text-slate-900 text-xs block">{t.test_name}</span>
                                <span className="text-[10px] text-slate-400">{t.category || 'General'}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="font-mono text-slate-500 text-xs font-bold">${Number(t.cost || 0).toFixed(2)}</span>
                                <span className={`px-2.5 py-1 rounded-full text-xs font-black ${
                                  isPos ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                                  isNeg ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                                  'bg-blue-100 text-blue-800 border border-blue-200'
                                }`}>
                                  {t.result || 'Pending'}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-2.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between">
                        <span className="text-slate-500 font-bold">Result:</span>
                        <span className="px-2.5 py-1 rounded-full text-xs font-black bg-blue-100 text-blue-800">
                          {req.result || resObj?.result || 'Pending Result'}
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between text-[10px] text-slate-500 pt-1 border-t border-purple-100">
                      <span>Performed / Entered by: <strong>{req.performed_by || resObj?.performed_by || 'Cashier'}</strong></span>
                      <span>{new Date(req.completed_date || req.updatedAt).toLocaleDateString()}</span>
                    </div>

                    {req.notes && (
                      <p className="text-[11px] text-slate-600 bg-white/80 p-2 rounded-xl border border-slate-100">
                        <strong>Notes:</strong> {req.notes}
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsViewLabResultModalOpen(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => {
                const targetVisit = viewingLabResultData?.visit;
                setIsViewLabResultModalOpen(false);
                if (targetVisit) {
                  handleOpenTreatment(targetVisit);
                }
              }}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              <span>🦷 Start Treatment</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* 4. Dental Treatment Recording Modal with Multi-teeth FDI Chart & Doctor Discount */}
      <Modal
        isOpen={isTreatmentModalOpen}
        onClose={() => setIsTreatmentModalOpen(false)}
        title="Record Dental Procedure & Treatment"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={submitTreatment} className="space-y-4 text-xs">
          
          {/* FDI Interactive Tooth Chart */}
          <div>
            <label className="block font-bold text-slate-700 mb-1.5">Select Target Tooth / Teeth</label>
            <ToothChart
              selectedTooth={treatmentForm.tooth_number}
              onSelectTooth={(t) => setTreatmentForm({ ...treatmentForm, tooth_number: t })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Dental Procedure *</label>
              <select
                required
                value={treatmentForm.service_id}
                onChange={(e) => {
                  const val = e.target.value;
                  const srv = services.find(s => s._id === val);
                  setTreatmentForm({
                    ...treatmentForm,
                    service_id: val,
                    price: srv?.price !== undefined ? srv.price : treatmentForm.price
                  });
                }}
                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition cursor-pointer"
              >
                <option value="">-- Select Dental Procedure --</option>
                {services.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.service_name} — ${Number(s.price).toFixed(2)} ({s.category})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Procedure Price ($) *</label>
              <input
                type="number"
                required
                min="0"
                value={treatmentForm.price}
                onChange={(e) => setTreatmentForm({ ...treatmentForm, price: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border rounded-xl font-mono font-bold text-slate-900"
              />
            </div>

            <div>
              <label className="block font-bold text-emerald-700 mb-1">Doctor Discount ($)</label>
              <input
                type="number"
                min="0"
                max={treatmentForm.price || 9999}
                value={treatmentForm.discount || 0}
                onChange={(e) => setTreatmentForm({ ...treatmentForm, discount: e.target.value })}
                placeholder="Optional discount"
                className="w-full p-2.5 bg-emerald-50/60 border border-emerald-200 rounded-xl font-mono font-bold text-emerald-800"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Procedure & Clinical Notes</label>
            <textarea
              rows="2"
              value={treatmentForm.treatment_notes}
              onChange={(e) => setTreatmentForm({ ...treatmentForm, treatment_notes: e.target.value })}
              placeholder="e.g. Composite shade A2 placed on tooth 24 mesial-occlusal cavity. Polish completed."
              className="w-full p-2.5 bg-slate-50 border rounded-xl"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Schedule Follow-up Date (Optional)</label>
            <input
              type="date"
              value={treatmentForm.followup_date}
              onChange={(e) => setTreatmentForm({ ...treatmentForm, followup_date: e.target.value })}
              className="w-full p-2.5 bg-slate-50 border rounded-xl font-medium"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <button
              type="button"
              onClick={() => setIsTreatmentModalOpen(false)}
              className="px-4 py-2 bg-slate-100 rounded-xl font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold shadow-md"
            >
              {submitting ? 'Recording...' : 'Complete Treatment & Send to Cashier'}
            </button>
          </div>
        </form>
      </Modal>

      {/* 5. Payment Modal (Consultation / Lab / Final Bill with Cashier Discount) */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        icon={Receipt}
        title={`Cashier POS: Receive Payment — ${paymentForm.payment_category}`}
        subtitle="Collect payment against approved invoice balance. Invoices cannot be modified or increased here."
        maxWidth="max-w-xl"
      >
        <form onSubmit={submitPayment} className="space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 1. Patient Financial Summary Card */}
          <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-md space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Patient Account</span>
                <p className="text-sm font-black text-white">{selectedVisit?.patient_id?.name || 'Walk-in Patient'}</p>
                <p className="text-[11px] text-slate-400 font-mono">
                  {selectedVisit?.patient_id?.patient_number || ''} • Visit: {selectedVisit?.visit_number}
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Category</span>
                <p className="text-xs font-bold text-amber-400">{paymentForm.payment_category}</p>
              </div>
            </div>

            {/* Financial Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              <div className="p-2.5 bg-slate-800/80 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-bold">Total Treatment</span>
                <span className="font-mono font-bold text-xs text-slate-200">${vTreatmentCost.toFixed(2)}</span>
              </div>
              <div className="p-2.5 bg-slate-800/80 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-bold">Additional Costs</span>
                <span className="font-mono font-bold text-xs text-slate-200">${vAdditionalCosts.toFixed(2)}</span>
              </div>
              <div className="p-2.5 bg-slate-800/80 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-bold">Total Patient Cost</span>
                <span className="font-mono font-black text-xs text-white">${vTotalPatientCost.toFixed(2)}</span>
              </div>
              <div className="p-2.5 bg-slate-800/80 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-bold">Previously Paid</span>
                <span className="font-mono font-bold text-xs text-emerald-400">${vPreviouslyPaid.toFixed(2)}</span>
              </div>
            </div>

            {/* Outstanding Balance Banner */}
            <div className="p-3 bg-slate-800 rounded-xl flex justify-between items-center border border-slate-700/80">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Current Outstanding Balance</span>
                {vApprovedDiscount > 0 && (
                  <span className="text-[10px] text-emerald-400 block font-semibold">Includes previous discount: ${vApprovedDiscount.toFixed(2)}</span>
                )}
              </div>
              <span className={`font-mono text-lg font-black ${
                vEffectiveOutstanding > 0 ? 'text-rose-400' : 'text-emerald-400'
              }`}>
                ${vEffectiveOutstanding.toFixed(2)}
              </span>
            </div>
          </div>

          {/* 2. Payment Amount & Cashier Discount Input Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Payment Amount */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="font-bold text-slate-700">Payment Amount ($) *</label>
                <span className="text-[10px] font-bold text-slate-400 font-mono">Max: ${vMaxPaymentAllowed.toFixed(2)}</span>
              </div>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="number"
                  min="0.01"
                  max={vMaxPaymentAllowed}
                  step="0.01"
                  required
                  disabled={vEffectiveOutstanding <= 0}
                  value={paymentForm.amount}
                  onChange={(e) => {
                    const val = e.target.value;
                    setPaymentForm({ ...paymentForm, amount: val });
                  }}
                  placeholder="0.00"
                  className={`w-full pl-9 pr-3.5 py-2.5 rounded-xl font-mono font-black text-base transition border ${
                    vPaymentExceeded
                      ? 'border-rose-500 bg-rose-50/50 text-rose-700 ring-1 ring-rose-500'
                      : 'border-slate-200 bg-white text-emerald-700 focus:border-emerald-500 focus:outline-none'
                  }`}
                />
              </div>
              {vPaymentExceeded && (
                <div className="p-2 mt-1.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 font-bold text-[11px] flex items-start gap-1.5">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                  <span>Payment amount cannot exceed the patient’s outstanding balance of ${vMaxPaymentAllowed.toFixed(2)}.</span>
                </div>
              )}
            </div>

            {/* Cashier Discount */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="font-bold text-emerald-800">Cashier Discount ($)</label>
                <span className="text-[10px] font-bold text-slate-400 font-mono">Max: ${vBaseOutstanding.toFixed(2)}</span>
              </div>
              <div className="relative">
                <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                <input
                  type="number"
                  min="0"
                  max={vBaseOutstanding}
                  step="0.01"
                  value={paymentForm.discount || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    const numDiscount = Number(val) || 0;
                    const newMax = Math.max(0, vBaseOutstanding - numDiscount);
                    setPaymentForm({
                      ...paymentForm,
                      discount: val,
                      amount: Number(paymentForm.amount) > newMax ? (newMax > 0 ? newMax : 0) : paymentForm.amount
                    });
                  }}
                  placeholder="0.00"
                  className={`w-full pl-9 pr-3.5 py-2.5 rounded-xl font-mono font-bold text-base transition border ${
                    vCashierDiscountExceeded
                      ? 'border-rose-500 bg-rose-50/50 text-rose-700 ring-1 ring-rose-500'
                      : 'border-emerald-200 bg-emerald-50/40 text-emerald-900 focus:border-emerald-500 focus:outline-none'
                  }`}
                />
              </div>
              {vCashierDiscountExceeded && (
                <div className="p-2 mt-1.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 font-bold text-[11px] flex items-start gap-1.5">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                  <span>Discount cannot exceed the outstanding balance of ${vBaseOutstanding.toFixed(2)}.</span>
                </div>
              )}
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">Payment Method *</label>
            <select
              value={paymentForm.payment_method}
              onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}
              className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="Cash">💵 Cash</option>
              <option value="Mobile Payment">📱 Mobile Payment (EVC Plus / Zaad / Sahal)</option>
              <option value="Card">💳 Credit / Debit Card (POS)</option>
              <option value="Bank Transfer">🏦 Bank Transfer</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Receipt Notes / Reference</label>
            <input
              type="text"
              value={paymentForm.notes}
              onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
              placeholder="e.g. Paid at reception desk"
              className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-medium"
            />
          </div>

          {/* 3. Paying Now Breakdown & Confirmation Card */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
            <div className="flex justify-between items-center pb-1.5 border-b border-slate-200/80">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Payment Summary</span>
              </span>
              <span className="text-[10px] text-slate-400 font-medium">Review prior to confirmation</span>
            </div>

            <div className="space-y-1.5 font-medium text-slate-600 text-xs">
              <div className="flex justify-between">
                <span>Patient:</span>
                <span className="font-bold text-slate-900">{selectedVisit?.patient_id?.name || 'Walk-in Patient'}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Patient Cost:</span>
                <span className="font-mono text-slate-900">${vTotalPatientCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Previously Paid:</span>
                <span className="font-mono text-emerald-700">${vPreviouslyPaid.toFixed(2)}</span>
              </div>
              {(vApprovedDiscount > 0 || vCurrentCashierDiscount > 0) && (
                <div className="flex justify-between">
                  <span>Discount:</span>
                  <span className="font-mono text-emerald-700 font-bold">-${(vApprovedDiscount + vCurrentCashierDiscount).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Outstanding Balance:</span>
                <span className="font-mono font-bold text-slate-900">${vBaseOutstanding.toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-1.5 border-t border-slate-200 text-purple-950 font-bold">
                <span>Paying Now:</span>
                <span className="font-mono text-sm font-black text-purple-700">${vPayingNow.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-900 font-bold">
                <span>Balance Remaining:</span>
                <span className={`font-mono text-sm font-black ${vRemainingBalance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  ${vRemainingBalance.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* 4. Prevent Unauthorized Increase Notice */}
          <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-2xl flex items-start gap-2.5 text-amber-900">
            <Lock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-xs text-amber-950">Invoice Change Required</p>
              <p className="text-[10px] text-amber-800 leading-relaxed mt-0.5">
                The patient's invoice must be updated by an authorized staff member before this additional charge can be collected. Cashiers cannot modify base treatment costs or increase invoice amounts from this screen.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsPaymentModalOpen(false)}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || vPaymentExceeded || vCashierDiscountExceeded || vIsZeroPayment || vEffectiveOutstanding <= 0}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Receipt className="w-4 h-4" />
              <span>{submitting ? 'Processing...' : 'Confirm & Print Receipt'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* 6. Printable Thermal Receipt Modal */}
      <ReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        payment={currentPayment}
      />

      {/* 7. Doctor Consultation Token Slip Modal */}
      <ConsultationTokenModal
        isOpen={isTokenModalOpen}
        onClose={() => setIsTokenModalOpen(false)}
        visit={tokenVisit}
      />

      {/* 8. Create New Visit / Check-In Modal (Select Doctor Only - No Upfront Fee) */}
      <Modal
        isOpen={isNewVisitModalOpen}
        onClose={() => setIsNewVisitModalOpen(false)}
        title="Check-In Patient for Doctor Consultation"
        maxWidth="max-w-lg"
      >
        <form onSubmit={submitNewVisit} className="space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <SearchableSelect
              label="Select Patient"
              required
              icon={Users}
              placeholder="-- Search & Select Registered Patient --"
              searchPlaceholder="Search by patient name, telephone, or ID..."
              value={newVisitForm.patient_id}
              onChange={(val) => setNewVisitForm({ ...newVisitForm, patient_id: val })}
              onSearch={async (q) => {
                const res = await getPatientsApi({ search: q, limit: 30 });
                return (res.data?.data || []).map(p => ({
                  value: p._id,
                  label: p.name,
                  sublabel: `${p.patient_number} • ${p.telephone}`,
                  badge: p.gender
                }));
              }}
              options={patientsList.map(p => ({
                value: p._id,
                label: p.name,
                sublabel: `${p.patient_number} • ${p.telephone}`,
                badge: p.gender
              }))}
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Visit Type *</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'first', label: 'First Visit', desc: 'Consultation fee applied' },
                { value: 'follow-up', label: 'Follow-up Visit', desc: 'No consultation fee' },
                { value: 'emergency', label: 'Emergency Visit', desc: 'No consultation fee' },
                { value: 'review', label: 'Review Visit', desc: 'No consultation fee' }
              ].map((vt) => (
                <button
                  key={vt.value}
                  type="button"
                  onClick={() => setNewVisitForm({ ...newVisitForm, visit_type: vt.value })}
                  className={`text-left p-2.5 rounded-xl border text-xs transition cursor-pointer ${
                    newVisitForm.visit_type === vt.value
                      ? 'border-blue-500 bg-blue-50/80 ring-2 ring-blue-200 shadow-xs'
                      : 'border-slate-200 bg-slate-50/60 hover:border-slate-300'
                  }`}
                >
                  <span className="font-bold text-slate-900 block">{vt.label}</span>
                  <span className={`text-[10px] ${vt.value === 'first' ? 'text-amber-600 font-bold' : 'text-slate-400'}`}>
                    {vt.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {newVisitForm.visit_type === 'first' ? (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-[11px] flex items-center gap-2">
              <span className="text-base">💰</span>
              <span><strong>First Visit:</strong> Consultation fee will be charged. Patient queued to <strong>Waiting for Payment</strong>.</span>
            </div>
          ) : (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-[11px] flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-emerald-600 shrink-0" />
              <span><strong>No Consultation Fee:</strong> Patient queued directly to selected Doctor (<strong>Waiting for Doctor</strong>).</span>
            </div>
          )}

          <div>
            <label className="block font-bold text-slate-700 mb-1">Select Attending Doctor *</label>
            <select
              required
              value={newVisitForm.doctor_id}
              onChange={(e) => setNewVisitForm({ ...newVisitForm, doctor_id: e.target.value })}
              className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition cursor-pointer"
            >
              <option value="">-- Select Attending Doctor --</option>
              {doctorsList.map((d) => (
                <option key={d._id} value={d._id}>
                  Dr. {d.full_name || d.username} ({d.employee_id?.specialization || 'Dental Surgeon'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Reason for Visit</label>
            <input
              type="text"
              value={newVisitForm.reason}
              onChange={(e) => setNewVisitForm({ ...newVisitForm, reason: e.target.value })}
              placeholder="e.g. Toothache, Scaling, Orthodontic follow-up"
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Chief Complaint / Notes (Optional)</label>
            <textarea
              rows="2"
              value={newVisitForm.complaint}
              onChange={(e) => setNewVisitForm({ ...newVisitForm, complaint: e.target.value })}
              placeholder="Symptoms or details mentioned by patient..."
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsNewVisitModalOpen(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md cursor-pointer"
            >
              {submitting ? 'Queuing Patient...' : 'Queue for Doctor Consultation'}
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
};

export default VisitList;

