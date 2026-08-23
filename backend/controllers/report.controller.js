import Patient from '../models/Patient.js';
import Visit from '../models/Visit.js';
import Treatment from '../models/Treatment.js';
import Consultation from '../models/Consultation.js';
import LabRequest from '../models/LabRequest.js';
import Payment from '../models/Payment.js';
import Invoice from '../models/Invoice.js';
import Appointment from '../models/Appointment.js';
import Followup from '../models/Followup.js';
import Employee from '../models/Employee.js';
import User from '../models/User.js';
import DentalService from '../models/DentalService.js';
import { getDoctorAssignedPatientIds } from '../utils/doctorScope.js';

export const getDashboardStats = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endToday = new Date();
    endToday.setHours(23, 59, 59, 999);

    // Target month handling (supports ?month=YYYY-MM)
    let targetYear = today.getFullYear();
    let targetMonth = today.getMonth(); // 0-indexed
    if (req.query.month) {
      const parts = req.query.month.split('-');
      if (parts.length === 2) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        if (!isNaN(y) && !isNaN(m) && m >= 1 && m <= 12) {
          targetYear = y;
          targetMonth = m - 1;
        }
      }
    }

    const targetMonthStart = new Date(targetYear, targetMonth, 1);
    const targetMonthEnd = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999);
    const selectedMonthStr = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}`;

    const isDoctor = req.user?.role === 'Doctor';

    // ─────────────────────────────────────────────────────────────
    // DOCTOR-SPECIFIC DASHBOARD
    // ─────────────────────────────────────────────────────────────
    if (isDoctor) {
      const doctorId = req.user._id;
      const doctorUser = await User.findById(doctorId).populate('employee_id');
      const doctorEmployeeId = doctorUser?.employee_id?._id || doctorUser?.employee_id;
      const doctorIds = [doctorId, doctorEmployeeId].filter(Boolean);

      const assignedPatientIds = await getDoctorAssignedPatientIds(doctorId);
      const doctorVisitIds = await Visit.find({ doctor_id: { $in: doctorIds } }).distinct('_id');
      const doctorInvoiceIds = await Invoice.find({
        $or: [
          { doctor_id: { $in: doctorIds } },
          { visit_id: { $in: doctorVisitIds } }
        ]
      }).distinct('_id');

      const [
        totalPatientsServed,
        todayPatientsCount,
        pendingAppointmentsCount,
        todayAppointmentsCount,
        completedConsultationsCount,
        doctorMonthPayments,
        doctorDailyRevenueAgg,
        recentVisits,
        upcomingAppointments,
        recentTreatments,
        doctorTopServices,
        doctorPendingFollowups,
        doctorPendingFollowupsCount
      ] = await Promise.all([
        // 1. Patients Served (unique patients who had visits, appointments, treatments or direct assignment)
        Promise.resolve(assignedPatientIds.length),

        // 2. Today's Patients (visits today)
        Visit.countDocuments({
          doctor_id: { $in: doctorIds },
          visit_date: { $gte: today, $lte: endToday }
        }),

        // 3. Pending / Upcoming Appointments
        Appointment.countDocuments({
          doctor_id: { $in: doctorIds },
          status: { $in: ['Scheduled', 'Confirmed', 'Pending'] }
        }),

        // 4. Today Appointments
        Appointment.countDocuments({
          doctor_id: { $in: doctorIds },
          appointment_date: { $gte: today, $lte: endToday }
        }),

        // 5. Completed Consultations
        Consultation.countDocuments({ doctor_id: { $in: doctorIds } }),

        // 6. Monthly Payments for Doctor's Services (selected month)
        Payment.find({
          $or: [
            { doctor_id: { $in: doctorIds } },
            { visit_id: { $in: doctorVisitIds } },
            { invoice_id: { $in: doctorInvoiceIds } }
          ],
          payment_date: { $gte: targetMonthStart, $lte: targetMonthEnd }
        }),

        // 7. Daily Revenue aggregation for doctor in selected month
        Payment.aggregate([
          {
            $match: {
              $or: [
                { doctor_id: { $in: doctorIds } },
                { visit_id: { $in: doctorVisitIds } },
                { invoice_id: { $in: doctorInvoiceIds } }
              ],
              payment_date: { $gte: targetMonthStart, $lte: targetMonthEnd }
            }
          },
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m-%d', date: '$payment_date' } },
              total: { $sum: '$amount' }
            }
          },
          { $sort: { _id: 1 } }
        ]),

        // 8. Recent Served Patients
        Visit.find({ doctor_id: { $in: doctorIds } })
          .sort({ visit_date: -1 })
          .limit(10)
          .populate('patient_id'),

        // 9. Upcoming Appointments list
        Appointment.find({
          doctor_id: { $in: doctorIds },
          status: { $nin: ['Cancelled'] }
        })
          .sort({ appointment_date: -1 })
          .limit(6)
          .populate('patient_id'),

        // 10. Recent Activity / Treatments
        Treatment.find({ doctor_id: { $in: doctorIds } })
          .sort({ treatment_date: -1 })
          .limit(8)
          .populate('patient_id'),

        // 11. Top Services
        Treatment.aggregate([
          { $match: { doctor_id: { $in: doctorIds } } },
          {
            $group: {
              _id: '$service_name',
              count: { $sum: 1 },
              totalRevenue: { $sum: '$price' }
            }
          },
          { $sort: { count: -1 } },
          { $limit: 6 }
        ]),

        // 12. Pending Follow-ups
        Followup.find({
          doctor_id: { $in: doctorIds },
          status: { $in: ['Pending', 'Scheduled', 'Rescheduled'] }
        })
          .sort({ followup_date: 1 })
          .limit(10)
          .populate('patient_id')
          .populate('visit_id'),

        // 13. Pending Follow-ups Count
        Followup.countDocuments({
          doctor_id: { $in: doctorIds },
          status: { $in: ['Pending', 'Scheduled', 'Rescheduled'] }
        })
      ]);

      const monthlyRevenue = doctorMonthPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

      // Clean doctor name without duplicate 'Dr.' prefix
      const rawName = doctorUser?.full_name || doctorUser?.username || 'Doctor';
      const cleanDoctorName = rawName.startsWith('Dr.') ? rawName : `Dr. ${rawName}`;

      return res.json({
        success: true,
        isDoctor: true,
        data: {
          doctor: {
            id: doctorId,
            name: cleanDoctorName,
            specialization: doctorUser?.employee_id?.specialization || 'Dental Surgeon',
            department: doctorUser?.employee_id?.department || 'Department of Dentistry',
            employee_id: doctorUser?.employee_id?.employee_id || ''
          },
          statistics: {
            patientsServed: totalPatientsServed,
            todayPatients: todayPatientsCount,
            pendingAppointments: pendingAppointmentsCount,
            todayAppointments: todayAppointmentsCount,
            completedConsultations: completedConsultationsCount,
            pendingFollowups: doctorPendingFollowupsCount,
            monthlyRevenue: monthlyRevenue,
            selectedMonth: selectedMonthStr
          },
          recentPatients: recentVisits,
          upcomingAppointments: upcomingAppointments,
          pendingFollowups: doctorPendingFollowups,
          recentTreatments: recentTreatments,
          topServices: doctorTopServices,
          dailyRevenue: doctorDailyRevenueAgg
        }
      });
    }

    // ─────────────────────────────────────────────────────────────
    // CLINIC-WIDE ADMIN / CASHIER DASHBOARD
    // ─────────────────────────────────────────────────────────────
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 5, 1);

    const [
      totalPatients,
      todayPatients,
      monthPatients,
      totalVisits,
      todayVisits,
      waitingForDoctor,
      withDoctor,
      labPending,
      paymentPending,
      todayAppointments,
      totalAppointments,
      allPayments,
      todayPayments,
      monthPayments,
      allUnpaidInvoices,
      totalEmployees,
      activeEmployees,
      topTreatmentsAgg,
      dailyRevenueAgg,
      monthlyRevenueAgg
    ] = await Promise.all([
      Patient.countDocuments(),
      Patient.countDocuments({ createdAt: { $gte: today, $lte: endToday } }),
      Patient.countDocuments({ createdAt: { $gte: targetMonthStart, $lte: targetMonthEnd } }),
      Visit.countDocuments(),
      Visit.countDocuments({ visit_date: { $gte: today, $lte: endToday } }),
      Visit.countDocuments({ status: { $in: ['Waiting for Doctor', 'Returning to Doctor'] } }),
      Visit.countDocuments({ status: { $in: ['With Doctor', 'Treatment in Progress'] } }),
      LabRequest.countDocuments({ status: { $in: ['Pending', 'Payment Required', 'Paid', 'Sample Collected', 'Testing'] } }),
      Visit.countDocuments({ status: { $in: ['Waiting for Payment', 'Laboratory Payment Required', 'Payment Pending'] } }),
      Appointment.countDocuments({ appointment_date: { $gte: today, $lte: endToday } }),
      Appointment.countDocuments(),
      Payment.find({}),
      Payment.find({ payment_date: { $gte: today, $lte: endToday } }),
      Payment.find({ payment_date: { $gte: targetMonthStart, $lte: targetMonthEnd } }),
      Invoice.find({ balance: { $gt: 0 } }),
      Employee.countDocuments(),
      Employee.countDocuments({ status: 'Active' }),
      Treatment.aggregate([
        {
          $group: {
            _id: '$service_name',
            count: { $sum: 1 },
            totalRevenue: { $sum: '$price' }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 6 }
      ]),
      Payment.aggregate([
        {
          $match: {
            payment_date: { $gte: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000) }
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$payment_date' } },
            total: { $sum: '$amount' }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      Payment.aggregate([
        {
          $match: {
            payment_date: { $gte: sixMonthsAgo }
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$payment_date' } },
            total: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ])
    ]);

    const totalRevenue = allPayments.reduce((sum, p) => sum + p.amount, 0);
    const todayRevenue = todayPayments.reduce((sum, p) => sum + p.amount, 0);
    const monthRevenue = monthPayments.reduce((sum, p) => sum + p.amount, 0);
    const totalOutstanding = allUnpaidInvoices.reduce((sum, inv) => sum + (inv.balance || 0), 0);

    const newPatientsCount = await Patient.countDocuments({ createdAt: { $gte: thirtyDaysAgo } });
    const returningPatientsCount = Math.max(0, totalPatients - newPatientsCount);

    res.json({
      success: true,
      isDoctor: false,
      data: {
        patients: {
          total: totalPatients,
          today: todayPatients,
          month: monthPatients,
          newPatients: newPatientsCount,
          returningPatients: returningPatientsCount
        },
        visits: {
          total: totalVisits,
          today: todayVisits,
          waitingForDoctor,
          withDoctor,
          labPending,
          paymentPending
        },
        appointments: {
          today: todayAppointments,
          total: totalAppointments
        },
        financials: {
          totalRevenue,
          todayRevenue,
          monthRevenue,
          totalOutstanding,
          unpaidInvoicesCount: allUnpaidInvoices.length,
          selectedMonth: selectedMonthStr
        },
        employees: {
          total: totalEmployees,
          active: activeEmployees
        },
        topTreatments: topTreatmentsAgg,
        dailyRevenue: dailyRevenueAgg,
        monthlyRevenue: monthlyRevenueAgg
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getDoctorPerformanceReport = async (req, res, next) => {
  try {
    const doctors = await User.find({ role: 'Doctor' }).populate('employee_id');

    const performance = await Promise.all(
      doctors.map(async (doc) => {
        const [patientVisits, treatments, labRequests] = await Promise.all([
          Visit.countDocuments({ doctor_id: doc._id }),
          Treatment.find({ doctor_id: doc._id }),
          LabRequest.countDocuments({ doctor_id: doc._id })
        ]);

        const totalTreatmentRevenue = treatments.reduce((sum, t) => sum + (t.price || 0), 0);

        return {
          doctorId: doc._id,
          name: doc.full_name || doc.username,
          specialization: doc.employee_id?.specialization || 'Dental Surgeon',
          patientsSeen: patientVisits,
          proceduresCount: treatments.length,
          treatmentRevenue: totalTreatmentRevenue,
          labRequestsCount: labRequests
        };
      })
    );

    res.json({ success: true, data: performance });
  } catch (error) {
    next(error);
  }
};

export const getServiceAnalytics = async (req, res, next) => {
  try {
    const [serviceAggregation, labAggregation, paymentMethodAgg, paymentCategoryAgg] = await Promise.all([
      Treatment.aggregate([
        {
          $group: {
            _id: '$service_name',
            count: { $sum: 1 },
            totalRevenue: { $sum: '$price' }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),
      LabRequest.aggregate([
        {
          $group: {
            _id: '$test_name',
            count: { $sum: 1 },
            totalRevenue: { $sum: '$price' }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),
      Payment.aggregate([
        {
          $group: {
            _id: '$payment_method',
            total: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        },
        { $sort: { total: -1 } }
      ]),
      Payment.aggregate([
        {
          $group: {
            _id: '$payment_category',
            total: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        },
        { $sort: { total: -1 } }
      ])
    ]);

    res.json({
      success: true,
      data: {
        topServices: serviceAggregation,
        topLabTests: labAggregation,
        paymentMethods: paymentMethodAgg,
        paymentCategories: paymentCategoryAgg
      }
    });
  } catch (error) {
    next(error);
  }
};

export const globalSearch = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || !q.trim()) {
      return res.json({
        success: true,
        data: { patients: [], invoices: [], visits: [], services: [] }
      });
    }

    const query = q.trim();
    const regex = new RegExp(query, 'i');
    const isDoctor = req.user?.role === 'Doctor';

    let patientScope = {};
    let visitScope = {};
    let invoiceScope = {};

    if (isDoctor) {
      const assignedPatientIds = await getDoctorAssignedPatientIds(req.user._id);
      patientScope = { _id: { $in: assignedPatientIds } };
      visitScope = { doctor_id: req.user._id };
      invoiceScope = { doctor_id: req.user._id };
    }

    const [patients, invoices, visits, services] = await Promise.all([
      Patient.find({
        ...patientScope,
        $or: [
          { name: regex },
          { patient_number: regex },
          { telephone: regex }
        ]
      })
        .limit(5)
        .select('name patient_number telephone gender'),

      Invoice.find({
        ...invoiceScope,
        $or: [
          { invoice_number: regex }
        ]
      })
        .limit(5)
        .populate('patient_id', 'name patient_number')
        .select('invoice_number total_amount balance status patient_id'),

      Visit.find({
        ...visitScope,
        $or: [
          { visit_number: regex },
          { reason: regex }
        ]
      })
        .limit(5)
        .populate('patient_id', 'name patient_number')
        .select('visit_number reason status visit_date patient_id'),

      DentalService.find({
        $or: [
          { service_name: regex },
          { category: regex },
          { service_code: regex }
        ]
      })
        .limit(5)
        .select('service_name category price service_code')
    ]);

    res.json({
      success: true,
      data: {
        patients,
        invoices,
        visits,
        services
      }
    });
  } catch (error) {
    next(error);
  }
};
