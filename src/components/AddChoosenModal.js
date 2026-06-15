import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Modal,
    TextInput, ScrollView, Image, FlatList, Platform, Alert, ActivityIndicator,
    Dimensions, KeyboardAvoidingView, RefreshControl
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { X, Search, Camera, ChevronDown, Minus, Plus, Tag, Hash, Box, Info, Layers, Shirt, Award, CheckCircle2, Trash2, Check, Users } from 'lucide-react-native';
import { Colors } from '../constants/theme';
import ImagePicker from 'react-native-image-crop-picker';
import axios from 'axios';
import {
    addMaterialAction,
    getMaterialsAction,
} from '../store/inventoryMaterialSlice';
import { getMaterialTypesAction } from '../store/inventoryMaterialTypeSlice';
import {
    addReadymadeAction,
    getReadymadesAction,
} from '../store/inventoryReadymadeSlice';
import { getReadymadeCategoriesAction } from '../store/inventoryReadymadeCategorySlice';
import { getProductTypesAction } from '../store/inventoryProductTypeSlice';
import { getBrandsAction } from '../store/inventoryBrandSlice';
import { uploadImageAction } from '../store/uploadSlice';
import { useToast } from '../context/ToastContext';
import BottomConfirmationSheet from './BottomConfirmationSheet';
import SelectionBottomSheet from './SelectionBottomSheet';
import { getInventoryMasterAction } from '../store/inventorySettingsSlice';
import { getSectionsAction } from '../store/sectionSlice';
import {
    IMAGE_UPLOAD_SIZE_ERROR,
    getResolvedImageUploadSize,
    isImageUploadTooLargeAsync,
    pickValidatedImageWithCrop,
} from '../utils/imageUploadValidation';
import { URL_UPLOAD } from '../config/env';

const Spacing = { xs: 8, s: 12, m: 16, l: 24 };
const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const DEFAULT_SECTION_OPTIONS = [
    { id: 1, name: 'Men' },
    { id: 2, name: 'Women' },
    { id: 3, name: 'Kids-Boys' },
    { id: 4, name: 'Kids-Girls' },
];

const getUploadedImageUrl = response =>
    response?.data?.data?.url ||
    response?.data?.url ||
    response?.data?.data ||
    response?.url ||
    null;

const FILE_BASE_URL = `${URL_UPLOAD}`.replace(/\/upload\/mobile\/?$/i, '');
const isRemoteImageUrl = value => /^https?:\/\//i.test(value || '');

const resolveImageUrl = uri => {
    const rawValue = `${uri || ''}`.trim();

    if (!rawValue) {
        return '';
    }

    if (
        /^https?:\/\//i.test(rawValue) ||
        /^file:\/\//i.test(rawValue) ||
        /^content:\/\//i.test(rawValue)
    ) {
        return rawValue;
    }

    if (rawValue.startsWith('//')) {
        return `https:${rawValue}`;
    }

    return `${FILE_BASE_URL}/${rawValue.replace(/^\/+/, '')}`;
};

const normalizeSectionOption = section => {
    if (typeof section === 'string') {
        return {
            id: section,
            name: section,
        };
    }

    const name =
        section?.name ||
        section?.title ||
        section?.section_name ||
        section?.label ||
        '';

    if (!name) {
        return null;
    }

    return {
        id: section?.id ?? name,
        name,
    };
};

