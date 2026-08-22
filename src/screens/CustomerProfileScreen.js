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
import { ChevronRight, LogOut } from 'lucide-react-native';
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

  const stitchingCompleted = stitchingOrders.filter(o => {
    const s = (o.statusName || o.status || '').toLowerCase();
    return s === 'delivered' || s === 'completed';
  }).length;

  const stitchingPending = stitchingOrders.filter(o => {
    const s = (o.statusName || o.status || '').toLowerCase();
    return s !== 'delivered' && s !== 'completed' && s !== 'cancelled';
  }).length;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Combined Profile + Stats Card */}
        <View style={styles.profileCard}>
          {/* Avatar & Info */}
          <View style={styles.avatarBox}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.userName}>{user?.name || 'Customer'}</Text>
          <Text style={styles.userPhone}>{user?.mobile || 'No phone'}</Text>
          <View style={styles.memberBadge}>
            <Text style={styles.memberBadgeText}>Sewvee Customer</Text>
          </View>

          {/* Divider */}
          <View style={styles.cardDivider} />

          {/* Stitching Stats */}
          <Text style={styles.statsLabel}>Custom Stitching</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stitchingOrders.length}</Text>
              <Text style={styles.statSublabel}>Total</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#F59E0B' }]}>{stitchingPending}</Text>
              <Text style={styles.statSublabel}>Active</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#10B981' }]}>{stitchingCompleted}</Text>
              <Text style={styles.statSublabel}>Done</Text>
            </View>
          </View>
        </View>

        {/* Quick Links */}
        <View style={styles.linksCard}>
          <TouchableOpacity style={styles.linkRow} onPress={() => navigation.navigate('CustomerRequestedOrders')}>
            <View style={styles.linkTextGroup}>
              <Text style={styles.linkTitle}>My Orders</Text>
              <Text style={styles.linkSub}>View all your online orders</Text>
            </View>
            <ChevronRight size={16} color="#CBD5E1" />
          </TouchableOpacity>
          <View style={styles.linkSeparator} />
          <TouchableOpacity style={styles.linkRow} onPress={() => navigation.navigate('CustomerShop')}>
            <View style={styles.linkTextGroup}>
              <Text style={styles.linkTitle}>Shop Readymades</Text>
              <Text style={styles.linkSub}>Browse & order from boutiques</Text>
            </View>
            <ChevronRight size={16} color="#CBD5E1" />
          </TouchableOpacity>
        </View>

        {/* Sign Out */}
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <LogOut size={15} color="#EF4444" style={{ marginRight: 6 }} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
};

export default CustomerProfileScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  scrollContent: { paddingHorizontal: 16, paddingTop: 24, paddingBottom: 48 },

  // Combined Card
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 20,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  avatarBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#7C3AED',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatarText: { fontSize: 20, fontFamily: 'Inter-Bold', color: '#FFFFFF' },
  userName: { fontSize: 17, fontFamily: 'Inter-Bold', color: '#0F172A', marginBottom: 3 },
  userPhone: { fontSize: 13, color: '#94A3B8', fontFamily: 'Inter-Regular', marginBottom: 10 },
  memberBadge: {
    backgroundColor: '#F0F4FF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E7FF',
    marginBottom: 18,
  },
  memberBadgeText: { fontSize: 11, fontFamily: 'Inter-SemiBold', color: '#4F46E5' },

  cardDivider: { width: '100%', height: 1, backgroundColor: '#F1F5F9', marginBottom: 16 },

  statsLabel: {
    fontSize: 10,
    fontFamily: 'Inter-SemiBold',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 14,
    alignSelf: 'flex-start',
  },
  statsRow: { flexDirection: 'row', alignItems: 'center', width: '100%' },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 22, fontFamily: 'Inter-Bold', color: '#4F46E5' },
  statSublabel: { fontSize: 11, fontFamily: 'Inter-Regular', color: '#94A3B8', marginTop: 2 },
  statDivider: { width: 1, height: 32, backgroundColor: '#E2E8F0' },

  // Links
  linksCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
    overflow: 'hidden',
  },
  linkRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16 },
  linkSeparator: { height: 1, backgroundColor: '#F1F5F9', marginHorizontal: 16 },
  linkTextGroup: { flex: 1 },
  linkTitle: { fontSize: 14, fontFamily: 'Inter-SemiBold', color: '#0F172A', marginBottom: 2 },
  linkSub: { fontSize: 12, fontFamily: 'Inter-Regular', color: '#94A3B8' },

  // Sign Out
  logoutBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    backgroundColor: '#FFF5F5',
  },
  logoutText: { fontSize: 14, fontFamily: 'Inter-SemiBold', color: '#EF4444' },
});
