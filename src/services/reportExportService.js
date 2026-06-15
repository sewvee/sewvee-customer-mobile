/**
 * Report Export Service - Revenue, Orders, Attendance, Payroll
 * Supports Excel (.xlsx) export. PDF uses HTML generation (can be wired to expo-print when available).
 */

import { Platform } from 'react-native';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import * as XLSX from 'xlsx';
import { formatDate } from '../utils/dateUtils';

const toYMD = (d) => {
    if (!d) return '';
    const x = typeof d === 'string' ? new Date(d) : d;
    return x.toISOString ? x.toISOString().split('T')[0] : String(d);
};

export const generateRevenueReportExcel = async (revenuePerf, dateRange) => {
    const rows = revenuePerf?.rows || [];
    const data = [['Date', 'Orders', 'Revenue', 'Collections', 'Pending', 'Avg Order Value']];
    rows.forEach(r => {
        data.push([
            r.date,
            r.orders,
            r.revenue,
            r.collections,
            r.pending,
            r.avgOrderValue,
        ]);
    });
    return createAndShareExcel(data, `Revenue_Report_${toYMD(new Date())}.xlsx`);
};

export const generateOrdersReportExcel = async (orders) => {
    const data = [
        ['Bill No', 'Customer', 'Date', 'Total', 'Advance', 'Balance', 'Status', 'Delivery Date'],
    ];
    (orders || []).forEach(o => {
        data.push([
            o.billNo || o.id,
            o.customerName || '',
            o.date ? formatDate(o.date) : '',
            o.total || 0,
            o.advance || 0,
            o.balance || 0,
            o.status || '',
            o.deliveryDate ? formatDate(o.deliveryDate) : '',
        ]);
    });
    return createAndShareExcel(data, `Orders_Report_${toYMD(new Date())}.xlsx`);
};

export const generateAttendanceReportExcel = async (attendanceData) => {
    const rows = attendanceData?.rows || [];
    const data = [['Staff', 'Present', 'Leave', 'Absent', 'Attendance %']];
    rows.forEach(r => {
        data.push([r.name, r.present, r.leave, r.absent, `${r.attendancePercent}%`]);
    });
    return createAndShareExcel(data, `Attendance_Report_${toYMD(new Date())}.xlsx`);
};

export const generatePayrollReportExcel = async (payrollRecords, users) => {
    const data = [['Staff', 'Month', 'Year', 'Base Salary', 'Deductions', 'Net Payable', 'Advance', 'Status', 'Payment Date']];
    (payrollRecords || []).forEach(pr => {
        const user = users?.find(u => u.id === pr.userId);
        data.push([
            user?.name || 'Unknown',
            pr.month,
            pr.year,
            pr.baseSalary || 0,
            pr.deductions || 0,
            pr.netPayable || 0,
            pr.advance || 0,
            pr.paymentStatus || 'Pending',
            pr.paymentDate || '',
        ]);
    });
    return createAndShareExcel(data, `Payroll_Report_${toYMD(new Date())}.xlsx`);
};

async function createAndShareExcel(data, filename) {
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Report');
    const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
    const path = `${RNFS.CachesDirectoryPath}/${filename}`;
    await RNFS.writeFile(path, wbout, 'base64');
    const fileUrl = `file://${path}`;
    await Share.open({
        url: fileUrl,
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        filename,
    });
    return path;
}
