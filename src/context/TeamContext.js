import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_ROLE_PERMISSIONS } from '../constants/permissions';

const TeamContext = createContext(null);
const PERSIST_DEBOUNCE_MS = 600;

const STORAGE_KEYS = {
    USERS: 'sewvee_team_users',
    ROLES: 'sewvee_team_roles',
    ATTENDANCE: 'sewvee_team_attendance',
    PAYROLL: 'sewvee_team_payroll',
    PAYMENT_TRANSACTIONS: 'sewvee_team_payment_transactions',
    SALARY_HISTORY: 'sewvee_team_salary_history',
    LEAVE_REQUESTS: 'sewvee_team_leave_requests',
    SEED_VERSION: 'sewvee_team_seed_version',
};
const FORCE_SEED_VERSION = 'v8';

const generateId = (prefix) =>
    `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

const HALF_DAY_HOURS = 4;

const timeToMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const [h, m] = String(timeStr).split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
};

const computeLateAndOvertime = (checkIn, checkOut, workingStart, workingEnd) => {
    let lateEntryMinutes = 0;
    let overtimeMinutes = 0;
    const start = timeToMinutes(workingStart);
    const end = timeToMinutes(workingEnd);
    const ci = timeToMinutes(checkIn);
    const co = timeToMinutes(checkOut);
    if (ci > start) lateEntryMinutes = ci - start;
    if (co > end) overtimeMinutes = co - end;
    return { lateEntryMinutes, overtimeMinutes };
};

const deriveAttendanceStatus = (record) => {
    if (record.status === 'Leave') return 'Leave';
    if (!record.checkIn || !record.checkOut) return record.status || 'Absent';
    const totalHours = parseFloat(record.totalHours);
    if (isNaN(totalHours)) return 'Present';
    return totalHours >= HALF_DAY_HOURS ? 'Present' : 'Half Day';
};

const getNextEmployeeId = (users) => {
    const max = users.reduce((acc, u) => {
        const match = (u.employeeId || '').match(/^EMP-(\d+)$/);
        const num = match ? parseInt(match[1], 10) : 0;
        return Math.max(acc, num);
    }, 0);
    return `EMP-${String(max + 1).padStart(3, '0')}`;
};

/* -------------------- DEFAULT SYSTEM ROLES -------------------- */

const buildSystemRoles = () => {
    const systemRoleNames = ['Owner', 'Admin', 'Manager', 'Receptionist', 'Tailor'];
    return systemRoleNames.map((name, idx) => ({
        id: `role_${name.toLowerCase()}`,
        name,
        description: `${name} role`,
        isSystem: true,
        permissions: DEFAULT_ROLE_PERMISSIONS[name] || {},
    }));
};

const DEFAULT_ROLES = buildSystemRoles();

/* -------------------- MOCK DATA -------------------- */

const getMockSeedData = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const monthStr = String(month).padStart(2, '0');

    const roleIds = {
        owner: 'role_owner',
        admin: 'role_admin',
        manager: 'role_manager',
        receptionist: 'role_receptionist',
        tailor: 'role_tailor',
    };

    const MOCK_USERS = [
        { id: 'user_mock_owner', employeeId: 'EMP-001', name: 'Boutique Owner', gender: 'Female', phone: '9876543210', email: 'owner@myboutique.com', roleId: roleIds.owner, joiningDate: '2023-01-01', status: 'Active', salaryType: 'Monthly', baseSalary: 0, salaryStartDate: '2023-01-01', paymentMode: '', lastLogin: new Date().toISOString(), pin: '', workingHoursStart: '09:00', workingHoursEnd: '18:00', profilePic: null },
        { id: 'user_mock_1', employeeId: 'EMP-002', name: 'Priya Sharma', gender: 'Female', phone: '9876512345', email: 'priya@boutique.com', roleId: roleIds.admin, joiningDate: '2024-01-15', status: 'Active', salaryType: 'Monthly', baseSalary: 25000, salaryStartDate: '2024-01-15', paymentMode: 'Bank', lastLogin: new Date(Date.now() - 3600000).toISOString(), pin: '1234', workingHoursStart: '09:00', workingHoursEnd: '18:00', profilePic: null },
        { id: 'user_mock_2', employeeId: 'EMP-003', name: 'Rajesh Kumar', gender: 'Male', phone: '9876523456', email: 'rajesh@boutique.com', roleId: roleIds.manager, joiningDate: '2024-02-01', status: 'Active', salaryType: 'Monthly', baseSalary: 22000, salaryStartDate: '2024-02-01', paymentMode: 'UPI', lastLogin: new Date(Date.now() - 86400000).toISOString(), pin: '', workingHoursStart: '09:00', workingHoursEnd: '18:00', profilePic: null },
        { id: 'user_mock_3', employeeId: 'EMP-004', name: 'Anita Desai', gender: 'Female', phone: '9876534567', email: '', roleId: roleIds.receptionist, joiningDate: '2024-03-10', status: 'Active', salaryType: 'Weekly', baseSalary: 4000, salaryStartDate: '2024-03-10', paymentMode: 'Cash', lastLogin: new Date().toISOString(), pin: '', workingHoursStart: '09:00', workingHoursEnd: '18:00', profilePic: null },
        { id: 'user_mock_4', employeeId: 'EMP-005', name: 'Suresh Patel', gender: 'Male', phone: '9876545678', email: 'suresh@boutique.com', roleId: roleIds.tailor, joiningDate: '2024-04-01', status: 'Active', salaryType: 'Daily', baseSalary: 800, salaryStartDate: '2024-04-01', paymentMode: 'Cash', lastLogin: null, pin: '', workingHoursStart: '09:00', workingHoursEnd: '18:00', profilePic: null },
        { id: 'user_mock_5', employeeId: 'EMP-006', name: 'Lakshmi Iyer', gender: 'Female', phone: '9876556789', email: 'lakshmi@boutique.com', roleId: roleIds.tailor, joiningDate: '2024-05-15', status: 'Active', salaryType: 'Daily', baseSalary: 750, salaryStartDate: '2024-05-15', paymentMode: 'UPI', lastLogin: new Date(Date.now() - 7200000).toISOString(), pin: '', workingHoursStart: '09:00', workingHoursEnd: '18:00', profilePic: null },
        { id: 'user_mock_6', employeeId: 'EMP-007', name: 'Vikram Reddy', gender: 'Male', phone: '9876567890', email: '', roleId: roleIds.receptionist, joiningDate: '2024-06-01', status: 'Active', salaryType: 'Monthly', baseSalary: 18000, salaryStartDate: '2024-06-01', paymentMode: 'Bank', lastLogin: null, pin: '', workingHoursStart: '09:00', workingHoursEnd: '18:00', profilePic: null },
        { id: 'user_mock_7', employeeId: 'EMP-008', name: 'Meera Krishnan', gender: 'Female', phone: '9876578901', email: 'meera@boutique.com', roleId: roleIds.tailor, joiningDate: '2024-07-01', status: 'Active', salaryType: 'Weekly', baseSalary: 3500, salaryStartDate: '2024-07-01', paymentMode: 'Cash', lastLogin: new Date(Date.now() - 43200000).toISOString(), pin: '', workingHoursStart: '09:00', workingHoursEnd: '18:00', profilePic: null },
    ];

    const MOCK_ATTENDANCE = [];
    const statuses = ['Present', 'Present', 'Present', 'Present', 'Present', 'Leave', 'Absent', 'Half Day'];
    const checkInTimes = ['09:00', '09:15', '08:45', '09:30', '08:55', '09:10'];
    const checkOutTimes = ['18:00', '18:15', '17:45', '18:30', '17:55', '18:10'];

    MOCK_USERS.forEach((u, uIdx) => {
        for (let d = 1; d <= 22; d++) {
            const dateStr = `${year}-${monthStr}-${String(d).padStart(2, '0')}`;
            const dayOfWeek = new Date(year, month - 1, d).getDay();
            if (dayOfWeek === 0) continue;
            const status = statuses[(uIdx + d) % statuses.length];
            if (status === 'Present' || status === 'Half Day') {
                const ci = checkInTimes[(uIdx + d) % checkInTimes.length];
                const co = status === 'Half Day' ? '13:00' : checkOutTimes[(uIdx + d) % checkOutTimes.length];
                const [h1, m1] = ci.split(':').map(Number);
                const [h2, m2] = co.split(':').map(Number);
                const hrs = ((h2 * 60 + m2) - (h1 * 60 + m1)) / 60;
                MOCK_ATTENDANCE.push({
                    id: `att_mock_${u.id}_${d}`,
                    userId: u.id,
                    date: dateStr,
                    checkIn: ci,
                    checkOut: co,
                    totalHours: String(hrs.toFixed(1)),
                    status,
                });
            } else if (status === 'Leave' && d % 7 === 3) {
                MOCK_ATTENDANCE.push({
                    id: `att_mock_${u.id}_${d}_leave`,
                    userId: u.id,
                    date: dateStr,
                    checkIn: null,
                    checkOut: null,
                    totalHours: null,
                    status: 'Leave',
                });
            } else if (status === 'Absent' && d % 11 === 5) {
                MOCK_ATTENDANCE.push({
                    id: `att_mock_${u.id}_${d}_abs`,
                    userId: u.id,
                    date: dateStr,
                    checkIn: null,
                    checkOut: null,
                    totalHours: null,
                    status: 'Absent',
                });
            }
        }
    });

    const MOCK_PAYROLL = MOCK_USERS.slice(0, 5).map((u, i) => {
        const deductions = i < 2 ? 0 : (u.baseSalary / 30) * (i - 1);
        const netPayable = u.baseSalary - (i < 2 ? 0 : (u.baseSalary / 30) * (i - 1));
        const advance = i === 1 ? 5000 : (i === 3 ? 2000 : 0);
        return {
            id: `pr_mock_${u.id}`,
            userId: u.id,
            month,
            year,
            salaryType: u.salaryType,
            baseSalary: u.baseSalary,
            deductions,
            netPayable,
            advance: advance,
            paymentStatus: i < 2 ? 'Paid' : 'Pending',
            paymentDate: i < 2 ? `${year}-${monthStr}-25` : null,
            paymentMode: i < 2 ? (u.paymentMode || (i === 0 ? 'Bank' : 'UPI')) : null,
        };
    });

    const MOCK_PAYMENT_TRANSACTIONS = MOCK_PAYROLL
        .filter((pr) => pr.paymentStatus === 'Paid')
        .map((pr) => ({
            id: `pt_mock_${pr.id}`,
            userId: pr.userId,
            date: pr.paymentDate,
            amount: Math.max(0, (pr.netPayable ?? 0) - (pr.advance ?? 0)),
            type: 'Salary',
            paymentMode: pr.paymentMode || 'Cash',
            month: pr.month,
            year: pr.year,
            payrollRecordId: pr.id,
        }));

    const requestedAt = new Date(Date.now() - 86400000 * 3).toISOString();
    const approvedAt = new Date(Date.now() - 86400000 * 1).toISOString();
    const MOCK_LEAVE_REQUESTS = [
        { id: 'lr_mock_1', userId: 'user_mock_1', startDate: `${year}-${monthStr}-10`, endDate: `${year}-${monthStr}-12`, reason: 'Family wedding', status: 'Pending', requestedAt },
        { id: 'lr_mock_2', userId: 'user_mock_2', startDate: `${year}-${monthStr}-15`, endDate: `${year}-${monthStr}-16`, reason: 'Medical appointment', status: 'Pending', requestedAt },
        { id: 'lr_mock_3', userId: 'user_mock_3', startDate: `${year}-${monthStr}-05`, endDate: `${year}-${monthStr}-06`, reason: 'Personal', status: 'Approved', requestedAt, approvedBy: 'Boutique Owner', approvedAt },
        { id: 'lr_mock_4', userId: 'user_mock_4', startDate: `${year}-${monthStr}-18`, endDate: `${year}-${monthStr}-20`, reason: '', status: 'Rejected', requestedAt, approvedBy: 'Admin', approvedAt },
        { id: 'lr_mock_5', userId: 'user_mock_5', startDate: `${year}-${monthStr}-22`, endDate: `${year}-${monthStr}-23`, reason: 'Vacation', status: 'Approved', requestedAt, approvedBy: 'Admin', approvedAt },
    ];

    return { MOCK_USERS, MOCK_ATTENDANCE, MOCK_PAYROLL, MOCK_PAYMENT_TRANSACTIONS, MOCK_LEAVE_REQUESTS };
};

/* -------------------- PROVIDER -------------------- */

export const TeamProvider = ({ children }) => {
    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState(DEFAULT_ROLES);
    const [attendance, setAttendance] = useState([]);
    const [payrollRecords, setPayrollRecords] = useState([]);
    const [paymentTransactions, setPaymentTransactions] = useState([]);
    const [salaryHistory, setSalaryHistory] = useState([]);
    const [leaveRequests, setLeaveRequests] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadFromStorage();
    }, []);

    const persistTimeoutRef = useRef(null);
    useEffect(() => {
        if (!loading) {
            if (persistTimeoutRef.current) clearTimeout(persistTimeoutRef.current);
            persistTimeoutRef.current = setTimeout(() => {
                persistToStorage(users, roles, attendance, payrollRecords, paymentTransactions, salaryHistory, leaveRequests);
                persistTimeoutRef.current = null;
            }, PERSIST_DEBOUNCE_MS);
            return () => {
                if (persistTimeoutRef.current) clearTimeout(persistTimeoutRef.current);
            };
        }
    }, [users, roles, attendance, payrollRecords, paymentTransactions, salaryHistory, leaveRequests, loading]);

    const loadFromStorage = async () => {
        try {
            const [usersJson, rolesJson, attendanceJson, payrollJson, paymentTxJson, salaryHistoryJson, leaveRequestsJson, seedVersion] = await Promise.all([
                AsyncStorage.getItem(STORAGE_KEYS.USERS),
                AsyncStorage.getItem(STORAGE_KEYS.ROLES),
                AsyncStorage.getItem(STORAGE_KEYS.ATTENDANCE),
                AsyncStorage.getItem(STORAGE_KEYS.PAYROLL),
                AsyncStorage.getItem(STORAGE_KEYS.PAYMENT_TRANSACTIONS),
                AsyncStorage.getItem(STORAGE_KEYS.SALARY_HISTORY),
                AsyncStorage.getItem(STORAGE_KEYS.LEAVE_REQUESTS),
                AsyncStorage.getItem(STORAGE_KEYS.SEED_VERSION),
            ]);

            const needsReSeed = seedVersion !== FORCE_SEED_VERSION;
            let loadedUsers = [];
            if (usersJson && !needsReSeed) {
                try {
                    loadedUsers = JSON.parse(usersJson);
                } catch {}
            }
            const shouldSeedMock = needsReSeed || !Array.isArray(loadedUsers) || loadedUsers.length === 0;
            if (shouldSeedMock) {
                if (needsReSeed) {
                    await Promise.all([
                        AsyncStorage.removeItem(STORAGE_KEYS.USERS),
                        AsyncStorage.removeItem(STORAGE_KEYS.ATTENDANCE),
                        AsyncStorage.removeItem(STORAGE_KEYS.PAYROLL),
                        AsyncStorage.removeItem(STORAGE_KEYS.PAYMENT_TRANSACTIONS),
                        AsyncStorage.removeItem(STORAGE_KEYS.SALARY_HISTORY),
                        AsyncStorage.removeItem(STORAGE_KEYS.LEAVE_REQUESTS),
                    ]);
                    await AsyncStorage.setItem(STORAGE_KEYS.SEED_VERSION, FORCE_SEED_VERSION);
                }
                const { MOCK_USERS, MOCK_ATTENDANCE, MOCK_PAYROLL, MOCK_PAYMENT_TRANSACTIONS, MOCK_LEAVE_REQUESTS } = getMockSeedData();
                setUsers(MOCK_USERS);
                setAttendance(MOCK_ATTENDANCE);
                setPayrollRecords(MOCK_PAYROLL);
                setPaymentTransactions(MOCK_PAYMENT_TRANSACTIONS || []);
                setLeaveRequests(MOCK_LEAVE_REQUESTS || []);
            } else {
                const existingIds = new Set(loadedUsers.map(u => u.employeeId).filter(Boolean));
                let nextNum = 1;
                const migratedUsers = loadedUsers.map((u) => {
                    if (u.employeeId) return u;
                    while (existingIds.has(`EMP-${String(nextNum).padStart(3, '0')}`)) nextNum++;
                    const eid = `EMP-${String(nextNum).padStart(3, '0')}`;
                    existingIds.add(eid);
                    nextNum++;
                    return { ...u, employeeId: eid };
                });
                setUsers(migratedUsers);
                if (attendanceJson) {
                    try {
                        setAttendance(JSON.parse(attendanceJson));
                    } catch {}
                }
                let loadedPayroll = [];
                if (payrollJson) {
                    try {
                        loadedPayroll = JSON.parse(payrollJson);
                        setPayrollRecords(loadedPayroll);
                    } catch {}
                }
                let loadedPaymentTx = [];
                if (paymentTxJson) {
                    try {
                        loadedPaymentTx = JSON.parse(paymentTxJson);
                    } catch {}
                }
                if (loadedPaymentTx.length === 0 && loadedPayroll.length > 0) {
                    const migrated = loadedPayroll
                        .filter((pr) => pr.paymentStatus === 'Paid')
                        .map((pr) => ({
                            id: generateId('pt'),
                            userId: pr.userId,
                            date: pr.paymentDate || `${pr.year}-${String(pr.month).padStart(2, '0')}-01`,
                            amount: Math.max(0, (pr.netPayable ?? 0) - (pr.advance ?? 0)),
                            type: 'Salary',
                            paymentMode: pr.paymentMode || 'Cash',
                            month: pr.month,
                            year: pr.year,
                            payrollRecordId: pr.id,
                        }));
                    loadedPaymentTx = migrated;
                }
                setPaymentTransactions(loadedPaymentTx);
                let loadedSalaryHistory = [];
                if (salaryHistoryJson) {
                    try {
                        loadedSalaryHistory = JSON.parse(salaryHistoryJson);
                    } catch {}
                }
                const historyByUser = new Set(loadedSalaryHistory.map((sh) => sh.userId));
                const migratedHistory = [...loadedSalaryHistory];
                migratedUsers.forEach((u) => {
                    if (!historyByUser.has(u.id)) {
                        migratedHistory.push({
                            id: generateId('sh'),
                            userId: u.id,
                            salary: u.baseSalary ?? 0,
                            date: u.createdAt || new Date().toISOString(),
                            changedBy: 'Migration',
                        });
                        historyByUser.add(u.id);
                    }
                });
                setSalaryHistory(migratedHistory);
                if (leaveRequestsJson) {
                    try {
                        setLeaveRequests(JSON.parse(leaveRequestsJson));
                    } catch {}
                }
            }
            if (rolesJson) {
                const stored = JSON.parse(rolesJson);
                setRoles((prev) => {
                    const merged = [...prev];
                    stored.forEach((r) => {
                        if (!r.isSystem) {
                            if (!merged.find((p) => p.id === r.id)) merged.push(r);
                        }
                    });
                    return merged;
                });
            }
        } catch (e) {
            console.log('Team load error', e);
        }
        setLoading(false);
    };

    const resetTeamData = useCallback(async () => {
        try {
            setLoading(true);
            await AsyncStorage.multiRemove([
                STORAGE_KEYS.USERS,
                STORAGE_KEYS.ROLES,
                STORAGE_KEYS.ATTENDANCE,
                STORAGE_KEYS.PAYROLL,
                STORAGE_KEYS.PAYMENT_TRANSACTIONS,
                STORAGE_KEYS.SALARY_HISTORY,
                STORAGE_KEYS.LEAVE_REQUESTS,
                STORAGE_KEYS.SEED_VERSION,
            ]);
            setUsers([]);
            setRoles(DEFAULT_ROLES);
            setAttendance([]);
            setPayrollRecords([]);
            setPaymentTransactions([]);
            setSalaryHistory([]);
            setLeaveRequests([]);
            await loadFromStorage();
        } catch (e) {
            console.log('Team reset error', e);
        }
    }, []);

    const persistToStorage = useCallback(async (u, r, a, p, pt, sh, lr) => {
        try {
            const us = u ?? users;
            const ro = r ?? roles;
            const at = a ?? attendance;
            const pr = p ?? payrollRecords;
            const payTx = pt ?? paymentTransactions;
            const salHist = sh ?? salaryHistory;
            const leaveReqs = lr ?? leaveRequests;
            const customRoles = ro.filter((x) => !x.isSystem);
            await Promise.all([
                AsyncStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(us)),
                AsyncStorage.setItem(STORAGE_KEYS.ROLES, JSON.stringify(customRoles)),
                AsyncStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(at)),
                AsyncStorage.setItem(STORAGE_KEYS.PAYROLL, JSON.stringify(pr)),
                AsyncStorage.setItem(STORAGE_KEYS.PAYMENT_TRANSACTIONS, JSON.stringify(payTx)),
                AsyncStorage.setItem(STORAGE_KEYS.SALARY_HISTORY, JSON.stringify(salHist)),
                AsyncStorage.setItem(STORAGE_KEYS.LEAVE_REQUESTS, JSON.stringify(leaveReqs)),
            ]);
        } catch (e) {
            console.log('Team persist error', e);
        }
    }, [users, roles, attendance, payrollRecords, paymentTransactions, salaryHistory, leaveRequests]);

    /* -------------------- USERS -------------------- */

    const addUser = useCallback((userData) => {
        const employeeId = userData.employeeId || getNextEmployeeId(users);
        const user = {
            id: generateId('user'),
            employeeId,
            name: userData.name,
            gender: userData.gender,
            phone: userData.phone,
            email: userData.email || '',
            roleId: userData.roleId,
            joiningDate: userData.joiningDate,
            status: userData.status || 'Active',
            salaryType: userData.salaryType || 'Monthly',
            baseSalary: userData.baseSalary || 0,
            salaryStartDate: userData.salaryStartDate || userData.joiningDate,
            paymentMode: userData.paymentMode || '',
            lastLogin: null,
            createdAt: new Date().toISOString(),
            pin: userData.pin || '',
            workingHoursStart: userData.workingHoursStart || '09:00',
            workingHoursEnd: userData.workingHoursEnd || '18:00',
            profilePic: userData.profilePic || null,
        };
        setUsers((prev) => [...prev, user]);
        setSalaryHistory((prev) => [
            ...prev,
            {
                id: generateId('sh'),
                userId: user.id,
                salary: user.baseSalary ?? 0,
                date: user.createdAt,
                changedBy: 'System',
            },
        ]);
        return user;
    }, [users]);

    const updateUser = useCallback((userId, updates, options = {}) => {
        const { changedBy } = options;
        const prevUser = users.find((u) => u.id === userId);
        const prevSalary = prevUser?.baseSalary;
        const newSalary = updates.baseSalary;

        setUsers((prev) =>
            prev.map((u) => (u.id === userId ? { ...u, ...updates } : u))
        );

        if (newSalary !== undefined && newSalary !== prevSalary && changedBy) {
            setSalaryHistory((prev) => [
                ...prev,
                {
                    id: generateId('sh'),
                    userId,
                    salary: newSalary,
                    date: new Date().toISOString(),
                    changedBy,
                },
            ]);
        }
    }, [users]);

    const deleteUser = useCallback((userId) => {
        setUsers((prev) => prev.filter((u) => u.id !== userId));
    }, []);

    const getUserById = useCallback(
        (id) => users.find((u) => u.id === id),
        [users]
    );

    const getRoleById = useCallback(
        (id) => roles.find((r) => r.id === id),
        [roles]
    );

    const getRoleName = useCallback(
        (roleId) => getRoleById(roleId)?.name || '—',
        [getRoleById]
    );

    /* -------------------- ROLES -------------------- */

    const addRole = useCallback((roleData) => {
        const role = {
            id: generateId('role'),
            name: roleData.name,
            description: roleData.description || '',
            isSystem: false,
            permissions: roleData.permissions || {},
        };
        setRoles((prev) => [...prev, role]);
        return role;
    }, []);

    const updateRole = useCallback((roleId, updates) => {
        setRoles((prev) =>
            prev.map((r) => {
                if (r.id !== roleId) return r;
                if (r.isSystem) {
                    return { ...r, permissions: updates.permissions ?? r.permissions };
                }
                return { ...r, ...updates };
            })
        );
    }, []);

    const deleteRole = useCallback((roleId) => {
        const role = roles.find((r) => r.id === roleId);
        if (role?.isSystem) return false;
        setRoles((prev) => prev.filter((r) => r.id !== roleId));
        return true;
    }, [roles]);

    /* -------------------- ATTENDANCE -------------------- */

    const addAttendance = useCallback((entry, user = null) => {
        const existing = attendance.find(
            (a) => a.userId === entry.userId && a.date === entry.date
        );
        const merged = { ...entry };
        if (entry.checkOut && entry.totalHours !== undefined) {
            merged.status = parseFloat(entry.totalHours) >= HALF_DAY_HOURS ? 'Present' : 'Half Day';
        } else if (entry.checkIn && !merged.status) {
            merged.status = 'Present';
        }
        let lateEntryMinutes = entry.lateEntryMinutes ?? 0;
        let overtimeMinutes = entry.overtimeMinutes ?? 0;
        if (entry.checkIn && entry.checkOut && (user || users.find((u) => u.id === entry.userId))) {
            const u = user || users.find((u) => u.id === entry.userId);
            const { lateEntryMinutes: late, overtimeMinutes: ot } = computeLateAndOvertime(
                entry.checkIn,
                entry.checkOut,
                u?.workingHoursStart || '09:00',
                u?.workingHoursEnd || '18:00'
            );
            lateEntryMinutes = late;
            overtimeMinutes = ot;
        }
        merged.lateEntryMinutes = lateEntryMinutes;
        merged.overtimeMinutes = overtimeMinutes;
        if (existing) {
            setAttendance((prev) =>
                prev.map((a) =>
                    a.id === existing.id ? { ...existing, ...merged } : a
                )
            );
            return { ...existing, ...merged };
        }
        const newEntry = {
            id: generateId('att'),
            userId: entry.userId,
            date: entry.date,
            checkIn: entry.checkIn,
            checkOut: entry.checkOut || null,
            totalHours: entry.totalHours || null,
            status: merged.status ?? entry.status ?? 'Present',
            lateEntryMinutes,
            overtimeMinutes,
        };
        setAttendance((prev) => [...prev, newEntry]);
        return newEntry;
    }, [attendance, users]);

    const updateAttendance = useCallback((attendanceId, updates, user = null) => {
        setAttendance((prev) =>
            prev.map((a) => {
                if (a.id !== attendanceId) return a;
                const merged = { ...a, ...updates };
                if (updates.status !== undefined) {
                    merged.status = updates.status;
                    if (updates.status === 'Leave' || updates.status === 'Absent') {
                        merged.checkIn = merged.checkIn ?? null;
                        merged.checkOut = merged.checkOut ?? null;
                        merged.totalHours = merged.totalHours ?? null;
                    }
                } else if (updates.checkOut !== undefined && updates.totalHours !== undefined && a.status !== 'Leave') {
                    merged.status = parseFloat(updates.totalHours) >= HALF_DAY_HOURS ? 'Present' : 'Half Day';
                }
                const checkIn = merged.checkIn || a.checkIn;
                const checkOut = merged.checkOut || a.checkOut;
                if (checkIn && checkOut && (user || users.find((u) => u.id === a.userId))) {
                    const u = user || users.find((u) => u.id === a.userId);
                    const { lateEntryMinutes, overtimeMinutes } = computeLateAndOvertime(
                        checkIn,
                        checkOut,
                        u?.workingHoursStart || '09:00',
                        u?.workingHoursEnd || '18:00'
                    );
                    merged.lateEntryMinutes = lateEntryMinutes;
                    merged.overtimeMinutes = overtimeMinutes;
                }
                return merged;
            })
        );
    }, [users]);

    const deleteAttendance = useCallback((attendanceId) => {
        setAttendance((prev) => prev.filter((a) => a.id !== attendanceId));
    }, []);

    const getAttendanceByUserAndDate = useCallback(
        (userId, date) =>
            attendance.find((a) => a.userId === userId && a.date === date),
        [attendance]
    );

    const getAttendanceByUserAndMonth = useCallback(
        (userId, month, year) =>
            attendance
                .filter((a) => {
                    if (a.userId !== userId) return false;
                    const [aYear, aMonth] = a.date.split('-').map(Number);
                    return aYear === year && aMonth === month;
                })
                .map((a) => ({ ...a, status: deriveAttendanceStatus(a) })),
        [attendance]
    );

    const getWorkingDaysInMonth = (year, month) => {
        const days = [];
        const lastDay = new Date(year, month, 0).getDate();
        for (let d = 1; d <= lastDay; d++) {
            const dayOfWeek = new Date(year, month - 1, d).getDay();
            if (dayOfWeek !== 0) days.push(`${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
        }
        return days;
    };

    const getAttendanceByUserAndMonthEnriched = useCallback(
        (userId, month, year) => {
            const records = attendance.filter((a) => {
                if (a.userId !== userId) return false;
                const [aYear, aMonth] = a.date.split('-').map(Number);
                return aYear === year && aMonth === month;
            });
            const byDate = new Map(records.map((r) => [r.date, { ...r, status: deriveAttendanceStatus(r) }]));
            const workingDays = getWorkingDaysInMonth(year, month);
            return workingDays.map((date) => {
                const rec = byDate.get(date);
                if (rec) return rec;
                return {
                    id: `absent_${userId}_${date}`,
                    userId,
                    date,
                    checkIn: null,
                    checkOut: null,
                    totalHours: null,
                    status: 'Absent',
                };
            });
        },
        [attendance]
    );

    /* -------------------- PAYROLL -------------------- */

    const addPayrollRecord = useCallback((record) => {
        const newRecord = {
            id: generateId('pr'),
            userId: record.userId,
            month: record.month,
            year: record.year,
            salaryType: record.salaryType,
            baseSalary: record.baseSalary,
            deductions: record.deductions || 0,
            netPayable: record.netPayable,
            advance: record.advance ?? 0,
            paymentStatus: record.paymentStatus || 'Pending',
            paymentDate: record.paymentDate || null,
            paymentMode: record.paymentMode || null,
        };
        setPayrollRecords((prev) => [...prev, newRecord]);
        return newRecord;
    }, []);

    const updatePayrollRecord = useCallback((recordId, updates) => {
        setPayrollRecords((prev) =>
            prev.map((r) => (r.id === recordId ? { ...r, ...updates } : r))
        );
    }, []);

    const deletePayrollRecord = useCallback((recordId) => {
        setPayrollRecords((prev) => prev.filter((r) => r.id !== recordId));
    }, []);

    const getPayrollByUserAndMonth = useCallback(
        (userId, month, year) =>
            payrollRecords.find(
                (p) =>
                    p.userId === userId &&
                    p.month === month &&
                    p.year === year
            ),
        [payrollRecords]
    );

    const getPayrollRecordsByUser = useCallback(
        (userId) =>
            payrollRecords
                .filter((p) => p.userId === userId)
                .sort((a, b) => {
                    if (a.year !== b.year) return b.year - a.year;
                    return b.month - a.month;
                }),
        [payrollRecords]
    );

    const getSalaryHistoryByUser = useCallback(
        (userId) =>
            salaryHistory
                .filter((sh) => sh.userId === userId)
                .sort((a, b) => (b.date > a.date ? 1 : -1)),
        [salaryHistory]
    );

    /* -------------------- PAYMENT TRANSACTIONS -------------------- */

    const addPaymentTransaction = useCallback((tx) => {
        const newTx = {
            id: generateId('pt'),
            userId: tx.userId,
            date: tx.date,
            amount: tx.amount ?? 0,
            type: tx.type || 'Advance',
            paymentMode: tx.paymentMode || 'Cash',
            month: tx.month,
            year: tx.year,
            payrollRecordId: tx.payrollRecordId ?? null,
        };
        setPaymentTransactions((prev) => [...prev, newTx]);
        return newTx;
    }, []);

    const updatePaymentTransaction = useCallback((txId, updates) => {
        setPaymentTransactions((prev) =>
            prev.map((t) => (t.id === txId ? { ...t, ...updates } : t))
        );
    }, []);

    const deletePaymentTransaction = useCallback((txId) => {
        setPaymentTransactions((prev) => prev.filter((t) => t.id !== txId));
    }, []);

    const getPaymentTransactionsByUserAndMonth = useCallback(
        (userId, month, year) =>
            paymentTransactions
                .filter(
                    (t) =>
                        t.userId === userId &&
                        t.month === month &&
                        t.year === year
                )
                .sort((a, b) => (a.date > b.date ? -1 : 1)),
        [paymentTransactions]
    );

    /* -------------------- LEAVE REQUESTS -------------------- */

    const getDatesInRange = (startDate, endDate) => {
        const dates = [];
        const start = new Date(startDate);
        const end = new Date(endDate);
        const current = new Date(start);
        while (current <= end) {
            if (current.getDay() !== 0) dates.push(current.toISOString().split('T')[0]);
            current.setDate(current.getDate() + 1);
        }
        return dates;
    };

    const addLeaveRequest = useCallback((data) => {
        const req = {
            id: generateId('lr'),
            userId: data.userId,
            startDate: data.startDate,
            endDate: data.endDate,
            reason: data.reason || '',
            status: 'Pending',
            requestedAt: new Date().toISOString(),
        };
        setLeaveRequests((prev) => [...prev, req]);
        return req;
    }, []);

    const revertLeaveAttendance = useCallback((userId, startDate, endDate) => {
        const dates = getDatesInRange(startDate, endDate);
        setAttendance((prev) =>
            prev.map((a) => {
                if (a.userId !== userId || !dates.includes(a.date)) return a;
                if (a.status !== 'Leave') return a;
                return { ...a, status: null, checkIn: null, checkOut: null, totalHours: null };
            })
        );
    }, []);

    const applyLeaveAttendance = useCallback((userId, startDate, endDate) => {
        const dates = getDatesInRange(startDate, endDate);
        setAttendance((prev) => {
            const byDate = new Map(prev.filter((a) => a.userId === userId).map((a) => [a.date, a]));
            const next = [...prev];
            dates.forEach((date) => {
                const existing = byDate.get(date);
                if (existing) {
                    const idx = next.findIndex((a) => a.id === existing.id);
                    next[idx] = { ...existing, status: 'Leave', checkIn: null, checkOut: null, totalHours: null };
                } else {
                    next.push({
                        id: generateId('att'),
                        userId,
                        date,
                        checkIn: null,
                        checkOut: null,
                        totalHours: null,
                        status: 'Leave',
                    });
                }
            });
            return next;
        });
    }, []);

    const updateLeaveRequest = useCallback((requestId, updates, approvedBy = null) => {
        const req = leaveRequests.find((r) => r.id === requestId);
        if (!req) return;
        const newStatus = updates.status;
        const newStartDate = updates.startDate ?? req.startDate;
        const newEndDate = updates.endDate ?? req.endDate;

        if (req.status === 'Approved' && (updates.startDate != null || updates.endDate != null)) {
            revertLeaveAttendance(req.userId, req.startDate, req.endDate);
        }
        if (req.status === 'Approved' && newStatus === 'Rejected') {
            revertLeaveAttendance(req.userId, req.startDate, req.endDate);
        }
        if (req.status === 'Approved' && newStatus === 'Pending') {
            revertLeaveAttendance(req.userId, req.startDate, req.endDate);
        }

        setLeaveRequests((prev) =>
            prev.map((r) => {
                if (r.id !== requestId) return r;
                return {
                    ...r,
                    ...updates,
                    startDate: newStartDate,
                    endDate: newEndDate,
                    approvedBy: approvedBy || r.approvedBy,
                    approvedAt: newStatus === 'Approved' || newStatus === 'Rejected' ? new Date().toISOString() : newStatus === 'Pending' ? null : r.approvedAt,
                };
            })
        );

        if (newStatus === 'Approved') {
            applyLeaveAttendance(req.userId, newStartDate, newEndDate);
        } else if (req.status === 'Approved' && (updates.startDate != null || updates.endDate != null)) {
            applyLeaveAttendance(req.userId, newStartDate, newEndDate);
        }
    }, [leaveRequests, revertLeaveAttendance, applyLeaveAttendance]);

    const deleteLeaveRequest = useCallback((requestId) => {
        const req = leaveRequests.find((r) => r.id === requestId);
        if (!req) return;
        if (req.status === 'Approved') {
            revertLeaveAttendance(req.userId, req.startDate, req.endDate);
        }
        setLeaveRequests((prev) => prev.filter((r) => r.id !== requestId));
    }, [leaveRequests, revertLeaveAttendance]);

    const getLeaveRequestsByMonth = useCallback(
        (year, month, statusFilter = null) => {
            const filtered = leaveRequests.filter((r) => {
                const reqMonth = new Date(r.startDate).getMonth() + 1;
                const reqYear = new Date(r.startDate).getFullYear();
                const matchMonth = reqMonth === month && reqYear === year;
                if (!matchMonth) return false;
                if (statusFilter) return r.status === statusFilter;
                return true;
            });
            return filtered.sort((a, b) => (a.requestedAt > b.requestedAt ? 1 : -1));
        },
        [leaveRequests]
    );

    const getLeaveRequestsByUser = useCallback(
        (userId) =>
            leaveRequests
                .filter((r) => r.userId === userId)
                .sort((a, b) => (b.requestedAt > a.requestedAt ? 1 : -1)),
        [leaveRequests]
    );

    const getPendingLeaveRequests = useCallback(
        () => leaveRequests.filter((r) => r.status === 'Pending').sort((a, b) => (a.requestedAt > b.requestedAt ? 1 : -1)),
        [leaveRequests]
    );

    return (
        <TeamContext.Provider
            value={{
                users,
                roles,
                attendance,
                payrollRecords,
                loading,
                addUser,
                updateUser,
                deleteUser,
                getUserById,
                getRoleById,
                getRoleName,
                addRole,
                updateRole,
                deleteRole,
                addAttendance,
                updateAttendance,
                deleteAttendance,
                getAttendanceByUserAndDate,
                getAttendanceByUserAndMonth,
                getAttendanceByUserAndMonthEnriched,
                addPayrollRecord,
                updatePayrollRecord,
                deletePayrollRecord,
                getPayrollByUserAndMonth,
                getPayrollRecordsByUser,
                getSalaryHistoryByUser,
                addPaymentTransaction,
                updatePaymentTransaction,
                deletePaymentTransaction,
                getPaymentTransactionsByUserAndMonth,
                leaveRequests,
                addLeaveRequest,
                updateLeaveRequest,
                deleteLeaveRequest,
                getLeaveRequestsByUser,
                getLeaveRequestsByMonth,
                getPendingLeaveRequests,
                resetTeamData,
            }}
        >
            {children}
        </TeamContext.Provider>
    );
};

export const useTeam = () => {
    const ctx = useContext(TeamContext);
    if (!ctx) {
        throw new Error('useTeam must be inside TeamProvider');
    }
    return ctx;
};
