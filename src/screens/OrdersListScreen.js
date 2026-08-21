import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    TextInput,
    Platform,
    Modal,
    ScrollView,
    LayoutAnimation,
    Dimensions,
    Pressable,
    Image,
    RefreshControl,
    ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, Spacing, Typography, Shadow } from '../constants/theme';
import { Search, ListFilter, ChevronRight, ChevronDown, ChevronUp, Calendar, Clock, Receipt, User, ArrowLeft, X, SlidersHorizontal, ArrowUpDown, Check, ChevronLeft, ReceiptIndianRupee, Plus, Flame, LayoutList, Scissors, ShoppingBag, MoreVertical, Camera } from 'lucide-react-native';
import { formatDate, parseDate } from '../utils/dateUtils';
import { formatOrderNumber } from '../utils/orderIdFormatter';
import { getItemQuantitySections } from '../utils/orderQuantitySections';
import { useData } from '../context/DataContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CalendarView from '../components/CalendarView';
import BottomConfirmationSheet from '../components/BottomConfirmationSheet';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useDispatch, useSelector } from 'react-redux';
import {
    getOrdersListAction,
    getOrderStatusesAction,
    updateOrderStatusAction,
    setInitialOrdersList,
} from '../store/salesOrderSlice';
import { useToast } from '../context/ToastContext';
import { getDisplayItemCount } from '../utils/orderItemCount';

const ORDERS_STORAGE_KEY = 'sewvee_orders';
const DEFAULT_LIST_LIMIT = 10;
const CALENDAR_FETCH_LIMIT = 500;
const OVERDUE_FILTER_KEY = 'Overdue';
const OVERDUE_FETCH_LIMIT = 100;
const ORDER_TYPE_QUERY_MAP = {
    'Tailoring Order': 'TAILORING',
    'Sales Order': 'SALE_ORDER',
};
const PAYMENT_STATUS_QUERY_MAP = {
    Paid: 'paid',
    Unpaid: 'unpaid',
};
const SORT_BY_QUERY_MAP = {
    DateDesc: 'latest',
    DateAsc: 'oldest',
    AmountDesc: 'highamount',
    AmountAsc: 'lowamount',
};

