import React, { useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import Topbar from './Topbar.jsx';
import ProfileModal from '../ui/ProfileModal.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { LayoutDashboard, Users, Activity, CreditCard, Calendar } from 'lucide-react';

const Layout = () => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const { user } = useAuth();

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 font-sans">
      {/* Sidebar with mobile drawer & shadow */}
      <Sidebar
        isOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
        onOpenProfile={() => setIsProfileOpen(true)}
      />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Topbar
          onToggleSidebar={() => setIsMobileSidebarOpen(true)}
          onOpenProfile={() => setIsProfileOpen(true)}
        />
        
        {/* Main page content area */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6 pb-20 sm:pb-8 flex flex-col justify-between">
          <div className="flex-1">
            <Outlet />
          </div>

          {/* Clinic & Developer Footer */}
          <footer className="mt-8 pt-4 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-500 font-medium shrink-0">
            <div className="flex items-center gap-1.5 text-center sm:text-left">
              <span>© {new Date().getFullYear()} SNAB Dental & Dermatologic Clinic MS. All rights reserved.</span>
            </div>
            <div className="text-center sm:text-right">
              Developed by{' '}
              <a
                href="https://iftiinhub.com"
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-blue-600 hover:text-blue-700 hover:underline transition inline-flex items-center gap-1 cursor-pointer"
              >
                <span>IFtiinhubict 2026</span>
                <span className="text-[10px]">↗</span>
              </a>
            </div>
          </footer>
        </main>

        {/* Mobile Bottom Quick Navigation Bar */}
        <nav className="sm:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-slate-200 px-3 flex items-center justify-around z-30 shadow-lg">
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 text-[10px] font-bold ${
                isActive ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
              }`
            }
          >
            <LayoutDashboard className="w-5 h-5" />
            <span>Home</span>
          </NavLink>

          <NavLink
            to="/patients"
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 text-[10px] font-bold ${
                isActive ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
              }`
            }
          >
            <Users className="w-5 h-5" />
            <span>Patients</span>
          </NavLink>

          <NavLink
            to="/visits"
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 text-[10px] font-bold ${
                isActive ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
              }`
            }
          >
            <Activity className="w-5 h-5" />
            <span>Queue</span>
          </NavLink>

          {(user?.role === 'Admin' || user?.role === 'Receptionist/Cashier') ? (
            <NavLink
              to="/billing"
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 text-[10px] font-bold ${
                  isActive ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
                }`
              }
            >
              <CreditCard className="w-5 h-5" />
              <span>Billing</span>
            </NavLink>
          ) : (
            <NavLink
              to="/treatments"
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 text-[10px] font-bold ${
                  isActive ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
                }`
              }
            >
              <Activity className="w-5 h-5" />
              <span>Treatments</span>
            </NavLink>
          )}

          <NavLink
            to="/appointments"
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 text-[10px] font-bold ${
                isActive ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
              }`
            }
          >
            <Calendar className="w-5 h-5" />
            <span>Appts</span>
          </NavLink>
        </nav>
      </div>

      {/* Global Profile Modal */}
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />
    </div>
  );
};

export default Layout;
