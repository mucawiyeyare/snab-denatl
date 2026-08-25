import Patient from '../models/Patient.js';
import Visit from '../models/Visit.js';
import Payment from '../models/Payment.js';
import Invoice from '../models/Invoice.js';
import LabRequest from '../models/LabRequest.js';
import Prescription from '../models/Prescription.js';
import Medicine from '../models/Medicine.js';
import Expense from '../models/Expense.js';
import Employee from '../models/Employee.js';
import DentalService from '../models/DentalService.js';
import DentalInventory from '../models/DentalInventory.js';
import LabTest from '../models/LabTest.js';

/**
 * Robust unique code/number generator.
 * Finds all existing codes with matching prefix, extracts the highest number,
 * increments it, and checks existence in a loop to guarantee zero duplicate collisions.
 */
async function generateUniqueCode(model, field, prefix, padLength = 4, yearPrefix = false) {
  const year = new Date().getFullYear();
  const basePrefix = yearPrefix ? `${prefix}-${year}-` : `${prefix}-`;
  const escapedBase = basePrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`^${escapedBase}(\\d+)`);

  const existingDocs = await model.find({ [field]: regex }).select(field).lean();
  let maxNum = 0;
  for (const doc of existingDocs) {
    const val = doc[field];
    if (typeof val === 'string') {
      const match = val.match(regex);
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    }
  }

  let nextNum = maxNum + 1;
  let candidate = `${basePrefix}${nextNum.toString().padStart(padLength, '0')}`;

  while (await model.exists({ [field]: candidate })) {
    nextNum++;
    candidate = `${basePrefix}${nextNum.toString().padStart(padLength, '0')}`;
  }

  return candidate;
}

export const generatePatientNumber = () => generateUniqueCode(Patient, 'patient_number', 'PAT', 4, false);
export const generateVisitNumber = () => generateUniqueCode(Visit, 'visit_number', 'VIS', 4, true);
export const generateReceiptNumber = () => generateUniqueCode(Payment, 'receipt_number', 'REC', 5, true);
export const generateInvoiceNumber = () => generateUniqueCode(Invoice, 'invoice_number', 'INV', 5, true);
export const generateLabRequestNumber = () => generateUniqueCode(LabRequest, 'request_number', 'LAB', 4, true);
export const generatePrescriptionNumber = () => generateUniqueCode(Prescription, 'prescription_number', 'RX', 4, true);
export const generateMedicineCode = () => generateUniqueCode(Medicine, 'medicine_code', 'MED', 3, false);
export const generateExpenseCode = () => generateUniqueCode(Expense, 'expense_code', 'EXP', 5, true);
export const generateEmployeeCode = () => generateUniqueCode(Employee, 'employee_id', 'EMP', 3, false);
export const generateServiceCode = () => generateUniqueCode(DentalService, 'service_code', 'SRV', 3, false);
export const generateInventoryCode = () => generateUniqueCode(DentalInventory, 'item_code', 'INV-MAT', 3, false);
export const generateLabTestCode = () => generateUniqueCode(LabTest, 'test_code', 'LAB', 3, false);
