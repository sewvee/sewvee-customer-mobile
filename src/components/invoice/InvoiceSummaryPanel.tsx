import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '../../constants/theme';

type SummaryRow = {
  label: string;
  value: string;
  highlighted?: boolean;
};

type InvoiceSummaryPanelProps = {
  title: string;
  rows: SummaryRow[];
};

export default function InvoiceSummaryPanel({
  title,
  rows,
}: InvoiceSummaryPanelProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {rows.map(row => (
        <View key={`${row.label}-${row.value}`} style={[styles.row, row.highlighted && styles.highlightedRow]}>
          <Text style={[styles.label, row.highlighted && styles.highlightedText]}>
            {row.label}
          </Text>
          <Text style={[styles.value, row.highlighted && styles.highlightedText]}>
            {row.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'flex-end',
    width: '100%',
    maxWidth: 260,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    padding: 14,
    backgroundColor: '#FAFAFA',
  },
  title: {
    color: Colors.textPrimary,
    fontFamily: 'Inter-Bold',
    fontSize: 14,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F2F4',
  },
  highlightedRow: {
    marginTop: 6,
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: '#0E9F8A',
  },
  label: {
    color: Colors.textSecondary,
    fontFamily: 'Inter-Medium',
    fontSize: 13,
  },
  value: {
    color: Colors.textPrimary,
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
  },
  highlightedText: {
    color: '#0E9F8A',
    fontFamily: 'Inter-Bold',
    fontSize: 15,
    textTransform: 'uppercase',
  },
});
