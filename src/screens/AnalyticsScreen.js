import React, { useMemo, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    StatusBar,
    ActivityIndicator,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useData } from '../context/DataContext';
import { useTeam } from '../context/TeamContext';
import {
    getBusinessSnapshot,
    getRevenuePerformance,
    getCashflow,
    getOrderPipeline,
    getCustomerInsights,
    getTeamProductivity,
    getAttendanceAnalytics,
    getPayrollInsights,
    getProductPerformance,
    getAIInsights,
    getDateRange,
} from '../services/analyticsService';
import {
    BusinessSnapshotCard,
    RevenuePerformanceSection,
    CashflowCard,
    OrderPipelineCard,
    CustomerInsightsSection,
    TeamProductivityTable,
    AttendanceAnalyticsTable,
    PayrollInsightsCard,
    ProductPerformanceTable,
    AIInsightsCard,
    ReportExportModal,
} from '../components/insights';
import {
    generateRevenueReportExcel,
    generateOrdersReportExcel,
    generateAttendanceReportExcel,
    generatePayrollReportExcel,
} from '../services/reportExportService';

const Colors = {
    primary: '#5B43EE',
    success: '#10B981',
    danger: '#EF4444',
    background: '#F8FAFC',
    white: '#FFFFFF',
    textPrimary: '#0F172A',
    textSecondary: '#64748B',
};

const AnalyticsScreen = () => {
    const insets = useSafeAreaInsets();
    const [timeFilter, setTimeFilter] = useState('today');
    const [exportModalVisible, setExportModalVisible] = useState(false);

    const { orders, customers, payments, loading: dataLoading } = useData();
    const {
        users,
        attendance,
        payrollRecords,
        paymentTransactions,
        loading: teamLoading,
    } = useTeam();

    const dateRange = useMemo(() => getDateRange(timeFilter), [timeFilter]);
    const isLoading = dataLoading || teamLoading;

    const snapshot = useMemo(
        () => getBusinessSnapshot(orders, payments),
        [orders, payments]
    );
    const revenuePerf = useMemo(
        () => getRevenuePerformance(orders, payments, dateRange),
        [orders, payments, dateRange]
    );
    const cashflow = useMemo(
        () => getCashflow(payments, payrollRecords, paymentTransactions, dateRange),
        [payments, payrollRecords, paymentTransactions, dateRange]
    );
    const orderPipeline = useMemo(
        () => getOrderPipeline(orders),
        [orders]
    );
    const customerInsights = useMemo(
        () => getCustomerInsights(customers, orders),
        [customers, orders]
    );
    const teamProductivity = useMemo(
        () => getTeamProductivity(orders, users),
        [orders, users]
    );
    const attendanceAnalytics = useMemo(
        () => getAttendanceAnalytics(attendance, users, dateRange),
        [attendance, users, dateRange]
    );
    const payrollInsights = useMemo(
        () => getPayrollInsights(payrollRecords, paymentTransactions, orders, dateRange),
        [payrollRecords, paymentTransactions, orders, dateRange]
    );
    const productPerf = useMemo(
        () => getProductPerformance(orders),
        [orders]
    );
    const aiInsights = useMemo(
        () => getAIInsights({
            revenuePerformance: revenuePerf,
            orderPipeline,
            customerInsights,
            teamProductivity,
            productPerformance: productPerf,
            payrollInsights,
            orders,
        }),
        [revenuePerf, orderPipeline, customerInsights, teamProductivity, productPerf, payrollInsights, orders]
    );

    const handleExportReport = async (reportType, format) => {
        if (format === 'excel') {
            if (reportType === 'revenue') await generateRevenueReportExcel(revenuePerf, dateRange);
            else if (reportType === 'orders') await generateOrdersReportExcel(orders);
            else if (reportType === 'attendance') await generateAttendanceReportExcel(attendanceAnalytics);
            else if (reportType === 'payroll') await generatePayrollReportExcel(payrollRecords, users);
            else throw new Error('Unknown report type');
        }
    };

    if (isLoading) {
        return (
            <View style={[styles.container, styles.centered]}>
                <StatusBar backgroundColor={Colors.background} barStyle="dark-content" />
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.loadingText}>Loading insights...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar backgroundColor={Colors.background} barStyle="dark-content" />
            <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
                <View style={styles.headerRow}>
                    <View>
                        <Text style={styles.headerTitle}>Insights</Text>
                        <Text style={styles.headerSubtitle}>
                            Business dashboard & performance
                        </Text>
                    </View>
                    <TouchableOpacity
                        style={styles.exportBtn}
                        onPress={() => setExportModalVisible(true)}
                    >
                        <MaterialCommunityIcons name="export" size={20} color="#5B43EE" />
                        <Text style={styles.exportBtnText}>Export</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <ReportExportModal
                visible={exportModalVisible}
                onClose={() => setExportModalVisible(false)}
                onExport={handleExportReport}
            />

            <View style={styles.filterContainer}>
                {['today', 'week', 'month', 'all'].map((item) => (
                    <TouchableOpacity
                        key={item}
                        style={[
                            styles.filterBtn,
                            timeFilter === item && styles.activeFilter,
                        ]}
                        onPress={() => setTimeFilter(item)}
                    >
                        <Text
                            style={[
                                styles.filterText,
                                timeFilter === item && styles.activeFilterText,
                            ]}
                        >
                            {item === 'all'
                                ? 'All Time'
                                : item.charAt(0).toUpperCase() + item.slice(1)}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
                <BusinessSnapshotCard data={snapshot} />
                <RevenuePerformanceSection data={revenuePerf} />
                <CashflowCard data={cashflow} />
                <OrderPipelineCard data={orderPipeline} />
                <CustomerInsightsSection data={customerInsights} />
                <TeamProductivityTable data={teamProductivity} />
                <AttendanceAnalyticsTable data={attendanceAnalytics} />
                <PayrollInsightsCard data={payrollInsights} />
                <ProductPerformanceTable data={productPerf} />
                <AIInsightsCard insights={aiInsights} />
                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
};

export default AnalyticsScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    centered: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: Colors.textSecondary,
    },
    header: {
        backgroundColor: Colors.white,
        paddingHorizontal: 20,
        paddingBottom: 20,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: Colors.textPrimary,
    },
    headerSubtitle: {
        fontSize: 14,
        color: Colors.textSecondary,
        marginTop: 4,
    },
    exportBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 12,
        backgroundColor: '#ECFDF5',
        borderRadius: 10,
        gap: 6,
    },
    exportBtnText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#5B43EE',
    },
    filterContainer: {
        flexDirection: 'row',
        backgroundColor: '#E2E8F0',
        margin: 20,
        borderRadius: 12,
        padding: 4,
    },
    filterBtn: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        borderRadius: 10,
    },
    activeFilter: {
        backgroundColor: Colors.white,
    },
    filterText: {
        fontSize: 13,
        color: Colors.textSecondary,
        fontWeight: '600',
    },
    activeFilterText: {
        color: Colors.primary,
    },
});
