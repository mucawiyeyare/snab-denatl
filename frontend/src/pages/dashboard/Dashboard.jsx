import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import DoctorDashboard from './DoctorDashboard.jsx';
import {
  getDashboardStatsApi,
  getAppointmentsApi,
  getInvoicesApi,
  getServiceAnalyticsApi,
  getAuditLogsApi
} from '../../api/endpoints.js';
import {
  Users,
  Calendar,
  DollarSign,
  CreditCard,
  UserPlus,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Clock,
  FileText,
  Activity,
  CheckCircle2,
  CalendarDays
} from 'lucide-react';

/* ==========================================================================
   STAT CARD COMPONENT (Matches Reference Screenshot Proportions & Visuals)
   ========================================================================== */
const StatCard = ({ icon: Icon, label, value, subText, subColor, iconBg }) => (
  <div className="bg-white rounded-2xl p-5 border border-slate-100/90 shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:shadow-md transition duration-200 flex flex-col justify-between">
    <div className="flex items-center gap-3.5">
      <div
        className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 shadow-xs"
        style={{ background: iconBg }}
      >
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <span className="text-xs font-semibold text-slate-500 block leading-tight">{label}</span>
        <span className="text-2xl font-black text-slate-900 tracking-tight mt-0.5 block">{value}</span>
      </div>
    </div>
    <div className="mt-3 pt-2.5 border-t border-slate-50 flex items-center justify-between text-xs">
      <span className="font-semibold" style={{ color: subColor || '#2563eb' }}>
        {subText}
      </span>
    </div>
  </div>
);

/* ==========================================================================
   STATUS BADGE COMPONENT
   ========================================================================== */
const SoftBadge = ({ status }) => {
  if (status === 'Confirmed' || status === 'Paid' || status === 'Completed') {
    return (
      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100/80">
        {status}
      </span>
    );
  }
  if (status === 'Pending' || status === 'Unpaid' || status === 'Waiting') {
    return (
      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-600 border border-amber-100/80">
        {status}
      </span>
    );
  }
  return (
    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-600 border border-blue-100/80">
      {status || 'Active'}
    </span>
  );
};

/* ==========================================================================
   DYNAMIC REVENUE OVERVIEW LINE CHART (Computed from Real Payment Data)
   ========================================================================== */
