import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useLocation, useNavigate } from 'react-router-dom';
import { Menu, Bell, ChevronDown, Search, Calendar, User, Settings, LogOut, Shield } from 'lucide-react';

// Route → page title map
const PAGE_TITLES = {
  '/dashboard':    'Dashboard',
  '/patients':     'Patients',
  '/doctors':      'Doctors & Specialists',
  '/visits':       'Visits & Patient Flow',
  '/consultations':'Doctor Consultations',
  '/treatments':   'Dental Treatments',
  '/services':     'Dental Services',
  '/inventory':    'Dental Inventory',
  '/lab':          'Laboratory Module',
  '/billing':      'Billing & Invoices',
  '/payments':     'Cashier & Receipts',
  '/appointments': 'Appointments',
  '/reports':      'Reports & Analytics',
  '/settings':     'Settings',
  '/employees':    'Employees',
  '/users':        'Users & Roles',
  '/audit-logs':   'Audit Logs',
  '/followups':    'Follow-ups',
};

const Topbar = ({ onToggleSidebar, onOpenProfile }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchVal, setSearchVal] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Derive current page title from pathname
  const pageTitle =
    PAGE_TITLES[location.pathname] ||
    PAGE_TITLES[Object.keys(PAGE_TITLES).find(k => k !== '/' && location.pathname.startsWith(k)) || ''] ||
    'Dashboard';

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    setIsDropdownOpen(false);
    if (window.confirm('Are you sure you want to log out from SNAB Dental Clinic?')) {
      logout();
      navigate('/login');
    }
  };

  const todayFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <header
      className="h-[70px] bg-white px-5 lg:px-7 flex items-center justify-between shrink-0 sticky top-0 z-30"
      style={{ borderBottom: '1px solid #e8eaf0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
    >
      {/* Left: Hamburger (mobile only) + Page Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-50 transition cursor-pointer"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-bold text-slate-900 tracking-tight">{pageTitle}</h2>
      </div>

      {/* Right: Search + Bell + Calendar + Profile */}
      <div className="flex items-center gap-2 sm:gap-3">

        {/* Search Box */}
        <div
          className="hidden sm:flex items-center gap-2 rounded-xl px-3.5 py-2 w-52 lg:w-72 transition-all focus-within:ring-2 focus-within:ring-blue-200"
          style={{ background: '#f5f6fa', border: '1px solid #e8eaf0' }}
        >
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            value={searchVal}
            onChange={e => setSearchVal(e.target.value)}
            placeholder="Search patient, invoice, etc..."
            className="flex-1 bg-transparent text-sm text-slate-700 placeholder-slate-400 outline-none"
          />
        </div>

        {/* Notification Bell */}
        <button
          className="relative p-2 rounded-xl text-slate-500 hover:bg-slate-50 transition"
          title="Notifications"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center">
            3
          </span>
        </button>

        {/* Calendar Icon */}
        <button
          className="hidden sm:flex p-2 rounded-xl text-slate-500 hover:bg-slate-50 transition"
          title={todayFormatted}
        >
          <Calendar className="w-5 h-5" />
        </button>

        {/* Divider */}
        <div className="hidden sm:block w-px h-7 bg-slate-100 mx-1" />

        {/* Profile Dropdown Container */}
        <div className="relative" ref={dropdownRef}>
          {/* Profile Trigger Button */}
          <button
            onClick={() => setIsDropdownOpen(prev => !prev)}
            className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl transition cursor-pointer ${
              isDropdownOpen ? 'bg-blue-50/70 ring-1 ring-blue-200' : 'hover:bg-slate-50'
            }`}
          >
            {/* User Avatar Image Icon */}
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold text-xs shrink-0 overflow-hidden shadow-2xs">
              {user?.profile_image ? (
                <img src={user.profile_image} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <User className="w-4.5 h-4.5 stroke-[2.2]" />
              )}
            </div>
            <div className="hidden sm:block text-left leading-tight">
              <p className="text-xs font-bold text-slate-900">{user?.full_name || user?.username || 'System Administrator'}</p>
              <p className="text-[10px] text-slate-400 font-medium">{user?.role || 'Admin'}</p>
            </div>
            <ChevronDown className={`hidden sm:block w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180 text-blue-600' : ''}`} />
          </button>

          {/* Sleek Popover Dropdown Menu matching reference design */}
          {isDropdownOpen && (
            <div className="absolute right-0 top-full mt-2.5 w-60 bg-white rounded-2xl shadow-xl border border-slate-100 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
              {/* Triangular Pointer Arrow pointing at avatar */}
              <div className="absolute -top-1.5 right-6 w-3 h-3 bg-white border-t border-l border-slate-100 rotate-45" />

              {/* User Header Info */}
              <div className="px-4 py-2.5 border-b border-slate-100/80 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
                  {user?.profile_image ? (
                    <img src={user.profile_image} alt="avatar" className="w-full h-full object-cover rounded-full" />
                  ) : (
                    <User className="w-4 h-4 stroke-[2.2]" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-900 truncate">
                    Hi, {user?.full_name?.split(' ')[0] || user?.username || 'Admin'}
                  </p>
                  <p className="text-[10px] text-slate-400 font-medium truncate">
                    {user?.email || `${user?.role || 'System'} Account`}
                  </p>
                </div>
              </div>

              {/* Menu Navigation Links */}
              <div className="p-1.5 space-y-0.5">
                <button
                  onClick={() => {
                    setIsDropdownOpen(false);
                    onOpenProfile();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-700 hover:text-blue-600 hover:bg-blue-50/70 rounded-xl transition text-left cursor-pointer"
                >
                  <User className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
                  <span>Profile</span>
                </button>

                <button
                  onClick={() => {
                    setIsDropdownOpen(false);
                    navigate('/settings');
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-700 hover:text-blue-600 hover:bg-blue-50/70 rounded-xl transition text-left cursor-pointer"
                >
                  <Settings className="w-4 h-4 text-slate-400" />
                  <span>Account Settings</span>
                </button>
              </div>

              {/* Log Out Button */}
              <div className="p-2 pt-1 border-t border-slate-100">
                <button
                  onClick={handleLogout}
                  className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Log Out</span>
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </header>
  );
};

export default Topbar;
