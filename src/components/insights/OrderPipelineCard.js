import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import InsightsCard from './InsightsCard';
import OrderPipelineBarChart from './OrderPipelineBarChart';

const Icon = (p) => <MaterialCommunityIcons name="pipe" {...p} />;

const OrderPipelineCard = ({ data }) => {
    if (!data) return null;
    const { stages, insight } = data;

    return (
        <InsightsCard title="Order Pipeline" icon={Icon}>
            <OrderPipelineBarChart data={data} />
            {(stages || []).map((s, i) => (
                <View key={i} style={styles.stageRow}>
                    <Text style={styles.stageName}>{s.stage}</Text>
                    <Text style={styles.stageCount}>{s.count} orders</Text>
                </View>
            ))}
            {insight && <Text style={styles.insight}>{insight}</Text>}
        </InsightsCard>
    );
};

const styles = StyleSheet.create({
    stageRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    stageName: { fontSize: 14, color: '#0F172A', fontWeight: '500' },
    stageCount: { fontSize: 14, color: '#64748B' },
    insight: { fontSize: 13, color: '#64748B', marginTop: 12 },
});

export default OrderPipelineCard;
