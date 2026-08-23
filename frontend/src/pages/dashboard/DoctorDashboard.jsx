import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { getDashboardStatsApi } from '../../api/endpoints.js';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import {
  Users,
  Calendar,
  DollarSign,
  UserCheck,
  CheckCircle2,
  Clock,
  Activity,
  Search,
  ArrowRight,
  Stethoscope,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  TrendingUp,
  FileText,
  User,
  Sparkles,
  CalendarDays
} from 'lucide-react';

/* ==========================================================================
   STAT CARD COMPONENT
   ========================================================================== */
const DoctorStatCard = ({ icon: Icon, label, value, subText, subColor, iconBg }) => (
  <div className="bg-white rounded-2xl p-5 border border-slate-100/90 shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:shadow-md transition duration-200 flex flex-col justify-between">
    <div className="flex items-center gap-3.5">
      <div
        className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-xs"
        style={{ background: iconBg }}
      >
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <span className="text-xs font-semibold text-slate-500 block leading-tight">{label}</span>
        <span className="text-2xl font-black text-slate-900 tracking-tight mt-0.5 block font-mono">{value}</span>
      </div>
    </div>
    <div className="mt-3 pt-2.5 border-t border-slate-50 flex items-center justify-between text-xs">
      <span className="font-semibold text-[11px]" style={{ color: subColor || '#2563eb' }}>
        {subText}
      </span>
    </div>
  </div>
);

/* ==========================================================================
   DOCTOR MONTHLY REVENUE LINE CHART
   ========================================================================== */
