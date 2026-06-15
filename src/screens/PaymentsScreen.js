import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Modal,
    TextInput,
    Alert,
    ScrollView,
    Platform,
    Dimensions,
    KeyboardAvoidingView,
    StatusBar,
    RefreshControl,
    BackHandler,
    LayoutAnimation
} from 'react-native';
import { Colors, Spacing, Typography, Shadow } from '../constants/theme';
import {
    Plus,
    CreditCard,
    Calendar,
    ReceiptIndianRupee,
    ChevronLeft,
    ChevronRight,
    Wallet,
    Smartphone,
    Trash2,
    Edit2,

    LogOut,
    ListFilter,
    Search,
    MoreVertical,
    MoreHorizontal,
    Clock,
    CheckCircle2,
    X,
    ChevronDown,
} from 'lucide-react-native';
import { useData } from '../context/DataContext';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import AlertModal from '../components/AlertModal';
import BottomConfirmationSheet from '../components/BottomConfirmationSheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
// import { logEvent, firestore } from '../config/firebase';
import { getCurrentDate, formatDate, parseDate } from '../utils/dateUtils';
import { formatPaymentBillId, formatOrderNumber } from '../utils/orderIdFormatter';
import { useDispatch, useSelector } from 'react-redux';
import { fetchPaymentsAction } from '../store/paymentSlice';
import { ActivityIndicator } from 'react-native';
import CustomCalendarPicker from '../components/CustomCalendarPicker';

