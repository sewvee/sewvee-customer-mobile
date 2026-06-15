/**
 * Analytics Service - Pure computation layer for Insights module
 * Takes raw data and returns structured metrics. No UI.
 */

import { parseDate } from '../utils/dateUtils';
import { normalizeItems } from './pdfService';

/* -------------------- DATE HELPERS -------------------- */

const toYMD = (d) => {
    if (!d) return '';
    const x = typeof d === 'string' ? parseDate(d) : d;
    const y = x.getFullYear();
    const m = String(x.getMonth() + 1).padStart(2, '0');
    const day = String(x.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
};

const getDateRange = (filter, refDate = new Date()) => {
    const today = new Date(refDate);
    today.setHours(0, 0, 0, 0);
    const todayStr = toYMD(today);

    if (filter === 'today') {
        return { start: todayStr, end: todayStr };
    }
    if (filter === 'week') {
        const start = new Date(today);
        start.setDate(start.getDate() - 6);
        return { start: toYMD(start), end: todayStr };
    }
    if (filter === 'month') {
        const start = new Date(today.getFullYear(), today.getMonth(), 1);
        return { start: toYMD(start), end: todayStr };
    }
    return { start: null, end: null }; // all time
};

const isInRange = (dateStr, start, end) => {
    if (!start || !end) return true;
    const d = toYMD(dateStr);
    return d >= start && d <= end;
};

/* -------------------- BUSINESS SNAPSHOT -------------------- */

export const getBusinessSnapshot = (orders, payments, date = new Date()) => {
    orders = orders || [];
    payments = payments || [];
    const todayStr = toYMD(date);
    const yesterday = new Date(date);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = toYMD(yesterday);

    const todayOrders = orders.filter(o => {
        const d = o.date || o.createdAt;
        return d && toYMD(d) === todayStr && o.status !== 'Cancelled';
    });

    const yesterdayOrders = orders.filter(o => {
        const d = o.date || o.createdAt;
        return d && toYMD(d) === yesterdayStr && o.status !== 'Cancelled';
    });

    const todayRevenue = todayOrders.reduce((s, o) => s + (Number(o.total) || 0), 0);
    const yesterdayRevenue = yesterdayOrders.reduce((s, o) => s + (Number(o.total) || 0), 0);
    const todayCollections = payments
        .filter(p => {
            const d = p.date;
            return d && toYMD(d) === todayStr;
        })
        .reduce((s, p) => s + (Number(p.amount) || 0), 0);
    const todayPending = todayOrders.reduce((s, o) => s + (Number(o.balance) || 0), 0);

    const todayCustomerIds = new Set(todayOrders.map(o => o.customerId));
    const repeatToday = todayOrders.filter(o => {
        const prevOrders = orders.filter(ord =>
            ord.customerId === o.customerId &&
            ord.id !== o.id &&
            ord.status !== 'Cancelled'
        );
        return prevOrders.length > 0;
    }).length;

    const growth = yesterdayRevenue > 0
        ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100
        : (todayRevenue > 0 ? 100 : 0);

    return {
        revenueToday: todayRevenue,
        ordersToday: todayOrders.length,
        collectionsReceived: todayCollections,
        pendingPayments: todayPending,
        repeatCustomers: repeatToday,
        growthVsYesterday: growth,
        yesterdayRevenue,
    };
};

/* -------------------- REVENUE PERFORMANCE -------------------- */

export const getRevenuePerformance = (orders, payments, dateRange) => {
    orders = orders || [];
    payments = payments || [];
    const { start, end } = dateRange;
    const filtered = orders.filter(o => {
        if (o.status === 'Cancelled') return false;
        const d = o.date || o.createdAt;
        return !d || isInRange(d, start, end);
    });

    const byDate = new Map();
    filtered.forEach(o => {
        const d = o.date || o.createdAt;
        const key = d ? toYMD(d) : toYMD(new Date());
        if (!byDate.has(key)) {
            byDate.set(key, { date: key, orders: [], revenue: 0, collections: 0, pending: 0 });
        }
        const row = byDate.get(key);
        row.orders.push(o);
        row.revenue += Number(o.total) || 0;
        row.pending += Number(o.balance) || 0;
    });

    payments.forEach(p => {
        const d = p.date;
        if (!d) return;
        const key = toYMD(d);
        if (!isInRange(key, start, end)) return;
        if (!byDate.has(key)) {
            byDate.set(key, { date: key, orders: [], revenue: 0, collections: 0, pending: 0 });
        }
        byDate.get(key).collections += Number(p.amount) || 0;
    });

    const rows = Array.from(byDate.entries())
        .map(([date, row]) => ({
            date,
            orders: row.orders.length,
            revenue: row.revenue,
            collections: row.collections,
            pending: row.pending,
            avgOrderValue: row.orders.length > 0 ? Math.round(row.revenue / row.orders.length) : 0,
        }))
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 30);

    const totalRevenue = rows.reduce((s, r) => s + r.revenue, 0);
    const avgAov = rows.length > 0
        ? Math.round(rows.reduce((s, r) => s + r.avgOrderValue, 0) / rows.length)
        : 0;

    return {
        rows,
        totalRevenue,
        insight: totalRevenue > 0 && avgAov > 0
            ? `Average order value is ₹${avgAov.toLocaleString()} for the period`
            : 'No revenue data for selected period',
    };
};

