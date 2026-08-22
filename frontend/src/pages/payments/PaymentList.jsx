import React, { useState, useEffect } from 'react';
import { getPaymentsApi, getDailyCashierSummaryApi } from '../../api/endpoints.js';
import ReceiptModal from '../../components/ui/ReceiptModal.jsx';
import { Receipt, Search, Printer, DollarSign, Calendar, FileText } from 'lucide-react';

const PaymentList = () => {
  const [payments, setPayments] = useState([]);
  const [cashSummary, setCashSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
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

  const filtered = payments.filter(p =>
    p.receipt_number?.toLowerCase().includes(search.toLowerCase()) ||
    p.patient_id?.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.payment_method?.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenReceipt = (payment) => {
    setSelectedPayment(payment);
    setIsReceiptModalOpen(true);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Payment Receipts & Cashier Log</h1>
          <p className="text-xs text-slate-500">Official receipts, daily cash breakdown, and completed transactions</p>
        </div>
      </div>

      {/* Daily Summary Cards */}
      {cashSummary && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase">Today's Collections</span>
            <p className="text-2xl font-black text-emerald-600">${cashSummary.totalCollected.toFixed(2)}</p>
            <span className="text-xs text-slate-500 font-medium">{cashSummary.transactionCount} transactions</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase">Cash Collected</span>
            <p className="text-2xl font-black text-slate-900">${(cashSummary.byMethod?.Cash || 0).toFixed(2)}</p>
            <span className="text-xs text-slate-400">Cash in drawer</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase">Mobile Payments</span>
            <p className="text-2xl font-black text-blue-600">${(cashSummary.byMethod?.['Mobile Payment'] || 0).toFixed(2)}</p>
            <span className="text-xs text-slate-400">EVC Plus / Zaad / Sahal</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase">Card / Bank</span>
            <p className="text-2xl font-black text-purple-600">
              ${((cashSummary.byMethod?.Card || 0) + (cashSummary.byMethod?.['Bank Transfer'] || 0)).toFixed(2)}
            </p>
            <span className="text-xs text-slate-400">POS Cards / Transfers</span>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by Receipt No (e.g. REC-2026-0001), Patient, or Payment Method..."
          className="w-full text-xs font-medium focus:outline-hidden"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400 text-xs">No payment transactions found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider">
                  <th className="py-3.5 px-5">Receipt #</th>
                  <th className="py-3.5 px-4">Date & Time</th>
                  <th className="py-3.5 px-4">Patient</th>
                  <th className="py-3.5 px-4">Doctor</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Method</th>
                  <th className="py-3.5 px-4 text-right">Amount</th>
                  <th className="py-3.5 px-4">Cashier</th>
                  <th className="py-3.5 px-5 text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filtered.map(p => {
                  const doc = p.doctor_id || p.visit_id?.doctor_id || p.invoice_id?.doctor_id;
                  const docName = doc?.full_name || doc?.username;
                  return (
                  <tr key={p._id} className="hover:bg-slate-50/80 transition">
                    <td className="py-4 px-5 font-mono font-bold text-blue-600">
                      {p.receipt_number}
                    </td>
                    <td className="py-4 px-4 text-slate-500">
                      {new Date(p.payment_date).toLocaleString()}
                    </td>
                    <td className="py-4 px-4">
                      <span className="font-bold text-slate-900 block">{p.patient_id?.name || 'Walk-in'}</span>
                      <span className="text-[11px] text-slate-400">{p.patient_id?.telephone}</span>
                    </td>
                    <td className="py-4 px-4 text-slate-700">
                      <span className="font-semibold text-slate-900 block">{docName ? `Dr. ${docName}` : '—'}</span>
                    </td>
                    <td className="py-4 px-4 font-semibold text-slate-700">
                      {p.payment_category}
                    </td>
                    <td className="py-4 px-4">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                        {p.payment_method}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right font-mono font-black text-emerald-600">
                      ${Number(p.amount).toFixed(2)}
                    </td>
                    <td className="py-4 px-4 text-slate-700">
                      {p.received_by_name || p.received_by?.full_name || 'Cashier'}
                    </td>
                    <td className="py-4 px-5 text-right">
                      <button
                        onClick={() => handleViewReceipt(p)}
                        className="px-3 py-1.5 bg-blue-50 hover:bg-blue-600 hover:text-white font-bold text-blue-600 rounded-xl transition text-xs flex items-center gap-1.5 ml-auto cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        Print
                      </button>
                    </td>
                  </tr>
                );})}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Receipt Modal */}
      <ReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        payment={selectedPayment}
      />

    </div>
  );
};

export default PaymentList;
