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
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6 pb-16 sm:pb-6">
          <Outlet />
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
