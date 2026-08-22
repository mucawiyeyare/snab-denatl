import mongoose from 'mongoose';

const consultationSchema = new mongoose.Schema({
  visit_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Visit',
    required: true
  },
  patient_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  doctor_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  complaint: {
    main_complaint: { type: String, default: '' },
    symptoms: [{ type: String }],
    duration: { type: String, default: '' },
    relevant_history: { type: String, default: '' }
  },
  examination: {
    clinical_observations: { type: String, default: '' },
    dental_findings: { type: String, default: '' },
    oral_examination: { type: String, default: '' },
    blood_pressure: { type: String, default: '' },
    pulse_rate: { type: String, default: '' },
    temperature: { type: String, default: '' }
  },
  diagnosis: {
    primary_diagnosis: { type: String, required: true },
    secondary_diagnosis: { type: String, default: '' },
    icd_code: { type: String, default: '' }
  },
  treatment_decision: {
    type: String,
    enum: ['Immediate Treatment', 'Laboratory Test Required', 'Medication Only', 'Referral', 'Follow-up Only'],
    default: 'Immediate Treatment'
  },
  prescriptions: [{
    medication_name: { type: String, required: true },
    dosage: { type: String, required: true },
    frequency: { type: String, required: true },
    duration: { type: String, required: true },
    instructions: { type: String, default: '' }
  }],
  doctor_notes: {
    type: String,
    default: ''
  },
  consultation_date: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

export default mongoose.model('Consultation', consultationSchema);
