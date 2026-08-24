import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Modal, TextInput, Dimensions, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { Colors, Spacing, Shadow, Typography } from '../constants/theme';
import {
    ChevronDown, Printer, Share2, HelpCircle, ArrowLeft, Trash2, Edit2, ChevronRight,
    Calculator, Calendar, Receipt, User, Smartphone, CreditCard, Banknote, Clock,
    CheckCircle2, AlertCircle, X, Info, Phone, Mail, MapPin, Download, FileText,
    PlayCircle, StopCircle, PlusCircle, ReceiptIndianRupee, PenTool, Check,
    AlertTriangle, Flame, Shirt, Layers, Tag, MoreVertical, Eye, XCircle
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Sound from 'react-native-sound';
import ImageView from 'react-native-image-viewing';
import Share from 'react-native-share';
import CalendarModal from '../components/CalendarModal';
import { formatDate, parseDate } from '../utils/dateUtils';
// import ReusableBottomDrawer from '../components/ReusableBottomDrawer';
import { normalizeItems, convertLogoToBase64, saveTailorCopyPDF, saveCustomerCopyPDF } from '../services/pdfService';
import {
    formatQuantityOrdinalLabel,
    getItemQuantitySections,
} from '../utils/orderQuantitySections';
import { getDisplayItemCount } from '../utils/orderItemCount';
// FileSystem replaced by RNFS
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { getCompanyLogoUri, getUserProfilePhotoUri } from '../utils/branding';
import { useData } from '../context/DataContext';
import AlertModal from '../components/AlertModal';
import BottomConfirmationSheet from '../components/BottomConfirmationSheet';
import { useToast } from '../context/ToastContext';
import { useDispatch, useSelector } from 'react-redux';
import {
    getOrderByIdAction,
    getOrderStatusesAction,
    getOrdersListAction,
    downloadOrderCopyAction,
    updateOrderItemDatesAction,
    updateOrderItemStatusAction,
} from '../store/salesOrderSlice';
import { createOrderPaymentAction, getOrderPaymentsAction } from '../store/paymentSlice';
import { URL_ORDERS } from '../config/env';
import {
    sharePdfToWhatsAppChooser,
    sharePdfToWhatsAppNumber,
} from '../utils/whatsappShare';
// import { getDeliveryLoad } from '../utils/loadUtils';

const { width } = Dimensions.get('window');
const API_BASE_URL = (URL_ORDERS || '').replace(/\/mobile\/orders\/?$/i, '').replace(/\/+$/, '');

const getPaymentModePayload = (mode) => {
    const normalizedMode = String(mode || '').trim().toUpperCase();

    if (normalizedMode === 'UPI' || normalizedMode === 'BANK' || normalizedMode === 'CARD') {
        return normalizedMode;
    }

    return 'CASH';
};

const getErrorMessage = (error) => {
    if (!error) {
        return 'Could not save payment';
    }

    if (typeof error === 'string') {
        return error;
    }

    return error.message || error.error || error.data?.message || 'Could not save payment';
};

const resolveInvoiceUrl = (value) => {
    if (!value) {
        return null;
    }

    const rawValue = String(value).trim();
    if (!rawValue) {
        return null;
    }

    if (/^(https?:|file:|content:|data:)/i.test(rawValue)) {
        return rawValue;
    }

    if (!API_BASE_URL) {
        return rawValue;
    }

    if (rawValue.startsWith('/')) {
        return `${API_BASE_URL}${rawValue}`;
    }

    return `${API_BASE_URL}/${rawValue.replace(/^\/+/, '')}`;
};

const getPaymentTimestamp = payment =>
    new Date(
        payment?.created_at ||
        payment?.date ||
        payment?.updated_at ||
        payment?.createdAt ||
        payment?.updatedAt ||
        0,
    ).getTime();

const getDisplayOrderNumber = (order) => {
    const billNo = order?.billNo;
    if (billNo !== null && billNo !== undefined && String(billNo).trim() !== '') {
        return String(billNo);
    }

    const rawOrderId = order?.id;
    if (rawOrderId === null || rawOrderId === undefined) {
        return 'N/A';
    }

    const orderId = String(rawOrderId);
    if (orderId.includes('_')) {
        return orderId.split('_')[1] || orderId;
    }

    return orderId;
};

const formatAmountValue = (value) => (
    Number(value ?? 0).toLocaleString('en-IN')
);

const toAmountNumber = (value) => {
    const parsedValue = Number(value);
    return Number.isFinite(parsedValue) ? parsedValue : null;
};

const getFirstFiniteAmount = (...values) => {
    for (const value of values) {
        const parsedValue = toAmountNumber(value);
        if (parsedValue !== null) {
            return parsedValue;
        }
    }

    return null;
};

const getNormalizedDiscountType = (value) => {
    if (value === 'PERCENTAGE' || value === '%') {
        return '%';
    }

    if (value === 'FIXED' || value === '₹') {
        return '₹';
    }

    return value || '₹';
};

const getDiscountTypeKey = value => {
    const normalizedValue = String(value || '').trim().toUpperCase();

    if (
        normalizedValue === 'PERCENTAGE' ||
        normalizedValue === 'PERCENT' ||
        normalizedValue === '%'
    ) {
        return 'percentage';
    }

    return 'fixed';
};

const deriveActualAmountFromSubtotal = ({
    subtotalAmount,
    discountAmount,
    discountType,
    discountValue,
}) => {
    const normalizedSubtotal = toAmountNumber(subtotalAmount);
    if (normalizedSubtotal === null) {
        return null;
    }

    const explicitDiscountAmount = toAmountNumber(discountAmount);
    if (explicitDiscountAmount !== null) {
        return normalizedSubtotal + Math.max(0, explicitDiscountAmount);
    }

    const normalizedDiscountValue = Math.max(0, Number(discountValue) || 0);
    if (normalizedDiscountValue <= 0) {
        return normalizedSubtotal;
    }

    if (getDiscountTypeKey(discountType) === 'percentage') {
        if (normalizedDiscountValue >= 100) {
            return normalizedSubtotal;
        }

        return normalizedSubtotal / (1 - (normalizedDiscountValue / 100));
    }

    return normalizedSubtotal + normalizedDiscountValue;
};

const calculateDiscountAmount = ({
    baseAmount,
    discountAmount,
    discountType,
    discountValue,
}) => {
    const normalizedBaseAmount = Math.max(0, Number(baseAmount) || 0);
    const explicitDiscountAmount = toAmountNumber(discountAmount);
    if (explicitDiscountAmount !== null) {
        return Math.max(0, Math.min(explicitDiscountAmount, normalizedBaseAmount));
    }

    const normalizedDiscountValue = Math.max(0, Number(discountValue) || 0);
    if (normalizedDiscountValue <= 0 || normalizedBaseAmount <= 0) {
        return 0;
    }

    if (getDiscountTypeKey(discountType) === 'percentage') {
        return Math.max(
            0,
            Math.min(
                normalizedBaseAmount,
                (normalizedBaseAmount * normalizedDiscountValue) / 100,
            ),
        );
    }

    return Math.max(0, Math.min(normalizedDiscountValue, normalizedBaseAmount));
};

const getOrderPricingSummary = ({
    order,
    activeItemAmount = 0,
    cancelledItemAmount = 0,
    paidAmount = 0,
    isOrderCancelled = false,
}) => {
    const explicitDiscountAmount = getFirstFiniteAmount(
        order?.discountAmount,
        order?.discount,
        order?.discount_amount,
    );
    const discountValue =
        getFirstFiniteAmount(order?.discountValue, order?.discount_value) || 0;
    const discountType = getNormalizedDiscountType(
        order?.discountType || order?.discount_type,
    );
    const explicitActualAmount = getFirstFiniteAmount(
        order?.actualAmount,
        order?.actual_amount,
        order?.grossAmount,
        order?.gross_amount,
        order?.originalAmount,
        order?.original_amount,
    );
    const explicitSubtotalAmount = getFirstFiniteAmount(
        order?.finalAmount,
        order?.final_amount,
        order?.totalAmount,
        order?.total_amount,
        order?.total,
        order?.subtotal,
    );
    const grossItemAmount = Math.max(
        0,
        (Number(activeItemAmount) || 0) + (Number(cancelledItemAmount) || 0),
    );
    const subtotalAmount = isOrderCancelled
        ? 0
        : explicitSubtotalAmount ?? Math.max(0, Number(activeItemAmount) || 0);
    const derivedActualAmount = deriveActualAmountFromSubtotal({
        subtotalAmount,
        discountAmount: explicitDiscountAmount,
        discountType,
        discountValue,
    });
    const actualAmount =
        explicitActualAmount ??
        derivedActualAmount ??
        subtotalAmount ??
        grossItemAmount;
    const discountAmount = calculateDiscountAmount({
        baseAmount: actualAmount,
        discountAmount: explicitDiscountAmount,
        discountType,
        discountValue,
    });
    const normalizedPaidAmount = Math.max(0, Number(paidAmount) || 0);

    return {
        actualAmount,
        subtotalAmount,
        discountAmount,
        discountValue,
        discountType,
        paidAmount: normalizedPaidAmount,
        balanceAmount: subtotalAmount - normalizedPaidAmount,
        grossItemAmount,
    };
};

const getItemPricingSummary = item => {
    const explicitDiscountAmount = getFirstFiniteAmount(
        item?.discount_amount,
        item?.discountAmount,
        item?.discount,
    );
    const discountValue =
        getFirstFiniteAmount(item?.discount_value, item?.discountValue) || 0;
    const discountType = getNormalizedDiscountType(
        item?.discount_type || item?.discountType,
    );
    const explicitActualAmount = getFirstFiniteAmount(
        item?.original_amount,
        item?.originalAmount,
        item?.actual_amount,
        item?.actualAmount,
        item?.gross_amount,
        item?.grossAmount,
    );
    const explicitSubtotalAmount = getFirstFiniteAmount(
        item?.final_amount,
        item?.finalAmount,
        item?.amount,
        item?.totalCost,
        item?.total_price,
        item?.subtotal,
        item?.sub_total,
        item?.total_amount,
        item?.totalAmount,
    );
    const subtotalAmount = explicitSubtotalAmount ?? 0;
    const actualAmount =
        explicitActualAmount ??
        deriveActualAmountFromSubtotal({
            subtotalAmount,
            discountAmount: explicitDiscountAmount,
            discountType,
            discountValue,
        }) ??
        subtotalAmount;
    const discountAmount = calculateDiscountAmount({
        baseAmount: actualAmount,
        discountAmount: explicitDiscountAmount,
        discountType,
        discountValue,
    });

    return {
        actualAmount,
        discountAmount,
        subtotalAmount,
        hasDiscount: discountAmount > 0,
    };
};

const getDisplayTextValue = (value) => {
    if (value === null || value === undefined || value === '') {
        return '';
    }

    if (typeof value === 'object') {
        return (
            value?.name ||
            value?.size_name ||
            value?.label ||
            value?.title ||
            value?.value ||
            value?.material_name ||
            value?.readymade_name ||
            ''
        );
    }

    return String(value);
};

const isCancelledStatusValue = value =>
    String(value || '').trim().toLowerCase() === 'cancelled';

const isYetToStartStatus = (statusValue, statusId) => {
    const sId = String(statusId ?? '').trim();
    if (sId === '1') return true;
    
    const sValue = String(statusValue || '').trim().toLowerCase();
    return sValue === 'yet to start' || sValue === 'pending' || sValue === 'yet_to_start';
};

const isEditBlockedForStitchingStatus = (item, splits = []) => {
    const itemBlocked = !isYetToStartStatus(item?.status, item?.statusId ?? item?.status_id);

    const splitBlocked = (splits || []).some(split => {
        if (isCancelledStatusValue(split?.status)) return true;
        return !isYetToStartStatus(split?.status, split?.statusId ?? split?.status_id);
    });

    return itemBlocked || splitBlocked;
};

const getTabIndex = (tab, orderCategory) => {
    if (tab === 'items') {
        return 1;
    }

    if (tab === 'payments' && orderCategory !== 'Sales') {
        return 2;
    }

    return 0;
};

const getStatusDisplayText = (statusValue) => {
    if (!statusValue) return 'Yet to Start';
    const str = String(statusValue);
    const normalized = str.toUpperCase().replace(/_/g, ' ').trim();
    
    if (normalized === 'YET TO START' || normalized === 'PENDING') return 'Yet to Start';
    if (normalized === 'IN PROGRESS' || normalized === 'INPROGRESS') return 'In Progress';
    if (normalized === 'STITCHING') return 'Stitching';
    if (normalized === 'COMPLETED') return 'Completed';
    if (normalized === 'DELIVERED') return 'Delivered';
    if (normalized === 'CANCELLED') return 'Cancelled';
    
    return str.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
};

const OrderDetailScreen = ({ route, navigation }) => {
    const { orderId } = route.params;
    const { orders, deleteOrder, updateOrder, updatePayment, deletePayment, payments, customers, cancelItem, cancelPayment } = useData();
    const { company, user, userToken } = useAuth();
    const insets = useSafeAreaInsets();
    const dispatch = useDispatch();
    const currentOrder = useSelector(state => state.salesOrder.currentOrder);
    const currentOrderLoading = useSelector(state => state.salesOrder.currentOrderLoading);
    const currentOrderError = useSelector(state => state.salesOrder.currentOrderError);
    const currentOrderRequestId = useSelector(state => state.salesOrder.currentOrderId);
    const orderItemStatuses = useSelector(state => state.salesOrder.orderItemStatuses);
    const orderItemStatusesLoading = useSelector(state => state.salesOrder.orderItemStatusesLoading);
    const orderItemStatusesLoaded = useSelector(state => state.salesOrder.orderItemStatusesLoaded);
    const orderItemStatusesError = useSelector(state => state.salesOrder.orderItemStatusesError);
    const updateOrderItemDatesLoading = useSelector(state => state.salesOrder.updateOrderItemDatesLoading);
    const updateOrderItemDatesTarget = useSelector(state => state.salesOrder.updateOrderItemDatesTarget);
    const updateOrderItemStatusLoading = useSelector(state => state.salesOrder.updateOrderItemStatusLoading);
    const updateOrderItemStatusItemId = useSelector(state => state.salesOrder.updateOrderItemStatusItemId);
    const createOrderPaymentLoading = useSelector(state => state.payment.createOrderPaymentLoading);
    const orderPaymentHistoryList = useSelector(state => state.payment.orderPaymentHistoryList);
    const orderPaymentHistoryOrderId = useSelector(state => state.payment.orderPaymentHistoryOrderId);
    const orderPaymentHistoryLoading = useSelector(state => state.payment.orderPaymentHistoryLoading);
    const orderPaymentHistoryError = useSelector(state => state.payment.orderPaymentHistoryError);
    const [paymentModalVisible, setPaymentModalVisible] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentMode, setPaymentMode] = useState('Cash');
    const [isPrinting] = useState(false);
    const [isPrintOptionsVisible, setIsPrintOptionsVisible] = useState(false);
    const [isSharing, setIsSharing] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [statusModalVisible, setStatusModalVisible] = useState(false);
    const [statusItemIndex, setStatusItemIndex] = useState(null);
    const [statusSplitIndex, setStatusSplitIndex] = useState(null);
    const [pendingStatusOption, setPendingStatusOption] = useState(null);
    const [updatingStatusOptionId, setUpdatingStatusOptionId] = useState(null);
    const [dateType, setDateType] = useState('delivery'); // 'trial' or 'delivery'
    const [selectedItem, setSelectedItem] = useState(null);
    const [previewImageUri, setPreviewImageUri] = useState(null);
    const [activeTab, setActiveTab] = useState(
        route.params?.initialTab === 'payments' || route.params?.activeTab === 'payments'
            ? 'payments'
            : 'details'
    );
    const scrollRef = useRef(null);
    const [editingPayment, setEditingPayment] = useState(null);
    const [cancelPaymentModalVisible, setCancelPaymentModalVisible] = useState(false);
    const [paymentToCancel, setPaymentToCancel] = useState(null);
    const [paymentToDelete, setPaymentToDelete] = useState(null);
    const [cancellationReason, setCancellationReason] = useState('');
    const [activePaymentMenu, setActivePaymentMenu] = useState(null);
    const [transactionId, setTransactionId] = useState('');
    const [isOrderRefreshPending, setIsOrderRefreshPending] = useState(true);
    const [isPaymentRefreshPending, setIsPaymentRefreshPending] = useState(false);

    const handleEditPayment = (payment) => {
        setEditingPayment(payment);
        setPaymentAmount(payment.amount.toString());
        setPaymentMode(payment.mode);
        setTransactionId(payment.transactionId || '');
        setPaymentModalVisible(true);
    };

    const { showToast } = useToast();
    const order = currentOrder && String(currentOrder.id) === String(orderId)
        ? currentOrder
        : null;
    const displayOrderNumber = getDisplayOrderNumber(order);
    const currentOrderId = Number(order?.id ?? orderId) || order?.id || orderId;
    const hasOrderPaymentHistory = String(orderPaymentHistoryOrderId) === String(currentOrderId);
    const shouldShowOrderLoader =
        !order &&
        (currentOrderLoading ||
            (String(currentOrderRequestId ?? '') !== String(orderId) &&
                !currentOrderError));

    const refreshOrderDetail = React.useCallback(
        async (options = {}) => {
            const { showLoader = false } = options;

            if (showLoader) {
                setIsOrderRefreshPending(true);
            }

            try {
                return await dispatch(getOrderByIdAction(orderId)).unwrap();
            } finally {
                if (showLoader) {
                    setIsOrderRefreshPending(false);
                }
            }
        },
        [dispatch, orderId],
    );

    useFocusEffect(
        React.useCallback(() => {
            let isActive = true;

            setIsOrderRefreshPending(true);
            refreshOrderDetail({ showLoader: true }).catch(() => {
                if (isActive) {
                    setIsOrderRefreshPending(false);
                }
            });

            return () => {
                isActive = false;
            };
        }, [refreshOrderDetail]),
    );

    const resetPaymentForm = () => {
        setPaymentModalVisible(false);
        setEditingPayment(null);
        setPaymentAmount('');
        setPaymentMode('Cash');
        setTransactionId('');
    };

    const [paymentAmountError1, setPaymentAmountError1] = useState('');

    useEffect(() => {
        if (currentOrderError) {
            showToast(
                currentOrderError?.message ||
                currentOrderError?.error ||
                currentOrderError?.data?.message ||
                'Failed to load order details',
                'error',
            );
        }
    }, [currentOrderError, showToast]);

    useEffect(() => {
        if (orderPaymentHistoryError) {
            showToast(getErrorMessage(orderPaymentHistoryError), 'error');
        }
    }, [orderPaymentHistoryError, showToast]);

    useEffect(() => {
        if (orderItemStatusesError) {
            showToast(getErrorMessage(orderItemStatusesError), 'error');
        }
    }, [orderItemStatusesError, showToast]);

    useEffect(() => {
        if (!statusModalVisible || orderItemStatusesLoading || orderItemStatusesLoaded) {
            return;
        }

        dispatch(getOrderStatusesAction()).catch(() => { });
    }, [
        dispatch,
        orderItemStatusesLoaded,
        orderItemStatusesLoading,
        statusModalVisible,
    ]);

    useEffect(() => {
        if (!currentOrderId || order?.orderCategory === 'Sales' || activeTab !== 'payments') {
            return;
        }

        dispatch(getOrderPaymentsAction(currentOrderId)).catch(() => { });
    }, [activeTab, currentOrderId, dispatch, order?.orderCategory]);

    useEffect(() => {
        if ((route.params?.initialTab !== 'payments' && route.params?.activeTab !== 'payments') || order?.orderCategory === 'Sales') {
            return;
        }

        const timeoutId = setTimeout(() => {
            scrollRef.current?.scrollTo({
                x: width * 2,
                animated: false,
            });
        }, 0);

        return () => clearTimeout(timeoutId);
    }, [order?.orderCategory, route.params?.activeTab, route.params?.initialTab]);

    // const order = {
    //     '2026-02-18': {
    //         count: 4,
    //         status: 'low',
    //         urgentCount: 1,
    //     },
    //     '2026-02-19': {
    //         count: 9,
    //         status: 'medium',
    //         urgentCount: 2,
    //     },
    //     '2026-02-20': {
    //         count: 15,
    //         status: 'high',
    //         urgentCount: 5,
    //     },
    // };
    //

    const handleDeletePayment = (payment) => {
        setActivePaymentMenu(null);
        setPaymentToDelete(payment);
        setDeletePaymentSheetVisible(true);
    };

    const confirmDeletePayment = async () => {
        if (!paymentToDelete) return;

        try {
            if (deletePayment) {
                await deletePayment(paymentToDelete.id);
                setDeletePaymentSheetVisible(false);
                setPaymentToDelete(null);
                await refreshOrderDetail().catch(() => null);
                showToast("Payment deleted", "success");
            } else {
                console.error("deletePayment function missing from context");
            }
        } catch (error) {
            setDeletePaymentSheetVisible(false);
            setPaymentToDelete(null);
            setAlertConfig({ title: 'Error', message: error.message });
            setAlertVisible(true);
        }
    };

    const handleCancelPayment = (payment) => {
        setPaymentToCancel(payment);
        setCancellationReason('');
        setCancelPaymentModalVisible(true);
        setActivePaymentMenu(null);
    };

    const confirmCancelPayment = async () => {
        if (!paymentToCancel) return;
        if (!cancellationReason.trim()) {
            showToast("Please provide a reason", "warning");
            return;
        }

        try {
            await cancelPayment(paymentToCancel.id, cancellationReason);
            await refreshOrderDetail().catch(() => null);
            showToast("Payment cancelled", "success");
            setCancelPaymentModalVisible(false);
            setPaymentToCancel(null);
            setCancellationReason('');
        } catch (error) {
            showToast("Failed to cancel payment", "error");
        }
    };

    const scrollToTab = React.useCallback((tab, animated = true) => {
        const tabIndex = getTabIndex(tab, order?.orderCategory);

        setActiveTab(tab);
        requestAnimationFrame(() => {
            scrollRef.current?.scrollTo({
                x: tabIndex * width,
                animated,
            });
        });
    }, [order?.orderCategory]);

    const handleTabPress = (tab) => {
        scrollToTab(tab, true);
    };

    const handleScroll = (event) => {
        const offsetX = event.nativeEvent.contentOffset.x;
        const index = Math.round(offsetX / width);
        const tabs = ['details', 'items', 'payments'];
        const newTab = tabs[index];
        if (newTab && newTab !== activeTab) {
            setActiveTab(newTab);
        }
    };



    // Alert State
    const [alertVisible, setAlertVisible] = useState(false);
    const [alertConfig, setAlertConfig] = useState({ title: '', message: '' });

    // Delete Item State
    const [deleteItemSheetVisible, setDeleteItemSheetVisible] = useState(false);
    const [itemToDeleteIndex, setItemToDeleteIndex] = useState(null);

    // Audio Playback
    const [playingUri, setPlayingUri] = useState(null);
    const soundRef = React.useRef(null);

    // Delivery Load Calculation
    const deliveryLoad = React.useMemo(() => {
        // return getDeliveryLoad(orders, -1, -1);
    }, []);

    // Date Picker State
    const [calendarVisible, setCalendarVisible] = useState(false);
    const [activeItemIndex, setActiveItemIndex] = useState(null);
    const [activeDateRowId, setActiveDateRowId] = useState(null);
    const [deleteSheetVisible, setDeleteSheetVisible] = React.useState(false);
    const [deletePaymentSheetVisible, setDeletePaymentSheetVisible] = useState(false);
    const [cancelSheetVisible, setCancelSheetVisible] = useState(false);
    const [itemSplitDateOverrides, setItemSplitDateOverrides] = useState({});
    const [itemSplitStatusOverrides, setItemSplitStatusOverrides] = useState({});

    useEffect(() => {
        setPaymentModalVisible(false);
        setEditingPayment(null);
        setPaymentAmount('');
        setPaymentMode('Cash');
        setTransactionId('');
        setCancelPaymentModalVisible(false);
        setPaymentToCancel(null);
        setDeletePaymentSheetVisible(false);
        setPaymentToDelete(null);
        setCancellationReason('');
        setActivePaymentMenu(null);
        setPreviewImageUri(null);
        setStatusModalVisible(false);
        setDeleteSheetVisible(false);
        setDeleteItemSheetVisible(false);
        setItemToDeleteIndex(null);
        setStatusItemIndex(null);
        setStatusSplitIndex(null);
        setPendingStatusOption(null);
        setUpdatingStatusOptionId(null);
        setCalendarVisible(false);
        setActiveItemIndex(null);
        setActiveDateRowId(null);
        setCancelSheetVisible(false);
        setItemSplitDateOverrides({});
        setItemSplitStatusOverrides({});
        setActiveTab(
            route.params?.initialTab === 'payments' || route.params?.activeTab === 'payments'
                ? 'payments'
                : 'details'
        );
    }, [orderId, route.params?.activeTab, route.params?.initialTab]);

    useEffect(() => {
        if (!order) {
            return;
        }

        setItemSplitDateOverrides({});
        setItemSplitStatusOverrides({});
    }, [order]);

    const handlePlayAudio = async (uri) => {
        try {
            if (playingUri === uri) {
                // Stop if currently playing this
                if (soundRef.current) {
                    soundRef.current.stop();
                    soundRef.current.release();
                    soundRef.current = null;
                }
                setPlayingUri(null);
                return;
            }

            // Stop any other sound
            if (soundRef.current) {
                soundRef.current.stop();
                soundRef.current.release();
                soundRef.current = null;
            }

            // Enable playback in silence mode
            Sound.setCategory('Playback');

            const sound = new Sound(uri, '', (error) => {
                if (error) {
                    console.log('failed to load the sound', error);
                    setAlertConfig({ title: 'Error', message: 'Could not play audio note' });
                    setAlertVisible(true);
                    return;
                }

                soundRef.current = sound;
                setPlayingUri(uri);

                sound.play((success) => {
                    if (success) {
                        setPlayingUri(null);
                        soundRef.current?.release();
                        soundRef.current = null;
                    } else {
                        console.log('playback failed due to audio decoding errors');
                    }
                });
            });
        } catch (error) {
            setAlertConfig({ title: 'Error', message: 'Could not play audio note' });
            setAlertVisible(true);
        }
    };

    // Cleanup audio on unmount
    React.useEffect(() => {
        return () => {
            if (soundRef.current) {
                soundRef.current.release();
            }
        };
    }, []);

    React.useLayoutEffect(() => {
        navigation.setOptions({
            headerLeft: () => (
                <TouchableOpacity
                    onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Main', { screen: 'Dashboard' })}
                    style={{ padding: 8, marginLeft: -8 }}
                >
                    <ArrowLeft size={24} color={Colors.textPrimary} />
                </TouchableOpacity>
            ),
            headerRight: () => null
        });
    }, [navigation]);

    useEffect(() => {
        if (!order) {
            return;
        }

        const timeoutId = setTimeout(() => {
            scrollRef.current?.scrollTo({
                x: getTabIndex(activeTab, order.orderCategory) * width,
                animated: false,
            });
        }, 0);

        return () => clearTimeout(timeoutId);
    }, [activeTab, order, order?.updatedAt, order?.orderCategory]);
    const contextPayments = payments.filter(
        p => String(p.orderId) === String(order?.id ?? ''),
    );
    const paymentHistoryListRaw = !order
        ? []
        : hasOrderPaymentHistory
            ? orderPaymentHistoryList
            : (contextPayments.length > 0 ? contextPayments : (order.payments || []));
            
    const paymentHistoryList = paymentHistoryListRaw.filter(p => Number(p.amount) > 0);
    const paymentHistoryCount = hasOrderPaymentHistory
        ? orderPaymentHistoryList.length
        : paymentHistoryList.length;
    const activePayments = paymentHistoryList.filter(
        p => (p.status || p.payment_status) !== 'Cancelled',
    );
    const totalPaymentsRecord = activePayments.reduce(
        (sum, p) => sum + (Number(p.amount) || 0),
        0,
    );
    const advancePaymentAmount = Number(
        order?.advance_payment ??
        order?.paid_amount ??
        order?.advance ??
        0,
    ) || 0;
    const hasAdvancePayment = advancePaymentAmount > 0;
    const totalPaid = paymentHistoryList.length > 0
        ? totalPaymentsRecord
        : advancePaymentAmount;

    const rawItemsForCalc = (order ? normalizeItems(order) : []).map(item => {
        if (order?.orderCategory === 'Sales') {
            return item;
        }

        const quantitySections =
            Array.isArray(item?.quantitySections) && item.quantitySections.length > 0
                ? item.quantitySections
                : getItemQuantitySections(item);
        const quantitySectionsWithStatusOverrides = quantitySections.map(section => {
            const overrideId =
                section?.id ??
                section?.quantityRowId ??
                section?.raw?.id ??
                null;
            const statusOverride = overrideId
                ? itemSplitStatusOverrides[String(overrideId)]
                : null;

            return {
                ...section,
                ...(statusOverride || {}),
            };
        });
        const totalAmount = quantitySectionsWithStatusOverrides.reduce(
            (sum, section) => sum + (Number(section.total) || 0),
            0,
        ) || Number(item.amount || item.totalCost || 0);
        const itemCancelledAmount = quantitySectionsWithStatusOverrides.reduce(
            (sum, section) => (
                isCancelledStatusValue(section?.status)
                    ? sum + (Number(section.total) || 0)
                    : sum
            ),
            0,
        );
        const activeAmount = totalAmount - itemCancelledAmount;
        const allSectionsCancelled =
            quantitySectionsWithStatusOverrides.length > 0 &&
            quantitySectionsWithStatusOverrides.every(section =>
                isCancelledStatusValue(section?.status),
            );

        return {
            ...item,
            amount: activeAmount,
            originalAmount: totalAmount,
            activeAmount,
            cancelledAmount: itemCancelledAmount,
            quantitySections: quantitySectionsWithStatusOverrides,
            splits: quantitySectionsWithStatusOverrides,
            totalCost: activeAmount,
            status: allSectionsCancelled ? 'Cancelled' : item.status,
        };
    });
    const activeTotal = rawItemsForCalc.reduce(
        (sum, item) => sum + (Number(item.activeAmount ?? item.amount) || 0),
        0,
    );
    const cancelledAmount = rawItemsForCalc.reduce(
        (sum, item) => sum + (Number(item.cancelledAmount) || 0),
        0,
    );
    const isOrderCancelled = order?.status === 'Cancelled';
    const orderPricing = getOrderPricingSummary({
        order,
        activeItemAmount: activeTotal,
        cancelledItemAmount: cancelledAmount,
        paidAmount: totalPaid,
        isOrderCancelled,
    });
    const orderActualAmount = orderPricing.actualAmount;
    const orderSubtotalAmount = orderPricing.subtotalAmount;
    const orderDiscountAmount = orderPricing.discountAmount;
    const orderDiscountValue = orderPricing.discountValue;
    const orderDiscountType = orderPricing.discountType;
    const finalBillAmount = orderSubtotalAmount;
    const currentBalance = Math.round((Number(orderPricing.balanceAmount) || 0) * 100) / 100;
    const canAddPayment = !isOrderCancelled && currentBalance > 0;
    const displayItems = rawItemsForCalc;

    const paymentBalanceLimit = React.useMemo(
        () => (editingPayment ? currentBalance + (editingPayment.amount || 0) : currentBalance),
        [currentBalance, editingPayment],
    );

    const paymentAmountError = React.useMemo(() => {
        const rawAmount = String(paymentAmount ?? '').trim();

        if (!rawAmount) {
            return '';
        }

        const amount = parseFloat(rawAmount);
        if (Number.isNaN(amount)) {
            return 'Please enter a valid payment amount.';
        }

        if (amount <= 0) {
            return 'Payment amount must be greater than 0.';
        }

        if (amount > paymentBalanceLimit) {
            return `Amount cannot be greater than balance due (₹${paymentBalanceLimit.toLocaleString('en-IN')}).`;
        }

        return '';
    }, [paymentAmount, paymentBalanceLimit]);

    const handlePaymentAmountChange = React.useCallback((value) => {
        setPaymentAmount(value);

        const enteredAmount = parseFloat(value || '0');
        const balanceAmount = Math.abs(currentBalance);

        if (enteredAmount > balanceAmount) {
            setPaymentAmountError1(
                `Amount cannot be greater than balance ₹${balanceAmount.toLocaleString('en-IN')}`
            );
        } else {
            setPaymentAmountError1('');
        }
    }, [currentBalance]);

    if (!order) {
        if (shouldShowOrderLoader || isOrderRefreshPending || currentOrderLoading) {
            return (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                    <Text style={[Typography.bodyMedium, { marginTop: 12 }]}>Loading order details...</Text>
                </View>
            );
        }

        return (
            <View style={styles.center}>
                <Text style={Typography.bodyMedium}>Order not found</Text>
                <TouchableOpacity
                    style={{ marginTop: 20, padding: 10, backgroundColor: Colors.primary, borderRadius: 8 }}
                    onPress={() => navigation.goBack()}
                >
                    <Text style={{ color: Colors.white }}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    if (isOrderRefreshPending) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={[Typography.bodyMedium, { marginTop: 12 }]}>Refreshing latest order items...</Text>
            </View>
        );
    }
    const orderRenderKey = (() => {
        const outfits = Array.isArray(order?.outfits) ? order.outfits : [];
        const outfitSignature = outfits
            .map((outfit) => `${outfit?.id || ''}:${outfit?.totalCost || outfit?.amount || 0}:${outfit?.quantity || outfit?.qty || 0}:${outfit?.status || ''}:${outfit?.updatedAt || outfit?.updated_at || ''}`)
            .join('|');
        const itemSignature = displayItems
            .map((item) => {
                const quantitySections = Array.isArray(item?.quantitySections) ? item.quantitySections : [];
                const splitSignature = quantitySections
                    .map((split) => `${split?.id || ''}:${split?.status || ''}:${split?.trialDate || ''}:${split?.deliveryDate || ''}:${split?.total || 0}`)
                    .join(',');

                return `${item?.id || item?.outfitId || item?.outfit_id || ''}:${item?.amount || item?.totalCost || 0}:${item?.qty || item?.quantity || 0}:${item?.status || ''}:${splitSignature}`;
            })
            .join('|');

        return [
            order?.id || orderId,
            order?.updatedAt || '',
            order?.total || 0,
            displayItems.length,
            outfitSignature,
            itemSignature,
        ].join('::');
    })();

    const getApiDateValue = (value) => {
        if (value === null || value === undefined || value === '') {
            return null;
        }

        const parsedDate = parseDate(value);
        if (!parsedDate || Number.isNaN(parsedDate.getTime())) {
            return null;
        }

        const year = parsedDate.getFullYear();
        const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
        const day = String(parsedDate.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const getSelectedDisplayItem = (index) => (
        index === null || index === undefined ? null : displayItems[index] || null
    );

    const getDateFieldLabel = (fieldName) => (
        fieldName === 'trial_date' ? 'Trial date' : 'Delivery date'
    );

    const getItemDateLoadingState = (itemId, fieldName) => (
        itemId !== null &&
        itemId !== undefined &&
        String(itemId).trim() !== '' &&
        updateOrderItemDatesLoading &&
        String(updateOrderItemDatesTarget?.itemId) === String(itemId) &&
        updateOrderItemDatesTarget?.targetField === fieldName
    );

    const isItemStatusUpdating = (itemId) => (
        itemId !== null &&
        itemId !== undefined &&
        String(itemId).trim() !== '' &&
        updateOrderItemStatusLoading &&
        String(updateOrderItemStatusItemId) === String(itemId)
    );

    const getSplitApiId = (item, index, splitIndex = null) => {
        const currentSplits = getSplitData(item, index);
        const selectedSplit = splitIndex !== null && splitIndex !== undefined
            ? currentSplits[splitIndex]
            : currentSplits[0];
        const candidates = [
            selectedSplit?.id,
            selectedSplit?.quantityRowId,
            selectedSplit?.raw?.id,
        ];

        const resolvedId = candidates.find(candidate => {
            if (candidate === null || candidate === undefined) {
                return false;
            }

            return String(candidate).trim() !== '';
        });

        return resolvedId !== undefined ? String(resolvedId) : null;
    };

    const getItemIdentity = (item, index) => {
        const candidates = [
            item?.id,
            item?.outfitId,
            item?.outfit_id,
            item?.itemId,
            item?.item_id,
            item?.raw?.id,
        ];

        const resolvedId = candidates.find(candidate => {
            if (candidate === null || candidate === undefined) {
                return false;
            }

            return String(candidate).trim() !== '';
        });

        return resolvedId !== undefined
            ? String(resolvedId)
            : `${orderId}-${index}`;
    };

    const getItemSplitOverrideKey = (item, index) => (
        getItemIdentity(item, index)
    );

    const getSplitData = (item, index) => {
        const quantitySections = Array.isArray(item?.quantitySections) && item.quantitySections.length > 0
            ? item.quantitySections
            : getItemQuantitySections(item);
        const targetLen = quantitySections.length || parseInt(item.qty || item.quantity || item.qnt || item.count || 1);
        const currentSplits = quantitySections;

        // If current splits length matches or exceeds qty, return them (but capped at qty)
        if (currentSplits.length >= targetLen) {
            return currentSplits.slice(0, targetLen);
        }

        // Otherwise, pad existing splits with default data
        const paddedSplits = [...currentSplits];
        for (let i = currentSplits.length; i < targetLen; i++) {
            paddedSplits.push({
                status: 'Yet to Start',
                deliveryDate: item.deliveryDate,
                trialDate: item.trialDate || null
            });
        }

        const overrideKey = getItemSplitOverrideKey(item, index);
        const overrideSplits = itemSplitDateOverrides[overrideKey];

        if (!Array.isArray(overrideSplits) || overrideSplits.length === 0) {
            return paddedSplits.map((split) => {
                const splitOverrideId = split?.id ?? split?.quantityRowId ?? split?.raw?.id ?? null;
                const statusOverride = splitOverrideId ? itemSplitStatusOverrides[String(splitOverrideId)] : null;

                return {
                    ...split,
                    ...(statusOverride || {}),
                };
            });
        }

        return paddedSplits.map((split, splitIndex) => {
            const nextSplit = {
                ...split,
                ...(overrideSplits[splitIndex] || {}),
            };
            const splitOverrideId = nextSplit?.id ?? nextSplit?.quantityRowId ?? nextSplit?.raw?.id ?? null;
            const statusOverride = splitOverrideId ? itemSplitStatusOverrides[String(splitOverrideId)] : null;

            return {
                ...nextSplit,
                ...(statusOverride || {}),
            };
        });
    };

    const getSplitByRowId = (rowId) => {
        if (rowId === null || rowId === undefined || String(rowId).trim() === '') {
            return null;
        }

        for (let itemIndex = 0; itemIndex < displayItems.length; itemIndex += 1) {
            const splits = getSplitData(displayItems[itemIndex], itemIndex);
            const matchedSplit = splits.find(split => String(split?.id ?? '') === String(rowId));
            if (matchedSplit) {
                return matchedSplit;
            }
        }

        return null;
    };

    const getCalendarInitialDate = () => {
        const selectedSplit = getSplitByRowId(activeDateRowId);
        if (!selectedSplit) {
            return null;
        }

        const rawDate = dateType === 'trial'
            ? selectedSplit?.trialDate
            : selectedSplit?.deliveryDate;

        return rawDate ? formatDate(rawDate) : null;
    };

    const normalizeStatusValue = (value) => (
        String(value || '')
            .trim()
            .toUpperCase()
            .replace(/\s+/g, '_')
    );

    const getSelectedStatusSplit = () => {
        if (statusItemIndex === null) {
            return null;
        }

        const selectedDisplayItem = getSelectedDisplayItem(statusItemIndex);
        if (!selectedDisplayItem) {
            return null;
        }

        const splits = getSplitData(selectedDisplayItem, statusItemIndex);
        if (statusSplitIndex !== null) {
            return splits[statusSplitIndex] || null;
        }

        return selectedDisplayItem;
    };

    const getIsStatusOptionSelected = (statusOption) => {
        const selectedSplit = getSelectedStatusSplit();
        if (!selectedSplit || !statusOption) {
            return false;
        }

        if (
            statusOption.statusId !== null &&
            statusOption.statusId !== undefined &&
            selectedSplit.statusId !== null &&
            selectedSplit.statusId !== undefined &&
            String(statusOption.statusId) === String(selectedSplit.statusId)
        ) {
            return true;
        }

        return normalizeStatusValue(statusOption.value || statusOption.label) ===
            normalizeStatusValue(selectedSplit.status);
    };

    const closeStatusModal = () => {
        setStatusModalVisible(false);
        setUpdatingStatusOptionId(null);
    };

    const getStatusOptionLabel = (statusOption) => {
        const normalizedStatusValue = normalizeStatusValue(
            statusOption?.value ||
            statusOption?.status ||
            statusOption?.label ||
            statusOption,
        );

        return statusOption?.label || (
            normalizedStatusValue === 'IN_PROGRESS'
                ? 'In Progress'
                : String(statusOption || '')
        );
    };

    const isCancelledStatusOption = (statusOption) => (
        normalizeStatusValue(
            statusOption?.value ||
            statusOption?.status ||
            statusOption?.label ||
            statusOption,
        ) === 'CANCELLED'
    );

    const isStatusOptionDisabled = (statusOption) => (
        (
            updateOrderItemStatusLoading &&
            statusItemIndex !== null &&
            isItemStatusUpdating(
                getSplitApiId(
                    displayItems[statusItemIndex],
                    statusItemIndex,
                    statusSplitIndex,
                ),
            )
        ) ||
        (hasAdvancePayment && isCancelledStatusOption(statusOption))
    );

    const buildStatusUpdatePayload = (item, itemIndex, splitIndex, statusOption) => {
        const splits = getSplitData(item, itemIndex);
        const selectedSplit = splitIndex !== null && splitIndex !== undefined
            ? splits[splitIndex] || null
            : splits[0] || null;
        const itemId = getSplitApiId(item, itemIndex, splitIndex);
        const quantityId =
            selectedSplit?.quantity_id ??
            selectedSplit?.quantityId ??
            selectedSplit?.raw?.quantity_id ??
            selectedSplit?.raw?.quantityId ??
            selectedSplit?.raw?.id ??
            null;
        const scopedItemId =
            selectedSplit?.raw?.item_id ??
            selectedSplit?.raw?.itemId ??
            item?.item_id ??
            item?.itemId ??
            itemId;

        return {
            itemId,
            item_id: scopedItemId,
            order_id: currentOrderId,
            outfit_id: item?.id ?? item?.outfitId ?? item?.outfit_id ?? item?.itemId ?? item?.item_id ?? null,
            quantity_id: quantityId,
            status: normalizeStatusValue(
                statusOption?.value ||
                statusOption?.status ||
                statusOption?.label ||
                statusOption,
            ),
            status_id: statusOption?.statusId,
        };
    };

    const applyLocalSplitStatusUpdate = (item, itemIndex, splitIndex, statusOption) => {
        const itemId = getSplitApiId(item, itemIndex, splitIndex);
        if (!itemId) {
            return;
        }

        setItemSplitStatusOverrides(previous => ({
            ...previous,
            [String(itemId)]: {
                status: getStatusOptionLabel(statusOption),
                statusId: statusOption?.statusId ?? previous?.[String(itemId)]?.statusId ?? null,
            },
        }));
    };

    const handleDateUpdate = async (newDate) => {
        if (!order || activeItemIndex === null) return;
        if (updateOrderItemDatesLoading) return;

        const selectedDisplayItem = getSelectedDisplayItem(activeItemIndex);
        const itemId = getSplitApiId(selectedDisplayItem, activeItemIndex, statusSplitIndex);
        const targetField = dateType === 'trial' ? 'trial_date' : 'delivery_date';
        const apiDateValue = getApiDateValue(newDate);
        const currentSplits = selectedDisplayItem ? getSplitData(selectedDisplayItem, activeItemIndex) : [];

        if (!itemId) {
            showToast('Could not update item date', 'error');
            return;
        }

        try {
            await dispatch(updateOrderItemDatesAction({
                itemId,
                [targetField]: apiDateValue,
            })).unwrap();
            if (statusSplitIndex !== null && currentSplits[statusSplitIndex]) {
                const overrideKey = getItemSplitOverrideKey(selectedDisplayItem, activeItemIndex);
                const nextSplits = currentSplits.map((split, splitIndex) => (
                    splitIndex === statusSplitIndex
                        ? {
                            ...split,
                            ...(targetField === 'trial_date'
                                ? { trialDate: apiDateValue }
                                : { deliveryDate: apiDateValue }),
                        }
                        : split
                ));

                setItemSplitDateOverrides(previous => ({
                    ...previous,
                    [overrideKey]: nextSplits,
                }));
            }
            await refreshOrderDetail().catch(() => null);
            showToast(
                `${getDateFieldLabel(targetField)} ${apiDateValue ? 'updated' : 'removed'} successfully`,
                "success",
            );
        } catch (error) {
            console.error(error);
            showToast(getErrorMessage(error) || "Failed to update date", "error");
        } finally {
            setCalendarVisible(false);
            setActiveItemIndex(null);
            setActiveDateRowId(null);
            setStatusSplitIndex(null);
        }
    };

    const handleWhatsAppShare = async () => {
        return handleOrderWhatsAppShare();

        /*
        const customer = customers.find(c => c.id === order.customerId);
        let mobile = order.customerMobile || customer?.mobile || '';

        // Basic cleaning
        mobile = mobile.replace(/\s+/g, '').replace(/-/g, '');
        if (!mobile) {
            setAlertConfig({ title: 'No Mobile', message: 'Customer mobile number is missing.' });
            setAlertVisible(true);
            return;
        }

        // Append country code if missing (Basic assumption for India, can be improved)
        if (!mobile.startsWith('+') && mobile.length === 10) {
            mobile = '+91' + mobile; // Assuming India for now based on currency
        }

        const balance = currentBalance;
        const status = balance > 0 ? 'Pending' : 'Paid';
        const link = `whatsapp://send?phone=${mobile}&text=Hello ${order.customerName}, Here is your order details for Order #${order.billNo}. Subtotal: ₹${orderSubtotalAmount.toLocaleString('en-IN')}, Paid: ₹${totalPaid.toLocaleString('en-IN')}, Balance: ₹${Math.abs(balance).toLocaleString('en-IN')}. Status: ${status}. Thank you for your business!`;

        try {
            const supported = await Linking.canOpenURL(link);
            if (supported) {
                await Linking.openURL(link);
            } else {
                setAlertConfig({ title: 'WhatsApp Not Found', message: 'Could not open WhatsApp. Please check if it is installed.' });
                setAlertVisible(true);
            }
        } catch (err) {
            setAlertConfig({ title: 'Error', message: 'An error occurred while trying to open WhatsApp.' });
            setAlertVisible(true);
        }
        */
    };

    const handleOrderWhatsAppShare = async () => {
        await handleWhatsAppAttachmentShare();
    };

    const handleWhatsAppAttachmentShare = async (options = {}) => {
        if (isSharing) {
            return;
        }

        const shouldAutoTargetWhatsAppNumber =
            options.forceAutoTargetWhatsAppNumber === true ||
            order?.orderTypeApi === 'SALE_ORDER' ||
            order?.orderCategory === 'Sales';
        const rawWhatsAppNumber = getCustomerWhatsAppNumber();
        const whatsappNumber = shouldAutoTargetWhatsAppNumber
            ? normalizeWhatsAppNumber(rawWhatsAppNumber)
            : '';
        console.log('[WhatsApp Share] Customer number:', {
            rawWhatsAppNumber,
            whatsappNumber,
            orderId: currentOrderId,
            orderType: order?.orderTypeApi || order?.orderCategory,
        });

        if (shouldAutoTargetWhatsAppNumber && !whatsappNumber) {
            setAlertConfig({ title: 'No WhatsApp Number', message: 'Customer WhatsApp number is missing.' });
            setAlertVisible(true);
            return;
        }

        const copyMeta = options.copyMeta || getWhatsAppShareCopyMeta();
        const canPreparePdf =
            copyMeta?.copyType === 'customer'
                ? !!copyMeta?.paymentId || !!copyMeta?.orderId || !!copyMeta?.pdfUrl
                : !!copyMeta?.orderId || !!copyMeta?.pdfUrl;

        if (!canPreparePdf) {
            setAlertConfig({
                title: 'PDF Not Available',
                message: `Could not find ${copyMeta?.copyLabel?.toLowerCase() || 'pdf'} for this order.`,
            });
            setAlertVisible(true);
            return;
        }

        let tempFilePath = null;

        try {
            setIsSharing(true);

            if (!copyMeta.pdfUrl) {
                // Force local PDF generation using the new UI
                let processedCompany = {
                    name: company?.name || 'My Boutique',
                    address: company?.address || 'Your Address Here',
                    phone: company?.phone || 'Your Phone Here',
                    gstin: company?.gstin || '',
                    email: company?.email || '',
                    logo: getCompanyLogoUri(company) || getUserProfilePhotoUri(user) || '',
                };
                if (processedCompany.logo) {
                    processedCompany.logo = await convertLogoToBase64(processedCompany.logo);
                }

                const customer = customers.find(c => c.id === order.customerId || c._id === order.customerId);
                const enrichedOrder = {
                    ...order,
                    customerDisplayId: customer?.displayId || customer?.customerId || order.customerDisplayId || '---',
                    payments: Array.isArray(orderPaymentHistoryList) && orderPaymentHistoryList.length > 0
                        ? orderPaymentHistoryList
                        : order?.payments,
                };

                if (copyMeta.copyType === 'tailor') {
                    tempFilePath = await saveTailorCopyPDF(enrichedOrder, processedCompany);
                } else {
                    tempFilePath = await saveCustomerCopyPDF(enrichedOrder, processedCompany);
                }
            } else {
                const response = await dispatch(downloadOrderCopyAction({
                    copyType: copyMeta.copyType,
                    orderId: copyMeta.orderId || currentOrderId,
                    paymentId: copyMeta.paymentId || null,
                    fileUrl: copyMeta.pdfUrl,
                    previewOnly: false,
                })).unwrap();

                tempFilePath = response?.filePath || null;
            }

            console.log('[WhatsApp Share] PDF prepared:', {
                filePath: tempFilePath,
                copyType: copyMeta.copyType,
                pdfUrl: copyMeta.pdfUrl,
            });

            if (!tempFilePath) {
                throw new Error('Could not prepare PDF for WhatsApp sharing');
            }

            const shareOptions = {
                title: `Share ${copyMeta.copyLabel} via WhatsApp`,
                subject: `${copyMeta.copyLabel} - Order #${displayOrderNumber || order?.billNo || 'N/A'}`,
                message: getWhatsAppCaption(copyMeta.pdfUrl, copyMeta.copyLabel),
                url: `file://${tempFilePath}`,
                type: 'application/pdf',
                filenames: [tempFilePath?.split('/').pop() || `${copyMeta.copyLabel}.pdf`],
                social: Share.Social.WHATSAPP,
                useInternalStorage: true,
                failOnCancel: false,
            };
            if (shouldAutoTargetWhatsAppNumber) {
                shareOptions.whatsAppNumber = whatsappNumber;
                shareOptions.urls = [shareOptions.url];
            }
            console.log('[WhatsApp Share] Share options:', {
                whatsAppNumber: shareOptions.whatsAppNumber,
                url: shareOptions.url,
                urls: shareOptions.urls,
                title: shareOptions.title,
            });

            try {
                if (shouldAutoTargetWhatsAppNumber && Platform.OS === 'android') {
                    await sharePdfToWhatsAppNumber({
                        filePath: tempFilePath,
                        phoneNumber: whatsappNumber,
                        message: shareOptions.message,
                    });
                } else if (Platform.OS === 'android') {
                    await sharePdfToWhatsAppChooser({
                        filePath: tempFilePath,
                        message: shareOptions.message,
                    });
                } else {
                    await Share.shareSingle(shareOptions);
                }
            } catch (whatsAppError) {
                console.log('[WhatsApp Share] direct WhatsApp share failed, falling back to react-native-share', whatsAppError);
                if (Platform.OS === 'android') {
                    throw whatsAppError;
                }
                await Share.open({
                    title: shareOptions.title,
                    subject: shareOptions.subject,
                    message: shareOptions.message,
                    url: shareOptions.url,
                    type: shareOptions.type,
                    useInternalStorage: true,
                    failOnCancel: false,
                });
            }
        } catch (err) {
            const message =
                err?.message && err.message !== 'User did not share'
                    ? err.message
                    : 'An error occurred while trying to share on WhatsApp.';

            setAlertConfig({ title: 'Share Failed', message });
            setAlertVisible(true);
        } finally {
            setIsSharing(false);
        }
    };

    const handleDeleteItem = (index) => {
        setItemToDeleteIndex(index);
        setDeleteItemSheetVisible(true);
    };

    const confirmDeleteItem = async () => {
        if (itemToDeleteIndex === null) return;

        const sourceItems = order.outfits || order.items || [];
        const newItems = [...sourceItems];
        newItems.splice(itemToDeleteIndex, 1);

        // Recalculate totals - Exclude Cancelled Items
        const activeItemsAfterDelete = newItems.filter((i) => i.status !== 'Cancelled');
        const newTotal = activeItemsAfterDelete.reduce((sum, i) => sum + (Number(i.totalCost) || Number(i.amount) || Number(i.rate) * Number(i.qty) || 0), 0);

        // Accurate Balance Logic: Total - (Advance + All Payments)
        const currentTotalPayments = payments
            .filter(p => p.orderId === order.id)
            .reduce((sum, p) => sum + p.amount, 0);

        // Priority Source of Truth: Sum of individual payment records.
        const totalCollected = currentTotalPayments > 0 ? currentTotalPayments : advancePaymentAmount;
        const recalculatedOrderPricing = getOrderPricingSummary({
            order: {
                ...order,
                finalAmount: newTotal,
                final_amount: newTotal,
                totalAmount: newTotal,
                total_amount: newTotal,
                total: newTotal,
                subtotal: newTotal,
            },
            activeItemAmount: newTotal,
            cancelledItemAmount: 0,
            paidAmount: totalCollected,
            isOrderCancelled: false,
        });
        const newSubtotal = recalculatedOrderPricing.subtotalAmount;
        const newBalance = recalculatedOrderPricing.balanceAmount;

        await updateOrder(order.id, {
            ...(order.outfits ? { outfits: newItems } : { items: newItems }),
            total: newSubtotal,
            subtotal: newSubtotal,
            total_amount: newSubtotal,
            final_amount: newSubtotal,
            paid_amount: totalCollected,
            balance: newBalance,
            balance_amount: newBalance,
            updatedAt: new Date().toISOString()
        });
        await refreshOrderDetail().catch(() => null);
        setDeleteItemSheetVisible(false);
        setItemToDeleteIndex(null);
    };

    const handleToggleRequestPhotos = async (itemIndex) => {
        const outfits = order.outfits || order.items || [];
        const outfit = outfits[itemIndex];
        const isRequested = outfit.requestedPhotosFromClient || outfit.requested_photos_from_client;
        const targetStatus = !isRequested;

        try {
            const formattedToken = userToken ? (userToken.startsWith('Bearer ') ? userToken : `Bearer ${userToken}`) : '';
            const toggleUrl = `${API_BASE_URL}/mobile/orders/outfit/${outfit.id}/requested-photos`;
            
            console.log('PATCH Toggle Request Photos - URL:', toggleUrl, 'Body:', { requested: targetStatus });

            await axios.patch(toggleUrl, { requested: targetStatus }, {
                headers: {
                    'Content-Type': 'application/json',
                    accept: 'application/json',
                    Authorization: formattedToken,
                },
            });

            // Prepare local updates
            const updatedOutfits = outfits.map((o, index) => {
                if (index === itemIndex) {
                    return {
                        ...o,
                        requestedPhotosFromClient: targetStatus,
                        requested_photos_from_client: targetStatus
                    };
                }
                return o;
            });
            const updates = order.outfits ? { outfits: updatedOutfits } : { items: updatedOutfits };

            await updateOrder(order.id, updates);

            // Update AsyncStorage manually to force sync immediately
            const ordersJson = await AsyncStorage.getItem('sewvee_orders');
            if (ordersJson) {
                const localOrders = JSON.parse(ordersJson);
                const orderIndex = localOrders.findIndex(o => o.id === order.id);
                if (orderIndex !== -1) {
                    localOrders[orderIndex] = {
                        ...localOrders[orderIndex],
                        ...updates
                    };
                    await AsyncStorage.setItem('sewvee_orders', JSON.stringify(localOrders));
                }
            }

            if (targetStatus) {
                showToast('Requested photos from customer!', 'success');
            } else {
                showToast('Cancelled photo request!', 'info');
            }
            await refreshOrderDetail().catch(() => null);
        } catch (error) {
            console.error('Error updating photo request status:', error);
            showToast('Failed to update photo request', 'error');
        }
    };

    const handlePrint = async () => {
        if (isPrinting) return;

        if (order?.orderTypeApi === 'SALE_ORDER' || order?.orderCategory === 'Sales') {
            handleCustomerCopy();
            return;
        }

        handleTailorCopy();
    };

    const handleStatusSelect = async (statusOption) => {
        if (updateOrderItemStatusLoading) {
            return;
        }

        const selectedStatusValue = normalizeStatusValue(
            statusOption?.value ||
            statusOption?.status ||
            statusOption?.label ||
            statusOption,
        );
        const statusLabel = getStatusOptionLabel(statusOption);

        if (hasAdvancePayment && selectedStatusValue === 'CANCELLED') {
            showToast('Cancelled status is disabled when advance payment exists', 'warning');
            return;
        }

        // If user selects 'Cancelled', intercept and show units/order cancellation
        if (selectedStatusValue === 'CANCELLED' && statusItemIndex !== null) {
            setPendingStatusOption(statusOption);
            closeStatusModal(); // Close status picker
            setCancelSheetVisible(true); // Open confirmation
            return;
        }

        if (statusItemIndex === null) {
            // Update overall Order Status manually
            try {
                await updateOrder(order.id, {
                    status: statusLabel,
                    updatedAt: new Date().toISOString()
                });
                await refreshOrderDetail().catch(() => null);
                showToast(`Order status updated to ${statusLabel}`, 'success');
            } catch (error) {
                showToast("Failed to update order status", "error");
            }
            closeStatusModal();
            return;
        }

        const selectedDisplayItem = getSelectedDisplayItem(statusItemIndex);
        const statusPayload = buildStatusUpdatePayload(
            selectedDisplayItem,
            statusItemIndex,
            statusSplitIndex,
            statusOption,
        );

        try {
            if (!statusPayload.itemId) {
                throw new Error('Could not update item status');
            }

            setUpdatingStatusOptionId(statusOption?.id ?? null);
            const response = await dispatch(updateOrderItemStatusAction(statusPayload)).unwrap();
            applyLocalSplitStatusUpdate(
                selectedDisplayItem,
                statusItemIndex,
                statusSplitIndex,
                statusOption,
            );
            await refreshOrderDetail().catch(() => null);
            scrollToTab('items', false);

            showToast(
                response?.message ||
                `${statusSplitIndex !== null ? 'Unit' : 'Item'} status updated to ${statusLabel}`,
                'success',
            );
        } catch (error) {
            console.error("Status Update Error:", error);
            showToast(getErrorMessage(error) || "Failed to update status", "error");
        } finally {
            closeStatusModal();
            setStatusItemIndex(null);
            setStatusSplitIndex(null);
            setPendingStatusOption(null);
            setUpdatingStatusOptionId(null);
        }
    };

    const confirmCancelItem = async () => {
        if (statusItemIndex === null) return;
        if (updateOrderItemStatusLoading) return;

        try {
            const selectedDisplayItem = getSelectedDisplayItem(statusItemIndex);
            const selectedSplit = getSelectedStatusSplit();

            if (isCancelledStatusValue(selectedSplit?.status)) {
                showToast(
                    statusSplitIndex !== null ? "This unit is already cancelled" : "This item is already cancelled",
                    "warning",
                );
                return;
            }

            const statusOption = pendingStatusOption || {
                label: 'Cancelled',
                value: 'CANCELLED',
            };
            const statusPayload = buildStatusUpdatePayload(
                selectedDisplayItem,
                statusItemIndex,
                statusSplitIndex,
                statusOption,
            );

            if (!statusPayload.itemId) {
                throw new Error('Could not cancel item');
            }

            setUpdatingStatusOptionId(statusOption?.id ?? statusOption?.statusId ?? 'cancelled');
            const response = await dispatch(updateOrderItemStatusAction(statusPayload)).unwrap();
            applyLocalSplitStatusUpdate(
                selectedDisplayItem,
                statusItemIndex,
                statusSplitIndex,
                statusOption,
            );
            await refreshOrderDetail().catch(() => null);
            scrollToTab('items', false);

            showToast(
                response?.message ||
                (statusSplitIndex !== null ? "Unit cancelled" : "Item cancelled"),
                "success",
            );
        } catch (error) {
            console.error("Cancellation Error:", error);
            showToast(getErrorMessage(error) || "Failed to cancel item", "error");
        } finally {
            setCancelSheetVisible(false);
            setStatusItemIndex(null);
            setStatusSplitIndex(null);
            setPendingStatusOption(null);
            setUpdatingStatusOptionId(null);
        }
    };

    const handleDelete = () => {
        setDeleteSheetVisible(true);
    };

    const confirmDelete = async () => {
        if (isDeleting) return;
        setIsDeleting(true);
        try {
            await deleteOrder(order.id);
            navigation.goBack();
        } catch (e) {
            setDeleteSheetVisible(false); // Close sheet on error
            setAlertConfig({ title: 'Delete Failed', message: e.message || 'Could not delete bill' });
            setAlertVisible(true);
        } finally {
            setIsDeleting(false);
        }
    };

    const handleSavePayment = async () => {
        if (createOrderPaymentLoading) {
            return;
        }

        const amount = parseFloat(paymentAmount);
        const normalizedPaymentMode = getPaymentModePayload(paymentMode);

        if (isNaN(amount) || amount <= 0) {
            showToast('Please enter a valid payment amount.', 'error');
            return;
        }

        if (paymentAmountError) {
            showToast(paymentAmountError, 'error');
            return;
        }

        if (!editingPayment && !canAddPayment) {
            showToast('This order is already fully paid.', 'warning');
            return;
        }

        if (!paymentMode) {
            showToast('Please select a payment mode.', 'error');
            return;
        }

        try {
            if (editingPayment) {
                // Check if context has updatePayment
                if (updatePayment) {
                    await updatePayment(editingPayment.id, {
                        amount,
                        mode: paymentMode,
                        transactionId: paymentMode === 'UPI' ? transactionId : '',
                    });
                    setIsPaymentRefreshPending(true);
                    await refreshOrderDetail().catch(() => null);
                    await dispatch(getOrderPaymentsAction(currentOrderId)).unwrap().catch(() => null);
                    showToast(`Payment updated!`, 'success');
                } else {
                    console.error("updatePayment missing");
                }
            } else {
                const response = await dispatch(createOrderPaymentAction({
                    order_id: currentOrderId,
                    amount,
                    payment_mode: normalizedPaymentMode,
                    transaction_id: transactionId ? transactionId.trim() : '',
                })).unwrap();
                showToast(response?.message || 'Payment recorded successfully', 'success');
                resetPaymentForm();
                setIsPaymentRefreshPending(true);
                await refreshOrderDetail().catch(() => null);
                await dispatch(getOrdersListAction()).unwrap().catch(() => null);
                await dispatch(getOrderPaymentsAction(currentOrderId)).unwrap().catch(() => null);
                return;
                /*
                showToast(`₹${amount} added successfully!`, 'success');
                */
            }

            resetPaymentForm();
        } catch (error) {
            console.error('Payment Error:', error);
            setAlertConfig({ title: 'Payment Failed', message: getErrorMessage(error) });
            setAlertVisible(true);
        } finally {
            setIsPaymentRefreshPending(false);
        }
    };

    const getPaymentActionPayload = (payment) => ({
        id: payment?.id || payment?.payment_id || '',
        bill_id: payment?.bill_id || payment?.billId || '',
        order_id: payment?.order_id || payment?.orderId || currentOrderId,
        date:
            payment?.created_at ||
            payment?.date ||
            payment?.updated_at ||
            payment?.createdAt ||
            payment?.updatedAt ||
            '',
        invoice_url: resolveInvoiceUrl(payment?.invoice_url || payment?.invoiceUrl),
        amount: Number(payment?.amount) || 0,
    });

    const getTailorCopyUrl = () => (
        resolveInvoiceUrl(
            order?.tailor_copy_url ||
            order?.tailorCopyUrl ||
            order?.tailoring_copy_url ||
            order?.tailoringCopyUrl ||
            order?.tailor_copy?.url ||
            order?.tailorCopy?.url,
        )
    );

    const getCustomerWhatsAppNumber = () => {
        const customer = customers.find(c => (
            String(c?.id ?? c?._id ?? '') === String(order?.customerId ?? '')
        ));

        return (
            order?.customer?.whatsappNumber ||
            order?.customer?.mobile ||
            customer?.whatsappNumber ||
            customer?.mobile ||
            order?.customerMobile ||
            ''
        );
    };

    const getWhatsAppCaption = (pdfUrl, copyLabel) => {
        const orderNumber = displayOrderNumber || order?.billNo || 'N/A';
        const customerName = order?.customerName || order?.customer?.customerName || order?.customer?.name || 'Customer';
        const orderStatus =
            order?.status ||
            order?.orderStatus ||
            order?.order_status ||
            'Pending';

        return [
            `Greetings from Sewvee App, ${customerName}!`,
            `Here is your order details for Order #${orderNumber}.`,
            `Copy: ${copyLabel}`,
            `Order Status: ${orderStatus}`,
            pdfUrl ? `PDF Link: ${pdfUrl}` : null,
            'Thank you for choosing Sewvee.',
        ].filter(Boolean).join('\n');
    };

    const normalizeWhatsAppNumber = (value) => {
        const digitsOnly = String(value || '').replace(/\D+/g, '');

        if (!digitsOnly) {
            return '';
        }

        if (digitsOnly.length === 10) {
            return `91${digitsOnly}`;
        }

        if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) {
            return digitsOnly;
        }

        return digitsOnly;
    };

    const getShareableCopyMeta = () => {
        if (order?.orderTypeApi === 'SALE_ORDER' || order?.orderCategory === 'Sales') {
            const paymentData = getLatestInvoicePayment();

            return paymentData?.id || paymentData?.invoice_url
                ? {
                    copyType: 'customer',
                    copyLabel: 'Customer Copy',
                    pdfUrl: null, // Force local PDF generation
                    paymentId: paymentData.id || null,
                    orderId: paymentData.order_id || currentOrderId,
                }
                : null;
        }

        const tailorCopyUrl = getTailorCopyUrl();

        return currentOrderId || tailorCopyUrl
            ? {
                copyType: 'tailor',
                copyLabel: 'Tailoring Copy',
                pdfUrl: tailorCopyUrl || null,
                paymentId: null,
                orderId: currentOrderId,
            }
            : null;
    };

    const getWhatsAppShareCopyMeta = () => {
        if (order?.orderTypeApi === 'SALE_ORDER' || order?.orderCategory === 'Sales') {
            return getShareableCopyMeta();
        }

        const paymentData = getLatestInvoicePayment();

        return paymentData?.id || paymentData?.invoice_url || currentOrderId
            ? {
                copyType: 'customer',
                copyLabel: 'Customer Copy',
                pdfUrl: null, // Force local PDF generation
                paymentId: paymentData?.id || null,
                orderId: paymentData?.order_id || currentOrderId,
            }
            : null;
    };

    const getLatestCustomerPaymentId = () => {
        const paymentCandidates =
            Array.isArray(orderPaymentHistoryList) && orderPaymentHistoryList.length > 0
                ? orderPaymentHistoryList
                : (Array.isArray(order?.payments) ? order.payments : []);

        if (paymentCandidates.length === 0) {
            return null;
        }

        const latestPayment = paymentCandidates.reduce((latest, current) => {
            if (!latest) {
                return current;
            }

            const latestTime = new Date(
                latest?.created_at || latest?.date || latest?.updated_at || 0,
            ).getTime();
            const currentTime = new Date(
                current?.created_at || current?.date || current?.updated_at || 0,
            ).getTime();

            return currentTime > latestTime ? current : latest;
        }, null);

        return latestPayment?.id || latestPayment?.payment_id || null;
    };

    const getLatestInvoicePayment = () => {
        const paymentCandidates =
            Array.isArray(orderPaymentHistoryList) && orderPaymentHistoryList.length > 0
                ? orderPaymentHistoryList
                : (Array.isArray(order?.payments) ? order.payments : []);

        const invoicePayments = paymentCandidates
            .map(getPaymentActionPayload)
            .filter(payment => payment?.id || payment?.invoice_url);

        if (invoicePayments.length === 0) {
            return null;
        }

        return invoicePayments.reduce((latest, current) => (
            getPaymentTimestamp(current) > getPaymentTimestamp(latest) ? current : latest
        ));
    };

    const getInvoicePreviewPayload = (initialCopyType, allowedCopyTypes, paymentId = null) => {
        const companyData = {
            name: company?.name || 'My Boutique',
            address: company?.address || 'Your Address Here',
            phone: company?.phone || 'Your Phone Here',
            gstin: company?.gstin || '',
            email: company?.email || '',
            logo: getCompanyLogoUri(company) || getUserProfilePhotoUri(user) || '',
        };
        const customer = customers.find(c => c.id === order.customerId || c._id === order.customerId);
        const enrichedOrder = {
            ...order,
            customerDisplayId: customer?.displayId || customer?.customerId || order.customerDisplayId || '---',
            payments: Array.isArray(orderPaymentHistoryList) && orderPaymentHistoryList.length > 0
                ? orderPaymentHistoryList
                : order?.payments,
        };

        return {
            initialCopyType,
            allowedCopyTypes,
            order: enrichedOrder,
            company: companyData,
            paymentId: paymentId || getLatestCustomerPaymentId(),
            orderId: currentOrderId,
        };
    };

    const openInvoicePreview = (initialCopyType, allowedCopyTypes, paymentId = null) => {
        if (!order) {
            showToast('Order details are still loading', 'warning');
            return;
        }

        navigation.navigate(
            'InvoicePreview',
            getInvoicePreviewPayload(initialCopyType, allowedCopyTypes, paymentId),
        );
    };

    const openRemoteInvoicePreview = (payment) => {
        return false; // Force local PDF preview to show correct "Customer Copy" title
    };

    const openRemoteTailorPreview = () => {
        // Force local preview/generation to use the updated local grid layout for reference photos
        return false;
    };

    const handleViewPaymentBill = async (payment) => {
        const paymentData = getPaymentActionPayload(payment);
        setActivePaymentMenu(null);

        if (openRemoteInvoicePreview(paymentData)) {
            return;
        }

        openInvoicePreview('customer', ['customer'], paymentData.id);
    };

    const handlePrintPaymentBill = (payment) => {
        const paymentData = getPaymentActionPayload(payment);
        setActivePaymentMenu(null);

        if (openRemoteInvoicePreview(paymentData)) {
            return;
        }

        openInvoicePreview('customer', ['customer'], paymentData.id);
    };

    const handleWhatsAppPaymentBill = async (payment) => {
        const paymentData = getPaymentActionPayload(payment);
        setActivePaymentMenu(null);

        await handleWhatsAppAttachmentShare({
            forceAutoTargetWhatsAppNumber: true,
            copyMeta: {
                copyType: 'customer',
                copyLabel: 'Customer Copy',
                pdfUrl: null, // Force local PDF generation
                paymentId: paymentData?.id || null,
                orderId: paymentData?.order_id || currentOrderId,
            },
        });
    };

    const handleCustomerCopy = async () => {
        if (
            (order?.orderTypeApi === 'SALE_ORDER' || order?.orderCategory === 'Sales') &&
            openRemoteInvoicePreview()
        ) {
            return;
        }

        openInvoicePreview('customer', ['customer']);
    };

    const handleTailorCopy = async () => {
        if (openRemoteTailorPreview()) {
            return;
        }

        openInvoicePreview('tailor', ['tailor']);
    };

    // billPayments definition moved up for dynamic calculation

    const renderTabs = () => {
        const tabs = order.orderCategory === 'Sales' ? ['details', 'items'] : ['details', 'items', 'payments'];
        return (
            <View style={styles.tabContainer}>
                {tabs.map((tab) => (
                    <TouchableOpacity
                        key={tab}
                        style={[styles.tabItem, activeTab === tab && styles.tabItemActive]}
                        onPress={() => handleTabPress(tab)}
                    >
                        <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                            {tab === 'payments'
                                ? `Payments`
                                : tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        );
    };


    const renderOrderDetails = () => {
        const customer = customers.find(c => c.id === order.customerId || c._id === order.customerId);
        const totalItemsCount = getDisplayItemCount(displayItems);

        const formatDateTime = (dateStr) => {
            if (!dateStr) return '-';
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return dateStr;
            const datePart = formatDate(dateStr);
            const timePart = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
            return `${datePart}   ${timePart}`;
        };

        const isSales = order.orderCategory === 'Sales';

        const DetailRow = ({ label, value, isLink = false, onPress, isLast = false }) => (
            <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingVertical: 16,
                borderBottomWidth: isLast ? 0 : 1,
                borderBottomColor: '#F3F4F6'
            }}>
                <Text style={{ fontFamily: 'Inter-Medium', fontSize: 14, color: Colors.textSecondary }}>{label}</Text>
                {onPress ? (
                    <TouchableOpacity onPress={onPress}>
                        <Text style={{
                            fontFamily: 'Inter-SemiBold',
                            fontSize: 15,
                            color: isLink ? '#6366F1' : Colors.textPrimary,
                            textAlign: 'right',
                            textDecorationLine: isLink ? 'underline' : 'none'
                        }}>{value || '-'}</Text>
                    </TouchableOpacity>
                ) : (
                    <Text style={{
                        fontFamily: 'Inter-SemiBold',
                        fontSize: 15,
                        color: Colors.textPrimary,
                        textAlign: 'right'
                    }}>{value || '-'}</Text>
                )}
            </View>
        );

        return (
            <View style={{ flex: 1, paddingHorizontal: 4 }}>
                {(order.orderCategory === 'Sales' || order.orderCategory === 'Tailoring') && (
                    <View style={{
                        backgroundColor: '#EEF2FF',
                        borderRadius: 16,
                        borderWidth: 1,
                        borderColor: '#E0E7FF',
                        paddingVertical: 18,
                        marginBottom: 20,
                        marginTop: 4
                    }}>
                        <View style={{ flexDirection: 'row' }}>
                            <View style={{ flex: 1, alignItems: 'center' }}>
                                <Text style={{ fontFamily: 'Inter-Bold', fontSize: 20, color: Colors.textPrimary }}>₹{formatAmountValue(orderSubtotalAmount)}</Text>
                                <Text style={{ fontFamily: 'Inter-Medium', fontSize: 13, color: Colors.textSecondary, marginTop: 4 }}>Subtotal</Text>
                            </View>
                            <View style={{ width: 1, height: '60%', backgroundColor: '#E0E7FF', alignSelf: 'center' }} />
                            <View style={{ flex: 1, alignItems: 'center' }}>
                                <Text style={{ fontFamily: 'Inter-Bold', fontSize: 20, color: '#059669' }}>₹{totalPaid.toLocaleString('en-IN')}</Text>
                                <Text style={{ fontFamily: 'Inter-Medium', fontSize: 13, color: Colors.textSecondary, marginTop: 4 }}>Paid</Text>
                            </View>
                            <View style={{ width: 1, height: '60%', backgroundColor: '#E0E7FF', alignSelf: 'center' }} />
                            <View style={{ flex: 1, alignItems: 'center' }}>
                                <Text style={{ fontFamily: 'Inter-Bold', fontSize: 20, color: currentBalance > 0 ? Colors.danger : '#059669' }}>₹{Math.abs(currentBalance).toLocaleString('en-IN')}</Text>
                                <Text style={{ fontFamily: 'Inter-Medium', fontSize: 13, color: Colors.textSecondary, marginTop: 4 }}>{currentBalance > 0 ? 'Balance' : 'No Due'}</Text>
                            </View>
                        </View>
                        {orderDiscountAmount > 0 && (
                            <View style={{
                                marginTop: 12,
                                pt: 12,
                                borderTopWidth: 1,
                                borderTopColor: '#E0E7FF',
                                paddingHorizontal: 20,
                                paddingTop: 12,
                                flexDirection: 'row',
                                justifyContent: 'center'
                            }}>
                                <Text style={{ fontFamily: 'Inter-Medium', fontSize: 13, color: '#059669' }}>
                                    Actual ₹{formatAmountValue(orderActualAmount)} - Discount ₹{formatAmountValue(orderDiscountAmount)} = ₹{formatAmountValue(orderActualAmount - orderDiscountAmount)}
                                </Text>
                            </View>
                        )}
                    </View>
                )}

                <View style={{
                    backgroundColor: Colors.white,
                    borderRadius: 16,
                    paddingHorizontal: 16,
                    borderWidth: 1,
                    borderColor: '#F1F5F9'
                }}>
                    <DetailRow label="Order ID" value={`#${displayOrderNumber}`} />
                    <DetailRow label="Order Type" value={isSales ? 'Sales Order' : 'Tailoring Order'} />
                    <DetailRow label="Order Created On" value={formatDateTime(order.createdAt)} />
                    <DetailRow
                        label="Customer Name"
                        value={order.customerName}
                    />
                    <DetailRow
                        label="Customer ID"
                        value={customer?.displayId || customer?.customerId ? `#${customer.displayId || customer.customerId}` : (customer?.id ? `#${customer.id.includes('_') ? customer.id.split('_')[1] : customer.id.slice(-6).toUpperCase()}` : (order.customerDisplayId ? (order.customerDisplayId.startsWith('#') ? order.customerDisplayId : `#${order.customerDisplayId}`) : '-'))}
                        isLink={true}
                        onPress={() => {
                            const customerId =
                                customer?.id ||
                                customer?._id ||
                                order.customerId ||
                                order.customer?._id ||
                                order.customer?.id ||
                                null;

                            navigation.navigate('CustomerDetail', customer
                                ? { customer, customerId }
                                : { customerId }
                            );
                        }}
                    />
                    <DetailRow label="Mobile Number" value={order.customerMobile} />
                    <DetailRow label={totalItemsCount === 1 ? "Total Item" : "Total Items"} value={totalItemsCount.toString()} />
                    <DetailRow label="Order Update On" value={formatDateTime(order.updatedAt)} isLast={true} />
                </View>
                {isSales && order.notes && (
                    <View style={{
                        marginTop: 20,
                        backgroundColor: Colors.white,
                        borderRadius: 16,
                        padding: 16,
                        borderWidth: 1,
                        borderColor: '#F1F5F9'
                    }}>
                        <Text style={{ fontFamily: 'Inter-Bold', fontSize: 17, color: Colors.textPrimary, marginBottom: 16 }}>Notes</Text>
                        <View style={{
                            backgroundColor: '#F9FAFB',
                            padding: 16,
                            borderRadius: 12,
                            borderWidth: 1,
                            borderColor: '#F1F5F9',
                            minHeight: 80
                        }}>
                            <Text style={{ fontFamily: 'Inter-Medium', fontSize: 14, color: Colors.textPrimary, lineHeight: 22 }}>
                                {order.notes}
                            </Text>
                        </View>
                    </View>
                )}
            </View>
        );
    };



    const isUrgent = (order).urgency === 'Urgent' || (order).urgency === 'Emergency';
    const deliveryDateColor = isUrgent ? Colors.danger : Colors.textPrimary;

    const renderSalesOrderItems = () => {
        const totalItemsCount = getDisplayItemCount(displayItems);
        const itemCountLabel = totalItemsCount === 1 ? 'ITEM' : 'ITEMS';

        return (
            <View style={{ flex: 1 }}>
                <Text style={[styles.sectionTitle, { marginBottom: 16, textTransform: 'uppercase', fontSize: 13, letterSpacing: 0.5 }]}>
                    {itemCountLabel} ({totalItemsCount})
                </Text>
                {/* {(orderDiscountAmount > 0 || cancelledAmount > 0) && (
                    <View style={{ marginBottom: 16, padding: 16, backgroundColor: Colors.white, borderRadius: 16, borderWidth: 1, borderColor: Colors.border }}>
                        <View style={{ gap: 10 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                <Text style={{ fontFamily: 'Inter-Regular', color: Colors.textSecondary }}>Actual Amount</Text>
                                <Text style={{ fontFamily: 'Inter-SemiBold', color: Colors.textPrimary }}>₹{orderActualAmount.toLocaleString('en-IN')}</Text>
                            </View>
                            {orderDiscountAmount > 0 && (
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                    <Text style={{ fontFamily: 'Inter-Regular', color: '#059669' }}>
                                        Discount{orderDiscountValue > 0 ? ` (${orderDiscountValue}${orderDiscountType})` : ''}
                                    </Text>
                                    <Text style={{ fontFamily: 'Inter-SemiBold', color: '#059669' }}>- ₹{orderDiscountAmount.toLocaleString('en-IN')}</Text>
                                </View>
                            )}
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                <Text style={{ fontFamily: 'Inter-Regular', color: Colors.textSecondary }}>Subtotal</Text>
                                <Text style={{ fontFamily: 'Inter-Bold', color: Colors.textPrimary }}>₹{orderSubtotalAmount.toLocaleString('en-IN')}</Text>
                            </View>
                        </View>
                    </View>
                )} */}
                <View style={{ gap: 12 }}>
                    {displayItems.map((item, index) => {
                        const isCancelledItem = isCancelledStatusValue(item.status);
                        const itemPricing = getItemPricingSummary(item);

                        return (
                        <View key={index} style={{
                            backgroundColor: isCancelledItem ? '#F8FAFC' : Colors.white,
                            borderRadius: 16,
                            padding: 12,
                            borderWidth: 1,
                            borderColor: isCancelledItem ? '#E5E7EB' : '#F1F5F9',
                            marginBottom: 4,
                            opacity: isCancelledItem ? 0.55 : 1,
                        }}>
                            <View style={{ flexDirection: 'row', gap: 12 }}>
                                {/* Image Container */}
                                <View style={{ width: 80, height: 100, borderRadius: 12, backgroundColor: '#F0F3FF', overflow: 'hidden' }}>
                                    {item.image || (item.images && item.images[0]) || (item.sketches && item.sketches[0]) ? (
                                        <Image
                                            source={{ uri: item.image || (item.images && item.images[0]) || item.sketches[0] }}
                                            style={{ width: '100%', height: '100%' }}
                                            resizeMode="cover"
                                        />
                                    ) : (
                                        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                                            {String(item?.sku ?? '').includes('MAT') || item.type === 'Material' ? (
                                                <Layers size={21} color="#94A3B8" />
                                            ) : (
                                                <Shirt size={21} color="#94A3B8" />
                                            )}
                                        </View>
                                    )}
                                </View>
                                {/* Info Section */}
                                <View style={{ flex: 1, gap: 4 }}>
                                    <Text style={{
                                        fontFamily: 'Inter-Bold',
                                        fontSize: 15,
                                        color: isCancelledItem ? '#94A3B8' : Colors.textPrimary,
                                        textDecorationLine: isCancelledItem ? 'line-through' : 'none',
                                    }} numberOfLines={2}>
                                        {getDisplayTextValue(item.name) || 'Item'}
                                    </Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                        <Text style={{
                                            fontFamily: 'Inter-Medium',
                                            fontSize: 12,
                                            color: isCancelledItem ? '#94A3B8' : '#64748B',
                                        }}>
                                            SKU : {item.type == 'READYMADE' ||item.readymade?.sku_code != undefined ? item.readymade?.sku_code : getDisplayTextValue(item.material?.sku_code) || '---'} {item.readymade?.section ? `• ${item.readymade?.section}` : ''}
                                        </Text>
                                    </View>

                                    <View style={{ marginTop: 4, gap: 6 }}>
                                        {item.brand && (
                                            <View style={{ flexWrap: 'wrap', flexDirection: 'row' }}>
                                                <View style={{
                                                    flexDirection: 'row',
                                                    alignItems: 'center',
                                                    gap: 4,
                                                    backgroundColor: '#F8FAFC',
                                                    paddingHorizontal: 8,
                                                    paddingVertical: 3,
                                                    borderRadius: 6,
                                                    borderWidth: 0.5,
                                                    borderColor: '#E2E8F0'
                                                }}>
                                                    <Tag size={12} color="#64748B" />
                                                    <Text style={{ fontFamily: 'Inter-SemiBold', fontSize: 11, color: '#64748B' }}>{getDisplayTextValue(item.brand)}</Text>
                                                </View>
                                            </View>
                                        )}
                                        {item.size && (
                                            <View style={{ flexWrap: 'wrap', flexDirection: 'row' }}>
                                                <View style={{
                                                    backgroundColor: '#F3F4F6',
                                                    paddingHorizontal: 8,
                                                    paddingVertical: 3,
                                                    borderRadius: 6,
                                                    borderWidth: 0.5,
                                                    borderColor: '#E2E8F0'
                                                }}>
                                                    <Text style={{ fontFamily: 'Inter-SemiBold', fontSize: 11, color: '#64748B' }}>Size : {getDisplayTextValue(item.size)}</Text>
                                                </View>
                                            </View>
                                        )}
                                        {item.tag && !item.brand && (
                                            <View style={{ flexWrap: 'wrap', flexDirection: 'row' }}>
                                                <View style={{
                                                    backgroundColor: '#F8FAFC',
                                                    paddingHorizontal: 8,
                                                    paddingVertical: 3,
                                                    borderRadius: 6,
                                                    borderWidth: 0.5,
                                                    borderColor: '#E2E8F0'
                                                }}>
                                                    <Text style={{ fontFamily: 'Inter-SemiBold', fontSize: 11, color: '#64748B' }}>{getDisplayTextValue(item.tag)}</Text>
                                                </View>
                                            </View>
                                        )}
                                        {itemPricing.hasDiscount && (
                                            <View style={{ flexWrap: 'wrap', flexDirection: 'row' }}>
                                                <View style={{
                                                    backgroundColor: '#ECFDF5',
                                                    paddingHorizontal: 8,
                                                    paddingVertical: 3,
                                                    borderRadius: 6,
                                                    borderWidth: 0.5,
                                                    borderColor: '#BBF7D0'
                                                }}>
                                                    <Text style={{ fontFamily: 'Inter-SemiBold', fontSize: 11, color: '#059669' }}>
                                                        Discount : ₹{itemPricing.discountAmount.toLocaleString('en-IN')}
                                                    </Text>
                                                </View>
                                            </View>
                                        )}
                                    </View>
                                </View>
                            </View>

                            {/* Divider & Bottom Row */}
                            <View style={{
                                flexDirection: 'row',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginTop: 12,
                                paddingTop: 12,
                                borderTopWidth: 1,
                                borderTopColor: '#F3F4F6'
                            }}>
                                <View style={{
                                    paddingHorizontal: 10,
                                    paddingVertical: 6,
                                    borderRadius: 8,
                                    borderWidth: 0.5,
                                    borderColor: isCancelledItem ? '#E5E7EB' : '#E2E8F0',
                                    backgroundColor: '#F8FAFC'
                                }}>
                                    <Text style={{
                                        fontFamily: 'Inter-Medium',
                                        fontSize: 13,
                                        color: isCancelledItem ? '#94A3B8' : '#1E293B',
                                        textDecorationLine: isCancelledItem ? 'line-through' : 'none',
                                    }}>
                                        {item.qty}{item.type === 'Material' ? (item.material.is_meter ? 'm' : 'pcs') : 'pcs'} x ₹{item.rate}
                                    </Text>
                                </View>
                                <Text style={{
                                    fontFamily: 'Inter-Bold',
                                    fontSize: 16,
                                    color: isCancelledItem ? '#94A3B8' : Colors.textPrimary,
                                    textDecorationLine: isCancelledItem ? 'line-through' : 'none',
                                }}>
                                    ₹{itemPricing.subtotalAmount.toLocaleString('en-IN')}
                                </Text>
                            </View>
                        </View>
                        );
                    })}
                </View>
            </View>
        );
    };



    const renderOrderItems = () => {
        if (order.orderCategory === 'Sales') {
            return renderSalesOrderItems();
        }

        const totalItemsCount = getDisplayItemCount(displayItems);

        return (
            <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <Text style={{ fontFamily: 'Inter-Bold', fontSize: 16, color: Colors.textPrimary, textTransform: 'uppercase' }}>ITEMS ({totalItemsCount})</Text>
                </View>

                {displayItems.length === 0 ? (
                    <View style={{ padding: 40, alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ color: Colors.textSecondary, fontFamily: 'Inter-Medium' }}>No items added yet</Text>
                    </View>
                ) : (
                    <View style={{ gap: 20 }}>
                        {displayItems.map((item, itemIndex) => {
                            const splits = getSplitData(item, itemIndex);
                            const itemPricing = getItemPricingSummary(item);
                            const isItemFullyCancelled =
                                splits.length > 0 &&
                                splits.every(split => isCancelledStatusValue(split?.status));
                            const isEditBlockedByStatus = isEditBlockedForStitchingStatus(item, splits);
                            const splitBasedAmount = splits.reduce(
                                (sum, split) => (
                                    isCancelledStatusValue(split?.status)
                                        ? sum
                                        : sum + (Number(split.total) || 0)
                                ),
                                0,
                            ) || (item.activeAmount ?? item.amount ?? 0);
                            const itemDisplayAmount = itemPricing.hasDiscount
                                ? itemPricing.subtotalAmount
                                : splitBasedAmount;

                            return (
                                <View key={itemIndex} style={{
                                    backgroundColor: Colors.white,
                                    borderRadius: 16,
                                    borderWidth: 1,
                                    borderColor: '#E2E8F0',
                                    overflow: 'hidden',
                                    paddingTop: 16,
                                    opacity: isItemFullyCancelled ? 0.6 : 1,
                                    ...Shadow.subtle,
                                }}>
                                    {item.requestedPhotosFromClient && (
                                        <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
                                            <View style={{
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                alignSelf: 'flex-start',
                                                backgroundColor: '#FFF7ED',
                                                paddingHorizontal: 10,
                                                paddingVertical: 6,
                                                borderRadius: 8,
                                                borderWidth: 1,
                                                borderColor: '#FED7AA',
                                                gap: 6
                                            }}>
                                                <AlertCircle size={14} color="#EA580C" />
                                                <Text style={{ fontFamily: 'Inter-SemiBold', fontSize: 12, color: '#EA580C' }}>
                                                    Awaiting Client Photos
                                                </Text>
                                            </View>
                                        </View>
                                    )}
                                    {itemPricing.hasDiscount && (
                                        <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
                                            <View style={{
                                                alignSelf: 'flex-start',
                                                backgroundColor: '#ECFDF5',
                                                paddingHorizontal: 10,
                                                paddingVertical: 6,
                                                borderRadius: 8,
                                                borderWidth: 1,
                                                borderColor: '#BBF7D0'
                                            }}>
                                                <Text style={{ fontFamily: 'Inter-SemiBold', fontSize: 12, color: '#059669' }}>
                                                    Item Discount : ₹{itemPricing.discountAmount.toLocaleString('en-IN')}
                                                </Text>
                                            </View>
                                        </View>
                                    )}

                                    {/* Units Loop */}
                                    <View style={{ gap: splits.length > 1 ? 12 : 0, padding: splits.length > 1 ? 12 : 0, paddingBottom: splits.length > 1 ? 12 : 16 }}>
                                        {splits.map((split, splitIndex) => {
                                            const ordinal = formatQuantityOrdinalLabel(splitIndex);
                                            const status = split.status || 'Yet to Start';
                                            const splitApiId = getSplitApiId(item, itemIndex, splitIndex);
                                            const isTrialDateLoading = getItemDateLoadingState(splitApiId, 'trial_date');
                                            const isDeliveryDateLoading = getItemDateLoadingState(splitApiId, 'delivery_date');
                                            const itemStatusLoading = isItemStatusUpdating(splitApiId);
                                            const splitAmount = Number(split.total ?? split.servicesTotal ?? 0) || 0;
                                            const isCancelledSplit = isCancelledStatusValue(status);

                                            // Status styles
                                            let bg = '#FFF7ED', text = '#EA580C', chevron = '#EA580C'; // Default: Yet to Start (Orange)
                                            const normalizedStatus = String(status || '').toUpperCase().replace(/_/g, ' ').trim();
                                            if (normalizedStatus === 'STITCHING' || normalizedStatus === 'IN PROGRESS' || normalizedStatus === 'INPROGRESS') {
                                                bg = '#EFF6FF'; text = '#2563EB'; chevron = '#2563EB'; // Blue (In Progress)
                                            } else if (normalizedStatus === 'COMPLETED') {
                                                bg = '#ECFDF5'; text = '#059669'; chevron = '#059669'; // Green (Completed)
                                            } else if (normalizedStatus === 'DELIVERED') {
                                                bg = '#F5F3FF'; text = '#6366F1'; chevron = '#6366F1'; // Purple (Delivered)
                                            } else if (normalizedStatus === 'CANCELLED') {
                                                bg = '#F9FAFB'; text = '#94A3B8'; chevron = '#94A3B8'; // Grey (Cancelled)
                                            }

                                            return (
                                                <View key={splitIndex} style={{
                                                    backgroundColor: isCancelledSplit ? '#F8FAFC' : (splits.length > 1 ? '#F8FAFC' : Colors.white),
                                                    borderRadius: splits.length > 1 ? 16 : 0,
                                                    borderWidth: splits.length > 1 ? 1 : 0,
                                                    borderColor: '#E2E8F0',
                                                    padding: splits.length > 1 ? 16 : 4,
                                                    paddingHorizontal: 16,
                                                    opacity: isCancelledSplit ? 0.58 : 1,
                                                }}>
                                                    {/* Unit Header */}
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingBottom: 12, marginBottom: 12 }}>
                                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                                            <Text style={{
                                                                fontSize: 18,
                                                                fontFamily: 'Inter-Bold',
                                                                color: isCancelledSplit ? '#94A3B8' : Colors.textPrimary,
                                                                textDecorationLine: isCancelledSplit ? 'line-through' : 'none',
                                                            }}>{item.name}</Text>
                                                            {splits.length > 1 && (
                                                                <View style={{ backgroundColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                                                                    <Text style={{ fontSize: 12, fontFamily: 'Inter-SemiBold', color: '#64748B' }}>{ordinal} Qty</Text>
                                                                </View>
                                                            )}
                                                        </View>
                                                    </View>

                                                    {/* Dates & Price Row */}
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                                                        {/* Trial Date */}
                                                        <View style={{ flex: 1 }}>
                                                            <Text style={{ fontSize: 11, fontFamily: 'Inter-Bold', color: '#94A3B8', textTransform: 'uppercase', marginBottom: 6 }}>TRIAL DATE</Text>
                                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                                                <TouchableOpacity
                                                                    onPress={() => {
                                                                        if (isTrialDateLoading || isCancelledSplit) return;
                                                                        setActiveItemIndex(itemIndex);
                                                                        setStatusSplitIndex(splitIndex);
                                                                        setActiveDateRowId(splitApiId);
                                                                        setDateType('trial');
                                                                        setCalendarVisible(true);
                                                                    }}
                                                                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                                                                    disabled={isTrialDateLoading || isCancelledSplit}
                                                                >
                                                                    {isTrialDateLoading ? (
                                                                        <ActivityIndicator size="small" color="#6366F1" />
                                                                    ) : (
                                                                        <Calendar size={14} color={isCancelledSplit ? '#94A3B8' : '#6366F1'} />
                                                                    )}
                                                                    <Text style={{
                                                                        fontSize: 14,
                                                                        fontFamily: 'Inter-SemiBold',
                                                                        color: isCancelledSplit ? '#94A3B8' : '#6366F1',
                                                                        textDecorationLine: isCancelledSplit
                                                                            ? 'none'
                                                                            : (split.trialDate ? 'none' : 'underline'),
                                                                    }}>
                                                                        {split.trialDate ? formatDate(split.trialDate) : 'Set Date'}
                                                                    </Text>
                                                                </TouchableOpacity>
                                                                {/* {!isTrialDateLoading && split.trialDate && (
                                                                    <TouchableOpacity onPress={async () => {
                                                                        if (isTrialDateLoading || !splitApiId) return;
                                                                        try {
                                                                            const currentSplits = getSplitData(item, itemIndex);
                                                                            await dispatch(updateOrderItemDatesAction({
                                                                                itemId: splitApiId,
                                                                                trial_date: null,
                                                                            })).unwrap();
                                                                            const overrideKey = getItemSplitOverrideKey(item, itemIndex);
                                                                            const nextSplits = currentSplits.map((currentSplit, currentIndex) => (
                                                                                currentIndex === splitIndex
                                                                                    ? { ...currentSplit, trialDate: null }
                                                                                    : currentSplit
                                                                            ));
                                                                            setItemSplitDateOverrides(previous => ({
                                                                                ...previous,
                                                                                [overrideKey]: nextSplits,
                                                                            }));
                                                                            await refreshOrderDetail().catch(() => null);
                                                                            showToast('Trial date removed successfully', 'success');
                                                                        } catch (error) {
                                                                            showToast(getErrorMessage(error) || 'Failed to update date', 'error');
                                                                        }
                                                                    }}>
                                                                        <X size={12} color="#EF4444" style={{ marginLeft: 4 }} />
                                                                    </TouchableOpacity>
                                                                )} */}
                                                            </View>
                                                        </View>
                                                        <View style={{ width: 1, height: 32, backgroundColor: '#E2E8F0', marginHorizontal: 12 }} />

                                                        {/* Delivery Date */}
                                                        <View style={{ flex: 1 }}>
                                                            <Text style={{ fontSize: 11, fontFamily: 'Inter-Bold', color: '#94A3B8', textTransform: 'uppercase', marginBottom: 6 }}>DELIVERY DATE</Text>
                                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                                                <TouchableOpacity
                                                                    onPress={() => {
                                                                        if (isDeliveryDateLoading || isCancelledSplit) return;
                                                                        setActiveItemIndex(itemIndex);
                                                                        setStatusSplitIndex(splitIndex);
                                                                        setActiveDateRowId(splitApiId);
                                                                        setDateType('delivery');
                                                                        setCalendarVisible(true);
                                                                    }}
                                                                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                                                                    disabled={isDeliveryDateLoading || isCancelledSplit}
                                                                >
                                                                    {isDeliveryDateLoading ? (
                                                                        <ActivityIndicator size="small" color="#6366F1" />
                                                                    ) : (
                                                                        <Calendar size={14} color={isCancelledSplit ? '#94A3B8' : '#6366F1'} />
                                                                    )}
                                                                    <Text style={{
                                                                        fontSize: 14,
                                                                        fontFamily: 'Inter-SemiBold',
                                                                        color: isCancelledSplit ? '#94A3B8' : '#6366F1',
                                                                        textDecorationLine: isCancelledSplit
                                                                            ? 'none'
                                                                            : (split.deliveryDate ? 'none' : 'underline'),
                                                                    }}>
                                                                        {split.deliveryDate ? formatDate(split.deliveryDate) : 'Set Date'}
                                                                    </Text>
                                                                </TouchableOpacity>
                                                                {/* {!isDeliveryDateLoading && split.deliveryDate && (
                                                                    <TouchableOpacity onPress={async () => {
                                                                        if (isDeliveryDateLoading || !splitApiId) return;
                                                                        try {
                                                                            const currentSplits = getSplitData(item, itemIndex);
                                                                            await dispatch(updateOrderItemDatesAction({
                                                                                itemId: splitApiId,
                                                                                delivery_date: null,
                                                                            })).unwrap();
                                                                            const overrideKey = getItemSplitOverrideKey(item, itemIndex);
                                                                            const nextSplits = currentSplits.map((currentSplit, currentIndex) => (
                                                                                currentIndex === splitIndex
                                                                                    ? { ...currentSplit, deliveryDate: null }
                                                                                    : currentSplit
                                                                            ));
                                                                            setItemSplitDateOverrides(previous => ({
                                                                                ...previous,
                                                                                [overrideKey]: nextSplits,
                                                                            }));
                                                                            await refreshOrderDetail().catch(() => null);
                                                                            showToast('Delivery date removed successfully', 'success');
                                                                        } catch (error) {
                                                                            showToast(getErrorMessage(error) || 'Failed to update date', 'error');
                                                                        }
                                                                    }}>
                                                                        <X size={12} color="#EF4444" style={{ marginLeft: 4 }} />
                                                                    </TouchableOpacity>
                                                                )} */}
                                                            </View>
                                                        </View>

                                                        <View style={{ width: 1, height: 32, backgroundColor: '#E2E8F0', marginHorizontal: 12 }} />

                                                        {/* Price */}
                                                        <View style={{ flex: 1 }}>
                                                            <Text style={{ fontSize: 11, fontFamily: 'Inter-Bold', color: '#94A3B8', textTransform: 'uppercase', marginBottom: 6 }}>PRICE</Text>
                                                            <Text style={{
                                                                fontSize: 14,
                                                                fontFamily: 'Inter-SemiBold',
                                                                color: isCancelledSplit ? '#94A3B8' : Colors.textPrimary,
                                                                textDecorationLine: isCancelledSplit ? 'line-through' : 'none',
                                                            }}>₹{splitAmount.toLocaleString()}</Text>
                                                        </View>
                                                    </View>
                                                    {/* Status Picker */}
                                                    <TouchableOpacity
                                                        onPress={() => {
                                                            if (itemStatusLoading) return;
                                                            setStatusItemIndex(itemIndex);
                                                            setStatusSplitIndex(splitIndex);
                                                            setStatusModalVisible(true);
                                                        }}
                                                        style={{
                                                            backgroundColor: status === 'DELIVERED' ? '#F3F4F6' : bg,
                                                            height: 48, // Slightly taller for better touch target
                                                            borderRadius: 12,
                                                            flexDirection: 'row',
                                                            justifyContent: 'space-between',
                                                            alignItems: 'center',
                                                            paddingHorizontal: 16,
                                                            borderWidth: 1,
                                                            borderColor: text + '20'
                                                        }}
                                                        disabled={itemStatusLoading || status === 'DELIVERED' || isCancelledSplit}
                                                    >
                                                        <Text style={{ fontSize: 14, fontFamily: 'Inter-Bold', color: text }}>
                                                            {getStatusDisplayText(status)}
                                                        </Text>
                                                        {itemStatusLoading ? (
                                                            <ActivityIndicator size="small" color={chevron} />
                                                        ) : (
                                                            <ChevronDown size={18} color={chevron} />
                                                        )}
                                                    </TouchableOpacity>
                                                </View>
                                            );
                                        })}
                                    </View>

                                    {item.photos && item.photos.filter(p => p.category === 'REFERENCE').length > 0 && (
                                        <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
                                            <Text style={{ fontFamily: 'Inter-SemiBold', fontSize: 12, color: Colors.textSecondary, marginBottom: 8 }}>Client Reference Photos:</Text>
                                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row', gap: 8 }}>
                                                {item.photos.filter(p => p.category === 'REFERENCE').map((photo, pIdx) => (
                                                    <TouchableOpacity key={`client-photo-${pIdx}`} onPress={() => setPreviewImageUri(photo.file_url)}>
                                                        <Image source={{ uri: photo.file_url }} style={{ width: 50, height: 50, borderRadius: 8, marginRight: 8, backgroundColor: '#F3F4F6' }} />
                                                    </TouchableOpacity>
                                                ))}
                                            </ScrollView>
                                        </View>
                                    )}

                                    {!isItemFullyCancelled && (
                                        <TouchableOpacity
                                            onPress={() => handleToggleRequestPhotos(itemIndex)}
                                            style={{
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                backgroundColor: item.requestedPhotosFromClient ? '#F3F4F6' : '#EFF6FF',
                                                paddingVertical: 10,
                                                marginHorizontal: 16,
                                                marginBottom: 12,
                                                borderRadius: 10,
                                                borderWidth: 1,
                                                borderColor: item.requestedPhotosFromClient ? '#E5E7EB' : '#BFDBFE',
                                                gap: 6
                                            }}
                                        >
                                            <AlertCircle size={15} color={item.requestedPhotosFromClient ? '#6B7280' : '#2563EB'} />
                                            <Text style={{
                                                fontSize: 13,
                                                fontFamily: 'Inter-SemiBold',
                                                color: item.requestedPhotosFromClient ? '#6B7280' : '#2563EB'
                                            }}>
                                                {item.requestedPhotosFromClient ? 'Cancel Photo Request' : 'Request Photos from Client'}
                                            </Text>
                                        </TouchableOpacity>
                                    )}

                                    {/* Action Row */}
                                    <View style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        backgroundColor: '#F9FAFB',
                                        paddingHorizontal: 16,
                                        paddingVertical: 18,
                                        borderTopWidth: 1,
                                        borderTopColor: '#F1F5F9'
                                    }}>
                                        <TouchableOpacity
                                            onPress={() => {
                                                if (isItemFullyCancelled) {
                                                    return;
                                                }
                                                if (isEditBlockedByStatus) {
                                                    showToast("Edit not allowed here", 'warning');
                                                    return;
                                                }
                                                navigation.navigate('CreateOrderFlow', { editOrderId: order.id, editItemIndex: itemIndex });
                                            }}
                                            style={{ flexDirection: 'row', alignItems: 'center', gap: 8, opacity: (isItemFullyCancelled || isEditBlockedByStatus) ? 0.5 : 1 }}
                                            disabled={isItemFullyCancelled}
                                        >
                                            <Text style={{ fontSize: 15, color: '#475569', fontFamily: 'Inter-SemiBold' }}>Edit Item</Text>
                                            <Edit2 size={18} color="#475569" />
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            onPress={() => {
                                                if (isItemFullyCancelled) {
                                                    return;
                                                }
                                                navigation.navigate('ItemDetail', { item, orderId: order.id, itemIndex });
                                            }}
                                            style={{ flexDirection: 'row', alignItems: 'center', opacity: isItemFullyCancelled ? 0.5 : 1 }}
                                            disabled={isItemFullyCancelled}
                                        >
                                            <Text style={{ fontSize: 15, color: '#6366F1', fontFamily: 'Inter-SemiBold' }}>View Details</Text>
                                            <ChevronRight size={18} color="#6366F1" />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                )}


            </View>
        );
    };


    const renderPaymentHistory = () => (
        <View style={{ flex: 1 }}>
            {activePaymentMenu && (
                <TouchableOpacity
                    style={{
                        position: 'absolute',
                        top: -100,
                        left: -20,
                        right: -20,
                        bottom: -100,
                        zIndex: 50,
                        backgroundColor: 'transparent'
                    }}
                    onPress={() => setActivePaymentMenu(null)}
                    activeOpacity={1}
                />
            )}
            {/* Payment Summary Card */}
            <View style={{
                backgroundColor: '#EEF2FF',
                padding: 20,
                borderRadius: 16,
                marginBottom: 24,
                borderWidth: 1,
                borderColor: '#E0E7FF',
                flexDirection: 'row'
            }}>
                <View style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={{ fontFamily: 'Inter-Bold', fontSize: 18, color: Colors.textPrimary }}>₹{formatAmountValue(orderSubtotalAmount)}</Text>
                    <Text style={{ fontFamily: 'Inter-Medium', fontSize: 13, color: Colors.textSecondary, marginTop: 4 }}>Subtotal</Text>
                </View>
                <View style={{ width: 1, height: '60%', backgroundColor: '#E0E7FF', alignSelf: 'center' }} />
                <View style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={{ fontFamily: 'Inter-Bold', fontSize: 18, color: '#059669' }}>₹{totalPaid.toLocaleString('en-IN')}</Text>
                    <Text style={{ fontFamily: 'Inter-Medium', fontSize: 13, color: Colors.textSecondary, marginTop: 4 }}>Paid</Text>
                </View>
                <View style={{ width: 1, height: '60%', backgroundColor: '#E0E7FF', alignSelf: 'center' }} />
                <View style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={{ fontFamily: 'Inter-Bold', fontSize: 18, color: currentBalance > 0 ? '#EF4444' : '#059669' }}>₹{Math.abs(currentBalance).toLocaleString('en-IN')}</Text>
                    <Text style={{ fontFamily: 'Inter-Medium', fontSize: 13, color: Colors.textSecondary, marginTop: 4 }}>Balance</Text>
                </View>
            </View>
{/* 
            <View style={{ marginTop: -8, marginBottom: 24, padding: 16, backgroundColor: Colors.white, borderRadius: 16, borderWidth: 1, borderColor: Colors.border }}>
                <View style={{ gap: 12 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ fontFamily: 'Inter-Regular', color: Colors.textSecondary }}>Actual Amount</Text>
                        <Text style={{ fontFamily: 'Inter-SemiBold', color: Colors.textPrimary }}>₹{orderActualAmount.toLocaleString('en-IN')}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ fontFamily: 'Inter-Regular', color: orderDiscountAmount > 0 ? '#059669' : Colors.textSecondary }}>Discount Amount</Text>
                        <Text style={{ fontFamily: 'Inter-SemiBold', color: orderDiscountAmount > 0 ? '#059669' : Colors.textPrimary }}>
                            {orderDiscountAmount > 0 ? '-' : ''} ₹{orderDiscountAmount.toLocaleString('en-IN')}
                        </Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ fontFamily: 'Inter-Regular', color: Colors.textSecondary }}>Subtotal</Text>
                        <Text style={{ fontFamily: 'Inter-SemiBold', color: Colors.textPrimary }}>₹{orderSubtotalAmount.toLocaleString('en-IN')}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ fontFamily: 'Inter-Regular', color: Colors.textSecondary }}>Paid Amount</Text>
                        <Text style={{ fontFamily: 'Inter-SemiBold', color: Colors.success }}>₹{totalPaid.toLocaleString('en-IN')}</Text>
                    </View>
                    <View style={{ height: 1, backgroundColor: Colors.border }} />
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ fontFamily: 'Inter-Bold', color: currentBalance < 0 ? Colors.danger : Colors.textPrimary }}>
                            {currentBalance < 0 ? 'Refund Due' : 'Balance Amount'}
                        </Text>
                        <Text style={{ fontFamily: 'Inter-Bold', color: currentBalance > 0 ? Colors.danger : Colors.success }}>
                            ₹{Math.abs(currentBalance).toLocaleString('en-IN')}
                        </Text>
                    </View>
                </View>
            </View> */}

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Text style={{ fontFamily: 'Inter-Bold', fontSize: 16, color: Colors.textPrimary, textTransform: 'uppercase' }}>PAYMENTS ({paymentHistoryCount})</Text>
                {canAddPayment ? (
                    <TouchableOpacity
                        onPress={() => {
                            if (order.status === 'Cancelled') {
                                showToast("This order is cancelled and cannot accept payments", 'warning');
                                return;
                            }
                            setEditingPayment(null);
                            setPaymentAmount('');
                            setPaymentMode('Cash');
                            setTransactionId('');
                            setPaymentModalVisible(true);
                        }}
                        style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#ECFDF5', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 }}
                    >
                        <PlusCircle size={16} color="#059669" style={{ marginRight: 4 }} />
                        <Text style={{ color: '#059669', fontFamily: 'Inter-SemiBold', fontSize: 13 }}>Add Payment</Text>
                    </TouchableOpacity>
                ) : null}
            </View>

            {(orderPaymentHistoryLoading || isPaymentRefreshPending) ? (
                <View style={{ paddingVertical: 32, alignItems: 'center', justifyContent: 'center' }}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                </View>
            ) : paymentHistoryList.length === 0 ? (
                <View style={{ padding: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F9FAFB', borderRadius: 16, borderStyle: 'dashed', borderWidth: 1, borderColor: Colors.border }}>
                    <ReceiptIndianRupee size={32} color={Colors.textSecondary} style={{ marginBottom: 8, opacity: 0.5 }} />
                    <Text style={{ color: Colors.textSecondary, fontFamily: 'Inter-Medium' }}>No payments recorded yet</Text>
                </View>
            ) : (
                <View style={{ gap: 16 }}>
                    {paymentHistoryList
                        .map((p, index) => {
                            const paymentStatus = p.payment_status || p.status || '';
                            const paymentSequence = String(paymentHistoryList.length - index).padStart(2, '0');
                            const paymentId = `Payment #${paymentSequence}`;
                            const isCancelled = String(paymentStatus).toUpperCase() === 'CANCELLED' || String(paymentStatus).toUpperCase() === 'CANCEL';

                            return (
                                <View key={p.id} style={{ backgroundColor: Colors.white, borderRadius: 12, borderWidth: 1, borderColor: '#E0E7FF', padding: 16, position: 'relative', ...Shadow.subtle }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                                        {/* Left Icon */}
                                        <View style={{
                                            width: 40,
                                            height: 40,
                                            borderRadius: 8,
                                            backgroundColor: isCancelled ? '#F3F4F6' : '#ECFDF5',
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                            marginRight: 12
                                        }}>
                                            <ReceiptIndianRupee size={20} color={isCancelled ? '#9CA3AF' : '#059669'} />
                                        </View>

                                        {/* Middle content */}
                                        <View style={{ flex: 1 }}>
                                            <Text style={{ fontFamily: 'Inter-Bold', fontSize: 16, color: Colors.textPrimary }}>BILL {Number(paymentSequence)}</Text>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 8, flexWrap: 'wrap' }}>
                                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                    <Calendar size={12} color={Colors.textSecondary} />
                                                    <Text style={{ fontFamily: 'Inter-Medium', fontSize: 13, color: Colors.textSecondary, marginLeft: 4 }}>{formatDate(p.created_at || p.date)}</Text>
                                                </View>
                                                <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: '#CBD5E1' }} />
                                                <Text style={{ fontSize: 13, fontFamily: 'Inter-SemiBold', color: Colors.textSecondary, textTransform: 'uppercase' }}>
                                                    {(p.payment_mode || p.mode || 'Cash').toUpperCase()}
                                                </Text>
                                                <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: '#CBD5E1' }} />
                                                <Text style={{ fontSize: 13, fontFamily: 'Inter-Medium', color: isCancelled ? '#EF4444' : '#059669', textTransform: 'capitalize' }}>
                                                    {isCancelled ? 'Cancelled' : (paymentStatus || 'Success').toLowerCase()}
                                                </Text>
                                            </View>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 6, flexWrap: 'wrap' }}>
                                                {!!(p.transaction_id || p.transactionId) && (
                                                    <>
                                                        <Text style={{ fontFamily: 'Inter-Medium', fontSize: 12, color: Colors.textSecondary }}>
                                                            Txn: {p.transaction_id || p.transactionId}
                                                        </Text>
                                                        <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: '#CBD5E1' }} />
                                                    </>
                                                )}
                                                <Text style={{ fontFamily: 'Inter-Medium', fontSize: 12, color: Colors.textSecondary }}>
                                                    Balance: <Text style={{ fontFamily: 'Inter-Bold', color: Colors.textPrimary }}>₹{Number(p.balance_amount ?? p.balance ?? 0).toLocaleString('en-IN')}</Text>
                                                </Text>
                                            </View>
                                        </View>

                                        {/* Right Amount */}
                                        <Text style={{
                                            fontFamily: 'Inter-Bold',
                                            fontSize: 18,
                                            color: isCancelled ? '#FECACA' : '#059669',
                                            textDecorationLine: isCancelled ? 'line-through' : 'none'
                                        }}>
                                            +₹{p.amount.toLocaleString('en-IN')}
                                        </Text>
                                    </View>

                                    {isCancelled && (
                                        <View style={{ backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 8, padding: 10, marginTop: 12, borderLeftWidth: 3, borderLeftColor: '#F87171' }}>
                                            <Text style={{ fontSize: 13, color: '#FEE2E2', fontFamily: 'Inter-Medium' }}>
                                                Reason : {p.cancellationReason || 'No reason provided'}
                                            </Text>
                                        </View>
                                    )}

                                    {/* Action Buttons */}
                                    <View style={{
                                        flexDirection: 'row',
                                        marginTop: 16,
                                        borderRadius: 8,
                                        height: 44,
                                        alignItems: 'center',
                                        backgroundColor: '#EEF2FF',
                                        overflow: 'hidden'
                                    }}>
                                        <TouchableOpacity
                                            style={{ flex: 1, height: '100%', justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 6 }}
                                            onPress={() => handleViewPaymentBill(p)}
                                        >
                                            <Eye size={16} color={Colors.primary} />
                                            <Text style={{ color: Colors.primary, fontFamily: 'Inter-SemiBold', fontSize: 13 }}>View Bill</Text>
                                        </TouchableOpacity>
                                        
                                        <View style={{ width: 1, height: '60%', backgroundColor: '#C7D2FE' }} />
                                        
                                        <TouchableOpacity
                                            style={{ flex: 1, height: '100%', justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 6 }}
                                            onPress={() => handlePrintPaymentBill(p)}
                                        >
                                            <Printer size={16} color={Colors.primary} />
                                            <Text style={{ color: Colors.primary, fontFamily: 'Inter-SemiBold', fontSize: 13 }}>Print</Text>
                                        </TouchableOpacity>
                                        
                                        <View style={{ width: 1, height: '60%', backgroundColor: '#C7D2FE' }} />
                                        
                                        <TouchableOpacity
                                            style={{ flex: 1, height: '100%', justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 6, opacity: isSharing ? 0.7 : 1 }}
                                            onPress={() => handleWhatsAppPaymentBill(p)}
                                            disabled={isSharing}
                                        >
                                            {isSharing ? (
                                                <ActivityIndicator size="small" color={Colors.primary} />
                                            ) : (
                                                <>
                                                    <Share2 size={16} color={Colors.primary} />
                                                    <Text style={{ color: Colors.primary, fontFamily: 'Inter-SemiBold', fontSize: 13 }}>WhatsApp</Text>
                                                </>
                                            )}
                                        </TouchableOpacity>
                                    </View>

                                    {/* Popover Menu */}
                                    {activePaymentMenu === p.id && (
                                        <View style={{
                                            position: 'absolute',
                                            right: 12,
                                            bottom: 56,
                                            backgroundColor: 'white',
                                            borderRadius: 8,
                                            zIndex: 100,
                                            borderWidth: 1,
                                            borderColor: '#F1F5F9',
                                            padding: 4,
                                            minWidth: 160
                                        }}>
                                            {!isCancelled && (
                                                <TouchableOpacity
                                                    style={{ flexDirection: 'row', alignItems: 'center', padding: 12, gap: 8 }}
                                                    onPress={() => handleCancelPayment(p)}
                                                >
                                                    <XCircle size={18} color="#EF4444" />
                                                    <Text style={{ color: '#EF4444', fontFamily: 'Inter-SemiBold', fontSize: 14 }}>Cancel Payment</Text>
                                                </TouchableOpacity>
                                            )}
                                            {isCancelled && (
                                                <View style={{ padding: 12 }}>
                                                    <Text style={{ color: Colors.textSecondary, fontFamily: 'Inter-Medium', fontSize: 12 }}>Payment Cancelled</Text>
                                                </View>
                                            )}
                                        </View>
                                    )}
                                </View>
                            );
                        })}
                </View>
            )}
        </View>
    );

    return (
        <View style={styles.container}>
            {/* Header with Tabs */}
            <View style={[styles.header, {
                paddingTop: insets.top,
                backgroundColor: Colors.white
            }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 12 }}>
                    <ArrowLeft size={24} color={Colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Order No : #{displayOrderNumber}</Text>
            </View>

            {renderTabs()}
            <ScrollView
                key={orderRenderKey}
                ref={scrollRef}
                horizontal
                pagingEnabled
                contentOffset={{ x: getTabIndex(activeTab, order?.orderCategory) * width, y: 0 }}
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={handleScroll}
                style={{ flex: 1 }}
            >
                <ScrollView style={{ width }} contentContainerStyle={styles.scrollContent}>
                    {renderOrderDetails()}
                </ScrollView>
                <ScrollView style={{ width }} contentContainerStyle={styles.scrollContent}>
                    {renderOrderItems()}
                </ScrollView>
                {order.orderCategory !== 'Sales' && (
                    <ScrollView style={{ width }} contentContainerStyle={styles.scrollContent}>
                        {renderPaymentHistory()}
                    </ScrollView>
                )}
            </ScrollView>


            {/* Sticky Actions Footer */}
            {activeTab === 'details' && (
                <View style={{
                    backgroundColor: Colors.white,
                    borderTopWidth: 1,
                    borderTopColor: '#F3F4F6',
                    paddingBottom: Math.max(insets.bottom, 16)
                }}>


                    <View style={{
                        flexDirection: 'row',
                        gap: 12,
                        padding: 16,
                        paddingTop: order.orderCategory === 'Sales' ? 8 : 16,
                    }}>
                        <TouchableOpacity
                            style={{
                                flex: 1,
                                backgroundColor: '#EEF2FF',
                                height: 56,
                                borderRadius: 12,
                                flexDirection: 'row',
                                justifyContent: 'center',
                                alignItems: 'center',
                                gap: 8,
                                opacity: isPrinting ? 0.7 : 1,
                                borderWidth: 1,
                                borderColor: '#E0E7FF'
                            }}
                            onPress={() => setIsPrintOptionsVisible(true)}
                            disabled={isPrinting || isSharing}
                        >
                            {isPrinting ? (
                                <ActivityIndicator size="small" color="#6366F1" />
                            ) : (
                                <>
                                    <Printer size={20} color="#6366F1" />
                                    <Text style={{ fontFamily: 'Inter-Bold', fontSize: 16, color: '#6366F1' }}>Print Invoice</Text>
                                </>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={{
                                flex: 1,
                                backgroundColor: '#6366F1',
                                height: 56,
                                borderRadius: 12,
                                flexDirection: 'row',
                                justifyContent: 'center',
                                alignItems: 'center',
                                gap: 8,
                                opacity: isSharing ? 0.7 : 1
                            }}
                            onPress={handleWhatsAppShare}
                            disabled={isPrinting || isSharing}
                        >
                            {isSharing ? (
                                <ActivityIndicator size="small" color="white" />
                            ) : (
                                <>
                                    <Share2 size={20} color="white" />
                                    <Text style={{ fontFamily: 'Inter-Bold', fontSize: 16, color: 'white' }}>WhatsApp</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            )}
            {/* Print Options Modal */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={isPrintOptionsVisible}
                onRequestClose={() => setIsPrintOptionsVisible(false)}
            >
                <TouchableOpacity 
                    style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 20 }} 
                    activeOpacity={1} 
                    onPress={() => setIsPrintOptionsVisible(false)}
                >
                    <View style={{ backgroundColor: Colors.white, borderRadius: 24, padding: 24 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <Text style={{ fontFamily: 'Inter-Bold', fontSize: 18, color: Colors.textPrimary }}>Print Options</Text>
                            <TouchableOpacity onPress={() => setIsPrintOptionsVisible(false)} style={{ padding: 4, backgroundColor: '#F1F5F9', borderRadius: 20 }}>
                                <X size={20} color={Colors.textSecondary} />
                            </TouchableOpacity>
                        </View>
                        
                        <View style={{ gap: 16 }}>
                            <TouchableOpacity
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    backgroundColor: '#F8FAFC',
                                    padding: 16,
                                    borderRadius: 16,
                                    borderWidth: 1,
                                    borderColor: '#E2E8F0',
                                    gap: 16
                                }}
                                onPress={() => {
                                    setIsPrintOptionsVisible(false);
                                    handleCustomerCopy();
                                }}
                            >
                                <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center' }}>
                                    <Printer size={24} color="#6366F1" />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontFamily: 'Inter-SemiBold', fontSize: 16, color: Colors.textPrimary }}>Customer Copy</Text>
                                    <Text style={{ fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.textSecondary, marginTop: 2 }}>Print bill with pricing for customer</Text>
                                </View>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    backgroundColor: '#F8FAFC',
                                    padding: 16,
                                    borderRadius: 16,
                                    borderWidth: 1,
                                    borderColor: '#E2E8F0',
                                    gap: 16
                                }}
                                onPress={() => {
                                    setIsPrintOptionsVisible(false);
                                    handleTailorCopy();
                                }}
                            >
                                <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: '#F0FDF4', justifyContent: 'center', alignItems: 'center' }}>
                                    <Printer size={24} color="#16A34A" />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontFamily: 'Inter-SemiBold', fontSize: 16, color: Colors.textPrimary }}>Tailor Copy</Text>
                                    <Text style={{ fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.textSecondary, marginTop: 2 }}>Print measurements without pricing</Text>
                                </View>
                            </TouchableOpacity>
                        </View>
                    </View>
                </TouchableOpacity>
            </Modal>
            <Modal
                animationType="slide"
                transparent={true}
                visible={paymentModalVisible}
                onRequestClose={() => setPaymentModalVisible(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1 }}
                >
                    <View style={styles.modalOverlay}>
                        <View style={[
                            styles.modalContent,
                            { paddingBottom: Math.max(insets.bottom, Platform.OS === 'android' ? 80 : 32) }
                        ]}>
                            <ScrollView showsVerticalScrollIndicator={false}>
                                <Text style={[Typography.h2, { marginBottom: Spacing.lg }]}>{editingPayment ? 'Edit Payment' : 'Add Payment'}</Text>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Amount Received (Balance: ₹{Math.abs(currentBalance).toLocaleString('en-IN')})</Text>
                                    <TextInput
                                        style={[
                                            styles.input,
                                            paymentAmountError ? styles.inputError : null,
                                        ]}
                                        placeholderTextColor={Colors.textSecondary}
                                        placeholder="₹ 0.00"
                                        keyboardType="numeric"
                                        value={paymentAmount}
                                        onChangeText={handlePaymentAmountChange}
                                        autoFocus
                                    />
                                    {paymentAmountError1 ? (
                                        <Text style={styles.errorText}>{paymentAmountError1}</Text>
                                    ) : null}
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Payment Mode</Text>
                                    <View style={styles.modeRow}>
                                        {['Cash', 'UPI'].map(m => (
                                            <TouchableOpacity
                                                key={m}
                                                style={[styles.modeBtn, paymentMode === m && styles.modeBtnActive]}
                                                onPress={() => setPaymentMode(m)}
                                                disabled={createOrderPaymentLoading}
                                            >
                                                <Text style={[styles.modeBtnText, paymentMode === m && styles.modeBtnTextActive]}>{m}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>



                                <View style={styles.modalFooter}>
                                    <TouchableOpacity style={styles.cancelBtn} onPress={() => {
                                        resetPaymentForm();
                                    }}>
                                        <Text style={styles.cancelBtnText}>Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.saveBtn, (createOrderPaymentLoading || !!paymentAmountError) && styles.saveBtnDisabled]}
                                        onPress={handleSavePayment}
                                        disabled={createOrderPaymentLoading || !!paymentAmountError}
                                    >
                                        {createOrderPaymentLoading ? (
                                            <ActivityIndicator color={Colors.white} />
                                        ) : (
                                            <Text style={styles.saveBtnText}>{editingPayment ? 'Update Payment' : 'Add Payment'}</Text>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </ScrollView>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Modals and Sheets */}

            <BottomConfirmationSheet
                visible={deleteSheetVisible}
                onClose={() => setDeleteSheetVisible(false)}
                onConfirm={confirmDelete}
                title="Delete Order"
                description="Are you sure you want to delete this order? This action cannot be undone."
                confirmText="Delete Order"
                type="danger"
            />

            <BottomConfirmationSheet
                visible={deleteItemSheetVisible}
                onClose={() => setDeleteItemSheetVisible(false)}
                onConfirm={confirmDeleteItem}
                title="Delete Item"
                description="Are you sure you want to delete this item?"
                confirmText="Delete Item"
                type="danger"
            />

            <BottomConfirmationSheet
                visible={deletePaymentSheetVisible}
                onClose={() => {
                    setDeletePaymentSheetVisible(false);
                    setPaymentToDelete(null);
                }}
                onConfirm={confirmDeletePayment}
                title="Delete Payment"
                description="Are you sure you want to delete this payment?"
                confirmText="Delete Payment"
                type="danger"
            />

            <BottomConfirmationSheet
                visible={cancelSheetVisible}
                onClose={() => {
                    if (updateOrderItemStatusLoading) {
                        return;
                    }

                    setCancelSheetVisible(false);
                    setStatusItemIndex(null);
                    setStatusSplitIndex(null);
                    setPendingStatusOption(null);
                    setUpdatingStatusOptionId(null);
                }}
                onConfirm={confirmCancelItem}
                title={statusSplitIndex !== null ? "Cancel Unit" : "Cancel Item"}
                description={statusSplitIndex !== null
                    ? "Are you sure you want to cancel this unit? Only this selected unit will be marked as cancelled."
                    : "Are you sure you want to cancel this item? Only this selected item will be marked as cancelled."}
                confirmText={statusSplitIndex !== null ? "Cancel Unit" : "Cancel Item"}
                type="danger"
                loading={updateOrderItemStatusLoading}
            />

            <AlertModal
                visible={alertVisible}
                title={alertConfig.title}
                message={alertConfig.message}
                onClose={() => setAlertVisible(false)}
            />

            <Modal
                visible={cancelPaymentModalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setCancelPaymentModalVisible(false)}
            >
                <View style={[styles.modalOverlay]}>
                    <View style={{ backgroundColor: 'white', borderRadius: 20, width: '100%', padding: 20 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <Text style={{ fontSize: 20, fontFamily: 'Inter-Bold', color: Colors.textPrimary }}>Cancel Payment</Text>
                            <TouchableOpacity onPress={() => setCancelPaymentModalVisible(false)}>
                                <X size={24} color={Colors.textPrimary} />
                            </TouchableOpacity>
                        </View>

                        <View style={{ height: 1, backgroundColor: '#F1F5F9', marginBottom: 20 }} />

                        <Text style={{ fontSize: 15, fontFamily: 'Inter-SemiBold', color: Colors.textPrimary, marginBottom: 12 }}>
                            Please add a cancellation reason <Text style={{ color: '#EF4444' }}>*</Text>
                        </Text>

                        <TextInput
                            style={{
                                backgroundColor: '#F9FAFB',
                                borderWidth: 1,
                                borderColor: '#E2E8F0',
                                borderRadius: 8,
                                padding: 12,
                                height: 120,
                                textAlignVertical: 'top',
                                fontFamily: 'Inter-Regular',
                                fontSize: 15,
                                color: Colors.textPrimary
                            }}
                            placeholder="Cancellation reason..."
                            placeholderTextColor="#94A3B8"
                            multiline
                            value={cancellationReason}
                            onChangeText={setCancellationReason}
                        />

                        <View style={{ flexDirection: 'row', marginTop: 24, gap: 12 }}>
                            <TouchableOpacity
                                style={{ flex: 1, backgroundColor: '#6366F1', height: 50, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 }}
                                onPress={confirmCancelPayment}
                            >
                                <XCircle size={20} color="white" />
                                <Text style={{ color: 'white', fontFamily: 'Inter-Bold', fontSize: 16 }}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={{ flex: 1, backgroundColor: '#E2E8F0', height: 50, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 }}
                                onPress={() => setCancelPaymentModalVisible(false)}
                            >
                                <ArrowLeft size={20} color={Colors.textPrimary} />
                                <Text style={{ color: Colors.textPrimary, fontFamily: 'Inter-Bold', fontSize: 16 }}>Back</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            <Modal
                visible={!!selectedItem}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setSelectedItem(null)}
            >
                <View style={[styles.modalOverlay, { justifyContent: 'flex-end' }]}>
                    <TouchableOpacity style={{ flex: 1 }} onPress={() => setSelectedItem(null)} />
                    <View style={[styles.bottomSheet, { maxHeight: '85%' }]}>
                        <View style={styles.bottomSheetHeader}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.bottomSheetTitle}>{selectedItem?.name}</Text>
                                <Text style={{ fontSize: 13, color: Colors.textSecondary }}>Detailed Specifications</Text>
                            </View>
                            <TouchableOpacity onPress={() => setSelectedItem(null)}>
                                <X size={24} color={Colors.textPrimary} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 + (Platform.OS === 'android' ? 80 : 0) }}>
                            {/* Images & Sketches */}
                            {((selectedItem?.images && selectedItem.images.length > 0) || (selectedItem?.sketches && selectedItem.sketches.length > 0) || (selectedItem?.measurementDressImages && selectedItem.measurementDressImages.length > 0) || (selectedItem?.materialImages && selectedItem.materialImages.length > 0)) && (
                                <View style={{ marginBottom: 24 }}>
                                    <Text style={{ fontFamily: 'Inter-SemiBold', fontSize: 13, color: Colors.textSecondary, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Photos / Designs</Text>
                                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                                        {/* Reference Images */}
                                        {selectedItem?.images?.map((img, i) => (
                                            <TouchableOpacity key={`img-${i}`} onPress={() => setPreviewImageUri(img)} style={{ width: '48%', aspectRatio: 1 }}>
                                                <Image source={{ uri: img }} style={{ width: '100%', height: '100%', borderRadius: 12, backgroundColor: '#F3F4F6' }} resizeMode="cover" />
                                            </TouchableOpacity>
                                        ))}
                                        {/* Sketches */}
                                        {selectedItem?.sketches?.map((img, i) => (
                                            <TouchableOpacity key={`sketch-${i}`} onPress={() => setPreviewImageUri(img)} style={{ width: '48%', aspectRatio: 1 }}>
                                                <Image source={{ uri: img }} style={{ width: '100%', height: '100%', borderRadius: 12, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#F1F5F9' }} resizeMode="contain" />
                                            </TouchableOpacity>
                                        ))}
                                        {/* Measurement Dress */}
                                        {selectedItem?.measurementDressImages?.map((img, i) => (
                                            <TouchableOpacity key={`meas-${i}`} onPress={() => setPreviewImageUri(img)} style={{ width: '48%', aspectRatio: 1 }}>
                                                <Image source={{ uri: img }} style={{ width: '100%', height: '100%', borderRadius: 12, backgroundColor: '#F3F4F6' }} resizeMode="cover" />
                                            </TouchableOpacity>
                                        ))}
                                        {/* Material Images */}
                                        {selectedItem?.materialImages?.map((img, i) => (
                                            <TouchableOpacity key={`mat-${i}`} onPress={() => setPreviewImageUri(img)} style={{ width: '48%', aspectRatio: 1 }}>
                                                <Image source={{ uri: img }} style={{ width: '100%', height: '100%', borderRadius: 12, backgroundColor: '#F3F4F6' }} resizeMode="cover" />
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>
                            )}

                            {/* Separating Measurements and Stitching Options */}
                            {(() => {
                                const measurements = selectedItem?.measurements || {};
                                const numericMeasurements = {};
                                const stitchingOptions = {};

                                Object.entries(measurements).forEach(([key, val]) => {
                                    if (!isNaN(Number(val)) && String(val).trim() !== '') {
                                        numericMeasurements[key] = val;
                                    } else if (val && String(val).trim() !== '') {
                                        stitchingOptions[key] = val;
                                    }
                                });

                                return (
                                    <>
                                        {Object.keys(numericMeasurements).length > 0 && (
                                            <View style={{ marginBottom: 24 }}>
                                                <Text style={{ fontFamily: 'Inter-SemiBold', fontSize: 13, color: Colors.textSecondary, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Measurements</Text>
                                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                                                    {Object.entries(numericMeasurements).map(([key, val]) => (
                                                        <View key={key} style={{ width: '48%', backgroundColor: '#F9FAFB', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#F3F4F6' }}>
                                                            <Text style={{ fontSize: 12, color: Colors.textSecondary, textTransform: 'capitalize', marginBottom: 4 }}>{key.replace(/([A-Z])/g, ' $1').trim()}</Text>
                                                            <Text style={{ fontSize: 16, fontFamily: 'Inter-SemiBold', color: Colors.textPrimary }}>{String(val)}</Text>
                                                        </View>
                                                    ))}
                                                </View>
                                            </View>
                                        )}

                                        {Object.keys(stitchingOptions).length > 0 && (
                                            <View style={{ marginBottom: 24 }}>
                                                <Text style={{ fontFamily: 'Inter-SemiBold', fontSize: 13, color: Colors.textSecondary, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>{selectedItem?.orderType === 'Alteration' ? 'Alteration Options' : 'Stitching Options'}</Text>
                                                <View style={{ backgroundColor: '#F9FAFB', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#F3F4F6', gap: 12 }}>
                                                    {Object.entries(stitchingOptions).map(([key, val]) => (
                                                        <View key={key} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                            <Text style={{ fontSize: 14, color: Colors.textSecondary, fontFamily: 'Inter-Medium', textTransform: 'capitalize' }}>{key.replace(/([A-Z])/g, ' $1').trim()}</Text>
                                                            <Text style={{ fontSize: 14, fontFamily: 'Inter-SemiBold', color: Colors.textPrimary, flex: 1, textAlign: 'right', marginLeft: 16 }}>{String(val)}</Text>
                                                        </View>
                                                    ))}
                                                </View>
                                            </View>
                                        )}
                                    </>
                                );
                            })()}

                            {/* Notes */}
                            {selectedItem?.notes ? (
                                <View style={{ marginBottom: 24 }}>
                                    <Text style={{ fontFamily: 'Inter-SemiBold', fontSize: 13, color: Colors.textSecondary, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Notes</Text>
                                    <View style={{ backgroundColor: '#FFFBEB', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#FEF3C7' }}>
                                        <Text style={{ fontSize: 14, color: '#92400E', fontFamily: 'Inter-Medium', lineHeight: 20 }}>{selectedItem.notes}</Text>
                                    </View>
                                </View>
                            ) : null}

                            {/* Audio Note */}
                            {selectedItem?.audioUri && (
                                <View style={{ marginBottom: 24 }}>
                                    <Text style={{ fontFamily: 'Inter-SemiBold', fontSize: 13, color: Colors.textSecondary, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Audio Note</Text>
                                    <TouchableOpacity
                                        style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.primary, padding: 16, borderRadius: 12 }}
                                        onPress={() => handlePlayAudio(selectedItem.audioUri)}
                                    >
                                        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                                            {playingUri === selectedItem.audioUri ? <StopCircle size={24} color={Colors.white} /> : <PlayCircle size={24} color={Colors.white} />}
                                        </View>
                                        <View>
                                            <Text style={{ color: Colors.white, fontFamily: 'Inter-SemiBold', fontSize: 15 }}>
                                                {playingUri === selectedItem.audioUri ? 'Stop Playback' : 'Play Voice Note'}
                                            </Text>
                                            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 2 }}>Tap to listen per instructions</Text>
                                        </View>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Status Modal */}
            <Modal
                visible={statusModalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={closeStatusModal}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={closeStatusModal}
                >
                    <View style={styles.bottomSheet}>
                        <View style={[styles.bottomSheetHeader, { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }]}>
                            <Text style={styles.bottomSheetTitle}>Update Status</Text>
                            <TouchableOpacity onPress={closeStatusModal}>
                                <X size={24} color={Colors.textPrimary} />
                            </TouchableOpacity>
                        </View>
                        <View style={{ padding: 16, gap: 10 }}>
                            {orderItemStatusesLoading && orderItemStatuses.length === 0 ? (
                                <View style={{ paddingVertical: 16, alignItems: 'center', justifyContent: 'center' }}>
                                    <ActivityIndicator size="small" color={Colors.primary} />
                                </View>
                            ) : orderItemStatuses.length === 0 ? (
                                <View style={{ paddingVertical: 16, alignItems: 'center', justifyContent: 'center' }}>
                                    <Text style={{ fontSize: 14, fontFamily: 'Inter-Medium', color: Colors.textSecondary }}>
                                        No statuses available
                                    </Text>
                                </View>
                            ) : [...orderItemStatuses]
                                .sort((a, b) => {
                                    const STATUS_ORDER = {
                                        'YET TO START': 1,
                                        'PENDING': 1,
                                        'STITCHING': 2,
                                        'IN PROGRESS': 2,
                                        'INPROGRESS': 2,
                                        'COMPLETED': 3,
                                        'DELIVERED': 4,
                                        'CANCELLED': 5
                                    };
                                    const getVal = (opt) => String(opt?.value || opt?.status || opt?.label || '').toUpperCase().replace(/_/g, ' ').trim();
                                    return (STATUS_ORDER[getVal(a)] ?? 99) - (STATUS_ORDER[getVal(b)] ?? 99);
                                })
                                .map((statusOption) => {
                                    const isDisabled = isStatusOptionDisabled(statusOption);

                                    return (
                                        <TouchableOpacity
                                            key={statusOption.id}
                                            style={{
                                                padding: 16,
                                                borderRadius: 12,
                                                backgroundColor: '#F8FAFC',
                                                flexDirection: 'row',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                borderWidth: 1,
                                                borderColor: '#F1F5F9',
                                                opacity: isDisabled ? 0.5 : 1,
                                            }}
                                            onPress={() => handleStatusSelect(statusOption)}
                                            disabled={isDisabled}
                                        >
                                            <Text style={{ fontSize: 16, fontFamily: 'Inter-SemiBold', color: isDisabled ? Colors.textSecondary : Colors.textPrimary }}>
                                                {getStatusDisplayText(statusOption.label || statusOption.value)}
                                            </Text>
                                        <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: isDisabled ? '#CBD5E1' : Colors.primary, justifyContent: 'center', alignItems: 'center' }}>
                                            {updateOrderItemStatusLoading &&
                                                statusItemIndex !== null &&
                                                String(updatingStatusOptionId ?? '') === String(statusOption.id ?? '') &&
                                                isItemStatusUpdating(
                                                    getSplitApiId(
                                                        displayItems[statusItemIndex],
                                                        statusItemIndex,
                                                        statusSplitIndex,
                                                    ),
                                                ) ? (
                                                <ActivityIndicator size="small" color={Colors.primary} />
                                            ) : (getIsStatusOptionSelected(statusOption) && (
                                                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: isDisabled ? '#CBD5E1' : Colors.primary }} />
                                            ))}
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                        <View style={{ height: Math.max(insets.bottom, 36) + 20 }} />
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Image Preview Modal */}
            <ImageView
                images={previewImageUri ? [{ uri: previewImageUri }] : []}
                imageIndex={0}
                visible={!!previewImageUri}
                onRequestClose={() => setPreviewImageUri(null)}
                backgroundColor={previewImageUri?.toLowerCase().includes('sketch') ? '#FFFFFF' : '#000000'}
            />
            {/* Inline Calendar Modal */}
            <CalendarModal
                visible={calendarVisible}
                onClose={() => setCalendarVisible(false)}
                onSelect={handleDateUpdate}
                initialDate={getCalendarInitialDate()}
                disablePastDates={true}
                deliveryLoad={deliveryLoad}
            />
        </View >
    );
};

const getStatusColor = (status) => {
    switch (status) {
        case 'Completed': return Colors.success;
        case 'Paid': return Colors.success;
        case 'In Progress': return '#3B82F6';
        case 'Stitching': return '#2563EB';
        case 'Trial': return '#8B5CF6';
        case 'Overdue': return Colors.danger;
        case 'Cancelled': return '#6B7280';
        case 'Due': return Colors.danger;
        case 'Pending': return '#F59E0B';
        case 'Partial': return '#F59E0B';
        default: return Colors.textSecondary;
    }
};

const getDaysRemaining = (dateString) => {
    if (!dateString) return 999;
    try {
        const targetDate = parseDate(dateString);
        if (isNaN(targetDate.getTime())) return 999;

        const today = new Date();
        targetDate.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);

        const diffTime = targetDate.getTime() - today.getTime();
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    } catch {
        return 999;
    }
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        padding: Spacing.md,
        paddingBottom: 40,
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: Colors.white,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    tabItem: {
        flex: 1,
        paddingVertical: 14,
        alignItems: 'center',
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    tabItemActive: {
        borderBottomColor: '#6366F1',
    },
    tabText: {
        fontFamily: 'Inter-Medium',
        fontSize: 16,
        color: Colors.textSecondary,
    },
    tabTextActive: {
        color: '#6366F1',
        fontFamily: 'Inter-SemiBold',
    },
    card: {
        backgroundColor: Colors.white,
        borderRadius: 12,
        padding: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    header: {
        flexDirection: 'row',
        // justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerTitle: {
        fontFamily: 'Inter-Bold',
        fontSize: 22,
        color: Colors.textPrimary,
        marginLeft: 4
    },
    billNoLabel: {
        fontFamily: 'Inter-Medium',
        fontSize: 12,
        color: Colors.textSecondary,
        textTransform: 'uppercase',
    },
    billNoValue: {
        fontFamily: 'Inter-Bold',
        fontSize: 24, // Increased
        color: Colors.textPrimary,
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
    },
    statusText: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 12,
    },
    divider: {
        height: 1,
        backgroundColor: Colors.border,
        marginVertical: Spacing.md,
    },
    infoGrid: {
        gap: 12,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    infoItem: {
        flex: 1,
    },
    infoLabel: {
        fontFamily: 'Inter-Medium',
        fontSize: 12, // Increased slightly
        color: Colors.textSecondary,
        textTransform: 'uppercase',
        marginBottom: 2,
    },
    infoValueRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    infoValue: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 17, // Increased
        color: Colors.textPrimary,
    },
    section: {
        marginTop: Spacing.xl,
    },
    sectionTitle: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 16,
        color: Colors.textSecondary,
        marginBottom: Spacing.sm,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    itemsCard: {
        backgroundColor: Colors.white,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: Colors.border,
        overflow: 'hidden',
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#F9FAFB',
        padding: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    tableHeaderText: {
        fontFamily: 'Inter-Medium',
        fontSize: 13,
        color: Colors.textSecondary,
        textTransform: 'uppercase',
    },
    tableRow: {
        flexDirection: 'row',
        padding: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    itemText: {
        fontFamily: 'Inter-Regular',
        fontSize: 16,
        color: Colors.textPrimary,
    },
    itemTextBold: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 16,
        color: Colors.textPrimary,
    },
    summaryCard: {
        backgroundColor: Colors.white,
        borderRadius: 12,
        padding: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: Spacing.sm,
    },
    summaryLabel: {
        fontFamily: 'Inter-Regular',
        fontSize: 16,
        color: Colors.textSecondary,
    },
    summaryValue: {
        fontFamily: 'Inter-Medium',
        fontSize: 16,
        color: Colors.textPrimary,
    },
    dividerSmall: {
        height: 1,
        backgroundColor: '#F3F4F6',
        marginVertical: Spacing.sm,
    },
    totalLabel: {
        fontFamily: 'Inter-Bold',
        fontSize: 18,
        color: Colors.textPrimary,
    },
    totalValue: {
        fontFamily: 'Inter-Bold',
        fontSize: 20,
        color: Colors.primary,
    },
    amountGrid: {
        flexDirection: 'row',
        backgroundColor: Colors.white,
        borderRadius: 12,
        padding: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.border,
        justifyContent: 'space-between',
    },
    amountBox: {
        flex: 1,
        alignItems: 'center',
    },
    amountLabel: {
        fontFamily: 'Inter-Bold',
        fontSize: 12,
        color: Colors.textSecondary,
        marginBottom: 6,
    },
    amountValueMain: {
        fontFamily: 'Inter-Bold',
        fontSize: 18,
        color: Colors.textPrimary,
    },
    actionGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    actionBtn: {
        flex: 1, // Balanced 3-column
        backgroundColor: Colors.white,
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 4,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.border,
    },
    actionIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    actionText: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 13,
        color: Colors.textPrimary,
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        backgroundColor: Colors.white,
        padding: Spacing.md,
        // paddingBottom set dynamically via inline style
        gap: Spacing.md,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
        ...Shadow.medium,
    },
    primaryBtn: {
        flex: 1,
        backgroundColor: Colors.primary,
        height: 52,
        borderRadius: 8,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    primaryBtnText: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 17,
        color: Colors.white,
    },
    secondaryBtn: {
        flex: 1,
        backgroundColor: Colors.white,
        height: 52,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: Colors.primary,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    secondaryBtnText: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 15,
        color: Colors.primary,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: Colors.white,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: Spacing.xl,
        paddingBottom: Spacing.xl + Math.max(0, Platform.OS === 'android' ? 80 : (Platform.OS === 'ios' ? 24 : 0)),
    },
    inputGroup: {
        marginBottom: Spacing.lg,
    },
    bottomSheet: {
        backgroundColor: Colors.white,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 0,
        ...Shadow.large,
    },
    bottomSheetHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6'
    },
    bottomSheetTitle: {
        fontFamily: 'Inter-Bold',
        fontSize: 18,
        color: Colors.textPrimary,
    },
    optionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
        gap: 16,
    },
    optionIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    optionLabel: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 16,
        color: Colors.textPrimary,
    },
    optionDesc: {
        fontFamily: 'Inter-Regular',
        fontSize: 13,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    label: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 14,
        color: Colors.textPrimary,
        marginBottom: 8,
    },
    input: {
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 12,
        height: 56,
        paddingHorizontal: Spacing.md,
        fontFamily: 'Inter-SemiBold',
        fontSize: 18,
        color: Colors.textPrimary,
    },
    inputError: {
        borderColor: '#EF4444',
    },
    errorText: {
        marginTop: 8,
        fontFamily: 'Inter-Medium',
        fontSize: 12,
        color: '#EF4444',
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
    saveBtnDisabled: {
        opacity: 0.7,
    },
    saveBtnText: {
        fontFamily: 'Inter-Bold',
        fontSize: 16,
        color: Colors.white,
    },
    closeBtn: {
        borderColor: Colors.border,
        backgroundColor: Colors.white
    }
});



export default OrderDetailScreen;
