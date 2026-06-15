import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    ActivityIndicator,
    Image,
    Modal,
    ScrollView,
    Dimensions,
    Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Colors, Spacing, Typography, Shadow } from '../constants/theme';
import { useTeam } from '../context/TeamContext';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { launchImageLibrary } from 'react-native-image-picker';
import { useDispatch } from 'react-redux';
import { uploadImageAction } from '../store/uploadSlice';

const { width } = Dimensions.get('window');

const TailorDashboardScreen = ({ navigation }) => {
    const { user: authUser } = useAuth();
    const { users, getAttendanceByUserAndDate, addAttendance, updateAttendance, loading: teamLoading } = useTeam();
    const { orders, updateOrder, refreshData } = useData();
    const { showToast } = useToast();
    const dispatch = useDispatch();

    const [activeTab, setActiveTab] = useState('todo'); // 'todo', 'progress', 'completed'
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [detailModalVisible, setDetailModalVisible] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadedPhotos, setUploadedPhotos] = useState([]);
    
    // Shift Timer State
    const [elapsedTime, setElapsedTime] = useState('00:00:00');
    const timerRef = useRef(null);

    const currentUserStaff = useMemo(() => {
        return users.find((u) => u.phone === authUser?.mobile || u.email === authUser?.email);
    }, [users, authUser]);

    const today = useMemo(() => new Date().toISOString().split('T')[0], []);
    const todayAttendance = useMemo(() => {
        return currentUserStaff ? getAttendanceByUserAndDate(currentUserStaff.id, today) : null;
    }, [currentUserStaff, today, getAttendanceByUserAndDate]);

    // Active Shift Timer calculation
    useEffect(() => {
        if (todayAttendance?.checkIn && !todayAttendance?.checkOut) {
            const startTime = new Date(`${today}T${todayAttendance.checkIn}:00`).getTime();
            
            const updateTimer = () => {
                const now = Date.now();
                const diff = Math.max(0, now - startTime);
                const hrs = Math.floor(diff / 3600000);
                const mins = Math.floor((diff % 3600000) / 60000);
                const secs = Math.floor((diff % 60000) / 1000);
                setElapsedTime(
                    `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
                );
            };

            updateTimer();
            timerRef.current = setInterval(updateTimer, 1000);
        } else {
            if (timerRef.current) clearInterval(timerRef.current);
            setElapsedTime('00:00:00');
        }

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [todayAttendance, today]);

    const handleClockToggle = useCallback(() => {
        if (!currentUserStaff) {
            showToast('Staff profile not found', 'error');
            return;
        }

        const now = new Date();
        const timeStr = now.toTimeString().split(' ')[0].substring(0, 5); // HH:MM

        if (!todayAttendance) {
            // Clock In
            addAttendance({
                userId: currentUserStaff.id,
                date: today,
                checkIn: timeStr,
                status: 'Present'
            });
            showToast('Clocked In successfully!', 'success');
        } else if (!todayAttendance.checkOut) {
            // Clock Out
            const [ciHrs, ciMins] = todayAttendance.checkIn.split(':').map(Number);
            const checkOutMinutes = now.getHours() * 60 + now.getMinutes();
            const checkInMinutes = ciHrs * 60 + ciMins;
            const diffHours = ((checkOutMinutes - checkInMinutes) / 60).toFixed(1);

            updateAttendance(todayAttendance.id, {
                checkOut: timeStr,
                totalHours: diffHours
            }, currentUserStaff);
            showToast('Clocked Out successfully!', 'success');
        } else {
            showToast('Already completed shift for today!', 'info');
        }
    }, [currentUserStaff, todayAttendance, today, addAttendance, updateAttendance, showToast]);

    // Filtered Assigned Orders
    const assignedOrders = useMemo(() => {
        if (!currentUserStaff) return [];
        return (orders || []).filter(o => o.tailorId === currentUserStaff.id || o.assignedTailorId === currentUserStaff.id);
    }, [orders, currentUserStaff]);

    const tabFilteredOrders = useMemo(() => {
        return assignedOrders.filter(o => {
            const status = String(o.status || '').toLowerCase();
            if (activeTab === 'todo') {
                return status === 'pending' || status === 'assigned' || status === 'cutting';
            } else if (activeTab === 'progress') {
                return status === 'sewing' || status === 'trial' || status === 'stitching';
            } else {
                return status === 'ready' || status === 'delivered' || status === 'completed';
            }
        });
    }, [assignedOrders, activeTab]);

    const handleStatusTransition = async (orderId, newStatus) => {
        try {
            await updateOrder(orderId, { status: newStatus });
            showToast(`Order status updated to ${newStatus}`, 'success');
            if (selectedOrder?.id === orderId) {
                setSelectedOrder(prev => ({ ...prev, status: newStatus }));
            }
            if (refreshData) refreshData();
        } catch (error) {
            showToast('Failed to update status', 'error');
        }
    };

    const pickPhoto = () => {
        launchImageLibrary({ mediaType: 'photo', quality: 0.8 }, async (response) => {
            if (response.didCancel || response.errorCode || !response.assets?.length) return;
            const asset = response.assets[0];

            setUploading(true);
            try {
                const uploadResult = await dispatch(uploadImageAction({
                    uri: asset.uri,
                    type: asset.type || 'image/jpeg',
                    name: asset.fileName || `tailor_${Date.now()}.jpg`,
                    key_name: 'orders',
                })).unwrap();

                // Get remote URL and save
                const url = uploadResult?.data?.url || uploadResult?.url || '';
                if (url) {
                    setUploadedPhotos(prev => [...prev, url]);
                    showToast('Photo uploaded successfully', 'success');
                }
            } catch (err) {
                showToast('Failed to upload image', 'error');
            } finally {
                setUploading(false);
            }
        });
    };

    const handleCompleteOrder = async () => {
        if (!selectedOrder) return;
        if (uploadedPhotos.length === 0) {
            Alert.alert('Photo Required', 'Please upload at least one photo of the finished garment to complete this order.');
            return;
        }

        try {
            await updateOrder(selectedOrder.id, {
                status: 'Completed',
                garmentPhotos: uploadedPhotos
            });
            showToast('Order completed successfully!', 'success');
            setDetailModalVisible(false);
            setUploadedPhotos([]);
            if (refreshData) refreshData();
        } catch (err) {
            showToast('Failed to complete order', 'error');
        }
    };

    const renderOrderCard = ({ item }) => (
        <TouchableOpacity
            style={styles.card}
            onPress={() => {
                setSelectedOrder(item);
                setUploadedPhotos(item.garmentPhotos || []);
                setDetailModalVisible(true);
            }}
        >
            <View style={styles.cardHeader}>
                <Text style={styles.cardId}>#{item.billNo || item.id.substring(0, 8)}</Text>
                <View style={[styles.statusBadge, { backgroundColor: item.status === 'Completed' ? '#ECFDF5' : '#EEF2FF' }]}>
                    <Text style={[styles.statusText, { color: item.status === 'Completed' ? '#059669' : '#6366F1' }]}>
                        {item.status || 'Assigned'}
                    </Text>
                </View>
            </View>
            <Text style={styles.cardCustomer}>{item.customerName}</Text>
            <Text style={styles.cardDelivery}>Due: {item.deliveryDate ? new Date(item.deliveryDate).toLocaleDateString() : 'TBD'}</Text>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.greeting}>Hello, {currentUserStaff?.name || 'Tailor'}</Text>
                    <Text style={styles.subtext}>Tailor Workspace</Text>
                </View>
                {todayAttendance?.checkIn && !todayAttendance?.checkOut && (
                    <View style={styles.timerContainer}>
                        <Ionicons name="time-outline" size={16} color={Colors.primary} />
                        <Text style={styles.timerText}>{elapsedTime}</Text>
                    </View>
                )}
            </View>

            {/* Clock-In Widget */}
            <View style={styles.clockCard}>
                <View style={styles.clockInfo}>
                    <Text style={styles.clockTitle}>Daily Attendance</Text>
                    <Text style={styles.clockSub}>
                        {todayAttendance?.checkIn
                            ? `Clocked In: ${todayAttendance.checkIn}${todayAttendance.checkOut ? `  •  Out: ${todayAttendance.checkOut}` : ''}`
                            : 'Not clocked in yet'}
                    </Text>
                </View>
                <TouchableOpacity
                    style={[
                        styles.clockBtn,
                        todayAttendance?.checkIn && !todayAttendance?.checkOut ? styles.clockBtnOut : todayAttendance?.checkOut ? styles.clockBtnDisabled : null
                    ]}
                    onPress={handleClockToggle}
                    disabled={!!todayAttendance?.checkOut}
                >
                    <Ionicons name="finger-print-outline" size={20} color="white" />
                    <Text style={styles.clockBtnText}>
                        {!todayAttendance ? 'Clock In' : !todayAttendance.checkOut ? 'Clock Out' : 'Done'}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Tabs */}
            <View style={styles.tabs}>
                {['todo', 'progress', 'completed'].map((tab) => (
                    <TouchableOpacity
                        key={tab}
                        style={[styles.tab, activeTab === tab && styles.tabActive]}
                        onPress={() => setActiveTab(tab)}
                    >
                        <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                            {tab === 'todo' ? 'To Do' : tab === 'progress' ? 'In Progress' : 'Completed'}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Orders list */}
            {teamLoading ? (
                <View style={styles.loader}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={tabFilteredOrders}
                    keyExtractor={(item) => item.id}
                    renderItem={renderOrderCard}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <Ionicons name="file-tray-outline" size={48} color={Colors.textSecondary} />
                            <Text style={styles.emptyTitle}>No orders found</Text>
                            <Text style={styles.emptyDesc}>Orders assigned to you will appear here.</Text>
                        </View>
                    }
                />
            )}

            {/* Detail Modal */}
            <Modal visible={detailModalVisible} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeaderBorder}>
                            <Text style={styles.modalTitle}>Order Details #{selectedOrder?.billNo}</Text>
                            <TouchableOpacity onPress={() => setDetailModalVisible(false)} style={styles.closeBtn}>
                                <Ionicons name="close" size={24} color={Colors.textPrimary} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView contentContainerStyle={styles.modalScroll}>
                            <Text style={styles.sectionTitle}>Customer Information</Text>
                            <Text style={styles.detailText}>Name: {selectedOrder?.customerName}</Text>
                            <Text style={styles.detailText}>Mobile: {selectedOrder?.customerMobile || '-'}</Text>
                            <Text style={styles.detailText}>Delivery Date: {selectedOrder?.deliveryDate ? new Date(selectedOrder.deliveryDate).toLocaleDateString() : 'TBD'}</Text>

                            <View style={styles.divider} />

                            <Text style={styles.sectionTitle}>Measurements / Notes</Text>
                            {selectedOrder?.measurements ? (
                                Object.entries(selectedOrder.measurements).map(([key, value]) => (
                                    <Text key={key} style={styles.detailText}>{key.replace(/_/g, ' ')}: {value}</Text>
                                ))
                            ) : (
                                <Text style={styles.detailText}>No measurements logged.</Text>
                            )}
                            {selectedOrder?.notes ? (
                                <View style={styles.notesContainer}>
                                    <Text style={styles.notesLabel}>Notes:</Text>
                                    <Text style={styles.notesContent}>{selectedOrder.notes}</Text>
                                </View>
                            ) : null}

                            <View style={styles.divider} />

                            {/* Actions / Photo Upload */}
                            <Text style={styles.sectionTitle}>Update Progress</Text>
                            <View style={styles.actionRow}>
                                {selectedOrder?.status !== 'Completed' && (
                                    <>
                                        {selectedOrder?.status === 'Pending' || selectedOrder?.status === 'Assigned' ? (
                                            <TouchableOpacity
                                                style={styles.actionBtn}
                                                onPress={() => handleStatusTransition(selectedOrder.id, 'Sewing')}
                                            >
                                                <Text style={styles.actionBtnText}>Start Sewing</Text>
                                            </TouchableOpacity>
                                        ) : selectedOrder?.status === 'Sewing' ? (
                                            <TouchableOpacity
                                                style={styles.actionBtn}
                                                onPress={() => handleStatusTransition(selectedOrder.id, 'Trial')}
                                            >
                                                <Text style={styles.actionBtnText}>Send for Trial</Text>
                                            </TouchableOpacity>
                                        ) : selectedOrder?.status === 'Trial' ? (
                                            <View style={{ width: '100%' }}>
                                                <TouchableOpacity style={styles.photoBtn} onPress={pickPhoto}>
                                                    <Ionicons name="camera-outline" size={20} color={Colors.primary} />
                                                    <Text style={styles.photoBtnText}>Upload Completed Outfit Photo</Text>
                                                </TouchableOpacity>

                                                {uploading && <ActivityIndicator style={{ marginTop: 10 }} color={Colors.primary} />}

                                                <ScrollView horizontal style={{ marginTop: 10 }}>
                                                    {uploadedPhotos.map((url, i) => (
                                                        <Image key={i} source={{ uri: url }} style={styles.uploadedPreview} />
                                                    ))}
                                                </ScrollView>

                                                <TouchableOpacity
                                                    style={[styles.actionBtn, { marginTop: 15, backgroundColor: Colors.success }]}
                                                    onPress={handleCompleteOrder}
                                                >
                                                    <Text style={styles.actionBtnText}>Mark Completed</Text>
                                                </TouchableOpacity>
                                            </View>
                                        ) : null}
                                    </>
                                )}
                            </View>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        backgroundColor: Colors.white,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    greeting: { fontFamily: 'Inter-SemiBold', fontSize: 18, color: Colors.textPrimary },
    subtext: { fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.textSecondary },
    timerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.primaryLight,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
        gap: 6
    },
    timerText: { fontFamily: 'Inter-SemiBold', fontSize: 12, color: Colors.primaryDark },
    clockCard: {
        flexDirection: 'row',
        backgroundColor: Colors.white,
        margin: Spacing.md,
        padding: Spacing.lg,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: Colors.border,
        alignItems: 'center',
        justifyContent: 'space-between',
        ...Shadow.subtle
    },
    clockInfo: { flex: 1 },
    clockTitle: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: Colors.textPrimary },
    clockSub: { fontFamily: 'Inter-Regular', fontSize: 12, color: Colors.textSecondary, marginTop: 4 },
    clockBtn: {
        backgroundColor: Colors.primary,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6
    },
    clockBtnOut: { backgroundColor: Colors.danger },
    clockBtnDisabled: { backgroundColor: Colors.textSecondary, opacity: 0.5 },
    clockBtnText: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: 'white' },
    tabs: {
        flexDirection: 'row',
        paddingHorizontal: Spacing.lg,
        gap: Spacing.md,
        marginBottom: Spacing.sm
    },
    tab: {
        flex: 1,
        paddingVertical: Spacing.md,
        borderRadius: 12,
        backgroundColor: Colors.white,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.border
    },
    tabActive: { backgroundColor: Colors.primaryLight, borderColor: Colors.primaryLight },
    tabText: { fontFamily: 'Inter-Medium', fontSize: 14, color: Colors.textSecondary },
    tabTextActive: { color: Colors.primaryDark, fontFamily: 'Inter-SemiBold' },
    listContent: { padding: Spacing.md, paddingBottom: 100 },
    card: {
        backgroundColor: Colors.white,
        padding: Spacing.lg,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: Colors.border,
        marginBottom: Spacing.sm,
        ...Shadow.subtle
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    cardId: { fontFamily: 'Inter-SemiBold', fontSize: 16, color: Colors.textPrimary },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    statusText: { fontFamily: 'Inter-SemiBold', fontSize: 11 },
    cardCustomer: { fontFamily: 'Inter-Medium', fontSize: 14, color: Colors.textPrimary, marginBottom: 4 },
    cardDelivery: { fontFamily: 'Inter-Regular', fontSize: 12, color: Colors.textSecondary },
    empty: { padding: Spacing.xxl, alignItems: 'center', justifyContent: 'center', marginTop: 40 },
    emptyTitle: { fontFamily: 'Inter-SemiBold', fontSize: 16, color: Colors.textPrimary, marginTop: 12 },
    emptyDesc: { fontFamily: 'Inter-Regular', fontSize: 14, color: Colors.textSecondary, marginTop: 4, textAlign: 'center' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, height: '80%', width: '100%' },
    modalHeaderBorder: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: Colors.border },
    modalTitle: { fontFamily: 'Inter-Bold', fontSize: 18, color: Colors.textPrimary },
    closeBtn: { padding: 4 },
    modalScroll: { padding: 20 },
    sectionTitle: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: Colors.textPrimary, marginBottom: 12, marginTop: 4 },
    detailText: { fontFamily: 'Inter-Regular', fontSize: 14, color: Colors.textSecondary, marginBottom: 6 },
    divider: { height: 1, backgroundColor: Colors.border, marginVertical: 16 },
    notesContainer: { backgroundColor: '#FFFBEB', padding: 12, borderRadius: 8, marginTop: 8 },
    notesLabel: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: '#92400E' },
    notesContent: { fontFamily: 'Inter-Regular', fontSize: 13, color: '#78350F', marginTop: 4 },
    actionRow: { marginTop: 10 },
    actionBtn: { backgroundColor: Colors.primary, height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center', width: '100%' },
    actionBtnText: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: 'white' },
    photoBtn: { borderStyle: 'dashed', borderWidth: 1.5, borderColor: Colors.primary, height: 50, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
    photoBtnText: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: Colors.primary },
    uploadedPreview: { width: 80, height: 80, borderRadius: 8, marginRight: 8 },
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});

export default TailorDashboardScreen;
