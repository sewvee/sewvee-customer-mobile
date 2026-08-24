import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, TextInput,
    ScrollView, Modal, Image, Alert, ActivityIndicator
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Search, Minus, Plus, Ruler, Box, Shirt } from 'lucide-react-native';
import { Colors, Shadow } from '../constants/theme';
import AddChoosenModal from '../components/AddChoosenModal';
import SelectionBottomSheet from '../components/SelectionBottomSheet';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { URL_UPLOAD } from '../config/env';

const getSelectedEntityId = (item, itemType) => {
    if (!item) {
        return null;
    }

    if (itemType === 'Material') {
        return item.material_id || item.materialId || item.id || null;
    }

    return item.readymade_id || item.readymadeId || item.id || null;
};

const FILE_BASE_URL = `${URL_UPLOAD}`.replace(/\/upload\/mobile\/?$/i, '');

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

const AddMaterialItemModal = ({
    visible,
    onClose,
    onRefresh,
    type,
    onAddItem,
    editData,
    isEdit,
    selectedItems = [],
}) => {
    const insets = useSafeAreaInsets();
    const toastTimerRef = useRef(null);
    const [sheetToast, setSheetToast] = useState({
        visible: false,
        message: '',
        type: 'error',
    });
    const [fieldErrors, setFieldErrors] = useState({});

    // --- State Management ---
    const [isSearchModalVisible, setIsSearchModalVisible] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [selectedSize, setSelectedSize] = useState('');
    const [selectedSizeId, setSelectedSizeId] = useState(null);
    const [imagePreviewVisible, setImagePreviewVisible] = useState(false);
    const [imagePreviewLoadFailed, setImagePreviewLoadFailed] = useState(false);
    // Calculation States
    const [qty, setQty] = useState(1);
    const [qtyMeters, setQtyMeters] = useState('');
    const [purchasePrice, setPurchasePrice] = useState(0);
    const [sellingPrice, setSellingPrice] = useState(0);
    const [isSizeSheetVisible, setIsSizeSheetVisible] = useState(false);
    const isMeterBasedMaterial =
        type === 'Material' &&
        (selectedItem?.is_meter === true || selectedItem?.unit === 'Meters');

    // Totals
    const numericQty = Number(qty) || 0;
    const numericQtyMeters = Number(qtyMeters) || 0;
    const quantityForCalculation =
        isMeterBasedMaterial ? numericQtyMeters : numericQty;
    const totalPurchase = quantityForCalculation * (Number(purchasePrice) || 0);
    const totalSelling = quantityForCalculation * (Number(sellingPrice) || 0);
    const itemLabelLower = type === 'Material' ? 'material' : 'readymade';
    const quantityUnitLabel =
        selectedItem?.unit === 'Pieces'
            ? 'PIECES'
            : selectedItem?.unit === 'Meters'
              ? 'METERS'
              : type === 'Material'
                ? 'METERS'
                : 'PCS';
    const pricePerUnitLabel =
        quantityUnitLabel === 'METERS' ? 'Price per meter' : 'Price per piece';
    const sellingPricePerUnitLabel =
        quantityUnitLabel === 'METERS' ? 'PRICE PER METER' : 'PRICE PER PIECE';
    const currentSelectedItemId = getSelectedEntityId(selectedItem, type);
    const selectedItemImage = resolveImageUrl(
        selectedItem?.img || selectedItem?.photo || '',
    );
    const hasDuplicateSelection = (selectedItems || []).some(item => {
        const existingItemId = getSelectedEntityId(item, type);

        if (!existingItemId || !currentSelectedItemId) {
            return false;
        }

        return (
            String(existingItemId) === String(currentSelectedItemId) &&
            String(existingItemId) !== String(getSelectedEntityId(editData, type))
        );
    });

    const clearFieldError = fieldName => {
        setFieldErrors(prev => {
            if (!prev[fieldName]) {
                return prev;
            }

            const nextErrors = { ...prev };
            delete nextErrors[fieldName];
            return nextErrors;
        });
    };

    const showSheetToast = (message, toastType = 'error', duration = 4000) => {
        if (toastTimerRef.current) {
            clearTimeout(toastTimerRef.current);
        }
        setSheetToast({
            visible: true,
            message,
            type: toastType,
        });
        toastTimerRef.current = setTimeout(() => {
            setSheetToast({
                visible: false,
                message: '',
                type: 'error',
            });
            toastTimerRef.current = null;
        }, duration);
    };

    const handleQtyInputChange = value => {
        const sanitizedValue = value.replace(/[^0-9]/g, '');
        const nextQty = sanitizedValue === '' ? '' : Math.max(1, Number(sanitizedValue) || 1);

        setQty(nextQty);
        clearFieldError('quantity');
    };

    const handleQtyInputBlur = () => {
        if (qty === '' || Number(qty) <= 0) {
            setQty(1);
        }
    };

    const resetFormState = ({ preserveToast = false } = {}) => {
        setSelectedItem(null);
        setSelectedSize('');
        setSelectedSizeId(null);
        setImagePreviewVisible(false);
        setImagePreviewLoadFailed(false);
        setQty(1);
        setQtyMeters('');
        setPurchasePrice(0);
        setSellingPrice(0);
        setFieldErrors({});
        if (!preserveToast) {
            setSheetToast({
                visible: false,
                message: '',
                type: 'error',
            });
        }
    };

    const handleClearSelectedItem = () => {
        setSelectedItem(null);
        setSelectedSize('');
        setSelectedSizeId(null);
        setImagePreviewVisible(false);
        setImagePreviewLoadFailed(false);
        clearFieldError('item');
        clearFieldError('size');
    };

    useEffect(() => {
        if (visible) {
            setSheetToast({
                visible: false,
                message: '',
                type: 'error',
            });
            setFieldErrors({});
            setImagePreviewVisible(false);
            setImagePreviewLoadFailed(false);
            if (editData) {
                setSelectedItem(editData);
                setQty(editData.qty || 1);
                setQtyMeters(
                    editData.qty_meters !== undefined && editData.qty_meters !== null
                        ? `${editData.qty_meters}`
                        : '',
                );
                setSelectedSize(editData.size || '');
                setSelectedSizeId(editData.size_id || editData.sizeId || null);
                setPurchasePrice(editData.purchasePrice || editData.purchase_price || 0);
                setSellingPrice(editData.sellingPrice || editData.selling_price || 0);
            } else {
                setSelectedItem(null);
                setQty(1);
                setQtyMeters('');
                setSelectedSize('');
                setSelectedSizeId(null);
                setPurchasePrice(0);
                setSellingPrice(0);
            }
        }
    }, [visible, editData]);

    useEffect(() => {
        return () => {
            if (toastTimerRef.current) {
                clearTimeout(toastTimerRef.current);
            }
        };
    }, []);

    const handleItemSelected = (data) => {
        const nextItemId = getSelectedEntityId(data, type);
        const editingItemId = getSelectedEntityId(editData, type);
        const isAlreadyAdded = (selectedItems || []).some(item => {
            const existingItemId = getSelectedEntityId(item, type);
            return (
                existingItemId &&
                nextItemId &&
                String(existingItemId) === String(nextItemId) &&
                String(existingItemId) !== String(editingItemId)
            );
        });

        if (isAlreadyAdded) {
            showSheetToast('Selected');
            return;
        }

        setSelectedItem(data);
        setIsSearchModalVisible(false);
        if (data.purchasePrice) setPurchasePrice(data.purchasePrice);
        if (data.sellingPrice) setSellingPrice(data.sellingPrice);
        if (type === 'Readymade') {
            setSelectedSize('');
            setSelectedSizeId(null);
        }
        setQty(1);
        setQtyMeters('');
        clearFieldError('item');
        clearFieldError('quantity');
        clearFieldError('size');
    };

    const sanitizeDecimalInput = value =>
        value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');

    const validateForm = () => {
        const nextErrors = {};

        if (!selectedItem) {
            nextErrors.item = `Please select a ${itemLabelLower}`;
        }

        if (isMeterBasedMaterial) {
            if (!qtyMeters.trim() || numericQtyMeters <= 0) {
                nextErrors.quantity = 'Please enter quantity';
            }
        } else if (numericQty <= 0) {
            nextErrors.quantity = 'Please enter quantity';
        }

        if (type === 'Readymade' && !selectedSizeId) {
            nextErrors.size = 'Please select size';
        }

        if ((Number(purchasePrice) || 0) <= 0) {
            nextErrors.purchasePrice = 'Please enter valid purchase price';
        }

        if ((Number(sellingPrice) || 0) <= 0) {
            nextErrors.sellingPrice = 'Please enter valid selling price';
        }

        setFieldErrors(nextErrors);

        const firstError = Object.values(nextErrors)[0];
        if (firstError) {
            showSheetToast(firstError);
            return false;
        }

        return true;
    };

    const handleAddItemToPurchase = async () => {
        if (!validateForm()) {
            return;
        }

        if (hasDuplicateSelection) {
            showSheetToast('Selected');
            return;
        }

        try {
            const existingPurchases = await AsyncStorage.getItem('PURCHASE_ITEMS');
            let purchaseList = existingPurchases ? JSON.parse(existingPurchases) : [];

            const newPurchaseItem = {
                ...selectedItem,
                purchaseId: isEdit ? editData.purchaseId : Date.now(),
                item_type: type === 'Material' ? 'MATERIAL' : 'READYMADE',
                material_id:
                    type === 'Material'
                        ? selectedItem.material_id ||
                          selectedItem.materialId ||
                          selectedItem.id ||
                          null
                        : null,
                readymade_id:
                    type === 'Readymade'
                        ? selectedItem.readymade_id ||
                          selectedItem.readymadeId ||
                          selectedItem.id ||
                          null
                        : null,
                size_id: type === 'Readymade' ? selectedSizeId : null,
                qty: isMeterBasedMaterial ? numericQtyMeters : Number(qty) || 0,
                qty_meters: isMeterBasedMaterial ? numericQtyMeters : null,
                size: selectedSize,
                purchasePrice: purchasePrice,
                sellingPrice: sellingPrice,
                purchase_price: Number(purchasePrice) || 0,
                selling_price: Number(sellingPrice) || 0,
                totalPurchase: totalPurchase,
                totalSelling: totalSelling,
                total_purchase_value: totalPurchase,
                total_selling_value: totalSelling,
                addedAt: new Date().toISOString(),
                type: type
            };
            const storedPurchaseItem = { ...newPurchaseItem };
            delete storedPurchaseItem.__copySourceSnapshot;

            const addResult = await Promise.resolve(onAddItem(newPurchaseItem));

            if (addResult?.status === 'no_changes') {
                showSheetToast('No changes detected', 'warning');
                return;
            }

            if (addResult?.status === 'updated') {
                purchaseList = purchaseList.map(item =>
                    String(item?.purchaseId) ===
                    String(
                        newPurchaseItem?.__copySourceSnapshot?.purchaseId ||
                            editData?.purchaseId,
                    )
                        ? {
                              ...storedPurchaseItem,
                              purchaseId:
                                  newPurchaseItem?.__copySourceSnapshot?.purchaseId ||
                                  editData?.purchaseId,
                              ...(editData?.id ? { id: editData.id } : {}),
                          }
                        : item,
                );
            } else {
                purchaseList.push(storedPurchaseItem);
            }

            await AsyncStorage.setItem('PURCHASE_ITEMS', JSON.stringify(purchaseList));

            resetFormState({ preserveToast: true });

            showSheetToast(
                addResult?.status === 'updated' || isEdit
                    ? 'Item updated successfully'
                    : 'Item added successfully',
                'success',
            );

            if (onRefresh) onRefresh();

        } catch (error) {
            console.error("Save Error:", error);
            showSheetToast('Failed to save item');
        }
    };

    return (
        <>
        <Modal visible={visible} animationType="slide" transparent={true}>
            <AddChoosenModal
                visible={isSearchModalVisible}
                onClose={() => setIsSearchModalVisible(false)}
                onAdd={handleItemSelected}
                type={type}
                selectedItems={selectedItems}
                currentSelectedItem={selectedItem}
            />
            <SelectionBottomSheet
                visible={isSizeSheetVisible}
                onClose={() => setIsSizeSheetVisible(false)}
                title="Readymade Size"
                selectedValue={selectedSize}
                disableInactiveItems
                autoSelectCreated={false}
                onSelect={item => {
                    setSelectedSize(item.name);
                    setSelectedSizeId(item.id);
                    clearFieldError('size');
                    setIsSizeSheetVisible(false);
                }}
            />

            <View style={styles.modalOverlay}>
                {sheetToast.visible ? (
                    <View
                        pointerEvents="none"
                        style={[styles.sheetToastWrapper, { top: insets.top + 12 }]}
                    >
                        <View
                            style={[
                                styles.sheetToast,
                                sheetToast.type === 'success' && styles.sheetToastSuccess,
                                sheetToast.type === 'warning' && styles.sheetToastWarning,
                                sheetToast.type === 'error' && styles.sheetToastError,
                            ]}
                        >
                            <Text style={styles.sheetToastText} numberOfLines={2}>
                                {sheetToast.message}
                            </Text>
                        </View>
                    </View>
                ) : null}
                <View style={styles.sheetContainer}>
                    <View style={styles.sheetHandle} />

                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>Add {type} Item</Text>
                        <TouchableOpacity onPress={onClose}>
                            <X size={26} color={Colors.textPrimary} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

                        {/* <TouchableOpacity
                            onPress={() => setIsSearchModalVisible(true)}
                            style={styles.searchContainer}
                        >
                            <Search size={20} color={Colors.textSecondary} style={styles.searchIcon} />
                            <Text style={styles.searchPlaceholder}>
                                {selectedItem ? `Change ${type}...` : `Search ${type} name or SKU`}
                            </Text>
                        </TouchableOpacity> */}

                        <View
                            style={[
                                styles.customerCleanArea,
                                fieldErrors.item && styles.errorOutline,
                                selectedItem && styles.customerCleanAreaSelected,
                            ]}
                        >
                            {selectedItem ? (
                                <View style={styles.selectedItemInlineCard}>
                                    {selectedItemImage ? (
                                        <TouchableOpacity
                                            onPress={() => {
                                                setImagePreviewLoadFailed(false);
                                                setImagePreviewVisible(true);
                                            }}
                                            activeOpacity={0.9}
                                        >
                                            <Image source={{ uri: selectedItemImage }} style={styles.itemImage} />
                                        </TouchableOpacity>
                                    ) : (
                                        <View
                                            style={[
                                                styles.itemImage,
                                                styles.itemImagePlaceholder,
                                            ]}
                                        >
                                            <Shirt size={28} color={Colors.primary} />
                                        </View>
                                    )}

                                    <TouchableOpacity
                                        style={styles.selectedItemInlineContent}
                                        onPress={() => setIsSearchModalVisible(true)}
                                        activeOpacity={0.85}
                                    >
                                        <Text
                                            style={[styles.itemTitle, { paddingRight: 8 }]}
                                            numberOfLines={2}
                                        >
                                            {selectedItem.name}
                                        </Text>
                                        <Text style={styles.itemSku} numberOfLines={1}>
                                            SKU : {selectedItem.sku || 'N/A'}
                                        </Text>

                                        <View style={styles.selectedItemMetaRow}>
                                            <View style={styles.typeBadgeSmall}>
                                                <Text
                                                    style={styles.typeBadgeTextSmall}
                                                    numberOfLines={1}
                                                >
                                                    {selectedItem.materialType ||
                                                        selectedItem.category ||
                                                        selectedItem.type ||
                                                        selectedItem.name ||
                                                        type}
                                                </Text>
                                            </View>
                                            <View
                                                style={[
                                                    styles.unitBadgeSmall,
                                                    styles.selectedItemUnitBadge,
                                                ]}
                                            >
                                                <Ruler
                                                    size={12}
                                                    color={Colors.textSecondary}
                                                />
                                                <Text style={styles.unitTextSmall}>
                                                    {selectedItem.unit || 'Meters'}
                                                </Text>
                                            </View>
                                        </View>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={styles.selectedItemInlineRemoveBtn}
                                        onPress={handleClearSelectedItem}
                                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                    >
                                        <X size={20} color={Colors.textPrimary} />
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <TouchableOpacity
                                    style={styles.selectItemPlaceholderRow}
                                    onPress={() => setIsSearchModalVisible(true)}
                                >
                                    <View
                                        style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            gap: 16,
                                        }}
                                    >
                                        <View style={styles.customerAvatarClean}>
                                            <Shirt size={20} color={Colors.textSecondary} />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text
                                                style={[
                                                    styles.customerNameMain,
                                                    {
                                                        color: '#94A3B8',
                                                        fontFamily: 'Inter-Regular',
                                                    },
                                                ]}
                                            >
                                                {`Select ${type}`}
                                            </Text>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            )}
                        </View>
                        {fieldErrors.item ? (
                            <Text style={styles.errorText}>{fieldErrors.item}</Text>
                        ) : null}

                        {type == 'Readymade' && (
                            <View style={{ marginBottom: 20 }}>
                                <Text style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 8, color: '#333' }}>
                                    Size <Text style={styles.requiredAsterisk}>*</Text>
                                </Text>

                                {/* Dropdown Selector Field */}
                                <TouchableOpacity
                                    onPress={() => {
                                        if (!selectedItem) {
                                            setFieldErrors(prev => ({
                                                ...prev,
                                                item: 'Please select a readymade',
                                            }));
                                            showSheetToast('Please select a readymade');
                                            return;
                                        }
                                        setIsSizeSheetVisible(true);
                                    }}
                                    style={{
                                        padding: 15,
                                        backgroundColor: '#fff',
                                        borderRadius: 10,
                                        borderWidth: 1,
                                        borderColor: fieldErrors.size ? '#EF4444' : '#ddd',
                                        flexDirection: 'row',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                    }}
                                >
                                    <Text style={{ fontSize: 16, color: selectedSize ? '#000' : '#888' }}>
                                        {selectedSize || "Choose Size"}
                                    </Text>
                                    <Text style={{ color: '#888', fontSize: 12 }}>▼</Text>
                                </TouchableOpacity>
                                {fieldErrors.size ? (
                                    <Text style={styles.errorText}>{fieldErrors.size}</Text>
                                ) : null}

                            </View>
                        )}


                        {/* Purchase Price Section */}
                        <View style={styles.priceSectionCard}>
                            <Text style={styles.sectionTitle}>Purchase Price</Text>
                            <View style={styles.row}>
                                <View style={styles.inputColumn}>
                                    <Text style={styles.inputLabel}>
                                        QTY. ({quantityUnitLabel}) <Text style={styles.requiredAsterisk}>*</Text>
                                    </Text>
                                    {isMeterBasedMaterial ? (
                                        <View
                                            style={[
                                                styles.priceInputRow,
                                                fieldErrors.quantity && styles.errorOutline,
                                            ]}
                                        >
                                            <TextInput
                                                style={styles.priceInput}
                                                keyboardType="decimal-pad"
                                                value={qtyMeters}
                                                onChangeText={val => {
                                                    setQtyMeters(sanitizeDecimalInput(val));
                                                    clearFieldError('quantity');
                                                }}
                                                placeholder="0"
                                                placeholderTextColor="#000000"
                                            />
                                        </View>
                                    ) : (
                                        <View
                                            style={[
                                                styles.counterRow,
                                                fieldErrors.quantity && styles.errorOutline,
                                            ]}
                                        >
                                            <TouchableOpacity
                                                onPress={() => {
                                                    setQty(Math.max(1, (Number(qty) || 1) - 1));
                                                    clearFieldError('quantity');
                                                }}
                                                style={styles.stepBtn}
                                            >
                                                <Minus size={20} color={Colors.textPrimary} strokeWidth={3} />
                                            </TouchableOpacity>
                                            <View style={styles.qtyBox}>
                                                <TextInput
                                                    style={styles.qtyInput}
                                                    value={qty === '' ? '' : String(qty)}
                                                    onChangeText={handleQtyInputChange}
                                                    onBlur={handleQtyInputBlur}
                                                    keyboardType="number-pad"
                                                    placeholder="1"
                                                    placeholderTextColor="#94A3B8"
                                                    textAlign="center"
                                                    maxLength={4}
                                                />
                                            </View>
                                            <TouchableOpacity
                                                onPress={() => {
                                                    setQty((Number(qty) || 0) + 1);
                                                    clearFieldError('quantity');
                                                }}
                                                style={styles.stepBtn}
                                            >
                                                <Plus size={20} color={Colors.textPrimary} strokeWidth={3} />
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                    {fieldErrors.quantity ? (
                                        <Text style={styles.errorText}>{fieldErrors.quantity}</Text>
                                    ) : null}
                                </View>

                                <View style={[styles.inputColumn, { marginLeft: 15 }]}>
                                    <Text style={styles.inputLabel}>
                                        {pricePerUnitLabel}{' '}
                                        <Text style={styles.requiredAsterisk}>*</Text>
                                    </Text>
                                    <View
                                        style={[
                                            styles.priceInputRow,
                                            fieldErrors.purchasePrice && styles.errorOutline,
                                        ]}
                                    >
                                        <Text style={styles.currencySymbol}>₹</Text>
                                        <TextInput
                                            style={[styles.priceInput, { textAlign: 'right' }]}
                                            keyboardType="numeric"
                                            value={purchasePrice === 0 ? '' : purchasePrice.toString()}
                                            onChangeText={(val) => {
                                                setPurchasePrice(val.replace(/[^0-9]/g, ''));
                                                clearFieldError('purchasePrice');
                                            }}
                                            placeholder="0"
                                            placeholderTextColor="#000000"
                                        />
                                    </View>
                                    {fieldErrors.purchasePrice ? (
                                        <Text style={styles.errorText}>{fieldErrors.purchasePrice}</Text>
                                    ) : null}
                                </View>
                            </View>

                            <View style={styles.totalRow}>
                                <Text style={styles.totalLabel}>Total Value</Text>
                                <Text style={styles.totalValue}>₹{totalPurchase.toLocaleString()}</Text>
                            </View>
                        </View>

                        {/* Selling Price Section */}
                        <View style={styles.priceSectionCard}>
                            <View style={styles.inputColumnFull}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Text style={[styles.inputLabel, { color: Colors.textPrimary, marginBottom: 0 }]}>
                                        Selling Price <Text style={styles.requiredAsterisk}>*</Text>
                                    </Text>

                                    <Text style={styles.inputLabel}>{sellingPricePerUnitLabel}</Text>
                                </View>
                                <View
                                    style={[
                                        styles.priceInputRow,
                                        { marginTop: 10 },
                                        fieldErrors.sellingPrice && styles.errorOutline,
                                    ]}
                                >
                                    <Text style={styles.currencySymbol}>₹</Text>
                                    <TextInput
                                        style={styles.priceInput}
                                        keyboardType="numeric"
                                        value={sellingPrice === 0 ? '' : sellingPrice.toString()}
                                        onChangeText={(val) => {
                                            setSellingPrice(val.replace(/[^0-9]/g, ''));
                                            clearFieldError('sellingPrice');
                                        }}
                                        placeholder="0"
                                        placeholderTextColor="#000000"
                                    />
                                </View>
                                {fieldErrors.sellingPrice ? (
                                    <Text style={styles.errorText}>{fieldErrors.sellingPrice}</Text>
                                ) : null}
                            </View>
                        </View>

                    </ScrollView>

                    {/* Footer Actions */}
                    <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 36) + 15 }]}>
                        <TouchableOpacity style={styles.closeActionBtn} onPress={onClose}>
                            <Text style={styles.closeActionText}>Close</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.addActionBtn, !selectedItem && { opacity: 0.6 }]}
                            onPress={handleAddItemToPurchase}
                        >
                            <Text style={styles.addActionText}>{isEdit ? 'Update' : 'Add'}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
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
                    {selectedItemImage && !imagePreviewLoadFailed ? (
                        <Image
                            source={{ uri: selectedItemImage }}
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
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
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
        backgroundColor: '#EF4444',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 8,
    },
    sheetToastSuccess: {
        backgroundColor: '#059669',
    },
    sheetToastWarning: {
        backgroundColor: '#D97706',
    },
    sheetToastError: {
        backgroundColor: '#EF4444',
    },
    sheetToastText: {
        color: '#FFFFFF',
        fontFamily: 'Inter-Medium',
        fontSize: 14,
    },
    sheetContainer: { backgroundColor: '#FFFFFF', height: '92%', borderTopLeftRadius: 30, borderTopRightRadius: 30 },
    sheetHeader: { alignItems: 'center', paddingVertical: 15 },
    sheetHandle: { width: 50, height: 5, backgroundColor: '#E0E0E0', borderRadius: 10, marginBottom: 15 },
    sheetTitle: { fontFamily: 'Inter-Bold', fontSize: 20, color: '#1a1a1a' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
    headerTitle: { fontFamily: 'Inter-Bold', fontSize: 18, color: Colors.textPrimary },
    content: { padding: 20, paddingBottom: 40 },

    // Search Bar UI
    searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F9FA', borderWidth: 1, borderColor: '#EEE', borderRadius: 12, paddingHorizontal: 15, height: 54, marginBottom: 20 },
    searchIcon: { marginRight: 10 },
    searchPlaceholder: { flex: 1, fontSize: 15, fontFamily: 'Inter-Medium', color: Colors.textSecondary },

    requiredAsterisk: { color: '#EF4444' },

    // Selected Card
    selectedItemCard: { flexDirection: 'row', backgroundColor: '#F9FAFB', borderRadius: 16, padding: 16, alignItems: 'flex-start', marginBottom: 24, borderWidth: 1, borderColor: '#F1F5F9' },
    emptyCard: { padding: 20, backgroundColor: '#FAFAFA', borderRadius: 16, alignItems: 'center', marginBottom: 24, borderStyle: 'dashed', borderWidth: 1, borderColor: '#CCC' },
    emptyText: { fontFamily: 'Inter-Medium', color: Colors.textSecondary },
    itemImage: { width: 85, height: 100, borderRadius: 12 },
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
    itemInfo: { flex: 1, marginLeft: 15 },
    itemTitle: { fontFamily: 'Inter-Bold', fontSize: 16, color: Colors.textPrimary, lineHeight: 22 },
    itemSku: { fontFamily: 'Inter-Medium', fontSize: 13, color: '#6B7280', marginTop: 2 },
    typeBadgeSmall: { backgroundColor: '#E5E7EB', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    typeBadgeTextSmall: { fontFamily: 'Inter-Medium', fontSize: 12, color: '#4B5563' },
    unitBadgeSmall: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E5E7EB', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    unitTextSmall: { fontFamily: 'Inter-Medium', fontSize: 12, color: '#4B5563', marginLeft: 4 },
    removeBtn: { position: 'absolute', top: 12, right: 12, padding: 4 },

    // Price Card
    priceSectionCard: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#EEE', borderRadius: 20, padding: 18, marginBottom: 20 },
    sectionTitle: { fontFamily: 'Inter-Bold', fontSize: 15, color: Colors.textPrimary, marginBottom: 15, borderBottomWidth: 1, borderBottomColor: '#F8F9FA', paddingBottom: 10 },
    row: { flexDirection: 'row' },
    inputColumn: { flex: 1 },
    inputColumnFull: { width: '100%' },
    inputLabel: { fontFamily: 'Inter-Bold', fontSize: 12, color: Colors.textSecondary, marginBottom: 10 },
    counterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F8F9FA', borderRadius: 10, padding: 4 },
    stepBtn: { width: 38, height: 38, backgroundColor: '#FFF', borderRadius: 8, justifyContent: 'center', alignItems: 'center', elevation: 1 },
    qtyBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    qtyInput: {
        minWidth: 56,
        paddingVertical: 0,
        fontFamily: 'Inter-Bold',
        fontSize: 16,
        color: Colors.textPrimary,
    },
    priceInputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: 10, height: 48, paddingHorizontal: 15, borderWidth: 1, borderColor: Colors.border },
    errorOutline: { borderColor: '#EF4444' },
    errorText: { marginTop: 6, fontFamily: 'Inter-Medium', fontSize: 12, color: '#EF4444' },
    currencySymbol: { fontFamily: 'Inter-Bold', fontSize: 16, marginRight: 5, color: Colors.textPrimary },
    priceInput: { flex: 1, fontFamily: 'Inter-Bold', fontSize: 16, color: Colors.textPrimary },

    totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 18, paddingTop: 15, borderTopWidth: 1, borderTopColor: '#F8F9FA' },
    totalLabel: { fontFamily: 'Inter-Medium', fontSize: 14, color: Colors.textSecondary },
    totalValue: { fontFamily: 'Inter-Bold', fontSize: 20, color: Colors.textPrimary },

    // Footer
    footer: { flexDirection: 'row', paddingHorizontal: 20, paddingTop: 15, borderTopWidth: 1, borderTopColor: '#F0F0F0', gap: 12 },
    closeActionBtn: { flex: 1, height: 50, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12 },
    closeActionText: { fontFamily: 'Inter-Bold', fontSize: 16, color: Colors.textPrimary },
    addActionBtn: { flex: 1.4, height: 50, borderRadius: 12, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
    addActionText: { fontFamily: 'Inter-Bold', fontSize: 16, color: '#FFF' },
    customerCleanArea: {
        paddingVertical: 16,
        paddingHorizontal: 12,
        borderRadius: 16,
        backgroundColor: Colors.white,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        marginBottom: 15,
        ...Shadow.subtle,
    },
    customerCleanAreaSelected: {
        paddingVertical: 12,
        paddingHorizontal: 12,
    },
    customerAvatarClean: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#F8FAFC',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#F1F5F9',
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
    selectItemPlaceholderRow: {
        width: '100%',
    },
    selectedItemInlineCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        width: '100%',
    },
    selectedItemInlineContent: {
        flex: 1,
        marginLeft: 15,
        paddingRight: 8,
    },
    selectedItemMetaRow: {
        flexDirection: 'row',
        marginTop: 8,
        flexWrap: 'wrap',
    },
    selectedItemUnitBadge: {
        marginLeft: 8,
    },
    selectedItemInlineRemoveBtn: {
        padding: 4,
        marginLeft: 8,
    },
    itemImagePlaceholder: {
        backgroundColor: '#F3F0FF',
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default AddMaterialItemModal;
