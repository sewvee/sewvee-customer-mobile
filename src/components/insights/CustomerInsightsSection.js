import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import InsightsCard from './InsightsCard';
import TopCustomersBarChart from './TopCustomersBarChart';

const Icon = (p) => <MaterialCommunityIcons name="account-group" {...p} />;

const CustomerInsightsSection = ({ data }) => {
    if (!data) return null;
    const { totalCustomers, newCustomersThisMonth, repeatCustomers, repeatRate, topCustomers, insight } = data;

    return (
        <InsightsCard title="Customer Insights" icon={Icon}>
            <TopCustomersBarChart data={data} />
            <View style={styles.metrics}>
                <View style={styles.metric}>
                    <Text style={styles.metricLabel}>Total Customers</Text>
                    <Text style={styles.metricValue}>{totalCustomers || 0}</Text>
                </View>
                <View style={styles.metric}>
                    <Text style={styles.metricLabel}>New (This Month)</Text>
                    <Text style={styles.metricValue}>{newCustomersThisMonth || 0}</Text>
                </View>
                <View style={styles.metric}>
                    <Text style={styles.metricLabel}>Repeat Customers</Text>
                    <Text style={styles.metricValue}>{repeatCustomers || 0}</Text>
                </View>
                <View style={styles.metric}>
                    <Text style={styles.metricLabel}>Repeat Rate</Text>
                    <Text style={styles.metricValue}>{repeatRate || 0}%</Text>
                </View>
            </View>
            {(topCustomers || []).length > 0 && (
                <View style={styles.table}>
                    <View style={styles.tableHeader}>
                        <Text style={[styles.th, { flex: 2 }]}>Customer</Text>
                        <Text style={[styles.th, { width: 60 }]}>Orders</Text>
                        <Text style={[styles.th, { width: 80 }]}>Revenue</Text>
                    </View>
                    {topCustomers.slice(0, 5).map((c, i) => (
                        <View key={i} style={styles.tableRow}>
                            <Text style={[styles.td, { flex: 2 }]} numberOfLines={1}>{c.customerName}</Text>
                            <Text style={[styles.td, { width: 60 }]}>{c.orders}</Text>
                            <Text style={[styles.td, { width: 80 }]}>₹{(c.revenue || 0).toLocaleString()}</Text>
                        </View>
                    ))}
                </View>
            )}
            {insight && <Text style={styles.insight}>{insight}</Text>}
        </InsightsCard>
    );
};

const styles = StyleSheet.create({
    metrics: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16, gap: 16 },
    metric: {},
    metricLabel: { fontSize: 11, color: '#64748B' },
    metricValue: { fontSize: 18, fontWeight: 'bold', color: '#0F172A' },
    table: { marginTop: 8 },
    tableHeader: { flexDirection: 'row', backgroundColor: '#F1F5F9', padding: 10, borderRadius: 8 },
    tableRow: { flexDirection: 'row', padding: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    th: { fontWeight: '600', color: '#64748B', fontSize: 11 },
    td: { fontSize: 12, color: '#0F172A' },
    insight: { fontSize: 13, color: '#64748B', marginTop: 12 },
});

export default CustomerInsightsSection;
