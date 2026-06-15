import React, { useState, useLayoutEffect, useRef, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    updateCustomerAction,
    deleteCustomerAction,
    fetchCustomersAction,
    fetchCustomerByIdAction,
} from '../store/customerSlice';
import { getOrdersListAction } from '../store/salesOrderSlice';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Modal,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    Dimensions, FlatList,
    ActivityIndicator,
    StatusBar,
    Image,
    TouchableWithoutFeedback,
    RefreshControl
} from 'react-native';
import { Colors, Spacing, Typography, Shadow } from '../constants/theme';
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Flame, MapPin, Edit3, Trash2, X, Save, Wallet, ShoppingBag, User, Smartphone, Hash, Calendar } from 'lucide-react-native';
import AlertModal from '../components/AlertModal';
import BottomConfirmationSheet from '../components/BottomConfirmationSheet';
import LinearGradient from 'react-native-linear-gradient';
import { useToast } from '../context/ToastContext';
import { formatDate, parseDate } from '../utils/dateUtils';
import { formatOrderNumber } from '../utils/orderIdFormatter';
import { getItemQuantitySections } from '../utils/orderQuantitySections';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const getCustomerCandidateScore = (candidate) => {
    if (!candidate) {
        return -1;
    }

    return [
        candidate.customerName || candidate.name,
        candidate.whatsappNumber || candidate.mobile,
        candidate.location,
        candidate.displayId || candidate.customerId,
        candidate.totalOrders,
    ].filter(Boolean).length;
};

