import React, { useState, useEffect } from 'react';
import { getInvoicesApi, applyDiscountApi, recordPaymentApi } from '../../api/endpoints.js';
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
  Printer,
  Ticket
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
  const [currentPayment, setCurrentPayment] = useState(null);

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

  const handleOpenPayment = (inv) => {
    setSelectedInvoice(inv);
    setPaymentAmount(inv.balance || inv.total_amount);
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
        notes: `Paid at cashier desk for invoice ${selectedInvoice.invoice_number}${cashierDiscount > 0 ? ` (Discount: $${cashierDiscount})` : ''}`
      });
      setIsPaymentModalOpen(false);
      fetchInvoices();
      if (res.data?.data) {
        setCurrentPayment(res.data.data);
        setIsReceiptModalOpen(true);
      }
    } catch (err) {
      console.error('Error processing payment:', err);
    } finally {
      setSubmitting(false);
    }
  };

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
                        <span className="font-semibold text-slate-900 block">{docName ? `Dr. ${docName}` : '—'}</span>
                        {doc?.specialization && <span className="text-[10px] text-slate-400 block">{doc.specialization}</span>}
                      </td>
                      <td className="py-4 px-4 text-right font-mono font-bold text-slate-900">
                        ${inv.total_amount.toFixed(2)}
                      </td>
                      <td className="py-4 px-4 text-right font-mono text-slate-500">
                        {inv.discount > 0 ? `-$${inv.discount.toFixed(2)}` : '—'}
                      </td>
                      <td className="py-4 px-4 text-right font-mono font-bold text-emerald-600">
                        ${inv.paid_amount.toFixed(2)}
                      </td>
                      <td className="py-4 px-4 text-right font-mono font-bold text-rose-600">
                        ${inv.balance.toFixed(2)}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <StatusBadge status={inv.payment_status} />
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
                        {inv.payment_status !== 'Paid' && (
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
                            className="px-2 py-1 bg-blue-50 hover:bg-blue-600 hover:text-white font-bold text-blue-700 rounded-lg transition"
                          >
                            <Ticket className="w-3.5 h-3.5 inline mr-1" />
                            Token
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
        title={`Cashier POS: Receive Payment`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleProcessPayment} className="space-y-4 text-xs">
          <div className="bg-slate-50 p-3 rounded-xl space-y-1">
            <div className="flex justify-between text-slate-600">
              <span>Invoice Balance:</span>
              <span className="font-mono font-bold text-rose-600">${selectedInvoice?.balance?.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Patient:</span>
              <span className="font-bold text-slate-800">{selectedInvoice?.patient_id?.name}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Payment Amount ($) *</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                required
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border rounded-xl font-mono font-black text-lg text-emerald-600"
              />
            </div>

            <div>
              <label className="block font-bold text-emerald-700 mb-1">Cashier Discount ($)</label>
              <input
                type="number"
                min="0"
                value={cashierDiscount}
                onChange={(e) => setCashierDiscount(e.target.value)}
                className="w-full p-2.5 bg-emerald-50/60 border border-emerald-200 rounded-xl font-mono font-bold text-emerald-800"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Payment Method *</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border rounded-xl font-bold"
            >
              <option value="Cash">💵 Cash</option>
              <option value="Mobile Payment">📱 Mobile Payment (EVC Plus / Zaad / Sahal)</option>
              <option value="Card">💳 Card / POS</option>
              <option value="Bank Transfer">🏦 Bank Transfer</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
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
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md"
            >
              {submitting ? 'Recording...' : 'Confirm & Print Receipt'}
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
