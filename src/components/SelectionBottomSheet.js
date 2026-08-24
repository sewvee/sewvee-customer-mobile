import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View, Text, TouchableOpacity, Modal, TextInput,
    FlatList, ActivityIndicator, StyleSheet
} from 'react-native';
import { Search, X, CheckCircle2, Plus, ChevronDown } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { Colors } from '../constants/theme';
import { useToast } from '../context/ToastContext';

// ─── Config — type-க்கு எந்த slice use பண்றதுன்னு ────────────
import {
    getMaterialTypesAction, addMaterialTypeAction
} from '../store/inventoryMaterialTypeSlice';
import {
    getReadymadeCategoriesAction, addReadymadeCategoryAction
} from '../store/inventoryReadymadeCategorySlice';
import {
    getProductTypesAction, addProductTypeAction
} from '../store/inventoryProductTypeSlice';
import {
    getBrandsAction, addBrandAction
} from '../store/inventoryBrandSlice';
import {
    getSuppliersAction, addSupplierAction
} from '../store/inventorySupplierSlice';
import {
    getReadymadeSizesAction, addReadymadeSizeAction
} from '../store/inventoryReadymadeSizeSlice';

const SHEET_CONFIG = {
    'Material Type': {
        selector: s => s.inventoryMaterialType,
        getAction: getMaterialTypesAction,
        addAction: addMaterialTypeAction,
    },
    'Readymade Category': {
        selector: s => s.inventoryReadymadeCategory,
        getAction: getReadymadeCategoriesAction,
        addAction: addReadymadeCategoryAction,
    },
    'Category': {
        selector: s => s.inventoryReadymadeCategory,
        getAction: getReadymadeCategoriesAction,
        addAction: addReadymadeCategoryAction,
    },
    'Product Type': {
        selector: s => s.inventoryProductType,
        getAction: getProductTypesAction,
        addAction: addProductTypeAction,
    },
    'Brand': {
        selector: s => s.inventoryBrand,
        getAction: getBrandsAction,
        addAction: addBrandAction,
    },
    'Supplier': {
        selector: s => s.inventorySupplier,
        getAction: getSuppliersAction,
        addAction: addSupplierAction,
    },
    'Readymade Size': {
        selector: s => s.inventoryReadymadeSize,
        getAction: getReadymadeSizesAction,
        addAction: addReadymadeSizeAction,
    },
};

const getDisplayEntityLabel = title => {
    const labelMap = {
        'Readymade Category': 'Category',
        'Category': 'Category',
        'Readymade Size': 'Size',
        'Material Type': 'Material Type',
        'Product Type': 'Product Type',
        'Brand': 'Brand',
        'Supplier': 'Supplier',
    };

    return labelMap[title] || title || 'Item';
};

const formatInventoryDisplayName = (entityType, value) => {
    const rawValue = `${value ?? ''}`;

    if (entityType === 'Readymade Size') {
        return rawValue.toUpperCase();
    }

    return rawValue;
};

const isInactiveOption = item => {
    const statusValue = item?.status;

    return (
        statusValue === false ||
        statusValue === 0 ||
        statusValue === '0' ||
        statusValue === 'false' ||
        statusValue === 'inactive' ||
        statusValue === 'INACTIVE' ||
        `${statusValue}`.toLowerCase() === 'false' ||
        `${statusValue}`.toLowerCase() === 'inactive'
    );
};

const dedupeListItems = (items = []) => {
    const seenKeys = new Set();

    return (items || []).filter(item => {
        const itemId = item?.id;
        const fallbackKey = `${item?.name || ''}`.trim().toLowerCase();
        const uniqueKey =
            itemId !== undefined && itemId !== null && `${itemId}` !== ''
                ? `id:${itemId}`
                : `name:${fallbackKey}`;

        if (seenKeys.has(uniqueKey)) {
            return false;
        }

        seenKeys.add(uniqueKey);
        return true;
    });
};

