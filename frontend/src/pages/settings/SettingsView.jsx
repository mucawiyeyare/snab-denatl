import React, { useState, useEffect } from 'react';
import { getSettingsApi, updateSettingsApi } from '../../api/endpoints.js';
import { Settings, Save, CheckCircle, Building, DollarSign, Globe } from 'lucide-react';

const SettingsView = () => {
  const [settings, setSettings] = useState({
    clinic_name: 'SNAB Dental and Dermatologic Clinic',
    tagline: 'Specialized Dental & Dermatologic Care • Oral Surgery',
    phone: '+252 61 2339093',
    email: 'info@snabdental.com',
    address: 'Mogadishu Main Road, Isgoyska howalwadaag, Somalia',
    website: 'www.snabdental.com',
    consultation_fee: 20,
    currency: 'USD',
    currency_symbol: '$',
    tooth_numbering_system: 'FDI (Two-digit notation)',
    tax_percentage: 0
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await getSettingsApi();
      if (res.data?.data) {
        setSettings(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSavedSuccess(false);
    try {
      await updateSettingsApi({
        ...settings,
        consultation_fee: Number(settings.consultation_fee),
        tax_percentage: Number(settings.tax_percentage)
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 4000);
    } catch (err) {
      console.error('Error saving settings:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      
      {/* Header with Logo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <img
            src="/logo.png"
            alt="SNAB Clinic Logo"
            className="w-12 h-12 rounded-full object-cover border-2 border-amber-400 shadow-xs"
          />
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Clinic Profile & System Settings</h1>
            <p className="text-xs text-slate-500">Configure clinic metadata, consultation fee, default currency, and tooth chart standards</p>
          </div>
        </div>
      </div>

      {savedSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center gap-3 text-xs font-bold animate-in fade-in">
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>Clinic settings updated and saved successfully!</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Clinic Details */}
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-100 shadow-xs space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Clinic Profile</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Clinic Name *</label>
              <input
                type="text"
                required
                value={settings.clinic_name}
                onChange={(e) => setSettings({ ...settings, clinic_name: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border rounded-xl font-bold"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Tagline / Motto</label>
              <input
                type="text"
                value={settings.tagline}
                onChange={(e) => setSettings({ ...settings, tagline: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border rounded-xl"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Phone Contact</label>
              <input
                type="text"
                value={settings.phone}
                onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border rounded-xl"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Email Address</label>
              <input
                type="email"
                value={settings.email}
                onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border rounded-xl"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">Physical Address</label>
              <input
                type="text"
                value={settings.address}
                onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border rounded-xl"
              />
            </div>
          </div>
        </div>

        {/* Clinical & Financial Configurations */}
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-100 shadow-xs space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Clinical & Financial Defaults</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Default Consultation Fee ($) *</label>
              <input
                type="number"
                required
                min="0"
                value={settings.consultation_fee}
                onChange={(e) => setSettings({ ...settings, consultation_fee: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border rounded-xl font-mono font-bold text-slate-900"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Currency Code</label>
              <input
                type="text"
                value={settings.currency}
                onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border rounded-xl font-bold font-mono"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Currency Symbol</label>
              <input
                type="text"
                value={settings.currency_symbol}
                onChange={(e) => setSettings({ ...settings, currency_symbol: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border rounded-xl font-bold text-center font-mono"
              />
            </div>
          </div>

          <div className="text-xs pt-2">
            <label className="block font-bold text-slate-700 mb-1">Tooth Numbering System Standard *</label>
            <select
              value={settings.tooth_numbering_system}
              onChange={(e) => setSettings({ ...settings, tooth_numbering_system: e.target.value })}
              className="w-full p-2.5 bg-slate-50 border rounded-xl font-bold"
            >
              <option value="FDI (Two-digit notation)">FDI (Two-digit notation: 11-18, 21-28, 31-38, 41-48) - International Standard</option>
              <option value="Universal (1-32)">Universal Numbering System (1 to 32) - USA Standard</option>
              <option value="Palmer Notation">Palmer Notation (Quadrant brackets)</option>
            </select>
          </div>
        </div>

        {/* Save Action */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold rounded-2xl shadow-lg shadow-blue-500/25 transition cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Clinic Settings'}
          </button>
        </div>

      </form>

    </div>
  );
};

export default SettingsView;
