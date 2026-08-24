import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  LayoutDashboard,
  Users,
  Activity,
  Stethoscope,
  HeartPulse,
  Sparkles,
  TestTube2,
  Pill,
  CreditCard,
  Receipt,
  Calendar,
  Clock,
  FileBarChart,
  Settings,
  Boxes,
  ChevronDown,
  X,
  ShieldCheck,
  Contact,
  FileText,
  User,
  UserCheck,
  DollarSign,
  TrendingDown,
  Wallet
} from 'lucide-react';

const Sidebar = ({ isOpen, onClose, onOpenProfile }) => {
  const { user } = useAuth();

  const getNavLinks = () => {
    const role = user?.role;

    if (role === 'Doctor') {
      return [
        { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
        { label: 'Patients & History', path: '/patients', icon: Users },
        { label: 'Appointments', path: '/appointments', icon: Calendar },
        { label: 'Visits & Queue', path: '/visits', icon: Activity },
        { label: 'Doctor Consultations', path: '/consultations', icon: Stethoscope },
        { label: 'Dental Treatments', path: '/treatments', icon: HeartPulse },
        { label: 'Dental Services', path: '/services', icon: Sparkles },
        { label: 'Pharmacy & Medicines', path: '/pharmacy', icon: Pill },
        { label: 'Laboratory', path: '/lab', icon: TestTube2 },
        { label: 'Dental Inventory', path: '/inventory', icon: Boxes },
        { label: 'Reports & Analytics', path: '/reports', icon: FileBarChart },
        { label: 'Settings', path: '/settings', icon: Settings }
      ];
    }

    if (role === 'Receptionist/Cashier') {
      return [
        { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
        { label: 'Patients & History', path: '/patients', icon: Users },
        { label: 'Appointments', path: '/appointments', icon: Calendar },
        { label: 'Visits & Patient Flow', path: '/visits', icon: Activity },
        { label: 'Dental Services', path: '/services', icon: Sparkles },
        { label: 'Billing & Invoices', path: '/billing', icon: CreditCard },
        { label: 'Daily Income', path: '/daily-income', icon: DollarSign },
        { label: 'Expenses', path: '/expenses', icon: TrendingDown },
        { label: 'Cashier & Receipts', path: '/payments', icon: Receipt },
        { label: 'Pharmacy & Medicines', path: '/pharmacy', icon: Pill },
        { label: 'Laboratory', path: '/lab', icon: TestTube2 },
        { label: 'Reports & Analytics', path: '/reports', icon: FileBarChart }
      ];
    }

    // Administrator
    return [
      { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
      { label: 'Patients & History', path: '/patients', icon: Users },
      { label: 'Appointments', path: '/appointments', icon: Calendar },
      { label: 'Visits & Queue', path: '/visits', icon: Activity },
      { label: 'Doctor Consultations', path: '/consultations', icon: Stethoscope },
      { label: 'Dental Treatments', path: '/treatments', icon: HeartPulse },
      { label: 'Dental Services', path: '/services', icon: Sparkles },
      { label: 'Billing & Invoices', path: '/billing', icon: CreditCard },
      { label: 'Daily Income', path: '/daily-income', icon: DollarSign },
      { label: 'Clinic Expenses', path: '/expenses', icon: TrendingDown },
      { label: 'Pharmacy & Medicines', path: '/pharmacy', icon: Pill },
      { label: 'Laboratory', path: '/lab', icon: TestTube2 },
      { label: 'Dental Inventory', path: '/inventory', icon: Boxes },
      { label: 'Doctors', path: '/doctors', icon: UserCheck },
      { label: 'Staff Directory', path: '/employees', icon: Contact },
      { label: 'Users & Roles', path: '/users', icon: ShieldCheck },
      { label: 'Audit Logs', path: '/audit-logs', icon: FileText },
      { label: 'Reports & Analytics', path: '/reports', icon: FileBarChart },
      { label: 'Settings', path: '/settings', icon: Settings }
    ];
  };

  const navLinks = getNavLinks();

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          aria-hidden="true"
        />
      )}

      {/* Sidebar Panel — dark navy matching reference */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 flex flex-col select-none transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ backgroundColor: '#0d1f4c' }}
      >
        {/* Logo Area */}
        <div
          className="h-[70px] flex items-center justify-between px-5 shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}
            >
              <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="white" strokeWidth="1.8">
                <path
                  d="M9 3C7 3 5 5 5 7C5 9 5.5 11 6 13L7 20C7.5 21 8.5 21 9 20L10 16C10.5 15 11.5 15 12 16L13 20C13.5 21 14.5 21 15 20L16 13C16.5 11 17 9 17 7C17 5 15 3 13 3C12 3 11.5 3.5 10.5 3.5C9.5 3.5 9.5 3 9 3Z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div className="leading-tight">
              <h1 className="font-bold text-sm tracking-tight text-white">SNAB DENTAL</h1>
              <span
                className="text-[10px] font-medium block"
                style={{ color: 'rgba(255,255,255,0.45)' }}
              >
                & DERMATOLOGIC CLINIC
              </span>
            </div>
          </div>

          {/* Mobile close */}
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg"
            style={{ color: 'rgba(255,255,255,0.5)' }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
          <div className="px-3.5 pt-1 pb-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-white/40">
              MAIN MENU
            </p>
          </div>

          {navLinks.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => {
                  if (window.innerWidth < 1024 && onClose) onClose();
                }}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13px] font-medium transition-colors duration-150 ${
                    isActive ? 'text-white font-semibold' : ''
                  }`
                }
                style={({ isActive }) => ({
                  backgroundColor: isActive ? '#1a56db' : 'transparent',
                  color: isActive ? '#ffffff' : 'rgba(255,255,255,0.6)',
                })}
              >
                {({ isActive }) => (
                  <>
                    <Icon className="w-4 h-4 shrink-0" style={{ color: isActive ? '#ffffff' : 'rgba(255,255,255,0.6)' }} />
                    <span className="truncate">{item.label}</span>
                  </>
                )}
              </NavLink>
            );
          })}
        </div>

        {/* Bottom Profile Card — matching reference */}
        <div className="p-3 shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <div
            onClick={onOpenProfile}
            className="flex items-center gap-3 p-2.5 rounded-xl cursor-pointer hover:bg-white/5 transition-colors duration-150"
            style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
          >
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs overflow-hidden">
              {user?.profile_image ? (
                <img src={user.profile_image} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <User className="w-5 h-5 stroke-[2.2]" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate">
                {user?.full_name || user?.username || 'System Administrator'}
              </p>
              <span className="text-[10px] font-medium block text-white/50">
                {user?.role || 'Admin'}
              </span>
            </div>
            <ChevronDown className="w-4 h-4 shrink-0 text-white/40" />
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
