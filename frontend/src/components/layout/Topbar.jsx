import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useLocation, useNavigate } from 'react-router-dom';
import { globalSearchApi } from '../../api/endpoints.js';
import {
  Menu,
  Bell,
  ChevronDown,
  Search,
  Calendar,
  User,
  Settings,
  LogOut,
  Shield,
  X,
  Users,
  FileText,
  Clock,
  Sparkles,
  Stethoscope,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

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

  // Search state
  const [searchVal, setSearchVal] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Dropdowns state
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  const searchRef = useRef(null);
  const dropdownRef = useRef(null);
  const calendarRef = useRef(null);
  const notifRef = useRef(null);

  // Derive current page title from pathname
  const pageTitle =
    PAGE_TITLES[location.pathname] ||
    PAGE_TITLES[Object.keys(PAGE_TITLES).find(k => k !== '/' && location.pathname.startsWith(k)) || ''] ||
    'Dashboard';

  // Live search debouncing
  useEffect(() => {
    if (!searchVal.trim()) {
      setSearchResults(null);
      setIsSearchOpen(false);
      return;
    }

    setIsSearchOpen(true);
    setSearchLoading(true);

    const timer = setTimeout(async () => {
      try {
        const res = await globalSearchApi({ q: searchVal.trim() });
        setSearchResults(res.data?.data || null);
      } catch (err) {
        console.error('Global search error:', err);
      } finally {
        setSearchLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchVal]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsSearchOpen(false);
      }
      if (calendarRef.current && !calendarRef.current.contains(event.target)) {
        setIsCalendarOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setIsNotifOpen(false);
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

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!searchVal.trim()) return;
    setIsSearchOpen(false);
    navigate(`/patients?search=${encodeURIComponent(searchVal.trim())}`);
  };

  const todayFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  const totalResultsCount =
    (searchResults?.patients?.length || 0) +
    (searchResults?.invoices?.length || 0) +
    (searchResults?.visits?.length || 0) +
    (searchResults?.services?.length || 0);

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

        {/* ── 1. Workable Global Search Box with Live Results Dropdown ── */}
        <div className="relative hidden sm:block" ref={searchRef}>
          <form onSubmit={handleSearchSubmit}>
            <div
              className="flex items-center gap-2 rounded-xl px-3.5 py-2 w-56 lg:w-80 transition-all focus-within:ring-2 focus-within:ring-blue-200"
              style={{ background: '#f5f6fa', border: '1px solid #e8eaf0' }}
            >
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                value={searchVal}
                onChange={e => setSearchVal(e.target.value)}
                onFocus={() => {
                  if (searchVal.trim()) setIsSearchOpen(true);
                }}
                placeholder="Search patient, invoice, etc..."
                className="flex-1 bg-transparent text-xs text-slate-700 placeholder-slate-400 outline-none font-medium"
              />
              {searchVal && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchVal('');
                    setIsSearchOpen(false);
                  }}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </form>

          {/* Live Search Results Popover */}
          {isSearchOpen && (
            <div className="absolute left-0 top-full mt-2 w-80 lg:w-96 bg-white rounded-2xl shadow-2xl border border-slate-100 py-2.5 z-50 animate-in fade-in zoom-in-95 duration-150 max-h-[480px] overflow-y-auto">
              {searchLoading ? (
                <div className="flex items-center justify-center py-8 text-xs text-slate-400 gap-2">
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <span>Searching system records...</span>
                </div>
              ) : totalResultsCount === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  <Search className="w-6 h-6 text-slate-300 mx-auto mb-1.5" />
                  <p className="font-semibold text-slate-600">No results found for "{searchVal}"</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Press Enter to search in Patients register</p>
                </div>
              ) : (
                <div className="space-y-3 text-xs">
                  {/* Patients Section */}
                  {searchResults?.patients?.length > 0 && (
                    <div className="px-3">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-1 flex items-center gap-1.5">
                        <Users className="w-3 h-3 text-blue-600" />
                        <span>Patients ({searchResults.patients.length})</span>
                      </div>
                      <div className="space-y-1">
                        {searchResults.patients.map(p => (
                          <div
                            key={p._id}
                            onClick={() => {
                              setIsSearchOpen(false);
                              navigate(`/patients?search=${encodeURIComponent(p.patient_number || p.name)}`);
                            }}
                            className="p-2 rounded-xl hover:bg-blue-50 cursor-pointer flex items-center justify-between transition"
                          >
                            <div className="min-w-0">
                              <span className="font-bold text-slate-900 block truncate">{p.name}</span>
                              <span className="text-[11px] text-slate-400">{p.patient_number} • {p.telephone}</span>
                            </div>
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-800">
                              {p.gender || 'Patient'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Invoices Section */}
                  {searchResults?.invoices?.length > 0 && (
                    <div className="px-3 pt-2 border-t border-slate-100">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-1 flex items-center gap-1.5">
                        <FileText className="w-3 h-3 text-emerald-600" />
                        <span>Invoices ({searchResults.invoices.length})</span>
                      </div>
                      <div className="space-y-1">
                        {searchResults.invoices.map(inv => (
                          <div
                            key={inv._id}
                            onClick={() => {
                              setIsSearchOpen(false);
                              navigate(`/billing?search=${encodeURIComponent(inv.invoice_number)}`);
                            }}
                            className="p-2 rounded-xl hover:bg-emerald-50 cursor-pointer flex items-center justify-between transition"
                          >
                            <div className="min-w-0">
                              <span className="font-mono font-bold text-slate-900 block">{inv.invoice_number}</span>
                              <span className="text-[11px] text-slate-400">{inv.patient_id?.name || 'Patient'}</span>
                            </div>
                            <div className="text-right">
                              <span className="font-bold text-slate-900 font-mono text-[11px] block">${(inv.balance || inv.total_amount || 0).toFixed(2)}</span>
                              <span className="text-[10px] text-emerald-600 font-semibold">{inv.status}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Visits Section */}
                  {searchResults?.visits?.length > 0 && (
                    <div className="px-3 pt-2 border-t border-slate-100">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-1 flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-indigo-600" />
                        <span>Visits ({searchResults.visits.length})</span>
                      </div>
                      <div className="space-y-1">
                        {searchResults.visits.map(v => (
                          <div
                            key={v._id}
                            onClick={() => {
                              setIsSearchOpen(false);
                              navigate('/visits');
                            }}
                            className="p-2 rounded-xl hover:bg-indigo-50 cursor-pointer flex items-center justify-between transition"
                          >
                            <div className="min-w-0">
                              <span className="font-bold text-slate-900 block truncate">{v.patient_id?.name || 'Patient'}</span>
                              <span className="text-[11px] text-slate-400">{v.visit_number} • {v.reason}</span>
                            </div>
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-100 text-indigo-800">
                              {v.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Dental Services Section */}
                  {searchResults?.services?.length > 0 && (
                    <div className="px-3 pt-2 border-t border-slate-100">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-1 flex items-center gap-1.5">
                        <Sparkles className="w-3 h-3 text-purple-600" />
                        <span>Dental Procedures ({searchResults.services.length})</span>
                      </div>
                      <div className="space-y-1">
                        {searchResults.services.map(s => (
                          <div
                            key={s._id}
                            onClick={() => {
                              setIsSearchOpen(false);
                              navigate('/services');
                            }}
                            className="p-2 rounded-xl hover:bg-purple-50 cursor-pointer flex items-center justify-between transition"
                          >
                            <div className="min-w-0">
                              <span className="font-bold text-slate-900 block truncate">{s.service_name}</span>
                              <span className="text-[11px] text-slate-400">{s.category} ({s.service_code || 'PRC'})</span>
                            </div>
                            <span className="font-bold text-purple-700 font-mono text-xs">
                              ${s.price || 0}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Footer Action */}
                  <div className="p-2 pt-2 border-t border-slate-100 bg-slate-50/70 text-center rounded-b-xl">
                    <button
                      type="button"
                      onClick={handleSearchSubmit}
                      className="text-[11px] font-bold text-blue-600 hover:text-blue-700 transition cursor-pointer"
                    >
                      Press Enter or click here to view all in Patients →
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── 2. Notification Bell Popover ── */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setIsNotifOpen(prev => !prev)}
            className={`relative p-2 rounded-xl transition cursor-pointer ${isNotifOpen ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-50'}`}
            title="Clinic Notifications"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center">
              3
            </span>
          </button>

          {isNotifOpen && (
            <div className="absolute right-0 top-full mt-2.5 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 p-3 z-50 animate-in fade-in zoom-in-95 duration-150 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="font-bold text-slate-900">Clinic Alerts & Activity</span>
                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">3 New</span>
              </div>
              <div className="py-2 space-y-2">
                <div
                  onClick={() => { setIsNotifOpen(false); navigate('/appointments'); }}
                  className="p-2 rounded-xl bg-blue-50/60 border border-blue-100/80 flex items-start gap-2.5 cursor-pointer hover:bg-blue-100/60 transition"
                >
                  <CalendarDays className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-900 block">Today's Appointment Schedule</span>
                    <span className="text-[11px] text-slate-500">Patient appointments queued for clinic review.</span>
                  </div>
                </div>
                <div
                  onClick={() => { setIsNotifOpen(false); navigate('/lab'); }}
                  className="p-2 rounded-xl bg-amber-50/60 border border-amber-100/80 flex items-start gap-2.5 cursor-pointer hover:bg-amber-100/60 transition"
                >
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-900 block">Laboratory Sessions</span>
                    <span className="text-[11px] text-slate-500">Tests pending cashier processing and sample results.</span>
                  </div>
                </div>
                <div
                  onClick={() => { setIsNotifOpen(false); navigate('/visits'); }}
                  className="p-2 rounded-xl bg-emerald-50/60 border border-emerald-100/80 flex items-start gap-2.5 cursor-pointer hover:bg-emerald-100/60 transition"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-900 block">Active Patient Flow</span>
                    <span className="text-[11px] text-slate-500">Patients waiting in consultation and treatment queue.</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── 3. Workable Calendar & Month Selector Popover ── */}
        <div className="relative" ref={calendarRef}>
          <button
            onClick={() => setIsCalendarOpen(prev => !prev)}
            className={`p-2 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${isCalendarOpen ? 'bg-blue-50 text-blue-600 ring-1 ring-blue-200' : 'text-slate-500 hover:bg-slate-50'}`}
            title="Calendar & Month Selector"
          >
            <Calendar className="w-5 h-5" />
          </button>

          {isCalendarOpen && (
            <div className="absolute right-0 top-full mt-2.5 w-72 bg-white rounded-2xl shadow-xl border border-slate-100 p-4 z-50 animate-in fade-in zoom-in-95 duration-150 text-xs">
              <div className="text-center pb-3 border-b border-slate-100">
                <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center mx-auto mb-1.5 font-bold">
                  <Calendar className="w-5 h-5" />
                </div>
                <h4 className="font-black text-slate-900 text-sm">{todayFormatted}</h4>
                <p className="text-[11px] text-slate-400 font-medium">Active Clinic Working Shift</p>
              </div>

              <div className="py-3 space-y-2">
                <button
                  onClick={() => {
                    setIsCalendarOpen(false);
                    navigate('/appointments');
                  }}
                  className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <CalendarDays className="w-4 h-4" />
                  <span>View Appointments Schedule</span>
                </button>

                <button
                  onClick={() => {
                    setIsCalendarOpen(false);
                    navigate('/dashboard');
                  }}
                  className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Clock className="w-4 h-4 text-slate-500" />
                  <span>Go to Monthly Dashboard</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="hidden sm:block w-px h-7 bg-slate-100 mx-1" />

        {/* ── 4. Profile Dropdown Container ── */}
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

          {/* Popover Dropdown Menu */}
          {isDropdownOpen && (
            <div className="absolute right-0 top-full mt-2.5 w-60 bg-white rounded-2xl shadow-xl border border-slate-100 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
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
                  <User className="w-4 h-4 text-slate-400" />
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
