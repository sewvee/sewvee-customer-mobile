import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '../../constants/theme';
import { InvoicePreviewItem, InvoicePreviewOrder } from './types';
import {
  formatInvoiceDate,
  formatInvoiceQuantity,
  formatInvoiceText,
  getItemDeliveryDate,
  getItemMediaUris,
  getMeasurementsEntries,
} from './utils';
import InvoiceMediaGrid from './InvoiceMediaGrid';

type TailorCopyItemCardProps = {
  item: InvoicePreviewItem;
  order: InvoicePreviewOrder;
  index: number;
};

export default function TailorCopyItemCard({
  item,
  order,
  index,
}: TailorCopyItemCardProps) {
  const measurements = getMeasurementsEntries(item.measurements);
  const mediaUris = getItemMediaUris(item);
  const services = item.services?.length ? item.services : item.addons || [];
  const materials = item.materials || [];
  const deliveryDate = getItemDeliveryDate(item, order);

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.headerContent}>
          <Text style={styles.itemTitle}>
            {index + 1}. {formatInvoiceText(item.type, item.name || 'Outfit')}
          </Text>
          {deliveryDate ? (
            <View style={styles.deliveryBadge}>
              <Text style={styles.deliveryText}>
                Due: {formatInvoiceDate(deliveryDate)}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.quantityBadge}>
          <Text style={styles.quantityText}>
            Qty: {formatInvoiceQuantity(item.quantity ?? item.qty)}
          </Text>
        </View>
      </View>

      <View style={styles.metaGrid}>
        <MetaPill label="Status" value={formatInvoiceText(item.status, 'Pending')} />
        <MetaPill label="Urgency" value={formatInvoiceText(item.urgency, 'Normal')} />
        <MetaPill label="Order Type" value={formatInvoiceText(item.orderType, 'Stitching')} />
        <MetaPill
          label="Trial"
          value={item.trialDate ? formatInvoiceDate(item.trialDate) : 'Not set'}
        />
      </View>

      {measurements.length ? (
        <View style={styles.block}>
          <Text style={styles.blockTitle}>Measurements</Text>
          <View style={styles.measurementsGrid}>
            {measurements.map(([label, value]) => (
              <View key={`${label}-${value}`} style={styles.measurementCard}>
                <Text style={styles.measurementLabel}>
                  {label.replace(/_/g, ' ')}
                </Text>
                <Text style={styles.measurementValue}>{formatInvoiceText(value)}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {services.length ? (
        <View style={styles.block}>
          <Text style={styles.blockTitle}>Services</Text>
          {services.map(service => (
            <BulletRow
              key={`${service.id || service.name}-${service.amount || ''}`}
              text={formatInvoiceText(service.name, 'Service')}
            />
          ))}
        </View>
      ) : null}

      {materials.length ? (
        <View style={styles.block}>
          <Text style={styles.blockTitle}>Materials</Text>
          {materials.map(material => {
            const quantity = material.quantity ?? material.qty ?? 0;
            return (
              <BulletRow
                key={`${material.id || material.name}-${quantity}`}
                text={`${formatInvoiceText(material.name, 'Material')} • Qty ${formatInvoiceQuantity(quantity)}`}
              />
            );
          })}
        </View>
      ) : null}

      {item.notes || item.transcription || item.fabricSource || item.measurementDressGiven ? (
        <View style={styles.notesBox}>
          {item.notes ? (
            <>
              <Text style={styles.notesLabel}>Customer Notes</Text>
              <Text style={styles.notesText}>{item.notes}</Text>
            </>
          ) : null}
          {item.transcription ? (
            <>
              <Text style={[styles.notesLabel, styles.secondaryNotesLabel]}>
                AI Transcription
              </Text>
              <Text style={[styles.notesText, styles.transcriptionText]}>
                {item.transcription}
              </Text>
            </>
          ) : null}
          {item.fabricSource ? (
            <BulletRow text={`Fabric Source: ${item.fabricSource}`} compact />
          ) : null}
          {item.measurementDressGiven ? (
            <BulletRow
              text={`Measurement Dress Given: ${item.measurementDressGiven}`}
              compact
            />
          ) : null}
        </View>
      ) : null}

      <InvoiceMediaGrid title="Attachments & Photos" items={mediaUris} />
    </View>
  );
}

function MetaPill({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.metaPill}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

function BulletRow({
  text,
  compact = false,
}: {
  text: string;
  compact?: boolean;
}) {
  return (
    <View style={[styles.bulletRow, compact && styles.bulletRowCompact]}>
      <View style={styles.bullet} />
      <Text style={styles.bulletText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 18,
    padding: 16,
    backgroundColor: Colors.white,
    marginTop: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingBottom: 12,
  },
  headerContent: {
    flex: 1,
  },
  itemTitle: {
    color: Colors.textPrimary,
    fontFamily: 'Inter-Bold',
    fontSize: 16,
  },
  deliveryBadge: {
    alignSelf: 'flex-start',
    marginTop: 8,
    backgroundColor: '#E0E7FF',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  deliveryText: {
    color: '#4338CA',
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
  },
  quantityBadge: {
    backgroundColor: '#EEF2FF',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  quantityText: {
    color: Colors.primary,
    fontFamily: 'Inter-Bold',
    fontSize: 12,
  },
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 14,
  },
  metaPill: {
    minWidth: '47%',
    flexGrow: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
  },
  metaLabel: {
    color: '#6B7280',
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  metaValue: {
    color: Colors.textPrimary,
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    marginTop: 4,
  },
  block: {
    marginTop: 16,
  },
  blockTitle: {
    color: Colors.primary,
    fontFamily: 'Inter-Bold',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginBottom: 10,
  },
  measurementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  measurementCard: {
    width: '47%',
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
    backgroundColor: '#FBFDFD',
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 12,
  },
  measurementLabel: {
    color: '#6B7280',
    fontFamily: 'Inter-Medium',
    fontSize: 10,
    textTransform: 'capitalize',
  },
  measurementValue: {
    color: Colors.textPrimary,
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    marginTop: 4,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 8,
  },
  bulletRowCompact: {
    marginTop: 10,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: Colors.primary,
    marginTop: 7,
    marginRight: 10,
  },
  bulletText: {
    flex: 1,
    color: Colors.textSecondary,
    fontFamily: 'Inter-Medium',
    fontSize: 13,
    lineHeight: 20,
  },
  notesBox: {
    marginTop: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FEF3C7',
    backgroundColor: '#FFFBEB',
    padding: 14,
  },
  notesLabel: {
    color: '#92400E',
    fontFamily: 'Inter-Bold',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  secondaryNotesLabel: {
    color: '#7C3AED',
    marginTop: 12,
  },
  notesText: {
    color: '#78350F',
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    lineHeight: 20,
  },
  transcriptionText: {
    color: '#4B5563',
    fontStyle: 'italic',
  },
});
