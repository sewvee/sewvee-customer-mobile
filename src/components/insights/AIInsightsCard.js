import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import InsightsCard from './InsightsCard';

const Icon = (p) => <MaterialCommunityIcons name="robot" {...p} />;

const AIInsightsCard = ({ insights }) => {
    if (!insights?.length) return null;

    return (
        <InsightsCard title="AI Business Insights" icon={Icon}>
            {insights.map((item, i) => (
                <View key={i} style={styles.insightItem}>
                    <MaterialCommunityIcons name="lightbulb-outline" size={16} color="#10B981" />
                    <Text style={styles.insightText}>{item}</Text>
                </View>
            ))}
        </InsightsCard>
    );
};

const styles = StyleSheet.create({
    insightItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8, gap: 8 },
    insightText: { flex: 1, fontSize: 13, color: '#0F172A' },
});

export default AIInsightsCard;
