import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { Lock, User, AlertCircle, ArrowRight } from 'lucide-react';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const res = await login(username, password);
    setLoading(false);

    if (res.success) {
      navigate('/dashboard');
    } else {
      setError(res.message);
    }
  };

  const setDemoCredentials = (u, p) => {
    setUsername(u);
    setPassword(p);
    setError('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 p-4 sm:p-6">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 p-6 sm:p-8 space-y-6">
        
        {/* Header with Official Clinic Logo */}
        <div className="text-center space-y-3">
          <div className="inline-block p-1 bg-gradient-to-tr from-amber-500 to-blue-600 rounded-full shadow-xl shadow-blue-500/20">
            <img
              src="/logo.png"
              alt="SNAB Dental and Dermatologic Clinic"
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover bg-white"
            />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight uppercase">
              SNAB DENTAL
            </h2>
            <p className="text-xs font-bold text-amber-600 tracking-wider uppercase">
              & Dermatologic Clinic
            </p>
            <p className="text-[11px] text-slate-400 font-medium mt-1">Management & Clinical Information System</p>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Username
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white text-sm font-bold rounded-xl shadow-md shadow-blue-500/25 transition disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Sign In to System</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Quick Demo Accounts (Admin, Doctor, Receptionist/Cashier) */}
        <div className="pt-4 border-t border-slate-100">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center mb-2.5">
            Quick 1-Click Demo Logins
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
            <button
              type="button"
              onClick={() => setDemoCredentials('admin', 'admin123')}
              className="p-2.5 rounded-xl bg-slate-50 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 text-slate-700 font-semibold transition text-left"
            >
              👑 <span className="font-bold block text-xs">Admin</span>
              <span className="block text-[10px] text-slate-400 font-normal">admin / admin123</span>
            </button>
            <button
              type="button"
              onClick={() => setDemoCredentials('drhassan', 'doctor123')}
              className="p-2.5 rounded-xl bg-slate-50 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 text-slate-700 font-semibold transition text-left"
            >
              🩺 <span className="font-bold block text-xs">Doctor</span>
              <span className="block text-[10px] text-slate-400 font-normal">drhassan / doctor123</span>
            </button>
            <button
              type="button"
              onClick={() => setDemoCredentials('cashier', 'cashier123')}
              className="p-2.5 rounded-xl bg-slate-50 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 text-slate-700 font-semibold transition text-left"
            >
              💳 <span className="font-bold block text-xs">Cashier</span>
              <span className="block text-[10px] text-slate-400 font-normal">cashier / cashier123</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Login;
