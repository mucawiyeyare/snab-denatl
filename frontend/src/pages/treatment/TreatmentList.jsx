import React, { useState, useEffect } from 'react';
import { getTreatmentsApi } from '../../api/endpoints.js';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import { HeartPulse, Search, Calendar, User, DollarSign } from 'lucide-react';

const TreatmentList = () => {
  const [treatments, setTreatments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchTreatments();
  }, []);

  const fetchTreatments = async () => {
    setLoading(true);
    try {
      const res = await getTreatmentsApi();
      setTreatments(res.data?.data || []);
    } catch (err) {
      console.error('Error fetching treatments:', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = treatments.filter(t =>
    t.patient_id?.name?.toLowerCase().includes(search.toLowerCase()) ||
    t.service_name?.toLowerCase().includes(search.toLowerCase()) ||
    t.tooth_number?.toLowerCase().includes(search.toLowerCase()) ||
    t.doctor_id?.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Dental Treatments & Procedures</h1>
          <p className="text-xs text-slate-500">Record of dental restorations, extractions, RCT, orthodontics, and implants</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by Patient Name, Service, Tooth Number (e.g. 24), or Doctor..."
          className="w-full text-xs font-medium focus:outline-hidden"
        />
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400 text-xs">
            No dental treatments found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider">
                  <th className="py-3.5 px-6">Date</th>
                  <th className="py-3.5 px-4">Patient</th>
                  <th className="py-3.5 px-4">Dental Procedure</th>
                  <th className="py-3.5 px-4">Tooth # (FDI)</th>
                  <th className="py-3.5 px-4">Doctor</th>
                  <th className="py-3.5 px-4 text-right">Price</th>
                  <th className="py-3.5 px-6 text-right">Payment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filtered.map(t => (
                  <tr key={t._id} className="hover:bg-slate-50/80 transition">
                    <td className="py-4 px-6 text-slate-500 font-mono">
                      {new Date(t.treatment_date).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-4">
                      <span className="font-bold text-slate-900 block">{t.patient_id?.name || 'Patient'}</span>
                      <span className="text-[11px] text-slate-400 font-mono">{t.patient_id?.patient_number}</span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="font-bold text-slate-800 block">{t.service_name}</span>
                      {t.treatment_notes && (
                        <span className="text-[10px] text-slate-400 block truncate max-w-xs">{t.treatment_notes}</span>
                      )}
                    </td>
                    <td className="py-4 px-4 font-mono font-bold text-blue-600">
                      {t.tooth_number}
                    </td>
                    <td className="py-4 px-4 text-slate-700">
                      {t.doctor_id?.full_name || t.doctor_id?.username}
                    </td>
                    <td className="py-4 px-4 text-right font-mono font-bold text-slate-900">
                      ${t.price.toFixed(2)}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <StatusBadge status={t.payment_status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default TreatmentList;
