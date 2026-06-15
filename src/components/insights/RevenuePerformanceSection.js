import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import InsightsCard from './InsightsCard';
import RevenueLineChart from './RevenueLineChart';

const Icon = (p) => <MaterialCommunityIcons name="trending-up" {...p} />;

const RevenuePerformanceSection = ({ data }) => {
    if (!data) return null;
    const { rows, insight } = data;
    if (!rows?.length && !insight) return null;

    return (
        <InsightsCard title="Revenue Performance" icon={Icon}>
            <RevenueLineChart data={data} />
            {rows?.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tableScroll}>
                    <View style={styles.table}>
                        <View style={styles.tableHeader}>
                            <Text style={[styles.th, styles.colDate]}>Date</Text>
                            <Text style={[styles.th, styles.colNum]}>Orders</Text>
                            <Text style={[styles.th, styles.colNum]}>Revenue</Text>
                            <Text style={[styles.th, styles.colNum]}>Collections</Text>
                            <Text style={[styles.th, styles.colNum]}>Pending</Text>
                            <Text style={[styles.th, styles.colNum]}>Avg AOV</Text>
                        </View>
                        {rows.slice(0, 14).map((r, i) => (
                            <View key={i} style={styles.tableRow}>
                                <Text style={[styles.td, styles.colDate]}>{r.date}</Text>
                                <Text style={[styles.td, styles.colNum]}>{r.orders}</Text>
                                <Text style={[styles.td, styles.colNum]}>₹{(r.revenue || 0).toLocaleString()}</Text>
                                <Text style={[styles.td, styles.colNum]}>₹{(r.collections || 0).toLocaleString()}</Text>
                                <Text style={[styles.td, styles.colNum]}>₹{(r.pending || 0).toLocaleString()}</Text>
                                <Text style={[styles.td, styles.colNum]}>₹{(r.avgOrderValue || 0).toLocaleString()}</Text>
                            </View>
                        ))}
                    </View>
                </ScrollView>
            )}
            {insight && <Text style={styles.insight}>{insight}</Text>}
        </InsightsCard>
    );
};

const styles = StyleSheet.create({
    tableScroll: { marginBottom: 12 },
    table: { minWidth: 400 },
    tableHeader: { flexDirection: 'row', backgroundColor: '#F1F5F9', padding: 10, borderRadius: 8 },
    tableRow: { flexDirection: 'row', padding: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    th: { fontWeight: '600', color: '#64748B', fontSize: 11 },
    td: { fontSize: 12, color: '#0F172A' },
    colDate: { width: 90 },
    colNum: { width: 70 },
    insight: { fontSize: 13, color: '#64748B', marginTop: 8 },
});

export default RevenuePerformanceSection;
