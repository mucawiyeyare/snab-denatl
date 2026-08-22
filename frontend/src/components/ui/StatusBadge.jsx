import React from 'react';

const statusConfig = {
  // Visit Statuses
  'Registered': { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300' },
  'Waiting for Payment': { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-300' },
  'Consultation Paid': { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-300' },
  'Waiting for Doctor': { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300' },
  'With Doctor': { bg: 'bg-indigo-100', text: 'text-indigo-800', border: 'border-indigo-300' },
  'Laboratory Payment Required': { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-300' },
  'Laboratory Paid': { bg: 'bg-cyan-100', text: 'text-cyan-800', border: 'border-cyan-300' },
  'Waiting for Laboratory': { bg: 'bg-sky-100', text: 'text-sky-800', border: 'border-sky-300' },
  'Laboratory Testing': { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-300' },
  'Laboratory Result Ready': { bg: 'bg-teal-100', text: 'text-teal-800', border: 'border-teal-300' },
  'Returning to Doctor': { bg: 'bg-violet-100', text: 'text-violet-800', border: 'border-violet-300' },
  'Treatment in Progress': { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300' },
  'Treatment Completed': { bg: 'bg-lime-100', text: 'text-lime-800', border: 'border-lime-300' },
  'Payment Pending': { bg: 'bg-rose-100', text: 'text-rose-800', border: 'border-rose-300' },
  'Paid': { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-300' },
  'Completed': { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300' },
  'Follow-up Required': { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300' },
  'Cancelled': { bg: 'bg-rose-100', text: 'text-rose-800', border: 'border-rose-300' },

  // Invoice / Payment Statuses
  'Unpaid': { bg: 'bg-rose-100', text: 'text-rose-800', border: 'border-rose-300' },
  'Partially Paid': { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-300' },
  'Active': { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-300' },
  'Inactive': { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-300' },
  'Scheduled': { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300' },
  'Confirmed': { bg: 'bg-teal-100', text: 'text-teal-800', border: 'border-teal-300' },
  'Pending': { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-300' },
  'Verified': { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-300' }
};

const StatusBadge = ({ status, className = '' }) => {
  const config = statusConfig[status] || { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200' };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${config.bg} ${config.text} ${config.border} ${className}`}>
      {status || 'Unknown'}
    </span>
  );
};

export default StatusBadge;
