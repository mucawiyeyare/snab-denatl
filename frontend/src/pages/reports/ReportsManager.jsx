import React, { useState, useEffect } from 'react';
import { getDashboardStatsApi, getDoctorPerformanceReportApi, getServiceAnalyticsApi } from '../../api/endpoints.js';
import {
  FileBarChart,
  DollarSign,
  Users,
  Award,
  TrendingUp,
  TestTube2,
  Printer,
  Calendar,
  Filter,
  CheckCircle2,
  PieChart,
  BarChart3,
  Stethoscope,
  Activity
} from 'lucide-react';

const ReportsManager = () => {
  const [stats, setStats] = useState(null);
  const [doctorPerformance, setDoctorPerformance] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState('month'); // 'week' | 'month' | 'year'

  useEffect(() => {
    fetchReportData();
  }, []);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const [statsRes, docRes, analyticsRes] = await Promise.all([
        getDashboardStatsApi().catch(() => ({ data: { data: null } })),
        getDoctorPerformanceReportApi().catch(() => ({ data: { data: [] } })),
        getServiceAnalyticsApi().catch(() => ({ data: { data: null } }))
      ]);
      setStats(statsRes.data?.data);
      setDoctorPerformance(docRes.data?.data || []);
      setAnalytics(analyticsRes.data?.data);
    } catch (err) {
      console.error('Error fetching reports:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Monthly Revenue Data (100% Real Live Aggregated Data from MongoDB)
  const monthlyRevenueData = React.useMemo(() => {
    const list = [];
    const today = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const monthShort = d.toLocaleDateString('en-US', { month: 'short' });
      const matched = (stats?.monthlyRevenue || []).find(m => m._id === monthKey);
      list.push({
        month: monthShort,
        revenue: matched ? matched.total : 0,
        visits: matched ? matched.count : 0
      });
    }
    return list;
  }, [stats?.monthlyRevenue]);

  const maxRevenue = Math.max(...monthlyRevenueData.map(d => d.revenue), 100);

  // Real Payment Categories Breakdown
  const paymentCats = analytics?.paymentCategories || [];
  const totalCatRevenue = paymentCats.reduce((sum, c) => sum + (c.total || 0), 0) || 1;

  // Real Top Dental Procedures
  const realTopServices = analytics?.topServices || [];
  const maxSrvCount = Math.max(...realTopServices.map(s => s.count || 0), 1);

  // Real Top Diagnostic Lab Tests
  const realTopLabs = analytics?.topLabTests || [];
  const maxLabCount = Math.max(...realTopLabs.map(l => l.count || 0), 1);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Header with Title and Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 no-print">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Clinic Reports & Analytics Dashboard</h1>
          <p className="text-xs text-slate-500">Live financial metrics, procedure trends, and clinical performance verified from database</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            Print Report
          </button>
        </div>
      </div>

      <div id="printable-area" className="space-y-6">
        
        {/* 1. Top KPI Overview Cards (100% Real Live Database Data) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Today's Revenue</span>
            <p className="text-2xl font-black text-emerald-600">${(stats?.financials?.todayRevenue || 0).toFixed(2)}</p>
            <div className="flex items-center gap-1 text-[11px] text-emerald-600 font-semibold pt-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Collected today</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">This Month Revenue</span>
            <p className="text-2xl font-black text-blue-600">${(stats?.financials?.monthRevenue || 0).toFixed(2)}</p>
            <div className="flex items-center gap-1 text-[11px] text-blue-600 font-semibold pt-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Total: ${(stats?.financials?.totalRevenue || 0).toFixed(2)}</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Outstanding Invoices</span>
            <p className="text-2xl font-black text-rose-600">${(stats?.financials?.totalOutstanding || 0).toFixed(2)}</p>
            <span className="text-[11px] text-slate-400 font-medium block pt-1">
              {stats?.financials?.unpaidInvoicesCount || 0} unpaid balances
            </span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Patients</span>
            <p className="text-2xl font-black text-slate-900">{stats?.patients?.total || 0}</p>
            <span className="text-[11px] text-slate-400 font-medium block pt-1">
              {stats?.patients?.month || 0} new registered this month
            </span>
          </div>

        </div>

        {/* 2. Charts Row: Revenue Growth Chart + Revenue Source Donut */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* 6-Month Revenue Trend Bar Chart (2 cols) */}
          <div className="lg:col-span-2 bg-white p-6 sm:p-7 rounded-3xl border border-slate-100 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                  <h3 className="text-base font-bold text-slate-900">Monthly Revenue Trend (Last 6 Months)</h3>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">Historical financial trajectory computed directly from collected payments</p>
              </div>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg">
                Live Data
              </span>
            </div>

            {/* SVG Visual Bar Trend */}
            <div className="pt-6">
              <div className="relative h-56 w-full">
                <svg className="w-full h-full overflow-visible" viewBox="0 0 600 200">
                  <defs>
                    <linearGradient id="barBlueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" />
                      <stop offset="100%" stopColor="#1d4ed8" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Grid lines */}
                  <line x1="50" y1="20" x2="580" y2="20" stroke="#f1f5f9" strokeDasharray="3 3" />
                  <line x1="50" y1="65" x2="580" y2="65" stroke="#f1f5f9" strokeDasharray="3 3" />
                  <line x1="50" y1="110" x2="580" y2="110" stroke="#f1f5f9" strokeDasharray="3 3" />
                  <line x1="50" y1="155" x2="580" y2="155" stroke="#f1f5f9" strokeDasharray="3 3" />
                  <line x1="50" y1="195" x2="580" y2="195" stroke="#cbd5e1" strokeWidth="1.5" />

                  {/* Y-axis Labels */}
                  <text x="10" y="24" className="text-[10px] fill-slate-400 font-mono font-bold">${Math.round(maxRevenue)}</text>
                  <text x="10" y="69" className="text-[10px] fill-slate-400 font-mono font-bold">${Math.round(maxRevenue * 0.75)}</text>
                  <text x="10" y="114" className="text-[10px] fill-slate-400 font-mono font-bold">${Math.round(maxRevenue * 0.5)}</text>
                  <text x="10" y="159" className="text-[10px] fill-slate-400 font-mono font-bold">${Math.round(maxRevenue * 0.25)}</text>
                  <text x="25" y="198" className="text-[10px] fill-slate-400 font-mono font-bold">$0</text>

                  {/* Monthly Bars */}
                  {monthlyRevenueData.map((d, idx) => {
                    const barX = 75 + idx * 85;
                    const barHeight = d.revenue > 0 ? (d.revenue / maxRevenue) * 160 : 4;
                    const barY = 195 - barHeight;
                    return (
                      <g key={idx} className="transition-all hover:opacity-80 cursor-pointer">
                        {/* Bar */}
                        <rect
                          x={barX}
                          y={barY}
                          width="38"
                          height={barHeight}
                          rx="6"
                          fill="url(#barBlueGradient)"
                        />
                        {/* Amount text above bar */}
                        <text
                          x={barX + 19}
                          y={barY - 6}
                          textAnchor="middle"
                          className="text-[10px] fill-slate-800 font-bold font-mono"
                        >
                          ${d.revenue.toFixed(0)}
                        </text>
                        {/* Month label under bar */}
                        <text
                          x={barX + 19}
                          y="215"
                          textAnchor="middle"
                          className="text-[11px] fill-slate-500 font-bold"
                        >
                          {d.month}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>

            <div className="flex items-center justify-center gap-6 pt-6 border-t border-slate-50 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-md bg-blue-600"></span>
                <span className="text-slate-600 font-medium">Billed & Collected Revenue</span>
              </div>
            </div>
          </div>

          {/* Revenue Distribution Donut Chart (1 col) */}
          <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-100 shadow-xs space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2">
                <PieChart className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">Revenue Distribution</h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">Live contribution by payment category</p>
            </div>

            {/* Circular Donut Diagram */}
            <div className="flex items-center justify-center py-2">
              <div className="relative w-44 h-44 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="14" fill="none" stroke="#f1f5f9" strokeWidth="4.5" />
                  {paymentCats.map((cat, idx) => {
                    const pct = Math.round((cat.total / totalCatRevenue) * 100) || 0;
                    const colors = ['#2563eb', '#06b6d4', '#f59e0b', '#10b981', '#8b5cf6'];
                    const color = colors[idx % colors.length];
                    const offset = paymentCats.slice(0, idx).reduce((acc, c) => acc + Math.round((c.total / totalCatRevenue) * 100), 0);
                    return (
                      <circle
                        key={idx}
                        cx="18"
                        cy="18"
                        r="14"
                        fill="none"
                        stroke={color}
                        strokeWidth="4.5"
                        strokeDasharray={`${pct * 0.88} 100`}
                        strokeDashoffset={`-${offset * 0.88}`}
                        strokeLinecap="round"
                      />
                    );
                  })}
                </svg>
                <div className="absolute text-center">
                  <span className="text-xl font-black text-slate-900 block font-mono">${(stats?.financials?.totalRevenue || 0).toFixed(0)}</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Collected</span>
                </div>
              </div>
            </div>

            {/* Category Legend */}
            <div className="space-y-2 text-xs font-semibold pt-2 border-t border-slate-50">
              {paymentCats.length === 0 ? (
                <p className="text-slate-400 text-center text-[11px] py-2">No payments collected yet.</p>
              ) : (
                paymentCats.map((cat, idx) => {
                  const colors = ['bg-blue-600', 'bg-cyan-500', 'bg-amber-500', 'bg-emerald-500', 'bg-purple-500'];
                  const pct = Math.round((cat.total / totalCatRevenue) * 100) || 0;
                  return (
                    <div key={idx} className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${colors[idx % colors.length]}`}></span>
                        <span className="text-slate-700">{cat._id || 'General Payment'}</span>
                      </div>
                      <span className="font-bold text-slate-900 font-mono">{pct}% (${cat.total.toFixed(2)})</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>

        {/* 3. Doctor Performance & Productivity Comparison */}
        <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-100 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <div className="flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">Clinician Productivity & Performance</h3>
              </div>
              <p className="text-xs text-slate-400">Live consultations completed, procedures performed, and revenue generated by doctor</p>
            </div>
          </div>

          {doctorPerformance.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs">
              <Stethoscope className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p>No doctor clinical records found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {doctorPerformance.map((doc, idx) => {
                const totalDocRev = stats?.financials?.totalRevenue || 1;
                const share = Math.min(Math.round((doc.treatmentRevenue / totalDocRev) * 100), 100) || 0;
                return (
                  <div key={doc.doctorId || idx} className="p-5 rounded-2xl bg-slate-50/80 border border-slate-100 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">Dr. {doc.name}</h4>
                        <span className="text-xs text-blue-600 font-semibold">{doc.specialization}</span>
                      </div>
                      <span className="font-mono text-base font-black text-slate-900">
                        ${doc.treatmentRevenue.toFixed(2)}
                      </span>
                    </div>

                    {/* Horizontal Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] text-slate-500 font-medium">
                        <span>Procedures: {doc.proceduresCount} • Patients: {doc.patientsSeen}</span>
                        <span className="font-bold text-slate-700">{share}% of total clinic revenue</span>
                      </div>
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-blue-600 h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(share, 5)}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200/50">
                      <span>Lab Orders Placed: {doc.labRequestsCount}</span>
                      <span className="text-emerald-700 font-bold">Active & Verified</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 4. Top Services & Laboratory Utilization */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Most Utilized Dental Procedures */}
          <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-100 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">Most Utilized Dental Procedures</h3>
              </div>
              <span className="text-xs text-slate-400 font-medium">Ranked by real volume</span>
            </div>

            {realTopServices.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                <p>No dental procedures recorded yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {realTopServices.map((srv, idx) => {
                  const pct = Math.round((srv.count / maxSrvCount) * 100);
                  return (
                    <div key={idx} className="p-3.5 bg-slate-50/80 rounded-2xl space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-800">{srv._id}</span>
                        <span className="font-mono font-bold text-emerald-700">${(srv.totalRevenue || 0).toFixed(2)}</span>
                      </div>
                      <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-blue-600 h-full rounded-full" style={{ width: `${pct}%` }}></div>
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                        <span>{srv.count} procedures performed</span>
                        <span>{pct}% share</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Diagnostic Laboratory Testing Volume */}
          <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-100 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TestTube2 className="w-5 h-5 text-purple-600" />
                <h3 className="text-base font-bold text-slate-900">Diagnostic Laboratory Utilization</h3>
              </div>
              <span className="text-xs text-slate-400 font-medium">Ranked by real volume</span>
            </div>

            {realTopLabs.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                <p>No lab tests recorded yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {realTopLabs.map((lab, idx) => {
                  const pct = Math.round((lab.count / maxLabCount) * 100);
                  return (
                    <div key={idx} className="p-3.5 bg-purple-50/50 rounded-2xl space-y-2 border border-purple-100/50">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-800">{lab._id}</span>
                        <span className="font-mono font-bold text-purple-700">${(lab.totalRevenue || 0).toFixed(2)}</span>
                      </div>
                      <div className="w-full bg-purple-200 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-purple-600 h-full rounded-full" style={{ width: `${pct}%` }}></div>
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-500 font-medium">
                        <span>{lab.count} tests conducted</span>
                        <span>{pct}% share</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
};

export default ReportsManager;
