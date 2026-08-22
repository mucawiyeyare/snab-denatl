import React from 'react';
import { Printer, ArrowLeft, X, CheckCircle2, Ticket } from 'lucide-react';

const ConsultationTokenModal = ({ isOpen, onClose, visit }) => {
  if (!isOpen || !visit) return null;

  const handlePrint = () => {
    const patient = visit.patient_id || {};
    const doctor  = visit.doctor_id  || {};
    const tokenNumber = visit.visit_number ? visit.visit_number.split('-').pop() : '01';

    const printWindow = window.open('', '_blank', 'width=600,height=900');
    printWindow.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Doctor Token – ${visit.visit_number || ''}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
    @page { size: A5 portrait; margin: 12mm; }

    * { box-sizing: border-box; margin: 0; padding: 0;
        font-family: 'Inter', Arial, sans-serif;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
        color-adjust: exact; }

    body { background: #ffffff; color: #1e293b; font-size: 12px;
           line-height: 1.5; padding: 20px; max-width: 480px; margin: 0 auto; }

    /* Header */
    .header { text-align: center; border-bottom: 1.5px dashed #cbd5e1;
               padding-bottom: 12px; margin-bottom: 14px; }
    .header img { width: 56px; height: 56px; border-radius: 50%; object-fit: cover;
                   border: 2px solid #f59e0b; display: block; margin: 0 auto 6px; }
    .clinic-name { font-size: 13px; font-weight: 900; color: #0f172a;
                    text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 2px; }
    .clinic-sub  { font-size: 9px; font-weight: 700; color: #d97706;
                    text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 1px; }
    .clinic-addr { font-size: 9px; color: #64748b; }

    /* Token Box */
    .token-box { background: linear-gradient(135deg, #2563eb, #4f46e5);
                  border-radius: 14px; padding: 18px 16px; text-align: center;
                  margin-bottom: 14px; color: #ffffff; }
    .token-label { font-size: 9px; font-weight: 700; letter-spacing: 0.1em;
                    text-transform: uppercase; color: #bfdbfe; margin-bottom: 4px; }
    .token-number { font-size: 52px; font-weight: 900; font-family: 'Courier New', monospace;
                     line-height: 1; letter-spacing: -0.02em; }
    .token-visit { font-size: 10px; font-weight: 600; color: #bfdbfe;
                    font-family: 'Courier New', monospace; margin-top: 4px; }

    /* Info card */
    .info-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px;
                  padding: 12px 14px; margin-bottom: 12px; }
    .info-header-row { display: flex; justify-content: space-between; align-items: flex-start;
                         padding-bottom: 8px; border-bottom: 1px solid #e2e8f0; margin-bottom: 8px; }
    .field-label { font-size: 9px; font-weight: 700; color: #94a3b8;
                    text-transform: uppercase; letter-spacing: 0.06em; display: block; }
    .field-value { font-weight: 700; color: #0f172a; font-size: 13px; }
    .field-sub   { font-size: 9px; color: #64748b; font-family: 'Courier New', monospace; }
    .field-small { font-size: 11px; font-weight: 600; color: #64748b; }

    .doctor-row  { display: flex; justify-content: space-between; align-items: center; }
    .doctor-name { font-size: 12px; font-weight: 700; color: #1d4ed8; }
    .date-label  { font-size: 9px; color: #94a3b8; text-align: right; }
    .date-value  { font-size: 10px; font-weight: 600; color: #334155; text-align: right; }

    /* Alert boxes */
    .alert-box { background: #fffbeb; border: 1px solid #fde68a; border-radius: 10px;
                  padding: 8px 12px; margin-bottom: 12px; font-size: 10px; color: #92400e; }

    /* Footer */
    .footer { text-align: center; border-top: 1.5px dashed #e2e8f0; padding-top: 10px; }
    .footer-msg { font-size: 9px; color: #64748b; margin-bottom: 2px; }
    .footer-note { font-size: 8px; color: #94a3b8; font-style: italic; }
  </style>
</head>
<body>

  <!-- Clinic Header -->
  <div class="header">
    <img src="/logo.png" alt="SNAB Dental" onerror="this.style.display='none'" />
    <div class="clinic-name">SNAB DENTAL AND DERMATOLOGIC CLINIC</div>
    <div class="clinic-sub">Consultation Receipt &amp; Doctor Visit Pass</div>
    <div class="clinic-addr">Mogadishu, KM4 • Tel: +252 61 5000000</div>
  </div>

  <!-- Token -->
  <div class="token-box">
    <div class="token-label">Patient Queue Token</div>
    <div class="token-number">#${tokenNumber}</div>
    <div class="token-visit">Visit ID: ${visit.visit_number || '—'}</div>
  </div>

  <!-- Patient & Doctor Info -->
  <div class="info-card">
    <div class="info-header-row">
      <div>
        <span class="field-label">Patient Name</span>
        <span class="field-value">${patient.name || 'Walk-in Patient'}</span>
        <span class="field-sub">ID: ${patient.patient_number || 'N/A'}</span>
      </div>
      <div style="text-align:right">
        <span class="field-label">Age / Gender</span>
        <span class="field-small">${patient.age ? patient.age + ' yrs' : '—'} • ${patient.gender || '—'}</span>
      </div>
    </div>
    <div class="doctor-row">
      <div>
        <span class="field-label">Assigned Doctor</span>
        <span class="doctor-name">Dr. ${doctor.full_name || doctor.username || 'Dental Surgeon'}</span>
      </div>
      <div>
        <div class="date-label">Visit Date</div>
        <div class="date-value">${new Date(visit.visit_date || Date.now()).toLocaleDateString()}</div>
        <div class="date-label" style="margin-top:3px">Reason</div>
        <div class="date-value">${visit.reason || 'General Consultation'}</div>
      </div>
    </div>
  </div>

  <!-- Status Reminder -->
  <div class="alert-box">
    ⏳ Please wait until your number is called. Bring this slip when directed to the doctor's room.
  </div>

  <!-- Footer -->
  <div class="footer">
    <div class="footer-msg">Thank you for choosing SNAB Dental &amp; Dermatologic Clinic!</div>
    <div class="footer-note">Present this token at the consultation desk.</div>
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

  const patient = visit.patient_id || {};
  const doctor = visit.doctor_id || {};
  const tokenNumber = visit.visit_number ? visit.visit_number.split('-').pop() : '01';

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 my-auto animate-in fade-in zoom-in-95 duration-200"
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
              <span>Print Token</span>
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

        {/* Printable Token Body */}
        <div id="token-printable-area" className="p-6 sm:p-7 text-slate-800 bg-white text-xs space-y-4">
          
          {/* Clinic Header with Official Logo */}
          <div className="text-center border-b border-dashed border-slate-300 pb-3">
            <img
              src="/logo.png"
              alt="SNAB Dental Clinic"
              className="w-14 h-14 mx-auto rounded-full object-cover border-2 border-amber-500 shadow-xs mb-1.5"
            />
            <h2 className="text-sm sm:text-base font-black text-slate-900 uppercase tracking-tight">
              SNAB DENTAL AND DERMATOLOGIC CLINIC
            </h2>
            <p className="text-[10px] font-bold text-amber-600 uppercase">Consultation Receipt & Doctor Visit Pass</p>
            <p className="text-[10px] text-slate-400">Mogadishu, KM4 • Tel: +252 61 5000000</p>
          </div>

          {/* Big Queue Token Box */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl p-4 text-center shadow-md space-y-1">
            <span className="text-[10px] font-bold tracking-widest uppercase text-blue-200">Patient Queue Token</span>
            <div className="text-4xl sm:text-5xl font-black tracking-tight font-mono">
              #{tokenNumber}
            </div>
            <span className="text-xs font-semibold text-blue-100 font-mono block">
              Visit ID: {visit.visit_number}
            </span>
          </div>

          {/* Patient & Doctor Assignment Info */}
          <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/80 space-y-2 text-xs">
            <div className="flex justify-between items-start pb-2 border-b border-slate-200">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Patient Name</span>
                <span className="font-bold text-slate-900 text-sm">{patient.name || 'Walk-in Patient'}</span>
                <span className="text-[10px] text-slate-500 block font-mono">ID: {patient.patient_number}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Age / Gender</span>
                <span className="font-semibold text-slate-700">{patient.age ? `${patient.age} yrs` : '—'} • {patient.gender || '—'}</span>
              </div>
            </div>

            <div className="flex justify-between items-center pt-1">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Assigned Doctor</span>
                <span className="font-bold text-blue-700 text-xs">
                  Dr. {doctor.full_name || doctor.username || 'Dental Surgeon'}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Consultation Fee</span>
                <span className="font-mono font-black text-emerald-600 text-sm">
                  ${Number(visit.consultation_fee || 20).toFixed(2)} (PAID)
                </span>
              </div>
            </div>
          </div>

          {/* Reason / Complaint */}
          <div className="bg-white p-3 rounded-xl border border-slate-100 text-xs space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Reason for Visit</span>
            <p className="font-semibold text-slate-800">{visit.reason || visit.complaint || 'General Dental Examination'}</p>
          </div>

          {/* Instructions Box */}
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/60 text-[11px] text-amber-900 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-amber-800">
              <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              Patient Instructions:
            </div>
            <p>
              Please proceed to the waiting area. Hand this consultation token slip directly to <strong>Dr. {doctor.full_name || 'Hassan Ali'}</strong> when your token number is called.
            </p>
          </div>

          {/* Footer with Timestamp */}
          <div className="text-center pt-2 border-t border-dashed border-slate-200 text-[10px] text-slate-400 space-y-0.5">
            <p>Issued at: {new Date(visit.visit_date || Date.now()).toLocaleString()}</p>
            <p className="font-medium text-slate-500">SNAB Dental & Dermatologic Clinic • Mogadishu</p>
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
            <span>Print Token Slip</span>
          </button>
        </div>

      </div>
    </div>
  );
};

export default ConsultationTokenModal;
