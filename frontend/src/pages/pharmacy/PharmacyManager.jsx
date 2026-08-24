import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  getMedicinesApi,
  createMedicineApi,
  updateMedicineApi,
  deleteMedicineApi,
  getPrescriptionsApi,
  createPrescriptionApi,
  dispensePrescriptionApi,
  getPharmacyReportsApi,
  getVisitsApi
} from '../../api/endpoints.js';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import Modal from '../../components/ui/Modal.jsx';
import ReceiptModal from '../../components/ui/ReceiptModal.jsx';
import SearchableSelect from '../../components/ui/SearchableSelect.jsx';
import {
  Pill,
  Search,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  CreditCard,
  Receipt,
  FileText,
  Printer,
  Calendar,
  Clock,
  Send,
  AlertCircle,
  AlertTriangle,
  ShoppingBag,
  Sparkles,
  Users,
  Stethoscope,
  Boxes,
  ArrowRight,
  TrendingUp,
  DollarSign,
  Syringe,
  ShieldAlert,
  Flame,
  Check,
  X,
  User
} from 'lucide-react';

const COMMON_PRESETS = [
  {
    medicine_name: 'Amoxicillin',
    dosage: '500 mg',
    frequency: '3× daily',
    duration: '5 days',
    quantity: 15,
    unit_price: 3.00,
    instructions: 'Take after meals for 5 continuous days',
    food_relation: 'After Meals',
    prn: false,
    route: 'Oral',
    is_injection: false
  },
  {
    medicine_name: 'Metronidazole',
    dosage: '400 mg',
    frequency: '3× daily',
    duration: '5 days',
    quantity: 15,
    unit_price: 2.50,
    instructions: 'Take with or after food. Avoid alcohol completely during treatment',
    food_relation: 'With Meals',
    prn: false,
    route: 'Oral',
    is_injection: false
  },
  {
    medicine_name: 'Paracetamol',
    dosage: '500 mg',
    frequency: '3× daily',
    duration: '3 days',
    quantity: 9,
    unit_price: 1.50,
    instructions: 'Take as needed for pain or fever',
    food_relation: 'Anytime',
    prn: true,
    prn_reason: 'for moderate toothache or fever',
    route: 'Oral',
    is_injection: false
  },
  {
    medicine_name: 'Ibuprofen',
    dosage: '400 mg',
    frequency: '2× daily',
    duration: '5 days',
    quantity: 10,
    unit_price: 2.00,
    instructions: 'Take immediately after food for dental swelling and pain',
    food_relation: 'After Meals',
    prn: true,
    prn_reason: 'for severe inflammatory dental pain',
    route: 'Oral',
    is_injection: false
  },
  {
    medicine_name: 'Augmentin (Amoxicillin/Clavulanate)',
    dosage: '625 mg',
    frequency: '2× daily',
    duration: '5 days',
    quantity: 10,
    unit_price: 6.00,
    instructions: 'Take 1 tablet every 12 hours with meals',
    food_relation: 'With Meals',
    prn: false,
    route: 'Oral',
    is_injection: false
  },
  {
    medicine_name: 'Chlorhexidine 0.2% Mouthwash',
    dosage: '0.2% (300 ml)',
    frequency: '2× daily',
    duration: '7 days',
    quantity: 1,
    unit_price: 5.00,
    instructions: 'Rinse with 10ml for 1 minute twice daily after brushing. Do not swallow',
    food_relation: 'After Meals',
    prn: false,
    route: 'Topical / Oral Mucosa',
    is_injection: false
  },
  {
    medicine_name: 'Lidocaine 2% with Epinephrine (Cartridge)',
    dosage: '1.8 ml (2%)',
    frequency: 'Stat / Single Dose',
    duration: 'Single dose',
    quantity: 2,
    unit_price: 4.00,
    instructions: 'Administered by dental surgeon prior to oral procedure',
    food_relation: 'Anytime',
    prn: false,
    route: 'Dental Infiltration / Nerve Block',
    is_injection: true
  },
  {
    medicine_name: 'Diclofenac Sodium 75mg/3ml Injection',
    dosage: '75 mg/3ml',
    frequency: 'Stat / Once daily',
    duration: '1 day',
    quantity: 1,
    unit_price: 4.50,
    instructions: 'Deep intramuscular injection for severe acute post-surgical pain',
    food_relation: 'Anytime',
    prn: true,
    prn_reason: 'for acute post-surgical trauma',
    route: 'Intramuscular (IM)',
    is_injection: true
  }
];

const MEDICINE_CATEGORIES = [
  'Antibiotics',
  'Pain Relief / Analgesic',
  'Anti-inflammatory (NSAID)',
  'Mouthwash & Antiseptic',
  'Anesthetics',
  'Injections & Cartridges',
  'Dermatologic & Topicals',
  'Vitamins & Supplements',
  'Other'
];

const DOSAGE_FORMS = [
  'Tablet',
  'Capsule',
  'Syrup',
  'Oral Gel / Cream',
  'Mouthwash',
  'Injection (IM/IV/SC)',
  'Dental Cartridge (Anesthetic)',
  'Vial / Ampoule',
  'Drops',
  'Ointment'
];

const ROUTES = [
  'Oral',
  'Dental Infiltration / Nerve Block',
  'Intramuscular (IM)',
  'Intravenous (IV)',
  'Subcutaneous (SC)',
  'Topical / Oral Mucosa',
  'Sublingual',
  'Ophthalmic',
  'Otic'
];

const FREQUENCIES = [
  '1× daily (QD)',
  '2× daily (BID - every 12h)',
  '3× daily (TID - every 8h)',
  '4× daily (QID - every 6h)',
  'Every 4 hours',
  'Every 6 hours',
  'Every 8 hours',
  'Every 12 hours',
  'Stat / Immediate Single Dose',
  'At Bedtime (QHS)',
  'As Needed (PRN)'
];

const DURATIONS = [
  'Single dose',
  '1 day',
  '2 days',
  '3 days',
  '5 days',
  '7 days',
  '10 days',
  '14 days',
  '1 month',
  'Continuous'
];

const FOOD_RELATIONS = [
  'After Meals',
  'Before Meals',
  'With Meals',
  'Empty Stomach',
  'Bedtime',
  'Anytime'
];

