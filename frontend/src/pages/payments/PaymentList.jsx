import React, { useState, useEffect } from 'react';
import { getPaymentsApi, getDailyCashierSummaryApi } from '../../api/endpoints.js';
import ReceiptModal from '../../components/ui/ReceiptModal.jsx';
import {
  Receipt,
  Search,
  Printer,
  DollarSign,
  Calendar,
  FileText,
  CreditCard,
  Smartphone,
  Building,
  CheckCircle,
  Clock,
  ArrowUpRight,
  TrendingDown
} from 'lucide-react';

const PaymentList = () => {
  const [payments, setPayments] = useState([]);
  const [cashSummary, setCashSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  useEffect(() => {
    fetchPaymentsData();
  }, []);

  const fetchPaymentsData = async () => {
    setLoading(true);
    try {
      const [payRes, summaryRes] = await Promise.all([
        getPaymentsApi(),
        getDailyCashierSummaryApi().catch(() => ({ data: { data: null } }))
      ]);
      setPayments(payRes.data?.data || []);
      setCashSummary(summaryRes.data?.data);
    } catch (err) {
      console.error('Error fetching payments:', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = payments.filter(p => {
    const q = search.toLowerCase();
    const matchSearch =
      p.receipt_number?.toLowerCase().includes(q) ||
      p.patient_id?.name?.toLowerCase().includes(q) ||
      p.patient_id?.patient_number?.toLowerCase().includes(q) ||
      p.doctor_id?.full_name?.toLowerCase().includes(q) ||
      p.payment_method?.toLowerCase().includes(q);

    const matchMethod = methodFilter ? p.payment_method?.toLowerCase() === methodFilter.toLowerCase() : true;
    return matchSearch && matchMethod;
  });

  const handleOpenReceipt = (payment) => {
    setSelectedPayment(payment);
    setIsReceiptModalOpen(true);
  };

  // Payment Method Badge helper
  const renderMethodBadge = (method) => {
    const m = (method || 'Cash').toLowerCase();
    if (m.includes('evc')) {
      return (
        <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
          📱 EVC Plus
        </span>
      );
    }
    if (m.includes('edahab') || m.includes('dahab')) {
      return (
        <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-200">
          📱 eDahab
        </span>
      );
    }
    if (m.includes('card')) {
      return (
        <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-blue-100 text-blue-800 border border-blue-200">
          💳 Card
        </span>
      );
    }
    if (m.includes('bank')) {
      return (
        <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-purple-100 text-purple-800 border border-purple-200">
          🏦 Bank Transfer
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-slate-100 text-slate-800 border border-slate-200">
        💵 Cash
      </span>
    );
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 no-print">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Receipt className="w-6 h-6 text-emerald-600" />
            <span>Cashier & Payment Receipts</span>
          </h1>
          <p className="text-xs text-slate-500">Official patient receipts, daily collections, and POS transaction log</p>
        </div>

        <button
          onClick={() => window.print()}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          <span>Print Receipts Log</span>
        </button>
      </div>

      {/* ── 3 Essential Daily KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        {/* TODAY BILLED */}
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-2xs space-y-1.5">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            TODAY BILLED
          </span>
          <p className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">
            ${Number(cashSummary?.todayBilled || 0).toFixed(2)}
          </p>
          <span className="text-xs text-slate-500 font-medium block">
            Total Invoiced Today
          </span>
        </div>

        {/* TODAY COLLECTED */}
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-2xs space-y-1.5">
          <div className="flex justify-between items-center">
            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">
              TODAY COLLECTED
            </span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase">
              Settled
            </span>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-emerald-600 font-mono">
            ${Number(cashSummary?.todayCollected || cashSummary?.totalCollected || 0).toFixed(2)}
          </p>
          <span className="text-xs text-emerald-600 font-bold block">
            {cashSummary?.transactionCount || 0} receipts settled today
          </span>
        </div>

        {/* TODAY PENDING */}
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-2xs space-y-1.5">
          <div className="flex justify-between items-center">
            <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">
              TODAY PENDING
            </span>
            <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-black uppercase">
              Balance
            </span>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-rose-600 font-mono">
            ${Number(cashSummary?.todayPending || 0).toFixed(2)}
          </p>
          <span className="text-xs text-rose-600 font-bold block">
            Uncollected balance today
          </span>
        </div>

      </div>

      {/* ── Search & Payment Method Filter Bar ── */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-100 shadow-2xs space-y-4">
        
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 no-print">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Receipt No (e.g. REC-2026-0001), Patient, or Doctor..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
            />
          </div>

          {/* Payment Method Filter */}
          <div className="w-full sm:w-56">
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 focus:bg-white focus:outline-none cursor-pointer"
            >
              <option value="">All Payment Methods</option>
              <option value="Cash">💵 Cash</option>
              <option value="EVC Plus">📱 EVC Plus</option>
              <option value="eDahab">📱 eDahab</option>
              <option value="Card">💳 Card</option>
              <option value="Bank Transfer">🏦 Bank Transfer</option>
            </select>
          </div>
        </div>

        {/* ── Receipts Table / Cards ── */}
        {loading ? (
          <div className="text-center py-16">
            <div className="w-7 h-7 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-2.5" />
            <p className="text-xs text-slate-400 font-medium">Loading receipts...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 bg-slate-50 rounded-2xl border border-dashed border-slate-200 p-6">
            <Receipt className="w-9 h-9 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-700">No payment receipts found</p>
            <p className="text-xs text-slate-400 mt-0.5">Try searching with a different term or complete a checkout.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden lg:block dental-table-container">
              <table className="dental-table">
                <thead>
                  <tr>
                    <th className="py-3 px-4">RECEIPT #</th>
                    <th className="py-3 px-4">DATE & TIME</th>
                    <th className="py-3 px-4">PATIENT</th>
                    <th className="py-3 px-4">DOCTOR</th>
                    <th className="py-3 px-4">CATEGORY</th>
                    <th className="py-3 px-4">METHOD</th>
                    <th className="py-3 px-4 text-right">AMOUNT ($)</th>
                    <th className="py-3 px-4">CASHIER</th>
                    <th className="py-3 px-4 text-right">RECEIPT</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => (
                    <tr key={p._id} className="hover:bg-slate-50/80 transition group">
                      <td className="py-3.5 px-4 font-mono font-bold text-blue-600 hover:underline cursor-pointer" onClick={() => handleOpenReceipt(p)}>
                        {p.receipt_number}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-mono text-[11px]">
                        {new Date(p.payment_date).toLocaleDateString()}, {new Date(p.payment_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-900 block">{p.patient_id?.name || 'Walk-in'}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{p.patient_id?.telephone || p.patient_id?.patient_number}</span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-800 font-bold">
                        {p.doctor_id?.full_name ? `Dr. ${p.doctor_id.full_name}` : 'Dr. System Administrator'}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-medium">
                        {p.payment_category}
                      </td>
                      <td className="py-3.5 px-4">
                        {renderMethodBadge(p.payment_method)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-black text-emerald-600 text-sm">
                        ${Number(p.amount || 0).toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 font-medium text-[11px]">
                        {p.received_by_name || p.received_by?.full_name || p.received_by?.username || 'Cashier'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleOpenReceipt(p)}
                          className="px-3 py-1.5 bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-600 font-bold rounded-xl text-xs transition cursor-pointer flex items-center gap-1.5 ml-auto"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Print</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile & Tablet Stacked Cards View */}
            <div className="lg:hidden grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {filtered.map((p) => (
                <div key={p._id} className="p-4 bg-slate-50/70 border border-slate-200/80 rounded-2xl space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-mono font-black text-blue-600 text-xs">{p.receipt_number}</span>
                      <h4 className="font-bold text-slate-900 text-sm">{p.patient_id?.name || 'Walk-in'}</h4>
                      <p className="text-[10px] text-slate-400 font-mono">{p.patient_id?.telephone}</p>
                    </div>
                    <span className="text-sm font-black text-emerald-600 font-mono">
                      ${Number(p.amount || 0).toFixed(2)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600">{p.payment_category}</span>
                    {renderMethodBadge(p.payment_method)}
                  </div>

                  <div className="flex justify-between items-center text-[10px] text-slate-500 pt-2 border-t border-slate-200/60">
                    <span>{new Date(p.payment_date).toLocaleDateString()}, {new Date(p.payment_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <button
                      onClick={() => handleOpenReceipt(p)}
                      className="px-2.5 py-1 bg-blue-600 text-white font-bold rounded-lg text-[11px]"
                    >
                      Print Receipt
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

      </div>

      {/* Official Receipt Modal */}
      <ReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        payment={selectedPayment}
      />

    </div>
  );
};

export default PaymentList;
