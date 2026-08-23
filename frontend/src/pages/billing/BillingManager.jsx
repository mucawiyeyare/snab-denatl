import React, { useState, useEffect } from 'react';
import { getInvoicesApi, applyDiscountApi, recordPaymentApi, updateInvoiceApi, deleteInvoiceApi } from '../../api/endpoints.js';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import Modal from '../../components/ui/Modal.jsx';
import ReceiptModal from '../../components/ui/ReceiptModal.jsx';
import ConsultationTokenModal from '../../components/ui/ConsultationTokenModal.jsx';
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
  Plus
} from 'lucide-react';

const BillingManager = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Selected invoice
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [isInvoiceDetailOpen, setIsInvoiceDetailOpen] = useState(false);
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isTokenModalOpen, setIsTokenModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
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
  }, [search, statusFilter]);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const res = await getInvoicesApi({ status: statusFilter || undefined });
      setInvoices(res.data?.data || []);
    } catch (err) {
      console.error('Error fetching invoices:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredInvoices = invoices.filter(inv =>
    inv.invoice_number?.toLowerCase().includes(search.toLowerCase()) ||
    inv.patient_id?.name?.toLowerCase().includes(search.toLowerCase()) ||
    inv.patient_id?.telephone?.toLowerCase().includes(search.toLowerCase())
  );

  const [cashierDiscount, setCashierDiscount] = useState(0);

  // Financial calculations for selected invoice in Cashier POS Modal
  const invoiceItems = selectedInvoice?.items || [];
  const treatmentItems = invoiceItems.filter(item => ['Treatment', 'Consultation'].includes(item.item_type));
  const additionalItems = invoiceItems.filter(item => !['Treatment', 'Consultation'].includes(item.item_type));
  
  const treatmentCost = treatmentItems.length > 0
    ? treatmentItems.reduce((acc, item) => acc + (Number(item.total_price) || 0), 0)
    : Number(selectedInvoice?.subtotal || 0);

  const additionalCosts = additionalItems.length > 0
    ? additionalItems.reduce((acc, item) => acc + (Number(item.total_price) || 0), 0)
    : Math.max(0, Number(selectedInvoice?.subtotal || 0) - treatmentCost);

  const totalPatientCost = Number(selectedInvoice?.subtotal || (treatmentCost + additionalCosts) || 0);
  const previouslyPaid = Number(selectedInvoice?.paid_amount || 0);
  const approvedDiscount = Number(selectedInvoice?.discount || 0);
  
  // Base Outstanding = Total Patient Cost - Previously Paid - Approved Discounts
  const baseOutstanding = Math.max(0, totalPatientCost - previouslyPaid - approvedDiscount);

  // Cashier Discount control
  const currentCashierDiscount = Math.max(0, Number(cashierDiscount) || 0);
  const cashierDiscountExceeded = currentCashierDiscount > baseOutstanding + 0.001;

  // Effective Outstanding after applying new Cashier discount
  const effectiveOutstanding = Math.max(0, baseOutstanding - currentCashierDiscount);
  const maxPaymentAllowed = effectiveOutstanding;

  // Paying Now control
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

  const handleApplyDiscount = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await applyDiscountApi(selectedInvoice._id, { discount: Number(discountAmount) });
      setIsDiscountModalOpen(false);
      fetchInvoices();
    } catch (err) {
      console.error('Error applying discount:', err);
    } finally {
      setSubmitting(false);
    }
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
        patient_id: selectedInvoice.patient_id?._id,
        visit_id: selectedInvoice.visit_id?._id,
        amount: Number(paymentAmount),
        discount: Number(cashierDiscount || 0),
        payment_method: paymentMethod,
        payment_category: 'Final Bill / Consolidated',
        notes: `Paid at cashier desk for invoice ${selectedInvoice.invoice_number}${cashierDiscount > 0 ? ` (Cashier Discount: $${Number(cashierDiscount).toFixed(2)})` : ''}`
      });
      setIsPaymentModalOpen(false);
      fetchInvoices();
      if (res.data?.data) {
        setCurrentPayment(res.data.data);
        setIsReceiptModalOpen(true);
      }
    } catch (err) {
      console.error('Error processing payment:', err);
      alert(err.response?.data?.message || 'Error processing payment');
    } finally {
      setSubmitting(false);
    }
  };

  // --- Edit Invoice Handlers ---
  const handleOpenEditInvoice = (inv) => {
    setSelectedInvoice(inv);
    const items = (inv.items && inv.items.length > 0)
      ? inv.items.map(item => ({
          item_type: item.item_type || 'Treatment',
          description: item.description || '',
          unit_price: item.unit_price !== undefined ? item.unit_price : (item.total_price || 0),
          quantity: item.quantity || 1,
          total_price: item.total_price !== undefined ? item.total_price : ((item.quantity || 1) * (item.unit_price || 0)),
          paid_status: item.paid_status || 'Unpaid'
        }))
      : [
          {
            item_type: 'Treatment',
            description: 'Dental Service / Treatment',
            unit_price: inv.subtotal || inv.total_amount || 0,
            quantity: 1,
            total_price: inv.subtotal || inv.total_amount || 0,
            paid_status: 'Unpaid'
          }
        ];
    setEditItems(items);
    setEditDiscount(inv.discount || 0);
    setIsEditModalOpen(true);
  };

  const handleAddEditItem = () => {
    setEditItems(prev => [
      ...prev,
      {
        item_type: 'Treatment',
        description: '',
        unit_price: 0,
        quantity: 1,
        total_price: 0,
        paid_status: 'Unpaid'
      }
    ]);
  };

  const handleRemoveEditItem = (index) => {
    if (editItems.length <= 1) {
      alert('An invoice must have at least one line item.');
      return;
    }
    setEditItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleEditItemChange = (index, field, value) => {
    setEditItems(prev => prev.map((item, i) => {
      if (i !== index) return item;
      const updated = { ...item, [field]: value };
      if (field === 'unit_price' || field === 'quantity') {
        const qty = Number(field === 'quantity' ? value : updated.quantity) || 0;
        const unit = Number(field === 'unit_price' ? value : updated.unit_price) || 0;
        updated.total_price = qty * unit;
      }
      return updated;
    }));
  };

  const handleSaveEditInvoice = async (e) => {
    e.preventDefault();
    if (editItems.length === 0) {
      alert('An invoice must have at least one line item.');
      return;
    }
    const emptyDesc = editItems.some(i => !i.description || !i.description.trim());
    if (emptyDesc) {
      alert('Please provide a description for all line items.');
      return;
    }

    setSubmitting(true);
    try {
      await updateInvoiceApi(selectedInvoice._id, {
        items: editItems,
        discount: Number(editDiscount) || 0
      });
      setIsEditModalOpen(false);
      setSelectedInvoice(null);
      fetchInvoices();
    } catch (err) {
      console.error('Error updating invoice:', err);
      alert(err.response?.data?.message || 'Error updating invoice');
    } finally {
      setSubmitting(false);
    }
  };

  // Live calculations for Edit Invoice Modal
  const editSubtotal = editItems.reduce((acc, item) => acc + (Number(item.total_price) || 0), 0);
  const editDiscountVal = Math.max(0, Number(editDiscount) || 0);
  const editTotalAmount = Math.max(0, editSubtotal - editDiscountVal);
  const editPaidAmount = Number(selectedInvoice?.paid_amount) || 0;
  const editBalance = Math.max(0, editTotalAmount - editPaidAmount);

  const handlePrintAllInvoices = () => {
    window.print();
  };

  const totalBilled = filteredInvoices.reduce((acc, inv) => acc + (inv.total_amount || 0), 0);
  const totalCollected = filteredInvoices.reduce((acc, inv) => acc + (inv.paid_amount || 0), 0);
  const totalOutstanding = filteredInvoices.reduce((acc, inv) => acc + (inv.balance || 0), 0);

  return (
    <div className="space-y-6">
      
      {/* Header with Print All Invoices Action */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 no-print">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Billing & Consolidated Invoices</h1>
          <p className="text-xs text-slate-500">Manage patient accounts, POS payments, discounts, and itemized billing ledger</p>
        </div>

        <button
          onClick={handlePrintAllInvoices}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          Print All Billing Invoices
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 no-print">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Invoiced</span>
          <p className="text-2xl font-black text-slate-900">${totalBilled.toFixed(2)}</p>
          <span className="text-xs text-slate-400">{filteredInvoices.length} invoices generated</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Collected</span>
          <p className="text-2xl font-black text-emerald-600">${totalCollected.toFixed(2)}</p>
          <span className="text-xs text-emerald-600 font-semibold">Settled at Cashier</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Outstanding Balances</span>
          <p className="text-2xl font-black text-rose-600">${totalOutstanding.toFixed(2)}</p>
          <span className="text-xs text-rose-600 font-semibold">Pending Payment</span>
        </div>
      </div>

      {/* Filters (hidden on print) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 no-print">
        <div className="sm:col-span-2 bg-white p-3 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-2">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Patient Name, Invoice No (INV-...), or Telephone..."
            className="w-full text-xs font-medium focus:outline-hidden"
          />
        </div>

        <div className="bg-white p-2.5 rounded-2xl border border-slate-100 shadow-xs">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full text-xs font-bold text-slate-700 bg-transparent focus:outline-hidden"
          >
            <option value="">All Invoices</option>
            <option value="Unpaid">Unpaid Invoices</option>
            <option value="Partially Paid">Partially Paid</option>
            <option value="Paid">Fully Paid</option>
          </select>
        </div>
      </div>

      {/* Printable Area for All Invoices Ledger */}
      <div id="printable-area">
        
        {/* Printable Header (Visible during print) */}
        <div className="hidden print:block text-center border-b border-slate-200 pb-4 mb-4">
          <img
            src="/logo.png"
            alt="SNAB Dental Clinic Logo"
            className="w-16 h-16 mx-auto rounded-full object-cover border-2 border-amber-500 shadow-xs mb-2"
          />
          <h2 className="text-base font-black text-slate-900 uppercase">
            SNAB DENTAL AND DERMATOLOGIC CLINIC
          </h2>
          <p className="text-xs font-bold text-amber-600 uppercase">Complete Billing Invoices Ledger & Statement</p>
          <p className="text-[11px] text-slate-500">Mogadishu, KM4 • Tel: +252 61 5000000 • Date: {new Date().toLocaleDateString()}</p>
          
          <div className="grid grid-cols-3 gap-2 mt-3 pt-2 border-t border-dashed text-xs">
            <div><strong>Total Billed:</strong> ${totalBilled.toFixed(2)}</div>
            <div><strong>Total Paid:</strong> ${totalCollected.toFixed(2)}</div>
            <div><strong>Outstanding:</strong> ${totalOutstanding.toFixed(2)}</div>
          </div>
        </div>

        {/* Invoices Table */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="text-center py-16 text-slate-400 text-xs">No billing invoices found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider">
                    <th className="py-3.5 px-5">Invoice #</th>
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-4">Patient</th>
                    <th className="py-3.5 px-4">Doctor</th>
                    <th className="py-3.5 px-4 text-right">Total ($)</th>
                    <th className="py-3.5 px-4 text-right">Discount</th>
                    <th className="py-3.5 px-4 text-right">Paid ($)</th>
                    <th className="py-3.5 px-4 text-right">Balance ($)</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-5 text-right no-print">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredInvoices.map((inv) => {
                    const doc = inv.doctor_id || inv.visit_id?.doctor_id;
                    const docName = doc?.full_name || doc?.username;
                    const cleanDocName = docName ? (docName.startsWith('Dr.') ? docName : `Dr. ${docName}`) : '—';
                    const invStatus = inv.status || (inv.balance <= 0 ? 'Paid' : (inv.paid_amount > 0 ? 'Partially Paid' : 'Unpaid'));

                    return (
                    <tr key={inv._id} className="hover:bg-slate-50/80 transition">
                      <td className="py-4 px-5 font-mono font-bold text-blue-600">
                        {inv.invoice_number}
                      </td>
                      <td className="py-4 px-4 text-slate-500">
                        {new Date(inv.invoice_date).toLocaleDateString()}
                      </td>
                      <td className="py-4 px-4">
                        <span className="font-bold text-slate-900 block">{inv.patient_id?.name || 'Walk-in'}</span>
                        <span className="text-[11px] text-slate-400 font-mono">{inv.patient_id?.telephone}</span>
                      </td>
                      <td className="py-4 px-4 text-slate-700">
                        <span className="font-semibold text-slate-900 block">{cleanDocName}</span>
                        {doc?.specialization && <span className="text-[10px] text-slate-400 block">{doc.specialization}</span>}
                      </td>
                      <td className="py-4 px-4 text-right font-mono font-bold text-slate-900">
                        ${(inv.total_amount || 0).toFixed(2)}
                      </td>
                      <td className="py-4 px-4 text-right font-mono text-slate-500">
                        {inv.discount > 0 ? `-$${inv.discount.toFixed(2)}` : '—'}
                      </td>
                      <td className="py-4 px-4 text-right font-mono font-bold text-emerald-600">
                        ${(inv.paid_amount || 0).toFixed(2)}
                      </td>
                      <td className="py-4 px-4 text-right font-mono font-bold text-rose-600">
                        ${(inv.balance || 0).toFixed(2)}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <StatusBadge status={invStatus} />
                      </td>
                      <td className="py-4 px-5 text-right space-x-1.5 no-print">
                        <button
                          onClick={() => {
                            setSelectedInvoice(inv);
                            setIsInvoiceDetailOpen(true);
                          }}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 font-bold text-slate-700 rounded-lg transition cursor-pointer"
                        >
                          View Bill
                        </button>
                        <button
                          onClick={() => handleOpenEditInvoice(inv)}
                          title="Edit Invoice Items & Charges"
                          className="px-2.5 py-1 bg-amber-50 hover:bg-amber-500 hover:text-white font-bold text-amber-700 rounded-lg transition cursor-pointer inline-flex items-center gap-1"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                        {inv.balance > 0 && (
                          <button
                            onClick={() => handleOpenPayment(inv)}
                            className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-600 hover:text-white font-bold text-emerald-700 rounded-lg transition cursor-pointer"
                          >
                            Pay
                          </button>
                        )}
                        {/* If invoice has a consultation item or visit, allow printing Doctor Token */}
                        {inv.visit_id && (
                          <button
                            onClick={() => {
                              setSelectedInvoice(inv);
                              setIsTokenModalOpen(true);
                            }}
                            title="Print Doctor Consultation Token / Slip"
                            className="px-2 py-1 bg-blue-50 hover:bg-blue-600 hover:text-white font-bold text-blue-700 rounded-lg transition inline-flex items-center gap-1"
                          >
                            <Ticket className="w-3.5 h-3.5" />
                            <span>Token</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );})}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* Invoice Detail Modal */}
      <Modal
        isOpen={isInvoiceDetailOpen}
        onClose={() => setIsInvoiceDetailOpen(false)}
        title={`Invoice Breakdown: ${selectedInvoice?.invoice_number}`}
        maxWidth="max-w-xl"
      >
        {selectedInvoice && (
          <div className="space-y-4 text-xs">
            <div className="flex justify-between items-center bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Patient</span>
                <span className="font-bold text-slate-900 text-sm">{selectedInvoice.patient_id?.name}</span>
                <span className="text-[11px] text-slate-500 font-mono block">{selectedInvoice.patient_id?.patient_number}</span>
              </div>
              <div className="text-center">
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Attending Doctor</span>
                <span className="font-bold text-slate-800 text-xs">
                  {selectedInvoice.doctor_id?.full_name || selectedInvoice.visit_id?.doctor_id?.full_name ? `Dr. ${selectedInvoice.doctor_id?.full_name || selectedInvoice.visit_id?.doctor_id?.full_name}` : 'Attending Doctor'}
                </span>
              </div>
              <div className="text-right">
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Status</span>
                <StatusBadge status={selectedInvoice.payment_status} />
              </div>
            </div>

            {/* Itemized Table */}
            <div>
              <h4 className="font-bold text-slate-900 mb-2">Itemized Charges</h4>
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 font-bold">
                    <th className="p-2 text-left">Item / Service</th>
                    <th className="p-2 text-center">Type</th>
                    <th className="p-2 text-center">Qty</th>
                    <th className="p-2 text-right">Price</th>
                    <th className="p-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedInvoice.items?.map((item, idx) => (
                    <tr key={idx}>
                      <td className="p-2 font-semibold text-slate-800">{item.item_name}</td>
                      <td className="p-2 text-center text-slate-500">{item.item_type}</td>
                      <td className="p-2 text-center">{item.quantity}</td>
                      <td className="p-2 text-right font-mono">${item.unit_price.toFixed(2)}</td>
                      <td className="p-2 text-right font-mono font-bold">${item.total_price.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="bg-slate-50 p-3 rounded-xl space-y-1.5 border">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="font-mono font-bold">${selectedInvoice.subtotal.toFixed(2)}</span>
              </div>
              {selectedInvoice.discount > 0 && (
                <div className="flex justify-between text-rose-600">
                  <span>Discount:</span>
                  <span className="font-mono font-bold">-${selectedInvoice.discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-black text-slate-900 pt-1 border-t">
                <span>Total Amount:</span>
                <span className="font-mono">${selectedInvoice.total_amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-emerald-700 font-bold">
                <span>Paid Amount:</span>
                <span className="font-mono">${selectedInvoice.paid_amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-rose-700 font-bold text-sm">
                <span>Balance Due:</span>
                <span className="font-mono">${selectedInvoice.balance.toFixed(2)}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-between items-center pt-2 border-t">
              <button
                type="button"
                onClick={() => {
                  setDiscountAmount(selectedInvoice.discount || 0);
                  setIsDiscountModalOpen(true);
                }}
                className="px-3 py-1.5 bg-amber-50 text-amber-700 hover:bg-amber-100 font-bold rounded-xl"
              >
                <Percent className="w-3.5 h-3.5 inline mr-1" />
                Apply Discount
              </button>

              <div className="flex gap-2">
                {selectedInvoice.visit_id && (
                  <button
                    type="button"
                    onClick={() => setIsTokenModalOpen(true)}
                    className="px-3.5 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold rounded-xl"
                  >
                    <Ticket className="w-3.5 h-3.5 inline mr-1" />
                    Doctor Token Slip
                  </button>
                )}
                {selectedInvoice.payment_status !== 'Paid' && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsInvoiceDetailOpen(false);
                      handleOpenPayment(selectedInvoice);
                    }}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md"
                  >
                    💳 Record Payment
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Apply Discount Modal */}
      <Modal
        isOpen={isDiscountModalOpen}
        onClose={() => setIsDiscountModalOpen(false)}
        title="Apply Discount to Invoice"
        maxWidth="max-w-sm"
      >
        <form onSubmit={handleApplyDiscount} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Discount Amount ($)</label>
            <input
              type="number"
              min="0"
              max={selectedInvoice?.subtotal || 1000}
              value={discountAmount}
              onChange={(e) => setDiscountAmount(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border rounded-xl font-mono font-bold text-base"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t">
            <button
              type="button"
              onClick={() => setIsDiscountModalOpen(false)}
              className="px-3 py-1.5 bg-slate-100 rounded-xl font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold"
            >
              Save Discount
            </button>
          </div>
        </form>
      </Modal>

      {/* POS Payment Modal */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        icon={Receipt}
        title="Cashier POS: Receive Payment"
        subtitle="Collect payment against approved invoice balance. Invoices cannot be modified or increased here."
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleProcessPayment} className="space-y-4 text-xs">
          
          {/* 1. Patient Financial Summary Card */}
          <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-md space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Patient Account</span>
                <p className="text-sm font-black text-white">{selectedInvoice?.patient_id?.name || 'Walk-in Patient'}</p>
                <p className="text-[11px] text-slate-400 font-mono">
                  {selectedInvoice?.patient_id?.patient_number || ''} {selectedInvoice?.patient_id?.telephone ? `• ${selectedInvoice?.patient_id?.telephone}` : ''} • Inv: {selectedInvoice?.invoice_number}
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Invoice Status</span>
                <p className={`text-xs font-bold ${
                  effectiveOutstanding <= 0 ? 'text-emerald-400' : 'text-amber-400'
                }`}>
                  {effectiveOutstanding <= 0 ? '✓ Paid in Full' : (selectedInvoice?.status || 'Unpaid')}
                </p>
              </div>
            </div>

            {/* Financial Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              <div className="p-2.5 bg-slate-800/80 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-bold">Total Treatment</span>
                <span className="font-mono font-bold text-xs text-slate-200">${treatmentCost.toFixed(2)}</span>
              </div>
              <div className="p-2.5 bg-slate-800/80 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-bold">Additional Costs</span>
                <span className="font-mono font-bold text-xs text-slate-200">${additionalCosts.toFixed(2)}</span>
              </div>
              <div className="p-2.5 bg-slate-800/80 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-bold">Total Patient Cost</span>
                <span className="font-mono font-black text-xs text-white">${totalPatientCost.toFixed(2)}</span>
              </div>
              <div className="p-2.5 bg-slate-800/80 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-bold">Previously Paid</span>
                <span className="font-mono font-bold text-xs text-emerald-400">${previouslyPaid.toFixed(2)}</span>
              </div>
            </div>

            {/* Outstanding Balance Banner */}
            <div className="p-3 bg-slate-800 rounded-xl flex justify-between items-center border border-slate-700/80">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Current Outstanding Balance</span>
                {approvedDiscount > 0 && (
                  <span className="text-[10px] text-emerald-400 block font-semibold">Includes previous discount: ${approvedDiscount.toFixed(2)}</span>
                )}
              </div>
              <span className={`font-mono text-lg font-black ${
                effectiveOutstanding > 0 ? 'text-rose-400' : 'text-emerald-400'
              }`}>
                ${effectiveOutstanding.toFixed(2)}
              </span>
            </div>
          </div>

          {/* 2. Payment Amount & Cashier Discount Input Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Payment Amount */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="font-bold text-slate-700">Payment Amount ($) *</label>
                <span className="text-[10px] font-bold text-slate-400 font-mono">Max: ${maxPaymentAllowed.toFixed(2)}</span>
              </div>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="number"
                  min="0.01"
                  max={maxPaymentAllowed}
                  step="0.01"
                  required
                  disabled={effectiveOutstanding <= 0}
                  value={paymentAmount}
                  onChange={(e) => {
                    const val = e.target.value;
                    setPaymentAmount(val);
                  }}
                  placeholder="0.00"
                  className={`w-full pl-9 pr-3.5 py-2.5 rounded-xl font-mono font-black text-base transition border ${
                    paymentExceeded
                      ? 'border-rose-500 bg-rose-50/50 text-rose-700 ring-1 ring-rose-500'
                      : 'border-slate-200 bg-white text-emerald-700 focus:border-emerald-500 focus:outline-none'
                  }`}
                />
              </div>
              {paymentExceeded && (
                <div className="p-2 mt-1.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 font-bold text-[11px] flex items-start gap-1.5">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                  <span>Payment amount cannot exceed the patient’s outstanding balance of ${maxPaymentAllowed.toFixed(2)}.</span>
                </div>
              )}
            </div>

            {/* Cashier Discount */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="font-bold text-emerald-800">Cashier Discount ($)</label>
                <span className="text-[10px] font-bold text-slate-400 font-mono">Max: ${baseOutstanding.toFixed(2)}</span>
              </div>
              <div className="relative">
                <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                <input
                  type="number"
                  min="0"
                  max={baseOutstanding}
                  step="0.01"
                  value={cashierDiscount}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCashierDiscount(val);
                    const numDiscount = Number(val) || 0;
                    const newMax = Math.max(0, baseOutstanding - numDiscount);
                    if (Number(paymentAmount) > newMax) {
                      setPaymentAmount(newMax > 0 ? newMax : 0);
                    }
                  }}
                  placeholder="0.00"
                  className={`w-full pl-9 pr-3.5 py-2.5 rounded-xl font-mono font-bold text-base transition border ${
                    cashierDiscountExceeded
                      ? 'border-rose-500 bg-rose-50/50 text-rose-700 ring-1 ring-rose-500'
                      : 'border-emerald-200 bg-emerald-50/40 text-emerald-900 focus:border-emerald-500 focus:outline-none'
                  }`}
                />
              </div>
              {cashierDiscountExceeded && (
                <div className="p-2 mt-1.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 font-bold text-[11px] flex items-start gap-1.5">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                  <span>Discount cannot exceed the outstanding balance of ${baseOutstanding.toFixed(2)}.</span>
                </div>
              )}
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">Payment Method *</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="Cash">💵 Cash</option>
              <option value="Mobile Payment">📱 Mobile Payment (EVC Plus / Zaad / Sahal)</option>
              <option value="Card">💳 Credit / Debit Card (POS)</option>
              <option value="Bank Transfer">🏦 Bank Transfer</option>
            </select>
          </div>

          {/* 3. Paying Now Breakdown & Confirmation Card */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
            <div className="flex justify-between items-center pb-1.5 border-b border-slate-200/80">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Payment Summary</span>
              </span>
              <span className="text-[10px] text-slate-400 font-medium">Review prior to confirmation</span>
            </div>

            <div className="space-y-1.5 font-medium text-slate-600 text-xs">
              <div className="flex justify-between">
                <span>Patient:</span>
                <span className="font-bold text-slate-900">{selectedInvoice?.patient_id?.name || 'Walk-in Patient'}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Patient Cost:</span>
                <span className="font-mono text-slate-900">${totalPatientCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Previously Paid:</span>
                <span className="font-mono text-emerald-700">${previouslyPaid.toFixed(2)}</span>
              </div>
              {(approvedDiscount > 0 || currentCashierDiscount > 0) && (
                <div className="flex justify-between">
                  <span>Discount:</span>
                  <span className="font-mono text-emerald-700 font-bold">-${(approvedDiscount + currentCashierDiscount).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Outstanding Balance:</span>
                <span className="font-mono font-bold text-slate-900">${baseOutstanding.toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-1.5 border-t border-slate-200 text-purple-950 font-bold">
                <span>Paying Now:</span>
                <span className="font-mono text-sm font-black text-purple-700">${payingNow.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-900 font-bold">
                <span>Balance Remaining:</span>
                <span className={`font-mono text-sm font-black ${remainingBalance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  ${remainingBalance.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* 4. Prevent Unauthorized Increase Notice */}
          <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-2xl flex items-start gap-2.5 text-amber-900">
            <Lock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-xs text-amber-950">Invoice Change Required</p>
              <p className="text-[10px] text-amber-800 leading-relaxed mt-0.5">
                The patient's invoice must be updated by an authorized staff member before this additional charge can be collected. Cashiers cannot modify base treatment costs or increase invoice amounts from this screen.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsPaymentModalOpen(false)}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || paymentExceeded || cashierDiscountExceeded || isZeroPayment || effectiveOutstanding <= 0}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Receipt className="w-4 h-4" />
              <span>{submitting ? 'Recording...' : 'Confirm & Print Receipt'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Receipt Modal */}
      <ReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        payment={currentPayment}
      />

      {/* Edit Invoice Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        icon={Edit3}
        title={`Edit Invoice: ${selectedInvoice?.invoice_number || ''}`}
        subtitle="Modify line items, procedures, prices, and authorized invoice discounts"
        maxWidth="max-w-3xl"
      >
        <form onSubmit={handleSaveEditInvoice} className="space-y-4 text-xs">
          {/* Patient & Invoice Information Strip */}
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 flex flex-wrap justify-between items-center gap-2">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Patient</span>
              <p className="font-bold text-slate-900 text-sm">{selectedInvoice?.patient_id?.name || 'Walk-in'}</p>
              <p className="text-[11px] text-slate-500 font-mono">{selectedInvoice?.patient_id?.telephone || ''}</p>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Doctor</span>
              <p className="font-semibold text-slate-800">
                {selectedInvoice?.doctor_id?.full_name || selectedInvoice?.visit_id?.doctor_id?.full_name || '—'}
              </p>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Invoice Date</span>
              <p className="font-mono text-slate-700">
                {selectedInvoice?.invoice_date ? new Date(selectedInvoice.invoice_date).toLocaleDateString() : '—'}
              </p>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Paid So Far</span>
              <p className="font-mono font-bold text-emerald-600">${editPaidAmount.toFixed(2)}</p>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-blue-600" />
                <span>Invoice Line Items & Charges</span>
              </label>
              <button
                type="button"
                onClick={handleAddEditItem}
                className="px-2.5 py-1 bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-700 font-bold rounded-lg transition text-xs inline-flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item</span>
              </button>
            </div>

            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                    <th className="p-2.5 text-left w-28">Type</th>
                    <th className="p-2.5 text-left">Description / Service</th>
                    <th className="p-2.5 text-right w-24">Price ($)</th>
                    <th className="p-2.5 text-center w-16">Qty</th>
                    <th className="p-2.5 text-right w-24">Total ($)</th>
                    <th className="p-2.5 text-center w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {editItems.map((item, index) => (
                    <tr key={index} className="hover:bg-slate-50/60 transition">
                      <td className="p-2">
                        <select
                          value={item.item_type}
                          onChange={(e) => handleEditItemChange(index, 'item_type', e.target.value)}
                          className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-xs focus:outline-none"
                        >
                          <option value="Treatment">Treatment</option>
                          <option value="Consultation">Consultation</option>
                          <option value="LabTest">Lab Test</option>
                          <option value="X-Ray">X-Ray / Scan</option>
                          <option value="Medicine">Medicine</option>
                          <option value="Other">Other</option>
                        </select>
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          required
                          value={item.description}
                          onChange={(e) => handleEditItemChange(index, 'description', e.target.value)}
                          placeholder="e.g. Tooth Extraction / Scaling / CBC"
                          className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg font-medium text-xs focus:outline-none focus:border-blue-500"
                        />
                      </td>
                      <td className="p-2 text-right">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          required
                          value={item.unit_price}
                          onChange={(e) => handleEditItemChange(index, 'unit_price', e.target.value)}
                          className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold text-right text-xs focus:outline-none focus:border-blue-500"
                        />
                      </td>
                      <td className="p-2 text-center">
                        <input
                          type="number"
                          min="1"
                          step="1"
                          required
                          value={item.quantity}
                          onChange={(e) => handleEditItemChange(index, 'quantity', e.target.value)}
                          className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold text-center text-xs focus:outline-none focus:border-blue-500"
                        />
                      </td>
                      <td className="p-2 text-right font-mono font-bold text-slate-800">
                        ${(item.total_price || 0).toFixed(2)}
                      </td>
                      <td className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveEditItem(index)}
                          disabled={editItems.length <= 1}
                          title="Remove item"
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Discount & Ledger Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* Discount Editor */}
            <div className="p-3.5 bg-amber-50/50 border border-amber-200/80 rounded-2xl space-y-2">
              <label className="block font-bold text-amber-900 text-xs">
                Authorized Invoice Discount ($)
              </label>
              <div className="relative">
                <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-600" />
                <input
                  type="number"
                  min="0"
                  max={editSubtotal}
                  step="0.01"
                  value={editDiscount}
                  onChange={(e) => setEditDiscount(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-9 pr-3.5 py-2 bg-white border border-amber-200 rounded-xl font-mono font-bold text-amber-900 text-sm focus:outline-none focus:border-amber-500"
                />
              </div>
              <p className="text-[10px] text-amber-700">
                Discount reduces total patient invoice amount and adjusts remaining balance.
              </p>
            </div>

            {/* Calculated Financial Ledger */}
            <div className="p-3.5 bg-slate-900 text-white rounded-2xl shadow-md space-y-1.5 font-medium">
              <div className="flex justify-between text-slate-300">
                <span>Subtotal ({editItems.length} items):</span>
                <span className="font-mono font-bold text-white">${editSubtotal.toFixed(2)}</span>
              </div>
              {editDiscountVal > 0 && (
                <div className="flex justify-between text-emerald-400">
                  <span>Discount:</span>
                  <span className="font-mono font-bold">-${editDiscountVal.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-100 font-bold pt-1 border-t border-slate-800">
                <span>Total Amount:</span>
                <span className="font-mono text-white font-black">${editTotalAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-emerald-400 font-bold">
                <span>Previously Paid:</span>
                <span className="font-mono">${editPaidAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-black text-sm pt-1 border-t border-slate-800">
                <span>New Balance Due:</span>
                <span className={`font-mono ${editBalance > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  ${editBalance.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer flex items-center gap-2 disabled:opacity-50"
            >
              <CheckCircle className="w-4 h-4" />
              <span>{submitting ? 'Saving Changes...' : 'Save & Update Invoice'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Doctor Consultation Token Modal */}
      <ConsultationTokenModal
        isOpen={isTokenModalOpen}
        onClose={() => setIsTokenModalOpen(false)}
        visit={selectedInvoice?.visit_id}
      />

    </div>
  );
};

export default BillingManager;
