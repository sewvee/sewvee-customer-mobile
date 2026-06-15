import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    TextInput,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    Dimensions,
    ScrollView,
    ActivityIndicator,
    RefreshControl
} from 'react-native';
import axios from 'axios';
import { useStore } from 'react-redux';
import { Colors, Spacing, Typography, Shadow } from '../constants/theme';
import { X, Search, User, Plus, Check, Phone, MapPin } from 'lucide-react-native';
import { useToast } from '../context/ToastContext';
import { useDispatch, useSelector } from 'react-redux';
import { fetchCustomersAction, createCustomerAction } from '../store/customerSlice';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const PAGE_LIMIT = 10;

const COUNTRY_CODES = [
    { code: '+91', name: 'India', flag: '🇮🇳' },
    { code: '+1', name: 'USA/Canada', flag: '🇺🇸' },
    { code: '+44', name: 'UK', flag: '🇬🇧' },
    { code: '+971', name: 'UAE', flag: '🇦🇪' },
    { code: '+61', name: 'Australia', flag: '🇦🇺' },
    { code: '+65', name: 'Singapore', flag: '🇸🇬' },
    { code: '+60', name: 'Malaysia', flag: '🇲🇾' },
    { code: '+94', name: 'Sri Lanka', flag: '🇱🇰' },
    { code: '+977', name: 'Nepal', flag: '🇳🇵' },
    { code: '+880', name: 'Bangladesh', flag: '🇧🇩' },
    { code: '+27', name: 'South Africa', flag: '🇿🇦' },
    { code: '+353', name: 'Ireland', flag: '🇮🇪' },
    { code: '+31', name: 'Netherlands', flag: '🇳🇱' },
    { code: '+960', name: 'Maldives', flag: '🇲🇻' },
];

// interface CustomerSelectionModalProps {
//     visible: boolean;
//     onClose: () => void;
//     onSelect: (customer: any) => void;
//     customers: any[];
// }