const PharmacyManager = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';
  const isDoctor = user?.role === 'Doctor' || isAdmin;
  const isCashier = user?.role === 'Receptionist/Cashier' || isAdmin;

  const [activeTab, setActiveTab] = useState('queue'); // 'queue' | 'catalog' | 'history' | 'reports'
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [stockFilter, setStockFilter] = useState('all'); // 'all' | 'low' | 'expiring'
  const [toastMsg, setToastMsg] = useState('');

  // Data
  const [medicines, setMedicines] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [activeVisits, setActiveVisits] = useState([]);
  const [reportsData, setReportsData] = useState(null);

  // Modals
  const [isMedicineModalOpen, setIsMedicineModalOpen] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  const [isPrescribeModalOpen, setIsPrescribeModalOpen] = useState(false);
  const [isDispenseModalOpen, setIsDispenseModalOpen] = useState(false);
  const [isPrintPrescriptionOpen, setIsPrintPrescriptionOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [currentPayment, setCurrentPayment] = useState(null);

  // Medicine Form State
  const [medicineForm, setMedicineForm] = useState({
    name: '',
    generic_name: '',
    category: 'Antibiotics',
    dosage_form: 'Tablet',
    route_of_administration: 'Oral',
    strength: '500 mg',
    is_injection: false,
    batch_number: '',
    expiry_date: '',
    unit_price: 3.00,
    cost_price: 1.50,
    stock_quantity: 100,
    reorder_level: 20,
    instructions_default: 'Take after meals as directed'
  });

  // Doctor Prescribe Form State
  const [prescribeVisitId, setPrescribeVisitId] = useState('');
  const [selectedVisitPatient, setSelectedVisitPatient] = useState(null);
  const [prescribeItems, setPrescribeItems] = useState([
    {
      medicine_id: '',
      medicine_name: 'Amoxicillin',
      dosage: '500 mg',
      frequency: '3× daily (TID - every 8h)',
      duration: '5 days',
      quantity: 15,
      unit_price: 3.00,
      instructions: 'Take after meals for 5 continuous days',
      food_relation: 'After Meals',
      prn: false,
      prn_reason: '',
      route: 'Oral',
      is_injection: false,
      injection_details: ''
    }
  ]);
  const [prescribeNotes, setPrescribeNotes] = useState('');

  // Cashier Dispensing Form State
  const [dispenseItems, setDispenseItems] = useState([]);
  const [dispensePaymentMethod, setDispensePaymentMethod] = useState('Cash');
  const [dispenseNotes, setDispenseNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchPharmacyData();
  }, [categoryFilter, stockFilter]);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4000);
  };

  const fetchPharmacyData = async () => {
    setLoading(true);
    try {
      const [medRes, rxRes, visitRes, reportRes] = await Promise.all([
        getMedicinesApi({
          category: categoryFilter || undefined,
          low_stock: stockFilter === 'low' ? 'true' : undefined,
          expiring_soon: stockFilter === 'expiring' ? 'true' : undefined
        }),
        getPrescriptionsApi(),
        getVisitsApi({ today: 'true' }).catch(() => ({ data: { data: [] } })),
        getPharmacyReportsApi().catch(() => ({ data: { data: null } }))
      ]);
      setMedicines(medRes.data?.data || []);
      setPrescriptions(rxRes.data?.data || []);
      setActiveVisits(visitRes.data?.data || []);
      setReportsData(reportRes.data?.data || null);
    } catch (err) {
      console.error('Error fetching pharmacy data:', err);
    } finally {
      setLoading(false);
    }
  };

  // --- Medicine Catalog Actions (Admin) ---
  const handleOpenAddMedicine = () => {
    setEditingMedicine(null);
    setMedicineForm({
      name: '',
      generic_name: '',
      category: 'Antibiotics',
      dosage_form: 'Tablet',
      route_of_administration: 'Oral',
      strength: '500 mg',
      is_injection: false,
      batch_number: 'BATCH-' + new Date().getFullYear() + '-' + Math.floor(100 + Math.random() * 900),
      expiry_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      unit_price: 3.00,
      cost_price: 1.50,
      stock_quantity: 100,
      reorder_level: 20,
      instructions_default: 'Take after meals as directed'
    });
    setIsMedicineModalOpen(true);
  };

  const handleOpenEditMedicine = (med) => {
    setEditingMedicine(med);
    setMedicineForm({
      name: med.name || '',
      generic_name: med.generic_name || '',
      category: med.category || 'Antibiotics',
      dosage_form: med.dosage_form || 'Tablet',
      route_of_administration: med.route_of_administration || 'Oral',
      strength: med.strength || '500 mg',
      is_injection: Boolean(med.is_injection),
      batch_number: med.batch_number || '',
      expiry_date: med.expiry_date ? new Date(med.expiry_date).toISOString().split('T')[0] : '',
      unit_price: med.unit_price !== undefined ? med.unit_price : 3.00,
      cost_price: med.cost_price !== undefined ? med.cost_price : 1.50,
      stock_quantity: med.stock_quantity !== undefined ? med.stock_quantity : 100,
      reorder_level: med.reorder_level !== undefined ? med.reorder_level : 20,
      instructions_default: med.instructions_default || 'Take after meals as directed'
    });
    setIsMedicineModalOpen(true);
  };

  const submitMedicineForm = async (e) => {
    e.preventDefault();
    if (!medicineForm.name.trim()) {
      alert('Please enter a medicine name');
      return;
    }

    setSubmitting(true);
    try {
      if (editingMedicine) {
        await updateMedicineApi(editingMedicine._id, medicineForm);
        showToast(`Medicine "${medicineForm.name}" updated successfully!`);
      } else {
        await createMedicineApi(medicineForm);
        showToast(`Medicine "${medicineForm.name}" added to catalog!`);
      }
      setIsMedicineModalOpen(false);
      setEditingMedicine(null);
      fetchPharmacyData();
    } catch (err) {
      console.error('Error saving medicine:', err);
      alert(err.response?.data?.message || 'Error saving medicine');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteMedicine = async (id) => {
    try {
      await deleteMedicineApi(id);
      setDeleteConfirmId(null);
      fetchPharmacyData();
      showToast('Medicine deleted from catalog.');
    } catch (err) {
      console.error('Error deleting medicine:', err);
      alert(err.response?.data?.message || 'Error deleting medicine');
    }
  };

  // --- Doctor Prescribing Actions ---
  const handleOpenPrescribeModal = () => {
    const defaultVisit = activeVisits[0];
    setPrescribeVisitId(defaultVisit?._id || '');
    setSelectedVisitPatient(defaultVisit?.patient_id || null);
    setPrescribeItems([
      {
        medicine_id: '',
        medicine_name: 'Amoxicillin',
        dosage: '500 mg',
        frequency: '3× daily (TID - every 8h)',
        duration: '5 days',
        quantity: 15,
        unit_price: 3.00,
        instructions: 'Take 1 capsule 3 times daily after meals',
        food_relation: 'After Meals',
        prn: false,
        prn_reason: '',
        route: 'Oral',
        is_injection: false,
        injection_details: ''
      }
    ]);
    setPrescribeNotes('');
    setIsPrescribeModalOpen(true);
  };

  const handleVisitChange = (vId) => {
    setPrescribeVisitId(vId);
    const matchedVisit = activeVisits.find(v => v._id === vId);
    setSelectedVisitPatient(matchedVisit?.patient_id || null);
  };

  const handleAddPresetItem = (preset) => {
    const matchedMed = medicines.find(m => m.name.toLowerCase() === preset.medicine_name.toLowerCase());
    setPrescribeItems([
      ...prescribeItems,
      {
        medicine_id: matchedMed?._id || '',
        medicine_name: preset.medicine_name,
        dosage: preset.dosage,
        frequency: preset.frequency,
        duration: preset.duration,
        quantity: preset.quantity,
        unit_price: matchedMed?.unit_price !== undefined ? matchedMed.unit_price : preset.unit_price,
        instructions: preset.instructions,
        food_relation: preset.food_relation || 'After Meals',
        prn: Boolean(preset.prn),
        prn_reason: preset.prn_reason || '',
        route: preset.route || 'Oral',
        is_injection: Boolean(preset.is_injection),
        injection_details: preset.is_injection ? 'Deep IM / Dental infiltration' : ''
      }
    ]);
  };

  const handlePrescribeMedicineSelect = (idx, medId) => {
    const med = medicines.find(m => m._id === medId);
    if (!med) return;

    setPrescribeItems(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      return {
        ...item,
        medicine_id: med._id,
        medicine_name: med.name,
        dosage: med.strength || '500 mg',
        unit_price: med.unit_price || 0,
        instructions: med.instructions_default || 'Take after meals as directed',
        route: med.route_of_administration || (med.is_injection ? 'Intramuscular (IM)' : 'Oral'),
        is_injection: Boolean(med.is_injection || med.dosage_form?.toLowerCase().includes('injection'))
      };
    }));
  };

  // Check if any drug in prescription items matches patient's registered allergies
  const getAllergyConflict = (medName) => {
    if (!selectedVisitPatient || !selectedVisitPatient.medical_info?.allergies) return null;
    const allergies = selectedVisitPatient.medical_info.allergies.map(a => a.toLowerCase().trim());
    const drug = (medName || '').toLowerCase();

    for (const al of allergies) {
      if (al && (drug.includes(al) || (al === 'penicillin' && (drug.includes('amox') || drug.includes('augmentin') || drug.includes('ampicillin'))))) {
        return al;
      }
    }
    return null;
  };

  const submitPrescription = async (e) => {
    e.preventDefault();
    if (!prescribeVisitId) {
      alert('Please select an active patient visit');
      return;
    }
    const validItems = prescribeItems.filter(it => it.medicine_name && it.medicine_name.trim());
    if (validItems.length === 0) {
      alert('Please add at least one medication to prescribe');
      return;
    }

    setSubmitting(true);
    try {
      const res = await createPrescriptionApi({
        visit_id: prescribeVisitId,
        items: validItems,
        notes: prescribeNotes
      });
      setIsPrescribeModalOpen(false);
      fetchPharmacyData();

      if (res.data?.allergy_warnings && res.data.allergy_warnings.length > 0) {
        alert(res.data.allergy_warnings.join('\n'));
      }
      showToast('Prescription written and sent to Pharmacy / Cashier Queue!');
    } catch (err) {
      console.error('Error creating prescription:', err);
      alert(err.response?.data?.message || 'Error creating prescription');
    } finally {
      setSubmitting(false);
    }
  };

  // --- Cashier Dispensing & Checkout ---
  const handleOpenDispenseModal = (rx) => {
    setSelectedPrescription(rx);
    setDispenseItems(rx.items.map(it => ({
      item_id: it._id,
      medicine_name: it.medicine_name,
      dosage: it.dosage,
      frequency: it.frequency,
      duration: it.duration,
      quantity: it.quantity,
      unit_price: it.unit_price,
      total_price: Number((it.quantity * it.unit_price).toFixed(2)),
      food_relation: it.food_relation,
      prn: it.prn,
      is_injection: it.is_injection,
      purchased: it.status !== 'Declined / External' && it.status !== 'Dispensed'
    })));
    setDispensePaymentMethod('Cash');
    setDispenseNotes('');
    setIsDispenseModalOpen(true);
  };

  const submitDispenseCheckout = async (e) => {
    e.preventDefault();
    if (!selectedPrescription) return;

    setSubmitting(true);
    try {
      const res = await dispensePrescriptionApi(selectedPrescription._id, {
        items_to_purchase: dispenseItems,
        payment_method: dispensePaymentMethod,
        notes: dispenseNotes
      });

      setIsDispenseModalOpen(false);
      fetchPharmacyData();

      if (res.data?.data?.payment) {
        setCurrentPayment(res.data.data.payment);
        setIsReceiptModalOpen(true);
      }
      showToast(`Prescription dispensed, stock deducted, and receipt issued!`);
    } catch (err) {
      console.error('Error dispensing prescription:', err);
      alert(err.response?.data?.message || 'Error processing dispensing');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenPrintPrescription = (rx) => {
    setSelectedPrescription(rx);
    setIsPrintPrescriptionOpen(true);
  };

  // Filtered lists
  const filteredMedicines = medicines.filter(m =>
    m.name?.toLowerCase().includes(search.toLowerCase()) ||
    m.generic_name?.toLowerCase().includes(search.toLowerCase()) ||
    m.medicine_code?.toLowerCase().includes(search.toLowerCase()) ||
    m.batch_number?.toLowerCase().includes(search.toLowerCase())
  );

  const pendingPrescriptions = prescriptions.filter(p => p.status === 'Pending' || p.payment_status === 'Unpaid');
  const dispensedPrescriptions = prescriptions.filter(p => p.status === 'Dispensed' || p.payment_status === 'Paid');

  const activeQueueList = activeTab === 'history'
    ? dispensedPrescriptions.filter(p =>
        p.prescription_number?.toLowerCase().includes(search.toLowerCase()) ||
        p.patient_id?.name?.toLowerCase().includes(search.toLowerCase()) ||
        p.patient_id?.patient_number?.toLowerCase().includes(search.toLowerCase())
      )
    : pendingPrescriptions.filter(p =>
        p.prescription_number?.toLowerCase().includes(search.toLowerCase()) ||
        p.patient_id?.name?.toLowerCase().includes(search.toLowerCase()) ||
        p.patient_id?.patient_number?.toLowerCase().includes(search.toLowerCase())
      );

  return (
    <div className="space-y-6">
      
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 font-bold text-xs animate-bounce">
          <CheckCircle className="w-4 h-4" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Pill className="w-6 h-6 text-purple-600" />
            <span>Pharmacy & Medicines Management</span>
          </h1>
          <p className="text-xs text-slate-500">
            Dose, frequency, PRN, food timing, automatic stock deduction, allergy screening, injections, and sales analytics
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isDoctor && (
            <button
              onClick={handleOpenPrescribeModal}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-md shadow-purple-500/20 transition cursor-pointer"
            >
              <Stethoscope className="w-4 h-4" />
              <span>+ Write Prescription</span>
            </button>
          )}

          {isAdmin && (
            <button
              onClick={handleOpenAddMedicine}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/20 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Medicine</span>
            </button>
          )}
        </div>
      </div>

      {/* Quick Stat Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 bg-white border border-slate-100 rounded-2xl shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pending Orders</span>
          <p className="text-xl font-black text-amber-600 font-mono">{pendingPrescriptions.length}</p>
          <span className="text-[10px] text-slate-400">Awaiting cashier dispensing</span>
        </div>
        <div className="p-4 bg-white border border-slate-100 rounded-2xl shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Today's Sales</span>
          <p className="text-xl font-black text-emerald-600 font-mono">
            ${reportsData?.summary?.today_sales !== undefined ? Number(reportsData.summary.today_sales).toFixed(2) : '0.00'}
          </p>
          <span className="text-[10px] text-slate-400">Pharmacy cash collections</span>
        </div>
        <div className="p-4 bg-white border border-slate-100 rounded-2xl shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Low Stock Warnings</span>
          <p className="text-xl font-black text-rose-600 font-mono">
            {medicines.filter(m => m.stock_quantity <= (m.reorder_level || 20)).length}
          </p>
          <span className="text-[10px] text-slate-400">Items below reorder point</span>
        </div>
        <div className="p-4 bg-white border border-slate-100 rounded-2xl shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Expiring / Injections</span>
          <p className="text-xl font-black text-purple-600 font-mono">
            {medicines.filter(m => m.is_injection).length} Injections
          </p>
          <span className="text-[10px] text-slate-400">
            {reportsData?.summary?.expiring_soon_count || 0} drugs expiring soon
          </span>
        </div>
      </div>

      {/* Tab Navigation & Search Bar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-3">
          
          {/* Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-2xl">
            <button
              onClick={() => setActiveTab('queue')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'queue' ? 'bg-white text-purple-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Queue ({pendingPrescriptions.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('catalog')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'catalog' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Boxes className="w-3.5 h-3.5" />
              <span>Medicines & Stock ({medicines.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'history' ? 'bg-white text-emerald-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Dispensed ({dispensedPrescriptions.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'reports' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Sales & Reports</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={activeTab === 'catalog' ? "Search name, generic, batch..." : "Search patient, Rx number..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* TAB 1 & 3: PRESCRIPTIONS QUEUE & SALES HISTORY                */}
        {/* ------------------------------------------------------------- */}
        {(activeTab === 'queue' || activeTab === 'history') && (
          <div className="space-y-3">
            {loading ? (
              <div className="text-center py-12">
                <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-xs text-slate-400">Loading prescriptions...</p>
              </div>
            ) : activeQueueList.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200 p-6">
                <Pill className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-700">
                  {activeTab === 'history' ? 'No dispensed pharmacy records found' : 'No pending prescriptions in queue'}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {activeTab === 'history' ? 'Completed orders will appear here.' : 'When doctors prescribe medications, they appear here for dispensing.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3.5">
                {activeQueueList.map((rx) => (
                  <div
                    key={rx._id}
                    className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 hover:border-purple-300 transition shadow-2xs space-y-3"
                  >
                    {/* Header Row */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold text-xs shrink-0 font-mono">
                          Rx
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-black text-purple-900 text-xs">{rx.prescription_number}</span>
                            <span className="text-slate-300">•</span>
                            <span className="font-black text-slate-900 text-sm">{rx.patient_id?.name || 'Patient'}</span>
                            <span className="text-[10px] text-slate-400 font-mono">({rx.patient_id?.patient_number})</span>
                            {rx.items?.some(it => it.allergy_warning_flag) && (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1">
                                <ShieldAlert className="w-3 h-3 text-rose-600" />
                                <span>Allergy Flagged</span>
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Prescribed by <strong className="text-slate-700">Dr. {rx.doctor_id?.full_name || rx.doctor_id?.username}</strong> • Visit {rx.visit_id?.visit_number || 'VIS'} • {new Date(rx.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <StatusBadge status={rx.payment_status === 'Paid' ? 'Paid' : (rx.status === 'Dispensed' ? 'Dispensed' : 'Unpaid')} />
                        
                        <button
                          onClick={() => handleOpenPrintPrescription(rx)}
                          title="Print Prescription Slip"
                          className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl border border-slate-200 transition cursor-pointer flex items-center gap-1 text-xs font-bold"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Print Rx</span>
                        </button>

                        {isCashier && rx.payment_status !== 'Paid' && (
                          <button
                            onClick={() => handleOpenDispenseModal(rx)}
                            className="flex items-center gap-1.5 px-3.5 py-2 bg-purple-600 hover:bg-purple-700 active:scale-95 text-white rounded-xl font-bold text-xs shadow-md shadow-purple-500/20 transition cursor-pointer"
                          >
                            <ShoppingBag className="w-3.5 h-3.5" />
                            <span>Dispense & Checkout</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Prescribed Items Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead>
                          <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                            <th className="pb-1.5">Medicine</th>
                            <th className="pb-1.5">Dose</th>
                            <th className="pb-1.5">Frequency & Timing</th>
                            <th className="pb-1.5">Duration</th>
                            <th className="pb-1.5">Route</th>
                            <th className="pb-1.5 text-center">Qty</th>
                            <th className="pb-1.5 text-right">Price</th>
                            <th className="pb-1.5 text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {rx.items.map((item, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50">
                              <td className="py-2 font-bold text-slate-900">
                                <div className="flex items-center gap-1.5">
                                  <span>{item.medicine_name}</span>
                                  {item.is_injection && (
                                    <span className="px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[9px] font-bold flex items-center gap-0.5">
                                      <Syringe className="w-2.5 h-2.5 text-amber-700" />
                                      <span>Inject</span>
                                    </span>
                                  )}
                                  {item.prn && (
                                    <span className="px-1.5 py-0.5 rounded-md bg-purple-100 text-purple-800 text-[9px] font-bold">
                                      PRN
                                    </span>
                                  )}
                                </div>
                                {item.instructions && (
                                  <span className="block text-[10px] text-slate-400 font-normal">{item.instructions}</span>
                                )}
                                {item.prn_reason && (
                                  <span className="block text-[10px] text-purple-600 font-medium">PRN: {item.prn_reason}</span>
                                )}
                              </td>
                              <td className="py-2 font-mono font-medium text-slate-700">{item.dosage || '500 mg'}</td>
                              <td className="py-2 text-slate-600">
                                <div>{item.frequency || '3× daily'}</div>
                                <span className="text-[10px] text-indigo-600 font-semibold">{item.food_relation || 'After Meals'}</span>
                              </td>
                              <td className="py-2 text-slate-600">{item.duration || '5 days'}</td>
                              <td className="py-2 text-slate-600 text-[11px]">{item.route || 'Oral'}</td>
                              <td className="py-2 text-center font-mono font-bold text-purple-700">{item.quantity}</td>
                              <td className="py-2 text-right font-mono font-bold text-slate-900">${Number(item.total_price || 0).toFixed(2)}</td>
                              <td className="py-2 text-right">
                                <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold ${
                                  item.status === 'Dispensed' || item.is_purchased
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : item.status === 'Declined / External'
                                    ? 'bg-slate-100 text-slate-500'
                                    : 'bg-amber-100 text-amber-800'
                                }`}>
                                  {item.status || 'Pending'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Footer Summary */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pt-2 border-t border-slate-100 text-[11px]">
                      <div className="text-slate-500">
                        {rx.notes && <span><strong>Doctor Notes:</strong> {rx.notes}</span>}
                        {rx.dispensed_by_name && (
                          <span className="ml-2 font-medium text-emerald-700">
                            • Dispensed by {rx.dispensed_by_name} on {new Date(rx.dispensed_date).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 self-end font-mono">
                        <span className="text-slate-500 uppercase text-[10px] font-bold">Total Value:</span>
                        <span className="text-sm font-black text-purple-950">${Number(rx.total_amount || 0).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 2: MEDICINES CATALOG & PRICING INVENTORY                  */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'catalog' && (
          <div className="space-y-4">
            
            {/* Category & Stock Filter Controls */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  onClick={() => setCategoryFilter('')}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer border ${
                    categoryFilter === '' ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  All Categories
                </button>
                {MEDICINE_CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer border ${
                      categoryFilter === cat ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Stock Alerts Filter Pills */}
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
                <button
                  onClick={() => setStockFilter('all')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition ${
                    stockFilter === 'all' ? 'bg-white text-slate-800 shadow-2xs' : 'text-slate-500'
                  }`}
                >
                  All Stock
                </button>
                <button
                  onClick={() => setStockFilter('low')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition flex items-center gap-1 ${
                    stockFilter === 'low' ? 'bg-amber-600 text-white' : 'text-amber-700 hover:bg-amber-50'
                  }`}
                >
                  <AlertTriangle className="w-3 h-3" />
                  <span>Low Stock</span>
                </button>
                <button
                  onClick={() => setStockFilter('expiring')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition flex items-center gap-1 ${
                    stockFilter === 'expiring' ? 'bg-rose-600 text-white' : 'text-rose-700 hover:bg-rose-50'
                  }`}
                >
                  <Clock className="w-3 h-3" />
                  <span>Expiring Soon</span>
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Code</th>
                    <th className="py-3 px-4">Medicine & Generic</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Form & Route</th>
                    <th className="py-3 px-4">Batch / Expiry</th>
                    <th className="py-3 px-4 text-right">Selling Price ($)</th>
                    <th className="py-3 px-4 text-center">Stock</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    {isAdmin && <th className="py-3 px-4 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredMedicines.length === 0 ? (
                    <tr>
                      <td colSpan={isAdmin ? 9 : 8} className="text-center py-8 text-slate-400">
                        No medicines found matching filters.
                      </td>
                    </tr>
                  ) : (
                    filteredMedicines.map(med => {
                      const isLowStock = med.stock_quantity <= (med.reorder_level || 20);
                      const isOutOfStock = med.stock_quantity <= 0;
                      const isExpiring = med.expiry_date && new Date(med.expiry_date) < new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

                      return (
                        <tr key={med._id} className="hover:bg-slate-50/60 transition">
                          <td className="py-3 px-4 font-mono font-bold text-slate-500">{med.medicine_code}</td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-900">{med.name}</span>
                              {med.is_injection && (
                                <span className="px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[9px] font-bold flex items-center gap-0.5">
                                  <Syringe className="w-2.5 h-2.5" />
                                  <span>Inject</span>
                                </span>
                              )}
                            </div>
                            {med.generic_name && (
                              <span className="text-[10px] text-slate-400 font-normal block">{med.generic_name}</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-600">{med.category}</td>
                          <td className="py-3 px-4">
                            <span className="font-medium text-slate-800 block">{med.dosage_form} ({med.strength})</span>
                            <span className="text-[10px] text-purple-700 font-bold block">{med.route_of_administration || 'Oral'}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-mono text-slate-600 text-[11px] block">{med.batch_number || 'BATCH-001'}</span>
                            <span className={`text-[10px] font-bold block ${
                              isExpiring ? 'text-rose-600 font-black' : 'text-slate-400'
                            }`}>
                              {med.expiry_date ? new Date(med.expiry_date).toLocaleDateString() : 'No exp recorded'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                            ${Number(med.unit_price || 0).toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-center font-mono font-bold text-slate-800">
                            {med.stock_quantity}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              isOutOfStock ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                              isLowStock ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                              'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            }`}>
                              {isOutOfStock ? 'Out of Stock' : (isLowStock ? 'Low Stock' : 'In Stock')}
                            </span>
                          </td>
                          {isAdmin && (
                            <td className="py-3 px-4 text-right">
                              {deleteConfirmId === med._id ? (
                                <div className="inline-flex items-center gap-1 bg-rose-50 border border-rose-200 rounded-xl px-2 py-0.5">
                                  <span className="text-[10px] font-bold text-rose-700">Delete?</span>
                                  <button
                                    onClick={() => handleDeleteMedicine(med._id)}
                                    className="px-2 py-0.5 bg-rose-600 text-white rounded font-bold text-[10px]"
                                  >
                                    Yes
                                  </button>
                                  <button
                                    onClick={() => setDeleteConfirmId(null)}
                                    className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded font-bold text-[10px]"
                                  >
                                    No
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => handleOpenEditMedicine(med)}
                                    className="p-1.5 bg-amber-50 hover:bg-amber-500 hover:text-white text-amber-600 rounded-lg transition cursor-pointer"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => setDeleteConfirmId(med._id)}
                                    className="p-1.5 bg-rose-50 hover:bg-rose-500 hover:text-white text-rose-500 rounded-lg transition cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 4: PHARMACY SALES & REPORTS ANALYTICS                     */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'reports' && (
          <div className="space-y-6">
            
            {/* Sales KPI Banner */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-5 bg-gradient-to-br from-emerald-500 to-teal-700 text-white rounded-3xl shadow-md space-y-1">
                <span className="text-xs font-bold text-emerald-100 uppercase tracking-wider">Today's Pharmacy Revenue</span>
                <p className="text-3xl font-black font-mono">
                  ${Number(reportsData?.summary?.today_sales || 0).toFixed(2)}
                </p>
                <span className="text-[11px] text-emerald-100">Live POS Collections</span>
              </div>
              <div className="p-5 bg-gradient-to-br from-blue-600 to-indigo-800 text-white rounded-3xl shadow-md space-y-1">
                <span className="text-xs font-bold text-blue-100 uppercase tracking-wider">Month-to-Date Pharmacy Revenue</span>
                <p className="text-3xl font-black font-mono">
                  ${Number(reportsData?.summary?.month_sales || 0).toFixed(2)}
                </p>
                <span className="text-[11px] text-blue-100">{new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
              </div>
              <div className="p-5 bg-gradient-to-br from-purple-600 to-fuchsia-800 text-white rounded-3xl shadow-md space-y-1">
                <span className="text-xs font-bold text-purple-100 uppercase tracking-wider">Total Prescriptions Dispensed</span>
                <p className="text-3xl font-black font-mono">
                  {reportsData?.summary?.dispensed_prescriptions || 0}
                </p>
                <span className="text-[11px] text-purple-100">
                  out of {reportsData?.summary?.total_prescriptions || 0} written prescriptions
                </span>
              </div>
            </div>

            {/* Two Column Grid: Top Prescribed Drugs & Low Stock / Reorder Alerts */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Top Selling & Prescribed Medicines */}
              <div className="bg-slate-50 p-4 rounded-3xl border border-slate-200 space-y-3">
                <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  <span>Top Prescribed & Dispensed Drugs</span>
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="text-[10px] font-bold text-slate-400 uppercase border-b border-slate-200">
                        <th className="pb-1.5">Medicine Name</th>
                        <th className="pb-1.5 text-center">Prescribed</th>
                        <th className="pb-1.5 text-center">Sold</th>
                        <th className="pb-1.5 text-right">Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {reportsData?.top_medicines && reportsData.top_medicines.length > 0 ? (
                        reportsData.top_medicines.map((m, idx) => (
                          <tr key={idx}>
                            <td className="py-2 font-bold text-slate-800">
                              {idx + 1}. {m.name} <span className="text-[10px] text-slate-400 font-normal">({m.dosage})</span>
                            </td>
                            <td className="py-2 text-center font-mono">{m.quantity_prescribed}</td>
                            <td className="py-2 text-center font-mono font-bold text-emerald-700">{m.quantity_sold}</td>
                            <td className="py-2 text-right font-mono font-bold text-slate-900">${Number(m.total_revenue).toFixed(2)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="py-4 text-center text-slate-400">No sales data recorded yet</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Low Stock & Expiry Alert Panel */}
              <div className="bg-slate-50 p-4 rounded-3xl border border-slate-200 space-y-3">
                <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span>Low Stock & Reorder Alert List</span>
                </h3>
                <div className="overflow-x-auto max-h-60 overflow-y-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="text-[10px] font-bold text-slate-400 uppercase border-b border-slate-200">
                        <th className="pb-1.5">Drug Name</th>
                        <th className="pb-1.5 text-center">Current Stock</th>
                        <th className="pb-1.5 text-center">Reorder Level</th>
                        <th className="pb-1.5 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {reportsData?.low_stock_medicines && reportsData.low_stock_medicines.length > 0 ? (
                        reportsData.low_stock_medicines.map((m, idx) => (
                          <tr key={idx}>
                            <td className="py-2 font-bold text-slate-800">
                              {m.name} <span className="text-[10px] text-slate-400 font-normal">({m.dosage_form})</span>
                            </td>
                            <td className="py-2 text-center font-mono font-bold text-rose-600">{m.stock_quantity}</td>
                            <td className="py-2 text-center font-mono text-slate-500">{m.reorder_level || 20}</td>
                            <td className="py-2 text-right">
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-100 text-rose-800">
                                {m.stock_quantity <= 0 ? 'Out of Stock' : 'Reorder Now'}
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="py-4 text-center text-emerald-600 font-bold">
                            ✅ All pharmacy stock levels are healthy!
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

            {/* Pharmacy Payment Receipts Audit Log */}
            <div className="bg-white p-4 rounded-3xl border border-slate-200 space-y-3">
              <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
                <Receipt className="w-4 h-4 text-purple-600" />
                <span>Recent Pharmacy Cashier Transactions</span>
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase">
                    <tr>
                      <th className="py-2.5 px-3">Receipt #</th>
                      <th className="py-2.5 px-3">Patient</th>
                      <th className="py-2.5 px-3">Payment Method</th>
                      <th className="py-2.5 px-3">Received By</th>
                      <th className="py-2.5 px-3">Date & Time</th>
                      <th className="py-2.5 px-3 text-right">Amount ($)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reportsData?.recent_transactions && reportsData.recent_transactions.length > 0 ? (
                      reportsData.recent_transactions.map((p, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-mono font-bold text-purple-900">{p.receipt_number}</td>
                          <td className="py-2.5 px-3 font-bold text-slate-800">{p.patient_id?.name || 'Patient'}</td>
                          <td className="py-2.5 px-3">{p.payment_method}</td>
                          <td className="py-2.5 px-3 text-slate-600">{p.received_by?.full_name || p.received_by?.username}</td>
                          <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">{new Date(p.payment_date).toLocaleString()}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">${Number(p.amount).toFixed(2)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-4 text-center text-slate-400">No pharmacy receipts found</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: ADD / EDIT MEDICINE (ADMIN)                                      */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isMedicineModalOpen}
        onClose={() => setIsMedicineModalOpen(false)}
        icon={Pill}
        title={editingMedicine ? `Edit Medicine: ${editingMedicine.name}` : "Add New Medicine to Pharmacy"}
        subtitle="Configure drug formulation, strength, injection route, price, and stock levels."
        maxWidth="max-w-2xl"
      >
        <form onSubmit={submitMedicineForm} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Brand / Medicine Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Amoxicillin, Ibuprofen, Lidocaine"
                value={medicineForm.name}
                onChange={(e) => setMedicineForm({ ...medicineForm, name: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Generic Name / Active Substance</label>
              <input
                type="text"
                placeholder="e.g. Amoxicillin Trihydrate, Lidocaine HCl"
                value={medicineForm.generic_name}
                onChange={(e) => setMedicineForm({ ...medicineForm, generic_name: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Category *</label>
              <select
                value={medicineForm.category}
                onChange={(e) => setMedicineForm({ ...medicineForm, category: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
              >
                {MEDICINE_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Dosage Form</label>
              <select
                value={medicineForm.dosage_form}
                onChange={(e) => {
                  const val = e.target.value;
                  const isInj = val.toLowerCase().includes('injection') || val.toLowerCase().includes('cartridge') || val.toLowerCase().includes('vial');
                  setMedicineForm({
                    ...medicineForm,
                    dosage_form: val,
                    is_injection: isInj,
                    route_of_administration: isInj ? 'Dental Infiltration / Nerve Block' : medicineForm.route_of_administration
                  });
                }}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
              >
                {DOSAGE_FORMS.map(form => (
                  <option key={form} value={form}>{form}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Route of Administration</label>
              <select
                value={medicineForm.route_of_administration}
                onChange={(e) => setMedicineForm({ ...medicineForm, route_of_administration: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
              >
                {ROUTES.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Strength / Concentration</label>
              <input
                type="text"
                placeholder="e.g. 500 mg, 400 mg, 2%"
                value={medicineForm.strength}
                onChange={(e) => setMedicineForm({ ...medicineForm, strength: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Batch / Lot Number</label>
              <input
                type="text"
                placeholder="e.g. LOT-2026-90"
                value={medicineForm.batch_number}
                onChange={(e) => setMedicineForm({ ...medicineForm, batch_number: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Expiry Date</label>
              <input
                type="date"
                value={medicineForm.expiry_date}
                onChange={(e) => setMedicineForm({ ...medicineForm, expiry_date: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Selling Price ($) *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={medicineForm.unit_price}
                  onChange={(e) => setMedicineForm({ ...medicineForm, unit_price: e.target.value })}
                  className="w-full pl-7 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-emerald-800"
                />
              </div>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Initial Stock Count</label>
              <input
                type="number"
                min="0"
                value={medicineForm.stock_quantity}
                onChange={(e) => setMedicineForm({ ...medicineForm, stock_quantity: e.target.value })}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Reorder Level Alert</label>
              <input
                type="number"
                min="0"
                value={medicineForm.reorder_level}
                onChange={(e) => setMedicineForm({ ...medicineForm, reorder_level: e.target.value })}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Standard Patient Instructions</label>
            <input
              type="text"
              placeholder="e.g. Take 1 tablet 3 times daily for 5 days after food"
              value={medicineForm.instructions_default}
              onChange={(e) => setMedicineForm({ ...medicineForm, instructions_default: e.target.value })}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsMedicineModalOpen(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 font-bold rounded-xl text-xs transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md transition cursor-pointer disabled:opacity-50"
            >
              {submitting ? 'Saving...' : editingMedicine ? 'Update Medicine' : 'Save to Catalog'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 2: DOCTOR WRITES PRESCRIPTION (WITH ALLERGY & INJECTION SUPPORT)    */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isPrescribeModalOpen}
        onClose={() => setIsPrescribeModalOpen(false)}
        icon={Stethoscope}
        title="Write Patient Prescription"
        subtitle="Prescribe with dose, frequency, duration, PRN, food relation, and clinical allergy check."
        maxWidth="max-w-3xl"
      >
        <form onSubmit={submitPrescription} className="space-y-4 text-xs">
          
          {/* Select Active Patient Visit */}
          <div>
            <SearchableSelect
              label="Select Patient & Active Visit *"
              required
              icon={Users}
              placeholder="-- Search & Select Patient / Active Visit --"
              searchPlaceholder="Search by patient name, phone, or visit number..."
              value={prescribeVisitId}
              onChange={handleVisitChange}
              options={activeVisits.map((v) => ({
                value: v._id,
                label: v.patient_id?.name || 'Patient',
                sublabel: `${v.patient_id?.patient_number || ''} • ${v.patient_id?.telephone || ''}`,
                badge: `Visit ${v.visit_number}`
              }))}
            />
          </div>

          {/* Patient Medical Alerts & Allergies Banner */}
          {selectedVisitPatient && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-600" />
                <div>
                  <span className="font-bold text-slate-800 text-xs">Patient Allergy Record: </span>
                  <span className="font-semibold text-rose-700">
                    {selectedVisitPatient.medical_info?.allergies?.length > 0
                      ? selectedVisitPatient.medical_info.allergies.join(', ')
                      : 'No drug allergies reported'}
                  </span>
                </div>
              </div>
              <div className="text-[11px] text-slate-500 font-medium">
                Blood Group: <strong>{selectedVisitPatient.medical_info?.blood_group || 'N/A'}</strong> • Bleeding: <strong>{selectedVisitPatient.medical_info?.bleeding_disorder ? '⚠️ Yes' : 'Normal'}</strong>
              </div>
            </div>
          )}

          {/* Preset Quick Chips */}
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
              1-Click Dental Presets:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {COMMON_PRESETS.map((p, pIdx) => {
                const allergyConflict = getAllergyConflict(p.medicine_name);
                return (
                  <button
                    key={pIdx}
                    type="button"
                    onClick={() => handleAddPresetItem(p)}
                    className={`px-2.5 py-1 rounded-xl text-[10px] font-bold border transition cursor-pointer flex items-center gap-1 ${
                      allergyConflict
                        ? 'bg-rose-50 text-rose-900 border-rose-300 hover:bg-rose-100'
                        : p.is_injection
                        ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
                        : 'bg-purple-50 hover:bg-purple-100 text-purple-900 border-purple-200'
                    }`}
                  >
                    {allergyConflict ? <ShieldAlert className="w-3 h-3 text-rose-600" /> : <Plus className="w-3 h-3 text-purple-600" />}
                    <span>{p.medicine_name} {p.dosage} ({p.frequency})</span>
                    {p.is_injection && <span className="text-[9px] text-amber-700 font-mono">[Inj]</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Prescribed Items Dynamic List */}
          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            {prescribeItems.map((item, idx) => {
              const allergyConflict = getAllergyConflict(item.medicine_name);

              return (
                <div
                  key={idx}
                  className={`p-3.5 rounded-2xl border space-y-2.5 relative transition ${
                    allergyConflict
                      ? 'bg-rose-50/70 border-rose-300 shadow-sm'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  {/* Top Bar inside Item */}
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-purple-600 text-white font-bold text-[10px] flex items-center justify-center">
                        {idx + 1}
                      </span>
                      {allergyConflict && (
                        <span className="px-2 py-0.5 bg-rose-600 text-white rounded-md text-[9px] font-bold animate-pulse flex items-center gap-1">
                          <ShieldAlert className="w-3 h-3" />
                          <span>ALLERGY ALERT: Patient allergic to {allergyConflict}</span>
                        </span>
                      )}
                      {item.is_injection && (
                        <span className="px-2 py-0.5 bg-amber-500 text-white rounded-md text-[9px] font-bold flex items-center gap-1">
                          <Syringe className="w-3 h-3" />
                          <span>Injection Form</span>
                        </span>
                      )}
                    </div>
                    {prescribeItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setPrescribeItems(prescribeItems.filter((_, i) => i !== idx))}
                        className="text-rose-500 hover:text-rose-700 text-[10px] font-bold cursor-pointer"
                      >
                        ✕ Remove
                      </button>
                    )}
                  </div>

                  {/* Row 1: Drug Name, Dose, Frequency */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                    <div className="sm:col-span-5">
                      <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Medicine Name *</label>
                      <select
                        value={item.medicine_id}
                        onChange={(e) => handlePrescribeMedicineSelect(idx, e.target.value)}
                        className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                      >
                        <option value="">-- Select from Catalog or Write --</option>
                        {medicines.map(m => (
                          <option key={m._id} value={m._id}>
                            {m.name} ({m.strength}) - ${m.unit_price} [{m.dosage_form}] (Stock: {m.stock_quantity})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Dose</label>
                      <input
                        type="text"
                        value={item.dosage}
                        onChange={(e) => {
                          const val = e.target.value;
                          setPrescribeItems(prev => prev.map((it, i) => i === idx ? { ...it, dosage: val } : it));
                        }}
                        placeholder="e.g. 500 mg, 1.8ml"
                        className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                      />
                    </div>

                    <div className="sm:col-span-4">
                      <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Frequency</label>
                      <select
                        value={item.frequency}
                        onChange={(e) => {
                          const val = e.target.value;
                          setPrescribeItems(prev => prev.map((it, i) => i === idx ? { ...it, frequency: val } : it));
                        }}
                        className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs"
                      >
                        {FREQUENCIES.map(f => (
                          <option key={f} value={f}>{f}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Row 2: Duration, Quantity, Food Timing, Route */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                    <div className="sm:col-span-3">
                      <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Duration</label>
                      <select
                        value={item.duration}
                        onChange={(e) => {
                          const val = e.target.value;
                          setPrescribeItems(prev => prev.map((it, i) => i === idx ? { ...it, duration: val } : it));
                        }}
                        className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs"
                      >
                        {DURATIONS.map(d => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Quantity (Qty) *</label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={item.quantity}
                        onChange={(e) => {
                          const val = e.target.value;
                          setPrescribeItems(prev => prev.map((it, i) => i === idx ? { ...it, quantity: val } : it));
                        }}
                        className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-purple-900"
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Food Relation</label>
                      <select
                        value={item.food_relation}
                        onChange={(e) => {
                          const val = e.target.value;
                          setPrescribeItems(prev => prev.map((it, i) => i === idx ? { ...it, food_relation: val } : it));
                        }}
                        className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs"
                      >
                        {FOOD_RELATIONS.map(fr => (
                          <option key={fr} value={fr}>{fr}</option>
                        ))}
                      </select>
                    </div>

                    <div className="sm:col-span-4">
                      <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Route / Admin</label>
                      <select
                        value={item.route}
                        onChange={(e) => {
                          const val = e.target.value;
                          const isInj = val.includes('Intramuscular') || val.includes('Intravenous') || val.includes('Infiltration') || val.includes('Subcutaneous');
                          setPrescribeItems(prev => prev.map((it, i) => i === idx ? { ...it, route: val, is_injection: isInj } : it));
                        }}
                        className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs"
                      >
                        {ROUTES.map(r => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Row 3: PRN Toggle & Specific Instructions */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center pt-1">
                    <div className="sm:col-span-3 flex items-center gap-2">
                      <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={item.prn}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setPrescribeItems(prev => prev.map((it, i) => i === idx ? { ...it, prn: checked } : it));
                          }}
                          className="w-4 h-4 rounded text-purple-600 cursor-pointer"
                        />
                        <span>PRN (As Needed)</span>
                      </label>
                    </div>

                    {item.prn && (
                      <div className="sm:col-span-4">
                        <input
                          type="text"
                          value={item.prn_reason}
                          onChange={(e) => {
                            const val = e.target.value;
                            setPrescribeItems(prev => prev.map((it, i) => i === idx ? { ...it, prn_reason: val } : it));
                          }}
                          placeholder="e.g. for severe toothache, fever"
                          className="w-full p-2 bg-white border border-purple-200 rounded-xl text-xs font-medium"
                        />
                      </div>
                    )}

                    <div className={item.prn ? "sm:col-span-5" : "sm:col-span-9"}>
                      <input
                        type="text"
                        value={item.instructions}
                        onChange={(e) => {
                          const val = e.target.value;
                          setPrescribeItems(prev => prev.map((it, i) => i === idx ? { ...it, instructions: val } : it));
                        }}
                        placeholder="Directions: e.g. Take with full glass of water, finish all doses"
                        className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs"
                      />
                    </div>
                  </div>

                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setPrescribeItems([
              ...prescribeItems,
              {
                medicine_id: '',
                medicine_name: '',
                dosage: '500 mg',
                frequency: '3× daily (TID - every 8h)',
                duration: '5 days',
                quantity: 10,
                unit_price: 3.00,
                instructions: 'Take after meals as directed',
                food_relation: 'After Meals',
                prn: false,
                prn_reason: '',
                route: 'Oral',
                is_injection: false,
                injection_details: ''
              }
            ])}
            className="w-full py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold rounded-xl border border-dashed border-purple-200 transition cursor-pointer text-xs flex items-center justify-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Add Another Medication / Injection</span>
          </button>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Doctor's Clinical Notes</label>
            <input
              type="text"
              value={prescribeNotes}
              onChange={(e) => setPrescribeNotes(e.target.value)}
              placeholder="e.g. Post-extraction care, avoid chewing on treated side"
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsPrescribeModalOpen(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 font-bold rounded-xl text-xs transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs shadow-md transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{submitting ? 'Sending...' : 'Send Prescription to Pharmacy / Cashier'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 3: CASHIER DISPENSE & CHECKOUT (AUTOMATIC STOCK DEDUCTION)           */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isDispenseModalOpen}
        onClose={() => setIsDispenseModalOpen(false)}
        icon={ShoppingBag}
        title={`Dispense Prescription: ${selectedPrescription?.prescription_number || ''}`}
        subtitle="Select medicines purchased by the patient, collect payment, and issue receipt."
        maxWidth="max-w-xl"
      >
        <form onSubmit={submitDispenseCheckout} className="space-y-4 text-xs">
          
          {/* Patient Details Banner */}
          <div className="p-3.5 bg-purple-50 border border-purple-200 rounded-2xl flex justify-between items-center">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Patient</span>
              <p className="font-black text-slate-900 text-sm">{selectedPrescription?.patient_id?.name}</p>
              <p className="text-[11px] text-slate-500 font-mono">
                {selectedPrescription?.patient_id?.patient_number} • {selectedPrescription?.patient_id?.telephone}
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Prescribing Doctor</span>
              <p className="text-xs font-bold text-slate-800">Dr. {selectedPrescription?.doctor_id?.full_name}</p>
            </div>
          </div>

          {/* Medicines Selection for Purchase */}
          <div>
            <label className="font-bold text-slate-700 block mb-1.5">
              Select Medicines Purchased at Clinic Pharmacy (Stock will automatically be deducted):
            </label>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {dispenseItems.map((item, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-2xl border transition flex items-center justify-between gap-3 ${
                    item.purchased
                      ? 'bg-white border-purple-300 shadow-2xs'
                      : 'bg-slate-50 border-slate-200 opacity-60'
                  }`}
                >
                  <label className="flex items-center gap-3 cursor-pointer flex-1">
                    <input
                      type="checkbox"
                      checked={item.purchased}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setDispenseItems(prev => prev.map((it, i) => i === idx ? { ...it, purchased: checked } : it));
                      }}
                      className="w-4 h-4 rounded text-purple-600 cursor-pointer"
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900 text-xs">{item.medicine_name}</span>
                        {item.is_injection && (
                          <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 text-[9px] font-bold">Inject</span>
                        )}
                        {item.prn && (
                          <span className="px-1.5 py-0.2 rounded bg-purple-100 text-purple-800 text-[9px] font-bold">PRN</span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500 block">
                        {item.dosage} • {item.frequency} • {item.duration} ({item.food_relation || 'After Meals'})
                      </span>
                    </div>
                  </label>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right font-mono">
                      <span className="text-[10px] text-slate-400 block font-normal">Qty: {item.quantity}</span>
                      <span className="font-bold text-purple-900 text-xs">${Number(item.total_price || 0).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Calculated Grand Total for Chosen Medicines */}
          <div className="p-3.5 bg-slate-900 text-white rounded-2xl flex justify-between items-center">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400">Total Pharmacy Charge</span>
              <p className="text-[11px] text-slate-300">
                {dispenseItems.filter(it => it.purchased).length} of {dispenseItems.length} items purchased
              </p>
            </div>
            <span className="font-mono text-xl font-black text-emerald-400">
              ${dispenseItems.filter(it => it.purchased).reduce((acc, it) => acc + (parseFloat(it.total_price) || 0), 0).toFixed(2)}
            </span>
          </div>

          {/* Payment Method Selector */}
          <div className="p-3 bg-purple-50/60 border border-purple-200/70 rounded-2xl flex items-center justify-between gap-3">
            <span className="font-bold text-purple-950 text-xs">Payment Method:</span>
            <select
              value={dispensePaymentMethod}
              onChange={(e) => setDispensePaymentMethod(e.target.value)}
              className="p-2 bg-white border border-purple-200 rounded-xl text-xs font-bold text-purple-950 focus:outline-none cursor-pointer"
            >
              <option value="Cash">💵 Cash</option>
              <option value="EVC Plus">📱 EVC Plus</option>
              <option value="eDahab">📱 eDahab</option>
              <option value="Card">💳 Card</option>
              <option value="Bank Transfer">🏦 Bank Transfer</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsDispenseModalOpen(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 font-bold rounded-xl text-xs transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs shadow-md transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>
                {submitting ? 'Processing...' : `Confirm Payment ($${dispenseItems.filter(it => it.purchased).reduce((acc, it) => acc + (parseFloat(it.total_price) || 0), 0).toFixed(2)}) & Dispense`}
              </span>
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 4: PRINT OFFICIAL PRESCRIPTION SLIP                                 */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isPrintPrescriptionOpen}
        onClose={() => setIsPrintPrescriptionOpen(false)}
        icon={Printer}
        title="Official Medical Prescription"
        subtitle="Prescription document for clinical record and patient dispensing."
        maxWidth="max-w-2xl"
      >
        <div className="space-y-4 text-xs p-3">
          <div className="text-center pb-3 border-b-2 border-purple-600 space-y-1">
            <h2 className="text-lg font-black text-slate-900 tracking-tight uppercase">SNAB DENTAL & DERMATOLOGIC CLINIC</h2>
            <p className="text-[10px] text-amber-600 font-bold uppercase">Specialized Dental Care • Oral Surgery • Dermatologic Care</p>
            <p className="text-[10px] text-slate-500 font-mono">Mogadishu Main Road, KM4, Somalia • Tel: +252 61 5000000</p>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-2xl space-y-1.5 font-mono text-[11px] border border-slate-200">
            <div className="flex justify-between">
              <span>Rx Number: <strong className="text-purple-900">{selectedPrescription?.prescription_number}</strong></span>
              <span>Date: <strong>{new Date(selectedPrescription?.createdAt).toLocaleDateString()}</strong></span>
            </div>
            <div className="flex justify-between">
              <span>Patient: <strong className="text-slate-900">{selectedPrescription?.patient_id?.name}</strong></span>
              <span>Patient No: <strong>{selectedPrescription?.patient_id?.patient_number}</strong></span>
            </div>
            <div className="flex justify-between">
              <span>Doctor: <strong>Dr. {selectedPrescription?.doctor_id?.full_name}</strong></span>
              <span>Visit No: <strong>{selectedPrescription?.visit_id?.visit_number}</strong></span>
            </div>
          </div>

          {/* Rx Symbol & Items */}
          <div className="space-y-2 pt-2">
            <span className="font-serif italic font-black text-3xl text-purple-900 block">℞</span>
            <div className="space-y-3 pl-2">
              {selectedPrescription?.items.map((it, idx) => (
                <div key={idx} className="pb-2.5 border-b border-slate-100 space-y-1">
                  <div className="flex justify-between font-bold text-slate-900 text-xs">
                    <span className="flex items-center gap-1.5">
                      {idx + 1}. {it.medicine_name} — {it.dosage}
                      {it.is_injection && <span className="text-[9px] bg-amber-100 text-amber-800 px-1 rounded">[Injection]</span>}
                      {it.prn && <span className="text-[9px] bg-purple-100 text-purple-800 px-1 rounded">[PRN]</span>}
                    </span>
                    <span className="font-mono text-purple-800 font-bold">Qty: {it.quantity}</span>
                  </div>
                  <p className="text-[11px] text-slate-700">
                    <strong>Sig:</strong> {it.frequency} for {it.duration} • <strong>Timing:</strong> {it.food_relation || 'After Meals'} • <strong>Route:</strong> {it.route || 'Oral'}
                  </p>
                  {it.instructions && (
                    <p className="text-[10px] text-slate-500 italic">
                      Instructions: {it.instructions}
                    </p>
                  )}
                  {it.prn_reason && (
                    <p className="text-[10px] text-purple-700 font-medium">
                      PRN Indication: {it.prn_reason}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {selectedPrescription?.notes && (
            <p className="text-[11px] text-slate-700 bg-purple-50 p-3 rounded-2xl border border-purple-200">
              <strong>Clinical Directions:</strong> {selectedPrescription.notes}
            </p>
          )}

          <div className="flex justify-between items-center pt-8 border-t border-slate-200 text-[10px] text-slate-400">
            <div>
              <p>Issued by SNAB Pharmacy System • Valid Prescription</p>
            </div>
            <div className="text-right">
              <div className="w-36 border-b border-slate-400 mb-1"></div>
              <p className="font-bold text-slate-600">Dr. {selectedPrescription?.doctor_id?.full_name}</p>
              <p>Attending Doctor Signature & Stamp</p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              onClick={() => setIsPrintPrescriptionOpen(false)}
              className="px-4 py-2 bg-slate-100 rounded-xl font-bold text-xs cursor-pointer"
            >
              Close
            </button>
            <button
              onClick={() => window.print()}
              className="px-5 py-2 bg-purple-600 text-white rounded-xl font-bold text-xs shadow flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Prescription</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* Official Receipt Modal */}
      <ReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        payment={currentPayment}
      />

    </div>
  );
};

export default PharmacyManager;
