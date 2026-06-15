import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';

const CHART_HEIGHT = 200;
const CHART_WIDTH = Dimensions.get('window').width - 80;

const Colors = {
    present: '#10B981',
    leave: '#0EA5E9',
    absent: '#EF4444',
    secondary: '#64748B',
};

const AttendanceStackedBarChart = ({ data }) => {
    const rows = data?.rows || [];
    if (!rows.length) {
        return (
            <View style={[styles.chartContainer, styles.empty]}>
                <Text style={styles.emptyText}>No attendance data for period</Text>
            </View>
        );
    }

    const barData = rows.slice(0, 6).map(r => ({
        value: (r.present || 0) + (r.leave || 0) + (r.absent || 0) || 1,
        label: (r.name || 'Staff').slice(0, 5),
        frontColor: (r.present || 0) >= (r.absent || 0) ? Colors.present : Colors.absent,
    }));

    return (
        <View style={styles.chartContainer}>
            <BarChart
                data={barData}
                height={CHART_HEIGHT}
                barWidth={Math.min(36, (CHART_WIDTH - 60) / barData.length - 8)}
                barBorderRadius={6}
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

export default AttendanceStackedBarChart;
