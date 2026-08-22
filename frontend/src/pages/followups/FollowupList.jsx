import React, { useState, useEffect } from 'react';
import { getFollowupsApi, updateFollowupStatusApi } from '../../api/endpoints.js';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import { Clock, Search, CheckCircle, Calendar, User, Phone } from 'lucide-react';

const FollowupList = () => {
  const [followups, setFollowups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchFollowups();
  }, []);

  const fetchFollowups = async () => {
    setLoading(true);
    try {
      const res = await getFollowupsApi();
      setFollowups(res.data?.data || []);
    } catch (err) {
      console.error('Error fetching followups:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await updateFollowupStatusApi(id, { status });
      fetchFollowups();
    } catch (err) {
      console.error('Error updating followup status:', err);
    }
  };

  const filtered = followups.filter(f =>
    f.patient_id?.name?.toLowerCase().includes(search.toLowerCase()) ||
    f.reason?.toLowerCase().includes(search.toLowerCase()) ||
    f.doctor_id?.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Patient Follow-ups & Post-Treatment Care</h1>
          <p className="text-xs text-slate-500">Track routine post-op check-ups, braces adjustments, and healing observations</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by Patient Name, Reason, or Doctor..."
          className="w-full text-xs font-medium focus:outline-hidden"
        />
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400 text-xs">No follow-ups scheduled.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider">
                  <th className="py-3.5 px-6">Due Date</th>
                  <th className="py-3.5 px-4">Patient</th>
                  <th className="py-3.5 px-4">Telephone</th>
                  <th className="py-3.5 px-4">Doctor</th>
                  <th className="py-3.5 px-4">Reason / Instructions</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filtered.map(f => (
                  <tr key={f._id} className="hover:bg-slate-50/80 transition">
                    <td className="py-4 px-6 font-bold text-slate-900 font-mono">
                      {new Date(f.followup_date).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-4">
                      <span className="font-bold text-slate-900 block">{f.patient_id?.name}</span>
                      <span className="text-[11px] text-slate-400">{f.patient_id?.patient_number}</span>
                    </td>
                    <td className="py-4 px-4 text-slate-700">
                      {f.patient_id?.telephone}
                    </td>
                    <td className="py-4 px-4 text-slate-700">
                      Dr. {f.doctor_id?.full_name || f.doctor_id?.username}
                    </td>
                    <td className="py-4 px-4 text-slate-600">
                      <span className="font-semibold block">{f.reason}</span>
                      {f.instructions && <span className="text-[10px] text-slate-400 block">{f.instructions}</span>}
                    </td>
                    <td className="py-4 px-4">
                      <StatusBadge status={f.status} />
                    </td>
                    <td className="py-4 px-6 text-right space-x-1.5">
                      {f.status === 'Pending' && (
                        <>
                          <button
                            onClick={() => handleStatusChange(f._id, 'Attended')}
                            className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-700 font-bold rounded-lg transition"
                          >
                            Mark Attended
                          </button>
                          <button
                            onClick={() => handleStatusChange(f._id, 'Missed')}
                            className="px-2.5 py-1 bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-700 font-bold rounded-lg transition"
                          >
                            Missed
                          </button>
                        </>
                      )}
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

export default FollowupList;
