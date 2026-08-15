import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Shadow } from '../constants/theme';
import { 
  HelpCircle, 
  ChevronDown, 
  ChevronUp, 
  LogOut, 
  ShoppingBag,
  ChevronRight
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useNavigation } from '@react-navigation/native';
import { useData } from '../context/DataContext';

if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

const FAQ_DATA = [
  {
    question: "How do I upload reference design photos?",
    answer: "Go to your Home tab, tap on any active order, and look for outfits showing the 'Reference Design Needed' badge. Tap '+ Upload Photo' to select neckline, embroidery, or style ideas directly from your gallery."
  },
  {
    question: "How do I use the Gallery and Collage Maker?",
    answer: "Use the 'Gallery' tab to create design folders like 'Neck Designs' or 'Bridal Inspiration'. Tap 'Collage Maker' in the gallery header to combine multiple reference images into a single collage for your boutique."
  },
  {
    question: "How do I send my measurement sample garments?",
    answer: "You can ship your best-fitting blouse or salwar suit as a measurement sample to the boutique. Contact your boutique directly — their details appear on each order card on your home screen."
  },
  {
    question: "Who can I contact for orders support?",
    answer: "For design revisions, delivery date changes, or pricing questions, open any active order from the Home tab. The boutique contact details are shown directly in the order for quick access."
  }
];

const CustomerProfileScreen = () => {
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const navigation = useNavigation();
  const { orders } = useData();

  // Calculate order stats
  const stitchingOrders = (orders || []).filter(o => o.order_type !== 'SALE_ORDER' && o.source !== 'send order request');
  const readymadeOrders = (orders || []).filter(o => o.order_type === 'SALE_ORDER' || o.source === 'send order request');

  const stitchingCompleted = stitchingOrders.filter(o => o.status === 'Completed' || o.status === 'Delivered').length;
  const stitchingPending = stitchingOrders.filter(o => o.status !== 'Completed' && o.status !== 'Delivered' && o.status !== 'Cancelled').length;
  
  const readymadePending = readymadeOrders.filter(o => o.status !== 'Cancelled' && o.status !== 'Delivered').length;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.navbar}>
        <View style={{ width: 24 }} />
        <Text style={styles.navbarTitle}>My Profile</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* User Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarBox}>
            <Text style={styles.avatarText}>
              {user?.name?.[0]?.toUpperCase() || 'C'}
            </Text>
          </View>
          <Text style={styles.userNameText}>{user?.name || 'Customer'}</Text>
          <Text style={styles.userMobileText}>+91 {user?.mobile || '9876543210'}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>Sewvee Customer</Text>
          </View>
        </View>

        {/* Order Statistics Widget */}
        <View style={styles.statsContainer}>
          <Text style={styles.statsSectionTitle}>Custom Stitching</Text>
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{stitchingOrders.length}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{stitchingPending}</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{stitchingCompleted}</Text>
              <Text style={styles.statLabel}>Finished</Text>
            </View>
          </View>

          <Text style={[styles.statsSectionTitle, { marginTop: 16 }]}>Online Readymade</Text>
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{readymadeOrders.length}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{readymadePending}</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('CustomerRequestedOrders')}>
          <ShoppingBag size={20} color={Colors.primary} style={{ marginRight: 12 }} />
          <Text style={styles.menuItemText}>My Orders</Text>
          <ChevronRight size={20} color={Colors.textSecondary} style={{ marginLeft: 'auto' }} />
        </TouchableOpacity>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <LogOut size={20} color={Colors.danger} style={{ marginRight: 8 }} />
          <Text style={styles.logoutBtnText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
      </View>
    </SafeAreaView>
  );
};

export default CustomerProfileScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F3FF',
  },
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 56,
    backgroundColor: '#F5F3FF',
  },
  navbarTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: Colors.textPrimary,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  profileCard: {
    backgroundColor: Colors.white,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    ...Shadow.subtle,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  avatarBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: Colors.white,
  },
  userNameText: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: Colors.textPrimary,
  },
  userMobileText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontFamily: 'Inter-Medium',
    marginTop: 4,
  },
  roleBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 10,
  },
  roleBadgeText: {
    fontSize: 11,
    fontFamily: 'Inter-Bold',
    color: Colors.primary,
    textTransform: 'uppercase',
  },
  statsContainer: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    ...Shadow.subtle,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statsSectionTitle: {
    fontSize: 13,
    fontFamily: 'Inter-Bold',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statValue: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: Colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: 'Inter-Medium',
    color: Colors.textSecondary,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    ...Shadow.subtle,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  menuItemText: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: Colors.textPrimary,
  },
  logoutBtn: {
    backgroundColor: 'transparent',
    height: 52,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.danger,
  },
  logoutBtnText: {
    fontSize: 15,
    fontFamily: 'Inter-Bold',
    color: Colors.danger,
  },
});
