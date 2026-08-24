import React, { useState, useEffect } from 'react';
import {
  getDashboardStatsApi,
  getFinancialSummaryApi,
  getTreatmentAnalyticsApi,
  getMedicationReportApi,
  getDoctorPerformanceReportApi
} from '../../api/endpoints.js';
import {
  FileBarChart,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  Calendar,
  Filter,
  Printer,
  Download,
  Stethoscope,
  HeartPulse,
  Pill,
  PieChart,
  BarChart3,
  Award,
  Sparkles,
  CheckCircle,
  Activity,
  Layers,
  Percent,
  Clock,
  ShieldAlert,
  ArrowUpRight
} from 'lucide-react';

const ReportsManager = () => {
  const [activeTab, setActiveTab] = useState('monthly'); // 'monthly' | 'yearly' | 'executive' | 'treatments' | 'medications'
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);

  // Data states
  const [financialData, setFinancialData] = useState(null);
  const [treatmentData, setTreatmentData] = useState(null);
  const [medicationData, setMedicationData] = useState(null);
  const [statsData, setStatsData] = useState(null);
  const [doctorPerformance, setDoctorPerformance] = useState([]);

  useEffect(() => {
    fetchReports();
  }, [selectedYear]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const [finRes, treatRes, medRes, statsRes, docRes] = await Promise.all([
        getFinancialSummaryApi({ year: selectedYear }).catch(() => ({ data: { data: null } })),
        getTreatmentAnalyticsApi().catch(() => ({ data: { data: null } })),
        getMedicationReportApi().catch(() => ({ data: { data: null } })),
        getDashboardStatsApi().catch(() => ({ data: { data: null } })),
        getDoctorPerformanceReportApi().catch(() => ({ data: { data: [] } }))
      ]);

      setFinancialData(finRes.data?.data || null);
      setTreatmentData(treatRes.data?.data || null);
      setMedicationData(medRes.data?.data || null);
      setStatsData(statsRes.data?.data || null);
      setDoctorPerformance(docRes.data?.data || []);
    } catch (err) {
      console.error('Error fetching reports:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const summary = financialData?.summary || {
    gross_revenue: 0,
    collected_revenue: 0,
    outstanding_revenue: 0,
    total_expenses: 0,
    net_income: 0,
    total_discounts: 0,
    total_refunds: 0,
    total_invoices: 0,
    total_patients: 0,
    yoy_growth: 0
  };

  const monthlyList = financialData?.monthly_breakdown || [];
  const maxMonthVal = Math.max(...monthlyList.map(m => Math.max(m.collected_revenue, m.total_expenses)), 100);

  return (
    <div className="space-y-6">
      
      {/* ── Top Header & Global Actions ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 no-print">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <FileBarChart className="w-7 h-7 text-blue-600" />
            <span>Clinic Financial & Dental Reports</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            Net income analysis, 12-month Jan-Dec revenue, treatment volume, medication expenses, and audit metrics
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          {/* Year Picker */}
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
            <Calendar className="w-4 h-4 text-slate-400" />
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
              className="text-xs font-bold text-slate-800 bg-transparent outline-none cursor-pointer"
            >
              <option value="2026">Financial Year 2026</option>
              <option value="2025">Financial Year 2025</option>
              <option value="2024">Financial Year 2024</option>
            </select>
          </div>

          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/20 transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* ── Printable Report Header ── */}
      <div className="hidden print:block text-center pb-4 border-b-2 border-slate-900 mb-6 space-y-1">
        <h2 className="text-xl font-black uppercase text-slate-900">SNAB DENTAL & DERMATOLOGIC CLINIC</h2>
        <p className="text-xs font-bold text-slate-600 uppercase">Executive Financial & Clinical Analytics Report ({selectedYear})</p>
        <p className="text-[10px] font-mono text-slate-400">Generated on: {new Date().toLocaleString()} • Net Income = Collected Revenue - Total Expenses</p>
      </div>

      {/* ── Executive Net Income Scorecard (Consistent Formula) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        
        {/* Net Income */}
        <div className="p-5 bg-gradient-to-br from-blue-600 to-indigo-800 text-white rounded-3xl shadow-md space-y-1 col-span-2 sm:col-span-1">
          <span className="text-[10px] font-bold text-blue-100 uppercase tracking-wider">NET CLINIC INCOME</span>
          <p className="text-2xl sm:text-3xl font-black font-mono">${summary.net_income.toFixed(2)}</p>
          <span className="text-[10px] text-blue-100 block">
            Collected (${summary.collected_revenue.toFixed(0)}) − Expenses (${summary.total_expenses.toFixed(0)})
          </span>
        </div>

        {/* Collected Revenue */}
        <div className="p-5 bg-white border border-slate-100 rounded-3xl shadow-2xs space-y-1">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Collected Revenue</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-600 font-mono">${summary.collected_revenue.toFixed(2)}</p>
          <span className="text-[10px] text-slate-400">Gross Invoiced: ${summary.gross_revenue.toFixed(2)}</span>
        </div>

        {/* Total Expenses */}
        <div className="p-5 bg-white border border-slate-100 rounded-3xl shadow-2xs space-y-1">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total Expenses</span>
            <TrendingDown className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-2xl font-black text-rose-600 font-mono">${summary.total_expenses.toFixed(2)}</p>
          <span className="text-[10px] text-slate-400">Materials, Labs, Operating</span>
        </div>

        {/* Outstanding Balances */}
        <div className="p-5 bg-white border border-slate-100 rounded-3xl shadow-2xs space-y-1">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Outstanding Balances</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-amber-600 font-mono">${summary.outstanding_revenue.toFixed(2)}</p>
          <span className="text-[10px] text-slate-400">Uncollected Patient Dues</span>
        </div>

      </div>

      {/* ── Multi-Tab Navigation Bar ── */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-100 shadow-2xs space-y-6">
        
        {/* Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-2xl no-print">
          <button
            onClick={() => setActiveTab('monthly')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'monthly' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Monthly Income</span>
          </button>

          <button
            onClick={() => setActiveTab('yearly')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'yearly' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Yearly Jan–Dec Breakdown</span>
          </button>

          <button
            onClick={() => setActiveTab('executive')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'executive' ? 'bg-white text-emerald-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Complete Dental Clinic Summary</span>
          </button>

          <button
            onClick={() => setActiveTab('treatments')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'treatments' ? 'bg-white text-purple-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <HeartPulse className="w-3.5 h-3.5" />
            <span>Dental Treatment Analytics</span>
          </button>

          <button
            onClick={() => setActiveTab('medications')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'medications' ? 'bg-white text-teal-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Pill className="w-3.5 h-3.5" />
            <span>Medicine & Medication Reports</span>
          </button>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* TAB 1: MONTHLY INCOME & COMPARISONS                           */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'monthly' && (
          <div className="space-y-6">
            
            {/* Visual Bar Chart: Revenue vs Expenses */}
            <div className="bg-slate-50/70 p-5 rounded-3xl border border-slate-200 space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-black text-slate-900 text-sm">Monthly Revenue vs Expenses ({selectedYear})</h3>
                  <p className="text-[11px] text-slate-400">Comparison of collections against operational and dental expenses</p>
                </div>
                <div className="flex items-center gap-4 text-xs font-bold">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-md bg-emerald-500"></span>
                    <span className="text-slate-700">Collected Revenue</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-md bg-rose-500"></span>
                    <span className="text-slate-700">Expenses</span>
                  </div>
                </div>
              </div>

              {/* Responsive Bar Grid */}
              <div className="grid grid-cols-12 gap-2 pt-6 items-end h-48 border-b border-slate-200 pb-2">
                {monthlyList.map((m, idx) => {
                  const revHeight = maxMonthVal > 0 ? (m.collected_revenue / maxMonthVal) * 100 : 0;
                  const expHeight = maxMonthVal > 0 ? (m.total_expenses / maxMonthVal) * 100 : 0;

                  return (
                    <div key={idx} className="flex flex-col items-center gap-1 h-full justify-end group">
                      <div className="w-full flex justify-center gap-1 items-end h-36">
                        {/* Revenue Bar */}
                        <div
                          style={{ height: `${Math.max(revHeight, 4)}%` }}
                          className="w-2.5 sm:w-3.5 bg-emerald-500 rounded-t-md transition-all group-hover:bg-emerald-600"
                          title={`${m.month} Revenue: $${m.collected_revenue}`}
                        />
                        {/* Expense Bar */}
                        <div
                          style={{ height: `${Math.max(expHeight, 4)}%` }}
                          className="w-2.5 sm:w-3.5 bg-rose-500 rounded-t-md transition-all group-hover:bg-rose-600"
                          title={`${m.month} Expenses: $${m.total_expenses}`}
                        />
                      </div>
                      <span className="text-[10px] font-bold text-slate-500">{m.month}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Three Breakdown Columns: Payment Methods, Doctors, Expense Areas */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              
              {/* Payment Methods */}
              <div className="p-4 bg-slate-50/70 rounded-3xl border border-slate-200 space-y-3">
                <h4 className="font-black text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-blue-600" />
                  <span>Income by Payment Method</span>
                </h4>
                <div className="space-y-2">
                  {(financialData?.payment_methods || []).map((pm, idx) => (
                    <div key={idx} className="bg-white p-2.5 rounded-2xl border border-slate-100 flex justify-between items-center text-xs">
                      <div>
                        <span className="font-bold text-slate-800 block">{pm.method}</span>
                        <span className="text-[10px] text-slate-400">{pm.percentage}% of collections</span>
                      </div>
                      <span className="font-mono font-bold text-emerald-700">${pm.amount.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Income by Doctor */}
              <div className="p-4 bg-slate-50/70 rounded-3xl border border-slate-200 space-y-3">
                <h4 className="font-black text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2">
                  <Stethoscope className="w-4 h-4 text-purple-600" />
                  <span>Income by Doctor / Provider</span>
                </h4>
                <div className="space-y-2">
                  {(financialData?.doctor_income || []).map((doc, idx) => (
                    <div key={idx} className="bg-white p-2.5 rounded-2xl border border-slate-100 flex justify-between items-center text-xs">
                      <div>
                        <span className="font-bold text-slate-800 block">{doc.doctor}</span>
                        <span className="text-[10px] text-slate-400">{doc.percentage}% of clinic total</span>
                      </div>
                      <span className="font-mono font-bold text-purple-900">${doc.revenue.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Expense Categories */}
              <div className="p-4 bg-slate-50/70 rounded-3xl border border-slate-200 space-y-3">
                <h4 className="font-black text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-rose-600" />
                  <span>Expense Allocations</span>
                </h4>
                <div className="space-y-2">
                  {(financialData?.expense_categories || []).map((ec, idx) => (
                    <div key={idx} className="bg-white p-2.5 rounded-2xl border border-slate-100 flex justify-between items-center text-xs">
                      <div className="min-w-0 flex-1 pr-2">
                        <span className="font-bold text-slate-800 block truncate">{ec.category}</span>
                        <span className="text-[10px] text-slate-400">{ec.percentage}%</span>
                      </div>
                      <span className="font-mono font-bold text-rose-600 shrink-0">${ec.amount.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>

          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 2: YEARLY JAN–DEC BREAKDOWN                               */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'yearly' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-black text-slate-900 text-sm">January through December Annual Income Statement</h3>
                <p className="text-[11px] text-slate-400">12-Month itemized ledger of collections, expenses, and net profit</p>
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Month</th>
                    <th className="py-3 px-4 text-right">Collected Revenue ($)</th>
                    <th className="py-3 px-4 text-right">Total Expenses ($)</th>
                    <th className="py-3 px-4 text-right">Net Profit / Income ($)</th>
                    <th className="py-3 px-4 text-right">Outstanding ($)</th>
                    <th className="py-3 px-4 text-right">Discounts ($)</th>
                    <th className="py-3 px-4 text-center">Invoices</th>
                    <th className="py-3 px-4 text-center">Patients</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {monthlyList.map((m, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80 transition font-mono">
                      <td className="py-3 px-4 font-sans font-bold text-slate-900">{m.month}</td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-700">${m.collected_revenue.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right font-bold text-rose-600">${m.total_expenses.toFixed(2)}</td>
                      <td className={`py-3 px-4 text-right font-black ${m.net_income >= 0 ? 'text-blue-700' : 'text-rose-700'}`}>
                        ${m.net_income.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right text-amber-600">${m.outstanding_balances.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right text-slate-500">${m.discounts.toFixed(2)}</td>
                      <td className="py-3 px-4 text-center text-slate-800">{m.invoices_count}</td>
                      <td className="py-3 px-4 text-center text-slate-800">{m.patients_count}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-900 text-white font-mono font-bold text-xs border-t-2 border-slate-900">
                  <tr>
                    <td className="py-3.5 px-4 font-sans uppercase">Total Annual ({selectedYear})</td>
                    <td className="py-3.5 px-4 text-right text-emerald-400">${summary.collected_revenue.toFixed(2)}</td>
                    <td className="py-3.5 px-4 text-right text-rose-400">${summary.total_expenses.toFixed(2)}</td>
                    <td className="py-3.5 px-4 text-right text-blue-300 text-sm font-black">${summary.net_income.toFixed(2)}</td>
                    <td className="py-3.5 px-4 text-right text-amber-300">${summary.outstanding_revenue.toFixed(2)}</td>
                    <td className="py-3.5 px-4 text-right">${summary.total_discounts.toFixed(2)}</td>
                    <td className="py-3.5 px-4 text-center">{summary.total_invoices}</td>
                    <td className="py-3.5 px-4 text-center">{summary.total_patients}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 3: COMPLETE CLINIC DENTAL SUMMARY                         */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'executive' && (
          <div className="space-y-6">
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              
              {/* Patient Demographics */}
              <div className="p-5 bg-slate-50/70 rounded-3xl border border-slate-200 space-y-3">
                <h4 className="font-black text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  <span>Patient Demographics</span>
                </h4>
                <div className="space-y-2 text-xs font-mono">
                  <div className="flex justify-between bg-white p-2 rounded-xl">
                    <span className="font-sans text-slate-600">Total Registered:</span>
                    <strong className="text-slate-900">{statsData?.patients?.total || summary.total_patients}</strong>
                  </div>
                  <div className="flex justify-between bg-white p-2 rounded-xl">
                    <span className="font-sans text-slate-600">New Registered:</span>
                    <strong className="text-emerald-700">{statsData?.patients?.month || 0}</strong>
                  </div>
                  <div className="flex justify-between bg-white p-2 rounded-xl">
                    <span className="font-sans text-slate-600">Active Patient Queue:</span>
                    <strong className="text-blue-700">{statsData?.visits?.todayCount || 0}</strong>
                  </div>
                </div>
              </div>

              {/* Appointments Flow */}
              <div className="p-5 bg-slate-50/70 rounded-3xl border border-slate-200 space-y-3">
                <h4 className="font-black text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  <span>Appointments Analytics</span>
                </h4>
                <div className="space-y-2 text-xs font-mono">
                  <div className="flex justify-between bg-white p-2 rounded-xl">
                    <span className="font-sans text-slate-600">Total Scheduled:</span>
                    <strong className="text-slate-900">{statsData?.appointments?.todayCount || 0} today</strong>
                  </div>
                  <div className="flex justify-between bg-white p-2 rounded-xl">
                    <span className="font-sans text-slate-600">Upcoming Confirmed:</span>
                    <strong className="text-emerald-700">{statsData?.appointments?.upcomingCount || 0}</strong>
                  </div>
                  <div className="flex justify-between bg-white p-2 rounded-xl">
                    <span className="font-sans text-slate-600">Pending Follow-ups:</span>
                    <strong className="text-amber-600">{statsData?.followups?.pendingCount || 0}</strong>
                  </div>
                </div>
              </div>

              {/* Clinical Procedures */}
              <div className="p-5 bg-slate-50/70 rounded-3xl border border-slate-200 space-y-3">
                <h4 className="font-black text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2">
                  <HeartPulse className="w-4 h-4 text-purple-600" />
                  <span>Treatments & Lab Volume</span>
                </h4>
                <div className="space-y-2 text-xs font-mono">
                  <div className="flex justify-between bg-white p-2 rounded-xl">
                    <span className="font-sans text-slate-600">Completed Treatments:</span>
                    <strong className="text-slate-900">{treatmentData?.total_treatments || 0}</strong>
                  </div>
                  <div className="flex justify-between bg-white p-2 rounded-xl">
                    <span className="font-sans text-slate-600">Consultations Done:</span>
                    <strong className="text-purple-900">{statsData?.consultations?.totalCount || 0}</strong>
                  </div>
                  <div className="flex justify-between bg-white p-2 rounded-xl">
                    <span className="font-sans text-slate-600">Lab Diagnostic Tests:</span>
                    <strong className="text-indigo-700">{statsData?.lab?.completedCount || 0}</strong>
                  </div>
                </div>
              </div>

            </div>

            {/* Doctor Leaderboard Table */}
            <div className="bg-slate-50/70 p-5 rounded-3xl border border-slate-200 space-y-3">
              <h4 className="font-black text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-600" />
                <span>Doctor Performance & Productivity Report</span>
              </h4>
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full text-xs text-left bg-white">
                  <thead className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase">
                    <tr>
                      <th className="py-2.5 px-4">Doctor Name</th>
                      <th className="py-2.5 px-4 text-center">Consultations</th>
                      <th className="py-2.5 px-4 text-center">Treatments</th>
                      <th className="py-2.5 px-4 text-center">Lab Orders</th>
                      <th className="py-2.5 px-4 text-right">Revenue Generated ($)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {doctorPerformance.map((doc, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 font-mono">
                        <td className="py-2.5 px-4 font-sans font-bold text-slate-900">{doc.name}</td>
                        <td className="py-2.5 px-4 text-center text-slate-700">{doc.consultations}</td>
                        <td className="py-2.5 px-4 text-center text-slate-700">{doc.treatments}</td>
                        <td className="py-2.5 px-4 text-center text-slate-700">{doc.labRequests}</td>
                        <td className="py-2.5 px-4 text-right font-black text-emerald-700">${doc.revenue.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 4: DENTAL TREATMENT ANALYTICS                             */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'treatments' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-black text-slate-900 text-sm">Dental Procedure & Treatment Analytics</h3>
                <p className="text-[11px] text-slate-400">Volume and revenue by procedure (RCT, Extraction, Filling, Cleaning, Implants, etc.)</p>
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Dental Procedure</th>
                    <th className="py-3 px-4 text-center">Performed Count</th>
                    <th className="py-3 px-4 text-right">Average Price ($)</th>
                    <th className="py-3 px-4 text-right">Total Revenue ($)</th>
                    <th className="py-3 px-4">Lead Performing Doctor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(treatmentData?.procedure_breakdown || []).map((proc, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4 font-bold text-slate-900 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                        <span>{proc.procedure_name}</span>
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-slate-800">
                        {proc.count}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-600">
                        ${proc.avg_price.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-black text-purple-900 text-sm">
                        ${proc.total_revenue.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-slate-700 font-medium">{proc.top_doctor}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 5: MEDICINE & MEDICATION REPORTS                          */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'medications' && (
          <div className="space-y-4">
            
            {/* Inventory Valuation Header */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-3xl border border-slate-200 font-mono text-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase font-sans">Distinct Drugs</span>
                <p className="text-base font-black text-slate-800">{medicationData?.summary?.total_distinct_medicines || 0}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase font-sans">Total Stock Units</span>
                <p className="text-base font-black text-blue-700">{medicationData?.summary?.total_stock_units || 0}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase font-sans">Inventory Cost Value</span>
                <p className="text-base font-black text-rose-600">${(medicationData?.summary?.total_inventory_cost || 0).toFixed(2)}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase font-sans">Total Selling Value</span>
                <p className="text-base font-black text-emerald-700">${(medicationData?.summary?.total_sales_value || 0).toFixed(2)}</p>
              </div>
            </div>

            {/* Drugs Report Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Medicine Name</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Batch / Expiry</th>
                    <th className="py-3 px-4 text-right">Cost Price ($)</th>
                    <th className="py-3 px-4 text-right">Selling Price ($)</th>
                    <th className="py-3 px-4 text-center">Remaining Stock</th>
                    <th className="py-3 px-4 text-center">Units Sold</th>
                    <th className="py-3 px-4 text-right">Dispensed Revenue ($)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(medicationData?.medications || []).map((med) => (
                    <tr key={med._id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {med.name} <span className="text-[10px] text-slate-400 font-normal">({med.dosage_form})</span>
                      </td>
                      <td className="py-3 px-4 text-slate-600">{med.category}</td>
                      <td className="py-3 px-4 font-mono text-[11px]">
                        <span className="block text-slate-700">{med.batch_number}</span>
                        <span className="text-[10px] text-slate-400">{med.expiry_date ? new Date(med.expiry_date).toLocaleDateString() : 'N/A'}</span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-600">${med.cost_price.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right font-mono text-slate-900 font-bold">${med.unit_price.toFixed(2)}</td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-purple-900">{med.current_stock}</td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-emerald-700">{med.quantity_dispensed}</td>
                      <td className="py-3 px-4 text-right font-mono font-black text-emerald-800 text-sm">
                        ${med.total_dispensed_revenue.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>
        )}

      </div>

    </div>
  );
};

export default ReportsManager;
