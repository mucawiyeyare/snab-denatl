import DentalInventory from '../models/DentalInventory.js';
import { logAudit } from '../middleware/audit.js';

export const getInventory = async (req, res, next) => {
  try {
    const { category, status, search } = req.query;
    let filter = {};

    if (category) filter.category = category;
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { item_code: { $regex: search, $options: 'i' } },
        { supplier: { $regex: search, $options: 'i' } },
        { batch_lot_number: { $regex: search, $options: 'i' } }
      ];
    }

    const items = await DentalInventory.find(filter).sort({ createdAt: -1 });

    // Calculate aggregated inventory statistics
    const totalItems = items.length;
    const totalValue = items.reduce((acc, item) => acc + (item.total_purchase_cost || 0), 0);
    const lowStockCount = items.filter(i => i.status === 'Low Stock' || i.status === 'Out of Stock').length;
    const expiredCount = items.filter(i => i.status === 'Expired').length;

    res.json({
      success: true,
      count: totalItems,
      metrics: {
        totalItems,
        totalValue,
        lowStockCount,
        expiredCount
      },
      data: items
    });
  } catch (error) {
    next(error);
  }
};

export const getInventoryById = async (req, res, next) => {
  try {
    const item = await DentalInventory.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Inventory item not found' });
    }
    res.json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
};

export const createInventoryItem = async (req, res, next) => {
  try {
    const count = await DentalInventory.countDocuments();
    const itemCode = `INV-MAT-${(count + 1).toString().padStart(3, '0')}`;

    const item = new DentalInventory({
      item_code: itemCode,
      ...req.body
    });

    await item.save();

    await logAudit({
      user: req.user,
      action: 'CREATE_INVENTORY_ITEM',
      entity: 'DentalInventory',
      entity_id: item._id,
      details: { name: item.name, quantity: item.quantity_purchased, supplier: item.supplier }
    });

    res.status(201).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
};

export const updateInventoryItem = async (req, res, next) => {
  try {
    let item = await DentalInventory.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Inventory item not found' });
    }

    Object.assign(item, req.body);
    await item.save();

    await logAudit({
      user: req.user,
      action: 'UPDATE_INVENTORY_ITEM',
      entity: 'DentalInventory',
      entity_id: item._id,
      details: { name: item.name, quantity_available: item.quantity_available }
    });

    res.json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
};

export const recordItemUsage = async (req, res, next) => {
  try {
    const { quantity_used, notes } = req.body;
    const item = await DentalInventory.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ success: false, message: 'Inventory item not found' });
    }

    const additionalUsed = Number(quantity_used) || 0;
    if (additionalUsed <= 0) {
      return res.status(400).json({ success: false, message: 'Please enter a valid quantity used (greater than 0).' });
    }

    const currentAvailable = Math.max(0, (item.quantity_purchased || 0) - (item.quantity_used || 0));
    if (additionalUsed > currentAvailable) {
      return res.status(400).json({
        success: false,
        message: `Cannot deduct ${additionalUsed} units. Only ${currentAvailable} units available in stock.`
      });
    }

    const newQuantityUsed = (item.quantity_used || 0) + additionalUsed;
    const newQuantityAvailable = Math.max(0, (item.quantity_purchased || 0) - newQuantityUsed);

    // Determine status
    let newStatus = 'In Stock';
    if (item.expiry_date && new Date(item.expiry_date) < new Date()) {
      newStatus = 'Expired';
    } else if (newQuantityAvailable === 0) {
      newStatus = 'Out of Stock';
    } else if (newQuantityAvailable <= (item.reorder_level || 5)) {
      newStatus = 'Low Stock';
    }

    const updatedNotes = notes && notes.trim()
      ? (item.notes ? `${item.notes}\n[Used ${additionalUsed} units on ${new Date().toLocaleDateString()}]: ${notes.trim()}` : `[Used ${additionalUsed} units on ${new Date().toLocaleDateString()}]: ${notes.trim()}`)
      : item.notes;

    const updatedItem = await DentalInventory.findByIdAndUpdate(
      item._id,
      {
        quantity_used: newQuantityUsed,
        quantity_available: newQuantityAvailable,
        status: newStatus,
        notes: updatedNotes
      },
      { new: true }
    );

    await logAudit({
      user: req.user,
      action: 'RECORD_INVENTORY_USAGE',
      entity: 'DentalInventory',
      entity_id: item._id,
      details: { name: item.name, used: additionalUsed, remaining: updatedItem.quantity_available }
    });

    res.json({ success: true, message: 'Item usage recorded successfully', data: updatedItem });
  } catch (error) {
    console.error('Error in recordItemUsage:', error);
    res.status(500).json({ success: false, message: error.message || 'Error recording item usage' });
  }
};

export const deleteInventoryItem = async (req, res, next) => {
  try {
    const item = await DentalInventory.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Inventory item not found' });
    }

    await DentalInventory.findByIdAndDelete(req.params.id);

    await logAudit({
      user: req.user,
      action: 'DELETE_INVENTORY_ITEM',
      entity: 'DentalInventory',
      entity_id: req.params.id,
      details: { name: item.name }
    });

    res.json({ success: true, message: 'Inventory item deleted successfully' });
  } catch (error) {
    next(error);
  }
};
