import React, { useState, useEffect } from 'react';
import {
  getInventoryApi,
  createInventoryApi,
  updateInventoryApi,
  recordItemUsageApi,
  deleteInventoryApi,
  getInventoryCategoriesApi,
  createInventoryCategoryApi,
  updateInventoryCategoryApi,
  deleteInventoryCategoryApi
} from '../../api/endpoints.js';
import { useAuth } from '../../context/AuthContext.jsx';
import Modal from '../../components/ui/Modal.jsx';
import {
  Boxes,
  Plus,
  Search,
  Filter,
  Calendar,
  DollarSign,
  Printer,
  Download,
  Edit2,
  Trash2,
  Tag,
  Building2,
  FileText,
  CreditCard,
  AlertCircle,
  CheckCircle,
  AlertTriangle,
  MinusCircle,
  Layers,
  Settings,
  X,
  Edit3
} from 'lucide-react';

const DentalInventory = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';
  const isDoctor = user?.role === 'Doctor';
  const canManage = isAdmin || isDoctor;

  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [metrics, setMetrics] = useState({
    totalItems: 0,
    totalValue: 0,
    lowStockCount: 0,
    expiredCount: 0
  });

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isUsageModalOpen, setIsUsageModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [selectedItemForUsage, setSelectedItemForUsage] = useState(null);

  // Category Management Form State
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [editingCatId, setEditingCatId] = useState(null);
  const [editCatName, setEditCatName] = useState('');
  const [editCatDesc, setEditCatDesc] = useState('');
  const [catErrorMsg, setCatErrorMsg] = useState('');

  // Material Form State (Batch/Lot and Notes removed as requested)
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    quantity_purchased: 10,
    unit_price: 15,
    supplier: '',
    purchase_date: new Date().toISOString().split('T')[0],
    expiry_date: '',
    reorder_level: 5
  });

  // Usage Form State
  const [usageForm, setUsageForm] = useState({
    quantity_used: 1,
    notes: ''
  });

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [usageErrorMsg, setUsageErrorMsg] = useState('');

  useEffect(() => {
    fetchInventory();
    fetchCategories();
  }, [categoryFilter, statusFilter]);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const params = {};
      if (categoryFilter) params.category = categoryFilter;
      if (statusFilter) params.status = statusFilter;
      if (search) params.search = search;

      const res = await getInventoryApi(params);
      setItems(res.data?.data || []);
      setMetrics(res.data?.metrics || { totalItems: 0, totalValue: 0, lowStockCount: 0, expiredCount: 0 });
    } catch (err) {
      console.error('Error fetching inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await getInventoryCategoriesApi();
      const catList = res.data?.data || [];
      setCategories(catList);
      if (catList.length > 0 && !formData.category) {
        setFormData(prev => ({ ...prev, category: prev.category || catList[0].name }));
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  const handleOpenAddModal = (item = null) => {
    setErrorMsg('');
    const defaultCat = categories.length > 0 ? categories[0].name : 'Dental Materials & Composites';
    if (item) {
      setEditingItem(item);
      setFormData({
        name: item.name,
        category: item.category || defaultCat,
        quantity_purchased: item.quantity_purchased,
        unit_price: item.unit_price,
        supplier: item.supplier,
        purchase_date: item.purchase_date ? new Date(item.purchase_date).toISOString().split('T')[0] : '',
        expiry_date: item.expiry_date ? new Date(item.expiry_date).toISOString().split('T')[0] : '',
        reorder_level: item.reorder_level || 5
      });
    } else {
      setEditingItem(null);
      setFormData({
        name: '',
        category: defaultCat,
        quantity_purchased: 10,
        unit_price: 15,
        supplier: '',
        purchase_date: new Date().toISOString().split('T')[0],
        expiry_date: '',
        reorder_level: 5
      });
    }
    setIsAddModalOpen(true);
  };

  const handleOpenUsageModal = (item) => {
    setSelectedItemForUsage(item);
    setUsageErrorMsg('');
    setUsageForm({
      quantity_used: 1,
      notes: ''
    });
    setIsUsageModalOpen(true);
  };

  const handleSubmitItem = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');
    try {
      const payload = {
        ...formData,
        quantity_purchased: Number(formData.quantity_purchased),
        unit_price: Number(formData.unit_price),
        reorder_level: Number(formData.reorder_level),
        expiry_date: formData.expiry_date || null
      };

      if (editingItem) {
        await updateInventoryApi(editingItem._id, payload);
      } else {
        await createInventoryApi(payload);
      }

      setIsAddModalOpen(false);
      fetchInventory();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Error saving inventory item');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitUsage = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setUsageErrorMsg('');
    try {
      await recordItemUsageApi(selectedItemForUsage._id, {
        quantity_used: Number(usageForm.quantity_used),
        notes: usageForm.notes
      });
      setIsUsageModalOpen(false);
      setUsageForm({ quantity_used: 1, notes: '' });
      fetchInventory();
    } catch (err) {
      console.error('Error recording usage:', err);
      setUsageErrorMsg(err.response?.data?.message || 'Failed to record usage deduction');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteItem = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete "${name}" from inventory?`)) {
      try {
        await deleteInventoryApi(id);
        fetchInventory();
      } catch (err) {
        console.error('Error deleting inventory item:', err);
      }
    }
  };

  // ── Category CRUD Handlers ──
  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    setCatErrorMsg('');
    try {
      await createInventoryCategoryApi({ name: newCatName.trim(), description: newCatDesc.trim() });
      setNewCatName('');
      setNewCatDesc('');
      fetchCategories();
    } catch (err) {
      setCatErrorMsg(err.response?.data?.message || 'Failed to create category');
    }
  };

  const handleUpdateCategory = async (catId) => {
    if (!editCatName.trim()) return;
    setCatErrorMsg('');
    try {
      await updateInventoryCategoryApi(catId, { name: editCatName.trim(), description: editCatDesc.trim() });
      setEditingCatId(null);
      fetchCategories();
      fetchInventory();
    } catch (err) {
      setCatErrorMsg(err.response?.data?.message || 'Failed to update category');
    }
  };

  const handleDeleteCategory = async (catId, catName) => {
    if (window.confirm(`Are you sure you want to delete category "${catName}"?`)) {
      try {
        await deleteInventoryCategoryApi(catId);
        fetchCategories();
      } catch (err) {
        setCatErrorMsg(err.response?.data?.message || 'Failed to delete category');
      }
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const filteredItems = items.filter(i =>
    i.name?.toLowerCase().includes(search.toLowerCase()) ||
    i.item_code?.toLowerCase().includes(search.toLowerCase()) ||
    i.supplier?.toLowerCase().includes(search.toLowerCase()) ||
    i.category?.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusBadge = (status, available, reorderLevel) => {
    switch (status) {
      case 'In Stock':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            ● In Stock ({available})
          </span>
        );
      case 'Low Stock':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
            ▲ Low Stock ({available} left)
          </span>
        );
      case 'Out of Stock':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            ✕ Out of Stock
          </span>
        );
      case 'Expired':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
            ⏰ Expired
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-50 text-slate-700 border border-slate-200">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      
      {/* ── Page Header & Action Controls ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 no-print">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Boxes className="w-6 h-6 text-blue-600" />
            <span>Dental Inventory & Supplies</span>
          </h1>
          <p className="text-xs text-slate-500">
            Track dental materials, clinic supplies, clinical usage deductions, and reorder levels
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          {canManage && (
            <>
              <button
                onClick={() => {
                  setCatErrorMsg('');
                  setIsCategoryModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl border border-slate-200 transition cursor-pointer"
              >
                <Layers className="w-4 h-4 text-blue-600" />
                <span>Categories</span>
              </button>

              <button
                onClick={() => handleOpenAddModal()}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Dental Material</span>
              </button>
            </>
          )}

          <button
            onClick={handlePrint}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition cursor-pointer"
            title="Print Inventory Stock Report"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── KPI Summary Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4.5 rounded-2xl border border-slate-100 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Total Items</span>
          <p className="text-2xl font-black text-slate-900 font-mono">{metrics.totalItems}</p>
          <span className="text-[10px] text-slate-500 block">Active catalog items</span>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-slate-100 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Total Valuation</span>
          <p className="text-2xl font-black text-emerald-600 font-mono">${metrics.totalValue.toFixed(2)}</p>
          <span className="text-[10px] text-emerald-600 font-bold block">Purchase value in stock</span>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-slate-100 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Low / Out of Stock</span>
          <p className="text-2xl font-black text-amber-600 font-mono">{metrics.lowStockCount}</p>
          <span className="text-[10px] text-amber-600 font-bold block">Requires reordering</span>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-slate-100 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Expired Items</span>
          <p className="text-2xl font-black text-rose-600 font-mono">{metrics.expiredCount}</p>
          <span className="text-[10px] text-rose-600 font-bold block">Past expiry date</span>
        </div>
      </div>

      {/* ── Search & Filter Controls ── */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-100 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 no-print">
          
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search materials by name, item code, supplier..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="p-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 focus:bg-white cursor-pointer"
            >
              <option value="">All Categories ({categories.length})</option>
              {categories.map(c => (
                <option key={c._id} value={c.name}>{c.name}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="p-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 focus:bg-white cursor-pointer"
            >
              <option value="">All Statuses</option>
              <option value="In Stock">In Stock</option>
              <option value="Low Stock">Low Stock</option>
              <option value="Out of Stock">Out of Stock</option>
              <option value="Expired">Expired</option>
            </select>
          </div>

        </div>

        {/* ── Table & Cards View ── */}
        {loading ? (
          <div className="text-center py-16">
            <div className="w-7 h-7 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2.5" />
            <p className="text-xs text-slate-400 font-medium">Loading inventory...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-16 bg-slate-50 rounded-2xl border border-dashed border-slate-200 p-6">
            <Boxes className="w-9 h-9 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-700">No inventory materials found</p>
            <p className="text-xs text-slate-400 mt-0.5">Click "Add Dental Material" to register inventory supplies.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden lg:block dental-table-container">
              <table className="dental-table">
                <thead>
                  <tr>
                    <th className="py-3 px-4">ITEM CODE</th>
                    <th className="py-3 px-4">MATERIAL / DEVICE</th>
                    <th className="py-3 px-4">CATEGORY</th>
                    <th className="py-3 px-4">SUPPLIER</th>
                    <th className="py-3 px-4 text-center">PURCHASED</th>
                    <th className="py-3 px-4 text-center">USED</th>
                    <th className="py-3 px-4 text-center">AVAILABLE</th>
                    <th className="py-3 px-4 text-right">UNIT PRICE</th>
                    <th className="py-3 px-4 text-center">STATUS</th>
                    <th className="py-3 px-4 text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item) => (
                    <tr key={item._id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-blue-600">
                        {item.item_code || 'INV-MAT'}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-900 block">{item.name}</span>
                        {item.expiry_date && (
                          <span className="text-[10px] text-slate-400 font-mono">
                            Exp: {new Date(item.expiry_date).toLocaleDateString()}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 font-bold text-[10px] border border-blue-100">
                          {item.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-medium">
                        {item.supplier}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-700">
                        {item.quantity_purchased}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-rose-600">
                        {item.quantity_used || 0}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-black text-emerald-700 text-sm">
                        {item.quantity_available}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                        ${Number(item.unit_price || 0).toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {getStatusBadge(item.status, item.quantity_available, item.reorder_level)}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {canManage && (
                            <>
                              <button
                                onClick={() => handleOpenUsageModal(item)}
                                title="Deduct Used Materials in Clinical Procedure"
                                className="px-2.5 py-1 bg-amber-50 hover:bg-amber-600 hover:text-white text-amber-700 font-bold rounded-lg text-[11px] transition cursor-pointer flex items-center gap-1"
                              >
                                <MinusCircle className="w-3.5 h-3.5" />
                                <span>Use</span>
                              </button>

                              <button
                                onClick={() => handleOpenAddModal(item)}
                                title="Edit Material"
                                className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition cursor-pointer"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              {isAdmin && (
                                <button
                                  onClick={() => handleDeleteItem(item._id, item.name)}
                                  title="Delete Item"
                                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile / Tablet Responsive Cards */}
            <div className="lg:hidden grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {filteredItems.map((item) => (
                <div key={item._id} className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-mono font-bold text-blue-600 text-xs">{item.item_code}</span>
                      <h4 className="font-bold text-slate-900 text-sm">{item.name}</h4>
                      <span className="text-[10px] text-blue-700 font-bold">{item.category}</span>
                    </div>
                    {getStatusBadge(item.status, item.quantity_available, item.reorder_level)}
                  </div>

                  <div className="grid grid-cols-3 gap-2 bg-white p-2 rounded-xl border border-slate-100 text-center font-mono">
                    <div>
                      <span className="text-[9px] text-slate-400 uppercase font-sans font-bold block">Purchased</span>
                      <span className="text-xs font-bold text-slate-800">{item.quantity_purchased}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 uppercase font-sans font-bold block">Used</span>
                      <span className="text-xs font-bold text-rose-600">{item.quantity_used || 0}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 uppercase font-sans font-bold block">Available</span>
                      <span className="text-xs font-black text-emerald-600">{item.quantity_available}</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-[10px] text-slate-500 pt-2 border-t border-slate-200/60">
                    <span>Supplier: <strong>{item.supplier}</strong></span>
                    <span className="font-mono font-bold text-slate-800">${Number(item.unit_price || 0).toFixed(2)}/unit</span>
                  </div>

                  {canManage && (
                    <div className="flex justify-end gap-1.5 pt-1">
                      <button
                        onClick={() => handleOpenUsageModal(item)}
                        className="px-3 py-1.5 bg-amber-500 text-white font-bold rounded-lg text-xs"
                      >
                        Record Usage
                      </button>
                      <button
                        onClick={() => handleOpenAddModal(item)}
                        className="px-3 py-1.5 bg-slate-200 text-slate-700 font-bold rounded-lg text-xs"
                      >
                        Edit
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: ADD / EDIT DENTAL MATERIAL (Batch/Lot & Notes Removed)          */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        icon={Boxes}
        title={editingItem ? 'Edit Dental Material or Device' : 'Add Dental Material or Device'}
        subtitle="Track stock level, unit pricing, expiration, and purchasing information."
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleSubmitItem} className="space-y-3.5 text-xs">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 font-bold text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Device / Material Name */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Device / Material Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. 3M Filtek Composite Resin Shade A2, NiTi Archwires"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white transition font-bold"
            />
          </div>

          {/* Category with Quick Add / Manage Button */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-[11px] font-bold text-slate-700">Category *</label>
              <button
                type="button"
                onClick={() => {
                  setCatErrorMsg('');
                  setIsCategoryModalOpen(true);
                }}
                className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-0.5 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Manage Categories</span>
              </button>
            </div>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white transition cursor-pointer font-semibold"
            >
              {categories.map(c => (
                <option key={c._id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Quantities & Pricing */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Quantity Purchased *</label>
              <input
                type="number"
                min="1"
                required
                value={formData.quantity_purchased}
                onChange={(e) => setFormData({ ...formData, quantity_purchased: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 font-mono font-bold focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white transition"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Unit Price ($) *</label>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={formData.unit_price}
                onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 font-mono font-bold focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white transition"
              />
            </div>
          </div>

          {/* Total Cost Display */}
          <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl flex justify-between items-center text-xs font-bold text-blue-900">
            <span>Total Purchase Cost:</span>
            <span className="text-sm font-mono font-black text-blue-700">
              ${((Number(formData.quantity_purchased) || 0) * (Number(formData.unit_price) || 0)).toFixed(2)}
            </span>
          </div>

          {/* Supplier & Purchase Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Supplier Name *</label>
              <input
                type="text"
                required
                value={formData.supplier}
                onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                placeholder="e.g. DentalDirect, MedEquip Somalia"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white transition"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Purchase Date</label>
              <input
                type="date"
                value={formData.purchase_date}
                onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white transition font-medium cursor-pointer"
              />
            </div>
          </div>

          {/* Expiry Date & Low Stock Threshold (Side-by-side with Batch/Lot and Notes removed) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Expiry Date (if applicable)</label>
              <input
                type="date"
                value={formData.expiry_date}
                onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white transition font-medium cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Low Stock Alert Threshold</label>
              <input
                type="number"
                min="1"
                value={formData.reorder_level}
                onChange={(e) => setFormData({ ...formData, reorder_level: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 font-mono focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white transition"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold text-xs rounded-xl shadow-sm transition cursor-pointer disabled:opacity-50"
            >
              {submitting ? 'Saving...' : editingItem ? 'Save Updates' : 'Add to Inventory'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 2: MANAGE INVENTORY CATEGORIES (Admin & Doctor CRUD)                */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        icon={Layers}
        title="Manage Inventory Categories"
        subtitle="Add, edit, or remove categories for dental materials and clinic supplies."
        maxWidth="max-w-lg"
      >
        <div className="space-y-4 text-xs">
          {catErrorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 font-bold text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{catErrorMsg}</span>
            </div>
          )}

          {/* Create New Category Form */}
          <form onSubmit={handleCreateCategory} className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
            <h4 className="font-black text-slate-800 text-xs flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-blue-600" />
              <span>Add New Category</span>
            </h4>
            <div className="flex gap-2">
              <input
                type="text"
                required
                placeholder="Category Name (e.g. Endodontics, Implants)..."
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-500"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition cursor-pointer"
              >
                Add
              </button>
            </div>
          </form>

          {/* List of Existing Categories */}
          <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Existing Categories ({categories.length})
            </span>
            {categories.map((cat) => (
              <div
                key={cat._id}
                className="flex items-center justify-between p-2.5 bg-white border border-slate-200/80 rounded-xl hover:border-slate-300 transition"
              >
                {editingCatId === cat._id ? (
                  <div className="flex items-center gap-2 flex-1 mr-2">
                    <input
                      type="text"
                      value={editCatName}
                      onChange={(e) => setEditCatName(e.target.value)}
                      className="flex-1 px-2.5 py-1 text-xs font-bold border border-blue-400 rounded-lg focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleUpdateCategory(cat._id)}
                      className="px-2.5 py-1 bg-emerald-600 text-white font-bold rounded-lg text-[10px]"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingCatId(null)}
                      className="px-2 py-1 bg-slate-100 text-slate-600 font-bold rounded-lg text-[10px]"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="font-bold text-slate-800">{cat.name}</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCatId(cat._id);
                          setEditCatName(cat.name);
                          setEditCatDesc(cat.description || '');
                        }}
                        title="Rename Category"
                        className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCategory(cat._id, cat.name)}
                        title="Delete Category"
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsCategoryModalOpen(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
            >
              Done
            </button>
          </div>
        </div>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 3: RECORD USAGE / DISPENSE DENTAL MATERIAL                          */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isUsageModalOpen}
        onClose={() => setIsUsageModalOpen(false)}
        icon={Boxes}
        title={`Record Usage: ${selectedItemForUsage?.name}`}
        subtitle="Deduct materials used in clinical dental procedures."
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSubmitUsage} className="space-y-3.5 text-xs">
          {usageErrorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 font-bold text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{usageErrorMsg}</span>
            </div>
          )}

          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-500">Currently Available:</span>
              <span className="font-mono font-bold text-blue-700">{selectedItemForUsage?.quantity_available} units</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Previously Used:</span>
              <span className="font-mono font-semibold text-rose-600">{selectedItemForUsage?.quantity_used || 0} units</span>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Quantity Used in Clinical Procedures *</label>
            <input
              type="number"
              min="1"
              max={selectedItemForUsage?.quantity_available || 100}
              required
              value={usageForm.quantity_used}
              onChange={(e) => setUsageForm({ ...usageForm, quantity_used: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-rose-300 font-mono font-black text-base text-rose-600 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 bg-rose-50/20 transition"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Usage Notes / Procedure Reference</label>
            <input
              type="text"
              value={usageForm.notes}
              onChange={(e) => setUsageForm({ ...usageForm, notes: e.target.value })}
              placeholder="e.g. Used for root canal restoration cases"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white transition"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setIsUsageModalOpen(false)}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 active:scale-[0.99] text-white font-bold text-xs rounded-xl shadow-sm transition cursor-pointer disabled:opacity-50"
            >
              {submitting ? 'Recording...' : 'Deduct from Stock'}
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
};

export default DentalInventory;
