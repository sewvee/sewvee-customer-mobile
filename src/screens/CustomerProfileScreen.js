import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  UIManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../constants/theme';
import { 
  LogOut, 
  ShoppingBag,
  ChevronRight,
  Scissors,
  Package,
  Phone,
  User,
  Clock,
  CheckCircle,
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { useData } from '../context/DataContext';

if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

const CustomerProfileScreen = () => {
  const { user, logout } = useAuth();
  const navigation = useNavigation();
  const { orders } = useData();

  const initials = (user?.name || 'C').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  const stitchingOrders = (orders || []).filter(o => o.order_type !== 'SALE_ORDER');
  const readymadeOrders = (orders || []).filter(o => o.order_type === 'SALE_ORDER');

  const stitchingCompleted = stitchingOrders.filter(o => {
    const s = (o.statusName || o.status || '').toLowerCase();
    return s === 'delivered' || s === 'completed';
  }).length;
  const stitchingPending = stitchingOrders.filter(o => {
    const s = (o.statusName || o.status || '').toLowerCase();
    return s !== 'delivered' && s !== 'completed' && s !== 'cancelled';
  }).length;
  const readymadeDelivered = readymadeOrders.filter(o => {
    const s = (o.statusName || o.status || '').toLowerCase();
    return s === 'delivered';
  }).length;
  const readymadePending = readymadeOrders.filter(o => {
    const s = (o.statusName || o.status || '').toLowerCase();
    return s !== 'delivered' && s !== 'cancelled';
  }).length;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.navbar}>
        <View style={{ width: 24 }} />
        <Text style={styles.navbarTitle}>My Profile</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Hero Profile Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroBackground} />
          <View style={styles.avatarWrapper}>
            <View style={styles.avatarBox}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          </View>
          <Text style={styles.userName}>{user?.name || 'Customer'}</Text>
          <View style={styles.phoneRow}>
            <Phone size={12} color="#94A3B8" style={{ marginRight: 4 }} />
            <Text style={styles.userPhone}>{user?.mobile || '—'}</Text>
          </View>
          <View style={styles.memberBadge}>
            <User size={10} color={Colors.primary} style={{ marginRight: 4 }} />
            <Text style={styles.memberBadgeText}>SEWVEE CUSTOMER</Text>
          </View>
        </View>

        {/* Activity Summary */}
        <View style={styles.summaryGrid}>
          <View style={[styles.summaryCard, { borderLeftColor: '#8B5CF6' }]}>
            <View style={styles.summaryCardHeader}>
              <Scissors size={14} color="#8B5CF6" />
              <Text style={styles.summaryCardTitle}>Custom Stitching</Text>
            </View>
            <View style={styles.summaryStatRow}>
              <View style={styles.summaryStat}>
                <Text style={styles.summaryStatValue}>{stitchingOrders.length}</Text>
                <Text style={styles.summaryStatLabel}>Total</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryStat}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Clock size={11} color="#F59E0B" style={{ marginRight: 2 }} />
                  <Text style={[styles.summaryStatValue, { color: '#F59E0B' }]}>{stitchingPending}</Text>
                </View>
                <Text style={styles.summaryStatLabel}>Active</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryStat}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <CheckCircle size={11} color="#10B981" style={{ marginRight: 2 }} />
                  <Text style={[styles.summaryStatValue, { color: '#10B981' }]}>{stitchingCompleted}</Text>
                </View>
                <Text style={styles.summaryStatLabel}>Done</Text>
              </View>
            </View>
          </View>

          <View style={[styles.summaryCard, { borderLeftColor: '#6366F1', marginTop: 12 }]}>
            <View style={styles.summaryCardHeader}>
              <ShoppingBag size={14} color="#6366F1" />
              <Text style={styles.summaryCardTitle}>Online Readymade</Text>
            </View>
            <View style={styles.summaryStatRow}>
              <View style={styles.summaryStat}>
                <Text style={styles.summaryStatValue}>{readymadeOrders.length}</Text>
                <Text style={styles.summaryStatLabel}>Total</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryStat}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Clock size={11} color="#F59E0B" style={{ marginRight: 2 }} />
                  <Text style={[styles.summaryStatValue, { color: '#F59E0B' }]}>{readymadePending}</Text>
                </View>
                <Text style={styles.summaryStatLabel}>Active</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryStat}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <CheckCircle size={11} color="#10B981" style={{ marginRight: 2 }} />
                  <Text style={[styles.summaryStatValue, { color: '#10B981' }]}>{readymadeDelivered}</Text>
                </View>
                <Text style={styles.summaryStatLabel}>Delivered</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsCard}>
          <TouchableOpacity style={styles.actionRow} onPress={() => navigation.navigate('CustomerRequestedOrders')}>
            <View style={styles.actionIconBox}>
              <Package size={18} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.actionTitle}>My Orders</Text>
              <Text style={styles.actionSubtitle}>View all your online orders</Text>
            </View>
            <ChevronRight size={18} color="#CBD5E1" />
          </TouchableOpacity>
          <View style={styles.actionSeparator} />
          <TouchableOpacity style={styles.actionRow} onPress={() => navigation.navigate('CustomerShop')}>
            <View style={[styles.actionIconBox, { backgroundColor: '#ECFDF5' }]}>
              <ShoppingBag size={18} color="#10B981" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.actionTitle}>Shop Readymades</Text>
              <Text style={styles.actionSubtitle}>Browse & order from boutiques</Text>
            </View>
            <ChevronRight size={18} color="#CBD5E1" />
          </TouchableOpacity>
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <LogOut size={18} color={Colors.danger} style={{ marginRight: 8 }} />
          <Text style={styles.logoutBtnText}>Sign Out</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
};

