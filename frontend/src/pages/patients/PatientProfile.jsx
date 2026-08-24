import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { getPatientHistoryApi, deletePatientApi, recordPaymentApi } from '../../api/endpoints.js';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import Modal from '../../components/ui/Modal.jsx';
import ReceiptModal from '../../components/ui/ReceiptModal.jsx';
import {
  ArrowLeft,
  Printer,
  Calendar,
  Phone,
  User,
  HeartPulse,
  Stethoscope,
  TestTube2,
  Pill,
  Receipt,
  Clock,
  AlertCircle,
  AlertTriangle,
  FileText,
  Trash2,
  DollarSign,
  Percent,
  CreditCard,
  CheckCircle2,
  CheckCircle,
  ShieldCheck,
  Lock,
  Eye,
  Search,
  Filter,
  Plus
} from 'lucide-react';

const PatientProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Financial Tab States
  const [financialFilter, setFinancialFilter] = useState('All'); // 'All' | 'Pending' | 'Partially Paid' | 'Paid' | 'Discount' | 'Cancelled/Void'
  const [financialSearch, setFinancialSearch] = useState('');
  const [financialViewMode, setFinancialViewMode] = useState('ledger'); // 'ledger' | 'receipts'
  
  // Selected Invoice & Modals
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [isInvoiceDetailOpen, setIsInvoiceDetailOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [currentPayment, setCurrentPayment] = useState(null);
  
  // Payment Form States
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [cashierDiscount, setCashierDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [submittingPayment, setSubmittingPayment] = useState(false);

  useEffect(() => {
    fetchHistory();
  }, [id]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await getPatientHistoryApi(id);
      setData(res.data?.data);
    } catch (err) {
      console.error('Error fetching patient history:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDeletePatient = async () => {
    const patientName = data?.patient?.name || 'this patient';
    const patientNum = data?.patient?.patient_number || '';
    if (
      window.confirm(
        `Are you sure you want to permanently delete patient ${patientName} (${patientNum}) and ALL associated clinical and billing records?\n\nThis action is permanent and cannot be undone.`
      )
    ) {
      setDeleting(true);
      try {
        await deletePatientApi(id);
        navigate('/patients');
      } catch (err) {
        alert(err.response?.data?.message || 'Failed to delete patient');
        setDeleting(false);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!data || !data.patient) {
    return (
      <div className="text-center py-12">
        <p className="text-sm font-bold text-slate-700">Patient not found</p>
        <button
          onClick={() => navigate('/patients')}
          className="mt-3 px-4 py-2 bg-blue-600 text-white font-bold rounded-xl text-xs"
        >
          Back to Patient List
        </button>
      </div>
    );
  }

  const { patient, visits, consultations, treatments, labResults, invoices, payments, followups, prescriptions = [] } = data;

  const validInvoices = invoices || [];
  const validPayments = payments || [];

  // Financial Calculations according to strict rules:
  // Total Cost = Sum of all approved patient charges
  const totalCost = validInvoices.reduce((acc, inv) => {
    const invSubtotal = Number(inv.subtotal);
    if (!isNaN(invSubtotal) && invSubtotal > 0) return acc + invSubtotal;
    if (inv.items && inv.items.length > 0) {
      return acc + inv.items.reduce((itemAcc, i) => itemAcc + (Number(i.total_price) || 0), 0);
    }
    return acc + (Number(inv.total_amount) || 0);
  }, 0);

  // Total Discount = Sum of all approved discounts
  const totalDiscount = validInvoices.reduce((acc, inv) => acc + (Number(inv.discount) || 0), 0);

  // Net Patient Cost = Total Cost - Total Discount
  const netPatientCost = Math.max(0, totalCost - totalDiscount);

  // Total Paid = Sum of all successful/completed payments
  const totalPaid = validPayments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);

  // Pending Payment = Net Patient Cost - Total Paid
  const pendingPayment = Math.max(0, netPatientCost - totalPaid);

  // Map invoices into normalized financial transaction ledger rows
  const financialTransactions = validInvoices.map((inv) => {
    const originalAmount = Number(inv.subtotal) || (inv.items?.reduce((s, i) => s + (Number(i.total_price) || 0), 0)) || Number(inv.total_amount) || 0;
    const discount = Number(inv.discount) || 0;
    const netAmount = Math.max(0, originalAmount - discount);
    const paid = Number(inv.paid_amount) || 0;
    const pending = Math.max(0, netAmount - paid);

    let status = 'PENDING';
    if (inv.status === 'Cancelled') {
      status = 'CANCELLED / VOID';
    } else if (pending <= 0 && netAmount > 0) {
      status = 'PAID';
    } else if (paid > 0 && pending > 0) {
      status = 'PARTIALLY PAID';
    } else if (discount > 0 && netAmount === 0) {
      status = 'DISCOUNT';
    } else {
      status = 'PENDING';
    }

    const itemDescriptions = inv.items && inv.items.length > 0
      ? inv.items.map(i => i.description || i.item_type).join(', ')
      : 'Dental Services & Consultation';

    const docName = inv.doctor_id?.full_name || inv.visit_id?.doctor_id?.full_name;
    const cleanDoc = docName ? (docName.startsWith('Dr.') ? docName : `Dr. ${docName}`) : 'Clinic Staff';

    return {
      _id: inv._id,
      invoice_number: inv.invoice_number,
      date: inv.invoice_date || inv.createdAt,
      description: itemDescriptions,
      originalAmount,
      discount,
      netAmount,
      paid,
      pending,
      paymentMethod: inv.payment_method || 'Cash',
      status,
      receivedBy: cleanDoc,
      rawInvoice: inv
    };
  });

  // Filtered transactions
  const filteredTransactions = financialTransactions.filter(tx => {
    if (financialFilter === 'Pending' && tx.pending <= 0) return false;
    if (financialFilter === 'Partially Paid' && tx.status !== 'PARTIALLY PAID') return false;
    if (financialFilter === 'Paid' && tx.status !== 'PAID') return false;
    if (financialFilter === 'Discount' && tx.discount <= 0 && tx.status !== 'DISCOUNT') return false;
    if (financialFilter === 'Cancelled/Void' && tx.status !== 'CANCELLED / VOID') return false;

    if (financialSearch.trim()) {
      const q = financialSearch.toLowerCase();
      const matchInv = tx.invoice_number?.toLowerCase().includes(q);
      const matchDesc = tx.description?.toLowerCase().includes(q);
      const matchStaff = tx.receivedBy?.toLowerCase().includes(q);
      if (!matchInv && !matchDesc && !matchStaff) return false;
    }
    return true;
  });

  // Count summaries for filters
  const pendingCount = financialTransactions.filter(t => t.pending > 0).length;
  const partialCount = financialTransactions.filter(t => t.status === 'PARTIALLY PAID').length;
  const paidCount = financialTransactions.filter(t => t.status === 'PAID').length;
  const discountCount = financialTransactions.filter(t => t.discount > 0 || t.status === 'DISCOUNT').length;
  const voidCount = financialTransactions.filter(t => t.status === 'CANCELLED / VOID').length;

  const handleOpenPaymentForInvoice = (inv) => {
    setSelectedInvoice(inv);
    const bal = inv.balance !== undefined ? inv.balance : Math.max(0, (inv.total_amount || 0) - (inv.paid_amount || 0));
    setPaymentAmount(bal > 0 ? bal : 0);
    setCashierDiscount(0);
    setIsPaymentModalOpen(true);
  };

  const handleOpenGeneralPayment = () => {
    if (validInvoices.length === 0) {
      alert('No invoice found to receive payment against.');
      return;
    }
    const pendingInv = validInvoices.find(inv => (inv.balance || 0) > 0) || validInvoices[0];
    handleOpenPaymentForInvoice(pendingInv);
  };

  // Financial calculations for selected invoice in POS Modal
  const modalInvItems = selectedInvoice?.items || [];
  const modalTreatmentItems = modalInvItems.filter(item => ['Treatment', 'Consultation'].includes(item.item_type));
  const modalAdditionalItems = modalInvItems.filter(item => !['Treatment', 'Consultation'].includes(item.item_type));
  
  const mTreatmentCost = modalTreatmentItems.length > 0
    ? modalTreatmentItems.reduce((acc, item) => acc + (Number(item.total_price) || 0), 0)
    : Number(selectedInvoice?.subtotal || 0);

  const mAdditionalCosts = modalAdditionalItems.length > 0
    ? modalAdditionalItems.reduce((acc, item) => acc + (Number(item.total_price) || 0), 0)
    : Math.max(0, Number(selectedInvoice?.subtotal || 0) - mTreatmentCost);

  const mTotalPatientCost = Number(selectedInvoice?.subtotal || (mTreatmentCost + mAdditionalCosts) || 0);
  const mPreviouslyPaid = Number(selectedInvoice?.paid_amount || 0);
  const mApprovedDiscount = Number(selectedInvoice?.discount || 0);
  
  const mBaseOutstanding = Math.max(0, mTotalPatientCost - mPreviouslyPaid - mApprovedDiscount);
  const mCurrentCashierDiscount = Math.max(0, Number(cashierDiscount) || 0);
  const mCashierDiscountExceeded = mCurrentCashierDiscount > mBaseOutstanding + 0.001;

  const mEffectiveOutstanding = Math.max(0, mBaseOutstanding - mCurrentCashierDiscount);
  const mMaxPaymentAllowed = mEffectiveOutstanding;

  const mPayingNow = Number(paymentAmount) || 0;
  const mPaymentExceeded = mPayingNow > mMaxPaymentAllowed + 0.001;
  const mIsZeroPayment = mPayingNow <= 0 && mEffectiveOutstanding > 0;
  const mRemainingBalance = Math.max(0, mEffectiveOutstanding - mPayingNow);

  const handleProcessPayment = async (e) => {
    e.preventDefault();
    if (mPaymentExceeded) {
      alert(`Payment amount cannot exceed the patient's pending balance of $${mMaxPaymentAllowed.toFixed(2)}.`);
      return;
    }
    if (mCashierDiscountExceeded) {
      alert(`Cashier discount cannot exceed the outstanding balance of $${mBaseOutstanding.toFixed(2)}.`);
      return;
    }
    if (mIsZeroPayment) {
      alert('Payment amount must be greater than $0.00.');
      return;
    }

    setSubmittingPayment(true);
    try {
      const res = await recordPaymentApi({
        invoice_id: selectedInvoice._id,
        patient_id: patient._id,
        visit_id: selectedInvoice.visit_id?._id || selectedInvoice.visit_id,
        amount: Number(paymentAmount),
        discount: Number(cashierDiscount || 0),
        payment_method: paymentMethod,
        payment_category: 'Final Bill / Consolidated',
        notes: `Paid at patient profile for invoice ${selectedInvoice.invoice_number}${cashierDiscount > 0 ? ` (Cashier Discount: $${Number(cashierDiscount).toFixed(2)})` : ''}`
      });
      setIsPaymentModalOpen(false);
      fetchHistory();
      if (res.data?.data) {
        setCurrentPayment(res.data.data);
        setIsReceiptModalOpen(true);
      }
    } catch (err) {
      console.error('Error processing payment:', err);
      alert(err.response?.data?.message || 'Error recording payment');
    } finally {
      setSubmittingPayment(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 no-print">
        <button
          onClick={() => navigate('/patients')}
          className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-2xs cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Patients
        </button>

        <div className="flex items-center gap-3">
          {user?.role === 'Admin' && (
            <button
              onClick={handleDeletePatient}
              disabled={deleting}
              className="flex items-center gap-2 px-3.5 py-2.5 bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-600 text-xs font-bold rounded-xl border border-rose-200 shadow-xs transition cursor-pointer disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              <span>{deleting ? 'Deleting...' : 'Delete Patient'}</span>
            </button>
          )}

          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print Complete Medical Report</span>
          </button>
        </div>
      </div>

      {/* Printable Patient Medical Dossier */}
      <div id="printable-area" className="space-y-6">
        
        {/* Official Header with Logo */}
        <div className="bg-white rounded-3xl p-5 sm:p-8 border border-slate-100 shadow-xs space-y-6">
          
          {/* Header block with Logo */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 border-b border-slate-100 pb-6 text-center sm:text-left">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <img
                src="/logo.png"
                alt="SNAB Dental and Dermatologic Clinic"
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border-2 border-amber-500 shadow-md shrink-0"
              />
              <div>
                <h2 className="text-base sm:text-xl font-black text-slate-900 uppercase tracking-tight">
                  SNAB DENTAL AND DERMATOLOGIC CLINIC
                </h2>
                <p className="text-xs font-bold text-amber-600 uppercase">Patient Medical History & Treatment Record</p>
                <p className="text-[11px] text-slate-500">Mogadishu, KM4 • Tel: +252 61 5000000 • info@snabdental.com</p>
              </div>
            </div>

            <div className="bg-blue-50/80 p-3 rounded-2xl border border-blue-100 text-center sm:text-right">
              <span className="text-[10px] font-bold text-blue-600 uppercase block">Patient File Number</span>
              <span className="font-mono text-base font-black text-blue-900">{patient.patient_number}</span>
            </div>
          </div>

          {/* Patient Bio Information */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs">
            <div>
              <span className="text-slate-400 text-[10px] font-bold uppercase block">Full Name</span>
              <span className="font-bold text-slate-900 text-sm">{patient.name}</span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] font-bold uppercase block">Age / Gender</span>
              <span className="font-semibold text-slate-800">{patient.age} years • {patient.gender}</span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] font-bold uppercase block">Telephone</span>
              <span className="font-bold text-slate-800">{patient.telephone}</span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] font-bold uppercase block">Registration Date</span>
              <span className="font-medium text-slate-700">{new Date(patient.registration_date).toLocaleDateString()}</span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] font-bold uppercase block">Address / District</span>
              <span className="font-medium text-slate-700">{patient.address || 'Mogadishu'}</span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] font-bold uppercase block">Emergency Contact</span>
              <span className="font-medium text-slate-700">
                {patient.emergency_contact?.name ? `${patient.emergency_contact.name} (${patient.emergency_contact.phone})` : 'None'}
              </span>
            </div>
          </div>

          {/* Medical Alerts Bar */}
          <div className="p-4 bg-rose-50/60 rounded-2xl border border-rose-100 text-xs">
            <div className="flex items-center gap-2 font-bold text-rose-900 mb-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              Medical Screening & Alert Summary
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-slate-700">
              <div>
                <span className="text-slate-400 text-[10px] block font-bold uppercase">Blood Group</span>
                <span className="font-bold text-slate-900">{patient.medical_info?.blood_group || 'Not recorded'}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block font-bold uppercase">Known Allergies</span>
                <span className="font-semibold text-rose-700">
                  {patient.medical_info?.allergies?.length > 0 ? patient.medical_info.allergies.join(', ') : 'None Reported'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block font-bold uppercase">Bleeding Risk</span>
                <span className="font-semibold">
                  {patient.medical_info?.bleeding_disorder ? '⚠️ Bleeding disorder flagged' : 'Normal'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block font-bold uppercase">Pregnancy Status</span>
                <span className="font-semibold">
                  {patient.medical_info?.pregnant ? '🤰 Currently pregnant' : 'No'}
                </span>
              </div>
            </div>
          </div>

          {/* Tabs Navigation (hidden on print) */}
          <div className="flex gap-2 border-b border-slate-100 pb-2 no-print overflow-x-auto">
            {[
              { id: 'overview', label: `Visits & Consultations (${visits.length})` },
              { id: 'treatments', label: `Dental Treatments (${treatments.length})` },
              { id: 'prescriptions', label: `Prescriptions & Pharmacy (${prescriptions.length})` },
              { id: 'lab', label: `Lab Results (${labResults.length})` },
              { id: 'billing', label: `Financial Summary & Receipts (${financialTransactions.length || payments.length})` },
              { id: 'followups', label: `Follow-ups (${followups.length})` }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab 1: Visits & Consultations */}
          {(activeTab === 'overview' || window.matchMedia('print').matches) && (
            <div className="space-y-4">
              <h3 className="text-sm sm:text-base font-bold text-slate-900">Visits & Clinical Consultations</h3>
              {visits.length === 0 ? (
                <p className="text-xs text-slate-400 py-4">No clinic visits recorded for this patient.</p>
              ) : (
                <div className="space-y-4">
                  {visits.map(v => {
                    const consult = consultations.find(c => c.visit_id?.toString() === v._id?.toString());
                    return (
                      <div key={v._id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-3">
                        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-900 text-sm">{v.visit_number}</span>
                            <span className="text-slate-400">• {new Date(v.visit_date).toLocaleString()}</span>
                          </div>
                          <StatusBadge status={v.status} />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-white p-3 rounded-xl border border-slate-100">
                          <div>
                            <span className="text-slate-400 text-[10px] font-bold uppercase block">Doctor Assigned</span>
                            <span className="font-bold text-slate-800">{v.doctor_id?.full_name || v.doctor_id?.username}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 text-[10px] font-bold uppercase block">Chief Complaint</span>
                            <span className="font-medium text-slate-700">{v.complaint || v.reason || 'General Checkup'}</span>
                          </div>
                        </div>

                        {consult && (
                          <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 space-y-2">
                            <span className="font-bold text-blue-900 uppercase text-[10px] block">Doctor Clinical Diagnosis</span>
                            <p className="font-bold text-slate-900">{consult.diagnosis?.primary_diagnosis}</p>
                            {consult.examination?.clinical_observations && (
                              <p className="text-slate-600 text-[11px]">Obs: {consult.examination.clinical_observations}</p>
                            )}
                            {consult.prescriptions?.length > 0 && (
                              <div className="pt-2 border-t border-blue-100">
                                <span className="font-bold text-blue-800 text-[10px] block">Prescriptions:</span>
                                {consult.prescriptions.map((p, i) => (
                                  <div key={i} className="text-[11px] text-slate-700">
                                    • <span className="font-semibold">{p.medication_name}</span> ({p.dosage} - {p.frequency} for {p.duration})
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Treatments */}
          {(activeTab === 'treatments' || window.matchMedia('print').matches) && (
            <div className="space-y-4">
              <h3 className="text-sm sm:text-base font-bold text-slate-900">Dental Treatments & Procedures History</h3>
              {treatments.length === 0 ? (
                <p className="text-xs text-slate-400 py-4">No treatments recorded yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase">
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Service / Procedure</th>
                        <th className="py-2.5 px-3">Tooth #</th>
                        <th className="py-2.5 px-3">Doctor</th>
                        <th className="py-2.5 px-3 text-right">Cost</th>
                        <th className="py-2.5 px-3 text-right">Payment</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {treatments.map(t => (
                        <tr key={t._id}>
                          <td className="py-3 px-3 text-slate-500">{new Date(t.treatment_date).toLocaleDateString()}</td>
                          <td className="py-3 px-3 font-bold text-slate-900">
                            {t.service_name}
                            {t.treatment_notes && <span className="block text-[10px] text-slate-400 font-normal">{t.treatment_notes}</span>}
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-blue-600">{t.tooth_number}</td>
                          <td className="py-3 px-3 text-slate-700">{t.doctor_id?.full_name}</td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">${t.price.toFixed(2)}</td>
                          <td className="py-3 px-3 text-right">
                            <StatusBadge status={t.payment_status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Lab Results */}
          {(activeTab === 'lab' || window.matchMedia('print').matches) && (
            <div className="space-y-4">
              <h3 className="text-sm sm:text-base font-bold text-slate-900">Laboratory Results Archive</h3>
              {labResults.length === 0 ? (
                <p className="text-xs text-slate-400 py-4">No lab results found.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {labResults.map(r => (
                    <div key={r._id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-900 text-sm">{r.test_name}</span>
                        <StatusBadge status={r.verification_status} />
                      </div>
                      <div className="bg-white p-3 rounded-xl border border-slate-100 space-y-1">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Test Result:</span>
                          <span className="font-mono font-bold text-blue-700">{r.result}</span>
                        </div>
                        {r.reference_range && (
                          <div className="flex justify-between text-[11px] text-slate-500">
                            <span>Reference Range:</span>
                            <span>{r.reference_range}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-[11px] text-slate-500">
                          <span>Interpretation:</span>
                          <span className="font-semibold text-slate-800">{r.clinical_interpretation}</span>
                        </div>
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-400 pt-1">
                        <span>Staff: {r.performed_by}</span>
                        <span>{new Date(r.result_date).toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab: Prescriptions & Pharmacy */}
          {activeTab === 'prescriptions' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                    <Pill className="w-4 h-4 text-purple-600" />
                    <span>Prescriptions & Pharmacy History</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Medications prescribed by attending doctors, dosage, directions, and pharmacy purchase status
                  </p>
                </div>
              </div>

              {prescriptions.length === 0 ? (
                <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200 p-6">
                  <Pill className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-700">No prescriptions on record</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">When doctors prescribe medications, they will appear here.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {prescriptions.map((rx) => (
                    <div key={rx._id} className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-2.5 border-b border-slate-100">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold text-xs font-mono">
                            Rx
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-purple-900 text-xs">{rx.prescription_number}</span>
                              <span className="text-slate-300">•</span>
                              <span className="text-xs text-slate-600 font-medium">
                                Prescribed by <strong>Dr. {rx.doctor_id?.full_name || rx.doctor_id?.username}</strong>
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400">
                              Visit: {rx.visit_id?.visit_number || 'VIS'} • {new Date(rx.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <StatusBadge status={rx.payment_status === 'Paid' ? 'Paid' : (rx.status === 'Dispensed' ? 'Dispensed' : 'Unpaid')} />
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left">
                          <thead>
                            <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                              <th className="pb-1.5">Medicine</th>
                              <th className="pb-1.5">Dose</th>
                              <th className="pb-1.5">Frequency</th>
                              <th className="pb-1.5">Duration</th>
                              <th className="pb-1.5 text-center">Qty</th>
                              <th className="pb-1.5 text-right">Price</th>
                              <th className="pb-1.5 text-right">Purchase Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {rx.items?.map((item, idx) => (
                              <tr key={idx} className="hover:bg-slate-50/50">
                                <td className="py-2 font-bold text-slate-900">
                                  <span>{item.medicine_name}</span>
                                  {item.instructions && (
                                    <span className="block text-[10px] text-slate-400 font-normal">{item.instructions}</span>
                                  )}
                                </td>
                                <td className="py-2 font-mono text-slate-700">{item.dosage || '500 mg'}</td>
                                <td className="py-2 text-slate-600">{item.frequency || '3× daily'}</td>
                                <td className="py-2 text-slate-600">{item.duration || '5 days'}</td>
                                <td className="py-2 text-center font-mono font-bold text-purple-700">{item.quantity}</td>
                                <td className="py-2 text-right font-mono font-bold text-slate-900">${Number(item.total_price || 0).toFixed(2)}</td>
                                <td className="py-2 text-right">
                                  <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold ${
                                    item.status === 'Dispensed' || item.is_purchased
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : item.status === 'Declined / External'
                                      ? 'bg-slate-100 text-slate-500'
                                      : 'bg-amber-100 text-amber-800'
                                  }`}>
                                    {item.status || 'Pending'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {rx.notes && (
                        <p className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-xl">
                          <strong>Notes:</strong> {rx.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 4: Patient Financial Summary & Complete Financial History */}
          {(activeTab === 'billing' || window.matchMedia('print').matches) && (
            <div className="space-y-6">
              
              {/* Header & Sub-action */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-blue-600" />
                    <span>Patient Financial Summary & Ledger</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Approved clinical charges, discounts, receipts, and current pending balance
                  </p>
                </div>

                {pendingPayment > 0 && (
                  <button
                    onClick={handleOpenGeneralPayment}
                    className="no-print flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md transition cursor-pointer"
                  >
                    <Receipt className="w-4 h-4" />
                    <span>Collect Payment (${pendingPayment.toFixed(2)})</span>
                  </button>
                )}
              </div>

              {/* 1. Four Top Summary KPI Cards + Net Patient Cost */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* Total Cost */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
                  <div className="flex justify-between items-center text-slate-500">
                    <span className="text-[10px] uppercase font-bold tracking-wider">Total Cost</span>
                    <DollarSign className="w-4 h-4 text-slate-400" />
                  </div>
                  <p className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
                    ${totalCost.toFixed(2)}
                  </p>
                  <span className="text-[10px] text-slate-400 block">Total approved charges</span>
                </div>

                {/* Total Discount */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
                  <div className="flex justify-between items-center text-emerald-700">
                    <span className="text-[10px] uppercase font-bold tracking-wider">Total Discount</span>
                    <Percent className="w-4 h-4 text-emerald-600" />
                  </div>
                  <p className="text-xl sm:text-2xl font-black text-emerald-700 font-mono">
                    {totalDiscount > 0 ? `-$${totalDiscount.toFixed(2)}` : '$0.00'}
                  </p>
                  <span className="text-[10px] text-slate-400 block">Approved clinic discounts</span>
                </div>

                {/* Total Paid */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
                  <div className="flex justify-between items-center text-blue-700">
                    <span className="text-[10px] uppercase font-bold tracking-wider">Total Paid</span>
                    <Receipt className="w-4 h-4 text-blue-600" />
                  </div>
                  <p className="text-xl sm:text-2xl font-black text-blue-700 font-mono">
                    ${totalPaid.toFixed(2)}
                  </p>
                  <span className="text-[10px] text-slate-400 block">Completed payments</span>
                </div>

                {/* Pending Payment */}
                <div className={`p-4 rounded-2xl border shadow-sm space-y-1 ${
                  pendingPayment > 0
                    ? 'bg-rose-50 border-rose-200 text-rose-950'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-950'
                }`}>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] uppercase font-black tracking-wider">
                      {pendingPayment > 0 ? '⚠️ Pending Payment' : '✓ Paid In Full'}
                    </span>
                    <Clock className={`w-4 h-4 ${pendingPayment > 0 ? 'text-rose-600' : 'text-emerald-600'}`} />
                  </div>
                  <p className={`text-xl sm:text-2xl font-black font-mono ${
                    pendingPayment > 0 ? 'text-rose-600' : 'text-emerald-600'
                  }`}>
                    ${pendingPayment.toFixed(2)}
                  </p>
                  <span className="text-[10px] block font-semibold opacity-80">
                    {pendingPayment > 0 ? 'Amount currently owed' : 'No balance remaining'}
                  </span>
                </div>
              </div>

              {/* Net Patient Cost Calculation Summary Strip */}
              <div className="p-3 bg-slate-900 text-white rounded-2xl shadow-xs flex flex-wrap justify-between items-center gap-2 text-xs font-mono">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400 font-sans font-bold">Ledger Balance Formula:</span>
                  <span className="text-slate-300">Total Cost (${totalCost.toFixed(2)})</span>
                  <span className="text-emerald-400">- Discount (${totalDiscount.toFixed(2)})</span>
                  <span className="text-slate-400">= Net Cost (${netPatientCost.toFixed(2)})</span>
                  <span className="text-blue-400">- Paid (${totalPaid.toFixed(2)})</span>
                </div>
                <div className="font-bold flex items-center gap-2">
                  <span className="text-slate-300 font-sans">Pending Balance:</span>
                  <span className={`text-sm font-black ${pendingPayment > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    ${pendingPayment.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* View Switcher & Filters (no-print) */}
              <div className="space-y-3 no-print">
                {/* Mode Selector */}
                <div className="flex flex-wrap justify-between items-center gap-3">
                  <div className="flex bg-slate-100 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setFinancialViewMode('ledger')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                        financialViewMode === 'ledger'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Complete Financial Ledger ({financialTransactions.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFinancialViewMode('receipts')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                        financialViewMode === 'receipts'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Payment Receipts History ({validPayments.length})
                    </button>
                  </div>

                  {/* Search */}
                  <div className="bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 flex items-center gap-2 w-full sm:w-72">
                    <Search className="w-3.5 h-3.5 text-slate-400" />
                    <input
                      type="text"
                      value={financialSearch}
                      onChange={(e) => setFinancialSearch(e.target.value)}
                      placeholder="Search transactions, bills..."
                      className="w-full text-xs bg-transparent focus:outline-none"
                    />
                  </div>
                </div>

                {/* Filter Pills for Ledger */}
                {financialViewMode === 'ledger' && (
                  <div className="flex gap-1.5 overflow-x-auto pb-1">
                    {[
                      { id: 'All', label: `All (${financialTransactions.length})` },
                      { id: 'Pending', label: `Pending (${pendingCount})` },
                      { id: 'Partially Paid', label: `Partially Paid (${partialCount})` },
                      { id: 'Paid', label: `Paid (${paidCount})` },
                      { id: 'Discount', label: `Discount (${discountCount})` },
                      { id: 'Cancelled/Void', label: `Cancelled/Void (${voidCount})` }
                    ].map(f => (
                      <button
                        key={f.id}
                        onClick={() => setFinancialFilter(f.id)}
                        className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                          financialFilter === f.id
                            ? 'bg-slate-900 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 2. Complete Financial History Table (View Mode: ledger) */}
              {financialViewMode === 'ledger' && (
                <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-xs">
                  {filteredTransactions.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 text-xs bg-white">
                      No financial transactions match the selected filter.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead>
                          <tr className="bg-slate-50/90 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider">
                            <th className="py-3 px-4">Trans / Inv #</th>
                            <th className="py-3 px-3">Date</th>
                            <th className="py-3 px-3">Description / Services</th>
                            <th className="py-3 px-3 text-right">Original</th>
                            <th className="py-3 px-3 text-right">Discount</th>
                            <th className="py-3 px-3 text-right">Net</th>
                            <th className="py-3 px-3 text-right">Paid</th>
                            <th className="py-3 px-3 text-right">Pending</th>
                            <th className="py-3 px-3 text-center">Status</th>
                            <th className="py-3 px-3">Staff</th>
                            <th className="py-3 px-4 text-right no-print">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white font-medium">
                          {filteredTransactions.map((tx) => (
                            <tr key={tx._id} className="hover:bg-slate-50/80 transition">
                              <td className="py-3 px-4 font-mono font-bold text-blue-600">
                                {tx.invoice_number}
                              </td>
                              <td className="py-3 px-3 text-slate-500">
                                {new Date(tx.date).toLocaleDateString()}
                              </td>
                              <td className="py-3 px-3 font-semibold text-slate-800 max-w-xs truncate" title={tx.description}>
                                {tx.description}
                              </td>
                              <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                                ${tx.originalAmount.toFixed(2)}
                              </td>
                              <td className="py-3 px-3 text-right font-mono text-emerald-700 font-semibold">
                                {tx.discount > 0 ? `-$${tx.discount.toFixed(2)}` : '—'}
                              </td>
                              <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                                ${tx.netAmount.toFixed(2)}
                              </td>
                              <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600">
                                ${tx.paid.toFixed(2)}
                              </td>
                              <td className="py-3 px-3 text-right font-mono font-bold text-rose-600">
                                ${tx.pending.toFixed(2)}
                              </td>
                              <td className="py-3 px-3 text-center">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                  tx.status === 'PAID'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : tx.status === 'PARTIALLY PAID'
                                    ? 'bg-amber-100 text-amber-800'
                                    : tx.status === 'DISCOUNT'
                                    ? 'bg-blue-100 text-blue-800'
                                    : tx.status === 'CANCELLED / VOID'
                                    ? 'bg-slate-100 text-slate-600'
                                    : 'bg-rose-100 text-rose-800'
                                }`}>
                                  {tx.status}
                                </span>
                              </td>
                              <td className="py-3 px-3 text-slate-600 text-[11px]">
                                {tx.receivedBy}
                              </td>
                              <td className="py-3 px-4 text-right space-x-1.5 no-print whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedInvoice(tx.rawInvoice);
                                    setIsInvoiceDetailOpen(true);
                                  }}
                                  className="px-2 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 font-bold text-slate-700 rounded-lg transition cursor-pointer text-xs"
                                >
                                  View Bill
                                </button>
                                {tx.pending > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenPaymentForInvoice(tx.rawInvoice)}
                                    className="px-2 py-1 bg-emerald-50 hover:bg-emerald-600 hover:text-white font-bold text-emerald-700 rounded-lg transition cursor-pointer text-xs"
                                  >
                                    Pay Now
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* 3. Payment Receipts History (View Mode: receipts) */}
              {financialViewMode === 'receipts' && (
                <div className="space-y-3">
                  {validPayments.length === 0 ? (
                    <p className="text-xs text-slate-400 py-6 text-center">No payment receipts recorded for this patient.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {validPayments.map(p => (
                        <div key={p._id} className="p-4 rounded-2xl bg-white border border-slate-200 text-xs shadow-xs space-y-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-black text-slate-900 text-sm">{p.receipt_number}</span>
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800">
                                  PAID
                                </span>
                              </div>
                              <span className="text-[11px] text-slate-400 block mt-0.5">
                                {new Date(p.payment_date).toLocaleString()}
                              </span>
                            </div>
                            <span className="text-lg font-black text-emerald-600 font-mono">${p.amount.toFixed(2)}</span>
                          </div>

                          <div className="bg-slate-50 p-2.5 rounded-xl space-y-1 text-slate-600">
                            <div className="flex justify-between">
                              <span>Category:</span>
                              <span className="font-bold text-slate-800">{p.payment_category}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Payment Method:</span>
                              <span className="font-semibold text-slate-800">{p.payment_method}</span>
                            </div>
                            {p.discount > 0 && (
                              <div className="flex justify-between text-emerald-700">
                                <span>Discount Recorded:</span>
                                <span className="font-bold font-mono">-${p.discount.toFixed(2)}</span>
                              </div>
                            )}
                            <div className="flex justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-200">
                              <span>Received by:</span>
                              <span className="font-medium text-slate-700">{p.received_by?.full_name || p.received_by_name || 'Cashier'}</span>
                            </div>
                          </div>

                          <div className="flex justify-end pt-1 no-print">
                            <button
                              type="button"
                              onClick={() => {
                                setCurrentPayment(p);
                                setIsReceiptModalOpen(true);
                              }}
                              className="px-3 py-1.5 bg-blue-50 hover:bg-blue-600 hover:text-white font-bold text-blue-700 rounded-xl transition text-xs inline-flex items-center gap-1.5 cursor-pointer"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>Print Receipt</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

            </div>
          )}

          {/* Tab 5: Follow-ups */}
          {(activeTab === 'followups' || window.matchMedia('print').matches) && (
            <div className="space-y-4">
              <h3 className="text-sm sm:text-base font-bold text-slate-900">Follow-up Appointments & Recalls</h3>
              {followups.length === 0 ? (
                <p className="text-xs text-slate-400 py-4">No follow-ups scheduled for this patient.</p>
              ) : (
                <div className="space-y-3">
                  {followups.map(f => (
                    <div key={f._id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-blue-600" />
                          <span className="font-bold text-slate-900 text-sm">
                            Due Date: {new Date(f.followup_date).toLocaleDateString()}
                          </span>
                        </div>
                        <StatusBadge status={f.status} />
                      </div>
                      <div className="bg-white p-3 rounded-xl border border-slate-100 space-y-1.5">
                        <div>
                          <span className="text-slate-400 text-[10px] font-bold uppercase block">Reason / Follow-up Plan</span>
                          <span className="font-semibold text-slate-800 text-xs">{f.reason || 'Post-operative check-up'}</span>
                        </div>
                        <div className="flex justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-50">
                          <span>Doctor Assigned: Dr. {f.doctor_id?.full_name || f.doctor_id?.username || 'Attending Doctor'}</span>
                          <span>Created: {new Date(f.createdAt || Date.now()).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

      </div>

      {/* 1. View Invoice Bill Modal */}
      <Modal
        isOpen={isInvoiceDetailOpen}
        onClose={() => setIsInvoiceDetailOpen(false)}
        icon={FileText}
        title={`Invoice Breakdown: ${selectedInvoice?.invoice_number || ''}`}
        subtitle={`Issued on ${selectedInvoice?.invoice_date ? new Date(selectedInvoice.invoice_date).toLocaleDateString() : '—'}`}
        maxWidth="max-w-xl"
      >
        {selectedInvoice && (
          <div className="space-y-4 text-xs">
            {/* Header info */}
            <div className="bg-slate-50 p-3 rounded-xl flex justify-between items-center text-slate-700">
              <div>
                <p className="font-bold text-slate-900">{patient.name}</p>
                <p className="text-[11px] text-slate-400 font-mono">{patient.patient_number} • {patient.telephone}</p>
              </div>
              <div className="text-right">
                <StatusBadge status={selectedInvoice.status || (selectedInvoice.balance <= 0 ? 'Paid' : 'Unpaid')} />
                <p className="text-[11px] text-slate-400 font-mono mt-0.5">{selectedInvoice.invoice_number}</p>
              </div>
            </div>

            {/* Line Items */}
            <div className="border rounded-xl overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-100/70 border-b text-slate-600 font-bold uppercase text-[10px]">
                    <th className="p-2 text-left">Item / Description</th>
                    <th className="p-2 text-center">Type</th>
                    <th className="p-2 text-center">Qty</th>
                    <th className="p-2 text-right">Price</th>
                    <th className="p-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedInvoice.items?.map((item, idx) => (
                    <tr key={idx}>
                      <td className="p-2 font-semibold text-slate-800">{item.description || item.item_name}</td>
                      <td className="p-2 text-center text-slate-500">{item.item_type}</td>
                      <td className="p-2 text-center">{item.quantity || 1}</td>
                      <td className="p-2 text-right font-mono">${(item.unit_price || item.total_price || 0).toFixed(2)}</td>
                      <td className="p-2 text-right font-mono font-bold">${(item.total_price || 0).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals Breakdown */}
            <div className="bg-slate-900 text-white p-3.5 rounded-2xl space-y-1.5 font-medium">
              <div className="flex justify-between text-slate-300">
                <span>Subtotal:</span>
                <span className="font-mono font-bold text-white">${(Number(selectedInvoice.subtotal) || Number(selectedInvoice.total_amount) || 0).toFixed(2)}</span>
              </div>
              {selectedInvoice.discount > 0 && (
                <div className="flex justify-between text-emerald-400">
                  <span>Approved Discount:</span>
                  <span className="font-mono font-bold">-${Number(selectedInvoice.discount).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-100 font-bold pt-1 border-t border-slate-800">
                <span>Total Amount:</span>
                <span className="font-mono text-white font-black">${(Number(selectedInvoice.total_amount) || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-emerald-400 font-bold">
                <span>Previously Paid:</span>
                <span className="font-mono">${(Number(selectedInvoice.paid_amount) || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-black text-sm pt-1 border-t border-slate-800">
                <span>Balance Due:</span>
                <span className={`font-mono ${(Number(selectedInvoice.balance) || 0) > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  ${(Number(selectedInvoice.balance) || 0).toFixed(2)}
                </span>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2 border-t">
              <button
                type="button"
                onClick={() => setIsInvoiceDetailOpen(false)}
                className="px-4 py-2 bg-slate-100 rounded-xl font-bold text-slate-700"
              >
                Close
              </button>
              {(Number(selectedInvoice.balance) || 0) > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setIsInvoiceDetailOpen(false);
                    handleOpenPaymentForInvoice(selectedInvoice);
                  }}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md"
                >
                  Pay Balance (${(Number(selectedInvoice.balance) || 0).toFixed(2)})
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* 2. Cashier POS: Receive Payment Modal */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        icon={Receipt}
        title="Cashier POS: Receive Payment"
        subtitle="Collect payment against approved invoice balance. Invoices cannot be modified or increased here."
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleProcessPayment} className="space-y-4 text-xs">
          
          {/* Patient Financial Summary Card */}
          <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-md space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Patient Account</span>
                <p className="text-sm font-black text-white">{patient.name}</p>
                <p className="text-[11px] text-slate-400 font-mono">
                  {patient.patient_number} • Inv: {selectedInvoice?.invoice_number}
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Invoice Status</span>
                <p className={`text-xs font-bold ${
                  mEffectiveOutstanding <= 0 ? 'text-emerald-400' : 'text-amber-400'
                }`}>
                  {mEffectiveOutstanding <= 0 ? '✓ Paid in Full' : (selectedInvoice?.status || 'Unpaid')}
                </p>
              </div>
            </div>

            {/* Financial Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              <div className="p-2.5 bg-slate-800/80 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-bold">Total Treatment</span>
                <span className="font-mono font-bold text-xs text-slate-200">${mTreatmentCost.toFixed(2)}</span>
              </div>
              <div className="p-2.5 bg-slate-800/80 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-bold">Additional Costs</span>
                <span className="font-mono font-bold text-xs text-slate-200">${mAdditionalCosts.toFixed(2)}</span>
              </div>
              <div className="p-2.5 bg-slate-800/80 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-bold">Total Patient Cost</span>
                <span className="font-mono font-black text-xs text-white">${mTotalPatientCost.toFixed(2)}</span>
              </div>
              <div className="p-2.5 bg-slate-800/80 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-bold">Previously Paid</span>
                <span className="font-mono font-bold text-xs text-emerald-400">${mPreviouslyPaid.toFixed(2)}</span>
              </div>
            </div>

            {/* Outstanding Balance Banner */}
            <div className="p-3 bg-slate-800 rounded-xl flex justify-between items-center border border-slate-700/80">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Current Outstanding Balance</span>
                {mApprovedDiscount > 0 && (
                  <span className="text-[10px] text-emerald-400 block font-semibold">Includes previous discount: ${mApprovedDiscount.toFixed(2)}</span>
                )}
              </div>
              <span className={`font-mono text-lg font-black ${
                mEffectiveOutstanding > 0 ? 'text-rose-400' : 'text-emerald-400'
              }`}>
                ${mEffectiveOutstanding.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Payment Amount & Cashier Discount Input Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Payment Amount */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="font-bold text-slate-700">Payment Amount ($) *</label>
                <span className="text-[10px] font-bold text-slate-400 font-mono">Max: ${mMaxPaymentAllowed.toFixed(2)}</span>
              </div>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="number"
                  min="0.01"
                  max={mMaxPaymentAllowed}
                  step="0.01"
                  required
                  disabled={mEffectiveOutstanding <= 0}
                  value={paymentAmount}
                  onChange={(e) => {
                    const val = e.target.value;
                    setPaymentAmount(val);
                  }}
                  placeholder="0.00"
                  className={`w-full pl-9 pr-3.5 py-2.5 rounded-xl font-mono font-black text-base transition border ${
                    mPaymentExceeded
                      ? 'border-rose-500 bg-rose-50/50 text-rose-700 ring-1 ring-rose-500'
                      : 'border-slate-200 bg-white text-emerald-700 focus:border-emerald-500 focus:outline-none'
                  }`}
                />
              </div>
              {mPaymentExceeded && (
                <div className="p-2 mt-1.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 font-bold text-[11px] flex items-start gap-1.5">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                  <span>Payment amount cannot exceed the patient’s outstanding balance of ${mMaxPaymentAllowed.toFixed(2)}.</span>
                </div>
              )}
            </div>

            {/* Cashier Discount */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="font-bold text-emerald-800">Cashier Discount ($)</label>
                <span className="text-[10px] font-bold text-slate-400 font-mono">Max: ${mBaseOutstanding.toFixed(2)}</span>
              </div>
              <div className="relative">
                <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                <input
                  type="number"
                  min="0"
                  max={mBaseOutstanding}
                  step="0.01"
                  value={cashierDiscount}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCashierDiscount(val);
                    const numDiscount = Number(val) || 0;
                    const newMax = Math.max(0, mBaseOutstanding - numDiscount);
                    if (Number(paymentAmount) > newMax) {
                      setPaymentAmount(newMax > 0 ? newMax : 0);
                    }
                  }}
                  placeholder="0.00"
                  className={`w-full pl-9 pr-3.5 py-2.5 rounded-xl font-mono font-bold text-base transition border ${
                    mCashierDiscountExceeded
                      ? 'border-rose-500 bg-rose-50/50 text-rose-700 ring-1 ring-rose-500'
                      : 'border-emerald-200 bg-emerald-50/40 text-emerald-900 focus:border-emerald-500 focus:outline-none'
                  }`}
                />
              </div>
              {mCashierDiscountExceeded && (
                <div className="p-2 mt-1.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 font-bold text-[11px] flex items-start gap-1.5">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                  <span>Discount cannot exceed the outstanding balance of ${mBaseOutstanding.toFixed(2)}.</span>
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

          {/* Paying Now Breakdown & Confirmation Card */}
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
                <span className="font-bold text-slate-900">{patient.name}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Patient Cost:</span>
                <span className="font-mono text-slate-900">${mTotalPatientCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Previously Paid:</span>
                <span className="font-mono text-emerald-700">${mPreviouslyPaid.toFixed(2)}</span>
              </div>
              {(mApprovedDiscount > 0 || mCurrentCashierDiscount > 0) && (
                <div className="flex justify-between">
                  <span>Discount:</span>
                  <span className="font-mono text-emerald-700 font-bold">-${(mApprovedDiscount + mCurrentCashierDiscount).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Outstanding Balance:</span>
                <span className="font-mono font-bold text-slate-900">${mBaseOutstanding.toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-1.5 border-t border-slate-200 text-purple-950 font-bold">
                <span>Paying Now:</span>
                <span className="font-mono text-sm font-black text-purple-700">${mPayingNow.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-900 font-bold">
                <span>Balance Remaining:</span>
                <span className={`font-mono text-sm font-black ${mRemainingBalance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  ${mRemainingBalance.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Prevent Unauthorized Increase Notice */}
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
              disabled={submittingPayment || mPaymentExceeded || mCashierDiscountExceeded || mIsZeroPayment || mEffectiveOutstanding <= 0}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Receipt className="w-4 h-4" />
              <span>{submittingPayment ? 'Recording...' : 'Confirm & Print Receipt'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* 3. Receipt Modal */}
      <ReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        payment={currentPayment}
      />

    </div>
  );
};

export default PatientProfile;
