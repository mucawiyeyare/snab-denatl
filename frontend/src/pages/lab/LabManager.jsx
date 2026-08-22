import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  getLabRequestsApi,
  getLabResultsApi,
  getLabTestsApi,
  createLabRequestApi,
  createLabResultApi,
  createLabTestApi,
  updateLabTestApi,
  deleteLabTestApi,
  getVisitsApi
} from '../../api/endpoints.js';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import Modal from '../../components/ui/Modal.jsx';
import { TestTube2, Search, Plus, CheckCircle, Clock, AlertCircle, FileText, CheckSquare, Square, Stethoscope, Edit2, Trash2 } from 'lucide-react';

const LabManager = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';

  const [activeTab, setActiveTab] = useState('requests');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Data
  const [requests, setRequests] = useState([]);
  const [results, setResults] = useState([]);
  const [tests, setTests] = useState([]);
  const [activeVisits, setActiveVisits] = useState([]);

  // Batch / Multi-Blood Request Modal
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [batchVisitId, setBatchVisitId] = useState('');
  const [batchSelectedTestIds, setBatchSelectedTestIds] = useState([]);
  const [batchReason, setBatchReason] = useState('Diagnostic blood panel & pre-treatment screening');

  // Result entry modal
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [resultForm, setResultForm] = useState({
    result: '',
    reference_range: '',
    clinical_interpretation: 'Normal',
    notes: '',
    performed_by: ''
  });

  // Test catalog modal (Add & Edit)
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

  const handleToggleTestInBatch = (testId) => {
    if (batchSelectedTestIds.includes(testId)) {
      setBatchSelectedTestIds(batchSelectedTestIds.filter(id => id !== testId));
    } else {
      setBatchSelectedTestIds([...batchSelectedTestIds, testId]);
    }
  };

  const handleSelectAllCategory = (cat) => {
    const catTestIds = tests.filter(t => t.category === cat).map(t => t._id);
    const allSelected = catTestIds.every(id => batchSelectedTestIds.includes(id));
    if (allSelected) {
      setBatchSelectedTestIds(batchSelectedTestIds.filter(id => !catTestIds.includes(id)));
    } else {
      const combined = Array.from(new Set([...batchSelectedTestIds, ...catTestIds]));
      setBatchSelectedTestIds(combined);
    }
  };

  const submitBatchLabRequest = async (e) => {
    e.preventDefault();
    if (!batchVisitId) {
      alert('Please select a patient visit');
      return;
    }
    if (batchSelectedTestIds.length === 0) {
      alert('Please select at least one laboratory test');
      return;
    }

    setSubmitting(true);
    try {
      await createLabRequestApi({
        visit_id: batchVisitId,
        test_ids: batchSelectedTestIds,
        reason: batchReason
      });
      setIsBatchModalOpen(false);
      setBatchSelectedTestIds([]);
      setBatchVisitId('');
      fetchLabData();
    } catch (err) {
      console.error('Error creating batch lab request:', err);
      alert(err.response?.data?.message || 'Error creating lab tests');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEnterResult = (req) => {
    setSelectedRequest(req);
    setResultForm({
      result: '',
      reference_range: req.test_id?.reference_range || '',
      clinical_interpretation: 'Normal',
      notes: '',
      performed_by: user?.full_name || 'Laboratory Staff'
    });
    setIsResultModalOpen(true);
  };

  const submitResult = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createLabResultApi({
        request_id: selectedRequest._id,
        ...resultForm
      });
      setIsResultModalOpen(false);
      fetchLabData();
    } catch (err) {
      console.error('Error recording result:', err);
    } finally {
      setSubmitting(false);
    }
  };

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

  const submitTest = async (e) => {
    e.preventDefault();
    if (!testForm.test_name?.trim()) {
      alert('Please enter a test or disease name');
      return;
    }
    if (!testForm.category?.trim()) {
      alert('Please enter or select a disease category');
      return;
    }
    if (testForm.price === '' || isNaN(Number(testForm.price))) {
      alert('Please enter a valid price');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...testForm,
        test_name: testForm.test_name.trim(),
        category: testForm.category.trim(),
        price: Number(testForm.price)
      };

      if (editingTest) {
        await updateLabTestApi(editingTest._id, payload);
      } else {
        await createLabTestApi(payload);
      }
      setIsTestModalOpen(false);
      setEditingTest(null);
      fetchLabData();
    } catch (err) {
      console.error('Error saving lab test:', err);
      alert(err.response?.data?.message || 'Error saving lab test');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedTestsTotal = tests
    .filter(t => batchSelectedTestIds.includes(t._id))
    .reduce((sum, t) => sum + t.price, 0);

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Laboratory Management</h1>
          <p className="text-xs text-slate-500">Manage pre-treatment diagnostic testing, infectious disease screening, and lab results</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsBatchModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-md transition cursor-pointer"
          >
            <TestTube2 className="w-4 h-4" />
            Order Multi-Blood Tests
          </button>

          {isAdmin && (
            <button
              onClick={handleOpenAddTest}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add Lab Test
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-2">
        {[
          { id: 'requests', label: `Pending Requests (${requests.filter(r => r.status !== 'Completed').length})` },
          { id: 'results', label: `Completed Results Archive (${results.length})` },
          { id: 'catalog', label: `Laboratory Tests Catalog (${tests.length})` }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === tab.id
                ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Requests */}
      {activeTab === 'requests' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-16 text-slate-400 text-xs">No pending lab requests.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase">
                    <th className="py-3 px-6">Request #</th>
                    <th className="py-3 px-4">Patient</th>
                    <th className="py-3 px-4">Test Requested</th>
                    <th className="py-3 px-4">Doctor</th>
                    <th className="py-3 px-4">Payment</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {requests.map(r => (
                    <tr key={r._id} className="hover:bg-slate-50/80 transition">
                      <td className="py-4 px-6 font-mono font-bold text-purple-700">{r.request_number}</td>
                      <td className="py-4 px-4">
                        <span className="font-bold text-slate-900 block">{r.patient_id?.name}</span>
                        <span className="text-[11px] text-slate-400">{r.patient_id?.telephone}</span>
                      </td>
                      <td className="py-4 px-4 font-bold text-slate-800">
                        {r.test_name}
                        <span className="block text-[11px] text-slate-400 font-normal">{r.reason}</span>
                      </td>
                      <td className="py-4 px-4 text-slate-700">{r.doctor_id?.full_name}</td>
                      <td className="py-4 px-4">
                        <StatusBadge status={r.payment_status} />
                      </td>
                      <td className="py-4 px-4">
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="py-4 px-6 text-right">
                        {r.status !== 'Completed' ? (
                          <button
                            onClick={() => handleOpenEnterResult(r)}
                            className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg transition text-[11px] shadow-2xs"
                          >
                            Enter Result
                          </button>
                        ) : (
                          <span className="text-emerald-600 font-bold text-xs">✓ Done</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Results Archive */}
      {activeTab === 'results' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {results.map(res => (
            <div key={res._id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-3">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">{res.test_name}</h3>
                  <p className="text-xs text-slate-500">Patient: <span className="font-bold text-slate-800">{res.patient_id?.name}</span></p>
                </div>
                <StatusBadge status={res.verification_status} />
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Result:</span>
                  <span className="font-mono font-bold text-blue-700 text-sm">{res.result}</span>
                </div>
                {res.reference_range && (
                  <div className="flex justify-between text-slate-500">
                    <span>Reference Range:</span>
                    <span>{res.reference_range}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-500">
                  <span>Interpretation:</span>
                  <span className="font-bold text-slate-800">{res.clinical_interpretation}</span>
                </div>
              </div>

              <div className="flex justify-between items-center text-[11px] text-slate-400 pt-1">
                <span>Doctor: Dr. {res.doctor_id?.full_name}</span>
                <span>{new Date(res.result_date).toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 3: Test Catalog */}
      {activeTab === 'catalog' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">Diagnostic Tests & Disease Panels</h3>
              <p className="text-xs text-slate-500">Configure prices, disease categories, and reference ranges</p>
            </div>
            {isAdmin && (
              <button
                onClick={handleOpenAddTest}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-sm transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Lab Test / Disease
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
                    <th className="py-3 px-4">Disease Category</th>
                    <th className="py-3 px-4">Sample Type</th>
                    <th className="py-3 px-4">Reference Range</th>
                    <th className="py-3 px-4 text-right">Fee ($)</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    {isAdmin && <th className="py-3 px-5 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {tests.map(t => (
                    <tr key={t._id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-5 font-mono font-bold text-purple-700">{t.test_code}</td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-900 block">{t.test_name}</span>
                        {t.description && <span className="text-[10px] text-slate-400 block truncate max-w-xs">{t.description}</span>}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-100">
                          {t.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">{t.sample_type || 'Blood'}</td>
                      <td className="py-3.5 px-4 font-mono text-slate-600">{t.reference_range || 'N/A'}</td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-sm text-slate-900">
                        ${Number(t.price).toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          t.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'
                        }`}>
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
                                title="Edit Test & Pricing"
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

            {tests.length === 0 && (
              <div className="text-center py-12 space-y-2">
                <TestTube2 className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-sm font-bold text-slate-700">No laboratory tests found</p>
                <p className="text-xs text-slate-400">Click Add Lab Test to configure diagnostic tests and prices.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Enter Result Modal */}
      <Modal
        isOpen={isResultModalOpen}
        onClose={() => setIsResultModalOpen(false)}
        icon={TestTube2}
        title={`Enter Lab Result: ${selectedRequest?.test_name}`}
        subtitle="Record quantitative / qualitative clinical laboratory test outcome."
        maxWidth="max-w-lg"
      >
        <form onSubmit={submitResult} className="space-y-3.5 text-xs">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Quantitative / Qualitative Result *</label>
            <input
              type="text"
              required
              value={resultForm.result}
              onChange={(e) => setResultForm({ ...resultForm, result: e.target.value })}
              placeholder="e.g. 13.5 g/dL, Non-Reactive, Negative, 98 mg/dL"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-mono font-bold text-blue-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white transition"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Reference Range</label>
              <input
                type="text"
                value={resultForm.reference_range}
                onChange={(e) => setResultForm({ ...resultForm, reference_range: e.target.value })}
                placeholder="e.g. 12.0 - 15.5 g/dL"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white transition"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Clinical Interpretation</label>
              <select
                value={resultForm.clinical_interpretation}
                onChange={(e) => setResultForm({ ...resultForm, clinical_interpretation: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white transition cursor-pointer font-bold"
              >
                <option value="Normal">Normal</option>
                <option value="Non-Reactive / Negative">Non-Reactive / Negative</option>
                <option value="Reactive / Positive">Reactive / Positive</option>
                <option value="Abnormal">Abnormal</option>
                <option value="Borderline / Inconclusive">Borderline / Inconclusive</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Laboratory Staff Name</label>
            <input
              type="text"
              value={resultForm.performed_by}
              onChange={(e) => setResultForm({ ...resultForm, performed_by: e.target.value })}
              placeholder="e.g. Lab Tech Hassan"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white transition"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setIsResultModalOpen(false)}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold text-xs rounded-xl shadow-sm transition cursor-pointer disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Verify & Send to Doctor'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Add / Edit Test Modal */}
      <Modal
        isOpen={isTestModalOpen}
        onClose={() => {
          setIsTestModalOpen(false);
          setEditingTest(null);
        }}
        icon={TestTube2}
        title={editingTest ? `Edit Lab Test: ${editingTest.test_name}` : 'Add New Diagnostic Lab Test'}
        subtitle={editingTest ? 'Update test/disease parameters, disease panel, and custom price.' : 'Configure test/disease name, category, price, and reference range.'}
        maxWidth="max-w-xl"
      >
        <form onSubmit={submitTest} className="space-y-3.5 text-xs">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Test / Disease Name *
            </label>
            <input
              type="text"
              required
              value={testForm.test_name}
              onChange={(e) => setTestForm({ ...testForm, test_name: e.target.value })}
              placeholder="e.g. Hepatitis B Surface Antigen (HBsAg), HIV Screening, Blood Glucose"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white transition"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Disease Category with User Input & Suggestions */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Disease Category / Panel *
              </label>
              <input
                type="text"
                required
                list="lab-category-suggestions"
                value={testForm.category}
                onChange={(e) => setTestForm({ ...testForm, category: e.target.value })}
                placeholder="e.g. Infectious Disease, Blood, Biochemistry..."
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-purple-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white transition"
              />
              <datalist id="lab-category-suggestions">
                <option value="Infectious Disease Screening" />
                <option value="Blood & Hematology" />
                <option value="Biochemistry" />
                <option value="Pregnancy" />
                <option value="Viral Hepatitis Panel" />
                <option value="STD Screening" />
                <option value="Coagulation Profile" />
                <option value="Microbiology & Culture" />
                <option value="Clinical Vital / Other" />
              </datalist>

              {/* Quick suggestion pills */}
              <div className="flex flex-wrap gap-1 mt-1.5">
                {['Infectious Disease', 'Blood', 'Biochemistry', 'Pregnancy'].map((sug) => (
                  <button
                    key={sug}
                    type="button"
                    onClick={() => setTestForm({ ...testForm, category: sug })}
                    className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 hover:bg-purple-100 hover:text-purple-800 text-slate-600 transition cursor-pointer"
                  >
                    + {sug}
                  </button>
                ))}
              </div>
            </div>

            {/* Editable Price Input (Removes any fixed value) */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Price ($) *
              </label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={testForm.price}
                onChange={(e) => setTestForm({ ...testForm, price: e.target.value })}
                placeholder="e.g. 15.00 (Enter any amount)"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 font-mono font-bold focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white transition"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Set custom fee. Price is completely editable.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Sample Type</label>
              <input
                type="text"
                value={testForm.sample_type}
                onChange={(e) => setTestForm({ ...testForm, sample_type: e.target.value })}
                placeholder="e.g. Whole Blood, Serum, Plasma, Saliva, Urine"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white transition"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Reference / Normal Range</label>
              <input
                type="text"
                value={testForm.reference_range}
                onChange={(e) => setTestForm({ ...testForm, reference_range: e.target.value })}
                placeholder="e.g. Non-Reactive, Negative, 70 - 100 mg/dL"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Status</label>
              <select
                value={testForm.status}
                onChange={(e) => setTestForm({ ...testForm, status: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white transition cursor-pointer"
              >
                <option value="Active">Active (Available for Orders)</option>
                <option value="Inactive">Inactive (Hidden)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Description / Notes</label>
              <input
                type="text"
                value={testForm.description}
                onChange={(e) => setTestForm({ ...testForm, description: e.target.value })}
                placeholder="e.g. Routine dental pre-procedure screening"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white transition"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-2">
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
              {submitting ? 'Saving...' : editingTest ? 'Update Lab Test' : 'Add Lab Test'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Batch / Multi-Blood Test Request Modal */}
      <Modal
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
        icon={TestTube2}
        title="Order Multi-Blood / Lab Test Panel"
        subtitle="Select active patient visit and tests for diagnostic screening."
        maxWidth="max-w-2xl"
      >
        <form onSubmit={submitBatchLabRequest} className="space-y-3.5 text-xs">
          
          {/* Patient Visit Selector */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Select Patient Visit *</label>
            <select
              required
              value={batchVisitId}
              onChange={(e) => setBatchVisitId(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 font-bold focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white transition cursor-pointer"
            >
              <option value="">-- Choose Patient / Active Visit --</option>
              {activeVisits.map(v => (
                <option key={v._id} value={v._id}>
                  {v.visit_number} - {v.patient_id?.name} ({v.patient_id?.telephone || 'No phone'}) - [Status: {v.status}]
                </option>
              ))}
            </select>
          </div>

          {/* Clinical Reason */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Clinical Indication / Reason</label>
            <input
              type="text"
              value={batchReason}
              onChange={(e) => setBatchReason(e.target.value)}
              placeholder="e.g. Pre-extraction coagulation profile, infectious disease screening"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white transition"
            />
          </div>

          {/* Test Selection Grid with Category Quick Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-bold text-slate-700">
                Select Laboratory Tests ({batchSelectedTestIds.length} selected) *
              </label>
              <span className="font-mono font-bold text-blue-700 text-xs">
                Total Fees: ${selectedTestsTotal.toFixed(2)}
              </span>
            </div>

            {/* Category Quick Tags */}
            <div className="flex flex-wrap gap-1.5 mb-2.5">
              {Array.from(new Set(tests.map(t => t.category).filter(Boolean))).map(cat => {
                const catTests = tests.filter(t => t.category === cat);
                if (catTests.length === 0) return null;
                const isAllSelected = catTests.every(t => batchSelectedTestIds.includes(t._id));
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => handleSelectAllCategory(cat)}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition cursor-pointer ${
                      isAllSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {isAllSelected ? `✓ ${cat} (All)` : `+ All ${cat}`}
                  </button>
                );
              })}
            </div>

            {/* Tests Checkbox Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-52 overflow-y-auto p-2 bg-slate-50 rounded-2xl border border-slate-200">
              {tests.map(test => {
                const isChecked = batchSelectedTestIds.includes(test._id);
                return (
                  <div
                    key={test._id}
                    onClick={() => handleToggleTestInBatch(test._id)}
                    className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 cursor-pointer transition ${
                      isChecked
                        ? 'bg-blue-50/80 border-blue-400 text-blue-900 shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-blue-200 hover:bg-blue-50/30'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-4 h-4 rounded-md flex items-center justify-center border ${
                        isChecked ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 bg-white'
                      }`}>
                        {isChecked && <CheckCircle className="w-3.5 h-3.5" />}
                      </div>
                      <div className="truncate">
                        <p className="font-bold text-xs truncate">{test.test_name}</p>
                        <p className="text-[10px] text-slate-400">{test.category} • {test.sample_type}</p>
                      </div>
                    </div>
                    <span className="font-mono font-bold text-xs text-slate-900 shrink-0">
                      ${test.price.toFixed(2)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between items-center pt-2">
            <div className="text-xs text-slate-500 font-medium">
              Selected: <span className="font-bold text-slate-900">{batchSelectedTestIds.length} tests</span>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsBatchModalOpen(false)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || batchSelectedTestIds.length === 0}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold text-xs rounded-xl shadow-sm transition cursor-pointer disabled:opacity-50"
              >
                {submitting ? 'Creating...' : `Order ${batchSelectedTestIds.length} Tests ($${selectedTestsTotal.toFixed(2)})`}
              </button>
            </div>
          </div>
        </form>
      </Modal>

    </div>
  );
};

export default LabManager;

