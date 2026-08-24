import React, { useState, useEffect } from 'react';
import {
  getInvoicesApi,
  applyDiscountApi,
  recordPaymentApi,
  updateInvoiceApi,
  deleteInvoiceApi
} from '../../api/endpoints.js';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import Modal from '../../components/ui/Modal.jsx';
import ReceiptModal from '../../components/ui/ReceiptModal.jsx';
import ConsultationTokenModal from '../../components/ui/ConsultationTokenModal.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  CreditCard,
  Search,
  DollarSign,
  Percent,
  Receipt,
  FileText,
  CheckCircle,
  CheckCircle2,
  Printer,
  Ticket,
  Lock,
  AlertTriangle,
  AlertCircle,
  ShieldCheck,
  Edit3,
  Trash2,
  Plus,
  Download,
  Calendar,
  Eye,
  User,
  Stethoscope,
  RefreshCw,
  Clock
} from 'lucide-react';

const BillingManager = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';
  const isCashier = user?.role === 'Receptionist/Cashier' || isAdmin;

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  // Date filtering state — DEFAULT: 'today' so Cashier is never confused!
  const [dateFilter, setDateFilter] = useState('today'); // 'today' | 'all' | 'custom'
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // Selected invoice & Modals
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [isInvoiceDetailOpen, setIsInvoiceDetailOpen] = useState(false);
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isTokenModalOpen, setIsTokenModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [currentPayment, setCurrentPayment] = useState(null);

  // Edit Invoice Form State
  const [editItems, setEditItems] = useState([]);
  const [editDiscount, setEditDiscount] = useState(0);

  const [discountAmount, setDiscountAmount] = useState(0);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchInvoices();
  }, [statusFilter, dateFilter, selectedDate]);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      
      if (dateFilter === 'today') {
        params.date = new Date().toISOString().split('T')[0];
      } else if (dateFilter === 'custom' && selectedDate) {
        params.date = selectedDate;
      }
      // if 'all', no date param is passed -> returns all invoices

      const res = await getInvoicesApi(params);
      setInvoices(res.data?.data || []);
    } catch (err) {
      console.error('Error fetching invoices:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredInvoices = invoices.filter(inv => {
    const q = search.toLowerCase().trim();
    return (
      inv.invoice_number?.toLowerCase().includes(q) ||
      inv.patient_id?.name?.toLowerCase().includes(q) ||
      inv.patient_id?.patient_number?.toLowerCase().includes(q) ||
      inv.patient_id?.telephone?.toLowerCase().includes(q) ||
      inv.doctor_id?.full_name?.toLowerCase().includes(q) ||
      inv.doctor_id?.username?.toLowerCase().includes(q)
    );
  });

  // Financial Totals for active view (Today by default)
  const totalInvoiced = filteredInvoices.reduce((sum, inv) => sum + (Number(inv.total_amount) || 0), 0);
  const totalCollected = filteredInvoices.reduce((sum, inv) => sum + (Number(inv.paid_amount) || 0), 0);
  const totalOutstanding = filteredInvoices.reduce((sum, inv) => sum + (Number(inv.balance) || 0), 0);

  const [cashierDiscount, setCashierDiscount] = useState(0);

  // Financial calculations for selected invoice in Cashier POS Modal
  const invoiceItems = selectedInvoice?.items || [];
  const totalPatientCost = Number(selectedInvoice?.subtotal || selectedInvoice?.total_amount || 0);
  const previouslyPaid = Number(selectedInvoice?.paid_amount || 0);
  const approvedDiscount = Number(selectedInvoice?.discount || 0);
  
  const baseOutstanding = Math.max(0, totalPatientCost - previouslyPaid - approvedDiscount);
  const currentCashierDiscount = Math.max(0, Number(cashierDiscount) || 0);
  const cashierDiscountExceeded = currentCashierDiscount > baseOutstanding + 0.001;
  const effectiveOutstanding = Math.max(0, baseOutstanding - currentCashierDiscount);
  const maxPaymentAllowed = effectiveOutstanding;

  const payingNow = Number(paymentAmount) || 0;
  const paymentExceeded = payingNow > maxPaymentAllowed + 0.001;
  const isZeroPayment = payingNow <= 0 && effectiveOutstanding > 0;
  const remainingBalance = Math.max(0, effectiveOutstanding - payingNow);

  const handleOpenPayment = (inv) => {
    setSelectedInvoice(inv);
    const invBalance = inv.balance !== undefined ? inv.balance : Math.max(0, (inv.total_amount || 0) - (inv.paid_amount || 0));
    setPaymentAmount(invBalance > 0 ? invBalance : 0);
    setCashierDiscount(0);
    setIsPaymentModalOpen(true);
  };

  const handleOpenInvoiceDetail = (inv) => {
    setSelectedInvoice(inv);
    setIsInvoiceDetailOpen(true);
  };

  const handleOpenDiscount = (inv) => {
    setSelectedInvoice(inv);
    setDiscountAmount(inv.discount || 0);
    setIsDiscountModalOpen(true);
  };

  const handleOpenToken = (inv) => {
    setSelectedInvoice(inv);
    setIsTokenModalOpen(true);
  };

  const handleOpenEdit = (inv) => {
    setSelectedInvoice(inv);
    setEditItems((inv.items || []).map(it => ({
      ...it,
      item_type: it.item_type || 'Treatment',
      description: it.description || '',
      quantity: it.quantity || 1,
      unit_price: it.unit_price || 0,
      total_price: it.total_price || (it.quantity * it.unit_price) || 0
    })));
    setEditDiscount(inv.discount || 0);
    setIsEditModalOpen(true);
  };

  const handleProcessPayment = async (e) => {
    e.preventDefault();
    if (paymentExceeded) {
      alert(`Payment amount cannot exceed the patient's outstanding balance of $${maxPaymentAllowed.toFixed(2)}.`);
      return;
    }
    if (cashierDiscountExceeded) {
      alert(`Cashier discount cannot exceed the outstanding balance of $${baseOutstanding.toFixed(2)}.`);
      return;
    }
    if (isZeroPayment) {
      alert('Payment amount must be greater than $0.00.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await recordPaymentApi({
        invoice_id: selectedInvoice._id,
        amount: Number(payingNow),
        payment_method: paymentMethod,
        discount: currentCashierDiscount > 0 ? currentCashierDiscount : undefined,
        notes: currentCashierDiscount > 0 ? `Settled with $${currentCashierDiscount} discount` : ''
      });

      setIsPaymentModalOpen(false);
      fetchInvoices();
      if (res.data?.data?.payment) {
        setCurrentPayment(res.data.data.payment);
        setIsReceiptModalOpen(true);
      }
    } catch (err) {
      console.error('Error recording payment:', err);
      alert(err.response?.data?.message || 'Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveEditInvoice = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const subtotal = editItems.reduce((sum, it) => sum + (Number(it.total_price) || 0), 0);
      const discount = Number(editDiscount) || 0;
      const total_amount = Math.max(0, subtotal - discount);

      await updateInvoiceApi(selectedInvoice._id, {
        items: editItems,
        discount,
        subtotal,
        total_amount
      });

      setIsEditModalOpen(false);
      fetchInvoices();
    } catch (err) {
      console.error('Error updating invoice:', err);
      alert(err.response?.data?.message || 'Failed to update invoice');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteInvoice = async (id) => {
    try {
      await deleteInvoiceApi(id);
      setDeleteConfirmId(null);
      fetchInvoices();
    } catch (err) {
      console.error('Error deleting invoice:', err);
      alert(err.response?.data?.message || 'Failed to delete invoice');
    }
  };

  const handleExportCSV = () => {
    if (invoices.length === 0) {
      alert('No invoice records to export.');
      return;
    }

    const headers = ['Invoice #', 'Date', 'Patient Name', 'Patient #', 'Phone', 'Doctor', 'Subtotal ($)', 'Discount ($)', 'Total ($)', 'Paid ($)', 'Balance ($)', 'Status'];
    const rows = invoices.map(inv => [
      inv.invoice_number,
      new Date(inv.createdAt).toLocaleDateString(),
      `"${inv.patient_id?.name || 'Patient'}"`,
      inv.patient_id?.patient_number || '',
      inv.patient_id?.telephone || '',
      `"${inv.doctor_id?.full_name ? 'Dr. ' + inv.doctor_id.full_name : 'Doctor'}"`,
      inv.subtotal || inv.total_amount,
      inv.discount || 0,
      inv.total_amount || 0,
      inv.paid_amount || 0,
      inv.balance || 0,
      inv.status || 'Pending'
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `SNAB_Invoices_${dateFilter === 'today' ? 'Today' : selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      
      {/* ── Page Header & Action Controls ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 no-print">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Billing & Consolidated Invoices
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            Manage patient accounts, POS payments, discounts, and itemized billing ledger
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          {/* Time Scope Toggle (Today is Default) */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-2xl border border-slate-200/80">
            <button
              onClick={() => setDateFilter('today')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                dateFilter === 'today' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Today</span>
            </button>

            <button
              onClick={() => setDateFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                dateFilter === 'all' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>All History</span>
            </button>

            <button
              onClick={() => setDateFilter('custom')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                dateFilter === 'custom' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Pick Date</span>
            </button>
          </div>

          {dateFilter === 'custom' && (
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
              <Calendar className="w-4 h-4 text-slate-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="text-xs font-bold text-slate-800 bg-transparent outline-none cursor-pointer"
              />
            </div>
          )}

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs rounded-xl border border-emerald-200 transition cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>

          <button
            onClick={() => window.print()}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/20 transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print Invoices</span>
          </button>
        </div>
      </div>

      {/* ── 3 Summary KPI Cards — TODAY'S DATA DEFAULT ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        {/* TOTAL INVOICED: TODAY */}
        <div className="p-5 sm:p-6 bg-white border border-slate-100 rounded-3xl shadow-2xs space-y-1.5">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            {dateFilter === 'today' ? 'TOTAL INVOICED: TODAY' : dateFilter === 'custom' ? `TOTAL INVOICED (${selectedDate})` : 'TOTAL INVOICED (ALL TIME)'}
          </span>
          <p className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">
            ${totalInvoiced.toFixed(2)}
          </p>
          <span className="text-xs text-slate-400 font-medium block">
            {filteredInvoices.length} {dateFilter === 'today' ? 'invoices generated today' : 'invoices in view'}
          </span>
        </div>

        {/* TOTAL COLLECTED: TODAY */}
        <div className="p-5 sm:p-6 bg-white border border-slate-100 rounded-3xl shadow-2xs space-y-1.5">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            {dateFilter === 'today' ? 'TOTAL COLLECTED: TODAY' : dateFilter === 'custom' ? `TOTAL COLLECTED (${selectedDate})` : 'TOTAL COLLECTED (ALL TIME)'}
          </span>
          <p className="text-2xl sm:text-3xl font-black text-emerald-600 font-mono">
            ${totalCollected.toFixed(2)}
          </p>
          <span className="text-xs text-emerald-600 font-bold block">
            {dateFilter === 'today' ? 'Settled at Cashier Today' : 'Settled at Cashier'}
          </span>
        </div>

        {/* OUTSTANDING BALANCES: TODAY */}
        <div className="p-5 sm:p-6 bg-white border border-slate-100 rounded-3xl shadow-2xs space-y-1.5">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            {dateFilter === 'today' ? 'OUTSTANDING BALANCES: TODAY' : dateFilter === 'custom' ? `OUTSTANDING BALANCES (${selectedDate})` : 'OUTSTANDING BALANCES (ALL TIME)'}
          </span>
          <p className="text-2xl sm:text-3xl font-black text-rose-600 font-mono">
            ${totalOutstanding.toFixed(2)}
          </p>
          <span className="text-xs text-rose-600 font-bold block">
            {dateFilter === 'today' ? 'Pending Payment Today' : 'Pending Payment'}
          </span>
        </div>

      </div>

      {/* ── Filter & Invoices Data Container ── */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-100 shadow-2xs space-y-4">
        
        {/* Search Input & Status Dropdown Filter */}
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 no-print">
          
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by Patient Name, Invoice No (INV-...), or Telephone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
          </div>

          {/* Status Dropdown */}
          <div className="w-full sm:w-56">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 focus:bg-white focus:outline-none cursor-pointer"
            >
              <option value="">All Invoices</option>
              <option value="Paid">Paid</option>
              <option value="Partially Paid">Partially Paid</option>
              <option value="Unpaid">Unpaid / Pending</option>
              <option value="Overdue">Overdue</option>
            </select>
          </div>

        </div>

        {/* ── Invoices Content (Desktop Table + Mobile/Tablet Cards) ── */}
        {loading ? (
          <div className="text-center py-16">
            <div className="w-7 h-7 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2.5" />
            <p className="text-xs text-slate-400 font-medium">Loading invoices...</p>
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="text-center py-16 bg-slate-50 rounded-2xl border border-dashed border-slate-200 p-6">
            <CreditCard className="w-9 h-9 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-700">
              {dateFilter === 'today' ? "No invoices recorded for Today yet" : "No invoices found for selected filter"}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              {dateFilter === 'today' ? 'Click "All History" to view past bills or complete a patient visit checkout.' : 'Try changing your search keyword or status filter.'}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table View — Pixel Perfect matching reference */}
            <div className="hidden lg:block overflow-x-auto rounded-2xl border border-slate-100">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50/70 text-slate-400 font-black uppercase text-[10px] tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-4">INVOICE #</th>
                    <th className="py-3 px-4">DATE</th>
                    <th className="py-3 px-4">PATIENT</th>
                    <th className="py-3 px-4">DOCTOR</th>
                    <th className="py-3 px-4 text-right">TOTAL ($)</th>
                    <th className="py-3 px-4 text-right">DISCOUNT</th>
                    <th className="py-3 px-4 text-right">PAID ($)</th>
                    <th className="py-3 px-4 text-right">BALANCE ($)</th>
                    <th className="py-3 px-4 text-center">STATUS</th>
                    <th className="py-3 px-4 text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredInvoices.map((inv) => {
                    const balance = Number(inv.balance || 0);
                    const isFullyPaid = inv.status === 'Paid' || balance <= 0;

                    return (
                      <tr key={inv._id} className="hover:bg-slate-50/80 transition group">
                        
                        {/* Invoice # Link */}
                        <td className="py-3.5 px-4 font-mono font-bold text-blue-600 hover:underline cursor-pointer" onClick={() => handleOpenInvoiceDetail(inv)}>
                          {inv.invoice_number}
                        </td>

                        {/* Date */}
                        <td className="py-3.5 px-4 text-slate-600 font-mono text-[11px]">
                          {new Date(inv.createdAt).toLocaleDateString()}
                        </td>

                        {/* Patient */}
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-slate-900 block">{inv.patient_id?.name || 'Patient'}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{inv.patient_id?.telephone || inv.patient_id?.patient_number}</span>
                        </td>

                        {/* Doctor */}
                        <td className="py-3.5 px-4 text-slate-800 font-bold">
                          {inv.doctor_id?.full_name ? `Dr. ${inv.doctor_id.full_name}` : 'Dr. System Administrator'}
                        </td>

                        {/* Total */}
                        <td className="py-3.5 px-4 text-right font-mono font-black text-slate-900 text-xs">
                          ${Number(inv.total_amount || 0).toFixed(2)}
                        </td>

                        {/* Discount */}
                        <td className="py-3.5 px-4 text-right font-mono text-amber-600 font-bold">
                          {Number(inv.discount || 0) > 0 ? `-$${Number(inv.discount).toFixed(2)}` : '—'}
                        </td>

                        {/* Paid Amount */}
                        <td className="py-3.5 px-4 text-right font-mono font-black text-emerald-600 text-xs">
                          ${Number(inv.paid_amount || 0).toFixed(2)}
                        </td>

                        {/* Balance */}
                        <td className="py-3.5 px-4 text-right font-mono font-black text-rose-600 text-xs">
                          ${balance.toFixed(2)}
                        </td>

                        {/* Status Badge */}
                        <td className="py-3.5 px-4 text-center">
                          <StatusBadge status={inv.status} />
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            
                            {/* View & Print Bill */}
                            <button
                              onClick={() => handleOpenInvoiceDetail(inv)}
                              title="View & Print Invoice"
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-[11px] transition cursor-pointer flex items-center gap-1"
                            >
                              <Eye className="w-3 h-3" />
                              <span>View Bill</span>
                            </button>

                            {/* Collect / Pay Button */}
                            {!isFullyPaid && isCashier && (
                              <button
                                onClick={() => handleOpenPayment(inv)}
                                title="Collect Payment"
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[11px] transition cursor-pointer flex items-center gap-1"
                              >
                                <DollarSign className="w-3 h-3" />
                                <span>Pay</span>
                              </button>
                            )}

                            {/* Edit Invoice */}
                            {isAdmin && (
                              <button
                                onClick={() => handleOpenEdit(inv)}
                                title="Edit Invoice"
                                className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Token */}
                            <button
                              onClick={() => handleOpenToken(inv)}
                              title="Print Token"
                              className="p-1 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-md transition cursor-pointer"
                            >
                              <Ticket className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete Invoice */}
                            {isAdmin && (
                              deleteConfirmId === inv._id ? (
                                <div className="inline-flex items-center gap-1 bg-rose-50 border border-rose-200 rounded-lg px-1.5 py-0.5">
                                  <span className="text-[9px] font-bold text-rose-700">Del?</span>
                                  <button
                                    onClick={() => handleDeleteInvoice(inv._id)}
                                    className="px-1.5 py-0.5 bg-rose-600 text-white rounded font-bold text-[9px]"
                                  >
                                    Yes
                                  </button>
                                  <button
                                    onClick={() => setDeleteConfirmId(null)}
                                    className="px-1.5 py-0.5 bg-slate-200 text-slate-700 rounded font-bold text-[9px]"
                                  >
                                    No
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setDeleteConfirmId(inv._id)}
                                  title="Delete Invoice"
                                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )
                            )}

                          </div>
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Tablet & Mobile Responsive Cards View */}
            <div className="lg:hidden grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {filteredInvoices.map((inv) => {
                const balance = Number(inv.balance || 0);
                const isFullyPaid = inv.status === 'Paid' || balance <= 0;

                return (
                  <div
                    key={inv._id}
                    className="p-4 bg-slate-50/70 border border-slate-200/80 rounded-2xl space-y-3"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-mono font-black text-blue-600 text-xs">{inv.invoice_number}</span>
                        <h4 className="font-bold text-slate-900 text-sm">{inv.patient_id?.name || 'Patient'}</h4>
                        <p className="text-[10px] text-slate-400 font-mono">{inv.patient_id?.telephone || inv.patient_id?.patient_number}</p>
                      </div>
                      <StatusBadge status={inv.status} />
                    </div>

                    <div className="grid grid-cols-3 gap-2 bg-white p-2.5 rounded-xl border border-slate-100 text-center font-mono">
                      <div>
                        <span className="text-[9px] text-slate-400 uppercase font-sans font-bold block">Total</span>
                        <span className="text-xs font-bold text-slate-800">${Number(inv.total_amount || 0).toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 uppercase font-sans font-bold block">Paid</span>
                        <span className="text-xs font-bold text-emerald-600">${Number(inv.paid_amount || 0).toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 uppercase font-sans font-bold block">Balance</span>
                        <span className="text-xs font-bold text-rose-600">${balance.toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-[10px] text-slate-500">
                      <span>Doctor: <strong>{inv.doctor_id?.full_name ? `Dr. ${inv.doctor_id.full_name}` : 'Doctor'}</strong></span>
                      <span className="font-mono">{new Date(inv.createdAt).toLocaleDateString()}</span>
                    </div>

                    {/* Card Actions */}
                    <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-slate-200/60">
                      <button
                        onClick={() => handleOpenInvoiceDetail(inv)}
                        className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg text-xs"
                      >
                        View Bill
                      </button>

                      {!isFullyPaid && isCashier && (
                        <button
                          onClick={() => handleOpenPayment(inv)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs"
                        >
                          Collect Payment
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: VIEW & PRINT CONSOLIDATED PATIENT BILL                           */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isInvoiceDetailOpen}
        onClose={() => setIsInvoiceDetailOpen(false)}
        icon={Receipt}
        title={`Invoice: ${selectedInvoice?.invoice_number || ''}`}
        subtitle="Consolidated patient invoice with itemized dental treatments, lab, and pharmacy."
        maxWidth="max-w-2xl"
      >
        <div className="space-y-4 text-xs">
          
          {/* Clinic Print Header */}
          <div className="text-center pb-3 border-b-2 border-blue-600 space-y-1">
            <h2 className="text-lg font-black text-slate-900 uppercase">SNAB DENTAL & DERMATOLOGIC CLINIC</h2>
            <p className="text-[10px] text-amber-600 font-bold uppercase">Official Patient Billing Statement</p>
            <p className="text-[10px] text-slate-400 font-mono">Mogadishu Main Road, Somalia • Tel: +252 61 5000000</p>
          </div>

          {/* Invoice Summary Box */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 grid grid-cols-2 gap-2 text-[11px] font-mono">
            <div>
              <span>Patient: <strong className="text-slate-900">{selectedInvoice?.patient_id?.name}</strong></span>
              <span className="block text-slate-500">Patient No: {selectedInvoice?.patient_id?.patient_number}</span>
              <span className="block text-slate-500">Phone: {selectedInvoice?.patient_id?.telephone}</span>
            </div>
            <div className="text-right">
              <span>Invoice #: <strong className="text-blue-700">{selectedInvoice?.invoice_number}</strong></span>
              <span className="block text-slate-500">Date: {new Date(selectedInvoice?.createdAt).toLocaleDateString()}</span>
              <span className="block text-slate-500">Doctor: {selectedInvoice?.doctor_id?.full_name ? `Dr. ${selectedInvoice.doctor_id.full_name}` : 'Doctor'}</span>
            </div>
          </div>

          {/* Items Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase">
                  <th className="py-2">Item Description</th>
                  <th className="py-2">Category</th>
                  <th className="py-2 text-center">Qty</th>
                  <th className="py-2 text-right">Unit Price</th>
                  <th className="py-2 text-right">Total ($)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(selectedInvoice?.items || []).map((it, idx) => (
                  <tr key={idx}>
                    <td className="py-2 font-bold text-slate-800">{it.description || it.item_type}</td>
                    <td className="py-2 text-slate-500">{it.item_type}</td>
                    <td className="py-2 text-center font-mono">{it.quantity || 1}</td>
                    <td className="py-2 text-right font-mono">${Number(it.unit_price || 0).toFixed(2)}</td>
                    <td className="py-2 text-right font-mono font-bold text-slate-900">${Number(it.total_price || 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals Section */}
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5 font-mono text-xs text-right">
            <div className="flex justify-between">
              <span className="text-slate-500">Subtotal:</span>
              <span className="font-bold">${Number(selectedInvoice?.subtotal || selectedInvoice?.total_amount || 0).toFixed(2)}</span>
            </div>
            {Number(selectedInvoice?.discount || 0) > 0 && (
              <div className="flex justify-between text-amber-600 font-bold">
                <span>Discount:</span>
                <span>-${Number(selectedInvoice.discount).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-900 font-black border-t border-slate-200 pt-1">
              <span>Total Payable:</span>
              <span>${Number(selectedInvoice?.total_amount || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-emerald-600 font-bold">
              <span>Amount Paid:</span>
              <span>${Number(selectedInvoice?.paid_amount || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-rose-600 font-black text-sm border-t border-slate-200 pt-1">
              <span>Remaining Balance:</span>
              <span>${Number(selectedInvoice?.balance || 0).toFixed(2)}</span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              onClick={() => setIsInvoiceDetailOpen(false)}
              className="px-4 py-2 bg-slate-100 rounded-xl font-bold text-xs"
            >
              Close
            </button>
            <button
              onClick={() => window.print()}
              className="px-5 py-2 bg-blue-600 text-white rounded-xl font-bold text-xs shadow flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Invoice</span>
            </button>
          </div>

        </div>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 2: CASHIER RECORD POS PAYMENT                                       */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        icon={DollarSign}
        title="Record Cashier POS Payment"
        subtitle={`Collecting settlement for Invoice ${selectedInvoice?.invoice_number || ''}`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleProcessPayment} className="space-y-4 text-xs">
          
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-1 font-mono">
            <div className="flex justify-between text-slate-500">
              <span>Patient:</span>
              <strong className="text-slate-800">{selectedInvoice?.patient_id?.name}</strong>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Total Invoice Amount:</span>
              <span>${Number(selectedInvoice?.total_amount || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-emerald-600 font-bold">
              <span>Previously Paid:</span>
              <span>${previouslyPaid.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-rose-600 font-black border-t border-slate-200 pt-1">
              <span>Outstanding Balance:</span>
              <span>${effectiveOutstanding.toFixed(2)}</span>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Paying Now ($) *</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">$</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                max={maxPaymentAllowed}
                required
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                className="w-full pl-7 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base font-black text-emerald-700 focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Payment Method</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:bg-white"
            >
              <option value="Cash">💵 Cash</option>
              <option value="Card">💳 Credit / Debit Card</option>
              <option value="Mobile Payment">📱 Mobile Payment (EVC Plus / Zaad)</option>
              <option value="Bank Transfer">🏦 Bank Transfer</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsPaymentModalOpen(false)}
              className="px-4 py-2 bg-slate-100 rounded-xl font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition cursor-pointer disabled:opacity-50"
            >
              {submitting ? 'Processing...' : `Confirm Payment ($${payingNow.toFixed(2)})`}
            </button>
          </div>
        </form>
      </Modal>

      {/* Official Receipt Modal */}
      <ReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        payment={currentPayment}
      />

      {/* Consultation Token Modal */}
      <ConsultationTokenModal
        isOpen={isTokenModalOpen}
        onClose={() => setIsTokenModalOpen(false)}
        invoice={selectedInvoice}
      />

    </div>
  );
};

export default BillingManager;
