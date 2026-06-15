import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Dimensions, Alert, Modal, ActivityIndicator } from 'react-native';
import { Colors, Spacing, Shadow, Typography } from '../constants/theme';
import {
    ChevronLeft, Edit2, Trash2, PlayCircle, StopCircle, User, PenTool, X, Plus,
    Smartphone, Shirt, Layers, Tag, Calendar, Mic, CheckCircle2, Info, MapPin,
    ChevronDown, ChevronRight, Ruler, Scissors, Palette, Sparkles, Box, Clock,
    Pause, Play
} from 'lucide-react-native';
import { useData } from '../context/DataContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { normalizeItems } from '../services/pdfService';
import {
    getExplicitQuantityMaterialSections,
    formatQuantityOrdinalLabel,
    getItemQuantitySections,
} from '../utils/orderQuantitySections';
import AlertModal from '../components/AlertModal';
import BottomConfirmationSheet from '../components/BottomConfirmationSheet';
import { formatDate } from '../utils/dateUtils';
import Sound from 'react-native-sound';
import ImageView from 'react-native-image-viewing';
import { useDispatch, useSelector } from 'react-redux';
import { getOrderByIdAction, getOrdersListAction } from '../store/salesOrderSlice';
import { useFocusEffect } from '@react-navigation/native';

const { width, height: SCREEN_HEIGHT } = Dimensions.get('window');

const formatTime = (seconds) => {
    const s = Math.floor(seconds || 0);
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

const hasValue = (value) =>
    value !== null &&
    value !== undefined &&
    `${value}`.trim() !== '';

const isCancelledStatusValue = value =>
    String(value || '').trim().toLowerCase() === 'cancelled';

const normalizeUnit = (unit) => {
    const normalizedUnit = `${unit || ''}`.trim().toLowerCase();

    if (['m', 'meter', 'meters', 'metre', 'metres'].includes(normalizedUnit)) {
        return 'm';
    }

    if (['pc', 'pcs', 'piece', 'pieces'].includes(normalizedUnit)) {
        return 'pcs';
    }

    return null;
};

const getMeterFlagValue = (value) => {
    if (value === true || value === 1) {
        return true;
    }

    if (value === false || value === 0) {
        return false;
    }

    const normalizedValue = `${value ?? ''}`.trim().toLowerCase();

    if (['true', '1', 'yes'].includes(normalizedValue)) {
        return true;
    }

    if (['false', '0', 'no'].includes(normalizedValue)) {
        return false;
    }

    return null;
};

const getMaterialQuantityText = (material) => {
    const value = [
        material?.displayQuantity,
        material?.qty,
        material?.quantity,
        material?.qnt,
        material?.count,
    ].find(hasValue);

    return hasValue(value) ? `${value}`.trim() : '0';
};

const getMaterialUnitText = (material) => (
    normalizeUnit(
        material?.unit ||
        material?.stock_unit ||
        material?.uom ||
        material?.material?.unit ||
        material?.material?.stock_unit ||
        material?.material?.uom
    ) ||
    (() => {
        const meterFlag = [
            material?.is_meter,
            material?.isMeter,
            material?.material?.is_meter,
            material?.material?.isMeter,
        ].map(getMeterFlagValue).find(flag => flag !== null);

        if (meterFlag === true) {
            return 'm';
        }

        if (meterFlag === false) {
            return 'pcs';
        }

        return material?.type === 'Material' ? 'm' : 'pcs';
    })()
);

const Waveform = ({
    count = 25,
    activeCount = count,
    activeColor = '#6366f1',
    inactiveColor = 'rgba(99, 102, 241, 0.15)',
    isLively = false
}) => {
    const playbackHeights = [14, 22, 10, 32, 18, 14, 38, 20, 26, 12, 19, 14, 34, 17, 12, 30, 14, 28, 16, 24, 14, 20, 28, 16, 12, 18, 24, 14, 32];

    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3.2, justifyContent: 'center' }}>
            {[...Array(count)].map((_, i) => {
                const isActive = i < activeCount;
                const h = playbackHeights[i % playbackHeights.length] || 12;

                return (
                    <View
                        key={i}
                        style={{
                            width: 2.5,
                            height: h,
                            backgroundColor: isActive ? activeColor : inactiveColor,
                            borderRadius: 1.5,
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

const AudioPlayer = ({ uri, duration, onShowAlert }) => {
    const soundRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [totalDuration, setTotalDuration] = useState(duration || 0);
    const [currentTime, setCurrentTime] = useState(0);

    useEffect(() => {
        if (duration > 0) setTotalDuration(duration);
    }, [duration]);

    useEffect(() => {
        return () => {
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
                        const d = totalDuration || soundRef.current.getDuration();
                        if (d > 0) {
                            if (totalDuration <= 0) setTotalDuration(d);
                            setProgress(Math.min(seconds / d, 1));
                        }
                    }
                });
            }, 150);
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
                        }
                    });
                }
            } else {
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
                    count={34}
                    activeCount={Math.floor(progress * 34)}
                    activeColor="#6366F1"
                    inactiveColor="rgba(99, 102, 241, 0.15)"
                    isLively={isPlaying}
                />
            </View>

            <View style={{ width: 45, borderLeftWidth: 1, borderLeftColor: 'rgba(30, 41, 59, 0.1)', paddingLeft: 8 }}>
                <Text style={{ fontSize: 13, fontFamily: 'Inter-SemiBold', color: '#6366F1' }}>
                    {formatTime(currentTime)}
                </Text>
            </View>
        </View>
    );
};

