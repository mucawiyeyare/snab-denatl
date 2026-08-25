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
    const { patient_id, visit_id, doctor_id, status, payment_status, search, include_record_only } = req.query;
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

    // By default exclude 'Record_Only' prescriptions from cashier/pharmacy queue
    // They only appear when explicitly fetching patient-level records
    if (!status && !include_record_only) {
      filter.status = { $ne: 'Record_Only' };
    }

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
    // destination: 'cashier' (default) → Pending queue | 'record_only' → patient record only, no payment queue
    const { visit_id, patient_id, items = [], notes, destination = 'cashier' } = req.body;

    let targetVisit = null;
    let patientDoc = null;

    if (visit_id && !String(visit_id).startsWith('patient_')) {
      targetVisit = await Visit.findById(visit_id).populate('patient_id');
      if (targetVisit) {
        patientDoc = targetVisit.patient_id;
      }
    }

    const resolvedPatientId = patient_id || (String(visit_id).startsWith('patient_') ? String(visit_id).replace('patient_', '') : targetVisit?.patient_id?._id || targetVisit?.patient_id);

    if (!patientDoc && resolvedPatientId) {
      patientDoc = await Patient.findById(resolvedPatientId);
    }

    if (!patientDoc) {
      return res.status(400).json({ success: false, message: 'Patient selection is required' });
    }

    // If no existing visit, find latest visit or create a consultation visit
    if (!targetVisit) {
      targetVisit = await Visit.findOne({ patient_id: patientDoc._id }).sort({ createdAt: -1 });
      if (!targetVisit) {
        const { generateVisitNumber } = await import('../utils/generateId.js');
        const visit_number = await generateVisitNumber();
        targetVisit = await Visit.create({
          visit_number,
          patient_id: patientDoc._id,
          doctor_id: req.user._id,
          visit_date: new Date(),
          reason: 'Doctor Prescription',
          status: 'With Doctor'
        });
      }
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Please add at least one medication to prescribe' });
    }

    const patientAllergies = (patientDoc?.medical_info?.allergies || []).map(a => a.toLowerCase().trim());

    const processedItems = [];
    let grandTotal = 0;
    const allergyWarnings = [];
    const isRecordOnly = destination === 'record_only';

    for (const it of items) {
      if (!it.medicine_name && !it.medicine_id) continue;

      let medDoc = null;
      if (it.medicine_id) {
        medDoc = await Medicine.findById(it.medicine_id);
      }
      if (!medDoc && it.medicine_name) {
        const cleanName = it.medicine_name.split('(')[0].split('-')[0].trim();
        medDoc = await Medicine.findOne({
          $or: [
            { name: new RegExp('^' + it.medicine_name.trim() + '$', 'i') },
            { generic_name: new RegExp('^' + it.medicine_name.trim() + '$', 'i') },
            { name: new RegExp('^' + cleanName + '$', 'i') },
            { generic_name: new RegExp('^' + cleanName + '$', 'i') },
            { name: new RegExp(cleanName, 'i') },
            { generic_name: new RegExp(cleanName, 'i') }
          ]
        });
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
        status: isRecordOnly ? 'Record_Only' : 'Pending'
      });
    }

    const prescription_number = await generatePrescriptionNumber();

    const prescription = await Prescription.create({
      prescription_number,
      visit_id: targetVisit._id,
      patient_id: patientDoc._id,
      doctor_id: req.user._id,
      items: processedItems,
      total_amount: Number(grandTotal.toFixed(2)),
      payment_status: isRecordOnly ? 'External' : 'Unpaid',
      status: isRecordOnly ? 'Record_Only' : 'Pending',
      notes: notes || ''
    });

    // If destination is 'cashier', IMMEDIATELY add line items to Visit Invoice and update Total Amount Due
    if (!isRecordOnly && grandTotal > 0) {
      let invoice = await Invoice.findOne({ visit_id: targetVisit._id });
      if (!invoice) {
        const invoice_number = await generateInvoiceNumber();
        invoice = await Invoice.create({
          invoice_number,
          patient_id: patientDoc._id,
          doctor_id: req.user._id,
          visit_id: targetVisit._id,
          items: [],
          subtotal: 0,
          total_amount: 0,
          paid_amount: 0,
          balance: 0,
          discount: 0,
          status: 'Unpaid'
        });
      }

      // Add each prescribed medicine as an itemized line item on the invoice
      for (const it of processedItems) {
        invoice.items.push({
          item_type: 'Pharmacy',
          reference_id: prescription._id,
          description: `Pharmacy: ${it.medicine_name} (${it.dosage || ''}) - Qty: ${it.quantity}`,
          quantity: it.quantity,
          unit_price: it.unit_price,
          total_price: it.total_price,
          paid_status: 'Unpaid'
        });
      }

      invoice.subtotal = invoice.items.reduce((acc, item) => acc + item.total_price, 0);
      invoice.total_amount = Math.max(0, invoice.subtotal - (invoice.discount || 0));
      invoice.balance = Math.max(0, invoice.total_amount - (invoice.paid_amount || 0));
      if (invoice.balance > 0 && invoice.paid_amount > 0) {
        invoice.status = 'Partially Paid';
      } else if (invoice.balance > 0) {
        invoice.status = 'Unpaid';
      }
      await invoice.save();

      // Update visit status
      targetVisit.status = 'Payment Pending';
      targetVisit.status_history.push({
        status: 'Payment Pending',
        changed_by: req.user._id,
        notes: `Prescription ${prescription_number} billed to cashier ($${grandTotal.toFixed(2)})`
      });
      await targetVisit.save();
    }

    await logAudit({
      user: req.user,
      action: 'CREATE_PRESCRIPTION',
      entity: 'Prescription',
      entity_id: prescription._id,
      details: {
        prescription_number,
        patient_name: patientDoc?.name,
        item_count: processedItems.length,
        total_amount: grandTotal,
        allergy_warnings: allergyWarnings,
        destination,
        billed_to_invoice: !isRecordOnly
      }
    });

    const populated = await Prescription.findById(prescription._id)
      .populate('patient_id')
      .populate('doctor_id', 'full_name username')
      .populate('items.medicine_id');

    const successMessage = isRecordOnly
      ? `Prescription saved to patient record (${processedItems.length} items). Patient takes externally ($0.00 facility charge).`
      : `Prescription (${processedItems.length} items) billed and sent to Pharmacy / Cashier! Total Amount Due updated (+$${grandTotal.toFixed(2)}).`;

    res.status(201).json({
      success: true,
      message: successMessage,
      destination,
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
      discount = 0,
      paid_amount,
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
        let medDoc = null;
        if (item.medicine_id) {
          medDoc = await Medicine.findById(item.medicine_id);
        }
        if (!medDoc && item.medicine_name) {
          const cleanName = item.medicine_name.split('(')[0].split('-')[0].trim();
          medDoc = await Medicine.findOne({
            $or: [
              { name: new RegExp('^' + item.medicine_name.trim() + '$', 'i') },
              { generic_name: new RegExp('^' + item.medicine_name.trim() + '$', 'i') },
              { name: new RegExp('^' + cleanName + '$', 'i') },
              { generic_name: new RegExp('^' + cleanName + '$', 'i') },
              { name: new RegExp(cleanName, 'i') },
              { generic_name: new RegExp(cleanName, 'i') }
            ]
          });
        }

        if (medDoc) {
          const newQty = Math.max(0, (medDoc.stock_quantity || 0) - qty);
          medDoc.stock_quantity = newQty;
          await medDoc.save();
          item.medicine_id = medDoc._id; // link to medicine
        }
      } else {
        item.is_purchased = false;
        item.status = 'Declined / External';
      }
    }

    const discountAmount = Math.max(0, Number(discount) || 0);
    const netPurchasedAmount = Math.max(0, Number((totalPurchasedAmount - discountAmount).toFixed(2)));
    const actualPaidAmount = paid_amount !== undefined && !isNaN(Number(paid_amount))
      ? Math.min(netPurchasedAmount, Math.max(0, Number(paid_amount)))
      : netPurchasedAmount;
    const remainingBalance = Math.max(0, Number((netPurchasedAmount - actualPaidAmount).toFixed(2)));

    prescription.total_amount = Number(netPurchasedAmount.toFixed(2));
    prescription.payment_status = remainingBalance === 0 && actualPaidAmount > 0
      ? 'Paid'
      : (actualPaidAmount > 0 ? 'Partially Paid' : 'Unpaid');
    prescription.status = 'Dispensed';
    prescription.dispensed_by = req.user._id;
    prescription.dispensed_by_name = staffName;
    prescription.dispensed_date = new Date();
    if (notes) prescription.notes = notes;
    await prescription.save();

    let createdReceipt = null;

    // Integrated Billing & Reconcile Invoice Items + Issue Official Receipt
    let invoice = await Invoice.findOne({ visit_id: prescription.visit_id?._id || prescription.visit_id });
    if (!invoice && netPurchasedAmount > 0) {
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
        discount: 0,
        status: 'Unpaid'
      });
    }

    if (invoice) {
      // Find existing invoice line items for this prescription
      const existingItems = invoice.items.filter(
        it => it.item_type === 'Pharmacy' && String(it.reference_id) === String(prescription._id)
      );

      if (existingItems.length > 0) {
        // Remove existing items and re-add purchased ones
        invoice.items = invoice.items.filter(
          it => !(it.item_type === 'Pharmacy' && String(it.reference_id) === String(prescription._id))
        );
      }

      // Add purchased medicines as items
      for (const it of prescription.items) {
        if (it.is_purchased && it.total_price > 0) {
          invoice.items.push({
            item_type: 'Pharmacy',
            reference_id: prescription._id,
            description: `Pharmacy: ${it.medicine_name} (${it.dosage || ''}) - Qty: ${it.quantity}`,
            quantity: it.quantity,
            unit_price: it.unit_price,
            total_price: it.total_price,
            paid_status: remainingBalance === 0 ? 'Paid' : 'Unpaid'
          });
        }
      }

      // Apply pharmacy discount to invoice if given
      if (discountAmount > 0) {
        invoice.discount = (invoice.discount || 0) + discountAmount;
      }

      invoice.subtotal = invoice.items.reduce((acc, item) => acc + item.total_price, 0);
      invoice.total_amount = Math.max(0, invoice.subtotal - (invoice.discount || 0));
      invoice.paid_amount = (invoice.paid_amount || 0) + actualPaidAmount;
      invoice.balance = Math.max(0, invoice.total_amount - invoice.paid_amount);

      if (invoice.balance === 0 && invoice.paid_amount > 0) {
        invoice.status = 'Paid';
      } else if (invoice.paid_amount > 0) {
        invoice.status = 'Partially Paid';
      } else {
        invoice.status = 'Unpaid';
      }
      await invoice.save();

      // Issue Official Payment Receipt for the amount collected
      if (actualPaidAmount > 0) {
        const receipt_number = await generateReceiptNumber();
        createdReceipt = await Payment.create({
          receipt_number,
          invoice_id: invoice._id,
          patient_id: prescription.patient_id?._id || prescription.patient_id,
          doctor_id: prescription.doctor_id?._id || prescription.doctor_id,
          visit_id: prescription.visit_id?._id || prescription.visit_id,
          payment_category: remainingBalance > 0 ? 'Partial Payment' : 'Pharmacy Fee',
          amount: actualPaidAmount,
          discount: discountAmount,
          remaining_balance: remainingBalance,
          payment_method,
          received_by: req.user._id,
          received_by_name: staffName,
          notes: `Prescription ${prescription.prescription_number} (${purchasedMedList.join(', ')})${discountAmount > 0 ? ` [Discount: -$${discountAmount.toFixed(2)}]` : ''}${remainingBalance > 0 ? ` [Partial Payment: Paid $${actualPaidAmount.toFixed(2)} of $${netPurchasedAmount.toFixed(2)}, Balance: $${remainingBalance.toFixed(2)}]` : ''}`
        });
      }
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

// @desc    Update prescription (edit medicine letter / prescription)
// @route   PUT /api/prescriptions/:id
// @access  Private (Doctor, Admin)
export const updatePrescription = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { items = [], notes, destination } = req.body;

    const prescription = await Prescription.findById(id).populate('patient_id');
    if (!prescription) {
      return res.status(404).json({ success: false, message: 'Prescription not found' });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Please include at least one medication in the prescription' });
    }

    const patientDoc = prescription.patient_id;
    const patientAllergies = (patientDoc?.medical_info?.allergies || []).map(a => a.toLowerCase().trim());

    const processedItems = [];
    let grandTotal = 0;
    const allergyWarnings = [];
    const isRecordOnly = destination ? destination === 'record_only' : prescription.status === 'Record_Only';

    for (const it of items) {
      if (!it.medicine_name && !it.medicine_id) continue;

      let medDoc = null;
      if (it.medicine_id) {
        medDoc = await Medicine.findById(it.medicine_id);
      }
      if (!medDoc && it.medicine_name) {
        const cleanName = it.medicine_name.split('(')[0].split('-')[0].trim();
        medDoc = await Medicine.findOne({
          $or: [
            { name: new RegExp('^' + it.medicine_name.trim() + '$', 'i') },
            { generic_name: new RegExp('^' + it.medicine_name.trim() + '$', 'i') },
            { name: new RegExp('^' + cleanName + '$', 'i') },
            { generic_name: new RegExp('^' + cleanName + '$', 'i') },
            { name: new RegExp(cleanName, 'i') },
            { generic_name: new RegExp(cleanName, 'i') }
          ]
        });
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
        is_purchased: it.is_purchased || false,
        status: isRecordOnly ? 'Record_Only' : (it.status || prescription.status || 'Pending')
      });
    }

    prescription.items = processedItems;
    prescription.total_amount = Number(grandTotal.toFixed(2));
    if (notes !== undefined) prescription.notes = notes;
    if (destination) {
      prescription.status = isRecordOnly ? 'Record_Only' : (prescription.status === 'Record_Only' ? 'Pending' : prescription.status);
      prescription.payment_status = isRecordOnly ? 'External' : (prescription.payment_status === 'External' ? 'Unpaid' : prescription.payment_status);
    }
    await prescription.save();

    // Reconcile with Visit Invoice if prescription was billed
    if (prescription.visit_id) {
      let invoice = await Invoice.findOne({ visit_id: prescription.visit_id });
      if (invoice) {
        // Remove old line items for this prescription
        invoice.items = invoice.items.filter(
          it => !(it.item_type === 'Pharmacy' && String(it.reference_id) === String(prescription._id))
        );

        if (!isRecordOnly && grandTotal > 0) {
          for (const it of processedItems) {
            invoice.items.push({
              item_type: 'Pharmacy',
              reference_id: prescription._id,
              description: `Pharmacy: ${it.medicine_name} (${it.dosage || ''}) - Qty: ${it.quantity}`,
              quantity: it.quantity,
              unit_price: it.unit_price,
              total_price: it.total_price,
              paid_status: prescription.payment_status === 'Paid' ? 'Paid' : 'Unpaid'
            });
          }
        }

        invoice.subtotal = invoice.items.reduce((acc, item) => acc + item.total_price, 0);
        invoice.total_amount = Math.max(0, invoice.subtotal - (invoice.discount || 0));
        invoice.balance = Math.max(0, invoice.total_amount - (invoice.paid_amount || 0));

        if (invoice.balance === 0 && (invoice.paid_amount || 0) > 0) {
          invoice.status = 'Paid';
        } else if ((invoice.paid_amount || 0) > 0) {
          invoice.status = 'Partially Paid';
        } else {
          invoice.status = 'Unpaid';
        }
        await invoice.save();
      }
    }

    await logAudit({
      user: req.user,
      action: 'UPDATE_PRESCRIPTION',
      entity: 'Prescription',
      entity_id: prescription._id,
      details: {
        prescription_number: prescription.prescription_number,
        total_amount: grandTotal,
        items_count: processedItems.length
      }
    });

    const populated = await Prescription.findById(prescription._id)
      .populate('patient_id', 'name patient_number telephone gender age')
      .populate('doctor_id', 'full_name username')
      .populate('visit_id', 'visit_number status')
      .populate('items.medicine_id');

    res.json({
      success: true,
      message: `Prescription ${prescription.prescription_number} updated successfully!`,
      allergy_warnings: allergyWarnings,
      data: populated
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete / Cancel prescription
// @route   DELETE /api/prescriptions/:id
// @access  Private (Doctor, Admin)
export const deletePrescription = async (req, res, next) => {
  try {
    const { id } = req.params;
    const prescription = await Prescription.findById(id);
    if (!prescription) {
      return res.status(404).json({ success: false, message: 'Prescription not found' });
    }

    if (prescription.status === 'Dispensed' || prescription.payment_status === 'Paid') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete an already dispensed or paid prescription'
      });
    }

    // Remove invoice line items if present
    if (prescription.visit_id) {
      let invoice = await Invoice.findOne({ visit_id: prescription.visit_id });
      if (invoice) {
        invoice.items = invoice.items.filter(
          it => !(it.item_type === 'Pharmacy' && String(it.reference_id) === String(prescription._id))
        );
        invoice.subtotal = invoice.items.reduce((acc, item) => acc + item.total_price, 0);
        invoice.total_amount = Math.max(0, invoice.subtotal - (invoice.discount || 0));
        invoice.balance = Math.max(0, invoice.total_amount - (invoice.paid_amount || 0));
        if (invoice.balance === 0 && (invoice.paid_amount || 0) > 0) {
          invoice.status = 'Paid';
        } else if ((invoice.paid_amount || 0) > 0) {
          invoice.status = 'Partially Paid';
        } else {
          invoice.status = 'Unpaid';
        }
        await invoice.save();
      }
    }

    await logAudit({
      user: req.user,
      action: 'DELETE_PRESCRIPTION',
      entity: 'Prescription',
      entity_id: prescription._id,
      details: {
        prescription_number: prescription.prescription_number
      }
    });

    await Prescription.findByIdAndDelete(id);

    res.json({
      success: true,
      message: `Prescription ${prescription.prescription_number} removed successfully.`
    });
  } catch (error) {
    next(error);
  }
};