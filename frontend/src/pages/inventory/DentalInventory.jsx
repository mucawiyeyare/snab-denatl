import React, { useState, useEffect } from 'react';
import {
  getInventoryApi,
  createInventoryApi,
  updateInventoryApi,
  recordItemUsageApi,
  deleteInventoryApi
} from '../../api/endpoints.js';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import Modal from '../../components/ui/Modal.jsx';
import {
  Boxes,
  Plus,
  Search,
  Filter,
  DollarSign,
  AlertTriangle,
  Calendar,
  Layers,
  Edit2,
  Trash2,
  MinusCircle,
  Printer,
  CheckCircle2,
  Clock,
  Sparkles,
  Package
} from 'lucide-react';

const CATEGORIES = [
  'Dental Materials & Composites',
  'Orthodontic Supplies',
  'Surgical Instruments & Burs',
  'Anesthetics & Pharmaceuticals',
  'Diagnostic & X-Ray Supplies',
  'PPE & Sterilization',
  'Prosthodontic & Impression',
  'Equipment & Handpieces',
  'General Consumables'
];

const DentalInventory = () => {
  const [items, setItems] = useState([]);
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
  const [editingItem, setEditingItem] = useState(null);
  const [selectedItemForUsage, setSelectedItemForUsage] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    category: 'Dental Materials & Composites',
    quantity_purchased: 10,
    unit_price: 15,
    supplier: '',
    purchase_date: new Date().toISOString().split('T')[0],
    expiry_date: '',
    batch_lot_number: '',
    reorder_level: 5,
    notes: ''
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

  const handleOpenAddModal = (item = null) => {
    setErrorMsg('');
    if (item) {
      setEditingItem(item);
      setFormData({
        name: item.name,
        category: item.category,
        quantity_purchased: item.quantity_purchased,
        unit_price: item.unit_price,
        supplier: item.supplier,
        purchase_date: item.purchase_date ? new Date(item.purchase_date).toISOString().split('T')[0] : '',
        expiry_date: item.expiry_date ? new Date(item.expiry_date).toISOString().split('T')[0] : '',
        batch_lot_number: item.batch_lot_number || '',
        reorder_level: item.reorder_level || 5,
        notes: item.notes || ''
      });
    } else {
      setEditingItem(null);
      setFormData({
        name: '',
        category: 'Dental Materials & Composites',
        quantity_purchased: 10,
        unit_price: 15,
        supplier: '',
        purchase_date: new Date().toISOString().split('T')[0],
        expiry_date: '',
        batch_lot_number: '',
        reorder_level: 5,
        notes: ''
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

  const handlePrint = () => {
    window.print();
  };

  const filteredItems = items.filter(i =>
    i.name?.toLowerCase().includes(search.toLowerCase()) ||
    i.item_code?.toLowerCase().includes(search.toLowerCase()) ||
    i.supplier?.toLowerCase().includes(search.toLowerCase()) ||
    i.batch_lot_number?.toLowerCase().includes(search.toLowerCase())
  );

  const getStockStatusBadge = (status, qtyAvailable) => {
    if (status === 'Expired') {
      return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">Expired</span>;
    }
    if (status === 'Out of Stock' || qtyAvailable === 0) {
      return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">Out of Stock</span>;
    }
    if (status === 'Low Stock' || qtyAvailable <= 5) {
      return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">Low Stock</span>;
    }
    return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">In Stock</span>;
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 no-print">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Dental Materials & Equipment Inventory</h1>
          <p className="text-xs text-slate-500">Track dental consumables, orthodontic supplies, batch lots, costs, and clinical stock levels</p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold rounded-xl shadow-2xs transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            Print Stock Report
          </button>
          
          <button
            onClick={() => handleOpenAddModal()}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/20 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Material / Device
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 no-print">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Inventory Items</span>
          <p className="text-2xl font-black text-slate-900">{metrics.totalItems || filteredItems.length}</p>
          <span className="text-xs text-blue-600 font-semibold">Active catalog lines</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Purchase Value</span>
          <p className="text-2xl font-black text-emerald-600">${metrics.totalValue.toFixed(2)}</p>
          <span className="text-xs text-slate-400">Total material investment</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Low Stock Alerts</span>
          <p className="text-2xl font-black text-amber-600">{metrics.lowStockCount}</p>
          <span className="text-xs text-amber-600 font-semibold">Need reordering</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Expired / At Risk</span>
          <p className="text-2xl font-black text-rose-600">{metrics.expiredCount}</p>
          <span className="text-xs text-slate-400">Past lot expiry date</span>
        </div>
      </div>

      {/* Filters (no-print) */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 no-print">
        <div className="sm:col-span-2 bg-white p-3 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-2">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search material, device, supplier, or LOT/Batch number..."
            className="w-full text-xs font-medium focus:outline-hidden"
          />
        </div>

        <div className="bg-white p-2.5 rounded-2xl border border-slate-100 shadow-xs">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full text-xs font-bold text-slate-700 bg-transparent focus:outline-hidden"
          >
            <option value="">All Categories</option>
            {CATEGORIES.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="bg-white p-2.5 rounded-2xl border border-slate-100 shadow-xs">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full text-xs font-bold text-slate-700 bg-transparent focus:outline-hidden"
          >
            <option value="">All Stock Statuses</option>
            <option value="In Stock">In Stock</option>
            <option value="Low Stock">Low Stock</option>
            <option value="Out of Stock">Out of Stock</option>
            <option value="Expired">Expired</option>
          </select>
        </div>
      </div>

      {/* Inventory Table / Printable Area */}
      <div id="printable-area">
        
        {/* Print Header */}
        <div className="hidden print:block text-center border-b border-slate-200 pb-4 mb-4">
          <img
            src="/logo.png"
            alt="SNAB Dental Clinic Logo"
            className="w-16 h-16 mx-auto rounded-full object-cover border-2 border-amber-500 shadow-xs mb-2"
          />
          <h2 className="text-base font-black text-slate-900 uppercase">
            SNAB DENTAL AND DERMATOLOGIC CLINIC
          </h2>
          <p className="text-xs font-bold text-amber-600 uppercase">Dental Materials, Instruments & Stock Inventory Report</p>
          <p className="text-[11px] text-slate-500">Mogadishu, KM4 • Tel: +252 61 5000000 • Date: {new Date().toLocaleDateString()}</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-16 text-slate-400 text-xs">No dental inventory items found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3.5 px-4">Item Code / Name</th>
                    <th className="py-3.5 px-3">Category</th>
                    <th className="py-3.5 px-3 text-center">Purchased</th>
                    <th className="py-3.5 px-3 text-right">Unit Cost</th>
                    <th className="py-3.5 px-3 text-right">Total Cost</th>
                    <th className="py-3.5 px-3 text-center font-bold">Used</th>
                    <th className="py-3.5 px-3 text-center font-bold text-blue-700">Available / Remaining</th>
                    <th className="py-3.5 px-3">Supplier</th>
                    <th className="py-3.5 px-3">Batch / Expiry</th>
                    <th className="py-3.5 px-3 text-center">Status</th>
                    <th className="py-3.5 px-4 text-right no-print">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredItems.map((item) => (
                    <tr key={item._id} className="hover:bg-slate-50/80 transition">
                      
                      {/* Name & Code */}
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-900 block text-xs">{item.name}</span>
                        <span className="font-mono text-[10px] text-blue-600 font-bold">{item.item_code}</span>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-3 text-slate-600 text-[11px]">
                        {item.category}
                      </td>

                      {/* Quantity Purchased */}
                      <td className="py-3.5 px-3 text-center font-mono font-bold text-slate-800">
                        {item.quantity_purchased}
                      </td>

                      {/* Unit Price */}
                      <td className="py-3.5 px-3 text-right font-mono text-slate-700">
                        ${item.unit_price.toFixed(2)}
                      </td>

                      {/* Total Purchase Cost */}
                      <td className="py-3.5 px-3 text-right font-mono font-black text-slate-900">
                        ${item.total_purchase_cost.toFixed(2)}
                      </td>

                      {/* Quantity Used */}
                      <td className="py-3.5 px-3 text-center font-mono font-semibold text-rose-600">
                        {item.quantity_used || 0}
                      </td>

                      {/* Quantity Available / Remaining */}
                      <td className="py-3.5 px-3 text-center">
                        <span className="inline-block px-2.5 py-1 rounded-lg font-mono font-black text-xs bg-blue-50 text-blue-800 border border-blue-100">
                          {item.quantity_available} units
                        </span>
                      </td>

                      {/* Supplier & Purchase Date */}
                      <td className="py-3.5 px-3 text-slate-700 text-[11px]">
                        <span className="font-semibold block">{item.supplier}</span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(item.purchase_date).toLocaleDateString()}
                        </span>
                      </td>

                      {/* Batch / Expiry */}
                      <td className="py-3.5 px-3 text-[11px] font-mono">
                        {item.batch_lot_number && (
                          <span className="block font-bold text-slate-800">{item.batch_lot_number}</span>
                        )}
                        {item.expiry_date ? (
                          <span className={new Date(item.expiry_date) < new Date() ? 'text-rose-600 font-bold' : 'text-slate-500'}>
                            Exp: {new Date(item.expiry_date).toLocaleDateString()}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[10px]">No expiry</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3 text-center">
                        {getStockStatusBadge(item.status, item.quantity_available)}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right space-x-1 no-print">
                        {/* Record Usage button */}
                        <button
                          onClick={() => handleOpenUsageModal(item)}
                          title="Record Usage / Dispense from stock"
                          className="px-2 py-1 bg-amber-50 hover:bg-amber-600 hover:text-white text-amber-700 font-bold rounded-lg transition text-[11px]"
                        >
                          <MinusCircle className="w-3.5 h-3.5 inline mr-0.5" />
                          Use
                        </button>
                        
                        {/* Edit button */}
                        <button
                          onClick={() => handleOpenAddModal(item)}
                          title="Edit details"
                          className="p-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-600 rounded-lg transition"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete button */}
                        <button
                          onClick={() => handleDeleteItem(item._id, item.name)}
                          title="Delete item"
                          className="p-1 bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-600 rounded-lg transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>

                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* Add / Edit Inventory Modal */}
      {/* Add/Edit Inventory Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        icon={Boxes}
        title={editingItem ? `Edit Inventory: ${editingItem.name}` : 'Add Dental Material or Device'}
        subtitle="Track stock level, batch lot, expiration, and purchasing information."
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleSubmitItem} className="space-y-3.5 text-xs">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl font-medium">
              {errorMsg}
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Device / Material Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. 3M Filtek Composite Resin Shade A2, NiTi Archwires"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white transition font-bold"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Category *</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white transition cursor-pointer font-semibold"
            >
              {CATEGORIES.map(c => (
                <option key={c} value={c}>{c}</option>
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
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white transition font-medium"
              />
            </div>
          </div>

          {/* Batch/Lot & Expiry Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Batch / Lot Number</label>
              <input
                type="text"
                value={formData.batch_lot_number}
                onChange={(e) => setFormData({ ...formData, batch_lot_number: e.target.value })}
                placeholder="e.g. LOT-2026-X88"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 font-mono font-semibold placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white transition"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Expiry Date (if applicable)</label>
              <input
                type="date"
                value={formData.expiry_date}
                onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white transition font-medium"
              />
            </div>
          </div>

          {/* Reorder Threshold & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Notes / Material Specs</label>
              <input
                type="text"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="e.g. Light-cure composite shade A2"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white transition"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2.5 pt-2">
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

      {/* Record Usage / Dispense Modal */}
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
