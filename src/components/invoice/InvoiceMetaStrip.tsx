import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '../../constants/theme';

type MetaItem = {
  label: string;
  value: string;
};

type InvoiceMetaStripProps = {
  items: MetaItem[];
};

export default function InvoiceMetaStrip({
  items,
}: InvoiceMetaStripProps) {
  return (
    <View style={styles.container}>
      {items.map(item => (
        <View key={`${item.label}-${item.value}`} style={styles.cell}>
          <Text style={styles.label}>{item.label}</Text>
          <Text style={styles.value}>{item.value}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingVertical: 10,
    rowGap: 12,
  },
  cell: {
    width: '50%',
    paddingRight: 12,
  },
  label: {
    color: '#6B7280',
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  value: {
    color: Colors.textPrimary,
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
  },
});

