import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPatientHistoryApi } from '../../api/endpoints.js';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import {
  ArrowLeft,
  Printer,
  Calendar,
  Phone,
  User,
  HeartPulse,
  Stethoscope,
  TestTube2,
  Receipt,
  Clock,
  AlertCircle,
  FileText
} from 'lucide-react';

const PatientProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchHistory();
  }, [id]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await getPatientHistoryApi(id);
      setData(res.data?.data);
    } catch (err) {
      console.error('Error fetching patient history:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!data || !data.patient) {
    return (
      <div className="text-center py-12">
        <p className="text-sm font-bold text-slate-700">Patient not found</p>
        <button
          onClick={() => navigate('/patients')}
          className="mt-3 px-4 py-2 bg-blue-600 text-white font-bold rounded-xl text-xs"
        >
          Back to Patient List
        </button>
      </div>
    );
  }

  const { patient, visits, consultations, treatments, labResults, invoices, payments, followups } = data;

  return (
    <div className="space-y-6">
      
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 no-print">
        <button
          onClick={() => navigate('/patients')}
          className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-2xs cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Patients
        </button>

        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          Print Complete Medical Report
        </button>
      </div>

      {/* Printable Patient Medical Dossier */}
      <div id="printable-area" className="space-y-6">
        
        {/* Official Header with Logo */}
        <div className="bg-white rounded-3xl p-5 sm:p-8 border border-slate-100 shadow-xs space-y-6">
          
          {/* Header block with Logo */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 border-b border-slate-100 pb-6 text-center sm:text-left">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <img
                src="/logo.png"
                alt="SNAB Dental and Dermatologic Clinic"
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border-2 border-amber-500 shadow-md shrink-0"
              />
              <div>
                <h2 className="text-base sm:text-xl font-black text-slate-900 uppercase tracking-tight">
                  SNAB DENTAL AND DERMATOLOGIC CLINIC
                </h2>
                <p className="text-xs font-bold text-amber-600 uppercase">Patient Medical History & Treatment Record</p>
                <p className="text-[11px] text-slate-500">Mogadishu, KM4 • Tel: +252 61 5000000 • info@snabdental.com</p>
              </div>
            </div>

            <div className="bg-blue-50/80 p-3 rounded-2xl border border-blue-100 text-center sm:text-right">
              <span className="text-[10px] font-bold text-blue-600 uppercase block">Patient File Number</span>
              <span className="font-mono text-base font-black text-blue-900">{patient.patient_number}</span>
            </div>
          </div>

          {/* Patient Bio Information */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs">
            <div>
              <span className="text-slate-400 text-[10px] font-bold uppercase block">Full Name</span>
              <span className="font-bold text-slate-900 text-sm">{patient.name}</span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] font-bold uppercase block">Age / Gender</span>
              <span className="font-semibold text-slate-800">{patient.age} years • {patient.gender}</span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] font-bold uppercase block">Telephone</span>
              <span className="font-bold text-slate-800">{patient.telephone}</span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] font-bold uppercase block">Registration Date</span>
              <span className="font-medium text-slate-700">{new Date(patient.registration_date).toLocaleDateString()}</span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] font-bold uppercase block">Address / District</span>
              <span className="font-medium text-slate-700">{patient.address || 'Mogadishu'}</span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] font-bold uppercase block">Emergency Contact</span>
              <span className="font-medium text-slate-700">
                {patient.emergency_contact?.name ? `${patient.emergency_contact.name} (${patient.emergency_contact.phone})` : 'None'}
              </span>
            </div>
          </div>

          {/* Medical Alerts Bar */}
          <div className="p-4 bg-rose-50/60 rounded-2xl border border-rose-100 text-xs">
            <div className="flex items-center gap-2 font-bold text-rose-900 mb-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              Medical Screening & Alert Summary
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-slate-700">
              <div>
                <span className="text-slate-400 text-[10px] block font-bold uppercase">Blood Group</span>
                <span className="font-bold text-slate-900">{patient.medical_info?.blood_group || 'Not recorded'}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block font-bold uppercase">Known Allergies</span>
                <span className="font-semibold text-rose-700">
                  {patient.medical_info?.allergies?.length > 0 ? patient.medical_info.allergies.join(', ') : 'None Reported'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block font-bold uppercase">Bleeding Risk</span>
                <span className="font-semibold">
                  {patient.medical_info?.bleeding_disorder ? '⚠️ Bleeding disorder flagged' : 'Normal'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block font-bold uppercase">Pregnancy Status</span>
                <span className="font-semibold">
                  {patient.medical_info?.pregnant ? '🤰 Currently pregnant' : 'No'}
                </span>
              </div>
            </div>
          </div>

          {/* Tabs Navigation (hidden on print) */}
          <div className="flex gap-2 border-b border-slate-100 pb-2 no-print overflow-x-auto">
            {[
              { id: 'overview', label: `Visits & Consultations (${visits.length})` },
              { id: 'treatments', label: `Dental Treatments (${treatments.length})` },
              { id: 'lab', label: `Lab Results (${labResults.length})` },
              { id: 'billing', label: `Billing & Receipts (${payments.length})` },
              { id: 'followups', label: `Follow-ups (${followups.length})` }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab 1: Visits & Consultations */}
          {(activeTab === 'overview' || window.matchMedia('print').matches) && (
            <div className="space-y-4">
              <h3 className="text-sm sm:text-base font-bold text-slate-900">Visits & Clinical Consultations</h3>
              {visits.length === 0 ? (
                <p className="text-xs text-slate-400 py-4">No clinic visits recorded for this patient.</p>
              ) : (
                <div className="space-y-4">
                  {visits.map(v => {
                    const consult = consultations.find(c => c.visit_id?.toString() === v._id?.toString());
                    return (
                      <div key={v._id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-3">
                        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-900 text-sm">{v.visit_number}</span>
                            <span className="text-slate-400">• {new Date(v.visit_date).toLocaleString()}</span>
                          </div>
                          <StatusBadge status={v.status} />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-white p-3 rounded-xl border border-slate-100">
                          <div>
                            <span className="text-slate-400 text-[10px] font-bold uppercase block">Doctor Assigned</span>
                            <span className="font-bold text-slate-800">{v.doctor_id?.full_name || v.doctor_id?.username}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 text-[10px] font-bold uppercase block">Chief Complaint</span>
                            <span className="font-medium text-slate-700">{v.complaint || v.reason || 'General Checkup'}</span>
                          </div>
                        </div>

                        {consult && (
                          <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 space-y-2">
                            <span className="font-bold text-blue-900 uppercase text-[10px] block">Doctor Clinical Diagnosis</span>
                            <p className="font-bold text-slate-900">{consult.diagnosis?.primary_diagnosis}</p>
                            {consult.examination?.clinical_observations && (
                              <p className="text-slate-600 text-[11px]">Obs: {consult.examination.clinical_observations}</p>
                            )}
                            {consult.prescriptions?.length > 0 && (
                              <div className="pt-2 border-t border-blue-100">
                                <span className="font-bold text-blue-800 text-[10px] block">Prescriptions:</span>
                                {consult.prescriptions.map((p, i) => (
                                  <div key={i} className="text-[11px] text-slate-700">
                                    • <span className="font-semibold">{p.medication_name}</span> ({p.dosage} - {p.frequency} for {p.duration})
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Treatments */}
          {(activeTab === 'treatments' || window.matchMedia('print').matches) && (
            <div className="space-y-4">
              <h3 className="text-sm sm:text-base font-bold text-slate-900">Dental Treatments & Procedures History</h3>
              {treatments.length === 0 ? (
                <p className="text-xs text-slate-400 py-4">No treatments recorded yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase">
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Service / Procedure</th>
                        <th className="py-2.5 px-3">Tooth #</th>
                        <th className="py-2.5 px-3">Doctor</th>
                        <th className="py-2.5 px-3 text-right">Cost</th>
                        <th className="py-2.5 px-3 text-right">Payment</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {treatments.map(t => (
                        <tr key={t._id}>
                          <td className="py-3 px-3 text-slate-500">{new Date(t.treatment_date).toLocaleDateString()}</td>
                          <td className="py-3 px-3 font-bold text-slate-900">
                            {t.service_name}
                            {t.treatment_notes && <span className="block text-[10px] text-slate-400 font-normal">{t.treatment_notes}</span>}
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-blue-600">{t.tooth_number}</td>
                          <td className="py-3 px-3 text-slate-700">{t.doctor_id?.full_name}</td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">${t.price.toFixed(2)}</td>
                          <td className="py-3 px-3 text-right">
                            <StatusBadge status={t.payment_status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Lab Results */}
          {(activeTab === 'lab' || window.matchMedia('print').matches) && (
            <div className="space-y-4">
              <h3 className="text-sm sm:text-base font-bold text-slate-900">Laboratory Results Archive</h3>
              {labResults.length === 0 ? (
                <p className="text-xs text-slate-400 py-4">No lab results found.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {labResults.map(r => (
                    <div key={r._id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-900 text-sm">{r.test_name}</span>
                        <StatusBadge status={r.verification_status} />
                      </div>
                      <div className="bg-white p-3 rounded-xl border border-slate-100 space-y-1">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Test Result:</span>
                          <span className="font-mono font-bold text-blue-700">{r.result}</span>
                        </div>
                        {r.reference_range && (
                          <div className="flex justify-between text-[11px] text-slate-500">
                            <span>Reference Range:</span>
                            <span>{r.reference_range}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-[11px] text-slate-500">
                          <span>Interpretation:</span>
                          <span className="font-semibold text-slate-800">{r.clinical_interpretation}</span>
                        </div>
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-400 pt-1">
                        <span>Staff: {r.performed_by}</span>
                        <span>{new Date(r.result_date).toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 4: Billing & Receipts */}
          {/* Tab 4: Billing & Receipts */}
          {(activeTab === 'billing' || window.matchMedia('print').matches) && (
            <div className="space-y-4">
              <h3 className="text-sm sm:text-base font-bold text-slate-900">Financial History & Receipts</h3>
              {payments.length === 0 ? (
                <p className="text-xs text-slate-400 py-4">No payments recorded for this patient.</p>
              ) : (
                <div className="space-y-3">
                  {payments.map(p => (
                    <div key={p._id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs flex justify-between items-center">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-900">{p.receipt_number}</span>
                          <span className="text-slate-500">• {new Date(p.payment_date).toLocaleDateString()}</span>
                        </div>
                        <p className="font-semibold text-slate-700 mt-1">{p.payment_category} ({p.payment_method})</p>
                        <p className="text-[11px] text-slate-400">Received by: {p.received_by_name || 'Cashier'}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-base font-black text-emerald-600 font-mono">${p.amount.toFixed(2)}</span>
                        <span className="block text-[10px] font-bold text-emerald-700 uppercase">Paid</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 5: Follow-ups */}
          {(activeTab === 'followups' || window.matchMedia('print').matches) && (
            <div className="space-y-4">
              <h3 className="text-sm sm:text-base font-bold text-slate-900">Follow-up Appointments & Recalls</h3>
              {followups.length === 0 ? (
                <p className="text-xs text-slate-400 py-4">No follow-ups scheduled for this patient.</p>
              ) : (
                <div className="space-y-3">
                  {followups.map(f => (
                    <div key={f._id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-blue-600" />
                          <span className="font-bold text-slate-900 text-sm">
                            Due Date: {new Date(f.followup_date).toLocaleDateString()}
                          </span>
                        </div>
                        <StatusBadge status={f.status} />
                      </div>
                      <div className="bg-white p-3 rounded-xl border border-slate-100 space-y-1.5">
                        <div>
                          <span className="text-slate-400 text-[10px] font-bold uppercase block">Reason / Follow-up Plan</span>
                          <span className="font-semibold text-slate-800 text-xs">{f.reason || 'Post-operative check-up'}</span>
                        </div>
                        <div className="flex justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-50">
                          <span>Doctor Assigned: Dr. {f.doctor_id?.full_name || f.doctor_id?.username || 'Attending Doctor'}</span>
                          <span>Created: {new Date(f.createdAt || Date.now()).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

      </div>

    </div>
  );
};

export default PatientProfile;
