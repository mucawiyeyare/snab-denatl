import React, { useState, useEffect } from 'react';
import { getDailyIncomeApi } from '../../api/endpoints.js';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import {
  DollarSign,
  Calendar,
  Search,
  Printer,
  Download,
  CreditCard,
  Smartphone,
  Building,
  Receipt,
  Users,
  CheckCircle,
  Clock,
  ArrowRight,
  TrendingUp,
  Percent,
  RefreshCw,
  FileText
} from 'lucide-react';

const DailyIncome = () => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState('');

  useEffect(() => {
    fetchDailyIncome();
  }, [selectedDate]);

  const fetchDailyIncome = async () => {
    setLoading(true);
    try {
      const res = await getDailyIncomeApi({ date: selectedDate });
      setData(res.data?.data || null);
    } catch (err) {
      console.error('Error fetching daily income:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (!data?.transactions || data.transactions.length === 0) {
      alert('No transaction records to export for this date.');
      return;
    }

    const headers = ['Receipt #', 'Date/Time', 'Patient Name', 'Patient #', 'Phone', 'Invoice #', 'Service/Category', 'Doctor', 'Payment Method', 'Gross Amount', 'Discount', 'Paid Amount', 'Status', 'Cashier'];
    const rows = data.transactions.map(t => [
      t.receipt_number,
      new Date(t.payment_date).toLocaleString(),
      `"${t.patient_name}"`,
      t.patient_number,
      t.patient_phone,
      t.invoice_number,
      `"${t.service_names}"`,
      `"${t.doctor_name}"`,
      t.payment_method,
      t.gross_amount,
      t.discount,
      t.final_paid_amount,
      t.payment_status,
      `"${t.cashier_name}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `SNAB_Daily_Income_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const transactions = (data?.transactions || []).filter(t => {
    const q = search.toLowerCase();
    const matchSearch =
      t.patient_name?.toLowerCase().includes(q) ||
      t.patient_number?.toLowerCase().includes(q) ||
      t.invoice_number?.toLowerCase().includes(q) ||
      t.receipt_number?.toLowerCase().includes(q) ||
      t.doctor_name?.toLowerCase().includes(q) ||
      t.service_names?.toLowerCase().includes(q);

    const matchMethod = methodFilter ? t.payment_method?.toLowerCase() === methodFilter.toLowerCase() : true;
    return matchSearch && matchMethod;
  });

  const summary = data?.summary || {
    total_income: 0,
    cash_income: 0,
    card_income: 0,
    mobile_income: 0,
    bank_income: 0,
    other_income: 0,
    transactions_count: 0,
    paid_invoices_count: 0,
    outstanding_today: 0,
    discounts_given: 0,
    refunds: 0
  };

  return (
    <div className="space-y-6">
      
      {/* Header & Date Selector */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 no-print">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-emerald-600" />
            <span>Daily Income & Settlement</span>
          </h1>
          <p className="text-xs text-slate-500">
            Real-time daily POS collections, payment breakdown, discounts, and audit ledger
          </p>
        </div>

        {/* Date Filter & Export Controls */}
        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
            <Calendar className="w-4 h-4 text-slate-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-xs font-bold text-slate-800 bg-transparent outline-none cursor-pointer"
            />
          </div>

          <button
            onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
          >
            Today
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs rounded-xl border border-emerald-200 transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Printable Clinic Banner */}
      <div className="hidden print:block text-center pb-4 border-b-2 border-slate-900 mb-6 space-y-1">
        <h2 className="text-xl font-black uppercase text-slate-900">SNAB DENTAL & DERMATOLOGIC CLINIC</h2>
        <p className="text-xs font-bold text-slate-600 uppercase">Daily Income & Financial Settlement Report</p>
        <p className="text-[11px] font-mono text-slate-500">Date: {data?.formatted_date || selectedDate} • Printed on: {new Date().toLocaleString()}</p>
      </div>

      {/* Primary KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        
        {/* Total Day's Income */}
        <div className="p-4 sm:p-5 bg-gradient-to-br from-emerald-500 to-teal-700 text-white rounded-3xl shadow-md space-y-1 col-span-2 sm:col-span-1">
          <span className="text-[10px] font-bold text-emerald-100 uppercase tracking-wider">Total Day's Income</span>
          <p className="text-2xl sm:text-3xl font-black font-mono">${summary.total_income.toFixed(2)}</p>
          <span className="text-[10px] text-emerald-100 block">
            {summary.transactions_count} payment receipts settled
          </span>
        </div>

        {/* Cash Payments */}
        <div className="p-4 sm:p-5 bg-white border border-slate-100 rounded-3xl shadow-2xs space-y-1">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Cash Payments</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-slate-900 font-mono">${summary.cash_income.toFixed(2)}</p>
          <span className="text-[10px] text-slate-400">
            {summary.total_income > 0 ? ((summary.cash_income / summary.total_income) * 100).toFixed(0) : 0}% of day's intake
          </span>
        </div>

        {/* Card Payments */}
        <div className="p-4 sm:p-5 bg-white border border-slate-100 rounded-3xl shadow-2xs space-y-1">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Card Payments</span>
            <CreditCard className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-slate-900 font-mono">${summary.card_income.toFixed(2)}</p>
          <span className="text-[10px] text-slate-400">Debit & Credit Cards</span>
        </div>

        {/* Mobile & Bank Transfer */}
        <div className="p-4 sm:p-5 bg-white border border-slate-100 rounded-3xl shadow-2xs space-y-1">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Mobile & Bank</span>
            <Smartphone className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
            ${(summary.mobile_income + summary.bank_income + summary.other_income).toFixed(2)}
          </p>
          <span className="text-[10px] text-slate-400">EVC Plus / Zaad / Transfer</span>
        </div>

      </div>

      {/* Secondary Metrics Bar: Discounts, Outstanding, Paid Invoices */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-3xl border border-slate-200">
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase">Paid Invoices</span>
          <p className="text-base font-black text-slate-800 font-mono">{summary.paid_invoices_count}</p>
        </div>
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase">Outstanding Generated</span>
          <p className="text-base font-black text-rose-600 font-mono">${summary.outstanding_today.toFixed(2)}</p>
        </div>
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase">Discounts Approved</span>
          <p className="text-base font-black text-amber-600 font-mono">${summary.discounts_given.toFixed(2)}</p>
        </div>
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase">Refunds</span>
          <p className="text-base font-black text-slate-500 font-mono">${summary.refunds.toFixed(2)}</p>
        </div>
      </div>

      {/* Main Transactions Ledger Card */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-100 shadow-2xs space-y-4">
        
        {/* Table Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 no-print">
          <div className="flex items-center gap-2">
            <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
              <Receipt className="w-4 h-4 text-emerald-600" />
              <span>Daily Transaction Ledger ({transactions.length})</span>
            </h3>
            <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">• {data?.formatted_date}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {/* Method Filter */}
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 cursor-pointer"
            >
              <option value="">All Methods</option>
              <option value="Cash">💵 Cash</option>
              <option value="EVC Plus">📱 EVC Plus</option>
              <option value="eDahab">📱 eDahab</option>
              <option value="Card">💳 Card</option>
              <option value="Bank Transfer">🏦 Bank Transfer</option>
            </select>

            {/* Search Input */}
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search patient, receipt, doctor..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Responsive Table / Cards View */}
        {loading ? (
          <div className="text-center py-12">
            <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs text-slate-400">Loading daily transactions...</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200 p-6">
            <Receipt className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-700">No transactions recorded on {selectedDate}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Select another date or complete a patient checkout.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Receipt #</th>
                    <th className="py-3 px-4">Time</th>
                    <th className="py-3 px-4">Patient</th>
                    <th className="py-3 px-4">Doctor</th>
                    <th className="py-3 px-4">Service Description</th>
                    <th className="py-3 px-4">Method</th>
                    <th className="py-3 px-4 text-right">Gross ($)</th>
                    <th className="py-3 px-4 text-right">Disc ($)</th>
                    <th className="py-3 px-4 text-right">Paid Amount ($)</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {transactions.map((tx) => (
                    <tr key={tx.payment_id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 font-mono font-bold text-purple-900">{tx.receipt_number}</td>
                      <td className="py-3 px-4 text-slate-500 font-mono">{new Date(tx.payment_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 block">{tx.patient_name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{tx.patient_number}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-700 font-medium">{tx.doctor_name}</td>
                      <td className="py-3 px-4 text-slate-600 max-w-[200px] truncate" title={tx.service_names}>
                        {tx.service_names}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-700">
                        <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-800 text-[10px] font-bold">
                          {tx.payment_method}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-500">${tx.gross_amount.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right font-mono text-amber-600">
                        {tx.discount > 0 ? `-$${tx.discount.toFixed(2)}` : '—'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-black text-emerald-700 text-sm">
                        ${tx.final_paid_amount.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <StatusBadge status={tx.payment_status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Tablet & Mobile Stacked Cards View */}
            <div className="lg:hidden grid grid-cols-1 sm:grid-cols-2 gap-3">
              {transactions.map((tx) => (
                <div key={tx.payment_id} className="p-4 bg-slate-50/70 border border-slate-200 rounded-2xl space-y-2.5">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-mono font-black text-purple-900 text-xs">{tx.receipt_number}</span>
                      <h4 className="font-bold text-slate-900 text-sm">{tx.patient_name}</h4>
                      <p className="text-[10px] text-slate-400">{tx.patient_number} • {tx.doctor_name}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-black text-emerald-600 font-mono block">
                        ${tx.final_paid_amount.toFixed(2)}
                      </span>
                      <StatusBadge status={tx.payment_status} />
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-600 bg-white p-2 rounded-xl border border-slate-100">
                    <span className="font-bold text-slate-400 block text-[9px] uppercase">Service</span>
                    <span className="line-clamp-1">{tx.service_names}</span>
                  </div>

                  <div className="flex justify-between items-center text-[10px] pt-1 text-slate-400 border-t border-slate-200/60">
                    <span>Method: <strong className="text-slate-700">{tx.payment_method}</strong></span>
                    <span>{new Date(tx.payment_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

      </div>

    </div>
  );
};

export default DailyIncome;
