import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { registerApi } from "../../api/endpoints.js";
import {
  Lock, User, Mail, UserCog, AlertCircle, CheckCircle2,
  ArrowRight, Eye, EyeOff, ArrowLeft, ShieldCheck
} from "lucide-react";

const ROLES = [
  { value: "Admin", label: "Admin", desc: "System administrator" },
  { value: "Doctor", label: "Doctor", desc: "Dental surgeon / physician" },
  { value: "Receptionist/Cashier", label: "Receptionist / Cashier", desc: "Front desk & billing staff" },
];

const InputField = ({ icon: Icon, label, type = "text", value, onChange, placeholder, required, extra }) => {
  const [show, setShow] = useState(false);
  const isPassword = type === "password";

  return (
    <div>
      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      <div className="relative">
        <Icon className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
        <input
          type={isPassword && show ? "text" : type}
          required={required}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow(s => !s)}
            className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 transition cursor-pointer"
            tabIndex={-1}
          >
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>
      {extra && <p className="mt-1 text-[11px] text-slate-400">{extra}</p>}
    </div>
  );
};

const Signup = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    full_name: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "",
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (field) => (e) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
    setError("");
    setSuccess("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const { full_name, username, email, password, confirmPassword, role } = form;

    if (!full_name.trim() || !username.trim() || !password || !role) {
      return setError("Please fill in all required fields.");
    }

    if (username.trim().length < 3) {
      return setError("Username must be at least 3 characters long.");
    }

    if (/\s/.test(username.trim())) {
      return setError("Username cannot contain spaces.");
    }

    if (password.length < 6) {
      return setError("Password must be at least 6 characters.");
    }

    if (password !== confirmPassword) {
      return setError("Passwords do not match. Please re-enter.");
    }

    setLoading(true);
    try {
      const res = await registerApi({ full_name: full_name.trim(), username: username.trim().toLowerCase(), email: email.trim(), password, role });
      if (res.data.success) {
        setSuccess(res.data.message);
        setForm({ full_name: "", username: "", email: "", password: "", confirmPassword: "", role: "" });
      } else {
        setError(res.data.message || "Registration failed. Please try again.");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 p-4 sm:p-6">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 p-6 sm:p-8 space-y-5">

        {/* Header */}
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
              &amp; Dermatologic Clinic
            </p>
            <p className="text-[11px] text-slate-400 font-medium mt-1">Create New Staff Account</p>
          </div>
        </div>

        {/* Admin Approval Notice */}
        <div className="flex items-start gap-2.5 p-3 bg-blue-50 border border-blue-200 text-blue-700 rounded-xl text-xs">
          <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
          <p className="font-semibold leading-relaxed">
            New accounts require <span className="font-black">administrator approval</span> before you can log in. Contact your system admin after registering.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Success Alert */}
        {success && (
          <div className="flex flex-col gap-2 p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs">
            <div className="flex items-center gap-2 font-bold text-sm">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span>Account Created Successfully!</span>
            </div>
            <p className="text-emerald-600 leading-relaxed pl-7">{success}</p>
            <button
              onClick={() => navigate("/login")}
              className="mt-2 ml-7 text-xs font-bold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 transition cursor-pointer"
            >
              <ArrowLeft className="w-3 h-3" />
              Back to Login
            </button>
          </div>
        )}

        {/* Form */}
        {!success && (
          <form onSubmit={handleSubmit} className="space-y-4">

            <InputField
              icon={User}
              label="Full Name"
              value={form.full_name}
              onChange={set("full_name")}
              placeholder="e.g. Dr. Ahmed Hassan"
              required
            />

            <InputField
              icon={User}
              label="Username"
              value={form.username}
              onChange={set("username")}
              placeholder="e.g. drhassan (no spaces)"
              required
              extra="Letters, numbers, underscores only. Min 3 characters."
            />

            <InputField
              icon={Mail}
              label="Email Address"
              type="email"
              value={form.email}
              onChange={set("email")}
              placeholder="you@clinic.com (optional)"
            />

            {/* Role */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Role <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <UserCog className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                <select
                  required
                  value={form.role}
                  onChange={set("role")}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-transparent transition appearance-none cursor-pointer"
                >
                  <option value="">— Select your role —</option>
                  {ROLES.map(r => (
                    <option key={r.value} value={r.value}>{r.label} — {r.desc}</option>
                  ))}
                </select>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">Select the role that matches your position in the clinic.</p>
            </div>

            <InputField
              icon={Lock}
              label="Password"
              type="password"
              value={form.password}
              onChange={set("password")}
              placeholder="Minimum 6 characters"
              required
            />

            <InputField
              icon={Lock}
              label="Confirm Password"
              type="password"
              value={form.confirmPassword}
              onChange={set("confirmPassword")}
              placeholder="Re-enter your password"
              required
            />

            {/* Password strength */}
            {form.password.length > 0 && (
              <div className="space-y-1">
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map(i => (
                    <div
                      key={i}
                      className={"h-1 flex-1 rounded-full transition-colors " + (
                        form.password.length >= i * 3
                          ? form.password.length >= 12 ? "bg-emerald-500"
                            : form.password.length >= 8 ? "bg-blue-500"
                            : "bg-amber-400"
                          : "bg-slate-200"
                      )}
                    />
                  ))}
                </div>
                <p className="text-[10px] text-slate-400">
                  Strength:{" "}
                  <span className={"font-bold " + (
                    form.password.length >= 12 ? "text-emerald-600" :
                    form.password.length >= 8 ? "text-blue-600" :
                    form.password.length >= 6 ? "text-amber-600" : "text-rose-600"
                  )}>
                    {form.password.length >= 12 ? "Strong" : form.password.length >= 8 ? "Good" : form.password.length >= 6 ? "Weak" : "Too short"}
                  </span>
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white text-sm font-bold rounded-xl shadow-md shadow-blue-500/25 transition disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Back to login */}
        {!success && (
          <div className="pt-4 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500">
              Already have an account?{" "}
              <Link to="/login" className="font-bold text-blue-600 hover:text-blue-700 transition">
                Sign in here
              </Link>
            </p>
          </div>
        )}

      </div>
    </div>
  );
};

export default Signup;
