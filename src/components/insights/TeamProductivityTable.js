import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import InsightsCard from './InsightsCard';
import TeamProductivityBarChart from './TeamProductivityBarChart';

const Icon = (p) => <MaterialCommunityIcons name="account-hard-hat" {...p} />;

const TeamProductivityTable = ({ data }) => {
    if (!data) return null;
    const { rows, insight } = data;
    if (!rows?.length && !insight) return null;

    return (
        <InsightsCard title="Team Productivity" icon={Icon}>
            <TeamProductivityBarChart data={data} />
            {(rows || []).length > 0 && (
                <View style={styles.table}>
                    <View style={styles.tableHeader}>
                        <Text style={[styles.th, { flex: 2 }]}>Staff</Text>
                        <Text style={[styles.th, { width: 60 }]}>Role</Text>
                        <Text style={[styles.th, { width: 70 }]}>Assigned</Text>
                        <Text style={[styles.th, { width: 70 }]}>Completed</Text>
                        <Text style={[styles.th, { width: 60 }]}>Productivity</Text>
                    </View>
                    {rows.map((r, i) => (
                        <View key={i} style={styles.tableRow}>
                            <Text style={[styles.td, { flex: 2 }]} numberOfLines={1}>{r.name}</Text>
                            <Text style={[styles.td, { width: 60 }]}>{r.role}</Text>
                            <Text style={[styles.td, { width: 70 }]}>{r.assigned}</Text>
                            <Text style={[styles.td, { width: 70 }]}>{r.completed}</Text>
                            <Text style={[styles.td, { width: 60 }]}>{r.productivity}%</Text>
                        </View>
                    ))}
                </View>
            )}
            {insight && <Text style={styles.insight}>{insight}</Text>}
        </InsightsCard>
    );
};

const styles = StyleSheet.create({
    table: { marginBottom: 8 },
    tableHeader: { flexDirection: 'row', backgroundColor: '#F1F5F9', padding: 10, borderRadius: 8 },
    tableRow: { flexDirection: 'row', padding: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    th: { fontWeight: '600', color: '#64748B', fontSize: 11 },
    td: { fontSize: 12, color: '#0F172A' },
    insight: { fontSize: 13, color: '#64748B', marginTop: 8 },
});

export default TeamProductivityTable;
