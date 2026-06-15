import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import InsightsCard from './InsightsCard';
import AttendanceStackedBarChart from './AttendanceStackedBarChart';

const Icon = (p) => <MaterialCommunityIcons name="calendar-check" {...p} />;

const AttendanceAnalyticsTable = ({ data }) => {
    if (!data) return null;
    const { rows, insight } = data;
    if (!rows?.length && !insight) return null;

    return (
        <InsightsCard title="Attendance Analytics" icon={Icon}>
            <AttendanceStackedBarChart data={data} />
            {(rows || []).length > 0 && (
                <View style={styles.table}>
                    <View style={styles.tableHeader}>
                        <Text style={[styles.th, { flex: 2 }]}>Staff</Text>
                        <Text style={[styles.th, { width: 50 }]}>Present</Text>
                        <Text style={[styles.th, { width: 45 }]}>Leave</Text>
                        <Text style={[styles.th, { width: 55 }]}>Absent</Text>
                        <Text style={[styles.th, { width: 75 }]}>Attendance %</Text>
                    </View>
                    {rows.map((r, i) => (
                        <View key={i} style={styles.tableRow}>
                            <Text style={[styles.td, { flex: 2 }]} numberOfLines={1}>{r.name}</Text>
                            <Text style={[styles.td, { width: 50 }]}>{r.present}</Text>
                            <Text style={[styles.td, { width: 45 }]}>{r.leave}</Text>
                            <Text style={[styles.td, { width: 55 }]}>{r.absent}</Text>
                            <Text style={[styles.td, { width: 75 }]}>{r.attendancePercent}%</Text>
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

export default AttendanceAnalyticsTable;
