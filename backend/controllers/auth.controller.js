import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { logAudit } from '../middleware/audit.js';

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'snab_dental_secure_jwt_secret_key_2026_super_safe', {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

export const register = async (req, res, next) => {
  try {
    const { username, password, full_name, email, role } = req.body;

    if (!username || !password || !full_name || !role) {
      return res.status(400).json({ success: false, message: 'Please provide username, password, full name, and role.' });
    }

    const allowedRoles = ['Admin', 'Doctor', 'Receptionist/Cashier'];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role. Please select Admin, Doctor, or Receptionist/Cashier.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    }

    const exists = await User.findOne({ username: username.toLowerCase() });
    if (exists) {
      return res.status(409).json({ success: false, message: 'Username is already taken. Please choose another.' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      username: username.toLowerCase().trim(),
      password_hash,
      full_name: full_name.trim(),
      email: email?.toLowerCase().trim() || '',
      role,
      status: 'Active' // Active immediately
    });

    await logAudit({
      user: { _id: newUser._id, username: newUser.username, role: newUser.role },
      action: 'REGISTER',
      entity: 'User',
      entity_id: newUser._id,
      details: { username: newUser.username, role: newUser.role, status: 'Active' },
      ip_address: req.ip
    });

    return res.status(201).json({
      success: true,
      message: 'Account created successfully! You can now log in with your credentials.'
    });
  } catch (error) {
    next(error);
  }
};



export const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Please provide username and password' });
    }

    const user = await User.findOne({ username: username.toLowerCase() }).populate('employee_id');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid username or password' });
    }

    if (user.status !== 'Active') {
      return res.status(403).json({ success: false, message: 'Account has been deactivated. Please contact Administrator.' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid username or password' });
    }

    user.last_login = new Date();
    await user.save();

    const token = generateToken(user._id);

    await logAudit({
      user,
      action: 'LOGIN',
      entity: 'User',
      entity_id: user._id,
      details: { username: user.username, role: user.role },
      ip_address: req.ip
    });

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        full_name: user.full_name,
        role: user.role,
        email: user.email,
        employee: user.employee_id
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('-password_hash').populate('employee_id');
    res.json({ success: true, user });
  } catch (error) {
    next(error);
  }
};

export const updatePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }

    const salt = await bcrypt.genSalt(10);
    user.password_hash = await bcrypt.hash(newPassword, salt);
    await user.save();

    await logAudit({
      user: req.user,
      action: 'CHANGE_PASSWORD',
      entity: 'User',
      entity_id: user._id,
      details: { username: user.username }
    });

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    next(error);
  }
};
