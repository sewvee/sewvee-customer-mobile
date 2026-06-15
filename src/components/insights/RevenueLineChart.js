import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';

const CHART_HEIGHT = 200;
const CHART_WIDTH = Dimensions.get('window').width - 80;

const Colors = {
    primary: '#5B43EE',
    secondary: '#64748B',
};

const RevenueLineChart = ({ data }) => {
    if (!data?.rows?.length) {
        return (
            <View style={[styles.chartContainer, styles.empty]}>
                <Text style={styles.emptyText}>No revenue data for selected period</Text>
            </View>
        );
    }

    const lineData = [...data.rows].reverse().map((r) => ({
        value: r.revenue || 0,
        label: r.date ? r.date.slice(5) : '',
    }));

    return (
        <View style={styles.chartContainer}>
            <LineChart
                data={lineData}
                height={CHART_HEIGHT}
                spacing={Math.max(40, CHART_WIDTH / Math.max(lineData.length, 1) - 10)}
                color={Colors.primary}
                thickness={2}
                hideDataPoints={lineData.length > 14}
                hideRules
                noOfSections={4}
                yAxisThickness={0}
                xAxisThickness={1}
                xAxisColor="#E2E8F0"
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

export default RevenueLineChart;
