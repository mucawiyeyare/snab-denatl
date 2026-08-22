import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { getDoctorsApi, getVisitsApi, createEmployeeApi } from '../../api/endpoints.js';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import Modal from '../../components/ui/Modal.jsx';
import {
  Stethoscope,
  Search,
  Plus,
  Phone,
  Mail,
  Award,
  Calendar,
  Activity,
  CheckCircle2,
  Building2
} from 'lucide-react';

const DoctorList = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';
  const navigate = useNavigate();

  const [doctors, setDoctors] = useState([]);
  const [activeVisits, setActiveVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [specialtyFilter, setSpecialtyFilter] = useState('All');

  // Add doctor modal (for admin)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    specialization: 'General Dental Surgery',
    department: 'Dental Surgery',
    salary: 2500,
    status: 'Active'
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [docRes, visitRes] = await Promise.all([
        getDoctorsApi(),
        getVisitsApi({ today: 'true' }).catch(() => ({ data: { data: [] } }))
      ]);
      setDoctors(docRes.data?.data || []);
      setActiveVisits(visitRes.data?.data || []);
    } catch (err) {
      console.error('Error fetching doctors:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDoctor = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createEmployeeApi({
        ...formData,
        position: 'Dental Surgeon'
      });
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      console.error('Error adding doctor:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const getDoctorQueueCount = (doctorId) => {
    return activeVisits.filter(v =>
      (v.doctor_id?._id === doctorId || v.doctor_id === doctorId) &&
      !['Completed', 'Cancelled'].includes(v.status)
    ).length;
  };

  const specialties = ['All', ...new Set(doctors.map(d => d.employee_id?.specialization || 'General Dental Surgery'))];

  const filteredDoctors = doctors.filter(d => {
    const nameMatch = (d.full_name || d.username).toLowerCase().includes(search.toLowerCase());
    const specMatch = (d.employee_id?.specialization || '').toLowerCase().includes(search.toLowerCase());
    const emailMatch = (d.email || '').toLowerCase().includes(search.toLowerCase());
    const filterMatch = specialtyFilter === 'All' || (d.employee_id?.specialization || 'General Dental Surgery') === specialtyFilter;
    return (nameMatch || specMatch || emailMatch) && filterMatch;
  });

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Doctors & Specialists</h1>
          <p className="text-xs text-slate-500">View attending dental surgeons, active patient queues, and clinic schedules</p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => navigate('/appointments')}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer shadow-2xs"
          >
            <Calendar className="w-4 h-4 text-blue-600" />
            Book with Doctor
          </button>

          {isAdmin && (
            <button
              onClick={() => {
                setFormData({
                  name: '',
                  phone: '',
                  email: '',
                  specialization: 'General Dental Surgery',
                  department: 'Dental Surgery',
                  salary: 2500,
                  status: 'Active'
                });
                setIsModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/20 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add Doctor
            </button>
          )}
        </div>
      </div>

      {/* ── Stats Summary Row ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Stethoscope className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">Total Doctors</span>
            <span className="text-xl font-black text-slate-900">{doctors.length} Attending Surgeons</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">Active on Duty</span>
            <span className="text-xl font-black text-emerald-700">{doctors.filter(d => d.status === 'Active').length} Available</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">Patients in Queue</span>
            <span className="text-xl font-black text-amber-700">{activeVisits.length} Consultations Today</span>
          </div>
        </div>
      </div>

      {/* ── Filters & Search ── */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex-1 bg-white p-3 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-2">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by doctor name, specialization, or email..."
            className="w-full text-xs font-medium focus:outline-none"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-xs text-slate-400 hover:text-slate-600 font-bold cursor-pointer">Clear</button>
          )}
        </div>

        {specialties.length > 2 && (
          <div className="flex gap-1.5 bg-slate-100 p-1 rounded-2xl overflow-x-auto shrink-0">
            {specialties.map(spec => (
              <button
                key={spec}
                onClick={() => setSpecialtyFilter(spec)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                  specialtyFilter === spec
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {spec}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Doctor Cards Grid ── */}
      {loading ? (
        <div className="flex items-center justify-center h-48 bg-white rounded-2xl border border-slate-100">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredDoctors.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-100 space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Stethoscope className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-slate-700">No doctors found</p>
          <p className="text-xs text-slate-400">Try adjusting your search criteria or add a doctor.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDoctors.map(doc => {
            const queueCount = getDoctorQueueCount(doc._id);
            const employee = doc.employee_id || {};
            const spec = employee.specialization || 'General Dental Surgery';

            return (
              <div
                key={doc._id}
                className="bg-white rounded-2xl border border-slate-100 shadow-xs p-5 hover:shadow-md transition-all duration-200 space-y-4 flex flex-col justify-between"
              >
                {/* Doctor Top Profile */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-base border border-blue-100/80 shadow-2xs shrink-0 overflow-hidden">
                        {doc.profile_image ? (
                          <img src={doc.profile_image} alt={doc.full_name} className="w-full h-full object-cover" />
                        ) : (
                          <Stethoscope className="w-6 h-6 text-blue-600" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-black text-slate-900 truncate">
                          Dr. {doc.full_name || doc.username}
                        </h3>
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600">
                          <Award className="w-3 h-3" />
                          {spec}
                        </span>
                      </div>
                    </div>
                    <StatusBadge status={doc.status || 'Active'} />
                  </div>

                  {/* Details */}
                  <div className="space-y-1.5 pt-1 text-xs text-slate-600 border-t border-slate-50">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{employee.department || 'Dental Surgery Department'}</span>
                    </div>
                    {employee.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-mono text-slate-700">{employee.phone}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate text-slate-500">{doc.email || `${doc.username}@snabdental.com`}</span>
                    </div>
                  </div>
                </div>

                {/* Queue status & actions */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${queueCount > 0 ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
                    <span className="text-[11px] font-bold text-slate-600">
                      {queueCount > 0 ? `${queueCount} in queue` : 'No queue'}
                    </span>
                  </div>

                  <div className="flex gap-1.5">
                    <button
                      onClick={() => navigate(`/visits?doctor=${doc._id}`)}
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
                    >
                      Queue
                    </button>
                    <button
                      onClick={() => navigate('/appointments')}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-2xs transition cursor-pointer"
                    >
                      Book
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Add Doctor Modal ── */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        icon={Stethoscope}
        title="Add Attending Doctor"
        subtitle="Register a new dental doctor / specialist in SNAB Dental MS."
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleCreateDoctor} className="space-y-3.5 text-xs">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Doctor Full Name *</label>
            <input
              required
              type="text"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Dr. Hassan Mohamed"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white transition"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Phone Number *</label>
              <input
                required
                type="text"
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+252 61..."
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white transition"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Email Address</label>
              <input
                type="email"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                placeholder="doctor@snabdental.com"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Specialization *</label>
              <input
                required
                type="text"
                value={formData.specialization}
                onChange={e => setFormData({ ...formData, specialization: e.target.value })}
                placeholder="e.g. Orthodontics, Oral Surgery"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white transition"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Department</label>
              <input
                type="text"
                value={formData.department}
                onChange={e => setFormData({ ...formData, department: e.target.value })}
                placeholder="Dental Surgery"
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
              {submitting ? 'Adding...' : 'Save Doctor'}
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
};

export default DoctorList;
