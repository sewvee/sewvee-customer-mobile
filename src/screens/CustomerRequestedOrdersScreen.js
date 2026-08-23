import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Shadow } from '../constants/theme';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, ShoppingBag, XCircle } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useToast } from '../context/ToastContext';
import axios from 'axios';
import { URL_ORDERS } from '../config/env';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CustomerRequestedOrdersScreen = () => {
  const { orders, refreshData } = useData();
  const { user } = useAuth();
  const navigation = useNavigation();
  const { showToast } = useToast();
  const [refreshing, setRefreshing] = useState(false);
  const [cancelling, setCancelling] = useState(null);

  const requestedOrders = useMemo(() => {
    if (!user || !user.mobile) return [];
    const targetMobile = user.mobile.replace(/[^0-9]/g, '').slice(-10);
    const filtered = orders.filter(order => {
      const orderMobile = (order.customerMobile || order.customer?.whatsappNumber || order.customer?.mobile || order.customer?.mobile_number || '').replace(/[^0-9]/g, '').slice(-10);
      return orderMobile === targetMobile && (order.order_type === 'SALE_ORDER' || order.source === 'send order request');
    });
    return filtered.sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));
  }, [orders, user]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshData();
    setRefreshing(false);
  };

  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState(null);

  const handleCancelOrder = (order) => {
    setOrderToCancel(order);
    setCancelModalVisible(true);
  };

  const confirmCancel = async () => {
    if (!orderToCancel) return;
    setCancelModalVisible(false);
    setCancelling(orderToCancel.id);
    try {
      const token = await AsyncStorage.getItem('userToken');
      await axios.patch(`${URL_ORDERS}/${orderToCancel.id}/status`, { status_id: 4 }, {
        headers: { Authorization: token, 'Content-Type': 'application/json' }
      });
      showToast('Order cancelled successfully', 'success');
      await refreshData();
    } catch (err) {
      showToast('Failed to cancel order. Try again.', 'error');
    } finally {
      setCancelling(null);
      setOrderToCancel(null);
    }
  };

  const renderOrderItem = ({ item }) => {
    const statusStr = (item.status || '').toUpperCase();
    const isCancelled = statusStr === 'CANCELLED' || String(item.status_id) === '4';
    const isDelivered = statusStr === 'DELIVERED' || String(item.status_id) === '5';
    const isProcessing = statusStr === 'IN_PROGRESS' || statusStr === 'PROCESSING' || String(item.status_id) === '2';
    
    let displayStatus = 'Pending';
    let badgeColor = '#FEF3C7';
    let textColor = '#D97706';
    
    if (isCancelled) {
      displayStatus = 'Cancelled';
      badgeColor = '#FEE2E2';
      textColor = '#EF4444';
    } else if (isDelivered) {
      displayStatus = 'Delivered';
      badgeColor = '#DCFCE7';
      textColor = '#22C55E';
    } else if (isProcessing) {
      displayStatus = 'Processing';
      badgeColor = '#DBEAFE';
      textColor = '#2563EB';
    }

    const canCancel = !isCancelled && !isDelivered;

    return (
      <View style={styles.orderCard}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.boutiqueName}>{item.boutiqueName || 'Boutique'}</Text>
            <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 4}}>
              <Text style={{ fontFamily: 'Inter-Medium', fontSize: 13, color: Colors.primary }}>
                {item.billNo || item.order_number || (item.order_type === 'SALE_ORDER' ? `INV-${item.id}` : `ORD-${item.id}`)}
              </Text>
              <Text style={{ fontFamily: 'Inter-Medium', fontSize: 13, color: '#94A3B8', marginHorizontal: 6 }}>|</Text>
              <Text style={styles.orderDate}>{new Date(item.date || item.createdAt).toLocaleDateString()}</Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: badgeColor }]}>
            <Text style={[styles.statusText, { color: textColor }]}>
              {displayStatus}
            </Text>
          </View>
        </View>

        <View style={styles.itemsContainer}>
          {(item.items || []).map((itm, idx) => (
            <View key={`item-${idx}`} style={styles.outfitRow}>
              <View style={styles.outfitBullet} />
              <Text style={styles.outfitName}>{itm.name || 'Ready-Made Item'}{itm.qty && itm.qty > 1 ? ` (x${itm.qty})` : ''}</Text>
            </View>
          ))}
          {(item.outfits || []).map((outfit, idx) => (
            <View key={`outfit-${idx}`} style={styles.outfitRow}>
              <View style={styles.outfitBullet} />
              <Text style={styles.outfitName}>{outfit.name || 'Ready-Made Item'}{outfit.quantity && outfit.quantity > 1 ? ` (x${outfit.quantity})` : ''}</Text>
              <Text style={styles.outfitPrice}>₹{outfit.totalAmount || outfit.price || 0}</Text>
            </View>
          ))}
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.totalText}>Total: ₹{item.total_amount || item.total || 0}</Text>
          {canCancel && (
            <TouchableOpacity 
              style={[styles.cancelBtn, cancelling === item.id && { opacity: 0.5 }]} 
              onPress={() => handleCancelOrder(item)}
              disabled={cancelling === item.id}
            >
              <XCircle size={16} color={Colors.danger} style={{ marginRight: 6 }} />
              <Text style={styles.cancelBtnText}>{cancelling === item.id ? 'Cancelling...' : 'Cancel Request'}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Orders (Online)</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={{ flex: 1, backgroundColor: Colors.background }}>
      {requestedOrders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <ShoppingBag size={48} color="#CBD5E1" style={{ marginBottom: 16 }} />
          <Text style={styles.emptyTitle}>No Orders Yet</Text>
          <Text style={styles.emptySubtitle}>Your online readymade orders will appear here.</Text>
        </View>
      ) : (
        <FlatList
          data={requestedOrders}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderOrderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
        />
      )}
      </View>

      <Modal visible={cancelModalVisible} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.5)', justifyContent: 'center', padding: 20 }}>
          <View style={{ backgroundColor: 'white', borderRadius: 24, padding: 24, alignItems: 'center' }}>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <XCircle size={32} color="#EF4444" />
            </View>
            <Text style={{ fontFamily: 'Inter-Bold', fontSize: 20, color: '#111827', marginBottom: 8 }}>Cancel Order</Text>
            <Text style={{ fontFamily: 'Inter-Regular', fontSize: 15, color: '#6B7280', textAlign: 'center', marginBottom: 24 }}>
              Are you sure you want to cancel this order request? This action cannot be undone.
            </Text>
            
            <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
              <TouchableOpacity 
                style={{ flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: '#F3F4F6', alignItems: 'center' }}
                onPress={() => {
                  setCancelModalVisible(false);
                  setOrderToCancel(null);
                }}
              >
                <Text style={{ fontFamily: 'Inter-SemiBold', fontSize: 15, color: '#4B5563' }}>No, Keep it</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={{ flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: '#EF4444', alignItems: 'center' }}
                onPress={confirmCancel}
              >
                <Text style={{ fontFamily: 'Inter-SemiBold', fontSize: 15, color: 'white' }}>Yes, Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default CustomerRequestedOrdersScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F3FF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 56,
    backgroundColor: '#F5F3FF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: Colors.textPrimary,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  orderCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    ...Shadow.subtle,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  boutiqueName: {
    fontSize: 15,
    fontFamily: 'Inter-Bold',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: Colors.textSecondary,
  },
  statusBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    color: '#D97706',
  },
  itemsContainer: {
    marginBottom: 12,
  },
  outfitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  outfitBullet: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.textSecondary,
    marginRight: 8,
  },
  outfitName: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    color: Colors.textPrimary,
  },
  outfitPrice: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: Colors.textPrimary,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  totalText: {
    fontSize: 15,
    fontFamily: 'Inter-Bold',
    color: Colors.textPrimary,
  },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  cancelBtnText: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    color: Colors.danger,
  },
});
