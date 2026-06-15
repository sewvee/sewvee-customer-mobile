import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    ScrollView,
    Animated,
    Dimensions,
    Platform,
    ActivityIndicator,
} from 'react-native';
import { Colors, Shadow } from '../constants/theme';
import { Check, Download } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { height } = Dimensions.get('window');

import { formatOrderNumber } from '../utils/orderIdFormatter';

const OrderSuccessModal = ({
    visible,
    onClose,
    onPrint,
    order,
    loading = false,
    title = 'Order Created Successfully!',
    subtitle,
    details = null,
    downloadLabel = 'Download Customer Copy',
    toastMessage,
}) => {
    const slideAnim = React.useRef(new Animated.Value(height)).current;

    React.useEffect(() => {
        if (visible) {
            Animated.spring(slideAnim, {
                toValue: 0,
                useNativeDriver: true,
                friction: 8,
                tension: 40,
            }).start();
        } else {
            slideAnim.setValue(height);
        }
    }, [slideAnim, visible]);

    const insets = useSafeAreaInsets();

    if (!order) return null;

    const resolvedSubtitle = subtitle || `Order #${formatOrderNumber(order.billNo || order.id) || '-'}`;
    const resolvedToastMessage = toastMessage || order?.successMessage || title;
    const resolvedDetails = Array.isArray(details)
        ? details
        : [
            { label: 'Customer', value: order.customerName },
            { label: 'Total Amount', value: `₹${order.total?.toLocaleString('en-IN')}`, isBold: true },
            { label: 'Advance Paid', value: `₹${order.advance?.toLocaleString('en-IN')}` },
            { label: 'Balance Due', value: `₹${order.balance?.toLocaleString('en-IN')}`, color: Colors.danger },
            ...(order.deliveryDate
                ? [{ label: 'Delivery Date', value: order.deliveryDate }]
                : []),
        ].filter(detail => detail?.value !== undefined && detail?.value !== null && detail?.value !== '');
    const canDownload = typeof onPrint === 'function';

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

                {resolvedToastMessage ? (
                    <View pointerEvents="none" style={[styles.toastWrapper, { top: insets.top + 12 }]}>
                        <View style={styles.toastCard}>
                            <Text style={styles.toastText} numberOfLines={2}>
                                {resolvedToastMessage}
                            </Text>
                        </View>
                    </View>
                ) : null}

                <Animated.View
                    style={[
                        styles.container,
                        {
                            transform: [{ translateY: slideAnim }],
                            paddingBottom: Math.max(insets.bottom, Platform.OS === 'android' ? 80 : 32),
                        },
                    ]}
                >
                    <View style={styles.handle} />

                    <View style={styles.content}>
                        <View style={styles.iconCircle}>
                            <Check size={32} color={Colors.white} strokeWidth={4} />
                        </View>

                        <Text style={styles.title}>{title}</Text>
                        <Text style={styles.subTitle}>{resolvedSubtitle}</Text>

                        <View style={styles.divider} />

                        {resolvedDetails.length > 0 && (
                            <ScrollView style={styles.detailsContainer} showsVerticalScrollIndicator={false}>
                                {resolvedDetails.map(detail => (
                                    <DetailRow
                                        key={`${detail.label}-${detail.value}`}
                                        label={detail.label}
                                        value={detail.value}
                                        isBold={detail.isBold}
                                        color={detail.color}
                                    />
                                ))}
                            </ScrollView>
                        )}

                        <View style={styles.footer}>
                            {canDownload && (
                                <TouchableOpacity
                                    style={[styles.printBtn, loading && { opacity: 0.8 }]}
                                    onPress={onPrint}
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <ActivityIndicator color={Colors.white} />
                                    ) : (
                                        <>
                                            <Download size={20} color={Colors.white} style={{ marginRight: 8 }} />
                                            <Text style={styles.printBtnText}>{downloadLabel}</Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            )}

                            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                                <Text style={styles.closeBtnText}>Close</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
};

const DetailRow = ({ label, value, isBold, color }) => (
    <View style={styles.row}>
        <Text style={styles.label}>{label}</Text>
        <Text
            style={[
                styles.value,
                isBold && { fontFamily: 'Inter-Bold', fontSize: 16 },
                color ? { color } : {},
            ]}
        >
            {value}
        </Text>
    </View>
);

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    toastWrapper: {
        position: 'absolute',
        left: 16,
        right: 16,
        zIndex: 9999,
        elevation: 9999,
    },
    toastCard: {
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 16,
        backgroundColor: '#10B981',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 8,
    },
    toastText: {
        color: '#FFFFFF',
        fontFamily: 'Inter-Medium',
        fontSize: 14,
    },
    container: {
        backgroundColor: Colors.white,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        width: '100%',
        maxHeight: '85%',
        paddingBottom: Math.max(34, Platform.OS === 'android' ? 80 : 34),
        ...Shadow.large,
    },
    handle: {
        width: 48,
        height: 5,
        backgroundColor: '#E5E7EB',
        borderRadius: 2.5,
        alignSelf: 'center',
        marginTop: 12,
        marginBottom: 8,
    },
    content: {
        padding: 24,
        alignItems: 'center',
    },
    iconCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#059669',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
        ...Shadow.medium,
    },
    title: {
        fontFamily: 'Inter-Bold',
        fontSize: 22,
        color: '#111827',
        marginBottom: 4,
        textAlign: 'center',
    },
    subTitle: {
        fontFamily: 'Inter-Medium',
        fontSize: 14,
        color: Colors.textSecondary,
        marginBottom: 20,
    },
    divider: {
        width: '100%',
        height: 1,
        backgroundColor: '#F3F4F6',
        marginBottom: 20,
    },
    detailsContainer: {
        width: '100%',
        marginBottom: 24,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F9FAFB',
    },
    label: {
        fontFamily: 'Inter-Medium',
        fontSize: 15,
        color: Colors.textSecondary,
    },
    value: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 15,
        color: Colors.textPrimary,
    },
    footer: {
        width: '100%',
        gap: 12,
    },
    printBtn: {
        backgroundColor: Colors.primary,
        height: 50,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        ...Shadow.small,
    },
    printBtnText: {
        color: Colors.white,
        fontFamily: 'Inter-SemiBold',
        fontSize: 16,
    },
    closeBtn: {
        backgroundColor: Colors.white,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        height: 50,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    closeBtnText: {
        color: Colors.textPrimary,
        fontFamily: 'Inter-SemiBold',
        fontSize: 16,
    },
});

export default OrderSuccessModal;
