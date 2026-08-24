import React, { useState, useEffect } from 'react';
import {
  getExpensesApi,
  getExpenseSummaryApi,
  createExpenseApi,
  updateExpenseApi,
  deleteExpenseApi
} from '../../api/endpoints.js';
import { useAuth } from '../../context/AuthContext.jsx';
import Modal from '../../components/ui/Modal.jsx';
import {
  TrendingDown,
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
  Boxes,
  Stethoscope
} from 'lucide-react';

const EXPENSE_CATEGORIES = [
  'Dental Materials',
  'Dental Instruments',
  'Laboratory Expenses',
  'Dental Supplies',
  'Equipment Maintenance',
  'Equipment Purchases',
  'Medication & Pharmaceuticals',
  'Consumables & Disposables',
  'Staff Salaries & Allowances',
  'Clinic Operating Expenses',
  'Other Expenses'
];

const PAYMENT_METHODS = [
  'Cash',
  'EVC Plus',
  'eDahab',
  'Card',
  'Bank Transfer',
  'Cheque',
  'Other'
];

const ExpenseManager = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';
  const isCashier = user?.role === 'Receptionist/Cashier' || isAdmin;

  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [timeFilter, setTimeFilter] = useState('all'); // 'all' | 'today' | 'month' | 'year'

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  // Form State
  const [form, setForm] = useState({
    title: '',
    category: 'Dental Materials',
    amount: '',
    expense_date: new Date().toISOString().split('T')[0],
    payment_method: 'Cash',
    supplier: '',
    receipt_number: '',
    notes: ''
  });

  useEffect(() => {
    fetchExpenses();
    fetchSummary();
  }, [categoryFilter, methodFilter, timeFilter]);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4000);
  };

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      let startDate = undefined;
      let endDate = undefined;
      const now = new Date();

      if (timeFilter === 'today') {
        startDate = now.toISOString().split('T')[0];
        endDate = now.toISOString().split('T')[0];
      } else if (timeFilter === 'month') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
      } else if (timeFilter === 'year') {
        startDate = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
        endDate = new Date(now.getFullYear(), 11, 31).toISOString().split('T')[0];
      }

      const res = await getExpensesApi({
        category: categoryFilter || undefined,
        payment_method: methodFilter || undefined,
        startDate,
        endDate
      });
      setExpenses(res.data?.data || []);
    } catch (err) {
      console.error('Error fetching expenses:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const res = await getExpenseSummaryApi();
      setSummary(res.data?.data || null);
    } catch (err) {
      console.error('Error fetching expense summary:', err);
    }
  };

  const handleOpenAdd = () => {
    setEditingExpense(null);
    setForm({
      title: '',
      category: 'Dental Materials',
      amount: '',
      expense_date: new Date().toISOString().split('T')[0],
      payment_method: 'Cash',
      supplier: '',
      receipt_number: '',
      notes: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (exp) => {
    setEditingExpense(exp);
    setForm({
      title: exp.title || '',
      category: exp.category || 'Dental Materials',
      amount: exp.amount || '',
      expense_date: exp.expense_date ? new Date(exp.expense_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      payment_method: exp.payment_method || 'Cash',
      supplier: exp.supplier || '',
      receipt_number: exp.receipt_number || '',
      notes: exp.notes || ''
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.amount) {
      alert('Please fill in the expense title and amount');
      return;
    }

    setSubmitting(true);
    try {
      if (editingExpense) {
        await updateExpenseApi(editingExpense._id, form);
        showToast('Expense updated successfully!');
      } else {
        await createExpenseApi(form);
        showToast('New expense recorded successfully!');
      }
      setIsModalOpen(false);
      setEditingExpense(null);
      fetchExpenses();
      fetchSummary();
    } catch (err) {
      console.error('Error saving expense:', err);
      alert(err.response?.data?.message || 'Error saving expense');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteExpenseApi(id);
      setDeleteConfirmId(null);
      fetchExpenses();
      fetchSummary();
      showToast('Expense record deleted.');
    } catch (err) {
      console.error('Error deleting expense:', err);
      alert(err.response?.data?.message || 'Error deleting expense');
    }
  };

  const handleExportCSV = () => {
    if (expenses.length === 0) {
      alert('No expense records to export.');
      return;
    }

    const headers = ['Code', 'Date', 'Title', 'Category', 'Amount ($)', 'Payment Method', 'Supplier', 'Receipt #', 'Notes', 'Recorded By'];
    const rows = expenses.map(e => [
      e.expense_code,
      new Date(e.expense_date).toLocaleDateString(),
      `"${e.title}"`,
      `"${e.category}"`,
      e.amount,
      e.payment_method,
      `"${e.supplier || ''}"`,
      `"${e.receipt_number || ''}"`,
      `"${e.notes || ''}"`,
      `"${e.recorded_by?.full_name || 'Admin'}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `SNAB_Clinic_Expenses_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredExpenses = expenses.filter(e => {
    const q = search.toLowerCase();
    return (
      e.title?.toLowerCase().includes(q) ||
      e.expense_code?.toLowerCase().includes(q) ||
      e.category?.toLowerCase().includes(q) ||
      e.supplier?.toLowerCase().includes(q) ||
      e.receipt_number?.toLowerCase().includes(q)
    );
  });

  const totalFilteredAmount = filteredExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  return (
    <div className="space-y-6">
      
      {/* Toast */}
      {toastMsg && (
        <div className="fixed top-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 font-bold text-xs animate-bounce">
          <CheckCircle className="w-4 h-4" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 no-print">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <TrendingDown className="w-6 h-6 text-rose-600" />
            <span>Dental Clinic Expenses</span>
          </h1>
          <p className="text-xs text-slate-500">
            Track dental materials, lab fees, equipment maintenance, medications, and operational costs
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs rounded-xl border border-emerald-200 transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Print</span>
          </button>

          {isCashier && (
            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-md shadow-rose-500/20 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Record Expense</span>
            </button>
          )}
        </div>
      </div>

      {/* Summary KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 sm:p-5 bg-white border border-slate-100 rounded-3xl shadow-2xs space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Today's Expenses</span>
          <p className="text-xl sm:text-2xl font-black text-rose-600 font-mono">
            ${(summary?.today_expenses || 0).toFixed(2)}
          </p>
          <span className="text-[10px] text-slate-400">Daily clinic payout</span>
        </div>

        <div className="p-4 sm:p-5 bg-white border border-slate-100 rounded-3xl shadow-2xs space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">This Month</span>
          <p className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
            ${(summary?.month_expenses || 0).toFixed(2)}
          </p>
          <span className="text-[10px] text-slate-400">{new Date().toLocaleString('default', { month: 'long' })} expenses</span>
        </div>

        <div className="p-4 sm:p-5 bg-white border border-slate-100 rounded-3xl shadow-2xs space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">This Year ({new Date().getFullYear()})</span>
          <p className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
            ${(summary?.year_expenses || 0).toFixed(2)}
          </p>
          <span className="text-[10px] text-slate-400">Annual cumulative</span>
        </div>

        <div className="p-4 sm:p-5 bg-gradient-to-br from-rose-600 to-red-800 text-white rounded-3xl shadow-md space-y-1">
          <span className="text-[10px] font-bold text-rose-100 uppercase tracking-wider">Top Expense Area</span>
          <p className="text-sm font-black truncate">
            {summary?.category_breakdown?.[0]?.category || 'Dental Materials'}
          </p>
          <span className="text-[10px] text-rose-100 font-mono">
            ${(summary?.category_breakdown?.[0]?.total || 0).toFixed(2)} total
          </span>
        </div>
      </div>

      {/* Main Expense Table & Filter Container */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-100 shadow-2xs space-y-4">
        
        {/* Filters Bar */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 no-print">
          
          {/* Time Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-2xl">
            {[
              { id: 'all', label: 'All Time' },
              { id: 'today', label: 'Today' },
              { id: 'month', label: 'This Month' },
              { id: 'year', label: 'This Year' }
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setTimeFilter(t.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition ${
                  timeFilter === t.id ? 'bg-white text-rose-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            {/* Category Select */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
            >
              <option value="">All Categories</option>
              {EXPENSE_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            {/* Method Select */}
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
            >
              <option value="">All Payment Methods</option>
              {PAYMENT_METHODS.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>

            {/* Search */}
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search title, supplier, receipt..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Expenses List View */}
        {loading ? (
          <div className="text-center py-12">
            <div className="w-6 h-6 border-2 border-rose-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs text-slate-400">Loading expense records...</p>
          </div>
        ) : filteredExpenses.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200 p-6">
            <TrendingDown className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-700">No expense records found</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Click "+ Record Expense" to log clinic materials, lab costs, or operational bills.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Code</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Expense Description</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Supplier / Vendor</th>
                    <th className="py-3 px-4">Method</th>
                    <th className="py-3 px-4">Receipt #</th>
                    <th className="py-3 px-4 text-right">Amount ($)</th>
                    {isAdmin && <th className="py-3 px-4 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredExpenses.map((exp) => (
                    <tr key={exp._id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 font-mono font-bold text-slate-500">{exp.expense_code}</td>
                      <td className="py-3 px-4 text-slate-600 font-mono">
                        {new Date(exp.expense_date).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 block">{exp.title}</span>
                        {exp.notes && <span className="text-[10px] text-slate-400 font-normal">{exp.notes}</span>}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-800 text-[10px] font-bold">
                          {exp.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-700 font-medium">{exp.supplier || '—'}</td>
                      <td className="py-3 px-4 text-slate-600">{exp.payment_method}</td>
                      <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">{exp.receipt_number || '—'}</td>
                      <td className="py-3 px-4 text-right font-mono font-black text-rose-600 text-sm">
                        ${Number(exp.amount || 0).toFixed(2)}
                      </td>
                      {isAdmin && (
                        <td className="py-3 px-4 text-right">
                          {deleteConfirmId === exp._id ? (
                            <div className="inline-flex items-center gap-1 bg-rose-50 border border-rose-200 rounded-xl px-2 py-0.5">
                              <span className="text-[10px] font-bold text-rose-700">Delete?</span>
                              <button
                                onClick={() => handleDelete(exp._id)}
                                className="px-2 py-0.5 bg-rose-600 text-white rounded font-bold text-[10px]"
                              >
                                Yes
                              </button>
                              <button
                                onClick={() => setDeleteConfirmId(null)}
                                className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded font-bold text-[10px]"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleOpenEdit(exp)}
                                className="p-1.5 bg-amber-50 hover:bg-amber-500 hover:text-white text-amber-600 rounded-lg transition cursor-pointer"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setDeleteConfirmId(exp._id)}
                                className="p-1.5 bg-rose-50 hover:bg-rose-500 hover:text-white text-rose-500 rounded-lg transition cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile & Tablet Stacked Cards */}
            <div className="lg:hidden grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredExpenses.map((exp) => (
                <div key={exp._id} className="p-4 bg-slate-50/70 border border-slate-200 rounded-2xl space-y-2.5">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-mono font-bold text-slate-400 text-[10px]">{exp.expense_code}</span>
                      <h4 className="font-bold text-slate-900 text-sm">{exp.title}</h4>
                      <span className="text-[10px] text-slate-500">{new Date(exp.expense_date).toLocaleDateString()}</span>
                    </div>
                    <span className="font-mono font-black text-rose-600 text-base">
                      ${Number(exp.amount || 0).toFixed(2)}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                    <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 font-bold text-slate-700">
                      {exp.category}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600">
                      {exp.payment_method}
                    </span>
                    {exp.supplier && (
                      <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600 truncate max-w-[150px]">
                        Vendor: {exp.supplier}
                      </span>
                    )}
                  </div>

                  {isAdmin && (
                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-200/60">
                      <button
                        onClick={() => handleOpenEdit(exp)}
                        className="px-2.5 py-1 bg-amber-50 text-amber-700 font-bold rounded-lg text-xs"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(exp._id)}
                        className="px-2.5 py-1 bg-rose-50 text-rose-700 font-bold rounded-lg text-xs"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Total Footer */}
            <div className="flex justify-between items-center p-3 bg-slate-900 text-white rounded-2xl font-mono text-xs">
              <span className="font-bold uppercase tracking-wider text-slate-300">Total Filtered Expenses</span>
              <span className="text-base font-black text-rose-400">${totalFilteredAmount.toFixed(2)}</span>
            </div>
          </>
        )}

      </div>

      {/* ========================================================================= */}
      {/* MODAL: ADD / EDIT EXPENSE                                                 */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        icon={TrendingDown}
        title={editingExpense ? "Edit Clinic Expense" : "Record New Dental & Clinic Expense"}
        subtitle="Log materials purchase, lab invoices, instrument orders, and operating costs."
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Expense Title / Description *</label>
            <input
              type="text"
              required
              placeholder="e.g. Composite Resin Refills, Autoclave Maintenance, Gloves"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Expense Category *</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
              >
                {EXPENSE_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Amount ($) *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  className="w-full pl-7 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-rose-600"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Expense Date</label>
              <input
                type="date"
                value={form.expense_date}
                onChange={(e) => setForm({ ...form, expense_date: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold cursor-pointer"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Payment Method</label>
              <select
                value={form.payment_method}
                onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
              >
                {PAYMENT_METHODS.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Supplier / Vendor Name</label>
              <input
                type="text"
                placeholder="e.g. 3M Dental, MedEquip, Local Lab"
                value={form.supplier}
                onChange={(e) => setForm({ ...form, supplier: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Receipt / Invoice Ref #</label>
              <input
                type="text"
                placeholder="e.g. REC-9921, LAB-004"
                value={form.receipt_number}
                onChange={(e) => setForm({ ...form, receipt_number: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Notes / Additional Info</label>
            <input
              type="text"
              placeholder="e.g. Quarterly order for restorative dental treatments"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 font-bold rounded-xl text-xs transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-md transition cursor-pointer disabled:opacity-50"
            >
              {submitting ? 'Saving...' : editingExpense ? 'Update Expense' : 'Save Expense Record'}
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
};

export default ExpenseManager;
