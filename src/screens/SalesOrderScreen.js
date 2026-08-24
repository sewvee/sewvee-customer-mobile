import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ScrollView,
    Platform,
    Image,
    Modal,
    Dimensions,
    KeyboardAvoidingView,
    ActivityIndicator,
    RefreshControl,
    findNodeHandle,
    Keyboard,
} from 'react-native';
import { CommonActions } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { Colors, Spacing, Typography, Shadow } from '../constants/theme';
import { 
    ArrowLeft, 
    User, 
    Calendar, 
    Info, 
    Plus, 
    Search, 
    X, 
    Edit2, 
    Trash2, 
    Minus,
    ChevronDown,
    ChevronUp,
    Check,
    CheckCircle2,
    Layers,
    Shirt,
    Tag
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatDate, getCurrentDate, parseDate } from '../utils/dateUtils';
import { useData } from '../context/DataContext';
import { useToast, ToastProvider } from '../context/ToastContext';
import CustomerSelectionModal from '../components/CustomerSelectionModal';
import CalendarModal from '../components/CalendarModal';
import OrderSuccessModal from '../components/OrderSuccessModal';
import Toast from '../components/Toast';
import BottomConfirmationSheet from '../components/BottomConfirmationSheet';
import { getInventoryStockAction } from '../store/inventoryStockSlice';
import { createSalesOrderAction, getOrderByIdAction } from '../store/salesOrderSlice';
import {
    getDisplayStock,
    getDisplayStockUnit,
    getNumericStock,
    getNumericValueFromStock,
    isOutOfStock as isStockOutOfStock,
} from '../utils/stockHelpers';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const toPositiveInteger = (value) => {
    const parsedValue = Number(value);
    return Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : null;
};

const normalizeSizeLabel = (value) => `${value || ''}`.trim().toUpperCase();
const STOCK_LIST_SORT = {
    sort_by: 'created_at',
    sort_order: 'desc',
};

const getItemSelectedSizeOption = (item, sizeName) => {
    const normalizedSize = normalizeSizeLabel(sizeName);
    return (item?.sizeOptions || []).find(
        (sizeOption) => normalizeSizeLabel(sizeOption?.name) === normalizedSize
    );
};

const getResolvedSelectedSizeOption = (item, preferredSize) => {
    const resolvedSelectedSize = getResolvedSelectedSize(item, preferredSize);
    if (!resolvedSelectedSize) {
        return null;
    }

    return getItemSelectedSizeOption(item, resolvedSelectedSize);
};

const getFirstAvailableSize = (item) => {
    if (!Array.isArray(item?.sizes) || item.sizes.length === 0) {
        return null;
    }

    return (
        item.sizes.find(size => {
            const sizeOption = getItemSelectedSizeOption(item, size);
            return getNumericValueFromStock(sizeOption?.qty) !== 0;
        }) || null
    );
};

const getResolvedSelectedSize = (item, preferredSize) => {
    if (!preferredSize) {
        return getFirstAvailableSize(item);
    }

    const preferredSizeOption = getItemSelectedSizeOption(item, preferredSize);
    if (getNumericValueFromStock(preferredSizeOption?.qty) !== 0) {
        return preferredSize;
    }

    return getFirstAvailableSize(item);
};

const isSizeSelectionDisabled = (item, sizeName) => {
    if (!sizeName) {
        return true;
    }

    const sizeOption = getItemSelectedSizeOption(item, sizeName);
    return getNumericValueFromStock(sizeOption?.qty) === 0;
};

const isInventoryItemDisabled = (item, preferredSize) => {
    if (!item) {
        return true;
    }

    if (Array.isArray(item?.sizes) && item.sizes.length > 0) {
        const resolvedSelectedSize = getResolvedSelectedSize(item, preferredSize);
        if (!resolvedSelectedSize) {
            return true;
        }

        return isSizeSelectionDisabled(item, resolvedSelectedSize);
    }

    return isStockOutOfStock(item);
};

const getSelectedSizeStockValue = (item, preferredSize) => {
    const resolvedSelectedSize = getResolvedSelectedSize(item, preferredSize);
    if (!resolvedSelectedSize) {
        return null;
    }

    return getNumericValueFromStock(
        getItemSelectedSizeOption(item, resolvedSelectedSize)?.qty
    );
};

const getSelectedSizePriceValue = (item, preferredSize) => {
    return getNumericValueFromStock(
        getResolvedSelectedSizeOption(item, preferredSize)?.price
    );
};

const getInventoryDisplayStock = (item, preferredSize) => {
    const sizeStockValue = getSelectedSizeStockValue(item, preferredSize);

    if (sizeStockValue !== null) {
        return `${sizeStockValue} pcs`;
    }

    return getDisplayStock(item);
};

const getInventoryDisplayPrice = (item, preferredSize) =>
    getSelectedSizePriceValue(item, preferredSize) ??
    getNumericValueFromStock(item?.price) ??
    0;

const getInventoryMaxQuantity = (item, preferredSize) =>
    getSelectedSizeStockValue(item, preferredSize) ??
    getNumericStock(item);

const formatCurrencyInputValue = value => {
    const numericValue = Number(value);

    if (!Number.isFinite(numericValue) || numericValue <= 0) {
        return '0';
    }

    return Number.isInteger(numericValue)
        ? String(numericValue)
        : String(Math.round(numericValue * 100) / 100);
};

const isMaxReached = (item, selectedQty, preferredSize) => {
    const maxQuantity = getInventoryMaxQuantity(item, preferredSize);
    const numericQty = Number(selectedQty);

    return (
        maxQuantity !== null &&
        Number.isFinite(maxQuantity) &&
        Number.isFinite(numericQty) &&
        numericQty >= maxQuantity
    );
};

const getInventorySelectedImage = (item, preferredSize) =>
    getResolvedSelectedSizeOption(item, preferredSize)?.image ||
    item?.image ||
    '';

const isInventoryLowStock = (item, preferredSize) =>
    getResolvedSelectedSizeOption(item, preferredSize)?.lowStock ??
    item?.lowStock ??
    false;

const getSelectedSizeIdValue = (item, preferredSize) =>
    toPositiveInteger(getResolvedSelectedSizeOption(item, preferredSize)?.id) ||
    toPositiveInteger(getResolvedSelectedSizeOption(item, preferredSize)?.size_id) ||
    toPositiveInteger(item?.size_id) ||
    null;

const SalesOrderScreen = (props) => {
    return (
        <ToastProvider>
            <SalesOrderScreenInternal {...props} />
        </ToastProvider>
    );
};

