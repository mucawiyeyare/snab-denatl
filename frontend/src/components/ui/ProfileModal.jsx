import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useNavigate } from 'react-router-dom';
import { updateProfileApi } from '../../api/endpoints.js';
import {
  User,
  Upload,
  Camera,
  Trash2,
  Lock,
  Mail,
  Shield,
  LogOut,
  Save,
  CheckCircle,
  AlertCircle,
  X
} from 'lucide-react';

const ProfileModal = ({ isOpen, onClose }) => {
  const { user, setUser, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [fullName, setFullName] = useState(user?.full_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState('');
  const [profileImage, setProfileImage] = useState(user?.profile_image || '');
  const [isDragging, setIsDragging] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (user) {
      setFullName(user.full_name || '');
      setEmail(user.email || '');
      setProfileImage(user.profile_image || '');
      setPassword('');
      setErrorMsg('');
      setSuccessMsg('');
    }
  }, [user, isOpen]);

  if (!isOpen) return null;

  const handleImageFile = (file) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          // Scale down image to optimal avatar size (max 400x400)
          const canvas = document.createElement('canvas');
          const MAX_SIZE = 400;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_SIZE) {
              height = Math.round((height * MAX_SIZE) / width);
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width = Math.round((width * MAX_SIZE) / height);
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.85);
          setProfileImage(compressedBase64);
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImageFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const payload = {
        full_name: fullName.trim(),
        email: email.trim(),
        profile_image: profileImage,
        password: password.trim() ? password.trim() : undefined
      };

      const res = await updateProfileApi(payload);
      if (res.data.success) {
        const updatedUser = res.data.user;
        if (updateUser) {
          updateUser(updatedUser);
        } else if (setUser) {
          setUser(updatedUser);
          localStorage.setItem('snab_dental_user', JSON.stringify(updatedUser));
        }
        setSuccessMsg('Profile updated and saved to database successfully!');
        setTimeout(() => {
          setSuccessMsg('');
          onClose();
        }, 1200);
      } else {
        setErrorMsg(res.data.message || 'Failed to update profile');
      }
    } catch (err) {
      console.error('Error updating profile:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to log out from SNAB Dental Clinic?')) {
      logout();
      onClose();
      navigate('/login');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
              <User className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">User Account & Profile</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSave} className="p-6 space-y-5 text-xs">
          
          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl flex items-center gap-2 font-bold">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-center gap-2 font-bold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Profile Image Drag & Drop Area */}
          <div className="flex flex-col items-center text-center space-y-3">
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`relative w-24 h-24 rounded-full border-2 border-dashed cursor-pointer flex items-center justify-center transition-all ${
                isDragging
                  ? 'border-blue-600 bg-blue-50 scale-105'
                  : 'border-slate-300 hover:border-blue-500 bg-slate-50'
              }`}
              title="Click or drag photo here to upload"
            >
              {profileImage ? (
                <img
                  src={profileImage}
                  alt="Profile Avatar"
                  className="w-full h-full rounded-full object-cover shadow-sm"
                />
              ) : (
                /* Blue circle user symbol matching the uploaded icon */
                <div className="w-20 h-20 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md">
                  <User className="w-10 h-10 stroke-[2.2]" />
                </div>
              )}

              {/* Camera edit badge */}
              <div className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-white text-slate-700 shadow-md border border-slate-200 flex items-center justify-center hover:bg-blue-600 hover:text-white transition">
                <Camera className="w-3.5 h-3.5" />
              </div>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => e.target.files && handleImageFile(e.target.files[0])}
              accept="image/*"
              className="hidden"
            />

            <div>
              <p className="font-bold text-slate-800">Drag & Drop Profile Photo</p>
              <p className="text-[10px] text-slate-400">or click to browse from device (JPG, PNG, WebP)</p>
            </div>

            {profileImage && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setProfileImage('');
                }}
                className="text-[11px] text-rose-600 hover:text-rose-700 flex items-center gap-1 font-semibold"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Remove custom photo
              </button>
            )}
          </div>

          {/* Form Fields */}
          <div className="space-y-3 pt-2">
            
            {/* Username & Role (Read-only badges) */}
            <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-100">
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Username</span>
                <span className="font-bold text-slate-900">@{user?.username}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Assigned Role</span>
                <span className="font-bold text-blue-600">{user?.role}</span>
              </div>
            </div>

            {/* Full Name */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Dr. Hassan Ali"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@snabdental.com"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Password (optional) */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">New Password (leave empty to keep current)</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-rose-600 hover:bg-rose-50 font-bold transition cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Log Out</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 disabled:opacity-50 text-white font-bold rounded-xl shadow-md transition cursor-pointer"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};

export default ProfileModal;