const DoctorRevenueChart = ({ dailyData = [], monthRevenue = 0 }) => {
  const pointsData = useMemo(() => {
    if (!dailyData || dailyData.length === 0) {
      return [
        { label: 'Wk 1', amount: monthRevenue * 0.2 },
        { label: 'Wk 2', amount: monthRevenue * 0.3 },
        { label: 'Wk 3', amount: monthRevenue * 0.25 },
        { label: 'Wk 4', amount: monthRevenue * 0.25 }
      ];
    }
    return dailyData.map(d => ({
      label: d._id ? d._id.substring(8, 10) : 'Day',
      amount: d.total || 0
    }));
  }, [dailyData, monthRevenue]);

  const maxAmount = Math.max(...pointsData.map(p => p.amount), 50);
  const chartHeight = 110;
  const chartWidth = 420;
  const paddingLeft = 45;
  const paddingBottom = 120;
  const stepX = pointsData.length > 1 ? (chartWidth - 20) / (pointsData.length - 1) : 0;

  const coords = pointsData.map((pt, i) => {
    const x = paddingLeft + i * stepX;
    const y = paddingBottom - (pt.amount / maxAmount) * (chartHeight - 30);
    return { ...pt, x, y };
  });

  const pathD = coords.reduce((acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`, '');
  const areaD = `${pathD} L ${coords[coords.length - 1]?.x || paddingLeft} ${paddingBottom} L ${coords[0]?.x || paddingLeft} ${paddingBottom} Z`;

  return (
    <div className="w-full h-44 relative mt-2">
      <svg className="w-full h-full overflow-visible" viewBox="0 0 460 140">
        <defs>
          <linearGradient id="doctorRevGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Horizontal grid lines */}
        <line x1="40" y1="20" x2="445" y2="20" stroke="#f1f5f9" strokeDasharray="3 3" />
        <line x1="40" y1="50" x2="445" y2="50" stroke="#f1f5f9" strokeDasharray="3 3" />
        <line x1="40" y1="80" x2="445" y2="80" stroke="#f1f5f9" strokeDasharray="3 3" />
        <line x1="40" y1="120" x2="445" y2="120" stroke="#e2e8f0" strokeWidth="1" />

        {/* Y-axis labels */}
        <text x="35" y="23" textAnchor="end" className="text-[9px] fill-slate-400 font-semibold font-mono">{`$${Math.round(maxAmount)}`}</text>
        <text x="35" y="53" textAnchor="end" className="text-[9px] fill-slate-400 font-semibold font-mono">{`$${Math.round(maxAmount * 0.66)}`}</text>
        <text x="35" y="83" textAnchor="end" className="text-[9px] fill-slate-400 font-semibold font-mono">{`$${Math.round(maxAmount * 0.33)}`}</text>
        <text x="35" y="123" textAnchor="end" className="text-[9px] fill-slate-400 font-semibold font-mono">$0</text>

        {/* Area Gradient */}
        <path d={areaD} fill="url(#doctorRevGrad)" />

        {/* Line */}
        <path d={pathD} fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

        {/* Points */}
        {coords.map((pt, i) => (
          <circle
            key={i}
            cx={pt.x}
            cy={pt.y}
            r="3.5"
            fill="#ffffff"
            stroke="#f59e0b"
            strokeWidth="2"
          />
        ))}

        {/* X-axis labels */}
        {coords.map((pt, i) => (
          <text key={i} x={pt.x} y="134" textAnchor="middle" className="text-[8px] fill-slate-400 font-medium">
            {pt.label}
          </text>
        ))}
      </svg>
    </div>
  );
};

/* ==========================================================================
   DOCTOR DASHBOARD COMPONENT
   ========================================================================== */
const DoctorDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Generate last 12 months for selector
  const monthOptions = useMemo(() => {
    const options = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      options.push({ value: val, label });
    }
    return options;
  }, []);

  const [selectedMonth, setSelectedMonth] = useState(monthOptions[0]?.value || '');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [patientSearch, setPatientSearch] = useState('');
  const [isHeaderMonthOpen, setIsHeaderMonthOpen] = useState(false);

  useEffect(() => {
    fetchDoctorStats(selectedMonth);
  }, [selectedMonth]);

  const fetchDoctorStats = async (month) => {
    setLoading(true);
    try {
      const res = await getDashboardStatsApi({ month });
      setData(res.data?.data || null);
    } catch (err) {
      console.error('Error loading doctor dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const doctor = data?.doctor || {};
  const stats = data?.statistics || {};
  const recentPatients = data?.recentPatients || [];
  const upcomingAppointments = data?.upcomingAppointments || [];
  const pendingFollowups = data?.pendingFollowups || [];
  const recentTreatments = data?.recentTreatments || [];
  const topServices = data?.topServices || [];
  const dailyRevenue = data?.dailyRevenue || [];

  const [scheduleTab, setScheduleTab] = useState('all'); // 'all' | 'appointments' | 'followups'

  // Filter recent patients locally for real-time quick search
  const filteredRecentPatients = recentPatients.filter(v => {
    const q = patientSearch.toLowerCase();
    const p = v.patient_id;
    return (
      !q ||
      p?.name?.toLowerCase().includes(q) ||
      p?.patient_number?.toLowerCase().includes(q) ||
      p?.telephone?.toLowerCase().includes(q) ||
      v.reason?.toLowerCase().includes(q) ||
      v.status?.toLowerCase().includes(q)
    );
  });

  const handlePrevMonth = (e) => {
    e?.stopPropagation();
    const [y, m] = (selectedMonth || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`).split('-').map(Number);
    const prevDate = new Date(y, m - 2, 1);
    const newMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
    setSelectedMonth(newMonth);
  };

  const handleNextMonth = (e) => {
    e?.stopPropagation();
    const [y, m] = (selectedMonth || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`).split('-').map(Number);
    const nextDate = new Date(y, m, 1);
    const newMonth = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`;
    setSelectedMonth(newMonth);
  };

  const currentDateFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const selectedMonthLabel = monthOptions.find(m => m.value === selectedMonth)?.label || selectedMonth || 'Current Month';

  return (
    <div className="space-y-6">

      {/* ── 1. Welcome / Doctor Profile Header ── */}
      <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute right-0 top-0 w-80 h-80 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center text-white text-xl font-black shrink-0 shadow-inner">
              <Stethoscope className="w-7 h-7 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/20 backdrop-blur-xs border border-white/30 text-white uppercase tracking-wider">
                  Doctor Portal
                </span>
                <span className="text-xs text-blue-100">
                  {doctor.department || 'Department of Dentistry'}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight mt-1 text-white">
                {(() => {
                  const n = doctor.name || user?.full_name || user?.username || 'Doctor';
                  return n.startsWith('Dr.') ? n : `Dr. ${n}`;
                })()}
              </h1>
              <p className="text-xs text-blue-100 mt-0.5 font-medium">
                {doctor.specialization || 'Dental Surgeon'} • Active Clinical Shift
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Clickable Interactive Month & Date Navigator */}
            <div className="relative">
              <div className="bg-white/15 backdrop-blur-md p-1 rounded-2xl border border-white/20 flex items-center gap-0.5 shadow-xs">
                {/* Previous Month 1-Click Button */}
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-1.5 hover:bg-white/20 text-white rounded-xl transition cursor-pointer"
                  title="Previous Month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {/* Center Month / Calendar Button */}
                <button
                  type="button"
                  onClick={() => setIsHeaderMonthOpen(prev => !prev)}
                  className="px-2.5 py-1 text-xs font-bold text-white flex items-center gap-1.5 hover:bg-white/15 rounded-xl transition cursor-pointer"
                  title="Click to choose a month or view calendar"
                >
                  <CalendarDays className="w-4 h-4 text-blue-200" />
                  <span>{selectedMonthLabel}</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-blue-200 transition-transform ${isHeaderMonthOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Next Month 1-Click Button */}
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-1.5 hover:bg-white/20 text-white rounded-xl transition cursor-pointer"
                  title="Next Month"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Full Interactive Month Grid & Date Picker Popover */}
              {isHeaderMonthOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-3xl shadow-2xl border border-slate-100 p-4 z-50 text-slate-800 animate-in fade-in zoom-in-95 duration-150 text-xs">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div>
                      <span className="font-black text-slate-900 text-sm block">Select Performance Month</span>
                      <span className="text-[11px] text-slate-400 font-medium">Switch dashboard period & statistics</span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100">
                      {selectedMonth}
                    </span>
                  </div>

                  {/* 12-Month Quick Buttons Grid */}
                  <div className="py-3">
                    <div className="text-[11px] font-bold text-slate-500 mb-2">Available Months:</div>
                    <div className="grid grid-cols-3 gap-1.5 max-h-48 overflow-y-auto pr-1">
                      {monthOptions.map(opt => {
                        const isSelected = opt.value === selectedMonth;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => {
                              setSelectedMonth(opt.value);
                              setIsHeaderMonthOpen(false);
                            }}
                            className={`py-2 px-2 rounded-xl font-bold text-[11px] text-center transition cursor-pointer ${
                              isSelected
                                ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-200'
                                : 'bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700'
                            }`}
                          >
                            {opt.label.split(' ')[0]} {opt.label.split(' ')[1]}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Direct Native Month Picker */}
                  <div className="py-2 px-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-500">Pick Any Month:</span>
                    <input
                      type="month"
                      value={selectedMonth}
                      onChange={(e) => {
                        if (e.target.value) {
                          setSelectedMonth(e.target.value);
                          setIsHeaderMonthOpen(false);
                        }
                      }}
                      className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 cursor-pointer focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="pt-3 mt-3 border-t border-slate-100 flex justify-between items-center text-[11px]">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedMonth(monthOptions[0]?.value || '');
                        setIsHeaderMonthOpen(false);
                      }}
                      className="font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
                    >
                      Reset to Current Month
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsHeaderMonthOpen(false)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => navigate('/visits')}
              className="px-4 py-2 bg-white text-blue-700 hover:bg-blue-50 font-bold text-xs rounded-xl shadow-md transition active:scale-[0.98] cursor-pointer flex items-center gap-1.5"
            >
              <span>Consultations & Flow</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ── 2. Key Statistics (Doctor-Specific Metrics) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <DoctorStatCard
          icon={Users}
          label="Patients Served"
          value={stats.patientsServed ?? 0}
          subText="Total patients assigned"
          subColor="#2563eb"
          iconBg="#2563eb"
        />
        <DoctorStatCard
          icon={UserCheck}
          label="Today's Patients"
          value={stats.todayPatients ?? 0}
          subText="Seen / queued today"
          subColor="#10b981"
          iconBg="#10b981"
        />
        <DoctorStatCard
          icon={Calendar}
          label="Upcoming Appointments"
          value={stats.pendingAppointments ?? 0}
          subText={`${stats.todayAppointments ?? 0} scheduled today`}
          subColor="#6366f1"
          iconBg="#6366f1"
        />
        <DoctorStatCard
          icon={CheckCircle2}
          label="Completed Consultations"
          value={stats.completedConsultations ?? 0}
          subText="Total procedures & exams"
          subColor="#8b5cf6"
          iconBg="#8b5cf6"
        />
        <DoctorStatCard
          icon={DollarSign}
          label="Monthly Revenue"
          value={`$${(stats.monthlyRevenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          subText={`${selectedMonthLabel}`}
          subColor="#d97706"
          iconBg="#f59e0b"
        />
      </div>

      {/* ── 3. Middle Section: Today's Appointments & Monthly Revenue Breakdown ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

        {/* ── Today's / Upcoming Appointments & Pending Follow-ups (5 cols) ── */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-5 border border-slate-100/90 shadow-[0_2px_8px_rgba(0,0,0,0.03)] flex flex-col justify-between">
          <div>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  <span>Appointments & Follow-ups</span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  Upcoming bookings & pending recalls for {(() => {
                    const n = doctor.name || user?.full_name || user?.username || 'Doctor';
                    return n.startsWith('Dr.') ? n : `Dr. ${n}`;
                  })()}
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <button
                  onClick={() => navigate('/appointments')}
                  className="font-bold text-blue-600 hover:text-blue-700 transition cursor-pointer"
                >
                  View all
                </button>
              </div>
            </div>

            {/* Quick Segment Filter */}
            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl mb-3">
              <button
                type="button"
                onClick={() => setScheduleTab('all')}
                className={`flex-1 py-1 text-[11px] font-bold rounded-lg transition cursor-pointer text-center ${
                  scheduleTab === 'all'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                All ({upcomingAppointments.length + pendingFollowups.length})
              </button>
              <button
                type="button"
                onClick={() => setScheduleTab('appointments')}
                className={`flex-1 py-1 text-[11px] font-bold rounded-lg transition cursor-pointer text-center ${
                  scheduleTab === 'appointments'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Appts ({upcomingAppointments.length})
              </button>
              <button
                type="button"
                onClick={() => setScheduleTab('followups')}
                className={`flex-1 py-1 text-[11px] font-bold rounded-lg transition cursor-pointer text-center ${
                  scheduleTab === 'followups'
                    ? 'bg-white text-amber-700 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Follow-ups ({pendingFollowups.length})
              </button>
            </div>

            {/* List */}
            {(() => {
              const showAppts = scheduleTab === 'all' || scheduleTab === 'appointments';
              const showFollowups = scheduleTab === 'all' || scheduleTab === 'followups';

              const apptsList = showAppts ? upcomingAppointments : [];
              const followupsList = showFollowups ? pendingFollowups : [];

              const totalItems = apptsList.length + followupsList.length;

              if (totalItems === 0) {
                return (
                  <div className="text-center py-10 text-slate-400 text-xs">
                    <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-600">
                      {scheduleTab === 'followups'
                        ? 'No pending follow-ups'
                        : scheduleTab === 'appointments'
                        ? 'No upcoming appointments'
                        : 'No upcoming appointments or follow-ups'}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Your schedule is currently clear.</p>
                  </div>
                );
              }

              return (
                <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-0.5">
                  {/* Appointments */}
                  {apptsList.map((item, idx) => (
                    <div
                      key={`appt-${item._id || idx}`}
                      onClick={() => item.patient_id?._id && navigate(`/patients/${item.patient_id._id}`)}
                      className="p-3 rounded-xl bg-blue-50/40 border border-blue-100 flex items-center justify-between gap-3 hover:bg-blue-50 transition cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex flex-col items-center justify-center font-bold text-[10px] shrink-0 font-mono shadow-xs">
                          <span>{item.appointment_time ? item.appointment_time.split(' ')[0] : '09:00'}</span>
                          <span className="text-[8px] opacity-80 uppercase">{item.appointment_time?.includes('PM') ? 'PM' : 'AM'}</span>
                        </div>
                        <div className="truncate">
                          <div className="flex items-center gap-1.5">
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-100 text-blue-800 uppercase">
                              Appt
                            </span>
                            <p className="text-xs font-bold text-slate-900 truncate">
                              {item.patient_id?.name || 'Patient'}
                            </p>
                          </div>
                          <p className="text-[11px] text-slate-500 truncate mt-0.5">
                            {item.patient_id?.patient_number || ''} • {item.reason || 'Dental Consultation'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <StatusBadge status={item.status} />
                        <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">
                          {new Date(item.appointment_date).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}

                  {/* Pending Follow-ups */}
                  {followupsList.map((item, idx) => (
                    <div
                      key={`fup-${item._id || idx}`}
                      onClick={() => item.patient_id?._id && navigate(`/patients/${item.patient_id._id}`)}
                      className="p-3 rounded-xl bg-amber-50/40 border border-amber-100 flex items-center justify-between gap-3 hover:bg-amber-50 transition cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                          <Clock className="w-4 h-4" />
                        </div>
                        <div className="truncate">
                          <div className="flex items-center gap-1.5">
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800 uppercase">
                              Follow-up
                            </span>
                            <p className="text-xs font-bold text-slate-900 truncate">
                              {item.patient_id?.name || 'Patient'}
                            </p>
                          </div>
                          <p className="text-[11px] text-slate-500 truncate mt-0.5">
                            {item.patient_id?.patient_number || ''} • {item.reason || 'Recall / Check-up'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <StatusBadge status={item.status || 'Pending'} />
                        <span className="text-[10px] text-amber-700 font-bold block mt-0.5 font-mono">
                          Due: {new Date(item.followup_date).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>

          <div className="pt-3 mt-3 border-t border-slate-50 flex items-center justify-between text-xs">
            <button
              onClick={() => navigate('/visits')}
              className="font-bold text-slate-600 hover:text-slate-900 transition inline-flex items-center gap-1 cursor-pointer"
            >
              <span>Patient Queue</span>
            </button>
            <button
              onClick={() => navigate('/appointments')}
              className="font-bold text-blue-600 hover:text-blue-700 transition inline-flex items-center gap-1 cursor-pointer"
            >
              <span>Manage Appointments</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* ── Monthly Revenue & Performance Overview (7 cols) ── */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-5 border border-slate-100/90 shadow-[0_2px_8px_rgba(0,0,0,0.03)] flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-amber-500" />
                  <span>Monthly Performance & Revenue</span>
                </h3>
                <p className="text-[11px] text-slate-400">Revenue generated strictly from your consultations and treatments</p>
              </div>

              {/* Month Selector */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-500">Month:</span>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 rounded-xl focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  {monthOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Highlight Banner */}
            <div className="p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block">
                  {selectedMonthLabel} Total Earned
                </span>
                <span className="text-2xl font-black text-amber-900 font-mono mt-0.5 block">
                  {`$${(stats.monthlyRevenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                </span>
              </div>
              <div className="text-right text-xs">
                <span className="text-amber-800 font-bold block">{topServices.reduce((sum, s) => sum + (s.count || 0), 0)} Procedures</span>
                <span className="text-[11px] text-amber-700">Conducted this month</span>
              </div>
            </div>

            {/* Trajectory Chart */}
            <DoctorRevenueChart dailyData={dailyRevenue} monthRevenue={stats.monthlyRevenue || 0} />
          </div>

          {/* Top Services Breakdown */}
          {topServices.length > 0 && (
            <div className="pt-3 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-3 gap-2">
              {topServices.slice(0, 3).map((s, idx) => (
                <div key={idx} className="p-2 bg-slate-50 rounded-xl">
                  <span className="text-[10px] text-slate-400 block truncate font-medium">{s._id || 'Service'}</span>
                  <span className="text-xs font-bold text-slate-800 font-mono">{s.count} done ({`$${(s.totalRevenue || 0).toFixed(0)}`})</span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* ── 4. Recent Served Patients Table ── */}
      <div className="bg-white rounded-2xl p-5 border border-slate-100/90 shadow-[0_2px_8px_rgba(0,0,0,0.03)] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              <span>Recent Served Patients</span>
            </h3>
            <p className="text-[11px] text-slate-400">Patients attended by Dr. {doctor.name || user?.username}</p>
          </div>

          {/* Live Table Search */}
          <div className="w-full sm:w-72 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              type="text"
              value={patientSearch}
              onChange={(e) => setPatientSearch(e.target.value)}
              placeholder="Search by patient name, phone, or ID..."
              className="w-full text-xs bg-transparent focus:outline-none font-medium"
            />
          </div>
        </div>

        {filteredRecentPatients.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs">
            <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-slate-600">No served patients found</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Patients you attend will appear in this list.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Patient</th>
                  <th className="py-3 px-4">Patient ID</th>
                  <th className="py-3 px-4">Visit Date & Time</th>
                  <th className="py-3 px-4">Service / Consultation</th>
                  <th className="py-3 px-4">Visit Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredRecentPatients.map((visit) => {
                  const patient = visit.patient_id;
                  return (
                    <tr key={visit._id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                            {(patient?.name || 'P').charAt(0)}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block">{patient?.name || 'Patient'}</span>
                            <span className="text-[11px] text-slate-400">{patient?.telephone || 'No phone'}</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-slate-700">
                        {patient?.patient_number || '—'}
                      </td>

                      <td className="py-3.5 px-4 text-slate-600 font-mono text-[11px]">
                        {new Date(visit.visit_date || visit.createdAt).toLocaleDateString('en-US', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })} • {new Date(visit.visit_date || visit.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>

                      <td className="py-3.5 px-4 font-semibold text-slate-800">
                        {visit.reason || 'General Dental Consultation'}
                      </td>

                      <td className="py-3.5 px-4">
                        <StatusBadge status={visit.status} />
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => navigate('/visits')}
                          className="px-3 py-1.5 bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-700 font-bold rounded-lg transition text-[11px] cursor-pointer"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── 5. Recent Activity / Clinical Notes Log ── */}
      <div className="bg-white rounded-2xl p-5 border border-slate-100/90 shadow-[0_2px_8px_rgba(0,0,0,0.03)] space-y-3.5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-600" />
              <span>Recent Clinical Activity Log</span>
            </h3>
            <p className="text-[11px] text-slate-400">Recent dental procedures and treatments performed by you</p>
          </div>
          <button
            onClick={() => navigate('/treatments')}
            className="text-xs font-bold text-blue-600 hover:text-blue-700 transition cursor-pointer"
          >
            View all treatments
          </button>
        </div>

        {recentTreatments.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs">
            <Clock className="w-7 h-7 text-slate-300 mx-auto mb-1.5" />
            <p>No recent dental procedures recorded.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {recentTreatments.map((t, idx) => (
              <div key={t._id || idx} className="p-3 rounded-xl bg-slate-50/80 border border-slate-100 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 truncate">{t.patient_id?.name || 'Patient'}</span>
                  <span className="text-[10px] font-mono font-bold text-emerald-600">${t.price || 0}</span>
                </div>
                <div className="text-[11px] font-semibold text-blue-700 truncate">
                  {t.service_name || 'Dental Treatment'}
                </div>
                <div className="text-[10px] text-slate-400 flex items-center justify-between">
                  <span>Tooth: {t.tooth_number || 'General'}</span>
                  <span className="font-mono">{new Date(t.treatment_date || t.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};

export default DoctorDashboard;
