import Prescription from '../models/Prescription.js';
import Medicine from '../models/Medicine.js';
import Visit from '../models/Visit.js';
import Patient from '../models/Patient.js';
import Invoice from '../models/Invoice.js';
import Payment from '../models/Payment.js';
import { generatePrescriptionNumber, generateInvoiceNumber, generateReceiptNumber } from '../utils/generateId.js';
import { logAudit } from '../middleware/audit.js';

// @desc    Get all prescriptions
// @route   GET /api/prescriptions
// @access  Private
export const getPrescriptions = async (req, res, next) => {
  try {
    const { patient_id, visit_id, doctor_id, status, payment_status, search } = req.query;
    let filter = {};

    if (req.user?.role === 'Doctor') {
      filter.doctor_id = req.user._id;
    } else if (doctor_id) {
      filter.doctor_id = doctor_id;
    }

    if (patient_id) filter.patient_id = patient_id;
    if (visit_id) filter.visit_id = visit_id;
    if (status) filter.status = status;
    if (payment_status) filter.payment_status = payment_status;

    let prescriptions = await Prescription.find(filter)
      .populate('patient_id', 'name patient_number telephone gender age')
      .populate('doctor_id', 'full_name username')
      .populate('visit_id', 'visit_number status')
      .populate('items.medicine_id')
      .sort({ createdAt: -1 });

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      prescriptions = prescriptions.filter(p =>
        p.prescription_number?.toLowerCase().includes(q) ||
        p.patient_id?.name?.toLowerCase().includes(q) ||
        p.patient_id?.patient_number?.toLowerCase().includes(q) ||
        p.doctor_id?.full_name?.toLowerCase().includes(q) ||
        (p.items && p.items.some(it => it.medicine_name?.toLowerCase().includes(q)))
      );
    }

    res.json({
      success: true,
      count: prescriptions.length,
      data: prescriptions
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single prescription
// @route   GET /api/prescriptions/:id
// @access  Private
export const getPrescriptionById = async (req, res, next) => {
  try {
    const prescription = await Prescription.findById(req.params.id)
      .populate('patient_id')
      .populate('doctor_id', 'full_name username')
      .populate('visit_id')
      .populate('items.medicine_id');

    if (!prescription) {
      return res.status(404).json({ success: false, message: 'Prescription not found' });
    }

    res.json({ success: true, data: prescription });
  } catch (error) {
    next(error);
  }
};

// @desc    Doctor creates prescription
// @route   POST /api/prescriptions
// @access  Private (Doctor, Admin)
export const createPrescription = async (req, res, next) => {
  try {
    const { visit_id, patient_id, items = [], notes } = req.body;

    if (!visit_id) {
      return res.status(400).json({ success: false, message: 'Visit ID is required' });
    }

    const visit = await Visit.findById(visit_id).populate('patient_id');
    if (!visit) {
      return res.status(404).json({ success: false, message: 'Patient visit not found' });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Please add at least one medication to prescribe' });
    }

    const patientDoc = visit.patient_id;
    const patientAllergies = (patientDoc?.medical_info?.allergies || []).map(a => a.toLowerCase().trim());

    const processedItems = [];
    let grandTotal = 0;
    const allergyWarnings = [];

    for (const it of items) {
      if (!it.medicine_name && !it.medicine_id) continue;

      let medDoc = null;
      if (it.medicine_id) {
        medDoc = await Medicine.findById(it.medicine_id);
      } else if (it.medicine_name) {
        medDoc = await Medicine.findOne({ name: new RegExp('^' + it.medicine_name.trim() + '$', 'i') });
      }

      const medName = it.medicine_name || medDoc?.name || 'Medication';
      const genericName = (medDoc?.generic_name || it.generic_name || '').toLowerCase();
      const dosage = it.dosage || medDoc?.strength || '500 mg';
      const frequency = it.frequency || '3x daily';
      const duration = it.duration || '5 days';
      const qty = Number(it.quantity) || 1;
      const unitPrice = it.unit_price !== undefined && !isNaN(Number(it.unit_price))
        ? Number(it.unit_price)
        : (medDoc?.unit_price || 0);
      const itemTotal = Number((qty * unitPrice).toFixed(2));

      // Allergy conflict cross-check
      let isAllergic = false;
      let allergyConflictName = '';
      const combinedDrugName = `${medName.toLowerCase()} ${genericName}`;

      for (const al of patientAllergies) {
        if (al && (combinedDrugName.includes(al) || (al === 'penicillin' && (combinedDrugName.includes('amox') || combinedDrugName.includes('augmentin') || combinedDrugName.includes('ampicillin'))))) {
          isAllergic = true;
          allergyConflictName = al;
          allergyWarnings.push(`⚠️ ALLERGY ALERT: Patient is allergic to "${al}" (Matched: ${medName})`);
          break;
        }
      }

      grandTotal += itemTotal;

      const isInjection = Boolean(it.is_injection || medDoc?.is_injection || it.dosage_form?.toLowerCase().includes('injection'));

      processedItems.push({
        medicine_id: medDoc?._id || it.medicine_id || null,
        medicine_name: medName,
        dosage,
        frequency,
        duration,
        quantity: qty,
        unit_price: unitPrice,
        total_price: itemTotal,
        instructions: it.instructions || medDoc?.instructions_default || 'Take after meals as directed',
        prn: Boolean(it.prn),
        prn_reason: it.prn_reason || '',
        food_relation: it.food_relation || 'After Meals',
        route: it.route || medDoc?.route_of_administration || (isInjection ? 'Intramuscular (IM)' : 'Oral'),
        is_injection: isInjection,
        injection_details: it.injection_details || '',
        allergy_warning_flag: isAllergic,
        allergy_note: isAllergic ? `Patient allergy conflict: ${allergyConflictName}` : '',
        is_purchased: false,
        status: 'Pending'
      });
    }

    const prescription_number = await generatePrescriptionNumber();

    const prescription = await Prescription.create({
      prescription_number,
      visit_id: visit._id,
      patient_id: patient_id || visit.patient_id?._id || visit.patient_id,
      doctor_id: req.user._id,
      items: processedItems,
      total_amount: Number(grandTotal.toFixed(2)),
      payment_status: 'Unpaid',
      status: 'Pending',
      notes: notes || ''
    });

    await logAudit({
      user: req.user,
      action: 'CREATE_PRESCRIPTION',
      entity: 'Prescription',
      entity_id: prescription._id,
      details: {
        prescription_number,
        patient_name: visit.patient_id?.name,
        item_count: processedItems.length,
        total_amount: grandTotal,
        allergy_warnings: allergyWarnings
      }
    });

    const populated = await Prescription.findById(prescription._id)
      .populate('patient_id')
      .populate('doctor_id', 'full_name username')
      .populate('items.medicine_id');

    res.status(201).json({
      success: true,
      message: `Prescription (${processedItems.length} items) written successfully and sent to Pharmacy / Cashier!`,
      allergy_warnings: allergyWarnings,
      data: populated
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Cashier / Pharmacy Dispense & Checkout
// @route   POST /api/prescriptions/:id/dispense
// @access  Private (Cashier, Admin)
export const dispensePrescription = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      items_to_purchase = [], // array of { item_id, purchased: true/false, quantity: number, unit_price: number }
      payment_method = 'Cash',
      notes = ''
    } = req.body;

    const prescription = await Prescription.findById(id)
      .populate('patient_id')
      .populate('doctor_id')
      .populate('visit_id');

    if (!prescription) {
      return res.status(404).json({ success: false, message: 'Prescription not found' });
    }

    const staffName = req.user.full_name || req.user.username || 'Cashier';
    let totalPurchasedAmount = 0;
    const purchasedMedList = [];

    // Process each item in prescription
    for (let item of prescription.items) {
      const purchaseMatch = items_to_purchase.find(
        p => p.item_id?.toString() === item._id?.toString() || p.medicine_name === item.medicine_name
      );

      const isPurchased = purchaseMatch ? Boolean(purchaseMatch.purchased) : true;

      if (isPurchased) {
        const qty = purchaseMatch?.quantity !== undefined ? Number(purchaseMatch.quantity) : item.quantity;
        const price = purchaseMatch?.unit_price !== undefined ? Number(purchaseMatch.unit_price) : item.unit_price;
        const itemTotal = Number((qty * price).toFixed(2));

        item.is_purchased = true;
        item.quantity = qty;
        item.unit_price = price;
        item.total_price = itemTotal;
        item.status = 'Dispensed';

        totalPurchasedAmount += itemTotal;
        purchasedMedList.push(`${item.medicine_name} x${qty} ($${itemTotal})`);

        // Deduct inventory stock if medicine exists in catalog
        if (item.medicine_id) {
          const medDoc = await Medicine.findById(item.medicine_id);
          if (medDoc) {
            medDoc.stock_quantity = Math.max(0, medDoc.stock_quantity - qty);
            await medDoc.save();
          }
        }
      } else {
        item.is_purchased = false;
        item.status = 'Declined / External';
      }
    }

    prescription.total_amount = Number(totalPurchasedAmount.toFixed(2));
    prescription.payment_status = totalPurchasedAmount > 0 ? 'Paid' : 'Unpaid';
    prescription.status = 'Dispensed';
    prescription.dispensed_by = req.user._id;
    prescription.dispensed_by_name = staffName;
    prescription.dispensed_date = new Date();
    if (notes) prescription.notes = notes;
    await prescription.save();

    let createdReceipt = null;

    // Integrated Billing & Separate Pharmacy Invoice Item + Receipt
    if (totalPurchasedAmount > 0) {
      let invoice = await Invoice.findOne({ visit_id: prescription.visit_id?._id || prescription.visit_id });
      if (!invoice) {
        const invoice_number = await generateInvoiceNumber();
        invoice = await Invoice.create({
          invoice_number,
          patient_id: prescription.patient_id?._id || prescription.patient_id,
          doctor_id: prescription.doctor_id?._id || prescription.doctor_id,
          visit_id: prescription.visit_id?._id || prescription.visit_id,
          items: [],
          subtotal: 0,
          total_amount: 0,
          paid_amount: 0,
          balance: 0,
          status: 'Unpaid'
        });
      }

      // Add each purchased medicine as an itemized Pharmacy item on the invoice
      for (const it of prescription.items) {
        if (it.is_purchased && it.total_price > 0) {
          invoice.items.push({
            item_type: 'Pharmacy',
            reference_id: prescription._id,
            description: `Pharmacy: ${it.medicine_name} (${it.dosage || ''}) - Qty: ${it.quantity}`,
            quantity: it.quantity,
            unit_price: it.unit_price,
            total_price: it.total_price,
            paid_status: 'Paid'
          });
        }
      }

      invoice.subtotal = invoice.items.reduce((acc, item) => acc + item.total_price, 0);
      invoice.total_amount = Math.max(0, invoice.subtotal - (invoice.discount || 0));
      invoice.paid_amount = (invoice.paid_amount || 0) + totalPurchasedAmount;
      invoice.balance = Math.max(0, invoice.total_amount - invoice.paid_amount);

      if (invoice.balance === 0 && invoice.paid_amount > 0) {
        invoice.status = 'Paid';
      } else if (invoice.paid_amount > 0) {
        invoice.status = 'Partially Paid';
      }
      await invoice.save();

      // Issue Official Payment Receipt under "Pharmacy Fee"
      const receipt_number = await generateReceiptNumber();
      createdReceipt = await Payment.create({
        receipt_number,
        invoice_id: invoice._id,
        patient_id: prescription.patient_id?._id || prescription.patient_id,
        doctor_id: prescription.doctor_id?._id || prescription.doctor_id,
        visit_id: prescription.visit_id?._id || prescription.visit_id,
        payment_category: 'Pharmacy Fee',
        amount: totalPurchasedAmount,
        payment_method,
        received_by: req.user._id,
        received_by_name: staffName,
        notes: `Prescription ${prescription.prescription_number} (${purchasedMedList.join(', ')}) — Total: $${totalPurchasedAmount.toFixed(2)}`
      });
    }

    await logAudit({
      user: req.user,
      action: 'DISPENSE_PRESCRIPTION',
      entity: 'Prescription',
      entity_id: prescription._id,
      details: {
        prescription_number: prescription.prescription_number,
        purchased_amount: totalPurchasedAmount,
        patient_name: prescription.patient_id?.name
      }
    });

    const populated = await Prescription.findById(prescription._id)
      .populate('patient_id')
      .populate('doctor_id', 'full_name username')
      .populate('items.medicine_id');

    res.json({
      success: true,
      message: `Prescription dispensed and paid ($${totalPurchasedAmount.toFixed(2)}) for ${prescription.patient_id?.name || 'patient'}!`,
      data: {
        prescription: populated,
        payment: createdReceipt
      }
    });
  } catch (error) {
    next(error);
  }
};