const PaymentsScreen = ({ route }) => {
    const dispatch = useDispatch();
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    const { orders, payments: contextPayments, addPayment, updatePayment, deletePayment } = useData();

    // API payment state from Redux
    const { list: apiPayments, summary: apiSummary, loading: paymentsLoading } = useSelector(state => state.payment);

    const [filterStatus, setFilterStatus] = useState(route?.params?.initialFilter ?? 'History');
    const [filterSheetVisible, setFilterSheetVisible] = useState(false);

    // Removed redundant useEffect taking care of initialFilter

    // Modal State
    const [modalVisible, setModalVisible] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingPaymentId, setEditingPaymentId] = useState(null);

    // Success Modal state
    const [alertVisible, setAlertVisible] = useState(false);
    const [alertConfig, setAlertConfig] = useState({ title: '', message: '' });

    // Payment Options & Delete State
    const [paymentOptionsVisible, setPaymentOptionsVisible] = useState(false);
    const [activePayment, setActivePayment] = useState(null);
    const [deleteSheetVisible, setDeleteSheetVisible] = useState(false);

    // Month/Date state
    const [currentDate, setCurrentDate] = useState(new Date());
    const [filterMode, setFilterMode] = useState('month'); // 'month' or 'day'
    const [showDatePicker, setShowDatePicker] = useState(false);

    // State for payment form
    const [selectedOrderId, setSelectedOrderId] = useState('');
    const [amount, setAmount] = useState('');
    const [mode, setMode] = useState('Cash');
    const [search, setSearch] = useState('');
    const [isSearchVisible, setIsSearchVisible] = useState(false);
    const openedFromProfile = route?.params?.sourceScreen === 'Settings';

    const handleBackNavigation = useCallback(() => {
        navigation.setParams?.({ sourceScreen: null });
        navigation.navigate(openedFromProfile ? 'Settings' : 'Dashboard');
        return true;
    }, [navigation, openedFromProfile]);

    useFocusEffect(
        useCallback(() => {
            const subscription = BackHandler.addEventListener(
                'hardwareBackPress',
                handleBackNavigation,
            );

            return () => subscription.remove();
        }, [handleBackNavigation]),
    );

    const changeMonth = (increment) => {
        const newDate = new Date(currentDate);
        if (filterMode === 'day') {
            newDate.setDate(newDate.getDate() + increment);
        } else {
            newDate.setMonth(newDate.getMonth() + increment);
        }
        setCurrentDate(newDate);
    };

    const goToCurrentMonth = () => {
        setCurrentDate(new Date());
        setFilterMode('month');
    };

    const isCurrentMonth = () => {
        const now = new Date();
        if (filterMode === 'day') {
            return currentDate.getDate() === now.getDate() && currentDate.getMonth() === now.getMonth() && currentDate.getFullYear() === now.getFullYear();
        }
        return currentDate.getMonth() === now.getMonth() && currentDate.getFullYear() === now.getFullYear();
    };

    const onDateChange = (selectedDate) => {
        setShowDatePicker(false);
        if (selectedDate) {
            setCurrentDate(selectedDate);
            setFilterMode('day');
        } else {
            // clear selection -> go back to current month view
            goToCurrentMonth();
        }
    };

    // Build date_from / date_to for the current selected month or day
    const getDateRange = useCallback(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const pad = (n) => String(n).padStart(2, '0');
        if (filterMode === 'day') {
            const day = currentDate.getDate();
            const dateStr = `${year}-${pad(month + 1)}-${pad(day)}`;
            return { date_from: dateStr, date_to: dateStr };
        } else {
            const date_from = `${year}-${pad(month + 1)}-01`;
            const lastDay = new Date(year, month + 1, 0).getDate();
            const date_to = `${year}-${pad(month + 1)}-${pad(lastDay)}`;
            return { date_from, date_to };
        }
    }, [currentDate, filterMode]);

    // Map filterStatus → API status param
    const getApiStatus = () => {
        if (filterStatus === 'Pending') return 'PENDING';
        if (filterStatus === 'Paid') return 'PAID';
        return 'ALL';
    };

    // Fetch from API whenever month, status filter or search changes
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            const { date_from, date_to } = getDateRange();
            dispatch(fetchPaymentsAction({
                page: 1,
                limit: 100,               // load enough for the month
                status: getApiStatus(),
                date_from,
                date_to,
                search: search.trim() || undefined,
            })).unwrap();
        }, 500); // Debounce search

        return () => clearTimeout(timeoutId);
    }, [currentDate, filterMode, filterStatus, search, dispatch, getDateRange]);

    const refreshPayments = useCallback(() => {
        const { date_from, date_to } = getDateRange();
        dispatch(fetchPaymentsAction({
            page: 1,
            limit: 100,
            status: getApiStatus(),
            date_from,
            date_to,
            search: search.trim() || undefined,
        }));
    }, [currentDate, filterMode, filterStatus, search, dispatch, getDateRange]);

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            // Clear search string
            setSearch('');

            // Re-apply filter from route params or reset to default
            const statusToSet = route?.params?.initialFilter ?? 'History';
            setFilterStatus(statusToSet);

            // Clear route param so it doesn't stick
            if (route?.params?.initialFilter !== undefined) {
                navigation.setParams({ initialFilter: undefined });
            }

            // Fetch immediately without search
            const { date_from, date_to } = getDateRange();
            dispatch(fetchPaymentsAction({
                page: 1,
                limit: 100,
                status: statusToSet === 'Pending' ? 'PENDING' : statusToSet === 'Paid' ? 'PAID' : 'ALL',
                date_from,
                date_to,
                search: undefined,
            }));
        });
        return unsubscribe;
    }, [navigation, dispatch, getDateRange, route?.params?.initialFilter]);

    const getDisplayDateLabel = () => {
        if (filterMode === 'day') {
            return currentDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
        }
        return currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
    };

    const getOrderMetrics = (orderId, total) => {
        const pList = payments.filter(p => p.orderId === orderId);
        const paid = pList.reduce((sum, current) => sum + current.amount, 0);
        return { paid, balance: total - paid };
    };

    const handleSavePayment = async () => {
        if (!selectedOrderId || !amount) {
            setAlertConfig({ title: 'Required', message: 'Please select a bill and enter amount' });
            setAlertVisible(true);
            return;
        }

        const order = orders.find(o => o.id === selectedOrderId);
        if (!order) return;

        try {
            if (isEditing && editingPaymentId) {
                await updatePayment(editingPaymentId, {
                    amount: parseFloat(amount),
                    mode
                });
                setAlertConfig({ title: 'Payment Updated', message: 'The payment record has been successfully updated.' });
            } else {
                await addPayment({
                    orderId: selectedOrderId,
                    customerId: order.customerId,
                    amount: parseFloat(amount),
                    mode,
                    date: new Date().toISOString().split('T')[0],
                });
                setAlertConfig({ title: 'Payment Recorded', message: 'The payment has been successfully added to the bill.' });
            }
            setModalVisible(false);
            setAlertVisible(true);
            refreshPayments(); // Refresh API data
        } catch (e) {
            setAlertConfig({ title: 'Error', message: 'Failed to save payment. Please try again.' });
            setAlertVisible(true);
        }
    };

    const confirmDelete = async () => {
        if (activePayment) {
            // Check if context has deletePayment (mapped from Payment ID or API response field)
            // The API response uses 'payment_id', but context might use 'id'.
            const pId = activePayment.payment_id || activePayment.id;
            await deletePayment(pId);
            setDeleteSheetVisible(false);
            setActivePayment(null);
            refreshPayments(); // Refresh API data
        }
    };

    const openEditModal = (payment) => {
        setIsEditing(true);
        setEditingPaymentId(payment.id);
        setSelectedOrderId(payment.orderId);
        setAmount(payment.amount.toString());
        setMode(payment.mode);
        setModalVisible(true);
    };

    const openPaymentModalForOrder = (order) => {
        setSelectedOrderId(order.id);
        setAmount(order.balance.toString());
        setModalVisible(true);
    };

    const closeModal = () => {
        setModalVisible(false);
        setIsEditing(false);
        setEditingPaymentId(null);
        setSelectedOrderId('');
        setAmount('');
        setMode('Cash');
    };

    const processedPayments = useMemo(() => {
        if (!apiPayments || !Array.isArray(apiPayments)) return [];
        // Filter out zero amount payments
        return apiPayments.filter(p => Number(p.amount) > 0);
    }, [apiPayments]);

    const getDisplayBillId = (item) => {
        if (item.bill_id && String(item.bill_id).includes('/')) {
            return String(item.bill_id).toUpperCase();
        }

        const parentOrder = orders.find(o => String(o.id) === String(item.order_id));
        const rawOrderNo = parentOrder?.bill_no || parentOrder?.billNo || item.bill_no || item.bill_id || item.order_id;
        const formattedOrderNo = formatOrderNumber(rawOrderNo);
        const ordPrefix = formattedOrderNo.startsWith('ORD') ? `#${formattedOrderNo}` : (formattedOrderNo.startsWith('#') ? formattedOrderNo : `#ORD${formattedOrderNo}`);

        const orderPayments = [...processedPayments].filter(p => String(p.order_id) === String(item.order_id))
            .sort((a, b) => new Date(a.payment_date || a.created_at) - new Date(b.payment_date || b.created_at) || (a.id - b.id));
        
        const paymentIndex = orderPayments.findIndex(p => String(p.id) === String(item.id)) + 1;
        const seqNum = paymentIndex > 0 ? paymentIndex : 1;

        return `${ordPrefix}/#BILL${seqNum}`.toUpperCase();
    };

    const renderPaymentItem = ({ item }) => {
        // item fields from API:
        // payment_id, bill_id, customer_name, order_id, order_type,
        // payment_date, payment_mode, amount, balance_amount, invoice_url
        const formattedDate = item.payment_date
            ? new Date(item.payment_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })
            : '';

        const modeLabel = item.payment_mode || '';
        const isUpi = modeLabel === 'UPI' || modeLabel === 'GPAY' || modeLabel === 'GPay';
        const isCash = modeLabel === 'CASH' || modeLabel === 'Cash';

        return (
            <TouchableOpacity
                style={styles.paymentCard}
                onPress={() => item.payment_id && navigation.navigate('PaymentDetail', { paymentId: item.payment_id })}
                activeOpacity={0.85}
            >
                {/* Row 1: Customer Name & Order ID */}
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={styles.customerName} numberOfLines={1}>{item.customer_name || 'Unknown'}</Text>
                    <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: '#CBD5E1', marginHorizontal: 8 }} />
                    <Text style={styles.orderIdText}>{getDisplayBillId(item)}</Text>
                </View>

                {/* Divider */}
                <View style={{ height: 1, backgroundColor: '#F1F5F9', marginVertical: 8 }} />

                {/* Row 2: Date | Mode | Type */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={styles.dateTextCompact}>{formattedDate}</Text>
                        
                        <View style={{ width: 1, height: 12, backgroundColor: '#CBD5E1', marginHorizontal: 8 }} />
                        
                        <Text style={[styles.modeTextCompact, { color: isUpi ? '#4F46E5' : isCash ? '#16A34A' : Colors.textSecondary }]}>
                            {modeLabel}
                        </Text>
                        
                        {item.order_type && (
                            <>
                                <View style={{ width: 1, height: 12, backgroundColor: '#CBD5E1', marginHorizontal: 8 }} />
                                <Text style={styles.orderTypeTextCompact}>{item.order_type.toUpperCase()}</Text>
                            </>
                        )}
                    </View>
                    
                    {/* Amount */}
                    <Text style={styles.paymentAmount}>₹{item.amount?.toLocaleString()}</Text>
                </View>
            </TouchableOpacity>
        );
    };



    return (
        <View style={styles.container}>
            <StatusBar
                backgroundColor='#ffffff'
                barStyle="dark-content"
            />
            {/* Header + Unified Summary */}
            <View style={[styles.header, { paddingTop: insets.top }]}>
                <View style={styles.headerTop}>
                    <View>
                        <Text style={styles.screenTitle}>Payments</Text>
                        <Text style={styles.screenSubtitle}>{apiPayments?.length || 0} Total</Text>
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
                            style={[styles.filterBtn, filterStatus !== 'History' && styles.filterBtnActive]}
                            onPress={() => setFilterSheetVisible(true)}
                        >
                            <ListFilter size={22} color={filterStatus !== 'History' ? Colors.white : Colors.textPrimary} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Unified Dashboard Summary Card */}
                <View style={styles.summaryCard}>
                    {/* Top part: Month/Date Selector */}
                    <View style={styles.summaryDateRow}>
                        <TouchableOpacity
                            onPress={() => changeMonth(-1)}
                            style={styles.summaryDateArrow}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                            <ChevronLeft size={18} color={Colors.textSecondary} />
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => setShowDatePicker(true)}
                            style={[styles.summaryDateLabelBtn, { flexDirection: 'row', alignItems: 'center' }]}
                            activeOpacity={0.7}
                        >
                            <Calendar size={14} color={isCurrentMonth() ? Colors.primary : Colors.textSecondary} style={{ marginRight: 6 }} />
                            <Text style={[styles.summaryDateText, isCurrentMonth() && { color: Colors.primary }]}>
                                {getDisplayDateLabel()}
                            </Text>
                            <ChevronDown size={16} color={isCurrentMonth() ? Colors.primary : Colors.textSecondary} style={{ marginLeft: 4 }} />
                            {isCurrentMonth() && (
                                <View style={styles.currentMonthDot} />
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => changeMonth(1)}
                            style={styles.summaryDateArrow}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                            <ChevronRight size={18} color={Colors.textSecondary} />
                        </TouchableOpacity>
                        
                        {/* Month Reset Icon (only show if day filter is active) */}
                        {filterMode === 'day' && (
                            <TouchableOpacity onPress={goToCurrentMonth} style={{ marginLeft: 8, padding: 4 }}>
                                <X size={16} color={Colors.textSecondary} />
                            </TouchableOpacity>
                        )}
                    </View>

                    <View style={styles.summaryDivider} />

                    {/* Bottom part: Stats */}
                    <View style={styles.summaryStatsRow}>
                        <View style={styles.summaryStatItem}>
                            <Text style={styles.summaryStatLabel}>Total</Text>
                            <Text style={styles.summaryStatValue}>₹{(apiSummary.total_amount || 0).toLocaleString()}</Text>
                        </View>
                        <View style={styles.summaryStatDivider} />
                        <View style={styles.summaryStatItem}>
                            <Text style={styles.summaryStatLabel}>Paid</Text>
                            <Text style={[styles.summaryStatValue, { color: Colors.success }]}>₹{(apiSummary.collected_amount || 0).toLocaleString()}</Text>
                        </View>
                        <View style={styles.summaryStatDivider} />
                        <View style={styles.summaryStatItem}>
                            <Text style={styles.summaryStatLabel}>Balance</Text>
                            <Text style={[styles.summaryStatValue, { color: (apiSummary.balance_amount || 0) > 0 ? Colors.danger : Colors.textPrimary }]}>
                                ₹{(apiSummary.balance_amount || 0).toLocaleString()}
                            </Text>
                        </View>
                    </View>
                </View>

                <CustomCalendarPicker
                    visible={showDatePicker}
                    selectedDate={filterMode === 'day' ? currentDate : null}
                    onDateSelect={onDateChange}
                    onClose={() => setShowDatePicker(false)}
                />

                {/* Search Row */}
                {isSearchVisible && (
                    <View style={styles.searchContainer}>
                        <Search size={18} color={Colors.textSecondary} />
                        <TextInput
                            style={styles.searchInput}
                            placeholderTextColor={Colors.textSecondary}
                            placeholder="Search by Customer Name, Bill No..."
                            value={search}
                            onChangeText={setSearch}
                            autoFocus={true}
                        />
                        {search.length > 0 && (
                            <TouchableOpacity
                                onPress={() => setSearch('')}
                                style={styles.resetButton}
                            >
                                <X size={18} color={Colors.textSecondary} />
                            </TouchableOpacity>
                        )}
                    </View>
                )}

                {filterStatus !== 'History' && (
                    <View style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={{ fontFamily: 'Inter-Medium', color: Colors.textSecondary, fontSize: 13 }}>Showing: </Text>
                        <View style={{ backgroundColor: '#F3F4F6', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Text style={{ fontFamily: 'Inter-SemiBold', color: Colors.textPrimary, fontSize: 13 }}>{filterStatus} Orders</Text>
                            <TouchableOpacity onPress={() => setFilterStatus('History')}>
                                <X size={14} color={Colors.textSecondary} />
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </View>

            {/* Content List */}
            {paymentsLoading ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={processedPayments}
                    renderItem={renderPaymentItem}
                    keyExtractor={(item, index) => String(item.payment_id || item.id || index) + '-' + index}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl
                            refreshing={paymentsLoading}
                            onRefresh={refreshPayments}
                            colors={[Colors.primary]}
                            tintColor={Colors.primary}
                        />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <View style={styles.emptyIconBox}>
                                <ReceiptIndianRupee size={48} color={Colors.textSecondary} />
                            </View>
                            <Text style={styles.emptyTitle}>No payments found</Text>
                            <Text style={styles.emptySubtext}>Try changing the filter, month or search query</Text>
                            <TouchableOpacity style={styles.emptyCta} onPress={() => navigation.navigate('Orders')}>
                                <Text style={styles.emptyCtaText}>View Orders</Text>
                            </TouchableOpacity>
                        </View>
                    }
                />
            )}

            {/* Filter Sheet */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={filterSheetVisible}
                onRequestClose={() => setFilterSheetVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <TouchableOpacity
                        style={{ flex: 1 }}
                        activeOpacity={1}
                        onPress={() => setFilterSheetVisible(false)}
                    />
                    <View style={styles.bottomSheet}>
                        <View style={styles.bottomSheetHeader}>
                            <Text style={styles.bottomSheetTitle}>Filter Status</Text>
                            <TouchableOpacity onPress={() => setFilterSheetVisible(false)}>
                                <Text style={{ color: Colors.primary, fontFamily: 'Inter-SemiBold' }}>Done</Text>
                            </TouchableOpacity>
                        </View>

                        {['History', 'Pending', 'Paid'].map((status, index) => (
                            <TouchableOpacity
                                key={`${status}-${index}`}
                                style={[styles.optionItem, status === filterStatus && { backgroundColor: '#F9FAFB' }]}
                                onPress={() => {
                                    setFilterStatus(status);
                                    setFilterSheetVisible(false);
                                }}
                            >
                                <View style={[styles.optionIcon, {
                                    backgroundColor: status === filterStatus ? Colors.primary + '20' : '#F3F4F6'
                                }]}>
                                    {status === 'History' && <ReceiptIndianRupee size={20} color={status === filterStatus ? Colors.primary : Colors.textSecondary} />}
                                    {status === 'Pending' && <Clock size={20} color={status === filterStatus ? Colors.primary : Colors.textSecondary} />}
                                    {status === 'Paid' && <CheckCircle2 size={20} color={status === filterStatus ? Colors.primary : Colors.textSecondary} />}
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.optionLabel, status === filterStatus && { color: Colors.primary }]}>
                                        {status === 'History' ? 'All Transactions' : status + ' Bills'}
                                    </Text>
                                    <Text style={styles.optionDesc}>
                                        {status === 'History' && 'View all payments received'}
                                        {status === 'Pending' && 'Orders with balance due'}
                                        {status === 'Paid' && 'Fully paid orders'}
                                    </Text>
                                </View>
                                {status === filterStatus && (
                                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primary }} />
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </Modal>



            {/* Payment Options Custom Sheet (Animated) */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={paymentOptionsVisible}
                onRequestClose={() => setPaymentOptionsVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <TouchableOpacity
                        style={{ flex: 1 }}
                        activeOpacity={1}
                        onPress={() => setPaymentOptionsVisible(false)}
                    />
                    <View style={styles.bottomSheet}>
                        <View style={styles.bottomSheetHeader}>
                            <Text style={styles.bottomSheetTitle}>Payment Options</Text>
                            <TouchableOpacity onPress={() => setPaymentOptionsVisible(false)}>
                                <Text style={{ color: Colors.primary, fontFamily: 'Inter-SemiBold' }}>Cancel</Text>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            style={styles.optionItem}
                            onPress={() => {
                                setPaymentOptionsVisible(false);
                                if (activePayment) openEditModal(activePayment);
                            }}
                        >
                            <View style={[styles.optionIcon, { backgroundColor: '#F0F9FF' }]}>
                                <Edit2 size={20} color="#0284C7" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.optionLabel}>Edit Payment</Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.optionItem, { borderBottomWidth: 0 }]}
                            onPress={() => {
                                setPaymentOptionsVisible(false);
                                setDeleteSheetVisible(true);
                            }}
                        >
                            <View style={[styles.optionIcon, { backgroundColor: '#FEF2F2' }]}>
                                <Trash2 size={20} color={Colors.danger} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.optionLabel, { color: Colors.danger }]}>Delete Payment</Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <BottomConfirmationSheet
                visible={deleteSheetVisible}
                onClose={() => setDeleteSheetVisible(false)}
                onConfirm={confirmDelete}
                title="Delete Payment"
                description="Are you sure you want to delete this payment record? This will update the bill balance."
                confirmText="Delete Payment"
                type="danger"
            />

            <AlertModal
                visible={alertVisible}
                title={alertConfig.title}
                message={alertConfig.message}
                onClose={() => setAlertVisible(false)}
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
        paddingBottom: 12,
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
    monthSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        borderRadius: 10,
        paddingHorizontal: 6,
        paddingVertical: 4,
        gap: 4,
    },
    monthArrow: {
        padding: 4,
        alignItems: 'center',
        justifyContent: 'center',
    },
    monthText: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 13,
        color: Colors.textPrimary,
        minWidth: 55,
        textAlign: 'center',
    },
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
    summaryCard: {
        backgroundColor: Colors.white,
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        ...Shadow.medium,
    },
    summaryDateRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    summaryDateArrow: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: '#F8FAFC',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    summaryDateLabelBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    summaryDateText: {
        fontFamily: 'Inter-Bold',
        fontSize: 16,
        color: Colors.textPrimary,
    },
    currentMonthDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: Colors.primary,
        marginLeft: 6,
    },
    summaryDivider: {
        height: 1,
        backgroundColor: '#F1F5F9',
        marginBottom: 16,
    },
    summaryStatsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    summaryStatItem: {
        flex: 1,
        alignItems: 'center',
    },
    summaryStatLabel: {
        fontFamily: 'Inter-Medium',
        fontSize: 13,
        color: Colors.textSecondary,
        marginBottom: 4,
    },
    summaryStatValue: {
        fontFamily: 'Inter-Bold',
        fontSize: 18,
        color: Colors.textPrimary,
    },
    summaryStatDivider: {
        width: 1,
        height: 30,
        backgroundColor: '#F1F5F9',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        paddingHorizontal: Spacing.md,
        height: 48,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        marginTop: 4,
    },
    searchInput: {
        flex: 1,
        marginLeft: Spacing.sm,
        fontFamily: 'Inter-Medium',
        fontSize: 15,
        color: Colors.textPrimary,
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
    tabBar: {
        flexDirection: 'row',
        backgroundColor: Colors.white,
        paddingHorizontal: Spacing.md,
        paddingBottom: Spacing.md,
    },
    tab: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    activeTab: {
        borderBottomColor: Colors.primary,
    },
    tabText: {
        fontFamily: 'Inter-Medium',
        fontSize: 15,
        color: Colors.textSecondary,
    },
    activeTabText: {
        color: Colors.primary,
        fontFamily: 'Inter-Bold',
    },
    analyticsRow: {
        flexDirection: 'row',
        paddingHorizontal: Spacing.md,
        gap: Spacing.md,
        marginBottom: Spacing.sm,
    },
    analyticsCard: {
        flex: 1,
        padding: Spacing.md,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    analyticsIcon: {
        marginBottom: 8,
    },
    analyticsLabel: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 12,
        color: Colors.textSecondary,
        marginBottom: 4,
    },
    analyticsValue: {
        fontFamily: 'Inter-Bold',
        fontSize: 16,
    },
    listContent: {
        padding: Spacing.md,
        paddingBottom: 110,
    },
    paymentCard: {
        backgroundColor: Colors.white,
        borderRadius: 12,
        marginBottom: 10,
        padding: 12,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        ...Shadow.subtle,
    },
    orderIdText: {
        fontFamily: 'Inter-Medium',
        fontSize: 13,
        color: '#64748B',
    },
    modeTextCompact: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 12,
    },
    orderTypeTextCompact: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 12,
        color: '#16A34A',
    },
    dateTextCompact: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 12,
        color: '#64748B',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    customerInfo: {
        flex: 1,
        marginRight: 12,
    },
    customerName: {
        fontFamily: 'Inter-Bold',
        fontSize: 16,
        color: '#0F172A',
        maxWidth: '60%',
    },
    billIdText: {
        fontFamily: 'Inter-Medium',
        fontSize: 13,
        color: '#64748B',
    },
    modeBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
    },
    modeText: {
        fontFamily: 'Inter-Bold',
        fontSize: 11,
    },
    cardDivider: {
        height: 1,
        backgroundColor: '#F1F5F9',
        marginBottom: 12,
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
        alignItems: 'flex-end',
    },
    orderTypeRow: {
        flexDirection: 'row',
        marginBottom: 8,
    },
    orderTypeBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
    },
    orderTypeText: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 11,
    },
    dateRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    dateText: {
        fontFamily: 'Inter-Medium',
        fontSize: 13,
        color: '#64748B',
    },
    paymentAmount: {
        fontFamily: 'Inter-Bold',
        fontSize: 18,
        color: Colors.textPrimary,
    },
    cardActions: {
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
        paddingVertical: 8,
    },
    actionBtn: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 6,
    },
    actionBtnText: {
        fontFamily: 'Inter-Medium',
        fontSize: 14,
        color: Colors.primary,
    },
    orderCard: {
        backgroundColor: Colors.white,
        borderRadius: 12,
        padding: Spacing.md,
        marginBottom: Spacing.sm,
        borderWidth: 1,
        borderColor: Colors.border,
        ...Shadow.subtle,
    },
    orderTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    billNoText: {
        fontFamily: 'Inter-Regular',
        fontSize: 14,
        color: Colors.textSecondary,
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
    },
    statusText: {
        fontFamily: 'Inter-Bold',
        fontSize: 12,
    },
    orderStats: {
        backgroundColor: '#F9FAFB',
        padding: 10,
        borderRadius: 8,
        marginBottom: 12,
    },
    statLine: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    statLabel: {
        fontFamily: 'Inter-Medium',
        fontSize: 13,
        color: Colors.textPrimary,
    },
    updatePaymentBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: Colors.primary,
        gap: 6,
    },
    updatePaymentBtnText: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 14,
        color: Colors.primary,
    },
    emptyContainer: {
        alignItems: 'center',
        padding: 48,
    },
    emptyIconBox: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: Colors.background,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.lg,
    },
    emptyTitle: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 18,
        color: Colors.textPrimary,
        marginBottom: Spacing.xs,
        textAlign: 'center',
    },
    emptySubtext: {
        fontFamily: 'Inter-Regular',
        fontSize: 14,
        color: Colors.textSecondary,
        textAlign: 'center',
        marginBottom: Spacing.lg,
    },
    emptyCta: {
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.md,
        backgroundColor: Colors.primary,
        borderRadius: 12,
    },
    emptyCtaText: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 15,
        color: Colors.white,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    bottomSheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: Colors.white,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        paddingBottom: 40,
        ...Shadow.large
    },
    bottomSheetHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24
    },
    bottomSheetTitle: {
        fontFamily: 'Inter-Bold',
        fontSize: 18,
        color: Colors.textPrimary
    },
    optionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
        gap: 16
    },
    optionIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center'
    },
    optionLabel: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 16,
        color: Colors.textPrimary,
        marginBottom: 4
    },

    modalContent: {
        backgroundColor: Colors.white,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: Spacing.xl,
        paddingBottom: Platform.OS === 'ios' ? 40 : Spacing.xl,
    },
    inputGroup: {
        marginBottom: Spacing.lg,
    },
    label: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 14,
        color: Colors.textSecondary,
        marginBottom: 8,
    },
    billSelector: {
        flexDirection: 'row',
        marginBottom: 4,
    },
    billChip: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: Colors.border,
        marginRight: 8,
        backgroundColor: Colors.white,
    },
    billChipActive: {
        backgroundColor: '#EEF2FF',
        borderColor: Colors.primary,
    },
    billChipText: {
        fontFamily: 'Inter-Medium',
        fontSize: 13,
        color: Colors.textSecondary,
    },
    billChipTextActive: {
        color: Colors.primary,
        fontFamily: 'Inter-Bold',
    },
    input: {
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 12,
        height: 56,
        paddingHorizontal: Spacing.md,
        fontFamily: 'Inter-Bold',
        fontSize: 18,
        color: Colors.textPrimary,
    },
    modeRow: {
        flexDirection: 'row',
        gap: 10,
    },
    modeBtn: {
        flex: 1,
        height: 48,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: Colors.border,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.white,
    },
    modeBtnActive: {
        borderColor: Colors.primary,
        backgroundColor: '#EEF2FF',
    },
    modeBtnText: {
        fontFamily: 'Inter-Medium',
        fontSize: 14,
        color: Colors.textSecondary,
    },
    modeBtnTextActive: {
        color: Colors.primary,
        fontFamily: 'Inter-Bold',
    },
    modalFooter: {
        flexDirection: 'row',
        gap: Spacing.md,
        marginTop: Spacing.md,
    },
    cancelBtn: {
        flex: 1,
        height: 56,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.border,
    },
    cancelBtnText: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 16,
        color: Colors.textSecondary,
    },
    saveBtn: {
        flex: 2,
        height: 56,
        borderRadius: 12,
        backgroundColor: Colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    saveBtnText: {
        fontFamily: 'Inter-Bold',
        fontSize: 16,
        color: Colors.white,
    },
    optionDesc: {
        fontFamily: 'Inter-Regular',
        fontSize: 13,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    resetButton: {
        padding: 4,
        marginLeft: 4,
    },
});

export default PaymentsScreen;