const CustomerSelectionModal = ({ visible, onClose, onSelect }) => {
    const { showToast } = useToast();
    const dispatch = useDispatch();
    const { top } = useSafeAreaInsets();
    const [mode, setMode] = useState('existing');
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [phoneError, setPhoneError] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [selectedFlag, setSelectedFlag] = useState('🇮🇳');
    const [showCountryPicker, setShowCountryPicker] = useState(false);
    const [sheetToast, setSheetToast] = useState({
        visible: false,
        message: '',
        type: 'error',
    });
    const toastTimerRef = useRef(null);

    const {
        customers = [],
        loading,
        loadingMore,
        totalPages,
        currentPage
    } = useSelector((state) => state.customers);

    // New Customer State
    const [newCustomer, setNewCustomer] = useState({
        name: '',
        countryCode: '+91',
        mobile: '',
        location: ''
    });

    const showSheetToast = (message, type = 'error') => {
        if (toastTimerRef.current) {
            clearTimeout(toastTimerRef.current);
        }

        setSheetToast({
            visible: true,
            message,
            type,
        });

        toastTimerRef.current = setTimeout(() => {
            setSheetToast({
                visible: false,
                message: '',
                type: 'error',
            });
            toastTimerRef.current = null;
        }, 4000);
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
        }, 500);
        return () => clearTimeout(timer);
    }, [search]);

    useEffect(() => {
        return () => {
            if (toastTimerRef.current) {
                clearTimeout(toastTimerRef.current);
            }
        };
    }, []);

    const fetchData = (page = 1) => {
        const payload = {
            search: debouncedSearch,
            sortBy: 'newest',
            page,
            limit: 10
        };
        dispatch(fetchCustomersAction(payload));
    };

    useEffect(() => {
        if (visible) {
            fetchData(1);
        }
    }, [dispatch, debouncedSearch, visible]);

    const handleLoadMore = () => {
        if (!loading && !loadingMore && currentPage < totalPages) {
            fetchData(currentPage + 1);
        }
    };

    const handleConfirmNew = async () => {
        if (!newCustomer.name || !newCustomer.mobile || newCustomer.mobile.length < 7 || newCustomer.mobile.length > 15) {
            showSheetToast('Please enter customer name and valid mobile number (7-15 digits)', 'error');
            return;
        }
        
        if (!newCustomer.countryCode || !newCustomer.countryCode.startsWith('+')) {
            showSheetToast('Please enter a valid country code starting with +', 'error');
            return;
        }

        setIsCreating(true);

        try {
            const payload = {
                name: newCustomer.name,
                countryCode: newCustomer.countryCode,
                mobile: newCustomer.mobile,
            };
            if (newCustomer.location && newCustomer.location.trim().length > 0) {
                payload.location = newCustomer.location.trim();
            }

            const resultAction = await dispatch(createCustomerAction(payload));

            if (createCustomerAction.fulfilled.match(resultAction)) {
                const payload = resultAction.payload;

                if (payload?.success === false || payload?.statusCode >= 400 || payload?.error) {
                    showSheetToast(payload.message || 'Failed to add customer', 'error');
                } else {
                    const successMessage = payload?.message || 'Customer added successfully!';
                    showToast(successMessage, 'success');
                    
                    const createdCustomer = payload?.data || payload?.customer || payload;
                    
                    onSelect({
                        ...createdCustomer,
                        name: createdCustomer.customerName || createdCustomer.name,
                        mobile: createdCustomer.whatsappNumber || createdCustomer.mobile
                    });
                     
                    resetForm();
                }
            } else {
                showSheetToast(resultAction.payload?.message || 'Failed to add customer', 'error');
            }
        } catch (e) {
            showSheetToast('An error occurred. Try again.', 'error');
        } finally {
            setIsCreating(false);
        }
    };

    const resetForm = () => {
        setMode('existing');
        setSearch('');
        setNewCustomer({ name: '', countryCode: '+91', mobile: '', location: '' });
        setPhoneError('');
        if (toastTimerRef.current) {
            clearTimeout(toastTimerRef.current);
            toastTimerRef.current = null;
        }
        setSheetToast({
            visible: false,
            message: '',
            type: 'error',
        });
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                {sheetToast.visible ? (
                    <View
                        pointerEvents="none"
                        style={[styles.sheetToastWrapper, { top: top + 12 }]}
                    >
                        <View
                            style={[
                                styles.sheetToast,
                                sheetToast.type === 'success'
                                    ? styles.sheetToastSuccess
                                    : styles.sheetToastError,
                            ]}
                        >
                            <Text style={styles.sheetToastText} numberOfLines={2}>
                                {sheetToast.message}
                            </Text>
                        </View>
                    </View>
                ) : null}
                <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />

                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={styles.container}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
                >
                    <View style={styles.handle} />

                    <View style={styles.header}>
                        <Text style={styles.title}>Select Customer</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <X size={24} color={Colors.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    {/* Tabs */}
                    <View style={styles.tabs}>
                        <TouchableOpacity
                            style={[styles.tab, mode === 'existing' && styles.activeTab]}
                            onPress={() => setMode('existing')}
                        >
                            <Text style={[styles.tabText, mode === 'existing' && styles.activeTabText]}>Existing</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.tab, mode === 'new' && styles.activeTab]}
                            onPress={() => setMode('new')}
                        >
                            <Text style={[styles.tabText, mode === 'new' && styles.activeTabText]}>New Customer</Text>
                        </TouchableOpacity>
                    </View>

                    {mode === 'existing' ? (
                        <View style={styles.content}>
                            <View style={styles.searchBar}>
                                <Search size={20} color={Colors.textSecondary} />
                                <TextInput
                                    style={styles.searchInput}
                                    placeholder="Search name or mobile..."
                                    placeholderTextColor="#6B7280"
                                    value={search}
                                    onChangeText={setSearch}
                                    autoFocus={false}
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

                            <FlatList
                                data={customers}
                                    keyExtractor={(item, index) => `cust-${item.id || item._id || index}-${index}`}
                                    showsVerticalScrollIndicator={false}
                                    contentContainerStyle={{ paddingBottom: 20 }}
                                    onEndReached={handleLoadMore}
                                    onEndReachedThreshold={0.5}
                                    refreshControl={
                                        <RefreshControl refreshing={false} onRefresh={() => fetchData(1)} />
                                    }
                                    ListFooterComponent={() => {
                                        if (!loadingMore) return null;
                                        return (
                                            <View style={{ paddingVertical: 20 }}>
                                                <ActivityIndicator size="small" color={Colors.primary} />
                                            </View>
                                        );
                                    }}
                                    renderItem={({ item }) => (
                                        <TouchableOpacity
                                            style={styles.customerItem}
                                            onPress={() => {
                                                onSelect({
                                                    ...item,
                                                    name: item.customerName || item.name,
                                                    mobile: item.whatsappNumber || item.mobile
                                                });
                                                resetForm();
                                            }}
                                        >
                                            <View style={styles.avatar}>
                                                <Text style={styles.avatarText}>{(item.customerName || item.name)?.[0]?.toUpperCase()}</Text>
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.customerName}>{item.customerName || item.name}</Text>
                                                <Text style={styles.customerMobile}>{item.whatsappNumber || item.mobile}</Text>
                                            </View>
                                            <View style={styles.selectBtn}>
                                                <Text style={styles.selectBtnText}>Select</Text>
                                            </View>
                                        </TouchableOpacity>
                                    )}
                                    ListEmptyComponent={
                                        <View style={styles.emptyState}>
                                            <Text style={styles.emptyText}>No customers found.</Text>
                                            <TouchableOpacity onPress={() => setMode('new')}>
                                                <Text style={styles.linkText}>Create New Customer</Text>
                                            </TouchableOpacity>
                                        </View>
                                    }
                                />
                        </View>
                    ) : (
                        <ScrollView
                            style={styles.content}
                            contentContainerStyle={{ paddingBottom: 20 }}
                            keyboardShouldPersistTaps="handled"
                        >
                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Customer Name<Text style={{ color: "red", fontSize: 16 }}> *</Text></Text>

                                <View style={styles.inputRow}>
                                    <User size={20} color={Colors.textSecondary} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Customer Name"
                                        placeholderTextColor="#6B7280"
                                        value={newCustomer.name}
                                        onChangeText={val => setNewCustomer(prev => ({ ...prev, name: val }))}
                                    />
                                </View>

                                <Text style={styles.label}>Mobile Number<Text style={{ color: "red", fontSize: 16 }}> *</Text></Text>

                                <View style={styles.inputRow}>
                                <TouchableOpacity
                                    style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        paddingHorizontal: 8,
                                        borderRightWidth: 1,
                                        borderColor: Colors.border,
                                        marginRight: 8,
                                        height: '100%'
                                    }}
                                    onPress={() => setShowCountryPicker(true)}
                                >
                                    <Text style={{ fontSize: 18, marginRight: 4 }}>{selectedFlag}</Text>
                                    <Text style={{ fontFamily: 'Inter-Medium', fontSize: 16, color: Colors.textPrimary }}>
                                        {newCustomer.countryCode}
                                    </Text>
                                </TouchableOpacity>
                                    <TextInput
                                        style={[styles.input, { marginLeft: 0 }]}
                                        placeholder="Mobile Number"
                                        placeholderTextColor="#6B7280"
                                        keyboardType="phone-pad"
                                        maxLength={15}
                                        value={newCustomer.mobile}
                                        onChangeText={(val) => {
                                            const cleaned = val.replace(/[^0-9]/g, '');

                                            setNewCustomer(prev => ({
                                                ...prev,
                                                mobile: cleaned,
                                            }));

                                            if (cleaned.length > 0 && (cleaned.length < 7 || cleaned.length > 15)) {
                                                setPhoneError('Please enter a valid mobile number');
                                            } else {
                                                setPhoneError('');
                                            }
                                        }}
                                    />

                                </View>
                                {phoneError ? (
                                    <Text style={styles.errorText}>{phoneError}</Text>
                                ) : null}

                                <Text style={styles.label}>Location</Text>

                                <View style={styles.inputRow}>
                                    <MapPin size={20} color={Colors.textSecondary} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Location"
                                        placeholderTextColor="#6B7280"
                                        value={newCustomer.location}
                                        onChangeText={val => setNewCustomer(prev => ({ ...prev, location: val }))}
                                    />
                                </View>
                            </View>

                            <TouchableOpacity
                                style={[
                                    styles.confirmBtn,
                                    (!newCustomer.name || !newCustomer.mobile || isCreating) && styles.disabledBtn
                                ]}
                                disabled={!newCustomer.name || !newCustomer.mobile || isCreating}
                                onPress={handleConfirmNew}
                            >
                                {isCreating ? (
                                    <ActivityIndicator size="small" color={Colors.white} />
                                ) : (
                                    <Text style={styles.confirmBtnText}>Add & Select Customer</Text>
                                )}
                            </TouchableOpacity>
                        </ScrollView>
                    )}

                    {mode === 'existing' && loading && (
                        <View style={styles.loaderOverlay}>
                            <ActivityIndicator size="large" color={Colors.primary} />
                        </View>
                    )}
                </KeyboardAvoidingView>

                {/* Country Code Picker Modal */}
                {showCountryPicker && (
                    <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }]}>
                        <View style={{ width: '85%', maxHeight: '70%', backgroundColor: '#FFF', borderRadius: 12, padding: 16, ...Shadow.medium }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                <Text style={{ fontSize: 18, fontFamily: 'Inter-SemiBold', color: Colors.textPrimary }}>Select Country</Text>
                                <TouchableOpacity onPress={() => setShowCountryPicker(false)}>
                                    <X size={24} color={Colors.textSecondary} />
                                </TouchableOpacity>
                            </View>
                            
                            <ScrollView style={{ flexShrink: 1 }}>
                                {COUNTRY_CODES.map((country, index) => (
                                    <TouchableOpacity
                                        key={index}
                                        style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            paddingVertical: 12,
                                            borderBottomWidth: index === COUNTRY_CODES.length - 1 ? 0 : 1,
                                            borderBottomColor: Colors.border
                                        }}
                                        onPress={() => {
                                            setNewCustomer(prev => ({ ...prev, countryCode: country.code }));
                                            setSelectedFlag(country.flag);
                                            setShowCountryPicker(false);
                                        }}
                                    >
                                        <Text style={{ fontSize: 24, marginRight: 12 }}>{country.flag}</Text>
                                        <Text style={{ flex: 1, fontFamily: 'Inter-Medium', fontSize: 16, color: Colors.textPrimary }}>
                                            {country.name}
                                        </Text>
                                        <Text style={{ fontFamily: 'Inter-SemiBold', fontSize: 16, color: Colors.textSecondary }}>
                                            {country.code}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    </View>
                )}

            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    sheetToastWrapper: {
        position: 'absolute',
        left: 16,
        right: 16,
        zIndex: 9999,
        elevation: 9999,
    },
    sheetToast: {
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 8,
    },
    sheetToastError: {
        backgroundColor: '#EF4444',
    },
    sheetToastSuccess: {
        backgroundColor: '#10B981',
    },
    sheetToastText: {
        color: '#FFFFFF',
        fontFamily: 'Inter-Medium',
        fontSize: 14,
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    container: {
        backgroundColor: Colors.white,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        height: SCREEN_HEIGHT * 0.85,
        maxHeight: '100%',
    },
    handle: {
        width: 40,
        height: 4,
        backgroundColor: '#E5E7EB',
        borderRadius: 2,
        alignSelf: 'center',
        marginTop: 12,
        marginBottom: 8
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: Spacing.lg,
        paddingBottom: Spacing.md
    },
    title: {
        fontFamily: 'Inter-Bold',
        fontSize: 22,
        color: '#111827'
    },
    closeBtn: {
        padding: 4
    },
    tabs: {
        flexDirection: 'row',
        paddingHorizontal: Spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    tab: {
        marginRight: Spacing.xl,
        paddingVertical: 12,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent'
    },
    activeTab: {
        borderBottomColor: Colors.primary
    },
    tabText: {
        fontFamily: 'Inter-Medium',
        fontSize: 15,
        color: Colors.textSecondary
    },
    activeTabText: {
        color: Colors.primary,
        fontFamily: 'Inter-SemiBold'
    },
    content: {
        flex: 1,
        padding: Spacing.lg,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        borderRadius: 12,
        paddingHorizontal: Spacing.md,
        height: 50,
        marginBottom: Spacing.md
    },
    searchInput: {
        flex: 1,
        marginLeft: Spacing.sm,
        fontFamily: 'Inter-Regular',
        fontSize: 16,
        color: Colors.textPrimary
    },
    loaderOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.72)',
    },
    loaderFooter: {
        paddingVertical: 16,
        alignItems: 'center',
    },
    customerItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6'
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#E0F2FE',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12
    },
    avatarText: {
        fontFamily: 'Inter-Bold',
        fontSize: 18,
        color: Colors.primary
    },
    customerName: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 16,
        color: Colors.textPrimary
    },
    customerMobile: {
        fontFamily: 'Inter-Regular',
        fontSize: 14,
        color: Colors.textSecondary,
        marginTop: 2
    },
    selectBtn: {
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16
    },
    selectBtnText: {
        fontFamily: 'Inter-Medium',
        fontSize: 12,
        color: Colors.textPrimary
    },
    emptyState: {
        alignItems: 'center',
        paddingTop: 40
    },
    emptyText: {
        fontFamily: 'Inter-Regular',
        fontSize: 15,
        color: Colors.textSecondary,
        marginBottom: 8
    },
    linkText: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 15,
        color: Colors.primary
    },
    formGroup: {
        gap: Spacing.md
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 12,
        paddingHorizontal: Spacing.md,
        height: 54
    },
    input: {
        flex: 1,
        marginLeft: Spacing.sm,
        fontFamily: 'Inter-Regular',
        fontSize: 16,
        color: Colors.textPrimary
    },
    confirmBtn: {
        backgroundColor: Colors.primary,
        height: 56,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: Spacing.xl,
    },
    disabledBtn: {
        backgroundColor: '#E5E7EB',
    },
    confirmBtnText: {
        fontFamily: 'Inter-Bold',
        fontSize: 16,
        color: Colors.white
    },
    resetButton: {
        padding: 4,
        marginLeft: 4,
    },
    label: {
        fontFamily: 'Inter-Medium',
        fontSize: 14,
        color: Colors.textPrimary,
        fontWeight: "600"
    },
    errorText: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 12,
        color: 'red',
        // marginTop: "2%",
        marginLeft: 4,
    },
});

export default CustomerSelectionModal;
