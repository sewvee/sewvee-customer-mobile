import React from 'react';
import { StyleSheet, Text, View, Image } from 'react-native';
import { Colors } from '../../constants/theme';
import { InvoiceCompany } from './types';
import { formatInvoiceText, getBoutiqueInitials } from './utils';

type InvoiceDocumentHeaderProps = {
  company: InvoiceCompany;
  copyLabel: string;
};

export default function InvoiceDocumentHeader({
  company,
  copyLabel,
}: InvoiceDocumentHeaderProps) {
  const boutiqueName = formatInvoiceText(company.name, 'My Boutique');
  const logoUrl = company.logo || company.logo_url || company.company_logo || company.logoUrl || company.company_logo_url;

  return (
    <View style={styles.container}>
      <View style={styles.brandSection}>
        {logoUrl ? (
          <Image source={{ uri: logoUrl }} style={styles.logoImage} resizeMode="contain" />
        ) : (
          <View style={styles.logoBadge}>
            <Text style={styles.logoText}>{getBoutiqueInitials(company)}</Text>
          </View>
        )}
        <View style={styles.brandTextWrap}>
          <Text style={styles.companyName}>{boutiqueName}</Text>
          <Text style={styles.companyMeta}>
            {formatInvoiceText(company.address, 'Boutique address not available')}
          </Text>
          <Text style={styles.companyMeta}>
            Phone: {formatInvoiceText(company.phone, 'N/A')}
          </Text>
          {company.gstin ? (
            <Text style={styles.companyMeta}>GSTIN: {company.gstin}</Text>
          ) : null}
          {company.email ? (
            <Text style={styles.companyMeta}>{company.email}</Text>
          ) : null}
        </View>
      </View>

      <View style={styles.labelPill}>
        <Text style={styles.labelText}>{copyLabel}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 16,
  },
  brandSection: {
    flex: 1,
    flexDirection: 'row',
    gap: 12,
  },
  logoBadge: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#0E9F8A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: 'transparent',
  },
  logoText: {
    color: Colors.white,
    fontFamily: 'Inter-Bold',
    fontSize: 18,
  },
  brandTextWrap: {
    flex: 1,
  },
  companyName: {
    color: '#0E9F8A',
    fontFamily: 'Inter-Bold',
    fontSize: 20,
    textTransform: 'uppercase',
  },
  companyMeta: {
    marginTop: 3,
    color: Colors.textSecondary,
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    lineHeight: 18,
  },
  labelPill: {
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  labelText: {
    color: '#374151',
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
});

