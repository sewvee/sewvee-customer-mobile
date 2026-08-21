import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Colors } from '../../constants/theme';

type InvoiceMediaGridProps = {
  title: string;
  items: string[];
};

export default function InvoiceMediaGrid({
  title,
  items,
}: InvoiceMediaGridProps) {
  if (!items.length) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.grid}>
        {items.map((uri, index) => (
          <View key={`${uri}-${index}`} style={styles.card}>
            <Image source={{ uri }} style={styles.image} resizeMode="cover" />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
  },
  title: {
    color: Colors.primary,
    fontFamily: 'Inter-Bold',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  card: {
    width: '47%',
    aspectRatio: 1,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F8FAFC',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
