import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  getPatientsApi,
  createPatientApi,
  updatePatientApi,
  deletePatientApi,
  createVisitApi,
  getDoctorsApi,
  checkPatientPhoneApi
} from '../../api/endpoints.js';
import {
  Users,
  Search,
  UserPlus,
  AlertCircle,
  CheckCircle2,
  DollarSign,
  UserCheck,
  Edit2,
  Trash2,
  XCircle,
  Stethoscope
} from 'lucide-react';

const BLOOD_GROUPS = [
  { value: '', label: 'Select Blood Group (Optional)' },
  { value: 'A+', label: 'A+ (A Positive)' },
  { value: 'A-', label: 'A- (A Negative)' },
  { value: 'B+', label: 'B+ (B Positive)' },
  { value: 'B-', label: 'B- (B Negative)' },
  { value: 'AB+', label: 'AB+ (AB Positive)' },
  { value: 'AB-', label: 'AB- (AB Negative)' },
  { value: 'O+', label: 'O+ (O Positive)' },
  { value: 'O-', label: 'O- (O Negative)' },
  { value: 'Unknown', label: 'Unknown / Not Tested' }
];

const VISIT_TYPES = [
  { value: 'first', label: 'First Visit', desc: 'Consultation fee applied' },
  { value: 'follow-up', label: 'Follow-up Visit', desc: 'No consultation fee' },
  { value: 'emergency', label: 'Emergency Visit', desc: 'No consultation fee' },
  { value: 'review', label: 'Review Visit', desc: 'No consultation fee' }
];

const EMPTY_FORM = {
  name: '',
  telephone: '',
  age: '',
  gender: '',
  address: '',
  doctor_id: '',
  consultation_fee: '3',
  emergency_contact: { name: '', phone: '', relationship: '' },
  medical_info: {
    blood_group: '',
    allergies: '',
    chronic_conditions: '',
    bleeding_disorder: false,
    pregnant: false,
    notes: ''
  }
};

const EMPTY_VISIT = {
  doctor_id: '',
  visit_type: 'first',
  reason: 'General Dental Consultation',
  complaint: ''
};

