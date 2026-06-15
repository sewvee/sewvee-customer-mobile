import React, { useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    RefreshControl,
    Alert,
    Platform,
    Image,
    ActivityIndicator,
    Modal,
    Animated
} from 'react-native';
import { Colors, Spacing, Typography, Shadow } from '../constants/theme';
import {
    Building2,
    ChevronRight,
    ChevronLeft,
    X,
    LogOut,
    Info,
    HelpCircle,
    Share2,
    Edit3,
    ReceiptIndianRupee,
    Scissors,
    Users,
    CalendarClock,
    CalendarCheck,
    CreditCard,
    IndianRupee,
    Wallet,
    Bell,
    Delete,
    Settings,
    CirclePile
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { useTeam } from '../context/TeamContext';
import { useToast } from '../context/ToastContext';
import { MODULES } from '../constants/permissions';
import SuccessModal from '../components/SuccessModal';
import ChangePinModal from '../components/ChangePinModal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { useDispatch, useSelector } from 'react-redux';
import { getCompanyAction } from '../store/companyOnboardSlice';
import { fetchUserProfile } from '../store/profileSlice';
import { useFocusEffect } from '@react-navigation/native';
import { fetchSubscriptionCurrentAction } from '../store/subscriptionSlice';
import dayjs from 'dayjs';
import { getCompanyLogoUri, getUserProfilePhotoUri } from '../utils/branding';

// import { logEvent } from '../config/firebase';

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const ShimmerEffect = ({ children }) => {
    const animatedValue = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.loop(
            Animated.timing(animatedValue, {
                toValue: 1,
                duration: 2500,
                useNativeDriver: true,
            })
        ).start();
    }, [animatedValue]);

    const translateX = animatedValue.interpolate({
        inputRange: [0, 1],
        outputRange: [-50, 150],
    });

    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', overflow: 'hidden' }}>
            {children}
            <Animated.View
                style={{
                    ...StyleSheet.absoluteFillObject,
                    transform: [{ translateX }],
                    flexDirection: 'row',
                }}
            >
                <LinearGradient
                    colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.7)', 'rgba(255,255,255,0)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{ flex: 1, width: 40 }}
                />
            </Animated.View>
        </View>
    );
};

