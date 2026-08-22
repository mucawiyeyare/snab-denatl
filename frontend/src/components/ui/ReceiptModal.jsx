import React from 'react';
import { Printer, CheckCircle, ArrowLeft, X } from 'lucide-react';

const ReceiptModal = ({ isOpen, onClose, payment }) => {
  if (!isOpen || !payment) return null;

  const handlePrint = () => {
    const patient = payment.patient_id || {};
    const visit   = payment.visit_id   || {};
    const invoice  = payment.invoice_id || {};
    const doctor   = payment.doctor_id || visit.doctor_id || invoice.doctor_id;
    const doctorName = doctor ? (doctor.full_name || doctor.username || (typeof doctor === 'string' ? doctor : '')) : '';

    const printWindow = window.open('', '_blank', 'width=794,height=1123');
    printWindow.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Receipt – ${payment.receipt_number || ''}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
    @page { size: A4 portrait; margin: 14mm 12mm; }

    * { box-sizing: border-box; margin: 0; padding: 0;
        font-family: 'Inter', Arial, sans-serif;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
        color-adjust: exact; }

    body { background: #ffffff; color: #1e293b; font-size: 12px;
           line-height: 1.5; padding: 24px; max-width: 580px; margin: 0 auto; }

    /* ── Header ── */
    .header { text-align: center; border-bottom: 1.5px dashed #cbd5e1;
               padding-bottom: 16px; margin-bottom: 16px; }
    .header img { width: 72px; height: 72px; border-radius: 50%;
                   object-fit: cover; border: 2.5px solid #f59e0b;
                   display: block; margin: 0 auto 8px; }
    .clinic-name { font-size: 15px; font-weight: 900; color: #0f172a;
                    text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 2px; }
    .clinic-subtitle { font-size: 10px; font-weight: 700; color: #d97706;
                        text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 2px; }
    .clinic-address { font-size: 10px; color: #64748b; }
    .clinic-email   { font-size: 9px;  color: #94a3b8; }

    /* ── Info Box ── */
    .info-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px;
                 padding: 12px 14px; margin-bottom: 14px; }
    .info-row { display: flex; justify-content: space-between; margin-bottom: 5px; }
    .info-row:last-child { margin-bottom: 0; }
    .info-label { color: #64748b; font-size: 11px; }
    .info-value { font-weight: 600; color: #0f172a; font-size: 11px; }
    .info-value.mono { font-family: 'Courier New', monospace; font-weight: 700; }
    .info-value.green { color: #059669; font-weight: 700; }

    /* ── Section heading ── */
    .section-title { font-size: 9px; font-weight: 700; color: #94a3b8;
                      text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 8px; }

    /* ── Patient details ── */
    .patient-section { border-bottom: 1px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 14px; }
    .patient-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .patient-field-label { color: #94a3b8; font-size: 10px; }
    .patient-field-value { font-weight: 700; color: #1e293b; font-size: 11px; }
    .patient-field-value.mono { font-family: 'Courier New', monospace; }

    /* ── Table ── */
    .breakdown-section { margin-bottom: 14px; }
    table { width: 100%; border-collapse: collapse; }
    thead tr { border-bottom: 1px solid #e2e8f0; }
    th { font-size: 10px; font-weight: 500; color: #64748b;
         padding: 6px 0; text-align: left; }
    th.right { text-align: right; }
    tbody tr { border-bottom: 1px solid #f1f5f9; }
    td { padding: 8px 0; font-size: 11px; color: #1e293b; font-weight: 500; vertical-align: top; }
    td.right { text-align: right; font-weight: 700; }
    .item-note { display: block; font-size: 9px; color: #94a3b8; margin-top: 2px; }

    /* ── Totals ── */
    .totals-section { border-top: 1px solid #e2e8f0; padding-top: 12px; margin-bottom: 20px; }
    .total-row { display: flex; justify-content: space-between; margin-bottom: 5px; }
    .total-row:last-child { margin-bottom: 0; }
    .total-label { font-size: 11px; color: #64748b; }
    .total-value { font-size: 11px; font-weight: 600; color: #334155; }
    .discount-label { color: #059669; font-weight: 700; font-size: 11px; }
    .discount-value { color: #059669; font-weight: 700; font-size: 11px; }
    .net-row { border-top: 1px solid #f1f5f9; padding-top: 6px; margin-top: 2px; }
    .net-label { font-size: 11px; font-weight: 700; color: #334155; }
    .net-value { font-size: 11px; font-weight: 700; color: #334155; }

    .paid-row { display: flex; justify-content: space-between; align-items: center;
                 margin-top: 8px; padding-top: 8px; border-top: 2px solid #e2e8f0; }
    .paid-label { font-size: 14px; font-weight: 900; color: #0f172a; }
    .paid-amount { font-size: 18px; font-weight: 900; color: #059669; }
    .balance-row { display: flex; justify-content: space-between; margin-top: 6px; }
    .balance-label { font-size: 10px; color: #64748b; }
    .balance-value { font-size: 10px; font-weight: 600; color: #334155; }

    /* ── Footer ── */
    .footer { text-align: center; border-top: 1.5px dashed #e2e8f0; padding-top: 12px; }
    .confirmed-badge { display: inline-flex; align-items: center; gap: 4px;
                        color: #059669; font-weight: 600; font-size: 11px; margin-bottom: 6px; }
    .confirmed-badge svg { width: 13px; height: 13px; }
    .footer-msg { font-size: 10px; color: #64748b; margin-bottom: 2px; }
    .footer-note { font-size: 9px; color: #94a3b8; font-style: italic; }
  </style>
</head>
<body>

  <!-- Header -->
  <div class="header">
    <img src="/logo.png" alt="SNAB Dental" onerror="this.style.display='none'" />
    <div class="clinic-name">SNAB DENTAL AND DERMATOLOGIC CLINIC</div>
    <div class="clinic-subtitle">Specialized Dental &amp; Dermatologic Care • Oral Surgery</div>
    <div class="clinic-address">Mogadishu Main Road, KM4 • Tel: +252 61 5000000</div>
    <div class="clinic-email">info@snabdental.com • www.snabdental.com</div>
  </div>

  <!-- Receipt Info -->
  <div class="info-box">
    <div class="info-row">
      <span class="info-label">Receipt No:</span>
      <span class="info-value mono">${payment.receipt_number || '—'}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Date &amp; Time:</span>
      <span class="info-value">${new Date(payment.payment_date).toLocaleString()}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Cashier:</span>
      <span class="info-value">${payment.received_by_name || payment.received_by?.full_name || 'Cashier'}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Payment Method:</span>
      <span class="info-value green">${payment.payment_method || '—'}</span>
    </div>
  </div>

  <!-- Patient Details -->
  <div class="patient-section">
    <div class="section-title">Patient Details</div>
    <div class="patient-grid">
      <div>
        <div class="patient-field-label">Patient Name:</div>
        <div class="patient-field-value">${patient.name || 'Walk-in Patient'}</div>
      </div>
      <div>
        <div class="patient-field-label">Patient ID:</div>
        <div class="patient-field-value mono">${patient.patient_number || 'N/A'}</div>
      </div>
      <div>
        <div class="patient-field-label">Phone:</div>
        <div class="patient-field-value">${patient.telephone || 'N/A'}</div>
      </div>
      <div>
        <div class="patient-field-label">Doctor:</div>
        <div class="patient-field-value">${doctorName ? `Dr. ${doctorName}` : 'Attending Doctor'}</div>
      </div>
      <div>
        <div class="patient-field-label">Visit No:</div>
        <div class="patient-field-value mono">${visit.visit_number || 'N/A'}</div>
      </div>
    </div>
  </div>

  <!-- Payment Breakdown -->
  <div class="breakdown-section">
    <div class="section-title">Payment Breakdown</div>
    <table>
      <thead>
        <tr>
          <th>Category / Item</th>
          <th class="right">Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            ${payment.payment_category || '—'}
            ${payment.notes ? `<span class="item-note">${payment.notes}</span>` : ''}
          </td>
          <td class="right">$${Number(payment.amount || 0).toFixed(2)}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- Totals -->
  <div class="totals-section">
    ${invoice.subtotal !== undefined && Number(invoice.discount) > 0 ? `
    <div class="total-row">
      <span class="total-label">Subtotal:</span>
      <span class="total-value">$${Number(invoice.subtotal).toFixed(2)}</span>
    </div>
    <div class="total-row">
      <span class="discount-label">Discount Applied:</span>
      <span class="discount-value">-$${Number(invoice.discount).toFixed(2)}</span>
    </div>
    <div class="total-row net-row">
      <span class="net-label">Net Total Amount:</span>
      <span class="net-value">$${Number(invoice.total_amount || (invoice.subtotal - invoice.discount)).toFixed(2)}</span>
    </div>
    ` : ''}

    <div class="paid-row">
      <span class="paid-label">AMOUNT PAID:</span>
      <span class="paid-amount">$${Number(payment.amount || 0).toFixed(2)}</span>
    </div>

    ${invoice.balance !== undefined ? `
    <div class="balance-row">
      <span class="balance-label">Remaining Invoice Balance:</span>
      <span class="balance-value">$${Number(invoice.balance).toFixed(2)}</span>
    </div>
    ` : ''}
  </div>

  <!-- Footer -->
  <div class="footer">
    <div class="confirmed-badge">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
           stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
        <polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
      Payment Recorded &amp; Confirmed
    </div>
    <div class="footer-msg">Thank you for choosing SNAB Dental &amp; Dermatologic Clinic!</div>
    <div class="footer-note">Keep this receipt for your treatment and medical records.</div>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
        window.onafterprint = function() { window.close(); };
      }, 400);
    };
  <\/script>
</body>
</html>`);
    printWindow.document.close();
  };

  const patient = payment.patient_id || {};
  const visit = payment.visit_id || {};
  const invoice = payment.invoice_id || {};
  const doctor = payment.doctor_id || visit.doctor_id || invoice.doctor_id;
  const doctorName = doctor ? (doctor.full_name || doctor.username || (typeof doctor === 'string' ? doctor : '')) : '';

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 my-auto animate-in fade-in zoom-in-95 duration-200"
      >
        
        {/* Sticky Actions Bar (hidden on print) */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-white/95 backdrop-blur-xs no-print shadow-2xs">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/20 transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Receipt</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Body */}
        <div id="receipt-printable-area" className="p-6 sm:p-8 text-slate-800 bg-white text-xs">
          
          {/* Clinic Header with Logo */}
          <div className="text-center border-b border-dashed border-slate-300 pb-4 mb-4">
            <img
              src="/logo.png"
              alt="SNAB Dental and Dermatologic Clinic"
              className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-full object-cover border-2 border-amber-500 shadow-xs mb-2"
            />
            <h2 className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-wide">
              SNAB DENTAL AND DERMATOLOGIC CLINIC
            </h2>
            <p className="text-[11px] text-amber-600 font-bold uppercase">Specialized Dental & Dermatologic Care • Oral Surgery</p>
            <p className="text-[11px] text-slate-500">Mogadishu Main Road, KM4 • Tel: +252 61 5000000</p>
            <p className="text-[10px] text-slate-400">info@snabdental.com • www.snabdental.com</p>
          </div>

          {/* Receipt Info */}
          <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-100 text-xs mb-4 space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-500">Receipt No:</span>
              <span className="font-mono font-bold text-slate-900">{payment.receipt_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Date & Time:</span>
              <span className="font-medium text-slate-800">{new Date(payment.payment_date).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Cashier:</span>
              <span className="font-medium text-slate-800">{payment.received_by_name || payment.received_by?.full_name || 'Cashier'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Payment Method:</span>
              <span className="font-semibold text-emerald-700">{payment.payment_method}</span>
            </div>
          </div>

          {/* Patient Details */}
          <div className="border-b border-slate-200 pb-3 mb-4 text-xs">
            <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[10px] mb-1.5 text-slate-400">Patient Details</h4>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-slate-500 text-[11px]">Patient Name:</p>
                <p className="font-bold text-slate-800">{patient.name || 'Walk-in Patient'}</p>
              </div>
              <div>
                <p className="text-slate-500 text-[11px]">Patient ID:</p>
                <p className="font-mono font-bold text-slate-800">{patient.patient_number || 'N/A'}</p>
              </div>
              <div>
                <p className="text-slate-500 text-[11px]">Phone:</p>
                <p className="text-slate-800">{patient.telephone || 'N/A'}</p>
              </div>
              <div>
                <p className="text-slate-500 text-[11px]">Doctor:</p>
                <p className="font-bold text-slate-800">{doctorName ? `Dr. ${doctorName}` : 'Attending Doctor'}</p>
              </div>
              <div>
                <p className="text-slate-500 text-[11px]">Visit No:</p>
                <p className="font-mono text-slate-800">{visit.visit_number || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Items / Payment Details */}
          <div className="mb-4">
            <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[10px] mb-2 text-slate-400">Payment Breakdown</h4>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 text-left">
                  <th className="py-1.5 font-medium">Category / Item</th>
                  <th className="py-1.5 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="py-2.5 font-medium text-slate-800">
                    {payment.payment_category}
                    {payment.notes && <span className="block text-[10px] text-slate-400">{payment.notes}</span>}
                  </td>
                  <td className="py-2.5 text-right font-bold text-slate-900">
                    ${Number(payment.amount).toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Totals Box */}
          <div className="border-t border-slate-200 pt-3 space-y-1.5 text-xs mb-5">
            {invoice.subtotal !== undefined && invoice.discount > 0 && (
              <>
                <div className="flex justify-between text-slate-500 text-[11px]">
                  <span>Subtotal:</span>
                  <span className="font-semibold text-slate-700">${Number(invoice.subtotal).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-emerald-600 text-[11px] font-bold">
                  <span>Discount Applied:</span>
                  <span>-${Number(invoice.discount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-700 text-[11px] font-bold border-t border-slate-100 pt-1">
                  <span>Net Total Amount:</span>
                  <span>${Number(invoice.total_amount || (invoice.subtotal - invoice.discount)).toFixed(2)}</span>
                </div>
              </>
            )}

            <div className="flex justify-between items-center text-sm font-black text-slate-900 pt-1">
              <span>AMOUNT PAID:</span>
              <span className="text-base text-emerald-600">${Number(payment.amount).toFixed(2)}</span>
            </div>
            {invoice.balance !== undefined && (
              <div className="flex justify-between text-slate-500 text-[11px]">
                <span>Remaining Invoice Balance:</span>
                <span className="font-semibold text-slate-700">${Number(invoice.balance).toFixed(2)}</span>
              </div>
            )}
          </div>

          {/* Footer Note */}
          <div className="text-center border-t border-dashed border-slate-200 pt-3 text-[10px] text-slate-400 space-y-1">
            <div className="inline-flex items-center gap-1 text-emerald-600 font-semibold mb-1">
              <CheckCircle className="w-3.5 h-3.5" />
              Payment Recorded & Confirmed
            </div>
            <p>Thank you for choosing SNAB Dental & Dermatologic Clinic!</p>
            <p className="italic">Keep this receipt for your treatment and medical records.</p>
          </div>

        </div>

        {/* Bottom Back Button Bar (no-print) */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between no-print">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Queue</span>
          </button>
          
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print Receipt</span>
          </button>
        </div>

      </div>
    </div>
  );
};

export default ReceiptModal;
