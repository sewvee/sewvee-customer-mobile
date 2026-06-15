import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';

const CHART_SIZE = Math.min(180, Dimensions.get('window').width - 120);
const Colors = {
    payroll: '#5B43EE',
    pending: '#0EA5E9',
    secondary: '#64748B',
};

const PayrollDonutChart = ({ data }) => {
    const totalPaid = data?.totalPayrollPaid || 0;
    const pending = data?.payrollPending || 0;
    const revenue = data?.revenue || 0;

    const pieData = [];
    if (totalPaid > 0) pieData.push({ value: totalPaid, color: Colors.payroll });
    if (pending > 0) pieData.push({ value: pending, color: Colors.pending });

    if (!pieData.length) {
        return (
            <View style={[styles.chartContainer, styles.empty]}>
                <Text style={styles.emptyText}>No payroll data for period</Text>
            </View>
        );
    }

    const ratio = revenue > 0 ? Math.round((totalPaid / revenue) * 100) : 0;

    return (
        <View style={styles.chartContainer}>
            <View style={styles.pieWrapper}>
                <PieChart
                    data={pieData}
                    donut
                    radius={CHART_SIZE / 2 - 10}
                    innerRadius={CHART_SIZE / 2 - 30}
                    centerLabelComponent={() => (
                        <View style={styles.centerLabel}>
                            <Text style={styles.centerValue}>{ratio}%</Text>
                            <Text style={styles.centerText}>Payroll vs Rev</Text>
                        </View>
                    )}
                />
            </View>
            <View style={styles.legend}>
                <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: Colors.payroll }]} />
                    <Text style={styles.legendText}>Paid ₹{(totalPaid || 0).toLocaleString()}</Text>
                </View>
                {pending > 0 && (
                    <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: Colors.pending }]} />
                        <Text style={styles.legendText}>Pending ₹{(pending || 0).toLocaleString()}</Text>
                    </View>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    chartContainer: {
        marginBottom: 16,
        alignItems: 'center',
    },
    pieWrapper: {
        width: CHART_SIZE,
        height: CHART_SIZE,
    },
    centerLabel: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    centerValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#0F172A',
    },
    centerText: {
        fontSize: 11,
        color: '#64748B',
    },
    legend: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 16,
        marginTop: 12,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    legendDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    legendText: {
        fontSize: 12,
        color: Colors.secondary,
    },
    empty: {
        height: 120,
        justifyContent: 'center',
    },
    emptyText: {
        fontSize: 13,
        color: Colors.secondary,
    },
});

export default PayrollDonutChart;