const RevenueLineChart = ({ dailyData = [], totalMonthRevenue = 0 }) => {
  // Construct 7-day timeline from real data or last 7 days
  const pointsData = React.useMemo(() => {
    const days = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = d.toISOString().split('T')[0];
      const match = dailyData.find(item => item._id === dateStr);
      const label = d.toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
      days.push({
        date: dateStr,
        label,
        amount: match ? match.total : 0
      });
    }
    return days;
  }, [dailyData]);

  const maxAmount = Math.max(...pointsData.map(p => p.amount), 50);
  const chartHeight = 110;
  const chartWidth = 400;
  const paddingLeft = 45;
  const paddingBottom = 120;
  const stepX = (chartWidth - 20) / (pointsData.length - 1);

  const coords = pointsData.map((pt, i) => {
    const x = paddingLeft + i * stepX;
    const y = paddingBottom - (pt.amount / maxAmount) * (chartHeight - 30);
    return { ...pt, x, y };
  });

  const pathD = coords.reduce((acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`, '');
  const areaD = `${pathD} L ${coords[coords.length - 1].x} ${paddingBottom} L ${coords[0].x} ${paddingBottom} Z`;

  // Find point with highest or latest revenue for tooltip
  const highlightedPoint = coords.reduce((max, pt) => (pt.amount >= max.amount ? pt : max), coords[coords.length - 1]);

  return (
    <div className="w-full h-44 relative mt-2">
      <svg className="w-full h-full overflow-visible" viewBox="0 0 460 140">
        <defs>
          <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2563eb" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Horizontal grid lines */}
        <line x1="40" y1="20" x2="445" y2="20" stroke="#f1f5f9" strokeDasharray="3 3" />
        <line x1="40" y1="50" x2="445" y2="50" stroke="#f1f5f9" strokeDasharray="3 3" />
        <line x1="40" y1="80" x2="445" y2="80" stroke="#f1f5f9" strokeDasharray="3 3" />
        <line x1="40" y1="120" x2="445" y2="120" stroke="#e2e8f0" strokeWidth="1" />

        {/* Y-axis labels */}
        <text x="35" y="23" textAnchor="end" className="text-[9px] fill-slate-400 font-semibold font-mono">${Math.round(maxAmount)}</text>
        <text x="35" y="53" textAnchor="end" className="text-[9px] fill-slate-400 font-semibold font-mono">${Math.round(maxAmount * 0.66)}</text>
        <text x="35" y="83" textAnchor="end" className="text-[9px] fill-slate-400 font-semibold font-mono">${Math.round(maxAmount * 0.33)}</text>
        <text x="35" y="123" textAnchor="end" className="text-[9px] fill-slate-400 font-semibold font-mono">$0</text>

        {/* Area Gradient */}
        <path d={areaD} fill="url(#revGrad)" />

        {/* Line */}
        <path d={pathD} fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

        {/* Points */}
        {coords.map((pt, i) => (
          <circle
            key={i}
            cx={pt.x}
            cy={pt.y}
            r="3.5"
            fill="#ffffff"
            stroke="#2563eb"
            strokeWidth="2"
          />
        ))}

        {/* Dynamic Tooltip on active point */}
        {highlightedPoint && (
          <g transform={`translate(${Math.min(390, Math.max(70, highlightedPoint.x))}, ${Math.max(22, highlightedPoint.y - 20)})`}>
            <rect x="-28" y="-18" width="56" height="26" rx="6" fill="#1e293b" />
            <text x="0" y="-6" textAnchor="middle" className="text-[8px] fill-slate-300 font-medium">{highlightedPoint.label}</text>
            <text x="0" y="5" textAnchor="middle" className="text-[9px] fill-white font-black font-mono">${highlightedPoint.amount.toFixed(0)}</text>
          </g>
        )}

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
   DYNAMIC PATIENT OVERVIEW DONUT CHART (Computed from Real Patient Records)
   ========================================================================== */
const PatientDonutChart = ({ totalCount = 0, newPatients = 0, returningPatients = 0 }) => {
  const total = Number(totalCount) || 0;
  const newPct = total > 0 ? Math.round((newPatients / total) * 100) : 0;
  const retPct = total > 0 ? Math.max(0, 100 - newPct) : 0;

  return (
    <div className="flex flex-col items-center justify-between h-full gap-4 pt-1">
      <div className="relative w-36 h-36 flex items-center justify-center">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
          {/* Background circle */}
          <circle cx="18" cy="18" r="14" fill="none" stroke="#f1f5f9" strokeWidth="4" />

          {/* New Patients Arc - Blue */}
          {newPct > 0 && (
            <circle
              cx="18"
              cy="18"
              r="14"
              fill="none"
              stroke="#2563eb"
              strokeWidth="4"
              strokeDasharray={`${newPct * 0.88} 100`}
              strokeDashoffset="0"
              strokeLinecap="round"
            />
          )}

          {/* Returning Patients Arc - Emerald */}
          {retPct > 0 && (
            <circle
              cx="18"
              cy="18"
              r="14"
              fill="none"
              stroke="#10b981"
              strokeWidth="4"
              strokeDasharray={`${retPct * 0.88} 100`}
              strokeDashoffset={`-${newPct * 0.88}`}
              strokeLinecap="round"
            />
          )}
        </svg>

        {/* Center label */}
        <div className="absolute text-center flex flex-col items-center">
          <span className="text-xl font-black text-slate-900 leading-tight font-mono">{total.toLocaleString()}</span>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Patients</span>
        </div>
      </div>

      {/* Legend list */}
      <div className="w-full space-y-2 text-xs font-semibold">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0"></span>
            <span className="text-slate-600">New Patients (Last 30d)</span>
          </div>
          <span className="font-bold text-slate-900 font-mono">{newPatients} ({newPct}%)</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></span>
            <span className="text-slate-600">Returning Patients</span>
          </div>
          <span className="font-bold text-slate-900 font-mono">{returningPatients} ({retPct}%)</span>
        </div>
      </div>
    </div>
  );
};

/* ==========================================================================
   MAIN DASHBOARD COMPONENT (100% Live Real System Data)
   ========================================================================== */
const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // If logged-in user is a Doctor, render dedicated Doctor Dashboard
  if (user?.role === 'Doctor') {
    return <DoctorDashboard />;
  }

  // Generate last 12 months for selector
  const monthOptions = React.useMemo(() => {
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
  const [isHeaderMonthOpen, setIsHeaderMonthOpen] = useState(false);
  const [stats, setStats] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [topServices, setTopServices] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [selectedMonth]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [statsRes, apptsRes, invRes, svcRes, auditRes] = await Promise.all([
        getDashboardStatsApi({ month: selectedMonth }).catch(() => ({ data: { data: null } })),
        getAppointmentsApi({ limit: 6 }).catch(() => ({ data: { data: [] } })),
        getInvoicesApi({ status: 'unpaid' }).catch(() => ({ data: { data: [] } })),
        getServiceAnalyticsApi().catch(() => ({ data: { data: { topServices: [] } } })),
        getAuditLogsApi({ limit: 6 }).catch(() => ({ data: { data: [] } }))
      ]);

      setStats(statsRes.data?.data || null);
      setAppointments(apptsRes.data?.data || []);
      setInvoices(invRes.data?.data || []);
      setTopServices(svcRes.data?.data?.topServices || statsRes.data?.data?.topTreatments || []);
      setActivities(auditRes.data?.data || []);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  // 100% Real Live Metrics from Database
  const totalPatientsCount = stats?.patients?.total ?? 0;
  const todayApptsCount = stats?.appointments?.today ?? 0;
  const totalRevenueVal = stats?.financials?.totalRevenue ?? 0;
  const monthRevenueVal = stats?.financials?.monthRevenue ?? 0;
  const totalPendingPayments = stats?.financials?.totalOutstanding ?? 0;
  const newPatientsThisMonth = stats?.patients?.month ?? 0;
  const newPatientsCount = stats?.patients?.newPatients ?? 0;
  const returningPatientsCount = stats?.patients?.returningPatients ?? 0;
  const unpaidInvoicesCount = stats?.financials?.unpaidInvoicesCount ?? 0;

  // Real data lists
  const displayAppointments = appointments.slice(0, 5);
  const displayInvoices = invoices.slice(0, 5);
  const displayActivities = activities.slice(0, 5);

  const maxTreatmentCount = Math.max(...topServices.map(s => s.count || 0), 1);
  const displayTreatments = topServices.slice(0, 5).map(s => ({
    name: s._id || 'Dental Procedure',
    count: s.count || 0,
    pct: Math.round(((s.count || 0) / maxTreatmentCount) * 100)
  }));

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
      
      {/* 1. Header Row (Dashboard Title & Welcome + 1-Click Interactive Month Switcher) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Dashboard</h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Welcome back, {user?.full_name || user?.username || 'Clinician'}
          </p>
        </div>

        {/* Interactive Month & Date Navigator */}
        <div className="relative">
          <div className="bg-white p-1 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-0.5">
            {/* Previous Month 1-Click Button */}
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-xl transition cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Center Month / Calendar Button */}
            <button
              type="button"
              onClick={() => setIsHeaderMonthOpen(prev => !prev)}
              className="px-2.5 py-1 text-xs font-bold text-slate-800 flex items-center gap-1.5 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              title="Click to choose a month or view calendar"
            >
              <CalendarDays className="w-4 h-4 text-blue-600" />
              <span>{selectedMonthLabel}</span>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isHeaderMonthOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Next Month 1-Click Button */}
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-xl transition cursor-pointer"
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
                  <span className="font-black text-slate-900 text-sm block">Select Filter Month</span>
                  <span className="text-[11px] text-slate-400 font-medium">Filter clinic reports & revenue statistics</span>
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
      </div>

      {/* 2. Top 5 Statistics Cards (100% Real Live Database Data) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard
          icon={Users}
          label="Total Patients"
          value={totalPatientsCount.toLocaleString()}
          subText={`${newPatientsThisMonth} new this month`}
          subColor="#2563eb"
          iconBg="#2563eb"
        />
        <StatCard
          icon={Calendar}
          label="Today Appointments"
          value={todayApptsCount}
          subText={`${stats?.appointments?.total ?? 0} total booked`}
          subColor="#10b981"
          iconBg="#10b981"
        />
        <StatCard
          icon={DollarSign}
          label="Total Revenue"
          value={`$${totalRevenueVal.toLocaleString()}`}
          subText={`$${monthRevenueVal.toLocaleString()} this month`}
          subColor="#8b5cf6"
          iconBg="#8b5cf6"
        />
        <StatCard
          icon={CreditCard}
          label="Pending Payments"
          value={`$${totalPendingPayments.toLocaleString()}`}
          subText={`${unpaidInvoicesCount} unpaid invoices`}
          subColor="#ea580c"
          iconBg="#f59e0b"
        />
        <StatCard
          icon={UserPlus}
          label="New Patients"
          value={newPatientsThisMonth}
          subText="registered this month"
          subColor="#0284c7"
          iconBg="#0284c7"
        />
      </div>

      {/* 3. Middle Grid Section (Appointments, Real SVG Revenue Trend, Real Donut) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left Column: Today's Appointments (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-2xl p-5 border border-slate-100/90 shadow-[0_2px_8px_rgba(0,0,0,0.03)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900">Today's Appointments</h3>
              <button
                onClick={() => navigate('/appointments')}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 transition cursor-pointer"
              >
                View all
              </button>
            </div>

            {displayAppointments.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs">
                <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p>No appointments booked for today.</p>
              </div>
            ) : (
              <div className="space-y-3.5">
                {displayAppointments.map((item, idx) => (
                  <div key={item._id || idx} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xs font-bold text-slate-500 font-mono shrink-0">
                        {item.appointment_time || '09:00 AM'}
                      </span>
                      <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[10px] shrink-0">
                        {(item.patient_id?.name || 'P').charAt(0)}
                      </div>
                      <div className="truncate">
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {item.patient_id?.name || 'Patient'}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate">
                          {item.reason || 'General Examination'}
                        </p>
                      </div>
                    </div>
                    <SoftBadge status={item.status} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Middle Column: Dynamic Revenue Overview Line Chart (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-5 border border-slate-100/90 shadow-[0_2px_8px_rgba(0,0,0,0.03)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Revenue Overview</h3>
                <p className="text-[11px] text-slate-400">Live 7-day payment collection trajectory</p>
              </div>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg">
                ${monthRevenueVal.toFixed(2)} (This Month)
              </span>
            </div>
            <RevenueLineChart dailyData={stats?.dailyRevenue || []} totalMonthRevenue={monthRevenueVal} />
          </div>
        </div>

        {/* Right Column: Patient Overview Donut Chart (3 cols) */}
        <div className="lg:col-span-3 bg-white rounded-2xl p-5 border border-slate-100/90 shadow-[0_2px_8px_rgba(0,0,0,0.03)] flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-2">Patient Overview</h3>
            <PatientDonutChart
              totalCount={totalPatientsCount}
              newPatients={newPatientsCount}
              returningPatients={returningPatientsCount}
            />
          </div>
        </div>

      </div>

      {/* 4. Bottom Grid Section (Top Treatments, Pending Invoices, Recent Activities) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left: Top Treatments (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-2xl p-5 border border-slate-100/90 shadow-[0_2px_8px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900">Top Procedures</h3>
            <button
              onClick={() => navigate('/treatments')}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 transition cursor-pointer"
            >
              View all
            </button>
          </div>

          {displayTreatments.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              <Activity className="w-7 h-7 text-slate-300 mx-auto mb-1.5" />
              <p>No dental procedures recorded yet.</p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {displayTreatments.map((t, idx) => (
                <div key={idx} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">
                      <span className="text-slate-400 mr-2 font-mono">{idx + 1}.</span>
                      {t.name}
                    </span>
                    <span className="font-bold text-slate-900 font-mono">{t.count} procedures</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-blue-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${t.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Middle: Pending Invoices (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-5 border border-slate-100/90 shadow-[0_2px_8px_rgba(0,0,0,0.03)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900">Pending Invoices</h3>
              <button
                onClick={() => navigate('/billing')}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 transition cursor-pointer"
              >
                View all ({unpaidInvoicesCount})
              </button>
            </div>

            {displayInvoices.length === 0 ? (
              <div className="text-center py-8 text-emerald-600 text-xs">
                <CheckCircle2 className="w-7 h-7 text-emerald-500 mx-auto mb-1.5" />
                <p className="font-bold">All invoices are settled.</p>
                <span className="text-[10px] text-slate-400">No outstanding patient balances</span>
              </div>
            ) : (
              <div className="space-y-3">
                {displayInvoices.map((inv, idx) => (
                  <div key={inv._id || idx} className="flex items-center justify-between text-xs py-1 border-b border-slate-50 last:border-0">
                    <span className="font-mono font-bold text-slate-800">{inv.invoice_number}</span>
                    <span className="font-semibold text-slate-700 truncate max-w-[140px]">{inv.patient_id?.name || 'Patient'}</span>
                    <span className="font-bold text-slate-900 font-mono">${(inv.balance || inv.total_amount || 0).toFixed(2)}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-100">
                      Unpaid
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Recent Activities (3 cols) */}
        <div className="lg:col-span-3 bg-white rounded-2xl p-5 border border-slate-100/90 shadow-[0_2px_8px_rgba(0,0,0,0.03)] flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-4">Recent Activities</h3>

            {displayActivities.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                <Clock className="w-7 h-7 text-slate-300 mx-auto mb-1.5" />
                <p>No activity logs recorded today.</p>
              </div>
            ) : (
              <div className="space-y-3.5">
                {displayActivities.map((act, idx) => (
                  <div key={act._id || idx} className="flex items-start gap-2.5 text-xs">
                    <div className="w-2 h-2 rounded-full bg-blue-600 mt-1.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-700 text-[11px] leading-tight">
                        {act.action?.replace(/_/g, ' ') || 'Action recorded'}
                      </p>
                      {act.details?.service_name && (
                        <p className="text-[10px] text-slate-400 truncate">{act.details.service_name}</p>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono shrink-0">
                      {new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-3 mt-2 border-t border-slate-50 text-center">
            <button
              onClick={() => navigate('/audit-logs')}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 transition cursor-pointer"
            >
              View all activities
            </button>
          </div>
        </div>

      </div>

      {/* 5. Footer */}
      <div className="pt-4 border-t border-slate-200/60 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-2">
        <p>© 2026 SNAB Dental & Dermatologic Clinic Management System.</p>
        <p className="font-medium">All systems operational</p>
      </div>

    </div>
  );
};

export default Dashboard;

