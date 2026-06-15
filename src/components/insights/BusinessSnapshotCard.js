import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import InsightsCard from './InsightsCard';

const Icon = (props) => <MaterialCommunityIcons name="view-dashboard" {...props} />;

const BusinessSnapshotCard = ({ data }) => {
    if (!data) return null;
    const {
        revenueToday,
        ordersToday,
        collectionsReceived,
        pendingPayments,
        repeatCustomers,
        growthVsYesterday,
    } = data;

    return (
        <InsightsCard title="Business Snapshot" icon={Icon}>
            <View style={styles.grid}>
                <View style={styles.cell}>
                    <Text style={styles.cellLabel}>Revenue Today</Text>
                    <Text style={styles.cellValue}>₹{(revenueToday || 0).toLocaleString()}</Text>
                    <Text style={[styles.cellSub, growthVsYesterday >= 0 ? styles.positive : styles.negative]}>
                        {growthVsYesterday >= 0 ? '▲' : '▼'} {Math.abs(growthVsYesterday || 0).toFixed(1)}% vs Yesterday
                    </Text>
                </View>
                <View style={styles.cell}>
                    <Text style={styles.cellLabel}>Orders Today</Text>
                    <Text style={styles.cellValue}>{ordersToday || 0} Orders</Text>
                </View>
                <View style={styles.cell}>
                    <Text style={styles.cellLabel}>Collections Received</Text>
                    <Text style={[styles.cellValue, { color: '#5B43EE' }]}>₹{(collectionsReceived || 0).toLocaleString()}</Text>
                </View>
                <View style={styles.cell}>
                    <Text style={styles.cellLabel}>Pending Payments</Text>
                    <Text style={styles.cellValue}>₹{(pendingPayments || 0).toLocaleString()}</Text>
                </View>
                <View style={styles.cell}>
                    <Text style={styles.cellLabel}>Repeat Customers</Text>
                    <Text style={styles.cellValue}>{repeatCustomers || 0} Customers</Text>
                </View>
            </View>
        </InsightsCard>
    );
};

const styles = StyleSheet.create({
    grid: { gap: 12 },
    cell: { marginBottom: 4 },
    cellLabel: { fontSize: 12, color: '#64748B' },
    cellValue: { fontSize: 18, fontWeight: 'bold', color: '#0F172A', marginTop: 2 },
    cellSub: { fontSize: 11, marginTop: 2 },
    positive: { color: '#10B981' },
    negative: { color: '#EF4444' },
});

export default BusinessSnapshotCard;