const PatientList = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [doctors, setDoctors] = useState([]);

  // Panel state: 'table' is the default (show patient list); 'register'/'edit'/'visit' show forms
  const [panelMode, setPanelMode] = useState('table');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [newlyRegisteredPatient, setNewlyRegisteredPatient] = useState(null);

  // Edit & delete
  const [editingPatient, setEditingPatient] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  // Telephone validation states
  const [phoneStatus, setPhoneStatus] = useState(null); // 'checking' | 'available' | 'taken' | null
  const [phoneMsg, setPhoneMsg] = useState('');
  const [existingPatient, setExistingPatient] = useState(null);

  // Form states
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [visitData, setVisitData] = useState(EMPTY_VISIT);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchPatients();
  }, [search, page]);

  useEffect(() => {
    getDoctorsApi()
      .then((r) => setDoctors(r.data?.data || []))
      .catch(() => {});
  }, []);

  // Debounced real-time telephone verification
  useEffect(() => {
    if (panelMode !== 'register') return;
    const phone = formData.telephone?.trim();
    if (!phone || phone.length < 5) {
      setPhoneStatus(null);
      setPhoneMsg('');
      setExistingPatient(null);
      return;
    }

    setPhoneStatus('checking');
    const timer = setTimeout(async () => {
      try {
        const res = await checkPatientPhoneApi(phone);
        if (res.data?.exists) {
          setPhoneStatus('existing');
          setPhoneMsg(res.data.message || `Telephone number is already registered to ${res.data.existingPatient?.name} (${res.data.existingPatient?.patient_number}).`);
          setExistingPatient(res.data.existingPatient);
        } else {
          setPhoneStatus('available');
          setPhoneMsg('Telephone number is available.');
          setExistingPatient(null);
        }
      } catch (err) {
        setPhoneStatus(null);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [formData.telephone, panelMode]);

  const fetchPatients = async () => {
    setLoading(true);
    try {
      const res = await getPatientsApi({ search, page, limit: 10 });
      setPatients(res.data?.data || []);
      setTotalPages(res.data?.totalPages || 1);
    } catch (err) {
      console.error('Error fetching patients:', err);
    } finally {
      setLoading(false);
    }
  };

  const closePanel = () => {
    setPanelMode('table');
    setFormError('');
    setSelectedPatient(null);
    setNewlyRegisteredPatient(null);
    setPhoneStatus(null);
    setPhoneMsg('');
    setExistingPatient(null);
  };

  const openRegister = () => {
    setFormData(EMPTY_FORM);
    setVisitData(EMPTY_VISIT);
    setFormError('');
    setSelectedPatient(null);
    setNewlyRegisteredPatient(null);
    setPhoneStatus(null);
    setPhoneMsg('');
    setExistingPatient(null);
    setPanelMode('register');
  };

  const openNewVisit = (patient) => {
    setSelectedPatient(patient);
    setVisitData({
      doctor_id: '',
      visit_type: 'follow-up',
      reason: 'General Dental Consultation',
      complaint: ''
    });
    setFormError('');
    setPanelMode('visit');
  };

  const openEdit = (patient) => {
    setEditingPatient(patient);
    setFormData({
      name: patient.name || '',
      telephone: patient.telephone || '',
      age: patient.age || '',
      gender: patient.gender || '',
      address: patient.address || '',
      emergency_contact: patient.emergency_contact || { name: '', phone: '', relationship: '' },
      medical_info: {
        blood_group: patient.medical_info?.blood_group || '',
        allergies: Array.isArray(patient.medical_info?.allergies)
          ? patient.medical_info.allergies.join(', ')
          : patient.medical_info?.allergies || '',
        chronic_conditions: Array.isArray(patient.medical_info?.chronic_conditions)
          ? patient.medical_info.chronic_conditions.join(', ')
          : patient.medical_info?.chronic_conditions || '',
        bleeding_disorder: patient.medical_info?.bleeding_disorder || false,
        pregnant: patient.medical_info?.pregnant || false,
        notes: patient.medical_info?.notes || ''
      }
    });
    setPhoneStatus(null);
    setPhoneMsg('');
    setExistingPatient(null);
    setFormError('');
    setPanelMode('edit');
  };

  const handleDelete = async (id) => {
    try {
      await deletePatientApi(id);
      setDeleteConfirmId(null);
      fetchPatients();
    } catch (err) {
      alert(err.response?.data?.message || 'Error deleting patient');
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!formData.doctor_id) {
      setFormError('Please select an assigned doctor.');
      return;
    }
    setFormError('');
    setSubmitting(true);
    try {
      const payload = {
        name: formData.name,
        telephone: formData.telephone,
        age: Number(formData.age),
        gender: formData.gender || 'Male',
        address: formData.address,
        emergency_contact: formData.emergency_contact,
        medical_info: {
          ...formData.medical_info,
          allergies: formData.medical_info.allergies
            ? formData.medical_info.allergies.split(',').map((s) => s.trim())
            : [],
          chronic_conditions: formData.medical_info.chronic_conditions
            ? formData.medical_info.chronic_conditions.split(',').map((s) => s.trim())
            : []
        }
      };
      const res = await createPatientApi(payload);
      if (res.data.success) {
        const newPatient = res.data.data;

        // Automatically create a visit with the selected doctor and consultation fee
        const fee = formData.consultation_fee !== '' && !isNaN(Number(formData.consultation_fee))
          ? Number(formData.consultation_fee)
          : 3;
        await createVisitApi({
          patient_id: newPatient._id,
          doctor_id: formData.doctor_id,
          reason: 'General Dental Consultation',
          complaint: '',
          visit_type: 'first',
          consultation_fee: fee
        });

        // Redirect to visits page (patient flow)
        navigate('/visits');
      }
    } catch (err) {
      if (err.response?.data?.existingPatient) {
        setPhoneStatus('taken');
        setPhoneMsg(err.response.data.message);
        setExistingPatient(err.response.data.existingPatient);
      }
      setFormError(err.response?.data?.message || 'Error registering patient');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVisitSubmit = async (e) => {
    e.preventDefault();
    if (!visitData.doctor_id) {
      setFormError('Please select an assigned doctor');
      return;
    }
    setFormError('');
    setSubmitting(true);
    try {
      await createVisitApi({
        patient_id: selectedPatient._id,
        doctor_id: visitData.doctor_id,
        reason: visitData.reason,
        complaint: visitData.complaint,
        visit_type: visitData.visit_type
      });
      closePanel();
      navigate('/visits');
    } catch (err) {
      setFormError(err.response?.data?.message || 'Error creating visit');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        age: Number(formData.age),
        medical_info: {
          ...formData.medical_info,
          allergies: formData.medical_info.allergies
            ? formData.medical_info.allergies.split(',').map((s) => s.trim()).filter(Boolean)
            : [],
          chronic_conditions: formData.medical_info.chronic_conditions
            ? formData.medical_info.chronic_conditions.split(',').map((s) => s.trim()).filter(Boolean)
            : []
        }
      };
      await updatePatientApi(editingPatient._id, payload);
      setEditingPatient(null);
      fetchPatients();
      closePanel();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Error updating patient');
    } finally {
      setSubmitting(false);
    }
  };

  const pf = (path, val) =>
    setFormData((prev) => {
      const parts = path.split('.');
      if (parts.length === 1) return { ...prev, [path]: val };
      return { ...prev, [parts[0]]: { ...prev[parts[0]], [parts[1]]: val } };
    });

  const isFirstVisit = visitData.visit_type === 'first';

  return (
    <div className="space-y-4">
      {/* ═══════════════════════════════════════════════════════
          VIEW 1: PATIENTS TABLE (When switched to table mode)
      ════════════════════════════════════════════════════════ */}
      {panelMode === 'table' ? (
        <div className="space-y-4">
          {/* Top Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">Patient Directory</h1>
              <p className="text-xs text-slate-500">
                View dental patient histories and create appointments or visits
              </p>
            </div>

            <button
              onClick={openRegister}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-sm transition cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Register New Patient
            </button>
          </div>

          {/* Search Bar */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-3">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by Patient Name, Telephone, or Patient ID (e.g. PAT-1001)..."
              className="w-full text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="text-xs font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          {/* Patients Table */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center h-40">
                <div className="w-7 h-7 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : patients.length === 0 ? (
              <div className="text-center py-12 space-y-2">
                <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <Users className="w-5 h-5" />
                </div>
                <p className="text-sm font-bold text-slate-700">No patients found</p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Register a new patient to get started.
                </p>
              </div>
            ) : (
              <div className="dental-table-container">
                <table className="dental-table">
                  <thead>
                    <tr>
                      <th className="py-3 px-5">Patient ID</th>
                      <th className="py-3 px-4">Full Name</th>
                      <th className="py-3 px-4">Telephone</th>
                      <th className="py-3 px-4">Age / Gender</th>
                      <th className="py-3 px-4">Medical Alert</th>
                      <th className="py-3 px-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {patients.map((p) => {
                      const hasAllergies = p.medical_info?.allergies?.length > 0;
                      const isPregnant = p.medical_info?.pregnant;
                      const hasBleeding = p.medical_info?.bleeding_disorder;

                      return (
                        <tr key={p._id} className="hover:bg-slate-50/80 transition">
                          <td className="py-3 px-5 font-mono font-bold text-blue-600">
                            {p.patient_number}
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-bold text-slate-900 block">{p.name}</span>
                            <span className="text-[11px] text-slate-400 truncate max-w-xs block">
                              {p.address || 'No address'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-700">{p.telephone}</td>
                          <td className="py-3 px-4 text-slate-700">
                            {p.age} yrs • <span className="text-slate-500">{p.gender}</span>
                          </td>
                          <td className="py-3 px-4">
                            {hasAllergies || isPregnant || hasBleeding ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                <AlertCircle className="w-3 h-3" />
                                {hasAllergies ? 'Allergy' : isPregnant ? 'Pregnant' : 'Bleeding'}
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-400">None</span>
                            )}
                          </td>
                          <td className="py-3 px-5 text-right">
                            {deleteConfirmId === p._id ? (
                              /* ── Inline delete confirmation ── */
                              <div className="inline-flex items-center gap-1.5 bg-rose-50 border border-rose-200 rounded-xl px-3 py-1.5">
                                <span className="text-[11px] font-bold text-rose-700">Delete?</span>
                                <button
                                  onClick={() => handleDelete(p._id)}
                                  className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold rounded-lg transition cursor-pointer"
                                >Yes</button>
                                <button
                                  onClick={() => setDeleteConfirmId(null)}
                                  className="px-2 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-[11px] font-bold rounded-lg transition cursor-pointer"
                                >No</button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => openNewVisit(p)}
                                  className="px-2.5 py-1 bg-blue-50 hover:bg-blue-600 hover:text-white font-bold text-blue-600 rounded-lg transition text-xs shadow-2xs cursor-pointer"
                                >
                                  + New Visit
                                </button>
                                <button
                                  onClick={() => navigate(`/patients/${p._id}`)}
                                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 rounded-lg transition text-xs cursor-pointer"
                                >
                                  Profile
                                </button>
                                <button
                                  onClick={() => openEdit(p)}
                                  title="Edit Patient"
                                  className="p-1.5 bg-amber-50 hover:bg-amber-500 hover:text-white text-amber-600 rounded-lg transition cursor-pointer"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                {user?.role === 'Admin' && (
                                  <button
                                    onClick={() => setDeleteConfirmId(p._id)}
                                    title="Delete Patient (Admin Only)"
                                    className="p-1.5 bg-rose-50 hover:bg-rose-500 hover:text-white text-rose-500 rounded-lg transition cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="p-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>
                  Page {page} of {totalPages}
                </span>
                <div className="flex gap-1">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded disabled:opacity-50 cursor-pointer"
                  >
                    Previous
                  </button>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage(page + 1)}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded disabled:opacity-50 cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ═══════════════════════════════════════════════════════
            VIEW 2: DEDICATED COMPACT FULL-PAGE CARD (No scroll)
        ════════════════════════════════════════════════════════ */
        <div className="max-w-4xl mx-auto">
          {/* Clean White Registration Card */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-5 sm:p-7 md:p-8">
            
            {/* ════ SUCCESS SCREEN ════ */}
            {panelMode === 'register-success' && newlyRegisteredPatient ? (
              <div className="text-center py-3 space-y-4 animate-in fade-in zoom-in-95 duration-200">
                <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-100 shadow-xs">
                  <CheckCircle2 className="w-8 h-8" />
                </div>

                <div className="space-y-1">
                  <span className="inline-block px-3 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                    Registration Confirmed
                  </span>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">
                    Patient Registered Successfully
                  </h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Patient profile created with assigned unique identifier:
                  </p>
                </div>

                {/* Patient Summary Card */}
                <div className="max-w-md mx-auto p-4 rounded-xl bg-slate-50 border border-slate-200 text-left space-y-2.5 shadow-2xs">
                  <div className="flex justify-between items-center pb-2.5 border-b border-slate-200">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                        Patient ID
                      </span>
                      <span className="text-base font-black font-mono text-blue-600">
                        {newlyRegisteredPatient.patient_number}
                      </span>
                    </div>
                    <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 font-bold text-xs rounded-lg border border-blue-200">
                      New Patient Record
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-400 text-[10px] block">Full Name:</span>
                      <span className="font-bold text-slate-900">{newlyRegisteredPatient.name}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">Telephone:</span>
                      <span className="font-medium text-slate-800">{newlyRegisteredPatient.telephone}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">Age / Gender:</span>
                      <span className="font-medium text-slate-800">
                        {newlyRegisteredPatient.age} yrs · {newlyRegisteredPatient.gender}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">Address / District:</span>
                      <span className="font-medium text-slate-800 truncate block">
                        {newlyRegisteredPatient.address || 'Mogadishu'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-2.5 max-w-md mx-auto pt-1">
                  <button
                    type="button"
                    onClick={() => openNewVisit(newlyRegisteredPatient)}
                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-sm transition cursor-pointer"
                  >
                    + Start Patient Visit
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate(`/patients/${newlyRegisteredPatient._id}`)}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition cursor-pointer"
                  >
                    View Profile
                  </button>
                  <button
                    type="button"
                    onClick={openRegister}
                    className="flex-1 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                  >
                    Register Another
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Centered Icon Badge */}
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2 border shadow-2xs ${panelMode === 'edit' ? 'bg-amber-50 text-amber-600 border-amber-100/80' : 'bg-blue-50 text-blue-600 border-blue-100/80'}`}>
                  {panelMode === 'edit' ? (
                    <Edit2 className="w-5 h-5" />
                  ) : (
                    <svg className="w-6 h-6 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2C8.5 2 6 4.5 6 8.5c0 3.5 1 7.5 2 12.5 1 0 2-2 4-2s3 2 4 2c1-5 2-9 2-12.5C18 4.5 15.5 2 12 2z" />
                    </svg>
                  )}
                </div>

                {/* Title & Subtitle */}
                <h2 className="text-xl font-black text-slate-900 tracking-tight text-center">
                  {panelMode === 'register' && 'Register New Patient'}
                  {panelMode === 'edit' && `Edit Patient: ${editingPatient?.name}`}
                  {panelMode === 'visit' && 'New Patient Visit Check-In'}
                </h2>
                <p className="text-[11px] text-slate-400 text-center mt-0.5 mb-4">
                  {panelMode === 'register' && 'Fill in the details below to register a new dental patient.'}
                  {panelMode === 'edit' && `Update the information for ${editingPatient?.patient_number || 'this patient'}.`}
                  {panelMode === 'visit' && `Assign doctor and queue for ${selectedPatient?.name || 'patient'}.`}
                </p>

                {/* Global Error Banner */}
                {formError && (
                  <div className="flex items-center gap-2 p-2.5 mb-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl animate-in fade-in">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                {/* ════ REGISTRATION FORM ════ */}
                {(panelMode === 'register' || panelMode === 'edit') && (
                  <form onSubmit={panelMode === 'edit' ? handleEditSubmit : handleRegisterSubmit} className="space-y-3.5 text-xs">
                    {/* 1. Personal Information */}
                    <div>
                      <h3 className="text-xs font-bold text-blue-600 mb-2">
                        Personal Information
                      </h3>
                      <div className="space-y-2.5">
                        {/* Row 1: Full Name (1/3), Telephone Number (1/3), Age (1/3) */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                              Full Name *
                            </label>
                            <input
                              required
                              type="text"
                              value={formData.name}
                              onChange={(e) => pf('name', e.target.value)}
                              placeholder="e.g. Abdirahman Mohamed"
                              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white transition"
                            />
                          </div>

                          {/* Telephone Number with Real-time Uniqueness Validation */}
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                              Telephone Number *
                            </label>
                            <div className="relative">
                              <input
                                required
                                type="tel"
                                value={formData.telephone}
                                onChange={(e) => pf('telephone', e.target.value)}
                                placeholder="e.g. +252 61 7000000"
                                className={`w-full px-3.5 py-2 rounded-xl border text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none transition ${
                                  phoneStatus === 'existing'
                                    ? 'border-amber-400 ring-1 ring-amber-200 bg-amber-50/20'
                                    : phoneStatus === 'available'
                                    ? 'border-emerald-500 ring-1 ring-emerald-100 bg-white focus:border-emerald-600'
                                    : 'border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white'
                                }`}
                              />
                              {phoneStatus === 'checking' && (
                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                  <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                                </div>
                              )}
                            </div>

                            {/* Real-time Phone Validation Feedback & Existing Patient Action Bar */}
                            {phoneStatus === 'existing' && existingPatient && (
                              <div className="mt-2 p-2.5 bg-amber-50/90 border border-amber-200 rounded-xl space-y-2 animate-in fade-in duration-150">
                                <div className="flex items-start gap-1.5 text-xs text-amber-900">
                                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                  <div>
                                    <span className="font-bold text-[11px]">
                                      Number already exists: {existingPatient.name} ({existingPatient.patient_number})
                                    </span>
                                    <p className="text-[10px] text-amber-700 mt-0.5">
                                      Use existing profile, or continue below to register a new patient sharing this number.
                                    </p>
                                  </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                  <button
                                    type="button"
                                    onClick={() => openNewVisit(existingPatient)}
                                    className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] rounded-lg transition shadow-2xs cursor-pointer"
                                  >
                                    + Start Visit for {existingPatient.name}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => navigate(`/patients/${existingPatient._id}`)}
                                    className="px-2.5 py-1 bg-slate-200/80 hover:bg-slate-300 text-slate-800 font-bold text-[11px] rounded-lg transition cursor-pointer"
                                  >
                                    View Profile
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setFormData((prev) => ({
                                        ...prev,
                                        name: existingPatient.name || prev.name,
                                        age: existingPatient.age || prev.age,
                                        gender: existingPatient.gender || prev.gender,
                                        address: existingPatient.address || prev.address,
                                        emergency_contact: existingPatient.emergency_contact || prev.emergency_contact,
                                        medical_info: {
                                          blood_group: existingPatient.medical_info?.blood_group || prev.medical_info?.blood_group || '',
                                          allergies: Array.isArray(existingPatient.medical_info?.allergies)
                                            ? existingPatient.medical_info.allergies.join(', ')
                                            : existingPatient.medical_info?.allergies || prev.medical_info?.allergies || '',
                                          chronic_conditions: Array.isArray(existingPatient.medical_info?.chronic_conditions)
                                            ? existingPatient.medical_info.chronic_conditions.join(', ')
                                            : existingPatient.medical_info?.chronic_conditions || prev.medical_info?.chronic_conditions || '',
                                          bleeding_disorder: existingPatient.medical_info?.bleeding_disorder ?? prev.medical_info?.bleeding_disorder ?? false,
                                          pregnant: existingPatient.medical_info?.pregnant ?? prev.medical_info?.pregnant ?? false,
                                          notes: existingPatient.medical_info?.notes || prev.medical_info?.notes || ''
                                        }
                                      }));
                                    }}
                                    className="px-2.5 py-1 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-[11px] rounded-lg transition cursor-pointer"
                                  >
                                    Load Data
                                  </button>
                                </div>
                              </div>
                            )}

                            {phoneStatus === 'available' && (
                              <p className="text-[10px] font-semibold text-emerald-600 flex items-center gap-1 mt-1 animate-in fade-in duration-150">
                                <CheckCircle2 className="w-3 h-3 shrink-0" />
                                <span>Telephone number is available.</span>
                              </p>
                            )}
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                              Age *
                            </label>
                            <input
                              required
                              type="number"
                              min="0"
                              max="130"
                              value={formData.age}
                              onChange={(e) => pf('age', e.target.value)}
                              placeholder="e.g. 28"
                              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white transition"
                            />
                          </div>
                        </div>

                        {/* Row 2: Gender (1/3) and Residential Address (2/3) */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                              Gender *
                            </label>
                            <select
                              value={formData.gender}
                              onChange={(e) => pf('gender', e.target.value)}
                              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white transition cursor-pointer"
                            >
                              <option value="">Select gender</option>
                              <option value="Male">Male</option>
                              <option value="Female">Female</option>
                            </select>
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                              Residential Address / District *
                            </label>
                            <input
                              type="text"
                              value={formData.address}
                              onChange={(e) => pf('address', e.target.value)}
                              placeholder="e.g. Wadajir District, Mogadishu"
                              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white transition"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 2. Medical & Dental Health */}
                    <div>
                      <h3 className="text-xs font-bold text-blue-600 mb-2 mt-1">
                        Medical & Dental Health
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Blood Group
                          </label>
                          <select
                            value={formData.medical_info.blood_group || ''}
                            onChange={(e) => pf('medical_info.blood_group', e.target.value)}
                            className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white transition cursor-pointer"
                          >
                            {BLOOD_GROUPS.map((bg) => (
                              <option key={bg.value} value={bg.value}>
                                {bg.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Known Drug Allergies (comma separated)
                          </label>
                          <input
                            type="text"
                            value={formData.medical_info.allergies}
                            onChange={(e) => pf('medical_info.allergies', e.target.value)}
                            placeholder="e.g. Penicillin, Latex, Aspirin"
                            className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white transition"
                          />
                        </div>
                      </div>
                    </div>

                    {/* 3. Visit Information (only for registration, not edit) */}
                    {panelMode === 'register' && (
                      <div>
                        <h3 className="text-xs font-bold text-blue-600 mb-2 mt-1">
                          Visit Information
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                              Assign Doctor *
                            </label>
                            <select
                              required
                              value={formData.doctor_id}
                              onChange={(e) => pf('doctor_id', e.target.value)}
                              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white transition cursor-pointer"
                            >
                              <option value="">-- Select Attending Doctor --</option>
                              {doctors.map((d) => (
                                <option key={d._id} value={d._id}>
                                  Dr. {d.full_name || d.username} ({d.employee_id?.specialization || 'Dental Surgeon'})
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                              Consultation Fee ($)
                            </label>
                            <div className="relative">
                              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={formData.consultation_fee}
                                onChange={(e) => pf('consultation_fee', e.target.value)}
                                placeholder="3"
                                className="w-full pl-8 pr-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 font-bold placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white transition"
                              />
                            </div>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              Default $3. Cashier or doctor can change this amount.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Primary Full-Width Submit Button */}
                    <div className={`pt-2 ${panelMode === 'edit' ? 'flex gap-2.5' : ''}`}>
                      {panelMode === 'edit' && (
                        <button
                          type="button"
                          onClick={closePanel}
                          className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                        >
                          Cancel
                        </button>
                      )}
                      <button
                        type="submit"
                        disabled={submitting || (panelMode === 'register' && phoneStatus === 'taken')}
                        className="flex-1 w-full py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-sm shadow-blue-500/20 transition cursor-pointer disabled:opacity-50"
                      >
                        {panelMode === 'edit' ? (
                          <>
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>{submitting ? 'Saving...' : 'Update Patient'}</span>
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-3.5 h-3.5" />
                            <span>{submitting ? 'Registering...' : 'Register & Start Visit'}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}

                {/* ════ RETURNING PATIENT VISIT CHECK-IN FORM ════ */}
                {panelMode === 'visit' && (
                  <form onSubmit={handleVisitSubmit} className="space-y-4 text-xs">
                    {/* Patient Summary Box */}
                    {selectedPatient && (
                      <div className="rounded-xl bg-blue-50/60 border border-blue-100 p-3 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                          <Users className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-black text-slate-900 truncate">
                            {selectedPatient.name}
                          </p>
                          <p className="text-[11px] text-slate-600 font-mono">
                            ID: <span className="font-bold text-blue-600">{selectedPatient.patient_number}</span> · Phone: {selectedPatient.telephone}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Visit Type Selection */}
                    <div>
                      <h3 className="text-xs font-bold text-blue-600 mb-2">
                        Select Visit Type *
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        {VISIT_TYPES.map((vt) => {
                          const selected = visitData.visit_type === vt.value;
                          return (
                            <button
                              key={vt.value}
                              type="button"
                              onClick={() => setVisitData((v) => ({ ...v, visit_type: vt.value }))}
                              className={`text-left p-2.5 rounded-xl border text-xs transition cursor-pointer ${
                                selected
                                  ? 'border-blue-500 bg-blue-50/80 ring-1 ring-blue-300 shadow-xs'
                                  : 'border-slate-200 bg-white hover:border-slate-300'
                              }`}
                            >
                              <span className="font-bold text-slate-900 block">{vt.label}</span>
                              <span
                                className={`text-[10px] block mt-0.5 ${
                                  vt.value === 'first'
                                    ? 'text-amber-600 font-bold'
                                    : 'text-slate-400'
                                }`}
                              >
                                {vt.desc}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Consultation Fee Status Notification */}
                    {isFirstVisit ? (
                      <div className="flex items-start gap-2.5 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                        <DollarSign className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold block">First Visit: Consultation Fee ($10.00)</span>
                          <span className="text-[11px] text-amber-700 block">
                            A consultation invoice will be generated. Patient will be in <strong>Waiting for Payment</strong>.
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2.5 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900">
                        <UserCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold block">No Consultation Fee</span>
                          <span className="text-[11px] text-emerald-700 block">
                            Patient queued directly to doctor in <strong>Waiting for Doctor</strong>.
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Doctor Selection */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Assign Attending Doctor *
                      </label>
                      <select
                        required
                        value={visitData.doctor_id}
                        onChange={(e) => setVisitData((v) => ({ ...v, doctor_id: e.target.value }))}
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 font-bold focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white transition cursor-pointer"
                      >
                        <option value="">-- Select Attending Doctor --</option>
                        {doctors.map((d) => (
                          <option key={d._id} value={d._id}>
                            Dr. {d.full_name || d.username} (
                            {d.employee_id?.specialization || 'Dental Surgeon'})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Reason */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Reason for Visit
                      </label>
                      <input
                        type="text"
                        value={visitData.reason}
                        onChange={(e) => setVisitData((v) => ({ ...v, reason: e.target.value }))}
                        placeholder="e.g. Toothache, Scaling & Polishing, Consultation"
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white transition"
                      />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2.5 pt-1">
                      <button
                        type="button"
                        onClick={closePanel}
                        className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={submitting}
                        className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold text-xs rounded-xl shadow-sm disabled:opacity-50 transition cursor-pointer"
                      >
                        {submitting
                          ? 'Processing...'
                          : isFirstVisit
                          ? 'Create Visit & Charge Fee ($10)'
                          : 'Queue for Doctor Consultation'}
                      </button>
                    </div>
                  </form>
                )}
              </>
            )}
          </div>

          {/* Footer Branding */}
          <p className="text-[10px] text-slate-400 text-center mt-3 pb-2">
            © 2025 SNAB Dental. All rights reserved.
          </p>
        </div>
      )}
    </div>
  );
};

export default PatientList;
