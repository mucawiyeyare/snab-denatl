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
    item.quantity_used = (item.quantity_used || 0) + additionalUsed;
    if (notes) {
      item.notes = item.notes ? `${item.notes}\n[Used ${additionalUsed} units]: ${notes}` : `[Used ${additionalUsed} units]: ${notes}`;
    }

    await item.save();

    await logAudit({
      user: req.user,
      action: 'RECORD_INVENTORY_USAGE',
      entity: 'DentalInventory',
      entity_id: item._id,
      details: { name: item.name, used: additionalUsed, remaining: item.quantity_available }
    });

    res.json({ success: true, message: 'Item usage recorded successfully', data: item });
  } catch (error) {
    next(error);
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