/* -------------------- CASHFLOW -------------------- */

export const getCashflow = (payments, payrollRecords, paymentTransactions, dateRange) => {
    payments = payments || [];
    payrollRecords = payrollRecords || [];
    paymentTransactions = paymentTransactions || [];
    const { start, end } = dateRange;
    const cashIn = payments
        .filter(p => isInRange(p.date, start, end))
        .reduce((s, p) => s + (Number(p.amount) || 0), 0);

    const salaryPaid = paymentTransactions
        .filter(t => t.type === 'Salary' && isInRange(t.date, start, end))
        .reduce((s, t) => s + (Number(t.amount) || 0), 0);

    const payrollPending = payrollRecords
        .filter(p => p.paymentStatus === 'Pending')
        .reduce((s, p) => s + (Number(p.netPayable) || 0) - (Number(p.advance) || 0), 0);

    const totalPayrollPaid = paymentTransactions
        .filter(t => t.type === 'Salary')
        .reduce((s, t) => s + (Number(t.amount) || 0), 0);

    const expenses = 0;
    const netCash = cashIn - salaryPaid - expenses;

    return {
        cashIn,
        salaryPaid,
        expenses,
        netCash,
        payrollPending,
        totalPayrollPaid,
        insight: salaryPaid > 0 && cashIn >= salaryPaid
            ? 'Customer collections are covering payroll costs comfortably this month.'
            : 'Review cash flow to ensure liquidity.',
    };
};

/* -------------------- ORDER PIPELINE -------------------- */

const MEASUREMENT = ['Pending'];
const STITCHING = ['Cutting', 'Stitching', 'In Progress'];
const TRIAL = ['Trial'];
const READY = ['Completed'];
const DELIVERED = ['Delivered'];

export const getOrderPipeline = (orders) => {
    orders = orders || [];
    let measurement = 0, stitching = 0, trial = 0, readyForDelivery = 0, delivered = 0;

    orders.forEach(o => {
        if (o.status === 'Cancelled') return;
        const isOrderDelivered = o.status === 'Completed' || o.status === 'Delivered';
        const items = o.outfits || o.items || [];
        if (items.length === 0) {
            if (isOrderDelivered) delivered++;
            else measurement++;
        } else {
            items.forEach(it => {
                if (it.status === 'Cancelled') return;
                const s = (it.status || 'Pending');
                if (isOrderDelivered) {
                    delivered++;
                } else if (MEASUREMENT.includes(s)) {
                    measurement++;
                } else if (STITCHING.includes(s)) {
                    stitching++;
                } else if (TRIAL.includes(s)) {
                    trial++;
                } else if (READY.includes(s)) {
                    readyForDelivery++;
                }
            });
        }
    });

    const stages = [
        { stage: 'Measurement', count: measurement },
        { stage: 'Stitching', count: stitching },
        { stage: 'Trial', count: trial },
        { stage: 'Ready for Delivery', count: readyForDelivery },
        { stage: 'Delivered', count: delivered },
    ];

    const maxStage = stages.reduce((a, b) => a.count >= b.count ? a : b, { stage: '', count: 0 });
    return {
        stages,
        insight: maxStage.count > 0
            ? `Most orders are currently in ${maxStage.stage} stage.`
            : 'No active orders in pipeline.',
    };
};

/* -------------------- CUSTOMER INSIGHTS -------------------- */