const ItemDetailScreen = ({ route, navigation }) => {
    const { item, orderId, itemIndex } = route.params;
    const { orders } = useData();
    const insets = useSafeAreaInsets();
    const dispatch = useDispatch();
    const apiOrders = useSelector(state => state.salesOrder.ordersList);
    const listLoading = useSelector(state => state.salesOrder.listLoading);
    const currentOrder = useSelector(state => state.salesOrder.currentOrder);

    const detailedOrder =
        currentOrder && String(currentOrder.id) === String(orderId)
            ? currentOrder
            : null;
    const contextOrder = orders.find(o => String(o.id) === String(orderId));
    const apiOrder = apiOrders.find(o => String(o.id) === String(orderId));
    const order = detailedOrder || contextOrder || apiOrder;

    useEffect(() => {
        if (!order && !listLoading && apiOrders.length === 0) {
            dispatch(getOrdersListAction()).catch(() => { });
        }
    }, [apiOrders.length, dispatch, listLoading, order]);

    useFocusEffect(
        React.useCallback(() => {
            dispatch(getOrderByIdAction(orderId)).catch(() => { });

            return undefined;
        }, [dispatch, orderId]),
    );

    const isTailoring = order?.orderCategory !== 'Sales';
    const rawItems = order
        ? normalizeItems(order).map(orderItem => {
            if (!isTailoring) {
                return orderItem;
            }

            const quantitySections = Array.isArray(orderItem?.quantitySections) && orderItem.quantitySections.length > 0
                ? orderItem.quantitySections
                : getItemQuantitySections(orderItem);
            const activeQuantitySections = quantitySections.filter(
                section => !isCancelledStatusValue(section?.status),
            );
            const totalAmount = activeQuantitySections.reduce(
                (sum, section) => sum + (Number(section.total) || 0),
                0,
            );
            const activeQuantityCount = activeQuantitySections.length;
            const resolvedQuantity =
                activeQuantityCount ||
                Number(orderItem.qty || orderItem.quantity || 0) ||
                0;

            return {
                ...orderItem,
                qty: resolvedQuantity,
                quantity: resolvedQuantity,
                amount: totalAmount,
                quantitySections,
                splits: quantitySections,
                totalCost: totalAmount,
            };
        })
        : [];
    const currentItemFromOrder = (itemIndex !== undefined && rawItems[itemIndex]) ? rawItems[itemIndex] : null;
    const hasExplicitQuantityMaterials = (candidate) => (
        Array.isArray(candidate?.rawQuantities) &&
        candidate.rawQuantities.some(quantity => Array.isArray(quantity?.items) && quantity.items.length > 0)
    );
    const currentItem = hasExplicitQuantityMaterials(currentItemFromOrder)
        ? currentItemFromOrder
        : (hasExplicitQuantityMaterials(item) ? item : (currentItemFromOrder || item));

    // State for audio
    const [playingUri, setPlayingUri] = useState(null);
    const soundRef = useRef(null);
    const [previewImageUri, setPreviewImageUri] = useState(null);

    // Alert State
    const [alertVisible, setAlertVisible] = useState(false);
    const [alertConfig, setAlertConfig] = useState({ title: '', message: '' });

    // Handle Audio note
    const handlePlayAudio = async (uri) => {
        try {
            if (playingUri === uri) {
                if (soundRef.current) {
                    soundRef.current.stop();
                    soundRef.current.release();
                    soundRef.current = null;
                }
                setPlayingUri(null);
                return;
            }

            if (soundRef.current) {
                soundRef.current.stop();
                soundRef.current.release();
                soundRef.current = null;
            }

            Sound.setCategory('Playback');
            const sound = new Sound(uri, '', (error) => {
                if (error) {
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
                    }
                });
            });
        } catch (error) {
            setAlertConfig({ title: 'Error', message: 'Could not play audio note' });
            setAlertVisible(true);
        }
    };

    useEffect(() => {
        return () => {
            if (soundRef.current) {
                soundRef.current.release();
            }
        };
    }, []);

    // Safety check
    if (!order) {
        if (listLoading) {
            return (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                    <Text style={[Typography.bodyMedium, { marginTop: 12 }]}>Loading item details...</Text>
                </View>
            );
        }

        return (
            <View style={styles.center}>
                <Text style={Typography.bodyMedium}>Order not found</Text>
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 20, padding: 12, backgroundColor: Colors.primary, borderRadius: 8 }}>
                    <Text style={{ color: Colors.white }}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const handleEditItem = () => {
        navigation.navigate('CreateOrderFlow', { editOrderId: orderId, editItemIndex: itemIndex });
    };

    // Helper for Section Labels
    const SectionHeader = ({ num, title }) => (
        <Text style={styles.sectionTitle}>{title}</Text>
    );

    // Card for individual measurements or stitching options
    const DetailCard = ({ icon: Icon, label, value }) => {
        // Split value by " - " to handle sub-categories if present
        let displayValue = value;
        let subLabel = null;

        if (value && String(value).includes(' - ')) {
            const parts = value.split(' - ');
            displayValue = parts.pop(); // The last part is the actual selection
            subLabel = parts.join(' / '); // The middle parts are sub-categories
        }

        return (
            <View style={styles.detailCard}>
                <View style={styles.detailCardIcon}>
                    <Icon size={20} color="#94A3B8" />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.detailCardLabel}>{label}</Text>
                    {subLabel && <Text style={styles.detailCardSubLabel}>{subLabel}</Text>}
                    {displayValue && <Text style={styles.detailCardValue}>{displayValue}</Text>}
                </View>
            </View>
        );
    };

    if (!isTailoring) {
        // Fallback or legacy view for Sales orders if needed
        return (
            <View style={styles.container}>
                <View style={[styles.header, { paddingTop: insets.top }]}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <ChevronLeft size={24} color={Colors.textPrimary} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{currentItem.name}</Text>
                    <View style={{ width: 40 }} />
                </View>
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <Text style={{ textAlign: 'center', marginTop: 40, color: Colors.textSecondary }}>Sales Item Detail view goes here.</Text>
                </ScrollView>
            </View>
        );
    }

    const splits = Array.isArray(currentItem?.quantitySections) && currentItem.quantitySections.length > 0
        ? currentItem.quantitySections
        : getItemQuantitySections(currentItem);
    const activeSplits = splits.filter(split => !isCancelledStatusValue(split?.status));
    const materialSplits = getExplicitQuantityMaterialSections(currentItem).filter(
        split => !isCancelledStatusValue(split?.status),
    );
    const serviceSplits = activeSplits.filter(split => (split.services || []).length > 0);

    // Separate measurements and stitching options (similar to OrderDetailScreen logic)
    const measurements = currentItem.measurements || {};
    const numericMeasurements = {};
    const stitchingOptions = {};

    Object.entries(measurements).forEach(([key, val]) => {
        // Simple numeric check: ignore empty strings, check if Number() works
        if (val && String(val).trim() !== '' && !isNaN(Number(val))) {
            numericMeasurements[key] = val;
        } else if (val && String(val).trim() !== '') {
            stitchingOptions[key] = val;
        }
    });

    return (
        <View style={styles.container}>
            {/* Main Header */}
            <View style={[styles.header, { paddingTop: insets.top + 8, paddingBottom: 16 }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <ChevronLeft size={24} color={Colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Order No : #{order.billNo}</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                {/* Top Identity Card */}
                <View style={[styles.topCard]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <View>
                            <Text style={styles.customerName}>{order.customerName}</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                                <Shirt size={13} color="#94A3B8" />
                                <Text style={styles.outfitType}>{currentItem.name}</Text>
                            </View>
                            <View style={styles.qtyBadge}>
                                <Text style={styles.qtyText}>Qty: {currentItem.qty}</Text>
                            </View>
                        </View>
                        <Text style={styles.topPrice}>₹{currentItem.amount?.toLocaleString()}</Text>
                    </View>
                </View>

                {/* 1. OUTFIT DETAILS */}
                <SectionHeader num="1" title="OUTFIT DETAILS" />
                <View style={styles.gridCard}>
                    <View style={styles.gridRow}>
                        <Text style={styles.gridLabel}>Section</Text>
                        <Text style={styles.gridValue}>{currentItem.section || '—'}</Text>
                    </View>
                    <View style={styles.gridRow}>
                        <Text style={styles.gridLabel}>Order Type</Text>
                        <Text style={styles.gridValue}>{currentItem.orderType || 'Stitching'}</Text>
                    </View>
                    <View style={styles.gridRow}>
                        <Text style={styles.gridLabel}>Measurement Dress Given</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            {currentItem.measurementDressGiven === 'Yes' && <CheckCircle2 size={16} color={Colors.success} />}
                            <Text style={styles.gridValue}>{currentItem.measurementDressGiven || 'No'}</Text>
                        </View>
                    </View>
                    <View style={styles.gridRow}>
                        <Text style={styles.gridLabel}>Order Urgency</Text>
                        <Text style={styles.gridValue}>{currentItem.urgency || 'Normal'}</Text>
                    </View>
                    {/* <View style={styles.gridRow}>
                        <Text style={styles.gridLabel}>Trial Date</Text>
                        {currentItem.trialDate ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Calendar size={14} color="#111827" />
                                <Text style={[styles.gridValue, { color: '#111827' }]}>{formatDate(currentItem.trialDate)}</Text>
                            </View>
                        ) : (
                            <Text style={styles.gridValue}>—</Text>
                        )}
                    </View>
                    <View style={[styles.gridRow, { borderBottomWidth: 0 }]}>
                        <Text style={styles.gridLabel}>Delivery Date</Text>
                        {currentItem.deliveryDate ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Calendar size={14} color="#111827" />
                                <Text style={[styles.gridValue, { color: '#111827' }]}>{formatDate(currentItem.deliveryDate)}</Text>
                            </View>
                        ) : (
                            <Text style={styles.gridValue}>—</Text>
                        )}
                    </View> */}
                </View>

                {/* 2. STITCHING / ALTERATION */}
                {Object.keys(stitchingOptions).length > 0 && (
                    <>
                        <SectionHeader num="2" title={currentItem.orderType === 'Alteration' ? "ALTERATION" : "STITCHING"} />
                        <View style={{ gap: 12, marginBottom: 24 }}>
                            {Object.entries(stitchingOptions).map(([key, val]) => (
                                <DetailCard
                                    key={key}
                                    icon={Palette}
                                    label={key.replace(/([A-Z])/g, ' $1').trim()}
                                    value={String(val)}
                                />
                            ))}
                        </View>
                    </>
                )}

                {/* 3. MATERIALS */}
                {materialSplits.length > 0 && (
                    <>
                        <SectionHeader num="3" title="MATERIALS" />
                        <View style={{ gap: 16, marginBottom: 24 }}>
                            {materialSplits.map((split, splitIndex) => {
                                const quantityLabel = split.quantity_id ?? split.quantityId ?? splitIndex + 1;
                                const materials = split.materials || [];

                                return (
                                    <View key={split.key || `${split.id}-${splitIndex}`} style={styles.serviceGroup}>
                                        <View style={styles.serviceHeader}>
                                            <Text style={styles.serviceOutfitLabel}>QUANTITY ID {quantityLabel}</Text>
                                            <View style={styles.serviceHeaderTopRow}>
                                                <View style={styles.serviceHeaderInfo}>
                                                    <Text style={styles.serviceOutfitName}>{currentItem.name}</Text>
                                                    <View style={styles.materialSplitMeta}>
                                                        <Text style={styles.materialSplitMetaText}>
                                                            Trial Date: {split.trialDate ? formatDate(split.trialDate) : '—'}
                                                        </Text>
                                                        <Text style={styles.materialSplitMetaText}>
                                                            Delivery Date: {split.deliveryDate ? formatDate(split.deliveryDate) : '—'}
                                                        </Text>
                                                    </View>
                                                </View>
                                                <View style={styles.serviceBadge}>
                                                    <Text style={styles.serviceBadgeText}>Qty {quantityLabel}</Text>
                                                </View>
                                            </View>
                                        </View>

                                        <View style={{ padding: 12, gap: 12 }}>
                                            {materials.map((mat, materialIndex) => (
                                                <View key={mat.key || `${split.id}-material-${materialIndex}`} style={styles.materialCardPremium}>
                                                    <View style={{ flexDirection: 'row', gap: 12 }}>
                                                        <View style={styles.materialThumbRound}>
                                                            {(mat.photo || mat.image) ? (
                                                                <Image source={{ uri: mat.photo || mat.image }} style={styles.materialImg} />
                                                            ) : (
                                                                <Layers size={22} color="#CBD5E1" />
                                                            )}
                                                        </View>
                                                        <View style={{ flex: 1 }}>
                                                            <Text style={styles.materialNameMain} numberOfLines={1}>{mat.name}</Text>
                                                            <Text style={styles.materialSkuSub}>SKU : {mat.material?.sku_code || '---'}</Text>
                                                            <View style={styles.materialBadgeSmall}>
                                                                <Text style={styles.materialBadgeTextSmall}>{mat.category || mat.materialType || 'Fabric'}</Text>
                                                            </View>
                                                        </View>
                                                    </View>
                                                    <View style={styles.materialDivider} />
                                                    <View style={styles.materialBottomRow}>
                                                        <Text style={styles.materialQtyRate}>
                                                            {getMaterialQuantityText(mat)}{getMaterialUnitText(mat)} x ₹{(mat.sellingPrice || mat.rate || 0).toLocaleString()}
                                                        </Text>
                                                        <Text style={styles.materialTotalAmt}>
                                                            ₹{(mat.totalCost || mat.amount || 0).toLocaleString()}
                                                        </Text>
                                                    </View>
                                                </View>
                                            ))}
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    </>
                )}

                {/* 3. QUANTITY BREAKDOWN */}
                {false && splits.length > 0 && (
                    <>
                        <SectionHeader num="3" title="QUANTITY BREAKDOWN" />
                        <View style={{ gap: 12, marginBottom: 24 }}>
                            {splits.map((split, sIdx) => {
                                const ordinal = formatQuantityOrdinalLabel(sIdx);
                                const materials = split.materials || [];
                                const services = split.services || [];

                                return (
                                    <View key={split.key || `${split.id}-${sIdx}`} style={styles.quantitySectionCard}>
                                        <View style={styles.quantitySectionHeader}>
                                            <View style={{ flex: 1, marginRight: 12 }}>
                                                <Text style={styles.quantitySectionEyebrow}>
                                                    QUANTITY ID {split.quantity_id ?? split.quantityId ?? sIdx + 1}
                                                </Text>
                                                <Text style={styles.quantitySectionTitle}>{currentItem.name}</Text>
                                            </View>
                                            <View style={styles.serviceBadge}>
                                                <Text style={styles.serviceBadgeText}>{ordinal} Qty</Text>
                                            </View>
                                        </View>

                                        <View style={styles.quantityMetaRow}>
                                            <Text style={styles.quantityMetaText}>Status: {split.status || 'Yet to Start'}</Text>
                                            <Text style={styles.quantityMetaText}>Trial: {split.trialDate ? formatDate(split.trialDate) : '—'}</Text>
                                            <Text style={styles.quantityMetaText}>Delivery: {split.deliveryDate ? formatDate(split.deliveryDate) : '—'}</Text>
                                        </View>

                                        <Text style={styles.quantityBlockLabel}>Materials</Text>
                                        {materials.length > 0 ? (
                                            materials.map((mat, index) => (
                                                <View key={mat.key || `${split.id}-material-${index}`} style={styles.quantityLineItem}>
                                                    <View style={styles.quantityLineIcon}>
                                                        {(mat.photo || mat.image) ? (
                                                            <Image source={{ uri: mat.photo || mat.image }} style={styles.quantityLineImage} />
                                                        ) : (
                                                            <Layers size={16} color="#94A3B8" />
                                                        )}
                                                    </View>
                                                    <View style={{ flex: 1 }}>
                                                        <Text style={styles.quantityLineTitle}>{mat.name}</Text>
                                                        <Text style={styles.quantityLineMeta}>
                                                            {mat.sku ? `SKU ${mat.sku}` : (mat.category || mat.materialType || 'Material')}
                                                        </Text>
                                                    </View>
                                                    <View style={{ alignItems: 'flex-end' }}>
                                                        <Text style={styles.quantityLineMeta}>
                                                            {getMaterialQuantityText(mat)}{getMaterialUnitText(mat)} x ₹{(mat.sellingPrice || mat.rate || 0).toLocaleString()}
                                                        </Text>
                                                        <Text style={styles.quantityLinePrice}>₹{(mat.totalCost || mat.amount || 0).toLocaleString()}</Text>
                                                    </View>
                                                </View>
                                            ))
                                        ) : (
                                            <View style={styles.quantityEmptyState}>
                                                <Text style={styles.quantityEmptyText}>No materials for this quantity</Text>
                                            </View>
                                        )}

                                        <Text style={styles.quantityBlockLabel}>Services</Text>
                                        {services.length > 0 ? (
                                            services.map((svc, index) => (
                                                <View key={svc.id || svc.service_id || `${split.id}-service-${index}`} style={styles.quantityLineItem}>
                                                    <View style={styles.quantityLineIcon}>
                                                        <Sparkles size={16} color="#6366F1" />
                                                    </View>
                                                    <View style={{ flex: 1 }}>
                                                        <Text style={styles.quantityLineTitle}>{svc.service_name || svc.name}</Text>
                                                        <Text style={styles.quantityLineMeta}>Addon / Service</Text>
                                                    </View>
                                                    <Text style={styles.quantityLinePrice}>₹{(svc.price || svc.amount || svc.cost || 0).toLocaleString()}</Text>
                                                </View>
                                            ))
                                        ) : (
                                            <View style={styles.quantityEmptyState}>
                                                <Text style={styles.quantityEmptyText}>No services for this quantity</Text>
                                            </View>
                                        )}

                                        <View style={styles.quantityTotalsCard}>
                                            <View style={styles.quantityTotalRow}>
                                                <Text style={styles.quantityTotalLabel}>Materials Total</Text>
                                                <Text style={styles.quantityTotalValue}>₹{(split.materialsTotal || 0).toLocaleString()}</Text>
                                            </View>
                                            <View style={styles.quantityTotalRow}>
                                                <Text style={styles.quantityTotalLabel}>Services Total</Text>
                                                <Text style={styles.quantityTotalValue}>₹{(split.servicesTotal || 0).toLocaleString()}</Text>
                                            </View>
                                            <View style={[styles.quantityTotalRow, { marginTop: 6, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#E2E8F0' }]}>
                                                <Text style={styles.quantityGrandTotalLabel}>Quantity Total</Text>
                                                <Text style={styles.quantityGrandTotalValue}>₹{(split.total || 0).toLocaleString()}</Text>
                                            </View>
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    </>
                )}

                {/* 4. MEASUREMENTS */}
                {Object.keys(numericMeasurements).length > 0 && (
                    <>
                        <SectionHeader num="4" title="MEASUREMENTS (Inches)" />
                        <View style={{ gap: 12, marginBottom: 24 }}>
                            {Object.entries(numericMeasurements).map(([key, val]) => (
                                <DetailCard
                                    key={key}
                                    icon={Ruler}
                                    label={key.replace(/([A-Z])/g, ' $1').trim()}
                                    value={String(val)}
                                />
                            ))}
                        </View>
                    </>
                )}

                {/* 5. PHOTOS */}
                {((currentItem.images && currentItem.images.length > 0) ||
                    (currentItem.photos && currentItem.photos.length > 0) ||
                    (currentItem.sketches && currentItem.sketches.length > 0) ||
                    (currentItem.measurementDressImages && currentItem.measurementDressImages.length > 0) ||
                    (currentItem.materialImages && currentItem.materialImages.length > 0) ||
                    (currentItem.audioUri) ||
                    (currentItem.notes && currentItem.notes.trim() !== '')) && (
                        <>
                            <SectionHeader num="5" title="PHOTOS" />
                            <View style={[styles.photoContainer, { gap: 0 }]}>
                                {/* Reference Images */}
                                {((currentItem.images && currentItem.images.length > 0) || (currentItem.photos && currentItem.photos.length > 0)) && (
                                    <View>
                                        <Text style={styles.photoSubTitle}>Reference Images</Text>
                                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoScroll}>
                                            {currentItem.images?.map((img, i) => (
                                                <TouchableOpacity key={`img-${i}`} onPress={() => setPreviewImageUri(img)}>
                                                    <Image source={{ uri: img }} style={styles.photoItem} />
                                                </TouchableOpacity>
                                            ))}
                                            {currentItem.photos?.filter(p => p.category === 'REFERENCE').map((photo, i) => (
                                                <TouchableOpacity key={`photo-${i}`} onPress={() => setPreviewImageUri(photo.file_url)}>
                                                    <View style={{ position: 'relative', marginRight: 12 }}>
                                                        <Image source={{ uri: photo.file_url }} style={styles.photoItem} />
                                                        <View style={{
                                                            position: 'absolute',
                                                            bottom: 0,
                                                            left: 0,
                                                            right: 0,
                                                            backgroundColor: 'rgba(91, 67, 238, 0.85)',
                                                            paddingVertical: 2,
                                                            alignItems: 'center',
                                                            borderRadius: 4
                                                        }}>
                                                            <Text style={{ fontSize: 8, fontFamily: 'Inter-Bold', color: '#FFFFFF' }}>Shared</Text>
                                                        </View>
                                                    </View>
                                                </TouchableOpacity>
                                            ))}
                                        </ScrollView>
                                    </View>
                                )}

                                {/* Draw Sketch */}
                                {currentItem.sketches && currentItem.sketches.length > 0 && (
                                    <View>
                                        <Text style={styles.photoSubTitle}>Draw Sketch</Text>
                                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoScroll}>
                                            {currentItem.sketches.map((img, i) => (
                                                <TouchableOpacity key={i} onPress={() => setPreviewImageUri(img)}>
                                                    <Image source={{ uri: img }} style={[styles.photoItem, { backgroundColor: 'white', borderWidth: 1, borderColor: '#E2E8F0' }]} resizeMode="contain" />
                                                </TouchableOpacity>
                                            ))}
                                        </ScrollView>
                                    </View>
                                )}

                                {/* Measurement Dress */}
                                {currentItem.measurementDressImages && currentItem.measurementDressImages.length > 0 && (
                                    <View>
                                        <Text style={styles.photoSubTitle}>Measurement Dress</Text>
                                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoScroll}>
                                            {currentItem.measurementDressImages.map((img, i) => (
                                                <TouchableOpacity key={i} onPress={() => setPreviewImageUri(img)}>
                                                    <Image source={{ uri: img }} style={styles.photoItem} />
                                                </TouchableOpacity>
                                            ))}
                                        </ScrollView>
                                    </View>
                                )}

                                {/* Material Images */}
                                {currentItem.materialImages && currentItem.materialImages.length > 0 && (
                                    <View>
                                        <Text style={styles.photoSubTitle}>Material Images</Text>
                                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoScroll}>
                                            {currentItem.materialImages.map((img, i) => (
                                                <TouchableOpacity key={i} onPress={() => setPreviewImageUri(img)}>
                                                    <Image source={{ uri: img }} style={styles.photoItem} />
                                                </TouchableOpacity>
                                            ))}
                                        </ScrollView>
                                    </View>
                                )}

                                {/* Audio Note */}
                                {currentItem.audioUri && (
                                    <View>
                                        <Text style={styles.photoSubTitle}>Audio Instruction</Text>
                                        <AudioPlayer
                                            uri={currentItem.audioUri}
                                            duration={currentItem.audioDuration}
                                            onShowAlert={(title, msg) => {
                                                setAlertConfig({ title, message: msg });
                                                setAlertVisible(true);
                                            }}
                                        />
                                    </View>
                                )}

                                {/* Customer Notes */}
                                {currentItem.notes && currentItem.notes.trim() !== '' && (
                                    <View>
                                        <Text style={styles.photoSubTitle}>Customer Notes</Text>
                                        <View style={styles.notesCard}>
                                            <Text style={styles.notesContent}>{currentItem.notes}</Text>
                                        </View>
                                    </View>
                                )}
                            </View>
                        </>
                    )}

                {/* 6. SERVICES */}
                {serviceSplits.length > 0 && (
                <View style={{ marginTop: 16 }}>
                    <SectionHeader num="6" title="SERVICES" />
                    <View style={{ marginBottom: 60 }}>
                        {serviceSplits.map((split, sIdx) => {
                            const ordinal = formatQuantityOrdinalLabel(sIdx);
                            const services = split.services || [];
                            
                            // Final deduplication in render to ensure no duplicates
                            const uniqueServices = services.filter(
                                (svc, index, arr) =>
                                    arr.findIndex(s => (s.id || s.service_id) === (svc.id || svc.service_id)) === index
                            );

                            if (uniqueServices.length === 0) {
                                return null;
                            }

                            return (
                                <View key={sIdx} style={styles.serviceGroup}>
                                    <View style={styles.serviceHeader}>
                                        <Text style={styles.serviceOutfitLabel}>QUANTITY {ordinal.toUpperCase()}</Text>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <Text style={styles.serviceOutfitName}>{currentItem.name}</Text>
                                            <View style={styles.serviceBadge}>
                                                <Text style={styles.serviceBadgeText}>{ordinal} Qty</Text>
                                            </View>
                                        </View>
                                    </View>

                                    {uniqueServices.map((svc, i) => {
                                        const svcId = svc.id || svc.service_id || `svc-${sIdx}-${i}`;
                                        return (
                                            <View key={svcId} style={styles.serviceRow}>
                                                <Text style={styles.serviceLabel}>{svc.service_name || svc.name}</Text>
                                                <Text style={styles.servicePrice}>₹{(svc.price || svc.amount || svc.cost || 0).toLocaleString()}</Text>
                                            </View>
                                        );
                                    })}
                                </View>
                            );
                        })}
                    </View>
                </View>
                )}

            </ScrollView>

            {/* Image Preview Modal */}
            <ImageView
                images={previewImageUri ? [{ uri: previewImageUri }] : []}
                imageIndex={0}
                visible={!!previewImageUri}
                onRequestClose={() => setPreviewImageUri(null)}
                backgroundColor={previewImageUri?.toLowerCase().includes('sketch') ? '#FFFFFF' : '#000000'}
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

const { height } = Dimensions.get('window');

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        backgroundColor: Colors.white,
    },
    backBtn: {
        padding: 4,
        marginRight: 12
    },
    headerTitle: {
        fontFamily: 'Inter-Bold',
        fontSize: 18,
        color: Colors.textPrimary,
        flex: 1
    },
    scrollContent: {
        padding: 16,
    },
    topCard: {
        backgroundColor: Colors.white,
        padding: 16,
        borderRadius: 16,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#F1F5F9'
    },
    customerName: {
        fontFamily: 'Inter-Bold',
        fontSize: 18,
        color: Colors.textPrimary,
    },
    outfitType: {
        fontFamily: 'Inter-Medium',
        fontSize: 14,
        color: Colors.textSecondary,
    },
    topPrice: {
        fontFamily: 'Inter-Bold',
        fontSize: 18,
        color: '#6366F1',
    },
    qtyBadge: {
        backgroundColor: '#F1F5F9',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
        marginTop: 8,
        alignSelf: 'flex-start'
    },
    qtyText: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 12,
        color: '#64748B',
    },
    sectionTitle: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 13,
        color: '#94A3B8',
        marginBottom: 8, // Standardized gap to content
        marginTop: 8,   // Small additional spacing after card bottom margin
        textTransform: 'uppercase',
        letterSpacing: 0.5
    },
    gridCard: {
        backgroundColor: Colors.white,
        borderRadius: 16,
        paddingHorizontal: 16,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#F1F5F9'
    },
    gridRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6'
    },
    gridLabel: {
        fontFamily: 'Inter-Medium',
        fontSize: 14,
        color: '#64748B',
    },
    gridValue: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 14,
        color: Colors.textPrimary,
    },
    detailCard: {
        backgroundColor: Colors.white,
        borderRadius: 12,
        padding: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        borderWidth: 1,
        borderColor: '#F1F5F9'
    },
    detailCardIcon: {
        width: 44,
        height: 44,
        borderRadius: 8,
        backgroundColor: '#F8FAFC',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#F1F5F9'
    },
    detailCardLabel: {
        fontFamily: 'Inter-Medium',
        fontSize: 12,
        color: '#94A3B8',
        textTransform: 'capitalize'
    },
    detailCardSubLabel: {
        fontFamily: 'Inter-Medium',
        fontSize: 13,
        color: '#64748B',
        marginTop: 1
    },
    detailCardValue: {
        fontFamily: 'Inter-Bold',
        fontSize: 16,
        color: Colors.textPrimary,
        marginTop: 1
    },
    serviceGroup: {
        backgroundColor: Colors.white,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        overflow: 'hidden',
        marginBottom: 16
    },
    serviceHeader: {
        backgroundColor: '#F8FAFC',
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9'
    },
    serviceOutfitLabel: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 10,
        color: '#94A3B8',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 4
    },
    serviceOutfitName: {
        fontFamily: 'Inter-Bold',
        fontSize: 15,
        color: Colors.textPrimary,
    },
    serviceHeaderTopRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 12,
    },
    serviceHeaderInfo: {
        flex: 1,
    },
    materialSplitMeta: {
        marginTop: 6,
        gap: 2,
    },
    materialSplitMetaText: {
        fontFamily: 'Inter-Medium',
        fontSize: 12,
        color: '#64748B',
    },
    legacyServiceBadge: {
        backgroundColor: '#F5F3FF',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#E0E7FF'
    },
    legacyServiceBadgeText: {
        fontFamily: 'Inter-Bold',
        fontSize: 10,
        color: '#6366F1',
    },
    serviceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F8FAFC'
    },
    serviceLabel: {
        fontFamily: 'Inter-Medium',
        fontSize: 13,
        color: '#64748B',
    },
    servicePrice: {
        fontFamily: 'Inter-Bold',
        fontSize: 13,
        color: Colors.textPrimary,
    },
    materialCardPremium: {
        backgroundColor: Colors.white,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    materialThumbRound: {
        width: 64,
        height: 64,
        borderRadius: 12,
        backgroundColor: '#F8FAFC',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#F1F5F9'
    },
    materialImg: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover'
    },
    materialNameMain: {
        fontFamily: 'Inter-Bold',
        fontSize: 15,
        color: Colors.textPrimary,
    },
    materialSkuSub: {
        fontFamily: 'Inter-Medium',
        fontSize: 12,
        color: '#94A3B8',
        marginTop: 2
    },
    materialBadgeSmall: {
        backgroundColor: '#F1F5F9',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        marginTop: 6,
        alignSelf: 'flex-start'
    },
    materialBadgeTextSmall: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 10,
        color: '#64748B',
    },
    materialDivider: {
        height: 1,
        backgroundColor: '#F1F5F9',
        marginVertical: 12
    },
    materialBottomRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    materialQtyRate: {
        fontFamily: 'Inter-Medium',
        fontSize: 13,
        color: '#64748B',
    },
    materialTotalAmt: {
        fontFamily: 'Inter-Bold',
        fontSize: 15,
        color: Colors.textPrimary,
    },
    photoContainer: {
        gap: 20
    },
    photoSubTitle: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 14,
        color: Colors.textPrimary,
        marginBottom: 8, // Standardized gap to content
        marginTop: 16    // Balanced spacing between sub-sections
    },
    photoScroll: {
        marginBottom: 4
    },
    photoItem: {
        width: 100,
        height: 100,
        borderRadius: 12,
        backgroundColor: '#F1F5F9',
        marginRight: 10
    },
    photoEmpty: {
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderStyle: 'dashed'
    },
    recordedAudioPlayerBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F5F3FF',
        padding: 12,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E0E7FF',
        marginBottom: 12
    },
    audioPlayCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#6366F1',
        justifyContent: 'center',
        alignItems: 'center',
    },
    notesCard: {
        backgroundColor: '#ffffff',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        marginTop: 0 // Removed top margin to tighten gap with title
    },
    notesContent: {
        fontFamily: 'Inter-Medium',
        fontSize: 14,
        color: '#475569',
        lineHeight: 20
    },
    quantitySectionCard: {
        backgroundColor: Colors.white,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        padding: 16,
    },
    quantitySectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    quantitySectionEyebrow: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 11,
        color: '#94A3B8',
        letterSpacing: 0.4,
    },
    quantitySectionTitle: {
        fontFamily: 'Inter-Bold',
        fontSize: 17,
        color: Colors.textPrimary,
        marginTop: 4,
    },
    quantityMetaRow: {
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        padding: 12,
        gap: 4,
        marginBottom: 14,
    },
    quantityMetaText: {
        fontFamily: 'Inter-Medium',
        fontSize: 12,
        color: '#64748B',
    },
    quantityBlockLabel: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 12,
        color: '#94A3B8',
        textTransform: 'uppercase',
        letterSpacing: 0.4,
        marginBottom: 8,
    },
    quantityLineItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#F8FAFC',
        gap: 10,
    },
    quantityLineIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: '#F8FAFC',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    quantityLineImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    quantityLineTitle: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 14,
        color: Colors.textPrimary,
    },
    quantityLineMeta: {
        fontFamily: 'Inter-Medium',
        fontSize: 12,
        color: '#64748B',
        marginTop: 2,
    },
    quantityLinePrice: {
        fontFamily: 'Inter-Bold',
        fontSize: 14,
        color: Colors.textPrimary,
    },
    quantityEmptyState: {
        paddingVertical: 10,
    },
    quantityEmptyText: {
        fontFamily: 'Inter-Medium',
        fontSize: 13,
        color: '#94A3B8',
    },
    quantityTotalsCard: {
        marginTop: 14,
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        padding: 12,
    },
    quantityTotalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    quantityTotalLabel: {
        fontFamily: 'Inter-Medium',
        fontSize: 13,
        color: '#64748B',
    },
    quantityTotalValue: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 13,
        color: Colors.textPrimary,
    },
    quantityGrandTotalLabel: {
        fontFamily: 'Inter-Bold',
        fontSize: 14,
        color: Colors.textPrimary,
    },
    quantityGrandTotalValue: {
        fontFamily: 'Inter-Bold',
        fontSize: 15,
        color: '#6366F1',
    },
    serviceBadge: {
        backgroundColor: '#EEF2FF',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4
    },
    serviceBadgeText: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 11,
        color: '#6366F1',
    }
});

export default ItemDetailScreen;
