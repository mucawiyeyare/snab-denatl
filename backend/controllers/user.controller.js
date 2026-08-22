import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { logAudit } from '../middleware/audit.js';

export const getUsers = async (req, res, next) => {
  try {
    const users = await User.find()
      .select('-password_hash')
      .populate('employee_id')
      .sort({ createdAt: -1 });
    res.json({ success: true, count: users.length, data: users });
  } catch (error) {
    next(error);
  }
};

export const getDoctors = async (req, res, next) => {
  try {
    const doctors = await User.find({ role: 'Doctor', status: 'Active' })
      .select('-password_hash')
      .populate('employee_id');
    res.json({ success: true, count: doctors.length, data: doctors });
  } catch (error) {
    next(error);
  }
};

export const createUser = async (req, res, next) => {
  try {
    const { username, password, role, employee_id, full_name, email, status } = req.body;

    const existingUser = await User.findOne({ username: username.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Username is already taken' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password || 'password123', salt);

    const user = await User.create({
      username: username.toLowerCase(),
      password_hash,
      role,
      employee_id: employee_id || undefined,
      full_name,
      email,
      status: status || 'Active'
    });

    await logAudit({
      user: req.user,
      action: 'CREATE_USER',
      entity: 'User',
      entity_id: user._id,
      details: { username: user.username, role: user.role }
    });

    const userResponse = await User.findById(user._id).select('-password_hash').populate('employee_id');
    res.status(201).json({ success: true, data: userResponse });
  } catch (error) {
    next(error);
  }
};

export const updateUser = async (req, res, next) => {
  try {
    const { role, employee_id, full_name, email, status, password } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (role) user.role = role;
    if (employee_id !== undefined) user.employee_id = employee_id || undefined;
    if (full_name) user.full_name = full_name;
    if (email) user.email = email;
    if (status) user.status = status;
    if (password) {
      const salt = await bcrypt.genSalt(10);
      user.password_hash = await bcrypt.hash(password, salt);
    }

    await user.save();

    await logAudit({
      user: req.user,
      action: 'UPDATE_USER',
      entity: 'User',
      entity_id: user._id,
      details: { username: user.username, role: user.role, status: user.status }
    });

    const updatedUser = await User.findById(user._id).select('-password_hash').populate('employee_id');
    res.json({ success: true, data: updatedUser });
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Soft deactivate or delete
    user.status = 'Inactive';
    await user.save();

    await logAudit({
      user: req.user,
      action: 'DEACTIVATE_USER',
      entity: 'User',
      entity_id: user._id,
      details: { username: user.username }
    });

    res.json({ success: true, message: 'User deactivated successfully' });
  } catch (error) {
    next(error);
  }
};
