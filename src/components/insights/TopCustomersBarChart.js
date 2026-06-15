import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';

const CHART_HEIGHT = 200;
const CHART_WIDTH = Dimensions.get('window').width - 80;

const Colors = {
    primary: '#5B43EE',
    secondary: '#64748B',
};

const TopCustomersBarChart = ({ data }) => {
    const topCustomers = data?.topCustomers || [];
    if (!topCustomers.length) {
        return (
            <View style={[styles.chartContainer, styles.empty]}>
                <Text style={styles.emptyText}>No customer data yet</Text>
            </View>
        );
    }

    const barData = topCustomers.slice(0, 8).map(c => ({
        value: c.revenue || 0,
        label: (c.customerName || 'Unknown').slice(0, 6),
        frontColor: Colors.primary,
    }));

    return (
        <View style={styles.chartContainer}>
            <BarChart
                data={barData}
                horizontal
                height={CHART_HEIGHT}
                barWidth={20}
                barBorderRadius={4}
                frontColor={Colors.primary}
                noOfSections={4}
                yAxisThickness={0}
                xAxisThickness={0}
                hideRules
            />
        </View>
    );
};

const styles = StyleSheet.create({
    chartContainer: {
        height: CHART_HEIGHT,
        marginBottom: 16,
    },
    empty: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 13,
        color: Colors.secondary,
    },
});

export default TopCustomersBarChart;
