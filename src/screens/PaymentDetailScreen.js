import React, { useEffect, useState, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    StatusBar,
    SafeAreaView,
    Platform,
    Image,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import RNPrint from 'react-native-print';
import {
    ChevronLeft,
    Calendar,
    User,
    Phone,
    Shirt,
    Receipt,
    CreditCard,
    Download,
    Share2,
    CheckCircle2,
    Clock,
    FileText,
    Printer
} from 'lucide-react-native';
import { Colors, Spacing, Typography, Shadow } from '../constants/theme';
import { formatOrderNumber } from '../utils/orderIdFormatter';
import { fetchPaymentDetailAction } from '../store/paymentSlice';
import { URL_PAYMENT_DOWNLOAD } from '../config/env';
import { useToast } from '../context/ToastContext';
import { useData } from '../context/DataContext';

const PaymentDetailScreen = ({ route }) => {
    const { paymentId } = route.params;
    const dispatch = useDispatch();
    const navigation = useNavigation();
    const { showToast } = useToast();
    const { orders } = useData();

    const { selectedPayment, loading, error, list: apiPayments } = useSelector((state) => state.payment);
    const authState = useSelector((state) => state.auth);
    const [isSharing, setIsSharing] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [isPrinting, setIsPrinting] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState(0);

    useEffect(() => {
        if (paymentId) {
            dispatch(fetchPaymentDetailAction(paymentId));
        }
    }, [dispatch, paymentId]);

    const orderDetails = selectedPayment?.order_details;
    const paymentDetails = selectedPayment?.payment_details;

    const displayBillId = useMemo(() => {
        if (!paymentDetails) return '';
        
        const parentOrder = orders.find(o => String(o.id) === String(orderDetails?.order_id || paymentDetails?.order_id));
        const rawOrderNo = parentOrder?.bill_no || parentOrder?.billNo || paymentDetails?.bill_no || paymentDetails?.bill_id || paymentDetails?.order_id || orderDetails?.order_id;
        const formattedOrderNo = formatOrderNumber(rawOrderNo);
        const ordPrefix = formattedOrderNo.startsWith('ORD') ? `#${formattedOrderNo}` : (formattedOrderNo.startsWith('#') ? formattedOrderNo : `#ORD${formattedOrderNo}`);
        
        const orderPayments = [...apiPayments].filter(p => Number(p.amount) > 0 && String(p.order_id) === String(orderDetails?.order_id || paymentDetails?.order_id))
            .sort((a, b) => new Date(a.payment_date || a.created_at) - new Date(b.payment_date || b.created_at) || (a.id - b.id));
        
        const paymentIndex = orderPayments.findIndex(p => String(p.id) === String(paymentDetails?.id || paymentId)) + 1;
        const seqNum = paymentIndex > 0 ? paymentIndex : 1;
        
        return `${ordPrefix}/#BILL${seqNum}`.toUpperCase();
    }, [paymentDetails, apiPayments, orders, orderDetails, paymentId]);

    const displayOrderId = useMemo(() => {
        if (!orderDetails) return '';
        const parentOrder = orders.find(o => String(o.id) === String(orderDetails.order_id));
        const rawOrderNo = parentOrder?.bill_no || parentOrder?.billNo || orderDetails?.bill_no || orderDetails?.billNo || orderDetails?.order_id;
        const formattedOrderNo = formatOrderNumber(rawOrderNo);
        return formattedOrderNo?.startsWith('ORD') ? `#${formattedOrderNo}` : (formattedOrderNo?.startsWith('#') ? formattedOrderNo : `#ORD${formattedOrderNo}`);
    }, [orders, orderDetails]);

    const getAuthToken = async () => {
        const user = authState.user;
        let token =
            user?.token ||
            user?.data?.token ||
            user?.accessToken ||
            user?.data?.accessToken ||
            user?.access_token ||
            user?.data?.access_token ||
            user?.jwt ||
            user?.data?.jwt;

        if (!token) {
            token = await AsyncStorage.getItem('userToken');
        }

        return token ? (token.startsWith('Bearer ') ? token : `Bearer ${token}`) : '';
    };

    const downloadInvoiceHelper = async (isTemporary = false) => {
        const token = await getAuthToken();
        const downloadUrl = URL_PAYMENT_DOWNLOAD(paymentId);
        const sanitizedBillId = (paymentDetails?.bill_id || paymentId).toString().replace(/\//g, '_');
        const timestamp = Date.now();
        const fileName = `Invoice_${sanitizedBillId}_${timestamp}.pdf`;
        const downloadDir = isTemporary ? RNFS.CachesDirectoryPath : (Platform.OS === 'android' ? RNFS.DownloadDirectoryPath : RNFS.DocumentDirectoryPath);
        const localFilePath = `${downloadDir}/${fileName}`;

        const downloadResult = await RNFS.downloadFile({
            fromUrl: downloadUrl,
            toFile: localFilePath,
            headers: {
                'accept': '*/*',
                'Authorization': token,
            },
            progress: (res) => {
                const percentage = (res.bytesWritten / res.contentLength) * 100;
                setDownloadProgress(Math.floor(percentage));
            },
            progressDivider: 1,
        }).promise;

        if (downloadResult.statusCode === 200) {
            return localFilePath;
        } else {
            throw new Error(`Download failed with status ${downloadResult.statusCode}`);
        }
    };

    const handleShareInvoice = async () => {
        try {
            setIsSharing(true);
            const localFilePath = await downloadInvoiceHelper(true);
            const mobileNumber = orderDetails?.customer_mobile;
            const fullNumber = mobileNumber ? (mobileNumber.startsWith('91') ? mobileNumber : `91${mobileNumber}`) : '';

            try {
                await Share.shareSingle({
                    title: 'Share Invoice via WhatsApp',
                    message: `Here is your invoice for Bill ID: ${paymentDetails?.bill_id}`,
                    url: `file://${localFilePath}`,
                    type: 'application/pdf',
                    social: Share.Social.WHATSAPP,
                    whatsAppNumber: fullNumber,
                });
            } catch (waError) {
                console.log('WhatsApp share failed, falling back to general share:', waError);
                await Share.open({
                    url: `file://${localFilePath}`,
                    type: 'application/pdf',
                    title: 'Share Invoice',
                });
            }
        } catch (error) {
            if (error.message !== 'User did not share') {
                console.error('Share Invoice Error:', error);
                if (paymentDetails?.invoice_url) {
                    const fullUrl = `https://api.sewvee.com${paymentDetails.invoice_url}`;
                    Share.open({
                        url: fullUrl,
                        message: `Invoice for Bill ID: ${paymentDetails.bill_id}`,
                    }).catch(err => console.error("URL share failed", err));
                }
            }
        } finally {
            setIsSharing(false);
        }
    };

    const handleDownloadInvoice = async () => {
        try {
            setIsDownloading(true);
            setDownloadProgress(0);
            const localFilePath = await downloadInvoiceHelper(false);
            if (Platform.OS === 'android') {
                try {
                    await RNFS.scanFile(localFilePath);
                } catch (scanError) {
                    console.log('Error scanning file:', scanError);
                }
            }
            const downloadDirName = Platform.OS === 'android' ? 'Downloads' : 'Documents';
            showToast(`Invoice downloaded successfully to your ${downloadDirName} folder!`, 'success');
        } catch (error) {
            console.error('Download Invoice Error:', error);
            showToast('Could not download the invoice. Please try again.', 'error');
        } finally {
            setIsDownloading(false);
            setDownloadProgress(0);
        }
    };

    const handlePrintInvoice = async () => {
        try {
            setIsPrinting(true);
            const localFilePath = await downloadInvoiceHelper(true);
            await RNPrint.print({ filePath: `file://${localFilePath}` });
        } catch (error) {
            console.error('Print Invoice Error:', error);
            showToast('Could not print the invoice. Please try again.', 'error');
        } finally {
            setIsPrinting(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.centerContainer}>
                <Text style={styles.errorText}>Error loading payment details</Text>
                <TouchableOpacity style={styles.retryBtn} onPress={() => dispatch(fetchPaymentDetailAction(paymentId))}>
                    <Text style={styles.retryText}>Retry</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const isUpi = paymentDetails?.payment_mode === 'UPI';
    const isCash = paymentDetails?.payment_mode === 'CASH' || paymentDetails?.payment_mode === 'Cash';

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar backgroundColor="#F8FAFC" barStyle="dark-content" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <ChevronLeft size={24} color={Colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Receipt Details</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                
                {/* Main Receipt Card */}
                <View style={styles.receiptCard}>
                    
                    {/* Top Status Area */}
                    <View style={styles.receiptTop}>
                        <View style={styles.statusBadge}>
                            <CheckCircle2 size={16} color={Colors.success} />
                            <Text style={styles.statusText}>Payment Successful</Text>
                        </View>
                        <Text style={styles.amountBig}>₹{paymentDetails?.amount?.toLocaleString()}</Text>
                        <Text style={styles.dateLabel}>
                            {paymentDetails?.payment_date ? new Date(paymentDetails.payment_date).toLocaleDateString('en-IN', {
                                day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                            }) : ''}
                        </Text>
                    </View>

                    {/* Dashed Separator */}
                    <View style={styles.dashedSeparator}>
                        {Array.from({ length: 30 }).map((_, i) => (
                            <View key={i} style={styles.dashLine} />
                        ))}
                    </View>

                    {/* Payment Info */}
                    <View style={styles.infoSection}>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Bill ID</Text>
                            <Text style={styles.infoValueHighlight}>{displayBillId}</Text>
                        </View>

                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Payment Mode</Text>
                            <View style={[styles.modeBadge, { backgroundColor: isUpi ? '#EEF2FF' : isCash ? '#F0FDF4' : '#F1F5F9' }]}>
                                <CreditCard size={14} color={isUpi ? '#4F46E5' : isCash ? '#16A34A' : Colors.textSecondary} />
                                <Text style={[styles.modeText, { color: isUpi ? '#4F46E5' : isCash ? '#16A34A' : Colors.textSecondary }]}>
                                    {paymentDetails?.payment_mode || 'Unknown'}
                                </Text>
                            </View>
                        </View>

                        {isUpi && (
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Transaction ID</Text>
                                <Text style={styles.infoValue}>{paymentDetails?.transaction_id || 'N/A'}</Text>
                            </View>
                        )}

                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Balance Pending</Text>
                            <Text style={[styles.infoValue, { color: paymentDetails?.balance_amount > 0 ? Colors.danger : Colors.textPrimary }]}>
                                ₹{paymentDetails?.balance_amount?.toLocaleString() || '0'}
                            </Text>
                        </View>
                    </View>

                    {/* Dashed Separator */}
                    <View style={styles.dashedSeparator}>
                        {Array.from({ length: 30 }).map((_, i) => (
                            <View key={i} style={styles.dashLine} />
                        ))}
                    </View>

                    {/* Order Details */}
                    <View style={styles.infoSection}>
                        <View style={styles.sectionTitleRow}>
                            <FileText size={16} color={Colors.textSecondary} />
                            <Text style={styles.sectionTitle}>Order Reference</Text>
                        </View>
                        
                        <View style={styles.orderCardBox}>
                            <View style={styles.orderCardHeader}>
                                <Text style={styles.orderCardId}>{displayOrderId}</Text>
                                <View style={styles.typeBadge}>
                                    <Shirt size={12} color={Colors.primary} />
                                    <Text style={styles.typeBadgeText}>{orderDetails?.order_type}</Text>
                                </View>
                            </View>
                            
                            <View style={styles.customerBox}>
                                <View style={styles.customerRow}>
                                    <User size={16} color={Colors.textSecondary} />
                                    <Text style={styles.customerText}>{orderDetails?.customer_name}</Text>
                                </View>
                                <View style={styles.customerRow}>
                                    <Phone size={16} color={Colors.textSecondary} />
                                    <Text style={styles.customerText}>{orderDetails?.customer_mobile}</Text>
                                </View>
                            </View>
                        </View>
                    </View>

                </View>

            </ScrollView>

            {/* Sticky Action Footer */}
            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.actionBtn, styles.downloadBtn, isDownloading && { opacity: 0.7 }]}
                    onPress={handleDownloadInvoice}
                    disabled={isSharing || isDownloading || isPrinting}
                >
                    {isDownloading ? (
                        <ActivityIndicator size="small" color={Colors.primary} />
                    ) : (
                        <Download size={20} color={Colors.primary} />
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.actionBtn, styles.printBtn, isPrinting && { opacity: 0.7 }]}
                    onPress={handlePrintInvoice}
                    disabled={isSharing || isDownloading || isPrinting}
                >
                    {isPrinting ? (
                        <ActivityIndicator size="small" color={Colors.primary} />
                    ) : (
                        <>
                            <Printer size={20} color={Colors.primary} />
                            <Text style={styles.printBtnText}>Print</Text>
                        </>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.actionBtn, styles.shareBtn, isSharing && { opacity: 0.7 }]}
                    onPress={handleShareInvoice}
                    disabled={isSharing || isDownloading || isPrinting}
                >
                    {isSharing ? (
                        <ActivityIndicator size="small" color={Colors.white} />
                    ) : (
                        <>
                            <Share2 size={20} color={Colors.white} />
                            <Text style={styles.shareBtnText}>Share</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 16,
        backgroundColor: '#F8FAFC',
        marginTop: Platform.OS === 'ios' ? 0 : 20,
    },
    backBtn: {
        padding: 8,
        borderRadius: 12,
        backgroundColor: Colors.white,
        ...Shadow.subtle,
    },
    headerTitle: {
        fontFamily: 'Inter-Bold',
        fontSize: 18,
        color: Colors.textPrimary,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 100, // Space for sticky footer
    },
    
    // Receipt Card styling
    receiptCard: {
        backgroundColor: Colors.white,
        borderRadius: 24,
        padding: 24,
        ...Shadow.medium,
        elevation: 4,
    },
    receiptTop: {
        alignItems: 'center',
        marginBottom: 20,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F0FDF4',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 6,
        marginBottom: 16,
    },
    statusText: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 13,
        color: Colors.success,
    },
    amountBig: {
        fontFamily: 'Inter-Black',
        fontSize: 36,
        color: Colors.textPrimary,
        marginBottom: 8,
        letterSpacing: -1,
    },
    dateLabel: {
        fontFamily: 'Inter-Medium',
        fontSize: 13,
        color: Colors.textSecondary,
    },
    
    // Dashed lines
    dashedSeparator: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 1,
        marginVertical: 24,
        overflow: 'hidden',
    },
    dashLine: {
        width: 6,
        height: 1,
        backgroundColor: '#CBD5E1',
    },
    
    // Info Sections
    infoSection: {
        gap: 16,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    infoLabel: {
        fontFamily: 'Inter-Medium',
        fontSize: 14,
        color: Colors.textSecondary,
    },
    infoValue: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 14,
        color: Colors.textPrimary,
    },
    infoValueHighlight: {
        fontFamily: 'Inter-Bold',
        fontSize: 15,
        color: Colors.textPrimary,
        letterSpacing: 0.5,
    },
    modeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        gap: 6,
    },
    modeText: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 12,
    },
    
    // Order Reference
    sectionTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4,
    },
    sectionTitle: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 14,
        color: Colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    orderCardBox: {
        backgroundColor: '#F8FAFC',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    orderCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    orderCardId: {
        fontFamily: 'Inter-Bold',
        fontSize: 16,
        color: Colors.textPrimary,
    },
    typeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.primary + '15',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        gap: 4,
    },
    typeBadgeText: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 11,
        color: Colors.primary,
        textTransform: 'uppercase',
    },
    customerBox: {
        gap: 8,
        paddingTop: 12,
        borderTopWidth: 1,
        borderColor: '#E2E8F0',
    },
    customerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    customerText: {
        fontFamily: 'Inter-Medium',
        fontSize: 14,
        color: Colors.textPrimary,
    },
    
    // Sticky Footer
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        padding: 20,
        paddingBottom: Platform.OS === 'ios' ? 34 : 20,
        backgroundColor: Colors.white,
        borderTopWidth: 1,
        borderTopColor: '#E2E8F0',
        gap: 12,
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 16,
        gap: 8,
    },
    downloadBtn: {
        backgroundColor: Colors.primary + '10',
        width: 56, // Fixed width for icon only
    },
    printBtn: {
        flex: 1,
        backgroundColor: Colors.primary + '10',
    },
    printBtnText: {
        fontFamily: 'Inter-Bold',
        fontSize: 15,
        color: Colors.primary,
    },
    shareBtn: {
        flex: 1,
        backgroundColor: Colors.primary,
        ...Shadow.medium,
    },
    shareBtnText: {
        fontFamily: 'Inter-Bold',
        fontSize: 15,
        color: Colors.white,
    },
    
    // Error state
    errorText: {
        fontFamily: 'Inter-Medium',
        fontSize: 15,
        color: Colors.danger,
        marginBottom: 16,
    },
    retryBtn: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        backgroundColor: Colors.primary,
        borderRadius: 12,
    },
    retryText: {
        fontFamily: 'Inter-Bold',
        fontSize: 14,
        color: Colors.white,
    },
});

export default PaymentDetailScreen;
