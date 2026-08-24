import Medicine from '../models/Medicine.js';
import Payment from '../models/Payment.js';
import Prescription from '../models/Prescription.js';
import { generateMedicineCode } from '../utils/generateId.js';
import { logAudit } from '../middleware/audit.js';

// @desc    Get all medicines
// @route   GET /api/medicines
// @access  Private (Doctor, Cashier, Admin)
export const getMedicines = async (req, res, next) => {
  try {
    const { category, status, search, low_stock, expiring_soon } = req.query;
    let filter = {};

    if (category) filter.category = category;
    if (status) filter.status = status;

    let medicines = await Medicine.find(filter).sort({ name: 1 });

    const now = new Date();
    const ninetyDays = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    // Dynamic stock/expiry status check
    medicines = medicines.map(m => {
      const obj = m.toObject();
      if (obj.expiry_date && new Date(obj.expiry_date) < now) {
        obj.computed_status = 'Expired';
      } else if (obj.expiry_date && new Date(obj.expiry_date) < ninetyDays) {
        obj.computed_status = 'Expiring Soon';
      } else if (obj.stock_quantity <= 0) {
        obj.computed_status = 'Out of Stock';
      } else if (obj.stock_quantity <= (obj.reorder_level || 20)) {
        obj.computed_status = 'Low Stock';
      } else {
        obj.computed_status = 'In Stock';
      }
      return obj;
    });

    if (low_stock === 'true') {
      medicines = medicines.filter(m => m.stock_quantity <= (m.reorder_level || 20));
    }

    if (expiring_soon === 'true') {
      medicines = medicines.filter(m => m.expiry_date && new Date(m.expiry_date) < ninetyDays);
    }

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      medicines = medicines.filter(m =>
        m.name?.toLowerCase().includes(q) ||
        m.generic_name?.toLowerCase().includes(q) ||
        m.medicine_code?.toLowerCase().includes(q) ||
        m.category?.toLowerCase().includes(q) ||
        m.batch_number?.toLowerCase().includes(q)
      );
    }

    res.json({
      success: true,
      count: medicines.length,
      data: medicines
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single medicine
// @route   GET /api/medicines/:id
// @access  Private
export const getMedicineById = async (req, res, next) => {
  try {
    const medicine = await Medicine.findById(req.params.id);
    if (!medicine) {
      return res.status(404).json({ success: false, message: 'Medicine not found' });
    }
    res.json({ success: true, data: medicine });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new medicine
// @route   POST /api/medicines
// @access  Private (Admin)
export const createMedicine = async (req, res, next) => {
  try {
    const {
      name,
      generic_name,
      category,
      dosage_form,
      route_of_administration,
      strength,
      is_injection,
      batch_number,
      expiry_date,
      unit_price,
      cost_price,
      stock_quantity,
      reorder_level,
      instructions_default
    } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Medicine name is required' });
    }

    const medicine_code = req.body.medicine_code || await generateMedicineCode();

    const medicine = await Medicine.create({
      medicine_code,
      name,
      generic_name: generic_name || '',
      category: category || 'Antibiotics',
      dosage_form: dosage_form || (is_injection ? 'Injection' : 'Tablet'),
      route_of_administration: route_of_administration || (is_injection ? 'Intramuscular (IM)' : 'Oral'),
      strength: strength || '500 mg',
      is_injection: Boolean(is_injection || dosage_form?.toLowerCase().includes('injection')),
      batch_number: batch_number || '',
      expiry_date: expiry_date ? new Date(expiry_date) : null,
      unit_price: Number(unit_price) || 0,
      cost_price: Number(cost_price) || 0,
      stock_quantity: Number(stock_quantity) !== undefined ? Number(stock_quantity) : 100,
      reorder_level: Number(reorder_level) || 20,
      instructions_default: instructions_default || 'Take after meals as directed'
    });

    await logAudit({
      user: req.user,
      action: 'CREATE_MEDICINE',
      entity: 'Medicine',
      entity_id: medicine._id,
      details: { name: medicine.name, code: medicine.medicine_code, unit_price: medicine.unit_price }
    });

    res.status(201).json({
      success: true,
      message: 'Medicine added to pharmacy catalog successfully',
      data: medicine
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update medicine
// @route   PUT /api/medicines/:id
// @access  Private (Admin)
export const updateMedicine = async (req, res, next) => {
  try {
    let medicine = await Medicine.findById(req.params.id);
    if (!medicine) {
      return res.status(404).json({ success: false, message: 'Medicine not found' });
    }

    if (req.body.dosage_form && req.body.dosage_form.toLowerCase().includes('injection')) {
      req.body.is_injection = true;
    }

    const updated = await Medicine.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    await logAudit({
      user: req.user,
      action: 'UPDATE_MEDICINE',
      entity: 'Medicine',
      entity_id: updated._id,
      details: { name: updated.name, unit_price: updated.unit_price, stock: updated.stock_quantity }
    });

    res.json({
      success: true,
      message: 'Medicine updated successfully',
      data: updated
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete medicine
// @route   DELETE /api/medicines/:id
// @access  Private (Admin)
export const deleteMedicine = async (req, res, next) => {
  try {
    const medicine = await Medicine.findByIdAndDelete(req.params.id);
    if (!medicine) {
      return res.status(404).json({ success: false, message: 'Medicine not found' });
    }

    await logAudit({
      user: req.user,
      action: 'DELETE_MEDICINE',
      entity: 'Medicine',
      entity_id: req.params.id,
      details: { name: medicine.name, code: medicine.medicine_code }
    });

    res.json({
      success: true,
      message: 'Medicine deleted successfully from pharmacy catalog'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Pharmacy Sales & Reports
// @route   GET /api/medicines/reports/sales-analytics
// @access  Private (Doctor, Cashier, Admin)
export const getPharmacyReports = async (req, res, next) => {
  try {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const ninetyDaysFuture = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    // 1. Pharmacy Payments Revenue
    const pharmacyPayments = await Payment.find({
      payment_category: { $in: ['Pharmacy Fee', 'Pharmacy / Medicine'] }
    })
      .populate('patient_id', 'name patient_number telephone')
      .populate('received_by', 'full_name username')
      .sort({ payment_date: -1 });

    const todaySales = pharmacyPayments
      .filter(p => new Date(p.payment_date) >= startOfToday)
      .reduce((acc, p) => acc + (p.amount || 0), 0);

    const monthSales = pharmacyPayments
      .filter(p => new Date(p.payment_date) >= startOfMonth)
      .reduce((acc, p) => acc + (p.amount || 0), 0);

    const totalSales = pharmacyPayments.reduce((acc, p) => acc + (p.amount || 0), 0);

    // 2. Prescriptions Statistics
    const allPrescriptions = await Prescription.find()
      .populate('patient_id', 'name patient_number')
      .populate('doctor_id', 'full_name username');

    const totalPrescriptionsCount = allPrescriptions.length;
    const dispensedCount = allPrescriptions.filter(p => p.status === 'Dispensed' || p.payment_status === 'Paid').length;
    const pendingCount = allPrescriptions.filter(p => p.status === 'Pending' || p.payment_status === 'Unpaid').length;

    // 3. Top Prescribed & Sold Medicines
    const medSalesMap = {};
    for (const rx of allPrescriptions) {
      if (rx.items && Array.isArray(rx.items)) {
        for (const it of rx.items) {
          const key = it.medicine_name || 'Other';
          if (!medSalesMap[key]) {
            medSalesMap[key] = {
              name: key,
              dosage: it.dosage || '500 mg',
              quantity_prescribed: 0,
              quantity_sold: 0,
              total_revenue: 0
            };
          }
          medSalesMap[key].quantity_prescribed += (it.quantity || 1);
          if (it.is_purchased || it.status === 'Dispensed') {
            medSalesMap[key].quantity_sold += (it.quantity || 1);
            medSalesMap[key].total_revenue += (it.total_price || 0);
          }
        }
      }
    }

    const topMedicines = Object.values(medSalesMap)
      .sort((a, b) => b.quantity_sold - a.quantity_sold)
      .slice(0, 10);

    // 4. Low Stock and Expiring Medicines Alerts
    const allMedicines = await Medicine.find().sort({ stock_quantity: 1 });
    const lowStockAlerts = allMedicines.filter(m => m.stock_quantity <= (m.reorder_level || 20));
    const expiringAlerts = allMedicines.filter(m => m.expiry_date && new Date(m.expiry_date) < ninetyDaysFuture);

    res.json({
      success: true,
      data: {
        summary: {
          today_sales: Number(todaySales.toFixed(2)),
          month_sales: Number(monthSales.toFixed(2)),
          total_sales: Number(totalSales.toFixed(2)),
          total_transactions: pharmacyPayments.length,
          total_prescriptions: totalPrescriptionsCount,
          dispensed_prescriptions: dispensedCount,
          pending_prescriptions: pendingCount,
          low_stock_count: lowStockAlerts.length,
          expiring_soon_count: expiringAlerts.length
        },
        top_medicines: topMedicines,
        low_stock_medicines: lowStockAlerts,
        expiring_medicines: expiringAlerts,
        recent_transactions: pharmacyPayments.slice(0, 25)
      }
    });
  } catch (error) {
    next(error);
  }
};