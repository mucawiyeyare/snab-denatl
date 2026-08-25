import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { getServicesApi, createServiceApi, updateServiceApi, deleteServiceApi } from '../../api/endpoints.js';
import Modal from '../../components/ui/Modal.jsx';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import { Sparkles, Search, Plus, Edit2, CheckCircle2, Trash2, Stethoscope } from 'lucide-react';

const ServiceList = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';

  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [formData, setFormData] = useState({
    service_name: '',
    category: 'General Dentistry',
    price: 0,
    description: '',
    status: 'Active'
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchServices();
  }, [search, categoryFilter]);

  const fetchServices = async () => {
    setLoading(true);
    try {
      const res = await getServicesApi({ search, category: categoryFilter || undefined });
      setServices(res.data?.data || []);
    } catch (err) {
      console.error('Error fetching services:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (service = null) => {
    if (service) {
      setEditingService(service);
      setFormData({
        service_name: service.service_name,
        category: service.category,
        price: service.price || 0,
        description: service.description || '',
        status: service.status
      });
    } else {
      setEditingService(null);
      setFormData({
        service_name: '',
        category: 'General Dentistry',
        price: 0,
        description: '',
        status: 'Active'
      });
    }
    setIsModalOpen(true);
  };

  const handleDeleteService = async (service) => {
    if (window.confirm(`Are you sure you want to remove the dental service "${service.service_name}" (${service.service_code})?`)) {
      try {
        await deleteServiceApi(service._id);
        if (isModalOpen) setIsModalOpen(false);
        fetchServices();
      } catch (err) {
        console.error('Error deleting service:', err);
        alert(err.response?.data?.message || 'Error removing service');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingService) {
        await updateServiceApi(editingService._id, {
          ...formData,
          price: Number(formData.price || 0)
        });
      } else {
        await createServiceApi({
          ...formData,
          price: Number(formData.price || 0)
        });
      }
      setIsModalOpen(false);
      fetchServices();
    } catch (err) {
      console.error('Error saving service:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Dental Procedures Catalog</h1>
          <p className="text-xs text-slate-500">Configure clinical procedures across General Dentistry, Orthodontics, Oral Surgery, and Cosmetics (Prices are set by Doctor during treatment)</p>
        </div>

        {isAdmin && (
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Dental Procedure
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2 bg-white p-3 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-2">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search procedures by name or code (e.g. SRV-001, Root Canal)..."
            className="w-full text-xs font-medium focus:outline-hidden"
          />
        </div>

        <div className="bg-white p-2.5 rounded-2xl border border-slate-100 shadow-xs">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full text-xs font-bold text-slate-700 bg-transparent focus:outline-hidden"
          >
            <option value="">All Service Categories</option>
            <option value="General Dentistry">General Dentistry</option>
            <option value="Orthodontics">Orthodontics</option>
            <option value="Endodontics">Endodontics (RCT)</option>
            <option value="Periodontics">Periodontics (Gums)</option>
            <option value="Prosthodontics">Prosthodontics (Crowns/Dentures)</option>
            <option value="Oral Surgery">Oral Surgery (Extractions/Implants)</option>
            <option value="Cosmetic Dentistry">Cosmetic Dentistry (Bleaching/Veneers)</option>
            <option value="Pediatric Dentistry">Pediatric Dentistry</option>
            <option value="Diagnostic / X-Ray">Diagnostic / X-Ray</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : services.length === 0 ? (
          <div className="text-center py-16 text-slate-400 text-xs">
            No dental procedures found.
          </div>
        ) : (
          <div className="dental-table-container">
            <table className="dental-table">
              <thead>
                <tr>
                  <th className="py-3.5 px-6">Code</th>
                  <th className="py-3.5 px-4">Procedure Name</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Status</th>
                  {isAdmin && <th className="py-3.5 px-6 text-right">Action</th>}
                </tr>
              </thead>
              <tbody>
                {services.map(s => (
                  <tr key={s._id} className="hover:bg-slate-50/80 transition">
                    <td className="py-4 px-6 font-mono font-bold text-blue-600">
                      {s.service_code}
                    </td>
                    <td className="py-4 px-4">
                      <span className="font-bold text-slate-900 block">{s.service_name}</span>
                      {s.description && <span className="text-[11px] text-slate-400 block">{s.description}</span>}
                    </td>
                    <td className="py-4 px-4">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                        {s.category}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <StatusBadge status={s.status} />
                    </td>
                    {isAdmin && (
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenModal(s)}
                            className="px-2.5 py-1.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 font-bold text-slate-700 rounded-lg transition text-xs cursor-pointer"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteService(s)}
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition text-xs cursor-pointer"
                            title="Remove Service"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit/Add Service Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        icon={Sparkles}
        title={editingService ? `Edit Procedure (${editingService.service_code})` : 'Add New Dental Procedure'}
        subtitle="Fill in the details below to configure clinical dental procedures."
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Procedure Name *</label>
            <input
              type="text"
              required
              value={formData.service_name}
              onChange={(e) => setFormData({ ...formData, service_name: e.target.value })}
              placeholder="e.g. Root Canal Treatment (RCT)"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white transition"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Category *</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white transition cursor-pointer"
              >
                <option value="General Dentistry">General Dentistry</option>
                <option value="Orthodontics">Orthodontics</option>
                <option value="Endodontics">Endodontics</option>
                <option value="Periodontics">Periodontics</option>
                <option value="Prosthodontics">Prosthodontics</option>
                <option value="Oral Surgery">Oral Surgery</option>
                <option value="Cosmetic Dentistry">Cosmetic Dentistry</option>
                <option value="Pediatric Dentistry">Pediatric Dentistry</option>
                <option value="Diagnostic / X-Ray">Diagnostic / X-Ray</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Service Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white transition cursor-pointer"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl text-blue-800 text-[11px] flex items-start gap-2.5">
            <Stethoscope className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Doctor-Determined Pricing</p>
              <p className="text-blue-600 text-[10px] leading-relaxed">Procedure fee is determined directly by the treating Doctor based on clinical assessment, tooth complexity, and materials used.</p>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Description</label>
            <textarea
              rows="2"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Description of procedure or clinical inclusions..."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white transition resize-none"
            />
          </div>

          <div className="flex justify-between items-center pt-2">
            {editingService ? (
              <button
                type="button"
                onClick={() => handleDeleteService(editingService)}
                className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl font-bold flex items-center gap-1.5 transition cursor-pointer text-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove</span>
              </button>
            ) : <div />}

            <div className="flex gap-2">
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
                {submitting ? 'Saving...' : 'Save Procedure'}
              </button>
            </div>
          </div>
        </form>
      </Modal>

    </div>
  );
};

export default ServiceList;
