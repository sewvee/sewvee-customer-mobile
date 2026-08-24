import React, { useState, useCallback, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Dimensions,
    Modal,
    TextInput,
    Platform,
    FlatList,
    Image,
    LayoutAnimation,
    RefreshControl,
    ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Spacing, Typography, Shadow } from '../constants/theme';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AntDesign from 'react-native-vector-icons/AntDesign';
import Feather from 'react-native-vector-icons/Feather';
import { fetchUnreadCount } from '../store/notificationSlice';
import { formatOrderNumber, formatPaymentBillId } from '../utils/orderIdFormatter';
import { getItemQuantitySections } from '../utils/orderQuantitySections';
import LinearGradient from 'react-native-linear-gradient';



import {
    IndianRupee,
    Clock,
    Users,
    ChevronRight,
    ChevronDown,
    Search,
    Bell,
    CreditCard,
    X,
    LayoutGrid,
    Receipt,
    Calendar,
    Flame,
    CheckCircle2,
    ReceiptIndianRupee,
    MessageCircle,
    Phone,
    Plus,
    AlertCircle,
    Shirt,
    Scissors,
    ShoppingBag
} from 'lucide-react-native';
import { formatDate, parseDate } from '../utils/dateUtils';
import { getCompanyLogoUri } from '../utils/branding';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useTeam } from '../context/TeamContext';
import { useToast } from '../context/ToastContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { fetchDashboardInsights } from '../store/dashboardSlice';
import { fetchPaymentsAction } from '../store/paymentSlice';
import { fetchUserProfile } from '../store/profileSlice';
import { getCompanyAction } from '../store/companyOnboardSlice';
import { getOrdersListAction } from '../store/salesOrderSlice';
import { useFocusEffect } from '@react-navigation/native';
import DashboardFilterModal from '../components/DashboardFilterModal';
// import firestore from '@react-native-firebase/firestore';
// import PaymentAttentionItem from '../components/PaymentAttentionItem';

// import Constants from 'expo-constants';
import { Linking } from 'react-native';

const { width } = Dimensions.get('window');
const DASHBOARD_ORDER_FETCH_LIMIT = 100;

const normalizeStatusToken = value => (
    String(value || '')
        .trim()
        .toUpperCase()
        .replace(/\s+/g, '_')
);

const parseOrderDateValue = (dateValue) => {
    if (!dateValue) {
        return null;
    }

    if (dateValue instanceof Date) {
        return Number.isNaN(dateValue.getTime()) ? null : dateValue;
    }

    if (dateValue && typeof dateValue.toDate === 'function') {
        const convertedDate = dateValue.toDate();
        return Number.isNaN(convertedDate?.getTime?.()) ? null : convertedDate;
    }

    const rawValue = String(dateValue).trim();

    if (!rawValue) {
        return null;
    }

    const isoLikeMatch = rawValue.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T].*)?$/);
    if (isoLikeMatch) {
        const [, year, month, day] = isoLikeMatch;
        return new Date(Number(year), Number(month) - 1, Number(day));
    }

    const slashDateMatch = rawValue.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s.*)?$/);
    if (slashDateMatch) {
        const [, partOne, partTwo, year] = slashDateMatch;
        const left = Number(partOne);
        const right = Number(partTwo);

        if (left <= 12 && right > 12) {
            return new Date(Number(year), left - 1, right);
        }

        return new Date(Number(year), right - 1, left);
    }

    const parsedDate = parseDate(dateValue);
    return Number.isNaN(parsedDate?.getTime?.()) ? null : parsedDate;
};

const isCancelledOrDeliveredStatus = statusValue => {
    const normalizedStatus = normalizeStatusToken(statusValue);
    return normalizedStatus === 'CANCELLED' || normalizedStatus === 'DELIVERED';
};

const STITCHING_STAGE_TOKENS = new Set([
    'CUTTING',
    'IN_PROGRESS',
    'INPROGRESS',
    'STITCHING',
]);