export const getCustomerInsights = (customers, orders) => {
    customers = customers || [];
    orders = orders || [];
    const now = new Date();
    const monthStart = toYMD(new Date(now.getFullYear(), now.getMonth(), 1));
    const totalCustomers = customers.length;
    const newThisMonth = customers.filter(c => {
        const d = c.createdAt;
        return d && toYMD(d) >= monthStart;
    }).length;

    const customerOrderCount = {};
    const customerRevenue = {};
    orders.filter(o => o.status !== 'Cancelled').forEach(o => {
        const cid = o.customerId;
        customerOrderCount[cid] = (customerOrderCount[cid] || 0) + 1;
        customerRevenue[cid] = (customerRevenue[cid] || 0) + (Number(o.total) || 0);
    });

    const repeatCustomers = Object.keys(customerOrderCount).filter(cid => customerOrderCount[cid] > 1).length;
    const repeatRate = totalCustomers > 0 ? Math.round((repeatCustomers / totalCustomers) * 100) : 0;

    const topCustomers = Object.entries(customerRevenue)
        .map(([customerId, revenue]) => ({
            customerId,
            customerName: customers.find(c => c.id === customerId)?.name || 'Unknown',
            orders: customerOrderCount[customerId] || 0,
            revenue,
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

    const totalRevenue = orders.filter(o => o.status !== 'Cancelled').reduce((s, o) => s + (Number(o.total) || 0), 0);
    const top10Revenue = topCustomers.reduce((s, c) => s + c.revenue, 0);
    const top10Pct = totalRevenue > 0 ? Math.round((top10Revenue / totalRevenue) * 100) : 0;

    return {
        totalCustomers,
        newCustomersThisMonth: newThisMonth,
        repeatCustomers,
        repeatRate,
        topCustomers,
        insight: top10Pct > 0
            ? `Top 10 customers contribute ${top10Pct}% of total revenue.`
            : 'Build repeat customer base to grow revenue.',
    };
};

/* -------------------- TEAM PRODUCTIVITY -------------------- */

export const getTeamProductivity = (orders, users) => {
    orders = orders || [];
    users = users || [];
    const tailors = users.filter(u => {
        const role = (u.roleId || '').toLowerCase();
        return role.includes('tailor') || u.role === 'Tailor';
    });
    if (tailors.length === 0) {
        return { rows: [], insight: 'No tailor roles found.' };
    }

    const byUser = {};
    tailors.forEach(u => {
        byUser[u.id] = { userId: u.id, name: u.name, role: 'Tailor', assigned: 0, completed: 0 };
    });

    orders.filter(o => o.status !== 'Cancelled').forEach(o => {
        const items = o.outfits || o.items || [];
        items.forEach(it => {
            const uid = it.assignedTo;
            if (uid && byUser[uid]) {
                byUser[uid].assigned++;
                if (it.status === 'Completed') byUser[uid].completed++;
            }
        });
    });

    const rows = Object.values(byUser)
        .map(r => ({
            ...r,
            productivity: r.assigned > 0 ? Math.round((r.completed / r.assigned) * 100) : 0,
        }))
        .sort((a, b) => b.completed - a.completed);

    const topTailor = rows[0];
    return {
        rows,
        insight: topTailor && topTailor.completed > 0
            ? `${topTailor.name} completed the highest number of orders this period.`
            : 'Assign orders to tailors to track productivity.',
    };
};

/* -------------------- ATTENDANCE ANALYTICS -------------------- */

const deriveStatus = (r) => {
    if (r.status === 'Leave') return 'Leave';
    if (!r.checkIn || !r.checkOut) return r.status || 'Absent';
    const hrs = parseFloat(r.totalHours);
    return isNaN(hrs) ? 'Present' : (hrs >= 4 ? 'Present' : 'Half Day');
};

export const getAttendanceAnalytics = (attendance, users, dateRange) => {
    attendance = attendance || [];
    users = users || [];
    const { start, end } = dateRange;
    const byUser = {};
    users.forEach(u => {
        byUser[u.id] = { userId: u.id, name: u.name, present: 0, leave: 0, absent: 0 };
    });

    attendance.forEach(a => {
        if (!isInRange(a.date, start, end)) return;
        const uid = a.userId;
        if (!byUser[uid]) return;
        const status = deriveStatus(a);
        if (status === 'Present' || status === 'Half Day') byUser[uid].present++;
        else if (status === 'Leave') byUser[uid].leave++;
        else byUser[uid].absent++;
    });

    const rows = Object.values(byUser).map(r => {
        const total = r.present + r.leave + r.absent;
        const pct = total > 0 ? Math.round((r.present / total) * 100) : 0;
        return { ...r, attendancePercent: pct };
    });

    const avgPct = rows.length > 0
        ? Math.round(rows.reduce((s, r) => s + r.attendancePercent, 0) / rows.length)
        : 0;

    return {
        rows,
        insight: avgPct < 85
            ? `Attendance rate is ${avgPct}% this period.`
            : `Attendance rate is ${avgPct}% - on track.`,
    };
};

/* -------------------- PAYROLL INSIGHTS -------------------- */

export const getPayrollInsights = (payrollRecords, paymentTransactions, orders, dateRange) => {
    payrollRecords = payrollRecords || [];
    paymentTransactions = paymentTransactions || [];
    orders = orders || [];
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const totalPaid = paymentTransactions
        .filter(t => t.type === 'Salary')
        .reduce((s, t) => s + (Number(t.amount) || 0), 0);

    const pending = payrollRecords
        .filter(p => p.paymentStatus === 'Pending')
        .reduce((s, p) => {
            const net = Number(p.netPayable) || 0;
            const adv = Number(p.advance) || 0;
            return s + Math.max(0, net - adv);
        }, 0);

    const revenue = orders
        .filter(o => o.status !== 'Cancelled' && isInRange(o.date || o.createdAt, dateRange.start, dateRange.end))
        .reduce((s, o) => s + (Number(o.total) || 0), 0);

    const ratio = revenue > 0 ? Math.round((totalPaid / revenue) * 100) : 0;

    return {
        totalPayrollPaid: totalPaid,
        payrollPending: pending,
        revenue,
        payrollCostRatio: ratio,
        insight: ratio > 0
            ? `Payroll cost currently accounts for ${ratio}% of revenue.`
            : 'Payroll data not yet available.',
    };
};

/* -------------------- PRODUCT PERFORMANCE -------------------- */

export const getProductPerformance = (orders) => {
    orders = orders || [];
    const byType = {};
    orders.filter(o => o.status !== 'Cancelled').forEach(o => {
        const items = normalizeItems(o, false);
        items.forEach(it => {
            const t = it.type || it.name || 'Other';
            if (!byType[t]) byType[t] = { type: t, orders: 0, revenue: 0 };
            byType[t].orders += it.qty || 1;
            byType[t].revenue += Number(it.amount) || 0;
        });
    });

    const rows = Object.values(byType)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

    const totalOrders = rows.reduce((s, r) => s + r.orders, 0);
    const top = rows[0];
    const topPct = totalOrders > 0 && top ? Math.round((top.orders / totalOrders) * 100) : 0;

    return {
        rows,
        insight: top && topPct > 0
            ? `${top.type} orders account for ${topPct}% of total orders.`
            : 'No order data for product breakdown.',
    };
};

/* -------------------- AI INSIGHTS -------------------- */

export const getAIInsights = (params) => {
    const insights = [];
    const {
        revenuePerformance,
        orderPipeline,
        customerInsights,
        teamProductivity,
        productPerformance,
        payrollInsights,
        orders,
    } = params;

    if (revenuePerformance?.rows?.length >= 2) {
        const r = revenuePerformance.rows;
        const thisRev = r[0]?.revenue || 0;
        const prevRev = r[1]?.revenue || 0;
        if (prevRev > 0) {
            const pct = ((thisRev - prevRev) / prevRev) * 100;
            insights.push(`Revenue ${pct >= 0 ? 'increased' : 'decreased'} by ${Math.abs(pct).toFixed(1)}% compared to last period`);
        }
    }

    const delayed = orders?.filter(o => {
        if (o.status === 'Completed' || o.status === 'Cancelled') return false;
        const dd = o.deliveryDate;
        if (!dd) return false;
        const d = parseDate(dd);
        return d < new Date() && d.getTime() < Date.now();
    }).length || 0;
    if (delayed > 0) {
        insights.push(`${delayed} order(s) are delayed beyond promised delivery date`);
    }

    if (teamProductivity?.rows?.[0]) {
        const t = teamProductivity.rows[0];
        if (t.completed > 0) {
            insights.push(`${t.name} completed the most orders this period`);
        }
    }

    if (productPerformance?.rows?.[0]) {
        const p = productPerformance.rows[0];
        insights.push(`${p.type} category continues to dominate sales`);
    }

    return insights;
};

/* -------------------- COMPUTED DATE RANGE -------------------- */

export { getDateRange, toYMD, isInRange };