const normalizeOrderSearchValue = value => (
    String(value ?? '')
        .toLowerCase()
        .replace(/[#\s]/g, '')
);

const matchesOrderSearch = (order, rawSearch) => {
    const normalizedSearch = normalizeOrderSearchValue(rawSearch);

    if (!normalizedSearch) {
        return true;
    }

    const orderNumber = normalizeOrderSearchValue(order?.billNo || order?.id || '');
    const customerName = normalizeOrderSearchValue(order?.customerName || '');

    return (
        orderNumber.includes(normalizedSearch) ||
        customerName.includes(normalizedSearch)
    );
};

const normalizeStatusToken = value => (
    String(value || '')
        .trim()
        .toUpperCase()
        .replace(/\s+/g, '_')
);

const getOrderStatusOptionKey = statusOption => (
    String(
        statusOption?.statusId ??
        statusOption?.status_id ??
        statusOption?.id ??
        statusOption?.value ??
        '',
    )
);

const getActiveStatusChipKey = value => value || 'All';

const getTodayCalendarDate = () => {
    const today = new Date();
    return `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
};

const normalizeUrgencyValue = (value) => {
    const normalizedValue = String(value || '').trim().toUpperCase();

    if (normalizedValue === 'URGENT') {
        return 'urgent';
    }

    if (normalizedValue === 'HIGH') {
        return 'high';
    }

    if (normalizedValue === 'MEDIUM') {
        return 'medium';
    }

    if (normalizedValue === 'LOW' || normalizedValue === 'NORMAL') {
        return 'low';
    }

    return null;
};

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

const hasOrderAdvancePayment = order => (
    (Number(
        order?.paid_amount ??
        order?.advance_payment ??
        order?.paidAmount ??
        order?.advance ??
        0,
    ) || 0) > 0
);

const OrdersListScreen = ({ navigation }) => {
    const { height: SCREEN_HEIGHT } = Dimensions.get('window');

    const { orders, refreshData } = useData();
    const dispatch = useDispatch();
    const apiOrders = useSelector(state => state.salesOrder.ordersList);
    const listLoading = useSelector(state => state.salesOrder.listLoading);
    const listPaginationLoading = useSelector(state => state.salesOrder.listPaginationLoading);
    const listLoaded = useSelector(state => state.salesOrder.listLoaded);
    const listNeedsRefresh = useSelector(state => state.salesOrder.listNeedsRefresh);
    const listPage = useSelector(state => state.salesOrder.listPage);
    const listHasNextPage = useSelector(state => state.salesOrder.listHasNextPage);
    const listError = useSelector(state => state.salesOrder.listError);
    const updateStatusLoading = useSelector(state => state.salesOrder.updateStatusLoading);
    const updateStatusOrderId = useSelector(state => state.salesOrder.updateStatusOrderId);
    const orderStatuses = useSelector(state => state.salesOrder.orderItemStatuses);
    const orderStatusesLoading = useSelector(state => state.salesOrder.orderItemStatusesLoading);
    const orderStatusesLoaded = useSelector(state => state.salesOrder.orderItemStatusesLoaded);
    const orderStatusesError = useSelector(state => state.salesOrder.orderItemStatusesError);
    const { showToast } = useToast();
    const [refreshing, setRefreshing] = useState(false);
    const [expandedOrders, setExpandedOrders] = useState({});

    const toggleExpand = (orderId) => {
        setExpandedOrders(prev => ({
            ...prev,
            [orderId]: !prev[orderId]
        }));
    };

    const hasInitializedListQueryEffect = useRef(false);
    const latestListRequestRef = useRef({ query: {}, isDefault: true });
    const canPaginateOnMomentumRef = useRef(false);

    useEffect(() => {
        if (listError) {
            showToast('Failed to load orders', 'error');
        }
    }, [listError, showToast]);

    useEffect(() => {
        if (orderStatusesError) {
            showToast('Failed to load order statuses', 'error');
        }
    }, [orderStatusesError, showToast]);

    const openCancelConfirmation = React.useCallback((order) => {
        setActiveOrderMenu(null);
        setOrderToCancel(order);
        setCancelSheetVisible(true);
    }, []);

    const handleOrderMenuToggle = React.useCallback((orderId, event) => {
        event?.stopPropagation?.();
        setActiveOrderMenu(currentMenu => (currentMenu === orderId ? null : orderId));
    }, []);

    const handleCancelMenuPress = React.useCallback((order, event) => {
        event?.stopPropagation?.();
        if (hasOrderAdvancePayment(order)) {
            showToast('Cancelled status is disabled when advance payment exists', 'warning');
            return;
        }
        openCancelConfirmation(order);
    }, [openCancelConfirmation, showToast]);

    const dismissActiveOrderMenu = React.useCallback(() => {
        setActiveOrderMenu(null);
    }, []);

    const baseOrders = listLoaded ? apiOrders : orders;

    const insets = useSafeAreaInsets();

    const [currentDate, setCurrentDate] = useState(new Date());

    const [viewMode, setViewMode] = useState('list');
    const [search, setSearch] = useState('');
    const [isSearchVisible, setIsSearchVisible] = useState(false);
    const [isFilterVisible, setIsFilterVisible] = useState(false);
    const [visible, setVisible] = useState(false);
    const [activeOrderMenu, setActiveOrderMenu] = useState(null);
    const [cancelSheetVisible, setCancelSheetVisible] = useState(false);
    const [orderToCancel, setOrderToCancel] = useState(null);
    const [chipCounts, setChipCounts] = useState({});

    const [filterOrderStatus, setFilterOrderStatus] = useState('All');
    const [filterPaymentStatus, setFilterPaymentStatus] = useState('All');
    const [filterOrderType, setFilterOrderType] = useState('All');
    const [sortBy, setSortBy] = useState('DateDesc');
    const [searchInput, setSearchInput] = useState('');
    const resetSearchState = React.useCallback(() => {
        setIsSearchVisible(false);
        setSearchInput('');
        setSearch('');
    }, []);

    const totalOrderCount = chipCounts['All'] || (Array.isArray(baseOrders) ? baseOrders.length : 0);
    const searchFilteredOrders = React.useMemo(() => (
        (Array.isArray(baseOrders) ? baseOrders : []).filter(order => matchesOrderSearch(order, search))
    ), [baseOrders, search]);

    const orderStatusOptions = React.useMemo(() => (
        Array.isArray(orderStatuses)
            ? orderStatuses.filter(statusOption => (
                statusOption &&
                getOrderStatusOptionKey(statusOption) &&
                statusOption.label
            ))
            : []
    ), [orderStatuses]);

    const isFilterActive = filterOrderStatus !== 'All' || filterPaymentStatus !== 'All' || filterOrderType !== 'All' || sortBy !== 'DateDesc';

    const clearFilters = () => {
        setFilterOrderStatus('All');
        setFilterPaymentStatus('All');
        setFilterOrderType('All');
        setSortBy('DateDesc');
    };

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            setSearch(searchInput);
        }, 350);

        return () => clearTimeout(timeoutId);
    }, [searchInput]);

    const listQuery = React.useMemo(() => {
        const query = {};
        const trimmedSearch = search.trim();
        const mappedOrderType = ORDER_TYPE_QUERY_MAP[filterOrderType];
        const mappedPaymentStatus = PAYMENT_STATUS_QUERY_MAP[filterPaymentStatus];
        const mappedSortBy = SORT_BY_QUERY_MAP[sortBy];

        if (trimmedSearch) {
            query.search = trimmedSearch;
        }

        if (mappedOrderType) {
            query.order_type = mappedOrderType;
        }

        if (filterOrderStatus !== 'All' && filterOrderStatus !== OVERDUE_FILTER_KEY) {
            query.status_id = filterOrderStatus;
        }

        if (mappedPaymentStatus) {
            query.payment_status = mappedPaymentStatus;
        }

        if (mappedSortBy) {
            query.sort_by = mappedSortBy;
        }

        return query;
    }, [filterOrderStatus, filterOrderType, filterPaymentStatus, search, sortBy]);

    const isDefaultListQuery = React.useMemo(() => (
        !search.trim() &&
        filterOrderStatus === 'All' &&
        filterPaymentStatus === 'All' &&
        filterOrderType === 'All' &&
        sortBy === 'DateDesc'
    ), [filterOrderStatus, filterOrderType, filterPaymentStatus, search, sortBy]);

    const chipBaseQuery = React.useMemo(() => {
        const query = {};
        const trimmedSearch = search.trim();
        const mappedOrderType = ORDER_TYPE_QUERY_MAP[filterOrderType];
        const mappedPaymentStatus = PAYMENT_STATUS_QUERY_MAP[filterPaymentStatus];

        if (trimmedSearch) {
            query.search = trimmedSearch;
        }

        if (mappedOrderType) {
            query.order_type = mappedOrderType;
        }

        if (mappedPaymentStatus) {
            query.payment_status = mappedPaymentStatus;
        }

        return query;
    }, [filterOrderType, filterPaymentStatus, search]);

    useEffect(() => {
        latestListRequestRef.current = {
            query: listQuery,
            isDefault: isDefaultListQuery,
        };
    }, [isDefaultListQuery, listQuery]);

    useEffect(() => {
        if (orderStatusesLoaded || orderStatusesLoading) {
            return;
        }

        dispatch(getOrderStatusesAction()).catch(() => { });
    }, [dispatch, orderStatusesLoaded, orderStatusesLoading]);

    const fetchOrdersPage = React.useCallback(async ({
        page = 1,
        append = false,
        overrideQuery,
    } = {}) => {
        const requestState = latestListRequestRef.current;
        const activeQuery = overrideQuery ?? requestState.query;
        const isOverdueFilterActive =
            filterOrderStatus === OVERDUE_FILTER_KEY &&
            page === 1 &&
            !append;

        const fetchSinglePage = async ({
            nextPage,
            shouldAppend,
            limit,
            silent = false,
        }) => dispatch(getOrdersListAction({
            ...activeQuery,
            page: nextPage,
            limit,
            append: shouldAppend,
            storeInList: true,
            silent,
        })).unwrap();

        let response = await fetchSinglePage({
            nextPage: page,
            shouldAppend: append,
            limit: isOverdueFilterActive ? OVERDUE_FETCH_LIMIT : DEFAULT_LIST_LIMIT,
        });

        if (isOverdueFilterActive) {
            const totalPages = Number(
                response?.pagination?.totalPages ??
                response?.pagination?.lastPage ??
                1,
            ) || 1;

            for (let nextPage = 2; nextPage <= totalPages; nextPage += 1) {
                response = await fetchSinglePage({
                    nextPage,
                    shouldAppend: true,
                    limit: OVERDUE_FETCH_LIMIT,
                    silent: true,
                });
            }
        }

        if (page === 1 && !append && requestState.isDefault) {
            // We don't save response?.orders here anymore because it might be stale list API data.
            // Instead, we will save apiOrders whenever it updates.
            await refreshData();
        }

        return response;
    }, [dispatch, filterOrderStatus, refreshData]);

    // Mirror Redux state to local storage and DataContext
    useEffect(() => {
        if (listLoaded && apiOrders && apiOrders.length > 0) {
            AsyncStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(apiOrders));
        }
    }, [apiOrders, listLoaded]);

    // Initialize Redux state from local storage on first load
    useEffect(() => {
        if (!listLoaded && orders && orders.length > 0) {
            dispatch(setInitialOrdersList(orders));
        }
    }, [listLoaded, orders, dispatch]);

    const fetchChipCounts = React.useCallback(async (overrideBaseQuery) => {
        const activeBaseQuery = overrideBaseQuery ?? chipBaseQuery;

        const allRequest = dispatch(getOrdersListAction({
            ...activeBaseQuery,
            page: 1,
            limit: 1,
            storeInList: false,
        })).unwrap();

        const statusRequests = orderStatusOptions.map(statusOption =>
            dispatch(getOrdersListAction({
                ...activeBaseQuery,
                status_id: getOrderStatusOptionKey(statusOption),
                page: 1,
                limit: 1,
                storeInList: false,
            })).unwrap()
        );

        const [allResponse, ...statusResponses] = await Promise.all([
            allRequest,
            ...statusRequests,
        ]);

        const nextCounts = {
            All: Number(allResponse?.pagination?.total) || 0,
        };

        orderStatusOptions.forEach((statusOption, index) => {
            nextCounts[getOrderStatusOptionKey(statusOption)] =
                Number(statusResponses[index]?.pagination?.total) || 0;
        });

        setChipCounts(previousCounts => ({
            ...previousCounts,
            ...nextCounts,
        }));

        return nextCounts;
    }, [chipBaseQuery, dispatch, orderStatusOptions]);

    const onRefresh = React.useCallback(async () => {
        dismissActiveOrderMenu();
        setRefreshing(true);
        try {
            await fetchOrdersPage({ page: 1, append: false });
            await fetchChipCounts();
        } catch (error) {
            console.error("Refresh failed", error);
        } finally {
            setRefreshing(false);
        }
    }, [dismissActiveOrderMenu, fetchChipCounts, fetchOrdersPage]);

    const handleCancelOrder = React.useCallback(async (orderId) => {
        if (hasOrderAdvancePayment(orderToCancel)) {
            showToast('Cancelled status is disabled when advance payment exists', 'warning');
            setActiveOrderMenu(null);
            setCancelSheetVisible(false);
            setOrderToCancel(null);
            return;
        }

        setRefreshing(true);
        try {
            const response = await dispatch(updateOrderStatusAction({
                orderId,
                status: '4',
            })).unwrap();

            await fetchOrdersPage({ page: 1, append: false });
            await fetchChipCounts();
            showToast(response?.message || 'Order status updated successfully', 'success');
        } catch (error) {
            console.error('Cancel order failed', error);
            showToast(error?.message || error?.error || error?.data?.message || 'Failed to update order status', 'error');
        } finally {
            setRefreshing(false);
            setActiveOrderMenu(null);
            setCancelSheetVisible(false);
            setOrderToCancel(null);
        }
    }, [dispatch, fetchChipCounts, fetchOrdersPage, orderToCancel, showToast]);

    useFocusEffect(
        React.useCallback(() => {
            if (viewMode !== 'list') {
                return undefined;
            }

            if (listLoaded && !listNeedsRefresh) {
                // By always fetching on focus, we ensure the latest status is synced
                // return undefined;
            }

            Promise.all([
                fetchOrdersPage({ page: 1, append: false }),
                fetchChipCounts(),
            ]).catch(error => {
                console.error('Orders fetch failed', error);
            });

            return undefined;
        }, [fetchChipCounts, fetchOrdersPage, viewMode, listLoaded, listNeedsRefresh])
    );

    useFocusEffect(
        React.useCallback(() => (
            () => {
                resetSearchState();
            }
        ), [resetSearchState])
    );

    useEffect(() => {
        if (viewMode !== 'list') {
            return;
        }

        if (!hasInitializedListQueryEffect.current) {
            hasInitializedListQueryEffect.current = true;
            return;
        }

        fetchOrdersPage({
            page: 1,
            append: false,
            overrideQuery: listQuery,
        }).catch(error => {
            console.error('Orders filter fetch failed', error);
        });

        fetchChipCounts(chipBaseQuery).catch(error => {
            console.error('Order chip counts fetch failed', error);
        });
    }, [chipBaseQuery, fetchChipCounts, fetchOrdersPage, listQuery, viewMode]);

    const getDaysRemaining = (dateString) => {
        const targetDate = parseOrderDateValue(dateString);
        if (!targetDate) {
            return null;
        }

        const today = new Date();
        targetDate.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);
        const diffTime = targetDate.getTime() - today.getTime();
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    };

    const getOrderDeliveryDate = React.useCallback((order) => {
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

        if (itemDeliveryDates.length > 0) {
            return itemDeliveryDates.sort(
                (left, right) => (
                    (parseOrderDateValue(left)?.getTime() ?? Number.MAX_SAFE_INTEGER) -
                    (parseOrderDateValue(right)?.getTime() ?? Number.MAX_SAFE_INTEGER)
                ),
            )[0];
        }

        const directDeliveryDate =
            order?.deliveryDate ||
            order?.delivery_date ||
            null;

        return directDeliveryDate;
    }, []);

    const selectedStatusOption = React.useMemo(() => (
        orderStatusOptions.find(
            statusOption => getOrderStatusOptionKey(statusOption) === filterOrderStatus,
        ) || null
    ), [filterOrderStatus, orderStatusOptions]);

    const matchesOrderStatusFilter = React.useCallback((order, statusFilter) => {
        if (!statusFilter || statusFilter === 'All') {
            return true;
        }

        if (statusFilter === OVERDUE_FILTER_KEY) {
            if (isCancelledOrDeliveredStatus(order?.status)) {
                return false;
            }

            const deliveryDate = getOrderDeliveryDate(order);
            const daysRemaining = getDaysRemaining(deliveryDate);
            return daysRemaining !== null ? daysRemaining < 0 : false;
        }

        if (!selectedStatusOption) {
            return true;
        }

        const selectedStatusId = getOrderStatusOptionKey(selectedStatusOption);
        const orderStatusId = String(order?.status_id ?? order?.statusId ?? '');
        if (selectedStatusId && orderStatusId && selectedStatusId === orderStatusId) {
            return true;
        }

        return normalizeStatusToken(order?.status) === normalizeStatusToken(
            selectedStatusOption?.value || selectedStatusOption?.label,
        );
    }, [getOrderDeliveryDate, selectedStatusOption]);

    const displayOrders = React.useMemo(() => (
        searchFilteredOrders.filter(order => matchesOrderStatusFilter(order, filterOrderStatus))
    ), [filterOrderStatus, matchesOrderStatusFilter, searchFilteredOrders]);

    const getStatusDisplayText = (statusValue) => {
        if (!statusValue) return 'Yet to Start';
        const str = String(statusValue);
        const normalized = str.toUpperCase().trim();
        if (normalized === 'YET TO START' || normalized === 'PENDING' || normalized === 'YET_TO_START') return 'Yet to Start';
        if (normalized === 'STITCHING' || normalized === 'IN PROGRESS' || normalized === 'IN_PROGRESS') return 'Stitching';
        if (normalized === 'READY') return 'Ready';
        if (normalized === 'COMPLETED') return 'Completed';
        if (normalized === 'DELIVERED') return 'Delivered';
        if (normalized === 'CANCELLED') return 'Cancelled';
        return str.replace(/\w\S*/g, (t) => t.charAt(0).toUpperCase() + t.substr(1).toLowerCase());
    };

    const getStatusStyles = (status) => {
        const displayStatus = getStatusDisplayText(status);
        switch (displayStatus) {
            case 'Yet to Start':
            case 'Pending':
                return { color: '#F97316', bg: '#FFF7ED' };
            case 'Stitching':
                return { color: '#3B82F6', bg: '#EFF6FF' };
            case 'Completed':
            case 'Ready':
                return { color: '#22C55E', bg: '#F0FDF4' };
            case 'Cancelled':
                return { color: '#EF4444', bg: '#FEF2F2' };
            case 'Delivered':
                return { color: '#8B5CF6', bg: '#F5F3FF' };
            default:
                return { color: '#6B7280', bg: '#F3F4F6' };
        }
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

        const outfits = Array.isArray(item?.outfits || item?.items) ? (item.outfits || item.items) : [];
        const hasPendingPhotoRequest = outfits.some(
            (outfit) => 
                (outfit.requestedPhotosFromClient === true || outfit.requestedPhotosFromClient === 'true' || outfit.requestedPhotosFromClient === 1) && 
                (!outfit.photos || outfit.photos.filter(p => p.category === 'REFERENCE').length === 0)
        );

        return (
            <TouchableOpacity
                style={[
                    styles.orderCard,
                    isUrgent && { borderColor: '#FECACA', borderWidth: 1 }
                ]}
                onPress={() => {
                    setActiveOrderMenu(null);
                    navigation.navigate('OrderDetail', { orderId: item.id });
                }}
                activeOpacity={0.85}
            >
                <View style={{ paddingBottom: 10 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flexShrink: 1, paddingRight: 8 }}>
                            <Text style={[styles.customerNameText, { flexShrink: 1, fontFamily: 'Inter-SemiBold', fontWeight: '600', fontSize: 15, color: Colors.textPrimary }]} numberOfLines={1}>
                                {item.customerName || 'Unknown'}
                            </Text>
                            {hasPendingPhotoRequest && (
                                <Camera size={14} color="#F97316" style={{ marginLeft: 4, flexShrink: 0 }} />
                            )}
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

    const [selectedDate, setSelectedDate] = useState(null);
    const [calendarOrders, setCalendarOrders] = useState([]);
    const [calendarLoading, setCalendarLoading] = useState(false);

    const filterOptions = React.useMemo(() => [
        { key: 'All', label: 'All', count: chipCounts.All ?? searchFilteredOrders.length },
        ...orderStatusOptions.map(statusOption => {
            const statusKey = getOrderStatusOptionKey(statusOption);

            return {
                key: statusKey,
                label: statusOption.label,
                count: chipCounts[statusKey] ?? (searchFilteredOrders || []).filter(order => {
                    const orderStatusId = String(order?.status_id ?? order?.statusId ?? '');
                    if (statusKey && orderStatusId && statusKey === orderStatusId) {
                        return true;
                    }

                    return normalizeStatusToken(order?.status) === normalizeStatusToken(
                        statusOption?.value || statusOption?.label,
                    );
                }).length,
            };
        }),
        {
            key: OVERDUE_FILTER_KEY,
            label: 'Overdue',
            count: (searchFilteredOrders || []).filter(order => (
                matchesOrderStatusFilter(order, OVERDUE_FILTER_KEY)
            )).length,
        },
    ], [chipCounts, matchesOrderStatusFilter, orderStatusOptions, searchFilteredOrders]);

    const filterListRef = useRef(null);

    useEffect(() => {
        if (viewMode === 'list' && !isSearchVisible && filterListRef.current) {
            const index = filterOptions.findIndex(o =>
                o.key === getActiveStatusChipKey(filterOrderStatus)
            );
            if (index !== -1) {
                setTimeout(() => {
                    filterListRef.current?.scrollToIndex({
                        index,
                        animated: true,
                        viewPosition: 0.5
                    });
                }, 100);
            }
        }
    }, [filterOrderStatus, viewMode, isSearchVisible, filterOptions]);

    const [currentMonth, setCurrentMonth] = useState(new Date());

    const monthName = currentMonth.toLocaleString('en-US', {
        month: 'long',
        year: 'numeric',
    });

    const changeMonth = (value) => {
        const newDate = new Date(currentMonth);
        newDate.setMonth(newDate.getMonth() + value);
        setCurrentMonth(newDate);
    };

    const filteredCalendarOrders = React.useMemo(
        () => [...(Array.isArray(calendarOrders) ? calendarOrders : [])]
            .sort((a, b) => new Date(b.date) - new Date(a.date)),
        [calendarOrders],
    );

    const totals = displayOrders.reduce(
        (acc, o) => {
            acc.total += o.total;
            acc.advance += o.advance;
            acc.balance += o.balance;
            return acc;
        },
        { total: 0, advance: 0, balance: 0 }
    );

    const getOrderCalendarDate = React.useCallback(order => (
        formatDate(order?.date || order?.order_date || order?.createdAt || '')
    ), []);

    const agendaOrders = React.useMemo(
        () => filteredCalendarOrders.filter(o => getOrderCalendarDate(o) === selectedDate),
        [filteredCalendarOrders, getOrderCalendarDate, selectedDate],
    );

    const calendarUrgencySummary = React.useMemo(() => (
        agendaOrders.reduce((acc, order) => {
            const urgencyKey = normalizeUrgencyValue(order?.urgency);

            if (!urgencyKey) {
                return acc;
            }

            acc[urgencyKey] += 1;
            return acc;
        }, {
            low: 0,
            medium: 0,
            high: 0,
            urgent: 0,
        })
    ), [agendaOrders]);

    const deliveryLoad = React.useMemo(() => (
        filteredCalendarOrders.reduce((acc, order) => {
            const dateLabel = getOrderCalendarDate(order);
            if (!dateLabel || !dateLabel.includes('/')) {
                return acc;
            }

            const [, month, year] = dateLabel.split('/');
            if (
                Number(month) !== currentMonth.getMonth() + 1 ||
                Number(year) !== currentMonth.getFullYear()
            ) {
                return acc;
            }

            const existing = acc[dateLabel] || { count: 0, urgentCount: 0, status: 'low' };
            const count = existing.count + 1;
            const urgentCount = existing.urgentCount + (order?.urgency === 'Urgent' ? 1 : 0);

            acc[dateLabel] = {
                count,
                urgentCount,
                status: count >= 6 ? 'high' : count >= 3 ? 'medium' : 'low',
            };

            return acc;
        }, {})
    ), [currentMonth, filteredCalendarOrders, getOrderCalendarDate]);

    const loadCalendarOrders = React.useCallback(async () => {
        setCalendarLoading(true);
        try {
            let page = 1;
            let totalPages = 1;
            const nextOrders = [];
            const seenOrderIds = new Set();

            do {
                const response = await dispatch(getOrdersListAction({
                    page,
                    limit: CALENDAR_FETCH_LIMIT,
                    storeInList: false,
                })).unwrap();

                const pageOrders = Array.isArray(response?.orders) ? response.orders : [];
                pageOrders.forEach(order => {
                    const orderId = String(order?.id ?? '');
                    if (seenOrderIds.has(orderId)) {
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

            setCalendarOrders(nextOrders);
        } catch (error) {
            console.error('Calendar orders fetch failed', error);
            showToast(
                error?.message || error?.error || error?.data?.message || 'Failed to load orders',
                'error',
            );
        } finally {
            setCalendarLoading(false);
        }
    }, [dispatch, showToast]);

    useEffect(() => {
        if (viewMode !== 'calendar' || selectedDate) {
            return;
        }

        const today = new Date();
        setCurrentMonth(today);
        setSelectedDate(getTodayCalendarDate());
    }, [selectedDate, viewMode]);

    useEffect(() => {
        if (viewMode !== 'calendar') {
            return;
        }

        loadCalendarOrders();
    }, [loadCalendarOrders, viewMode]);

    const handleCalendarDateSelect = React.useCallback((date) => {
        setSelectedDate(date);
    }, []);

    const handleCalendarMonthChange = React.useCallback((monthDate) => {
        if (!(monthDate instanceof Date) || Number.isNaN(monthDate.getTime())) {
            return;
        }

        setCurrentMonth(previousMonth => (
            previousMonth.getMonth() === monthDate.getMonth() &&
            previousMonth.getFullYear() === monthDate.getFullYear()
                ? previousMonth
                : monthDate
        ));
    }, []);

    const onCalendarRefresh = React.useCallback(async () => {
        setRefreshing(true);
        try {
            await loadCalendarOrders();
        } finally {
            setRefreshing(false);
        }
    }, [loadCalendarOrders]);

    const handleLoadMore = React.useCallback(() => {
        if (
            viewMode !== 'list' ||
            filterOrderStatus === OVERDUE_FILTER_KEY ||
            !canPaginateOnMomentumRef.current ||
            listLoading ||
            listPaginationLoading ||
            !listHasNextPage
        ) {
            return;
        }

        canPaginateOnMomentumRef.current = false;
        fetchOrdersPage({
            page: listPage + 1,
            append: true,
        }).catch(error => {
            console.error('Orders pagination fetch failed', error);
        });
    }, [
        filterOrderStatus,
        fetchOrdersPage,
        listHasNextPage,
        listLoading,
        listPage,
        listPaginationLoading,
        viewMode,
    ]);

    const showListLoader = viewMode === 'list' && (
        listLoading ||
        (!listLoaded && !listPaginationLoading) ||
        (updateStatusLoading && String(updateStatusOrderId) === String(orderToCancel?.id))
    );

    const OrderOption = ({ icon: IconComponent, title, description, backgroundColor, arrowColor, onPress }) => (
        <TouchableOpacity onPress={onPress} style={[styles.optionCard, { backgroundColor }]}>
            <View style={[styles.iconContainer, { backgroundColor: arrowColor }]}>
                <IconComponent size={26} color="#ffffff" strokeWidth={2.5} />
            </View>
            <View style={styles.textContainerCenter}>
                <Text style={styles.optionTitleText}>{title}</Text>
                <Text style={styles.optionDescriptionText}>{description}</Text>
            </View>
            <View style={[styles.arrowIconBgRefined, { backgroundColor: '#ffffff' }]}>
                <ChevronRight size={18} color={arrowColor || "#000000"} />
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            {/* {activeOrderMenu && (
                <Pressable 
                    style={[StyleSheet.absoluteFill, { zIndex: 10 }]} 
                    onPress={() => setActiveOrderMenu(null)}
                />
            )} */}
            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top }]}>
                {/* Header Top Row: Title + Actions */}
                <View style={styles.headerTop}>
                    <View>
                        <Text style={styles.screenTitle}>Orders</Text>
                        <Text style={styles.screenSubtitle}>{totalOrderCount} Total</Text>
                    </View>

                    <View style={styles.actionButtons}>
                        <TouchableOpacity
                            style={[styles.filterBtn, isSearchVisible && styles.filterBtnActive]}
                            onPress={() => {
                                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                                setIsSearchVisible(!isSearchVisible);
                            }}
                        >
                            <Search size={22} color={isSearchVisible ? Colors.white : Colors.textPrimary} />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.filterBtn, (isFilterVisible || isFilterActive) && styles.filterBtnActive]}
                            onPress={() => setIsFilterVisible(true)}
                        >
                            <ListFilter size={22} color={(isFilterVisible || isFilterActive) ? Colors.white : Colors.textPrimary} />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.plusBtn}
                            onPress={() => setVisible(true)}
                        >
                            <Plus size={24} color={Colors.white} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* NEW Controls Row: View Tabs */}
                <View style={styles.tabContainer}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 10 }}>
                        <TouchableOpacity
                            style={[styles.tab, viewMode === 'list' && styles.activeTabBorder]}
                            onPress={() => setViewMode('list')}
                        >
                            <Text style={[styles.tabText, viewMode === 'list' && styles.activeTabText]}>List</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.tab, viewMode === 'calendar' && styles.activeTabBorder]}
                            onPress={() => setViewMode('calendar')}
                        >
                            <Text style={[styles.tabText, viewMode === 'calendar' && styles.activeTabText]}>Calendar</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>



                {viewMode === 'list' && !isSearchVisible && (
                    <FlatList
                        ref={filterListRef}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.filterChipsContainer}
                        data={filterOptions}
                        onScrollToIndexFailed={() => {}}
                        keyExtractor={(item, index) => item.key ? `${item.key}-${index}` : index.toString()}
                        renderItem={({ item, index }) => (
                            <TouchableOpacity
                                style={[
                                    styles.filterChipRefined,
                                    getActiveStatusChipKey(filterOrderStatus) === item.key &&
                                    styles.filterChipActiveRefined
                                ]}
                                onPress={() => setFilterOrderStatus(item.key)}
                            >
                                <Text style={[
                                    styles.filterChipTextRefined,
                                    getActiveStatusChipKey(filterOrderStatus) === item.key &&
                                    styles.filterChipTextActiveRefined
                                ]}>
                                    {item.label}
                                </Text>
                                <View style={[
                                    styles.filterCountBadge,
                                    getActiveStatusChipKey(filterOrderStatus) === item.key
                                        ? styles.filterCountBadgeActive
                                        : styles.filterCountBadgeInactive
                                ]}>
                                    <Text style={[
                                        styles.filterCountText,
                                        getActiveStatusChipKey(filterOrderStatus) === item.key &&
                                        styles.filterCountTextActive
                                    ]}>
                                        {item.count}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        )}
                    />
                )}

                {isSearchVisible && (
                    <View style={styles.searchContainer}>
                        <Search size={18} color={Colors.textSecondary} />
                        <TextInput
                            style={styles.searchInput}
                            placeholderTextColor={Colors.textSecondary}
                            placeholder="Search order no or customer name"
                            value={searchInput}
                            onChangeText={setSearchInput}
                            autoFocus={true}
                        />
                        {searchInput.length > 0 && (
                            <TouchableOpacity
                                onPress={() => {
                                    setSearchInput('');
                                    setSearch('');
                                }}
                                style={styles.resetButton}
                            >
                                <X size={18} color={Colors.textSecondary} />
                            </TouchableOpacity>
                        )}
                    </View>
                )}
            </View>

            {/* Content Area */}
            {viewMode === 'list' ? (
                showListLoader ? (
                    <View style={styles.emptyContainer}>
                        <ActivityIndicator size="large" color={Colors.primary} />
                        <Text style={styles.emptyText}>Loading orders...</Text>
                    </View>
                ) : (
                    <FlatList
                        data={displayOrders}
                        renderItem={renderItem}
                        keyExtractor={(item, index) => item.id ? `${item.id}-${index}` : index.toString()}
                        contentContainerStyle={styles.listContent}
                        onScrollBeginDrag={dismissActiveOrderMenu}
                        onMomentumScrollBegin={() => {
                            dismissActiveOrderMenu();
                            canPaginateOnMomentumRef.current = true;
                        }}
                        onEndReached={handleLoadMore}
                        onEndReachedThreshold={0.4}
                        ListFooterComponent={(
                            listPaginationLoading ? (
                                <View style={styles.paginationLoader}>
                                    <ActivityIndicator size="small" color={Colors.primary} />
                                </View>
                            ) : (
                                <View style={{ height: 160 }} />
                            )
                        )}
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                        }
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <>
                                    <ReceiptIndianRupee size={48} color={Colors.border} />
                                    <Text style={styles.emptyText}>No orders found</Text>
                                </>
                            </View>
                        }
                    />
                )
            ) : (
                <ScrollView 
                    contentContainerStyle={styles.scrollContent}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onCalendarRefresh} />
                    }
                >
                    <View style={styles.calendarWrapper}>
                        <CalendarView
                            onSelect={handleCalendarDateSelect}
                            onMonthChange={handleCalendarMonthChange}
                            initialDate={selectedDate || undefined}
                            deliveryLoad={deliveryLoad}
                            urgencySummary={calendarUrgencySummary}
                            disablePastDates={false}
                            showLegend={true}
                        />
                    </View>

                    {/* Agenda List */}
                    <View style={styles.agendaContainer}>
                        <Text style={styles.agendaTitle}>
                            {selectedDate
                                ? `Due on ${formatDate(new Date(selectedDate.split('/').reverse().join('-')).toISOString())}`
                                : 'Select a date to view orders'}
                        </Text>

                        {calendarLoading ? (
                            <View style={styles.emptyAgenda}>
                                <ActivityIndicator size="large" color={Colors.primary} />
                                <Text style={styles.emptyAgendaText}>Loading orders...</Text>
                            </View>
                        ) : selectedDate && agendaOrders.length === 0 ? (
                            <View style={styles.emptyAgenda}>
                                <Text style={styles.emptyAgendaText}>No active orders due on this date</Text>
                            </View>
                        ) : (
                            agendaOrders.map((item, index) => (
                                <View key={item.id ? `${item.id}-${index}` : `agenda-${index}`} style={{ marginBottom: 12 }}>
                                    {renderItem({ item })}
                                </View>
                            ))
                        )}
                    </View>
                    <View style={{ height: 100 }} />
                </ScrollView>
            )}

            {/* Filter Modal */}
            <Modal
                visible={isFilterVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setIsFilterVisible(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setIsFilterVisible(false)}
                >
                    <View style={[
                        styles.modalContent,
                        { paddingBottom: Math.max(insets.bottom, Platform.OS === 'android' ? 80 : 32) }
                    ]}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Filter & Sort</Text>
                            <TouchableOpacity
                                style={styles.closeBtn}
                                onPress={() => setIsFilterVisible(false)}
                            >
                                <X size={24} color={Colors.textPrimary} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.modalBody}>
                            <View style={styles.filterGroup}>
                                <Text style={styles.groupLabel}>Order Type</Text>
                                <View style={styles.chipGrid}>
                                    {['All', 'Tailoring Order', 'Sales Order'].map(type => (
                                        <TouchableOpacity
                                            key={type}
                                            style={[styles.filterChip, filterOrderType === type && styles.filterChipActive]}
                                            onPress={() => setFilterOrderType(type)}
                                        >
                                            <Text style={[styles.filterChipText, filterOrderType === type && styles.filterChipTextActive]}>
                                                {type}
                                            </Text>
                                            {filterOrderType === type && <Check size={14} color={Colors.white} style={{ marginLeft: 4 }} />}
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                            <View style={styles.filterGroup}>
                                <Text style={styles.groupLabel}>Order Status</Text>
                                <View style={styles.chipGrid}>
                                    {[
                                        { key: 'All', label: 'All' },
                                        ...orderStatusOptions.map(statusOption => ({
                                            key: getOrderStatusOptionKey(statusOption),
                                            label: statusOption.label,
                                        })),
                                        { key: OVERDUE_FILTER_KEY, label: 'Overdue' },
                                    ].map((status, index) => (
                                        <TouchableOpacity
                                            key={status.key ? `${status.key}-${index}` : `status-${index}`}
                                            style={[styles.filterChip, filterOrderStatus === status.key && styles.filterChipActive]}
                                            onPress={() => setFilterOrderStatus(status.key)}
                                        >
                                            <Text style={[styles.filterChipText, filterOrderStatus === status.key && styles.filterChipTextActive]}>
                                                {status.label}
                                            </Text>
                                            {filterOrderStatus === status.key && <Check size={14} color={Colors.white} style={{ marginLeft: 4 }} />}
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            <View style={styles.filterGroup}>
                                <Text style={styles.groupLabel}>Payment Status</Text>
                                <View style={styles.chipGrid}>
                                    {['All', 'Paid', 'Unpaid'].map(status => (
                                        <TouchableOpacity
                                            key={status}
                                            style={[styles.filterChip, filterPaymentStatus === status && styles.filterChipActive]}
                                            onPress={() => setFilterPaymentStatus(status)}
                                        >
                                            <Text style={[styles.filterChipText, filterPaymentStatus === status && styles.filterChipTextActive]}>
                                                {status}
                                            </Text>
                                            {filterPaymentStatus === status && <Check size={14} color={Colors.white} style={{ marginLeft: 4 }} />}
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            <View style={styles.filterGroup}>
                                <Text style={styles.groupLabel}>Sort By</Text>
                                <View style={styles.chipGrid}>
                                    {[
                                        { label: 'Date Newest', value: 'DateDesc' },
                                        { label: 'Date Oldest', value: 'DateAsc' },
                                        { label: 'High Amount', value: 'AmountDesc' },
                                        { label: 'Low Amount', value: 'AmountAsc' },
                                    ].map(sort => (
                                        <TouchableOpacity
                                            key={sort.value}
                                            style={[styles.filterChip, sortBy === sort.value && styles.filterChipActive]}
                                            onPress={() => setSortBy(sort.value)}
                                        >
                                            <Text style={[styles.filterChipText, sortBy === sort.value && styles.filterChipTextActive]}>
                                                {sort.label}
                                            </Text>
                                            {sortBy === sort.value && <Check size={14} color={Colors.white} style={{ marginLeft: 4 }} />}
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            <View style={styles.modalFooter}>
                                <TouchableOpacity
                                    style={styles.resetBtn}
                                    onPress={clearFilters}
                                >
                                    <Text style={styles.resetBtnText}>Reset</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.applyBtn}
                                    onPress={() => setIsFilterVisible(false)}
                                >
                                    <Text style={styles.applyBtnText}>Apply Filters</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </TouchableOpacity>
            </Modal>

            <Modal
                animationType="slide"
                transparent={true}
                visible={visible}
                onRequestClose={() => setVisible(false)}
            >
                <Pressable style={styles.modalOverlay} onPress={() => setVisible(false)}>
                    <View style={styles.modalContentSmall}>
                        <View style={styles.notch} />

                        <View style={styles.headerRow}>
                            <View>
                                <Text style={styles.mainTitle}>Create New</Text>
                                <Text style={styles.subTitle}>Select an order type to begin</Text>
                            </View>
                            <TouchableOpacity onPress={() => setVisible(false)} style={styles.closeBtn}>
                                <X size={28} color={Colors.textPrimary} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.optionsList}>
                            <OrderOption
                                icon={Scissors}
                                title="Tailoring Order"
                                description="Custom measurements & design for stitching."
                                backgroundColor={'#F5F3FF'}
                                arrowColor={Colors.primary}
                                onPress={() => {
                                    setVisible(false);
                                    navigation.navigate('CreateOrderFlow');
                                }}
                            />

                            <OrderOption
                                icon={ShoppingBag}
                                title="Sales Order"
                                description="Sell materials & readymade products."
                                backgroundColor={'#F0FDF4'}
                                arrowColor={Colors.success}
                                onPress={() => {
                                    setVisible(false);
                                    navigation.navigate('SalesOrder');
                                }}
                            />
                        </View>

                        <View style={{ height: insets.bottom + 20 }} />
                    </View>
                </Pressable>
            </Modal>

            <BottomConfirmationSheet
                visible={cancelSheetVisible}
                onClose={() => {
                    if (updateStatusLoading) return;
                    setCancelSheetVisible(false);
                    setOrderToCancel(null);
                }}
                onConfirm={() => handleCancelOrder(orderToCancel?.id)}
                title="Cancel Order"
                description="Are you sure you want to cancel this entire order?"
                confirmText="Yes, Cancel"
                cancelText="No"
                type="danger"
                loading={updateStatusLoading && String(updateStatusOrderId) === String(orderToCancel?.id)}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    header: {
        backgroundColor: Colors.white,
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 4,
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    screenTitle: {
        fontFamily: 'Inter-Bold',
        fontSize: 20,
        color: Colors.textPrimary,
    },
    screenSubtitle: {
        fontSize: 13,
        color: Colors.textSecondary,
        fontFamily: 'Inter-Medium',
        marginTop: 2,
    },
    actionButtons: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    filterBtn: {
        width: 42,
        height: 42,
        backgroundColor: '#F3F4F6',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    filterBtnActive: {
        backgroundColor: Colors.primary,
    },
    plusBtn: {
        width: 42,
        height: 42,
        backgroundColor: Colors.primary,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        ...Shadow.medium,
    },
    screenTitle: {
        fontFamily: 'Inter-Bold',
        fontSize: 20,
        color: Colors.textPrimary,
    },
    controlsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 0,
        marginBottom: 8,
        gap: 8,
    },
    tabContainer: {
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        marginBottom: 15,
    },
    tab: { paddingHorizontal: 20, paddingVertical: 12 },
    tabText: { fontSize: 16, color: '#666', fontFamily: 'Inter-SemiBold' },
    activeTabBorder: {
        borderBottomWidth: 3,
        borderBottomColor: Colors.primary,
        marginLeft: 10,
        marginRight: 10,
    },
    activeTabText: { color: Colors.primary, fontWeight: '700' },

    filterDot: {
        position: 'absolute',
        top: -4,
        right: -4,
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: Colors.primary,
        borderWidth: 2,
        borderColor: Colors.white
    },
    recentOrdersHeader: {
        marginTop: "3%",
        marginBottom: 8,
    },
    recentOrdersTitle: {
        fontFamily: 'Inter-Bold',
        fontSize: 14,
        color: '#4B5563',
        letterSpacing: 0.5,
    },
    filterChipsContainer: {
        paddingBottom: 10,
        gap: 8,
        marginTop:"3%"
    },
    filterChipRefined: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 24,
        backgroundColor: Colors.white,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    filterChipActiveRefined: {
        backgroundColor: '#F5F3FF',
        borderColor: Colors.primary,
    },
    filterChipTextRefined: {
        fontFamily: 'Inter-Medium',
        fontSize: 14,
        color: '#4B5563',
    },
    filterChipTextActiveRefined: {
        color: Colors.primary,
        fontFamily: 'Inter-Bold',
    },
    filterCountBadge: {
        marginLeft: 8,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
        minWidth: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    filterCountBadgeInactive: {
        backgroundColor: '#F3F4F6',
    },
    filterCountBadgeActive: {
        backgroundColor: Colors.primary,
    },
    filterCountText: {
        fontSize: 12,
        fontFamily: 'Inter-Bold',
        color: '#6B7280',
    },
    filterCountTextActive: {
        color: Colors.white,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        borderRadius: 12,
        paddingHorizontal: Spacing.md,
        height: 50,
        marginTop: 8,
    },
    searchInput: {
        flex: 1,
        marginLeft: Spacing.sm,
        fontFamily: 'Inter-Regular',
        fontSize: 15,
        color: Colors.textPrimary,
    },
    orderCard: {
        backgroundColor: Colors.white,
        borderRadius: 14,
        marginBottom: 12,
        padding: 12,
        ...Shadow.subtle,
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    orderNoText: {
        fontFamily: 'Inter-Bold',
        fontSize: 15,
        color: Colors.textPrimary,
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
    },
    statusText: {
        fontSize: 12,
        fontFamily: 'Inter-Bold',
        color: Colors.textSecondary,
    },
    cardDivider: {
        height: 1,
        backgroundColor: '#F3F4F6',
        marginBottom: 8,
    },
    cardContent: {
        paddingTop: 0,
    },
    cardBody: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    cardLeftCol: {
        flex: 1,
    },
    cardRightCol: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    amountStack: {
        alignItems: 'flex-end',
        marginRight: 10,
    },
    customerNameText: {
        fontFamily: 'Inter-Bold',
        fontSize: 18,
        color: '#0F172A',
        fontWeight: '700',
    },
    mainAmount: {
        fontFamily: 'Inter-Bold',
        fontSize: 18,
        color: '#0F172A',
        fontWeight: '700',
    },
    itemBadgeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
    },
    itemCountCircle: {
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: Colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8,
    },
    itemCountText: {
        color: Colors.white,
        fontSize: 11,
        fontFamily: 'Inter-Bold',
    },
    itemsLabel: {
        fontSize: 15,
        fontFamily: 'Inter-Medium',
        color: '#64748B',
    },
    itemCountCircleTop: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: Colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    itemCountTextTop: {
        color: Colors.white,
        fontSize: 12,
        fontFamily: 'Inter-Bold',
    },
    dueLabel: {
        fontSize: 14,
        fontFamily: 'Inter-Bold',
        color: '#F87171', // Subtle red instead of dark red
        marginTop: 2,
    },
    outfitsSection: {
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
    },
    expandToggle: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 4,
    },
    outfitsCountText: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 14,
        color: '#334155',
    },
    viewDetailsText: {
        fontFamily: 'Inter-Medium',
        fontSize: 13,
        color: '#64748B',
    },
    outfitsList: {
        marginTop: 8,
        gap: 8,
    },
    outfitRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 12,
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    outfitName: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 14,
        color: '#1E293B',
    },
    outfitQtyPrice: {
        fontFamily: 'Inter-Medium',
        fontSize: 12,
        color: '#64748B',
        marginTop: 2,
    },
    outfitStatusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    outfitStatusText: {
        fontSize: 10,
        fontFamily: 'Inter-Bold',
    },
    listContent: {
        paddingTop: 8,
        paddingHorizontal: 16,
        paddingBottom: 80,
    },
    paginationLoader: {
        paddingTop: 8,
        paddingBottom: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 80,
    },
    emptyText: {
        fontFamily: 'Inter-Medium',
        fontSize: 16,
        color: Colors.textSecondary,
        marginTop: 12,
    },
    scrollContent: {
        paddingBottom: 80,
    },
    calendarWrapper: {
        marginBottom: 24,
    },
    agendaContainer: {
        paddingHorizontal: 16,
    },

    emptyAgenda: {
        padding: 24,
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    emptyAgendaText: {
        fontFamily: 'Inter-Medium',
        color: Colors.textSecondary,
        fontSize: 14,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: Colors.white,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
    },
    modalContentSmall: {
        backgroundColor: Colors.background,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        paddingHorizontal: 20,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    modalTitle: {
        fontFamily: 'Inter-Bold',
        fontSize: 22,
        color: Colors.textPrimary,
    },
    closeBtn: {
        padding: 4,
    },
    modalBody: {
        paddingHorizontal: 20,
        paddingVertical: 16,
        gap: 20,
    },
    filterGroup: {
        gap: 10,
    },
    groupLabel: {
        fontFamily: 'Inter-Bold',
        fontSize: 16,
        color: Colors.textPrimary,
    },
    chipGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    filterChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#F3F4F6',
        borderWidth: 1,
        borderColor: 'transparent',
    },
    filterChipActive: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    filterChipText: {
        fontFamily: 'Inter-Medium',
        fontSize: 14,
        color: Colors.textSecondary,
    },
    filterChipTextActive: {
        color: Colors.white,
        fontFamily: 'Inter-Bold',
    },
    modalFooter: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 8,
    },
    resetBtn: {
        flex: 1,
        backgroundColor: '#E2E8F0',
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    resetBtnText: {
        fontFamily: 'Inter-Bold',
        fontSize: 16,
        color: Colors.textPrimary,
    },
    applyBtn: {
        flex: 1.5,
        backgroundColor: Colors.primary,
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        ...Shadow.medium,
    },
    applyBtnText: {
        fontFamily: 'Inter-Bold',
        fontSize: 16,
        color: Colors.white,
    },
    notch: {
        width: 40,
        height: 5,
        backgroundColor: '#e5e7eb',
        borderRadius: 3,
        alignSelf: 'center',
        marginTop: 12,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginTop: 20,
        marginBottom: 25,
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
    optionsList: {
        gap: 16,
    },
    optionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.02)',
    },
    iconContainer: {
        width: 54,
        height: 54,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
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
    arrowIconBgRefined: {
        height: 28,
        width: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    popoverMenu: {
        position: 'absolute',
        top: 30,
        right: 0,
        backgroundColor: Colors.white,
        borderRadius: 12,
        paddingHorizontal: 8,
        paddingVertical: 4,
        minWidth: 150,
        ...Shadow.medium,
        zIndex: 1000,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    popoverItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 8,
        gap: 8,
    },
    popoverText: {
        color: '#EF4444',
        fontSize: 14,
        fontFamily: 'Inter-SemiBold',
    },
});

export default OrdersListScreen;
