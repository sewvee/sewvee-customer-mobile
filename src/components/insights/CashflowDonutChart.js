import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';

const CHART_SIZE = Math.min(180, Dimensions.get('window').width - 120);
const Colors = {
    cashIn: '#10B981',
    salary: '#0EA5E9',
    net: '#8B5CF6',
    secondary: '#64748B',
};

const CashflowDonutChart = ({ data }) => {
    const cashIn = data?.cashIn || 0;
    const salaryPaid = data?.salaryPaid || 0;
    const netCash = data?.netCash ?? 0;

    const pieData = [];
    if (cashIn > 0) pieData.push({ value: cashIn, color: Colors.cashIn });
    if (salaryPaid > 0) pieData.push({ value: salaryPaid, color: Colors.salary });
    const netVal = Math.abs(netCash);
    if (netVal > 0) pieData.push({ value: netVal, color: Colors.net });

    if (!pieData.length) {
        return (
            <View style={[styles.chartContainer, styles.empty]}>
                <Text style={styles.emptyText}>No cashflow data for period</Text>
            </View>
        );
    }

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
                            <Text style={styles.centerValue}>
                                ₹{(cashIn - salaryPaid).toLocaleString()}
                            </Text>
                            <Text style={styles.centerText}>Net</Text>
                        </View>
                    )}
                />
            </View>
            <View style={styles.legend}>
                {cashIn > 0 && (
                    <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: Colors.cashIn }]} />
                        <Text style={styles.legendText}>Cash In ₹{(cashIn || 0).toLocaleString()}</Text>
                    </View>
                )}
                {salaryPaid > 0 && (
                    <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: Colors.salary }]} />
                        <Text style={styles.legendText}>Salary ₹{(salaryPaid || 0).toLocaleString()}</Text>
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
        fontSize: 14,
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

export default CashflowDonutChart;
