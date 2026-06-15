import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import InsightsCard from './InsightsCard';
import PayrollDonutChart from './PayrollDonutChart';

const Icon = (p) => <MaterialCommunityIcons name="cash" {...p} />;

const PayrollInsightsCard = ({ data }) => {
    if (!data) return null;
    const { totalPayrollPaid, payrollPending, revenue, payrollCostRatio, insight } = data;

    return (
        <InsightsCard title="Payroll Insights" icon={Icon}>
            <PayrollDonutChart data={data} />
            <View style={styles.row}>
                <Text style={styles.label}>Total Payroll Paid</Text>
                <Text style={styles.value}>₹{(totalPayrollPaid || 0).toLocaleString()}</Text>
            </View>
            <View style={styles.row}>
                <Text style={styles.label}>Payroll Pending</Text>
                <Text style={styles.value}>₹{(payrollPending || 0).toLocaleString()}</Text>
            </View>
            <View style={styles.divider} />
            <Text style={styles.sectionLabel}>Payroll vs Revenue</Text>
            <View style={styles.row}>
                <Text style={styles.label}>Revenue</Text>
                <Text style={styles.value}>₹{(revenue || 0).toLocaleString()}</Text>
            </View>
            <View style={styles.row}>
                <Text style={styles.label}>Payroll</Text>
                <Text style={styles.value}>₹{(totalPayrollPaid || 0).toLocaleString()}</Text>
            </View>
            <View style={styles.row}>
                <Text style={styles.label}>Payroll Cost Ratio</Text>
                <Text style={styles.value}>{payrollCostRatio || 0}%</Text>
            </View>
            {insight && <Text style={styles.insight}>{insight}</Text>}
        </InsightsCard>
    );
};

const styles = StyleSheet.create({
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    label: { fontSize: 13, color: '#64748B' },
    value: { fontSize: 15, fontWeight: '600', color: '#0F172A' },
    divider: { height: 1, backgroundColor: '#E2E8F0', marginVertical: 12 },
    sectionLabel: { fontSize: 13, fontWeight: '600', color: '#0F172A', marginBottom: 8 },
    insight: { fontSize: 13, color: '#64748B', marginTop: 12 },
});

export default PayrollInsightsCard;
