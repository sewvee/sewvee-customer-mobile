import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import axios from 'axios';
import { URL_INVENTORY_STOCK, URL_ORDERS, URL_ORDER_INVOICE_DOWNLOAD, URL_PAYMENT_DOWNLOAD, URL_UPLOAD } from '../config/env';
import Share from 'react-native-share';
import getAuthToken from '../utils/getAuthToken';
import { store } from '../store';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    TextInput,
    Modal,
    Image,
    StatusBar,
    Animated,
    Easing,
    LayoutAnimation,
    useWindowDimensions,
    BackHandler,
    FlatList,
    Linking,
    TouchableWithoutFeedback,
    Switch
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { getSectionsAction } from '../store/sectionSlice';
import { fetchCustomersAction } from '../store/customerSlice';
import { getOutfitsAction, getStitchingStructureAction } from '../store/outfitSlice';
import {
    createSalesOrderAction,
    getOrderByIdAction,
    markOrdersListForRefresh,
} from '../store/salesOrderSlice';
import { getOutfitMeasurementsAction, resetOutfitMeasurements, addMeasurementAction, updateMeasurementAction, deleteMeasurementAction, getMeasurementHistoryAction, resetMeasurementHistory, getMeasurementHistoryDetailAction, getMeasurementsAction, assignMeasurementsAction, resetMeasurements } from '../store/measurementSlice';
import { uploadImageAction } from '../store/uploadSlice';
import { getMergedOrderQuantities } from '../utils/orderQuantitySections';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    ChevronLeft,
    Info,
    ArrowLeft,
    Check,
    ArrowRight,
    Camera,
    Image as ImageIcon, // This is the placeholder icon
    Mic,
    X,
    Plus,
    Edit2,
    Trash2,
    Play,
    Pause,
    ChevronDown,
    ChevronUp,
    ChevronRight,
    SquarePen,
    User,
    Upload,
    PenTool,
    Square,
    Search,
    AlertTriangle,
    Pen,
    Eraser,
    Undo2,
    Smartphone,
    Smile,
    Shirt,
    Package,
    Layers,
    Calendar,
    History,
    Flame,
    Minus,
    MoreVertical,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, Typography, Shadow } from '../constants/theme';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { getCompanyLogoUri, getUserProfilePhotoUri } from '../utils/branding';
import { useToast } from '../context/ToastContext';
// import { Order, OutfitItem, MeasurementProfile, MeasurementHistoryItem } from '../types';
import { formatDate, getCurrentDate, getCurrentTime, parseDate, formatDisplayDate } from '../utils/dateUtils';
import AlertModal from '../components/AlertModal';
import CalendarModal from '../components/CalendarModal';
import { getDeliveryLoad } from '../utils/loadUtils';
// import * as ImagePicker from 'expo-image-picker';
import { launchImageLibrary } from 'react-native-image-picker';
// import * as ImageManipulator from 'expo-image-manipulator';
// import * as FileSystem from 'expo-file-system/legacy';
import RNFS from 'react-native-fs';
// import { Audio } from 'expo-av';
import Sound from 'react-native-sound';
import AudioRecord from 'react-native-audio-record';
// import * as Print from 'expo-print';
// import * as Sharing from 'expo-sharing';
import SignatureScreen from 'react-native-signature-canvas';
import ImageView from 'react-native-image-viewing';
import { generateInvoicePDF, generateTailorCopyPDF, generateCustomerCopyPDF, getCustomerCopyHTML, printHTML } from '../services/pdfService';
import PDFPreviewModal from '../components/PDFPreviewModal';
// import { transcribeAudioWithWhisper } from '../services/openaiService';
const transcribeAudioWithWhisper = async () => 'Transcription temporarily unavailable';
import { uploadImage } from '../utils/storageUtils';
import { CommonActions } from '@react-navigation/native';
// Skia drawing temporarily disabled due to version compatibility



import CustomerSelectionModal from '../components/CustomerSelectionModal';
import OrderSuccessModal from '../components/OrderSuccessModal';
import BottomConfirmationSheet from '../components/BottomConfirmationSheet';
import ReusableBottomDrawer from '../components/ReusableBottomDrawer';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

const UPLOAD_DELETE_BASE_URL = (URL_UPLOAD || '').replace(/\/mobile\/?$/i, '');

const isRemoteImageUrl = value => /^(https?:)?\/\//i.test(String(value || '').trim());

const getUploadDeleteEndpoint = imageUrl => {
    const normalizedUrl = String(imageUrl || '').trim();
    if (!normalizedUrl || !UPLOAD_DELETE_BASE_URL) {
        return null;
    }

    const fileKey = normalizedUrl.replace(/^https?:\/\/[^/]+/i, '');
    return `${UPLOAD_DELETE_BASE_URL}/${encodeURIComponent(fileKey)}`;
};

const normalizeMeasurementSectionName = value => {
    const normalizedValue = String(value || '').trim().toLowerCase();

    if (normalizedValue === 'men') {
        return 'Men';
    }

    if (normalizedValue === 'women') {
        return 'Women';
    }

    if (
        normalizedValue === 'kids-boy' ||
        normalizedValue === 'kids-boys' ||
        normalizedValue === 'boy' ||
        normalizedValue === 'boys'
    ) {
        return 'Kids-Boy';
    }

    if (
        normalizedValue === 'kids-girl' ||
        normalizedValue === 'kids-girls' ||
        normalizedValue === 'girl' ||
        normalizedValue === 'girls'
    ) {
        return 'Kids-Girl';
    }

    return null;
};

const getUploadedImageUrl = response =>
    response?.data?.data?.full_url ||
    response?.data?.data?.url ||
    response?.data?.full_url ||
    response?.data?.url_original ||
    response?.data?.url_thumbnail ||
    response?.data?.url ||
    response?.data?.data ||
    response?.url ||
    response?.payload?.url ||
    null;

// Liquid Progress Component
const LiquidProgress = ({ current, total }) => {
    const fillAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(fillAnim, {
            toValue: (current + 1) / total,
            duration: 500,
            useNativeDriver: false,
            easing: Easing.inOut(Easing.ease)
        }).start();
    }, [current]);

    const heightInterpolate = fillAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0%', '100%']
    });

    return (
        <View style={styles.liquidContainer}>
            <Animated.View style={[styles.liquidFill, { height: heightInterpolate }]} />
            <Text style={styles.liquidText}>{current + 1}/{total}</Text>
        </View>
    );
};

// --- New UI Components for Step 1 ---

const QuantityStepper = ({ value, onChange, editMode }) => {
    return (
        <View style={styles.stepperContainer}>
            <TouchableOpacity
                style={styles.stepperBtn}
                onPress={() => onChange(Math.max(1, value - 1))}
                disabled={editMode}
            >
                <Minus size={18} color={editMode ? "#94A3B8" : Colors.primary} />
            </TouchableOpacity>
            <Text style={styles.stepperValue}>{value}</Text>
            <TouchableOpacity
                style={styles.stepperBtn}
                onPress={() => onChange(value + 1)}
            >
                <Plus size={18} color={Colors.primary} />
            </TouchableOpacity>
        </View>
    );
};

// CalendarModal removed (imported)

const OutfitDrawer = ({ visible, onClose, outfits, onSelect, currentType }) => {
    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
                <View style={[styles.bottomSheet, { height: '50%' }]}>
                    <View style={styles.bottomSheetHeader}>
                        <Text style={styles.bottomSheetTitle}>Select Outfit Type</Text>
                        <TouchableOpacity onPress={onClose}>
                            <X size={24} color={Colors.textSecondary} />
                        </TouchableOpacity>
                    </View>
                    <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
                        {outfits.length > 0 ? (
                            outfits.map((o) => (
                                <TouchableOpacity
                                    key={o.id}
                                    style={[styles.outfitOption, currentType === o.name && styles.outfitOptionSelected]}
                                    onPress={() => { onSelect(o.name, o.id); onClose(); }}
                                >
                                    <Text style={[styles.outfitOptionText, currentType === o.name && styles.outfitOptionTextSelected]}>{o.name}</Text>
                                    {currentType === o.name && <Check size={20} color={Colors.primary} />}
                                </TouchableOpacity>
                            ))
                        ) : (
                            <View style={{ padding: 40, alignItems: 'center', justifyContent: 'center' }}>
                                <Shirt size={40} color="#E2E8F0" strokeWidth={1} style={{ marginBottom: 12 }} />
                                <Text style={{ color: Colors.textSecondary, fontFamily: 'Inter-Medium', fontSize: 15 }}>No outfits found in this section</Text>
                            </View>
                        )}
                    </ScrollView>
                </View>
            </TouchableOpacity>
        </Modal>
    );
};

const SectionDrawer = ({ visible, onClose, onSelect, currentSection }) => {
    const [searchText, setSearchText] = useState('');
    const { sections } = useSelector(state => state.section);

    // Use dynamic sections if available, otherwise fallback to defaults
    const displaySections = sections.length > 0
        ? sections.map(s => s.name)
        : ['Men', 'Women', 'Kids-Boys', 'Kids-Girls'];

    const filteredSections = displaySections.filter(s => s.toLowerCase().includes(searchText.toLowerCase()));

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
                <View style={[styles.bottomSheet, { height: '60%' }]}>
                    <View style={styles.sheetHeader}>
                        <View style={styles.sheetHandle} />
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                            <Text style={styles.sheetTitle}>Select Section</Text>
                            <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
                                <X size={24} color={Colors.textSecondary} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Search Bar */}
                    <View style={{ paddingHorizontal: 20, marginBottom: 15 }}>
                        <View style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            backgroundColor: '#F3F4F6',
                            borderRadius: 12,
                            paddingHorizontal: 12,
                            height: 48
                        }}>
                            <Search size={20} color="#6B7280" />
                            <TextInput
                                placeholder="Search section..."
                                placeholderTextColor="#9CA3AF"
                                style={{
                                    flex: 1,
                                    marginLeft: 10,
                                    fontSize: 15,
                                    color: '#111827',
                                    fontFamily: 'Inter-Medium',
                                    height: '100%',
                                    paddingVertical: 0
                                }}
                                value={searchText}
                                onChangeText={setSearchText}
                            />
                            {searchText.length > 0 && (
                                <TouchableOpacity onPress={() => setSearchText('')}>
                                    <X size={20} color="#6B7280" />
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>

                    <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
                        {filteredSections.map((s) => {
                            const isSelected = currentSection === s;
                            return (
                                <TouchableOpacity
                                    key={s}
                                    style={[styles.outfitOption, isSelected && { borderLeftWidth: 4, borderLeftColor: Colors.primary }]}
                                    onPress={() => { onSelect(s); onClose(); }}
                                >
                                    <Text style={[styles.outfitOptionText, isSelected && { color: Colors.primary, fontFamily: 'Inter-Bold' }]}>{s}</Text>
                                    {isSelected && <Check size={20} color={Colors.primary} />}
                                </TouchableOpacity>
                            );
                        })}
                        {filteredSections.length === 0 && (
                            <View style={{ alignItems: 'center', marginTop: 40 }}>
                                <Search size={40} color="#E5E7EB" style={{ marginBottom: 10 }} />
                                <Text style={{ fontFamily: 'Inter-Medium', color: '#9CA3AF', fontSize: 16 }}>No section found</Text>
                            </View>
                        )}
                    </ScrollView>
                </View>
            </TouchableOpacity>
        </Modal>
    );
};