const SelectionBottomSheet = ({
    visible,
    onClose,
    title,            // 'Material Type' | 'Brand' | 'Supplier' etc
    selectedValue,    // current selected name (string)
    onSelect,         // (item) => void — item = { id, name, ... }
    multiSelect,      // true = multi select, false = single select
    selectedIds,      // multi select-க்கு [id1, id2]
    onCreateSuccess,
    createPayload,
    disableCreate = false,
    createCategoryId,
    createCategoryName,
    onCreateCategoryChange,
    queryCategoryId,
    prefillCreateCategory = true,
    requireCreateCategoryBeforeName = false,
    autoSelectCreated = true,
    options,
    hideCreateTab = false,
    disableInactiveItems = false,
}) => {
    const insets = useSafeAreaInsets();
    const dispatch = useDispatch();
    const { showToast } = useToast();

    const config = SHEET_CONFIG[title];
    const storeState = useSelector(state =>
        config ? config.selector(state) : {},
    );
    const list = options || storeState?.list || [];
    const loading = config ? storeState?.loading : false;
    const paginationLoading = config ? storeState?.paginationLoading : false;
    const hasMore = config ? storeState?.hasMore : false;

    const [activeTab, setActiveTab] = useState('existing');
    const [searchText, setSearchText] = useState('');
    const [newName, setNewName] = useState('');
    const [supplierPhoneNumber, setSupplierPhoneNumber] = useState('');
    const [supplierAddress, setSupplierAddress] = useState('');
    const [createLoading, setCreateLoading] = useState(false);
    const [sheetToast, setSheetToast] = useState({
        visible: false,
        message: '',
        type: 'error',
    });
    const [showCreateCategorySheet, setShowCreateCategorySheet] = useState(false);
    const [localCreateCategoryId, setLocalCreateCategoryId] = useState(
        createCategoryId || null,
    );
    const [localCreateCategoryName, setLocalCreateCategoryName] = useState(
        createCategoryName || 'Select Category',
    );
    const [showFetchedResults, setShowFetchedResults] = useState(false);
    const hasCreateCategory =
        localCreateCategoryId !== null &&
        localCreateCategoryId !== undefined &&
        localCreateCategoryId !== '';
    const entityLabel = getDisplayEntityLabel(title);
    const createTabLabel = `New ${entityLabel}`;
    const emptyStateLabel = `No ${entityLabel} found`;
    const emptyStateActionLabel = `Create New ${entityLabel}`;

    const pageRef = useRef(1);
    const fetchingRef = useRef(false);
    const searchDebounceRef = useRef(null);
    const toastTimerRef = useRef(null);
    const isSupplier = title === 'Supplier';
    const normalizedList = dedupeListItems(
        disableInactiveItems
            ? list.filter(item => !isInactiveOption(item))
            : list,
    );
    const displayList = options
        ? normalizedList.filter(item =>
              `${item?.name || ''}`
                  .toLowerCase()
                  .includes(searchText.trim().toLowerCase()),
          )
        : normalizedList;
    const initialLoading =
        !options && !showFetchedResults && loading && !paginationLoading;
    // When the sheet is used as a pure picker (for example in filters),
    // keep it list-only and hide the create flow entirely.
    const shouldShowTabs = !hideCreateTab && !options;
    const canCreateFromEmpty = shouldShowTabs && !disableCreate;
    const normalizeEntityName = value => `${value || ''}`.trim().toLowerCase();
    const isDuplicateName = value =>
        list.some(item => normalizeEntityName(item?.name) === normalizeEntityName(value));

    const validatePhone = useCallback(phone => {
        if (!phone) return 'Phone number is required';

        const cleaned = phone.replace(/\D/g, '');

        if (cleaned.length !== 10) {
            return 'Phone number must be 10 digits';
        }

        if (!/^[6-9]\d{9}$/.test(cleaned)) {
            return 'Invalid phone number';
        }

        return null;
    }, []);

    const resetCreateState = useCallback(() => {
        setActiveTab('existing');
        setSearchText('');
        setNewName('');
        setSupplierPhoneNumber('');
        setSupplierAddress('');
        setCreateLoading(false);
        setSheetToast({
            visible: false,
            message: '',
            type: 'error',
        });
        setShowCreateCategorySheet(false);
        setLocalCreateCategoryId(
            prefillCreateCategory ? createCategoryId || null : null,
        );
        setLocalCreateCategoryName(
            prefillCreateCategory
                ? createCategoryName || 'Select Category'
                : 'Select Category',
        );
        setShowFetchedResults(Boolean(options));
        pageRef.current = 1;
    }, [
        createCategoryId,
        createCategoryName,
        options,
        prefillCreateCategory,
    ]);

    const handleSheetClose = useCallback(() => {
        if (toastTimerRef.current) {
            clearTimeout(toastTimerRef.current);
            toastTimerRef.current = null;
        }
        resetCreateState();
        onClose?.();
    }, [onClose, resetCreateState]);

    const showSheetToast = useCallback((message, type = 'error', duration = 4000) => {
        if (toastTimerRef.current) {
            clearTimeout(toastTimerRef.current);
        }

        setSheetToast({
            visible: true,
            message,
            type,
        });

        toastTimerRef.current = setTimeout(() => {
            setSheetToast(prev => ({
                ...prev,
                visible: false,
            }));
            toastTimerRef.current = null;
        }, duration);
    }, []);

    const fetchList = useCallback((page = 1, search = '') => {
        if (!config || options) return;
        if (fetchingRef.current) return;
        fetchingRef.current = true;
        if (page === 1) {
            setShowFetchedResults(false);
        }

        dispatch(config.getAction({
            page,
            limit: 10,
            search,
            requestPage: page,
            ...(disableInactiveItems ? { status: true } : {}),
            ...(queryCategoryId ? { category_id: queryCategoryId } : {}),
        })).finally(() => {
            fetchingRef.current = false;
            if (page === 1) {
                setShowFetchedResults(true);
            }
        });
    }, [config, disableInactiveItems, dispatch, options, queryCategoryId]);

    // ─── Open ஆகும்போது fetch ────────────────────────────────
    useEffect(() => {
        if (visible) {
            setActiveTab('existing');
            setSearchText('');
            setNewName('');
            setSupplierPhoneNumber('');
            setSupplierAddress('');
            setShowCreateCategorySheet(false);
            setLocalCreateCategoryId(
                prefillCreateCategory ? createCategoryId || null : null,
            );
            setLocalCreateCategoryName(
                prefillCreateCategory
                    ? createCategoryName || 'Select Category'
                    : 'Select Category',
            );
            pageRef.current = 1;
            if (!options) {
                fetchList(1, '');
            }
        }
    }, [
        createCategoryId,
        createCategoryName,
        fetchList,
        options,
        prefillCreateCategory,
            visible,
    ]);

    // ─── Search debounce ──────────────────────────────────────
    useEffect(() => {
        if (!visible || options) return;
        if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);

        searchDebounceRef.current = setTimeout(() => {
            pageRef.current = 1;
            fetchList(1, searchText);
        }, searchText.length === 0 ? 0 : 400);

        return () => clearTimeout(searchDebounceRef.current);
    }, [fetchList, options, searchText, visible]);

    useEffect(() => {
        return () => {
            if (toastTimerRef.current) {
                clearTimeout(toastTimerRef.current);
            }
        };
    }, []);

    const handleLoadMore = () => {
        if (options || !config) return;
        if (!hasMore || fetchingRef.current || loading || paginationLoading) return;
        const nextPage = pageRef.current + 1;
        pageRef.current = nextPage;
        fetchList(nextPage, searchText);
    };

    // ─── Create New ───────────────────────────────────────────
    const handleCreate = async () => {
        if (!config || options) return;
        if (!newName.trim()) {
            showSheetToast(`Please enter a ${title} name`, 'error');
            return;
        }
        if (isDuplicateName(newName)) {
            showSheetToast(
                `This ${entityLabel} already exists`,
                'error',
            );
            return;
        }
        if (disableCreate) return;
        if (title === 'Product Type' && !hasCreateCategory) return;
        if (isSupplier) {
            const phoneError = validatePhone(supplierPhoneNumber);
            if (phoneError) {
                showSheetToast(phoneError, 'error');
                return;
            }
        }
        setCreateLoading(true);

        const payload =
            isSupplier
                ? {
                    name: newName.trim(),
                    phone_number: supplierPhoneNumber.replace(/\D/g, ''),
                    address: supplierAddress.trim(),
                }
                : typeof createPayload === 'function'
                ? createPayload(newName.trim(), {
                    selectedValue,
                    selectedIds,
                    title,
                    createCategoryId: localCreateCategoryId,
                    createCategoryName: localCreateCategoryName,
                })
                : { name: newName.trim() };

        if (!payload) {
            setCreateLoading(false);
            return;
        }

        const result = await dispatch(config.addAction(payload));

        setCreateLoading(false);

        if (result.meta.requestStatus === 'fulfilled') {
            const createdItem = result.payload?.data;
            showSheetToast(
                result.payload?.message || `${title} created successfully`,
                'success',
            );
            setNewName('');
            setSupplierPhoneNumber('');
            setSupplierAddress('');
            setActiveTab('existing');
            pageRef.current = 1;
            fetchList(1, '');
            setSearchText('');
            if (createdItem && onCreateSuccess) {
                onCreateSuccess(createdItem, {
                    createCategoryId: localCreateCategoryId,
                    createCategoryName: localCreateCategoryName,
                });
            }
            if (
                createdItem &&
                !multiSelect &&
                autoSelectCreated &&
                !isSupplier
            ) {
                onSelect?.(createdItem);
                onClose?.();
            }
        } else {
            const errorMessage =
                result?.payload?.message ||
                result?.error?.message ||
                `This ${entityLabel} already exists`;

            showSheetToast(errorMessage, 'error');
        }
    };

    const isSelected = (item) => {
        if (multiSelect) {
            return selectedIds?.includes(item.id);
        }
        return selectedValue === item.name;
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={handleSheetClose}
        >
            <TouchableOpacity
                style={styles.overlay}
                activeOpacity={1}
                onPress={handleSheetClose}
            >
                {sheetToast.visible ? (
                    <View pointerEvents="none" style={styles.sheetToastWrapper}>
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
                <TouchableOpacity
                    activeOpacity={1}
                    style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 36) + 16 }]}
                    onPress={() => {}}
                >
                    {/* Handle */}
                    <View style={styles.handle} />

                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>Select {title}</Text>
                        <TouchableOpacity onPress={handleSheetClose} style={styles.closeBtn}>
                            <X size={22} color="#6B7280" />
                        </TouchableOpacity>
                    </View>

                    {/* Tabs */}
                    {shouldShowTabs && (
                        <View style={styles.tabRow}>
                            <TouchableOpacity
                                onPress={() => setActiveTab('existing')}
                                style={[styles.tab, activeTab === 'existing' && styles.tabActive]}
                            >
                                <Text style={[styles.tabText, activeTab === 'existing' && styles.tabTextActive]}>
                                    Existing
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => setActiveTab('create')}
                                style={[styles.tab, activeTab === 'create' && styles.tabActive]}
                            >
                                <Text style={[styles.tabText, activeTab === 'create' && styles.tabTextActive]}>
                                    {createTabLabel}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* ── EXISTING TAB ── */}
                    {activeTab === 'existing' && (
                        <>
                            {/* Search */}
                            <View style={styles.searchBox}>
                                <Search size={18} color="#9CA3AF" />
                                <TextInput
                                    style={styles.searchInput}
                                    placeholder={`Search ${title.toLowerCase()}...`}
                                    placeholderTextColor="#9CA3AF"
                                    value={searchText}
                                    onChangeText={setSearchText}
                                />
                                {searchText.length > 0 && (
                                    <TouchableOpacity onPress={() => setSearchText('')}>
                                        <X size={18} color="#9CA3AF" />
                                    </TouchableOpacity>
                                )}
                            </View>

                            {/* List */}
                            <FlatList
                                data={!options && !showFetchedResults ? [] : displayList}
                                keyExtractor={(item) => item.id?.toString()}
                                keyboardShouldPersistTaps="handled"
                                showsVerticalScrollIndicator={false}
                                style={{ maxHeight: 340 }}
                                renderItem={({ item }) => {
                                    const selected = isSelected(item);
                                    const isInactive = isInactiveOption(item);
                                    const isDisabled = disableInactiveItems && isInactive;
                                    return (
                                        <TouchableOpacity
                                            style={[
                                                styles.listItem,
                                                isDisabled && styles.listItemDisabledRow,
                                            ]}
                                            disabled={isDisabled}
                                            onPress={() => {
                                                if (isDisabled) return;
                                                onSelect(item);
                                                if (!multiSelect) onClose();
                                            }}
                                        >
                                            <View
                                                style={[
                                                    styles.listItemContent,
                                                    isDisabled && styles.listItemDisabled,
                                                ]}
                                            >
                                                <Text style={[
                                                    styles.listItemText,
                                                    isDisabled && styles.listItemTextDisabled,
                                                    selected && { color: Colors.primary, fontFamily: 'Inter-SemiBold' }
                                                ]}>
                                                    {formatInventoryDisplayName(title, item.name)}
                                                </Text>
                                                {isInactive && (
                                                    <Text
                                                        style={[
                                                            styles.inactiveLabel,
                                                            isDisabled && styles.inactiveLabelDisabled,
                                                        ]}
                                                    >
                                                        Inactive
                                                    </Text>
                                                )}
                                            </View>
                                            {selected && !isDisabled && (
                                                <CheckCircle2 size={20} color={Colors.primary} />
                                            )}
                                        </TouchableOpacity>
                                    );
                                }}
                                onEndReached={handleLoadMore}
                                onEndReachedThreshold={0.4}
                                ListEmptyComponent={
                                    initialLoading ? (
                                        <View style={styles.loaderBox}>
                                            <ActivityIndicator size="small" color={Colors.primary} />
                                        </View>
                                    ) : (
                                        <View style={styles.emptyBox}>
                                            <Search size={36} color="#E5E7EB" />
                                            <Text style={styles.emptyText}>
                                                {emptyStateLabel}
                                            </Text>
                                            {canCreateFromEmpty && (
                                                <TouchableOpacity onPress={() => setActiveTab('create')}>
                                                    <Text style={styles.linkText}>{emptyStateActionLabel}</Text>
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    )
                                }
                                ListFooterComponent={
                                    paginationLoading && displayList.length > 0 ? (
                                        <ActivityIndicator
                                            size="small"
                                            color={Colors.primary}
                                            style={{ paddingVertical: 12 }}
                                        />
                                    ) : null
                                }
                            />

                            {/* Multi select Done button */}
                            {multiSelect && (
                                <TouchableOpacity style={styles.doneBtn} onPress={onClose}>
                                    <Text style={styles.doneBtnText}>Done</Text>
                                </TouchableOpacity>
                            )}
                        </>
                    )}

                    {/* ── CREATE NEW TAB ── */}
                    {activeTab === 'create' && (
                        <View style={styles.createBox}>
                            {title === 'Product Type' && (
                                <>
                                    {/* Product Type creation needs a parent category ID for the API. */}
                                    <Text style={styles.createLabel}>Category <Text style={{ color: '#E53935' }}>*</Text></Text>
                                    <TouchableOpacity
                                        style={styles.createDropdown}
                                        onPress={() => setShowCreateCategorySheet(true)}
                                    >
                                        <Text style={styles.createDropdownText}>
                                            {localCreateCategoryName}
                                        </Text>
                                        <ChevronDown size={18} color="#6B7280" />
                                    </TouchableOpacity>
                                </>
                            )}
                            {isSupplier ? (
                                <>
                                    <Text style={styles.createLabel}>Supplier Name <Text style={{ color: '#E53935' }}>*</Text></Text>
                                    <TextInput
                                        style={styles.createInput}
                                        placeholder="Enter supplier name"
                                        placeholderTextColor="#9CA3AF"
                                        value={newName}
                                        onChangeText={setNewName}
                                        autoFocus
                                    />

                                    <Text style={styles.createLabel}>Phone Number <Text style={{ color: '#E53935' }}>*</Text></Text>
                                    <TextInput
                                        style={styles.createInput}
                                        placeholder="Enter phone number"
                                        placeholderTextColor="#9CA3AF"
                                        value={supplierPhoneNumber}
                                        onChangeText={text =>
                                            setSupplierPhoneNumber(text.replace(/\D/g, '').slice(0, 10))
                                        }
                                        keyboardType="phone-pad"
                                        maxLength={10}
                                    />

                                    <Text style={styles.createLabel}>Address</Text>
                                    <TextInput
                                        style={styles.createInput}
                                        placeholder="Enter address"
                                        placeholderTextColor="#9CA3AF"
                                        value={supplierAddress}
                                        onChangeText={setSupplierAddress}
                                    />
                                </>
                            ) : (
                                (!requireCreateCategoryBeforeName ||
                                  title !== 'Product Type' ||
                                  hasCreateCategory) && (
                                <>
                                    <Text style={styles.createLabel}>{title} Name <Text style={{ color: '#E53935' }}>*</Text></Text>
                                    <TextInput
                                        style={styles.createInput}
                                        placeholder={`Enter ${title.toLowerCase()} name`}
                                        placeholderTextColor="#9CA3AF"
                                        value={newName}
                                        onChangeText={setNewName}
                                        autoFocus
                                    />
                                </>
                                )
                            )}
                            <TouchableOpacity
                                style={[
                                  styles.createBtn,
                                    (!newName.trim() ||
                                      createLoading ||
                                      disableCreate ||
                                      (isSupplier &&
                                        !supplierPhoneNumber.trim()) ||
                                      (title === 'Product Type' && !hasCreateCategory)) && {
                                        opacity: 0.5,
                                    },
                                ]}
                                onPress={handleCreate}
                                disabled={
                                    !newName.trim() ||
                                    createLoading ||
                                    disableCreate ||
                                    (isSupplier && !supplierPhoneNumber.trim()) ||
                                    (title === 'Product Type' && !hasCreateCategory)
                                }
                            >
                                {createLoading ? (
                                    <ActivityIndicator color="#fff" size="small" />
                                ) : (
                                    <>
                                        <Plus size={18} color="#fff" style={{ marginRight: 6 }} />
                                        <Text style={styles.createBtnText}>Create {title}</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    )}
                </TouchableOpacity>
            </TouchableOpacity>

            {title === 'Product Type' && (
                    <SelectionBottomSheet
                        visible={showCreateCategorySheet}
                        onClose={() => setShowCreateCategorySheet(false)}
                        title="Category"
                        selectedValue={localCreateCategoryName}
                        disableInactiveItems={disableInactiveItems}
                        onSelect={item => {
                            setLocalCreateCategoryId(item.id);
                            setLocalCreateCategoryName(item.name);
                            onCreateCategoryChange?.(item);
                        }}
                />
            )}
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'flex-end',
    },
    sheetToastWrapper: {
        position: 'absolute',
        top: 20,
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
    sheetToastSuccess: {
        backgroundColor: '#059669',
    },
    sheetToastError: {
        backgroundColor: '#EF4444',
    },
    sheetToastText: {
        color: '#FFFFFF',
        fontFamily: 'Inter-Medium',
        fontSize: 14,
    },
    sheet: {
        backgroundColor: Colors.white,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        paddingHorizontal: 20,
        paddingTop: 12,
        maxHeight: '85%',
    },
    handle: {
        width: 40,
        height: 4,
        backgroundColor: '#E5E7EB',
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 8,
        marginTop: 0,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        paddingBottom: 0,
    },
    headerTitle: {
        fontSize: 22,
        fontFamily: 'Inter-Bold',
        color: '#111827',
    },
    closeBtn: { padding: 4 },
    tabRow: {
        flexDirection: 'row',
        paddingHorizontal: 0,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
        marginBottom: 16,
    },
    tab: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 12,
        marginRight: 24,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    tabActive: {
        borderBottomColor: Colors.primary,
    },
    tabText: {
        fontSize: 15,
        fontFamily: 'Inter-Medium',
        color: '#6B7280',
    },
    tabTextActive: { color: Colors.primary, fontFamily: 'Inter-SemiBold' },
    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        paddingHorizontal: 12,
        height: 46,
        marginBottom: 12,
    },
    searchInput: {
        flex: 1,
        marginLeft: 8,
        fontSize: 15,
        fontFamily: 'Inter-Medium',
        color: '#111827',
    },
    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    listItemContent: {
        flex: 1,
    },
    listItemDisabledRow: {
        backgroundColor: '#F9FAFB',
    },
    listItemDisabled: {
        opacity: 0.45,
    },
    listItemText: {
        fontSize: 15,
        fontFamily: 'Inter-Regular',
        color: '#374151',
    },
    listItemTextDisabled: {
        color: '#9CA3AF',
    },
    inactiveLabel: {
        fontSize: 11,
        fontFamily: 'Inter-Medium',
        color: '#9CA3AF',
        marginTop: 2,
    },
    inactiveLabelDisabled: {
        color: '#94A3B8',
    },
    loaderBox: { paddingVertical: 40, alignItems: 'center' },
    emptyBox: { alignItems: 'center', paddingVertical: 40 },
    emptyText: {
        fontFamily: 'Inter-Medium',
        color: '#9CA3AF',
        fontSize: 15,
        marginTop: 10,
    },
    linkText: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 15,
        color: Colors.primary,
        marginTop: 8,
        textAlign: 'center',
    },
    doneBtn: {
        backgroundColor: Colors.primary,
        borderRadius: 12,
        height: 48,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 12,
    },
    doneBtnText: {
        color: '#fff',
        fontSize: 15,
        fontFamily: 'Inter-Bold',
    },
    createBox: { paddingTop: 8, paddingBottom: 16 },
    createLabel: {
        fontSize: 14,
        fontFamily: 'Inter-SemiBold',
        color: '#374151',
        marginBottom: 8,
    },
    createInput: {
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        paddingHorizontal: 14,
        height: 50,
        fontSize: 15,
        fontFamily: 'Inter-Medium',
        color: '#111827',
        marginBottom: 16,
    },
    createDropdown: {
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        paddingHorizontal: 14,
        height: 50,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    createDropdownText: {
        flex: 1,
        fontSize: 15,
        fontFamily: 'Inter-Medium',
        color: '#111827',
        marginRight: 10,
    },
    createBtn: {
        backgroundColor: Colors.primary,
        borderRadius: 12,
        height: 50,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    createBtnText: {
        color: '#fff',
        fontSize: 15,
        fontFamily: 'Inter-Bold',
    },
});

export default SelectionBottomSheet;
