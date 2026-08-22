import React, { useState, useEffect } from 'react';
import { getAuditLogsApi } from '../../api/endpoints.js';
import { History, Search, User, Clock, Shield } from 'lucide-react';

const AuditLogList = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await getAuditLogsApi({ limit: 150 });
      setLogs(res.data?.data || []);
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = logs.filter(l =>
    l.username?.toLowerCase().includes(search.toLowerCase()) ||
    l.action?.toLowerCase().includes(search.toLowerCase()) ||
    l.entity?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">System Audit Trail & Activity Logs</h1>
          <p className="text-xs text-slate-500">Immutable audit record of user logins, medical registrations, billing, and clinical changes</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by Username, Action (e.g. RECORD_PAYMENT, LOGIN), or Entity..."
          className="w-full text-xs font-medium focus:outline-hidden"
        />
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400 text-xs">No audit logs found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider">
                  <th className="py-3.5 px-6">Timestamp</th>
                  <th className="py-3.5 px-4">User</th>
                  <th className="py-3.5 px-4">Role</th>
                  <th className="py-3.5 px-4">Action</th>
                  <th className="py-3.5 px-4">Entity</th>
                  <th className="py-3.5 px-6">Event Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filtered.map(l => (
                  <tr key={l._id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-6 text-slate-400 font-mono text-[11px]">
                      {new Date(l.date_time || l.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      @{l.username}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                        {l.role || 'User'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-blue-700">
                      {l.action}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 font-semibold">
                      {l.entity}
                    </td>
                    <td className="py-3.5 px-6 text-slate-600 font-mono text-[11px] truncate max-w-sm">
                      {typeof l.details === 'object' ? JSON.stringify(l.details) : String(l.details)}
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

export default AuditLogList;