// Step Components
const Step1BasicInfo = ({ state, onChange, customers, outfits, openCustomerModal, editItemIndex, onShowAlert, editOrderId }) => {
    // Local State for Modals
    const [calendarVisible, setCalendarVisible] = useState(false);
    const [dateField, setDateField] = useState(null);
    const [sectionDrawerVisible, setSectionDrawerVisible] = useState(false);
    const [outfitDrawerVisible, setOutfitDrawerVisible] = useState(false);
    const { showToast } = useToast();

    const dispatch = useDispatch();
    const { outfits: apiOutfits } = useSelector(state => state.outfit);
    const { sections } = useSelector(state => state.section);

    // Fetch dynamic outfits when section changes
    useEffect(() => {
        const activeSection = sections?.find(s => s.name === state.currentOutfit.gender);
        if (activeSection?.id) {
            dispatch(getOutfitsAction({ sectionId: activeSection.id, page: 1, limit: 100 }));
        }
    }, [state.currentOutfit.gender, sections, dispatch]);

    // Get orders for delivery load calculation
    const { orders } = useData();

    // Calculate delivery load for the Calendar
    // We can default to current month/year if calendar isn't open, 
    // but CalendarModal handles month switching internally. 
    // The loadUtils expects a specific month/year.
    // However, since CalendarModal handles its own month state, we should probably pass the WHOLE map 
    // or update CalendarModal to ask for data. 
    // CURRENT DESIGN: loadUtils.ts filters by month/year. 
    // Optimization: Let's calculate for ALL active orders since the dataset isn't huge yet (clients < 1000 orders).
    // Or, pass a helper that CalendarModal can call? 
    // Actually, getting ALL active orders into a map is fine for < 5000 records.
    // Let's modify getDeliveryLoad to NOT filter by month/year if we want a global map, 
    // OR we pass the current month to the modal props?
    // CalendarModal controls its own state (currentMonth, currentYear). 
    // To keep it simple without lifting state up too much:
    // Let's generate a map for " +/- 1 year " or just all active future orders.
    // Let's UPDATE loadUtils to be lighter or handle this.
    // actually, let's just make getDeliveryLoad return ALL if month/year are -1.
    // Wait, loadUtils implementation I wrote specifically filters.
    // Let's stick to the current month for now, BUT CalendarModal allows navigation.
    // If I pass `deliveryLoad` prop, it needs to cover the viewable dates.
    // The previous implementation of `getDeliveryLoad` filters by month.
    // This means if user clicks "Next Month", the dots won't show unless I update the prop.
    // CalendarModal DOES NOT expose `onMonthChange`.
    // QUICK FIX: Modify `getDeliveryLoad` to accept `month = -1` to return ALL relevant orders.
    // Then I can calculate once.
    // Let's use useMemo to calculate for the *current* calendar view? No, I don't know the calendar view state.
    // Best approach: Calculate for *everything*.

    const deliveryLoad = React.useMemo(() => {
        // -1 to fetch all (need to update utils first? No, let's just loop locally here or update utils)
        // Let's update the utils call to support "all".
        // Actually, I can just not pass month/year to a new util function or modify the existing one.
        // Let's modify the usage here to be smart.
        // For local simplicity: The util I wrote takes month/year.
        // I should probably have made it return all. 
        // Let me RE-WRITE the util in the next step or just inline the logic here if it's simple.
        // Constructing the map for ALL orders is better for UX so scrolling works immediately.

        const loadMap = {};
        orders.forEach(o => {
            if (o.status !== 'Cancelled' && o.status !== 'Delivered' && o.status !== 'Completed' && o.deliveryDate) {
                loadMap[o.deliveryDate] = loadMap[o.deliveryDate] || { count: 0, status: 'low' };
                loadMap[o.deliveryDate].count++;
            }
        });

        // Status logic
        Object.keys(loadMap).forEach(key => {
            const count = loadMap[key].count;
            if (count <= 2) loadMap[key].status = 'low';
            else if (count <= 5) loadMap[key].status = 'medium';
            else loadMap[key].status = 'high';
        });

        return loadMap;
    }, [orders]);

    const handleDateSelect = (date) => {
        if (dateField) {
            onChange({
                [dateField]: date,
                currentOutfit: { ...state.currentOutfit, [dateField]: date }
            });
        }
    };

    const openCalendar = (field) => {
        setDateField(field);
        setCalendarVisible(true);
    };

    const handleQuantityChange = (val) => {
        if (val > (state.currentOutfit.quantity || 1)) {
            const materials = state.currentOutfit.materials || [];
            for (const m of materials) {
                const totalRequired = (parseFloat(m.quantity) || 0) * val;
                if (totalRequired > (m.numericStock || 0)) {
                    showToast(`Insufficient stock for ${m.name}. Only ${m.currentStock} available.`, 'error');
                    return;
                }
            }
        }
        const prevQty = state.currentOutfit.quantity || 1;
        const currentUnitServices = state.currentOutfit.unitServices || {};
        const templateServices = state.currentOutfit.services || [];

        let newUnitServices = { ...currentUnitServices };

        // Ensure existing units have their own services initialized if not already
        for (let i = 0; i < prevQty; i++) {
            if (!newUnitServices[i]) {
                newUnitServices[i] = templateServices.map(s => ({ ...s }));
            }
        }

        if (val > prevQty) {
            // Increasing quantity: Initialize new units with only base 'Stitching' service if present, otherwise empty
            for (let i = prevQty; i < val; i++) {
                newUnitServices[i] = templateServices
                    .filter(s => s.name === 'Stitching')
                    .map(s => ({ 
                        ...s, 
                        id: 'current_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9), 
                        cost: 0 
                    }));
            }
        } else if (val < prevQty) {
            // Decreasing quantity: Remove extra units
            for (let i = val; i < prevQty; i++) {
                delete newUnitServices[i];
            }
        }

        // Recalculate totalCost based on unit-specific services + materials
        const materialsTotal = (state.currentOutfit.materials || []).reduce((sum, m) => sum + (m.quantity * (m.sellingPrice || 0)), 0);
        let newTotal = 0;
        for (let i = 0; i < val; i++) {
            const srv = newUnitServices[i] || templateServices;
            const sTotal = srv.reduce((sum, s) => sum + s.cost, 0);
            newTotal += sTotal + materialsTotal;
        }

        onChange({
            currentOutfit: {
                ...state.currentOutfit,
                quantity: val,
                unitServices: newUnitServices,
                totalCost: newTotal
            }
        });
    };

    const handleTypeSelect = (typeName, typeId) => {
        // Reset measurements when type changes to prevent cross-contamination
        onChange({
            currentOutfit: { ...state.currentOutfit, type: typeName, outfitId: typeId, measurements: {} }
        });
    };

    // Customer Display logic
    const displayCustomerName = state.customerName || (state.selectedCustomer ? state.selectedCustomer.name : 'Select Customer');
    const displayCustomerMobile = state.customerMobile || (state.selectedCustomer ? state.selectedCustomer.mobile : '');
    const isCustomerSelected = !!state.customerName || !!state.selectedCustomer;

    // Lock customer selection if already added items or editing
    const isCustomerLocked = editItemIndex !== undefined || state.cart.length > 0 || !!editOrderId;

    // Lock section/type if editing an existing item from an existing order
    const isOutfitLocked = editItemIndex !== undefined || (!!editOrderId && state.currentOutfit.isExisting);

    return (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 100, gap: 28 }}>

            {/* 1. Customer Section - Modern Card */}
            <View>
                <Text style={styles.modernLabel}>CUSTOMER<Text style={{ color: "red", fontSize: 16 }}> *</Text></Text>
                <TouchableOpacity
                    style={[styles.customerCleanArea, isCustomerLocked && { opacity: 0.6 }]}
                    onPress={!isCustomerLocked ? openCustomerModal : () => onShowAlert('Selection Locked', state.cart.length > 0 ? 'Cannot change customer after adding an outfit.' : 'Cannot change customer for an existing order.')}
                    disabled={isCustomerLocked}
                >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                        <View style={styles.customerAvatarClean}>
                            <User size={22} color={isCustomerSelected ? Colors.primary : "#94A3B8"} strokeWidth={2} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.customerNameMain, !isCustomerSelected && { color: '#94A3B8', fontFamily: 'Inter-Regular' }]}>
                                {displayCustomerName}
                            </Text>
                            {isCustomerSelected && !!displayCustomerMobile && (
                                <Text style={styles.customerSubText}>
                                    {displayCustomerMobile}
                                </Text>
                            )}
                        </View>
                    </View>
                </TouchableOpacity>
            </View>
 
            {/* 1.5 Section Selection */}
            <View style={{ marginTop: -8 }}>
                <Text style={styles.modernLabel}>SECTION<Text style={{ color: "red", fontSize: 16 }}> *</Text></Text>
                <TouchableOpacity
                    style={[styles.modernDropdown, isOutfitLocked && { opacity: 0.6, backgroundColor: '#F8FAFC' }]}
                    onPress={!isOutfitLocked ? () => setSectionDrawerVisible(true) : () => onShowAlert('Selection Locked', (!!editOrderId && state.currentOutfit.isExisting) ? 'Cannot change section for an existing outfit item.' : 'Cannot change section while editing an item.')}
                    disabled={isOutfitLocked}
                >
                    <Text style={[styles.modernDropdownText, !state.currentOutfit.gender && { color: '#94A3B8' }]}>
                        {state.currentOutfit.gender || 'Select Section'}
                    </Text>
                    {!isOutfitLocked && <ChevronDown size={20} color="#64748B" />}
                </TouchableOpacity>
            </View>
 
            {/* 2. Outfit Details - Type & Qty */}
            <View style={{ gap: 24 }}>
                <View style={{ flexDirection: 'row', gap: 16, alignItems: 'flex-end' }}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.modernLabel}>OUTFIT TYPE<Text style={{ color: "red", fontSize: 16 }}> *</Text></Text>
                        <TouchableOpacity
                            style={[styles.modernDropdown, isOutfitLocked && { opacity: 0.6, backgroundColor: '#F8FAFC' }]}
                            onPress={!isOutfitLocked ? () => setOutfitDrawerVisible(true) : () => onShowAlert('Selection Locked', (!!editOrderId && state.currentOutfit.isExisting) ? 'Cannot change outfit type for an existing outfit item.' : 'Cannot change outfit type while editing an item.')}
                            disabled={isOutfitLocked}
                        >
                            <Text style={[styles.modernDropdownText, !state.currentOutfit.type && { color: '#94A3B8' }]}>
                                {state.currentOutfit.type || 'Select Outfit Type'}
                            </Text>
                            {!isOutfitLocked && <ChevronDown size={20} color="#64748B" />}
                        </TouchableOpacity>
                    </View>

                    <View style={{ width: 130 }}>
                        <Text style={styles.modernLabel}>QUANTITY</Text>
                        <QuantityStepper
                            value={state.currentOutfit.quantity || 1}
                            onChange={handleQuantityChange}
                            editMode={!!editOrderId}
                        />
                    </View>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', marginBottom: 8 }}>
                    <Text style={[styles.modernLabel, { marginBottom: 0 }]}>MEASUREMENT DRESS GIVEN</Text>
                    <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => onChange({
                            currentOutfit: {
                                ...state.currentOutfit,
                                measurementDressGiven: (state.currentOutfit.measurementDressGiven || 'No') === 'Yes' ? 'No' : 'Yes'
                            }
                        })}
                        style={{
                            width: 84,
                            height: 36,
                            borderRadius: 18,
                            backgroundColor: (state.currentOutfit.measurementDressGiven === 'Yes') ? Colors.primary : '#E2E8F0',
                            flexDirection: 'row',
                            alignItems: 'center',
                            paddingHorizontal: 4,
                            justifyContent: (state.currentOutfit.measurementDressGiven === 'Yes') ? 'flex-end' : 'flex-start'
                        }}
                    >
                        {(state.currentOutfit.measurementDressGiven === 'Yes') ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Text style={{ color: 'white', fontFamily: 'Inter-Bold', fontSize: 11, marginRight: 10 }}>YES</Text>
                                <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: 'white', ...Shadow.small }} />
                            </View>
                        ) : (
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: 'white', ...Shadow.small }} />
                                <Text style={{ color: '#64748B', fontFamily: 'Inter-Bold', fontSize: 11, marginLeft: 10 }}>NO</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>



                {/* 3. Order Type Section */}
                <View>
                    <Text style={styles.modernLabel}>ORDER TYPE</Text>
                    <View style={styles.chipGroup}>
                        {['Stitching', 'Alteration'].map((t) => {
                            const isSelected = state.orderType === t;
                            return (
                                <TouchableOpacity
                                    key={t}
                                    style={[styles.chipBtn, isSelected && styles.chipBtnActive]}
                                    onPress={() => onChange({
                                        orderType: t,
                                        currentOutfit: { ...state.currentOutfit, orderType: t }
                                    })}
                                >
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                        {isSelected && <Check size={18} color={Colors.white} strokeWidth={3} />}
                                        <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                                            {t}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>

                {/* 4. Urgency */}
                <View>
                    <Text style={styles.modernLabel}>ORDER URGENCY</Text>
                    <View style={styles.chipGroup}>
                        {['Normal', 'Urgent'].map((u) => {
                            const isSelected = state.urgency === u;
                            return (
                                <TouchableOpacity
                                    key={u}
                                    style={[styles.chipBtn, isSelected && styles.chipBtnActive]}
                                    onPress={() => onChange({
                                        urgency: u,
                                        currentOutfit: { ...state.currentOutfit, urgency: u }
                                    })}
                                >
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                        {isSelected && <Check size={18} color={Colors.white} strokeWidth={3} />}
                                        <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                                            {u}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>

                {/* 5. Fabric Source */}
                {/* <View>
                    <Text style={styles.modernLabel}>Fabric Source</Text>
                    <View style={styles.chipGroup}>
                        {['Customer', 'Boutique'].map((s) => {
                            const isSelected = state.currentOutfit.fabricSource === s;
                            return (
                                <TouchableOpacity
                                    key={s}
                                    style={[styles.chipBtn, isSelected && styles.chipBtnActive]}
                                    onPress={() => onChange({ currentOutfit: { ...state.currentOutfit, fabricSource: s } })}
                                >
                                    <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                                        {s}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View> */}

                {/* 6. Dates Section - Modern Card Grid */}
                <View style={{ flexDirection: 'row', gap: 16 }}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.modernLabel}>TRIAL DATE</Text>
                        <TouchableOpacity
                            style={styles.dateModernCard}
                            onPress={() => openCalendar('trialDate')}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <Calendar size={18} color="#64748B" />
                                <Text style={[styles.modernDateText, !state.trialDate && { color: '#94A3B8', fontSize: 13, fontFamily: 'Inter-Medium' }]}>
                                    {state.trialDate ? formatDisplayDate(state.trialDate) : 'Set Trial Date'}
                                </Text>
                            </View>
                            {state.trialDate && (
                                <TouchableOpacity
                                    onPress={() => {
                                        onChange({ trialDate: '', currentOutfit: { ...state.currentOutfit, trialDate: '' } });
                                    }}
                                    style={styles.dateClearBtn}
                                >
                                    <X size={12} color="#EF4444" strokeWidth={3} />
                                </TouchableOpacity>
                            )}
                        </TouchableOpacity>
                    </View>

                    <View style={{ flex: 1 }}>
                        <Text style={styles.modernLabel}>DELIVERY DATE</Text>
                        <TouchableOpacity
                            style={styles.dateModernCard}
                            onPress={() => openCalendar('deliveryDate')}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <Calendar size={18} color="#64748B" />
                                <Text style={[styles.modernDateText, !state.deliveryDate && { color: '#94A3B8', fontSize: 13, fontFamily: 'Inter-Medium' }]}>
                                    {state.deliveryDate ? formatDisplayDate(state.deliveryDate) : 'Set Delivery Date'}
                                </Text>
                            </View>
                            {state.deliveryDate && (
                                <TouchableOpacity
                                    onPress={() => {
                                        onChange({ deliveryDate: '', currentOutfit: { ...state.currentOutfit, deliveryDate: '' } });
                                    }}
                                    style={styles.dateClearBtn}
                                >
                                    <X size={12} color="#EF4444" strokeWidth={3} />
                                </TouchableOpacity>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            <CalendarModal
                visible={calendarVisible}
                onClose={() => setCalendarVisible(false)}
                onSelect={handleDateSelect}
                initialDate={dateField === 'trialDate' ? state.trialDate : state.deliveryDate}
                deliveryLoad={dateField === 'deliveryDate' ? deliveryLoad : undefined}
                minDate={dateField === 'deliveryDate' && state.trialDate ? parseDate(state.trialDate) : undefined}
                onReset={() => handleDateSelect('')}
            />

            <SectionDrawer
                visible={sectionDrawerVisible}
                onClose={() => setSectionDrawerVisible(false)}
                onSelect={(g) => onChange({ currentOutfit: { ...state.currentOutfit, gender: g, type: '', outfitId: null } })}
                currentSection={state.currentOutfit.gender}
            />

            <OutfitDrawer
                visible={outfitDrawerVisible}
                onClose={() => setOutfitDrawerVisible(false)}
                outfits={(apiOutfits || []).filter((o) => o.isVisible !== false && o.is_visible !== false)}
                onSelect={handleTypeSelect}
                currentType={state.currentOutfit.type}
            />
        </ScrollView >
    );
};

// Measurement Configurations
const OUTFIT_MEASUREMENTS = {
    'Blouse': ['Length', 'Shoulder', 'Bust', 'Waist', 'Sleeve Length', 'Sleeve Round', 'Arm Hole', 'Front Neck', 'Back Neck'],
    'Chudithar': ['Top Length', 'Shoulder', 'Bust', 'Waist', 'Hip', 'Sleeve Length', 'Sleeve Round', 'Pant Length', 'Pant Waist', 'Bottom Round'],
    'Lehanga': ['Blouse Length', 'Bust', 'Waist', 'Skirt Length', 'Skirt Waist', 'Hip'],
    'Others': ['Notes']
};

import { DEFAULT_OUTFITS } from '../context/DataContext';

const StepStitching = ({ state, onChange, outfits }) => {
    let selectedOutfitType = outfits.find((o) => o.name === state.currentOutfit.type);

    // Auto-sync: Merge Default structure (for code updates) with DB data (for images/customizations)
    const defaultDef = DEFAULT_OUTFITS.find(d => d.name === state.currentOutfit.type);

    // Deep merge function
    const mergeCategories = (defaults, dbCats) => {
        // 1. Start with DB categories to ensure custom ones are preserved
        const result = (dbCats || []).map(dbCat => {
            const defCat = (defaults || []).find(d => d.name === dbCat.name || d.id === dbCat.id);

            // Merge sub-categories
            const mergedSubCats = (dbCat.subCategories || []).map((dbSub) => {
                const defSub = (defCat?.subCategories || []).find((s) => s.name === dbSub.name || s.id === dbSub.id);

                // Merge options
                const mergedOptions = (dbSub.options || []).map((dbOpt) => {
                    const defOpt = (defSub?.options || []).find((o) => o.name === dbOpt.name || o.id === dbOpt.id);
                    return {
                        ...(defOpt || {}),
                        ...dbOpt,
                        image: dbOpt.image || defOpt?.image // Prioritize DB image
                    };
                });

                // Add missing options from defaults
                // REMOVED: To respect user deletions in Manage Outfits.
                /*
                if (defSub?.options) {
                    defSub.options.forEach((defOpt: any) => {
                        if (!mergedOptions.find((o: any) => o.name === defOpt.name || o.id === defOpt.id)) {
                            mergedOptions.push(defOpt);
                        }
                    });
                }
                */

                return {
                    ...(defSub || {}),
                    ...dbSub,
                    image: dbSub.image || defSub?.image,
                    options: mergedOptions
                };
            });

            // Add missing sub-categories from defaults
            // REMOVED: To respect user deletions in Manage Outfits.
            /*
            if (defCat?.subCategories) {
                defCat.subCategories.forEach((defSub: any) => {
                    if (!mergedSubCats.find((s: any) => s.name === defSub.name || s.id === defSub.id)) {
                        mergedSubCats.push(defSub);
                    }
                });
            }
            */

            return {
                ...(defCat || {}),
                ...dbCat,
                image: dbCat.image || defCat?.image,
                subCategories: mergedSubCats
            };
        });

        // 2. Add missing categories from defaults (in case of app updates)
        // REMOVED: User reported that this overrides their custom configuration (e.g. 5 categories vs 7).
        // if (dbCats && dbCats.length > 0) { ... } -> Skip this step.
        // Only inject defaults if the DB has absolutely no categories? 
        // No, if DB has an outfit entry, we trust its structure.
        /*
        (defaults || []).forEach(defCat => {
            if (!result.find(c => c.name === defCat.name || c.id === defCat.id)) {
                result.push(defCat);
            }
        });
        */

        return result;
    };

    const { stitchingStructure, stitchingLoading } = useSelector(state => state.outfit);

    // Filter outfits from API response if available
    let categories = [];


    if (stitchingStructure && stitchingStructure.categories) {
        // Map API response to Component needs
        categories = stitchingStructure.categories.map(cat => ({
            id: cat.id,
            name: cat.name,
            isVisible: cat.is_visible,
            subCategories: (cat.subcategories || []).map(sub => ({
                id: sub.id,
                name: sub.name,
                isVisible: sub.is_visible,
                options: (sub.options || []).map(opt => ({
                    id: opt.id,
                    name: opt.name,
                    isVisible: opt.is_visible,
                    image: opt.image,
                    subOptions: (opt.suboptions || []).map(so => ({
                        id: so.id,
                        name: so.name,
                        isVisible: so.is_visible
                    }))
                }))
            }))
        }));
    } else {
        // Fallback to existing logic if API data not available
        if (defaultDef && selectedOutfitType) {
            selectedOutfitType = {
                ...selectedOutfitType,
                categories: mergeCategories(defaultDef.categories || [], selectedOutfitType.categories || [])
            };
        } else if (defaultDef && !selectedOutfitType) {
            selectedOutfitType = defaultDef;
        }
        categories = selectedOutfitType?.categories || [];
    }

    // State for currently selected category in the sidebar
    // Default to first category if available
    const [selectedCategoryId, setSelectedCategoryId] = useState(null);
    // State for drilling down into a sub-category
    const [viewingSubCategoryId, setViewingSubCategoryId] = useState(null);
    // State for drilling down into an option (Level 5)
    const [viewingOptionId, setViewingOptionId] = useState(null);

    useEffect(() => {
        if (categories.length > 0 && !selectedCategoryId) {
            setSelectedCategoryId(categories[0].id);
            setViewingSubCategoryId(null);
        }
    }, [categories]);

    // Reset drill-down when category changes
    const onSelectCategory = (id) => {
        setSelectedCategoryId(id);
        setViewingSubCategoryId(null);
        setViewingOptionId(null);
    };

    if (stitchingLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB' }}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={{ marginTop: 12, fontFamily: 'Inter-Medium', color: '#64748B' }}>Fetching stitching options...</Text>
            </View>
        );
    }


    const activeCategory = categories.find(c => c.id === selectedCategoryId);
    const activeSubCategory = activeCategory?.subCategories?.find((s) => s.id === viewingSubCategoryId);
    const activeOption = activeSubCategory?.options?.find((o) => o.id === viewingOptionId);

    const updateMeasurement = (key, val) => {
        const nextMeasurements = { ...state.currentOutfit.measurements };
        if (val === '' || val === null || val === undefined) {
            delete nextMeasurements[key];
            // Also delete case-insensitive versions of key
            Object.keys(nextMeasurements).forEach(k => {
                if (k.toLowerCase().trim() === key.toLowerCase().trim()) {
                    delete nextMeasurements[k];
                }
            });
        } else {
            nextMeasurements[key] = val;
        }
        onChange({
            currentOutfit: {
                ...state.currentOutfit,
                measurements: nextMeasurements
            }
        });
    };

    const getSelectedValue = (catName) => {
        if (!state.currentOutfit.measurements || !catName) return null;
        if (state.currentOutfit.measurements[catName]) return state.currentOutfit.measurements[catName];

        // Fallback to case-insensitive match
        const match = Object.entries(state.currentOutfit.measurements).find(
            ([k, v]) => k.toLowerCase().trim() === catName.toLowerCase().trim()
        );
        return match ? match[1] : null;
    };

    const handleAutoAdvanceCategory = () => {
        const currentIndex = categories.findIndex(c => c.id === selectedCategoryId);
        if (currentIndex !== -1 && currentIndex < categories.length - 1) {
            // Find next visible category
            const nextCat = categories.slice(currentIndex + 1).find(c => c.isVisible);
            if (nextCat) {
                // Short delay to let the user see their selection before jumping
                setTimeout(() => {
                    setSelectedCategoryId(nextCat.id);
                    setViewingSubCategoryId(null);
                    setViewingOptionId(null);
                }, 300);
            }
        }
    };

    const hasSelection = (catName) => {
        if (!state.currentOutfit.measurements || !catName) return false;
        if (state.currentOutfit.measurements[catName]) return true;

        // Fallback to case-insensitive match with truthy value check
        return Object.entries(state.currentOutfit.measurements).some(
            ([k, v]) => k.toLowerCase().trim() === catName.toLowerCase().trim() && v
        );
    };

    const handleOptionPress = (opt) => {
        const selectedValue = getSelectedValue(activeCategory.name);
        const isSelected = selectedValue && (
            selectedValue.toLowerCase().trim() === opt.name.toLowerCase().trim() ||
            selectedValue.toLowerCase().trim().startsWith(opt.name.toLowerCase().trim() + ' - ')
        );

        if (isSelected) {
            // Already selected, so unselect
            updateMeasurement(activeCategory.name, '');
            return;
        }

        // Update measurement even on drill down to ensure partial selection is saved
        updateMeasurement(activeCategory.name, opt.name);

        // Check if this option has nested options
        if (opt.options && opt.options.length > 0) {
            // Drill down
            setViewingSubCategoryId(opt.id);
            setViewingOptionId(null);
        } else {
            // Leaf node selection (Level 2)
            // If we are already in Level 3, this is called for the Option item
            handleAutoAdvanceCategory();
        }
    };

    const handleLevel4Press = (opt) => {
        const finalValue = `${activeSubCategory.name} - ${opt.name}`;
        const selectedValue = getSelectedValue(activeCategory.name);
        const isSelected = selectedValue && (
            selectedValue.toLowerCase().trim() === finalValue.toLowerCase().trim() ||
            selectedValue.toLowerCase().trim().startsWith(finalValue.toLowerCase().trim() + ' - ')
        );

        if (isSelected) {
            // Already selected, so unselect
            updateMeasurement(activeCategory.name, '');
            return;
        }

        // Update measurement even on drill down to ensure partial selection is saved
        updateMeasurement(activeCategory.name, finalValue);

        if (opt.subOptions && opt.subOptions.length > 0) {
            setViewingOptionId(opt.id);
        } else {
            handleAutoAdvanceCategory();
        }
    };

    const handleLevel5Selection = (subCatName, optionName, subOptionName) => {
        // Save as "Paan - Fancy - Blue"
        const finalValue = `${subCatName} - ${optionName} - ${subOptionName}`;
        const selectedValue = getSelectedValue(activeCategory.name);
        const isSelected = selectedValue && selectedValue.toLowerCase().trim() === finalValue.toLowerCase().trim();

        if (isSelected) {
            // Already selected, so unselect
            updateMeasurement(activeCategory.name, '');
            return;
        }

        updateMeasurement(activeCategory.name, finalValue);
        handleAutoAdvanceCategory();
    };

    const renderSidebarItem = (cat) => {
        const isActive = selectedCategoryId === cat.id;
        const isCompleted = hasSelection(cat.name);

        return (
            <TouchableOpacity
                key={cat.id}
                style={[
                    styles.sidebarItem,
                    isActive && styles.sidebarItemActive
                ]}
                onPress={() => onSelectCategory(cat.id)}
            >
                <View style={{ flex: 1 }}>
                    <Text style={[
                        styles.sidebarItemText,
                        isActive && styles.sidebarItemTextActive
                    ]}>
                        {cat.name}
                    </Text>
                </View>
                {isCompleted && (
                    <View style={styles.sidebarCheckBadge}>
                        <Check size={10} color={Colors.white} />
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    const renderOptionGrid = () => {
        if (!activeCategory) return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ color: Colors.textSecondary }}>Select a category</Text>
            </View>
        );

        // LEVEL 4: Viewing Sub-Options for an Option (Level 5)
        if (viewingOptionId && activeOption) {
            const level5Options = activeOption.subOptions || [];
            const selectedValue = getSelectedValue(activeCategory.name);

            return (
                <View style={{ flex: 1 }}>
                    {/* Header with Back Button */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}>
                        <TouchableOpacity onPress={() => setViewingOptionId(null)} style={{ padding: 4, marginRight: 8 }}>
                            <ArrowLeft size={20} color={Colors.textPrimary} />
                        </TouchableOpacity>
                        <View>
                            <Text style={styles.headerSubtitle}>{activeSubCategory.name} - {activeOption.name}</Text>
                            <Text style={styles.sectionTitle}>Select Sub-Option</Text>
                        </View>
                    </View>

                    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
                        <View style={{ gap: 12 }}>
                            {level5Options.map((opt) => {
                                const fullValue = `${activeSubCategory.name} - ${activeOption.name} - ${opt.name}`;
                                // Selection logic: Exact match for Level 5
                                const isSelected = selectedValue && selectedValue.toLowerCase().trim() === fullValue.toLowerCase().trim();

                                return (
                                    <TouchableOpacity
                                        key={opt.id}
                                        style={[
                                            styles.optionListItem,
                                            isSelected && styles.optionListItemSelected
                                        ]}
                                        onPress={() => handleLevel5Selection(activeSubCategory.name, activeOption.name, opt.name)}
                                    >
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                                            <View style={styles.optionListImageContainer}>
                                                {opt.image ? (
                                                    <Image source={{ uri: opt.image }} style={styles.optionListImage} />
                                                ) : (
                                                    <ImageIcon size={20} color={Colors.textSecondary} opacity={0.5} />
                                                )}
                                            </View>
                                            <Text
                                                style={[
                                                    styles.optionListText,
                                                    isSelected && styles.optionListTextSelected
                                                ]}
                                            >
                                                {opt.name}
                                            </Text>
                                        </View>
                                        <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                                            {isSelected && <View style={styles.radioInner} />}
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </ScrollView>
                </View>
            );
        }

        // LEVEL 3: Viewing Options for a SubCategory (Level 4)
        if (viewingSubCategoryId && activeSubCategory) {
            const nestedOptions = activeSubCategory.options || [];
            const selectedValue = getSelectedValue(activeCategory.name);

            return (
                <View style={{ flex: 1 }}>
                    {/* Header with Back Button */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}>
                        <TouchableOpacity onPress={() => setViewingSubCategoryId(null)} style={{ padding: 4, marginRight: 8 }}>
                            <ArrowLeft size={20} color={Colors.textPrimary} />
                        </TouchableOpacity>
                        <View>
                            <Text style={styles.headerSubtitle}>{activeCategory.name}</Text>
                            <Text style={styles.sectionTitle}>{activeSubCategory.name}</Text>
                        </View>
                    </View>

                    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
                        <View style={{ gap: 12 }}>
                            {nestedOptions.map((opt) => {
                                // Important: Check if selectedValue STARTS with this full Level 4 path
                                // This handles BOTH direct selection and Level 5 selection
                                const fullValue4 = `${activeSubCategory.name} - ${opt.name}`;
                                const isSelected = selectedValue && (
                                    selectedValue.toLowerCase().trim() === fullValue4.toLowerCase().trim() ||
                                    selectedValue.toLowerCase().trim().startsWith(fullValue4.toLowerCase().trim() + ' - ')
                                );
                                const hasChildren = opt.subOptions && opt.subOptions.length > 0;

                                return (
                                    <TouchableOpacity
                                        key={opt.id}
                                        style={[
                                            styles.optionListItem,
                                            isSelected && styles.optionListItemSelected
                                        ]}
                                        onPress={() => handleLevel4Press(opt)}
                                    >
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                                            <View style={styles.optionListImageContainer}>
                                                {opt.image ? (
                                                    <Image source={{ uri: opt.image }} style={styles.optionListImage} />
                                                ) : (
                                                    <ImageIcon size={20} color={Colors.textSecondary} opacity={0.5} />
                                                )}
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text
                                                    style={[
                                                        styles.optionListText,
                                                        isSelected && styles.optionListTextSelected
                                                    ]}
                                                >
                                                    {opt.name}
                                                </Text>
                                                {/* Show selected sub-index if any */}
                                                {isSelected && hasChildren && selectedValue.includes(' - ') && (
                                                    <Text style={{ fontSize: 11, color: Colors.primary, fontFamily: 'Inter-Medium', marginTop: 2 }}>
                                                        {selectedValue.split(/\s*-\s*/).slice(2).join(' - ')}
                                                    </Text>
                                                )}
                                                {/* Preview children if not selected or to show structure */}
                                                {!isSelected && hasChildren && (
                                                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                                                        {opt.subOptions.slice(0, 3).map((so) => (
                                                            <View key={so.id} style={{ backgroundColor: '#F1F5F9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                                                                <Text style={{ fontSize: 9, color: Colors.textSecondary, fontFamily: 'Inter-Medium' }}>{so.name}</Text>
                                                            </View>
                                                        ))}
                                                        {opt.subOptions.length > 3 && (
                                                            <Text style={{ fontSize: 9, color: Colors.textSecondary }}>+{opt.subOptions.length - 3} more</Text>
                                                        )}
                                                    </View>
                                                )}
                                            </View>
                                        </View>

                                        {hasChildren ? (
                                            <ChevronRight size={18} color={Colors.textSecondary} />
                                        ) : (
                                            <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                                                {isSelected && <View style={styles.radioInner} />}
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </ScrollView>
                </View>
            );
        }

        // LEVEL 2: Viewing SubCategories (Standard)
        const options = activeCategory.subCategories || [];
        const selectedValue = getSelectedValue(activeCategory.name); // e.g., "Paan - Deep" or "Round"

        if (options.length === 0) return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
                <Text style={{ color: Colors.textSecondary, textAlign: 'center' }}>No options available for this category.</Text>
            </View>
        );

        return (
            <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
                <View style={{ gap: 12 }}>
                    {options.map((opt) => {
                        // Check if selected value STARTS with this option name (for composite values like "Paan - Deep")
                        // OR equals the option name directly (leaf node selection)
                        const isSelected = selectedValue && (
                            selectedValue.toLowerCase().trim() === opt.name.toLowerCase().trim() ||
                            selectedValue.toLowerCase().trim().startsWith(opt.name.toLowerCase().trim() + ' - ')
                        );
                        const hasChildren = opt.options && opt.options.length > 0;

                        return (
                            <TouchableOpacity
                                key={opt.id}
                                style={[
                                    styles.optionListItem,
                                    isSelected && styles.optionListItemSelected
                                ]}
                                onPress={() => handleOptionPress(opt)}
                            >
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                                    {/* Image or Icon */}
                                    <View style={styles.optionListImageContainer}>
                                        {opt.image ? (
                                            <Image source={{ uri: opt.image }} style={styles.optionListImage} />
                                        ) : (
                                            <ImageIcon size={20} color={Colors.textSecondary} opacity={0.5} />
                                        )}
                                    </View>

                                    {/* Text */}
                                    <View style={{ flex: 1 }}>
                                        <Text
                                            style={[
                                                styles.optionListText,
                                                isSelected && styles.optionListTextSelected
                                            ]}
                                        >
                                            {opt.name}
                                        </Text>
                                        {/* Show selected child if drill-down */}
                                        {isSelected && hasChildren && selectedValue.includes(' - ') && (
                                            <Text style={{ fontSize: 11, color: Colors.primary, fontFamily: 'Inter-Medium', marginTop: 2 }}>
                                                {selectedValue.split(/\s*-\s*/).slice(1).join(' - ')}
                                            </Text>
                                        )}
                                    </View>
                                </View>

                                {/* Right Side: Chevron or Check */}
                                {hasChildren ? (
                                    <ChevronRight size={18} color={Colors.textSecondary} />
                                ) : (
                                    <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                                        {isSelected && <View style={styles.radioInner} />}
                                    </View>
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </ScrollView>
        );
    };

    // If no categories, show empty state
    if (categories.length === 0) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
                <Text style={{ color: Colors.textSecondary }}>No stitching options available for this outfit type.</Text>
            </View>
        );
    }

    return (
        <View style={{ flex: 1, flexDirection: 'row', backgroundColor: '#F9FAFB' }}>
            {/* Sidebar */}
            <View style={styles.sidebarContainer}>
                <ScrollView contentContainerStyle={{ paddingVertical: 12 }}>
                    {categories.filter((c) => c.isVisible).map(renderSidebarItem)}
                </ScrollView>
            </View>

            {/* Content Area */}
            <View style={styles.contentContainer}>
                {renderOptionGrid()}
            </View>
        </View>
    );
};

const StepMeasurements = ({ state, onChange }) => {
    const [historyVisible, setHistoryVisible] = useState(false);
    const { updateCustomer } = useData();
    const { showToast } = useToast();
    const [deleteSheetVisible, setDeleteSheetVisible] = useState(false);
    const [deleteSheetConfig, setDeleteSheetConfig] = useState({
        title: '',
        description: '',
        confirmText: 'Delete',
        isDiscard: false,
    });
    const pendingDeleteActionRef = useRef(null);

    // Measurement Configuration - Using existing fields or custom ones
    const dispatch = useDispatch();
    const {
        measurements: apiMeasurements,
        outfitMeasurements,
        measurementHistory,
        historyDetail,
        detailLoading,
        loading,
        loadingMore,
        hasMore: measurementsHasMore,
        outfitHasMore,
        historyHasMore
    } = useSelector(state => state.measurement);
const { sections } = useSelector(state => state.section);

    const [page, setPage] = useState(1);
    const [historyPage, setHistoryPage] = useState(1);
    const [optimisticMeasurements, setOptimisticMeasurements] = useState([]);
    const [pendingNewMeasurements, setPendingNewMeasurements] = useState([]);
    const [selectModalVisible, setSelectModalVisible] = useState(false);
    const [wasSelectModalOpen, setWasSelectModalOpen] = useState(false);
    const [measurementSearchTerm, setMeasurementSearchTerm] = useState('');
    const [measurementPage, setMeasurementPage] = useState(1);

    const activeSection = sections?.find(s => s.name === state.currentOutfit.gender);
    const activeSectionId = activeSection?.id || null;

    const fetchMeasurements = useCallback((p) => {
        if (state.currentOutfit.outfitId) {
            return dispatch(getOutfitMeasurementsAction({
                outfitId: state.currentOutfit.outfitId,
                page: p,
                limit: 10
            })).unwrap();
        }
        return Promise.resolve(null);
    }, [state.currentOutfit.outfitId, dispatch]);

    const fetchAllMeasurements = useCallback((p, search = '') => {
        if (state.currentOutfit.outfitId && activeSectionId) {
            return dispatch(getMeasurementsAction({
                outfitId: state.currentOutfit.outfitId,
                sectionId: activeSectionId,
                page: p,
                limit: 20,
                search: search
            })).unwrap();
        }
        return Promise.resolve(null);
    }, [state.currentOutfit.outfitId, activeSectionId, dispatch]);

    useEffect(() => {
        setPage(1);
        setOptimisticMeasurements([]);
        dispatch(resetOutfitMeasurements());
        fetchMeasurements(1).catch(() => null);
    }, [state.currentOutfit.outfitId, fetchMeasurements, dispatch]);

    useEffect(() => {
        if (selectModalVisible) {
            setMeasurementPage(1);
            setMeasurementSearchTerm('');
            dispatch(resetMeasurements());
            fetchAllMeasurements(1, '').catch(() => null);
        }
    }, [selectModalVisible, fetchAllMeasurements, dispatch]);

    const fetchHistory = useCallback((p) => {
        const customerId = state.selectedCustomer?.id;
        const outfitId = state.currentOutfit.outfitId;
        if (customerId && outfitId) {
            dispatch(getMeasurementHistoryAction({
                customerId,
                outfitId,
                page: p,
                limit: 10
            }));
        }
    }, [state.selectedCustomer?.id, state.currentOutfit.outfitId, dispatch]);

    useEffect(() => {
        if (historyVisible) {
            setHistoryPage(1);
            dispatch(resetMeasurementHistory());
            fetchHistory(1);
        }
    }, [historyVisible, fetchHistory, dispatch]);

    const handleLoadMoreHistory = () => {
        if (historyHasMore && !loadingMore && !loading) {
            const nextPage = historyPage + 1;
            setHistoryPage(nextPage);
            fetchHistory(nextPage);
        }
    };

    const handleLoadMore = () => {
        if (outfitHasMore && !loadingMore && !loading) {
            const nextPage = page + 1;
            setPage(nextPage);
            fetchMeasurements(nextPage);
        }
    };

    const [addModalVisible, setAddModalVisible] = useState(false);
    const [menuActiveIndex, setMenuActiveIndex] = useState(null);
    const [editingItem, setEditingItem] = useState(null);
    const [historyDetailsVisible, setHistoryDetailsVisible] = useState(false);
    const [selectedHistoryItem, setSelectedHistoryItem] = useState(null);
    const [isAppliedHistory, setIsAppliedHistory] = useState(false);

    const updateMeasurement = (key, val) => {
        onChange({
            currentOutfit: {
                ...state.currentOutfit,
                measurements: { ...state.currentOutfit.measurements, [key]: val }
            }
        });
    };

    const getMeasurementImage = (index) => {
        const images = [
            require('../assets/img1.png'),
            require('../assets/img2.png'),
            require('../assets/img3.png')
        ];
        return images[index % images.length];
    };

    const historyData = measurementHistory;
    const sortedHistory = historyData; // Already filtered by outfit_id in API

    const applyHistory = (data) => {
        // data could be a map of { [measurement_name]: value } or array of objects.
        // Usually, history measurements might be an array of objects from previous cart or a map.
        // In CreateOrderFlowScreen, it depends on what is passed. Let's handle both.
        let parsedData = data;
        let newMeasurements = [];

        if (Array.isArray(data)) {
            // It's an array of { name, value, measurementId }
            parsedData = data.reduce((acc, item) => {
                if (item.name && item.value) {
                    acc[item.name] = String(item.value);
                }
                return acc;
            }, {});
            newMeasurements = data.map(item => ({
                measurementId: item.measurementId || item.measurement_id || item.id,
                name: item.name || item.title || item.measurement_name,
                value: String(item.value || '')
            }));
        } else if (typeof data === 'object') {
            // It's a key-value map
            newMeasurements = Object.keys(data).map(key => {
                // Try to find the matching measurement to get its ID
                const matchedMeasurement = measurementList.find(m => m.title?.toLowerCase() === key.toLowerCase());
                return {
                    measurementId: matchedMeasurement ? matchedMeasurement.id : null,
                    name: key,
                    value: String(data[key] || '')
                };
            });
        }

        onChange({
            currentOutfit: {
                ...state.currentOutfit,
                measurements: parsedData // Replace completely with history
            },
            cart: state.cart.map(item => {
                if (item.outfitId === state.currentOutfit.outfitId) {
                    return {
                        ...item,
                        measurements: newMeasurements // Replace completely with history
                    };
                }
                return item;
            })
        });

        // Ensure these measurements completely replace the UI so only they render
        setOptimisticMeasurements(() => {
            return newMeasurements.map(m => {
                const matchedBase = baseFields.find(b => b.title?.toLowerCase() === m.name.toLowerCase());
                return {
                    id: m.measurementId || matchedBase?.id || `custom_${Date.now()}_${Math.random()}`,
                    title: m.name,
                    isCustom: !matchedBase,
                    sections: matchedBase ? matchedBase.sections : []
                };
            });
        });

        setIsAppliedHistory(true);
        setHistoryVisible(false);
    };

    const deleteHistoryItem = async (historyId) => {
        if (!state.selectedCustomer) return;

        pendingDeleteActionRef.current = async () => {
            const currentHistory = state.selectedCustomer.measurementHistory || [];
            const updatedHistory = currentHistory.filter((h) => h.id !== historyId);

            try {
                await updateCustomer(state.selectedCustomer.id, { measurementHistory: updatedHistory });
                onChange({
                    selectedCustomer: { ...state.selectedCustomer, measurementHistory: updatedHistory }
                });
                showToast('History entry deleted', 'success');
            } catch (e) {
                console.error("Failed to delete history item", e);
                showToast('Failed to delete history', 'error');
            }
        };
        setDeleteSheetConfig({
            title: "Delete History",
            description: "Are you sure you want to delete this measurement entry?",
            confirmText: "Delete",
            isDiscard: false
        });
        setDeleteSheetVisible(true);
    };

    const mapMeasurementToListItem = (measurement) => {
        const reverseSectionMap = { 1: 'Men', 2: 'Women', 3: 'Kids-Boy', 4: 'Kids-Girl' };
        let sectionsArray = [];

        // Handle both camelCase and snake_case for section field
        const rawSections = measurement?.sectionId || measurement?.section_id;

        if (Array.isArray(rawSections)) {
            sectionsArray = rawSections.map(id => reverseSectionMap[id]).filter(Boolean);
        } else if (rawSections) {
            sectionsArray = [reverseSectionMap[rawSections]].filter(Boolean);
        }

        return {
            title: measurement?.measurement_name || measurement?.name || measurement?.title || '',
            img: measurement?.image_url || measurement?.imageUrl || measurement?.img || null,
            id: measurement?.measurement_id || measurement?.id,
            isCustom: measurement?.is_default === undefined ? true : !measurement?.is_default,
            sections: sectionsArray
        };
    };

    // Combine base fields from API
    const baseFields = useMemo(
        () => outfitMeasurements.map(mapMeasurementToListItem),
        [outfitMeasurements],
    );

    useEffect(() => {
        setOptimisticMeasurements(prev => {
            const nextItems = prev.filter(localItem => !baseFields.some(baseItem => {
                const localId = String(localItem?.id || '').trim();
                const baseId = String(baseItem?.id || '').trim();
                const localTitle = String(localItem?.title || '').trim().toLowerCase();
                const baseTitle = String(baseItem?.title || '').trim().toLowerCase();

                return (localId && baseId && localId === baseId) || (localTitle && localTitle === baseTitle);
            }));

            if (nextItems.length === prev.length) {
                return prev;
            }

            return nextItems;
        });
    }, [baseFields]);

    const allMeasurementItems = useMemo(() => {
        let items = [...optimisticMeasurements, ...baseFields];
        return items.filter((item, index, list) => {
            const itemId = String(item?.id || '').trim();
            const itemTitle = String(item?.title || '').trim().toLowerCase();

            return list.findIndex(candidate => {
                const candidateId = String(candidate?.id || '').trim();
                const candidateTitle = String(candidate?.title || '').trim().toLowerCase();

                if (itemId && candidateId) {
                    return candidateId === itemId;
                }

                return itemTitle && candidateTitle === itemTitle;
            }) === index;
        });
    }, [optimisticMeasurements, baseFields]);

    const measurementList = useMemo(() => {
        if (apiMeasurements) {
            const reverseSectionMap = { 1: 'Men', 2: 'Women', 3: 'Kids-Boy', 4: 'Kids-Girl' };
            return apiMeasurements.map(m => {
                let sectionsArray = [];
                if (Array.isArray(m.sectionId)) {
                    sectionsArray = m.sectionId.map(id => reverseSectionMap[id]).filter(Boolean);
                } else if (m.sectionId) {
                    sectionsArray = [reverseSectionMap[m.sectionId]].filter(Boolean);
                }
                const isSelected = allMeasurementItems.some(item => {
                    const mId = m?.id?.toString() || '';
                    const itemId = item?.id?.toString() || '';
                    const mName = (m.name || '').toLowerCase().trim();
                    const itemTitle = (item?.title || '').toLowerCase().trim();
                    return (mId && itemId && mId === itemId) || (mName === itemTitle);
                });
                return {
                    id: m?.id?.toString() || m?.measurement_id?.toString() || '',
                    title: m.name || m.measurement_name || m.title || '',
                    img: m.imageUrl ? { uri: m.imageUrl } : (m.image_url ? { uri: m.image_url } : null),
                    isCustom: !m.isDefault && !m.is_default,
                    sections: sectionsArray,
                    isSelected: isSelected
                };
            });
        }
        return [];
    }, [apiMeasurements, allMeasurementItems]);

    const handleConfirmSelection = async (selectedIds) => {
        const numericIds = selectedIds.map(id => parseInt(id, 10)).filter(id => !isNaN(id));
        if (state.currentOutfit.outfitId) {
            try {
                await dispatch(assignMeasurementsAction({ outfitId: state.currentOutfit.outfitId, measurementIds: numericIds })).unwrap();
                showToast("Measurements updated successfully", "success");
                setPage(1);
                fetchMeasurements(1).catch(() => null);
            } catch (e) {
                console.error("Failed to assign measurements", JSON.stringify(e));
                showToast(`Failed to assign measurements: ${e?.message || JSON.stringify(e)}`, "error");
            }
        }
        setSelectModalVisible(false);
        setPendingNewMeasurements([]);
    };

    const handleRemoveMeasurement = async (item) => {
        // Remove this item from the selected measurements by re-confirming selection without it
        const currentIds = allMeasurementItems
            .map(m => m.id?.toString())
            .filter(id => id && id !== item.id?.toString());
        await handleConfirmSelection(currentIds);
    };

    const handleAddNewMeasurement = async (newData, options = {}) => {
        const showInlineToast = options?.showInlineToast;

        if (!newData.sections || newData.sections.length === 0) {
            (showInlineToast || showToast)('Please select at least one section', 'warning');
            return false;
        }

        try {
            const sectionMap = { 'Men': 1, 'Women': 2, 'Kids-Boy': 3, 'Kids-Girl': 4 };
            const sectionIdsArray = newData.sections.map(s => sectionMap[s]).filter(Boolean);

            let photoUrl = newData.img;
            if (photoUrl && photoUrl.uri) {
                photoUrl = photoUrl.uri;
            }

            const payload = {
                measurement_name: newData.title,
            };
            if (photoUrl) payload.image_url = photoUrl;

            let savedMeasurement = null;
            if (editingItem) {
                const result = await dispatch(updateMeasurementAction({ id: editingItem.id, payload })).unwrap();
                let createdData = result?.data || result?.measurement || result?.item || (result?.id || result?.measurement_id ? result : null);
                if (Array.isArray(createdData)) createdData = createdData[0];
                savedMeasurement = createdData;
                showToast(result.message || `Updated ${newData.title}`, 'success');
            } else {
                payload.section_id = sectionIdsArray;
                payload.outfit_id = null; // Do not auto-assign to outfit yet
                payload.is_default = false;
                const result = await dispatch(addMeasurementAction(payload)).unwrap();
                let createdData = result?.data || result?.measurement || result?.item || (result?.id || result?.measurement_id ? result : null);
                if (Array.isArray(createdData)) createdData = createdData[0];
                savedMeasurement = createdData;
                const newItem = mapMeasurementToListItem(savedMeasurement || {
                    measurement_name: newData.title,
                    image_url: photoUrl || null,
                    measurement_id: `temp_${Date.now()}`,
                    section_id: sectionIdsArray,
                    is_default: false,
                });
                setOptimisticMeasurements(prev => [newItem, ...prev]);
                // Also add to pending so it appears in the selection drawer immediately
                const pendingItem = {
                    id: newItem.id?.toString() || `temp_${Date.now()}`,
                    title: newData.title,
                    img: newItem.img || null,
                    isCustom: true,
                    sections: newData.sections || [],
                    isSelected: true,
                };
                setPendingNewMeasurements(prev => [pendingItem, ...prev]);
                showToast(result.message || `Added ${newData.title}`, 'success');
            }

            // Refresh list
            setPage(1);
            fetchMeasurements(1).catch(() => null);
            setEditingItem(null);
            return savedMeasurement?.id?.toString() || savedMeasurement?.measurement_id?.toString() || true;
        } catch (error) {
            console.error("Failed to save measurement", error);
            const errorMsg = error?.message || (typeof error === 'string' ? error : 'Failed to save measurement');
            (showInlineToast || showToast)(errorMsg, 'error');
            return false;
        }
    };

    const handleDeleteMeasurement = async (item) => {
        pendingDeleteActionRef.current = async () => {
            try {
                const result = await dispatch(deleteMeasurementAction(item.id)).unwrap();
                setOptimisticMeasurements(prev =>
                    prev.filter(measurement => String(measurement?.id || '') !== String(item?.id || '')),
                );
                setPendingNewMeasurements(prev => 
                    prev.filter(p => String(p.id || '') !== String(item?.id || ''))
                );
                setPage(1);
                fetchMeasurements(1).catch(() => null);
                setMenuActiveIndex(null);
                showToast(result.message || 'Measurement deleted', 'success');
            } catch (error) {
                console.error("Failed to delete measurement", error);
                const errorMsg = error?.message || (typeof error === 'string' ? error : 'Failed to delete measurement');
                showToast(errorMsg, 'error');
            }
        };
        setDeleteSheetConfig({
            title: "Delete Measurement",
            description: "Are you sure you want to delete this measurement from the list?",
            confirmText: "Delete",
            isDiscard: false
        });
        setDeleteSheetVisible(true);
    };

    const handleViewHistoryEntry = (item) => {
        setSelectedHistoryItem(item);
        setHistoryDetailsVisible(true);
        if (item.order_id) {
            dispatch(getMeasurementHistoryDetailAction(item.order_id));
        }
    };

    const handleApplyFromDetail = () => {
        if (historyDetail && historyDetail.measurements) {
            const appliedData = {};
            historyDetail.measurements.forEach(m => {
                const fieldTitle = m.measurement?.name || m.measurement_name || m.name || m.title;
                const matchingField = baseFields.find(f => String(f.id) === String(m.measurement_id) || (f.title && fieldTitle && f.title.toLowerCase() === fieldTitle.toLowerCase()));
                if (matchingField) {
                    appliedData[matchingField.title] = m.value;
                } else if (fieldTitle) {
                    appliedData[fieldTitle] = m.value;
                }
            });
            applyHistory(appliedData);
            setIsAppliedHistory(true);
            setHistoryDetailsVisible(false);
            setHistoryVisible(false);
            showToast('History applied successfully', 'success');
        } else if (selectedHistoryItem && selectedHistoryItem.data) {
            applyHistory(selectedHistoryItem.data);
            setIsAppliedHistory(true);
            setHistoryDetailsVisible(false);
            setHistoryVisible(false);
            showToast('History applied successfully', 'success');
        }
    };

    const onEditStart = (item) => {
        setEditingItem(item);
        setWasSelectModalOpen(false);
        setSelectModalVisible(true);
        setMenuActiveIndex(null);
    };

    const handleConfirmDelete = async () => {
        if (!pendingDeleteActionRef.current) {
            setDeleteSheetVisible(false);
            return;
        }

        const pendingAction = pendingDeleteActionRef.current;
        pendingDeleteActionRef.current = null;
        setDeleteSheetVisible(false);
        await pendingAction();
    };

    return (
        <View style={{ flex: 1 }}>
            {loading && page === 1 && allMeasurementItems.length === 0 ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                </View>
            ) : (
                <KeyboardAwareScrollView
                    style={{ flex: 1, backgroundColor: Colors.white }}
                    contentContainerStyle={{ padding: 20, paddingBottom: 200, gap: 16 }}
                    keyboardShouldPersistTaps="handled"
                    enableOnAndroid={true}
                    extraScrollHeight={130}
                    onMomentumScrollEnd={(e) => {
                        const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
                        const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 50;
                        if (isCloseToBottom) {
                            handleLoadMore();
                        }
                    }}
                >

                    {/* Header Section */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={{ fontSize: 22, fontFamily: 'Inter-Bold', color: '#111827' }}>Measurements</Text>
                            <Text style={{ fontSize: 14, fontFamily: 'Inter-Medium', color: '#94A3B8' }}>(Inches)</Text>
                        </View>
                        <TouchableOpacity
                            style={styles.newHistoryBtn}
                            onPress={() => setHistoryVisible(true)}
                        >
                            <History size={16} color={Colors.primary} />
                            <Text style={styles.newHistoryText}>View History</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Previous Measurement Banner */}
                    {(() => {
                        const matchingCartItem = [...(state.cart || [])].reverse().find(item => item.type === state.currentOutfit.type);
                        if (!matchingCartItem) return null;

                        return (
                            <View style={styles.promoBanner}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.promoTitle}>Use previous measurement</Text>
                                    <Text style={styles.promoSubtitle}>Last used for {matchingCartItem.type}</Text>
                                </View>
                                <TouchableOpacity
                                    style={styles.applyPromoBtn}
                                    onPress={() => {
                                        applyHistory(matchingCartItem.measurements);
                                        showToast('Applied last measurement', 'success');
                                    }}
                                >
                                    <Text style={styles.applyPromoText}>Apply</Text>
                                </TouchableOpacity>
                            </View>
                        );
                    })()}

                    {/* Save Info Banner */}
                    <View style={styles.saveInfoBanner}>
                        <View style={styles.checkCircleSmall}>
                            <Check size={12} color="#10B981" strokeWidth={3} />
                        </View>
                        <Text style={styles.saveInfoText}>
                            Measurements entered here will be saved to this customer's profile for future use.
                        </Text>
                    </View>

                    {/* Dynamic count and Add New */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, marginBottom: 4 }}>
                        <Text style={styles.dynamicCountText}>MEASUREMENTS ({allMeasurementItems.length})</Text>
                        <TouchableOpacity
                            style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                            onPress={() => setSelectModalVisible(true)}
                        >
                            <Plus size={16} color={Colors.primary} strokeWidth={3} />
                            <Text style={styles.addNewTitle}>ADD NEW</Text>
                        </TouchableOpacity>
                    </View>

                    {allMeasurementItems.length === 0 && !loading && (
                        <View style={{ paddingVertical: 60, alignItems: 'center' }}>
                            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
                                <Shirt size={32} color="#CBD5E1" />
                            </View>
                            <Text style={{ fontFamily: 'Inter-Bold', fontSize: 16, color: '#64748B' }}>No measurements defined</Text>
                            <Text style={{ fontFamily: 'Inter-Medium', fontSize: 13, color: '#94A3B8', textAlign: 'center', marginTop: 4, paddingHorizontal: 40 }}>
                                Click 'ADD NEW' to create a custom measurement field for this outfit.
                            </Text>
                        </View>
                    )}

                    {allMeasurementItems.map((item, index) => (
                        <View
                            key={`${item.title}-${index}`}
                            style={[
                                styles.measureItemContainer,
                                { position: 'relative' },
                                menuActiveIndex === index && { zIndex: 100, elevation: 10 }
                            ]}
                        >
                            <View style={styles.measureImgBox}>
                                {item.img ? (
                                    <Image
                                        source={typeof item.img === 'string' ? { uri: item.img } : item.img}
                                        style={styles.measureSmallImg}
                                        resizeMode="contain"
                                    />
                                ) : (
                                    <Shirt size={34} color={Colors.primary} strokeWidth={1.5} />
                                )}
                            </View>
                            <View style={{ flex: 1, paddingLeft: 16 }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                    <Text
                                        style={[styles.measureFieldLabel, { flex: 1, marginBottom: 0, paddingRight: 8 }]}
                                        numberOfLines={1}
                                        ellipsizeMode="tail"
                                    >
                                        {item.title}
                                    </Text>
                                    {item.isCustom ? (
                                        <TouchableOpacity
                                            style={{ padding: 4 }}
                                            onPress={() => setMenuActiveIndex(menuActiveIndex === index ? null : index)}
                                        >
                                            <MoreVertical size={20} color={Colors.textSecondary} />
                                        </TouchableOpacity>
                                    ) : (
                                        <TouchableOpacity
                                            style={{ padding: 4 }}
                                            onPress={() => handleRemoveMeasurement(item)}
                                        >
                                            <X size={18} color={Colors.danger} />
                                        </TouchableOpacity>
                                    )}
                                </View>
                                <TextInput
                                    style={styles.measureValueField}
                                    keyboardType="decimal-pad"
                                    value={state.currentOutfit.measurements?.[item.title] || ''}
                                    onChangeText={(val) => updateMeasurement(item.title, val)}
                                />
                            </View>

                            {menuActiveIndex === index && (
                                <View style={styles.measureMenuPopover}>
                                    <TouchableOpacity
                                        style={styles.measureMenuItem}
                                        onPress={() => onEditStart(item)}
                                    >
                                        <SquarePen size={18} color={Colors.textPrimary} />
                                        <Text style={styles.measureMenuText}>Edit</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.measureMenuItem}
                                        onPress={() => handleDeleteMeasurement(item)}
                                    >
                                        <Trash2 size={18} color={Colors.danger} />
                                        <Text style={[styles.measureMenuText, { color: Colors.danger }]}>Delete</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                    ))}

                    {loadingMore && (
                        <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                            <ActivityIndicator color={Colors.primary} />
                        </View>
                    )}
                </KeyboardAwareScrollView>
            )}

            <OrderMeasurementSelectionModal
                visible={selectModalVisible}
                outfitName={state.currentOutfit.type || 'Outfit'}
                onClose={() => {
                    setSelectModalVisible(false);
                    setPendingNewMeasurements([]);
                    setEditingItem(null);
                }}
                measurements={[
                    ...pendingNewMeasurements.filter(p =>
                        !measurementList.some(m => m.id === p.id || m.title?.toLowerCase() === p.title?.toLowerCase())
                    ),
                    ...measurementList
                ]}
                loading={loading}
                loadingMore={loadingMore}
                onConfirm={handleConfirmSelection}
                onDeleteCustom={handleDeleteMeasurement}
                onAdd={handleAddNewMeasurement}
                initialData={editingItem}
                currentSection={state.currentOutfit.gender}
                sections={sections}
                onSearch={(term) => {
                    if (state.currentOutfit.outfitId && activeSectionId && term !== measurementSearchTerm) {
                        setMeasurementSearchTerm(term);
                        setMeasurementPage(1);
                        dispatch(getMeasurementsAction({
                            outfitId: state.currentOutfit.outfitId,
                            sectionId: activeSectionId,
                            page: 1,
                            search: term
                        }));
                    }
                }}
                onLoadMore={() => {
                    if (measurementsHasMore && !loadingMore && state.currentOutfit.outfitId && activeSectionId) {
                        const nextPage = measurementPage + 1;
                        setMeasurementPage(nextPage);
                        dispatch(getMeasurementsAction({
                            outfitId: state.currentOutfit.outfitId,
                            sectionId: activeSectionId,
                            page: nextPage,
                            search: measurementSearchTerm
                        }));
                    }
                }}
            />

            {/* History Modal */}
            <Modal
                visible={historyVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setHistoryVisible(false)}
            >
                <TouchableOpacity
                    style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
                    activeOpacity={1}
                    onPress={() => setHistoryVisible(false)}
                >
                    <TouchableOpacity
                        activeOpacity={1}
                        style={{
                            backgroundColor: Colors.white,
                            borderTopLeftRadius: 24,
                            borderTopRightRadius: 24,
                            paddingBottom: 40,
                            maxHeight: '60%',
                            width: '100%',
                            ...Shadow.large
                        }}
                    >
                        <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}>
                            <View style={{ width: 40, height: 4, backgroundColor: '#E5E7EB', borderRadius: 2, alignSelf: 'center', marginBottom: 12 }} />
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Text style={{ fontFamily: 'Inter-Bold', fontSize: 18, color: Colors.textPrimary }}>Measurement History</Text>
                                <TouchableOpacity onPress={() => setHistoryVisible(false)} style={{ padding: 4 }}>
                                    <X size={24} color={Colors.textSecondary} />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={{ padding: 16 }}>
                            <View style={{ flexDirection: 'row', marginBottom: 12, paddingHorizontal: 4 }}>
                                <View style={{ flex: 1.2 }}>
                                    <Text style={styles.tableHeadText}>Date</Text>
                                </View>
                                <View style={{ flex: 0.8 }}>
                                    <Text style={styles.tableHeadText}>Type</Text>
                                </View>
                                <View style={{ width: 64, alignItems: 'center' }}>
                                    <Text style={styles.tableHeadText}>Action</Text>
                                </View>
                            </View>

                            <ScrollView
                                style={{ maxHeight: 300 }}
                                onMomentumScrollEnd={(e) => {
                                    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
                                    const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 20;
                                    if (isCloseToBottom) {
                                        handleLoadMoreHistory();
                                    }
                                }}
                            >
                                {historyData.length > 0 ? (
                                    sortedHistory.map((item) => (
                                        <View key={item.id} style={styles.tableRow}>
                                            <View style={{ flex: 1.2 }}>
                                                <Text style={styles.tableCellDate}>{formatDisplayDate(item.date)}</Text>
                                            </View>
                                            <View style={{ flex: 0.8 }}>
                                                <Text style={styles.tableCellText}>{item.outfit_name || item.type}</Text>
                                            </View>
                                            <View style={{ width: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                                                <TouchableOpacity
                                                    style={{
                                                        paddingHorizontal: 12,
                                                        paddingVertical: 6,
                                                        backgroundColor: Colors.primary,
                                                        borderRadius: 6,
                                                    }}
                                                    onPress={() => handleViewHistoryEntry(item)}
                                                >
                                                    <Text style={{ color: 'white', fontFamily: 'Inter-SemiBold', fontSize: 13 }}>View</Text>
                                                </TouchableOpacity>
                                                {/* <TouchableOpacity
                                                    style={{
                                                        padding: 8,
                                                        backgroundColor: '#FEF2F2',
                                                        borderRadius: 8,
                                                    }}
                                                    onPress={() => deleteHistoryItem(item.id)}
                                                >
                                                    <Trash2 size={14} color={Colors.danger} />
                                                </TouchableOpacity> */}
                                            </View>

                                        </View>
                                    ))
                                ) : !loading && (
                                    <View style={{ padding: 20, alignItems: 'center' }}>
                                        <Text style={{ color: Colors.textSecondary }}>No history available.</Text>
                                    </View>
                                )}
                                {loading && historyPage === 1 && (
                                    <View style={{ padding: 20, alignItems: 'center' }}>
                                        <ActivityIndicator color={Colors.primary} />
                                    </View>
                                )}
                                {loadingMore && (
                                    <View style={{ paddingVertical: 10, alignItems: 'center' }}>
                                        <ActivityIndicator size="small" color={Colors.primary} />
                                    </View>
                                )}
                            </ScrollView>
                        </View>
                    </TouchableOpacity>
                </TouchableOpacity>
            </Modal>

            <MeasurementHistoryDetailModal
                visible={historyDetailsVisible}
                onClose={() => setHistoryDetailsVisible(false)}
                historyItem={selectedHistoryItem}
                onApply={handleApplyFromDetail}
                getMeasurementImage={getMeasurementImage}
                customerName={state.selectedCustomer?.name || state.customerName}
                historyDetail={historyDetail}
                loading={detailLoading}
            />

            <BottomConfirmationSheet
                visible={deleteSheetVisible}
                onClose={() => {
                    pendingDeleteActionRef.current = null;
                    setDeleteSheetVisible(false);
                }}
                onConfirm={handleConfirmDelete}
                title={deleteSheetConfig.title}
                description={deleteSheetConfig.description}
                confirmText={deleteSheetConfig.confirmText}
                type="danger"
            />
        </View>
    );
};
// --- New Components ---

const OrderMeasurementSelectionModal = ({ 
    visible, outfitName, onClose, measurements, loading, loadingMore, 
    onLoadMore, onSearch, onConfirm, onDeleteCustom,
    onAdd, initialData, currentSection, sections 
}) => {
    const dispatch = useDispatch();
    const insets = useSafeAreaInsets();
    const [viewMode, setViewMode] = useState('list'); // 'list' or 'add'
    
    // Add Form State
    const [name, setName] = useState('');
    const [image, setImage] = useState(null);
    const availableSections = sections?.length > 0 ? sections.map(s => s.name) : ['Men', 'Women', 'Kids-Boy', 'Kids-Girl'];
    const [selectedSections, setSelectedSections] = useState([availableSections[0] || 'Men']);
    const [saveForLater, setSaveForLater] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [imageUploading, setImageUploading] = useState(false);
    const [imageDeleteLoading, setImageDeleteLoading] = useState(false);
    const [deleteImageSheetVisible, setDeleteImageSheetVisible] = useState(false);
    const [modalToast, setModalToast] = useState({ visible: false, message: '', type: 'error' });
    const modalToastTimerRef = useRef(null);
    const defaultSelectedSection = normalizeMeasurementSectionName(currentSection) || availableSections[0] || 'Men';

    // List State
    const [selectedIds, setSelectedIds] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const prevVisibleRef = useRef(false);
    const prevMeasurementsRef = useRef([]);

    // Initialize View Mode
    useEffect(() => {
        if (visible) {
            setViewMode(initialData ? 'add' : 'list');
        }
    }, [visible, initialData]);

    const showModalToast = useCallback((message, type = 'error', duration = 4000) => {
        if (modalToastTimerRef.current) clearTimeout(modalToastTimerRef.current);
        setModalToast({ visible: true, message, type });
        modalToastTimerRef.current = setTimeout(() => {
            setModalToast(prev => ({ ...prev, visible: false }));
            modalToastTimerRef.current = null;
        }, duration);
    }, []);

    // Form Effects
    useEffect(() => {
        if (visible && initialData) {
            setName(initialData.title || '');
            setImage(initialData.img || null);
            setSelectedSections(Array.isArray(initialData.sections) && initialData.sections.length > 0 ? initialData.sections : [defaultSelectedSection]);
            setSaveForLater(!!initialData.saveForLater);
        } else if (visible && !initialData) {
            setName('');
            setImage(null);
            setSelectedSections([defaultSelectedSection]);
            setSaveForLater(false);
        }
    }, [visible, initialData, defaultSelectedSection, viewMode]);

    useEffect(() => {
        if (!visible) {
            setSubmitting(false);
            setImageUploading(false);
            setImageDeleteLoading(false);
            setDeleteImageSheetVisible(false);
            setModalToast({ visible: false, message: '', type: 'error' });
            if (modalToastTimerRef.current) clearTimeout(modalToastTimerRef.current);
        }
    }, [visible]);

    // List Effects
    useEffect(() => {
        if (visible && viewMode === 'list') {
            if (!prevVisibleRef.current) {
                setSelectedIds(measurements.filter(m => m.isSelected).map(m => m.id));
            } else {
                const newItems = measurements.filter(m => !prevMeasurementsRef.current.find(old => old.id === m.id));
                let nextSelectedIds = [...selectedIds];
                
                if (newItems.length > 0) {
                    const newIdsToSelect = newItems.filter(m => m.isSelected).map(m => m.id);
                    if (newIdsToSelect.length > 0) {
                        nextSelectedIds = [...new Set([...nextSelectedIds, ...newIdsToSelect])];
                    }
                }
                
                const validIds = new Set(measurements.map(m => m.id));
                const finalSelectedIds = nextSelectedIds.filter(id => validIds.has(id));
                
                if (finalSelectedIds.length !== selectedIds.length) {
                    setSelectedIds(finalSelectedIds);
                }
            }
        } else if (prevVisibleRef.current && !visible) {
            setSearchQuery('');
        }
        
        prevVisibleRef.current = visible;
        prevMeasurementsRef.current = measurements || [];
    }, [measurements, visible, selectedIds, viewMode]);

    const toggleMeasurement = (id) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    useEffect(() => {
        if (onSearch && viewMode === 'list') {
            const timer = setTimeout(() => onSearch(searchQuery), 500);
            return () => clearTimeout(timer);
        }
    }, [searchQuery, onSearch, viewMode]);

    const filteredMeasurements = measurements.filter(m =>
        (m.title || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Form Actions
    const pickImage = () => {
        if (submitting || imageUploading || imageDeleteLoading) return;
        launchImageLibrary({ mediaType: 'photo', quality: 1 }, async (response) => {
            if (response.didCancel) return;
            if (response.errorCode) return showModalToast(response.errorMessage || 'Failed to pick image', 'error');
            if (response.assets?.length > 0) {
                const localUri = response.assets[0]?.uri;
                try {
                    setImageUploading(true);
                    const uploadResult = await dispatch(uploadImageAction({
                        uri: localUri,
                        type: response.assets[0]?.type || 'image/jpeg',
                        name: response.assets[0]?.fileName || `measurement_${Date.now()}.jpg`,
                        key_name: 'measurements',
                    })).unwrap();
                    const remoteImageUrl = getUploadedImageUrl(uploadResult) || '';
                    setImage(remoteImageUrl);
                    showModalToast('Image uploaded successfully', 'success');
                } catch (error) {
                    showModalToast(error?.message || error?.error || 'Failed to upload', 'error');
                } finally {
                    setImageUploading(false);
                }
            }
        });
    };

    const confirmDeleteImage = async () => {
        if (!image) return setDeleteImageSheetVisible(false);
        try {
            setImageDeleteLoading(true);
            if (isRemoteImageUrl(image)) {
                const deleteEndpoint = getUploadDeleteEndpoint(image);
                const authToken = await getAuthToken(store.getState);
                await axios.delete(deleteEndpoint, { headers: { accept: '*/*', ...(authToken ? { Authorization: authToken } : {}) } });
            }
            setImage(null);
            setDeleteImageSheetVisible(false);
            showModalToast('Image removed', 'success');
        } catch (error) {
            showModalToast(error?.message || 'Failed to remove image', 'error');
        } finally {
            setImageDeleteLoading(false);
        }
    };

    const handleAdd = async () => {
        if (submitting || imageUploading || imageDeleteLoading) return;
        if (!name.trim()) return showModalToast('Please enter measurement name', 'error');
        try {
            setSubmitting(true);
            const addedId = await onAdd({ title: name, img: image, saveForLater, sections: selectedSections }, { showInlineToast: showModalToast });
            if (addedId !== false) {
                if (typeof addedId === 'string' || typeof addedId === 'number') {
                    setSelectedIds(prev => [...new Set([...prev, addedId.toString()])]);
                }
                setName('');
                setImage(null);
                setSaveForLater(false);
                setSelectedSections([defaultSelectedSection]);
                // Close edit mode if it was editing
                if (initialData) {
                    onClose();
                } else {
                    setViewMode('list');
                }
            }
        } finally {
            setSubmitting(false);
        }
    };

    if (!visible) return null;

    return (
        <Modal transparent visible={visible} animationType="slide">
            <View style={styles.modalOverlay}>
                <View style={[styles.drawerMeasurementContent, viewMode === 'add' && { height: '85%' }]}>
                    
                    {/* Toast Overlay */}
                    {modalToast.visible && (
                        <View pointerEvents="none" style={[styles.measurementModalToastWrapper, { top: Math.max(insets.top + 12, 20), zIndex: 999 }]}>
                            <View style={[styles.measurementModalToast, modalToast.type === 'success' ? styles.measurementModalToastSuccess : styles.measurementModalToastError]}>
                                <Text style={styles.measurementModalToastText}>{modalToast.message}</Text>
                            </View>
                        </View>
                    )}

                    <View style={styles.modalHeader}>
                        <View style={{ flex: 1, marginRight: 10 }}>
                            <Text numberOfLines={2} style={styles.modalTitle}>
                                {viewMode === 'add' ? (initialData ? 'Edit Measurement' : 'Add New Measurement') : `${outfitName} Measurements`}
                            </Text>
                            {viewMode === 'list' && (
                                <Text style={styles.drawerModalSubtitle}>{measurements.length} Measurement {measurements.length === 1 ? 'Item' : 'Items'}</Text>
                            )}
                        </View>
                        <TouchableOpacity onPress={onClose}>
                            <X size={24} color={Colors.textPrimary} />
                        </TouchableOpacity>
                    </View>

                    {viewMode === 'list' ? (
                        <>
                            <View style={styles.drawerSearchRow}>
                                <View style={styles.drawerSearchBarContainer}>
                                    <Search size={20} color={Colors.textSecondary} style={styles.drawerSearchIcon} />
                                    <TextInput
                                        style={styles.drawerSearchBar}
                                        placeholder="Search by measurement name"
                                        placeholderTextColor={Colors.textSecondary}
                                        value={searchQuery}
                                        onChangeText={setSearchQuery}
                                    />
                                    {searchQuery.length > 0 && (
                                        <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: 4 }}>
                                            <X size={16} color={Colors.textSecondary} />
                                        </TouchableOpacity>
                                    )}
                                </View>
                                <TouchableOpacity style={styles.drawerAddBtnSmall} onPress={() => setViewMode('add')}>
                                    <Plus size={24} color="white" />
                                </TouchableOpacity>
                            </View>

                            <FlatList
                                data={filteredMeasurements}
                                numColumns={2}
                                keyExtractor={item => item.id}
                                showsVerticalScrollIndicator={false}
                                contentContainerStyle={{ paddingBottom: 20 }}
                                columnWrapperStyle={{ justifyContent: 'space-between' }}
                                onEndReached={onLoadMore}
                                onEndReachedThreshold={0.5}
                                ListEmptyComponent={
                                    !loading ? (
                                        <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: "50%", width: '100%' }}>
                                            <Text style={{ fontFamily: 'Inter-Medium', color: Colors.textSecondary, fontSize: 15 }}>No measurements found</Text>
                                        </View>
                                    ) : null
                                }
                                ListFooterComponent={
                                    loadingMore ? (
                                        <View style={{ paddingVertical: 10, width: '100%', alignItems: 'center' }}>
                                            <ActivityIndicator color={Colors.primary} size="small" />
                                        </View>
                                    ) : null
                                }
                                renderItem={({ item }) => {
                                    const isSelected = selectedIds.includes(item.id);
                                    return (
                                        <TouchableOpacity style={styles.drawerMeasurementItem} onPress={() => toggleMeasurement(item.id)}>
                                            <View style={[styles.drawerCustomCheckbox, isSelected && styles.drawerCustomCheckboxActive]}>
                                                {isSelected && <Check size={12} color="white" strokeWidth={3} />}
                                            </View>
                                            {item.isCustom && onDeleteCustom && (
                                                <TouchableOpacity style={styles.drawerItemDeleteBtn} onPress={(e) => { e.stopPropagation(); onDeleteCustom(item); }}>
                                                    <Trash2 size={12} color={Colors.danger} />
                                                </TouchableOpacity>
                                            )}
                                            <View style={styles.drawerMeasurementImgContainer}>
                                                {item.img ? (
                                                    <Image source={typeof item.img === 'string' ? { uri: item.img } : item.img} style={styles.drawerMeasurementImage} resizeMode="contain" />
                                                ) : (
                                                    <Shirt size={40} color={Colors.textSecondary} />
                                                )}
                                            </View>
                                            <Text style={styles.drawerMeasurementLabel}>{item.title}</Text>
                                        </TouchableOpacity>
                                    );
                                }}
                            />

                            <View style={styles.drawerModalFooter}>
                                <TouchableOpacity style={styles.drawerConfirmBtn} onPress={() => onConfirm(selectedIds)}>
                                    <Text style={styles.drawerConfirmBtnText}>Confirm ({selectedIds.length} Selected)</Text>
                                    <ArrowRight size={20} color="white" />
                                </TouchableOpacity>
                            </View>
                        </>
                    ) : (
                        <>
                            <ScrollView showsVerticalScrollIndicator={false} style={{ paddingHorizontal: 16 }}>
                                <Text style={styles.inputLabel}>Upload Image</Text>
                                <TouchableOpacity
                                    style={[styles.uploadBox, (imageUploading || imageDeleteLoading) && { opacity: 0.7 }]}
                                    onPress={pickImage}
                                    disabled={imageUploading || imageDeleteLoading || submitting}
                                >
                                    {image ? (
                                        <View style={styles.previewBox}>
                                            <Image source={{ uri: image }} style={styles.previewImage} resizeMode="contain" />
                                            <TouchableOpacity
                                                style={styles.deleteImageBtn}
                                                onPress={() => { if (!imageUploading && !imageDeleteLoading && !submitting) setDeleteImageSheetVisible(true); }}
                                            >
                                                {imageDeleteLoading ? <ActivityIndicator size="small" color="white" /> : <Trash2 size={12} color="white" />}
                                            </TouchableOpacity>
                                        </View>
                                    ) : imageUploading ? (
                                        <View style={styles.uploadPlaceholder}>
                                            <ActivityIndicator size="small" color={Colors.primary} />
                                            <Text style={styles.uploadText}>Uploading...</Text>
                                        </View>
                                    ) : (
                                        <View style={styles.uploadPlaceholder}>
                                            <View style={styles.uploadIconWrap}><Upload size={24} color={Colors.primary} /></View>
                                            <Text style={styles.uploadText}>Click to Upload</Text>
                                        </View>
                                    )}
                                </TouchableOpacity>

                                <Text style={[styles.inputLabel, { marginTop: 24 }]}>Measurement Name</Text>
                                <TextInput
                                    style={styles.simpleInput}
                                    placeholder="Enter measurement name"
                                    value={name}
                                    onChangeText={setName}
                                    placeholderTextColor={Colors.textSecondary}
                                />

                                {!initialData && (
                                    <>
                                        <Text style={[styles.inputLabel, { marginTop: 24 }]}>Section</Text>
                                        <View style={styles.sectionRow}>
                                            {availableSections.map(section => {
                                                const isActive = selectedSections.includes(section);
                                                return (
                                                    <TouchableOpacity key={section} style={[styles.sectionChip, isActive && styles.sectionChipActive]} onPress={() => setSelectedSections(prev => prev.includes(section) ? prev.filter(s => s !== section) : [...prev, section])}>
                                                        <Text style={[styles.sectionChipText, isActive && styles.sectionChipTextActive]}>{section}</Text>
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </View>
                                    </>
                                )}
                                <View style={{ height: 40 }} />
                            </ScrollView>

                            <View style={styles.addOrderModalFooter}>
                                <TouchableOpacity style={styles.cancelLink} onPress={() => initialData ? onClose() : setViewMode('list')} disabled={submitting || imageUploading || imageDeleteLoading}>
                                    <Text style={styles.cancelLinkText}>{initialData ? 'Close' : 'Back to List'}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.addSubmitBtn, (submitting || imageUploading) && { opacity: 0.7 }]} onPress={handleAdd} disabled={submitting || imageUploading || imageDeleteLoading}>
                                    {submitting ? <ActivityIndicator size="small" color={Colors.white} /> : <Text style={styles.addSubmitBtnText}>Save</Text>}
                                </TouchableOpacity>
                            </View>

                            <BottomConfirmationSheet
                                visible={deleteImageSheetVisible}
                                onClose={() => { if (!imageDeleteLoading) setDeleteImageSheetVisible(false); }}
                                onConfirm={confirmDeleteImage}
                                title="Remove Image"
                                description="Are you sure you want to remove this image?"
                                confirmText="Delete"
                                cancelText="Cancel"
                                type="danger"
                                loading={imageDeleteLoading}
                            />
                        </>
                    )}
                </View>
            </View>
        </Modal>
    );
};



const MeasurementHistoryDetailModal = ({ visible, onClose, historyItem, onApply, getMeasurementImage, customerName, historyDetail, loading }) => {
    if (!visible || !historyItem) return null;

    const displayMeasurements = historyDetail?.measurements || [];
    const customer = historyDetail?.customer_details || { name: customerName };
    const outfit = historyDetail?.outfit_details?.[0] || { outfit_name: historyItem.outfit_name || historyItem.type };
    const order = historyDetail?.order_details || { order_date: historyItem.date };

    return (
        <Modal transparent visible={visible} animationType="slide">
            <View style={styles.addModalOverlay}>
                <TouchableOpacity 
                    style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }} 
                    activeOpacity={1} 
                    onPress={onClose} 
                />
                <View style={[styles.addOrderModalContent, { height: '85%' }]}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Measurement History</Text>
                        <TouchableOpacity onPress={onClose}>
                            <X size={24} color={Colors.textPrimary} />
                        </TouchableOpacity>
                    </View>

                    {loading ? (
                        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                            <ActivityIndicator size="large" color={Colors.primary} />
                        </View>
                    ) : (
                        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
                            <Text style={[styles.inputLabel, { color: Colors.textSecondary, marginBottom: 8, fontSize: 11 }]}>CUSTOMER DETAIL</Text>

                            <View style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                padding: 12,
                                backgroundColor: '#F8FAFC',
                                borderRadius: 12,
                                marginBottom: 24,
                                gap: 12
                            }}>
                                <View style={{
                                    width: 44,
                                    height: 44,
                                    borderRadius: 12,
                                    backgroundColor: '#EEF2FF',
                                    justifyContent: 'center',
                                    alignItems: 'center'
                                }}>
                                    <Text style={{ fontFamily: 'Inter-Bold', fontSize: 18, color: Colors.primary }}>
                                        {customer.name?.[0] || 'C'}
                                    </Text>
                                </View>
                                <View>
                                    <Text style={{ fontFamily: 'Inter-Bold', fontSize: 16, color: '#1E293B' }}>{customer.name}</Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                                        <Shirt size={12} color={Colors.textSecondary} />
                                        <Text style={{ fontSize: 12, color: Colors.textSecondary, fontFamily: 'Inter-Medium' }}>{outfit.outfit_name}</Text>
                                        <View style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#CBD5E1' }} />
                                        <Calendar size={12} color={Colors.textSecondary} />
                                        <Text style={{ fontSize: 12, color: Colors.textSecondary, fontFamily: 'Inter-Medium' }}>{formatDisplayDate(order.order_date)}</Text>
                                    </View>
                                </View>
                            </View>

                            <Text style={[styles.inputLabel, { color: Colors.textSecondary, marginBottom: 16, fontSize: 11 }]}>MEASUREMENTS (Inches)</Text>

                            {displayMeasurements.map((m, index) => (
                                <View key={m.measurement_id || index} style={[styles.measureItemContainer, { marginBottom: 12, backgroundColor: '#F8FAFC' }]}>
                                    <View style={styles.measureImgBox}>
                                        <Image
                                            source={getMeasurementImage(index)}
                                            style={styles.measureSmallImg}
                                            resizeMode="contain"
                                        />
                                    </View>
                                    <View style={{ flex: 1, paddingLeft: 16 }}>
                                        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 8 }}>
                                            <Text style={[styles.measureFieldLabel, { flex: 1, marginBottom: 0, textAlign: 'center', color: '#1E293B' }]}>{m.measurement_name}</Text>
                                        </View>
                                        <View style={[styles.measureValueField, { borderStyle: 'solid', borderBottomWidth: 0, height: 42, width: '100%', justifyContent: 'center', alignItems: 'center', backgroundColor: 'white' }]}>
                                            <Text style={{ fontFamily: 'Inter-Bold', fontSize: 16, color: '#1E293B' }}>
                                                {m.value}
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            ))}
                        </ScrollView>
                    )}

                    <View style={styles.addOrderModalFooter}>
                        <TouchableOpacity style={styles.cancelLink} onPress={onClose}>
                            <Text style={styles.cancelLinkText}>Close</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.addSubmitBtn} onPress={onApply}>
                            <Text style={styles.addSubmitBtnText}>Apply</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const StepMaterials = ({ state, onChange, onShowAlert, editOrderId }) => {
    const [selectionModalVisible, setSelectionModalVisible] = useState(false);
    const [quantityModalVisible, setQuantityModalVisible] = useState(false);
    const [selectedMaterialToQuantity, setSelectedMaterialToQuantity] = useState(null);
    const materialToastTimerRef = useRef(null);
    const [materialSheetToast, setMaterialSheetToast] = useState({
        visible: false,
        message: '',
    });

    const showMaterialSheetToast = useCallback((message) => {
        if (materialToastTimerRef.current) {
            clearTimeout(materialToastTimerRef.current);
        }

        setMaterialSheetToast({
            visible: true,
            message,
        });

        materialToastTimerRef.current = setTimeout(() => {
            setMaterialSheetToast({
                visible: false,
                message: '',
            });
            materialToastTimerRef.current = null;
        }, 3500);
    }, []);

    useEffect(() => {
        return () => {
            if (materialToastTimerRef.current) {
                clearTimeout(materialToastTimerRef.current);
            }
        };
    }, []);

    const calculateOutfitTotal = (materials, qty) => {
        const unitServices = state.currentOutfit.unitServices || {};
        const services = state.currentOutfit.services || [];
        
        let totalSrvCost = 0;
        for (let i = 0; i < qty; i++) {
            const srv = unitServices[i] || services;
            totalSrvCost += srv.reduce((sum, s) => sum + (Number(s.cost) || 0), 0);
        }
        
        const materialsCost = materials.reduce((sum, m) => sum + (Number(m.quantity) * (Number(m.sellingPrice) || 0)), 0);
        return totalSrvCost + (materialsCost * qty);
    };

    const removeMaterial = (id) => {
        const newMaterials = (state.currentOutfit.materials || []).filter(m => m.id !== id);

        // Recalculate total cost
        const outfitQty = state.currentOutfit.quantity || 1;
        const newTotalCost = calculateOutfitTotal(newMaterials, outfitQty);

        onChange({
            currentOutfit: {
                ...state.currentOutfit,
                materials: newMaterials,
                totalCost: newTotalCost
            }
        });
    };

    const updateMaterialQuantity = (id, val, isTyping = false) => {
        const qty = parseFloat(val) || 0;
        if (qty < 0) return;

        const material = (state.currentOutfit.materials || []).find(m => m.id === id);
        const outfitQty = state.currentOutfit.quantity || 1;
        if (material && (qty * outfitQty) > (material.numericStock || 0)) {
            showMaterialSheetToast(`Only ${material.currentStock} available in stock`);
            if (!isTyping) return; // Block button clicks but allow manual typing to prevent 'jump back'
        }
        const newMaterials = (state.currentOutfit.materials || []).map(m =>
            m.id === id ? { ...m, quantity: val } : m
        );

        // Recalculate total cost
        const newTotalCost = calculateOutfitTotal(newMaterials, outfitQty);

        onChange({
            currentOutfit: {
                ...state.currentOutfit,
                materials: newMaterials,
                totalCost: newTotalCost
            }
        });
    };

    const handleSelectMaterial = (material) => {
        const existing = (state.currentOutfit.materials || []).find(m => m.id === material.id);
        setSelectedMaterialToQuantity({
            ...material,
            quantity: existing ? existing.quantity : 1
        });
        setQuantityModalVisible(true);
    };

    const handleConfirmQuantity = (qty) => {
        if (!selectedMaterialToQuantity) return;
        const outfitQty = state.currentOutfit.quantity || 1;

        if ((qty * outfitQty) > (selectedMaterialToQuantity.numericStock || 0)) {
            showMaterialSheetToast(`Only ${selectedMaterialToQuantity.currentStock} available in stock`);
            return;
        }

        // Check if already in list
        const currentMaterials = state.currentOutfit.materials || [];
        const existingIdx = currentMaterials.findIndex(m => m.id === selectedMaterialToQuantity.id);
        let newMaterials = [...currentMaterials];

        if (existingIdx !== -1) {
            newMaterials[existingIdx].quantity = qty;
        } else {
            newMaterials.push({
                ...selectedMaterialToQuantity,
                quantity: qty
            });
        }

        // Recalculate total cost
        const newTotalCost = calculateOutfitTotal(newMaterials, outfitQty);

        onChange({
            currentOutfit: {
                ...state.currentOutfit,
                materials: newMaterials,
                totalCost: newTotalCost
            }
        });
        setQuantityModalVisible(false);
        setSelectedMaterialToQuantity(null);
    };

    return (
        <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
            {materialSheetToast.visible ? (
                <View
                    pointerEvents="none"
                    style={{
                        position: 'absolute',
                        top: 12,
                        left: 16,
                        right: 16,
                        zIndex: 999,
                        elevation: 999,
                    }}
                >
                    <View
                        style={{
                            borderRadius: 12,
                            paddingVertical: 14,
                            paddingHorizontal: 16,
                            backgroundColor: '#EF4444',
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 3 },
                            shadowOpacity: 0.2,
                            shadowRadius: 6,
                            elevation: 8,
                        }}
                    >
                        <Text style={{ color: '#FFFFFF', fontFamily: 'Inter-Medium', fontSize: 14 }} numberOfLines={2}>
                            {materialSheetToast.message}
                        </Text>
                    </View>
                </View>
            ) : null}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16 }}>
                <Text style={{ fontFamily: 'Inter-Bold', fontSize: 13, color: '#64748B', textTransform: 'uppercase' }}>
                    SELECTED ITEMS ({(state.currentOutfit.materials || []).length})
                </Text>
                <TouchableOpacity onPress={() => setSelectionModalVisible(true)}>
                    <Text style={{ fontFamily: 'Inter-Bold', fontSize: 14, color: Colors.primary }}>+ Add Material</Text>
                </TouchableOpacity>
            </View>

            <KeyboardAwareScrollView 
                contentContainerStyle={{ padding: 16, paddingBottom: 100, flexGrow: 1 }} 
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                enableOnAndroid={true}
                extraScrollHeight={100}
            >
                {(state.currentOutfit.materials || []).length > 0 ? (
                    (state.currentOutfit.materials || []).map((m) => (
                        <View key={m.id} style={styles.materialCard}>
                            <View style={{ flexDirection: 'row', gap: 16 }}>
                                <View style={styles.materialSmallImgBox}>
                                    {m.photo ? (
                                        <Image source={{ uri: m.photo }} style={{ flex: 1, width: '100%', height: '100%' }} resizeMode="cover" />
                                    ) : (
                                        <Layers size={32} color="#6366F1" />
                                    )}
                                </View>
                                <View style={{ flex: 1 }}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={{ fontFamily: 'Inter-Bold', fontSize: 16, color: '#111827', marginBottom: 2 }} numberOfLines={2}>{m.name}</Text>
                                            <Text style={{ fontFamily: 'Inter-Medium', fontSize: 12, color: '#64748B' }}>SKU : {m.sku}</Text>
                                        </View>
                                        <TouchableOpacity
                                            onPress={() => removeMaterial(m.id)}
                                            style={{
                                                width: 32,
                                                height: 32,
                                                borderRadius: 8,
                                                backgroundColor: '#FFF1F2',
                                                justifyContent: 'center',
                                                alignItems: 'center'
                                            }}
                                        >
                                            <Trash2 size={18} color="#F43F5E" />
                                        </TouchableOpacity>
                                    </View>

                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 }}>
                                        <View style={{ backgroundColor: '#F1F5F9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, alignSelf: 'flex-start' }}>
                                            <Text style={{ fontSize: 11, fontFamily: 'Inter-Bold', color: '#64748B' }}>{m.category || 'Fabric'}</Text>
                                        </View>
                                        {m.lowStock && (
                                            <View style={{ backgroundColor: '#FEE2E2', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, alignSelf: 'flex-start' }}>
                                                <Text style={{ fontSize: 11, fontFamily: 'Inter-Bold', color: '#EF4444' }}>LOW</Text>
                                            </View>
                                        )}
                                    </View>
                                </View>
                            </View>

                            <View style={{ height: 1, backgroundColor: '#F1F5F9', marginVertical: 16 }} />

                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                <View>
                                    <Text style={{ fontSize: 11, fontFamily: 'Inter-Bold', color: '#94A3B8', letterSpacing: 0.5 }}>STOCK</Text>
                                    <Text style={{ fontSize: 16, fontFamily: 'Inter-Bold', color: m.lowStock ? '#EF4444' : '#111827', marginTop: 2 }}>
                                        {m.currentStock}
                                    </Text>
                                </View>
                                <View style={{ alignItems: 'flex-end' }}>
                                    <Text style={{ fontSize: 11, fontFamily: 'Inter-Bold', color: '#94A3B8', letterSpacing: 0.5 }}>SELLING PRICE</Text>
                                    <Text style={{ fontSize: 16, fontFamily: 'Inter-Bold', color: '#111827', marginTop: 2 }}>
                                        ₹{(m.sellingPrice * (parseFloat(m.quantity) || 0)).toFixed(0)}
                                    </Text>
                                </View>
                            </View>

                            <View style={{
                                flexDirection: 'row',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                backgroundColor: '#F8FAFC',
                                padding: 10,
                                borderRadius: 14,
                                borderWidth: 1,
                                borderColor: '#E2E8F0'
                            }}>
                                <Text style={{ fontSize: 13, fontFamily: 'Inter-Bold', color: '#475569', marginLeft: 6 }}>{(m.isMeter || m.unit === 'm') ? 'ENTER METER' : 'ENTER QTY.'}</Text>
                                <View style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    backgroundColor: Colors.white,
                                    borderRadius: 12,
                                    padding: 4,
                                    borderWidth: 1,
                                    borderColor: '#E2E8F0',
                                    shadowColor: '#6366F1',
                                    shadowOffset: { width: 0, height: 3 },
                                    shadowOpacity: 0.08,
                                    shadowRadius: 8,
                                    elevation: 4
                                }}>
                                    {!(m.isMeter || m.unit === 'm') && (
                                        <TouchableOpacity
                                            style={{
                                                width: 32,
                                                height: 32,
                                                borderRadius: 8,
                                                backgroundColor: '#F1F0FF',
                                                justifyContent: 'center',
                                                alignItems: 'center'
                                            }}
                                            onPress={() => updateMaterialQuantity(m.id, (parseFloat(m.quantity) || 0) - 1, false)}
                                        >
                                            <Minus size={18} color="#6366F1" strokeWidth={3} />
                                        </TouchableOpacity>
                                    )}
                                    <TextInput
                                        style={{
                                            width: (m.isMeter || m.unit === 'm') ? 100 : 60,
                                            textAlign: 'center',
                                            fontFamily: 'Inter-Bold',
                                            fontSize: 18,
                                            color: '#111827',
                                            paddingHorizontal: 8
                                        }}
                                        value={String(m.quantity ?? 0)}
                                        keyboardType="decimal-pad"
                                        onChangeText={(val) => updateMaterialQuantity(m.id, val, true)}
                                    />
                                    {!(m.isMeter || m.unit === 'm') && (
                                        <TouchableOpacity
                                            style={{
                                                width: 32,
                                                height: 32,
                                                borderRadius: 8,
                                                backgroundColor: '#F1F0FF',
                                                justifyContent: 'center',
                                                alignItems: 'center'
                                            }}
                                            onPress={() => updateMaterialQuantity(m.id, (parseFloat(m.quantity) || 0) + 1, false)}
                                        >
                                            <Plus size={18} color="#6366F1" strokeWidth={3} />
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>
                        </View>
                    ))
                ) : (
                    <View style={{ flex: 1, padding: 60, alignItems: 'center', justifyContent: 'center' }}>
                        <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
                            <Layers size={32} color="#CBD5E1" />
                        </View>
                        <Text style={{ fontFamily: 'Inter-Bold', fontSize: 16, color: '#64748B' }}>No Materials Selected</Text>
                        <Text style={{ fontFamily: 'Inter-Medium', fontSize: 13, color: '#94A3B8', textAlign: 'center', marginTop: 4 }}>
                            Click on '+ Add Material' to select materials for this order
                        </Text>
                    </View>
                )}
            </KeyboardAwareScrollView>

            <MaterialSelectionModal
                visible={selectionModalVisible}
                onClose={() => setSelectionModalVisible(false)}
                onSelect={handleSelectMaterial}
                selectedIds={(state.currentOutfit.materials || []).map(m => m.id)}
                gender={state.currentOutfit.gender}
            />

            <AddMaterialQuantityModal
                visible={quantityModalVisible}
                onClose={() => {
                    setQuantityModalVisible(false);
                    setSelectedMaterialToQuantity(null);
                }}
                material={selectedMaterialToQuantity}
                onConfirm={handleConfirmQuantity}
                onShowError={showMaterialSheetToast}
            />
        </View>
    );
};



const MaterialSelectionModal = ({ visible, onClose, onSelect, selectedIds, gender }) => {
    const [materials, setMaterials] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [paginationLoading, setPaginationLoading] = useState(false);
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
    const { showToast } = useToast();

    const fetchMaterials = useCallback(async (pageNo = 1, search = '') => {
        if (pageNo === 1) setLoading(true);
        else setPaginationLoading(true);

        try {
            const token = await getAuthToken(store.getState);
            const response = await axios.get(URL_INVENTORY_STOCK, {
                headers: { accept: 'application/json', Authorization: token },
                params: {
                    page: pageNo,
                    limit: 10,
                    item_type: 'MATERIAL',
                    sort_by: 'created_at',
                    sort_order: 'asc',
                    search: search || undefined
                },
            });

            if (response.data?.success) {
                const newData = (response.data.data || []).map(item => ({
                    id: item.item_id,
                    name: item.name,
                    sku: item.sku_code,
                    photo: item.image_url,
                    category: item.item_type,
                    currentStock: item.qty === null ? item.qty_meters : item.qty,
                    numericStock: item.qty === null ? (parseFloat(item.qty_meters) || 0) : (parseFloat(item.qty) || 0),
                    unit: item.qty === null ? 'm' : 'pcs',
                    sellingPrice: item.selling_price,
                    isMeter: item.qty === null,
                    rawQty: item.qty,
                    lowStock: item.low_stock,
                    raw: item
                }));

                setMaterials(prev => pageNo === 1 ? newData : [...prev, ...newData]);
                setPagination({
                    page: response.data.pagination?.page || pageNo,
                    totalPages: response.data.pagination?.totalPages || 1
                });
            }
        } catch (error) {
            console.error('Fetch materials error:', error);
            showToast('Failed to fetch materials', 'error');
        } finally {
            setLoading(false);
            setPaginationLoading(false);
        }
    }, [showToast]);

    useEffect(() => {
        if (visible) {
            setLoading(true);
            const timer = setTimeout(() => {
                fetchMaterials(1, searchQuery);
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [visible, searchQuery, fetchMaterials]);

    const handleLoadMore = () => {
        if (!paginationLoading && pagination.page < pagination.totalPages) {
            fetchMaterials(pagination.page + 1, searchQuery);
        }
    };

    if (!visible) return null;

    const renderItem = ({ item }) => {
        const isSelected = selectedIds.includes(item.id);
        const isLowStock = item.lowStock; // From API

        return (
            <View style={styles.materialSelectionCard}>
                <View style={{ flexDirection: 'row', gap: 14 }}>
                    <View style={styles.materialSmallImgBox}>
                        {item.photo ? (
                            <Image source={{ uri: item.photo }} style={{ flex: 1, width: '100%', height: '100%' }} resizeMode="cover" />
                        ) : (
                            <Layers size={32} color="#6366F1" />
                        )}
                    </View>

                    <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.materialName} numberOfLines={2}>{item.name}</Text>
                                <Text style={styles.skuText}>SKU : {item.sku}</Text>

                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
                                    <View style={styles.catBadge}>
                                        <Text style={styles.catBadgeText}>{item.category || 'Fabric'}</Text>
                                    </View>
                                    {isLowStock && (
                                        <View style={[styles.catBadge, { backgroundColor: '#FEE2E2', borderColor: '#FEE2E2' }]}>
                                            <Text style={[styles.catBadgeText, { color: '#EF4444' }]}>LOW</Text>
                                        </View>
                                    )}
                                </View>
                            </View>

                            <TouchableOpacity
                                style={[
                                    styles.selectBtn,
                                    {
                                        backgroundColor: isSelected ? '#F1F5F9' : '#6366F1',
                                        paddingHorizontal: isSelected ? 10 : 16,
                                        borderWidth: isSelected ? 1 : 0,
                                        borderColor: '#E2E8F0'
                                    }
                                ]}
                                onPress={() => onSelect(item)}
                            >
                                {isSelected ? (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                        <Check size={14} color="#475569" strokeWidth={3} />
                                        <Text style={[styles.selectBtnTextSelected, { color: '#475569' }]}>Selected</Text>
                                    </View>
                                ) : (
                                    <Text style={styles.selectBtnText}>Select</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                <View style={{ height: 1.5, backgroundColor: '#F7FAFC', marginVertical: 14 }} />

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 2 }}>
                    <View>
                        <Text style={styles.statLabel}>STOCK</Text>
                        <Text style={[styles.statValue, isLowStock && { color: '#EF4444' }]}>
                            {item.currentStock}
                        </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.statLabel}>SELLING PRICE</Text>
                        <Text style={styles.statValue}>₹{item.sellingPrice}</Text>
                    </View>
                </View>
            </View>
        );
    };

    return (
        <Modal transparent visible={visible} animationType="slide">
            <View style={styles.addModalOverlay}>
                <TouchableOpacity 
                    activeOpacity={1} 
                    onPress={onClose} 
                    style={StyleSheet.absoluteFill} 
                />
                <View style={[styles.addOrderModalContent, { height: '85%', paddingBottom: 0 }]}>
                        <View style={[styles.modalHeader, { padding: 20, marginBottom: 8 }]}>
                            <Text style={[styles.modalTitle, { fontSize: 20 }]}>Select Material Item</Text>
                            <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
                                <X size={24} color={Colors.textPrimary} />
                            </TouchableOpacity>
                        </View>

                        <View style={{ paddingHorizontal: 20, paddingBottom: 16 }}>
                            <View style={[styles.searchContainer, { backgroundColor: Colors.white, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 14 }]}>
                                <Search size={20} color="#94A3B8" />
                                <TextInput
                                    style={styles.searchInput}
                                    placeholder="Search material name or SKU"
                                    value={searchQuery}
                                    onChangeText={setSearchQuery}
                                    placeholderTextColor="#94A3B8"
                                />
                                {searchQuery.length > 0 && (
                                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                                        <X size={18} color="#94A3B8" />
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>

                        {loading ? (
                            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                                <ActivityIndicator size="large" color={Colors.primary} />
                            </View>
                        ) : (
                            <FlatList
                                style={{ flex: 1 }}
                                keyboardShouldPersistTaps="handled"
                                nestedScrollEnabled={true}
                                data={materials}
                                renderItem={renderItem}
                                keyExtractor={item => String(item.id)}
                                showsVerticalScrollIndicator={false}
                                contentContainerStyle={{ paddingHorizontal: 0, paddingBottom: 40 }}
                                onEndReached={handleLoadMore}
                                onEndReachedThreshold={0.5}
                                ListFooterComponent={() => paginationLoading ? (
                                    <View style={{ paddingVertical: 20 }}>
                                        <ActivityIndicator size="small" color={Colors.primary} />
                                    </View>
                                ) : null}
                                ListEmptyComponent={() => (
                                    <View style={{ padding: 60, alignItems: 'center' }}>
                                        <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
                                            <Search size={32} color="#CBD5E1" />
                                        </View>
                                        <Text style={{ fontFamily: 'Inter-Bold', fontSize: 16, color: '#64748B' }}>No materials found</Text>
                                        <Text style={{ fontFamily: 'Inter-Medium', fontSize: 13, color: '#94A3B8', textAlign: 'center', marginTop: 4, paddingHorizontal: 40 }}>
                                            Try searching with a different name or SKU
                                        </Text>
                                    </View>
                                )}
                            />
                        )}
                    </View>
            </View>
        </Modal>
    );
};

const AddMaterialQuantityModal = ({ visible, onClose, material, onConfirm, onShowError }) => {
    const [quantity, setQuantity] = useState('1');
    const quantityToastTimerRef = useRef(null);
    const [quantitySheetToast, setQuantitySheetToast] = useState({
        visible: false,
        message: '',
    });

    const showQuantitySheetToast = useCallback((message) => {
        if (quantityToastTimerRef.current) {
            clearTimeout(quantityToastTimerRef.current);
        }

        setQuantitySheetToast({
            visible: true,
            message,
        });

        quantityToastTimerRef.current = setTimeout(() => {
            setQuantitySheetToast({
                visible: false,
                message: '',
            });
            quantityToastTimerRef.current = null;
        }, 3500);
    }, []);

    useEffect(() => {
        if (visible && material) {
            setQuantity(String(material.quantity || '1'));
            setQuantitySheetToast({
                visible: false,
                message: '',
            });
        }
    }, [visible, material]);

    useEffect(() => {
        return () => {
            if (quantityToastTimerRef.current) {
                clearTimeout(quantityToastTimerRef.current);
            }
        };
    }, []);

    if (!visible || !material) return null;

    return (
        <Modal transparent visible={visible} animationType="fade">
            <TouchableOpacity 
                activeOpacity={1} 
                onPress={onClose} 
                style={styles.addModalOverlay}
            >
                {quantitySheetToast.visible ? (
                    <View
                        pointerEvents="none"
                        style={{
                            position: 'absolute',
                            top: 16,
                            left: 16,
                            right: 16,
                            zIndex: 999,
                            elevation: 999,
                        }}
                    >
                        <View
                            style={{
                                borderRadius: 12,
                                paddingVertical: 14,
                                paddingHorizontal: 16,
                                backgroundColor: '#EF4444',
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: 3 },
                                shadowOpacity: 0.2,
                                shadowRadius: 6,
                                elevation: 8,
                            }}
                        >
                            <Text style={{ color: '#FFFFFF', fontFamily: 'Inter-Medium', fontSize: 14 }} numberOfLines={2}>
                                {quantitySheetToast.message}
                            </Text>
                        </View>
                    </View>
                ) : null}
                <TouchableWithoutFeedback>
                    <View style={[styles.addOrderModalContent, { paddingHorizontal: 20, paddingVertical: 20, borderTopLeftRadius: 28, borderTopRightRadius: 28 }]}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <Text style={{ fontFamily: 'Inter-Bold', fontSize: 20, color: '#111827' }}>Add Material Quantity</Text>
                            <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
                                <X size={24} color="#111827" />
                            </TouchableOpacity>
                        </View>

                        <View style={{ height: 1, backgroundColor: '#F3F4F6', marginBottom: 20 }} />

                        {/* Material Card - matches Select Material Item card style */}
                        <View style={{
                            flexDirection: 'row',
                            gap: 14,
                            backgroundColor: '#FFFFFF',
                            borderRadius: 16,
                            borderWidth: 1,
                            borderColor: '#E2E8F0',
                            padding: 14,
                        }}>
                            <View style={{
                                width: 85,
                                height: 105,
                                borderRadius: 12,
                                backgroundColor: '#F0F3FF',
                                justifyContent: 'center',
                                alignItems: 'center',
                                overflow: 'hidden',
                                borderWidth: 1,
                                borderColor: '#E2E8F0',
                            }}>
                                {material.photo ? (
                                    <Image source={{ uri: material.photo }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                                ) : (
                                    <Layers size={32} color="#6366F1" />
                                )}
                            </View>
                            <View style={{ flex: 1, justifyContent: 'center' }}>
                                <Text style={{ fontFamily: 'Inter-Bold', fontSize: 16, color: '#111827', lineHeight: 22 }} numberOfLines={2}>{material.name}</Text>
                                <Text style={{ fontFamily: 'Inter-Medium', fontSize: 12, color: '#64748B', marginTop: 2 }}>SKU : {material.sku}</Text>
                                <View style={{ backgroundColor: '#F1F5F9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, alignSelf: 'flex-start', marginTop: 8, borderWidth: 1, borderColor: '#E2E8F0' }}>
                                    <Text style={{ fontSize: 11, fontFamily: 'Inter-Bold', color: '#64748B' }}>{material.category || 'Fabric'}</Text>
                                </View>
                            </View>
                        </View>

                        <View style={{ height: 1, backgroundColor: '#F1F5F9', marginVertical: 20 }} />

                        <View style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            backgroundColor: '#F8FAFC',
                            padding: 10,
                            borderRadius: 14,
                            borderWidth: 1,
                            borderColor: '#E2E8F0'
                        }}>
                            <Text style={{ fontSize: 13, fontFamily: 'Inter-Bold', color: '#475569', marginLeft: 6 }}>{(material.isMeter || material.unit === 'm') ? 'ENTER METER' : 'ENTER QTY.'}</Text>

                            <View style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                backgroundColor: Colors.white,
                                borderRadius: 12,
                                padding: 4,
                                shadowColor: '#6366F1',
                                shadowOffset: { width: 0, height: 3 },
                                shadowOpacity: 0.08,
                                shadowRadius: 8,
                                elevation: 4,
                                borderWidth: 1,
                                borderColor: '#E2E8F0'
                            }}>
                                {!(material.isMeter || material.unit === 'm') && (
                                    <TouchableOpacity
                                        style={{
                                            width: 38,
                                            height: 38,
                                            borderRadius: 10,
                                            backgroundColor: '#F1F0FF',
                                            justifyContent: 'center',
                                            alignItems: 'center'
                                        }}
                                        onPress={() => setQuantity(prev => String(Math.max(0, (parseFloat(prev) || 0) - 1)))}
                                    >
                                        <Minus size={20} color="#6366F1" strokeWidth={3} />
                                    </TouchableOpacity>
                                )}

                                <TextInput
                                    style={{
                                        width: (material.isMeter || material.unit === 'm') ? 100 : 60,
                                        textAlign: 'center',
                                        fontFamily: 'Inter-Bold',
                                        fontSize: 18,
                                        color: '#111827',
                                        paddingHorizontal: 8
                                    }}
                                    value={quantity}
                                    placeholder="0"
                                    placeholderTextColor="#94A3B8"
                                    keyboardType="numeric"
                                    onChangeText={setQuantity}
                                />

                                {!(material.isMeter || material.unit === 'm') && (
                                    <TouchableOpacity
                                        style={{
                                            width: 38,
                                            height: 38,
                                            borderRadius: 10,
                                            backgroundColor: '#F1F0FF',
                                            justifyContent: 'center',
                                            alignItems: 'center'
                                        }}
                                        onPress={() => {
                                            const nextQty = (parseFloat(quantity) || 0) + 1;
                                            if (nextQty > (material.numericStock || 0)) {
                                                showQuantitySheetToast(`Only ${material.currentStock} available in stock`);
                                                return;
                                            }
                                            setQuantity(String(nextQty));
                                        }}
                                    >
                                        <Plus size={20} color="#6366F1" strokeWidth={3} />
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>

                        <View style={{ flexDirection: 'row', gap: 12, marginTop: 24 }}>
                            <TouchableOpacity
                                style={{
                                    flex: 1,
                                    height: 52,
                                    backgroundColor: '#F1F5F9',
                                    borderRadius: 14,
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    borderWidth: 1,
                                    borderColor: '#E2E8F0',
                                }}
                                onPress={onClose}
                            >
                                <Text style={{ fontFamily: 'Inter-Bold', fontSize: 15, color: '#374151' }}>Cancel</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={{
                                    flex: 1,
                                    height: 52,
                                    backgroundColor: '#6366F1',
                                    borderRadius: 14,
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                }}
                                onPress={() => {
                                    const qty = parseFloat(quantity);
                                    if (!quantity || isNaN(qty) || qty <= 0) {
                                        showQuantitySheetToast('Please enter a valid quantity');
                                        return;
                                    }
                                    if (qty > (material.numericStock || 0)) {
                                        showQuantitySheetToast(`Only ${material.currentStock} available in stock`);
                                        onShowError?.(`Only ${material.currentStock} available in stock`);
                                        return;
                                    }
                                    onConfirm(qty);
                                }}
                            >
                                <Text style={{ fontFamily: 'Inter-Bold', fontSize: 15, color: '#FFF' }}>Add Material</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </TouchableWithoutFeedback>
            </TouchableOpacity>
        </Modal>
    );
};

const Waveform = ({
    color = '#6366f1',
    count = 25,
    activeCount = count,
    heights: manualHeights = null,
    isLively = false,
    activeColor = '#6366f1',
    inactiveColor = 'rgba(99, 102, 241, 0.15)'
}) => {
    // Standard heights for playback (random but fixed-looking) if no manual heights provided
    const playbackHeights = [14, 22, 10, 32, 18, 14, 38, 20, 26, 12, 19, 14, 34, 17, 12, 30, 14, 28, 16, 24, 14, 20, 28, 16, 12, 18, 24, 14, 32];

    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3.2, justifyContent: 'center' }}>
            {[...Array(count)].map((_, i) => {
                const isActive = i < activeCount;
                const h = manualHeights ? (manualHeights[i] || 4) : (playbackHeights[i % playbackHeights.length] || 12);

                return (
                    <View
                        key={i}
                        style={{
                            width: 2.5, // Thinner bars for premium look
                            height: h,
                            backgroundColor: isActive ? activeColor : inactiveColor,
                            borderRadius: 1.5,
                            // Slight breathing for active bars ONLY if isLively
                            transform: [{
                                scaleY: isLively && isActive ? 1 + Math.sin(Date.now() * 0.005 + i * 0.5) * 0.15 : 1
                            }]
                        }}
                    />
                );
            })}
        </View>
    );
};

const formatTime = (seconds) => {
    const s = Math.floor(seconds || 0);
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

const AudioPlayer = ({ uri, duration, onShowAlert, onDelete }) => {
    const soundRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [totalDuration, setTotalDuration] = useState(duration || 0);
    const [currentTime, setCurrentTime] = useState(0);
    const [waveSeed, setWaveSeed] = useState(0);
    const progressInterval = useRef(null);

    useEffect(() => {
        if (duration > 0) setTotalDuration(duration);
    }, [duration]);

    useEffect(() => {
        return () => {
            if (progressInterval.current) clearInterval(progressInterval.current);
            soundRef.current?.release();
            soundRef.current = null;
        };
    }, []);

    useEffect(() => {
        let interval = null;
        if (isPlaying && soundRef.current) {
            interval = setInterval(() => {
                soundRef.current.getCurrentTime((seconds) => {
                    if (seconds >= 0) {
                        setCurrentTime(seconds);
                        setWaveSeed(s => (s + 1) % 100);

                        const d = totalDuration || soundRef.current.getDuration();
                        if (d > 0) {
                            if (totalDuration <= 0) setTotalDuration(d);
                            setProgress(Math.min(seconds / d, 1));
                        }
                    }
                });
            }, 150); // Slower, more premium animation speed during playback
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isPlaying, totalDuration]);

    const playSound = async () => {
        try {
            if (soundRef.current) {
                if (isPlaying) {
                    soundRef.current.pause();
                    setIsPlaying(false);
                } else {
                    if (progress >= 0.99) {
                        soundRef.current.setCurrentTime(0);
                        setProgress(0);
                        setCurrentTime(0);
                    }
                    setIsPlaying(true);
                    soundRef.current.play((success) => {
                        setIsPlaying(false);
                        if (success) {
                            setProgress(1);
                            setCurrentTime(totalDuration);
                        } else {
                            // If it failed to play, reset play state
                            setIsPlaying(false);
                        }
                    });
                }
            } else {
                // First play load
                const sound = new Sound(uri, '', (error) => {
                    if (error) {
                        onShowAlert?.('Error', 'Audio failed to load');
                        setIsPlaying(false);
                        return;
                    }
                    const d = sound.getDuration();
                    if (d > 0) setTotalDuration(d);

                    soundRef.current = sound;
                    setIsPlaying(true);

                    sound.play((success) => {
                        setIsPlaying(false);
                        if (success) {
                            setProgress(1);
                            setCurrentTime(d > 0 ? d : totalDuration);
                        }
                    });
                });
            }
        } catch (e) {
            console.log('Playback error', e);
            setIsPlaying(false);
        }
    };

    return (
        <View style={styles.recordedAudioPlayerBox}>
            <TouchableOpacity onPress={playSound} style={styles.audioPlayCircle} activeOpacity={0.8}>
                {isPlaying ? (
                    <Pause size={18} color="white" strokeWidth={3} fill="white" />
                ) : (
                    <Play size={18} color="white" fill="white" style={{ marginLeft: 2 }} />
                )}
            </TouchableOpacity>

            <View style={{ flex: 1, marginHorizontal: 12, alignItems: 'center', justifyContent: 'center' }}>
                <Waveform
                    count={24}
                    activeCount={Math.floor(progress * 24)}
                    activeColor="#6366F1"
                    inactiveColor="rgba(99, 102, 241, 0.15)"
                    isLively={isPlaying}
                />
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 52, borderLeftWidth: 1, borderLeftColor: 'rgba(30, 41, 59, 0.1)', paddingLeft: 8 }}>
                    <Text style={[styles.audioDurationText, { fontSize: 13, textAlign: 'left' }]} numberOfLines={1}>
                        {formatTime(currentTime)}
                    </Text>
                </View>

                <TouchableOpacity onPress={onDelete} style={{ padding: 4 }}>
                    <Trash2 size={24} color="#EF4444" />
                </TouchableOpacity>
            </View>
        </View>
    );
};

const StitchDetailsModal = ({ visible, title, content, onClose }) => {
    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <TouchableOpacity
                style={styles.modalOverlay}
                activeOpacity={1}
                onPress={onClose}
            >
                <TouchableOpacity
                    activeOpacity={1}
                    style={[styles.historyModalContent, { maxHeight: 400 }]} // Recycle history modal styles
                >
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>{title}</Text>
                        <TouchableOpacity onPress={onClose}>
                            <X size={24} color={Colors.textSecondary} />
                        </TouchableOpacity>
                    </View>
                    <ScrollView style={{ padding: 16 }}>
                        {content && content.length > 0 ? (
                            content.map((line, i) => (
                                <View key={i} style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }}>
                                    <Text style={{ fontFamily: 'Inter-Medium', color: Colors.textPrimary, fontSize: 14 }}>{line}</Text>
                                </View>
                            ))
                        ) : (
                            <Text style={{ color: Colors.textSecondary }}>No specific measurements available.</Text>
                        )}
                    </ScrollView>
                    <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: '#e5e7eb' }}>
                        <TouchableOpacity style={styles.primaryBtn} onPress={onClose}>
                            <Text style={styles.primaryBtnText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </TouchableOpacity>
        </Modal>
    );
};

const Step3Media = ({ state, onChange, onShowAlert }) => {
    const insets = useSafeAreaInsets();
    const window = useWindowDimensions();
    const [viewerVisible, setViewerVisible] = useState(false);
    const [editorVisible, setEditorVisible] = useState(false);
    const [isEditorLoading, setIsEditorLoading] = useState(false);
    const [sketchModalVisible, setSketchModalVisible] = useState(false);
    const [penWidth, setPenWidth] = useState({ min: 2, max: 4 });
    const [penColor, setPenColor] = useState('#000000');
    const [editingSketchIndex, setEditingSketchIndex] = useState(null);
    const [initialSketchData, setInitialSketchData] = useState(null);
    const [selectedImage, setSelectedImage] = useState(null);
    const [editImageBase64, setEditImageBase64] = useState(null);
    const signatureRef = useRef(null);
    const { showToast } = useToast();
    const [uploadingSection, setUploadingSection] = useState(null); // 'reference', 'sketches', 'material', 'measurement', 'audio'
    const isUploading = !!uploadingSection;
    const { user } = useAuth();
    const dispatch = useDispatch();

    // Audio related state
    const [isRecording, setIsRecording] = useState(false);
    const [isRecordingPaused, setIsRecordingPaused] = useState(false);
    const [audioDuration, setAudioDuration] = useState(0);
    const [recordingWaveHeights, setRecordingWaveHeights] = useState(new Array(25).fill(4));
    const timerRef = useRef(null);
    const waveIntervalRef = useRef(null);

    useEffect(() => {
        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
            if (waveIntervalRef.current) {
                clearInterval(waveIntervalRef.current);
                waveIntervalRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        if (isRecording && !isRecordingPaused) {
            timerRef.current = setInterval(() => {
                setAudioDuration(d => d + 1);
            }, 1000);
        } else {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        }
        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        };
    }, [isRecording, isRecordingPaused]);

    useEffect(() => {
        if (isRecording && !isRecordingPaused) {
            waveIntervalRef.current = setInterval(() => {
                setRecordingWaveHeights(prev => {
                    const newH = Math.floor(Math.random() * 28) + 6;
                    const next = [...prev.slice(1), newH];
                    return next;
                });
            }, 100);
        } else {
            if (waveIntervalRef.current) {
                clearInterval(waveIntervalRef.current);
                waveIntervalRef.current = null;
            }
        }
        return () => {
            if (waveIntervalRef.current) {
                clearInterval(waveIntervalRef.current);
                waveIntervalRef.current = null;
            }
        };
    }, [isRecording, isRecordingPaused]);

    const startRecording = async () => {
        if (isRecording) return;
        try {
            if (Platform.OS === 'android') {
                const { PermissionsAndroid } = require('react-native');
                const granted = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
                    {
                        title: 'Recording Permission',
                        message: 'Sewvee needs access to microphone',
                        buttonNeutral: 'Ask Me Later',
                        buttonNegative: 'Cancel',
                        buttonPositive: 'OK',
                    },
                );
                if (granted !== PermissionsAndroid.RESULTS.GRANTED) return;
            }

            const options = {
                sampleRate: 16000,
                channels: 1,
                bitsPerSample: 16,
                audioSource: 6,
                wavFile: 'recorded_audio.wav'
            };

            AudioRecord.init(options);
            AudioRecord.start();
            setIsRecording(true);
            setIsRecordingPaused(false);
            setAudioDuration(0);
            setRecordingWaveHeights(new Array(25).fill(4));
        } catch (error) {
            setIsRecording(false);
            onShowAlert?.('Error', 'Recording failed');
        }
    };

    const toggleRecordingPause = () => {
        setIsRecordingPaused(!isRecordingPaused);
    };

    const stopRecording = async () => {
        if (!isRecording) return;
        try {
            const audioFile = await AudioRecord.stop();
            setIsRecording(false);
            setIsRecordingPaused(false);

            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
            if (waveIntervalRef.current) {
                clearInterval(waveIntervalRef.current);
                waveIntervalRef.current = null;
            }

            if (audioFile) {
                const path = Platform.OS === 'android' ? `file://${audioFile}` : audioFile;

                setUploadingSection('audio');
                try {
                    const uploadResult = await dispatch(uploadImageAction({
                        uri: path,
                        type: 'audio/wav',
                        name: 'order_audio.wav',
                        key_name: 'order_audios'
                    })).unwrap();

                    const uploadedUrl = getUploadedImageUrl(uploadResult);

                    onChange({
                        currentOutfit: {
                            ...state.currentOutfit,
                            audioUri: uploadedUrl || path,
                            audioDuration: audioDuration
                        }
                    });
                    showToast(uploadResult.message || 'Audio instruction saved', 'success');
                } catch (error) {
                    console.error('Audio upload failed', error);
                    showToast('Failed to upload audio', 'error');
                } finally {
                    setUploadingSection(null);
                }
            }
        } catch (error) {
            console.error('Failed to stop recording', error);
        }
    };

    const handlePickImages = async (category) => {
        const options = {
            mediaType: 'photo',
            selectionLimit: 0,
            quality: 0.8,
        };

        launchImageLibrary(options, async (response) => {
            if (response.didCancel) return;
            if (response.errorCode) {
                showToast('Failed to pick image', 'error');
                return;
            }

            if (response.assets && response.assets.length > 0) {
                setUploadingSection(category);
                try {
                    const uploadedUrls = [];
                    let lastMessage = '';
                    for (const asset of response.assets) {
                        const uploadResult = await dispatch(uploadImageAction({
                            uri: asset.uri,
                            type: asset.type || 'image/jpeg',
                            name: asset.fileName || `photo_${Date.now()}.jpg`,
                            key_name: 'order_photos'
                        })).unwrap();

                        const url = getUploadedImageUrl(uploadResult);
                        if (url) {
                            uploadedUrls.push(url);
                            lastMessage = uploadResult.message;
                        }
                    }

                    const field = category === 'reference' ? 'images' :
                        category === 'measurement' ? 'measurementDressImages' :
                            category === 'material' ? 'materialImages' :
                                'sketches';

                    const currentImages = state.currentOutfit[field] || [];
                    onChange({
                        currentOutfit: {
                            ...state.currentOutfit,
                            [field]: [...currentImages, ...uploadedUrls],
                        },
                    });
                    if (uploadedUrls.length > 0) {
                        showToast(lastMessage || (uploadedUrls.length > 1 ? `${uploadedUrls.length} photos uploaded` : 'Photo uploaded successfully'), 'success');
                    }
                } catch (error) {
                    console.error('Image upload failed', error);
                    showToast('Failed to upload images', 'error');
                } finally {
                    setUploadingSection(null);
                }
            }
        });
    };

    const handleRemoveImage = (category, index) => {
        const field = category === 'reference' ? 'images' :
            category === 'measurement' ? 'measurementDressImages' :
                'materialImages';

        const currentImages = [...(state.currentOutfit[field] || [])];
        currentImages.splice(index, 1);
        onChange({
            currentOutfit: {
                ...state.currentOutfit,
                [field]: currentImages
            }
        });
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    const openViewer = (uri) => {
        setSelectedImage(uri);
        setViewerVisible(true);
    };



    const handleSketchOK = async (signature) => {
        const path = `${RNFS.DocumentDirectoryPath}/sketch_${Date.now()}.png`;
        try {
            const base64Code = signature.replace(/^data:image\/png;base64,/, '');
            await RNFS.writeFile(path, base64Code, 'base64');
            const finalPath = `file://${path}`;

            setUploadingSection('sketches');
            try {
                const uploadResult = await dispatch(uploadImageAction({
                    uri: finalPath,
                    type: 'image/png',
                    name: `sketch_${Date.now()}.png`,
                    key_name: 'order_photos'
                })).unwrap();

                const uploadedUrl = getUploadedImageUrl(uploadResult);

                if (editingSketchIndex !== null) {
                    const updatedSketches = [...(state.currentOutfit.sketches || [])];
                    updatedSketches[editingSketchIndex] = uploadedUrl || finalPath;
                    onChange({
                        currentOutfit: {
                            ...state.currentOutfit,
                            sketches: updatedSketches
                        }
                    });
                } else {
                    const newSketches = [...(state.currentOutfit.sketches || []), uploadedUrl || finalPath];
                    onChange({
                        currentOutfit: {
                            ...state.currentOutfit,
                            sketches: newSketches
                        }
                    });
                }
                showToast(uploadResult.message || 'Sketch saved successfully', 'success');
            } catch (error) {
                console.error('Sketch upload failed', error);
                showToast('Failed to upload sketch', 'error');
            } finally {
                setUploadingSection(null);
            }

            setSketchModalVisible(false);
            setEditingSketchIndex(null);
            setInitialSketchData(null);
        } catch (error) {
            console.error('Error saving sketch:', error);
            Alert.alert('Error', 'Failed to save sketch');
        }
    };

    const handleEditSketch = async (uri, index) => {
        try {
            const exists = await RNFS.exists(uri);
            if (!exists) {
                Alert.alert('Error', 'Sketch file not found.');
                return;
            }
            const base64 = await RNFS.readFile(uri, 'base64');
            setInitialSketchData(`data:image/png;base64,${base64}`);
            setEditingSketchIndex(index);
            setSketchModalVisible(true);
        } catch (e) {
            console.error("Failed to load sketch for editing", e);
        }
    };

    const handleDeleteSketch = (index) => {
        const currentSketches = [...(state.currentOutfit.sketches || [])];
        currentSketches.splice(index, 1);
        onChange({
            currentOutfit: {
                ...state.currentOutfit,
                sketches: currentSketches
            }
        });
    };

    const renderImageSection = (title, subLabel, category, images) => {
        const isListEmpty = !images || images.length === 0;

        return (
            <View style={styles.modernMediaCard}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={styles.modernCardTitle}>{title}</Text>
                    <Info size={16} color="#94A3B8" />
                </View>
                <Text style={styles.modernCardSubLabel}>{subLabel}</Text>

                <View style={styles.imageGrid}>
                    {images.map((uri, index) => (
                        <View key={index} style={styles.imagePreview}>
                            <TouchableOpacity style={{ flex: 1 }} onPress={() => openViewer(uri)}>
                                <Image source={{ uri: uri }} style={{ flex: 1, borderRadius: 12 }} resizeMode="cover" />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.removeImageBtn}
                                onPress={() => handleRemoveImage(category, index)}
                            >
                                <Trash2 size={14} color={Colors.white} />
                            </TouchableOpacity>
                        </View>
                    ))}

                    {isListEmpty ? (
                        <TouchableOpacity
                            style={styles.dashedUploadBox}
                            onPress={() => handlePickImages(category)}
                            disabled={isUploading}
                        >
                            {uploadingSection === category ? (
                                <ActivityIndicator size="small" color="#6366f1" />
                            ) : (
                                <View style={{ alignItems: 'center' }}>
                                    <View style={styles.purpleIconCircle}>
                                        <Upload size={22} color="#6366f1" />
                                    </View>
                                    <Text style={styles.purpleActionText}>Click to Upload</Text>
                                    <Text style={styles.selectMultipleText}>Select multiple photos</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity
                            style={[styles.addImageBtn, { borderColor: '#6366f1', height: 100, width: 100 }]}
                            onPress={() => handlePickImages(category)}
                            disabled={isUploading}
                        >
                            <Plus size={24} color="#6366f1" />
                            <Text style={[styles.addImageText, { color: '#6366f1' }]}>Add</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        );
    };

    return (
        <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
            <KeyboardAwareScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ padding: 16, paddingBottom: 400, gap: 16 }}
                enableOnAndroid={true}
                extraScrollHeight={130}
                keyboardShouldPersistTaps="handled"
            >
                {/* 0. Top Info Banner */}
                <View style={styles.topInfoBanner}>
                    <Info size={18} color="#6366f1" />
                    <Text style={styles.topInfoBannerText}>Upload JPG or PNG files (Max 30MB)</Text>
                </View>

                {/* Ask Customer to Upload Photos Toggle */}
                <View style={[styles.modernMediaCard, { paddingVertical: 16 }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View style={{ flex: 1, paddingRight: 16 }}>
                            <Text style={styles.modernCardTitle}>Ask Customer to Upload Photos</Text>
                            <Text style={[styles.modernCardSubLabel, { marginTop: 4, marginBottom: 0 }]}>
                                Request reference or inspiration photos from the customer via the customer app.
                            </Text>
                        </View>
                        <Switch
                            value={state.currentOutfit.requestedPhotosFromClient || false}
                            onValueChange={(value) => {
                                onChange({
                                    currentOutfit: {
                                        ...state.currentOutfit,
                                        requestedPhotosFromClient: value
                                    }
                                });
                            }}
                            trackColor={{ false: "#D1D5DB", true: "#6366f1" }}
                            thumbColor="#ffffff"
                        />
                    </View>
                </View>

                {/* 1. Reference Images */}
                {renderImageSection('Reference Images', 'Upload sample or inspiration images', 'reference', state.currentOutfit.images)}

                {/* 2. Draw Sketch */}
                <View style={styles.modernMediaCard}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={styles.modernCardTitle}>Draw Sketch</Text>
                        <Info size={16} color="#94A3B8" />
                    </View>
                    <Text style={styles.modernCardSubLabel}>Tap to open the full-screen drawing canvas</Text>

                    <View style={styles.imageGrid}>
                        <TouchableOpacity
                            style={styles.sketchActionBox}
                            onPress={() => {
                                setEditingSketchIndex(null);
                                setInitialSketchData(null);
                                setSketchModalVisible(true);
                            }}
                        >
                            <Pen size={20} color="#6366f1" />
                            <Text style={styles.sketchActionText}>Create</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.sketchActionBox}
                            onPress={() => handlePickImages('sketches')}
                            disabled={isUploading}
                        >
                            {uploadingSection === 'sketches' ? (
                                <ActivityIndicator size="small" color="#6366f1" />
                            ) : (
                                <>
                                    <Upload size={20} color="#6366f1" />
                                    <Text style={styles.sketchActionText}>Upload</Text>
                                </>
                            )}
                        </TouchableOpacity>

                        {(state.currentOutfit.sketches || []).map((uri, index) => (
                            <View key={index} style={[styles.imagePreview, { backgroundColor: Colors.white, borderWidth: 1, borderColor: '#F1F5F9' }]}>
                                <TouchableOpacity
                                    style={{ flex: 1 }}
                                    onPress={() => openViewer(uri)}
                                >
                                    <Image source={{ uri }} style={{ flex: 1, borderRadius: 12 }} resizeMode="contain" />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.removeImageBtn}
                                    onPress={() => handleDeleteSketch(index)}
                                >
                                    <Trash2 size={14} color={Colors.white} />
                                </TouchableOpacity>
                            </View>
                        ))}
                    </View>
                </View>

                {/* 3. Measurement Dress */}
                {state.currentOutfit.measurementDressGiven === 'Yes' && renderImageSection('Measurement Dress', 'Upload a well-fitting dress image.', 'measurement', state.currentOutfit.measurementDressImages)}

                {/* 4. Material Images */}
                {renderImageSection('Material Images', 'Upload photos of the materials/fabrics.', 'material', state.currentOutfit.materialImages)}

                {/* 5. Audio Instruction */}
                <View style={styles.modernMediaCard}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={styles.modernCardTitle}>Audio Instruction</Text>
                        <Info size={16} color="#94A3B8" />
                    </View>
                    <Text style={styles.modernCardSubLabel}>Record special instructions</Text>

                    {isRecording ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                            <View style={{
                                flex: 1,
                                flexDirection: 'row',
                                alignItems: 'center',
                                backgroundColor: '#EEF2FF',
                                borderRadius: 100,
                                height: 50,
                                paddingHorizontal: 20,
                                marginRight: 12
                            }}>
                                <View style={{ width: 45 }}>
                                    <Text style={{ fontFamily: 'Inter-Bold', fontSize: 13, color: '#1E293B' }}>{formatTime(audioDuration)}</Text>
                                </View>
                                <View style={{ flex: 1, alignItems: 'center' }}>
                                    <Waveform
                                        count={18}
                                        activeCount={18}
                                        heights={recordingWaveHeights}
                                        activeColor="#6366F1"
                                        isLively={!isRecordingPaused}
                                    />
                                </View>
                            </View>

                            <View style={{ flexDirection: 'row', gap: 10 }}>
                                <TouchableOpacity onPress={toggleRecordingPause} style={styles.recorderPauseBtn}>
                                    {isRecordingPaused ? (
                                        <Play size={20} color="#1E293B" fill="#1E293B" />
                                    ) : (
                                        <Pause size={20} color="#1E293B" fill="#1E293B" />
                                    )}
                                </TouchableOpacity>

                                <TouchableOpacity onPress={stopRecording} style={styles.recorderStopBtn}>
                                    <View style={{ width: 14, height: 14, backgroundColor: 'white', borderRadius: 2 }} />
                                </TouchableOpacity>
                            </View>
                        </View>
                    ) : state.currentOutfit.audioUri ? (
                        <View style={{ marginTop: 10 }}>
                            <Text style={styles.recordedSectionTitle}>Recorded Audio</Text>
                            <AudioPlayer
                                uri={state.currentOutfit.audioUri}
                                duration={state.currentOutfit.audioDuration}
                                onShowAlert={onShowAlert}
                                onDelete={() => onChange({
                                    currentOutfit: { ...state.currentOutfit, audioUri: null, audioDuration: 0 }
                                })}
                            />
                        </View>
                    ) : uploadingSection === 'audio' ? (
                        <View style={{ height: 52, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F1F5F9', borderRadius: 14 }}>
                            <ActivityIndicator size="small" color="#6366f1" />
                            <Text style={{ fontSize: 12, color: '#6366f1', fontFamily: 'Inter-Medium', marginTop: 4 }}>Uploading...</Text>
                        </View>
                    ) : (
                        <TouchableOpacity style={styles.modernRecordingBtn} onPress={startRecording} disabled={isUploading}>
                            <View style={styles.whiteMicBorderCircle}>
                                <Mic size={22} color="white" />
                            </View>
                            <Text style={styles.modernRecordingBtnText}>Start Recording</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* 6. Customer Notes */}
                <View style={styles.modernMediaCard}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <Text style={styles.modernCardTitle}>Customer Notes</Text>
                        <Info size={16} color="#94A3B8" />
                    </View>
                    <TextInput
                        style={styles.modernNoteInput}
                        multiline
                        scrollEnabled={false}
                        placeholder="Write special instructions..."
                        placeholderTextColor="#94A3B8"
                        value={state.currentOutfit.notes}
                        onChangeText={(val) => onChange({
                            currentOutfit: { ...state.currentOutfit, notes: val }
                        })}
                    />
                </View>
            </KeyboardAwareScrollView>

            {/* MODALS */}
            <Modal visible={sketchModalVisible} animationType="slide" onRequestClose={() => setSketchModalVisible(false)}>
                <View style={{ flex: 1, backgroundColor: '#fff' }}>
                    <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                        <TouchableOpacity onPress={() => setSketchModalVisible(false)} style={{ padding: 8 }}>
                            <X size={24} color={Colors.textPrimary} />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>{editingSketchIndex !== null ? 'Edit Sketch' : 'New Sketch'}</Text>
                        <TouchableOpacity onPress={() => signatureRef.current?.readSignature()} style={{ padding: 8 }}>
                            <Check size={24} color={Colors.primary} />
                        </TouchableOpacity>
                    </View>
                    <View style={{ flex: 1 }}>
                        <SignatureScreen
                            ref={signatureRef}
                            onOK={handleSketchOK}
                            descriptionText="Sketch here"
                            autoClear={false}
                            imageType="image/png"
                            dataURL={initialSketchData || undefined}
                            webStyle={`
                                .m-signature-pad--footer { display: none; margin: 0px; } 
                                body,html { width: 100%; height: 100%; background-color: #fff; }
                            `}
                        />
                        <View style={{ padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f0f0f0', flexDirection: 'row', justifyContent: 'space-between' }}>
                            <TouchableOpacity onPress={() => signatureRef.current?.undo()} style={{ padding: 10, backgroundColor: '#F3F4F6', borderRadius: 8 }}>
                                <Undo2 size={24} color={Colors.textPrimary} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => signatureRef.current?.clearSignature()} style={{ padding: 10, backgroundColor: '#FEE2E2', borderRadius: 8 }}>
                                <Trash2 size={24} color={Colors.danger} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => signatureRef.current?.readSignature()} style={{ backgroundColor: Colors.primary, paddingHorizontal: 24, borderRadius: 8, justifyContent: 'center' }}>
                                <Text style={{ color: 'white', fontFamily: 'Inter-Bold' }}>Save Sketch</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            <ImageView
                images={selectedImage ? [{ uri: selectedImage }] : []}
                imageIndex={0}
                visible={viewerVisible && !!selectedImage}
                onRequestClose={() => setViewerVisible(false)}
                backgroundColor={selectedImage?.toLowerCase().includes('sketch') ? '#FFFFFF' : '#000000'}
            />


        </View>
    );
};
const StepSummary = ({ state, onChange, onAddAnother, onDeleteItem, confirmDeleteItem, onEditItem, onShowAlert, onGoToStep, editItemIndex, editOrderId, onCreateOrder, loading }) => {
    // Explode quantity into individual items for display
    let unrolledItems = [];
    let currentOutfitHandled = false;
    state.cart.forEach((item, idx) => {
        // If this is the item being edited (via editItemIndex or ID match), render currentOutfit here to preserve order
        const isEditingThis = (editItemIndex !== undefined && idx === editItemIndex) || 
                            (state.currentOutfit.id && item.id === state.currentOutfit.id);

        if (isEditingThis && state.currentOutfit.type) {
            for (let q = 0; q < state.currentOutfit.quantity; q++) {
                const materialsTotal = (state.currentOutfit.materials || []).reduce((sum, m) => sum + (m.quantity * (m.sellingPrice || 0)), 0);
                const srv = (state.currentOutfit.unitServices && state.currentOutfit.unitServices[q]) 
                    ? state.currentOutfit.unitServices[q] 
                    : (q === 0 ? (state.currentOutfit.services || []) : []);
                const sTotal = srv.reduce((sum, s) => sum + s.cost, 0);
                const unitPrice = materialsTotal + sTotal;

                unrolledItems.push({
                    ...state.currentOutfit,
                    cartIndex: idx,
                    unitIndex: q,
                    isCurrent: true,
                    isExisting: true,
                    displayPrice: unitPrice
                });
            }
            currentOutfitHandled = true;
            return;
        }

        // Regular cart item
        for (let q = 0; q < item.quantity; q++) {
            const materialsTotal = (item.materials || []).reduce((sum, m) => sum + (m.quantity * (m.sellingPrice || 0)), 0);
            const srv = (item.unitServices && item.unitServices[q]) 
                ? item.unitServices[q] 
                : (q === 0 || !item.isExisting ? (item.services || []) : []);
            const sTotal = srv.reduce((sum, s) => sum + s.cost, 0);
            const unitPrice = materialsTotal + sTotal;

            unrolledItems.push({
                ...item,
                cartIndex: idx,
                unitIndex: q,
                isCurrent: false,
                isExisting: true,
                displayPrice: unitPrice
            });
        }
    });

    // If currentOutfit wasn't an edit of an existing item (e.g. adding a new outfit), add it at the end
    if (state.currentOutfit.type && !currentOutfitHandled) {
        for (let q = 0; q < state.currentOutfit.quantity; q++) {
            const materialsTotal = (state.currentOutfit.materials || []).reduce((sum, m) => sum + (m.quantity * (m.sellingPrice || 0)), 0);
            const srv = (state.currentOutfit.unitServices && state.currentOutfit.unitServices[q]) 
                ? state.currentOutfit.unitServices[q] 
                : (state.currentOutfit.services || []);
            const sTotal = srv.reduce((sum, s) => sum + s.cost, 0);
            const unitPrice = materialsTotal + sTotal;

            unrolledItems.push({
                ...state.currentOutfit,
                isCurrent: true,
                isExisting: false,
                unitIndex: q,
                displayPrice: unitPrice
            });
        }
    }

    const [expandedIndices, setExpandedIndices] = useState(unrolledItems.map((_, i) => i));
    const [summaryExpanded, setSummaryExpanded] = useState(false);

    // Auto-expand all when unrolledItems changes length (e.g. item added)
    useEffect(() => {
        setExpandedIndices(unrolledItems.map((_, i) => i));
    }, [unrolledItems.length]);

    // Addon Drawer State
    const [addonDrawerVisible, setAddonDrawerVisible] = useState(false);
    const [addonServiceName, setAddonServiceName] = useState('');
    const [addonPrice, setAddonPrice] = useState('');
    const [targetItemIdx, setTargetItemIdx] = useState(null);
    const addonDrawerScrollRef = useRef(null);

    const calculateSubtotal = () => {
        // Subtotal should still be the sum of all cart items + current item
        // But since we exploded them, we can sum the displayPrice of unrolled items
        return unrolledItems.reduce((sum, item) => sum + (Number(item.displayPrice) || 0), 0);
    };

    const subtotal = calculateSubtotal();

    // Discount Calculation
    const discountVal = state.isDiscountEnabled ? (Number(state.discountValue) || 0) : 0;
    const discountAmt = state.discountType === '%' ? (subtotal * discountVal / 100) : discountVal;

    // Final Calculation
    const advanceAmt = Number(state.paymentInput) || 0;
    const prevAdvance = Number(state.existingAdvance) || 0;
    const totalBalance = Math.max(0, subtotal - discountAmt - (advanceAmt + prevAdvance));

    const toggleAccordion = (index) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        if (expandedIndices.includes(index)) {
            setExpandedIndices(expandedIndices.filter(i => i !== index));
        } else {
            setExpandedIndices([...expandedIndices, index]);
        }
    };

    const toggleSummaryExpansion = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setSummaryExpanded(!summaryExpanded);
    };

    const getOrdinal = (n) => {
        const s = ["th", "st", "nd", "rd"];
        const v = n % 100;
        return n + (s[(v - 20) % 10] || s[v] || s[0]);
    };

    const updateServicePrice = (itemIdx, serviceId, newPrice) => {
        const item = unrolledItems[itemIdx];
        const isCurrent = item.isCurrent;

        let currentUnitServices = item.unitServices ? { ...item.unitServices } : {};
        if (!currentUnitServices[item.unitIndex]) {
            currentUnitServices[item.unitIndex] = (item.unitIndex === 0 || !item.isExisting) ? [...(item.services || [])] : [];
        }

        const updatedServices = currentUnitServices[item.unitIndex].map(s =>
            s.id === serviceId ? { ...s, cost: Number(newPrice) || 0 } : s
        );

        currentUnitServices[item.unitIndex] = updatedServices;

        // Recalculate item total cost
        const materialsTotal = (item.materials || []).reduce((sum, m) => sum + (m.quantity * (m.sellingPrice || 0)), 0);
        let newTotal = 0;
        const qty = item.quantity || 1;
        for (let i = 0; i < qty; i++) {
            const srv = currentUnitServices[i] ? currentUnitServices[i] : (item.services || []);
            const sTotal = srv.reduce((sum, s) => sum + s.cost, 0);
            newTotal += sTotal + materialsTotal;
        }

        if (isCurrent) {
            onChange({
                currentOutfit: { ...state.currentOutfit, unitServices: currentUnitServices, totalCost: newTotal }
            });
        } else {
            const newCart = [...state.cart];
            newCart[item.cartIndex] = { ...newCart[item.cartIndex], unitServices: currentUnitServices, totalCost: newTotal };
            onChange({ cart: newCart });
        }
    };

    const handleAddAddon = (itemIdx) => {
        setTargetItemIdx(itemIdx);
        setAddonServiceName('');
        setAddonPrice('');
        setAddonDrawerVisible(true);
    };

    const confirmAddAddon = () => {
        if (!addonServiceName.trim()) {
            onShowAlert('Error', 'Please enter a service name');
            return;
        }

        const item = unrolledItems[targetItemIdx];
        const isCurrent = item.isCurrent;
        const newAddon = {
            id: 'current_' + Date.now().toString(),
            name: addonServiceName,
            cost: Number(addonPrice) || 0
        };

        let currentUnitServices = item.unitServices ? { ...item.unitServices } : {};
        if (!currentUnitServices[item.unitIndex]) {
            currentUnitServices[item.unitIndex] = (item.unitIndex === 0 || !item.isExisting) ? [...(item.services || [])] : [];
        }

        const updatedServices = [...currentUnitServices[item.unitIndex], newAddon];
        currentUnitServices[item.unitIndex] = updatedServices;

        // Recalculate item total cost
        const materialsTotal = (item.materials || []).reduce((sum, m) => sum + (m.quantity * (m.sellingPrice || 0)), 0);
        let newTotal = 0;
        const qty = item.quantity || 1;
        for (let i = 0; i < qty; i++) {
            const srv = currentUnitServices[i] ? currentUnitServices[i] : (item.services || []);
            const sTotal = srv.reduce((sum, s) => sum + s.cost, 0);
            newTotal += sTotal + materialsTotal;
        }

        if (isCurrent) {
            onChange({
                currentOutfit: { ...state.currentOutfit, unitServices: currentUnitServices, totalCost: newTotal }
            });
        } else {
            const newCart = [...state.cart];
            newCart[item.cartIndex] = { ...newCart[item.cartIndex], unitServices: currentUnitServices, totalCost: newTotal };
            onChange({ cart: newCart });
        }

        setAddonDrawerVisible(false);
    };

    const removeService = (itemIdx, serviceId) => {
        const item = unrolledItems[itemIdx];
        const isCurrent = item.isCurrent;

        let currentUnitServices = item.unitServices ? { ...item.unitServices } : {};
        if (!currentUnitServices[item.unitIndex]) {
            currentUnitServices[item.unitIndex] = (item.unitIndex === 0 || !item.isExisting) ? [...(item.services || [])] : [];
        }

        const updatedServices = currentUnitServices[item.unitIndex].filter(s => s.id !== serviceId);
        currentUnitServices[item.unitIndex] = updatedServices;

        // Recalculate item total cost
        const materialsTotal = (item.materials || []).reduce((sum, m) => sum + (m.quantity * (m.sellingPrice || 0)), 0);
        let newTotal = 0;
        const qty = item.quantity || 1;
        for (let i = 0; i < qty; i++) {
            const srv = currentUnitServices[i] ? currentUnitServices[i] : (item.services || []);
            const sTotal = srv.reduce((sum, s) => sum + s.cost, 0);
            newTotal += sTotal + materialsTotal;
        }

        if (isCurrent) {
            onChange({ currentOutfit: { ...state.currentOutfit, unitServices: currentUnitServices, totalCost: newTotal } });
        } else {
            const newCart = [...state.cart];
            newCart[item.cartIndex] = { ...newCart[item.cartIndex], unitServices: currentUnitServices, totalCost: newTotal };
            onChange({ cart: newCart });
        }
    };

    return (
        <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
            <KeyboardAwareScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: summaryExpanded ? 380 : 180 }}
                showsVerticalScrollIndicator={false}
                enableOnAndroid={true}
                extraScrollHeight={130}
                keyboardShouldPersistTaps="handled"
            >
                <View style={{ padding: 16, gap: 16 }}>
                    {/* Accordion List - Exploded Quantity */}
                    {unrolledItems.map((item, index) => {
                        const isExpanded = expandedIndices.includes(index);
                        const itemType = item.type || 'Outfit';

                        // Fallback: Ensure stitching service is present for display if missing
                        const itemServices = item.unitServices && item.unitServices[item.unitIndex]
                            ? [...item.unitServices[item.unitIndex]]
                            : (item.unitIndex === 0 || !item.isExisting ? [...(item.services || [])] : []);
                        if (!itemServices.find(s => s.name === 'Stitching')) {
                            itemServices.unshift({ id: 's1', name: 'Stitching', cost: 0 });
                        }

                        return (
                            <View key={index} style={styles.summaryCard}>
                                <TouchableOpacity
                                    activeOpacity={0.9}
                                    onPress={() => toggleAccordion(index)}
                                    style={[styles.summaryCardHeader, isExpanded && { borderBottomWidth: 1, borderBottomColor: '#E2E8F0' }]}
                                >
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.summaryHeaderLabel}>OUTFIT</Text>
                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            <Text style={[styles.summaryItemTitle, { fontSize: 18 }]}>{itemType}</Text>
                                        </View>
                                    </View>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                        <View style={styles.ordinalQtyBadge}>
                                            <Text style={styles.ordinalQtyText}>{getOrdinal(item.unitIndex + 1)} Qty</Text>
                                        </View>
                                        {isExpanded ? (
                                            <ChevronUp size={22} color="#94A3B8" />
                                        ) : (
                                            <ChevronRight size={22} color="#94A3B8" />
                                        )}
                                    </View>
                                </TouchableOpacity>

                                {isExpanded && (
                                    <View style={[styles.summaryCardBody, { paddingTop: 0 }]}>
                                        {/* 1. Materials */}
                                        {(item.materials || []).length > 0 && (
                                            <View style={styles.summarySubSection}>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                                                    <Layers size={14} color="#64748B" />
                                                    <Text style={[styles.summarySectionTitle, { marginBottom: 0, textTransform: 'uppercase', fontSize: 11, letterSpacing: 1 }]}>Materials</Text>
                                                </View>

                                                {(item.materials || []).map((m, idx) => (
                                                    <View key={idx} style={styles.nestedMaterialCard}>
                                                        <View style={{ flexDirection: 'row', gap: 14 }}>
                                                            <View style={styles.materialSmallImgBox}>
                                                                {m.photo ? (
                                                                    <Image source={{ uri: m.photo }} style={{ flex: 1, width: '100%', height: '100%' }} resizeMode="cover" />
                                                                ) : (
                                                                    <Layers size={32} color="#6366F1" />
                                                                )}
                                                            </View>
                                                            <View style={{ flex: 1 }}>
                                                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                                    <View style={{ flex: 1 }}>
                                                                        <Text style={styles.materialName} numberOfLines={2}>{m.name}</Text>
                                                                        <Text style={styles.skuText}>SKU : {m.sku || 'N/A'}</Text>

                                                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
                                                                            <View style={styles.catBadge}>
                                                                                <Text style={styles.catBadgeText}>{m.category || 'Fabric'}</Text>
                                                                            </View>
                                                                        </View>
                                                                    </View>
                                                                </View>
                                                            </View>
                                                        </View>

                                                        <View style={{ height: 1.5, backgroundColor: '#F7FAFC', marginVertical: 14 }} />

                                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                                            <View style={styles.matPricePill}>
                                                                <Text style={styles.matPricePillText}>
                                                                    {m.quantity}{m.unit}  x  ₹{m.sellingPrice}
                                                                </Text>
                                                            </View>
                                                            <Text style={[styles.matTotal, { fontSize: 18 }]}>₹{(m.quantity * (m.sellingPrice || 0)).toFixed(0)}</Text>
                                                        </View>
                                                    </View>
                                                ))}
                                            </View>
                                        )}

                                        {/* 2. Services */}
                                        <View style={styles.summarySubSection}>
                                            <View style={styles.serviceSectionHeader}>
                                                <Text style={[styles.summarySectionTitle, { marginBottom: 0, textTransform: 'uppercase', fontSize: 11, letterSpacing: 0.5 }]}>Services</Text>
                                                <TouchableOpacity onPress={() => handleAddAddon(index)}>
                                                    <Text style={styles.addAddonLink}>+ Add-on Price</Text>
                                                </TouchableOpacity>
                                            </View>

                                            {itemServices.map((s, sIdx) => {
                                                const isStitching = s.name === 'Stitching';
                                                return (
                                                    <View key={sIdx} style={styles.serviceItemRow}>
                                                        <Text style={styles.serviceName}>{s.name}</Text>
                                                        <View style={styles.servicePriceInputBox}>
                                                            <Text style={{ fontSize: 13, color: Colors.primary, fontFamily: 'Inter-Bold', marginRight: 8 }}>₹</Text>
                                                            <View style={{ width: 1, height: 16, backgroundColor: '#E2E8F0', marginRight: 8 }} />
                                                            <TextInput
                                                                style={styles.servicePriceInput}
                                                                value={s.cost && s.cost !== 0 ? String(s.cost) : ''}
                                                                placeholder="0"
                                                                placeholderTextColor="#000000"
                                                                keyboardType="numeric"
                                                                onChangeText={(val) => updateServicePrice(index, s.id, val)}
                                                            />
                                                        </View>
                                                        {!isStitching && (
                                                            <TouchableOpacity style={styles.serviceDeleteBtn} onPress={() => removeService(index, s.id)}>
                                                                <Trash2 size={16} color="#EF4444" />
                                                            </TouchableOpacity>
                                                        )}
                                                        {isStitching && (
                                                            <View style={[styles.serviceDeleteBtn, { opacity: 0.35 }]}>
                                                                <Trash2 size={16} color="#94A3B8" />
                                                            </View>
                                                        )}
                                                    </View>
                                                )
                                            })}
                                        </View>

                                        <View style={[styles.summaryDivider, { marginVertical: 12 }]} />

                                        {/* 3. Audio Instruction Status */}
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                            <Text style={{ fontFamily: 'Inter-Medium', fontSize: 13, color: '#64748B' }}>Audio Instruction</Text>
                                            <View style={[
                                                styles.audioStatusBadge,
                                                item.audioUri ? styles.audioStatusBadgeYes : styles.audioStatusBadgeNo
                                            ]}>
                                                {item.audioUri ? (
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                                        <Check size={14} color="#059669" strokeWidth={3} />
                                                        <Text style={styles.audioStatusTextYes}>Yes</Text>
                                                    </View>
                                                ) : (
                                                    <Text style={styles.audioStatusTextNo}>No</Text>
                                                )}
                                            </View>
                                        </View>

                                        <View style={[styles.summaryDivider, { marginVertical: 12, marginTop: 4 }]} />

                                        <View style={styles.paymentRow}>
                                            <Text style={[styles.paymentLabel, { color: '#64748B', fontFamily: 'Inter-Medium' }]}>Total Amount</Text>
                                            <Text style={[styles.paymentValue, { fontSize: 18 }]}>₹{item.displayPrice?.toFixed(0) || 0}</Text>
                                        </View>
                                    </View>
                                )}
                            </View>
                        );
                    })}



                    {!editOrderId && (
                        <TouchableOpacity style={styles.dashedAddBtn} onPress={onAddAnother}>
                            <Plus size={20} color={Colors.primary} />
                            <Text style={styles.dashedAddBtnText}>Add Another Outfit</Text>
                        </TouchableOpacity>
                    )}

                    {/* Advance Payment Card */}
                    <View style={styles.configCard}>
                        <Text style={styles.configTitle}>Advance Payment</Text>
                        <View style={styles.chipGroup}>
                            {['Cash', 'UPI'].map(mode => {
                                const isActive = state.paymentMode === mode;
                                return (
                                    <TouchableOpacity
                                        key={mode}
                                        style={[styles.chipBtn, { flex: 1 }, isActive && styles.chipBtnActive]}
                                        onPress={() => onChange({ paymentMode: mode })}
                                    >
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                            {isActive && <Check size={18} color="white" strokeWidth={3} />}
                                            <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{mode}</Text>
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                        {/* UPI Transaction ID Input */}
                        {state.paymentMode === 'UPI' && (
                            <View style={styles.amountInputWrapper}>
                                <TextInput
                                    style={styles.amountInput}
                                    placeholder="Transaction ID"
                                    placeholderTextColor="#94A3B8"
                                    value={state.transactionId}
                                    onChangeText={(val) => onChange({ transactionId: val })}
                                />
                            </View>
                        )}
                        <View style={[styles.amountInputWrapper, { marginTop: 12 }]}>
                            <Text style={{ fontSize: 15, color: Colors.primary, fontFamily: 'Inter-Bold' }}>₹</Text>
                            <View style={{ width: 1, height: 20, backgroundColor: '#E2E8F0', marginHorizontal: 12 }} />
                            <TextInput
                                style={styles.amountInput}
                                placeholder="0"
                                placeholderTextColor="#000000"
                                keyboardType="numeric"
                                value={state.paymentInput ? String(state.paymentInput) : ''}
                                onChangeText={(val) => onChange({ paymentInput: val })}
                            />
                        </View>
                    </View>

                    {/* Discount Card */}
                    <View style={[styles.configCard, { marginTop: 16 }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: state.isDiscountEnabled ? 16 : 0 }}>
                            <Text style={[styles.configTitle, { marginBottom: 0 }]}>Discount</Text>
                            <TouchableOpacity
                                onPress={() => onChange({ isDiscountEnabled: !state.isDiscountEnabled })}
                                style={{
                                    width: 48,
                                    height: 28,
                                    borderRadius: 14,
                                    backgroundColor: state.isDiscountEnabled ? Colors.primary : '#E2E8F0',
                                    padding: 2,
                                    justifyContent: 'center',
                                    alignItems: state.isDiscountEnabled ? 'flex-end' : 'flex-start'
                                }}
                            >
                                <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: Colors.white }} />
                            </TouchableOpacity>
                        </View>
                        
                        {state.isDiscountEnabled && (
                            <>
                                <View style={styles.chipGroup}>
                                    {['%', '₹'].map(type => {
                                        const isSelected = state.discountType === type;
                                        return (
                                            <TouchableOpacity
                                                key={type}
                                                style={[styles.chipBtn, { flex: 1 }, isSelected && styles.chipBtnActive]}
                                                onPress={() => onChange({ discountType: type })}
                                            >
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                                    {isSelected && <Check size={16} color={Colors.white} />}
                                                    <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                                                        {type}
                                                    </Text>
                                                </View>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                                <View style={styles.amountInputWrapper}>
                                    {state.discountType === '₹' && (
                                        <>
                                            <Text style={{ fontSize: 15, color: Colors.primary, fontFamily: 'Inter-Bold' }}>₹</Text>
                                            <View style={{ width: 1, height: 20, backgroundColor: '#E2E8F0', marginHorizontal: 12 }} />
                                        </>
                                    )}
                                    <TextInput
                                        style={styles.amountInput}
                                        placeholder="0"
                                        placeholderTextColor="#CBD5E1"
                                        keyboardType="numeric"
                                        value={state.discountValue}
                                        onChangeText={(val) => onChange({ discountValue: val })}
                                    />
                                    {state.discountType === '%' && (
                                        <>
                                            <View style={{ width: 1, height: 20, backgroundColor: '#E2E8F0', marginHorizontal: 12 }} />
                                            <Text style={{ fontSize: 15, color: Colors.primary, fontFamily: 'Inter-Bold' }}>%</Text>
                                        </>
                                    )}
                                </View>
                            </>
                        )}
                    </View>
                </View>
                <View style={{ height: 180 }} />
            </KeyboardAwareScrollView>

            {/* Bottom Summary Breakdown Area (Sticky) */}
            <View style={[styles.bottomSummaryCard, { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingTop: 4, paddingBottom: Platform.OS === 'android' ? 36 : (insets.bottom > 0 ? insets.bottom : 16) }]}>
                <TouchableOpacity
                    activeOpacity={1}
                    onPress={toggleSummaryExpansion}
                    style={{ alignItems: 'center', paddingTop: 6, paddingBottom: 2 }}
                >
                    {summaryExpanded ? (
                        <ChevronDown size={20} color="#CBD5E1" />
                    ) : (
                        <ChevronUp size={20} color="#CBD5E1" />
                    )}
                </TouchableOpacity>

                {summaryExpanded && (
                    <View style={{ marginBottom: 16 }}>
                        <View style={styles.summaryLine}>
                            <Text style={styles.summaryLineLabel}>Total Outfits</Text>
                            <Text style={styles.summaryLineValue}>{unrolledItems.length} {unrolledItems.length === 1 ? 'Item' : 'Items'}</Text>
                        </View>
                        <View style={styles.summaryLine}>
                            <Text style={styles.summaryLineLabel}>Subtotal</Text>
                            <Text style={styles.summaryLineValue}>₹{subtotal}</Text>
                        </View>
                        {(discountAmt > 0 || (state.isDiscountEnabled && state.discountValue !== '' && state.discountValue !== undefined)) && (
                            <View style={styles.summaryLine}>
                                <Text style={styles.summaryLineLabel}>
                                    Discount ({state.discountType === '₹' ? `₹${state.discountValue || '0'}` : `${state.discountValue || '0'}${state.discountType}`})
                                </Text>
                                <Text style={[styles.summaryLineValue, styles.summaryLineValueGreen]}>-₹{discountAmt.toFixed(0)}</Text>
                            </View>
                        )}
                        {(advanceAmt + prevAdvance > 0 || state.paymentInput !== '') && (
                            <View style={styles.summaryLine}>
                                <Text style={styles.summaryLineLabel}>Advance Payment</Text>
                                <Text style={[styles.summaryLineValue, styles.summaryLineValueGreen]}>-₹{(advanceAmt + prevAdvance).toFixed(0)}</Text>
                            </View>
                        )}
                        <View style={[styles.summaryDivider, { marginVertical: 12 }]} />
                    </View>
                )}

                <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={toggleSummaryExpansion}
                    style={styles.balanceHighlightCard}
                >
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.summaryTotalBalanceLabel, { color: '#1E293B', fontSize: 16 }]}>Total Balance</Text>
                        <Text style={[styles.summaryTotalBalanceSub, { color: '#94A3B8', fontSize: 12, marginTop: 2 }]}>To be collected on delivery</Text>
                    </View>
                    <Text style={[styles.summaryTotalBalanceValue, { fontSize: 24 }]}>₹{totalBalance.toFixed(0)}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.confirmOrderBtn, loading && { opacity: 0.7 }, { marginTop: 16 }]}
                    onPress={onCreateOrder}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <>
                            <Text style={styles.confirmOrderBtnText}>{editOrderId ? 'Update Order' : 'Confirm Order'}</Text>
                            <View style={{ backgroundColor: 'white', borderRadius: 12, padding: 3, marginLeft: 10 }}>
                                <Check size={16} color={Colors.primary} strokeWidth={4} />
                            </View>
                        </>
                    )}
                </TouchableOpacity>
            </View>

            {/* Add-on Price Drawer */}
            <ReusableBottomDrawer
                visible={addonDrawerVisible}
                onClose={() => setAddonDrawerVisible(false)}
                height="auto"
            >
                <KeyboardAwareScrollView
                    ref={addonDrawerScrollRef}
                    enableOnAndroid={true}
                    enableAutomaticScroll={true}
                    extraScrollHeight={110}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ padding: 20, paddingBottom: 16, flexGrow: 1 }}
                >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                        <Text style={{ fontFamily: 'Inter-Bold', fontSize: 18, color: Colors.textPrimary }}>Add-on Price</Text>
                        <TouchableOpacity onPress={() => setAddonDrawerVisible(false)}>
                            <X size={24} color={Colors.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    <View style={{ gap: 20 }}>
                        <View>
                            <Text style={{ fontFamily: 'Inter-Bold', fontSize: 14, color: Colors.textPrimary, marginBottom: 8 }}>Service Name</Text>
                            <TextInput
                                style={styles.addonInput}
                                placeholder="Enter service name"
                                value={addonServiceName}
                                onChangeText={setAddonServiceName}
                                placeholderTextColor="#94A3B8"
                                returnKeyType="next"
                            />
                        </View>

                        <View>
                            <Text style={{ fontFamily: 'Inter-Bold', fontSize: 14, color: Colors.textPrimary, marginBottom: 8 }}>Price</Text>
                            <View style={styles.addonPriceInputWrapper}>
                                <Text style={{ fontSize: 16, color: Colors.primary, fontFamily: 'Inter-Bold' }}>₹</Text>
                                <TextInput
                                    style={styles.addonPriceInput}
                                    placeholder="0"
                                    keyboardType="numeric"
                                    value={addonPrice}
                                    onChangeText={setAddonPrice}
                                    placeholderTextColor="#94A3B8"
                                />
                            </View>
                        </View>
                    </View>

                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 32 }}>
                        <TouchableOpacity
                            style={[styles.outlineBtn, { flex: 1, height: 48 }]}
                            onPress={() => setAddonDrawerVisible(false)}
                        >
                            <Text style={styles.outlineBtnText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.primaryBtn, { flex: 1, height: 48 }]}
                            onPress={confirmAddAddon}
                        >
                            <Text style={styles.primaryBtnText}>Add</Text>
                        </TouchableOpacity>
                    </View>
                </KeyboardAwareScrollView>
            </ReusableBottomDrawer>
        </View>
    );
};

const Step4Billing = StepSummary;


const Step4BillingWrapper = ({ state, onChange, onAddAnother, onDeleteItem, confirmDeleteItem, onEditItem, onShowAlert, onGoToStep, editItemIndex, editOrderId, onCreateOrder, loading }) => {
    return (
        <Step4Billing state={state} onChange={onChange} onAddAnother={onAddAnother} onDeleteItem={onDeleteItem} confirmDeleteItem={confirmDeleteItem} onEditItem={onEditItem} onShowAlert={onShowAlert} onGoToStep={onGoToStep} editItemIndex={editItemIndex} editOrderId={editOrderId} onCreateOrder={onCreateOrder} loading={loading} />
    );
};




const CreateOrderFlowScreen = ({ navigation, route }) => {
    const dispatch = useDispatch();

    useEffect(() => {
        dispatch(getSectionsAction());
        dispatch(fetchCustomersAction({ page: 1, limit: 1000 }));
    }, [dispatch]);

    const isDiscardingRef = useRef(false);
    const { addOrder, updateOrder, addPayment, addCustomer, updateCustomer, orders, customers: contextCustomers } = useData();
    const { customers: apiCustomers } = useSelector(state => state.customers);
    const { sections } = useSelector(state => state.section);
    const { stitchingStructure } = useSelector(state => state.outfit);
    const { outfitMeasurements } = useSelector(state => state.measurement);
    const [fetchedOrder, setFetchedOrder] = useState(null);
    const [fetchingOrder, setFetchingOrder] = useState(false);
    const { user, company } = useAuth();
    const { showToast } = useToast();

    const sessionDraftId = useRef(route.params?.draftId || `draft_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`).current;

    const customers = apiCustomers?.length > 0 ? apiCustomers : contextCustomers?.length > 0 ? contextCustomers : [];

    const { outfits: apiOutfits } = useSelector(state => state.outfit);
    const outfits = apiOutfits || [];

    const editOrderId = route.params?.editOrderId;
    // Define editItemIndex here at the top
    const editItemIndex = route.params?.editItemIndex;

    // State
    const [currentStep, setCurrentStep] = useState(0);
    const [confirmedOrderType, setConfirmedOrderType] = useState('Stitching');
    const [state, setState] = useState({
        customerName: '',
        customerMobile: '',
        selectedCustomer: null,
        trialDate: null,
        deliveryDate: null,
        urgency: 'Normal', // Normal, Urgent
        orderType: 'Stitching', // Stitching, Alteration
        gender: null, // No default gender

        // Cart and Current Item
        cart: [],
        currentOutfit: {
            id: '1',
            type: '',
            quantity: 1,
            measurements: {},
            images: [], // Reference Images
            measurementDressImages: [],
            materialImages: [],
            notes: '',
            audioUri: null,
            fabricSource: 'Customer',
            measurementDressGiven: 'No',
            gender: null,
            materials: [],
            services: [
                { id: 's1', name: 'Stitching', cost: 0 },
            ],
            totalCost: 0,
            requestedPhotosFromClient: false
        },

        paymentMode: 'Cash', // Cash, UPI
        advance: '',
        isDiscountEnabled: false,
        discountType: '%', // %, ₹
        discountValue: '',
        paymentInput: '',
        transactionId: '',
        payments: []
    });

    useEffect(() => {
        if (state.currentOutfit.outfitId) {
            dispatch(getStitchingStructureAction(state.currentOutfit.outfitId));
        }
    }, [state.currentOutfit.outfitId, dispatch]);

    // EFFECT: Set default outfit from API if needed - REMOVED strictly hardcoded defaults
    /*
    useEffect(() => {
        // ... (Removed)
    }, [outfits]);
    */

    const [alert, setAlert] = useState({ visible: false, title: '', message: '', type: 'info', onConfirm: undefined });
    const [customerModalVisible, setCustomerModalVisible] = useState(false);
    const [successModalVisible, setSuccessModalVisible] = useState(false);
    const [discardDrawerVisible, setDiscardDrawerVisible] = useState(false);
    const [pendingAction, setPendingAction] = useState(null);
    const [createdOrder, setCreatedOrder] = useState(null);
    const [loading, setLoading] = useState(false);
    // Delete Confirmation State
    const [deleteSheetVisible, setDeleteSheetVisible] = useState(false);
    const [deleteSheetConfig, setDeleteSheetConfig] = useState({
        title: "Delete Item",
        description: "Are you sure you want to delete this item?",
        confirmText: "Delete",
        isDiscard: false
    });
    const [itemToDeleteIndex, setItemToDeleteIndex] = useState(null);
    const pendingDeleteActionRef = useRef(null);
    const [previewVisible, setPreviewVisible] = useState(false);
    const [previewHtml, setPreviewHtml] = useState('');
    const tabBarRef = useRef(null);
    const insets = useSafeAreaInsets();
    const navigateToOrdersList = useCallback(() => {
        setSuccessModalVisible(false);
        navigation.dispatch(
            CommonActions.reset({
                index: 0,
                routes: [{ name: 'Main', params: { screen: 'Orders' } }],
            })
        );
    }, [navigation]);

    const openPreviewFromSuccess = useCallback((params) => {
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
    }, [navigation]);

    const handlePrintOrder = async () => {
        if (!createdOrder) {
            showToast('Order information unavailable.', 'error');
            return;
        }

        try {
            setLoading(true);

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
                    console.log('REFRESH ORDER BEFORE PREVIEW - Error:', refreshError);
                }
            }

            const paymentCandidates = Array.isArray(activeOrder?.payments)
                ? activeOrder.payments
                : [];
            const latestPayment =
                paymentCandidates[paymentCandidates.length - 1] || null;
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
            const tailoringPdfUrl =
                activeOrder?.tailorCopyUrl ||
                activeOrder?.tailor_copy_url ||
                activeOrder?.tailoring_copy_url ||
                activeOrder?.tailoringCopyUrl ||
                null;
            const orderId =
                activeOrder?.id ||
                activeOrder?.orderId ||
                activeOrder?.order_id ||
                latestPayment?.order_id ||
                null;
            const isSalesOrder =
                activeOrder?.orderTypeApi === 'SALE_ORDER' ||
                activeOrder?.order_type === 'SALE_ORDER' ||
                activeOrder?.orderCategory === 'Sales';

            const hasCustomerCopy =
                isSalesOrder ||
                Number(
                    activeOrder?.paid_amount ??
                    activeOrder?.advance_payment ??
                    activeOrder?.advance ??
                    0,
                ) > 0 ||
                paymentCandidates.length > 0 ||
                !!customerPdfUrl;

            if (hasCustomerCopy) {
                openPreviewFromSuccess({
                    initialCopyType: 'customer',
                    allowedCopyTypes: ['customer'],
                    order: activeOrder,
                    company: companyData,
                    orderId,
                });
                return;
            }

            const companyData = {
                name: company?.name || 'My Boutique',
                address: company?.address || 'Your Address Here',
                phone: company?.phone || 'Your Phone Here',
                gstin: company?.gstin || '',
                logo: getCompanyLogoUri(company) || getUserProfilePhotoUri(user) || ''
            };

            openPreviewFromSuccess({
                initialCopyType: 'tailor',
                allowedCopyTypes: ['tailor'],
                order: activeOrder,
                company: companyData,
                orderId,
            });
        } catch (error) {
            console.error('Open Invoice Preview Error:', error);
            showToast('Failed to open copy preview', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleActualPrint = async () => {
        try {
            await printHTML(previewHtml);
        } catch (error) {
            showAlert('Error', 'Failed to print PDF');
        }
    };

    const handleActualShare = async () => {
        if (!createdOrder) return;
        try {
            const companyData = {
                name: company?.name || 'My Boutique',
                address: company?.address || 'Your Address Here',
                phone: company?.phone || 'Your Phone Here',
                gstin: company?.gstin || '',
                logo: getCompanyLogoUri(company) || getUserProfilePhotoUri(user) || ''
            };

            // Enrich Order with Customer Display ID
            const customer = customers.find(c => c.id === createdOrder.customerId);
            const enrichedOrder = {
                ...createdOrder,
                customerDisplayId: customer?.displayId
            };

            await generateCustomerCopyPDF(enrichedOrder, companyData);
        } catch (error) {
            showAlert('Error', 'Failed to share PDF');
        }
    };

    const handleConfirmDelete = async () => {
        if (pendingDeleteActionRef.current) {
            const pendingAction = pendingDeleteActionRef.current;
            pendingDeleteActionRef.current = null;
            setDeleteSheetVisible(false);
            setItemToDeleteIndex(null);
            await pendingAction();
            return;
        }

        if (itemToDeleteIndex !== null) {
            await handleDeleteItem(itemToDeleteIndex);
        }
    };

    const handleDeleteItem = async (index) => {
        // If deleting the current working item (not in cart yet)
        if (index === -1) {
            // Reset current outfit — use first boutique section as default
            const defaultSection = sections?.[0]?.name || null;
            updateState({
                currentOutfit: {
                    ...state.currentOutfit,
                    type: '',
                    quantity: 1,
                    gender: defaultSection,
                    measurements: {},
                    images: [],
                    notes: '',
                    audioUri: null,
                    measurementDressGiven: 'No',
                    totalCost: 0
                }
            });

            // Check if this results in a completely empty state for new orders
            // If cart is empty and we just cleared the current item, go back
            if (state.cart.length === 0 && !editOrderId) {
                isDiscardingRef.current = true;
                await clearDraft();
                navigation.goBack();
            }
        }
        else if (index !== null) {
            // Deleting from cart
            const newCart = [...state.cart];
            newCart.splice(index, 1);

            // Critical: If we just removed the last item from cart, AND current outfit has no type,
            // we are effectively empty.
            const remainingCount = newCart.length + (state.currentOutfit.type ? 1 : 0);

            updateState({ cart: newCart });

            if (remainingCount === 0 && !editOrderId) {
                isDiscardingRef.current = true;
                await clearDraft();
                navigation.goBack();
            }
        }

        setDeleteSheetVisible(false);
        setItemToDeleteIndex(null);
    };

    const confirmDeleteItem = (index) => {
        pendingDeleteActionRef.current = null;
        // Correctly calculate future items
        // Cart items count
        const cartCount = state.cart.length;
        // Current working item active?
        const currentActive = state.currentOutfit.type ? 1 : 0;

        let futureTotal = 0;

        if (index === -1) {
            // Deleting current item. Future = Cart Count
            futureTotal = cartCount;
        } else {
            // Deleting from cart. Future = (Cart Count - 1) + Current Active
            futureTotal = (cartCount - 1) + currentActive;
        }

        const isLastItem = futureTotal === 0;

        // Discard Order Warning (Only for New Orders when deleting the last item)
        if (isLastItem && !editOrderId) {
            setItemToDeleteIndex(index);
            setDeleteSheetConfig({
                title: "Discard Order?",
                description: "This is the only item in the order. Deleting it will discard the order draft. Are you sure?",
                confirmText: "Discard",
                isDiscard: true
            });
            setDeleteSheetVisible(true);
            return;
        }

        // Just delete the item, no scary warning
        setItemToDeleteIndex(index);
        setDeleteSheetConfig({
            title: "Delete Item",
            description: "Are you sure you want to delete this item?",
            confirmText: "Delete",
            isDiscard: false
        });
        setDeleteSheetVisible(true);
    };

    // --- Persistence (Draft Auto-save) ---
    const STORAGE_KEY = '@create_order_draft';

    // 1. Initial Load of Draft
    // 1. Initial Load of Draft
    useEffect(() => {
        const loadDraft = async () => {
            try {
                // EXPLICIT REQUIREMENT: Only load draft if we are continuing from Dashboard
                const isResumingDraft = route.params?.isResumingDraft;
                const draftIdToLoad = route.params?.draftId;
                if (editOrderId || !isResumingDraft || !draftIdToLoad) return;

                const savedData = await AsyncStorage.getItem(STORAGE_KEY);
                if (savedData) {
                    const parsed = JSON.parse(savedData);
                    const draftsArray = Array.isArray(parsed) ? parsed : [parsed];

                    // Find the specific draft
                    const targetDraft = draftsArray.find(d => d.draftId === draftIdToLoad);

                    if (targetDraft) {
                        // Populate main state
                        if (targetDraft.state) {
                            setState(targetDraft.state);
                        }
                        // Recover Step
                        if (targetDraft.currentStep !== undefined) {
                            setCurrentStep(targetDraft.currentStep);
                        }
                    }
                }
            } catch (error) {
                console.error('Failed to load order draft:', error);
            }
        };
        loadDraft();
    }, [editOrderId]);

    // 2. Auto-Save on Changes
    useEffect(() => {
        const saveDraft = async () => {
            try {
                // Don't auto-save if we're in edit mode, order is complete, or we are discarding
                if (editOrderId || successModalVisible || isDiscardingRef.current) return;

                const savedData = await AsyncStorage.getItem(STORAGE_KEY);
                let draftsArray = [];
                if (savedData) {
                    const parsed = JSON.parse(savedData);
                    draftsArray = Array.isArray(parsed) ? parsed : [parsed];
                }

                const currentDraftData = {
                    draftId: sessionDraftId,
                    state,
                    currentStep,
                    lastSaved: new Date().toISOString()
                };

                // Find and update or add new
                const existingIndex = draftsArray.findIndex(d => d.draftId === sessionDraftId);
                if (existingIndex !== -1) {
                    draftsArray[existingIndex] = currentDraftData;
                } else {
                    // Only add if there's actually some data started (at least a type or customer)
                    const hasItems = state.cart.length > 0;
                    const hasSelectedInput = (state.customerName || state.selectedCustomer || state.currentOutfit.notes || (state.currentOutfit.images && state.currentOutfit.images.length > 0));

                    if (hasItems || hasSelectedInput) {
                        draftsArray.unshift(currentDraftData); // Newest on top
                    } else {
                        return; // Don't save empty drafts
                    }
                }

                await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(draftsArray));
            } catch (error) {
                console.error('Failed to save order draft:', error);
            }
        };

        // Delay slighty for state stability?
        const timer = setTimeout(() => {
            saveDraft();
        }, 1000);
        return () => clearTimeout(timer);
    }, [state, currentStep, editOrderId, successModalVisible, sessionDraftId]);

    // 3. Clear Draft Helper (Targeted deletion)
    const clearDraft = async () => {
        try {
            const savedData = await AsyncStorage.getItem(STORAGE_KEY);
            if (savedData) {
                let draftsArray = JSON.parse(savedData);
                if (!Array.isArray(draftsArray)) draftsArray = [draftsArray];

                const filtered = draftsArray.filter(d => d.draftId !== sessionDraftId);

                if (filtered.length === 0) {
                    await AsyncStorage.removeItem(STORAGE_KEY);
                } else {
                    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
                }
            }
        } catch (error) {
            console.error('Failed to clear specific draft:', error);
        }
    };

    // 4. Hardware Back Handler (Android)
    useEffect(() => {
        const onBackPress = () => {
            if (currentStep > 0) {
                // If on Step 5 (Summary) and showing the success modal, let it quit or handle itself
                if (successModalVisible) {
                    navigateToOrdersList();
                    return true;
                }

                setCurrentStep(prev => prev - 1);
                return true; // Handled internally
            }
            // Let the default behavior run (which triggers beforeRemove)
            return false;
        };

        const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);
        return () => backHandler.remove();
    }, [currentStep, navigateToOrdersList, successModalVisible]);

    // Exit Warning Logic
    useEffect(() => {
        const unsubscribe = navigation.addListener('beforeRemove', (e) => {
            // IF we are intentionally discarding, bypassing checks
            if (isDiscardingRef.current) {
                // Clear draft when intentionally discarding
                clearDraft();
                return;
            }

            // If we are just navigating between steps in the stack (internal), don't block?

            // React Navigation 'beforeRemove' is triggered only when "leaving" the screen (pop).

            // Check if we have unsaved changes
            const hasItems = state.cart.length > 0;
            const hasCustomer = !!state.selectedCustomer || (!!state.customerName && state.customerName.trim() !== '');
            const hasDates = !!state.trialDate || !!state.deliveryDate;
            const hasConfigs = state.urgency !== 'Normal' || state.orderType !== 'Stitching';

            // Check if current outfit has ANY modified data
            const hasData = (state.currentOutfit.type !== 'Blouse' && state.currentOutfit.type !== 'Chudithar') || // Default types
                (Object.keys(state.currentOutfit.measurements || {}).length > 0) ||
                !!state.currentOutfit.notes ||
                (state.currentOutfit.images && state.currentOutfit.images.length > 0) ||
                !!state.currentOutfit.audioUri ||
                (state.currentOutfit.materials && state.currentOutfit.materials.length > 0) ||
                (Number(state.currentOutfit.stitchingCost) > 0) ||
                (Number(state.currentOutfit.liningCost) > 0);

            // If everything is empty, don't block
            if (!hasItems && !hasCustomer && !hasDates && !hasConfigs && !hasData && !loading) {
                return;
            }

            // If success modal is visible, safe to leave (order created)
            if (successModalVisible) {
                return;
            }

            // Prevent default behavior of leaving the screen
            e.preventDefault();

            // Set pending action and show the drawer
            setPendingAction(e.data.action);
            setDiscardDrawerVisible(true);
        });

        return unsubscribe;
    }, [navigation, state.cart, state.currentOutfit, state.selectedCustomer, state.customerName, state.trialDate, state.deliveryDate, state.urgency, state.orderType, successModalVisible, loading]);


    const initializedOrderId = useRef(null);

    // 1. Fetch order details from API when editOrderId is provided
    useEffect(() => {
        const fetchOrder = async () => {
            if (editOrderId && initializedOrderId.current !== editOrderId) {
                setFetchingOrder(true);
                try {
                    const token = await getAuthToken(store.getState);
                    const fetchUrl = `${URL_ORDERS}/${editOrderId}`;
                    console.log(`[Edit Order] Fetching details from API: GET ${fetchUrl}`);
                    const response = await axios.get(fetchUrl, {
                        headers: {
                            accept: '*/*',
                            Authorization: token,
                        },
                    });
                    console.log("[Edit Order] Fetching details from API: GET response", response);

                    if (response.data?.success) {

                        setFetchedOrder(response.data.data);
                    } else {
                        showToast(response.data?.message || 'Failed to fetch order details', 'error');
                    }
                } catch (error) {
                    console.error('Error fetching order details:', error);
                    showToast('Failed to fetch order details', 'error');
                } finally {
                    setFetchingOrder(false);
                }
            }
        };
        fetchOrder();
    }, [editOrderId]);

    // 2. Initialize state from fetchedOrder (fetched from API)
    useEffect(() => {
        if (editOrderId && fetchedOrder && fetchedOrder.id == editOrderId && sections.length > 0) {
            // Guard: Prevent re-initialization if already loaded for this order ID
            // unless we are explicitly switching orders
            if (initializedOrderId.current === editOrderId) {
                return;
            }

            const order = fetchedOrder;
            if (order) {
                // Determine items to load into cart
                const normalizeUrgency = (u) => {
                    if (!u) return 'Normal';
                    const lower = String(u).toLowerCase();
                    if (lower === 'urgent') return 'Urgent';
                    return 'Normal';
                };

                const normalizeOrderType = (type) => {
                    if (!type) return 'Stitching';
                    const t = String(type).toUpperCase();
                    if (t === 'STITCHING' || t === 'TAILORING') return 'Stitching';
                    if (t === 'ALTERATION') return 'Alteration';
                    return 'Stitching';
                };

                const sourceItems = order.outfits || order.items || [];
                const initialCart = sourceItems.map((it) => {
                    // Store raw data for ID lookup later
                    const measurements_raw = it.measurements || [];
                    const stitching_raw = it.stitching || [];
                    const rawServices = Array.isArray(it.services) ? it.services : [];

                    // 1. Normalize measurements and stitching
                    const measurements = {};

                    // Base Measurements
                    if (Array.isArray(it.measurements)) {
                        it.measurements.forEach(m => {
                            const mName = m.measurement?.name || m.name || m.measurement_name;
                            if (mName) {
                                measurements[mName] = m.value;
                            }
                        });
                    }

                    // Stitching (Styles/Options)
                    if (Array.isArray(it.stitching)) {
                        it.stitching.forEach(s => {
                            const catName = s.category?.name || s.category?.category_name || s.category_name;
                            if (catName) {
                                const subCatName = s.sub_category?.name || s.sub_category?.subcategory_name || s.subcategory?.name || s.sub_category_name || s.subcategory_name;
                                const optName = s.option?.name || s.option?.option_name || s.option_name;
                                const subOptName = s.sub_option?.name || s.sub_option?.suboption_name || s.suboption?.name || s.sub_option_name || s.suboption_name;

                                const components = [subCatName, optName, subOptName].filter(Boolean).map(c => String(c).trim());
                                measurements[catName.trim()] = components.join(' - ') || 'Selected';
                            }
                        });
                    }

                    const mergedQuantities = getMergedOrderQuantities(it);

                    // 2. Normalize Services and Group by Unit (if quantity_id exists)
                    const unitServices = {};
                    const unitServices_raw = {};

                    const rawQuantity = Number(it.quantity) || 1;
                    const servicesPerUnit = rawServices.length > 0 ? Math.ceil(rawServices.length / rawQuantity) : 1;

                    rawServices.forEach((s, sIdx) => {
                        const srv = {
                            id: s.id || Math.random().toString(),
                            name: s.service_name || s.name || 'Service',
                            cost: Number(s.price) || Number(s.cost) || 0
                        };
                        // quantity_id is 1-indexed from API. If missing, distribute sequentially.
                        const qId = s.quantity_id ? Number(s.quantity_id) - 1 : Math.floor(sIdx / servicesPerUnit);

                        if (!unitServices[qId]) unitServices[qId] = [];
                        unitServices[qId].push(srv);

                        if (!unitServices_raw[qId]) unitServices_raw[qId] = [];
                        unitServices_raw[qId].push(s);
                    });

                    const services = (unitServices[0] && unitServices[0].length > 0) ? unitServices[0] : (rawServices.length > 0 ? [] : [
                        { id: 's1', name: 'Stitching', cost: Number(it.stitchingCost) || 0 }
                    ]);

                    // 3. Normalize Materials/Items
                    const rawItems = Array.isArray(it.items) ? it.items :
                        (Array.isArray(mergedQuantities) && mergedQuantities.length > 0 && Array.isArray(mergedQuantities[0].items) ? mergedQuantities[0].items : []);

                    const materials = rawItems.map(m => {
                        const availableStock = m.available_stock ?? m.material?.available_stock ?? 0;
                        const lowStockThreshold = m.material?.low_stock_threshold ?? 0;
                        return {
                            id: m.material_id || m.id || Math.random().toString(),
                            linkId: m.id,
                            name: m.material?.material_name || m.material_name || m.material?.name || m.name || 'Material',
                            sku: m.material?.sku_code || m.material?.sku || m.sku || '',
                            category: m.material?.material_type?.name || m.material_name || m.category || 'Fabric',
                            quantity: Number(m.qty) || Number(m.quantity) || 1,
                            sellingPrice: Number(m.price) || Number(m.sellingPrice) || 0,
                            totalCost: Number(m.total_price) || Number(m.totalCost) || 0,
                            image: m.material?.image_url || m.image_url || m.image,
                            photo: m.material?.image_url || m.image_url || m.image,
                            currentStock: availableStock,
                            numericStock: parseFloat(availableStock) || 0,
                            lowStock: parseFloat(availableStock) <= parseFloat(lowStockThreshold),
                            isMeter: m.material?.is_meter || false,
                            unit: m.material?.is_meter ? 'm' : 'pcs',
                            raw: m.material
                        };
                    });

                    // 4. Photos & Audio
                    const photos = Array.isArray(it.photos) ? it.photos : [];
                    const referenceImages = photos.filter(p => p.category === 'REFERENCE').map(p => p.file_url);
                    const sketchImages = photos.filter(p => p.category === 'SKETCH').map(p => p.file_url);
                    const materialImages = photos.filter(p => p.category === 'MATERIAL').map(p => p.file_url);
                    const measurementDressImages = photos.filter(p => p.category === 'MEASUREMENT_DRESS').map(p => p.file_url);
                    const audioFile = photos.find(p => p.category === 'AUDIO');

                    return {
                        ...it,
                        id: it.id || Date.now().toString() + Math.random(),
                        outfitId: it.outfit_id || it.outfitId,
                        type: it.outfit_name || it.outfit?.name || it.type || it.name || '',
                        quantity: it.quantity || it.qty || 1,
                        measurements: measurements,
                        services: services,
                        unitServices: unitServices,
                        unitServices_raw: unitServices_raw,
                        materials: materials,
                        images: referenceImages.length > 0 ? referenceImages : (it.images || []),
                        sketches: sketchImages,
                        materialImages: materialImages,
                        measurementDressImages: measurementDressImages,
                        notes: it.customer_notes || it.description || it.notes || '',
                        audioUri: audioFile?.file_url || it.audioUri || null,
                        audioDuration: audioFile?.duration || it.audioDuration || 0,
                        fabricSource: it.fabricSource || 'Customer',
                        totalCost: Number(it.total_amount) || Number(it.totalCost) || 0,
                        deliveryDate: it.delivery_date || it.deliveryDate || mergedQuantities[0]?.delivery_date || order.delivery_date,
                        trialDate: it.trial_date || it.trialDate || mergedQuantities[0]?.trial_date || order.trial_date || order.trialDate,
                        orderType: normalizeOrderType(it.outfit_order_type || it.order_type || it.orderType),
                        urgency: normalizeUrgency(it.urgency || order.urgency),
                        gender: it.section || it.gender || sections.find(s => s.id === it.section_id)?.name || '',
                        measurementDressGiven: it.is_measurement_dress_given ? 'Yes' : 'No',
                        requestedPhotosFromClient: it.requested_photos_from_client || it.requestedPhotosFromClient || false,
                        isExisting: true,
                        measurements_raw: measurements_raw,
                        stitching_raw: stitching_raw,
                        quantities_raw: mergedQuantities
                    };
                });

                const selectedCust = order.customer ? {
                    id: order.customer.id,
                    name: order.customer.customerName || order.customer.name,
                    mobile: order.customer.whatsappNumber || order.customer.mobile,
                    displayId: order.customer.customerId || order.customer.displayId
                } : (customers.find(c => c.id === order.customerId) || null);

                let itemToEdit = null;
                if (editItemIndex !== undefined && editItemIndex >= 0 && editItemIndex < initialCart.length) {
                    itemToEdit = initialCart[editItemIndex];
                }


                setState(prevState => ({
                    ...prevState,
                    customerName: order.customerName || order.customer?.customerName || '',
                    customerMobile: order.customerMobile || order.customer?.whatsappNumber || '',
                    selectedCustomer: selectedCust,
                    trialDate: itemToEdit ? (itemToEdit.trialDate || null) : null,
                    deliveryDate: itemToEdit ? (itemToEdit.deliveryDate || null) : null,
                    urgency: itemToEdit ? normalizeUrgency(itemToEdit.urgency) : normalizeUrgency(order.urgency),
                    orderType: itemToEdit ? normalizeOrderType(itemToEdit.orderType || order.order_type || order.orderType) : normalizeOrderType(order.order_type || order.orderType),
                    cart: initialCart,
                    currentOutfit: itemToEdit ? { ...itemToEdit } : {
                        id: 'current_' + Date.now(),
                        type: '',
                        quantity: 1,
                        gender: order.outfits?.[0]?.section || sections.find(s => s.id === order.outfits?.[0]?.section_id)?.name || null,
                        measurements: {},
                        images: [],
                        notes: '',
                        audioUri: null,
                        fabricSource: 'Customer',
                        measurementDressGiven: 'No',
                        totalCost: 0,
                        orderType: normalizeOrderType(order.order_type || order.orderType),
                        urgency: normalizeUrgency(order.urgency)
                    },
                    advance: order.paid_amount || order.advance_payment || order.advance?.toString() || '',
                    existingAdvance: Number(order.paid_amount) || Number(order.advance_payment) || Number(order.advance) || 0,
                    isDiscountEnabled: !!order.discount_value,
                    discountType: order.discount_type === 'PERCENTAGE' ? '%' : '₹',
                    discountValue: order.discount_value?.toString() || '',
                    paymentInput: '',
                    paymentMode: order.advance_payment_type || order.paymentMode || 'Cash',
                    payments: order.payments || []
                }));

                // Update confirmed order type for the tab label
                const initialOrderType = itemToEdit ? normalizeOrderType(itemToEdit.orderType || order.order_type || order.orderType) : normalizeOrderType(order.order_type || order.orderType);
                setConfirmedOrderType(initialOrderType);

                initializedOrderId.current = editOrderId;
            }
        }
    }, [editOrderId, fetchedOrder, editItemIndex, customers, sections]);

    // Handlers
    const updateState = (updates) => setState((prev) => ({ ...prev, ...updates }));

    const showAlert = (title, message) => setAlert({ visible: true, title, message, type: 'info', onConfirm: undefined });

    const validateStep = (step) => {
        if (step === 0) {
            if (!state.selectedCustomer && !state.customerName) {
                showToast('Please select a customer', 'warning');
                return false;
            }
            if (!state.currentOutfit.gender) {
                showToast('Please select a section', 'warning');
                return false;
            }
            if (!state.currentOutfit.type) {
                showToast('Please select an outfit type', 'warning');
                return false;
            }
        }
        if (step === 2) {
            const materials = state.currentOutfit.materials || [];
            const outfitQty = state.currentOutfit.quantity || 1;
            for (const m of materials) {
                if ((parseFloat(m.quantity) || 0) * outfitQty > (m.numericStock || 0)) {
                    showToast(`Insufficient stock for ${m.name}. Available: ${m.currentStock}`, 'error');
                    return false;
                }
            }
        }
        if (step === 4) {
            if (state.currentOutfit.measurementDressGiven === 'Yes') {
                const images = state.currentOutfit.measurementDressImages || [];
                if (images.length === 0) {
                    showToast('Please upload the measurement dress', 'warning');
                    return false;
                }
            }
        }
        return true;
    };

    const handleNext = () => {
        if (validateStep(currentStep)) {
            // Update confirmed order type only when leaving the first step (Outfit tab)
            if (currentStep === 0) {
                setConfirmedOrderType(state.orderType);
            }
            if (currentStep < 5) setCurrentStep(c => c + 1);
        }
    };

    const handleBack = () => {
        if (currentStep > 0) setCurrentStep(c => c - 1);
        else navigation.goBack();
    };

    const saveMeasurementHistory = async (outfit) => {
        if (!state.selectedCustomer || !outfit.measurements || Object.keys(outfit.measurements).length === 0) return;

        // Filter out empty values
        const validMeasurements = Object.fromEntries(
            Object.entries(outfit.measurements).filter(([_, v]) => v && String(v).trim() !== '')
        );

        if (Object.keys(validMeasurements).length === 0) return;

        const now = new Date();
        const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

        const newHistoryItem = {
            id: Date.now().toString(),
            date: `${dateStr}, ${timeStr}`,
            type: outfit.type,
            data: validMeasurements,
            timestamp: now.getTime()
        };

        const currentHistory = state.selectedCustomer.measurementHistory || [];

        // Check against latest history entry for this outfit type
        const latestEntry = currentHistory.find((h) => h.type === outfit.type);
        if (latestEntry) {
            const newKeys = Object.keys(validMeasurements);
            const oldKeys = Object.keys(latestEntry.data || {});

            if (newKeys.length === oldKeys.length) {
                const isIdentical = newKeys.every(key => validMeasurements[key] === latestEntry.data[key]);
                if (isIdentical) {
                    console.log("Measurements identical to last history. Skipping save.");
                    return;
                }
            }
        }

        const updatedHistory = [newHistoryItem, ...currentHistory];

        try {
            // Update Backend
            await updateCustomer(state.selectedCustomer.id, { measurementHistory: updatedHistory });

            // Update Local State
            updateState({
                selectedCustomer: { ...state.selectedCustomer, measurementHistory: updatedHistory }
            });
        } catch (e) {
            console.error("Failed to save measurement history", e);
        }
    };


    const handleAddAnother = async () => {
        // Auto-save measurements to history
        await saveMeasurementHistory(state.currentOutfit);

        // EDIT MODE: If we are editing a specific item index, update it directly
        if (editItemIndex !== undefined && editItemIndex !== null && editItemIndex >= 0) {
            const newCart = [...state.cart];
            newCart[editItemIndex] = {
                ...state.currentOutfit,
                // Ensure we keep the original ID if valid
                id: state.currentOutfit.id || newCart[editItemIndex].id
            };

            updateState({ cart: newCart });

            // Clear the edit param so subsequent adds are new items
            navigation.setParams({ editItemIndex: undefined });
        }
        else {
            // NORMAL ADD MODE
            // Smart Grouping Logic
            // Check if an identical item exists in the cart (Type, Measurements, Notes)
            const cartIndex = state.cart.findIndex((item) => {
                const isTypeMatch = item.type === state.currentOutfit.type;
                const isMeasurementsMatch = JSON.stringify(item.measurements) === JSON.stringify(state.currentOutfit.measurements);
                const isNotesMatch = (item.notes || '').trim() === (state.currentOutfit.notes || '').trim();

                return isTypeMatch && isMeasurementsMatch && isNotesMatch;
            });

            if (cartIndex !== -1) {
                // Match found! Increment quantity
                const newCart = [...state.cart];
                newCart[cartIndex].quantity += (state.currentOutfit.quantity || 1);

                // Add the cost of currentOutfit to the existing item's cost
                newCart[cartIndex].totalCost = (Number(newCart[cartIndex].totalCost) || 0) + (Number(state.currentOutfit.totalCost) || 0);

                updateState({ cart: newCart });
            } else {
                // No match, add as new item
                const cartItem = {
                    ...state.currentOutfit,
                    // Preserve ID if it exists and is not a temp "current_" ID
                    id: (state.currentOutfit.id && !state.currentOutfit.id.startsWith('current_'))
                        ? state.currentOutfit.id
                        : Date.now().toString(),
                    // Save the current selected date and order info to this item
                    deliveryDate: state.deliveryDate,
                    trialDate: state.trialDate,
                    orderType: state.orderType,
                    urgency: state.urgency
                };
                updateState({
                    cart: [...state.cart, cartItem],
                });
            }
        }

        // Reset current outfit and clear global/item dates for the next outfit
        // Use first boutique section as default instead of hardcoded 'Men'
        const defaultSection = sections?.[0]?.name || null;
        const newOutfit = {
            id: `current_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: '',
            quantity: 1,
            gender: defaultSection,
            measurements: {},
            images: [],
            measurementDressImages: [],
            materialImages: [],
            notes: '',
            audioUri: null,
            fabricSource: 'Customer',
            measurementDressGiven: 'No',
            materials: [],
            totalCost: 0,
            services: [
                { id: 's1', name: 'Stitching', cost: 0 },
            ],
            orderType: 'Stitching',
            urgency: 'Normal',
            requestedPhotosFromClient: false
        };

        updateState({
            trialDate: null,
            deliveryDate: null,
            orderType: 'Stitching',
            urgency: 'Normal',
            currentOutfit: {
                ...newOutfit,
                sketchUri: null
            }
        });
        setCurrentStep(0);
    };



    const handleEditItem = (index) => {
        const itemToEdit = state.cart[index];
        if (!itemToEdit) return; // Safety check

        // Set editItemIndex param to ensure order is preserved on save/update
        navigation.setParams({ editItemIndex: index });

        // Restore to currentOutfit and go to Step 0 (Basic Info)
        // Note: We don't splice from cart here; StepSummary and saving logic handle the 
        // "either/or" logic using editItemIndex to preserve position.
        updateState({
            currentOutfit: { ...itemToEdit, isCurrent: true, id: itemToEdit.id || Date.now().toString() },
            // Fix: Populate Date & Urgency from item being edited
            trialDate: itemToEdit.trialDate || state.trialDate,
            deliveryDate: itemToEdit.deliveryDate || state.deliveryDate,
            urgency: itemToEdit.urgency || state.urgency,
            orderType: itemToEdit.orderType || state.orderType,
        });
        setCurrentStep(0); // Go to start of flow
    };

    const handleRecordingSave = async (uri, duration) => {
        // Save to current outfit immediately with loading state
        updateState({
            currentOutfit: {
                ...state.currentOutfit,
                audioUri: uri,
                audioDuration: duration,
                isTranscribing: true
            }
        });

        let text = "";

        try {
            try {
                text = await transcribeAudioWithWhisper(uri);
            } catch (whisperError) {
                console.error("OpenAI Whisper failed:", whisperError);
                if (showAlert) showAlert("Transcription Failed", `OpenAI Error: ${whisperError.message}`);
                text = ""; // Continue even if transcription fails, don't crash the save
            }

            // Append to existing notes
            const currentNotes = state.currentOutfit.notes || '';
            const newNotes = text ? (currentNotes ? `${currentNotes}\n\n[Transcript]: ${text}` : `[Transcript]: ${text}`) : currentNotes;

            updateState({
                currentOutfit: {
                    ...state.currentOutfit,
                    audioUri: uri,
                    audioDuration: duration,
                    notes: newNotes,
                    isTranscribing: false
                }
            });
        } catch (error) {
            console.error("Recording save failed", error);
            updateState({
                currentOutfit: {
                    ...state.currentOutfit,
                    audioUri: uri,
                    audioDuration: duration,
                    isTranscribing: false
                }
            });
            if (showAlert) showAlert("Error", "Could not save recording updates.");
        }
    };




    const handleCreateOrder = async () => {
        setLoading(true);
        try {
            if (!state.selectedCustomer && !state.customerName) {
                showToast('Please select or add a customer.', 'warning');
                setLoading(false);
                return;
            }

            // UPI Validation Removed
            // Transaction ID is optional

            const finalItems = [...state.cart];
            if (state.currentOutfit.type) {
                await saveMeasurementHistory(state.currentOutfit);
                const isExistingId = state.currentOutfit.id && (
                    typeof state.currentOutfit.id === 'number' ||
                    (typeof state.currentOutfit.id === 'string' && !state.currentOutfit.id.startsWith('current_') && !state.currentOutfit.id.startsWith('final_'))
                );

                const itemId = isExistingId
                    ? state.currentOutfit.id
                    : `final_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

                const itemToSave = {
                    ...state.currentOutfit,
                    id: itemId,
                    deliveryDate: state.deliveryDate,
                    trialDate: state.trialDate,
                    urgency: state.urgency,
                    orderType: state.orderType
                };

                const existingIndexById = finalItems.findIndex((i) => i.id === itemId);
                if (existingIndexById !== -1) {
                    finalItems[existingIndexById] = itemToSave;
                }
                else if (editItemIndex !== undefined && editItemIndex !== null && editItemIndex >= 0 && editItemIndex < finalItems.length) {
                    finalItems[editItemIndex] = itemToSave;
                }
                else {
                    finalItems.push(itemToSave);
                }
            }

            if (finalItems.length === 0) {
                showToast('Please add at least one item to the order.', 'warning');
                setLoading(false);
                return;
            }

            // Material Stock Validation
            for (const item of finalItems) {
                const materials = item.materials || [];
                const itemQty = item.quantity || 1;
                for (const m of materials) {
                    if ((parseFloat(m.quantity) || 0) * itemQty > (m.numericStock || 0)) {
                        showToast(`Insufficient stock for ${m.name}. Available: ${m.currentStock}`, 'error');
                        setLoading(false);
                        return;
                    }
                }
            }

            // Calculate totals for payload - Re-calculate from parts to ensure accuracy (especially during edit/hydration)
            const subtotal = finalItems.reduce((sum, item) => {
                const materialsTotal = (item.materials || []).reduce((s, m) => s + (Number(m.quantity) * (Number(m.sellingPrice) || 0)), 0);
                let calculatedTotal = 0;
                const qty = item.quantity || 1;
                for (let q = 0; q < qty; q++) {
                    const srv = (item.unitServices && item.unitServices[q]) ? item.unitServices[q] : (item.services || []);
                    const sTotal = srv.reduce((ss, s) => ss + (Number(s.cost) || 0), 0);
                    calculatedTotal += sTotal + materialsTotal;
                }
                item.totalCost = calculatedTotal; // Sync back to item object for outfit-level total_amount in payload
                return sum + calculatedTotal;
            }, 0);

            const discountVal = state.isDiscountEnabled ? (Number(state.discountValue) || 0) : 0;
            const discountAmt = state.discountType === '%' ? (subtotal * discountVal / 100) : discountVal;
            const finalAmount = subtotal - discountAmt;
            const advanceAmt = Number(state.paymentInput) || 0;
            // Advance Payment Validation
            const existingAdv = Number(state.existingAdvance) || 0;
            const currentBalance = finalAmount - existingAdv;
            
            if (advanceAmt > currentBalance) {
                showToast(`Advance payment cannot be greater than total balance (₹${currentBalance.toFixed(0)})`, 'warning');
                setLoading(false);
                return;
            }

            const totalBalance = Math.max(0, currentBalance - advanceAmt);

            if (finalAmount <= 0) {
                showToast('Total order value cannot be zero.', 'warning');
                setLoading(false);
                return;
            }

            const convertToISO = (dateStr) => {
                if (!dateStr) return null;
                if (dateStr.includes('-')) return dateStr;
                if (dateStr.includes('/')) {
                    const [d, m, y] = dateStr.split('/');
                    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
                }
                try {
                    return new Date(dateStr).toISOString().split('T')[0];
                } catch (e) {
                    return dateStr;
                }
            };

            // Construct API Payload - Exact structure as requested
            const payload = {
                customer_id: state.selectedCustomer?.id,
                order_type: 'TAILORING',
                order_date: fetchedOrder?.order_date || new Date().toISOString().split('T')[0],
                ...(editOrderId ? {} : { total_outfits: finalItems.length }),
                subtotal: subtotal,
                ...(editOrderId ? {} : {
                    delivery_date: finalItems.reduce((latest, item) => {
                        const d = convertToISO(item.deliveryDate);
                        if (!latest) return d;
                        if (!d) return latest;
                        return d > latest ? d : latest;
                    }, null)
                }),
                total_amount: finalAmount,
                final_amount: finalAmount,
                balance_amount: totalBalance,
                advance_payment: advanceAmt,
                advance_payment_type: state.paymentMode.toUpperCase(),
                transaction_id: state.transactionId || null,
                discount_type: state.discountType === '%' ? 'PERCENTAGE' : 'FIXED',
                discount_value: discountVal,
                discount_amount: discountAmt,
                order_notes: state.currentOutfit.notes || "",
                outfits: finalItems.map(item => {
                    const section = sections?.find(s => s.name === item.gender);

                    const measurementsArray = [];
                    const stitchingArray = [];
                    const photosArray = [];

                    // 1. Map Measurements and Stitching
                    if (item.measurements) {
                        Object.keys(item.measurements).forEach(key => {
                            const val = item.measurements[key];
                            if (!val) return;

                            const mDef = (outfitMeasurements || []).find(m => m.measurement_name?.toLowerCase().trim() === key.toLowerCase().trim());
                            if (mDef) {
                                // Find existing measurement ID if any
                                let existingId = null;
                                if (item.isExisting && Array.isArray(item.measurements_raw)) {
                                    const match = item.measurements_raw.find(m => m.measurement_id === mDef.measurement_id);
                                    if (match) existingId = match.id;
                                }

                                measurementsArray.push({
                                    ...(existingId ? { id: Number(existingId) } : {}),
                                    measurement_id: mDef.measurement_id,
                                    value: String(val)
                                });
                            } else {
                                const sCat = stitchingStructure?.categories?.find(c => c.name?.toLowerCase().trim() === key.toLowerCase().trim());
                                if (sCat) {
                                    const parts = String(val).split(/\s*-\s*/);
                                    let subCat = null, opt = null, subOpt = null;

                                    if (parts.length === 3) {
                                        subCat = sCat.subcategories?.find(sc => sc.name?.toLowerCase().trim() === parts[0].toLowerCase().trim());
                                        opt = subCat?.options?.find(o => o.name?.toLowerCase().trim() === parts[1].toLowerCase().trim());
                                        subOpt = opt?.suboptions?.find(so => so.name?.toLowerCase().trim() === parts[2].toLowerCase().trim());
                                    } else if (parts.length === 2) {
                                        subCat = sCat.subcategories?.find(sc => sc.name?.toLowerCase().trim() === parts[0].toLowerCase().trim());
                                        opt = subCat?.options?.find(o => o.name?.toLowerCase().trim() === parts[1].toLowerCase().trim());
                                    } else {
                                        subCat = sCat.subcategories?.find(sc => sc.name?.toLowerCase().trim() === (parts[0] || '').toLowerCase().trim());
                                    }

                                    // Find existing stitching ID if any
                                    let existingId = null;
                                    if (item.isExisting && Array.isArray(item.stitching_raw)) {
                                        const match = item.stitching_raw.find(s => s.category_id === sCat.id);
                                        if (match) existingId = match.id;
                                    }

                                    stitchingArray.push({
                                        ...(existingId ? { id: Number(existingId) } : {}),
                                        category_id: sCat.id,
                                        sub_category_id: subCat?.id || null,
                                        option_id: opt?.id || null,
                                        sub_option_id: subOpt?.id || null
                                    });
                                }
                            }
                        });
                    }

                    // 2. Map Photos & Audio
                    const findPhotoId = (url, cat) => {
                        if (item.isExisting && Array.isArray(item.photos)) {
                            const match = item.photos.find(p => p.file_url === url && p.category === cat);
                            return match ? match.id : null;
                        }
                        return null;
                    };

                    if (item.images) {
                        item.images.forEach(url => {
                            const pId = findPhotoId(url, 'REFERENCE');
                            photosArray.push({
                                ...(pId ? { id: pId } : {}),
                                file_type: 'IMAGE',
                                category: 'REFERENCE',
                                file_url: url
                            });
                        });
                    }
                    if (item.sketches) {
                        item.sketches.forEach(url => {
                            const pId = findPhotoId(url, 'SKETCH');
                            photosArray.push({
                                ...(pId ? { id: pId } : {}),
                                file_type: 'IMAGE',
                                category: 'SKETCH',
                                file_url: url
                            });
                        });
                    }
                    if (item.measurementDressImages) {
                        item.measurementDressImages.forEach(url => {
                            const pId = findPhotoId(url, 'MEASUREMENT_DRESS');
                            photosArray.push({
                                ...(pId ? { id: pId } : {}),
                                file_type: 'IMAGE',
                                category: 'MEASUREMENT_DRESS',
                                file_url: url
                            });
                        });
                    }
                    if (item.materialImages) {
                        item.materialImages.forEach(url => {
                            const pId = findPhotoId(url, 'MATERIAL');
                            photosArray.push({
                                ...(pId ? { id: pId } : {}),
                                file_type: 'IMAGE',
                                category: 'MATERIAL',
                                file_url: url
                            });
                        });
                    }
                    if (item.audioUri) {
                        const pId = findPhotoId(item.audioUri, 'AUDIO');
                        photosArray.push({
                            ...(pId ? { id: pId } : {}),
                            file_type: 'AUDIO',
                            category: 'AUDIO',
                            file_url: item.audioUri,
                            duration: item.audioDuration || 0
                        });
                    }

                    // 3. Map Services (including quantity_id)
                    const servicesArray = [];
                    const qty = item.quantity || 1;
                    for (let q = 0; q < qty; q++) {
                        const unitServices = (item.unitServices && item.unitServices[q]) ? item.unitServices[q] : (item.services || []);
                        unitServices.forEach(s => {
                            // Check if this service existed in the original fetched order for this outfit
                            let existingId = null;
                            if (item.isExisting && item.unitServices_raw && item.unitServices_raw[q]) {
                                const match = item.unitServices_raw[q].find(oldS => (oldS.service_name || oldS.name) === (s.service_name || s.name));
                                if (match) existingId = match.id;
                            } else if (item.isExisting && s.id && !String(s.id).includes('current_') && !String(s.id).includes('.')) {
                                existingId = s.id;
                            }

                            const finalId = (existingId && !isNaN(Number(existingId)) && !String(existingId).includes('current_')) ? Number(existingId) : null;

                            servicesArray.push({
                                ...(finalId ? { id: finalId } : {}),
                                service_name: s.name || s.service_name,
                                price: s.cost ?? s.price ?? 0,
                                quantity_id: q + 1 // Ordinal ID for the unit
                            });
                        });
                    }

                    const existingOutfitId = item.id && !isNaN(Number(item.id)) && !String(item.id).includes('final_') && !String(item.id).includes('current_')
                        ? Number(item.id)
                        : null;

                    // 4. Map Quantities (Units) - Each unit has its own items (materials)
                    const quantitiesArray = [];
                    for (let q = 0; q < qty; q++) {
                        const qId = q + 1;
                        // Find existing unit data if any
                        const existingUnit = item.isExisting && Array.isArray(item.quantities_raw) 
                            ? item.quantities_raw.find(u => u.quantity_id === qId)
                            : null;

                        quantitiesArray.push({
                            ...(existingUnit?.id ? { id: Number(existingUnit.id) } : {}),
                            quantity_id: qId,
                            status_id: existingUnit?.status_id || 1,
                            trial_date: convertToISO(item.trialDate),
                            delivery_date: convertToISO(item.deliveryDate),
                            items: editOrderId ? [] : (item.materials || []).map(m => ({
                                ...(m.linkId && !isNaN(Number(m.linkId)) ? { id: Number(m.linkId) } : {}),
                                item_type: 'MATERIAL',
                                material_id: m.id,
                                qty: m.quantity,
                                price: m.sellingPrice,
                                total_price: m.quantity * m.sellingPrice,
                                material: m.raw || null
                            }))
                        });
                    }

                    return {
                        ...(existingOutfitId ? { id: existingOutfitId } : {}),
                        outfit_id: item.outfitId,
                        section_id: section?.id || null,
                        quantity: item.quantity,
                        customer_notes: item.notes || "",
                        trial_date: convertToISO(item.trialDate),
                        delivery_date: convertToISO(item.deliveryDate),
                        outfit_order_type: item.orderType ? item.orderType.toUpperCase() : 'STITCHING',
                        urgency: item.urgency ? item.urgency.toUpperCase() : 'NORMAL',
                        services: servicesArray,
                        measurements: measurementsArray,
                        stitching: stitchingArray,
                        photos: photosArray,
                        quantities: quantitiesArray,
                        requestedPhotosFromClient: item.requestedPhotosFromClient || false,
                        requested_photos_from_client: item.requestedPhotosFromClient || false,
                        ...(editOrderId ? {
                            items: (item.materials || []).map(m => ({
                                ...(m.linkId && !isNaN(Number(m.linkId)) ? { id: Number(m.linkId) } : {}),
                                item_type: 'MATERIAL',
                                material_id: m.id,
                                qty: m.quantity,
                                price: m.sellingPrice,
                                total_price: m.quantity * m.sellingPrice
                            }))
                        } : {
                            total_amount: item.totalCost,
                            is_measurement_dress_given: item.measurementDressGiven === 'Yes',
                            is_audio_instruction: !!item.audioUri,
                        })
                    };
                })
            };

            let resultAction;
            let responseData;
            let latestOrderData = null;

            if (editOrderId) {
                // Manual PUT for Tailoring Order Update (avoiding slice changes)
                try {
                    const token = await getAuthToken(store.getState);
                    const updateUrl = `${URL_ORDERS}/${editOrderId}`;
                    console.log('UPDATE TAILORING ORDER - URL:', updateUrl);
                    console.log('UPDATE TAILORING ORDER - Body:', JSON.stringify(payload, null, 2));

                    const response = await axios.put(updateUrl, payload, {
                        headers: {
                            'Content-Type': 'application/json',
                            accept: 'application/json',
                            Authorization: token,
                        },
                    });

                    console.log('UPDATE TAILORING ORDER - Response:', response.data);
                    responseData = response.data;
                    try {
                        latestOrderData = await dispatch(getOrderByIdAction(editOrderId)).unwrap();
                        dispatch(markOrdersListForRefresh());
                    } catch (refreshError) {
                        console.log('REFRESH UPDATED ORDER - Error:', refreshError);
                        showToast(
                            refreshError?.message ||
                            refreshError?.error ||
                            refreshError?.data?.message ||
                            'Order updated, but failed to refresh latest data. Please try again.',
                            'error',
                        );
                        setLoading(false);
                        return;
                    }
                } catch (error) {
                    console.log('UPDATE TAILORING ORDER - Error:', error.response?.data || error.message);
                    showToast(error.response?.data?.message || 'Failed to update order. Please try again.', 'error');
                    setLoading(false);
                    return;
                }
            } else {
                // Standard POST via Slice for New Order
                const saveMethod = 'POST (Create)';
                const saveUrl = URL_ORDERS;
                
                // Modify payload for create order based on required structure
                const createPayload = { ...payload };
                delete createPayload.delivery_date;
                createPayload.outfits = createPayload.outfits.map((o, index) => {
                    const originalItem = finalItems[index];
                    const newOutfit = { ...o };
                    delete newOutfit.id;
                    delete newOutfit.quantities;
                    
                    newOutfit.items = (originalItem.materials || []).map(m => ({
                        item_type: 'MATERIAL',
                        material_id: m.id,
                        qty: m.quantity,
                        price: m.sellingPrice,
                        total_price: m.quantity * m.sellingPrice
                    }));
                    
                    return newOutfit;
                });

                console.log(`[Order Flow] ${saveMethod} to API: ${saveUrl}`);
                console.log(`[Order Flow] Payload:`, JSON.stringify(createPayload, null, 2));

                resultAction = await dispatch(createSalesOrderAction(createPayload));
                if (createSalesOrderAction.fulfilled.match(resultAction)) {
                    responseData = resultAction.payload;
                    console.log('Order Creation Success:', responseData);
                } else {
                    const error = resultAction.payload;
                    console.log('Order Creation Error:', error);
                    showToast(error?.message || 'Failed to confirm order', 'error');
                    setLoading(false);
                    return;
                }
            }

            if (responseData) {
                // Transform API response to match OrderSuccessModal requirements
               const orderData = latestOrderData || responseData.data || responseData;
                const formattedOrder = {
                    ...orderData,
                    customerName: orderData.customer?.customerName || orderData.customerName,
                    billNo: orderData.billNo || orderData.bill_no || orderData.order_no || orderData.order_number || orderData.id,
                    total: parseFloat(orderData.finalAmount ?? orderData.total ?? orderData.total_amount ?? 0),
                    advance: parseFloat(orderData.advance ?? orderData.advance_payment ?? 0),
                    balance: parseFloat(orderData.balance ?? orderData.balance_amount ?? 0),
                    deliveryDate: orderData.deliveryDate || (orderData.delivery_date ? formatDisplayDate(orderData.delivery_date) : null),
                    invoiceUrl: orderData.invoiceUrl || orderData.payments?.[0]?.invoice_url
                };

                setCreatedOrder({
                    ...formattedOrder,
                    successMessage:
                        responseData.message ||
                        (editOrderId ? 'Order updated successfully' : 'Order confirmed successfully'),
                });
                await clearDraft();
                setSuccessModalVisible(true);
            }
        } catch (error) {
            console.error('Confirm order execution failed:', error);
            showToast('An unexpected error occurred.', 'error');
        } finally {
            setLoading(false);
        }
    };


    const { width: screenWidth } = useWindowDimensions();

    useEffect(() => {
        // Auto-scroll the tab bar to the active tab (centered)
        if (tabBarRef.current) {
            const tabWidth = 100; // estimated
            const targetX = (currentStep * tabWidth) - (screenWidth / 2) + (tabWidth / 2);
            tabBarRef.current.scrollTo({ x: Math.max(0, targetX), animated: true });
        }
    }, [currentStep, screenWidth]);

    const renderHeader = () => {
        if (!editOrderId) {
            return (
                <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
                        <ArrowLeft size={24} color={Colors.textPrimary} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{editOrderId ? 'Edit Order' : 'New Order'}</Text>
                    <View style={{ width: 32 }} />
                </View>
            );
        }
        return null;
    };

    const createdOrderAdvanceAmount = Number(
        createdOrder?.advance ??
        createdOrder?.advance_payment ??
        createdOrder?.paid_amount ??
        0,
    ) || 0;
    const createdOrderPayments = Array.isArray(createdOrder?.payments)
        ? createdOrder.payments
        : [];
    const isCreatedSalesOrder =
        createdOrder?.orderTypeApi === 'SALE_ORDER' ||
        createdOrder?.order_type === 'SALE_ORDER' ||
        createdOrder?.orderCategory === 'Sales';
    const hasCreatedOrderCustomerCopy =
        isCreatedSalesOrder ||
        createdOrderAdvanceAmount > 0 ||
        createdOrderPayments.length > 0 ||
        !!createdOrder?.invoiceUrl ||
        !!createdOrder?.invoice_url;

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />


            {/* Header with Tabs */}
            <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === 'ios' ? 0 : 10), height: 110, paddingBottom: 10 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%' }}>
                    <TouchableOpacity onPress={handleBack} style={{ padding: 4 }}>
                        <ArrowLeft size={24} color={Colors.textPrimary} />
                    </TouchableOpacity>
                    <View style={{ flex: 1, marginLeft: 16 }}>
                        <Text style={styles.headerTitle}>{editOrderId ? 'Edit Order' : 'New Order'}</Text>
                        {currentStep > 0 && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                    <User size={14} color={Colors.textSecondary} />
                                    <Text style={styles.headerSubtitle}>{state.selectedCustomer?.name || state.customerName || 'Customer'}</Text>
                                </View>
                                <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: '#cbd5e1' }} />
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                    <Shirt size={14} color={Colors.textSecondary} />
                                    <Text style={styles.headerSubtitle}>{state.currentOutfit.type || 'Outfit'}</Text>
                                </View>
                            </View>
                        )}
                    </View>
                    {!editOrderId && (
                        <TouchableOpacity 
                            onPress={() => navigation.goBack()}
                            style={{ 
                                paddingHorizontal: 12, 
                                paddingVertical: 6, 
                                backgroundColor: '#F1F5F9', 
                                borderRadius: 16 
                            }}
                        >
                            <Text style={{ fontFamily: 'Inter-Medium', fontSize: 13, color: '#64748B' }}>Cancel</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Tab Bar ScrollView */}
            <View style={{ backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }}>
                <ScrollView
                    ref={tabBarRef}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: 16 }}
                >
                    {[
                        { id: 0, title: 'Outfit' },
                        { id: 1, title: confirmedOrderType },
                        { id: 2, title: 'Materials' },
                        { id: 3, title: 'Measurements' },
                        { id: 4, title: 'Photos' },
                        { id: 5, title: 'Summary' }
                    ].map((tab) => {
                        const isActive = currentStep === tab.id;
                        const isCompleted = currentStep > tab.id;

                        return (
                            <TouchableOpacity
                                key={tab.id}
                                style={{
                                    paddingVertical: 12,
                                    marginRight: 24,
                                    borderBottomWidth: 2,
                                    borderBottomColor: isActive ? Colors.primary : 'transparent'
                                }}
                                onPress={() => {
                                    // If clicking the current active tab, move to the next tab
                                    if (isActive) {
                                        handleNext();
                                        return;
                                    }

                                    // Standard tab click navigation
                                    if (tab.id < currentStep || validateStep(currentStep)) {
                                        // Final validation for measurement dress photo before summary
                                        if (tab.id === 5 && state.currentOutfit.measurementDressGiven === 'Yes' && (!state.currentOutfit.measurementDressImages || state.currentOutfit.measurementDressImages.length === 0)) {
                                            showToast('Please upload the measurement dress', 'warning');
                                            setCurrentStep(4);
                                            return;
                                        }

                                        // Sync confirmed order type if jumping away from Step 0
                                        if (currentStep === 0 && tab.id > 0) {
                                            setConfirmedOrderType(state.orderType);
                                        }
                                        setCurrentStep(tab.id);
                                    }
                                }}
                            >
                                <Text style={{
                                    fontFamily: isActive ? 'Inter-SemiBold' : 'Inter-Medium',
                                    fontSize: 14,
                                    color: isActive ? Colors.primary : (isCompleted ? Colors.textPrimary : Colors.textSecondary)
                                }}>
                                    {tab.title}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>

            {/* Content */}
            {/* Content Area */}
            {/* Content Area */}
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
            >
                <View style={{ flex: 1 }}>
                    {currentStep === 0 && <Step1BasicInfo state={state} onChange={updateState} customers={customers} outfits={outfits} openCustomerModal={() => setCustomerModalVisible(true)} editItemIndex={editItemIndex} onShowAlert={showAlert} editOrderId={editOrderId} />}
                    {currentStep === 1 && <StepStitching state={state} onChange={updateState} outfits={outfits} />}
                    {currentStep === 2 && <StepMaterials state={state} onChange={updateState} onShowAlert={showAlert} editOrderId={editOrderId} />}
                    {currentStep === 3 && <StepMeasurements state={state} onChange={updateState} />}
                    {currentStep === 4 && <Step3Media state={state} onChange={updateState} onShowAlert={showAlert} />}
                    {currentStep === 5 && (
                        <Step4BillingWrapper
                            state={state}
                            onChange={updateState}
                            onAddAnother={handleAddAnother}
                            onDeleteItem={handleDeleteItem}
                            confirmDeleteItem={confirmDeleteItem}
                            onEditItem={handleEditItem}
                            onShowAlert={showAlert}
                            onGoToStep={setCurrentStep}
                            editItemIndex={editItemIndex}
                            editOrderId={editOrderId}
                            onCreateOrder={handleCreateOrder}
                            loading={loading}
                        />
                    )}
                </View>
            </KeyboardAvoidingView>

            {/* Footer Buttons */}
            {currentStep < 5 && (
                <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, Platform.OS === 'android' ? 60 : 24) }]}>
                    <TouchableOpacity style={styles.outlineBtn} onPress={handleBack}>
                        <ArrowLeft size={18} color="#1E293B" strokeWidth={2.5} />
                        <Text style={styles.outlineBtnText}>Back</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
                        <Text style={styles.nextBtnText}>Next</Text>
                        <ArrowRight size={18} color={Colors.white} strokeWidth={2.5} />
                    </TouchableOpacity>
                </View>
            )}

            {/* Global Loader for Order Detail Fetch */}
            {fetchingOrder && (
                <View style={[StyleSheet.absoluteFill, {
                    backgroundColor: 'rgba(255, 255, 255, 0.7)',
                    zIndex: 999,
                    justifyContent: 'center',
                    alignItems: 'center'
                }]}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                    <Text style={{ marginTop: 12, fontFamily: 'Inter-Medium', color: '#64748B' }}>Fetching order details...</Text>
                </View>
            )}

            {/* Modals */}
            <AlertModal
                visible={alert.visible}
                title={alert.title}
                message={alert.message}
                onClose={() => setAlert(prev => ({ ...prev, visible: false }))}
                onConfirm={alert.onConfirm}
            />
            <CustomerSelectionModal
                visible={customerModalVisible}
                onClose={() => setCustomerModalVisible(false)}
                onSelect={async (cust) => {
                    if (cust.isNew) {
                        setLoading(true);
                        try {
                            const newCust = await addCustomer({
                                name: cust.name,
                                mobile: cust.mobile,
                                location: cust.location
                            });
                            updateState({ selectedCustomer: newCust, customerName: newCust.name, customerMobile: newCust.mobile });
                        } catch (e) {
                            console.error(e);
                            showAlert('Error', 'Failed to save new customer. Process continued correctly but customer might not be saved in directory.');
                            // Fallback to local state just in case
                            updateState({ selectedCustomer: cust, customerName: cust.name, customerMobile: cust.mobile });
                        } finally {
                            setLoading(false);
                        }
                    } else {
                        updateState({ selectedCustomer: cust, customerName: cust.name, customerMobile: cust.mobile });
                    }
                    setCustomerModalVisible(false);
                }}
                customers={customers}
            />



            {successModalVisible && (
                <OrderSuccessModal
                    visible={successModalVisible}
                    order={createdOrder}
                    loading={loading}
                    onPrint={hasCreatedOrderCustomerCopy ? handlePrintOrder : undefined}
                    onWhatsapp={() => { }}
                    onClose={navigateToOrdersList}
                />
            )}


            <BottomConfirmationSheet
                visible={deleteSheetVisible}
                onClose={() => {
                    pendingDeleteActionRef.current = null;
                    setDeleteSheetVisible(false);
                    setItemToDeleteIndex(null);
                }}
                onConfirm={handleConfirmDelete}
                title={deleteSheetConfig.title}
                description={deleteSheetConfig.description}
                confirmText={deleteSheetConfig.confirmText}
                type="danger"
            />

            <PDFPreviewModal
                visible={previewVisible}
                html={previewHtml}
                title="Customer Copy"
                onClose={() => setPreviewVisible(false)}
                onPrint={handleActualPrint}
                onShare={handleActualShare}
            />

            <ReusableBottomDrawer
                visible={discardDrawerVisible}
                onClose={() => setDiscardDrawerVisible(false)}
                height="auto"
            >
                <View style={{ padding: 20 }}>
                    <View style={{ alignItems: 'center', marginBottom: 24 }}>
                        <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: '#FEF2F2', justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
                            <AlertTriangle size={28} color={Colors.danger} />
                        </View>
                        <Text style={{ fontFamily: 'Inter-Bold', fontSize: 18, color: Colors.textPrimary, marginBottom: 8 }}>Discard changes?</Text>
                        <Text style={{ fontFamily: 'Inter-Regular', fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 }}>
                            You have unsaved changes. Are you sure you want to discard them and leave?
                        </Text>
                    </View>

                    <View style={{ flexDirection: 'row', gap: 12 }}>
                        <TouchableOpacity
                            style={[styles.outlineBtn, { flex: 1 }]}
                            onPress={() => setDiscardDrawerVisible(false)}
                        >
                            <Text style={styles.outlineBtnText}>Don't leave</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.primaryBtn, { flex: 1, backgroundColor: Colors.danger }]}
                            onPress={async () => {
                                isDiscardingRef.current = true;
                                await clearDraft();
                                setDiscardDrawerVisible(false);
                                if (pendingAction) {
                                    navigation.dispatch(pendingAction);
                                } else {
                                    navigation.goBack();
                                }
                            }}
                        >
                            <Text style={styles.primaryBtnText}>Discard</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ReusableBottomDrawer>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB', // Lighter background
    },
    drawerMeasurementContent: {
        backgroundColor: Colors.white,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        paddingTop: 24,
        paddingHorizontal: 20,
        paddingBottom: 40,
        height: '85%',
    },
    drawerModalSubtitle: {
        fontSize: 14,
        fontFamily: 'Inter-Regular',
        color: Colors.textSecondary,
        marginTop: 2,
    },
    drawerSearchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 20,
    },
    drawerSearchBarContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.white,
        borderRadius: 12,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: Colors.border,
        height: 48,
    },
    drawerSearchIcon: {
        marginRight: 8,
    },
    drawerSearchBar: {
        flex: 1,
        fontSize: 16,
        fontFamily: 'Inter-Regular',
        color: Colors.textPrimary,
        height: '100%',
    },
    drawerAddBtnSmall: {
        width: 48,
        height: 48,
        backgroundColor: Colors.primary,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    drawerMeasurementItem: {
        width: '48%',
        backgroundColor: '#F8FAFC',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        alignItems: 'center',
        ...Shadow.subtle,
    },
    drawerCustomCheckbox: {
        width: 20,
        height: 20,
        borderRadius: 4,
        borderWidth: 2,
        borderColor: Colors.border,
        position: 'absolute',
        top: 12,
        left: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    drawerCustomCheckboxActive: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    drawerItemDeleteBtn: {
        position: 'absolute',
        top: 10,
        right: 10,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#FEE2E2',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },

    drawerMeasurementImgContainer: {
        width: 80,
        height: 80,
        marginVertical: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    drawerMeasurementImage: {
        width: '100%',
        height: '100%',
    },
    drawerMeasurementLabel: {
        fontSize: 14,
        fontFamily: 'Inter-Medium',
        color: Colors.textPrimary,
        textAlign: 'center',
    },
    drawerModalFooter: {
        paddingTop: 16,
    },
    drawerConfirmBtn: {
        backgroundColor: Colors.primary,
        borderRadius: 14,
        height: 52,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        ...Shadow.medium,
    },
    drawerConfirmBtnText: {
        fontSize: 16,
        fontFamily: 'Inter-Bold',
        color: 'white',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 12 : 50,
        backgroundColor: Colors.white,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    // Styles for Visual Options
    optionCard: {
        width: '30%',
        paddingVertical: 12, // Allow height to grow with content
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        backgroundColor: '#F9FAFB',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 4,
        position: 'relative',
        minHeight: 100 // Ensure minimum height
    },
    optionCardSelected: {
        borderColor: Colors.primary,
        backgroundColor: '#F0FDF4',
        borderWidth: 2
    },
    optionCardSplitSelected: {
        borderColor: Colors.primary,
        borderWidth: 2,
        backgroundColor: '#F0F9FF',
    },
    balanceHighlightCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderRadius: 12,
        width: '100%'
    },
    sketchContainer: {
        height: 300,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        overflow: 'hidden',
        ...Shadow.small
    },
    sketchToolBtn: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center'
    },
    sketchToolText: {
        fontFamily: 'Inter-Medium',
        fontSize: 12,
        color: Colors.textPrimary
    },
    saveSketchBtn: {
        position: 'absolute',
        bottom: 16,
        right: 16,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.primary,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        gap: 8,
        ...Shadow.medium
    },
    saveSketchText: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 14,
        color: Colors.white
    },
    optionImage: {
        width: 48, // Fixed size square
        height: 48,
        resizeMode: 'contain',
        marginBottom: 8
    },
    optionPlaceholder: {
        width: 48, // Fixed size square
        height: 48,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
        backgroundColor: '#F3F4F6',
        borderRadius: 8 // Soft rounded corners like the card
    },
    optionText: {
        fontFamily: 'Inter-Medium',
        fontSize: 13, // Increased font size
        color: Colors.textSecondary,
        textAlign: 'center',
        lineHeight: 18
    },
    optionTextSelected: {
        color: Colors.primary,
        fontFamily: 'Inter-SemiBold'
    },
    checkBadge: {
        position: 'absolute',
        top: 2,
        right: 2,
        backgroundColor: Colors.primary,
        borderRadius: 6,
        width: 14,
        height: 14,
        alignItems: 'center',
        justifyContent: 'center'
    },
    // ... existing generic styles
    footer: {
        flexDirection: 'row',
        padding: 16,
        backgroundColor: Colors.white,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
        gap: 12
    },
    nextBtn: {
        flex: 1,
        flexDirection: 'row',
        backgroundColor: Colors.primary,
        height: 52, // Slightly taller for premium feel
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    nextBtnText: {
        color: Colors.white,
        fontFamily: 'Inter-Bold',
        fontSize: 16
    },
    outlineBtn: {
        flex: 1,
        flexDirection: 'row',
        backgroundColor: '#E2E8F0', // Grey background as per image
        height: 52,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    outlineBtnText: {
        color: '#1E293B',
        fontFamily: 'Inter-Bold',
        fontSize: 16
    },
    primaryBtn: {
        backgroundColor: Colors.primary,
        height: 50,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        ...Shadow.medium
    },
    primaryBtnText: {
        color: Colors.white,
        fontFamily: 'Inter-Bold',
        fontSize: 16
    },

    // Step Container
    stepContainer: {
        flex: 1,
        padding: 16,
    },

    // Compact Card Styles
    card: {
        backgroundColor: Colors.white,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#F3F4F6',
        ...Shadow.small
    },
    cardTitle: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 16,
        color: '#111827',
        marginBottom: 12
    },
    fieldLabel: {
        fontFamily: 'Inter-Medium',
        fontSize: 13,
        color: '#6B7280',
        marginBottom: 4
    },

    // Inputs
    dateInputDisplay: {
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 8,
        height: 44,
        justifyContent: 'center',
        paddingHorizontal: 12
    },
    dateInputText: {
        fontFamily: 'Inter-Medium',
        color: '#111827',
        fontSize: 14
    },
    dropdownDisplay: {
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 8,
        height: 44,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12
    },
    dropdownText: {
        fontFamily: 'Inter-Medium',
        color: '#111827',
        fontSize: 14
    },

    // Type Toggles
    typeToggle: {
        flexDirection: 'row',
        backgroundColor: '#F3F4F6',
        borderRadius: 8,
        padding: 2
    },
    typeBtn: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        borderRadius: 6
    },
    typeBtnActive: {
        backgroundColor: Colors.white,
        ...Shadow.small
    },
    typeBtnText: {
        fontFamily: 'Inter-Medium',
        fontSize: 13,
        color: '#6B7280'
    },
    typeBtnTextActive: {
        color: Colors.primary,
        fontFamily: 'Inter-SemiBold'
    },

    // Customer Card specific
    subLabel: {
        fontFamily: 'Inter-Medium',
        fontSize: 12,
        color: '#6B7280',
        marginBottom: 8,
        marginLeft: 4
    },
    valueText: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 16,
        color: '#111827'
    },

    // Step 4 Accordion
    summaryCard: {
        backgroundColor: Colors.white,
        borderRadius: 16,
        padding: 0,
        marginBottom: 20,
        ...Shadow.small,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#F3F4F6'
    },
    accordionCard: {
        backgroundColor: Colors.white,
        borderRadius: 12,
        padding: 0,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#F3F4F6',
        ...Shadow.small,
        overflow: 'hidden'
    },
    accordionCardExpanded: {
        borderColor: Colors.primary + '30',
        backgroundColor: '#FCFCFD',
        ...Shadow.medium
    },
    cardHeaderRow: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
        backgroundColor: '#FCFCFD'
    },
    accordionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        minHeight: 56
    },
    accordionContent: {
        padding: 16,
        paddingTop: 0,
        backgroundColor: Colors.white
    },
    accordionBody: {
        padding: 16,
        paddingTop: 0,
        backgroundColor: '#F8FAFC'
    },
    itemNameText: {
        fontFamily: 'Inter-Bold',
        fontSize: 15,
        color: '#1F2937'
    },
    itemQtyText: {
        fontFamily: 'Inter-Medium',
        fontSize: 13,
        color: '#6B7280'
    },
    itemPriceText: {
        fontFamily: 'Inter-Bold',
        fontSize: 15,
        color: '#1F2937'
    },
    itemDivider: {
        height: 1,
        backgroundColor: '#F3F4F6',
        marginLeft: 16
    },
    draftBadge: {
        backgroundColor: '#DCFCE7',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12
    },
    draftBadgeText: {
        fontFamily: 'Inter-Bold',
        fontSize: 10,
        color: '#166534'
    },
    smallInputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 8,
        paddingHorizontal: 12,
        height: 40,
        backgroundColor: Colors.white
    },
    smallCurrencyInput: {
        flex: 1,
        fontFamily: 'Inter-Medium',
        fontSize: 14,
        color: '#1F2937'
    },
    currencyPrefixSmall: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 14,
        color: '#9CA3AF',
        marginRight: 4
    },
    fieldLabelSmall: {
        fontFamily: 'Inter-Medium',
        fontSize: 12,
        color: '#4B5563',
        marginBottom: 4,
        width: 80
    },
    fieldRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12
    },
    textDeleteBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6
    },
    textDeleteBtnText: {
        fontFamily: 'Inter-Medium',
        fontSize: 13,
        color: Colors.danger
    },
    addAnotherBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#F0F9FF',
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#BAE6FD',
        borderStyle: 'dashed',
        marginBottom: 24
    },
    addAnotherText: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 15,
        color: Colors.primary
    },
    // Bill Summary
    advanceRow: {
        flexDirection: 'row',
        gap: 12
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 10,
        paddingHorizontal: 12,
        height: 48,
        backgroundColor: '#F9FAFB'
    },
    currencyInput: {
        flex: 1,
        fontFamily: 'Inter-SemiBold',
        fontSize: 16,
        color: '#1F2937'
    },
    currencyPrefix: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 16,
        color: '#9CA3AF',
        marginRight: 4
    },
    modeToggle: {
        flexDirection: 'row',
        backgroundColor: '#F3F4F6',
        borderRadius: 10,
        padding: 4,
        height: 48,
        alignItems: 'center'
    },
    modeBtn: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
        height: '100%',
        justifyContent: 'center'
    },
    modeBtnActive: {
        backgroundColor: Colors.white,
        ...Shadow.small
    },
    modeBtnText: {
        fontFamily: 'Inter-Medium',
        fontSize: 13,
        color: '#6B7280'
    },
    modeBtnTextActive: {
        fontFamily: 'Inter-SemiBold',
        color: Colors.textPrimary
    },
    divider: {
        height: 1,
        backgroundColor: '#E5E7EB',
        marginVertical: 16
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8
    },
    summaryLabel: {
        fontFamily: 'Inter-Medium',
        fontSize: 15,
        color: '#4B5563'
    },
    summaryValue: {
        fontFamily: 'Inter-Bold',
        fontSize: 16,
        color: '#111827'
    },
    totalLabel: {
        fontFamily: 'Inter-Bold',
        fontSize: 16,
        color: '#111827'
    },
    totalValue: {
        fontFamily: 'Inter-Bold',
        fontSize: 18,
        color: Colors.primary
    },
    // Restored Missing Styles
    section: {
        marginBottom: 16,
    },
    input: {
        backgroundColor: Colors.white,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 12,
        paddingHorizontal: 16,
        height: 50,
        fontFamily: 'Inter-Regular',
        fontSize: 15,
        color: Colors.textPrimary,
    },
    headerTitle: {
        fontFamily: 'Inter-Bold',
        fontSize: 18,
        color: Colors.textPrimary
    },
    headerSubtitle: {
        fontFamily: 'Inter-Regular',
        fontSize: 13,
        color: Colors.textSecondary,
        marginTop: 2
    },
    circularProgress: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F0FDF9', // Light green bg
        borderWidth: 2,
        borderColor: Colors.primary,
        overflow: 'hidden'
    },
    progressText: {
        fontFamily: 'Inter-Bold',
        fontSize: 12,
        color: Colors.primary
    },
    circleBg: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'transparent'
    },
    circleFill: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(16, 185, 129, 0.1)' // Very subtle fill if needed, or just rely on text
        // Actually, for a ring effect we need SVG. For "Circle fill", maybe just text is enough as requested "compact as circle fill".
        // Let's stick to the ring border + Text 2/4.
    },
    content: {
        padding: Spacing.lg,
        paddingBottom: 80
    },



    // Measurement Styles
    measurementsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginHorizontal: -8,
    },
    measurementField: {
        width: '50%',
        paddingHorizontal: 8,
        marginBottom: Spacing.md,
    },

    fieldInput: {
        backgroundColor: Colors.white,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 12,
        paddingHorizontal: Spacing.md,
        height: 48,
        fontFamily: 'Inter-SemiBold',
        fontSize: 15,
        color: Colors.textPrimary,
    },
    infoBox: {
        backgroundColor: '#F3F4F6',
        padding: Spacing.md,
        borderRadius: 12,
    },
    infoText: {
        fontFamily: 'Inter-Medium',
        fontSize: 13,
        color: Colors.textSecondary,
    },
    // Media Styles
    sectionTitle: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 15,
        color: Colors.textPrimary
    },
    // New Billing UI Styles


    imageGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    imagePreview: {
        width: 100,
        height: 100,
        borderRadius: 12,
        backgroundColor: '#F3F4F6',
        ...Shadow.subtle,
    },
    removeImageBtn: {
        position: 'absolute',
        top: -6,
        right: -6,
        backgroundColor: Colors.danger,
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: Colors.white,
    },
    addImageBtn: {
        width: 100,
        height: 100,
        borderRadius: 12,
        backgroundColor: '#F0FDF4',
        borderWidth: 1,
        borderColor: '#86EFAC',
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 4,
    },
    emptyUploadBox: {
        width: '100%',
        paddingVertical: 32,
        paddingHorizontal: 24,
        gap: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderStyle: 'dashed',
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        marginBottom: 16
    },
    addImageText: {
        fontFamily: 'Inter-Medium',
        fontSize: 12,
        color: Colors.primary,
    },
    voiceNoteCard: {
        flexDirection: 'column',
        backgroundColor: Colors.white,
        padding: 12,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    micCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: Colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        ...Shadow.subtle,
    },
    voiceTitle: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 15,
        color: Colors.textPrimary,
    },
    voiceSub: {
        fontFamily: 'Inter-Regular',
        fontSize: 13,
        color: Colors.textSecondary,
    },

    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 12,
        paddingHorizontal: 12,
        marginBottom: 12,
        backgroundColor: Colors.white,
        height: 50,
        gap: 8,
    },
    customerInput: {
        flex: 1,
        fontFamily: 'Inter-Regular',
        fontSize: 16,
        color: Colors.textPrimary,
        height: '100%',
    },
    suggestionsContainer: {
        backgroundColor: Colors.white,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 12,
        marginTop: -8,
        marginBottom: 16,
        maxHeight: 200,
        ...Shadow.medium,
        zIndex: 10, // Ensure it floats above
    },
    suggestionItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    suggestionName: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 15,
        color: Colors.textPrimary,
    },
    suggestionMobile: {
        fontFamily: 'Inter-Regular',
        fontSize: 13,
        color: Colors.textSecondary,
    },
    suggestionLocation: {
        fontFamily: 'Inter-Regular',
        fontSize: 12,
        color: Colors.textSecondary,
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    dropdownInput: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 50,
        backgroundColor: Colors.white,
    },
    dropdownInputText: {
        fontFamily: 'Inter-Regular',
        fontSize: 16,
        color: Colors.textPrimary,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: Spacing.xl,
    },
    pickerModalContent: {
        backgroundColor: Colors.white,
        borderRadius: 16,
        padding: Spacing.lg,
        ...Shadow.medium,
        maxHeight: '60%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    modalTitle: {
        fontFamily: 'Inter-Bold',
        fontSize: 18,
        color: Colors.textPrimary,
    },
    pickerItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    pickerItemText: {
        fontFamily: 'Inter-Medium',
        fontSize: 16,
        color: Colors.textPrimary,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    // Measurement Input Styles
    measurementInputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.white,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 12,
        paddingHorizontal: Spacing.md,
        height: 48,
    },
    measurementInput: {
        flex: 1,
        fontFamily: 'Inter-SemiBold',
        fontSize: 15,
        color: Colors.textPrimary,
        height: '100%'
    },
    unitSuffix: {
        fontFamily: 'Inter-Medium',
        fontSize: 13,
        color: Colors.textSecondary,
        marginLeft: 4
    },
    // Liquid Progress
    liquidContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#E5E7EB',
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.border,
    },
    liquidFill: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#34D399', // A nice liquid green
        opacity: 0.8
    },
    liquidText: {
        fontFamily: 'Inter-Bold',
        fontSize: 12,
        color: Colors.textPrimary,
        zIndex: 10
    },
    // Order Status Bar
    orderStatusBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        paddingHorizontal: Spacing.lg,
        paddingVertical: 6,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    orderIdText: {
        fontFamily: 'Inter-Medium',
        fontSize: 13,
        color: Colors.textPrimary,
    },
    autoSaveText: {
        fontFamily: 'Inter-Regular',
        fontSize: 12,
        color: Colors.success,
    },

    // History Modal
    historyModalContent: {
        backgroundColor: Colors.white,
        borderRadius: 20,
        padding: 24,
        width: '90%',
        maxHeight: '80%',
        ...Shadow.large,
    },
    tableHeader: {
        flexDirection: 'row',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
        marginBottom: 8
    },
    tableHeadText: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 13,
        color: Colors.textSecondary,
    },
    tableRow: {
        flexDirection: 'row',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
        alignItems: 'center'
    },
    tableCellDate: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 14,
        color: Colors.textPrimary
    },
    tableCellSub: {
        fontFamily: 'Inter-Regular',
        fontSize: 12,
        color: Colors.textSecondary
    },
    tableCellText: {
        fontFamily: 'Inter-Medium',
        fontSize: 14,
        color: Colors.textPrimary
    },
    applyBtn: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: Colors.white,
        borderWidth: 1,
        borderColor: Colors.primary,
        borderRadius: 8
    },
    applyBtnText: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 12,
        color: Colors.primary
    },

    // --- Step 1 Refactor Styles ---
    customerSelectBtn: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 12,
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        marginTop: 8
    },


    calendarContainer: {
        backgroundColor: Colors.white,
        margin: 20,
        borderRadius: 24,
        padding: 24,
        ...Shadow.large,
        width: '90%',
        maxWidth: 360
    },
    calendarHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20
    },
    calendarTitle: {
        fontFamily: 'Inter-Bold',
        fontSize: 18,
        color: '#0F172A'
    },
    weekRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8
    },
    weekDayText: {
        width: '14.2%', // 100/7
        textAlign: 'center',
        fontFamily: 'Inter-SemiBold',
        fontSize: 12,
        color: Colors.textSecondary
    },
    // --- Step 1 Refactor Styles ---
    newSectionTitle: {
        fontFamily: 'Inter-Bold',
        fontSize: 18,
        color: Colors.textPrimary,
        marginBottom: 4,
    },
    sectionSubLabel: {
        fontFamily: 'Inter-Medium',
        fontSize: 13,
        color: '#64748B',
        marginBottom: 8,
    },
    customerCleanArea: {
        paddingVertical: 16,
        paddingHorizontal: 12,
        borderRadius: 16,
        backgroundColor: Colors.white,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        ...Shadow.subtle,
    },
    customerAvatarClean: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#F8FAFC',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    customerNameMain: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 17,
        color: Colors.textPrimary,
    },
    customerSubText: {
        fontFamily: 'Inter-Medium',
        fontSize: 13,
        color: '#64748B',
        marginTop: 2,
    },
    dateModernCard: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: Colors.white,
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 52,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    modernLabel: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 13,
        color: '#64748B',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 8,
    },
    modernDateText: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 14,
        color: Colors.textPrimary,
    },
    dateClearBtn: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#FEF2F2',
        alignItems: 'center',
        justifyContent: 'center',
    },
    modernDropdown: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: Colors.white,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 16,
        paddingHorizontal: 16,
        height: 56,
        ...Shadow.subtle,
    },
    modernDropdownText: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 16,
        color: Colors.textPrimary,
    },
    chipGroup: {
        flexDirection: 'row',
        gap: 12,
        flexWrap: 'wrap',
        marginBottom: 16, // Added gap between chips and next input
    },
    chipBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    chipBtnActive: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    // Audio Summary
    audioSummaryCard: {
        backgroundColor: Colors.white,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        ...Shadow.subtle,
    },
    audioSummaryLabel: {
        fontFamily: 'Inter-Bold',
        fontSize: 16,
        color: '#1E293B',
    },
    audioStatusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    audioStatusBadgeYes: {
        backgroundColor: '#ECFDF5',
    },
    audioStatusBadgeNo: {
        backgroundColor: '#F1F5F9',
    },
    audioStatusTextYes: {
        fontFamily: 'Inter-Bold',
        fontSize: 13,
        color: '#059669',
    },
    audioStatusTextNo: {
        fontFamily: 'Inter-Bold',
        fontSize: 13,
        color: '#64748B',
    },
    audioAccordionContent: {
        backgroundColor: '#F8FAFC',
        marginTop: -8,
        padding: 16,
        borderBottomLeftRadius: 16,
        borderBottomRightRadius: 16,
        borderWidth: 1,
        borderTopWidth: 0,
        borderColor: '#E2E8F0',
        marginBottom: 8,
    },
    chipText: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 14,
        color: '#64748B',
    },
    chipTextActive: {
        color: Colors.white,
    },
    stepperContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#F8FAFC',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        height: 56,
        paddingHorizontal: 8,
        ...Shadow.subtle,
    },
    stepperBtn: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.white,
        borderRadius: 12,
        ...Shadow.small,
    },
    stepperBtnText: {
        fontSize: 20,
        fontFamily: 'Inter-Bold',
        color: Colors.primary,
    },
    stepperValue: {
        fontFamily: 'Inter-Bold',
        fontSize: 18,
        color: Colors.textPrimary,
    },
    daysGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'flex-start'
    },
    calendarDay: {
        width: '14.2%', // Ensure 7 items fit
        aspectRatio: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 4,
        borderRadius: 20 // Circular-ish
    },
    calendarDayEmpty: {
        width: '14.2%',
        aspectRatio: 1,
        marginBottom: 4
    },
    calendarDaySelected: {
        backgroundColor: Colors.primary,
        borderRadius: 999
    },
    calendarDayToday: {
        borderWidth: 1,
        borderColor: Colors.primary,
        borderRadius: 999
    },
    calendarDayText: {
        fontFamily: 'Inter-Medium',
        fontSize: 14,
        color: Colors.textPrimary
    },
    calendarDayDisabled: {
        opacity: 0.25
    },
    calendarDayTextDisabled: {
        color: Colors.textSecondary,
        fontFamily: 'Inter-Regular'
    },
    calendarDayTextSelected: {
        color: Colors.white,
        fontFamily: 'Inter-Bold'
    },
    calendarDayTextToday: {
        color: Colors.primary,
        fontFamily: 'Inter-SemiBold'
    },

    // Bottom Sheet (Outfit Drawer)
    bottomSheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: Colors.white,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        ...Shadow.large
    },
    bottomSheetHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 24,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6'
    },
    bottomSheetTitle: {
        fontFamily: 'Inter-Bold',
        fontSize: 18,
        color: Colors.textPrimary
    },
    outfitOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6'
    },
    outfitOptionSelected: {
        backgroundColor: '#F0F9FF', // Light primary
    },
    outfitOptionText: {
        fontFamily: 'Inter-Medium',
        fontSize: 16,
        color: Colors.textPrimary
    },
    outfitOptionTextSelected: {
        color: Colors.primary,
        fontFamily: 'Inter-SemiBold'
    },
    editorBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.white,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: Colors.border,
        gap: 8,
        ...Shadow.subtle
    },
    editorBtnText: {
        fontFamily: 'Inter-Medium',
        fontSize: 14,
        color: Colors.textPrimary
    },



    // Floating Recorder
    floatingMicBtn: {
        position: 'absolute',
        bottom: 110, // Elevated further to ensure clearance above the taller footer
        right: 16,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: Colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        ...Shadow.medium,
        zIndex: 9999
    },
    floatingRecorderExpanded: {
        position: 'absolute',
        bottom: 110, // Elevated further to ensure clearance above the taller footer
        right: 16,
        left: 16,
        backgroundColor: Colors.primary,
        borderRadius: 28,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        height: 56,
        ...Shadow.medium,
        zIndex: 9999
    },
    // Stitching Split View
    sidebarContainer: {
        flex: 1,
        maxWidth: '35%',
        borderRightWidth: 1,
        borderRightColor: '#E5E7EB',
        backgroundColor: '#FFFFFF'
    },
    contentContainer: {
        flex: 2,
        backgroundColor: '#F9FAFB'
    },
    sidebarItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        paddingHorizontal: 12,
        borderLeftWidth: 3,
        borderLeftColor: 'transparent',
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6'
    },
    sidebarItemActive: {
        backgroundColor: '#F0F9FF',
        borderLeftColor: Colors.primary
    },
    sidebarItemText: {
        fontFamily: 'Inter-Medium',
        fontSize: 13,
        color: Colors.textSecondary,
        lineHeight: 18
    },
    sidebarItemTextActive: {
        fontFamily: 'Inter-SemiBold',
        color: Colors.primary
    },
    sidebarCheckBadge: {
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: Colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 4
    },
    contentTitle: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 16,
        color: Colors.textPrimary,
        marginBottom: 4,
        marginTop: 4
    },
    optionCardSplit: {
        width: '47%', // 2 per row
        aspectRatio: 0.9,
        backgroundColor: Colors.white,
        borderRadius: 12,
        padding: 8,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        ...Shadow.small
    },
    optionImageSplit: {
        width: 50,
        height: 50,
        marginBottom: 8,
        resizeMode: 'contain'
    },
    optionPlaceholderSplit: {
        width: 48,
        height: 48,
        borderRadius: 8,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    optionListImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    // List Styles for Options
    optionListItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: Colors.white,
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: Colors.border, // Using border color
        marginBottom: 0,
        ...Shadow.small,
        gap: 12, // Added gap for spacing
    },
    optionListItemSelected: {
        borderColor: Colors.primary,
        backgroundColor: '#F0FDF9', // Very light green
    },
    optionListImageContainer: {
        width: 48,
        height: 48,
        borderRadius: 8,
        backgroundColor: '#F9FAFB',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    optionListText: {
        fontSize: 15,
        fontFamily: 'Inter-Medium',
        color: Colors.textPrimary,
        flex: 1, // Ensure text wraps
        lineHeight: 20, // Better readability for wrapped text
    },
    optionListTextSelected: {
        color: Colors.primary,
        fontFamily: 'Inter-SemiBold',
    },
    radioCircle: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: '#D1D5DB',
        justifyContent: 'center',
        alignItems: 'center',
    },
    radioCircleSelected: {
        borderColor: Colors.primary,
    },
    radioInner: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: Colors.primary,
    },
    optionTextSplit: {
        fontFamily: 'Inter-Medium',
        fontSize: 13,
        color: Colors.textPrimary,
        textAlign: 'center',
        lineHeight: 18
    },

    // New Measurements UI Styles
    newHistoryBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F5F3FF',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#EDE9FE',
        gap: 6
    },
    newHistoryText: {
        color: Colors.primary,
        fontFamily: 'Inter-SemiBold',
        fontSize: 13
    },
    promoBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#EEF2FF',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E0E7FF'
    },
    promoTitle: {
        fontSize: 15,
        fontFamily: 'Inter-Bold',
        color: '#1E1B4B',
        marginBottom: 2
    },
    promoSubtitle: {
        fontSize: 13,
        fontFamily: 'Inter-Medium',
        color: '#4338CA'
    },
    applyPromoBtn: {
        backgroundColor: Colors.primary,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8
    },
    applyPromoText: {
        color: Colors.white,
        fontFamily: 'Inter-Bold',
        fontSize: 13
    },
    saveInfoBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F0FDF4',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#DCFCE7'
    },
    checkCircleSmall: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: Colors.white,
        borderWidth: 1,
        borderColor: '#10B981',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10
    },
    saveInfoText: {
        fontSize: 12,
        color: '#065F46',
        fontFamily: 'Inter-Medium',
        flex: 1,
        lineHeight: 18
    },
    dynamicCountText: {
        fontSize: 13,
        fontFamily: 'Inter-Bold',
        color: '#4B5563',
        letterSpacing: 0.5
    },
    addNewTitle: {
        fontSize: 13,
        fontFamily: 'Inter-Bold',
        color: Colors.primary
    },
    measureItemContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        borderRadius: 14,
        padding: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0'
    },
    measureImgBox: {
        width: 80,
        height: 80,
        borderRadius: 10,
        backgroundColor: '#E2E8F0',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden'
    },
    measureSmallImg: {
        width: '100%',
        height: '100%'
    },
    measureFieldLabel: {
        fontSize: 15,
        fontFamily: 'Inter-SemiBold',
        color: '#334155',
        marginBottom: 8,
        textAlign: 'center',
    },
    measureValueField: {
        backgroundColor: Colors.white,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 10,
        height: 48,
        paddingHorizontal: 14,
        fontFamily: 'Inter-Bold',
        fontSize: 18,
        color: '#1E293B',
        textAlign: 'center'
    },
    // Add Measurement Modal Styles
    addModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
    },
    measurementModalToastWrapper: {
        position: 'absolute',
        left: 16,
        right: 16,
        zIndex: 9999,
        elevation: 9999,
    },
    measurementModalToast: {
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 8,
    },
    measurementModalToastSuccess: {
        backgroundColor: '#059669',
    },
    measurementModalToastWarning: {
        backgroundColor: '#D97706',
    },
    measurementModalToastError: {
        backgroundColor: '#EF4444',
    },
    measurementModalToastText: {
        color: '#FFFFFF',
        fontFamily: 'Inter-Medium',
        fontSize: 14,
    },
    addOrderModalContent: {
        width: '100%',
        backgroundColor: Colors.white,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        paddingBottom: 40,
        maxHeight: '90%',
    },
    addOrderModalFooter: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingTop: 16,
        gap: 12,
    },
    inputLabel: {
        fontSize: 14,
        fontFamily: 'Inter-SemiBold',
        color: '#1E293B',
        marginBottom: 8,
    },
    uploadBox: {
        width: '100%',
        height: 180,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
    },
    uploadPlaceholder: {
        alignItems: 'center',
    },
    uploadIconWrap: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#F5F3FF',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    uploadText: {
        fontSize: 14,
        color: Colors.primary,
        fontFamily: 'Inter-SemiBold',
    },
    previewBox: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    previewImage: {
        width: '95%',
        height: '95%',
    },
    deleteImageBtn: {
        position: 'absolute',
        top: 10,
        right: 10,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: Colors.danger,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: Colors.white,
    },
    simpleInput: {
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        padding: 14,
        fontSize: 16,
        color: Colors.textPrimary,
        backgroundColor: '#F8FAFC',
        fontFamily: 'Inter-Medium',
    },
    cancelLink: {
        flex: 1,
        paddingVertical: 16,
        borderRadius: 14,
        backgroundColor: '#E2E8F0',
        alignItems: 'center',
    },
    cancelLinkText: {
        fontSize: 16,
        fontFamily: 'Inter-SemiBold',
        color: '#475569',
    },
    addSubmitBtn: {
        flex: 1,
        paddingVertical: 16,
        borderRadius: 14,
        backgroundColor: Colors.primary,
        alignItems: 'center',
    },
    addSubmitBtnText: {
        fontSize: 16,
        fontFamily: 'Inter-SemiBold',
        color: Colors.white,
    },
    sectionRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    sectionChip: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: Colors.border,
        backgroundColor: Colors.white,
    },
    sectionChipActive: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    sectionChipText: {
        fontSize: 14,
        fontFamily: 'Inter-Medium',
        color: Colors.textSecondary,
    },
    sectionChipTextActive: {
        color: Colors.white,
        fontFamily: 'Inter-SemiBold',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 24,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9'
    },
    modalTitle: {
        fontSize: 18,
        fontFamily: 'Inter-Bold',
        color: '#1E293B'
    },
    sheetHeader: {
        alignItems: 'center',
        paddingVertical: 15,
        paddingHorizontal: 20
    },
    sheetHandle: {
        width: 40,
        height: 5,
        backgroundColor: '#E5E7EB',
        borderRadius: 10,
        marginBottom: 15
    },
    sheetTitle: {
        fontFamily: 'Inter-Bold',
        fontSize: 20,
        color: Colors.textPrimary
    },
    materialCard: {
        backgroundColor: Colors.white,
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    materialImgBox: {
        width: 80,
        height: 80,
        borderRadius: 12,
        backgroundColor: '#F8FAFC',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#E2E8F0'
    },
    materialName: {
        fontSize: 15,
        fontFamily: 'Inter-Bold',
        color: Colors.textPrimary,
        marginBottom: 4
    },
    materialSku: {
        fontSize: 12,
        fontFamily: 'Inter-Medium',
        color: '#64748B'
    },
    materialTags: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 8
    },
    materialTag: {
        backgroundColor: '#E2E8F0',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6
    },
    materialTagText: {
        fontSize: 11,
        fontFamily: 'Inter-Bold',
        color: '#64748B'
    },
    materialStatLabel: {
        fontSize: 10,
        fontFamily: 'Inter-Bold',
        color: '#94A3B8',
        letterSpacing: 0.5,
        marginBottom: 2
    },
    materialStatValue: {
        fontSize: 14,
        fontFamily: 'Inter-Bold',
        color: Colors.textPrimary
    },
    qtyRowContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 12,
        backgroundColor: '#F8FAFC',
        padding: 12,
        borderRadius: 12
    },
    qtyLabel: {
        fontSize: 12,
        fontFamily: 'Inter-Bold',
        color: '#64748B'
    },
    qtyControls: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.white,
        borderRadius: 10,
        padding: 4,
        borderWidth: 1,
        borderColor: '#E2E8F0'
    },
    qtyBtn: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: '#E2E8F0',
        justifyContent: 'center',
        alignItems: 'center'
    },
    qtyInput: {
        width: 60,
        textAlign: 'center',
        fontFamily: 'Inter-Bold',
        fontSize: 16,
        color: Colors.textPrimary,
        padding: 0
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E2E8F0',
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 48,
        gap: 10
    },
    searchInput: {
        flex: 1,
        fontFamily: 'Inter-Medium',
        fontSize: 15,
        color: Colors.textPrimary,
        padding: 0
    },
    materialSelectionCard: {
        backgroundColor: Colors.white,
        padding: 16,
        marginHorizontal: 16,
        marginVertical: 8,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#EDF2F7',
    },
    materialSmallImgBox: {
        width: 85,
        height: 105,
        borderRadius: 12,
        backgroundColor: '#F0F3FF',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#E2E8F0'
    },
    materialName: {
        fontSize: 15,
        fontFamily: 'Inter-Bold',
        color: '#1E293B',
        lineHeight: 20
    },
    skuText: {
        fontSize: 12,
        fontFamily: 'Inter-Medium',
        color: '#94A3B8',
        marginTop: 4
    },
    catBadge: {
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
        alignSelf: 'flex-start'
    },
    catBadgeText: {
        fontSize: 11,
        fontFamily: 'Inter-Bold',
        color: '#64748B',
        textTransform: 'capitalize'
    },
    selectBtn: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        minWidth: 80
    },
    selectBtnText: {
        color: Colors.white,
        fontFamily: 'Inter-Bold',
        fontSize: 13
    },
    selectBtnTextSelected: {
        fontFamily: 'Inter-Bold',
        fontSize: 13,
        color: '#475569'
    },
    statLabel: {
        fontSize: 10,
        fontFamily: 'Inter-Bold',
        color: '#94A3B8',
        letterSpacing: 0.5,
        marginBottom: 2
    },
    statValue: {
        fontSize: 16,
        fontFamily: 'Inter-Bold',
        color: '#1E293B'
    },

    // --- Step 3 Media / Audio Instruction Styles ---
    voiceNoteCard: {
        backgroundColor: '#F8FAFC',
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        ...Shadow.subtle
    },
    micCircle: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: Colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        ...Shadow.medium
    },
    voiceTitle: {
        fontFamily: 'Inter-Bold',
        fontSize: 16,
        color: Colors.textPrimary
    },
    voiceSub: {
        fontFamily: 'Inter-Medium',
        fontSize: 13,
        color: Colors.textSecondary,
        marginTop: 2
    },
    emptyUploadBox: {
        width: '100%',
        height: 140,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: '#E2E8F0',
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        gap: 12
    },
    imageGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12
    },
    imagePreview: {
        width: 100,
        height: 100,
        borderRadius: 12,
        backgroundColor: '#E2E8F0',
        position: 'relative'
    },
    removeImageBtn: {
        position: 'absolute',
        top: -10,
        right: -10,
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#EF4444',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: Colors.white,
        ...Shadow.medium,
        zIndex: 50
    },
    addImageBtn: {
        width: 100,
        height: 100,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: Colors.primary,
        borderStyle: 'dashed',
        backgroundColor: '#F5F3FF',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 4
    },
    addImageText: {
        fontFamily: 'Inter-Bold',
        fontSize: 12,
        color: Colors.primary
    },
    startRecordingBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.primary,
        borderRadius: 16,
        height: 64,
        paddingHorizontal: 16,
        ...Shadow.medium
    },
    micCircleWhite: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'white',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16
    },
    startRecordingText: {
        fontFamily: 'Inter-Bold',
        color: 'white',
        fontSize: 16
    },
    voiceNoteCard: {
        backgroundColor: Colors.white,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        ...Shadow.subtle
    },
    micCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    voiceTitle: {
        fontFamily: 'Inter-Bold',
        fontSize: 16,
        color: Colors.textPrimary
    },
    voiceSub: {
        fontFamily: 'Inter-Medium',
        fontSize: 13,
        color: '#64748B',
        marginTop: 2
    },
    // --- Modern Media Flow Styles ---
    topInfoBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#EEF2FF',
        padding: 12,
        borderRadius: 12,
        gap: 12,
        marginBottom: 8
    },
    topInfoBannerText: {
        fontFamily: 'Inter-Medium',
        fontSize: 13,
        color: '#6366f1'
    },
    modernMediaCard: {
        backgroundColor: Colors.white,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        marginBottom: 4
    },
    modernCardTitle: {
        fontFamily: 'Inter-Bold',
        fontSize: 16,
        color: '#0F172A'
    },
    modernCardSubLabel: {
        fontFamily: 'Inter-Medium',
        fontSize: 13,
        color: '#64748B',
        marginTop: 4,
        marginBottom: 16
    },
    dashedUploadBox: {
        width: '100%',
        height: 120,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#C7D2FE',
        borderStyle: 'dashed',
        backgroundColor: '#F5F7FF',
        justifyContent: 'center',
        alignItems: 'center'
    },
    purpleIconCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#EEF2FF',
        alignItems: 'center',
        justifyContent: 'center'
    },
    purpleActionText: {
        fontFamily: 'Inter-Bold',
        fontSize: 15,
        color: '#6366f1',
        marginTop: 8
    },
    selectMultipleText: {
        fontFamily: 'Inter-Medium',
        fontSize: 12,
        color: '#94A3B8',
        marginTop: 2
    },
    sketchActionBox: {
        width: '48%',
        height: 64,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#C7D2FE',
        borderStyle: 'dashed',
        backgroundColor: '#F5F7FF',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8
    },
    sketchActionText: {
        fontFamily: 'Inter-Bold',
        fontSize: 14,
        color: '#6366f1'
    },
    modernRecordingBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#6366f1',
        borderRadius: 16,
        height: 64,
        paddingHorizontal: 20,
        justifyContent: 'center',
        marginTop: 8
    },
    whiteMicBorderCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12
    },
    modernRecordingBtnText: {
        fontFamily: 'Inter-Bold',
        color: 'white',
        fontSize: 17
    },
    recordedAudioCard: {
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        flexDirection: 'row',
        alignItems: 'center'
    },
    modernMicCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center'
    },
    audioRecTitle: {
        fontFamily: 'Inter-Bold',
        fontSize: 15,
        color: '#1E293B'
    },
    audioRecSub: {
        fontFamily: 'Inter-Medium',
        fontSize: 12,
        color: '#64748B'
    },
    modernNoteInput: {
        minHeight: 100,
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        textAlignVertical: 'top',
        color: '#1E293B',
        fontFamily: 'Inter-Medium'
    },
    // --- Order Summary Styles ---
    summaryCustomerCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.white,
        borderRadius: 16,
        padding: 14,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        gap: 12
    },
    customerIconCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#F5F3FF',
        alignItems: 'center',
        justifyContent: 'center'
    },
    summaryCustomerName: {
        fontSize: 16,
        fontFamily: 'Inter-Bold',
        color: '#1E293B'
    },
    summaryCustomerPhone: {
        fontSize: 13,
        fontFamily: 'Inter-Medium',
        color: '#64748B',
        marginTop: 2
    },
    editStepBtn: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: '#F8FAFC',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#E2E8F0'
    },
    summaryCard: {
        backgroundColor: Colors.white,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        overflow: 'hidden'
    },
    summaryCardExpanded: {
        borderColor: '#E2E8F0'
    },
    summaryCardHeader: {
        padding: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#F9FAFB'
    },
    summaryItemTitle: {
        fontSize: 16,
        fontFamily: 'Inter-Bold',
        color: '#1E293B'
    },
    qtyBadge: {
        backgroundColor: '#E2E8F0',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6
    },
    qtyBadgeText: {
        fontSize: 11,
        fontFamily: 'Inter-Bold',
        color: '#64748B'
    },
    summaryItemDate: {
        fontSize: 13,
        fontFamily: 'Inter-Medium',
        color: '#64748B'
    },
    urgentMiniBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#EF4444',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        gap: 2
    },
    urgentMiniBadgeText: {
        fontSize: 9,
        fontFamily: 'Inter-Bold',
        color: 'white'
    },
    summaryItemPrice: {
        fontSize: 18,
        fontFamily: 'Inter-Bold',
        color: Colors.primary
    },
    summaryCardBody: {
        padding: 16,
        paddingTop: 0,
        backgroundColor: Colors.white
    },
    summarySubSection: {
        marginTop: 16
    },
    summarySectionTitle: {
        fontSize: 11,
        fontFamily: 'Inter-Bold',
        color: '#94A3B8',
        letterSpacing: 1,
        marginBottom: 12,
        textTransform: 'uppercase'
    },
    summaryDetailGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8
    },
    summaryDetailItem: {
        width: '48.5%',
        backgroundColor: '#F8FAFC',
        padding: 10,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#E2E8F0'
    },
    summaryDetailLabel: {
        fontSize: 10,
        fontFamily: 'Inter-Bold',
        color: '#94A3B8',
        marginBottom: 2,
        textTransform: 'uppercase'
    },
    summaryDetailValue: {
        fontSize: 13,
        fontFamily: 'Inter-SemiBold',
        color: '#1E293B'
    },
    summaryMaterialRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: '#F8FAFC',
        padding: 10,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0'
    },
    summaryMaterialIcon: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: '#EEF2FF',
        alignItems: 'center',
        justifyContent: 'center'
    },
    summaryMaterialName: {
        fontSize: 13,
        fontFamily: 'Inter-SemiBold',
        color: '#1E293B'
    },
    summaryMaterialQty: {
        fontSize: 11,
        fontFamily: 'Inter-Medium',
        color: '#64748B'
    },
    summaryMaterialPrice: {
        fontSize: 14,
        fontFamily: 'Inter-Bold',
        color: '#1E293B'
    },
    summaryPreviewImg: {
        width: 70,
        height: 70,
        borderRadius: 10,
        marginRight: 8,
        borderWidth: 1,
        borderColor: '#E2E8F0'
    },
    summaryAudioWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#F8FAFC',
        padding: 8,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0'
    },
    summaryAudioLabel: {
        fontSize: 12,
        fontFamily: 'Inter-Medium',
        color: '#64748B'
    },
    summarySketchWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#F8FAFC',
        padding: 8,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0'
    },
    summarySketchImg: {
        width: 32,
        height: 32,
        borderRadius: 6,
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: '#E2E8F0'
    },
    summaryNoteBox: {
        backgroundColor: '#FDFCF3',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#FEF9C3'
    },
    summaryNoteText: {
        fontSize: 13,
        fontFamily: 'Inter-Medium',
        color: '#713F12',
        lineHeight: 18
    },
    summaryCardFooter: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 16,
        marginTop: 20,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9'
    },
    summaryActionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6
    },
    summaryActionText: {
        fontSize: 13,
        fontFamily: 'Inter-SemiBold'
    },
    summaryAddBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: '#F5F7FF',
        borderWidth: 1,
        borderColor: '#C7D2FE',
        borderStyle: 'dashed',
        gap: 8
    },
    summaryAddBtnText: {
        fontSize: 14,
        fontFamily: 'Inter-Bold',
        color: '#6366F1'
    },
    paymentSummaryCard: {
        backgroundColor: Colors.white,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0'
    },
    paymentRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    paymentLabel: {
        fontSize: 14,
        fontFamily: 'Inter-SemiBold',
        color: '#64748B'
    },
    paymentValue: {
        fontSize: 16,
        fontFamily: 'Inter-Bold',
        color: '#1E293B'
    },
    summaryAdvanceInput: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        borderRadius: 10,
        paddingHorizontal: 12,
        height: 48,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        width: 140
    },
    currencySymbol: {
        fontSize: 16,
        fontFamily: 'Inter-Bold',
        color: '#94A3B8',
        marginRight: 4
    },
    advanceInputContent: {
        flex: 1,
        fontSize: 16,
        fontFamily: 'Inter-Bold',
        color: Colors.primary,
        padding: 0
    },
    summaryDivider: {
        height: 1,
        backgroundColor: '#E2E8F0',
        marginVertical: 4
    },
    totalBalanceLabel: {
        fontSize: 16,
        fontFamily: 'Inter-Bold',
        color: '#1E293B'
    },
    totalBalanceSub: {
        fontSize: 12,
        fontFamily: 'Inter-Medium',
        color: '#94A3B8',
        marginTop: 2
    },
    totalBalanceValue: {
        fontSize: 24,
        fontFamily: 'Inter-Bold',
        color: Colors.primary
    },
    // New Styles for Exact UI
    summaryHeaderLabel: {
        fontSize: 10,
        fontFamily: 'Inter-Bold',
        color: '#94A3B8',
        letterSpacing: 1,
        marginBottom: 2
    },
    ordinalQtyBadge: {
        backgroundColor: '#F3F2FF',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#E0E7FF'
    },
    ordinalQtyText: {
        color: '#6366F1',
        fontSize: 10,
        fontFamily: 'Inter-Bold'
    },
    nestedMaterialCard: {
        backgroundColor: Colors.white,
        borderRadius: 12,
        padding: 16, // Matched to selection card
        borderWidth: 1,
        borderColor: '#E2E8F0', // Consistent border
        marginBottom: 10
    },
    matThumbnail: {
        width: 60,
        height: 60,
        borderRadius: 8,
        backgroundColor: '#F8FAFC',
        overflow: 'hidden'
    },
    matDetailHeader: {
        flex: 1,
        marginLeft: 12
    },
    matName: {
        fontSize: 14,
        fontFamily: 'Inter-Bold',
        color: '#1E293B',
        lineHeight: 18
    },
    matSku: {
        fontSize: 10,
        fontFamily: 'Inter-Medium',
        color: '#94A3B8',
        marginTop: 2
    },
    matBadge: {
        backgroundColor: '#E2E8F0',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        alignSelf: 'flex-start',
        marginTop: 4
    },
    matBadgeText: {
        fontSize: 10,
        fontFamily: 'Inter-SemiBold',
        color: '#64748B'
    },
    matPricePill: {
        backgroundColor: '#F8FAFC',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#F1F5F9', // Subtle border as per design
    },
    matPricePillText: {
        fontSize: 14,
        fontFamily: 'Inter-SemiBold',
        color: '#1E293B',
    },
    matTotal: {
        fontSize: 14,
        fontFamily: 'Inter-Bold',
        color: '#1E293B'
    },
    serviceSectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 8,
        marginBottom: 12
    },
    addAddonLink: {
        fontSize: 12,
        fontFamily: 'Inter-Bold',
        color: Colors.primary
    },
    serviceItemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        padding: 8,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#E2E8F0'
    },
    serviceName: {
        flex: 1,
        fontSize: 14,
        fontFamily: 'Inter-Medium',
        color: '#475569',
        marginLeft: 4
    },
    servicePriceInputBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.white,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        paddingHorizontal: 8,
        height: 36,
        width: 100
    },
    servicePriceInput: {
        flex: 1,
        textAlign: 'right',
        fontSize: 14,
        fontFamily: 'Inter-Bold',
        color: '#1E293B',
        padding: 0
    },
    serviceDeleteBtn: {
        padding: 6,
        marginLeft: 4
    },
    dashedAddBtn: {
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
        borderStyle: 'dashed',
        backgroundColor: '#F5F5FF',
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 8,
        marginTop: 8
    },
    dashedAddBtnText: {
        fontSize: 15,
        fontFamily: 'Inter-Bold',
        color: Colors.primary
    },
    configCard: {
        backgroundColor: Colors.white,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0'
    },
    configTitle: {
        fontSize: 15,
        fontFamily: 'Inter-Bold',
        color: '#1E293B',
        marginBottom: 16
    },
    toggleContainer: {
        flexDirection: 'row',
        backgroundColor: '#E2E8F0',
        borderRadius: 8,
        padding: 3,
        marginBottom: 12
    },
    toggleItem: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        borderRadius: 6
    },
    toggleItemActive: {
        backgroundColor: Colors.primary
    },
    toggleText: {
        fontSize: 13,
        fontFamily: 'Inter-Bold',
        color: '#64748B'
    },
    toggleTextActive: {
        color: Colors.white
    },
    amountInputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 12, // More rounded as per image
        height: 52,
        paddingHorizontal: 16,
        backgroundColor: '#FCFDFF',
    },
    amountInput: {
        flex: 1,
        textAlign: 'right',
        fontSize: 18,
        fontFamily: 'Inter-Bold',
        color: '#000000',
        padding: 0,
    },
    discountSymbol: {
        fontSize: 16,
        fontFamily: 'Inter-Bold',
        color: Colors.primary,
        marginLeft: 8
    },
    bottomSummaryCard: {
        backgroundColor: Colors.white,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        padding: 24,
        paddingTop: 16,
        borderColor: '#E2E8F0',
        borderTopWidth: 1,
        ...Shadow.large
    },
    summaryLine: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10
    },
    summaryLineLabel: {
        fontSize: 14,
        fontFamily: 'Inter-Medium',
        color: '#64748B'
    },
    summaryLineValue: {
        fontSize: 14,
        fontFamily: 'Inter-Bold',
        color: '#1E293B'
    },
    summaryLineValueGreen: {
        color: '#10B981'
    },
    summaryTotalBalanceLabel: {
        fontSize: 16,
        fontFamily: 'Inter-Bold',
        color: '#1E293B'
    },
    summaryTotalBalanceSub: {
        fontSize: 11,
        fontFamily: 'Inter-Medium',
        color: '#94A3B8',
        marginTop: 2
    },
    summaryTotalBalanceValue: {
        fontSize: 22,
        fontFamily: 'Inter-Bold',
        color: Colors.primary
    },
    confirmOrderBtn: {
        backgroundColor: Colors.primary,
        borderRadius: 12,
        height: 54,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        marginTop: 20
    },
    confirmOrderBtnText: {
        color: Colors.white,
        fontSize: 16,
        fontFamily: 'Inter-Bold'
    },
    // Addon Drawer Styles
    addonInput: {
        backgroundColor: '#FCFDFF',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        paddingHorizontal: 16,
        height: 52,
        fontFamily: 'Inter-Medium',
        fontSize: 15,
        color: Colors.textPrimary
    },
    addonPriceInputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FCFDFF',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        paddingHorizontal: 16,
        height: 52,
    },
    addonPriceInput: {
        flex: 1,
        fontFamily: 'Inter-Bold',
        fontSize: 18,
        color: Colors.textPrimary,
        textAlign: 'right'
    },
    // Measurement menu styles
    measureMoreBtn: {
        position: 'absolute',
        right: 0,
        top: 0,
        padding: 10,
        zIndex: 10
    },
    measureMenuPopover: {
        position: 'absolute',
        right: 10,
        top: 36,
        backgroundColor: Colors.white,
        borderRadius: 12,
        paddingVertical: 6,
        width: 140,
        ...Shadow.large,
        zIndex: 100,
        borderWidth: 1,
        borderColor: '#F1F5F9'
    },
    measureMenuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 16,
        gap: 10
    },
    measureMenuText: {
        fontFamily: 'Inter-Medium',
        fontSize: 14,
        color: Colors.textPrimary
    },
    // --- Modern Audio Recorder/Player Styles ---
    recorderContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        borderRadius: 16,
        padding: 12,
        marginTop: 12,
        height: 80,
    },
    recorderTimeBadge: {
        backgroundColor: '#ECECFE',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
    },
    recorderTimeText: {
        fontFamily: 'Inter-Bold',
        fontSize: 14,
        color: '#6366F1',
    },
    recorderPauseBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#F1F5F9',
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
    },
    recorderStopBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#EF4444',
        justifyContent: 'center',
        alignItems: 'center',
    },
    recordedAudioPlayerBox: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#F9FAFB',
        borderRadius: 20,
        paddingHorizontal: 18,
        marginTop: 12,
        height: 84,
        borderWidth: 1,
        borderColor: '#F1F5F9'
    },
    audioPlayCircle: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: '#6366F1',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    audioDurationText: {
        fontFamily: 'Inter-Bold',
        fontSize: 16,
        color: '#1E293B',
        minWidth: 50,
        textAlign: 'right',
        includeFontPadding: false,
        textAlignVertical: 'center'
    },
    recordingPill: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ECECFE',
        borderRadius: 24,
        paddingHorizontal: 16,
        height: 48,
        marginRight: 12,
    },
    recorderPillTime: {
        fontFamily: 'Inter-Medium',
        fontSize: 14,
        color: '#1E293B',
        marginRight: 8,
    },
    recorderCircleAction: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#F1F5F9',
        justifyContent: 'center',
        alignItems: 'center',
    },
    recorderCircleStop: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#EF4444',
        justifyContent: 'center',
        alignItems: 'center',
    },
    recordedSectionTitle: {
        fontFamily: 'Inter-Bold',
        fontSize: 15,
        color: '#1E293B',
        marginBottom: 8,
        marginLeft: 4,
    }
});

export default CreateOrderFlowScreen;