const DashboardScreen = ({ navigation }) => {
    const { company, saveCompany, user: authUser } = useAuth();
    const { showToast } = useToast();
    const { users, getAttendanceByUserAndDate, addAttendance, updateAttendance } = useTeam();

    const currentUserStaff = React.useMemo(() => {
        return (users || []).find((u) => u.phone === authUser?.mobile || u.email === authUser?.email);
    }, [users, authUser]);

    const todayStrVal = React.useMemo(() => new Date().toISOString().split('T')[0], []);
    const todayAttendance = React.useMemo(() => {
        return currentUserStaff ? getAttendanceByUserAndDate(currentUserStaff.id, todayStrVal) : null;
    }, [currentUserStaff, todayStrVal, getAttendanceByUserAndDate]);

    const [elapsedTime, setElapsedTime] = useState('00:00:00');
    const timerRef = React.useRef(null);

    useEffect(() => {
        if (todayAttendance?.checkIn && !todayAttendance?.checkOut) {
            const startTime = new Date(`${todayStrVal}T${todayAttendance.checkIn}:00`).getTime();
            const updateTimer = () => {
                const now = Date.now();
                const diff = Math.max(0, now - startTime);
                const hrs = Math.floor(diff / 3600000);
                const mins = Math.floor((diff % 3600000) / 60000);
                const secs = Math.floor((diff % 60000) / 1000);
                setElapsedTime(
                    `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
                );
            };
            updateTimer();
            timerRef.current = setInterval(updateTimer, 1000);
        } else {
            if (timerRef.current) clearInterval(timerRef.current);
            setElapsedTime('00:00:00');
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [todayAttendance, todayStrVal]);

    const handleClockToggle = useCallback(() => {
        if (!currentUserStaff) {
            showToast('Staff profile not found', 'error');
            return;
        }

        const now = new Date();
        const timeStr = now.toTimeString().split(' ')[0].substring(0, 5); // HH:MM

        if (!todayAttendance) {
            addAttendance({
                userId: currentUserStaff.id,
                date: todayStrVal,
                checkIn: timeStr,
                status: 'Present'
            });
            showToast('Clocked In successfully!', 'success');
        } else if (!todayAttendance.checkOut) {
            const [ciHrs, ciMins] = todayAttendance.checkIn.split(':').map(Number);
            const checkOutMinutes = now.getHours() * 60 + now.getMinutes();
            const checkInMinutes = ciHrs * 60 + ciMins;
            const diffHours = ((checkOutMinutes - checkInMinutes) / 60).toFixed(1);

            updateAttendance(todayAttendance.id, {
                checkOut: timeStr,
                totalHours: diffHours
            }, currentUserStaff);
            showToast('Clocked Out successfully!', 'success');
        } else {
            showToast('Already completed shift for today!', 'info');
        }
    }, [currentUserStaff, todayAttendance, todayStrVal, addAttendance, updateAttendance, showToast]);

    const { orders, customers, payments, refreshData, loading: dataLoading } = useData();
    const insets = useSafeAreaInsets();
    const dispatch = useDispatch();
    const { insights, loading: insightsLoading } = useSelector((state) => state.dashboard);
    const { loading: profileLoading } = useSelector(state => state.profile);
    const { data: companyData, loading: companyLoading } = useSelector(state => state.companyOnboard);
    const { unreadCount } = useSelector(state => state.notifications);
    const reduxOrdersList = useSelector(state => state.salesOrder?.ordersList || []);
    const { list: apiPayments } = useSelector(state => state.payment);
    const [recentApiOrders, setRecentApiOrders] = useState([]);
    const [dashboardOrders, setDashboardOrders] = useState([]);
    const [dashboardOrdersLoaded, setDashboardOrdersLoaded] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [screenLoading, setScreenLoading] = useState(true);
    const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
    const [expandedOrders, setExpandedOrders] = useState({});

    // Draft State
    const [drafts, setDrafts] = useState([]);
    const STORAGE_KEY = '@create_order_draft';

    // ----- Tabs -----
    const [activeRecentTab, setActiveRecentTab] = useState('orders');

    // ----- Search / Modals -----
    const [isSearchVisible, setIsSearchVisible] = useState(false);
    const [isActivityVisible, setIsActivityVisible] = useState(false);
    const [isOrderTypeModalVisible, setIsOrderTypeModalVisible] = useState(false);
    const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
    const [appliedFilter, setAppliedFilter] = useState({ type: 'monthly', month: new Date().getMonth(), year: new Date().getFullYear(), label: 'This Month' });
    const [searchQuery, setSearchQuery] = useState('');

    const boutiqueLogoUrl = getCompanyLogoUri(companyData, company);
    const boutiqueName =
        companyData?.name ||
        company?.name ||
        'My Boutique';

    // Fetch Drafts on Mount and Focus
    const fetchDrafts = useCallback(async () => {
        try {
            const savedData = await AsyncStorage.getItem(STORAGE_KEY);
            if (savedData) {
                const parsed = JSON.parse(savedData);
                setDrafts(Array.isArray(parsed) ? parsed : [parsed]);
            } else {
                setDrafts([]);
            }
        } catch (error) {
            console.error('Failed to fetch drafts:', error);
        }
    }, []);

    const buildInsightsPayload = useCallback((filter) => {
        const pad = (num) => num.toString().padStart(2, '0');
        const formatDateStr = (dateValue) =>
            `${dateValue.getFullYear()}-${pad(dateValue.getMonth() + 1)}-${pad(dateValue.getDate())}`;

        if (!filter) {
            return { type: 'daily', quick: 'today' };
        }

        if (filter.type === 'daily') {
            return {
                type: 'custom',
                from_date: formatDateStr(filter.date),
                to_date: formatDateStr(filter.date),
            };
        }

        if (filter.type === 'monthly') {
            const start = new Date(filter.year, filter.month, 1);
            const end = new Date(filter.year, filter.month + 1, 0);
            return {
                type: 'custom',
                from_date: formatDateStr(start),
                to_date: formatDateStr(end),
            };
        }

        if (filter.type === 'yearly') {
            const start = new Date(filter.year, 0, 1);
            const end = new Date(filter.year, 11, 31);
            return {
                type: 'custom',
                from_date: formatDateStr(start),
                to_date: formatDateStr(end),
            };
        }

        if (filter.type === 'custom') {
            return {
                type: 'custom',
                from_date: formatDateStr(filter.from),
                to_date: formatDateStr(filter.to),
            };
        }

        return { type: 'daily', quick: 'today' };
    }, []);

    const getFilterReferenceDate = useCallback((filter) => {
        const referenceDate = new Date();

        if (!filter) {
            referenceDate.setHours(0, 0, 0, 0);
            return referenceDate;
        }

        if (filter.type === 'daily' && filter.date) {
            const selectedDate = new Date(filter.date);
            selectedDate.setHours(0, 0, 0, 0);
            return selectedDate;
        }

        if (filter.type === 'monthly') {
            const endOfMonth = new Date(filter.year, filter.month + 1, 0);
            endOfMonth.setHours(0, 0, 0, 0);
            return endOfMonth;
        }

        if (filter.type === 'yearly') {
            const endOfYear = new Date(filter.year, 11, 31);
            endOfYear.setHours(0, 0, 0, 0);
            return endOfYear;
        }

        if (filter.type === 'custom' && filter.to) {
            const endDate = new Date(filter.to);
            endDate.setHours(0, 0, 0, 0);
            return endDate;
        }

        referenceDate.setHours(0, 0, 0, 0);
        return referenceDate;
    }, []);

    const getFilterDateRange = useCallback((filter) => {
        const normalizeDate = (value) => {
            const parsedDate = new Date(value);
            parsedDate.setHours(0, 0, 0, 0);
            return parsedDate;
        };

        if (!filter) {
            const todayDate = normalizeDate(new Date());
            return {
                from: todayDate,
                to: todayDate,
            };
        }

        if (filter.type === 'daily' && filter.date) {
            const selectedDate = normalizeDate(filter.date);
            return {
                from: selectedDate,
                to: selectedDate,
            };
        }

        if (filter.type === 'monthly') {
            return {
                from: normalizeDate(new Date(filter.year, filter.month, 1)),
                to: normalizeDate(new Date(filter.year, filter.month + 1, 0)),
            };
        }

        if (filter.type === 'yearly') {
            return {
                from: normalizeDate(new Date(filter.year, 0, 1)),
                to: normalizeDate(new Date(filter.year, 11, 31)),
            };
        }

        if (filter.type === 'custom' && filter.from && filter.to) {
            const fromDate = normalizeDate(filter.from);
            const toDate = normalizeDate(filter.to);

            return fromDate.getTime() <= toDate.getTime()
                ? { from: fromDate, to: toDate }
                : { from: toDate, to: fromDate };
        }

        const todayDate = normalizeDate(new Date());
        return {
            from: todayDate,
            to: todayDate,
        };
    }, []);

    const fetchDashboardOrdersSnapshot = useCallback(async () => {
        let page = 1;
        let totalPages = 1;
        const nextOrders = [];
        const seenOrderIds = new Set();

        do {
            const response = await dispatch(
                getOrdersListAction({
                    page,
                    limit: DASHBOARD_ORDER_FETCH_LIMIT,
                    sort_by: 'latest',
                    storeInList: false,
                    silent: true,
                }),
            ).unwrap();

            const pageOrders = Array.isArray(response?.orders) ? response.orders : [];

            if (page === 1) {
                setRecentApiOrders(pageOrders.slice(0, 10));
            }

            pageOrders.forEach(order => {
                const orderId = String(order?.id ?? '');
                if (!orderId || seenOrderIds.has(orderId)) {
                    return;
                }

                seenOrderIds.add(orderId);
                nextOrders.push(order);
            });

            totalPages = Number(
                response?.pagination?.totalPages ??
                response?.pagination?.lastPage ??
                1,
            ) || 1;
            page += 1;
        } while (page <= totalPages);

        setDashboardOrders(nextOrders);
        setDashboardOrdersLoaded(true);
        return nextOrders;
    }, [dispatch]);

    const refreshDashboardData = useCallback(async ({
        showLoader = false,
        showRefreshSpinner = false,
        filterOverride,
    } = {}) => {
        const activeFilter = filterOverride !== undefined ? filterOverride : appliedFilter;

        if (showLoader) {
            setScreenLoading(true);
        }

        if (showRefreshSpinner) {
            setIsRefreshing(true);
        }

        try {
            const companyPromise = dispatch(getCompanyAction())
                .unwrap()
                .then(response => {
                    if (response?.data) {
                        saveCompany(response.data);
                    }
                })
                .catch(error => {
                    console.log('Error fetching company details', error);
                });

            const paymentsPromise = dispatch(
                fetchPaymentsAction({ page: 1, limit: 10, status: 'ALL' }),
            )
                .unwrap()
                .catch(err => {
                    console.log('Error fetching recent payments', err);
                });

            const dashboardOrdersPromise = fetchDashboardOrdersSnapshot().catch(err => {
                console.log('Error fetching dashboard orders snapshot', err);
                setDashboardOrders([]);
                setRecentApiOrders([]);
                setDashboardOrdersLoaded(false);
            });

            await Promise.all([
                refreshData(),
                fetchDrafts(),
                dispatch(fetchUserProfile()),
                dispatch(fetchDashboardInsights(buildInsightsPayload(activeFilter))),
                dispatch(fetchUnreadCount()),
                paymentsPromise,
                dashboardOrdersPromise,
                companyPromise,
            ]);
        } finally {
            setHasLoadedOnce(true);
            if (showLoader) {
                setScreenLoading(false);
            }
            if (showRefreshSpinner) {
                setIsRefreshing(false);
            }
        }
    }, [appliedFilter, buildInsightsPayload, dispatch, fetchDashboardOrdersSnapshot, fetchDrafts, refreshData, saveCompany]);

    useFocusEffect(
        useCallback(() => {
            refreshDashboardData({ showLoader: !hasLoadedOnce }).catch(error => {
                console.log('Dashboard refresh failed', error);
            });
        }, [hasLoadedOnce, refreshDashboardData])
    );

    const handleCancelDraft = async (index) => {
        try {
            const newDrafts = [...drafts];
            newDrafts.splice(index, 1);
            if (newDrafts.length === 0) {
                await AsyncStorage.removeItem(STORAGE_KEY);
            } else {
                await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newDrafts));
            }
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setDrafts(newDrafts);
        } catch (error) {
            console.error('Failed to cancel draft:', error);
        }
    };

    const handleContinueDraft = (draft) => {
        navigation.navigate('CreateOrderFlow', {
            isResumingDraft: true,
            draftId: draft.draftId
        });
    };

    const formatLastSaved = (dateStr) => {
        if (!dateStr) return 'Recently';
        const now = new Date();
        const saved = new Date(dateStr);
        const diffMs = now - saved;
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} mins ago`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours} hours ago`;
        return formatDate(dateStr);
    };

    const overdueReferenceDate = getFilterReferenceDate(appliedFilter);

    const getDaysRemaining = (dateString, referenceDate = new Date()) => {
        if (!dateString) return 999;
        const targetDate = parseOrderDateValue(dateString);
        if (!targetDate) return null;
        const comparisonDate = new Date(referenceDate);
        targetDate.setHours(0, 0, 0, 0);
        comparisonDate.setHours(0, 0, 0, 0);
        const diffTime = targetDate.getTime() - comparisonDate.getTime();
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    };

    const getOrderDeliveryDate = useCallback((order) => {
        const directDeliveryDate =
            order?.deliveryDate ||
            order?.delivery_date ||
            null;

        if (directDeliveryDate) {
            return directDeliveryDate;
        }

        const orderItems = Array.isArray(order?.outfits || order?.items)
            ? (order.outfits || order.items)
            : [];
        const activeItems = orderItems.filter(item => !isCancelledOrDeliveredStatus(item?.status));
        const itemDeliveryDates = activeItems
            .flatMap(item => [
                item?.deliveryDate,
                item?.delivery_date,
            ])
            .filter(Boolean);

        if (itemDeliveryDates.length === 0) {
            return null;
        }

        return itemDeliveryDates.sort(
            (left, right) => (
                (parseOrderDateValue(left)?.getTime() ?? Number.MAX_SAFE_INTEGER) -
                (parseOrderDateValue(right)?.getTime() ?? Number.MAX_SAFE_INTEGER)
            ),
        )[0];
    }, []);

    const reduxOrdersMap = React.useMemo(() => new Map(reduxOrdersList.map(o => [String(o.id), o])), [reduxOrdersList]);

    const patchOrderWithRedux = React.useCallback((order) => {
        const reduxOrder = reduxOrdersMap.get(String(order?.id));
        if (!reduxOrder) return order;
        
        const newTime = new Date(reduxOrder.updatedAt || reduxOrder.updated_at || 0).getTime();
        const oldTime = new Date(order.updatedAt || order.updated_at || 0).getTime();
        if (newTime >= oldTime) {
            return reduxOrder;
        }
        return order;
    }, [reduxOrdersMap]);

    const patchedDashboardOrders = React.useMemo(() => dashboardOrders.map(patchOrderWithRedux), [dashboardOrders, patchOrderWithRedux]);
    const ordersForDashboardMetrics = dashboardOrdersLoaded ? patchedDashboardOrders : orders;
    const selectedDateRange = getFilterDateRange(appliedFilter);

    const activeOrderIds = new Set(ordersForDashboardMetrics.map(o => o.id));
    const validPayments = payments.filter(p => activeOrderIds.has(p.orderId));

    const totalRevenue = insights?.payments?.total_amount ?? 0;
    const totalCollected = insights?.payments?.collected_amount ?? 0;
    const pendingAmount = insights?.payments?.balance_amount ?? 0;

    const isStaff = authUser?.role === 'Receptionist' || authUser?.role === 'Support Staff';

    const staffOrdersCreatedCount = React.useMemo(() => {
        return orders.filter(o => o.takenById === currentUserStaff?.id).length;
    }, [orders, currentUserStaff]);

    const staffOrdersCompletedCount = React.useMemo(() => {
        return orders.filter(o => o.takenById === currentUserStaff?.id && o.status === 'Completed').length;
    }, [orders, currentUserStaff]);

    const staffTodaysCollection = React.useMemo(() => {
        const tDate = new Date();
        tDate.setHours(0, 0, 0, 0);
        return payments.filter(p => {
            const pDate = parseDate(p.date);
            pDate.setHours(0, 0, 0, 0);
            return pDate.getTime() === tDate.getTime() && p.takenById === currentUserStaff?.id;
        }).reduce((sum, p) => sum + p.amount, 0);
    }, [payments, currentUserStaff]);

    // TODAY-FOCUSED CALCULATIONS
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    const dueToday = ordersForDashboardMetrics.filter(order => {
        if (isCancelledOrDeliveredStatus(order?.status)) return false;
        const deliveryDate = getOrderDeliveryDate(order);
        const daysRemaining = getDaysRemaining(deliveryDate, overdueReferenceDate);
        return daysRemaining !== null && daysRemaining === 0;
    }).length;

    const completedToday = ordersForDashboardMetrics.filter(order => {
        return normalizeStatusToken(order?.status) === 'completed';
    }).length;

    const stitchingCount = ordersForDashboardMetrics.filter(order => {
        if (isCancelledOrDeliveredStatus(order?.status)) return false;
        if (STITCHING_STAGE_TOKENS.has(normalizeStatusToken(order?.status))) return true;
        const orderItems = Array.isArray(order?.outfits || order?.items) ? (order.outfits || order.items) : [];
        return orderItems.some(item => {
            const itemStatus = normalizeStatusToken(item?.status);
            return (
                itemStatus !== 'COMPLETED' &&
                itemStatus !== 'CANCELLED' &&
                itemStatus !== 'DELIVERED' &&
                STITCHING_STAGE_TOKENS.has(itemStatus)
            );
        });
    }).length;

    const yetToStartCount = ordersForDashboardMetrics.filter(order => {
        const status = normalizeStatusToken(order?.status);
        return !status || status === 'yet_to_start' || status === 'pending';
    }).length;

    const deliveredCount = ordersForDashboardMetrics.filter(order => {
        return normalizeStatusToken(order?.status) === 'delivered';
    }).length;

    // Today's Money Snapshot
    const todaysCollection = validPayments.filter(p => {
        const paymentDate = parseDate(p.date);
        paymentDate.setHours(0, 0, 0, 0);
        return paymentDate.getTime() === today.getTime();
    }).reduce((sum, p) => sum + p.amount, 0);

    // Payment Attention List (customers with overdue payments)
    const overdueCustomers = ordersForDashboardMetrics
        .filter(o => o.balance > 0 && !isCancelledOrDeliveredStatus(o?.status))
        .map(o => {
            const customer = customers.find(c => c.id === o.customerId);
            const deliveryDate = getOrderDeliveryDate(o);
            const daysRemaining = getDaysRemaining(deliveryDate, overdueReferenceDate);
            const daysOverdue = daysRemaining !== null && daysRemaining < 0
                ? Math.abs(daysRemaining)
                : 0;
            return {
                orderId: o.id,
                customerName: o.customerName,
                mobile: customer?.mobile || o.customerMobile,
                amountDue: o.balance,
                daysOverdue
            };
        })
        .filter(c => c.daysOverdue > 0)
        .sort((a, b) => b.daysOverdue - a.daysOverdue)
        .slice(0, 5);

    // Order Health Overview
    const overdueOrdersCount = ordersForDashboardMetrics.filter(order => {
        if (isCancelledOrDeliveredStatus(order?.status)) {
            return false;
        }

        const deliveryDate = getOrderDeliveryDate(order);
        const daysRemaining = getDaysRemaining(deliveryDate, overdueReferenceDate);
        return daysRemaining !== null ? daysRemaining < 0 : false;
    }).length;
    const orderHealthData = { overdue: overdueOrdersCount };

    const recentOrders = recentApiOrders.length > 0 ? recentApiOrders : orders.slice(0, 10);
    const recentPayments = payments.slice(0, 10);

    const recentActivities = [
        ...orders.map(o => ({
            id: `ord-${o.id}`,
            type: 'order',
            title: `Order #${o.billNo} Created`,
            subtitle: `${o.customerName} - ₹${o.total}`,
            date: o.date || o.createdAt,
            timestamp: parseDate(o.date || o.createdAt).getTime(),
            icon: Clock,
            color: '#3B82F6',
            data: o
        })),
        ...payments.map(p => ({
            id: `pay-${p.id}`,
            type: 'payment',
            title: `Payment Received`,
            subtitle: `₹${p.amount} from ${orders.find(o => o.id === p.orderId)?.customerName || 'Unknown'}`,
            date: p.date,
            timestamp: parseDate(p.date).getTime(),
            icon: CreditCard,
            color: '#10B981',
            data: p
        }))
    ].sort((a, b) => b.timestamp - a.timestamp).slice(0, 20);

    const getStatusStyles = (status) => {
        switch (status) {
            case 'Yet to Start':
            case 'Pending':
                return { color: '#F97316', bg: '#FFF7ED' };
            case 'Stitching':
                return { color: '#3B82F6', bg: '#EFF6FF' };
            case 'Completed':
                return { color: '#22C55E', bg: '#F0FDF4' };
            case 'Cancelled':
                return { color: '#EF4444', bg: '#FEF2F2' };
            case 'Delivered':
                return { color: '#8B5CF6', bg: '#F5F3FF' };
            case 'In Progress':
                return { color: '#3B82F6', bg: '#EFF6FF' };
            default:
                return { color: '#6B7280', bg: '#F3F4F6' };
        }
    };
    
    const getStatusColor = (status) => getStatusStyles(status).color;

    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' });

    const MONTHS_F = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
        'August', 'September', 'October', 'November', 'December'];
    const MONTHS_S = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const showingDateStr = (() => {
        if (!appliedFilter) return now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        const f = appliedFilter;
        if (f.type === 'daily')
            return f.date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        if (f.type === 'monthly')
            return `${MONTHS_F[f.month]} ${f.year}`;
        if (f.type === 'yearly')
            return `${f.year}`;
        // custom
        const from = `${MONTHS_S[f.from.getMonth()]} ${f.from.getDate()}`;
        const to = `${MONTHS_S[f.to.getMonth()]} ${f.to.getDate()}, ${f.to.getFullYear()}`;
        return `${from} – ${to}`;
    })();

    // Business Snapshot Calculation (Monthly)
    const currentMonthOrders = orders.filter(o => {
        const d = parseDate(o.date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });

    const currentMonthTotal = payments.filter(p => {
        const pDate = parseDate(p.date);
        return pDate.getMonth() === now.getMonth() && pDate.getFullYear() === now.getFullYear();
    }).reduce((sum, p) => sum + p.amount, 0);

    const completedMonthOrders = currentMonthOrders.filter(o => o.status === 'Completed').length;
    const completionRate = currentMonthOrders.length > 0
        ? Math.round((completedMonthOrders / currentMonthOrders.length) * 100)
        : 0;

    const handleCall = (mobile) => Linking.openURL(`tel:${mobile}`);
    const handleWhatsApp = (mobile, name, amount) => {
        const text = `Hello ${name}, your payment of ₹${amount} is pending. Please pay at your earliest convenience.`;
        Linking.openURL(`whatsapp://send?phone=${mobile}&text=${encodeURIComponent(text)}`);
    };

    const filteredOrders = orders.filter(o =>
        (o.customerName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (o.billNo || '').toLowerCase().includes(searchQuery.toLowerCase())
    ).slice(0, 10);

    const filteredCustomers = customers.filter(c =>
        (c.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.mobile || '').includes(searchQuery)
    ).slice(0, 10);

    const getStatusDisplayText = (statusValue) => {
        if (!statusValue) return 'Yet to Start';
        const str = String(statusValue);
        const normalized = str.toUpperCase().trim();
        if (normalized === 'YET TO START' || normalized === 'PENDING') return 'Yet to Start';
        if (normalized === 'STITCHING' || normalized === 'IN PROGRESS') return 'Stitching';
        if (normalized === 'READY' || normalized === 'COMPLETED') return 'Ready';
        if (normalized === 'DELIVERED') return 'Delivered';
        if (normalized === 'CANCELLED') return 'Cancelled';
        return str.replace(/\w\S*/g, (t) => t.charAt(0).toUpperCase() + t.substr(1).toLowerCase());
    };

    const toggleExpand = (orderId) => {
        setExpandedOrders(prev => ({
            ...prev,
            [orderId]: !prev[orderId]
        }));
    };

    const renderItem = ({ item }) => {
        const orderItems = item.outfits || item.items || [];
        
        const trueOutfits = [];
        orderItems.forEach((outfit, index) => {
            const quantitySections = Array.isArray(outfit?.quantitySections) && outfit.quantitySections.length > 0
                ? outfit.quantitySections
                : getItemQuantitySections(outfit);
            
            const targetLen = quantitySections.length || parseInt(outfit.qty || outfit.quantity || outfit.qnt || outfit.count || 1);
            
            for (let i = 0; i < targetLen; i++) {
                const outfitName = targetLen > 1 ? `${outfit.name || outfit.item_name || outfit.type || 'Outfit'} ${i + 1}` : (outfit.name || outfit.item_name || outfit.type || `Outfit ${index + 1}`);
                const deliveryDate = (i < quantitySections.length ? quantitySections[i].delivery_date || quantitySections[i].deliveryDate : null) || outfit.delivery_date || outfit.deliveryDate || getOrderDeliveryDate(item) || null;
                
                if (i < quantitySections.length) {
                    trueOutfits.push({ name: outfitName, status: quantitySections[i].status || outfit.status || 'Yet to Start', deliveryDate });
                } else {
                    trueOutfits.push({ name: outfitName, status: outfit.status || 'Yet to Start', deliveryDate });
                }
            }
        });


        const rawBillNo = item.billNo || item.id;
        const formattedBillNo = formatOrderNumber(rawBillNo);
        const displayBillNo = formattedBillNo 
            ? (formattedBillNo.startsWith('ORD') ? `#${formattedBillNo}` : (formattedBillNo.startsWith('#') ? formattedBillNo : `#ORD${formattedBillNo}`)) 
            : 'N/A';

        const deliveryDateStr = getOrderDeliveryDate(item) ? formatDate(getOrderDeliveryDate(item)) : 'N/A';

        const urgencyItems = Array.isArray(item?.outfits || item?.items) ? (item.outfits || item.items) : [];
        const hasUrgentItem = urgencyItems.some((i) => (i.urgency === 'Urgent' || i.urgency === 'High') && getStatusDisplayText(i.status) !== 'Cancelled' && getStatusDisplayText(i.status) !== 'Delivered');
        const isUrgent = (item.urgency === 'Urgent' || item.urgency === 'High' || hasUrgentItem) && getStatusDisplayText(item.status) !== 'Cancelled' && getStatusDisplayText(item.status) !== 'Delivered';

        return (
            <TouchableOpacity
                style={[
                    styles.orderCard,
                    isUrgent && { borderColor: '#FECACA', borderWidth: 1 }
                ]}
                onPress={() => navigation.navigate('OrderDetail', { orderId: item.id })}
                activeOpacity={0.85}
            >
                <View style={{ paddingBottom: 10 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flexShrink: 1, paddingRight: 8 }}>
                            <Text style={[styles.customerNameText, { flexShrink: 1, fontFamily: 'Inter-SemiBold', fontWeight: '600', fontSize: 15, color: Colors.textPrimary }]} numberOfLines={1}>
                                {item.customerName || 'Unknown'}
                            </Text>
                            <Text style={{ fontFamily: 'Inter-Medium', fontSize: 14, color: '#94A3B8', marginHorizontal: 4 }}>•</Text>
                            <Text style={{ fontFamily: 'Inter-Medium', fontSize: 13, color: '#64748B' }}>
                                {displayBillNo}
                            </Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flexShrink: 0 }}>
                            <Text style={[styles.mainAmount, item.status === 'Cancelled' ? { textDecorationLine: 'line-through', color: '#94A3B8' } : { color: Colors.textPrimary, fontFamily: 'Inter-SemiBold', fontSize: 13 }]}>
                                Total: ₹{item.total?.toLocaleString() ?? 0}
                            </Text>
                            {item.status !== 'Cancelled' && item.balance > 0 ? (
                                <>
                                    <Text style={{ fontFamily: 'Inter-Medium', fontSize: 14, color: '#94A3B8', marginHorizontal: 4 }}>•</Text>
                                    <Text style={{ fontFamily: 'Inter-SemiBold', fontSize: 13, color: '#EF4444' }}>
                                        Bal: ₹{item.balance?.toLocaleString()}
                                    </Text>
                                </>
                            ) : item.status !== 'Cancelled' && item.balance === 0 ? (
                                <>
                                    <Text style={{ fontFamily: 'Inter-Medium', fontSize: 14, color: '#94A3B8', marginHorizontal: 4 }}>•</Text>
                                    <Text style={{ fontFamily: 'Inter-SemiBold', fontSize: 12, color: '#16A34A' }}>PAID</Text>
                                </>
                            ) : null}
                        </View>
                    </View>
                    {isUrgent && (
                        <View style={{ alignSelf: 'flex-start', backgroundColor: '#FEE2E2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 12, marginTop: 6, flexDirection: 'row', alignItems: 'center' }}>
                            <Flame size={12} color={Colors.danger} fill={Colors.danger} style={{ marginRight: 2 }} />
                            <Text style={{ fontFamily: 'Inter-Medium', fontSize: 10, color: Colors.danger }}>URGENT</Text>
                        </View>
                    )}
                </View>

                <View style={{ height: 1, backgroundColor: '#E2E8F0', marginBottom: 12 }} />

                {/* Table Header */}
                <View style={{ flexDirection: 'row', alignItems: 'center', paddingBottom: 8 }}>
                    <Text style={{ flex: 1.5, fontFamily: 'Inter-Medium', fontSize: 11, color: '#94A3B8' }}>OUTFIT</Text>
                    <Text style={{ flex: 1, fontFamily: 'Inter-Medium', fontSize: 11, color: '#94A3B8', textAlign: 'center' }}>DELIVERY</Text>
                    <Text style={{ flex: 1, fontFamily: 'Inter-Medium', fontSize: 11, color: '#94A3B8', textAlign: 'right' }}>STATUS</Text>
                </View>

                {/* Table Rows */}
                <View style={{ gap: 10 }}>
                    {trueOutfits.map((outfit, i) => {
                        const outStatus = getStatusDisplayText(outfit.status);
                        const outStyle = getStatusStyles(outStatus);
                        return (
                            <View key={i} style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <View style={{ flex: 1.5, paddingRight: 4 }}>
                                    <Text style={{ fontFamily: 'Inter-SemiBold', fontSize: 13, color: '#334155' }} numberOfLines={1}>
                                        {outfit.name}
                                    </Text>
                                </View>
                                
                                <View style={{ flex: 1, alignItems: 'center' }}>
                                    <Text style={{ fontFamily: 'Inter-Medium', fontSize: 12, color: '#64748B' }}>
                                        {outfit.deliveryDate ? formatDate(outfit.deliveryDate) : '-'}
                                    </Text>
                                </View>

                                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                                    <View style={{ backgroundColor: outStyle.bg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 }}>
                                        <Text style={{ fontFamily: 'Inter-SemiBold', fontSize: 10, color: outStyle.color }}>
                                            {outStatus.toUpperCase()}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        );
                    })}
                </View>
            </TouchableOpacity>
        );
    };

    const isInitialLoading =
        !hasLoadedOnce &&
        (screenLoading || dataLoading || insightsLoading || profileLoading || companyLoading);


    return (
        <View style={styles.container}>
            {/* Header - Daily First */}
            <View style={[styles.header, { paddingTop: insets.top }]}>
                <View style={styles.headerTop}>

                    <View style={styles.userInfo}>
                        <Image
                            source={require('../assets/logo.png')}
                            style={{ width: 140, height: 36 }}
                            resizeMode="contain"
                        />
                    </View>

                    <TouchableOpacity
                        style={[styles.notificationBtn, { backgroundColor: 'transparent' }]}
                        onPress={() => navigation.navigate('NotificationsScreen')}
                    >
                        <Bell size={24} color={Colors.primary} />
                        {unreadCount > 0 && (
                            <View style={styles.notificationBadge}>
                                <Text style={styles.notificationBadgeText}>
                                    {unreadCount > 99 ? '99+' : unreadCount}
                                </Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>

            </View>

            {isInitialLoading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                    <Text style={styles.loadingText}>Loading dashboard...</Text>
                </View>
            ) : (
                <>
            <View style={styles.filterRow}>
                <Text style={styles.filterRowText}>
                    Showing for <Text style={styles.filterRowDate}>{showingDateStr}</Text>
                </Text>
                <TouchableOpacity style={styles.filterChangeBtn} onPress={() => setIsFilterModalVisible(true)}>
                    <Feather name="filter" size={13} color={Colors.primary} />
                    <Text style={styles.filterChangeBtnText}>Change</Text>
                </TouchableOpacity>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefreshing}
                        onRefresh={() => {
                            refreshDashboardData({ showRefreshSpinner: true }).catch(error => {
                                console.log('Dashboard pull-to-refresh failed', error);
                            });
                        }}
                        colors={[Colors.primary]}
                        tintColor={Colors.primary}
                    />
                }
            >
                {isStaff && (
                    <View style={styles.clockCard}>
                        <View style={styles.clockInfo}>
                            <Text style={styles.clockTitle}>Daily Shift Attendance</Text>
                            <Text style={styles.clockSub}>
                                {todayAttendance?.checkIn
                                    ? `Clocked In: ${todayAttendance.checkIn}${todayAttendance.checkOut ? `  •  Out: ${todayAttendance.checkOut}` : ' (Active)'}`
                                    : 'Not clocked in yet'}
                            </Text>
                            {todayAttendance?.checkIn && !todayAttendance?.checkOut && (
                                <Text style={styles.timerDuration}>Duration: {elapsedTime}</Text>
                            )}
                        </View>
                        <TouchableOpacity
                            style={[
                                styles.clockBtn,
                                todayAttendance?.checkIn && !todayAttendance?.checkOut ? styles.clockBtnOut : todayAttendance?.checkOut ? styles.clockBtnDisabled : null
                            ]}
                            onPress={handleClockToggle}
                            disabled={!!todayAttendance?.checkOut}
                        >
                            <Feather name="clock" size={18} color="white" />
                            <Text style={styles.clockBtnText}>
                                {!todayAttendance ? 'Clock In' : !todayAttendance.checkOut ? 'Clock Out' : 'Done'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}

                {isStaff && (
                    <View style={styles.statsRow}>
                        <View style={{ flex: 1, padding: 12, borderRadius: 12, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' }}>
                            <View style={{ backgroundColor: '#EFF6FF', padding: 8, borderRadius: 10, marginBottom: 8 }}>
                                <ShoppingBag size={18} color="#3B82F6" />
                            </View>
                            <Text style={{ fontFamily: 'Inter-Bold', fontSize: 18, color: Colors.textPrimary }}>{staffOrdersCreatedCount}</Text>
                            <Text style={{ fontFamily: 'Inter-Medium', fontSize: 11, color: Colors.textSecondary, marginTop: 4 }}>Orders Taken</Text>
                        </View>
                        <View style={{ flex: 1, padding: 12, borderRadius: 12, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' }}>
                            <View style={{ backgroundColor: '#ECFDF5', padding: 8, borderRadius: 10, marginBottom: 8 }}>
                                <CheckCircle2 size={18} color="#10B981" />
                            </View>
                            <Text style={{ fontFamily: 'Inter-Bold', fontSize: 18, color: Colors.textPrimary }}>{staffOrdersCompletedCount}</Text>
                            <Text style={{ fontFamily: 'Inter-Medium', fontSize: 11, color: Colors.textSecondary, marginTop: 4 }}>Completed</Text>
                        </View>
                        <View style={{ flex: 1.2, padding: 12, borderRadius: 12, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' }}>
                            <View style={{ backgroundColor: '#FFFBEB', padding: 8, borderRadius: 10, marginBottom: 8 }}>
                                <IndianRupee size={18} color="#F59E0B" />
                            </View>
                            <Text style={{ fontFamily: 'Inter-Bold', fontSize: 16, color: Colors.textPrimary }} numberOfLines={1}>₹{staffTodaysCollection.toLocaleString('en-IN')}</Text>
                            <Text style={{ fontFamily: 'Inter-Medium', fontSize: 11, color: Colors.textSecondary, marginTop: 4 }} numberOfLines={1}>Collections</Text>
                        </View>
                    </View>
                )}
                {/* 0. Draft Order (Horizontal Scroll per Mockup) */}
                {drafts.length > 0 && (
                    <>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Draft Order</Text>
                            <View style={[styles.badge, { backgroundColor: '#FEE2E2' }]}>
                                <Text style={[styles.badgeText, { color: '#EF4444' }]}>{drafts.length}</Text>
                            </View>
                        </View>
                        <ScrollView
                            horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}
                        >
                            {drafts.map((draft, index) => (
                                <View key={index} style={styles.draftCard}>
                                    <View style={styles.draftInfo}>
                                        <Text style={styles.draftCustomer} numberOfLines={1}>
                                            {draft.state?.selectedCustomer?.name || draft.state?.customerName || 'Walking Customer'}
                                        </Text>
                                        <View style={styles.draftDetailRow}>
                                            <Shirt size={16} color="#94A3B8" />
                                            <Text style={styles.draftOutfit} numberOfLines={1}>
                                                {draft.state?.currentOutfit?.type || 'No selection'}
                                            </Text>
                                        </View>
                                        <Text style={styles.draftTime}>Last edited: {formatLastSaved(draft.lastSaved)}</Text>
                                    </View>

                                    <View style={styles.draftActionButtons}>
                                        <TouchableOpacity
                                            style={styles.draftCancelBtn}
                                            onPress={() => handleCancelDraft(index)}
                                        >
                                            <Text style={styles.draftCancelText}>Cancel</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.draftContinueBtn}
                                            onPress={() => handleContinueDraft(draft)}
                                        >
                                            <Text style={styles.draftContinueText}>Continue</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ))}
                        </ScrollView>
                    </>
                )}

                {/* 1. Today's Work Snapshot (Priority) */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Work / Orders</Text>
                </View>
                <View style={styles.statsGrid}>
                    {/* Yet to Start */}
                    <TouchableOpacity
                        style={[styles.statCard, styles.cardYetToStart]}
                        onPress={() => navigation.navigate('Orders', { screen: 'OrderList', params: { filterStatus: 'Yet to Start' } })}
                    >
                        <View style={styles.statCardTopRow}>
                            <View style={styles.statIconWrapper}>
                                <Clock size={16} color="#F97316" />
                            </View>
                            <ChevronRight size={16} color="#CBD5E1" />
                        </View>
                        <Text style={styles.statValue}>{yetToStartCount}</Text>
                        <Text style={styles.statLabel}>To Start</Text>
                    </TouchableOpacity>

                    {/* Stitching */}
                    <TouchableOpacity
                        style={[styles.statCard, styles.cardProgress]}
                        onPress={() => navigation.navigate('Orders', { screen: 'OrderList', params: { filterStatus: 'Stitching' } })}
                    >
                        <View style={styles.statCardTopRow}>
                            <View style={styles.statIconWrapper}>
                                <Scissors size={16} color="#3B82F6" />
                            </View>
                            <ChevronRight size={16} color="#CBD5E1" />
                        </View>
                        <Text style={styles.statValue}>{stitchingCount}</Text>
                        <Text style={styles.statLabel}>Stitching</Text>
                    </TouchableOpacity>

                    {/* Due Total */}
                    <TouchableOpacity
                        style={[styles.statCard, styles.cardDue]}
                        onPress={() => navigation.navigate('Orders', { screen: 'OrderList', params: { filterDueToday: true } })}
                    >
                        <View style={styles.statCardTopRow}>
                            <View style={styles.statIconWrapper}>
                                <Feather name="calendar" size={16} color="#F59E0B" />
                            </View>
                            <ChevronRight size={16} color="#CBD5E1" />
                        </View>
                        <Text style={styles.statValue}>{dueToday}</Text>
                        <Text style={styles.statLabel}>Due</Text>
                    </TouchableOpacity>

                    {/* Overdue */}
                    <TouchableOpacity
                        style={[styles.statCard, styles.cardOverdue]}
                        onPress={() => navigation.navigate('Orders', { screen: 'OrderList', params: { filterHealth: 'overdue' } })}
                    >
                        <View style={styles.statCardTopRow}>
                            <View style={styles.statIconWrapper}>
                                <Feather name="alert-circle" size={16} color="#E11D48" />
                            </View>
                            <ChevronRight size={16} color="#CBD5E1" />
                        </View>
                        <Text style={styles.statValue}>{orderHealthData.overdue}</Text>
                        <Text style={styles.statLabel}>Overdue</Text>
                    </TouchableOpacity>

                    {/* Completed */}
                    <TouchableOpacity
                        style={[styles.statCard, styles.cardCompleted]}
                        onPress={() => navigation.navigate('Orders', { screen: 'OrderList', params: { filterStatus: 'Completed' } })}
                    >
                        <View style={styles.statCardTopRow}>
                            <View style={styles.statIconWrapper}>
                                <Ionicons name="checkmark-circle-outline" size={18} color={Colors.success} />
                            </View>
                            <ChevronRight size={16} color="#CBD5E1" />
                        </View>
                        <Text style={styles.statValue}>{completedToday}</Text>
                        <Text style={styles.statLabel}>Completed</Text>
                    </TouchableOpacity>

                    {/* Delivered */}
                    <TouchableOpacity
                        style={[styles.statCard, styles.cardDelivered]}
                        onPress={() => navigation.navigate('Orders', { screen: 'OrderList', params: { filterStatus: 'Delivered' } })}
                    >
                        <View style={styles.statCardTopRow}>
                            <View style={styles.statIconWrapper}>
                                <Feather name="package" size={16} color="#8B5CF6" />
                            </View>
                            <ChevronRight size={16} color="#CBD5E1" />
                        </View>
                        <Text style={styles.statValue}>{deliveredCount}</Text>
                        <Text style={styles.statLabel}>Delivered</Text>
                    </TouchableOpacity>
                </View>

                {!isStaff && (
                    <>
                        {/* 2. Payments Section */}
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Payments</Text>
                        </View>
                        <View style={styles.paymentsCard}>
                            <View style={styles.paymentsTopRow}>
                                <TouchableOpacity
                                    style={styles.paymentsColItem}
                                    activeOpacity={0.7}
                                    onPress={() => navigation.navigate('Payments', { initialFilter: 'History' })}
                                >
                                    <View style={styles.paymentsColHeader}>
                                        <View style={styles.paymentsIconCircle}>
                                            <IndianRupee size={12} color="#64748B" />
                                        </View>
                                        <Text style={styles.paymentsColLabel}>TOTAL ORDERS</Text>
                                    </View>
                                    <Text style={styles.paymentsColValue}>₹{totalRevenue.toLocaleString()}</Text>
                                </TouchableOpacity>
                                <View style={styles.paymentsVertDivider} />
                                <TouchableOpacity
                                    style={styles.paymentsColItem}
                                    activeOpacity={0.7}
                                    onPress={() => navigation.navigate('Payments', { initialFilter: 'Paid' })}
                                >
                                    <View style={styles.paymentsColHeader}>
                                        <Feather name="check" size={14} color={Colors.success} />
                                        <Text style={[styles.paymentsColLabel, { color: Colors.success }]}>RECEIVED</Text>
                                    </View>
                                    <Text style={[styles.paymentsColValue, { color: Colors.success }]}>₹{totalCollected.toLocaleString()}</Text>
                                </TouchableOpacity>
                            </View>
                            <View style={styles.paymentsHorizDivider} />
                            <View style={styles.paymentsBottomRow}>
                                <TouchableOpacity
                                    activeOpacity={0.7}
                                    onPress={() => navigation.navigate('Payments', { initialFilter: 'Pending' })}
                                >
                                    <Text style={styles.paymentsPendingLabel}>PENDING AMOUNT</Text>
                                    <Text style={styles.paymentsPendingValue}>₹{pendingAmount.toLocaleString()}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.viewDetailsBtn}
                                    onPress={() => navigation.navigate('Payments', { initialFilter: 'History' })}
                                >
                                    <Text style={styles.viewDetailsBtnText}>View Details</Text>
                                    <ChevronRight size={14} color={Colors.primary} />
                                </TouchableOpacity>
                            </View>
                        </View>


                    </>
                )}

                {/* 4. Quick Actions */}
                <View style={styles.sectionContainer}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Quick Actions</Text>
                    </View>
                    <View style={[styles.quickActionsRow, { paddingHorizontal: Spacing.lg }]}>
                        <TouchableOpacity style={styles.quickActionBtn} onPress={() => setIsOrderTypeModalVisible(true)}>
                            <View style={[styles.qaIcon, { backgroundColor: Colors.primary }]}>
                                {/* <Plus size={24} color={Colors.white} /> */}
                                <Ionicons name="add" size={24} color={Colors.white} />
                            </View>
                            <Text style={styles.qaLabel}>New Order</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.quickActionBtn} onPress={() => navigation.navigate('AddCustomerScreen')}>
                            <View style={[styles.qaIcon, { backgroundColor: '#E0E7FF' }]}>
                                {/* <Ionicons name="person-add-outline" size={24} color="#4F46E5" /> */}
                                <Ionicons name="person-add" size={24} color="#4F46E5" />
                            </View>
                            <Text style={styles.qaLabel}>Add Customer</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.quickActionBtn} onPress={() => navigation.navigate('Payments', { initialFilter: 'Pending' })}>
                            <View style={[styles.qaIcon, { backgroundColor: '#FEF3C7' }]}>
                                {/* <Ionicons name="receipt-outline" size={24} color="#D97706" /> */}
                                <Ionicons name="cash" size={24} color="#D97706" />
                            </View>
                            <Text style={styles.qaLabel}>Collect</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.quickActionBtn} onPress={() => navigation.navigate('Orders', { screen: 'OrderList', params: { filterStatus: 'In Progress' } })}>
                            <View style={[styles.qaIcon, { backgroundColor: '#FCE7F3' }]}>
                                {/* <Ionicons name="calendar-outline" size={24} color="#DB2777" /> */}
                                <Ionicons name="calendar" size={24} color="#DB2777" />
                            </View>
                            <Text style={styles.qaLabel}>Deliveries</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* 5. Business Snapshot (Analytics) */}
                {/* <View style={styles.sectionContainer}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Business Snapshot (This Month)</Text>
                    </View>
                    <TouchableOpacity
                        style={[styles.analyticsCard, { marginHorizontal: Spacing.lg }]}
                        onPress={() => navigation.navigate('Analytics')}
                    >
                        <View style={styles.acRow}>
                            <View style={styles.acItem}>
                                <Text style={styles.acLabel}>Revenue</Text>
                                <Text style={styles.acValue}>₹{currentMonthTotal.toLocaleString()}</Text>
                            </View>
                            <View style={styles.moneyDivider} />
                            <View style={styles.acItem}>
                                <Text style={styles.acLabel}>Orders</Text>
                                <Text style={styles.acValue}>{currentMonthOrders.length}</Text>
                            </View>
                            <View style={styles.moneyDivider} />
                            <View style={styles.acItem}>
                                <Text style={styles.acLabel}>Completion</Text>
                                <Text style={[styles.acValue, { color: Colors.success }]}>{completionRate}%</Text>
                            </View>
                        </View>
                        <View style={styles.acFooter}>
                            <Text style={styles.acFooterText}>Tap for deep insights</Text>
                            <ChevronRight size={14} color={Colors.textSecondary} />
                        </View>
                    </TouchableOpacity>
                </View> */}

                {/* Recent Items Tabs */}
                <View style={styles.sectionContainer}>
                    <View style={styles.sectionHeader}>
                        <View style={styles.tabContainer}>
                            <TouchableOpacity
                                style={[styles.tab, activeRecentTab === 'orders' && styles.activeTab]}
                                onPress={() => setActiveRecentTab('orders')}
                            >
                                <Text style={[styles.tabText, activeRecentTab === 'orders' && styles.activeTabText]}>Recent Orders</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.tab, activeRecentTab === 'payments' && styles.activeTab]}
                                onPress={() => setActiveRecentTab('payments')}
                            >
                                <Text style={[styles.tabText, activeRecentTab === 'payments' && styles.activeTabText]}>Recent Payments</Text>
                            </TouchableOpacity>
                        </View>
                        <TouchableOpacity onPress={() => navigation.navigate(activeRecentTab === 'orders' ? 'Orders' : 'Payments')}>
                            <Text style={styles.seeAll}>See All</Text>
                        </TouchableOpacity>
                    </View>

                    {activeRecentTab === 'orders' ? (
                        recentOrders.length === 0 ? (
                            <View style={styles.emptyRecent}>
                                <Text style={styles.emptyText}>No recent orders</Text>
                            </View>
                        ) : (
                            <View style={styles.listContent}>
                                {recentOrders.map((item) => (
                                    <React.Fragment key={item.id}>
                                        {renderItem({ item })}
                                    </React.Fragment>
                                ))}
                                <View style={{ height: 160 }} />
                            </View>
                        )
                    ) : (
                        apiPayments.filter(p => Number(p.amount) > 0).slice(0, 5).length === 0 ? (
                            <View style={styles.emptyRecent}>
                                <Text style={styles.emptyText}>No recent payments</Text>
                            </View>
                        ) : (
                            apiPayments.filter(p => Number(p.amount) > 0).slice(0, 5).map((item, index) => {
                                const formattedDate = item.payment_date
                                    ? new Date(item.payment_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })
                                    : '';

                                const modeLabel = item.payment_mode || '';
                                const isUpi = modeLabel === 'UPI' || modeLabel === 'GPAY' || modeLabel === 'GPay';
                                const isCash = modeLabel === 'CASH' || modeLabel === 'Cash';

                                // Same logic as PaymentsScreen.js
                                let displayBillId = '';
                                if (item.bill_id && String(item.bill_id).includes('/')) {
                                    displayBillId = String(item.bill_id).toUpperCase();
                                } else {
                                    const parentOrder = orders.find(o => String(o.id) === String(item.order_id));
                                    const rawOrderNo = parentOrder?.bill_no || parentOrder?.billNo || item.bill_no || item.bill_id || item.order_id;
                                    const formattedOrderNo = formatOrderNumber(rawOrderNo);
                                    const ordPrefix = formattedOrderNo.startsWith('ORD') ? `#${formattedOrderNo}` : (formattedOrderNo.startsWith('#') ? formattedOrderNo : `#ORD${formattedOrderNo}`);
                            
                                    const orderPayments = [...apiPayments].filter(p => Number(p.amount) > 0 && String(p.order_id) === String(item.order_id))
                                        .sort((a, b) => new Date(a.payment_date || a.created_at) - new Date(b.payment_date || b.created_at) || (a.id - b.id));
                                    
                                    const paymentIndex = orderPayments.findIndex(p => String(p.id) === String(item.id)) + 1;
                                    const seqNum = paymentIndex > 0 ? paymentIndex : 1;
                            
                                    displayBillId = `${ordPrefix}/#BILL${seqNum}`.toUpperCase();
                                }

                                return (
                                    <TouchableOpacity
                                        key={item.payment_id || index}
                                        style={[{ backgroundColor: Colors.white, borderRadius: 12, padding: 16, marginBottom: Spacing.sm, borderWidth: 1, borderColor: '#F1F5F9', marginHorizontal: 20 }, Shadow.subtle]}
                                        onPress={() => item.payment_id && navigation.navigate('PaymentDetail', { paymentId: item.payment_id })}
                                        activeOpacity={0.85}
                                    >
                                        {/* Row 1: Customer Name & Order ID */}
                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            <Text style={{ fontFamily: 'Inter-Bold', fontSize: 15, color: '#0F172A', maxWidth: '60%' }} numberOfLines={1}>{item.customer_name || 'Unknown'}</Text>
                                            <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: '#CBD5E1', marginHorizontal: 8 }} />
                                            <Text style={{ fontFamily: 'Inter-Medium', fontSize: 13, color: '#64748B' }}>{displayBillId}</Text>
                                        </View>

                                        {/* Divider */}
                                        <View style={{ height: 1, backgroundColor: '#F1F5F9', marginVertical: 8 }} />

                                        {/* Row 2: Date | Mode | Type */}
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                <Text style={{ fontFamily: 'Inter-Medium', fontSize: 12, color: '#64748B' }}>{formattedDate}</Text>
                                                
                                                <View style={{ width: 1, height: 12, backgroundColor: '#CBD5E1', marginHorizontal: 8 }} />
                                                
                                                <Text style={[{ fontFamily: 'Inter-SemiBold', fontSize: 12 }, { color: isUpi ? '#4F46E5' : isCash ? '#16A34A' : Colors.textSecondary }]}>
                                                    {modeLabel}
                                                </Text>
                                                
                                                {item.order_type && (
                                                    <>
                                                        <View style={{ width: 1, height: 12, backgroundColor: '#CBD5E1', marginHorizontal: 8 }} />
                                                        <Text style={{ fontFamily: 'Inter-Medium', fontSize: 12, color: '#64748B' }}>{item.order_type.toUpperCase()}</Text>
                                                    </>
                                                )}
                                            </View>
                                            
                                            {/* Amount */}
                                            <Text style={{ fontFamily: 'Inter-Bold', fontSize: 15, color: '#0F172A' }}>₹{item.amount?.toLocaleString()}</Text>
                                        </View>
                                    </TouchableOpacity>
                                );
                            })
                        )
                    )}
                </View>

                {/* <View style={{ height: 40 }} /> */}
            </ScrollView>
                </>
            )}

            {/* Search Modal */}
            <Modal
                visible={isSearchVisible}
                animationType="fade"
                transparent={true}
                onRequestClose={() => {
                    setIsSearchVisible(false);
                    setSearchQuery('');
                }}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.searchContainer}>
                        <View style={styles.searchHeader}>
                            <View style={styles.searchBar}>
                                <Search size={18} color={Colors.textSecondary} />
                                {/* <Ionicons name="search" size={18} color={Colors.textSecondary} style={{ marginRight: Spacing.sm }} /> */}
                                <TextInput
                                    style={styles.searchInput}
                                    placeholderTextColor={Colors.textSecondary}
                                    placeholder="Search Order No or Customer..."
                                    value={searchQuery}
                                    onChangeText={setSearchQuery}
                                    autoFocus
                                />
                                {searchQuery.length > 0 && (
                                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                                        <Ionicons name="close-circle-outline" size={18} color={Colors.textSecondary} />
                                    </TouchableOpacity>
                                )}
                            </View>
                            <TouchableOpacity onPress={() => {
                                setIsSearchVisible(false);
                                setSearchQuery('');
                            }}>
                                <Text style={styles.cancelText}>Cancel</Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.searchResults}>
                            {searchQuery.length > 1 && (
                                <>
                                    {filteredOrders.length > 0 && (
                                        <View style={styles.searchSection}>
                                            <Text style={styles.searchSectionTitle}>Orders</Text>
                                            {filteredOrders.map(o => (
                                                <TouchableOpacity
                                                    key={o.id}
                                                    style={styles.searchResultItem}
                                                    onPress={() => {
                                                        setIsSearchVisible(false);
                                                        setSearchQuery('');
                                                        navigation.navigate('OrderDetail', { orderId: o.id });
                                                    }}
                                                >
                                                    <View style={styles.searchResultIcon}>
                                                        {/* <ReceiptIndianRupee size={18} color={Colors.primary} /> */}
                                                        <Ionicons
                                                            name="receipt"
                                                            size={20}
                                                            color={Colors.textSecondary}
                                                        />
                                                    </View>
                                                    <View>
                                                        <Text style={styles.searchResultTitle}>Order #{o.billNo}</Text>
                                                        <Text style={styles.searchResultSub}>{formatDate(o.date)} • {o.customerName}</Text>
                                                    </View>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    )}

                                    {filteredCustomers.length > 0 && (
                                        <View style={styles.searchSection}>
                                            <Text style={styles.searchSectionTitle}>Customers</Text>
                                            {filteredCustomers.map(c => (
                                                <TouchableOpacity
                                                    key={c.id}
                                                    style={styles.searchResultItem}
                                                    onPress={() => {
                                                        setIsSearchVisible(false);
                                                        setSearchQuery('');
                                                        navigation.navigate('Customers', { screen: 'CustomerDetail', params: { customer: c } });
                                                    }}
                                                >
                                                    <View style={[styles.searchResultIcon, { backgroundColor: '#EFF6FF' }]}>
                                                        <Users size={18} color="#3B82F6" />
                                                    </View>
                                                    <View>
                                                        <Text style={styles.searchResultTitle}>{c.name}</Text>
                                                        <Text style={styles.searchResultSub}>{c.mobile}</Text>
                                                    </View>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    )}

                                    {filteredOrders.length === 0 && filteredCustomers.length === 0 && (
                                        <View style={styles.noResults}>
                                            <Text style={styles.noResultsText}>No results found for "{searchQuery}"</Text>
                                        </View>
                                    )}
                                </>
                            )}
                            {searchQuery.length <= 1 && (
                                <View style={styles.emptySearchState}>
                                    <View style={styles.searchPlaceholderIcon}>
                                        <Search size={40} color={Colors.border} />
                                        {/* <Ionicons name="search" size={40} color={Colors.border} /> */}
                                    </View>
                                    <Text style={styles.searchPlaceholderText}>Start typing to search bills or customers</Text>
                                </View>
                            )}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Activity Modal */}
            <Modal
                visible={isActivityVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setIsActivityVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.bottomSheet}>
                        <View style={styles.sheetHeader}>
                            <View style={styles.sheetHandle} />
                            <View style={styles.sheetHeaderRow}>
                                <Text style={styles.sheetTitle}>Recent Activity</Text>
                                <TouchableOpacity onPress={() => setIsActivityVisible(false)}>
                                    <Ionicons name="close" size={24} color={Colors.textPrimary} />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <ScrollView style={styles.activityList} contentContainerStyle={{ paddingBottom: 40 }}>
                            {recentActivities.length === 0 ? (
                                <View style={styles.noActivity}>
                                    {/* <Bell size={40} color={Colors.border} /> */}
                                    <Ionicons name="notifications-outline" size={40} color={Colors.border} />
                                    <Text style={styles.noActivityText}>No recent activity yet</Text>
                                </View>
                            ) : (
                                recentActivities.map(activity => (
                                    <View key={activity.id} style={styles.activityItem}>
                                        <View style={[styles.activityIcon, { backgroundColor: activity.type === 'payment' ? '#DCFCE7' : '#EFF6FF' }]}>
                                            {activity.type === 'payment' ? (
                                                <Ionicons name="cash" size={20} color="#10B981" />
                                            ) : (
                                                <Ionicons name="receipt" size={20} color="#3B82F6" />
                                            )}
                                        </View>
                                        <View style={styles.activityContent}>
                                            <Text style={styles.activityText}>
                                                <Text style={styles.boldText}>{activity.title}</Text>
                                            </Text>
                                            <Text style={[styles.activityText, { fontSize: 13, color: Colors.textSecondary, marginTop: 2 }]}>
                                                {activity.subtitle}
                                            </Text>
                                            <Text style={styles.activityTime}>{formatDate(activity.date)}</Text>
                                        </View>
                                    </View>
                                ))
                            )}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* New Order Type Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={isOrderTypeModalVisible}
                onRequestClose={() => setIsOrderTypeModalVisible(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setIsOrderTypeModalVisible(false)}
                >
                    <View style={styles.bottomSheetContent}>
                        <View style={styles.notch} />

                        <View style={styles.sheetHeaderRow}>
                            <View>
                                <Text style={styles.mainTitle}>Create New</Text>
                                <Text style={styles.subTitle}>Select an order type to begin</Text>
                            </View>
                            <TouchableOpacity onPress={() => setIsOrderTypeModalVisible(false)} style={styles.closeBtn}>
                                <X size={28} color={Colors.textPrimary} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.optionsList}>
                            <TouchableOpacity
                                onPress={() => {
                                    setIsOrderTypeModalVisible(false);
                                    navigation.navigate('CreateOrderFlow');
                                }}
                                style={[styles.optionCard, { backgroundColor: '#F5F3FF' }]}
                            >
                                <View style={[styles.iconContainerBox, { backgroundColor: Colors.primary }]}>
                                    <Scissors size={26} color="#ffffff" strokeWidth={2.5} />
                                </View>
                                <View style={styles.textContainerCenter}>
                                    <Text style={styles.optionTitleText}>Tailoring Order</Text>
                                    <Text style={styles.optionDescriptionText}>Custom measurements & design for stitching.</Text>
                                </View>
                                <View style={[styles.arrowIconBg, { backgroundColor: '#ffffff' }]}>
                                    <ChevronRight size={18} color={Colors.primary} />
                                </View>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => {
                                    setIsOrderTypeModalVisible(false);
                                    navigation.navigate('SalesOrder');
                                }}
                                style={[styles.optionCard, { backgroundColor: '#F0FDF4' }]}
                            >
                                <View style={[styles.iconContainerBox, { backgroundColor: Colors.success }]}>
                                    <ShoppingBag size={26} color="#ffffff" strokeWidth={2.5} />
                                </View>
                                <View style={styles.textContainerCenter}>
                                    <Text style={styles.optionTitleText}>Sales Order</Text>
                                    <Text style={styles.optionDescriptionText}>Sell materials & readymade products.</Text>
                                </View>
                                <View style={[styles.arrowIconBg, { backgroundColor: '#ffffff' }]}>
                                    <ChevronRight size={18} color={Colors.success} />
                                </View>
                            </TouchableOpacity>
                        </View>

                        <View style={{ height: Math.max(insets.bottom, 36) + 30 }} />
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Dashboard Date Filter Modal */}
            <DashboardFilterModal
                visible={isFilterModalVisible}
                onClose={() => setIsFilterModalVisible(false)}
                onApply={(filter) => {
                    setAppliedFilter(filter);
                    setIsFilterModalVisible(false);
                    refreshDashboardData({ filterOverride: filter }).catch(error => {
                        console.log('Dashboard filter refresh failed', error);
                    });
                }}
            />
        </View>
    );
};


const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC', // Slightly cooler white for premium feel
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: Spacing.lg,
    },
    loadingText: {
        marginTop: Spacing.md,
        fontSize: 14,
        fontFamily: 'Inter-Medium',
        color: Colors.textSecondary,
    },
    header: {
        backgroundColor: Colors.white,
        paddingHorizontal: Spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
    },
    dateText: {
        fontSize: 13,
        fontFamily: 'Inter-Medium',
        color: Colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 4,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        flex: 1,
        marginRight: 15,
    },
    greeting: {
        fontSize: 20,
        fontFamily: 'Inter-Regular',
        color: Colors.textPrimary,
        letterSpacing: -0.5,
    },
    companyName: {
        fontSize: 20,
        fontFamily: 'Inter-Bold',
        color: Colors.textPrimary,
        letterSpacing: -0.5,
        flex: 1,
    },
    profileBtn: {
        // No extra shadow here if it's inside avatar
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 14, // Squircle-ish
        backgroundColor: Colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        ...Shadow.subtle,
    },
    profileImageHeader: {
        width: 44,
        height: 44,
        borderRadius: 14,
    },
    avatarText: {
        fontSize: 18,
        fontFamily: 'Inter-Bold',
        color: Colors.white,
    },
    scrollContent: {
        paddingTop: 0,
        // paddingBottom: 40,   
    },
    toolBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        gap: 12,
    },
    searchBarButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.white,
        height: 46,
        borderRadius: 12,
        paddingHorizontal: 16,
        gap: 10,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },

    iconBtn: {
        width: 46,
        height: 46,
        borderRadius: 12,
        backgroundColor: Colors.white,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    // Update Banner Styles
    updateBanner: {
        marginHorizontal: Spacing.lg,
        marginBottom: Spacing.lg,
        backgroundColor: '#EFF6FF',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#BFDBFE',
        overflow: 'hidden'
    },
    updateContent: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        gap: 12
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Colors.primary,
        alignItems: 'center',
        justifyContent: 'center'
    },
    updateTitle: {
        fontFamily: 'Inter-Bold',
        fontSize: 15,
        color: '#1E3A8A'
    },
    updateSubtitle: {
        fontFamily: 'Inter-Medium',
        fontSize: 13,
        color: '#3B82F6'
    },
    updateButton: {
        backgroundColor: Colors.primary,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8
    },
    updateButtonText: {
        color: Colors.white,
        fontFamily: 'Inter-SemiBold',
        fontSize: 14
    },
    sectionContainer: {
        marginTop: 20,
        marginBottom: 24,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: Spacing.lg,
        marginBottom: 12,
        marginTop: "5%"
    },
    sectionTitle: {
        fontFamily: 'Inter-Bold',
        fontSize: 18,
        color: '#0F172A',

    },
    seeAll: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 13,
        color: Colors.primary,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: Spacing.lg,
        gap: 12,
        marginBottom: 24,
    },
    statCard: {
        width: (width - (Spacing.lg * 2) - 12) / 2, // 2 columns for full width utilization
        backgroundColor: Colors.white,
        borderRadius: 12,
        padding: 16,
        ...Shadow.subtle,
        borderWidth: 1,
        borderColor: '#E2E8F0', // clean light border
    },
    cardYetToStart: {
        // removed colored background
    },
    cardDue: {
        // removed colored background
    },
    cardOverdue: {
        // removed colored background
    },
    cardProgress: {
        // removed colored background
    },
    cardCompleted: {
        // removed colored background
    },
    cardDelivered: {
        // removed colored background
    },
    cardMoney: {
        backgroundColor: '#EFF6FF',
        borderColor: '#BFDBFE',
    },
    statIconWrapper: {
        alignSelf: 'flex-start',
    },
    statValue: {
        fontSize: 24,
        fontFamily: 'Inter-Bold',
        color: '#0F172A',
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 13,
        fontFamily: 'Inter-Medium',
        color: '#64748B',
    },
    // Pending Banner
    pendingBanner: {
        marginHorizontal: Spacing.lg,
        backgroundColor: '#0F172A', // Dark theme
        borderRadius: 20,
        padding: 20,
        marginBottom: 24,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        ...Shadow.medium,
    },
    pendingLabel: {
        color: '#94A3B8',
        fontSize: 13,
        fontFamily: 'Inter-Medium',
        marginBottom: 4,
    },
    pendingValue: {
        color: Colors.white,
        fontSize: 24,
        fontFamily: 'Inter-Bold',
    },
    pendingAction: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.1)',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        gap: 4,
    },
    pendingActionText: {
        color: Colors.white,
        fontFamily: 'Inter-SemiBold',
        fontSize: 13,
    },
    // Attention Section
    horizontalScroll: {
        paddingLeft: Spacing.lg,
        paddingRight: Spacing.lg,
    },
    badge: {
        backgroundColor: '#FEF2F2',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#FECACA',
    },
    badgeText: {
        fontFamily: 'Inter-Bold',
        fontSize: 12,
        color: Colors.danger,
    },
    overdueCard: {
        width: 160,
        backgroundColor: Colors.white,
        borderRadius: 16,
        padding: 16,
        marginRight: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        ...Shadow.subtle,
    },
    overdueHeader: {
        backgroundColor: '#FEF2F2',
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        marginBottom: 12,
    },

    overdueName: {
        fontSize: 15,
        fontFamily: 'Inter-SemiBold',
        color: Colors.textPrimary,
        marginBottom: 4,
    },
    overdueAmount: {
        fontSize: 18,
        fontFamily: 'Inter-Bold',
        color: Colors.textPrimary,
        marginBottom: 12,
    },
    collectBtn: {
        backgroundColor: Colors.textPrimary,
        borderRadius: 10, // Pill shape
        paddingVertical: 8,
        alignItems: 'center',
    },
    collectBtnText: {
        color: Colors.white,
        fontSize: 13,
        fontFamily: 'Inter-SemiBold',
    },
    // Recent Orders List Styling
    orderListItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.white,
        marginHorizontal: Spacing.lg,
        marginBottom: 10,
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#F1F5F9', // Very subtle border
        ...Shadow.subtle, // Very subtle shadow
    },
    orderListIcon: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: '#F8FAFC',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    orderListId: {
        fontSize: 13,
        fontFamily: 'Inter-Bold',
        color: '#64748B',
    },
    orderListContent: {
        flex: 1,
        justifyContent: 'center',
    },
    orderListName: {
        fontSize: 16,
        fontFamily: 'Inter-SemiBold',
        color: '#0F172A',
        marginBottom: 2,
    },
    orderListDate: {
        fontSize: 13,
        fontFamily: 'Inter-Regular',
        color: '#64748B',
    },
    orderListRight: {
        alignItems: 'flex-end',
        gap: 6,
    },
    orderListAmount: {
        fontSize: 16,
        fontFamily: 'Inter-Bold',
        color: '#0F172A',
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    emptyRecent: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        height: 100,
    },
    emptyText: {
        color: Colors.textSecondary,
        fontFamily: 'Inter-Medium',
    },
    // Search & Modals (Keep roughly same structure but updated padding)
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-start',
    },
    searchContainer: {
        backgroundColor: Colors.white,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingBottom: 20,
        maxHeight: '80%',
    },
    searchHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.lg,
        gap: 12,
        marginBottom: 16,
    },
    searchBar: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 48,
        gap: 8,
    },
    searchInput: {
        flex: 1,
        fontFamily: 'Inter-Regular',
        fontSize: 16,
        color: Colors.textPrimary,
    },
    cancelText: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 16,
        color: Colors.primary,
    },
    searchResults: {
        paddingHorizontal: Spacing.lg,
    },
    searchSection: {
        marginBottom: 24,
    },
    searchSectionTitle: {
        fontFamily: 'Inter-Bold',
        fontSize: 14,
        color: Colors.textSecondary,
        marginBottom: 12,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    searchResultItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
        gap: 16,
    },
    searchResultIcon: {
        width: 40,
        height: 40,
        borderRadius: 10,
        backgroundColor: '#EEF2FF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    searchResultTitle: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 16,
        color: Colors.textPrimary,
    },
    searchResultSub: {
        fontFamily: 'Inter-Regular',
        fontSize: 14,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    noResults: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    noResultsText: {
        fontFamily: 'Inter-Regular',
        fontSize: 16,
        color: Colors.textSecondary,
    },
    searchPlaceholder: {
        fontSize: 14,
        color: '#94A3B8',
        fontFamily: 'Inter-Regular',
    },
    emptySearchState: {
        alignItems: 'center',
        paddingVertical: 60,
        gap: 16,
    },
    // Modal Styles
    bottomSheetContent: {
        backgroundColor: Colors.white,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        paddingHorizontal: 20,
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        ...Shadow.large,
    },
    notch: {
        width: 40,
        height: 5,
        backgroundColor: '#e5e7eb',
        borderRadius: 3,
        alignSelf: 'center',
        marginTop: 12,
    },
    mainTitle: {
        fontSize: 28,
        fontFamily: 'Inter-Bold',
        color: Colors.textPrimary,
    },
    subTitle: {
        fontSize: 16,
        fontFamily: 'Inter-Medium',
        color: Colors.textSecondary,
        marginTop: 4,
    },
    closeBtn: {
        padding: 4,
    },
    optionsList: {
        gap: 16,
        marginTop: 10,
    },
    optionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.02)',
    },
    iconContainerBox: {
        width: 54,
        height: 54,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    optionIconImg: {
        width: 32,
        height: 32,
    },
    textContainerCenter: {
        flex: 1,
        marginLeft: 14,
        marginRight: 8,
    },
    optionTitleText: {
        fontSize: 18,
        fontFamily: 'Inter-Bold',
        color: Colors.textPrimary,
    },
    optionDescriptionText: {
        fontSize: 13,
        fontFamily: 'Inter-Medium',
        color: Colors.textSecondary,
        marginTop: 2,
        lineHeight: 18,
    },
    arrowIconBg: {
        height: 28,
        width: 28,
        borderRadius: 14,
        backgroundColor: '#F1F5F9',
        justifyContent: 'center',
        alignItems: 'center',
    },
    // Filter row in header
    filterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 14,
        paddingHorizontal: Spacing.lg
    },
    filterRowText: {
        fontFamily: 'Inter-Regular',
        fontSize: 14,
        color: Colors.textSecondary,
    },
    filterRowDate: {
        fontFamily: 'Inter-SemiBold',
        color: Colors.textPrimary,
    },
    filterChangeBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 15,
        paddingHorizontal: 10,
        paddingVertical: 5,
        backgroundColor: '#f6faff',
    },
    filterChangeBtnText: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 13,
        color: Colors.primary,
    },
    // Stat card top row with chevron
    statCardTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    // Payments Card
    paymentsCard: {
        backgroundColor: Colors.white,
        borderRadius: 16,
        padding: 20,
        marginBottom: 24,
        marginHorizontal: Spacing.lg,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        ...Shadow.subtle,
    },
    paymentsTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    paymentsColItem: {
        flex: 1,
    },
    paymentsColHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        marginBottom: 6,
    },
    paymentsIconCircle: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#CBD5E1',
        justifyContent: 'center',
        alignItems: 'center',
    },
    paymentsColLabel: {
        fontFamily: 'Inter-Medium',
        fontSize: 11,
        color: '#64748B',
        letterSpacing: 0.3,
    },
    paymentsColValue: {
        fontFamily: 'Inter-Bold',
        fontSize: 18,
        color: Colors.textPrimary,
    },
    paymentsVertDivider: {
        width: 1,
        height: 40,
        backgroundColor: '#E2E8F0',
        marginHorizontal: 16,
    },
    paymentsHorizDivider: {
        height: 1,
        backgroundColor: '#E2E8F0',
        marginVertical: 16,
    },
    paymentsBottomRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    paymentsPendingLabel: {
        fontFamily: 'Inter-Medium',
        fontSize: 11,
        color: '#64748B',
        letterSpacing: 0.3,
        marginBottom: 4,
    },
    paymentsPendingValue: {
        fontFamily: 'Inter-Bold',
        fontSize: 20,
        color: Colors.danger,
    },
    viewDetailsBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#EFF6FF',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    viewDetailsBtnText: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 13,
        color: Colors.primary,
    },
    // New Styles for Daily-First Layout
    moneySnapshot: {
        backgroundColor: Colors.white,
        borderRadius: 16,
        padding: 20,
        marginBottom: 24,
        marginHorizontal: Spacing.lg, // Align with other cards
        borderWidth: 1,
        borderColor: '#E2E8F0',
        ...Shadow.subtle,
    },
    moneyRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    moneyItem: {
        flex: 1,
        alignItems: 'center',
    },
    moneyLabel: {
        fontFamily: 'Inter-Medium',
        fontSize: 13,
        color: Colors.textSecondary,
        marginBottom: 4,
    },
    moneyValue: {
        fontFamily: 'Inter-Bold',
        fontSize: 20,
        color: Colors.textPrimary,
    },
    moneyDivider: {
        width: 1,
        height: 30,
        backgroundColor: '#E2E8F0',
    },
    // Overdue Actionable
    overdueCardActionable: {
        width: width * 0.75,
        backgroundColor: Colors.white,
        borderRadius: 16,
        padding: 16,
        marginRight: 12,
        borderWidth: 1,
        borderColor: '#FEE2E2',
        ...Shadow.subtle,
    },
    overdueHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    overdueDays: {
        fontFamily: 'Inter-Medium',
        fontSize: 12,
        color: Colors.danger,
        backgroundColor: '#FEF2F2',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
        overflow: 'hidden',
    },
    overdueAmountLarge: {
        fontFamily: 'Inter-Bold',
        fontSize: 22,
        color: Colors.textPrimary,
        marginBottom: 16,
    },
    actionRow: {
        flexDirection: 'row',
        gap: 8,
    },
    actionBtn: {
        width: 40,
        height: 40,
        borderRadius: 10, // Squircle
        justifyContent: 'center',
        alignItems: 'center',
    },
    markPaidBtn: {
        flex: 1,
        backgroundColor: Colors.primary,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        height: 40,
    },
    markPaidText: {
        fontFamily: 'Inter-SemiBold',
        color: Colors.white,
        fontSize: 14,
    },
    // Quick Actions
    quickActionsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    quickActionBtn: {
        flex: 1,
        alignItems: 'center',
        gap: 8,
    },
    qaIcon: {
        width: 56,
        height: 56,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        ...Shadow.subtle,
    },
    qaLabel: {
        fontFamily: 'Inter-Medium',
        fontSize: 12,
        color: Colors.textPrimary,
        marginTop: 4,
    },
    // Analytics Card
    analyticsCard: {
        backgroundColor: Colors.white,
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        ...Shadow.subtle,
    },
    acRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    acItem: {
        alignItems: 'center',
        flex: 1,
    },
    acLabel: {
        fontFamily: 'Inter-Medium',
        fontSize: 12,
        color: Colors.textSecondary,
        marginBottom: 4,
    },
    acValue: {
        fontFamily: 'Inter-Bold',
        fontSize: 18,
        color: Colors.textPrimary,
    },
    acFooter: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
        paddingTop: 12,
        gap: 4,
    },
    acFooterText: {
        fontFamily: 'Inter-Medium',
        fontSize: 12,
        color: Colors.textSecondary,
    },
    // Helper Text for search
    searchPlaceholderIcon: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    searchPlaceholderText: {
        fontFamily: 'Inter-Medium',
        fontSize: 16,
        color: Colors.textSecondary,
        textAlign: 'center',
        maxWidth: 200,
    },
    bottomSheet: {
        backgroundColor: Colors.white,
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        maxHeight: '80%',
        ...Shadow.large,
    },
    sheetHeader: {
        padding: 24,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    sheetHandle: {
        width: 40,
        height: 4,
        backgroundColor: '#E2E8F0',
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 20,
    },
    sheetHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    sheetTitle: {
        fontFamily: 'Inter-Bold',
        fontSize: 20,
        color: Colors.textPrimary,
    },
    activityList: {
        padding: 24,
    },
    activityItem: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 24,
    },
    activityIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    activityContent: {
        flex: 1,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
        paddingBottom: 24,
    },
    activityText: {
        fontFamily: 'Inter-Regular',
        fontSize: 15,
        color: Colors.textPrimary,
        lineHeight: 22,
    },
    boldText: {
        fontFamily: 'Inter-Bold',
        color: Colors.textPrimary,
    },
    activityTime: {
        fontFamily: 'Inter-Medium',
        fontSize: 13,
        color: Colors.textSecondary,
        marginTop: 4,
    },
    noActivity: {
        alignItems: 'center',
        paddingVertical: 40,
        gap: 16,
    },
    noActivityText: {
        fontFamily: 'Inter-Medium',
        fontSize: 16,
        color: Colors.textSecondary,
    },
    tabContainer: {
        flexDirection: 'row',
        gap: Spacing.md,
    },
    tab: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 20,
        backgroundColor: '#F1F5F9',
    },
    activeTab: {
        backgroundColor: Colors.primary,
    },
    tabText: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 13,
        color: Colors.textSecondary,
    },
    activeTabText: {
        color: Colors.white,
    },



    //recent order
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 14,
        marginBottom: 12,
        overflow: 'hidden',
        marginLeft: 20,
        marginRight: 20,
        ...Shadow.subtle
    },
    rowBetween: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    orderNo: {
        color: '#777',
        fontSize: 14,
        paddingLeft: 5, paddingRight: 5
    },
    itemsBadge: {
        backgroundColor: '#ECEBFF',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        flexDirection: 'row',
    },
    itemsText: {
        color: '#908B95',
        fontSize: 14,
        fontWeight: '600',
    },
    name: {
        fontSize: 18,
        fontWeight: '600',
        marginTop: 6,
    },
    delivery: {
        fontSize: 14,
        color: '#777',
        // marginTop: 4,
    },

    due: {
        color: '#E53935',
        fontWeight: '600',
        fontSize: 18
    },


    //recent order
    orderCard: {
        backgroundColor: Colors.white,
        borderRadius: 16,
        marginBottom: 16,
        padding: 16,
        ...Shadow.subtle,
        borderWidth: 1,
        borderColor: Colors.border,
        marginLeft: 20,
        marginRight: 20,
    },
    orderHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    billNo: {
        fontFamily: 'Inter-Bold',
        fontSize: 16,
        color: Colors.textPrimary,
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
    },
    statusText: {
        fontSize: 10,
        fontFamily: 'Inter-Bold',
        fontWeight: '700',
        color: Colors.textSecondary,
    },
    orderContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    customerName: {
        fontFamily: 'Inter-Bold',
        fontSize: 16,
        color: Colors.textPrimary,
        marginBottom: 4,
        fontWeight: '700',
    },
    dateRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 3
    },
    dateText1: {
        fontFamily: 'Inter-Medium',
        fontSize: 14,
        color: Colors.textSecondary,
    },
    amountArea: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    amount: {
        fontFamily: 'Inter-Bold',
        fontSize: 16,
        color: Colors.textPrimary,
        fontWeight: 'bold',
    },
    balanceTag: {
        fontFamily: 'Inter-Medium',
        fontSize: 12,
        color: Colors.danger,
    },
    // Draft Styles
    draftContainer: {
        marginBottom: 20,
        marginHorizontal: 16,
    },
    draftCard: {
        backgroundColor: 'white',
        borderRadius: 20, // Match statCard
        padding: 16,
        borderWidth: 1,
        borderColor: '#FEE2E2',
        width: width * 0.75, // Match overdueCardActionable
        marginRight: 16, // Match statsGrid gap
    },
    draftInfo: {
        marginBottom: 16,
    },
    draftCustomer: {
        fontSize: 18,
        fontFamily: 'Inter-Bold',
        color: '#1E293B',
        marginBottom: 2,
    },
    draftDetailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 2,
    },
    draftOutfit: {
        fontSize: 14,
        fontFamily: 'Inter-Medium',
        color: '#64748B',
    },
    draftTime: {
        fontSize: 11,
        fontFamily: 'Inter-Regular',
        color: '#94A3B8',
        marginTop: 6,
    },
    draftActionButtons: {
        flexDirection: 'row',
        gap: 8,
    },
    draftCancelBtn: {
        flex: 1,
        height: 40, // Match markPaidBtn
        backgroundColor: '#E2E8F0',
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    draftCancelText: {
        fontSize: 14,
        fontFamily: 'Inter-SemiBold',
        color: '#64748B',
    },
    draftContinueBtn: {
        flex: 1,
        height: 40, // Match markPaidBtn
        backgroundColor: '#6366F1',
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    draftContinueText: {
        fontSize: 14,
        fontFamily: 'Inter-SemiBold',
        color: 'white',
    },
    // Shared Badge
    badge: {
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: '#FEE2E2',
        alignItems: 'center',
        justifyContent: 'center',
    },
    badgeText: {
        fontSize: 11,
        fontFamily: 'Inter-Bold',
        color: '#EF4444',
    },
    notificationBtn: {
        width: 44,
        height: 44,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    notificationBadge: {
        position: 'absolute',
        top: 2,
        right: 2,
        backgroundColor: '#F43F5E', // Vibrant rose/red
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: Colors.white,
        paddingHorizontal: 2,
    },
    notificationBadgeText: {
        color: Colors.white,
        fontSize: 9,
        fontFamily: 'Inter-Bold',
        textAlign: 'center',
    },
    clockCard: {
        flexDirection: 'row',
        backgroundColor: Colors.white,
        marginHorizontal: 16,
        marginBottom: 16,
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: Colors.border,
        alignItems: 'center',
        justifyContent: 'space-between',
        ...Shadow.subtle
    },
    clockInfo: { flex: 1 },
    clockTitle: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: Colors.textPrimary },
    clockSub: { fontFamily: 'Inter-Regular', fontSize: 12, color: Colors.textSecondary, marginTop: 4 },
    timerDuration: { fontFamily: 'Inter-SemiBold', fontSize: 12, color: Colors.primary, marginTop: 4 },
    clockBtn: {
        backgroundColor: Colors.primary,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6
    },
    clockBtnOut: { backgroundColor: Colors.danger },
    clockBtnDisabled: { backgroundColor: Colors.textSecondary, opacity: 0.5 },
    clockBtnText: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: 'white' },
    statsRow: {
        flexDirection: 'row',
        gap: 12,
        paddingHorizontal: 16,
        marginBottom: 20
    },
});

export default DashboardScreen;