const SettingsScreen = ({ navigation }) => {
    const { company, user: authUser, logout, saveCompany, hasPermission, hasViewAll } = useAuth();
    const { profileData: userProfile, loading: profileLoading } = useSelector(state => state.profile);
    const { data: companyData, loading: companyLoading } = useSelector(state => state.companyOnboard);
    const { resetTeamData, getAttendanceByUserAndMonthEnriched, users } = useTeam();
    const { showToast } = useToast();
    const dispatch = useDispatch();
    const canViewTeam = hasPermission(MODULES.TEAM_MANAGEMENT, 'view');
    const canViewPayroll = hasPermission(MODULES.PAYROLL, 'view');
    const insets = useSafeAreaInsets();

    const isStaff = authUser?.role === 'Receptionist' || authUser?.role === 'Support Staff' || authUser?.role === 'Tailor';
    const [logsModalVisible, setLogsModalVisible] = useState(false);

    const now = new Date();
    const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(now.getFullYear());

    const cycleMonth = React.useCallback((delta) => {
        const d = new Date(selectedYear, selectedMonth - 1 + delta);
        setSelectedMonth(d.getMonth() + 1);
        setSelectedYear(d.getFullYear());
    }, [selectedMonth, selectedYear]);

    const currentUserStaff = React.useMemo(() => {
        return (users || []).find((u) => u.phone === authUser?.mobile || u.email === authUser?.email);
    }, [users, authUser]);

    const enrichedLogs = React.useMemo(() => {
        if (!currentUserStaff || !getAttendanceByUserAndMonthEnriched) return [];
        return getAttendanceByUserAndMonthEnriched(currentUserStaff.id, selectedMonth, selectedYear);
    }, [currentUserStaff, selectedMonth, selectedYear, getAttendanceByUserAndMonthEnriched]);

    const stats = React.useMemo(() => {
        const present = enrichedLogs.filter(l => l.status === 'Present' || l.status === 'Half Day').length;
        const absent = enrichedLogs.filter(l => l.status === 'Absent').length;
        const leave = enrichedLogs.filter(l => l.status === 'Leave').length;
        return { present, absent, leave };
    }, [enrichedLogs]);
    const [logoutVisible, setLogoutVisible] = React.useState(false);
    const [changePinVisible, setChangePinVisible] = React.useState(false);
    const [pinSuccessVisible, setPinSuccessVisible] = React.useState(false);
    const [subscription, setSubscription] = useState(null);
    const [refreshing, setRefreshing] = useState(false);
    const [screenLoading, setScreenLoading] = useState(true);
    const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
    const premiumNavigationLockedRef = useRef(false);
    const boutiqueLogoUrl = getUserProfilePhotoUri(userProfile, authUser) || getCompanyLogoUri(companyData, company);
    const boutiqueName =
        companyData?.name ||
        company?.name ||
        userProfile?.fullName ||
        'My Boutique';

    const totalDays = subscription?.totalSubscriptionDays || 1;
    const pendingDays = subscription?.pendingDays || 0;
    const usedDays = subscription ? Math.max(0, totalDays - pendingDays) : 0;
    const progressPercentage = subscription
        ? Math.min(100, Math.max(0, (usedDays / totalDays) * 100))
        : 0;

    const formattedEndDate = subscription
        ? dayjs(subscription.endDate).isValid()
            ? dayjs(subscription.endDate).format('DD MMMM YYYY')
            : subscription.endDate || ''
        : '';

    const isMounted = useRef(true);

    useEffect(() => {
        return () => {
            isMounted.current = false;
        };
    }, []);

    useEffect(() => {
        fetchSettingsData();
    }, [fetchSettingsData]);

    const handleLogout = () => {
        // logEvent('logout_initiated');
        setLogoutVisible(true);
    };


    const getSubscriptionCurrent = React.useCallback(async () => {
        try {
            const response = await dispatch(fetchSubscriptionCurrentAction()).unwrap();
            console.log('Subscription Current:', response);

            if (response?.success) {
                setSubscription(response.data); // ✅ store data
            }
        } catch (error) {
            console.log('Failed to fetch subscription current:', error);
        }
    }, [dispatch]);

    const fetchSettingsData = React.useCallback(async ({ showLoader = false } = {}) => {
        if (showLoader) {
            setScreenLoading(true);
        }

        try {
            const [companyResponse] = await Promise.all([
                dispatch(getCompanyAction()).unwrap(),
                dispatch(fetchUserProfile()).unwrap(),
                getSubscriptionCurrent(),
            ]);

            if (companyResponse?.data && isMounted.current) {
                saveCompany(companyResponse.data);
            }
        } catch (error) {
            console.log('Failed to fetch data in Settings:', error);
        } finally {
            setHasLoadedOnce(true);
            if (showLoader) {
                setScreenLoading(false);
            }
        }
    }, [dispatch, getSubscriptionCurrent, saveCompany]);

    useFocusEffect(
        React.useCallback(() => {
            premiumNavigationLockedRef.current = false;
            const shouldShowLoader = !hasLoadedOnce;

            fetchSettingsData({ showLoader: shouldShowLoader });
        }, [fetchSettingsData, hasLoadedOnce])
    );

    const handleGoPremiumPress = React.useCallback(() => {
        if (premiumNavigationLockedRef.current) {
            return;
        }

        premiumNavigationLockedRef.current = true;
        navigation.navigate('Subscription');
    }, [navigation]);

    const handleRefresh = React.useCallback(async () => {
        setRefreshing(true);
        try {
            await fetchSettingsData();
        } finally {
            setRefreshing(false);
        }
    }, [fetchSettingsData]);

    const SettingItem = ({ icon: Icon, title, value, onPress, onLongPress, delayLongPress, isLast = false, color = Colors.primary, iconBoxSize }) => (
        <TouchableOpacity
            style={[styles.item, isLast && styles.itemLast]}
            onPress={onPress}
            onLongPress={onLongPress}
            delayLongPress={delayLongPress}
            activeOpacity={0.6}
        >
            <View style={styles.itemLeft}>
                <View style={[styles.iconBox, iconBoxSize && { width: iconBoxSize, height: iconBoxSize }, { backgroundColor: Colors.lightBlue }]}>
                    <Icon size={iconBoxSize === 48 ? 24 : 22} color={Colors.primary} />
                </View>
                <View style={styles.itemTextWrap}>
                    <Text style={styles.itemTitle}>{title}</Text>
                    {value && <Text style={styles.itemValue} numberOfLines={1}>{value}</Text>}
                </View>
            </View>
            <ChevronRight size={20} color={Colors.textSecondary} />
        </TouchableOpacity>
    );

    const isInitialLoading =
        !hasLoadedOnce &&
        (screenLoading || profileLoading || companyLoading);

    return (
        <View style={styles.container}>
            <View style={[styles.header, { paddingTop: insets.top }]}>
                <Text style={styles.headerTitle}>Settings</Text>
            </View>

            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: 100 }}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
                }
            >
                {isInitialLoading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={Colors.primary} />
                        <Text style={styles.loadingText}>Loading profile...</Text>
                    </View>
                ) : (
                    <>
                        <View style={[styles.section, { marginTop: 16 }]}>
                            <LinearGradient
                                colors={['#ffffff', '#E0E7FF']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 0, y: 1 }}
                                style={styles.centeredProfileCard}
                            >
                                <View style={styles.centeredLogoContainer}>
                                    <View style={styles.centeredLogoPlaceholder}>
                                        {boutiqueLogoUrl ? (
                                            <Image
                                                source={{ uri: boutiqueLogoUrl }}
                                                style={styles.centeredProfileImage}
                                            />
                                        ) : (
                                            <Text style={styles.centeredLogoText}>
                                                {boutiqueName?.substring(0, 2).toUpperCase() || 'BT'}
                                            </Text>
                                        )}
                                    </View>
                                </View>
                                
                                <Text style={styles.centeredProfileName} numberOfLines={1}>
                                    {boutiqueName}
                                </Text>
                                <Text style={styles.centeredProfileMobile}>
                                    {userProfile?.mobileNo || companyData?.phone || company?.phone || authUser?.mobile || 'No Mobile'}
                                </Text>
                                {(userProfile?.email || companyData?.email || company?.email) && (
                                    <Text style={styles.centeredProfileEmail} numberOfLines={1}>
                                        {userProfile?.email || companyData?.email || company.email}
                                    </Text>
                                )}
                                
                                <TouchableOpacity
                                    style={styles.centeredEditProfileBtn}
                                    onPress={() => navigation.navigate('EditProfile')}
                                >
                                    <Text style={styles.centeredEditProfileText}>Edit Profile</Text>
                                </TouchableOpacity>
                            </LinearGradient>
                        </View>
                            {!isStaff ? (
                            <>
                                <View style={styles.section}>
                                    <View style={[styles.card, { padding: Spacing.md, flexDirection: 'row', alignItems: 'center' }]}>
                                        <View style={{ flex: 1, marginLeft: 10 }}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
 
                                                <Image
                                                    source={require('../assets/profile_king.png')}
                                                    style={{ marginRight: 12 }}
                                                    resizeMode="contain"
                                                />
 
                                                <View>
                                                    <Text style={styles.title}>Current Plan</Text>
 
                                                    <Text style={styles.plan}>
                                                        {subscription?.plan === 'TRIAL'
                                                            ? '14-days Free Trial'
                                                            : subscription?.plan
                                                                ? subscription.plan.charAt(0).toUpperCase() + subscription.plan.slice(1).toLowerCase()
                                                                : '---'}
                                                    </Text>
 
                                                    {/* Progress Bar */}
                                                    <View style={styles.progressContainer}>
                                                        <View style={styles.progressBar}>
                                                            <View
                                                                style={[
                                                                    styles.progressFill,
                                                                    {
                                                                        width: `${progressPercentage}%`,
                                                                        backgroundColor: Colors.primary,
                                                                    }
                                                                ]}
                                                            />
                                                        </View>
 
                                                        <Text style={styles.progressText}>
                                                            {usedDays}/{totalDays}
                                                        </Text>
                                                    </View>
                                                </View>
                                            </View>
 
                                            <View>
                                                <View style={styles.divider} />
 
                                                {/* Footer */}
                                                <View style={styles.footer}>
                                                    <Text style={styles.footerText}>
                                                        Plan ends on {formattedEndDate}
                                                    </Text>
 
                                                    <TouchableOpacity
                                                        onPress={handleGoPremiumPress}
                                                        style={{ flexDirection: 'row', alignItems: 'center' }}
                                                    >
                                                        <ShimmerEffect>
                                                            <Text style={[styles.link, { fontSize: 14, color: Colors.primary }]}>Go Premium </Text>
                                                            <ChevronRight size={22} color={Colors.primary} />
                                                        </ShimmerEffect>
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                        </View>
                                    </View>
                                </View>

                                <View style={styles.section}>
                                    <Text style={styles.sectionLabel}>Business</Text>
                                    <View style={styles.card}>
                                        <SettingItem
                                            icon={Building2}
                                            title="Business Details"
                                            value={companyData?.address || company?.address || 'Set Address'}
                                            onPress={() => navigation.navigate('EditBusinessProfile')}
                                        />
                                        <SettingItem
                                            icon={ReceiptIndianRupee}
                                            title="Order Preferences"
                                            value="Terms, Signature & more"
                                            onPress={() => navigation.navigate('BillSettings')}
                                            isLast={true}
                                        />
                                    </View>
                                </View>

                                <View style={styles.section}>
                                    <Text style={styles.sectionLabel}>Catalog</Text>
                                    <View style={styles.card}>
                                        <SettingItem
                                            icon={Scissors}
                                            title="Outfit Catalog"
                                            value="Add, Edit, Types"
                                            onPress={() => navigation.navigate('ManageOutfits')}
                                            color="#EC4899"
                                            isLast={true}
                                        />
                                    </View>
                                </View>

                                {/* <View style={styles.section}>
                                    <Text style={styles.sectionLabel}>Team</Text>
                                    <View style={styles.card}>
                                        <SettingItem
                                            icon={Users}
                                            title="Team & Roles"
                                            value="Staff, Roles & Permissions"
                                            onPress={() => navigation.navigate('UsersList')}
                                        />
                                        <SettingItem
                                            icon={CalendarClock}
                                            title="Attendance"
                                            value="Clock-in, Reports"
                                            onPress={() => navigation.navigate('Attendance')}
                                        />
                                        <SettingItem
                                            icon={CalendarCheck}
                                            title="Leave Requests"
                                            value="Apply for leave"
                                            onPress={() => navigation.navigate('LeaveRequest')}
                                        />
                                        {hasViewAll && hasViewAll('Team Management') && (
                                            <SettingItem
                                                icon={CalendarCheck}
                                                title="Leave Approvals"
                                                value="Review pending requests"
                                                onPress={() => navigation.navigate('LeaveApproval')}
                                            />
                                        )}
                                        <SettingItem
                                            icon={Wallet}
                                            title="Payroll"
                                            value="Salary, Payouts"
                                            onPress={() => navigation.navigate('Payroll')}
                                            isLast={true}
                                        />
                                    </View>
                                </View> */}

                                <View style={styles.section}>
                                    <Text style={styles.sectionLabel}>Revenue</Text>
                                    <View style={styles.card}>
                                        <SettingItem
                                            icon={IndianRupee}
                                            title="Customer Payments"
                                            value="View & Manage Payments"
                                            onPress={() =>
                                                navigation.navigate('Payments', {
                                                    sourceScreen: 'Settings',
                                                })
                                            }
                                            color={Colors.success}
                                        />
                                        <SettingItem
                                            icon={Bell}
                                            title="Notifications"
                                            value="View alerts & updates"
                                            onPress={() => navigation.navigate('NotificationsScreen')}
                                            color={Colors.success}
                                        />
                                        <SettingItem
                                            icon={CirclePile}
                                            title="Inventory"
                                            value="View & updates"
                                            onPress={() => navigation.navigate('InventoryScreen')}
                                            color={Colors.success}
                                            isLast={true}
                                        />
                                    </View>
                                </View>
                            </>
                        ) : (
                            <>
                                <View style={styles.section}>
                                    <Text style={styles.sectionLabel}>My Work Logs</Text>
                                    <View style={styles.card}>
                                        <SettingItem
                                            icon={CalendarClock}
                                            title="Attendance Logs"
                                            value="Clock-in & out daily history"
                                            onPress={() => setLogsModalVisible(true)}
                                            isLast={true}
                                        />
                                    </View>
                                </View>

                                <View style={styles.section}>
                                    <Text style={styles.sectionLabel}>Stats Summary</Text>
                                    <View style={[styles.card, { padding: Spacing.md, gap: Spacing.md }]}>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Text style={{ fontFamily: 'Inter-Medium', fontSize: 14, color: Colors.textSecondary }}>Present Days</Text>
                                            <Text style={{ fontFamily: 'Inter-Bold', fontSize: 16, color: '#059669' }}>{stats.present}</Text>
                                        </View>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Text style={{ fontFamily: 'Inter-Medium', fontSize: 14, color: Colors.textSecondary }}>Absent Days</Text>
                                            <Text style={{ fontFamily: 'Inter-Bold', fontSize: 16, color: Colors.danger }}>{stats.absent}</Text>
                                        </View>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Text style={{ fontFamily: 'Inter-Medium', fontSize: 14, color: Colors.textSecondary }}>Leaves Taken</Text>
                                            <Text style={{ fontFamily: 'Inter-Bold', fontSize: 16, color: Colors.primary }}>{stats.leave}</Text>
                                        </View>
                                    </View>
                                </View>
                            </>
                        )}





                        <View style={styles.section}>
                            <Text style={styles.sectionLabel}>App</Text>
                            <View style={styles.card}>
                                <SettingItem
                                    icon={Share2}
                                    title="Share App"
                                    color="#8B5CF6"
                                    onPress={() => navigation.navigate('ShareApp')}
                                />
                                <SettingItem
                                    icon={HelpCircle}
                                    title="Help & Support"
                                    color="#F59E0B"
                                    onPress={() => navigation.navigate('HelpSupport')}
                                />
                                <SettingItem
                                    icon={Delete}
                                    title="Delete Account"
                                    color="#F59E0B"
                                    onPress={() => navigation.navigate('DeleteAccountScreen')}
                                />
                                <SettingItem
                                    icon={Info}
                                    title="About Sewvee"
                                    color="#6B7280"
                                    value="v7.0.0"
                                    onPress={() => navigation.navigate('About')}
                                    // onLongPress={() => {
                                    //     Alert.alert(
                                    //         'Reset Demo Data',
                                    //         'Clear team data and re-seed mock data?',
                                    //         [
                                    //             { text: 'Cancel', style: 'cancel' },
                                    //             {
                                    //                 text: 'Reset',
                                    //                 style: 'destructive',
                                    //                 onPress: async () => {
                                    //                     await resetTeamData();
                                    //                     showToast('Demo data reset. Please close and reopen the app to see changes.');
                                    //                 },
                                    //             },
                                    //         ]
                                    //     );
                                    // }}
                                    // delayLongPress={2000}
                                    // isLast={true}
                                />
                            </View>
                        </View>

                        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                            <LogOut size={20} color={Colors.danger} />
                            <Text style={styles.logoutText}>Logout</Text>
                        </TouchableOpacity>

                        <View style={styles.footer1}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                                <Text style={[styles.footerText, { fontStyle: 'italic', marginRight: 4 }]}>Handcrafted for</Text>
                                <Text style={{ fontSize: 16, color: Colors.primary, fontWeight: 'bold', fontFamily: Platform.OS === 'ios' ? 'Didot-Italic' : 'serif' }}>Boutiques</Text>
                            </View>
                            <TouchableOpacity onLongPress={() => navigation.navigate('DevSettings')} delayLongPress={2000} activeOpacity={0.8}>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <Text style={{ fontSize: 12, color: Colors.textSecondary, opacity: 0.7 }}>Powered by</Text>
                                    <Text style={{ fontSize: 12, color: Colors.textPrimary, marginLeft: 4, letterSpacing: 1, fontFamily: 'Inter-Bold' }}>SEWVEE</Text>
                                </View>
                            </TouchableOpacity>
                        </View>

                        <View style={{ height: 40 }} />
                    </>
                )}

                <SuccessModal
                    visible={logoutVisible}
                    onClose={() => setLogoutVisible(false)}
                    title="Logout"
                    description="Are you sure you want to logout? You will need to log in again to access your data."
                    type="warning"
                    confirmText="Logout"
                    onConfirm={logout}
                />

                <ChangePinModal
                    visible={changePinVisible}
                    onClose={() => setChangePinVisible(false)}
                    onSuccess={() => {
                        setChangePinVisible(false);
                        setTimeout(() => setPinSuccessVisible(true), 500);
                    }}
                />

                <SuccessModal
                    visible={pinSuccessVisible}
                    onClose={() => setPinSuccessVisible(false)}
                    title="PIN Updated"
                    description="Your security PIN has been updated successfully."
                    type="success"
                />

                <Modal
                    visible={logsModalVisible}
                    animationType="slide"
                    transparent={true}
                    onRequestClose={() => setLogsModalVisible(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Attendance History</Text>
                                <TouchableOpacity
                                    style={styles.closeBtn}
                                    onPress={() => setLogsModalVisible(false)}
                                >
                                    <X size={20} color={Colors.textPrimary} />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.modalMonthSelector}>
                                <TouchableOpacity onPress={() => cycleMonth(-1)} style={styles.monthBtn}>
                                    <ChevronLeft size={20} color={Colors.textPrimary} />
                                </TouchableOpacity>
                                <Text style={styles.monthLabel}>{MONTH_NAMES[selectedMonth - 1]} {selectedYear}</Text>
                                <TouchableOpacity onPress={() => cycleMonth(1)} style={styles.monthBtn}>
                                    <ChevronRight size={20} color={Colors.textPrimary} />
                                </TouchableOpacity>
                            </View>

                            {/* Summary Card */}
                            <View style={styles.modalStatsGrid}>
                                <View style={[styles.modalStatCard, { borderColor: Colors.success + '30' }]}>
                                    <Text style={[styles.modalStatValue, { color: Colors.success }]}>{stats.present}</Text>
                                    <Text style={styles.modalStatLabel}>Present</Text>
                                </View>
                                <View style={[styles.modalStatCard, { borderColor: Colors.danger + '30' }]}>
                                    <Text style={[styles.modalStatValue, { color: Colors.danger }]}>{stats.absent}</Text>
                                    <Text style={styles.modalStatLabel}>Absent</Text>
                                </View>
                                <View style={[styles.modalStatCard, { borderColor: Colors.primary + '30' }]}>
                                    <Text style={[styles.modalStatValue, { color: Colors.primary }]}>{stats.leave}</Text>
                                    <Text style={styles.modalStatLabel}>Leave</Text>
                                </View>
                            </View>

                            <ScrollView
                                contentContainerStyle={styles.modalLogsScroll}
                                showsVerticalScrollIndicator={false}
                            >
                                {enrichedLogs.length > 0 ? (
                                    enrichedLogs
                                        .sort((a, b) => (a.date > b.date ? 1 : -1))
                                        .map((log, index) => {
                                            const isPresent = log.status === 'Present' || log.status === 'Half Day';
                                            const isLeave = log.status === 'Leave';
                                            const isAbsent = log.status === 'Absent';

                                            let badgeBg = '#E2E8F0';
                                            let badgeText = '#475569';
                                            if (log.status === 'Present') {
                                                badgeBg = Colors.success + '15';
                                                badgeText = Colors.success;
                                            } else if (log.status === 'Half Day') {
                                                badgeBg = '#FEF3C7';
                                                badgeText = '#D97706';
                                            } else if (isLeave) {
                                                badgeBg = Colors.primaryLight + '50';
                                                badgeText = Colors.primaryDark;
                                            } else if (isAbsent) {
                                                badgeBg = Colors.danger + '15';
                                                badgeText = Colors.danger;
                                            }

                                            const logDate = log.date ? dayjs(log.date) : null;
                                            const formattedDate = logDate?.isValid() ? logDate.format('MMM DD, YYYY') : log.date;
                                            const dayOfWeek = logDate?.isValid() ? logDate.format('ddd') : '';

                                            return (
                                                <View key={log.id || index} style={styles.logRow}>
                                                    <View style={styles.logRowLeft}>
                                                        <Text style={styles.logRowDate}>{formattedDate}</Text>
                                                        {dayOfWeek ? <Text style={styles.logRowDay}>{dayOfWeek}</Text> : null}
                                                    </View>

                                                    <View style={styles.logRowRight}>
                                                        {isPresent && (log.checkIn || log.checkOut) ? (
                                                            <View style={styles.logTimeCol}>
                                                                <Text style={styles.logRowTime}>
                                                                    {log.checkIn || '—'} - {log.checkOut || 'Active'}
                                                                </Text>
                                                                {log.totalHours ? (
                                                                    <Text style={styles.logHoursText}>
                                                                        {log.totalHours} hrs
                                                                    </Text>
                                                                ) : null}
                                                            </View>
                                                        ) : null}
                                                        <View style={[styles.statusBadge, { backgroundColor: badgeBg }]}>
                                                            <Text style={[styles.statusBadgeText, { color: badgeText }]}>
                                                                {log.status}
                                                            </Text>
                                                        </View>
                                                    </View>
                                                </View>
                                            );
                                        })
                                ) : (
                                    <View style={styles.emptyState}>
                                        <Text style={styles.emptyStateText}>No logs found for this period</Text>
                                    </View>
                                )}
                            </ScrollView>
                        </View>
                    </View>
                </Modal>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    header: {
        paddingHorizontal: Spacing.md,
        paddingBottom: Spacing.sm,
        backgroundColor: Colors.white,
    },
    headerTitle: {
        fontSize: 20,
        fontFamily: 'Inter-Bold',
        color: Colors.textPrimary,
        fontWeight: '700',
    },
    loadingContainer: {
        flex: 1,
        minHeight: 320,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: Spacing.lg,
    },
    loadingText: {
        marginTop: Spacing.md,
        fontFamily: 'Inter-Medium',
        fontSize: 14,
        color: Colors.textSecondary,
    },
    profileSection: {
        padding: Spacing.md,
        backgroundColor: Colors.white,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    profileCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: Spacing.md,
        backgroundColor: Colors.background,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    logoContainer: {
        position: 'relative',
    },
    logoPlaceholder: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: Colors.lightBlue,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    profileImage: {
        width: 70,
        height: 70,
        borderRadius: 35,
    },
    logoText: {
        fontSize: 24,
        fontFamily: 'Inter-Bold',
        color: Colors.primary,
        fontWeight: '700',
    },
    editBadge: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        backgroundColor: Colors.primary,
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: Colors.white,
    },
    profileInfo: {
        flex: 1,
        marginLeft: Spacing.md,
    },
    userMobile: {
        fontFamily: 'Inter-Medium',
        fontSize: 14,
        color: '#4c5665',
        marginTop: 5,
        fontWeight: '600',
    },
    userEmail: {
        fontFamily: 'Inter-Medium',
        fontSize: 12,
        color: Colors.textSecondary,
        marginTop: 3,
    },
    userAddress: {
        fontFamily: 'Inter-Medium',
        fontSize: 12,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    editProfileBtn: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: Colors.white,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    editProfileText: {
        fontFamily: 'Inter-Medium',
        fontSize: 13,
        color: Colors.primary,
    },
    centeredProfileCard: {
        alignItems: 'center',
        paddingVertical: 28,
        paddingHorizontal: 20,
        backgroundColor: Colors.white,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: '#E0E7FF',
        ...Shadow.subtle,
        marginBottom: 8,
    },
    centeredLogoContainer: {
        marginBottom: 16,
    },
    centeredLogoPlaceholder: {
        width: 88,
        height: 88,
        borderRadius: 44,
        backgroundColor: Colors.white,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 4,
        borderColor: '#EEF2FF',
        ...Shadow.subtle,
    },
    centeredProfileImage: {
        width: 80,
        height: 80,
        borderRadius: 40,
    },
    centeredLogoText: {
        fontSize: 32,
        fontFamily: 'Inter-Bold',
        color: Colors.primary,
    },
    centeredProfileName: {
        fontFamily: 'Inter-Bold',
        fontSize: 22,
        color: Colors.textPrimary,
        marginBottom: 6,
        textAlign: 'center',
    },
    centeredProfileMobile: {
        fontFamily: 'Inter-Medium',
        fontSize: 15,
        color: '#4B5563',
        marginBottom: 4,
        textAlign: 'center',
    },
    centeredProfileEmail: {
        fontFamily: 'Inter-Medium',
        fontSize: 14,
        color: '#6B7280',
        marginBottom: 20,
        textAlign: 'center',
    },
    centeredEditProfileBtn: {
        paddingHorizontal: 24,
        paddingVertical: 10,
        borderRadius: 24,
        backgroundColor: Colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        ...Shadow.subtle,
    },
    centeredEditProfileText: {
        fontFamily: 'Inter-Bold',
        fontSize: 14,
        color: Colors.white,
    },
    section: {
        // padding: Spacing.md,
        paddingLeft: Spacing.md,
        paddingRight: Spacing.md,
        marginTop: 10,
        marginBottom: 10

    },
    sectionLabel: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 13,
        color: Colors.textPrimary,
        marginBottom: 10,
        marginLeft: 4,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    card: {
        backgroundColor: Colors.card,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: Colors.border,
        overflow: 'hidden',
        ...Shadow.subtle,
    },
    teamSectionTint: {
        backgroundColor: (Colors.primaryLight || '#E0F2FE') + '25',
        marginHorizontal: -Spacing.md,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.md,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: Colors.primary + '20',
    },
    teamCard: {
        ...Shadow.medium,
        borderWidth: 1.5,
        borderColor: Colors.primary + '25',
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: Spacing.md,
        paddingVertical: Spacing.md + 4,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    itemLast: {
        borderBottomWidth: 0,
    },
    itemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        flex: 1,
    },
    itemTextWrap: {
        flex: 1,
        justifyContent: 'center',
    },
    iconBox: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    itemTitle: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 15,
        color: Colors.textPrimary,
    },
    itemValue: {
        fontFamily: 'Inter-Medium',
        fontSize: 13,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    logoutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        margin: Spacing.md,
        marginTop: Spacing.lg,
        height: 54,
        borderRadius: 16,
        backgroundColor: Colors.white,
        borderWidth: 1,
        borderColor: Colors.danger + '30',
    },
    logoutText: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 16,
        color: Colors.danger,
    },
    footer1: {
        alignItems: 'center',
        marginTop: Spacing.xl,
        paddingBottom: Spacing.xl,
    },
    footerText: {
        fontFamily: 'Inter-Medium',
        fontSize: 13,
        color: Colors.textSecondary,
    },
    versionText: {
        fontFamily: 'Inter-Medium',
        fontSize: 11,
        color: Colors.textSecondary,
        marginTop: 4,
        opacity: 0.7,
    },

    card1: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        padding: 14,
        borderRadius: 14,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        // elevation: 3,
    },
    icon: {
        fontSize: 22,
    },

    title: {
        fontSize: 13,
        color: Colors.textSecondary,
    },

    plan: {
        fontSize: 18,
        fontFamily: 'Inter-Bold',
        fontWeight: '700',
        marginVertical: 4,
        color: Colors.textPrimary,
    },

    progressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 6,
    },

    progressBar: {
        height: 6,
        width: '75%', // 12/14 approx
        backgroundColor: '#E5E7EB',
        borderRadius: 10,
        // marginRight: 8,
    },

    progressText: {
        fontSize: 12,
        color: '#6B7280',
        paddingLeft: 10
    },
    progressFill: {
        height: '100%',
        borderRadius: 10,
    },

    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        // marginTop: 8,
    },
    link: {
        fontSize: 12,
        color: '#111827',
        fontWeight: '600',
    },
    divider: { height: 1, backgroundColor: Colors.border, marginVertical: 12 },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: Colors.white,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        height: '82%',
        paddingBottom: Platform.OS === 'ios' ? 34 : 24,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md + 4,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    modalTitle: {
        fontFamily: 'Inter-Bold',
        fontSize: 18,
        color: Colors.textPrimary,
    },
    closeBtn: {
        padding: Spacing.xs,
    },
    modalMonthSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        backgroundColor: Colors.background,
    },
    monthLabel: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 16,
        color: Colors.textPrimary,
    },
    monthBtn: {
        padding: Spacing.sm,
        borderRadius: 8,
        backgroundColor: Colors.white,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    modalStatsGrid: {
        flexDirection: 'row',
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        gap: Spacing.md,
    },
    modalStatCard: {
        flex: 1,
        backgroundColor: Colors.white,
        borderRadius: 12,
        padding: Spacing.md,
        alignItems: 'center',
        borderWidth: 1.5,
        ...Shadow.subtle,
    },
    modalStatValue: {
        fontFamily: 'Inter-Bold',
        fontSize: 20,
    },
    modalStatLabel: {
        fontFamily: 'Inter-Medium',
        fontSize: 12,
        color: Colors.textSecondary,
        marginTop: 4,
    },
    modalLogsScroll: {
        paddingHorizontal: Spacing.lg,
        paddingBottom: Spacing.xl,
    },
    logRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    logRowLeft: {
        flex: 1.2,
    },
    logRowDate: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 14,
        color: Colors.textPrimary,
    },
    logRowDay: {
        fontFamily: 'Inter-Regular',
        fontSize: 12,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    logRowRight: {
        flex: 2,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: Spacing.sm,
    },
    logTimeCol: {
        alignItems: 'flex-end',
    },
    logRowTime: {
        fontFamily: 'Inter-Medium',
        fontSize: 13,
        color: Colors.textPrimary,
    },
    logHoursText: {
        fontFamily: 'Inter-Regular',
        fontSize: 11,
        color: Colors.primary,
        marginTop: 2,
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
        minWidth: 72,
        alignItems: 'center',
    },
    statusBadgeText: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 11,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing.xxl * 1.5,
    },
    emptyStateText: {
        fontFamily: 'Inter-Medium',
        fontSize: 14,
        color: Colors.textSecondary,
    },
});

export default SettingsScreen;
