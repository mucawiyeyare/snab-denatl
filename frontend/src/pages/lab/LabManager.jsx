import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  getLabRequestsApi,
  getLabResultsApi,
  getLabTestsApi,
  createLabRequestApi,
  processLabSessionApi,
  createLabTestApi,
  updateLabTestApi,
  deleteLabTestApi,
  deleteLabRequestApi,
  getVisitsApi
} from '../../api/endpoints.js';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import Modal from '../../components/ui/Modal.jsx';
import {
  TestTube2,
  Search,
  Plus,
  CheckCircle,
  Clock,
  AlertCircle,
  FileText,
  DollarSign,
  Send,
  User,
  Stethoscope,
  Edit2,
  Trash2,
  Calendar,
  Sparkles,
  ArrowRight,
  Users
} from 'lucide-react';
import SearchableSelect from '../../components/ui/SearchableSelect.jsx';

const COMMON_RESULTS = [
  'Negative',
  'Positive',
  'Non-Reactive',
  'Reactive',
  'Normal',
  'O+',
  'A+',
  'B+',
  'AB+'
];

const LabManager = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';
  const isCashier = user?.role === 'Receptionist/Cashier' || user?.role === 'Admin';

  const [activeTab, setActiveTab] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [notificationMsg, setNotificationMsg] = useState('');

  // Data
  const [requests, setRequests] = useState([]);
  const [results, setResults] = useState([]);
  const [tests, setTests] = useState([]);
  const [activeVisits, setActiveVisits] = useState([]);

  // 1. Doctor's Lab Request Modal
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [requestVisitId, setRequestVisitId] = useState('');
  const [requestSelectedTestIds, setRequestSelectedTestIds] = useState([]);
  const [requestReason, setRequestReason] = useState('Pre-treatment screening');

  // 2. Cashier's Manual Lab Session Modal (Cost + Result + Send to Doctor)
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [sessionTests, setSessionTests] = useState([]);
  const [sessionForm, setSessionForm] = useState({
    notes: '',
    payment_method: 'Cash',
    mark_paid: true
  });

  // 3. Test Catalog Modal (Add & Edit Tests)
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [editingTest, setEditingTest] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [testForm, setTestForm] = useState({
    test_name: '',
    category: 'Infectious Disease Screening',
    price: '',
    sample_type: 'Whole Blood / Serum',
    reference_range: 'Negative / Non-Reactive',
    description: '',
    status: 'Active'
  });

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchLabData();
  }, []);

  const fetchLabData = async () => {
    setLoading(true);
    try {
      const [reqRes, resRes, testRes, visitRes] = await Promise.all([
        getLabRequestsApi(),
        getLabResultsApi(),
        getLabTestsApi(),
        getVisitsApi({ today: 'true' }).catch(() => ({ data: { data: [] } }))
      ]);
      setRequests(reqRes.data?.data || []);
      setResults(resRes.data?.data || []);
      setTests(testRes.data?.data || []);
      setActiveVisits(visitRes.data?.data || []);
    } catch (err) {
      console.error('Error fetching lab data:', err);
    } finally {
      setLoading(false);
    }
  };

  // --- Doctor Sends Patient to Laboratory ---
  const handleOpenDoctorRequestModal = () => {
    setRequestVisitId(activeVisits[0]?._id || '');
    setRequestSelectedTestIds([]);
    setRequestReason('Pre-treatment screening');
    setIsRequestModalOpen(true);
  };

  const handleToggleTestInRequest = (testId) => {
    if (requestSelectedTestIds.includes(testId)) {
      setRequestSelectedTestIds(requestSelectedTestIds.filter((id) => id !== testId));
    } else {
      setRequestSelectedTestIds([...requestSelectedTestIds, testId]);
    }
  };

  const submitDoctorLabRequest = async (e) => {
    e.preventDefault();
    if (!requestVisitId) {
      alert('Please select a patient visit');
      return;
    }
    if (requestSelectedTestIds.length === 0) {
      alert('Please select at least one laboratory test');
      return;
    }

    setSubmitting(true);
    try {
      await createLabRequestApi({
        visit_id: requestVisitId,
        test_ids: requestSelectedTestIds,
        reason: requestReason
      });
      setIsRequestModalOpen(false);
      setRequestSelectedTestIds([]);
      setRequestVisitId('');
      fetchLabData();
      showToast('Patient sent to Laboratory / Cashier session!');
    } catch (err) {
      console.error('Error creating lab request:', err);
      alert(err.response?.data?.message || 'Error sending to laboratory');
    } finally {
      setSubmitting(false);
    }
  };

  // --- Cashier Manages Manual Session ---
  const handleOpenSessionModal = (req) => {
    setSelectedRequest(req);
    const testList = (req.tests && req.tests.length > 0)
      ? req.tests.map((t) => ({
          test_id: t.test_id?._id || t.test_id || t._id,
          test_name: t.test_name,
          category: t.category || '',
          sample_type: t.sample_type || '',
          reference_range: t.reference_range || '',
          cost: t.cost !== undefined && t.cost !== null && t.cost !== 0 ? t.cost : (t.price || ''),
          result: t.result || '',
          clinical_interpretation: t.clinical_interpretation || 'Normal'
        }))
      : [
          {
            test_id: req.test_id?._id || req.test_id,
            test_name: req.test_name || 'Laboratory Test',
            category: req.test_id?.category || '',
            sample_type: req.test_id?.sample_type || '',
            reference_range: '',
            cost: req.cost || req.price || '',
            result: req.result || '',
            clinical_interpretation: 'Normal'
          }
        ];

    setSessionTests(testList);
    setSessionForm({
      notes: req.notes || '',
      payment_method: 'Cash',
      mark_paid: true
    });
    setIsSessionModalOpen(true);
  };

  const submitCashierSession = async (e) => {
    e.preventDefault();
    
    // Check if at least one test has result
    const hasAnyResult = sessionTests.some(t => t.result && t.result.trim());
    if (!hasAnyResult) {
      alert('Please enter at least one test result before submitting to the doctor.');
      return;
    }

    setSubmitting(true);
    try {
      await processLabSessionApi(selectedRequest._id, {
        tests: sessionTests,
        notes: sessionForm.notes,
        payment_method: sessionForm.payment_method,
        mark_paid: sessionForm.mark_paid
      });
      setIsSessionModalOpen(false);
      setSelectedRequest(null);
      fetchLabData();
      showToast(`Laboratory request completed for ${selectedRequest.patient_id?.name || 'patient'} and sent to Doctor!`);
    } catch (err) {
      console.error('Error processing lab session:', err);
      alert(err.response?.data?.message || 'Error processing session');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRequest = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this laboratory request?')) return;
    try {
      await deleteLabRequestApi(id);
      fetchLabData();
      showToast('Laboratory request cancelled.');
    } catch (err) {
      alert(err.response?.data?.message || 'Error deleting request');
    }
  };

  // --- Test Catalog Actions (Admin) ---
  const handleOpenAddTest = () => {
    setEditingTest(null);
    setTestForm({
      test_name: '',
      category: 'Infectious Disease Screening',
      price: '',
      sample_type: 'Whole Blood / Serum',
      reference_range: 'Negative / Non-Reactive',
      description: '',
      status: 'Active'
    });
    setIsTestModalOpen(true);
  };

  const handleOpenEditTest = (test) => {
    setEditingTest(test);
    setTestForm({
      test_name: test.test_name || '',
      category: test.category || '',
      price: test.price !== undefined ? test.price : '',
      sample_type: test.sample_type || 'Whole Blood / Serum',
      reference_range: test.reference_range || '',
      description: test.description || '',
      status: test.status || 'Active'
    });
    setIsTestModalOpen(true);
  };

  const handleDeleteTest = async (id) => {
    try {
      await deleteLabTestApi(id);
      setDeleteConfirmId(null);
      fetchLabData();
    } catch (err) {
      console.error('Error deleting lab test:', err);
      alert(err.response?.data?.message || 'Error deleting lab test');
    }
  };

  const submitTestCatalog = async (e) => {
    e.preventDefault();
    if (!testForm.test_name?.trim()) {
      alert('Please enter a test or disease name');
      return;
    }
    if (!testForm.category?.trim()) {
      alert('Please enter or select a disease category');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...testForm,
        test_name: testForm.test_name.trim(),
        category: testForm.category.trim(),
        price: testForm.price !== '' ? Number(testForm.price) : 0
      };

      if (editingTest) {
        await updateLabTestApi(editingTest._id, payload);
      } else {
        await createLabTestApi(payload);
      }
      setIsTestModalOpen(false);
      setEditingTest(null);
      fetchLabData();
      showToast(editingTest ? 'Lab test updated!' : 'New lab test added to catalog!');
    } catch (err) {
      console.error('Error saving lab test:', err);
      alert(err.response?.data?.message || 'Error saving lab test');
    } finally {
      setSubmitting(false);
    }
  };

  const showToast = (msg) => {
    setNotificationMsg(msg);
    setTimeout(() => setNotificationMsg(''), 5000);
  };

  // Filtered requests
  const pendingRequests = requests.filter(
    (r) => r.status === 'Pending' || r.status === 'Payment Required' || r.status === 'Requested'
  );
  const completedRequests = requests.filter((r) => r.status === 'Completed');

  const filteredPending = pendingRequests.filter((r) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      r.patient_id?.name?.toLowerCase().includes(q) ||
      r.patient_id?.telephone?.toLowerCase().includes(q) ||
      r.patient_id?.patient_number?.toLowerCase().includes(q) ||
      r.test_name?.toLowerCase().includes(q) ||
      r.doctor_id?.full_name?.toLowerCase().includes(q)
    );
  });

  const filteredCompleted = completedRequests.filter((r) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      r.patient_id?.name?.toLowerCase().includes(q) ||
      r.test_name?.toLowerCase().includes(q) ||
      r.result?.toLowerCase().includes(q) ||
      r.doctor_id?.full_name?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      
      {/* Toast Notification Banner */}
      {notificationMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-2xl flex items-center gap-2.5 shadow-sm">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{notificationMsg}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Laboratory Sessions</h1>
          <p className="text-xs text-slate-500">
            Simple manual laboratory workflow: <strong className="text-blue-600">Doctor → Cashier → Doctor</strong>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenDoctorRequestModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-md transition cursor-pointer"
          >
            <Stethoscope className="w-4 h-4" />
            Request Lab Test
          </button>

          {isAdmin && (
            <button
              onClick={handleOpenAddTest}
              className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 shadow-xs transition cursor-pointer"
            >
              <Plus className="w-4 h-4 text-blue-600" />
              Add Test to Catalog
            </button>
          )}
        </div>
      </div>

      {/* Simple Workflow Step Indicator */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-xs">
        <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 overflow-x-auto min-w-[650px] px-2">
          <div className="flex items-center gap-2 text-blue-600">
            <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-black">1</span>
            <span>Doctor Requests Test</span>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-slate-300" />
          <div className="flex items-center gap-2 text-purple-600 font-black">
            <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-[10px] font-black">2</span>
            <span>Cashier Enters Cost & Result</span>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-slate-300" />
          <div className="flex items-center gap-2 text-emerald-600">
            <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-black">3</span>
            <span>Result Sent to Doctor & Billed</span>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-slate-300" />
          <div className="flex items-center gap-2 text-teal-600">
            <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-[10px] font-black">4</span>
            <span>Doctor Starts Treatment</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex gap-2">
          {[
            { id: 'pending', label: `Pending Sessions (${pendingRequests.length})`, count: pendingRequests.length },
            { id: 'completed', label: `Completed Archive (${completedRequests.length})`, count: completedRequests.length },
            { id: 'catalog', label: `Tests Catalog (${tests.length})`, count: tests.length }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="w-full sm:w-80 bg-white p-2.5 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-2">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search patient, test, doctor..."
            className="w-full text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-xs font-bold text-slate-400 hover:text-slate-600">
              ✕
            </button>
          )}
        </div>
      </div>

      {/* TAB 1: PENDING LABORATORY SESSIONS */}
      {activeTab === 'pending' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : filteredPending.length === 0 ? (
            <div className="text-center py-16 space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                <CheckCircle className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-700">No pending laboratory sessions</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                When a doctor requests a lab test, it will appear here immediately for the cashier to manage.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider">
                    <th className="py-3.5 px-5">Session #</th>
                    <th className="py-3.5 px-4">Patient Name & ID</th>
                    <th className="py-3.5 px-4">Requested Test(s)</th>
                    <th className="py-3.5 px-4">Requested By</th>
                    <th className="py-3.5 px-4">Date / Time</th>
                    <th className="py-3.5 px-4">Clinical Reason</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-5 text-right">Cashier Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredPending.map((req) => {
                    const testCount = (req.tests && req.tests.length > 0) ? req.tests.length : 1;
                    return (
                      <tr key={req._id} className="hover:bg-slate-50/80 transition">
                        <td className="py-4 px-5 font-mono font-bold text-blue-600">
                          {req.request_number}
                        </td>
                        <td className="py-4 px-4">
                          <span className="font-bold text-slate-900 block text-xs">{req.patient_id?.name}</span>
                          <span className="text-[11px] text-slate-400 font-mono">
                            {req.patient_id?.patient_number || req.patient_id?.telephone}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <div className="space-y-1.5 max-w-xs">
                            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-purple-800 border border-purple-200">
                              {testCount} {testCount === 1 ? 'Test' : 'Tests'}
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {(req.tests && req.tests.length > 0) ? (
                                req.tests.map((t, idx) => (
                                  <span key={idx} className="inline-block px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                                    {t.test_name}
                                  </span>
                                ))
                              ) : (
                                <span className="font-bold text-slate-900 text-xs">{req.test_name}</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-slate-700 font-medium">
                          Dr. {req.doctor_id?.full_name || req.doctor_id?.username}
                        </td>
                        <td className="py-4 px-4 text-slate-500 text-[11px]">
                          {new Date(req.request_date || req.createdAt).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </td>
                        <td className="py-4 px-4 text-slate-500 max-w-xs truncate">
                          {req.reason || 'Pre-treatment screening'}
                        </td>
                        <td className="py-4 px-4">
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            Pending
                          </span>
                        </td>
                        <td className="py-4 px-5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenSessionModal(req)}
                              className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 active:scale-95 text-white font-bold rounded-xl text-xs shadow-sm transition cursor-pointer flex items-center gap-1.5"
                            >
                              <DollarSign className="w-3.5 h-3.5" />
                              <span>Enter Cost & Result</span>
                            </button>

                            <button
                              onClick={() => handleDeleteRequest(req._id)}
                              title="Cancel Request"
                              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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
      )}

      {/* TAB 2: COMPLETED RESULTS ARCHIVE */}
      {activeTab === 'completed' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
          {filteredCompleted.length === 0 ? (
            <div className="text-center py-16 text-slate-400 text-xs">
              No completed laboratory records match your search.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider">
                    <th className="py-3.5 px-5">Session #</th>
                    <th className="py-3.5 px-4">Patient</th>
                    <th className="py-3.5 px-4">Laboratory Tests & Outcomes</th>
                    <th className="py-3.5 px-4 text-right">Total Cost</th>
                    <th className="py-3.5 px-4">Entered By</th>
                    <th className="py-3.5 px-4">Doctor</th>
                    <th className="py-3.5 px-4">Date Completed</th>
                    <th className="py-3.5 px-5 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredCompleted.map((r) => {
                    const totalCost = Number(r.total_cost || r.cost || r.price || 0);

                    return (
                      <tr key={r._id} className="hover:bg-slate-50/80 transition">
                        <td className="py-4 px-5 font-mono font-bold text-slate-600">{r.request_number}</td>
                        <td className="py-4 px-4">
                          <span className="font-bold text-slate-900 block">{r.patient_id?.name}</span>
                          <span className="text-[11px] text-slate-400 font-mono">
                            {r.patient_id?.patient_number || r.patient_id?.telephone}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <div className="space-y-1.5 max-w-md">
                            {(r.tests && r.tests.length > 0) ? (
                              r.tests.map((t, idx) => {
                                const isPos = t.result?.toLowerCase().includes('positive') || t.result?.toLowerCase().includes('reactive');
                                const isNeg = t.result?.toLowerCase().includes('negative') || t.result?.toLowerCase().includes('non-reactive');

                                return (
                                  <div key={idx} className="flex items-center justify-between gap-2 p-1.5 bg-slate-50 rounded-lg border border-slate-100">
                                    <span className="font-bold text-slate-800 text-[11px]">{t.test_name}</span>
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono text-slate-500 text-[10px] font-bold">${Number(t.cost || 0).toFixed(2)}</span>
                                      <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                                        isPos ? 'bg-rose-100 text-rose-800' :
                                        isNeg ? 'bg-emerald-100 text-emerald-800' :
                                        'bg-blue-100 text-blue-800'
                                      }`}>
                                        {t.result || 'Completed'}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })
                            ) : (
                              <div>
                                <span className="font-bold text-slate-800 block">{r.test_name}</span>
                                <span className="text-[11px] text-blue-700 font-bold">{r.result}</span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-4 text-right font-mono font-black text-slate-900 text-sm">
                          ${totalCost.toFixed(2)}
                        </td>
                        <td className="py-4 px-4 text-slate-700">{r.performed_by || 'Cashier'}</td>
                        <td className="py-4 px-4 text-slate-700">Dr. {r.doctor_id?.full_name || r.doctor_id?.username}</td>
                        <td className="py-4 px-4 text-slate-500 text-[11px]">
                          {new Date(r.completed_date || r.updatedAt).toLocaleDateString([], {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </td>
                        <td className="py-4 px-5 text-right">
                          <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 font-bold px-2.5 py-1 rounded-full text-[10px]">
                            ✓ Sent to Doctor
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: TESTS CATALOG */}
      {activeTab === 'catalog' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">Diagnostic Tests Catalog</h3>
              <p className="text-xs text-slate-500">
                Tests available for doctors to request. The cashier manually enters the actual price per session.
              </p>
            </div>
            {isAdmin && (
              <button
                onClick={handleOpenAddTest}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-sm transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Lab Test
              </button>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider">
                    <th className="py-3 px-5">Code</th>
                    <th className="py-3 px-4">Test / Disease Name</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Sample Type</th>
                    <th className="py-3 px-4">Reference Range</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    {isAdmin && <th className="py-3 px-5 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {tests.map((t) => (
                    <tr key={t._id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-5 font-mono font-bold text-purple-700">{t.test_code}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">{t.test_name}</td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-100">
                          {t.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">{t.sample_type || 'Blood'}</td>
                      <td className="py-3.5 px-4 font-mono text-slate-600">{t.reference_range || 'N/A'}</td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            t.status === 'Active'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {t.status || 'Active'}
                        </span>
                      </td>
                      {isAdmin && (
                        <td className="py-3.5 px-5 text-right">
                          {deleteConfirmId === t._id ? (
                            <div className="inline-flex items-center gap-1 bg-rose-50 border border-rose-200 rounded-xl px-2.5 py-1">
                              <span className="text-[10px] font-bold text-rose-700">Delete?</span>
                              <button
                                onClick={() => handleDeleteTest(t._id)}
                                className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold rounded-lg transition cursor-pointer"
                              >
                                Yes
                              </button>
                              <button
                                onClick={() => setDeleteConfirmId(null)}
                                className="px-2 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] font-bold rounded-lg transition cursor-pointer"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleOpenEditTest(t)}
                                title="Edit Test"
                                className="p-1.5 bg-amber-50 hover:bg-amber-500 hover:text-white text-amber-600 rounded-lg transition cursor-pointer"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setDeleteConfirmId(t._id)}
                                title="Delete Test"
                                className="p-1.5 bg-rose-50 hover:bg-rose-500 hover:text-white text-rose-500 rounded-lg transition cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: CASHIER PROCESSES WHOLE LABORATORY REQUEST */}
      <Modal
        isOpen={isSessionModalOpen}
        onClose={() => {
          setIsSessionModalOpen(false);
          setSelectedRequest(null);
        }}
        icon={DollarSign}
        title={`Process Laboratory Request: ${selectedRequest?.request_number || ''}`}
        subtitle="Enter individual test costs, enter test results, and send the complete package back to the doctor."
        maxWidth="max-w-2xl"
      >
        <form onSubmit={submitCashierSession} className="space-y-4 text-xs">
          {/* Patient & Doctor Context Banner */}
          <div className="p-3.5 bg-purple-50/70 border border-purple-200/80 rounded-2xl space-y-2">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Patient</span>
                <p className="text-sm font-black text-slate-900">{selectedRequest?.patient_id?.name}</p>
                <p className="text-[11px] text-slate-500 font-mono">
                  {selectedRequest?.patient_id?.patient_number} • {selectedRequest?.patient_id?.telephone}
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Requested By</span>
                <p className="text-xs font-bold text-slate-800">Dr. {selectedRequest?.doctor_id?.full_name || selectedRequest?.doctor_id?.username}</p>
                <p className="text-[10px] text-purple-700 font-bold mt-0.5">
                  Reason: {selectedRequest?.reason || 'Pre-treatment screening'}
                </p>
              </div>
            </div>
          </div>

          {/* Table of Individual Tests (with Cost & Result per Test) */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <TestTube2 className="w-4 h-4 text-purple-600" />
                <span>Requested Tests ({sessionTests.length}) — Individual Costs & Results</span>
              </label>
              <span className="text-[11px] text-slate-400">Enter cost & result for each test</span>
            </div>

            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {sessionTests.map((t, idx) => (
                <div key={idx} className="p-3 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-2.5 hover:border-purple-300 transition">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-800 font-bold text-[10px] flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span className="font-bold text-slate-900 text-xs">{t.test_name}</span>
                    </div>
                    <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                      {t.category || 'General'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
                    {/* Cost Input (4 cols) */}
                    <div className="sm:col-span-4">
                      <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Cost ($)</label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={t.cost}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSessionTests(prev => prev.map((item, i) => i === idx ? { ...item, cost: val } : item));
                          }}
                          className="w-full pl-6 pr-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:border-purple-500 bg-slate-50/50"
                        />
                      </div>
                    </div>

                    {/* Result Input (8 cols) */}
                    <div className="sm:col-span-8">
                      <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Result</label>
                      <input
                        type="text"
                        placeholder="e.g. Normal, Negative, 98 mg/dL, O+"
                        value={t.result}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSessionTests(prev => prev.map((item, i) => i === idx ? { ...item, result: val } : item));
                        }}
                        className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-blue-900 placeholder:text-slate-400 focus:outline-none focus:border-purple-500 bg-white"
                      />
                    </div>
                  </div>

                  {/* Quick Result Chips for this Test */}
                  <div className="flex flex-wrap items-center gap-1 pt-0.5">
                    <span className="text-[9px] text-slate-400 font-bold uppercase mr-1">Quick:</span>
                    {COMMON_RESULTS.map((res) => (
                      <button
                        key={res}
                        type="button"
                        onClick={() => {
                          setSessionTests(prev => prev.map((item, i) => i === idx ? { ...item, result: res } : item));
                        }}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition cursor-pointer border ${
                          t.result === res
                            ? 'bg-purple-600 text-white border-purple-600'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {res}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Live Calculated Total Cost Bar */}
            <div className="mt-3 p-3 bg-slate-900 text-white rounded-2xl flex justify-between items-center shadow-sm">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Laboratory Cost</span>
                <p className="text-[11px] text-slate-300">Sum of all {sessionTests.length} tests in this request</p>
              </div>
              <div className="text-right">
                <span className="font-mono text-lg font-black text-emerald-400">
                  ${sessionTests.reduce((acc, t) => acc + (parseFloat(t.cost) || 0), 0).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* General Notes */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Laboratory Notes / Clinical Remarks (Optional)
            </label>
            <input
              type="text"
              value={sessionForm.notes}
              onChange={(e) => setSessionForm({ ...sessionForm, notes: e.target.value })}
              placeholder="e.g. Tests performed on fresh serum, verified by cashier/lab technician"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-purple-500 bg-white transition"
            />
          </div>

          {/* Cashier Payment Processing */}
          <div className="p-3 bg-purple-50/60 border border-purple-200/70 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-purple-950">Approve & Record Payment at Cashier</p>
                <p className="text-[10px] text-purple-700">One single payment transaction for the entire request</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={sessionForm.mark_paid}
                  onChange={(e) => setSessionForm({ ...sessionForm, mark_paid: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>

            {sessionForm.mark_paid && (
              <div className="pt-2 border-t border-purple-200/50 flex items-center gap-2">
                <span className="text-[11px] font-bold text-purple-900">Payment Method:</span>
                <select
                  value={sessionForm.payment_method}
                  onChange={(e) => setSessionForm({ ...sessionForm, payment_method: e.target.value })}
                  className="px-2.5 py-1 bg-white border border-purple-200 rounded-lg text-xs font-bold text-purple-950 focus:outline-none cursor-pointer"
                >
                  <option value="Cash">💵 Cash</option>
                  <option value="Mobile Payment">📱 Mobile Payment (EVC Plus / Zaad)</option>
                  <option value="Card">💳 Credit / Debit Card</option>
                  <option value="Bank Transfer">🏦 Bank Transfer</option>
                </select>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setIsSessionModalOpen(false);
                setSelectedRequest(null);
              }}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 active:scale-[0.99] text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer flex items-center gap-2 disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{submitting ? 'Submitting...' : 'Submit All Results & Send to Doctor'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: DOCTOR REQUESTS LAB TEST */}
      <Modal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        icon={Stethoscope}
        title="Send Patient to Laboratory"
        subtitle="Select required tests and clinical reason. Test cost will be handled by the cashier."
        maxWidth="max-w-xl"
      >
        <form onSubmit={submitDoctorLabRequest} className="space-y-3.5 text-xs">
          {/* Select Active Patient Visit */}
          <div>
            <SearchableSelect
              label="Select Patient & Active Visit"
              required
              icon={Users}
              placeholder="-- Search & Select Patient / Active Visit --"
              searchPlaceholder="Search by patient name, telephone, or visit number..."
              value={requestVisitId}
              onChange={(val) => setRequestVisitId(val)}
              options={activeVisits.map((v) => ({
                value: v._id,
                label: v.patient_id?.name || 'Patient',
                sublabel: `${v.patient_id?.patient_number || ''} • ${v.patient_id?.telephone || ''}`,
                badge: `Visit ${v.visit_number}`
              }))}
            />
          </div>

          {/* Test Checkbox List (No forced prices shown) */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
              Select Required Lab Test(s) ({requestSelectedTestIds.length} selected) *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto p-2.5 bg-slate-50 rounded-2xl border border-slate-200">
              {tests.map((test) => {
                const isChecked = requestSelectedTestIds.includes(test._id);
                return (
                  <div
                    key={test._id}
                    onClick={() => handleToggleTestInRequest(test._id)}
                    className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 cursor-pointer transition ${
                      isChecked
                        ? 'bg-blue-50/80 border-blue-500 text-blue-900 shadow-2xs font-bold'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-4 h-4 rounded-md flex items-center justify-center border ${
                          isChecked ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 bg-white'
                        }`}
                      >
                        {isChecked && <CheckCircle className="w-3.5 h-3.5" />}
                      </div>
                      <span className="text-xs">{test.test_name}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-normal">{test.category}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Clinical Reason */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Clinical Reason / Indication
            </label>
            <input
              type="text"
              value={requestReason}
              onChange={(e) => setRequestReason(e.target.value)}
              placeholder="e.g. Pre-treatment screening, extraction preparation"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white transition"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsRequestModalOpen(false)}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || requestSelectedTestIds.length === 0}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{submitting ? 'Sending...' : 'Send to Laboratory'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 3: ADD / EDIT TEST IN CATALOG */}
      <Modal
        isOpen={isTestModalOpen}
        onClose={() => {
          setIsTestModalOpen(false);
          setEditingTest(null);
        }}
        icon={TestTube2}
        title={editingTest ? `Edit Test: ${editingTest.test_name}` : 'Add Test to Catalog'}
        subtitle="Configure diagnostic test names and disease panels for doctors to request."
        maxWidth="max-w-xl"
      >
        <form onSubmit={submitTestCatalog} className="space-y-3.5 text-xs">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Test / Disease Name *
            </label>
            <input
              type="text"
              required
              value={testForm.test_name}
              onChange={(e) => setTestForm({ ...testForm, test_name: e.target.value })}
              placeholder="e.g. Blood Glucose, Hemoglobin (Hb), Blood Group"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white transition"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Disease Category *
              </label>
              <input
                type="text"
                required
                value={testForm.category}
                onChange={(e) => setTestForm({ ...testForm, category: e.target.value })}
                placeholder="e.g. Blood, Infectious Disease, Biochemistry..."
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-purple-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white transition"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Sample Type</label>
              <input
                type="text"
                value={testForm.sample_type}
                onChange={(e) => setTestForm({ ...testForm, sample_type: e.target.value })}
                placeholder="e.g. Whole Blood, Serum, Urine"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Reference Range</label>
              <input
                type="text"
                value={testForm.reference_range}
                onChange={(e) => setTestForm({ ...testForm, reference_range: e.target.value })}
                placeholder="e.g. Negative, 70-100 mg/dL"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white transition"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Status</label>
              <select
                value={testForm.status}
                onChange={(e) => setTestForm({ ...testForm, status: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white transition cursor-pointer"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setIsTestModalOpen(false);
                setEditingTest(null);
              }}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold text-xs rounded-xl shadow-sm transition cursor-pointer disabled:opacity-50"
            >
              {submitting ? 'Saving...' : editingTest ? 'Update Test' : 'Add Test'}
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
};

export default LabManager;
