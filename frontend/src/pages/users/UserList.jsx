import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { getUsersApi, getEmployeesApi, createUserApi, updateUserApi, deleteUserApi } from '../../api/endpoints.js';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import Modal from '../../components/ui/Modal.jsx';
import SearchableSelect from '../../components/ui/SearchableSelect.jsx';
import {
  ShieldCheck,
  Plus,
  Search,
  Key,
  UserCheck,
  Edit2,
  Trash2,
  AlertCircle,
  Stethoscope,
  Receipt,
  Shield,
  Contact,
  Lock,
  Mail,
  User,
  CheckCircle
} from 'lucide-react';

const UserList = () => {
  const { user: currentUser } = useAuth();

  const [users, setUsers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'Doctor',
    employee_id: '',
    full_name: '',
    email: '',
    status: 'Active'
  });
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successToast, setSuccessToast] = useState('');

  useEffect(() => {
    fetchUsers();
    getEmployeesApi().then(res => setEmployees(res.data?.data || [])).catch(() => {});
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await getUsersApi();
      setUsers(res.data?.data || []);
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(''), 4000);
  };

  const handleOpenModal = (u = null) => {
    setErrorMsg('');
    if (u) {
      setEditingUser(u);
      setFormData({
        username: u.username || '',
        password: '',
        role: u.role || 'Doctor',
        employee_id: u.employee_id?._id || '',
        full_name: u.full_name || '',
        email: u.email || '',
        status: u.status || 'Active'
      });
    } else {
      setEditingUser(null);
      setFormData({
        username: '',
        password: '',
        role: 'Doctor',
        employee_id: '',
        full_name: '',
        email: '',
        status: 'Active'
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');
    try {
      if (editingUser) {
        await updateUserApi(editingUser._id, formData);
        showToast(`User @${formData.username || editingUser.username} updated successfully!`);
      } else {
        await createUserApi(formData);
        showToast(`User @${formData.username} created successfully!`);
      }
      setIsModalOpen(false);
      fetchUsers();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Error saving user account');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Delete Confirmation
  const handleOpenDelete = (u) => {
    if (currentUser?._id && u._id === currentUser._id) {
      alert('Security policy: You cannot delete your own logged-in admin account.');
      return;
    }
    setUserToDelete(u);
    setIsDeleteModalOpen(true);
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    setSubmitting(true);
    try {
      await deleteUserApi(userToDelete._id);
      setIsDeleteModalOpen(false);
      showToast(`User @${userToDelete.username} was permanently deleted.`);
      setUserToDelete(null);
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete user account');
    } finally {
      setSubmitting(false);
    }
  };

  // Quick Toggle Status (Active / Inactive)
  const handleToggleStatus = async (u) => {
    const newStatus = u.status === 'Active' ? 'Inactive' : 'Active';
    try {
      await updateUserApi(u._id, { status: newStatus });
      showToast(`User @${u.username} marked as ${newStatus}.`);
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update user status');
    }
  };

  const filtered = users.filter(u =>
    u.username?.toLowerCase().includes(search.toLowerCase()) ||
    u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.role?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">

      {/* Toast Notification */}
      {successToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-7 h-7 text-blue-600" />
            <span>System Users & Access Roles</span>
          </h1>
          <p className="text-xs text-slate-500">Create, edit, manage permissions, and delete clinic user accounts</p>
        </div>

        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white text-xs font-bold rounded-xl shadow-md transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add New User</span>
        </button>
      </div>

      {/* Search & Filter */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2 bg-white p-3 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-2.5">
          <Search className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by username, full name, email, or role..."
            className="w-full text-xs font-medium focus:outline-none"
          />
        </div>

        <div className="bg-white p-2.5 rounded-2xl border border-slate-100 shadow-xs">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="w-full text-xs font-bold text-slate-700 bg-transparent focus:outline-none cursor-pointer"
          >
            <option value="">All Access Roles</option>
            <option value="Admin">Administrator</option>
            <option value="Doctor">Doctor</option>
            <option value="Receptionist/Cashier">Receptionist / Cashier</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400 text-xs">No users found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider">
                  <th className="py-3.5 px-6">User Account</th>
                  <th className="py-3.5 px-4">Full Name & Email</th>
                  <th className="py-3.5 px-4">Access Role</th>
                  <th className="py-3.5 px-4">Linked Staff Record</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filtered.map(u => {
                  const isCurrent = currentUser?._id && u._id === currentUser._id;
                  return (
                    <tr key={u._id} className="hover:bg-slate-50/80 transition">
                      <td className="py-4 px-6 font-mono font-bold text-slate-900">
                        <div className="flex items-center gap-2">
                          <span className="text-blue-600">@{u.username}</span>
                          {isCurrent && (
                            <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded font-sans">
                              You
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4 font-bold text-slate-800">
                        <div>{u.full_name || '—'}</div>
                        {u.email && <div className="text-[11px] text-slate-400 font-normal font-sans">{u.email}</div>}
                      </td>
                      <td className="py-4 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border inline-flex items-center gap-1 ${
                          u.role === 'Admin' ? 'bg-purple-50 text-purple-800 border-purple-200' :
                          u.role === 'Doctor' ? 'bg-indigo-50 text-indigo-800 border-indigo-200' :
                          'bg-emerald-50 text-emerald-800 border-emerald-200'
                        }`}>
                          {u.role === 'Admin' && <Shield className="w-3 h-3 text-purple-600" />}
                          {u.role === 'Doctor' && <Stethoscope className="w-3 h-3 text-indigo-600" />}
                          {u.role === 'Receptionist/Cashier' && <Receipt className="w-3 h-3 text-emerald-600" />}
                          <span>{u.role}</span>
                        </span>
                      </td>
                      <td className="py-4 px-4 text-slate-600">
                        {u.employee_id ? `${u.employee_id.name} (${u.employee_id.position || 'Staff'})` : 'Unlinked'}
                      </td>
                      <td className="py-4 px-4">
                        <button
                          onClick={() => handleToggleStatus(u)}
                          title="Click to toggle Active/Inactive status"
                          className="cursor-pointer"
                        >
                          <StatusBadge status={u.status} />
                        </button>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Edit Button */}
                          <button
                            onClick={() => handleOpenModal(u)}
                            className="px-2.5 py-1.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 font-bold text-slate-700 rounded-lg transition flex items-center gap-1 text-[11px] cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>

                          {/* Delete Button */}
                          <button
                            disabled={isCurrent}
                            onClick={() => handleOpenDelete(u)}
                            title={isCurrent ? 'Cannot delete your own logged-in account' : 'Permanently delete user'}
                            className={`px-2.5 py-1.5 font-bold rounded-lg transition flex items-center gap-1 text-[11px] ${
                              isCurrent
                                ? 'bg-slate-100 text-slate-300 cursor-not-allowed'
                                : 'bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-700 cursor-pointer'
                            }`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* User Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        icon={editingUser ? Edit2 : ShieldCheck}
        title={editingUser ? `Edit User: @${editingUser.username}` : 'Create New User Account'}
        subtitle="Configure system login credentials, staff linkage, and role access permissions."
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Username *</label>
              <input
                type="text"
                required
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase().trim() })}
                placeholder="e.g. drhassan"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white transition font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                {editingUser ? 'Reset Password (leave blank to keep)' : 'Password *'}
              </label>
              <input
                type="password"
                required={!editingUser}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder={editingUser ? 'Leave blank to keep unchanged' : '••••••••'}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Access Role *</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white transition cursor-pointer"
              >
                <option value="Doctor">Doctor (Clinical Exam & Treatment)</option>
                <option value="Receptionist/Cashier">Receptionist & Cashier (Front Desk & Billing)</option>
                <option value="Admin">Administrator (Full Access)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Account Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white transition cursor-pointer"
              >
                <option value="Active">Active (Can Login)</option>
                <option value="Inactive">Inactive (Blocked)</option>
              </select>
            </div>
          </div>

          {/* Searchable Employee Linker */}
          <div>
            <SearchableSelect
              label="Link to Employee Record (Optional)"
              icon={Contact}
              placeholder="-- Search & Link Employee Profile --"
              searchPlaceholder="Type employee name, ID, or position..."
              value={formData.employee_id}
              onChange={(val, item) => {
                const emp = item?.raw || employees.find(e => e._id === val);
                setFormData({
                  ...formData,
                  employee_id: val,
                  full_name: emp ? emp.name : formData.full_name,
                  email: emp?.email ? emp.email : formData.email
                });
              }}
              options={employees.map(emp => ({
                value: emp._id,
                label: emp.name,
                sublabel: `${emp.position || 'Staff'} • ID: ${emp.employee_id}`,
                badge: emp.department || 'Staff',
                raw: emp
              }))}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Full Name</label>
              <input
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="Dr. Hassan Ali"
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
              {submitting ? 'Saving...' : editingUser ? 'Save Changes' : 'Create User Account'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete User Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        icon={Trash2}
        title="Permanently Delete User Account"
        subtitle="This action is irreversible and will remove login access for this account."
        maxWidth="max-w-md"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl space-y-2 text-rose-900">
            <div className="font-bold flex items-center gap-1.5 text-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>Are you sure you want to delete this user?</span>
            </div>
            <div className="bg-white/80 p-2.5 rounded-lg border border-rose-100 space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Username:</span>
                <span className="font-mono font-bold text-slate-900">@{userToDelete?.username}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Full Name:</span>
                <span className="font-bold text-slate-800">{userToDelete?.full_name || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Role:</span>
                <span className="font-bold text-purple-700">{userToDelete?.role}</span>
              </div>
            </div>
            <p className="text-[11px] text-rose-700">
              The user will no longer be able to log in to the clinic management system.
            </p>
          </div>

          <div className="flex justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(false)}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={handleConfirmDelete}
              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              <Trash2 className="w-4 h-4" />
              <span>{submitting ? 'Deleting...' : 'Yes, Delete User'}</span>
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
};

export default UserList;