const SalesOrderScreenInternal = ({ navigation }) => {
    const dispatch = useDispatch();
    const insets = useSafeAreaInsets();
    const { customers } = useData();
    const { showToast, hideToast } = useToast();
    const {
        list: stockList = [],
        loading: stockLoading,
        paginationLoading: stockPaginationLoading,
        pagination: stockPagination = {},
    } = useSelector(state => state.inventoryStock);
    const { loading: salesOrderLoading } = useSelector(state => state.salesOrder);
    const itemListLoadMoreLockRef = useRef(false);
    const mainScrollRef = useRef(null);
    const paidAmountInputRef = useRef(null);
    const transactionIdInputRef = useRef(null);
    const todayStart = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return today;
    }, []);

    // General Form State
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [date, setDate] = useState(getCurrentDate());
    const [notes, setNotes] = useState('');

    // Order Items State
    const [orderItems, setOrderItems] = useState([]);
    const [discountType, setDiscountType] = useState('%'); // '%' or '₹'
    const [discountValue, setDiscountValue] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('Cash'); // 'Cash' or 'UPI'
    const [paidAmount, setPaidAmount] = useState('');
    const [transactionId, setTransactionId] = useState('');

    // Modal Visibility State
    const [customerModalVisible, setCustomerModalVisible] = useState(false);
    const [calendarVisible, setCalendarVisible] = useState(false);
    const [itemSelectorVisible, setItemSelectorVisible] = useState(false);
    const [quantityModalVisible, setQuantityModalVisible] = useState(false);
    const [summaryExpanded, setSummaryExpanded] = useState(false);
    const [successModalVisible, setSuccessModalVisible] = useState(false);
    const [createdOrder, setCreatedOrder] = useState(null);
    const [selectedItemToDelete, setSelectedItemToDelete] = useState(null);
    const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);

    // Quantity Modal Internal State
    const [editingItem, setEditingItem] = useState(null);
    const [tempQuantity, setTempQuantity] = useState('');

    // Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [refreshingInventory, setRefreshingInventory] = useState(false);
    const [footerHeight, setFooterHeight] = useState(0);
    const [activePaymentInput, setActivePaymentInput] = useState(null);
    const navigateToOrdersList = () => {
        setSuccessModalVisible(false);
        navigation.dispatch(
            CommonActions.reset({
                index: 0,
                routes: [{ name: 'Main', params: { screen: 'Orders' } }],
            })
        );
    };

    const openPreviewFromSuccess = (params) => {
        setSuccessModalVisible(false);
        navigation.dispatch(
            CommonActions.reset({
                index: 1,
                routes: [
                    { name: 'Main', params: { screen: 'Orders' } },
                    { name: 'InvoicePreview', params },
                ],
            })
        );
    };

    // Selected Sizes for Inventory Items (itemId -> size)
    const [selectedItemSizes, setSelectedItemSizes] = useState({});

    // Filtered Inventory
    const filteredInventory = useMemo(() => {
        if (!searchQuery) return stockList;
        const query = searchQuery.toLowerCase();
        return stockList.filter(item => 
            (item.name || '').toLowerCase().includes(query) || 
            (item.sku || '').toLowerCase().includes(query)
        );
    }, [searchQuery, stockList]);
    const shouldShowInventoryInitialLoader =
        !refreshingInventory && stockLoading && stockList.length === 0;
    const shouldShowInventoryEmptyState =
        !refreshingInventory &&
        !shouldShowInventoryInitialLoader &&
        filteredInventory.length === 0;

    useEffect(() => {
        if (!itemSelectorVisible) {
            itemListLoadMoreLockRef.current = false;
            return;
        }

        itemListLoadMoreLockRef.current = false;
        dispatch(
            getInventoryStockAction({
                page: 1,
                limit: 10,
                ...STOCK_LIST_SORT,
                search: searchQuery,
            })
        )
            .unwrap()
            .catch(error => {
                showToast(error?.message || 'Failed to load stock', 'error');
            });
    }, [dispatch, itemSelectorVisible, searchQuery, showToast]);

    useEffect(() => {
        if (!stockPaginationLoading) {
            itemListLoadMoreLockRef.current = false;
        }
    }, [stockPaginationLoading]);

    // Calculations
    const subtotal = useMemo(() => {
        return orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    }, [orderItems]);

    const discountAmount = useMemo(() => {
        if (!discountValue || isNaN(discountValue)) return 0;
        const val = parseFloat(discountValue);
        if (discountType === '%') {
            return (subtotal * val) / 100;
        }
        return val;
    }, [subtotal, discountType, discountValue]);

    const totalBalance = subtotal - discountAmount;

    useEffect(() => {
        setPaidAmount(formatCurrencyInputValue(totalBalance));
    }, [totalBalance]);

    const getEditingItemMaxQuantity = (item = editingItem) => {
        if (!item) {
            return null;
        }

        return getInventoryMaxQuantity(item, item?.selectedSize);
    };

    const isMeterQuantityItem = (item = editingItem) =>
        getDisplayStockUnit(item) === 'm';

    const getQuantityFieldLabel = (item = editingItem) =>
        isMeterQuantityItem(item) ? 'Qty (Meter)' : 'Qty (Pieces)';

    const getPriceFieldLabel = (item = editingItem) =>
        isMeterQuantityItem(item) ? 'Price Per Meter' : 'Price Per Piece';

    const normalizePieceQuantityValue = (value, fallback = '1') => {
        const sanitizedValue = `${value ?? ''}`.replace(/[^0-9]/g, '');

        if (!sanitizedValue) {
            return fallback;
        }

        const normalizedValue = String(parseInt(sanitizedValue, 10));
        return normalizedValue === '0' ? fallback : normalizedValue;
    };

    const normalizeMeterQuantityValue = value => {
        const sanitizedValue = `${value ?? ''}`.replace(/[^0-9.]/g, '');
        const decimalParts = sanitizedValue.split('.');

        if (decimalParts.length > 1) {
            return `${decimalParts.shift()}.${decimalParts.join('')}`;
        }

        return sanitizedValue;
    };

    const getStockLimitMessage = (item, maxQuantity) => {
        const unit = isMeterQuantityItem(item) ? 'meters' : 'pcs';
        return `Only ${maxQuantity} ${unit} available. Cannot add more.`;
    };

    const showStockLimitToast = (item, maxQuantity) => {
        if (maxQuantity === null || maxQuantity === undefined) {
            return;
        }

        showToast(getStockLimitMessage(item, maxQuantity), 'error');
    };

    const clampQuantityToStock = (item, quantity) => {
        const maxQuantity = getEditingItemMaxQuantity(item);
        const numericQuantity = Number(quantity);

        if (
            maxQuantity !== null &&
            Number.isFinite(maxQuantity) &&
            Number.isFinite(numericQuantity) &&
            numericQuantity > maxQuantity
        ) {
            if (isMeterQuantityItem(item)) {
                return String(maxQuantity);
            }

            return normalizePieceQuantityValue(maxQuantity, '1');
        }

        if (isMeterQuantityItem(item)) {
            return quantity === null || quantity === undefined ? '' : String(quantity);
        }

        return normalizePieceQuantityValue(quantity, '1');
    };

    const handleMaterialQuantityChange = (value) => {
        const normalizedValue = normalizeMeterQuantityValue(value);

        if (!normalizedValue) {
            setTempQuantity('');
            return;
        }

        if (normalizedValue === '.') {
            setTempQuantity('0.');
            return;
        }

        const numericQuantity = Number(normalizedValue);
        const maxQuantity = getEditingItemMaxQuantity();

        if (
            maxQuantity !== null &&
            Number.isFinite(maxQuantity) &&
            Number.isFinite(numericQuantity) &&
            numericQuantity > maxQuantity
        ) {
            setTempQuantity(String(maxQuantity));
            showStockLimitToast(editingItem, maxQuantity);
            return;
        }

        setTempQuantity(normalizedValue);
    };

    const handlePieceQuantityChange = (value) => {
        const sanitizedValue = `${value ?? ''}`.replace(/[^0-9]/g, '');

        if (!sanitizedValue) {
            setTempQuantity('');
            return;
        }

        const normalizedValue = String(parseInt(sanitizedValue, 10));
        const safeValue = normalizedValue === '0' ? '1' : normalizedValue;
        const numericQuantity = Number(safeValue);
        const maxQuantity = getEditingItemMaxQuantity();

        if (
            maxQuantity !== null &&
            Number.isFinite(maxQuantity) &&
            numericQuantity > maxQuantity
        ) {
            setTempQuantity(String(Math.floor(maxQuantity)));
            showStockLimitToast(editingItem, maxQuantity);
            return;
        }

        setTempQuantity(safeValue);
    };

    const handlePieceQuantityDecrement = () => {
        const currentQuantity = parseInt(tempQuantity, 10) || 1;
        setTempQuantity(String(Math.max(1, currentQuantity - 1)));
    };

    const handlePieceQuantityIncrement = () => {
        const currentQuantity = parseInt(tempQuantity, 10) || 1;
        const nextQuantity = currentQuantity + 1;
        const maxQuantity = getEditingItemMaxQuantity();

        if (
            maxQuantity !== null &&
            Number.isFinite(maxQuantity) &&
            nextQuantity > maxQuantity
        ) {
            setTempQuantity(String(Math.floor(maxQuantity)));
            showStockLimitToast(editingItem, maxQuantity);
            return;
        }

        setTempQuantity(String(nextQuantity));
    };

    const closeQuantityModal = () => {
        hideToast();
        setQuantityModalVisible(false);
        setEditingItem(null);
        setTempQuantity('');
    };

    const closeItemSelectorModal = () => {
        hideToast();
        setItemSelectorVisible(false);
    };

    const scrollPaymentInputsIntoView = (inputRef) => {
        setTimeout(() => {
            const inputHandle = findNodeHandle(inputRef?.current);

            if (!inputHandle) {
                mainScrollRef.current?.scrollToEnd({ animated: true });
                return;
            }

            mainScrollRef.current?.scrollResponderScrollNativeHandleToKeyboard(
                inputHandle,
                footerHeight + 80,
                true,
            );
        }, 120);
    };

    useEffect(() => {
        const keyboardShowEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';

        const keyboardShowSubscription = Keyboard.addListener(keyboardShowEvent, () => {
            if (activePaymentInput) {
                scrollPaymentInputsIntoView(activePaymentInput);
            }
        });

        return () => {
            keyboardShowSubscription.remove();
        };
    }, [activePaymentInput, footerHeight]);

    useEffect(() => {
        if (quantityModalVisible && editingItem) {
            const rawQuantity = editingItem?.quantity;

            if (getDisplayStockUnit(editingItem) === 'm') {
                if (rawQuantity === null || rawQuantity === undefined || rawQuantity === '') {
                    setTempQuantity('');
                    return;
                }

                setTempQuantity(normalizeMeterQuantityValue(rawQuantity));
                return;
            }

            setTempQuantity(normalizePieceQuantityValue(rawQuantity, '1'));
            return;
        }

        setTempQuantity('');
    }, [quantityModalVisible, editingItem]);

    // Handlers
    const handleSizeChipPress = (itemId, size, isOutOfStock) => {
        if (isOutOfStock) {
            return;
        }
        setSelectedItemSizes(prev => ({
            ...prev,
            [itemId]: size
        }));
    };

    const handleAddItem = (inventoryItem) => {
        const resolvedSelectedSize = getResolvedSelectedSize(
            inventoryItem,
            selectedItemSizes[inventoryItem.id]
        );

        if (isInventoryItemDisabled(inventoryItem, resolvedSelectedSize)) {
            return;
        }

        setEditingItem({
            ...inventoryItem,
            selectedSize: resolvedSelectedSize,
            price: getInventoryDisplayPrice(inventoryItem, resolvedSelectedSize),
            stock: getInventoryDisplayStock(inventoryItem, resolvedSelectedSize),
            image: getInventorySelectedImage(inventoryItem, resolvedSelectedSize),
            lowStock: isInventoryLowStock(inventoryItem, resolvedSelectedSize),
            size_id: getSelectedSizeIdValue(inventoryItem, resolvedSelectedSize),
        });
        setQuantityModalVisible(true);
    };

    const confirmQuantity = () => {
        if (!editingItem) return;

        const isMeterItem = isMeterQuantityItem(editingItem);
        const finalQty = isMeterItem
            ? parseFloat(tempQuantity)
            : parseInt(tempQuantity, 10);
        const maxQuantity = getEditingItemMaxQuantity();

        if (
            !tempQuantity ||
            !Number.isFinite(finalQty) ||
            finalQty <= 0 ||
            (!isMeterItem && !Number.isInteger(finalQty))
        ) {
            showToast(
                isMeterItem
                    ? 'Please enter a valid meter quantity'
                    : 'Please enter a valid pieces quantity',
                'error'
            );
            return;
        }

        if (
            maxQuantity !== null &&
            Number.isFinite(maxQuantity) &&
            finalQty > maxQuantity
        ) {
            setTempQuantity(String(maxQuantity));
            showStockLimitToast(editingItem, maxQuantity);
            return;
        }
        
        const existingIdx = orderItems.findIndex(i => i.id === editingItem.id && i.selectedSize === editingItem.selectedSize);
        if (existingIdx > -1) {
            const newItems = [...orderItems];
            newItems[existingIdx].quantity = finalQty;
            setOrderItems(newItems);
        } else {
            setOrderItems([...orderItems, { ...editingItem, quantity: finalQty }]);
        }

        closeQuantityModal();
    };

    const removeItem = (id, size) => {
        setOrderItems(orderItems.filter(i => !(i.id === id && i.selectedSize === size)));
    };

    const confirmRemoveItem = () => {
        if (!selectedItemToDelete) return;

        removeItem(selectedItemToDelete.id, selectedItemToDelete.selectedSize);
        setIsDeleteModalVisible(false);
        setSelectedItemToDelete(null);
    };

    const editItemQuantity = (item) => {
        setEditingItem(item);
        setTempQuantity(clampQuantityToStock(item, item.quantity));
        setQuantityModalVisible(true);
    };

    const handleLoadMoreInventory = () => {
        const currentPage = Number(stockPagination?.page) || 1;
        const totalPages = Number(stockPagination?.totalPages) || 1;

        if (
            stockLoading ||
            stockPaginationLoading ||
            currentPage >= totalPages ||
            itemListLoadMoreLockRef.current
        ) {
            return;
        }

        itemListLoadMoreLockRef.current = true;
        dispatch(
            getInventoryStockAction({
                page: currentPage + 1,
                limit: Number(stockPagination?.limit) || 10,
                ...STOCK_LIST_SORT,
                search: searchQuery,
            })
        )
            .unwrap()
            .catch(error => {
                showToast(error?.message || 'Failed to load stock', 'error');
                itemListLoadMoreLockRef.current = false;
            });
    };

    const handleInventoryListScroll = ({ nativeEvent }) => {
        const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
        const threshold = layoutMeasurement.height * 0.5;

        if (
            layoutMeasurement.height + contentOffset.y >=
            contentSize.height - threshold
        ) {
            handleLoadMoreInventory();
        }
    };

    const handleInventoryRefresh = async () => {
        setRefreshingInventory(true);
        dispatch(
            getInventoryStockAction({
                page: 1,
                limit: 10,
                ...STOCK_LIST_SORT,
                search: searchQuery,
            })
        )
            .unwrap()
            .catch(error => {
                showToast(error?.message || 'Failed to refresh stock', 'error');
            })
            .finally(() => setRefreshingInventory(false));
    };

    const getOrderItemType = (item) => {
        const rawType = `${item?.item_type || item?.type || ''}`.toUpperCase();
        return rawType.includes('MAT') ? 'MATERIAL' : 'READYMADE';
    };

    const getSelectedSizeId = (item) => {
        if (!item?.selectedSize) return null;

        return getSelectedSizeIdValue(item, item.selectedSize);
    };

    const getApiErrorMessage = (error) =>
        error?.message ||
        error?.error ||
        error?.data?.message ||
        error?.response?.data?.message ||
        'Failed to confirm order';

    const getIsoOrderDate = (dateValue) => {
        const parsedDate = parseDate(dateValue);
        return new Date(
            Date.UTC(
                parsedDate.getFullYear(),
                parsedDate.getMonth(),
                parsedDate.getDate(),
                0,
                0,
                0,
                0
            )
        ).toISOString();
    };

    const getApiPaymentType = (method) => {
        const normalizedMethod = `${method || ''}`.trim().toUpperCase();

        if (normalizedMethod === 'CASH') return 'CASH';
        if (normalizedMethod === 'UPI') return 'UPI';
        if (normalizedMethod === 'BANK') return 'BANK';
        if (normalizedMethod === 'CARD') return 'CARD';

        return normalizedMethod || 'CASH';
    };

    const formatCreatedSalesOrder = ({
        responseData,
        customer,
        items,
        subtotalAmount,
        finalAmount,
        paid,
        requestOutfits,
    }) => {
        const orderData =
            responseData?.data?.data ||
            responseData?.data ||
            responseData?.order ||
            responseData ||
            {};

        const resolvedId = orderData?.id ?? orderData?.order_id ?? '';
        const resolvedBillNo =
            orderData?.billNo ||
            orderData?.bill_no ||
            orderData?.order_no ||
            orderData?.order_number ||
            resolvedId ||
            '-';
        const resolvedCustomerName =
            orderData?.customerName ||
            orderData?.customer?.customerName ||
            orderData?.customer?.name ||
            customer?.name ||
            customer?.customerName ||
            '-';
        const resolvedTotal =
            Number(
                orderData?.finalAmount ??
                orderData?.final_amount ??
                orderData?.total ??
                orderData?.total_amount ??
                finalAmount,
            ) || 0;
        const resolvedAdvance =
            Number(
                orderData?.advance ??
                orderData?.advance_payment ??
                orderData?.paid_amount ??
                paid,
            ) || 0;
        const resolvedBalance =
            Number(
                orderData?.balance ??
                orderData?.balance_amount ??
                Math.max(resolvedTotal - resolvedAdvance, 0),
            ) || 0;

        return {
            ...orderData,
            id: `${resolvedId}`,
            billNo: resolvedBillNo,
            customerName: resolvedCustomerName,
            total: resolvedTotal,
            subtotal: Number(orderData?.subtotal ?? orderData?.total_amount ?? subtotalAmount) || subtotalAmount,
            advance: resolvedAdvance,
            balance: resolvedBalance,
            items: orderData?.items || items,
            outfits: orderData?.outfits || requestOutfits,
            payments: orderData?.payments || [],
        };
    };

    const handleConfirmOrder = async () => {
        if (!selectedCustomer) {
            showToast('Please select a customer', 'error');
            return;
        }
        if (orderItems.length === 0) {
            showToast('Please add at least one item', 'error');
            return;
        }

        // Calculations for validation
        const subtotalVal = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const finalBalance = subtotalVal - discountAmount;
        const paid = parseFloat(paidAmount || 0);

        // Validation 1: Fully Paid for Sales Order
        if (paid !== finalBalance) {
            showToast(`Total balance ₹${finalBalance.toLocaleString()} must be paid completely for Sales Orders.`, 'error');
            return;
        }

        // Validation 2: UPI Transaction ID
        if (paymentMethod === 'UPI' && !transactionId) {
            showToast('Please enter UPI Transaction ID', 'error');
            return;
        }

        const payload = {
            customer_id: selectedCustomer.id,
            order_type: 'SALE_ORDER',
            order_date: getIsoOrderDate(date),
            total_amount: subtotalVal,
            discount_type: discountType,
            discount_value: discountValue ? Number(discountValue) : 0,
            discount_amount: discountAmount,
            final_amount: finalBalance,
            payment_type: getApiPaymentType(paymentMethod),
            transaction_id: transactionId || null,
            order_notes: notes,
            outfits: [
                {
                    quantity: 1,
                    items: orderItems.map(item => {
                        const itemType = getOrderItemType(item);
                        const quantity = Number(item.quantity) || 0;
                        const price = Number(item.price) || 0;

                        return {
                            item_type: itemType,
                            material_id: itemType === 'MATERIAL' ? item.id : null,
                            readymade_id: itemType === 'READYMADE' ? item.id : null,
                            size_id: itemType === 'READYMADE' ? getSelectedSizeId(item) : null,
                            qty: quantity,
                            price: price,
                            total_price: price * quantity,
                        };
                    }),
                },
            ],
        };

        try {
            const response = await dispatch(createSalesOrderAction(payload)).unwrap();
            const formattedOrder = formatCreatedSalesOrder({
                responseData: response,
                customer: selectedCustomer,
                items: orderItems,
                subtotalAmount: subtotalVal,
                finalAmount: finalBalance,
                paid,
                requestOutfits: payload.outfits,
            });

            setCreatedOrder({
                ...formattedOrder,
                successMessage: 'Order created successfully',
            });
            setSuccessModalVisible(true);
        } catch (error) {
            showToast(getApiErrorMessage(error), 'error');
            console.error(error);
        }
    };

    const handlePrintOrder = async () => {
        try {
            if (!createdOrder) {
                showToast('Order information unavailable.', 'error');
                return;
            }

            const createdOrderId =
                createdOrder?.id || createdOrder?.orderId || createdOrder?.order_id || null;
            let activeOrder = createdOrder;

            if (createdOrderId) {
                try {
                    const latestOrder = await dispatch(getOrderByIdAction(createdOrderId)).unwrap();
                    if (latestOrder) {
                        activeOrder = latestOrder;
                        setCreatedOrder(latestOrder);
                    }
                } catch (refreshError) {
                    console.log('REFRESH SALES ORDER BEFORE PREVIEW - Error:', refreshError);
                }
            }

            const paymentCandidates = Array.isArray(activeOrder?.payments)
                ? activeOrder.payments
                : [];
            const latestPayment = paymentCandidates[paymentCandidates.length - 1] || null;
            const paymentId =
                latestPayment?.id ||
                latestPayment?.payment_id ||
                latestPayment?.paymentId ||
                null;
            const customerPdfUrl =
                latestPayment?.invoice_url ||
                latestPayment?.invoiceUrl ||
                activeOrder?.invoiceUrl ||
                activeOrder?.invoice_url ||
                null;
            const orderId =
                activeOrder?.id ||
                activeOrder?.orderId ||
                activeOrder?.order_id ||
                latestPayment?.order_id ||
                null;

            if (!customerPdfUrl && !paymentId) {
                showToast('Customer copy preview is not ready yet. Please try again in a moment.', 'error');
                return;
            }

            openPreviewFromSuccess({
                previewMode: 'remote_pdf',
                remoteCopyType: 'customer',
                pdfUrl: customerPdfUrl,
                paymentId,
                orderId,
                title: 'Customer Copy',
                orderNumber:
                    activeOrder?.billNo ||
                    activeOrder?.bill_no ||
                    activeOrder?.order_no ||
                    activeOrder?.order_number ||
                    activeOrder?.id,
            });
        } catch (error) {
            console.error('Open Sales Invoice Preview Error:', error);
            showToast('Failed to open customer copy preview.', 'error');
        }
    };

    const isPieceIncrementDisabled =
        !isMeterQuantityItem(editingItem) &&
        isMaxReached(editingItem, tempQuantity, editingItem?.selectedSize);

    return (
        <View style={styles.container}>
            {/* Custom Header */}
            <View style={[styles.header, { paddingTop: insets.top }]}>
                <TouchableOpacity 
                    onPress={() => navigation.goBack()}
                    style={styles.backBtn}
                >
                    <ArrowLeft size={24} color={Colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Sales Order</Text>
            </View>

            <ScrollView 
                ref={mainScrollRef}
                contentContainerStyle={[
                    styles.scrollContent,
                    { paddingBottom: orderItems.length > 0 ? footerHeight + 24 : 32 },
                ]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
            >
                {/* CUSTOMER Section */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionLabel}>CUSTOMER <Text style={{ color: '#EF4444'}}>*</Text></Text>
                </View>
                <TouchableOpacity 
                    style={styles.selectCustomerCard}
                    onPress={() => setCustomerModalVisible(true)}
                >
                    {selectedCustomer ? (
                        <View style={styles.customerSelectedRow}>
                            <View style={[styles.userIconBadge, { backgroundColor: '#F5F3FF' }]}>
                                <Text style={styles.avatarInitial}>{selectedCustomer.name[0]?.toUpperCase()}</Text>
                            </View>
                            <View>
                                <Text style={styles.selectedCustomerName}>{selectedCustomer.name}</Text>
                                <Text style={styles.selectedCustomerPhone}>{selectedCustomer.mobile}</Text>
                            </View>
                        </View>
                    ) : (
                        <>
                            <View style={styles.userIconBadge}>
                                <User size={22} color="#64748B" />
                            </View>
                            <Text style={styles.selectCustomerText}>Select Customer</Text>
                        </>
                    )}
                </TouchableOpacity>

                {/* Date Section */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionLabel}>Date <Text style={{ color: '#EF4444'}}>*</Text></Text>
                </View>
                <TouchableOpacity 
                    style={styles.dateInput}
                    onPress={() => setCalendarVisible(true)}
                >
                    <Text style={styles.dateText}>{date}</Text>
                    <Calendar size={20} color="#64748B" />
                </TouchableOpacity>

                {/* Notes Section */}
                <View style={[styles.sectionHeader, { flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
                    <Text style={styles.sectionLabel}>Notes</Text>
                    <Info size={16} color="#94A3B8" />
                </View>
                <View style={styles.notesContainer}>
                    <TextInput
                        style={styles.notesInput}
                        placeholder="Take a note..."
                        placeholderTextColor="#94A3B8"
                        multiline
                        textAlignVertical="top"
                        value={notes}
                        onChangeText={setNotes}
                    />
                </View>

                {/* ITEMS Section */}
                <View style={[styles.itemsSectionHeader, { marginTop: 24 }]}>
                    <Text style={styles.sectionLabel}>ITEMS ({orderItems.length})</Text>
                    <TouchableOpacity onPress={() => setItemSelectorVisible(true)}>
                        <Text style={styles.addItemActionText}>+ ADD ITEM</Text>
                    </TouchableOpacity>
                </View>

                {orderItems.map((item) => (
                    <View key={item.id} style={styles.itemCard}>
                        <View style={styles.itemCardTop}>
                        <View style={styles.itemImageContainer}>
                            {item.image ? (
                                <Image source={{ uri: item.image }} style={styles.itemImage} />
                            ) : (
                                <View style={styles.placeholderImage}>
                                    {item.type === 'Material' ? <Layers size={24} color={Colors.primary} /> : <Shirt size={24} color={Colors.primary} />}
                                </View>
                            )}
                        </View>
                            <View style={styles.itemMainInfo}>
                                <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
                                <Text style={styles.itemSku} numberOfLines={1}>SKU : {item.sku} {item.gender ? `• ${item.gender}` : ''}</Text>
                                <View style={styles.itemTags}>
                                    {item.tag && <View style={styles.itemTag}><Text style={styles.itemTagText}>{item.tag}</Text></View>}
                                    {item.brand && (
                                        <View style={[styles.itemTag, { flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
                                            <Tag size={12} color="#64748B" />
                                            <Text style={styles.itemTagText}>{item.brand}</Text>
                                        </View>
                                    )}
                                    {item.selectedSize && <View style={[styles.itemTag, {backgroundColor: '#F3F4F6'}]}><Text style={styles.itemTagText}>Size : {item.selectedSize}</Text></View>}
                                </View>
                            </View>
                            <View style={styles.itemActions}>
                                <TouchableOpacity onPress={() => editItemQuantity(item)} style={styles.itemActionBtn}>
                                    <Edit2 size={18} color="#64748B" />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => {
                                        setSelectedItemToDelete(item);
                                        setIsDeleteModalVisible(true);
                                    }}
                                    style={styles.itemActionBtn}
                                >
                                    <Trash2 size={18} color="#EF4444" />
                                </TouchableOpacity>
                            </View>
                        </View>
                        {console.log('item',item)
                        }
                        <View style={styles.itemCardBottom}>
                            <View style={styles.qtyPricePill}>
                                <Text style={styles.qtyPriceText}>{item.quantity}{item.type === 'Material' ? item.qtyMeters ? 'm' : 'pcs' : 'pcs'} x ₹{item.price}</Text>
                            </View>
                            <Text style={styles.itemTotalPrice}>₹{(item.price * item.quantity).toLocaleString()}</Text>
                        </View>
                    </View>
                ))}

                {orderItems.length > 0 && (
                    <>
                        {/* Discount Section */}
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionLabel}>Discount</Text>
                        </View>
                        <View style={styles.calcCard}>
                            <View style={styles.toggleRow}>
                                <TouchableOpacity 
                                    onPress={() => setDiscountType('%')}
                                    style={[styles.toggleBtn, discountType === '%' && styles.activeToggle]}
                                >
                                    {discountType === '%' && <Check size={16} color="white" strokeWidth={3} style={{marginRight: 6}} />}
                                    <Text style={[styles.toggleText, discountType === '%' && styles.activeToggleText]}>%</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    onPress={() => setDiscountType('₹')}
                                    style={[styles.toggleBtn, discountType === '₹' && styles.activeToggle]}
                                >
                                    {discountType === '₹' && <Check size={16} color="white" strokeWidth={3} style={{marginRight: 6}} />}
                                    <Text style={[styles.toggleText, discountType === '₹' && styles.activeToggleText]}>₹</Text>
                                </TouchableOpacity>
                            </View>
                            <View style={styles.inputContainer}>
                                {discountType === '₹' ? (
                                    <>
                                        <Text style={styles.inputPrefix}>₹</Text>
                                        <View style={styles.verticalDivider} />
                                        <TextInput
                                            style={styles.calcInput}
                                            value={discountValue}
                                            onChangeText={setDiscountValue}
                                            keyboardType="numeric"
                                            textAlign="right"
                                            placeholder="0"
                                            placeholderTextColor="#000000"
                                        />
                                    </>
                                ) : (
                                    <>
                                        <TextInput
                                            style={styles.calcInput}
                                            value={discountValue}
                                            onChangeText={setDiscountValue}
                                            keyboardType="numeric"
                                            textAlign="right"
                                            placeholder="0"
                                            placeholderTextColor="#000000"
                                        />
                                        <View style={styles.verticalDivider} />
                                        <Text style={styles.inputSuffix}>%</Text>
                                    </>
                                )}
                            </View>
                        </View>

                        {/* Payment Section */}
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionLabel}>Payment</Text>
                        </View>
                        <View style={styles.calcCard}>
                            <View style={styles.toggleRow}>
                                <TouchableOpacity 
                                    onPress={() => setPaymentMethod('Cash')}
                                    style={[styles.toggleBtn, paymentMethod === 'Cash' && styles.activeToggle]}
                                >
                                    {paymentMethod === 'Cash' && <Check size={16} color="white" strokeWidth={3} style={{marginRight: 6}} />}
                                    <Text style={[styles.toggleText, paymentMethod === 'Cash' && styles.activeToggleText]}>Cash</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    onPress={() => setPaymentMethod('UPI')}
                                    style={[styles.toggleBtn, paymentMethod === 'UPI' && styles.activeToggle]}
                                >
                                    {paymentMethod === 'UPI' && <Check size={16} color="white" strokeWidth={3} style={{marginRight: 6}} />}
                                    <Text style={[styles.toggleText, paymentMethod === 'UPI' && styles.activeToggleText]}>UPI</Text>
                                </TouchableOpacity>
                            </View>
                            <View style={styles.inputContainer}>
                                <Text style={styles.inputPrefix}>₹</Text>
                                <View style={styles.verticalDivider} />
                                <TextInput
                                    ref={paidAmountInputRef}
                                    style={styles.calcInput}
                                    placeholder="0"
                                    placeholderTextColor="#000000"
                                    value={paidAmount}
                                    onChangeText={setPaidAmount}
                                    onFocus={() => {
                                        setActivePaymentInput(paidAmountInputRef);
                                        scrollPaymentInputsIntoView(paidAmountInputRef);
                                    }}
                                    onBlur={() => setActivePaymentInput(null)}
                                    keyboardType="numeric"
                                    editable={false}
                                />
                            </View>

                            {/* UPI Transaction ID Input */}
                            {paymentMethod === 'UPI' && (
                                <View style={[styles.inputContainer, { marginTop: 12, paddingHorizontal: 12 }]}>
                                    <TextInput
                                        ref={transactionIdInputRef}
                                        style={[styles.calcInput, { textAlign: 'left', fontSize: 14 }]}
                                        placeholder="Transaction ID *"
                                        placeholderTextColor="#94A3B8"
                                        value={transactionId}
                                        onChangeText={setTransactionId}
                                        onFocus={() => {
                                            setActivePaymentInput(transactionIdInputRef);
                                            scrollPaymentInputsIntoView(transactionIdInputRef);
                                        }}
                                        onBlur={() => setActivePaymentInput(null)}
                                    />
                                </View>
                            )}
                        </View>
                    </>
                )}
            </ScrollView>

            {/* Sticky Bottom Summary */}
            {orderItems.length > 0 && (
                <View
                    onLayout={(event) => {
                        const nextHeight = Math.ceil(event.nativeEvent.layout.height);
                        setFooterHeight(currentHeight => (
                            currentHeight === nextHeight ? currentHeight : nextHeight
                        ));
                    }}
                    style={[
                        styles.stickyFooter,
                        {
                            paddingBottom: Math.max(insets.bottom, 36) + 16,
                        },
                    ]}
                >
                    <TouchableOpacity 
                        style={styles.summaryHandle} 
                        onPress={() => setSummaryExpanded(!summaryExpanded)}
                    >
                        {summaryExpanded ? (
                            <ChevronDown size={24} color="#CBD5E1" />
                        ) : (
                            <ChevronUp size={24} color="#CBD5E1" />
                        )}
                    </TouchableOpacity>

                    {summaryExpanded && (
                        <View style={styles.summaryDetails}>
                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>Total Items</Text>
                                <Text style={styles.summaryValue}>{orderItems.length}items</Text>
                            </View>
                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>Subtotal</Text>
                                <Text style={styles.summaryValueBold}>₹{subtotal.toLocaleString()}</Text>
                            </View>
                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>Discount ({discountValue}{discountType})</Text>
                                <Text style={[styles.summaryValueBold, { color: '#10B981' }]}>-₹{discountAmount.toLocaleString()}</Text>
                            </View>
                        </View>
                    )}

                    <View style={styles.totalBalanceRow}>
                        <View>
                            <Text style={styles.totalBalanceLabel}>Total Amount</Text>
                            <Text style={styles.totalBalanceSub}>To be collected on delivery</Text>
                        </View>
                        <Text style={styles.totalBalanceAmount}>₹{totalBalance.toLocaleString()}</Text>
                    </View>

                    <TouchableOpacity
                        style={[styles.confirmBtn, salesOrderLoading && { opacity: 0.7 }]}
                        onPress={handleConfirmOrder}
                        disabled={salesOrderLoading}
                    >
                        {salesOrderLoading ? (
                            <ActivityIndicator size="small" color="white" />
                        ) : (
                            <>
                                <Text style={styles.confirmBtnText}>Confirm Order</Text>
                                <CheckCircle2 size={20} color="white" />
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            )}

            {successModalVisible && (
                <OrderSuccessModal
                    visible={successModalVisible}
                    order={createdOrder}
                    onPrint={handlePrintOrder}
                    title="Order Created Successfully!"
                    subtitle={`Order ID #${createdOrder?.billNo || createdOrder?.id || '-'}`}
                    details={[]}
                    downloadLabel="Download Bill"
                    onClose={navigateToOrdersList}
                />
            )}

            <BottomConfirmationSheet
                visible={isDeleteModalVisible}
                onClose={() => {
                    setIsDeleteModalVisible(false);
                    setSelectedItemToDelete(null);
                }}
                onConfirm={confirmRemoveItem}
                title="Delete Item?"
                description="Are you sure you want to remove this item?"
                cancelText="Cancel"
                confirmText="Delete"
                type="danger"
            />

            {!itemSelectorVisible && !quantityModalVisible && <Toast />}

            {/* Select Item Modal */}
            <Modal
                visible={itemSelectorVisible}
                animationType="slide"
                transparent
                onRequestClose={closeItemSelectorModal}
            >
                <KeyboardAvoidingView 
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={{ flex: 1 }}
                >
                    <View style={styles.modalOverlay}>
                        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={closeItemSelectorModal} />
                        <View style={styles.itemSelectorContainer}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Select Item</Text>
                                <TouchableOpacity onPress={closeItemSelectorModal}>
                                    <X size={24} color="#0F172A" />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.searchContainer}>
                                <Search size={20} color="#94A3B8" />
                                <TextInput 
                                    style={styles.modalSearchInput} 
                                    placeholder="Search item name or SKU"
                                    placeholderTextColor="#94A3B8"
                                    value={searchQuery}
                                    onChangeText={setSearchQuery}
                                />
                                {searchQuery.length > 0 && (
                                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                                        <X size={20} color="#94A3B8" />
                                    </TouchableOpacity>
                                )}
                            </View>

                            <ScrollView 
                                style={styles.itemList} 
                                showsVerticalScrollIndicator={false}
                                keyboardShouldPersistTaps="handled"
                                keyboardDismissMode="on-drag"
                                onScroll={handleInventoryListScroll}
                                scrollEventThrottle={16}
                                refreshControl={
                                    <RefreshControl
                                        refreshing={refreshingInventory}
                                        onRefresh={handleInventoryRefresh}
                                    />
                                }
                            >
                                {shouldShowInventoryInitialLoader ? (
                                    <View style={styles.inventoryLoaderWrap}>
                                        <ActivityIndicator size="large" color={Colors.primary} />
                                    </View>
                                ) : shouldShowInventoryEmptyState ? (
                                    <View style={styles.inventoryEmptyWrap}>
                                        <Text style={styles.inventoryEmptyText}>No items found</Text>
                                    </View>
                                ) : (
                                    <>
                                {filteredInventory.map((item) => {
                                const selectedSize = getResolvedSelectedSize(item, selectedItemSizes[item.id]);
                                const selectedSizeOption = getResolvedSelectedSizeOption(item, selectedSize);
                                const isOutOfStock = isInventoryItemDisabled(item, selectedSize);
                                const displayStock = getInventoryDisplayStock(item, selectedSize);                                
                                const displayPrice = getInventoryDisplayPrice(item, selectedSize);
                                const displayImage = selectedSizeOption?.image || item.image;
                                const isLowStock = selectedSizeOption?.lowStock ?? item.lowStock;
                                const isSelected = orderItems.some(i => i.id === item.id && i.selectedSize === selectedSize);
                                return (
                                    <View key={item.id} style={[styles.inventoryCard, isOutOfStock && styles.inventoryCardDisabled]}>
                                        <View style={styles.inventoryCardTop}>
                                        <View style={styles.inventoryImageContainer}>
                                            {displayImage ? (
                                                <Image source={{ uri: displayImage }} style={styles.inventoryImage} />
                                            ) : (
                                                <View style={styles.placeholderImage}>
                                                    {item.type === 'Material' ? <Layers size={24} color={Colors.primary} /> : <Shirt size={24} color={Colors.primary} />}
                                                </View>
                                            )}
                                        </View>
                                            <View style={styles.inventoryRightColumn}>
                                                <View style={styles.inventoryRightTopRow}>
                                                    <View style={styles.inventoryMain}>
                                                <View style={styles.typeRow}>
                                                    {item.type === 'Material' ? (
                                                        <Layers size={14} color="#64748B" />
                                                    ) : (
                                                        <Shirt size={14} color="#64748B" />
                                                    )}
                                                    <Text style={[styles.inventoryType, isOutOfStock && styles.disabledText]}>{item.type}</Text>
                                                </View>
                                                <Text style={[styles.inventoryName, isOutOfStock && styles.disabledText]}>{item.name}</Text>
                                                <Text style={styles.inventorySku} numberOfLines={1}>SKU : {item.sku} {item.gender ? `• ${item.gender}` : ''}</Text>
                                                <View style={styles.itemTags}>
                                                    {item.tag && <View style={styles.itemTag}><Text style={styles.itemTagText}>{item.tag}</Text></View>}
                                                    {item.brand && (
                                                        <View style={[styles.itemTag, { flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
                                                            <Tag size={12} color="#64748B" />
                                                            <Text style={styles.itemTagText}>{item.brand}</Text>
                                                        </View>
                                                    )}
                                                </View>
                                                    </View>
                                                    <TouchableOpacity 
                                                        style={[styles.selectBtn, styles.selectBtnInRow, isSelected && styles.selectedBtn, isOutOfStock && styles.selectBtnDisabled]} 
                                                        onPress={() => handleAddItem(item)}
                                                        disabled={isOutOfStock}
                                                        activeOpacity={isOutOfStock ? 1 : 0.85}
                                                    >
                                                        {isSelected && <Check size={14} color="#0F172A" style={{marginRight: 4}} />}
                                                        <Text style={[styles.selectBtnText, isSelected && styles.selectedBtnText, isOutOfStock && styles.selectBtnTextDisabled]}>
                                                            {isSelected ? 'Selected' : 'Select'}
                                                        </Text>
                                                    </TouchableOpacity>
                                                </View>
                                                {item.sizes && (
                                                    <View style={styles.sizeChipsRow}>
                                                        {item.sizes.map(s => {
                                                            const isSizeOutOfStock = isSizeSelectionDisabled(item, s);
                                                            const currentlySelected = getResolvedSelectedSize(item, selectedItemSizes[item.id]);
                                                            const isSelectedSize = currentlySelected === s;

                                                            return (
                                                                <TouchableOpacity 
                                                                    key={s} 
                                                                    disabled={isSizeOutOfStock}
                                                                    onPress={() => handleSizeChipPress(item.id, s, isSizeOutOfStock)}
                                                                    style={[
                                                                        styles.sizeChip, 
                                                                        isSelectedSize ? styles.activeSizeChip : null,
                                                                        isSizeOutOfStock ? { opacity: 0.3 } : null
                                                                    ]}
                                                                >
                                                                    <Text style={[
                                                                        styles.sizeChipText, 
                                                                        isSelectedSize ? styles.activeSizeChipText : null,
                                                                        isSizeOutOfStock ? styles.disabledText : null
                                                                    ]}>{s}</Text>
                                                                </TouchableOpacity>
                                                            );
                                                        })}
                                                    </View>
                                                )}
                                            </View>
                                        </View>
                                        <View style={styles.inventoryStockPrice}>
                                            <View>
                                                <Text style={styles.stockLabel}>STOCK</Text>
                                                <Text style={[styles.stockValue, isLowStock && {color: '#EF4444'}, isOutOfStock && styles.disabledText]}>{displayStock}</Text>
                                            </View>
                                            <View style={{alignItems: 'flex-end'}}>
                                                <Text style={styles.stockLabel}>SELLING PRICE</Text>
                                                <Text style={[styles.sellingPrice, isOutOfStock && styles.disabledText]}>₹{displayPrice}</Text>
                                            </View>
                                        </View>
                                    </View>
                                );
                            })}
                                    </>
                                )}
                                {!refreshingInventory && stockPaginationLoading && stockList.length > 0 && (
                                    <View style={styles.inventoryFooterLoader}>
                                        <ActivityIndicator size="small" color={Colors.primary} />
                                    </View>
                                )}
                            </ScrollView>
                            {!quantityModalVisible && <Toast />}
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Add Quantity Modal */}
            <Modal
                visible={quantityModalVisible}
                animationType="fade"
                transparent
                onRequestClose={closeQuantityModal}
            >
                <View style={styles.modalOverlayCenter}>
                    <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={closeQuantityModal} />
                    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.qtyModalContainer}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Add Quantity</Text>
                            <TouchableOpacity onPress={closeQuantityModal}>
                                <X size={24} color="#0F172A" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.qtySelectedItem}>
                            <Text style={styles.qtyLabel}>Selected Item</Text>
                            <View style={styles.qtyItemCard}>
                                <View style={styles.qtyItemImageContainer}>
                                    {editingItem?.image ? (
                                        <Image source={{ uri: editingItem?.image }} style={styles.qtyItemImage} />
                                    ) : (
                                        <View style={styles.placeholderImage}>
                                            {editingItem?.type === 'Material' ? <Layers size={24} color={Colors.primary} /> : <Shirt size={24} color={Colors.primary} />}
                                        </View>
                                    )}
                                </View>
                                <View style={styles.qtyItemMain}>
                                    <View style={styles.qtyItemTop}>
                                        <Text style={styles.qtyItemName} numberOfLines={2}>{editingItem?.name}</Text>
                                        {/* <TouchableOpacity onPress={() => setQuantityModalVisible(false)}>
                                            <X size={20} color="#0F172A" />
                                        </TouchableOpacity> */}
                                    </View>
                                    <Text style={styles.qtyItemSku}>SKU : {editingItem?.sku} {editingItem?.gender ? `• ${editingItem?.gender}` : ''}</Text>
                                    <View style={styles.qtyItemTags}>
                                        {editingItem?.brand && (
                                            <View style={[styles.itemTag, { flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
                                                <Tag size={12} color="#64748B" />
                                                <Text style={styles.itemTagText}>{editingItem?.brand}</Text>
                                            </View>
                                        )}
                                        {editingItem?.selectedSize && <View style={[styles.itemTag, {backgroundColor: '#F3F4F6'}]}><Text style={styles.itemTagText}>Size : {editingItem?.selectedSize}</Text></View>}
                                    </View>
                                </View>
                            </View>
                        </View>

                        <View style={styles.qtyBox}>
                            <Text style={styles.qtyTitleLarge}>Add Quantity</Text>
                            <View style={styles.qtyControlsRow}>
                                <View style={styles.qtyControlSection}>
                                    <Text style={styles.qtyFieldLabel}>
                                        {getQuantityFieldLabel(editingItem)}
                                    </Text>
                                    {isMeterQuantityItem(editingItem) ? (
                                        <TextInput
                                            style={[styles.priceDisplayBox, { paddingVertical: 12, fontSize: 18, fontFamily: 'Inter-SemiBold', color: '#111827', textAlign: 'center' }]}
                                            value={tempQuantity}
                                            onChangeText={handleMaterialQuantityChange}
                                            keyboardType="decimal-pad"
                                            textAlign="center"
                                        />
                                    ) : (
                                        <View style={styles.qtyStepper}>
                                            <TouchableOpacity 
                                                onPress={handlePieceQuantityDecrement}
                                                style={styles.stepperBtn}
                                            >
                                                <Minus size={20} color="#6366F1" />
                                            </TouchableOpacity>
                                            <TextInput
                                                style={styles.qtyInput}
                                                value={tempQuantity}
                                                onChangeText={handlePieceQuantityChange}
                                                keyboardType="number-pad"
                                                textAlign="center"
                                                maxLength={6}
                                            />
                                            <TouchableOpacity 
                                                onPress={handlePieceQuantityIncrement}
                                                style={[styles.stepperBtn, isPieceIncrementDisabled && styles.stepperBtnDisabled]}
                                                disabled={isPieceIncrementDisabled}
                                                activeOpacity={isPieceIncrementDisabled ? 1 : 0.7}
                                            >
                                                <Plus size={20} color={isPieceIncrementDisabled ? '#A5B4FC' : '#6366F1'} />
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                </View>
                                
                                <View style={styles.qtyControlSection}>
                                    <Text style={styles.qtyFieldLabel}>
                                        {getPriceFieldLabel(editingItem)}
                                    </Text>
                                    <View style={styles.priceDisplayBox}>
                                        <Text style={styles.pricePrefix}>₹</Text>
                                        <Text style={styles.priceValue}>{editingItem?.price}</Text>
                                    </View>
                                </View>
                            </View>

                            <View style={styles.totalValueRow}>
                                <Text style={styles.totalValueLabel}>Total Value</Text>
                                <Text style={styles.totalValueAmount}>₹{((parseFloat(tempQuantity) || 0) * (editingItem?.price || 0)).toLocaleString()}</Text>
                            </View>
                        </View>

                        <View style={styles.qtyModalFooter}>
                            <TouchableOpacity 
                                style={styles.qtyCloseBtn}
                                onPress={closeQuantityModal}
                            >
                                <Text style={styles.qtyCloseText}>Close</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={styles.qtyAddBtn}
                                onPress={confirmQuantity}
                            >
                                <Text style={styles.qtyAddText}>Add</Text>
                            </TouchableOpacity>
                        </View>
                        {quantityModalVisible && <Toast />}
                    </KeyboardAvoidingView>
                </View>
            </Modal>

            {/* Background Modals */}
            <CustomerSelectionModal
                visible={customerModalVisible}
                onClose={() => setCustomerModalVisible(false)}
                onSelect={(customer) => {
                    setSelectedCustomer(customer);
                    setCustomerModalVisible(false);
                }}
                customers={customers}
            />

            <CalendarModal
                visible={calendarVisible}
                onClose={() => setCalendarVisible(false)}
                onSelect={(selectedDate) => {
                    setDate(selectedDate);
                    setCalendarVisible(false);
                }}
                initialDate={date}
                disablePastDates={false}
                maxDate={todayStart}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingBottom: 12,
        backgroundColor: Colors.white,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    backBtn: {
        padding: 4,
        marginRight: 16,
    },
    headerTitle: {
        fontSize: 20,
        fontFamily: 'Inter-Bold',
        color: Colors.textPrimary,
    },
    scrollContent: {
        padding: 20,
    },
    sectionHeader: {
        marginTop: 20,
        marginBottom: 8,
    },
    sectionLabel: {
        fontSize: 14,
        fontFamily: 'Inter-Bold',
        color: '#64748B',
        letterSpacing: 0.5,
    },
    selectCustomerCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
        borderStyle: 'dashed',
        backgroundColor: Colors.white,
    },
    userIconBadge: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#F8FAFC',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    selectCustomerText: {
        fontSize: 16,
        fontFamily: 'Inter-Medium',
        color: '#64748B',
    },
    customerSelectedRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatarInitial: {
        fontSize: 18,
        fontFamily: 'Inter-Bold',
        color: Colors.primary,
    },
    selectedCustomerName: {
        fontSize: 16,
        fontFamily: 'Inter-Bold',
        color: Colors.textPrimary,
    },
    selectedCustomerPhone: {
        fontSize: 14,
        fontFamily: 'Inter-Medium',
        color: '#64748B',
        marginTop: 2,
    },
    dateInput: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        height: 54,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        backgroundColor: Colors.white,
    },
    dateText: {
        fontSize: 16,
        fontFamily: 'Inter-SemiBold',
        color: Colors.textPrimary,
    },
    notesContainer: {
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        backgroundColor: Colors.white,
        minHeight: 100,
        padding: 12,
    },
    notesInput: {
        flex: 1,
        fontSize: 15,
        fontFamily: 'Inter-Regular',
        color: Colors.textPrimary,
    },
    itemsSectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    addItemActionText: {
        fontSize: 14,
        fontFamily: 'Inter-Bold',
        color: Colors.primary,
    },
    itemCard: {
        backgroundColor: Colors.white,
        borderRadius: 16,
        padding: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    itemCardTop: {
        flexDirection: 'row',
        gap: 12,
    },
    itemImageContainer: {
        width: 80,
        height: 100,
        borderRadius: 12,
        backgroundColor: '#F0F3FF',
        overflow: 'hidden',
    },
    itemImage: {
        width: '100%',
        height: '100%',
    },
    placeholderImage: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F0F3FF',
    },
    itemMainInfo: {
        flex: 1,
    },
    itemName: {
        fontSize: 15,
        fontFamily: 'Inter-Bold',
        color: Colors.textPrimary,
        lineHeight: 20,
    },
    itemSku: {
        fontSize: 12,
        fontFamily: 'Inter-Medium',
        color: '#64748B',
        marginTop: 4,
    },
    itemTags: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginTop: 6,
    },
    itemTag: {
        backgroundColor: '#F8FAFC',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        borderWidth: 0.5,
        borderColor: '#E2E8F0',
    },
    itemTagText: {
        fontSize: 11,
        fontFamily: 'Inter-SemiBold',
        color: '#64748B',
    },
    itemActions: {
        flexDirection: 'row',
        gap: 4,
    },
    itemActionBtn: {
        padding: 6,
    },
    itemCardBottom: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
    },
    qtyPricePill: {
        backgroundColor: '#F8FAFC',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 0.5,
        borderColor: '#E2E8F0',
    },
    qtyPriceText: {
        fontSize: 13,
        fontFamily: 'Inter-Medium',
        color: '#1E293B',
    },
    itemTotalPrice: {
        fontSize: 16,
        fontFamily: 'Inter-Bold',
        color: Colors.textPrimary,
    },
    calcCard: {
        backgroundColor: Colors.white,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    toggleRow: {
        flexDirection: 'row',
        marginBottom: 12,
        gap: 10,
    },
    toggleBtn: {
        flex: 1,
        flexDirection: 'row',
        height: 48,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 12,
        backgroundColor: Colors.white,
        borderWidth: 1.5,
        borderColor: '#F1F5F9',
    },
    activeToggle: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    toggleText: {
        fontSize: 15,
        fontFamily: 'Inter-Bold',
        color: '#64748B',
    },
    activeToggleText: {
        color: Colors.white,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        paddingHorizontal: 16,
        height: 54,
    },
    calcInput: {
        flex: 1,
        fontSize: 18,
        fontFamily: 'Inter-Bold',
        color: Colors.textPrimary,
        textAlign: 'right',
        paddingHorizontal: 12,
    },
    verticalDivider: {
        width: 1,
        height: 24,
        backgroundColor: '#E2E8F0',
        marginHorizontal: 8,
    },
    inputSuffix: {
        fontSize: 18,
        fontFamily: 'Inter-Bold',
        color: Colors.primary,
        marginLeft: 8,
    },
    inputPrefix: {
        fontSize: 18,
        fontFamily: 'Inter-Bold',
        color: Colors.primary,
        marginRight: 8,
    },
    stickyFooter: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: Colors.white,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 20,
    },
    summaryHandle: {
        height: 32,
        justifyContent: 'center',
        alignItems: 'center',
    },
    summaryDetails: {
        paddingBottom: 16,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    summaryLabel: {
        fontSize: 14,
        fontFamily: 'Inter-Medium',
        color: '#64748B',
    },
    summaryValue: {
        fontSize: 14,
        fontFamily: 'Inter-Medium',
        color: Colors.textPrimary,
    },
    summaryValueBold: {
        fontSize: 15,
        fontFamily: 'Inter-Bold',
        color: Colors.textPrimary,
    },
    totalBalanceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#F8F9FE',
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 16,
        marginBottom: 16,
    },
    totalBalanceLabel: {
        fontSize: 18,
        fontFamily: 'Inter-Bold',
        color: '#0F172A',
    },
    totalBalanceSub: {
        fontSize: 14,
        fontFamily: 'Inter-Medium',
        color: '#94A3B8',
        marginTop: 4,
    },
    totalBalanceAmount: {
        fontSize: 28,
        fontFamily: 'Inter-Bold',
        color: Colors.primary,
    },
    confirmBtn: {
        backgroundColor: Colors.primary,
        height: 56,
        borderRadius: 16,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    confirmBtnText: {
        fontSize: 18,
        fontFamily: 'Inter-Bold',
        color: Colors.white,
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
    },
    modalOverlayCenter: {
        flex: 1,
        justifyContent: 'center',
        padding: 20,
    },
    modalBackdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(15, 23, 42, 0.4)',
    },
    itemSelectorContainer: {
        backgroundColor: Colors.white,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        flex: 1,
        maxHeight: SCREEN_HEIGHT * 0.9,
        width: '100%',
        padding: 20,
        overflow: 'hidden',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontFamily: 'Inter-Bold',
        color: Colors.textPrimary,
    },
    modalSearchInput: {
        flex: 1,
        fontSize: 16,
        fontFamily: 'Inter-Medium',
        color: Colors.textPrimary,
    },
    inventoryCard: {
        backgroundColor: Colors.white,
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    inventoryCardTop: {
        flexDirection: 'row',
        gap: 16,
    },
    inventoryImageContainer: {
        width: 80,
        height: 100,
        borderRadius: 12,
        backgroundColor: '#F0F3FF',
        overflow: 'hidden',
    },
    inventoryImage: {
        width: '100%',
        height: '100%',
    },
    inventoryMain: {
        flex: 1,
    },
    inventoryRightColumn: {
        flex: 1,
        minWidth: 0,
    },
    inventoryRightTopRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
    },
    typeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 4,
    },
    inventoryType: {
        fontSize: 12,
        fontFamily: 'Inter-Bold',
        color: '#64748B',
        textTransform: 'uppercase',
    },
    inventoryName: {
        fontSize: 16,
        fontFamily: 'Inter-Bold',
        color: Colors.textPrimary,
        lineHeight: 22,
    },
    inventorySku: {
        fontSize: 12,
        fontFamily: 'Inter-Medium',
        color: '#94A3B8',
        marginTop: 4,
    },
    sizeChip: {
        backgroundColor: '#F8FAFC',
        paddingHorizontal: 12,
        paddingVertical: 6,
        marginRight: 6,
        marginBottom: 6,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    activeSizeChip: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    sizeChipText: {
        fontSize: 13,
        fontFamily: 'Inter-Bold',
        color: '#64748B',
    },
    activeSizeChipText: {
        color: 'white',
    },
    selectBtn: {
        backgroundColor: Colors.primary,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
        alignSelf: 'flex-start',
    },
    selectBtnInRow: {
        flexShrink: 0,
    },
    selectedBtn: {
        backgroundColor: '#F1F5F9',
        flexDirection: 'row',
        alignItems: 'center',
    },
    selectBtnText: {
        fontSize: 14,
        fontFamily: 'Inter-Bold',
        color: 'white',
    },
    selectedBtnText: {
        color: Colors.textPrimary,
    },
    selectBtnDisabled: {
        backgroundColor: '#E5E7EB',
    },
    selectBtnTextDisabled: {
        color: '#6B7280',
    },
    inventoryCardDisabled: {
        opacity: 0.6,
        borderColor: '#E5E7EB',
    },
    disabledText: {
        color: '#9CA3AF',
    },
    inventoryStockPrice: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
    },
    inventoryLoaderWrap: {
        minHeight: 240,
        alignItems: 'center',
        justifyContent: 'center',
    },
    inventoryEmptyWrap: {
        minHeight: 240,
        alignItems: 'center',
        justifyContent: 'center',
    },
    inventoryEmptyText: {
        fontSize: 15,
        fontFamily: 'Inter-SemiBold',
        color: '#64748B',
    },
    inventoryFooterLoader: {
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    stockLabel: {
        fontSize: 12,
        fontFamily: 'Inter-Bold',
        color: '#94A3B8',
        letterSpacing: 0.5,
    },
    stockValue: {
        fontSize: 16,
        fontFamily: 'Inter-Bold',
        color: Colors.textPrimary,
        marginTop: 4,
    },
    sellingPrice: {
        fontSize: 18,
        fontFamily: 'Inter-Bold',
        color: Colors.textPrimary,
        marginTop: 4,
    },
    qtyModalContainer: {
        backgroundColor: Colors.white,
        borderRadius: 24,
        padding: 24,
    },
    qtySelectedItem: {
        marginBottom: 24,
    },
    qtyLabel: {
        fontSize: 16,
        fontFamily: 'Inter-Bold',
        color: Colors.textPrimary,
        marginBottom: 16,
    },
    qtyItemCard: {
        flexDirection: 'row',
        padding: 12,
        borderRadius: 16,
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#F1F5F9',
        gap: 12,
    },
    qtyItemImageContainer: {
        width: 80,
        height: 100,
        borderRadius: 12,
        backgroundColor: '#F0F3FF',
        overflow: 'hidden',
    },
    qtyItemImage: {
        width: '100%',
        height: '100%',
    },
    qtyItemMain: {
        flex: 1,
    },
    qtyItemTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    qtyItemName: {
        fontSize: 14,
        fontFamily: 'Inter-Bold',
        color: Colors.textPrimary,
        flex: 1,
    },
    qtyItemSku: {
        fontSize: 12,
        fontFamily: 'Inter-Medium',
        color: '#64748B',
        marginTop: 2,
    },
    qtyItemTags: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 6,
    },
    qtyBox: {
        borderWidth: 1,
        borderColor: '#F1F5F9',
        borderRadius: 16,
        padding: 16,
        marginBottom: 24,
    },
    qtyTitleLarge: {
        fontSize: 16,
        fontFamily: 'Inter-Bold',
        color: Colors.textPrimary,
        marginBottom: 16,
    },
    qtyControlsRow: {
        flexDirection: 'row',
        gap: 20,
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    qtyControlSection: {
        flex: 1,
    },
    qtyFieldLabel: {
        fontSize: 12,
        fontFamily: 'Inter-Bold',
        color: '#64748B',
        letterSpacing: 0.5,
        marginBottom: 12,
    },
    qtyStepper: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        height: 54,
        paddingHorizontal: 8,
    },
    stepperBtn: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    stepperBtnDisabled: {
        opacity: 0.45,
    },
    qtyDisplay: {
        fontSize: 18,
        fontFamily: 'Inter-Bold',
        color: Colors.textPrimary,
    },
    qtyInput: {
        flex: 1,
        fontSize: 18,
        fontFamily: 'Inter-Bold',
        color: Colors.textPrimary,
        textAlign: 'center',
        paddingHorizontal: 8,
        paddingVertical: 0,
    },
    priceDisplayBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        height: 54,
        paddingHorizontal: 16,
    },
    pricePrefix: {
        fontSize: 18,
        fontFamily: 'Inter-Bold',
        color: Colors.textPrimary,
        marginRight: 6,
    },
    priceValue: {
        fontSize: 18,
        fontFamily: 'Inter-Bold',
        color: Colors.textPrimary,
    },
    totalValueRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 16,
    },
    totalValueLabel: {
        fontSize: 14,
        fontFamily: 'Inter-Medium',
        color: '#64748B',
    },
    totalValueAmount: {
        fontSize: 18,
        fontFamily: 'Inter-Bold',
        color: Colors.textPrimary,
    },
    qtyModalFooter: {
        flexDirection: 'row',
        gap: 12,
    },
    qtyCloseBtn: {
        flex: 1,
        height: 52,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        justifyContent: 'center',
        alignItems: 'center',
    },
    qtyCloseText: {
        fontSize: 16,
        fontFamily: 'Inter-Bold',
        color: Colors.textPrimary,
    },
    qtyAddBtn: {
        flex: 1,
        height: 52,
        borderRadius: 8,
        backgroundColor: Colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    qtyAddText: {
        fontSize: 16,
        fontFamily: 'Inter-Bold',
        color: 'white',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        paddingHorizontal: 16,
        height: 54,
        marginBottom: 20,
        gap: 12,
    },
    sizeChipsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        width: '100%',
        marginTop: 10,
        marginRight: -6,
        marginBottom: -6,
    },
});

export default SalesOrderScreen;
