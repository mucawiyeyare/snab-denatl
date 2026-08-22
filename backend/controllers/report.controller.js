import Patient from '../models/Patient.js';
import Visit from '../models/Visit.js';
import Treatment from '../models/Treatment.js';
import LabRequest from '../models/LabRequest.js';
import Payment from '../models/Payment.js';
import Invoice from '../models/Invoice.js';
import Appointment from '../models/Appointment.js';
import Followup from '../models/Followup.js';
import Employee from '../models/Employee.js';
import User from '../models/User.js';

export const getDashboardStats = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endToday = new Date();
    endToday.setHours(23, 59, 59, 999);

    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
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
      Patient.countDocuments({ createdAt: { $gte: firstDayOfMonth } }),
      Visit.countDocuments(),
      Visit.countDocuments({ visit_date: { $gte: today, $lte: endToday } }),
      Visit.countDocuments({ status: { $in: ['Waiting for Doctor', 'Returning to Doctor'] } }),
      Visit.countDocuments({ status: { $in: ['With Doctor', 'Treatment in Progress'] } }),
      LabRequest.countDocuments({ status: { $in: ['Payment Required', 'Paid', 'Sample Collected', 'Testing'] } }),
      Visit.countDocuments({ status: { $in: ['Waiting for Payment', 'Laboratory Payment Required', 'Payment Pending'] } }),
      Appointment.countDocuments({ appointment_date: { $gte: today, $lte: endToday } }),
      Appointment.countDocuments(),
      Payment.find({}),
      Payment.find({ payment_date: { $gte: today, $lte: endToday } }),
      Payment.find({ payment_date: { $gte: firstDayOfMonth } }),
      Invoice.find({ balance: { $gt: 0 } }),
      Employee.countDocuments(),
      Employee.countDocuments({ status: 'Active' }),
      // Top treatments real aggregation
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
      // Daily revenue for last 7 days
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
      // Monthly revenue for last 6 months
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

    // Calculate real patient breakdown
    const newPatientsCount = await Patient.countDocuments({ createdAt: { $gte: thirtyDaysAgo } });
    const returningPatientsCount = Math.max(0, totalPatients - newPatientsCount);

    res.json({
      success: true,
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
          unpaidInvoicesCount: allUnpaidInvoices.length
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