const isInactiveSettingOption = option => {
    const statusValue = option?.status;

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

const getMaterialTypeDisplayName = (item, fallback = {}) =>
    item?.material_type_name ||
    item?.material_type?.name ||
    item?.materialType?.name ||
    item?.materialType ||
    item?.material?.material_type?.name ||
    item?.material?.material_type_name ||
    fallback.materialType ||
    fallback.type ||
    item?.name ||
    'Material';

const normalizeMaterialItem = (item, fallback = {}) => {
    console.log('Material Item:', item);

    const materialType = getMaterialTypeDisplayName(item, fallback);

    return {
        id: item?.id,
        materialId: item?.id,
        name: item?.material_name || item?.name || '',
        photo: resolveImageUrl(item?.image_url || item?.photo || ''),
        img: resolveImageUrl(item?.image_url || item?.photo || ''),
        sku:
            item?.sku?.sku_code ||
            item?.sku_code ||
            item?.sku ||
            fallback.sku ||
            'N/A',
        materialType,
        type: materialType,
        unit: item?.is_meter ? 'Meters' : 'Pieces',
        is_meter: item?.is_meter || false,
        low_stock_threshold:
            Number(item?.low_stock_threshold ?? fallback.low_stock_threshold) || 0,
    };
};

const normalizeReadymadeItem = (item, fallback = {}) => ({
    id: item?.id,
    readymadeId: item?.id,
    name: item?.name || item?.readymade_name || fallback.name || '',
    photo: resolveImageUrl(item?.image_url || item?.photo || fallback.photo || ''),
    img: resolveImageUrl(item?.image_url || item?.photo || fallback.photo || ''),
    sku:
        item?.sku?.sku_code ||
        item?.sku_code ||
        item?.sku ||
        fallback.sku ||
        'N/A',
    type:
        item?.readymade_category?.name ||
        item?.category?.name ||
        item?.category_name ||
        fallback.type ||
        'Readymade',
    category:
        item?.readymade_category?.name ||
        item?.category?.name ||
        item?.category_name ||
        fallback.category ||
        '',
    category_id:
        item?.readymade_category_id ||
        item?.category_id ||
        item?.readymade_category?.id ||
        item?.category?.id ||
        fallback.category_id ||
        null,
    productType:
        item?.readymade_product_type?.name ||
        item?.product_type?.name ||
        item?.productType?.name ||
        item?.product_type_name ||
        fallback.productType ||
        '',
    product_type_id:
        item?.readymade_product_type_id ||
        item?.product_type_id ||
        item?.readymade_product_type?.id ||
        item?.product_type?.id ||
        fallback.product_type_id ||
        null,
    brand:
        item?.brand?.name ||
        item?.brand_name ||
        fallback.brand ||
        '',
    brand_id: item?.brand_id || item?.brand?.id || fallback.brand_id || null,
    unit: 'Pieces',
    section:
        item?.section?.name ||
        item?.section_name ||
        item?.gender ||
        fallback.section ||
        '',
});

const getEntityLabel = type => type || 'Item';

const getExistingItemId = (item, itemType) => {
    if (!item) {
        return null;
    }

    if (itemType === 'Material') {
        return item?.material_id || item?.materialId || item?.id || null;
    }

    return item?.readymade_id || item?.readymadeId || item?.id || null;
};

const AddChoosenModal = ({
    visible,
    onClose,
    onAdd,
    type,
    selectedItems = [],
    currentSelectedItem = null,
}) => {
    const insets = useSafeAreaInsets();
    const dispatch = useDispatch();
    const { showToast } = useToast();
    const entityLabel = getEntityLabel(type);
    const entityLabelLower = entityLabel.toLowerCase();
    const createTabLabel = `New ${entityLabel}`;
    const emptyStateLabel = `No ${entityLabel} found`;
    const emptyStateActionLabel = `Create New ${entityLabel}`;
    const [activeTab, setActiveTab] = useState('Existing');
    const [searchQuery, setSearchQuery] = useState('');
    const [typesLoading, setTypesLoading] = useState(true);
    const [loading, setLoading] = useState(false);
    const [existingItems, setExistingItems] = useState([]);
    const [existingSearchLoading, setExistingSearchLoading] = useState(false);
    const [existingRefreshing, setExistingRefreshing] = useState(false);
    const [removePhotoSheetVisible, setRemovePhotoSheetVisible] = useState(false);
    const [photoToRemove, setPhotoToRemove] = useState(null);
    const [modalToast, setModalToast] = useState({
        visible: false,
        message: '',
        type: 'error',
    });
    const existingRequestIdRef = useRef(0);
    const modalToastTimerRef = useRef(null);

    //ready made
    const [productName, setProductName] = useState('');
    const [skuCode, setSkuCode] = useState('');
    const [sectionName, setSectionName] = useState('Select Section');
    const [sectionId, setSectionId] = useState(null);
    const [sectionSearchText, setSectionSearchText] = useState('');

    // States for Dropdowns (Bottom Sheets)
    const [activeSheet, setActiveSheet] = useState(null); // 'category' | 'type' | 'brand'
    const [category, setCategory] = useState('Select Category');
    const [categoryId, setCategoryId] = useState(null);
    const [productType, setProductType] = useState('Select Type');
    const [productTypeId, setProductTypeId] = useState(null);
    const [brand, setBrand] = useState('Select Brand');
    const [brandId, setBrandId] = useState(null);
    const CustomDropdown = ({ label, value, icon: Icon, onPress, disabled = false }) => (
        <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
                <Icon size={22} color={Colors.textSecondary} />
                <Text style={styles.label}>{label} <Text style={{ color: 'red' }}>*</Text></Text>
            </View>
            <TouchableOpacity
                style={[
                    styles.dropdownBox,
                    disabled && { backgroundColor: '#F3F4F6', opacity: 0.7 },
                ]}
                onPress={onPress}
                activeOpacity={0.7}
                disabled={disabled}
            >
                <Text style={styles.inputText}>{value}</Text>
                <ChevronDown size={24} color={Colors.textPrimary} />
            </TouchableOpacity>
        </View>
    );
    const {
        list: readymadeList,
        loading: readymadeListLoading,
        paginationLoading: readymadePaginationLoading,
        pagination: readymadePagination,
    } = useSelector(s => s.inventoryReadymade);
    const { sections } = useSelector(s => s.section);
    const sectionOptionsRef = useRef(DEFAULT_SECTION_OPTIONS);

    useEffect(() => {
        const mappedSections = (sections || [])
            .filter(section => !isInactiveSettingOption(section))
            .map(normalizeSectionOption)
            .filter(Boolean);

        sectionOptionsRef.current =
            mappedSections.length > 0
                ? mappedSections
                : sections?.length
                    ? []
                    : DEFAULT_SECTION_OPTIONS;
    }, [sections]);

    const openSheet = (type) => {
        if (type === 'type' && !categoryId) {
            showToast('Please select a category first', 'error');
            return;
        }

        if (type === 'section') {
            dispatch(getSectionsAction());
        }

        setActiveSheet(type);
    };
    const closeSheet = () => {
        setActiveSheet(null);
        setSectionSearchText('');
    };

    // 2. Save Logic
    const handleSave = async () => {
        if (
            !productName.trim() ||
            !categoryId ||
            !productTypeId ||
            !brandId ||
            !sectionId ||
            !skuCode.trim()
        ) {
            showModalToast('Please fill all mandatory fields (*)', 'error');
            return;
        }

        setLoading(true);
        try {
            const readymadeResponse = await dispatch(
                addReadymadeAction({
                    name: productName.trim(),
                    readymade_category_id: categoryId,
                    category_id: categoryId,
                    readymade_product_type_id: productTypeId,
                    product_type_id: productTypeId,
                    brand_id: brandId || null,
                    section_id: sectionId,
                    gender: sectionName,
                    sku_code: skuCode.trim(),
                    ...(materialPhoto
                        ? { image: materialPhoto, image_url: materialPhoto }
                        : {}),
                }),
            ).unwrap();

            if (!readymadeResponse?.success) {
                throw new Error(readymadeResponse?.message || 'Failed to save product');
            }

            showModalToast(
                readymadeResponse?.message || 'Readymade product added successfully',
                'success',
            );
            resetReadymadeCreateForm();
            setSearchQuery('');
            setExistingItems([]);
            setExistingSearchLoading(true);
            setActiveTab('Existing');
        } catch (e) {
            showModalToast(
                e?.message || 'Failed to save product',
                'error',
            );
        } finally {
            setLoading(false);
        }
    };

    const filteredSections = sectionOptionsRef.current.filter(item =>
        item?.name
            ?.toLowerCase()
            .includes(sectionSearchText.toLowerCase()),
    );
    //readymade end
    // --- Create New State ---
    const [materialName, setMaterialName] = useState('');
    const [sku, setSku] = useState('');
    const [materialTypeId, setMaterialTypeId] = useState(null);
    const [unit, setUnit] = useState('Pieces');

    // --- Existing Materials State ---
    const {
        list: materialList,
        loading: materialListLoading,
        paginationLoading: materialPaginationLoading,
        pagination: materialPagination,
    } = useSelector(s => s.inventoryMaterial);
    const { master } = useSelector(s => s.inventorySettings);
    const { list: materialTypes, loading: materialTypesLoading } = useSelector(
        s => s.inventoryMaterialType,
    );
    const isMasterInventoryActive = master?.is_master_inventory === 'active';
    const masterThreshold = Number(master?.material_threshold) || 0;

    useEffect(() => {
        if (visible) {
            loadMaterials();
        }
    }, [visible, type]);

    useEffect(() => {
        if (visible && type === 'Readymade') {
            dispatch(getSectionsAction());
        }
    }, [dispatch, type, visible]);

    useEffect(() => {
        if (!visible || activeTab !== 'Existing') {
            return;
        }

        const requestId = existingRequestIdRef.current + 1;
        existingRequestIdRef.current = requestId;
        setExistingItems([]);
        setExistingSearchLoading(true);

        const timer = setTimeout(() => {
            const request =
                type === 'Material'
                    ? dispatch(
                          getMaterialsAction({
                              page: 1,
                              limit: 10,
                              search: searchQuery,
                              status: true,
                          }),
                      )
                    : dispatch(
                          getReadymadesAction({
                              page: 1,
                              limit: 10,
                              search: searchQuery,
                              status: true,
                          }),
                      );

            Promise.resolve(request)
                .catch(() => null)
                .finally(() => {
                    if (existingRequestIdRef.current === requestId) {
                        setExistingSearchLoading(false);
                    }
                });
        }, searchQuery.length === 0 ? 0 : 400);

        return () => clearTimeout(timer);
    }, [activeTab, dispatch, searchQuery, type, visible]);

    useEffect(() => {
        if (!visible || activeTab !== 'Existing') {
            return;
        }

        const nextItems =
            type === 'Material'
                ? (materialList || [])
                      .filter(item => !isInactiveSettingOption(item))
                      .map(item => normalizeMaterialItem(item))
                : (readymadeList || [])
                      .filter(item => !isInactiveSettingOption(item))
                      .map(item => normalizeReadymadeItem(item));

        setExistingItems(nextItems);
    }, [activeTab, materialList, readymadeList, type, visible]);

    useEffect(() => {
        return () => {
            if (modalToastTimerRef.current) {
                clearTimeout(modalToastTimerRef.current);
            }
        };
    }, []);

    const showModalToast = (message, toastType = 'error', duration = 4000) => {
        if (modalToastTimerRef.current) {
            clearTimeout(modalToastTimerRef.current);
        }

        setModalToast({
            visible: true,
            message,
            type: toastType,
        });

        modalToastTimerRef.current = setTimeout(() => {
            setModalToast(prev => ({
                ...prev,
                visible: false,
            }));
        }, duration);
    };

    const loadMaterials = async () => {
        try {
            if (type == 'Material') {
                dispatch(getMaterialTypesAction({ page: 1, limit: 50 }));
                dispatch(getInventoryMasterAction());
            } else {
                dispatch(
                    getReadymadeCategoriesAction({
                        page: 1,
                        limit: 50,
                    }),
                );
                dispatch(
                    getBrandsAction({
                        page: 1,
                        limit: 50,
                    }),
                );
            }
        } catch (e) {
            console.error(e);
        } finally {
            // setRefreshing(false);
        }
    };

    // 2. Search Filter Logic
    const filteredItems = existingSearchLoading ? [] : existingItems;

    const isExistingLoading =
        type === 'Material' ? materialListLoading : readymadeListLoading;
    const isExistingPaginationLoading =
        type === 'Material'
            ? materialPaginationLoading
            : readymadePaginationLoading;
    const existingPagination =
        type === 'Material' ? materialPagination : readymadePagination;
    const hasMoreExisting =
        Number(existingPagination?.page || 1) <
        Number(existingPagination?.totalPages || 1);

    const fetchExistingPage = async (page = 1) => {
        const params = {
            page,
            limit: Number(existingPagination?.limit || 10),
            search: searchQuery,
            status: true,
        };

        if (type === 'Material') {
            return dispatch(getMaterialsAction(params));
        }

        return dispatch(getReadymadesAction(params));
    };

    const handleLoadMore = () => {
        if (
            activeTab !== 'Existing' ||
            existingSearchLoading ||
            existingRefreshing ||
            isExistingLoading ||
            isExistingPaginationLoading ||
            !hasMoreExisting
        ) {
            return;
        }

        const nextPage = Number(existingPagination?.page || 1) + 1;
        fetchExistingPage(nextPage);
    };

    const handleExistingRefresh = async () => {
        if (activeTab !== 'Existing' || existingRefreshing) {
            return;
        }

        setExistingRefreshing(true);
        setExistingItems([]);

        try {
            await Promise.resolve(fetchExistingPage(1));
        } catch (e) {
            // Keep existing UX; list-level error handling already lives elsewhere.
        } finally {
            setExistingRefreshing(false);
        }
    };

    const selectedItemIds = new Set(
        (selectedItems || [])
            .map(item => getExistingItemId(item, type))
            .filter(id => id !== null && id !== undefined)
            .map(id => `${id}`),
    );
    const currentSelectedItemId = getExistingItemId(currentSelectedItem, type);

    // 3. Existing Item Render
    const renderExistingItem = ({ item }) => {
        const itemId = getExistingItemId(item, type);
        const isCurrentSelection =
            itemId !== null &&
            itemId !== undefined &&
            currentSelectedItemId !== null &&
            currentSelectedItemId !== undefined &&
            String(itemId) === String(currentSelectedItemId);
        const isAlreadyAdded =
            itemId !== null &&
            itemId !== undefined &&
            selectedItemIds.has(`${itemId}`);
        const isDisabled = isAlreadyAdded && !isCurrentSelection;
        const isSelected = isAlreadyAdded || isCurrentSelection;
        const buttonText = isDisabled
            ? 'Selected'
            : isSelected
                ? 'Selected'
                : 'Select';

        return (
        <TouchableOpacity
            style={[styles.itemCard, isSelected && styles.itemCardSelected]}
            onPress={() => {
                if (!isDisabled) {
                    onAdd(item);
                }
            }}
            disabled={isDisabled}
            activeOpacity={isDisabled ? 1 : 0.85}
        >
            {item.photo ? (
                <TouchableOpacity
                    style={styles.itemThumb}
                    onPress={() => openImagePreview(item.photo)}
                    activeOpacity={0.9}
                >
                    <Image source={{ uri: item.photo }} style={styles.itemThumb} />
                </TouchableOpacity>
            ) : (
                <View style={[styles.itemThumb, { backgroundColor: '#F3F0FF', justifyContent: 'center', alignItems: 'center' }]}>
                    <Shirt size={28} color={Colors.primary} />
                </View>
            )}
            <View style={{ flex: 1, marginLeft: 16 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Text style={[styles.itemNameText, { flex: 1, marginRight: 8 }]} numberOfLines={2}>{item.name}</Text>
                    <TouchableOpacity
                        style={[
                            styles.selectBtn,
                            isSelected && styles.selectBtnSelected,
                            isDisabled && styles.selectBtnDisabled,
                        ]}
                        onPress={() => {
                            if (!isDisabled) {
                                onAdd(item);
                            }
                        }}
                        disabled={isDisabled}
                    >
                        <Text
                            style={[
                                styles.selectBtnText,
                                isSelected && styles.selectBtnTextSelected,
                                isDisabled && styles.selectBtnTextDisabled,
                            ]}
                        >
                            {buttonText}
                        </Text>
                    </TouchableOpacity>
                </View>
                <Text style={styles.itemSubText}>SKU : {item.sku || 'N/A'}</Text>
                <View style={styles.typeBadge}>
                    <Text style={styles.typeBadgeText}>
                        {item.materialType || item.type || (type === 'Material' ? 'Material' : item.category || 'Product')}
                    </Text>
                </View>
            </View>
        </TouchableOpacity>
    );
    };

    const [materialPhoto, setMaterialPhoto] = useState(null);
    const [materialPhotoSize, setMaterialPhotoSize] = useState(0);
    const [photoLoading, setPhotoLoading] = useState(false);
    const [showTypeSheet, setShowTypeSheet] = useState(false);
    const [materialType, setMaterialType] = useState('Select Type');
    const [stockThreshold, setStockThreshold] = useState(5);
    const [imagePreviewVisible, setImagePreviewVisible] = useState(false);
    const [imagePreviewUri, setImagePreviewUri] = useState('');
    const [imagePreviewLoadFailed, setImagePreviewLoadFailed] = useState(false);
    const materialPhotoSource = resolveImageUrl(materialPhoto);

    // Data State
    useEffect(() => {
        if (type === 'Material') {
            setTypesLoading(materialTypesLoading);
            return;
        }
    }, [materialTypes, materialTypesLoading, type]);

    useEffect(() => {
        if (
            visible &&
            type === 'Material' &&
            isMasterInventoryActive &&
            masterThreshold > 0 &&
            stockThreshold === 5
        ) {
            setStockThreshold(masterThreshold);
        }
    }, [
        isMasterInventoryActive,
        masterThreshold,
        stockThreshold,
        type,
        visible,
    ]);

    useEffect(() => {
        if (!visible || type !== 'Readymade') {
            return;
        }

        if (!categoryId) {
            return;
        }

        dispatch(
            getProductTypesAction({
                page: 1,
                limit: 50,
                category_id: categoryId,
            }),
        );
    }, [categoryId, dispatch, type, visible]);

    const resetMaterialCreateForm = () => {
        setMaterialName('');
        setMaterialType('Select Type');
        setMaterialTypeId(null);
        setSku('');
        setStockThreshold(masterThreshold || 5);
        setMaterialPhoto(null);
        setMaterialPhotoSize(0);
        setPhotoLoading(false);
        setShowTypeSheet(false);
        setUnit('Pieces');
    };

    const resetReadymadeCreateForm = () => {
        setProductName('');
        setSkuCode('');
        setSectionName('Select Section');
        setSectionId(null);
        setSectionSearchText('');
        setCategory('Select Category');
        setCategoryId(null);
        setProductType('Select Type');
        setProductTypeId(null);
        setBrand('Select Brand');
        setBrandId(null);
        setActiveSheet(null);
        setMaterialPhoto(null);
        setMaterialPhotoSize(0);
        setPhotoLoading(false);
    };

    const resetChooserState = () => {
        setActiveTab('Existing');
        setSearchQuery('');
        setExistingItems([]);
        setExistingSearchLoading(false);
        setLoading(false);
        setRemovePhotoSheetVisible(false);
        setPhotoToRemove(null);
        setImagePreviewVisible(false);
        setImagePreviewUri('');
        setImagePreviewLoadFailed(false);
        setModalToast({
            visible: false,
            message: '',
            type: 'error',
        });
        resetReadymadeCreateForm();
        resetMaterialCreateForm();
    };

    const handleChooserClose = () => {
        if (modalToastTimerRef.current) {
            clearTimeout(modalToastTimerRef.current);
            modalToastTimerRef.current = null;
        }
        resetChooserState();
        onClose?.();
    };

    // 2. Save Logic with Validation
    const handleSaveMaterial = async () => {
        if (!materialName.trim()) {
            showModalToast('Please enter a material name', 'error');
            return;
        }

        if (!materialTypeId || !sku.trim()) {
            showModalToast('Please fill all mandatory fields (*)', 'error');
            return;
        }

        setLoading(true);
        try {
            const materialResponse = await dispatch(
                addMaterialAction({
                    material_name: materialName.trim(),
                    material_type_id: materialTypeId,
                    sku: sku.trim(),
                    low_stock_threshold: isMasterInventoryActive
                        ? Math.max(0, Number(stockThreshold) || 0)
                        : 0,
                    is_meter: unit === 'Meters',
                    ...(materialPhoto
                        ? { image: materialPhoto, image_url: materialPhoto }
                        : {}),
                }),
            ).unwrap();

            if (!materialResponse?.success) {
                throw new Error(materialResponse?.message || 'Failed to save material');
            }

            showModalToast(
                materialResponse?.message || 'Material created successfully',
                'success',
            );
            resetMaterialCreateForm();
            setSearchQuery('');
            setExistingItems([]);
            setExistingSearchLoading(true);
            setActiveTab('Existing');
        } catch (e) {
            showModalToast(
                e?.message || e?.error || 'Failed to save material',
                'error',
            );
        } finally {
            setLoading(false);
        }
    };
    // Image Upload Logic
    const handlePhotoUpload = async () => {
        if (photoLoading) {
            return;
        }

        pickValidatedImageWithCrop({
            width: 400,
            height: 400,
            cropping: true,
        }).then(async image => {
            const resolvedImageSize = await getResolvedImageUploadSize(image);

            if (await isImageUploadTooLargeAsync(image)) {
                showModalToast(IMAGE_UPLOAD_SIZE_ERROR, 'error');
                return;
            }

            setMaterialPhotoSize(resolvedImageSize);
            setPhotoLoading(true);
            try {
                const uploadResponse = await dispatch(
                    uploadImageAction({
                        uri: image.path,
                        type: 'image/jpeg',
                        name: 'material.jpg',
                        key_name: type === 'Readymade' ? 'readymade' : 'materials',
                    }),
                ).unwrap();

                const uploadedUrl = getUploadedImageUrl(uploadResponse);
                if (!uploadedUrl) {
                    throw new Error('Failed to upload image');
                }

                setMaterialPhoto(uploadedUrl);
                showModalToast('Image uploaded successfully', 'success');
            } catch (error) {
                showModalToast(
                    error?.message || error?.error || 'Failed to upload image',
                    'error',
                );
            } finally {
                setPhotoLoading(false);
            }
        }).catch(err => {
            if (
                err?.message !== 'User cancelled image selection' &&
                err?.message !== 'User cancelled image cropping'
            ) {
                showModalToast(
                    err?.message || err?.error || 'Failed to select image',
                    'error',
                );
            }
        });
    };

    const handleIncrement = () => setStockThreshold(prev => prev + 1);
    const handleDecrement = () => setStockThreshold(prev => (prev > 0 ? prev - 1 : 0));

    const handleRemovePhoto = () => {
        setMaterialPhoto(null);
        setMaterialPhotoSize(0);
        setPhotoLoading(false);
        setImagePreviewVisible(false);
        setImagePreviewUri('');
        setImagePreviewLoadFailed(false);
    };

    const deleteUploadedPhoto = async imageUrl => {
        if (!isRemoteImageUrl(imageUrl)) {
            return;
        }

        const fileKey = imageUrl.replace(/^https?:\/\/[^/]+/i, '');
        await axios.delete(
            `https://api.sewvee.com/upload/${encodeURIComponent(
                fileKey,
            )}`,
        );
    };

    const handleRemovePhotoRequest = image => {
        setPhotoToRemove(image);
        setRemovePhotoSheetVisible(true);
    };

    const confirmRemovePhoto = async () => {
        const image = photoToRemove || materialPhoto;

        if (!image) {
            setRemovePhotoSheetVisible(false);
            return;
        }

        setPhotoLoading(true);
        try {
            await deleteUploadedPhoto(image);
            handleRemovePhoto();
            showModalToast('Photo removed successfully', 'success');
            setRemovePhotoSheetVisible(false);
            setPhotoToRemove(null);
        } catch (error) {
            showModalToast(
                error?.message || error?.error || 'Failed to remove photo',
                'error',
            );
        } finally {
            setPhotoLoading(false);
        }
    };

    const openImagePreview = uri => {
        const resolvedUri = resolveImageUrl(uri);
        if (!resolvedUri) {
            return;
        }

        setImagePreviewUri(resolvedUri);
        setImagePreviewLoadFailed(false);
        setImagePreviewVisible(true);
    };

    useEffect(() => {
        if (visible) {
            resetChooserState();
        }
    }, [visible]);


return (
    <>
    <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={handleChooserClose}
        >
            <View style={styles.modalOverlay}>
                <TouchableOpacity
                    style={StyleSheet.absoluteFillObject}
                    activeOpacity={1}
                    onPress={handleChooserClose}
                />
                {modalToast.visible ? (
                    <View pointerEvents="none" style={styles.modalToastWrapper}>
                        <View
                            style={[
                                styles.modalToast,
                                modalToast.type === 'success'
                                    ? styles.modalToastSuccess
                                    : styles.modalToastError,
                            ]}
                        >
                            <Text style={styles.modalToastText} numberOfLines={2}>
                                {modalToast.message}
                            </Text>
                        </View>
                    </View>
                ) : null}
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={{ flex: 1, justifyContent: 'flex-end' }}
                >
                    <View style={[styles.sheetContainer, { paddingBottom: insets.bottom }]}>
                    <View style={styles.sheetHandle} />

                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>Select {entityLabel}</Text>
                        <TouchableOpacity onPress={handleChooserClose} style={styles.closeBtn}>
                            <X size={24} color={Colors.textPrimary} />
                        </TouchableOpacity>
                    </View>


                    {/* Tabs */}
                    <View style={styles.tabContainer}>
                        <TouchableOpacity
                            onPress={() => setActiveTab('Existing')}
                            style={[styles.tab, activeTab === 'Existing' && styles.activeTab]}
                        >
                            <Text style={[styles.tabText, activeTab === 'Existing' && styles.activeTabText]}>Existing</Text>
                        </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => setActiveTab('CreateNew')}
                                style={[styles.tab, activeTab === 'CreateNew' && styles.activeTab]}
                            >
                                <Text style={[styles.tabText, activeTab === 'CreateNew' && styles.activeTabText]}>{createTabLabel}</Text>
                            </TouchableOpacity>
                    </View>


                    {/* Search Bar */}
                    {activeTab === 'Existing' && (
                        <View style={styles.searchContainer}>
                            <Search size={22} color={Colors.textSecondary} style={{ marginLeft: 12 }} />
                            <TextInput
                                placeholder={`Search ${entityLabelLower} name or SKU`}
                                placeholderTextColor={Colors.textSecondary}
                                style={styles.searchInput}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                            />
                        </View>
                    )}

                    {activeTab === 'Existing' ? (
                        <FlatList
                            data={filteredItems}
                            renderItem={renderExistingItem}
                            keyExtractor={item => `${item.id}`}
                            contentContainerStyle={{ flexGrow: 1, padding: Spacing.m }}
                            refreshControl={
                                <RefreshControl
                                    refreshing={existingRefreshing}
                                    onRefresh={handleExistingRefresh}
                                    colors={[Colors.primary]}
                                    tintColor={Colors.primary}
                                />
                            }
                            onEndReached={handleLoadMore}
                            onEndReachedThreshold={0.4}
                            ListFooterComponent={
                                isExistingPaginationLoading ? (
                                    <View style={{ paddingVertical: 16 }}>
                                        <ActivityIndicator size="small" color={Colors.primary} />
                                    </View>
                                ) : null
                            }
                            ListEmptyComponent={
                                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 50 }}>
                                    {existingSearchLoading || isExistingLoading ? (
                                        <ActivityIndicator size="small" color={Colors.primary} />
                                    ) : (
                                        <View style={styles.emptyState}>
                                            <Search size={40} color="#E5E7EB" style={{ marginBottom: 10 }} />
                                            <Text style={styles.emptyText}>{emptyStateLabel}</Text>
                                            <TouchableOpacity onPress={() => setActiveTab('CreateNew')}>
                                                <Text style={styles.linkText}>{emptyStateActionLabel}</Text>
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                </View>
                            }
                        />
                    ) : (
                        <>
                            {type === 'Material' ?
                                <>
                                    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                                        {/* Section: Material Photo */}
                                        <View style={styles.sectionHeaderRow}>
                                            <View style={styles.blueIndicator} />
                                            <Text style={styles.sectionTitle}>MATERIAL PHOTO</Text>
                                        </View>

                                        <TouchableOpacity 
                                            style={styles.photoUploadContainer} 
                                            onPress={() => {
                                                if (materialPhoto) {
                                                    openImagePreview(materialPhoto);
                                                    return;
                                                }

                                                handlePhotoUpload();
                                            }}
                                            disabled={photoLoading}
                                        >
                                            {photoLoading ? (
                                                <View style={styles.uploadPlaceholder}>
                                                    <ActivityIndicator size="small" color={Colors.primary} />
                                                    <Text style={styles.uploadSubtext}>Uploading...</Text>
                                                </View>
                                            ) : materialPhotoSource ? (
                                                <View style={styles.imageWrapper}>
                                                    <Image source={{ uri: materialPhotoSource }} style={styles.uploadedImage} resizeMode="contain" />
                                                    <TouchableOpacity
                                                        style={styles.removePhotoButton}
                                                        onPress={event => {
                                                            event?.stopPropagation?.();
                                                            handleRemovePhotoRequest(materialPhoto);
                                                        }}
                                                    >
                                                        <Trash2 size={16} color="#E53935" />
                                                    </TouchableOpacity>
                                                </View>
                                            ) : (
                                                <View style={styles.uploadPlaceholder}>
                                                    <View style={styles.cameraIconCircle}>
                                                        <Camera size={26} color={Colors.textSecondary} />
                                                    </View>
                                                    <Text style={styles.uploadText}>Upload photo</Text>
                                                    <Text style={styles.uploadSubtext}>PNG, JPG up to 5MB</Text>
                                                </View>
                                            )}
                                        </TouchableOpacity>

                                        {/* Section: Basic Information */}
                                        <View style={styles.sectionHeaderRow}>
                                            <View style={styles.blueIndicator} />
                                            <Text style={styles.sectionTitle}>BASIC INFORMATION</Text>
                                        </View>

                                        <View style={styles.formCard}>
                                            {/* Material Name */}
                                            <View style={styles.inputGroup}>
                                                <View style={styles.labelContainer}>
                                                    <Tag size={20} color={Colors.textSecondary} />
                                                    <Text style={styles.inputLabel}>Material Name <Text style={{ color: Colors.danger }}>*</Text></Text>
                                                </View>
                                                <TextInput
                                                    style={styles.textInput}
                                                    placeholder="e.g. Premium Silk Satin"
                                                    placeholderTextColor={Colors.textSecondary}
                                                    value={materialName}
                                                    onChangeText={setMaterialName}
                                                />
                                            </View>

                                            {/* Material Type Dropdown */}
                                            <View style={styles.inputGroup}>
                                                <View style={styles.labelContainer}>
                                                    <Layers size={20} color={Colors.textSecondary} />
                                                    <Text style={styles.inputLabel}>Material Type <Text style={{ color: Colors.danger }}>*</Text></Text>
                                                </View>
                                                <TouchableOpacity
                                                    style={styles.dropdownTrigger}
                                                    onPress={() => setShowTypeSheet(true)}
                                                >
                                                    {typesLoading ? (
                                                        <ActivityIndicator size="small" color={Colors.primary} />
                                                    ) : (
                                                        <Text style={styles.dropdownValue}>{materialType}</Text>
                                                    )}
                                                    <ChevronDown size={24} color={Colors.textSecondary} />
                                                </TouchableOpacity>
                                            </View>

                                            {/* SKU Code */}
                                            <View style={styles.inputGroup}>
                                                <View style={styles.labelContainer}>
                                                    <Hash size={20} color={Colors.textSecondary} />
                                                    <Text style={styles.inputLabel}>SKU / Item Code <Text style={{ color: Colors.danger }}>*</Text></Text>
                                                </View>
                                                <TextInput
                                                    style={styles.textInput}
                                                    placeholder="SW-MTL-001"
                                                    placeholderTextColor={Colors.textSecondary}
                                                    value={sku}
                                                    onChangeText={setSku}
                                                />
                                            </View>

                                            <View style={styles.inputGroup}>
                                                <Text
                                                    style={[
                                                        styles.inputLabel,
                                                        { marginLeft: 0, marginBottom: 12 },
                                                    ]}
                                                >
                                                    Unit Of Measurement
                                                </Text>
                                                <View style={styles.unitSelector}>
                                                    <TouchableOpacity
                                                        style={[
                                                            styles.unitBtn,
                                                            unit === 'Pieces' && styles.unitBtnActive,
                                                        ]}
                                                        onPress={() => setUnit('Pieces')}
                                                    >
                                                        {unit === 'Pieces' && (
                                                            <Check
                                                                size={18}
                                                                color="#FFF"
                                                                style={{ marginRight: 8 }}
                                                            />
                                                        )}
                                                        <Text
                                                            style={[
                                                                styles.unitBtnText,
                                                                unit === 'Pieces' && styles.unitBtnTextActive,
                                                            ]}
                                                        >
                                                            Pieces
                                                        </Text>
                                                    </TouchableOpacity>
                                                    <TouchableOpacity
                                                        style={[
                                                            styles.unitBtn,
                                                            unit === 'Meters' && styles.unitBtnActive,
                                                        ]}
                                                        onPress={() => setUnit('Meters')}
                                                    >
                                                        {unit === 'Meters' && (
                                                            <Check
                                                                size={18}
                                                                color="#FFF"
                                                                style={{ marginRight: 8 }}
                                                            />
                                                        )}
                                                        <Text
                                                            style={[
                                                                styles.unitBtnText,
                                                                unit === 'Meters' && styles.unitBtnTextActive,
                                                            ]}
                                                        >
                                                            Meters
                                                        </Text>
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                        </View>

                                        {/* Low Stock Alert Section */}
                                        {isMasterInventoryActive && (
                                            <View style={styles.stockAlertCard}>
                                                <View style={styles.labelContainer}>
                                                    <Info size={20} color={Colors.textPrimary} />
                                                    <Text style={styles.stockTitle}>Low Stock Alert</Text>
                                                    <Text style={styles.thresholdLabel}>THRESHOLD</Text>
                                                </View>

                                                <View style={styles.counterContainer}>
                                                    <TouchableOpacity style={styles.counterBtn} onPress={handleDecrement}>
                                                        <Minus size={22} color={Colors.textPrimary} />
                                                    </TouchableOpacity>

                                                    <View style={styles.counterValueContainer}>
                                                        <TextInput
                                                            style={styles.counterValueInput}
                                                            value={String(stockThreshold)}
                                                            keyboardType="numeric"
                                                            onChangeText={value =>
                                                                setStockThreshold(
                                                                    Math.max(0, Number(value) || 0),
                                                                )
                                                            }
                                                            textAlign="center"
                                                            selectTextOnFocus
                                                        />
                                                        <Text style={styles.unitText}>
                                                            {unit === 'Pieces' ? 'PIECE' : 'METER'}
                                                        </Text>
                                                    </View>

                                                    <TouchableOpacity style={styles.counterBtn} onPress={handleIncrement}>
                                                        <Plus size={22} color={Colors.textPrimary} />
                                                    </TouchableOpacity>
                                                </View>

                                                <View style={styles.infoNoteRow}>
                                                    <Info size={16} color={Colors.textSecondary} />
                                                    <Text style={styles.infoNoteText}>
                                                        We will notify you when stock levels fall below this threshold.
                                                    </Text>
                                                </View>
                                            </View>
                                        )}

                                    </ScrollView>
                                    <View style={[styles.footer, { paddingBottom: insets.bottom + 10 }]}>
                                        <TouchableOpacity style={styles.materialCancelBtn} onPress={handleChooserClose}>
                                            <Text style={styles.materialCancelBtnText}>Cancel</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity onPress={() => handleSaveMaterial()} style={styles.saveBtn}>
                                            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Material</Text>}
                                        </TouchableOpacity>
                                    </View>
                                    <SelectionBottomSheet
                                        visible={showTypeSheet}
                                        onClose={() => setShowTypeSheet(false)}
                                        title="Material Type"
                                        selectedValue={materialType}
                                        disableInactiveItems
                                        onSelect={item => {
                                            setMaterialType(item.name);
                                            setMaterialTypeId(item.id);
                                        }}
                                        autoSelectCreated={false}
                                    />
                                </>
                                :
                                <>
                                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                                        {/* Section: Material Photo */}
                                        <View style={styles.sectionHeaderRow}>
                                            <View style={styles.blueIndicator} />
                                            <Text style={styles.sectionTitle}>READYMADE PHOTO</Text>
                                        </View>

                                        <TouchableOpacity 
                                            style={styles.photoUploadContainer} 
                                            onPress={() => {
                                                if (materialPhoto) {
                                                    openImagePreview(materialPhoto);
                                                    return;
                                                }

                                                handlePhotoUpload();
                                            }}
                                            disabled={photoLoading}
                                        >
                                            {photoLoading ? (
                                                <View style={styles.uploadPlaceholder}>
                                                    <ActivityIndicator size="small" color={Colors.primary} />
                                                    <Text style={styles.uploadSubtext}>Uploading...</Text>
                                                </View>
                                            ) : materialPhotoSource ? (
                                                <View style={styles.imageWrapper}>
                                                    <Image source={{ uri: materialPhotoSource }} style={styles.uploadedImage} resizeMode="contain" />
                                                    <TouchableOpacity
                                                        style={styles.removePhotoButton}
                                                        onPress={event => {
                                                            event?.stopPropagation?.();
                                                            handleRemovePhotoRequest(materialPhoto);
                                                        }}
                                                    >
                                                        <Trash2 size={16} color="#E53935" />
                                                    </TouchableOpacity>
                                                </View>
                                            ) : (
                                                <View style={styles.uploadPlaceholder}>
                                                    <View style={styles.cameraIconCircle}>
                                                        <Camera size={26} color={Colors.textSecondary} />
                                                    </View>
                                                    <Text style={styles.uploadText}>Upload photo</Text>
                                                    <Text style={styles.uploadSubtext}>PNG, JPG up to 5MB</Text>
                                                </View>
                                            )}
                                        </TouchableOpacity>
                                        {/* Product Name Input */}
                                        <View style={styles.inputGroup}>
                                            <View style={styles.labelRow}>
                                                <Shirt size={22} color={Colors.textSecondary} />
                                                <Text style={styles.label}>Product Name <Text style={{ color: Colors.danger }}>*</Text></Text>
                                            </View>
                                            <TextInput
                                                style={styles.textInput}
                                                placeholder="e.g. Silk Embroidered Kurti"
                                                placeholderTextColor={Colors.textSecondary}
                                                value={productName}
                                                onChangeText={setProductName}
                                            />
                                        </View>

                                        <CustomDropdown
                                            label="Section"
                                            value={sectionName}
                                            icon={Users}
                                            onPress={() => openSheet('section')}
                                        />

                                        {/* Category Dropdown */}
                                        <CustomDropdown
                                            label="Category"
                                            value={category}
                                            icon={Layers}
                                            onPress={() => openSheet('category')}
                                        />

                                        {/* Product Type Dropdown */}
                                        <CustomDropdown
                                            label="Product Type"
                                            value={productType}
                                            icon={Tag}
                                            disabled={!categoryId}
                                            onPress={() => openSheet('type')}
                                        />

                                        {/* Brand Dropdown */}
                                        <CustomDropdown
                                            label="Brand"
                                            value={brand}
                                            icon={Award}
                                            onPress={() => openSheet('brand')}
                                        />

                                        {/* SKU Code Input */}
                                        <View style={styles.inputGroup}>
                                            <View style={styles.labelRow}>
                                                <Hash size={22} color={Colors.textSecondary} />
                                                <Text style={styles.label}>SKU / Code <Text style={{ color: Colors.danger }}>*</Text></Text>
                                            </View>
                                            <TextInput
                                                style={styles.textInput}
                                                value={skuCode}
                                                placeholder="SW-MTL-001"
                                                placeholderTextColor={Colors.textSecondary}
                                                onChangeText={setSkuCode}
                                            // editable={false} // Match UI (Greyed out/Auto-gen)
                                            />
                                        </View>

                                    </ScrollView>

                                    {/* Footer Buttons */}
                                    <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
                                        <TouchableOpacity
                                            style={styles.readymadeCancelBtn}
                                            onPress={handleChooserClose}
                                        >
                                            <Text style={styles.readymadeCancelBtnText}>Cancel</Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity onPress={handleSave} disabled={loading} style={styles.saveBtn} activeOpacity={0.8}>
                                            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Readymade</Text>}
                                        </TouchableOpacity>
                                    </View>

                                    <SelectionBottomSheet
                                        visible={activeSheet === 'category'}
                                        onClose={closeSheet}
                                        title="Category"
                                        selectedValue={category}
                                        disableInactiveItems
                                        autoSelectCreated={false}
                                        onSelect={item => {
                                            setCategory(item.name);
                                            setCategoryId(item.id);
                                            setProductType('Select Type');
                                            setProductTypeId(null);
                                        }}
                                    />

                                    <SelectionBottomSheet
                                        visible={activeSheet === 'type'}
                                        onClose={closeSheet}
                                        title="Product Type"
                                        selectedValue={productType}
                                        disableInactiveItems
                                        autoSelectCreated={false}
                                        prefillCreateCategory={false}
                                        requireCreateCategoryBeforeName
                                        createCategoryId={categoryId}
                                        createCategoryName={category}
                                        queryCategoryId={categoryId}
                                        createPayload={(newName, meta) =>
                                            meta?.createCategoryId
                                                ? {
                                                    name: newName,
                                                    readymade_category_id: meta.createCategoryId,
                                                }
                                                : null
                                        }
                                        onSelect={item => {
                                            setProductType(item.name);
                                            setProductTypeId(item.id);
                                        }}
                                    />

                                    <SelectionBottomSheet
                                        visible={activeSheet === 'brand'}
                                        onClose={closeSheet}
                                        title="Brand"
                                        selectedValue={brand}
                                        disableInactiveItems
                                        autoSelectCreated={false}
                                        onSelect={item => {
                                            setBrand(item.name);
                                            setBrandId(item.id);
                                        }}
                                    />

                                    <Modal
                                        visible={activeSheet === 'section'}
                                        transparent
                                        animationType="slide"
                                        onRequestClose={closeSheet}
                                    >
                                        <TouchableOpacity
                                            style={styles.modalOverlay}
                                            activeOpacity={1}
                                            onPress={closeSheet}
                                        >
                                            <View style={styles.bottomSheet}>
                                                <View style={styles.sheetHeader}>
                                                    <View style={styles.sheetHandle} />
                                                    <Text style={styles.sheetTitle}>Select Section</Text>
                                                </View>

                                                <View style={styles.searchBox}>
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
                                                                paddingVertical: 0,
                                                            }}
                                                            value={sectionSearchText}
                                                            onChangeText={setSectionSearchText}
                                                        />
                                                        {sectionSearchText.length > 0 && (
                                                            <TouchableOpacity onPress={() => setSectionSearchText('')}>
                                                                <X size={20} color="#6B7280" />
                                                            </TouchableOpacity>
                                                        )}
                                                    </View>
                                                {/* </View> */}

                                                <FlatList
                                                    data={filteredSections}
                                                    keyExtractor={item => `${item.id}`}
                                                    renderItem={({ item }) => {
                                                        const isSelected = sectionId === item.id;
                                                        return (
                                                            <TouchableOpacity
                                                                style={styles.sheetOption}
                                                                onPress={() => {
                                                                    setSectionName(item.name);
                                                                    setSectionId(item.id);
                                                                    closeSheet();
                                                                }}
                                                            >
                                                                <Text
                                                                    style={[
                                                                        styles.optionText,
                                                                        isSelected && {
                                                                            color: Colors.primary,
                                                                            fontFamily: 'Inter-Bold',
                                                                        },
                                                                    ]}
                                                                >
                                                                    {item.name}
                                                                </Text>
                                                                {isSelected && (
                                                                    <CheckCircle2 size={22} color={Colors.primary} />
                                                                )}
                                                            </TouchableOpacity>
                                                        );
                                                    }}
                                                    keyboardShouldPersistTaps="handled"
                                                    contentContainerStyle={{ paddingBottom: 40 }}
                                                    ListEmptyComponent={
                                                        <View style={{ alignItems: 'center', marginTop: 40 }}>
                                                            <Search size={40} color="#E5E7EB" style={{ marginBottom: 10 }} />
                                                            <Text
                                                                style={{
                                                                    fontFamily: 'Inter-Medium',
                                                                    color: '#9CA3AF',
                                                                    fontSize: 16,
                                                                    textAlign: 'center',
                                                                    paddingHorizontal: 20,
                                                                }}
                                                            >
                                                                No matching section found
                                                            </Text>
                                                        </View>
                                                    }
                                                />
                                            </View>
                                        </TouchableOpacity>
                                    </Modal>
                                </>
                            }

                        </>
                    )}
                    </View>
                </KeyboardAvoidingView>
            </View>
        </Modal>
        <BottomConfirmationSheet
            visible={removePhotoSheetVisible}
            onClose={() => {
                setRemovePhotoSheetVisible(false);
                setPhotoToRemove(null);
            }}
            onConfirm={confirmRemovePhoto}
            title="Remove Photo"
            description="Are you sure you want to remove this photo?"
            confirmText="Delete"
            cancelText="Cancel"
            type="danger"
        />
        <Modal
            visible={imagePreviewVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setImagePreviewVisible(false)}
        >
            <View style={styles.imagePreviewOverlay}>
                <TouchableOpacity
                    style={styles.imagePreviewCloseBtn}
                    onPress={() => setImagePreviewVisible(false)}
                >
                    <Text style={styles.imagePreviewCloseText}>Close</Text>
                </TouchableOpacity>
                <View style={styles.imagePreviewCard}>
                    {imagePreviewUri && !imagePreviewLoadFailed ? (
                        <Image
                            source={{ uri: imagePreviewUri }}
                            style={styles.imagePreviewFull}
                            resizeMode="contain"
                            onError={() => setImagePreviewLoadFailed(true)}
                        />
                    ) : (
                        <View style={styles.imagePreviewPlaceholder}>
                            <Text style={styles.imagePreviewPlaceholderText}>
                                Unable to load image preview
                            </Text>
                        </View>
                    )}
                </View>
            </View>
        </Modal>
    </>
    );
};

