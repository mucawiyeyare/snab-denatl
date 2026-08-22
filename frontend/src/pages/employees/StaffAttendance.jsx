import React, { useState, useEffect } from 'react';
import { getEmployeesApi, recordAttendanceApi } from '../../api/endpoints.js';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import Modal from '../../components/ui/Modal.jsx';
import { UserCheck, Search, Calendar, Clock, CheckCircle } from 'lucide-react';

const StaffAttendance = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [attendanceForm, setAttendanceForm] = useState({
    status: 'Present',
    check_in: '08:00 AM',
    check_out: '04:30 PM',
    notes: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const res = await getEmployeesApi();
      setEmployees(res.data?.data || []);
    } catch (err) {
      console.error('Error fetching employees:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAttendance = (emp) => {
    setSelectedEmp(emp);
    setAttendanceForm({
      status: 'Present',
      check_in: '08:00 AM',
      check_out: '04:30 PM',
      notes: ''
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await recordAttendanceApi({
        employeeId: selectedEmp._id,
        date: selectedDate,
        ...attendanceForm
      });
      setIsModalOpen(false);
      fetchEmployees();
    } catch (err) {
      console.error('Error saving attendance:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Staff Attendance & Roster</h1>
          <p className="text-xs text-slate-500">Record daily staff check-in times, leaves, and attendance logs</p>
        </div>

        <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="text-xs font-bold text-slate-800 bg-transparent focus:outline-hidden"
          />
        </div>
      </div>

      {/* Employees Attendance Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider">
                  <th className="py-3.5 px-6">Staff ID</th>
                  <th className="py-3.5 px-4">Employee Name</th>
                  <th className="py-3.5 px-4">Position / Dept</th>
                  <th className="py-3.5 px-4">Status Today</th>
                  <th className="py-3.5 px-4">Recorded Logs</th>
                  <th className="py-3.5 px-6 text-right">Log Attendance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {employees.map(emp => {
                  const todayLog = emp.attendance?.find(a => 
                    new Date(a.date).toISOString().split('T')[0] === selectedDate
                  );

                  return (
                    <tr key={emp._id} className="hover:bg-slate-50/80 transition">
                      <td className="py-4 px-6 font-mono font-bold text-blue-600">
                        {emp.employee_id}
                      </td>
                      <td className="py-4 px-4 font-bold text-slate-900">
                        {emp.name}
                      </td>
                      <td className="py-4 px-4 text-slate-600">
                        {emp.position} <span className="text-slate-400 font-normal">({emp.department})</span>
                      </td>
                      <td className="py-4 px-4">
                        {todayLog ? (
                          <StatusBadge status={todayLog.status} />
                        ) : (
                          <span className="text-[11px] text-amber-600 font-bold">Pending Log</span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-slate-500 font-mono">
                        {todayLog ? `${todayLog.check_in || 'N/A'} - ${todayLog.check_out || 'N/A'}` : '—'}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={() => handleOpenAttendance(emp)}
                          className="px-3 py-1.5 bg-blue-50 hover:bg-blue-600 hover:text-white font-bold text-blue-600 rounded-lg transition text-xs shadow-2xs"
                        >
                          {todayLog ? 'Update Log' : '+ Record'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Attendance Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={`Log Attendance: ${selectedEmp?.name}`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Attendance Status *</label>
            <select
              value={attendanceForm.status}
              onChange={(e) => setAttendanceForm({ ...attendanceForm, status: e.target.value })}
              className="w-full p-2.5 bg-slate-50 border rounded-xl font-bold"
            >
              <option value="Present">✅ Present</option>
              <option value="Late">⏰ Late</option>
              <option value="Leave">🏖️ On Leave</option>
              <option value="Absent">❌ Absent</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Check-in Time</label>
              <input
                type="text"
                value={attendanceForm.check_in}
                onChange={(e) => setAttendanceForm({ ...attendanceForm, check_in: e.target.value })}
                placeholder="08:00 AM"
                className="w-full p-2.5 bg-slate-50 border rounded-xl font-bold"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Check-out Time</label>
              <input
                type="text"
                value={attendanceForm.check_out}
                onChange={(e) => setAttendanceForm({ ...attendanceForm, check_out: e.target.value })}
                placeholder="04:30 PM"
                className="w-full p-2.5 bg-slate-50 border rounded-xl font-bold"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Notes / Remarks</label>
            <input
              type="text"
              value={attendanceForm.notes}
              onChange={(e) => setAttendanceForm({ ...attendanceForm, notes: e.target.value })}
              placeholder="e.g. On call duty"
              className="w-full p-2.5 bg-slate-50 border rounded-xl"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 bg-slate-100 rounded-xl font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md"
            >
              {submitting ? 'Saving...' : 'Save Attendance'}
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
};

export default StaffAttendance;
