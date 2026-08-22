import React, { useState, useEffect } from 'react';
import { getEmployeesApi, createEmployeeApi, updateEmployeeApi } from '../../api/endpoints.js';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import Modal from '../../components/ui/Modal.jsx';
import { Users, Plus, Search, Phone, Mail, Award, CheckCircle, Edit2, UserCog } from 'lucide-react';

const EmployeeList = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    position: 'Dental Surgeon',
    department: 'Dental Surgery',
    specialization: '',
    salary: 2000,
    status: 'Active'
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchEmployees();
  }, [search]);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const res = await getEmployeesApi({ search });
      setEmployees(res.data?.data || []);
    } catch (err) {
      console.error('Error fetching employees:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (emp = null) => {
    if (emp) {
      setEditingEmployee(emp);
      setFormData({
        name: emp.name,
        phone: emp.phone,
        email: emp.email || '',
        position: emp.position,
        department: emp.department || 'Dental Surgery',
        specialization: emp.specialization || '',
        salary: emp.salary || 0,
        status: emp.status
      });
    } else {
      setEditingEmployee(null);
      setFormData({
        name: '',
        phone: '',
        email: '',
        position: 'Dental Surgeon',
        department: 'Dental Surgery',
        specialization: '',
        salary: 2000,
        status: 'Active'
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingEmployee) {
        await updateEmployeeApi(editingEmployee._id, {
          ...formData,
          salary: Number(formData.salary)
        });
      } else {
        await createEmployeeApi({
          ...formData,
          salary: Number(formData.salary)
        });
      }
      setIsModalOpen(false);
      fetchEmployees();
    } catch (err) {
      console.error('Error saving employee:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">HR & Staff Directory</h1>
          <p className="text-xs text-slate-500">Manage clinic doctors, dental hygienists, receptionists, and laboratory technicians</p>
        </div>

        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Employee
        </button>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search staff by Name, Position, ID, or Phone..."
          className="w-full text-xs font-medium focus:outline-hidden"
        />
      </div>

      {/* Staff Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-3 flex items-center justify-center h-48">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : employees.length === 0 ? (
          <div className="col-span-3 text-center py-16 text-slate-400 text-xs">No employees found.</div>
        ) : (
          employees.map(emp => (
            <div key={emp._id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-4 relative">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-700 font-black text-lg flex items-center justify-center border border-blue-100">
                    {emp.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{emp.name}</h3>
                    <span className="font-mono text-[10px] text-slate-400 font-bold">{emp.employee_id}</span>
                  </div>
                </div>
                <StatusBadge status={emp.status} />
              </div>

              <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 text-xs text-slate-600">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Position:</span>
                  <span className="font-bold text-slate-800">{emp.position}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Department:</span>
                  <span className="font-medium text-slate-700">{emp.department}</span>
                </div>
                {emp.specialization && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Specialty:</span>
                    <span className="font-bold text-blue-700">{emp.specialization}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Phone:</span>
                  <span className="font-medium text-slate-800">{emp.phone}</span>
                </div>
              </div>

              <div className="flex justify-between items-center pt-1 border-t border-slate-50 text-xs">
                <span className="text-[11px] text-slate-400">
                  Hired: {new Date(emp.hire_date).toLocaleDateString()}
                </span>
                <button
                  onClick={() => handleOpenModal(emp)}
                  className="p-1.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-600 rounded-lg transition"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        icon={UserCog}
        title={editingEmployee ? 'Edit Staff Profile' : 'Register New Employee'}
        subtitle="Manage clinic staff, department assignments, and employment status."
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Full Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Dr. Hassan Ali"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white transition"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Phone *</label>
              <input
                type="text"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+252 61 5000000"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white transition"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="staff@snabdental.com"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Position *</label>
            <input
              type="text"
              required
              value={formData.position}
              onChange={(e) => setFormData({ ...formData, position: e.target.value })}
              placeholder="e.g. Senior Dental Surgeon, Receptionist & Cashier"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white transition"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Department</label>
              <select
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white transition cursor-pointer"
              >
                <option value="Dental Surgery">Dental Surgery</option>
                <option value="Orthodontics & Pediatric">Orthodontics & Pediatric</option>
                <option value="Front Desk & Billing">Front Desk & Billing</option>
                <option value="Laboratory">Laboratory</option>
                <option value="Human Resources">Human Resources</option>
                <option value="Administration">Administration</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Specialization</label>
              <input
                type="text"
                value={formData.specialization}
                onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                placeholder="e.g. Endodontics / Orthodontics"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Monthly Salary ($)</label>
              <input
                type="number"
                min="0"
                value={formData.salary}
                onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 font-mono focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white transition"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white transition cursor-pointer font-semibold"
              >
                <option value="Active">Active</option>
                <option value="On Leave">On Leave</option>
                <option value="Inactive">Inactive</option>
                <option value="Terminated">Terminated</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold text-xs rounded-xl shadow-sm transition cursor-pointer disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Save Employee'}
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
};

export default EmployeeList;