const CustomerDetailScreen = ({ route, navigation }) => {
    const insets = useSafeAreaInsets();

    const routeCustomer = route.params?.customer || null;
    const routeCustomerId =
        route.params?.customerId ||
        routeCustomer?.id ||
        routeCustomer?._id ||
        null;
    const scrollRef = useRef(null);
    const dispatch = useDispatch();
    const { showToast } = useToast();
    const customerList = useSelector(state => state.customers.customers || []);
    const currentCustomer = useSelector(state => state.customers.currentCustomer);
    const customerLoading = useSelector(state => state.customers.loading);
    const customerError = useSelector(state => state.customers.error);

    const matchedCustomerFromList = useMemo(() => customerList.find(
        item =>
            String(item?.id || item?._id) === String(routeCustomerId),
    ), [customerList, routeCustomerId]);
    const matchedCurrentCustomer = useMemo(() => (
        String(currentCustomer?.id || currentCustomer?._id) === String(routeCustomerId)
            ? currentCustomer
            : null
    ), [currentCustomer, routeCustomerId]);
    const resolvedCustomer = useMemo(() => {
        const candidates = [
            routeCustomer,
            matchedCurrentCustomer,
            matchedCustomerFromList,
        ].filter(Boolean);

        if (candidates.length === 0) {
            return null;
        }

        return candidates.reduce((bestCandidate, currentCandidate) => (
            getCustomerCandidateScore(currentCandidate) > getCustomerCandidateScore(bestCandidate)
                ? currentCandidate
                : bestCandidate
        ));
    }, [matchedCurrentCustomer, matchedCustomerFromList, routeCustomer]);
    const customer = useMemo(() => (
        resolvedCustomer
            ? {
                ...resolvedCustomer,
                id:
                    resolvedCustomer?.id !== null && resolvedCustomer?.id !== undefined
                        ? String(resolvedCustomer.id)
                        : resolvedCustomer?._id !== null && resolvedCustomer?._id !== undefined
                            ? String(resolvedCustomer._id)
                            : resolvedCustomer?.id,
            }
            : null
    ), [resolvedCustomer]);
    const normalizedCustomerId = customer?.id ?? customer?._id ?? null;
    const normalizedCustomerIdString =
        normalizedCustomerId !== null && normalizedCustomerId !== undefined
            ? String(normalizedCustomerId)
            : '';
    const customerName = customer?.customerName || customer?.name || '';
    const customerPhone = customer?.whatsappNumber || customer?.mobile || '';
    const customerDisplayId =
        customer?.displayId || customer?.customerId
            ? `#${customer.displayId || customer.customerId}`
            : customer?.id
                ? `#${customer.id.includes('_') ? customer.id.split('_')[1] : customer.id.slice(-6).toUpperCase()}`
                : '-';
    const hasUsableCustomer =
        Boolean(normalizedCustomerIdString) &&
        Boolean(customerName || customerPhone || customer?.location);
    const shouldFetchCustomer = !hasUsableCustomer && Boolean(routeCustomerId);
    const isResolvingCustomer =
        shouldFetchCustomer &&
        !customerError &&
        (
            customerLoading ||
            (!matchedCustomerFromList && !matchedCurrentCustomer)
        );
    const showMissingCustomerState = !hasUsableCustomer && !isResolvingCustomer;

    React.useEffect(() => {
        if (!hasUsableCustomer && routeCustomerId) {
            dispatch(fetchCustomerByIdAction(routeCustomerId)).catch(() => {});
        }
    }, [dispatch, hasUsableCustomer, routeCustomerId]);


    const getInitialPhone = (phoneStr) => {
        const phone = phoneStr || '';
        if (phone.includes(' ')) {
            const parts = phone.split(' ');
            if (parts[0].startsWith('+')) {
                return { code: parts[0], number: parts.slice(1).join(' ') };
            }
        }
        return { code: '+91', number: phone };
    };

    const initialPhone = getInitialPhone(customer?.whatsappNumber || customer?.mobile);
    const [isEditModalVisible, setIsEditModalVisible] = useState(false);
    const [editName, setEditName] = useState(customer?.customerName || customer?.name || '');
    const [editCountryCode, setEditCountryCode] = useState(initialPhone.code);
    const [editMobile, setEditMobile] = useState(initialPhone.number);
    const [editLocation, setEditLocation] = useState(customer?.location || '');
    const [alertVisible, setAlertVisible] = useState(false);
    const [alertConfig, setAlertConfig] = useState({ title: '', message: '' });
    const [deleteSheetVisible, setDeleteSheetVisible] = useState(false);
    // const [activeTab, setActiveTab] = useState<'profile' | 'orders'>('profile');
    const [activeTab, setActiveTab] = useState('profile');

    useEffect(() => {
        setEditName(customer?.customerName || customer?.name || '');
        const phoneData = getInitialPhone(customer?.whatsappNumber || customer?.mobile);
        setEditCountryCode(phoneData.code);
        setEditMobile(phoneData.number);
        setEditLocation(customer?.location || '');
    }, [customer]);

    const [orders, setOrders] = useState([]);
    const [ordersLoading, setOrdersLoading] = useState(false);
    const [ordersLoadingMore, setOrdersLoadingMore] = useState(false);
    const [ordersPage, setOrdersPage] = useState(1);
    const [hasNextPage, setHasNextPage] = useState(false);
    const [expandedOrders, setExpandedOrders] = useState({});

    const toggleExpand = (orderId) => {
        setExpandedOrders(prev => ({
            ...prev,
            [orderId]: !prev[orderId]
        }));
    };

    const fetchCustomerOrders = async (pageNum = 1, append = false) => {
        if (!normalizedCustomerIdString) return;

        if (append) {
            setOrdersLoadingMore(true);
        } else {
            setOrdersLoading(true);
        }

        const payload = {
            customer_id: normalizedCustomerIdString,
            page: pageNum,
            limit: 10,
            storeInList: false
        };

        console.log('Fetching Orders API Request:', payload);

        try {
            const resultAction = await dispatch(getOrdersListAction(payload));
            if (getOrdersListAction.fulfilled.match(resultAction)) {
                console.log('Fetching Orders API Response:', resultAction.payload);
                const fetchedOrders = resultAction.payload.orders;
                const pagination = resultAction.payload.pagination;

                if (append) {
                    setOrders(prev => [...prev, ...fetchedOrders]);
                } else {
                    setOrders(fetchedOrders);
                }

                setOrdersPage(pagination.page);
                setHasNextPage(pagination.hasNextPage);
            } else {
                console.log('Fetching Orders API Error:', resultAction.payload);
            }
        } catch (error) {
            console.log('Fetching Orders Exception:', error);
        } finally {
            setOrdersLoading(false);
            setOrdersLoadingMore(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'orders' && orders.length === 0 && normalizedCustomerIdString) {
            fetchCustomerOrders(1, false);
        }
    }, [activeTab, normalizedCustomerIdString]);

    const handleLoadMore = () => {
        if (hasNextPage && !ordersLoadingMore && !ordersLoading) {
            fetchCustomerOrders(ordersPage + 1, true);
        }
    };

    const renderFooter = () => {
        if (!ordersLoadingMore) return null;
        return (
            <View style={{ paddingVertical: 20 }}>
                <ActivityIndicator size="small" color={Colors.primary} />
            </View>
        );
    };

    useLayoutEffect(() => {
        navigation.setOptions({
            headerShown: false,
            statusBarStyle: 'dark',
            statusBarColor: Colors.white,
            statusBarTranslucent: false,
        });
    }, [navigation]);

    const canManageCustomer = Boolean(customer?.id || customer?._id);
    const screenTitle = customerName || (routeCustomerId ? 'Customer Details' : 'Customer Not Found');

    const renderScreenHeader = () => (
        <View style={[styles.screenHeader, { paddingTop: insets.top + 8 }]}>
            <View style={styles.screenHeaderRow}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={styles.screenHeaderIconButton}
                    activeOpacity={0.7}
                >
                    <ChevronLeft size={22} color={Colors.textPrimary} />
                </TouchableOpacity>

                <Text numberOfLines={1} style={styles.screenHeaderTitle}>
                    {screenTitle}
                </Text>

                <View style={styles.screenHeaderActions}>
                    {canManageCustomer ? (
                        <>
                            <TouchableOpacity
                                onPress={() => setIsEditModalVisible(true)}
                                style={styles.screenHeaderIconButton}
                                activeOpacity={0.7}
                            >
                                <Edit3 size={20} color={Colors.primary} />
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => setDeleteSheetVisible(true)}
                                style={[styles.screenHeaderIconButton, styles.screenHeaderDangerButton]}
                                activeOpacity={0.7}
                            >
                                <Trash2 size={20} color={Colors.danger} />
                            </TouchableOpacity>
                        </>
                    ) : (
                        <View style={styles.screenHeaderActionsPlaceholder} />
                    )}
                </View>
            </View>
        </View>
    );
    const handleTabPress = (tab) => {
        setActiveTab(tab);

        const xPosition = tab === 'profile' ? 0 : SCREEN_WIDTH;

        scrollRef.current?.scrollTo({
            x: xPosition,
            y: 0,
            animated: true,
        });
    };

    const handleScroll = (event) => {

        const offsetX = event.nativeEvent.contentOffset.x;
        const index = Math.round(offsetX / SCREEN_WIDTH);
        console.log(SCREEN_WIDTH, index);

        const newTab = index === 0 ? 'profile' : 'orders';
        if (newTab !== activeTab) {
            setActiveTab(newTab);
        }
    };

    const confirmDelete = async () => {
        if (!customer?.id && !customer?._id) {
            return;
        }

        setDeleteSheetVisible(false);
        try {
            const resultAction = await dispatch(deleteCustomerAction(customer.id || customer._id));
            if (deleteCustomerAction.fulfilled.match(resultAction)) {
                dispatch(fetchCustomersAction()); // Refresh list
                navigation.goBack();
            } else {
                setAlertConfig({ title: 'Error', message: 'Failed to delete customer.' });
                setAlertVisible(true);
            }
        } catch(e) {
            setAlertConfig({ title: 'Error', message: 'An error occurred.' });
            setAlertVisible(true);
        }
    };

    const handleUpdate = async () => {
        if (!customer?.id && !customer?._id) {
            showToast('Customer details are still loading', 'error');
            return;
        }

        if (!editName || editName.trim() === '') {
            showToast('Please provide customer name', 'error');
            return;
        }

        if (!editMobile || editMobile.length < 7 || editMobile.length > 15) {
            showToast('Please provide a valid phone number', 'error');
            return;
        }
        
        if (!editCountryCode || !editCountryCode.startsWith('+')) {
            showToast('Please enter a valid country code starting with +', 'error');
            return;
        }

        try {
            const resultAction = await dispatch(updateCustomerAction({
                id: customer.id || customer._id,
                payload: {
                    name: editName,
                    customerName: editName,
                    countryCode: editCountryCode,
                    mobile: editMobile,
                    whatsappNumber: `${editCountryCode} ${editMobile}`,
                    location: editLocation
                }
            }));
            
            setIsEditModalVisible(false);
            if (updateCustomerAction.fulfilled.match(resultAction)) {
                dispatch(fetchCustomersAction());
                setAlertConfig({
                    title: 'Customer Updated',
                    message: 'The customer details have been successfully updated.'
                });
                setAlertVisible(true);
                navigation.setParams({ customer: { ...customer, customerName: editName, whatsappNumber: `${editCountryCode} ${editMobile}`, location: editLocation } });
            } else {
                setAlertConfig({
                    title: 'Error',
                    message: resultAction.payload?.message || 'Failed to update customer.'
                });
                setAlertVisible(true);
            }
        } catch(e) {
            setIsEditModalVisible(false);
            setAlertConfig({ title: 'Error', message: 'An error occurred.' });
            setAlertVisible(true);
        }
    };

    const DetailRow = ({ label, value, icon: Icon }) => (
        <View style={styles.detailRow}>
            <View style={styles.detailLabelRow}>
                {Icon && <Icon size={16} color={Colors.textSecondary} style={{ marginRight: 8 }} />}
                <Text style={styles.detailLabel}>{label}</Text>
            </View>
            <Text style={styles.detailValue}>{value || '-'}</Text>
        </View>
    );



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
            case 'In Progress':
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

    const getOrderDeliveryDate = React.useCallback((order) => {
        const orderItems = Array.isArray(order?.outfits || order?.items)
            ? (order.outfits || order.items)
            : [];

        const parseOrderDateValue = (dateVal) => {
            if (!dateVal) return null;
            const parsed = parseDate(dateVal);
            if (!parsed) return null;
            return isNaN(parsed.getTime()) ? null : parsed;
        };

        const itemDeliveryDates = orderItems
            .map(item => parseOrderDateValue(item?.deliveryDate || item?.delivery_date))
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

        const urgencyItems = Array.isArray(item?.outfits || item?.items) ? (item.outfits || item.items) : [];
        const hasUrgentItem = urgencyItems.some((i) => (i.urgency === 'Urgent' || i.urgency === 'High') && getStatusDisplayText(i.status) !== 'Cancelled' && getStatusDisplayText(i.status) !== 'Delivered');
        const isUrgent = (item.urgency === 'Urgent' || item.urgency === 'High' || hasUrgentItem) && getStatusDisplayText(item.status) !== 'Cancelled' && getStatusDisplayText(item.status) !== 'Delivered';
        const itemCount = item.total_items || item.items_count || item.total_quantity || item.totalQty || item.totalOutfits || trueOutfits.length || item.items?.length || item.outfits?.length || 0;
        
        const safeOrderDate = item.date || item.order_date || item.created_at || item.createdAt;
        const safeDeliveryDate = getOrderDeliveryDate(item) || item.delivery_date || item.deliveryDate || item.expected_delivery_date || item.expectedDeliveryDate;

        return (
            <TouchableOpacity
                style={[
                    {
                        backgroundColor: Colors.white,
                        borderRadius: 16,
                        padding: 16,
                        marginBottom: Spacing.sm,
                        marginHorizontal: 16,
                        borderWidth: 1,
                        borderColor: '#E2E8F0',
                        ...Shadow.subtle
                    },
                    isUrgent && { borderColor: '#FECACA', borderWidth: 1 }
                ]}
                onPress={() => navigation.navigate('OrderDetail', { orderId: item.id })}
                activeOpacity={0.85}
            >
                <View style={{ paddingBottom: 10 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        
                        {/* Left Side: Info */}
                        <View style={{ flex: 1, paddingRight: 12 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2, flexWrap: 'wrap', gap: 8 }}>
                                <Text style={{ fontFamily: 'Inter-Bold', fontSize: 16, color: '#0F172A' }}>
                                    {displayBillNo}
                                </Text>
                                <View style={{ backgroundColor: getStatusStyles(item.status || 'Pending').bg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                                    <Text style={{ fontFamily: 'Inter-Bold', fontSize: 10, color: getStatusStyles(item.status || 'Pending').color }}>
                                        {getStatusDisplayText(item.status || 'Pending').toUpperCase()}
                                    </Text>
                                </View>
                            </View>
                            
                            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                                {!!safeOrderDate && (
                                    <Text style={{ fontFamily: 'Inter-Medium', fontSize: 12, color: '#64748B' }}>
                                        <Text style={{ color: '#94A3B8' }}>Order: </Text>{formatDate(safeOrderDate)}
                                    </Text>
                                )}
                                
                                {!!safeOrderDate && (!!safeDeliveryDate || itemCount > 0) && (
                                    <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: '#CBD5E1' }} />
                                )}
                                
                                {!!safeDeliveryDate && (
                                    <Text style={{ fontFamily: 'Inter-Medium', fontSize: 12, color: '#64748B' }}>
                                        <Text style={{ color: '#94A3B8' }}>Delivery: </Text>{formatDate(safeDeliveryDate)}
                                    </Text>
                                )}
                                
                                {!!safeDeliveryDate && itemCount > 0 && (
                                    <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: '#CBD5E1' }} />
                                )}
                                
                                {itemCount > 0 && (
                                    <Text style={{ fontFamily: 'Inter-Medium', fontSize: 12, color: '#64748B' }}>
                                        {itemCount} {itemCount === 1 ? 'Item' : 'Items'}
                                    </Text>
                                )}
                            </View>
                        </View>

                        {/* Right Side: Pricing */}
                        <View style={{ alignItems: 'flex-end', justifyContent: 'flex-start', paddingTop: 2 }}>
                            <Text style={[{ fontFamily: 'Inter-Bold', fontSize: 16, marginBottom: 4 }, item.status === 'Cancelled' ? { textDecorationLine: 'line-through', color: '#94A3B8' } : { color: Colors.textPrimary }]}>
                                ₹{item.total?.toLocaleString() ?? 0}
                            </Text>
                            {item.status !== 'Cancelled' && item.balance > 0 ? (
                                <Text style={{ fontFamily: 'Inter-Bold', fontSize: 12, color: '#EF4444', backgroundColor: '#FEE2E2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, overflow: 'hidden' }}>
                                    Bal: ₹{item.balance?.toLocaleString()}
                                </Text>
                            ) : item.status !== 'Cancelled' && item.balance === 0 ? (
                                <Text style={{ fontFamily: 'Inter-Bold', fontSize: 11, color: '#16A34A', backgroundColor: '#DCFCE7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, overflow: 'hidden' }}>
                                    PAID
                                </Text>
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

                {trueOutfits.length > 0 && (
                    <>
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
                    </>
                )}
            </TouchableOpacity>
        );
    };

    const getDaysRemaining = (dateStr) => {
        const d = new Date(dateStr.split('/').reverse().join('-'));
        const today = new Date();
        const diff = d - today;
        return Math.ceil(diff / (1000 * 60 * 60 * 24));
    };


    
    const getStatusColor = (status) => getStatusStyles(status).color;

    const renderTabs = () => (
        <View style={styles.tabContainer}>
            <TouchableOpacity
                style={[styles.tab, activeTab === 'profile' && styles.activeTab]}
                onPress={() => handleTabPress('profile')}
            >
                <Text style={[styles.tabText, activeTab === 'profile' && styles.activeTabText]}>Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={[styles.tab, activeTab === 'orders' && styles.activeTab]}
                onPress={() => handleTabPress('orders')}
            >
                <Text style={[styles.tabText, activeTab === 'orders' && styles.activeTabText]}>Orders</Text>
            </TouchableOpacity>
        </View>
    );

    const renderProfileTab = () => {

        return (
            <ScrollView style={styles.tabContentScroll} contentContainerStyle={{ padding: 16 }}>
                <View style={styles.listSection}>
                    <DetailRow label="Customer Name" value={customerName} icon={User} />
                    <DetailRow 
                        label="Customer ID" 
                        value={customerDisplayId} 
                        icon={Hash} 
                    />
                    <DetailRow label="Phone Number" value={customerPhone} icon={Smartphone} />
                    {customer.location && (
                        <DetailRow label="Location" value={customer.location} icon={MapPin} />
                    )}
                </View>

                <View style={styles.statsRow}>
                    <View style={[styles.statCard, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
                        <View style={styles.statIconContainer}>
                            <ShoppingBag size={20} color="#16A34A" />
                        </View>
                        <View>
                            <Text style={styles.statLabel}>Total Orders</Text>
                            <Text style={[styles.statValue, { color: '#16A34A' }]}>
                                {customer.totalOrders || 0}
                            </Text>
                        </View>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}>
                        <View style={styles.statIconContainer}>
                            <Wallet size={20} color="#2563EB" />
                        </View>
                        <View>
                            <Text style={styles.statLabel}>Total Spent</Text>
                            <Text style={[styles.statValue, { color: '#2563EB' }]}>
                                ₹{customer.totalOrderValue || 0}
                            </Text>
                        </View>
                    </View>
                </View>
            </ScrollView>
        );
    };

    const renderOrdersTab = () => {
        const totalOrders = customer?.totalOrders || 0;
        const totalSpent = customer?.totalOrderValue || 0;
        const averageValue = totalOrders > 0 ? Math.round(totalSpent / totalOrders) : 0;

        return (
            <View style={styles.tabContentScroll}>
                <View style={{ flexDirection: 'row', backgroundColor: '#EEF2FF', padding: 12, marginHorizontal: 16, marginTop: 16, marginBottom: 4, borderRadius: 12, borderWidth: 1, borderColor: '#E0E7FF', ...Shadow.subtle, justifyContent: 'space-between' }}>
                    <View style={{ alignItems: 'center', flex: 1 }}>
                        <Text style={{ fontSize: 12, color: Colors.textSecondary, fontFamily: 'Inter-Medium' }}>Total Orders</Text>
                        <Text style={{ fontSize: 16, color: Colors.textPrimary, fontFamily: 'Inter-Bold', marginTop: 4 }}>{totalOrders}</Text>
                    </View>
                    <View style={{ width: 1, backgroundColor: '#E0E7FF', marginVertical: 4 }} />
                    <View style={{ alignItems: 'center', flex: 1 }}>
                        <Text style={{ fontSize: 12, color: Colors.textSecondary, fontFamily: 'Inter-Medium' }}>Avg. Value</Text>
                        <Text style={{ fontSize: 16, color: Colors.textPrimary, fontFamily: 'Inter-Bold', marginTop: 4 }}>₹{averageValue.toLocaleString('en-IN')}</Text>
                    </View>
                    <View style={{ width: 1, backgroundColor: '#E0E7FF', marginVertical: 4 }} />
                    <View style={{ alignItems: 'center', flex: 1 }}>
                        <Text style={{ fontSize: 12, color: Colors.textSecondary, fontFamily: 'Inter-Medium' }}>Total Spent</Text>
                        <Text style={{ fontSize: 16, color: Colors.primary, fontFamily: 'Inter-Bold', marginTop: 4 }}>₹{totalSpent.toLocaleString('en-IN')}</Text>
                    </View>
                </View>

                {ordersLoading && orders.length === 0 ? (
                    <View style={styles.emptyState}>
                        <ActivityIndicator size="large" color={Colors.primary} />
                    </View>
            ) : orders.length === 0 ? (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyStateText}>No orders yet</Text>
                </View>
            ) : (
                <FlatList
                    data={orders}
                    renderItem={renderItem}
                    keyExtractor={item => item.id.toString()}
                    contentContainerStyle={{ paddingBottom: 20, paddingTop: 15 }}
                    onEndReached={handleLoadMore}
                    onEndReachedThreshold={0.5}
                    ListFooterComponent={renderFooter}
                    refreshControl={
                        <RefreshControl
                            refreshing={ordersLoading && orders.length > 0}
                            onRefresh={() => fetchCustomerOrders(1, false)}
                            colors={[Colors.primary]}
                        />
                    }
                />
            )}
        </View>
    );
};

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
            {renderScreenHeader()}
            {isResolvingCustomer ? (
                <View style={styles.stateContainer}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                    <Text style={[styles.stateText, styles.stateTextSpaced]}>Loading customer details...</Text>
                </View>
            ) : showMissingCustomerState ? (
                <View style={styles.stateContainer}>
                    <Text style={styles.stateText}>Customer data not found</Text>
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        style={styles.stateButton}
                    >
                        <Text style={styles.stateButtonText}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <>
                    {renderTabs()}
                    <ScrollView
                        ref={scrollRef}
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        onMomentumScrollEnd={handleScroll}
                        style={styles.pager}
                    >
                        <View style={{ width: SCREEN_WIDTH }}>{renderProfileTab()}</View>
                        <View style={{ width: SCREEN_WIDTH }}>{renderOrdersTab()}</View>
                    </ScrollView>

                    <Modal visible={isEditModalVisible} animationType="slide" transparent>
                        <TouchableOpacity
                            style={styles.modalOverlay}
                            activeOpacity={1}
                            onPress={() => setIsEditModalVisible(false)}
                        >
                            <KeyboardAvoidingView
                                behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
                                style={{ width: '100%' }}
                            >
                                <TouchableWithoutFeedback>
                                    <View style={styles.modalContent}>
                                        <View style={styles.modalHeader}>
                                            <Text style={Typography.h3}>Edit Customer</Text>
                                            <TouchableOpacity onPress={() => setIsEditModalVisible(false)}>
                                                <X size={24} color={Colors.textPrimary} />
                                            </TouchableOpacity>
                                        </View>

                                        <View style={styles.inputGroup}>
                                            <Text style={styles.label}>Customer Name*</Text>
                                            <TextInput
                                                style={styles.input}
                                                value={editName}
                                                onChangeText={setEditName}
                                                placeholder="Enter customer name"
                                                placeholderTextColor={Colors.textSecondary}
                                            />
                                        </View>

                                        <View style={styles.inputGroup}>
                                            <Text style={styles.label}>Phone Number*</Text>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border, borderRadius: 12 }}>
                                                <TextInput
                                                    style={{
                                                        fontFamily: 'Inter-Medium',
                                                        fontSize: 16,
                                                        color: Colors.textPrimary,
                                                        padding: Spacing.md,
                                                        minWidth: 45,
                                                        borderRightWidth: 1,
                                                        borderColor: Colors.border,
                                                    }}
                                                    value={editCountryCode}
                                                    onChangeText={(val) => {
                                                        const cleaned = val.replace(/[^0-9+]/g, '');
                                                        setEditCountryCode(cleaned);
                                                    }}
                                                    keyboardType="phone-pad"
                                                    maxLength={5}
                                                    placeholder="+91"
                                                    placeholderTextColor={Colors.textSecondary}
                                                />
                                                <TextInput
                                                    style={[styles.input, { flex: 1, borderWidth: 0 }]}
                                                    value={editMobile}
                                                    onChangeText={(val) => {
                                                        const cleaned = val.replace(/[^0-9]/g, '');
                                                        setEditMobile(cleaned);
                                                    }}
                                                    keyboardType="phone-pad"
                                                    maxLength={15}
                                                    placeholder="Enter phone number"
                                                    placeholderTextColor={Colors.textSecondary}
                                                />
                                            </View>
                                        </View>

                                        <TouchableOpacity style={styles.saveButton} onPress={handleUpdate}>
                                            <Save size={20} color={Colors.white} />
                                            <Text style={styles.saveButtonText}>Update Customer</Text>
                                        </TouchableOpacity>
                                    </View>
                                </TouchableWithoutFeedback>
                            </KeyboardAvoidingView>
                        </TouchableOpacity>
                    </Modal>
                </>
            )}

            <AlertModal
                visible={alertVisible}
                title={alertConfig.title}
                message={alertConfig.message}
                onClose={() => setAlertVisible(false)}
            />

            <BottomConfirmationSheet
                visible={deleteSheetVisible}
                onClose={() => setDeleteSheetVisible(false)}
                onConfirm={confirmDelete}
                title="Delete Customer"
                description="Are you sure you want to delete this customer?"
                confirmText="Delete Customer"
                type="danger"
            />
        </View>
    );
};

export default CustomerDetailScreen;


const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.white,
    },
    stateContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.white,
        paddingHorizontal: 24,
    },
    stateText: {
        fontFamily: 'Inter-Medium',
        color: Colors.textSecondary,
        textAlign: 'center',
    },
    stateTextSpaced: {
        marginTop: 12,
    },
    stateButton: {
        marginTop: 16,
        padding: 12,
        backgroundColor: Colors.primary,
        borderRadius: 8,
    },
    stateButtonText: {
        color: Colors.white,
        fontFamily: 'Inter-Bold',
    },
    pager: {
        flex: 1,
    },
    tabContentScroll: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingRight: 8,
    },
    headerIconButton: {
        padding: 4,
    },
    headerActionsPlaceholder: {
        width: 72,
    },
    screenHeader: {
        backgroundColor: Colors.white,
        paddingHorizontal: 10,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    screenHeaderRow: {
        minHeight: 48,
        flexDirection: 'row',
        alignItems: 'center',
    },
    screenHeaderTitle: {
        flex: 1,
        textAlign: 'center',
        fontFamily: 'Inter-SemiBold',
        fontSize: 18,
        color: Colors.textPrimary,
        fontWeight: '700',
        marginHorizontal: 12,
    },
    screenHeaderActions: {
        minWidth: 88,
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
    },
    screenHeaderActionsPlaceholder: {
        width: 88,
    },
    screenHeaderIconButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    screenHeaderDangerButton: {
        marginLeft: 8,
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: Colors.white,
        paddingHorizontal: Spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    tab: {
        paddingVertical: 12,
        marginRight: 24,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    activeTab: {
        borderBottomColor: Colors.primary,
    },
    tabText: {
        fontSize: 18,
        fontFamily: 'Inter-Medium',
        color: Colors.textSecondary,
        fontWeight: '700',
    },
    activeTabText: {
        color: Colors.primary,
        fontFamily: 'Inter-SemiBold',
    },
    // Detail Row Style (Order-Detail Copy)
    listSection: {
        backgroundColor: Colors.white,
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: Colors.border,
        ...Shadow.subtle,
        marginBottom: 20,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    detailLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    detailLabel: {
        fontFamily: 'Inter-Medium',
        fontSize: 14,
        color: Colors.textSecondary,
    },
    detailValue: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 15,
        color: Colors.textPrimary,
        textAlign: 'right',
        flex: 1,
        marginLeft: 16,
    },
    statsRow: {
        flexDirection: 'row',
        gap: 12,
    },
    statCard: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        gap: 10,
    },
    statIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: Colors.white,
        justifyContent: 'center',
        alignItems: 'center',
    },
    statLabel: {
        fontFamily: 'Inter-Medium',
        fontSize: 11,
        color: Colors.textSecondary,
        marginBottom: 2,
        textTransform: 'uppercase',
    },
    statValue: {
        fontFamily: 'Inter-Bold',
        fontSize: 18,
        color: Colors.textPrimary,
    },
    // Orders Card Style
    orderCard: {
        backgroundColor: Colors.white,
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: Colors.border,
        ...Shadow.subtle,
    },
    orderHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    orderId: {
        fontFamily: 'Inter-Bold',
        fontSize: 16,
        color: Colors.textPrimary,
    },
    orderDate: {
        fontFamily: 'Inter-Medium',
        fontSize: 13,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    statusText: {
        fontFamily: 'Inter-Bold',
        fontSize: 11,
        textTransform: 'uppercase',
    },
    dividerSmall: {
        height: 1,
        backgroundColor: '#F3F4F6',
        marginVertical: 12,
    },
    orderFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    orderItems: {
        fontFamily: 'Inter-Medium',
        fontSize: 13,
        color: Colors.textSecondary,
    },
    orderRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    orderAmount: {
        fontFamily: 'Inter-Bold',
        fontSize: 16,
        color: Colors.textPrimary,
    },
    emptyState: {
        padding: 40,
        alignItems: 'center',
    },
    emptyStateText: {
        color: Colors.textSecondary,
        fontFamily: 'Inter-Medium',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: Colors.white,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: Spacing.xl,
        paddingBottom: Platform.OS === 'ios' ? 40 : Spacing.xl,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.xl,
    },
    inputGroup: {
        marginBottom: Spacing.lg,
    },
    label: {
        fontFamily: 'Inter-Medium',
        fontSize: 14,
        color: Colors.textSecondary,
        marginBottom: 8,
    },
    input: {
        backgroundColor: Colors.background,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 12,
        padding: Spacing.md,
        fontFamily: 'Inter-Regular',
        fontSize: 16,
        color: Colors.textPrimary,
    },
    saveButton: {
        flexDirection: 'row',
        backgroundColor: Colors.primary,
        borderRadius: 12,
        height: 56,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginTop: Spacing.md,
        ...Shadow.medium,
    },
    saveButtonText: {
        color: Colors.white,
        fontFamily: 'Inter-SemiBold',
        fontSize: 16,
    },
    safeArea: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },


    // Recent Orders List Styling
    orderCard: {
        backgroundColor: Colors.white,
        borderRadius: 20,
        marginBottom: 16,
        padding: 16,
        marginHorizontal: 16,
        ...Shadow.subtle,
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
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
        marginBottom: 10,
    },
    cardContent: {
        paddingTop: 4,
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
    mainAmount: {
        fontFamily: 'Inter-Bold',
        fontSize: 18,
        color: '#0F172A',
        fontWeight: '700',
    },
    dueLabel: {
        fontSize: 14,
        fontFamily: 'Inter-Bold',
        color: '#F87171',
        marginTop: 2,
    },
       card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 14,
        marginBottom: 12,
        overflow: 'hidden',
        marginLeft:20,
        marginRight:20,
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
        color: Colors.textPrimary,
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
});

// const getStatusColor = (status: string) => {
//     switch (status) {
//         case 'In Progress': return '#3B82F6';
//         case 'Trial': return '#8B5CF6';
//         case 'Overdue': return Colors.danger;
//         case 'Cancelled': return '#6B7280';
//         case 'Completed': return Colors.success;
//         case 'Paid': return Colors.success;
//         case 'Partial': return '#F59E0B';
//         case 'Pending': return '#F59E0B';
//         case 'Due': return Colors.danger;
//         default: return '#6B7280';
//     }
// };


