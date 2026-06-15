import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';

const CHART_HEIGHT = 200;
const CHART_WIDTH = Dimensions.get('window').width - 80;

const Colors = {
    primary: '#10B981',
    secondary: '#64748B',
};

const OrderPipelineBarChart = ({ data }) => {
    if (!data?.stages?.length) {
        return (
            <View style={[styles.chartContainer, styles.empty]}>
                <Text style={styles.emptyText}>No pipeline data</Text>
            </View>
        );
    }

    const barData = data.stages.map((s, i) => ({
        value: s.count || 0,
        label: s.stage?.slice(0, 4) || '',
        frontColor: i === data.stages.length - 1 ? '#0EA5E9' : Colors.primary,
    }));

    const maxVal = Math.max(...barData.map(b => b.value), 1);

    return (
        <View style={styles.chartContainer}>
            <BarChart
                data={barData}
                height={CHART_HEIGHT}
                barWidth={Math.min(28, (CHART_WIDTH - 60) / barData.length - 8)}
                barBorderRadius={6}
                frontColor={Colors.primary}
                noOfSections={Math.min(4, maxVal)}
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

export default OrderPipelineBarChart;
