import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import Role from '../models/Role.js';
import Employee from '../models/Employee.js';
import User from '../models/User.js';
import DentalService from '../models/DentalService.js';
import LabTest from '../models/LabTest.js';
import Setting from '../models/Setting.js';
import Patient from '../models/Patient.js';
import Visit from '../models/Visit.js';
import Consultation from '../models/Consultation.js';
import Treatment from '../models/Treatment.js';
import Invoice from '../models/Invoice.js';
import Payment from '../models/Payment.js';
import DentalInventory from '../models/DentalInventory.js';
import Medicine from '../models/Medicine.js';
import AuditLog from '../models/AuditLog.js';

dotenv.config();

const seedAll = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/snab_dental_ms');
    console.log('[Seed] Connected to MongoDB...');

    // 1. Roles (Admin, Doctor, Receptionist/Cashier)
    const rolesData = [
      { role_name: 'Admin', description: 'Full system administrator access' },
      { role_name: 'Doctor', description: 'Dental care, consultations, treatments, lab requests' },
      { role_name: 'Receptionist/Cashier', description: 'Patient registration, visits, billing, payments' }
    ];

    // Clean up deprecated HR role if exists
    await Role.deleteOne({ role_name: 'HR' });
    await User.deleteOne({ username: 'hr' });

    for (const r of rolesData) {
      await Role.findOneAndUpdate({ role_name: r.role_name }, r, { upsert: true, returnDocument: 'after' });
    }
    console.log('[Seed] Roles created/updated.');

    // 2. Employees
    const employeesData = [
      {
        employee_id: 'EMP-001',
        name: 'Dr. Hassan Ali',
        phone: '+252 61 5111111',
        email: 'dr.hassan@snabdental.com',
        position: 'Senior Dental Surgeon',
        department: 'Dental Surgery',
        specialization: 'Endodontics & Implantology',
        salary: 3500,
        status: 'Active'
      },
      {
        employee_id: 'EMP-002',
        name: 'Dr. Amina Jama',
        phone: '+252 61 5222222',
        email: 'dr.amina@snabdental.com',
        position: 'Consultant Orthodontist',
        department: 'Orthodontics & Pediatric',
        specialization: 'Orthodontics & Braces',
        salary: 3200,
        status: 'Active'
      },
      {
        employee_id: 'EMP-003',
        name: 'Fatima Nur',
        phone: '+252 61 5333333',
        email: 'fatima.reception@snabdental.com',
        position: 'Receptionist & Lead Cashier',
        department: 'Front Desk & Billing',
        salary: 1200,
        status: 'Active'
      },
      {
        employee_id: 'EMP-000',
        name: 'System Administrator',
        phone: '+252 61 5000001',
        email: 'admin@snabdental.com',
        position: 'Chief Administrator',
        department: 'Administration',
        salary: 4000,
        status: 'Active'
      }
    ];

    const savedEmployees = {};
    for (const emp of employeesData) {
      const saved = await Employee.findOneAndUpdate({ employee_id: emp.employee_id }, emp, { upsert: true, returnDocument: 'after' });
      savedEmployees[emp.employee_id] = saved;
    }
    console.log('[Seed] Employees created/updated.');

    // 3. Users with password hashing
    const salt = await bcrypt.genSalt(10);
    const defaultPasswordHash = await bcrypt.hash('admin123', salt);
    const doctorPasswordHash = await bcrypt.hash('doctor123', salt);
    const cashierPasswordHash = await bcrypt.hash('cashier123', salt);

    const usersData = [
      {
        username: 'admin',
        password_hash: defaultPasswordHash,
        role: 'Admin',
        employee_id: savedEmployees['EMP-000']._id,
        full_name: 'System Administrator',
        email: 'admin@snabdental.com',
        status: 'Active'
      },
      {
        username: 'drhassan',
        password_hash: doctorPasswordHash,
        role: 'Doctor',
        employee_id: savedEmployees['EMP-001']._id,
        full_name: 'Dr. Hassan Ali',
        email: 'dr.hassan@snabdental.com',
        status: 'Active'
      },
      {
        username: 'dramina',
        password_hash: doctorPasswordHash,
        role: 'Doctor',
        employee_id: savedEmployees['EMP-002']._id,
        full_name: 'Dr. Amina Jama',
        email: 'dr.amina@snabdental.com',
        status: 'Active'
      },
      {
        username: 'cashier',
        password_hash: cashierPasswordHash,
        role: 'Receptionist/Cashier',
        employee_id: savedEmployees['EMP-003']._id,
        full_name: 'Fatima Nur',
        email: 'fatima.reception@snabdental.com',
        status: 'Active'
      }
    ];

    for (const u of usersData) {
      const existingUser = await User.findOne({ username: u.username });
      if (!existingUser) {
        await User.create(u);
      } else {
        if (!existingUser.full_name) existingUser.full_name = u.full_name;
        if (!existingUser.role) existingUser.role = u.role;
        if (!existingUser.employee_id && u.employee_id) existingUser.employee_id = u.employee_id;
        await existingUser.save();
      }
    }
    console.log('[Seed] Users verified/preserved.');

    // 4. Dental Services Catalog (all 25 items from spec)
    const dentalServicesData = [
      // General Dentistry
      { service_code: 'SRV-001', service_name: 'General Dental Consultation', category: 'General Dentistry', price: 20, description: 'Initial general examination and consultation' },
      { service_code: 'SRV-002', service_name: 'Dental Check-up & Oral Examination', category: 'General Dentistry', price: 25, description: 'Comprehensive oral soft and hard tissue exam' },
      { service_code: 'SRV-003', service_name: 'Dental Cleaning (Scaling & Polishing)', category: 'Periodontics', price: 45, description: 'Ultrasonic calculus removal and prophy polish' },
      { service_code: 'SRV-004', service_name: 'Teeth Whitening (Bleaching)', category: 'Cosmetic Dentistry', price: 150, description: 'In-chair laser teeth whitening system' },
      { service_code: 'SRV-005', service_name: 'Tooth Filling (Composite Fillings)', category: 'General Dentistry', price: 50, description: 'Tooth-colored composite resin restoration' },
      { service_code: 'SRV-006', service_name: 'Tooth Extraction (Simple & Surgical)', category: 'Oral Surgery', price: 40, description: 'Routine or surgical tooth extraction' },
      { service_code: 'SRV-007', service_name: 'Root Canal Treatment (RCT)', category: 'Endodontics', price: 180, description: 'Complete pulp extirpation and canal obturation' },
      { service_code: 'SRV-008', service_name: 'Dental Crowns & Bridges', category: 'Prosthodontics', price: 250, description: 'Porcelain fused to metal or zirconia crown per unit' },
      { service_code: 'SRV-009', service_name: 'Dental Veneers', category: 'Cosmetic Dentistry', price: 200, description: 'Porcelain aesthetic veneer per tooth' },
      { service_code: 'SRV-010', service_name: 'Complete & Partial Dentures', category: 'Prosthodontics', price: 300, description: 'Removable acrylic or cobalt-chromium prosthesis' },
      { service_code: 'SRV-011', service_name: 'Dental Implants', category: 'Oral Surgery', price: 800, description: 'Titanium fixture placement' },
      { service_code: 'SRV-012', service_name: 'Orthodontic Treatment (Braces)', category: 'Orthodontics', price: 1200, description: 'Comprehensive orthodontic correction package' },
      { service_code: 'SRV-013', service_name: 'Pediatric Dentistry (Children\'s Dental Care)', category: 'Pediatric Dentistry', price: 35, description: 'Fluoride varnish, sealants, pulpotomy' },
      { service_code: 'SRV-014', service_name: 'Gum Disease Treatment (Periodontal Therapy)', category: 'Periodontics', price: 80, description: 'Deep root planing and curettage' },
      { service_code: 'SRV-015', service_name: 'Wisdom Tooth Extraction', category: 'Oral Surgery', price: 120, description: 'Impacted 3rd molar surgical removal' },
      { service_code: 'SRV-016', service_name: 'Emergency Dental Care', category: 'General Dentistry', price: 60, description: 'Acute pain relief, trauma splinting, drainage' },
      { service_code: 'SRV-017', service_name: 'Digital Dental X-Ray', category: 'Diagnostic / X-Ray', price: 30, description: 'Intraoral periapical or OPG digital radiography' },
      { service_code: 'SRV-018', service_name: 'Cosmetic Dentistry', category: 'Cosmetic Dentistry', price: 180, description: 'Smile makeover and contouring' },
      // Orthodontics
      { service_code: 'SRV-019', service_name: 'Clear Aligners', category: 'Orthodontics', price: 1500, description: 'Invisible transparent custom aligner therapy' },
      { service_code: 'SRV-020', service_name: 'Metal Braces', category: 'Orthodontics', price: 1000, description: 'Standard high-grade stainless steel bracket system' },
      { service_code: 'SRV-021', service_name: 'Ceramic Braces', category: 'Orthodontics', price: 1300, description: 'Tooth-colored aesthetic ceramic brackets' },
      { service_code: 'SRV-022', service_name: 'Self-Ligating Braces', category: 'Orthodontics', price: 1400, description: 'Low friction Damon system brackets' },
      { service_code: 'SRV-023', service_name: 'Orthodontic Consultation', category: 'Orthodontics', price: 30, description: 'Cephalometric analysis and treatment planning' },
      { service_code: 'SRV-024', service_name: 'Retainers', category: 'Orthodontics', price: 100, description: 'Hawley or vacuum-formed clear retainers (pair)' },
      { service_code: 'SRV-025', service_name: 'Braces Adjustment & Follow-up', category: 'Orthodontics', price: 40, description: 'Archwire change and elastic reactivation' }
    ];

    for (const srv of dentalServicesData) {
      await DentalService.findOneAndUpdate({ service_code: srv.service_code }, srv, { upsert: true, returnDocument: 'after' });
    }
    console.log('[Seed] 25 Dental Services created/updated.');

    // 5. Laboratory Tests
    const labTestsData = [
      // Pregnancy
      { test_code: 'LAB-001', test_name: 'Pregnancy Test (β-hCG)', category: 'Pregnancy', price: 15, sample_type: 'Urine / Serum', reference_range: 'Negative (< 5 mIU/mL)', description: 'Serum or urine human chorionic gonadotropin' },
      // Blood
      { test_code: 'LAB-002', test_name: 'Blood Group & Rh Factor', category: 'Blood', price: 10, sample_type: 'Whole Blood (EDTA)', reference_range: 'A/B/AB/O, Rh Positive/Negative', description: 'ABO and Rhesus blood grouping' },
      { test_code: 'LAB-003', test_name: 'Hemoglobin (Hb)', category: 'Blood', price: 10, sample_type: 'Whole Blood (EDTA)', reference_range: 'Male: 13.5-17.5 g/dL, Female: 12.0-15.5 g/dL', description: 'Complete hemoglobin level check' },
      { test_code: 'LAB-004', test_name: 'Blood Glucose', category: 'Blood', price: 8, sample_type: 'Capillary / Fluoride Plasma', reference_range: 'Fasting: 70-100 mg/dL, Random: < 140 mg/dL', description: 'Glucose level prior to invasive surgery' },
      // Infectious Disease Screening
      { test_code: 'LAB-005', test_name: 'HIV Viral Screening', category: 'Infectious Disease Screening', price: 20, sample_type: 'Serum', reference_range: 'Non-Reactive', description: 'Enzyme-linked rapid viral antigen/antibody screening' },
      { test_code: 'LAB-006', test_name: 'HIV 1 & 2 Test', category: 'Infectious Disease Screening', price: 20, sample_type: 'Serum / Whole Blood', reference_range: 'Negative (Non-Reactive)', description: 'Differential rapid antibody test' },
      { test_code: 'LAB-007', test_name: 'HBsAg (Hepatitis B)', category: 'Infectious Disease Screening', price: 15, sample_type: 'Serum', reference_range: 'Negative (Non-Reactive)', description: 'Hepatitis B Surface Antigen screening' },
      { test_code: 'LAB-008', test_name: 'Anti-HCV (Hepatitis C)', category: 'Infectious Disease Screening', price: 15, sample_type: 'Serum', reference_range: 'Negative (Non-Reactive)', description: 'Hepatitis C viral antibody screening' },
      { test_code: 'LAB-009', test_name: 'VDRL/RPR (Syphilis)', category: 'Infectious Disease Screening', price: 12, sample_type: 'Serum', reference_range: 'Non-Reactive', description: 'Treponema pallidum screening' },
      // Other
      { test_code: 'LAB-010', test_name: 'BP – Blood Pressure', category: 'Clinical Vital / Other', price: 5, sample_type: 'Physical Clinical Measurement', reference_range: 'Systolic: 90-120 mmHg, Diastolic: 60-80 mmHg', description: 'Pre-anesthesia hemodynamic vital check' }
    ];

    for (const test of labTestsData) {
      await LabTest.findOneAndUpdate({ test_code: test.test_code }, test, { upsert: true, returnDocument: 'after' });
    }
    console.log('[Seed] Lab Tests created/updated.');

    // 5.5 Pharmacy Medicines Catalog
    const medicinesData = [
      {
        medicine_code: 'MED-001',
        name: 'Amoxicillin',
        generic_name: 'Amoxicillin Trihydrate',
        category: 'Antibiotics',
        dosage_form: 'Capsule',
        strength: '500 mg',
        unit_price: 3.00,
        cost_price: 1.50,
        stock_quantity: 150,
        reorder_level: 25,
        instructions_default: 'Take 1 capsule 3 times daily for 5 days after meals'
      },
      {
        medicine_code: 'MED-002',
        name: 'Metronidazole',
        generic_name: 'Metronidazole',
        category: 'Antibiotics',
        dosage_form: 'Tablet',
        strength: '400 mg',
        unit_price: 2.50,
        cost_price: 1.20,
        stock_quantity: 120,
        reorder_level: 20,
        instructions_default: 'Take 1 tablet 3 times daily for 5 days after food'
      },
      {
        medicine_code: 'MED-003',
        name: 'Paracetamol',
        generic_name: 'Acetaminophen / Paracetamol',
        category: 'Pain Relief / Analgesic',
        dosage_form: 'Tablet',
        strength: '500 mg',
        unit_price: 1.50,
        cost_price: 0.75,
        stock_quantity: 200,
        reorder_level: 30,
        instructions_default: 'Take 1 tablet 3 times daily for 3 days as needed for pain'
      },
      {
        medicine_code: 'MED-004',
        name: 'Ibuprofen',
        generic_name: 'Ibuprofen',
        category: 'Anti-inflammatory (NSAID)',
        dosage_form: 'Tablet',
        strength: '400 mg',
        unit_price: 2.00,
        cost_price: 1.00,
        stock_quantity: 140,
        reorder_level: 25,
        instructions_default: 'Take 1 tablet twice daily after meals'
      },
      {
        medicine_code: 'MED-005',
        name: 'Augmentin',
        generic_name: 'Amoxicillin + Clavulanic Acid',
        category: 'Antibiotics',
        dosage_form: 'Tablet',
        strength: '625 mg',
        unit_price: 6.00,
        cost_price: 3.50,
        stock_quantity: 80,
        reorder_level: 15,
        instructions_default: 'Take 1 tablet every 12 hours after food'
      },
      {
        medicine_code: 'MED-006',
        name: 'Chlorhexidine Mouthwash',
        generic_name: 'Chlorhexidine Gluconate 0.2%',
        category: 'Mouthwash & Antiseptic',
        dosage_form: 'Mouthwash',
        strength: '0.2% (300ml)',
        unit_price: 5.00,
        cost_price: 2.80,
        stock_quantity: 60,
        reorder_level: 10,
        instructions_default: 'Rinse mouth with 10ml twice daily after brushing'
      },
      {
        medicine_code: 'MED-007',
        name: 'Miconazole Oral Gel',
        generic_name: 'Miconazole Nitrate 2%',
        category: 'Dermatologic & Topicals',
        dosage_form: 'Oral Gel / Cream',
        strength: '2% (40g)',
        unit_price: 4.50,
        cost_price: 2.20,
        stock_quantity: 50,
        reorder_level: 10,
        instructions_default: 'Apply small quantity over affected oral mucosal area'
      }
    ];

    for (const med of medicinesData) {
      await Medicine.findOneAndUpdate({ medicine_code: med.medicine_code }, med, { upsert: true, returnDocument: 'after' });
    }
    console.log('[Seed] Pharmacy Medicines created/updated.');

    // 6. Settings
    await Setting.findOneAndUpdate({}, {
      clinic_name: 'SNAB Dental and Dermatologic Clinic',
      tagline: 'Specialized Dental & Dermatologic Care • Oral Surgery',
      phone: '+252 61 5000000',
      email: 'info@snabdental.com',
      address: 'Mogadishu Main Road, KM4, Somalia',
      website: 'www.snabdental.com',
      consultation_fee: 20,
      currency: 'USD',
      currency_symbol: '$',
      tooth_numbering_system: 'FDI (Two-digit notation)',
      tax_percentage: 0
    }, { upsert: true, returnDocument: 'after' });
    console.log('[Seed] System Settings configured.');

    // 7. Dental Inventory
    const inventoryData = [
      {
        item_code: 'INV-MAT-001',
        name: '3M Filtek Universal Composite Resin (Shade A2)',
        category: 'Dental Materials & Composites',
        quantity_purchased: 60,
        unit_price: 18,
        total_purchase_cost: 1080,
        supplier: 'DentalDirect Med Supplies',
        purchase_date: new Date('2026-06-15'),
        quantity_used: 18,
        quantity_available: 42,
        expiry_date: new Date('2028-06-30'),
        batch_lot_number: 'LOT-3M-9921',
        reorder_level: 10,
        notes: 'High-strength universal anterior & posterior restorative composite'
      },
      {
        item_code: 'INV-MAT-002',
        name: '0.016 NiTi Orthodontic Archwires (Upper/Lower Pack)',
        category: 'Orthodontic Supplies',
        quantity_purchased: 120,
        unit_price: 4.5,
        total_purchase_cost: 540,
        supplier: 'Global Ortho Tech UK',
        purchase_date: new Date('2026-07-01'),
        quantity_used: 35,
        quantity_available: 85,
        expiry_date: new Date('2030-01-01'),
        batch_lot_number: 'LOT-NW-4402',
        reorder_level: 25,
        notes: 'Superelastic thermal nickel-titanium initial alignment archwires'
      },
      {
        item_code: 'INV-MAT-003',
        name: 'Lidocaine HCl 2% with Epinephrine 1:100,000 (Box of 50)',
        category: 'Anesthetics & Pharmaceuticals',
        quantity_purchased: 80,
        unit_price: 28,
        total_purchase_cost: 2240,
        supplier: 'PharmaEast Dental Care',
        purchase_date: new Date('2026-05-10'),
        quantity_used: 48,
        quantity_available: 32,
        expiry_date: new Date('2027-11-30'),
        batch_lot_number: 'LOT-LIDO-883',
        reorder_level: 15,
        notes: 'Local infiltration and nerve block cartridge dental anesthetic'
      },
      {
        item_code: 'INV-MAT-004',
        name: 'Dental Alginate Fast-Set Impression Material (500g)',
        category: 'Prosthodontic & Impression',
        quantity_purchased: 45,
        unit_price: 12,
        total_purchase_cost: 540,
        supplier: 'EuroDental Impex',
        purchase_date: new Date('2026-06-20'),
        quantity_used: 38,
        quantity_available: 7,
        expiry_date: new Date('2027-08-15'),
        batch_lot_number: 'LOT-ALG-501',
        reorder_level: 10,
        notes: 'Dust-free chromatic alginate for diagnostic study models'
      },
      {
        item_code: 'INV-MAT-005',
        name: 'Surgical Extraction Elevator & Forceps Premium Set',
        category: 'Surgical Instruments & Burs',
        quantity_purchased: 12,
        unit_price: 95,
        total_purchase_cost: 1140,
        supplier: 'SurgicalCraft Instruments',
        purchase_date: new Date('2026-04-12'),
        quantity_used: 2,
        quantity_available: 10,
        expiry_date: null,
        batch_lot_number: 'LOT-SURG-77',
        reorder_level: 3,
        notes: 'German stainless steel surgical tooth extraction instrument sets'
      },
      {
        item_code: 'INV-MAT-006',
        name: 'Digital Intraoral Sensor Protective Barrier Sleeves (Box 500)',
        category: 'Diagnostic & X-Ray Supplies',
        quantity_purchased: 30,
        unit_price: 15,
        total_purchase_cost: 450,
        supplier: 'MedEquip Somalia',
        purchase_date: new Date('2026-07-15'),
        quantity_used: 12,
        quantity_available: 18,
        expiry_date: new Date('2029-12-31'),
        batch_lot_number: 'LOT-SLV-120',
        reorder_level: 5,
        notes: 'Single-use hygienic infection control sleeves for digital X-Ray'
      }
    ];

    for (const item of inventoryData) {
      await DentalInventory.findOneAndUpdate({ item_code: item.item_code }, item, { upsert: true, returnDocument: 'after' });
    }
    console.log('[Seed] Dental Inventory created/updated.');

    console.log('\n======================================================');
    console.log('  SNAB DENTAL AND DERMATOLOGIC CLINIC - SEEDED!  ');
    console.log('======================================================');
    console.log('Active Demo Credentials:');
    console.log(' - Admin:       username: admin     / pass: admin123');
    console.log(' - Doctor:      username: drhassan  / pass: doctor123');
    console.log(' - Doctor:      username: dramina   / pass: doctor123');
    console.log(' - Reception:   username: cashier   / pass: cashier123');
    console.log('======================================================\n');

  } catch (error) {
    console.error('[Seed Error]:', error);
  }
};

export default seedAll;

if (process.argv[1]?.endsWith('seedData.js')) {
  seedAll().then(() => process.exit(0));
}
