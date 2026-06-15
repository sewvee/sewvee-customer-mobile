import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Colors } from '../../constants/theme';
import { InvoicePreviewItem, InvoicePreviewOrder } from './types';
import {
  formatInvoiceCurrency,
  formatInvoiceDate,
  formatInvoiceQuantity,
  formatInvoiceText,
  getItemDeliveryDate,
} from './utils';

type InvoiceItemsTableProps = {
  items: InvoicePreviewItem[];
  order: InvoicePreviewOrder;
};

export default function InvoiceItemsTable({
  items,
  order,
}: InvoiceItemsTableProps) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={styles.table}>
        <View style={[styles.row, styles.headerRow]}>
          <Cell label="S.No" width={56} header />
          <Cell label="Description" width={220} header />
          <Cell label="Delivery" width={120} header align="center" />
          <Cell label="Qty" width={60} header align="center" />
          <Cell label="Rate" width={110} header align="right" />
          <Cell label="Amount" width={120} header align="right" />
        </View>

        {items.map((item, index) => {
          const deliveryDate = getItemDeliveryDate(item, order);

          return (
            <View key={`${item.id || item.name}-${index}`} style={styles.row}>
              <Cell label={`${index + 1}`} width={56} />
              <Cell
                label={formatInvoiceText(item.name, item.type || 'Item')}
                subLabel={item.description ? formatInvoiceText(item.description, '') : undefined}
                width={220}
              />
              <Cell
                label={formatInvoiceDate(deliveryDate)}
                width={120}
                align="center"
                tag={Boolean(deliveryDate)}
                muted={!deliveryDate}
              />
              <Cell
                label={formatInvoiceQuantity(item.qty ?? item.quantity)}
                width={60}
                align="center"
              />
              <Cell
                label={formatInvoiceCurrency(item.rate ?? 0)}
                width={110}
                align="right"
              />
              <Cell
                label={formatInvoiceCurrency(item.amount ?? item.totalCost ?? 0)}
                width={120}
                align="right"
                strong
              />
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

type CellProps = {
  label: string;
  subLabel?: string;
  width: number;
  align?: 'left' | 'center' | 'right';
  header?: boolean;
  strong?: boolean;
  tag?: boolean;
  muted?: boolean;
};

function Cell({
  label,
  subLabel,
  width,
  align = 'left',
  header = false,
  strong = false,
  tag = false,
  muted = false,
}: CellProps) {
  return (
    <View style={[styles.cell, { width }, align === 'center' && styles.center, align === 'right' && styles.right]}>
      <View style={tag ? styles.tag : undefined}>
        <Text
          style={[
            styles.text,
            header && styles.headerText,
            strong && styles.strongText,
            muted && styles.mutedText,
            align === 'center' && styles.centerText,
            align === 'right' && styles.rightText,
            tag && styles.tagText,
          ]}
        >
          {label}
        </Text>
      </View>
      {subLabel ? <Text style={styles.subText}>{subLabel}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  table: {
    minWidth: 686,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    backgroundColor: Colors.white,
  },
  headerRow: {
    borderTopWidth: 0,
    backgroundColor: '#F9FAFB',
  },
  cell: {
    paddingHorizontal: 10,
    paddingVertical: 12,
    justifyContent: 'flex-start',
    borderRightWidth: 1,
    borderRightColor: '#F3F4F6',
  },
  center: {
    alignItems: 'center',
  },
  right: {
    alignItems: 'flex-end',
  },
  text: {
    color: Colors.textPrimary,
    fontFamily: 'Inter-Medium',
    fontSize: 12,
  },
  headerText: {
    color: '#6B7280',
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  strongText: {
    fontFamily: 'Inter-Bold',
  },
  mutedText: {
    color: '#9CA3AF',
  },
  centerText: {
    textAlign: 'center',
  },
  rightText: {
    textAlign: 'right',
  },
  subText: {
    marginTop: 4,
    color: Colors.textSecondary,
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    lineHeight: 16,
  },
  tag: {
    backgroundColor: '#ECFDF5',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  tagText: {
    color: '#0E9F8A',
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
  },
});

