import Employee from '../models/Employee.js';
import { logAudit } from '../middleware/audit.js';

export const getEmployees = async (req, res, next) => {
  try {
    const { status, department, search } = req.query;
    let filter = {};

    if (status) filter.status = status;
    if (department) filter.department = department;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { position: { $regex: search, $options: 'i' } },
        { employee_id: { $regex: search, $options: 'i' } }
      ];
    }

    const employees = await Employee.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, count: employees.length, data: employees });
  } catch (error) {
    next(error);
  }
};

export const getEmployeeById = async (req, res, next) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }
    res.json({ success: true, data: employee });
  } catch (error) {
    next(error);
  }
};

export const createEmployee = async (req, res, next) => {
  try {
    const count = await Employee.countDocuments();
    const autoId = `EMP-${(count + 1).toString().padStart(3, '0')}`;

    const employee = await Employee.create({
      employee_id: req.body.employee_id || autoId,
      ...req.body
    });

    await logAudit({
      user: req.user,
      action: 'CREATE_EMPLOYEE',
      entity: 'Employee',
      entity_id: employee._id,
      details: { name: employee.name, position: employee.position }
    });

    res.status(201).json({ success: true, data: employee });
  } catch (error) {
    next(error);
  }
};

export const updateEmployee = async (req, res, next) => {
  try {
    const employee = await Employee.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    await logAudit({
      user: req.user,
      action: 'UPDATE_EMPLOYEE',
      entity: 'Employee',
      entity_id: employee._id,
      details: { name: employee.name, status: employee.status }
    });

    res.json({ success: true, data: employee });
  } catch (error) {
    next(error);
  }
};

export const deleteEmployee = async (req, res, next) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    employee.status = 'Terminated';
    await employee.save();

    await logAudit({
      user: req.user,
      action: 'TERMINATE_EMPLOYEE',
      entity: 'Employee',
      entity_id: employee._id,
      details: { name: employee.name }
    });

    res.json({ success: true, message: 'Employee marked as terminated' });
  } catch (error) {
    next(error);
  }
};
