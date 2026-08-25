import React from 'react';

const statusConfig = {
  // Positive / Active / Paid / Progress (Green)
  'Paid': { bg: 'bg-emerald-600', text: 'text-white' },
  'Completed': { bg: 'bg-emerald-600', text: 'text-white' },
  'Consultation Paid': { bg: 'bg-emerald-600', text: 'text-white' },
  'Laboratory Paid': { bg: 'bg-emerald-600', text: 'text-white' },
  'Treatment Completed': { bg: 'bg-emerald-600', text: 'text-white' },
  'In Stock': { bg: 'bg-emerald-600', text: 'text-white' },
  'Dispensed': { bg: 'bg-emerald-600', text: 'text-white' },
  'Active': { bg: 'bg-emerald-600', text: 'text-white' },
  'Verified': { bg: 'bg-emerald-600', text: 'text-white' },
  'Confirmed': { bg: 'bg-emerald-600', text: 'text-white' },
  'Progress': { bg: 'bg-emerald-600', text: 'text-white' },

  // Pending / Open / Partially Paid / Low Stock (Amber / Gold)
  'Pending': { bg: 'bg-amber-500', text: 'text-white' },
  'Open': { bg: 'bg-amber-500', text: 'text-white' },
  'Partially Paid': { bg: 'bg-amber-500', text: 'text-white' },
  'Waiting for Payment': { bg: 'bg-amber-500', text: 'text-white' },
  'Payment Pending': { bg: 'bg-amber-500', text: 'text-white' },
  'Laboratory Payment Required': { bg: 'bg-amber-500', text: 'text-white' },
  'Low Stock': { bg: 'bg-amber-500', text: 'text-white' },
  'Expiring Soon': { bg: 'bg-amber-500', text: 'text-white' },

  // Attention / Unpaid / On Hold / Expired / Cancelled (Red / Rose)
  'Unpaid': { bg: 'bg-rose-600', text: 'text-white' },
  'On hold': { bg: 'bg-rose-600', text: 'text-white' },
  'On Hold': { bg: 'bg-rose-600', text: 'text-white' },
  'Cancelled': { bg: 'bg-rose-600', text: 'text-white' },
  'Out of Stock': { bg: 'bg-rose-600', text: 'text-white' },
  'Expired': { bg: 'bg-rose-600', text: 'text-white' },
  'Overdue': { bg: 'bg-rose-600', text: 'text-white' },

  // In-Clinic Flow (Blue / Sky / Indigo)
  'Waiting for Doctor': { bg: 'bg-blue-600', text: 'text-white' },
  'With Doctor': { bg: 'bg-indigo-600', text: 'text-white' },
  'Treatment in Progress': { bg: 'bg-blue-600', text: 'text-white' },
  'Waiting for Laboratory': { bg: 'bg-sky-600', text: 'text-white' },
  'Laboratory Testing': { bg: 'bg-purple-600', text: 'text-white' },
  'Laboratory Result Ready': { bg: 'bg-teal-600', text: 'text-white' },
  'Returning to Doctor': { bg: 'bg-indigo-600', text: 'text-white' },
  'Scheduled': { bg: 'bg-blue-600', text: 'text-white' },
  'Follow-up Required': { bg: 'bg-blue-600', text: 'text-white' },

  // Neutral / Record Only (Slate)
  'Registered': { bg: 'bg-slate-600', text: 'text-white' },
  'Record_Only': { bg: 'bg-slate-600', text: 'text-white' },
  'External': { bg: 'bg-slate-600', text: 'text-white' },
  'Inactive': { bg: 'bg-slate-500', text: 'text-white' }
};

const StatusBadge = ({ status, className = '' }) => {
  const config = statusConfig[status] || { bg: 'bg-slate-600', text: 'text-white' };

  return (
    <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-lg text-[11px] font-bold tracking-wide shadow-2xs ${config.bg} ${config.text} ${className}`}>
      {status || 'Unknown'}
    </span>
  );
};

export default StatusBadge;
