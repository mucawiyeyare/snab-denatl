import React, { useState, useEffect } from 'react';
import { getConsultationsApi } from '../../api/endpoints.js';
import { Stethoscope, Search, User, Calendar, FileText, Activity } from 'lucide-react';

const ConsultationList = () => {
  const [consultations, setConsultations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchConsultations();
  }, []);

  const fetchConsultations = async () => {
    setLoading(true);
    try {
      const res = await getConsultationsApi();
      setConsultations(res.data?.data || []);
    } catch (err) {
      console.error('Error fetching consultations:', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = consultations.filter(c => 
    c.patient_id?.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.diagnosis?.primary_diagnosis?.toLowerCase().includes(search.toLowerCase()) ||
    c.doctor_id?.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Doctor Consultations & Clinical Diagnoses</h1>
          <p className="text-xs text-slate-500">History of patient examinations, symptoms, diagnoses, and treatment plans</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by Patient Name, Diagnosis, or Doctor..."
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
            No consultation records found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-bold uppercase">
                  <th className="py-3.5 px-6">Date</th>
                  <th className="py-3.5 px-4">Patient</th>
                  <th className="py-3.5 px-4">Consulting Doctor</th>
                  <th className="py-3.5 px-4">Primary Diagnosis</th>
                  <th className="py-3.5 px-4">Decision</th>
                  <th className="py-3.5 px-6">Clinical Observations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filtered.map(c => (
                  <tr key={c._id} className="hover:bg-slate-50/80 transition">
                    <td className="py-4 px-6 text-slate-500 font-mono">
                      {new Date(c.consultation_date).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-4">
                      <span className="font-bold text-slate-900 block">{c.patient_id?.name || 'Patient'}</span>
                      <span className="text-[11px] text-slate-400 font-mono">{c.patient_id?.patient_number}</span>
                    </td>
                    <td className="py-4 px-4 text-slate-700">
                      Dr. {c.doctor_id?.full_name || c.doctor_id?.username}
                    </td>
                    <td className="py-4 px-4 font-bold text-blue-700">
                      {c.diagnosis?.primary_diagnosis}
                    </td>
                    <td className="py-4 px-4">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {c.treatment_decision}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-slate-600 truncate max-w-xs">
                      {c.examination?.clinical_observations || c.complaint?.main_complaint || 'N/A'}
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

export default ConsultationList;
