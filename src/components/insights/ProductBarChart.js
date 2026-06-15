import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';

const CHART_HEIGHT = 200;
const CHART_WIDTH = Dimensions.get('window').width - 80;

const Colors = {
    primary: '#5B43EE',
    secondary: '#64748B',
};

const ProductBarChart = ({ data }) => {
    const rows = data?.rows || [];
    if (!rows.length) {
        return (
            <View style={[styles.chartContainer, styles.empty]}>
                <Text style={styles.emptyText}>No product data yet</Text>
            </View>
        );
    }

    const barData = rows.slice(0, 8).map((r, i) => ({
        value: r.revenue || 0,
        label: (r.type || 'Other').slice(0, 6),
        frontColor: Colors.primary,
    }));

    return (
        <View style={styles.chartContainer}>
            <BarChart
                data={barData}
                height={CHART_HEIGHT}
                barWidth={Math.min(32, (CHART_WIDTH - 60) / barData.length - 6)}
                barBorderRadius={6}
                frontColor={Colors.primary}
                noOfSections={4}
                yAxisThickness={0}
                xAxisThickness={1}
                xAxisColor="#E2E8F0"
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

export default ProductBarChart;