const styles = StyleSheet.create({
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalToastWrapper: {
        position: 'absolute',
        top: 20,
        left: 16,
        right: 16,
        zIndex: 9999,
        elevation: 9999,
    },
    modalToast: {
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 8,
    },
    modalToastSuccess: {
        backgroundColor: '#059669',
    },
    modalToastError: {
        backgroundColor: '#EF4444',
    },
    modalToastText: {
        color: '#FFFFFF',
        fontFamily: 'Inter-Medium',
        fontSize: 14,
    },
    sheetContainer: {
        backgroundColor: Colors.white,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        height: SCREEN_HEIGHT * 0.85,
        maxHeight: '100%',
    },
    sheetHandle: {
        width: 40,
        height: 4,
        backgroundColor: '#E5E7EB',
        borderRadius: 2,
        alignSelf: 'center',
        marginTop: 12,
        marginBottom: 8,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 15,
    },
    headerTitle: { fontFamily: 'Inter-Bold', fontSize: 22, color: Colors.textPrimary },
    closeBtn: { padding: 4 },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        borderRadius: 12,
        paddingHorizontal: 16,
        height: 50,
        marginHorizontal: 20,
        marginTop: 20,
        marginBottom: 20,
    },
    searchInput: {
        flex: 1,
        marginLeft: 8,
        fontFamily: 'Inter-Regular',
        fontSize: 16,
        color: Colors.textPrimary,
    },
    tabContainer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    tab: {
        marginRight: 24,
        paddingVertical: 12,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    activeTab: { borderBottomColor: Colors.primary },
    tabText: { fontFamily: 'Inter-Medium', fontSize: 15, color: Colors.textSecondary },
    activeTabText: { color: Colors.primary, fontFamily: 'Inter-SemiBold' },

    // Existing Items
    itemCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F9FA', padding: 16, borderRadius: 16, marginBottom: 16 },
    itemCardSelected: {
        backgroundColor: '#EFF6FF',
        borderWidth: 1,
        borderColor: '#BFDBFE',
    },
    itemThumb: { width: 85, height: 100, borderRadius: 12 },
    itemNameText: { fontFamily: 'Inter-Bold', fontSize: 16, color: Colors.textPrimary },
    itemSubText: { fontFamily: 'Inter-Medium', fontSize: 13, color: '#6B7280', marginTop: 4 },
    typeBadge: { backgroundColor: '#F3F4F6', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, marginTop: 8, alignSelf: 'flex-start' },
    typeBadgeText: { fontSize: 12, color: '#4B5563', fontFamily: 'Inter-Medium' },
    selectBtn: { backgroundColor: Colors.primary, paddingVertical: 6, paddingHorizontal: 16, borderRadius: 8 },
    selectBtnSelected: { backgroundColor: '#DBEAFE' },
    selectBtnDisabled: { backgroundColor: '#E5E7EB' },
    selectBtnText: { fontFamily: 'Inter-Bold', fontSize: 12, color: '#FFF' },
    selectBtnTextSelected: { color: Colors.primary },
    selectBtnTextDisabled: { color: '#6B7280' },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyText: {
        fontFamily: 'Inter-Regular',
        fontSize: 15,
        color: Colors.textSecondary,
        marginBottom: 8,
        textAlign: 'center',
    },
    linkText: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 15,
        color: Colors.primary,
        textAlign: 'center',
    },

    // Create New
    sectionLabel: { fontFamily: 'Inter-Bold', fontSize: 13, color: Colors.textSecondary, marginBottom: 12, letterSpacing: 0.5 },
    uploadBox: { borderWidth: 1, borderStyle: 'dashed', borderColor: '#CCC', borderRadius: 20, padding: 25, alignItems: 'center' },
    cameraCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
    uploadTitle: { fontFamily: 'Inter-Bold', fontSize: 16, color: Colors.primary },
    uploadSub: { fontFamily: 'Inter-Medium', fontSize: 12, color: Colors.textSecondary },
    infoCard: { borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 20, paddingHorizontal: 16 },
    inputWrapper: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
    inputLabelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    inputLabel: { fontFamily: 'Inter-Bold', fontSize: 16, color: Colors.textPrimary, marginLeft: 8, flex: 1 },
    textInput: { fontFamily: 'Inter-Medium', fontSize: 17, color: Colors.textPrimary },
    dropdownTrigger: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },

    stockAlertCard: { marginTop: 20, borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 20, padding: 16 },
    infoIconCircle: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: Colors.textPrimary, justifyContent: 'center', alignItems: 'center' },
    stepperContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
    stepperBtn: { width: 50, height: 50, backgroundColor: '#F5F5F5', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    stepperValue: { fontFamily: 'Inter-Bold', fontSize: 22, color: Colors.textPrimary },
    stepperUnit: { fontFamily: 'Inter-Bold', fontSize: 11, color: Colors.textSecondary },
    stockInfoText: { fontFamily: 'Inter-Medium', fontSize: 12, color: Colors.textSecondary, lineHeight: 18 },
    saveBtn: { backgroundColor: Colors.primary, height: 55, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginTop: 25 },
    saveBtnText: { fontFamily: 'Inter-Bold', fontSize: 16, color: '#FFFFFF' },
    cancelBtn: { height: 55, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
    cancelBtnText: { fontFamily: 'Inter-Bold', fontSize: 16, color: Colors.textSecondary },
    materialCancelBtn: {
            flex: 0.35,
        backgroundColor: '#FFFFFF',
        height: 60,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    materialCancelBtnText: {
        color: Colors.textPrimary,
        fontSize: 16,
        fontFamily: 'Inter-Bold',
    },


    ///
    scrollContent: { padding: 20 },
    sectionHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
        marginTop: 10
    },
    blueIndicator: {
        width: 4,
        height: 18,
        backgroundColor: Colors.primary,
        borderRadius: 2,
        marginRight: 10
    },
    sectionTitle: {
        fontFamily: 'Inter-Bold',
        fontSize: 15,
        color: '#555',
        letterSpacing: 0.5
    },
    photoUploadContainer: {
        height: 180,
        borderWidth: 1,
        borderColor: '#E8E8E8',
        borderRadius: 16,
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 25,
        backgroundColor: Colors.background,
        // Simple shadow
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    uploadPlaceholder: { alignItems: 'center' },
    cameraIconCircle: {
        width: 50,
        height: 50,
        borderRadius: 25,
        borderWidth: 1,
        borderColor: Colors.border,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10
    },
    uploadText: {
        fontFamily: 'Inter-Bold',
        fontSize: 17,
        color: Colors.primary,
        marginBottom: 4
    },
    uploadSubtext: {
        fontFamily: 'Inter-Medium',
        fontSize: 13,
        color: Colors.textSecondary
    },
    uploadedImage: { width: '100%', height: '100%', borderRadius: 16 },
    imagePreviewOverlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.86)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    imagePreviewCloseBtn: {
        position: 'absolute',
        top: 56,
        right: 24,
        backgroundColor: 'rgba(255,255,255,0.16)',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 18,
        zIndex: 2,
    },
    imagePreviewCloseText: {
        color: '#FFF',
        fontFamily: 'Inter-Bold',
        fontSize: 14,
    },
    imagePreviewCard: {
        width: '100%',
        maxWidth: 360,
        height: '70%',
        borderRadius: 20,
        overflow: 'hidden',
        backgroundColor: '#FFF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    imagePreviewFull: {
        width: '100%',
        height: '100%',
    },
    imagePreviewPlaceholder: {
        flex: 1,
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
        backgroundColor: '#F8FAFC',
    },
    imagePreviewPlaceholderText: {
        color: Colors.textSecondary,
        fontFamily: 'Inter-Medium',
        fontSize: 14,
        textAlign: 'center',
    },
    formCard: {
        borderWidth: 1,
        borderColor: '#E8E8E8',
        borderRadius: 16,
        padding: 16,
        marginBottom: 25
    },
    inputGroup: { marginBottom: 20 },
    labelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8
    },
    inputLabel: {
        fontFamily: 'Inter-Bold',
        fontSize: 15,
        color: Colors.textPrimary,
        marginLeft: 10,
        flex: 1
    },
    requiredTag: { fontSize: 11, fontFamily: 'Inter-Bold', color: Colors.textSecondary },
    optionalTag: { fontSize: 11, fontFamily: 'Inter-Bold', color: Colors.textSecondary },
    textInput: {
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 12,
        height: 50,
        paddingHorizontal: 15,
        fontSize: 15,
        fontFamily: 'Inter-Medium',
        color: Colors.textPrimary
    },
    dropdownTrigger: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 12,
        height: 50,
        paddingHorizontal: 15
    },
    dropdownValue: { fontSize: 15, fontFamily: 'Inter-Medium', color: Colors.textPrimary },
    unitSelector: {
        flexDirection: 'row',
        gap: 12,
    },
    unitBtn: {
        flex: 1,
        height: 48,
        borderRadius: 12,
        backgroundColor: '#F3F4F6',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    unitBtnActive: {
        backgroundColor: Colors.primary,
    },
    unitBtnText: {
        fontFamily: 'Inter-Bold',
        fontSize: 15,
        color: '#4B5563',
    },
    unitBtnTextActive: {
        color: '#FFF',
    },
    stockAlertCard: {
        borderWidth: 3,
        borderColor: '#E8E8E8',
        borderRadius: 18,
        padding: 20,
        backgroundColor: Colors.background
    },
    stockTitle: {
        fontFamily: 'Inter-Bold',
        fontSize: 15,
        color: Colors.textPrimary,
        marginLeft: 10,
        flex: 1
    },
    thresholdLabel: { fontSize: 11, fontFamily: 'Inter-Bold', color: Colors.textSecondary },
    counterContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#F9F9F9',
        borderRadius: 14,
        padding: 10,
        marginTop: 15,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#EEEEEE'
    },
    counterBtn: {
        width: 44,
        height: 44,
        borderRadius: 10,
        backgroundColor: '#FFF',
        borderWidth: 1,
        borderColor: '#DDD',
        justifyContent: 'center',
        alignItems: 'center'
    },
    counterValueContainer: { alignItems: 'center' },
    counterValue: { fontFamily: 'Inter-Bold', fontSize: 24, color: Colors.textPrimary },
    counterValueInput: {
        fontFamily: 'Inter-Bold',
        fontSize: 24,
        color: Colors.textPrimary,
        padding: 0,
        margin: 0,
        minWidth: 50,
        textAlign: 'center',
    },
    unitText: { fontFamily: 'Inter-Bold', fontSize: 12, color: Colors.textSecondary, marginTop: -2 },
    infoNoteRow: { flexDirection: 'row', paddingRight: 20 },
    infoNoteText: {
        fontFamily: 'Inter-Medium',
        fontSize: 14,
        color: Colors.textSecondary,
        marginLeft: 8,
        lineHeight: 20
    },
    footer: { paddingHorizontal: 20, marginTop: 10 },
    saveBtn: {
        backgroundColor: Colors.primary,
        height: 50,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
        elevation: 4,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    saveBtnText: { color: '#FFF', fontSize: 15, fontFamily: 'Inter-Bold' },
    
    // Modal Sheet Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end'
    },
    sheetContent: {
        backgroundColor: '#FFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 20,
        maxHeight: '40%'
    },
    sheetHandle: {
        width: 40,
        height: 5,
        backgroundColor: '#E0E0E0',
        borderRadius: 10,
        alignSelf: 'center',
        marginBottom: 20
    },
    sheetTitle: {
        fontFamily: 'Inter-Bold',
        fontSize: 19,
        marginBottom: 15,
        color: Colors.textPrimary
    },
    sheetItem: {
        paddingVertical: 18,
        borderBottomWidth: 1,
        borderBottomColor: '#F5F5F5'
    },
    sheetItemText: { flex: 1, fontSize: 15, fontFamily: 'Inter-Medium', color: Colors.textPrimary, marginRight: 12 },


    //readymade
    scrollContent: { padding: 20 },

    // Input Group Styles
    inputGroup: { marginBottom: 25 },
    labelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    label: { fontFamily: 'Inter-Bold', fontSize: 15, color: Colors.textPrimary, marginLeft: 10 },

    textInput: {
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 12,
        height: 60,
        paddingHorizontal: 16,
        fontFamily: 'Inter-SemiBold',
        fontSize: 15,
        color: Colors.textPrimary,
        backgroundColor: Colors.white
    },

    dropdownBox: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 12,
        height: 60,
        paddingHorizontal: 16,
        backgroundColor: Colors.white
    },
    inputText: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: Colors.textPrimary },

    // Footer Actions
    footer: {
        flexDirection: 'row',
        padding: 16,
        backgroundColor: Colors.white,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
        justifyContent: 'space-between'
    },
    readymadeCancelBtn: {
        flex: 0.35,
        backgroundColor: '#FFFFFF',
        height: 60,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    readymadeCancelBtnText: {
        fontFamily: 'Inter-Bold',
        fontSize: 15,
        color: Colors.textPrimary,
    },
    cancelBtnText: { fontFamily: 'Inter-Bold', fontSize: 15, color: Colors.textPrimary },
    saveBtn: {
        flex: 0.6,
        backgroundColor: Colors.primary,
        height: 60,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 3,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2
    },
    saveBtnText: { fontFamily: 'Inter-Bold', fontSize: 15, color: Colors.white },

    // Modal / Bottom Sheet Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end'
    },
    bottomSheet: {
        backgroundColor: Colors.white,
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        maxHeight: SCREEN_HEIGHT * 0.6,
        paddingHorizontal: 20
    },
    sheetHeader: {
        alignItems: 'center',
        paddingVertical: 15
    },
    sheetHandle: {
        width: 40,
        height: 5,
        backgroundColor: Colors.border,
        borderRadius: 10,
        marginBottom: 15
    },
    sheetTitle: {
        fontFamily: 'Inter-Bold',
        fontSize: 20,
        color: Colors.textPrimary
    },
    sheetOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 18,
        borderBottomWidth: 1,
        borderBottomColor: Colors.lightBlue
    },
    optionText: {
        flex: 1,
        fontFamily: 'Inter-Medium',
        fontSize: 15,
        color: Colors.textPrimary,
        marginRight: 12
    },
    photoUploadContainer: {
        height: 180,
        borderWidth: 1,
        borderColor: '#E8E8E8',
        borderRadius: 16,
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 25,
        backgroundColor: Colors.background,
        // Simple shadow
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    uploadPlaceholder: { alignItems: 'center' },
    cameraIconCircle: {
        width: 50,
        height: 50,
        borderRadius: 25,
        borderWidth: 1,
        borderColor: Colors.border,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10
    },
    uploadText: {
        fontFamily: 'Inter-Bold',
        fontSize: 17,
        color: Colors.primary,
        marginBottom: 4
    },
    uploadSubtext: {
        fontFamily: 'Inter-Medium',
        fontSize: 13,
        color: Colors.textSecondary
    },
    uploadedImage: { width: '100%', height: '100%', borderRadius: 16 },
    imageWrapper: { width: '100%', height: '100%', position: 'relative', borderRadius: 16, overflow: 'hidden' },
    removePhotoButton: { position: 'absolute', top: 12, right: 12, backgroundColor: '#FFF', width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, borderWidth: 1, borderColor: '#F0F0F0' },
    sectionHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
        marginTop: 10
    },
    blueIndicator: {
        width: 4,
        height: 18,
        backgroundColor: Colors.primary,
        borderRadius: 2,
        marginRight: 10
    },
    sectionTitle: {
        fontFamily: 'Inter-Bold',
        fontSize: 15,
        color: '#555',
        letterSpacing: 0.5
    },
    photoUploadContainer: {
        height: 180,
        borderWidth: 1,
        borderColor: '#E8E8E8',
        borderRadius: 16,
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 25,
        backgroundColor: Colors.background,
        // Simple shadow
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    uploadPlaceholder: { alignItems: 'center' },
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
    // end
});

export default AddChoosenModal;
