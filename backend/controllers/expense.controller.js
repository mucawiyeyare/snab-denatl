import Expense from '../models/Expense.js';
import { generateExpenseCode } from '../utils/generateId.js';
import { logAudit } from '../middleware/audit.js';

// @desc    Get all expenses with filter
// @route   GET /api/expenses
// @access  Private (Admin, Cashier)
export const getExpenses = async (req, res, next) => {
  try {
    const { category, startDate, endDate, search, payment_method } = req.query;
    let query = {};

    if (category) {
      query.category = category;
    }

    if (payment_method) {
      query.payment_method = payment_method;
    }

    if (startDate || endDate) {
      query.expense_date = {};
      if (startDate) {
        query.expense_date.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.expense_date.$lte = end;
      }
    }

    let expenses = await Expense.find(query)
      .populate('recorded_by', 'full_name username')
      .sort({ expense_date: -1 });

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      expenses = expenses.filter(e =>
        e.title?.toLowerCase().includes(q) ||
        e.expense_code?.toLowerCase().includes(q) ||
        e.category?.toLowerCase().includes(q) ||
        e.supplier?.toLowerCase().includes(q) ||
        e.receipt_number?.toLowerCase().includes(q)
      );
    }

    const totalAmount = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    res.json({
      success: true,
      count: expenses.length,
      total_amount: Number(totalAmount.toFixed(2)),
      data: expenses
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single expense
// @route   GET /api/expenses/:id
// @access  Private
export const getExpenseById = async (req, res, next) => {
  try {
    const expense = await Expense.findById(req.params.id).populate('recorded_by', 'full_name username');
    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense record not found' });
    }
    res.json({ success: true, data: expense });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new expense
// @route   POST /api/expenses
// @access  Private (Admin, Cashier)
export const createExpense = async (req, res, next) => {
  try {
    const {
      title,
      category,
      amount,
      expense_date,
      payment_method,
      supplier,
      receipt_number,
      notes
    } = req.body;

    if (!title || amount === undefined || amount === null) {
      return res.status(400).json({ success: false, message: 'Please provide expense title and amount' });
    }

    const expense_code = await generateExpenseCode();

    const expense = await Expense.create({
      expense_code,
      title: title.trim(),
      category: category || 'Dental Materials',
      amount: Number(amount) || 0,
      expense_date: expense_date ? new Date(expense_date) : new Date(),
      payment_method: payment_method || 'Cash',
      supplier: supplier ? supplier.trim() : '',
      receipt_number: receipt_number ? receipt_number.trim() : '',
      notes: notes ? notes.trim() : '',
      recorded_by: req.user._id
    });

    await logAudit({
      user: req.user,
      action: 'CREATE_EXPENSE',
      entity: 'Expense',
      entity_id: expense._id,
      details: {
        code: expense.expense_code,
        title: expense.title,
        category: expense.category,
        amount: expense.amount
      }
    });

    const populated = await Expense.findById(expense._id).populate('recorded_by', 'full_name username');

    res.status(201).json({
      success: true,
      message: 'Expense recorded successfully',
      data: populated
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update expense
// @route   PUT /api/expenses/:id
// @access  Private (Admin)
export const updateExpense = async (req, res, next) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense record not found' });
    }

    const updated = await Expense.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    }).populate('recorded_by', 'full_name username');

    await logAudit({
      user: req.user,
      action: 'UPDATE_EXPENSE',
      entity: 'Expense',
      entity_id: updated._id,
      details: {
        code: updated.expense_code,
        title: updated.title,
        amount: updated.amount
      }
    });

    res.json({
      success: true,
      message: 'Expense updated successfully',
      data: updated
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete expense
// @route   DELETE /api/expenses/:id
// @access  Private (Admin)
export const deleteExpense = async (req, res, next) => {
  try {
    const expense = await Expense.findByIdAndDelete(req.params.id);
    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense record not found' });
    }

    await logAudit({
      user: req.user,
      action: 'DELETE_EXPENSE',
      entity: 'Expense',
      entity_id: req.params.id,
      details: { code: expense.expense_code, title: expense.title }
    });

    res.json({
      success: true,
      message: 'Expense record deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get expense summary & breakdown
// @route   GET /api/expenses/summary/stats
// @access  Private
export const getExpenseSummary = async (req, res, next) => {
  try {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const allExpenses = await Expense.find();

    const todayExpenses = allExpenses
      .filter(e => new Date(e.expense_date) >= startOfToday)
      .reduce((sum, e) => sum + (e.amount || 0), 0);

    const monthExpenses = allExpenses
      .filter(e => new Date(e.expense_date) >= startOfMonth)
      .reduce((sum, e) => sum + (e.amount || 0), 0);

    const yearExpenses = allExpenses
      .filter(e => new Date(e.expense_date) >= startOfYear)
      .reduce((sum, e) => sum + (e.amount || 0), 0);

    const totalExpenses = allExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    // Group by category
    const categoryMap = {};
    for (const e of allExpenses) {
      const cat = e.category || 'Other Expenses';
      categoryMap[cat] = (categoryMap[cat] || 0) + (e.amount || 0);
    }

    const categoryBreakdown = Object.keys(categoryMap).map(cat => ({
      category: cat,
      total: Number(categoryMap[cat].toFixed(2))
    })).sort((a, b) => b.total - a.total);

    res.json({
      success: true,
      data: {
        today_expenses: Number(todayExpenses.toFixed(2)),
        month_expenses: Number(monthExpenses.toFixed(2)),
        year_expenses: Number(yearExpenses.toFixed(2)),
        total_expenses: Number(totalExpenses.toFixed(2)),
        total_count: allExpenses.length,
        category_breakdown: categoryBreakdown
      }
    });
  } catch (error) {
    next(error);
  }
};
