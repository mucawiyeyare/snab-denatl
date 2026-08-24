import Patient from '../models/Patient.js';
import Visit from '../models/Visit.js';
import Payment from '../models/Payment.js';
import Invoice from '../models/Invoice.js';
import LabRequest from '../models/LabRequest.js';
import Prescription from '../models/Prescription.js';
import Medicine from '../models/Medicine.js';
import Expense from '../models/Expense.js';

export const generatePatientNumber = async () => {
  const count = await Patient.countDocuments();
  const nextNum = (count + 1).toString().padStart(4, '0');
  return `PAT-${nextNum}`;
};

export const generateVisitNumber = async () => {
  const year = new Date().getFullYear();
  const count = await Visit.countDocuments();
  const nextNum = (count + 1).toString().padStart(4, '0');
  return `VIS-${year}-${nextNum}`;
};

export const generateReceiptNumber = async () => {
  const year = new Date().getFullYear();
  const count = await Payment.countDocuments();
  const nextNum = (count + 1).toString().padStart(5, '0');
  return `REC-${year}-${nextNum}`;
};

export const generateInvoiceNumber = async () => {
  const year = new Date().getFullYear();
  const count = await Invoice.countDocuments();
  const nextNum = (count + 1).toString().padStart(5, '0');
  return `INV-${year}-${nextNum}`;
};

export const generateLabRequestNumber = async () => {
  const year = new Date().getFullYear();
  const count = await LabRequest.countDocuments();
  const nextNum = (count + 1).toString().padStart(4, '0');
  return `LAB-${year}-${nextNum}`;
};

export const generatePrescriptionNumber = async () => {
  const year = new Date().getFullYear();
  const count = await Prescription.countDocuments();
  const nextNum = (count + 1).toString().padStart(4, '0');
  return `RX-${year}-${nextNum}`;
};

export const generateMedicineCode = async () => {
  const count = await Medicine.countDocuments();
  const nextNum = (count + 1).toString().padStart(3, '0');
  return `MED-${nextNum}`;
};

export const generateExpenseCode = async () => {
  const year = new Date().getFullYear();
  const count = await Expense.countDocuments();
  const nextNum = (count + 1).toString().padStart(5, '0');
  return `EXP-${year}-${nextNum}`;
};