export default CustomerProfileScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  navbar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, height: 52, backgroundColor: '#F8FAFC',
  },
  navbarTitle: { fontSize: 17, fontFamily: 'Inter-Bold', color: '#0F172A' },
  scrollContent: { padding: 16, paddingBottom: 48 },

  // Hero Card
  heroCard: {
    backgroundColor: '#FFFFFF', borderRadius: 20, alignItems: 'center',
    marginBottom: 16, overflow: 'hidden', paddingBottom: 24,
    borderWidth: 1, borderColor: '#E2E8F0',
    shadowColor: '#6366F1', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06, shadowRadius: 12, elevation: 2,
  },
  heroBackground: { width: '100%', height: 68, backgroundColor: '#EDE9FE' },
  avatarWrapper: {
    marginTop: -36, marginBottom: 10,
    shadowColor: '#6366F1', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 4,
  },
  avatarBox: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#7C3AED', justifyContent: 'center', alignItems: 'center',
    borderWidth: 3, borderColor: '#FFFFFF',
  },
  avatarText: { fontSize: 26, fontFamily: 'Inter-Bold', color: '#FFFFFF' },
  userName: { fontSize: 20, fontFamily: 'Inter-Bold', color: '#0F172A', marginBottom: 4 },
  phoneRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  userPhone: { fontSize: 13, color: '#94A3B8', fontFamily: 'Inter-Medium' },
  memberBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#EEF2FF', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20,
  },
  memberBadgeText: { fontSize: 10, fontFamily: 'Inter-Bold', color: '#4F46E5', letterSpacing: 0.8 },

  // Summary
  summaryGrid: { marginBottom: 16 },
  summaryCard: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#E2E8F0', borderLeftWidth: 3,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  summaryCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  summaryCardTitle: {
    fontSize: 11, fontFamily: 'Inter-Bold', color: '#64748B',
    textTransform: 'uppercase', letterSpacing: 0.6, marginLeft: 6,
  },
  summaryStatRow: { flexDirection: 'row', alignItems: 'center' },
  summaryStat: { flex: 1, alignItems: 'center' },
  summaryStatValue: { fontSize: 22, fontFamily: 'Inter-Bold', color: '#4F46E5' },
  summaryStatLabel: { fontSize: 10, fontFamily: 'Inter-Medium', color: '#94A3B8', marginTop: 2 },
  summaryDivider: { width: 1, height: 32, backgroundColor: '#E2E8F0' },

  // Actions
  actionsCard: {
    backgroundColor: '#FFFFFF', borderRadius: 14, marginBottom: 16,
    borderWidth: 1, borderColor: '#E2E8F0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1, overflow: 'hidden',
  },
  actionRow: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  actionSeparator: { height: 1, backgroundColor: '#F1F5F9', marginHorizontal: 16 },
  actionIconBox: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  actionTitle: { fontSize: 14, fontFamily: 'Inter-SemiBold', color: '#0F172A', marginBottom: 2 },
  actionSubtitle: { fontSize: 11, fontFamily: 'Inter-Regular', color: '#94A3B8' },

  // Logout
  logoutBtn: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    height: 48, borderRadius: 12, borderWidth: 1,
    borderColor: '#FCA5A5', backgroundColor: '#FFF5F5',
  },
  logoutBtnText: { fontSize: 14, fontFamily: 'Inter-Bold', color: '#EF4444' },
});

