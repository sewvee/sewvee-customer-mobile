import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import InsightsCard from './InsightsCard';
import CashflowDonutChart from './CashflowDonutChart';

const Icon = (p) => <MaterialCommunityIcons name="cash-multiple" {...p} />;

const CashflowCard = ({ data }) => {
    if (!data) return null;
    const { cashIn, salaryPaid, expenses, netCash, insight } = data;

    return (
        <InsightsCard title="Cashflow" icon={Icon}>
            <CashflowDonutChart data={data} />
            <View style={styles.row}>
                <Text style={styles.label}>Cash In (Customer Payments)</Text>
                <Text style={styles.value}>₹{(cashIn || 0).toLocaleString()}</Text>
            </View>
            <View style={styles.row}>
                <Text style={styles.label}>Salary Paid (Payroll)</Text>
                <Text style={styles.value}>₹{(salaryPaid || 0).toLocaleString()}</Text>
            </View>
            <View style={styles.row}>
                <Text style={styles.label}>Expenses (Optional future)</Text>
                <Text style={styles.value}>₹{(expenses || 0).toLocaleString()}</Text>
            </View>
            <View style={[styles.row, styles.netRow]}>
                <Text style={styles.netLabel}>Net Cash Position</Text>
                <Text style={[styles.netValue, { color: (netCash || 0) >= 0 ? '#10B981' : '#EF4444' }]}>
                    ₹{(netCash || 0).toLocaleString()}
                </Text>
            </View>
            {insight && <Text style={styles.insight}>{insight}</Text>}
        </InsightsCard>
    );
};

const styles = StyleSheet.create({
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    label: { fontSize: 13, color: '#64748B' },
    value: { fontSize: 15, fontWeight: '600', color: '#0F172A' },
    netRow: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#E2E8F0' },
    netLabel: { fontSize: 14, fontWeight: '600', color: '#0F172A' },
    netValue: { fontSize: 18, fontWeight: 'bold' },
    insight: { fontSize: 13, color: '#64748B', marginTop: 12 },
});

export default CashflowCard;
