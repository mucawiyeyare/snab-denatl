import React, { useState, useEffect } from 'react';
import {
  getAppointmentsApi,
  createAppointmentApi,
  updateAppointmentStatusApi,
  getFollowupsApi,
  createFollowupApi,
  updateFollowupStatusApi,
  getPatientsApi,
  getDoctorsApi
} from '../../api/endpoints.js';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import Modal from '../../components/ui/Modal.jsx';
import { Calendar, Plus, Search, Clock, RefreshCw, UserCheck, AlertTriangle, CheckCircle2 } from 'lucide-react';

const AppointmentList = () => {
  // Tab: 'appointments' | 'followups'
  const [activeTab, setActiveTab] = useState('appointments');

  // --- Appointments ---
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loadingApt, setLoadingApt] = useState(true);
  const [searchApt, setSearchApt] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [isAptModalOpen, setIsAptModalOpen] = useState(false);
  const [aptForm, setAptForm] = useState({
    patient_id: '',
    doctor_id: '',
    appointment_date: '',
    appointment_time: '10:00 AM',
    reason: 'Dental Check-up & Consultation',
    notes: ''
  });
  const [submittingApt, setSubmittingApt] = useState(false);

  // --- Follow-ups ---
  const [followups, setFollowups] = useState([]);
  const [loadingFu, setLoadingFu] = useState(true);
  const [searchFu, setSearchFu] = useState('');
  const [fuStatusFilter, setFuStatusFilter] = useState('All');
  const [isFuModalOpen, setIsFuModalOpen] = useState(false);
  const [fuForm, setFuForm] = useState({
    patient_id: '',
    doctor_id: '',
    followup_date: '',
    reason: 'Post-treatment observation & healing check',
    instructions: ''
  });
  const [submittingFu, setSubmittingFu] = useState(false);

  useEffect(() => {
    fetchAppointments();
    fetchFollowups();
    getPatientsApi({ limit: 200 }).then(res => setPatients(res.data?.data || [])).catch(() => {});
    getDoctorsApi().then(res => setDoctors(res.data?.data || [])).catch(() => {});
  }, [dateFilter]);

  const fetchAppointments = async () => {
    setLoadingApt(true);
    try {
      const res = await getAppointmentsApi({ date: dateFilter || undefined });
      setAppointments(res.data?.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingApt(false);
    }
  };

  const fetchFollowups = async () => {
    setLoadingFu(true);
    try {
      const res = await getFollowupsApi();
      setFollowups(res.data?.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingFu(false);
    }
  };

  const handleAptStatusChange = async (id, newStatus) => {
    try {
      await updateAppointmentStatusApi(id, { status: newStatus });
      fetchAppointments();
    } catch (err) {
      console.error(err);
    }
  };

  const handleFuStatusChange = async (id, status) => {
    try {
      await updateFollowupStatusApi(id, { status });
      fetchFollowups();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAptSubmit = async (e) => {
    e.preventDefault();
    setSubmittingApt(true);
    try {
      await createAppointmentApi(aptForm);
      setIsAptModalOpen(false);
      fetchAppointments();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingApt(false);
    }
  };

  const handleFuSubmit = async (e) => {
    e.preventDefault();
    setSubmittingFu(true);
    try {
      await createFollowupApi(fuForm);
      setIsFuModalOpen(false);
      fetchFollowups();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingFu(false);
    }
  };

  const openBookFromFollowup = (f) => {
    setAptForm({
      patient_id: f.patient_id?._id || '',
      doctor_id: f.doctor_id?._id || '',
      appointment_date: f.followup_date ? new Date(f.followup_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      appointment_time: '10:00 AM',
      reason: f.reason || 'Follow-up appointment',
      notes: f.instructions || ''
    });
    setActiveTab('appointments');
    setIsAptModalOpen(true);
  };

  const filteredApt = appointments.filter(a =>
    a.patient_id?.name?.toLowerCase().includes(searchApt.toLowerCase()) ||
    a.doctor_id?.full_name?.toLowerCase().includes(searchApt.toLowerCase()) ||
    a.reason?.toLowerCase().includes(searchApt.toLowerCase())
  );

  const filteredFu = followups.filter(f => {
    const matchesSearch =
      f.patient_id?.name?.toLowerCase().includes(searchFu.toLowerCase()) ||
      f.reason?.toLowerCase().includes(searchFu.toLowerCase()) ||
      f.doctor_id?.full_name?.toLowerCase().includes(searchFu.toLowerCase());
    const matchesStatus = fuStatusFilter === 'All' || f.status === fuStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const pendingFuCount = followups.filter(f => f.status === 'Pending').length;
  const attendedFuCount = followups.filter(f => f.status === 'Attended').length;
  const missedFuCount = followups.filter(f => f.status === 'Missed').length;

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Appointments & Follow-ups</h1>
          <p className="text-xs text-slate-500">Schedule visits, manage patient recalls and post-treatment follow-up care</p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'appointments' ? (
            <button
              onClick={() => {
                setAptForm({
                  patient_id: patients[0]?._id || '',
                  doctor_id: doctors[0]?._id || '',
                  appointment_date: new Date().toISOString().split('T')[0],
                  appointment_time: '10:00 AM',
                  reason: 'Dental Check-up & Consultation',
                  notes: ''
                });
                setIsAptModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Book Appointment
            </button>
          ) : (
            <button
              onClick={() => {
                setFuForm({
                  patient_id: patients[0]?._id || '',
                  doctor_id: doctors[0]?._id || '',
                  followup_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                  reason: 'Post-treatment observation & healing check',
                  instructions: 'Inspect healing and suture removal if necessary.'
                });
                setIsFuModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-md transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Schedule Follow-up
            </button>
          )}
        </div>
      </div>

      {/* ── Tab Switcher ── */}
      <div className="flex gap-1 bg-slate-100 rounded-2xl p-1 w-fit">
        <button
          onClick={() => setActiveTab('appointments')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === 'appointments'
              ? 'bg-white text-blue-700 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          Appointments
          <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${activeTab === 'appointments' ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-500'}`}>
            {appointments.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('followups')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === 'followups'
              ? 'bg-white text-amber-700 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          Follow-ups & Recalls
          <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${activeTab === 'followups' ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-500'}`}>
            {followups.length}
          </span>
          {pendingFuCount > 0 && activeTab !== 'followups' && (
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          )}
        </button>
      </div>

      {/* ══════════════════════════════════════════
          TAB 1 — APPOINTMENTS
      ══════════════════════════════════════════ */}
      {activeTab === 'appointments' && (
        <>
          {/* Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 bg-white p-3 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-2">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                value={searchApt}
                onChange={e => setSearchApt(e.target.value)}
                placeholder="Search by Patient, Doctor, or Reason..."
                className="w-full text-xs font-medium focus:outline-none"
              />
              {searchApt && (
                <button onClick={() => setSearchApt('')} className="text-xs text-slate-400 hover:text-slate-600 font-bold cursor-pointer">Clear</button>
              )}
            </div>
            <div className="bg-white p-2.5 rounded-2xl border border-slate-100 shadow-xs">
              <input
                type="date"
                value={dateFilter}
                onChange={e => setDateFilter(e.target.value)}
                className="w-full text-xs font-bold text-slate-700 bg-transparent focus:outline-none"
              />
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
            {loadingApt ? (
              <div className="flex items-center justify-center h-40">
                <div className="w-7 h-7 border-[3px] border-blue-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredApt.length === 0 ? (
              <div className="text-center py-14 space-y-2">
                <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <Calendar className="w-5 h-5" />
                </div>
                <p className="text-sm font-bold text-slate-600">No appointments found</p>
                <p className="text-xs text-slate-400">Book a new appointment to get started.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider">
                      <th className="py-3.5 px-5">Date</th>
                      <th className="py-3.5 px-4">Time</th>
                      <th className="py-3.5 px-4">Patient</th>
                      <th className="py-3.5 px-4">Doctor</th>
                      <th className="py-3.5 px-4">Reason</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredApt.map(apt => (
                      <tr key={apt._id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3.5 px-5 text-slate-900 font-bold">
                          {new Date(apt.appointment_date).toLocaleDateString()}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-blue-700">{apt.appointment_time}</td>
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-slate-900 block">{apt.patient_id?.name}</span>
                          <span className="text-[11px] text-slate-400">{apt.patient_id?.telephone}</span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-700">Dr. {apt.doctor_id?.full_name || apt.doctor_id?.username}</td>
                        <td className="py-3.5 px-4 text-slate-600">
                          {apt.reason}
                          {apt.notes && <span className="block text-[10px] text-slate-400">{apt.notes}</span>}
                        </td>
                        <td className="py-3.5 px-4"><StatusBadge status={apt.status} /></td>
                        <td className="py-3.5 px-5 text-right">
                          {apt.status === 'Scheduled' && (
                            <div className="flex items-center justify-end gap-1.5">
                              <button onClick={() => handleAptStatusChange(apt._id, 'Confirmed')}
                                className="px-2.5 py-1 bg-teal-50 hover:bg-teal-600 hover:text-white text-teal-700 font-bold rounded-lg transition cursor-pointer">Confirm</button>
                              <button onClick={() => handleAptStatusChange(apt._id, 'Completed')}
                                className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-700 font-bold rounded-lg transition cursor-pointer">Complete</button>
                              <button onClick={() => handleAptStatusChange(apt._id, 'Cancelled')}
                                className="px-2.5 py-1 bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-700 font-bold rounded-lg transition cursor-pointer">Cancel</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════
          TAB 2 — FOLLOW-UPS & RECALLS
      ══════════════════════════════════════════ */}
      {activeTab === 'followups' && (
        <>
          {/* Status Filter Pills & Search */}
          <div className="flex flex-col md:flex-row gap-3 justify-between items-stretch md:items-center">
            <div className="flex flex-wrap gap-1.5 bg-slate-100 p-1 rounded-2xl w-fit">
              {[
                { id: 'All', label: 'All Follow-ups', count: followups.length },
                { id: 'Pending', label: 'Pending', count: pendingFuCount },
                { id: 'Attended', label: 'Attended', count: attendedFuCount },
                { id: 'Missed', label: 'Missed', count: missedFuCount }
              ].map(fTab => (
                <button
                  key={fTab.id}
                  onClick={() => setFuStatusFilter(fTab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    fuStatusFilter === fTab.id
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <span>{fTab.label}</span>
                  <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
                    fuStatusFilter === fTab.id
                      ? fTab.id === 'Pending' && fTab.count > 0 ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-800'
                      : 'bg-slate-200/80 text-slate-500'
                  }`}>
                    {fTab.count}
                  </span>
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <div className="flex-1 md:w-72 bg-white p-2.5 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-2">
                <Search className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                  type="text"
                  value={searchFu}
                  onChange={e => setSearchFu(e.target.value)}
                  placeholder="Search by Patient, Reason, Doctor..."
                  className="w-full text-xs font-medium focus:outline-none"
                />
                {searchFu && (
                  <button onClick={() => setSearchFu('')} className="text-xs text-slate-400 hover:text-slate-600 font-bold cursor-pointer">Clear</button>
                )}
              </div>
              <button
                onClick={fetchFollowups}
                className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold rounded-2xl transition cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Pending banner notice */}
          {pendingFuCount > 0 && fuStatusFilter === 'All' && (
            <div className="flex items-center justify-between p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900">
              <div className="flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                <span>You have <strong>{pendingFuCount}</strong> pending recall follow-up{pendingFuCount > 1 ? 's' : ''} requiring patient contact.</span>
              </div>
              <button
                onClick={() => setFuStatusFilter('Pending')}
                className="px-2.5 py-1 bg-amber-200 hover:bg-amber-300 text-amber-900 font-bold rounded-lg text-xs cursor-pointer transition"
              >
                View Pending Only
              </button>
            </div>
          )}

          {/* Follow-ups Table */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
            {loadingFu ? (
              <div className="flex items-center justify-center h-40">
                <div className="w-7 h-7 border-[3px] border-amber-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredFu.length === 0 ? (
              <div className="text-center py-14 space-y-2">
                <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <Clock className="w-5 h-5" />
                </div>
                <p className="text-sm font-bold text-slate-600">No follow-ups found</p>
                <p className="text-xs text-slate-400">
                  {fuStatusFilter !== 'All' ? `No follow-ups match the '${fuStatusFilter}' filter.` : 'Click "Schedule Follow-up" above to create one.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider">
                      <th className="py-3.5 px-5">Due Date</th>
                      <th className="py-3.5 px-4">Patient</th>
                      <th className="py-3.5 px-4">Telephone</th>
                      <th className="py-3.5 px-4">Doctor</th>
                      <th className="py-3.5 px-4">Reason / Instructions</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredFu.map(f => (
                      <tr key={f._id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3.5 px-5 font-bold text-slate-900 font-mono">
                          {new Date(f.followup_date).toLocaleDateString()}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-slate-900 block">{f.patient_id?.name || 'Patient'}</span>
                          <span className="text-[11px] text-slate-400 font-mono">{f.patient_id?.patient_number}</span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-700 font-mono">{f.patient_id?.telephone || '—'}</td>
                        <td className="py-3.5 px-4 text-slate-700">Dr. {f.doctor_id?.full_name || f.doctor_id?.username}</td>
                        <td className="py-3.5 px-4 text-slate-600">
                          <span className="font-semibold block text-slate-800">{f.reason}</span>
                          {f.instructions && <span className="text-[10px] text-slate-400 block">{f.instructions}</span>}
                        </td>
                        <td className="py-3.5 px-4"><StatusBadge status={f.status} /></td>
                        <td className="py-3.5 px-5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {f.status === 'Pending' ? (
                              <>
                                <button
                                  onClick={() => handleFuStatusChange(f._id, 'Attended')}
                                  title="Mark Attended"
                                  className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-700 font-bold rounded-lg transition cursor-pointer"
                                >
                                  Attended
                                </button>
                                <button
                                  onClick={() => handleFuStatusChange(f._id, 'Missed')}
                                  title="Mark Missed"
                                  className="px-2.5 py-1 bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-700 font-bold rounded-lg transition cursor-pointer"
                                >
                                  Missed
                                </button>
                                <button
                                  onClick={() => openBookFromFollowup(f)}
                                  title="Convert into Booked Appointment"
                                  className="px-2 py-1 bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-600 font-bold rounded-lg transition cursor-pointer text-[11px]"
                                >
                                  Book
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => handleFuStatusChange(f._id, 'Pending')}
                                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium rounded-lg transition cursor-pointer text-[11px]"
                              >
                                Reopen
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Book Appointment Modal ── */}
      <Modal
        isOpen={isAptModalOpen}
        onClose={() => setIsAptModalOpen(false)}
        icon={Calendar}
        title="Schedule Dental Appointment"
        subtitle="Select patient, assign doctor, and specify appointment date & time slot."
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleAptSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Select Patient *</label>
            <select required value={aptForm.patient_id}
              onChange={e => setAptForm({ ...aptForm, patient_id: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white transition cursor-pointer font-bold">
              <option value="">-- Choose Patient --</option>
              {patients.map(p => (
                <option key={p._id} value={p._id}>{p.name} ({p.patient_number}) - {p.telephone}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Assign Doctor *</label>
            <select required value={aptForm.doctor_id}
              onChange={e => setAptForm({ ...aptForm, doctor_id: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white transition cursor-pointer font-bold">
              <option value="">-- Choose Doctor --</option>
              {doctors.map(d => (
                <option key={d._id} value={d._id}>Dr. {d.full_name || d.username}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Date *</label>
              <input type="date" required value={aptForm.appointment_date}
                onChange={e => setAptForm({ ...aptForm, appointment_date: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white transition font-medium" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Time Slot *</label>
              <input type="text" required value={aptForm.appointment_time} placeholder="10:00 AM"
                onChange={e => setAptForm({ ...aptForm, appointment_time: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white transition font-bold" />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Reason / Treatment Description</label>
            <input type="text" required value={aptForm.reason} placeholder="e.g. Scaling and Polishing, Braces checkup"
              onChange={e => setAptForm({ ...aptForm, reason: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white transition" />
          </div>

          <div className="flex justify-end gap-2.5 pt-2">
            <button type="button" onClick={() => setIsAptModalOpen(false)}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer">Cancel</button>
            <button type="submit" disabled={submittingApt}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold text-xs rounded-xl shadow-sm transition cursor-pointer disabled:opacity-50">
              {submittingApt ? 'Booking...' : 'Confirm Appointment'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Schedule Follow-up Modal ── */}
      <Modal
        isOpen={isFuModalOpen}
        onClose={() => setIsFuModalOpen(false)}
        icon={Clock}
        title="Schedule Post-Treatment Follow-up"
        subtitle="Set recall date and patient instructions for healing & review."
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleFuSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Select Patient *</label>
            <select required value={fuForm.patient_id}
              onChange={e => setFuForm({ ...fuForm, patient_id: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white transition cursor-pointer font-bold">
              <option value="">-- Choose Patient --</option>
              {patients.map(p => (
                <option key={p._id} value={p._id}>{p.name} ({p.patient_number}) - {p.telephone}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Assign Doctor *</label>
              <select required value={fuForm.doctor_id}
                onChange={e => setFuForm({ ...fuForm, doctor_id: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white transition cursor-pointer font-bold">
                <option value="">-- Choose Doctor --</option>
                {doctors.map(d => (
                  <option key={d._id} value={d._id}>Dr. {d.full_name || d.username}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Follow-up Due Date *</label>
              <input type="date" required value={fuForm.followup_date}
                onChange={e => setFuForm({ ...fuForm, followup_date: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white transition font-medium" />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Follow-up Reason / Observation Target *</label>
            <input type="text" required value={fuForm.reason} placeholder="e.g. Suture removal, Root canal review"
              onChange={e => setFuForm({ ...fuForm, reason: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white transition" />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Instructions for Patient</label>
            <input type="text" value={fuForm.instructions} placeholder="e.g. Take pain relief as directed; return if bleeding recurs"
              onChange={e => setFuForm({ ...fuForm, instructions: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white transition" />
          </div>

          <div className="flex justify-end gap-2.5 pt-2">
            <button type="button" onClick={() => setIsFuModalOpen(false)}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer">Cancel</button>
            <button type="submit" disabled={submittingFu}
              className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 active:scale-[0.99] text-white font-bold text-xs rounded-xl shadow-sm transition cursor-pointer disabled:opacity-50">
              {submittingFu ? 'Saving...' : 'Save Follow-up Schedule'}
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
};

export default AppointmentList;
