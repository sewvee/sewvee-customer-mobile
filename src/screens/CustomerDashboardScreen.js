import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Spacing, Shadow } from '../constants/theme';
import { 
  LayoutGrid, 
  ShoppingBag, 
  User, 
  ChevronRight, 
  Flame, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Sparkles,
  ArrowRight,
  Package,
  Check,
  Camera,
  Scissors
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { formatDate } from '../utils/dateUtils';
import { formatOrderNumber } from '../utils/orderIdFormatter';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const CustomerDashboardScreen = ({ navigation }) => {
  const { user, logout } = useAuth();
  const { orders, refreshData, loading } = useData();
  const [refreshing, setRefreshing] = useState(false);
  
  // Welcome Carousel modal state
  const [showIntro, setShowIntro] = useState(false);
  const [introIndex, setIntroIndex] = useState(0);

  // Filter orders matching logged in customer's mobile
  const customerOrders = React.useMemo(() => {
    if (!user || !user.mobile) return [];
    const targetMobile = user.mobile.replace(/[^0-9]/g, '').slice(-10);
    return orders.filter(order => {
      const orderMobile = (order.customerMobile || order.customer?.whatsappNumber || order.customer?.mobile_number || '').replace(/[^0-9]/g, '').slice(-10);
      return orderMobile === targetMobile;
    });
  }, [orders, user]);

  // Check if there are any active upload requests
  const pendingRequests = React.useMemo(() => {
    const requests = [];
    customerOrders.forEach(order => {
      if (order.status === 'Cancelled' || order.status === 'Delivered') return;
      const outfits = order.outfits || order.items || [];
      outfits.forEach(outfit => {
        if (outfit.requestedPhotosFromClient && (!outfit.photos || outfit.photos.filter(p => p.category === 'REFERENCE').length === 0)) {
          requests.push({
            orderId: order.id,
            billNo: order.billNo || order.id,
            outfitName: outfit.name || outfit.type || 'Outfit',
            outfitId: outfit.id
          });
        }
      });
    });
    return requests;
  }, [customerOrders]);

  // Metrics
  const metrics = React.useMemo(() => {
    let active = 0;
    let ready = 0;
    let completed = 0;

    customerOrders.forEach(order => {
      if (order.status === 'Cancelled') return;
      if (order.status === 'Delivered') {
        completed++;
      } else if (order.status === 'Completed' || order.status === 'Ready') {
        ready++;
        active++;
      } else {
        active++;
      }
    });

    return { active, ready, completed };
  }, [customerOrders]);

  useEffect(() => {
    checkIntroStatus();
  }, []);

  const checkIntroStatus = async () => {
    try {
      const seen = await AsyncStorage.getItem('sewvee_has_seen_intro');
      if (!seen) {
        setShowIntro(true);
      }
    } catch (e) {
      console.log(e);
    }
  };

  const handleFinishIntro = async () => {
    try {
      await AsyncStorage.setItem('sewvee_has_seen_intro', 'true');
      setShowIntro(false);
    } catch (e) {
      setShowIntro(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshData();
    setRefreshing(false);
  };

  const getStatusDisplayText = (statusValue) => {
    if (!statusValue) return 'Yet to Start';
    const normalized = String(statusValue).toUpperCase().trim();
    if (normalized === 'YET TO START' || normalized === 'PENDING' || normalized === 'YET_TO_START') return 'Pending';
    if (normalized === 'STITCHING' || normalized === 'IN PROGRESS' || normalized === 'IN_PROGRESS') return 'Stitching';
    if (normalized === 'COMPLETED' || normalized === 'READY') return 'Ready';
    if (normalized === 'DELIVERED') return 'Delivered';
    if (normalized === 'CANCELLED') return 'Cancelled';
    return String(statusValue)
      .split('_')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  };

  const getStatusColor = (status) => {
    const text = getStatusDisplayText(status);
    if (text.includes('Pending') || text.includes('Yet To Start')) return { color: '#F97316', bg: '#FFF7ED', step: 1 };
    if (text.includes('Stitching') || text.includes('Progress')) return { color: '#3B82F6', bg: '#EFF6FF', step: 2 };
    if (text.includes('Quality') || text.includes('Check')) return { color: '#8B5CF6', bg: '#F5F3FF', step: 3 };
    if (text.includes('Ready') || text.includes('Completed')) return { color: '#10B981', bg: '#F0FDF4', step: 3 };
    if (text.includes('Delivered')) return { color: '#14B8A6', bg: '#F0FDFA', step: 4 };
    return { color: '#6B7280', bg: '#F3F4F6', step: 1 };
  };

  const introSlides = [
    {
      title: 'Your Orders',
      subtitle: 'Keep a clean and smooth tab on the stitching and delivery status of all your designer blouses, lehengas, and outfits in real-time.',
      icon: <Package size={48} color={Colors.primary} />,
      bg: '#EEF2FF'
    },
    {
      title: 'Ideas & Inspirations',
      subtitle: 'Instantly share design sketches, sleeve references, and neck patterns directly with the boutique tailors without WhatsApp clutter.',
      icon: <Sparkles size={48} color={Colors.primary} />,
      bg: '#FDF2F8'
    },
    {
      title: 'Beautify Your Things',
      subtitle: 'Courier your favorite sample garments to record and lock your measurements history for future stitching orders.',
      icon: <CheckCircle2 size={48} color={Colors.primary} />,
      bg: '#ECFDF5'
    }
  ];

  const renderOrderItem = ({ item }) => {
    const orderNum = item.billNo || item.id;
    const outfits = item.outfits || item.items || [];
    const hasPendingPhotoRequest = outfits.some(
      (outfit) => 
        (outfit.requestedPhotosFromClient === true || outfit.requestedPhotosFromClient === 'true' || outfit.requestedPhotosFromClient === 1) && 
        (!outfit.photos || outfit.photos.filter(p => p.category === 'REFERENCE').length === 0)
    );

    const deliveryDate = outfits.find(o => o.deliveryDate)?.deliveryDate;
    const outfitTypes = outfits.map(o => o.orderType || 'Stitching').filter((v, i, a) => a.indexOf(v) === i).join(' • ').toUpperCase();

    return (
      <TouchableOpacity
        style={styles.orderCardRevamped}
        activeOpacity={0.7}
        onPress={() => navigation.navigate('CustomerOrderDetail', { orderId: item.id })}
      >
        {/* Top Info: Boutique and Date */}
        <View style={styles.cardTopRow}>
          {item.boutiqueName ? (
            <View style={styles.boutiquePill}>
              <Text style={styles.boutiquePillText} numberOfLines={1}>{item.boutiqueName}</Text>
            </View>
          ) : <View />}
          <View style={styles.dateBadge}>
            <Clock size={12} color={Colors.textSecondary} style={{ marginRight: 4 }} />
            <Text style={styles.orderDateText}>{deliveryDate ? `Del: ${formatDate(deliveryDate)}` : formatDate(item.date)}</Text>
          </View>
        </View>

        {/* Order Info */}
        <View style={styles.orderInfoRow}>
          <View>
            <Text style={{fontSize: 12, color: Colors.primary, fontFamily: 'Inter-Bold', marginBottom: 2, letterSpacing: 0.5}}>
              {outfitTypes || 'OUTFIT'}
            </Text>
            <Text style={styles.orderNumberTitle}>Order #{orderNum}</Text>
          </View>
          
          <View style={styles.actionFooterIcon}>
            <ChevronRight size={18} color={Colors.primary} />
          </View>
        </View>

        {/* Financials & Alerts */}
        <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#F1F5F9'}}>
          <View style={{flex: 1}}>
             <Text style={{fontSize: 11, color: '#64748B', fontFamily: 'Inter-Medium', marginBottom: 2}}>Paid</Text>
             <Text style={{fontSize: 15, color: '#10B981', fontFamily: 'Inter-Bold'}}>₹{item.advance || item.paid || 0}</Text>
          </View>
          <View style={{flex: 1}}>
             <Text style={{fontSize: 11, color: '#64748B', fontFamily: 'Inter-Medium', marginBottom: 2}}>Due Balance</Text>
             <Text style={{fontSize: 15, color: '#EF4444', fontFamily: 'Inter-Bold'}}>₹{item.balance || 0}</Text>
          </View>
          
          {hasPendingPhotoRequest && (
            <View style={[styles.photoRequestAlert, { marginLeft: 0 }]}>
              <Camera size={12} color="#FFFFFF" />
              <Text style={styles.photoRequestText}>Photo Needed</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Welcome Banner */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greetingText}>Hello, {user?.name || 'Customer'}!</Text>
          <Text style={styles.subGreetingText}>Check your custom stitching orders</Text>
        </View>
        <TouchableOpacity style={styles.avatarButton} onPress={() => navigation.navigate('CustomerProfile')}>
          <View style={styles.avatarInner}>
            <User size={20} color={Colors.primary} />
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
        }
      >

        {/* ACTIVE REQUESTS ALERT */}
        {pendingRequests.map((req, idx) => (
          <TouchableOpacity
            key={`${req.orderId}-${req.outfitId}-${idx}`}
            style={styles.requestAlert}
            activeOpacity={0.9}
            onPress={() => navigation.navigate('CustomerOrderDetail', { orderId: req.orderId })}
          >
            <AlertCircle size={20} color="#DC2626" style={{ marginRight: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.alertTitle}>Action Required</Text>
              <Text style={styles.alertSubtitle}>
                Boutique requested reference photos for your {req.outfitName} in Order #{req.billNo}. Tap to upload.
              </Text>
            </View>
            <ChevronRight size={18} color="#DC2626" />
          </TouchableOpacity>
        ))}

        {/* ORDERS SECTION */}
        <Text style={styles.sectionTitle}>Your Active Orders</Text>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : customerOrders.length > 0 ? (
          <FlatList
            data={customerOrders}
            renderItem={renderOrderItem}
            keyExtractor={item => item.id}
            scrollEnabled={false}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Image
              source={require('../assets/lightBlue.png')}
              style={styles.emptyImg}
              resizeMode="contain"
            />
            <Text style={styles.emptyTitle}>No Active Orders</Text>
            <Text style={styles.emptySubtitle}>
              When you place an order with your boutique, tracking updates and styling parameters will show up here.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* WELCOME INTRODUCTION CAROUSEL */}
      <Modal visible={showIntro} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeaderTitle}>Welcome to Sewvee</Text>
              <View style={styles.indicatorContainer}>
                {introSlides.map((_, i) => (
                  <View 
                    key={i} 
                    style={[
                      styles.indicatorDot, 
                      introIndex === i && styles.indicatorDotActive
                    ]} 
                  />
                ))}
              </View>
            </View>

            {/* Slide Body */}
            <View style={[styles.slideContainer, { backgroundColor: introSlides[introIndex].bg }]}>
              <View style={styles.slideIconBox}>
                {introSlides[introIndex].icon}
              </View>
              <Text style={styles.slideTitle}>{introSlides[introIndex].title}</Text>
              <Text style={styles.slideSubtitle}>{introSlides[introIndex].subtitle}</Text>
            </View>

            {/* Slide Navigation */}
            <View style={styles.modalFooter}>
              {introIndex > 0 ? (
                <TouchableOpacity 
                  style={styles.introBackBtn}
                  onPress={() => setIntroIndex(prev => prev - 1)}
                >
                  <Text style={styles.introBackBtnText}>Back</Text>
                </TouchableOpacity>
              ) : <View style={{ width: 60 }} />}

              {introIndex < introSlides.length - 1 ? (
                <TouchableOpacity 
                  style={styles.introNextBtn}
                  onPress={() => setIntroIndex(prev => prev + 1)}
                >
                  <Text style={styles.introNextBtnText}>Next</Text>
                  <ArrowRight size={16} color="white" />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity 
                  style={[styles.introNextBtn, { backgroundColor: Colors.success }]}
                  onPress={handleFinishIntro}
                >
                  <Text style={styles.introNextBtnText}>Get Started</Text>
                  <Check size={16} color="white" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default CustomerDashboardScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  greetingText: {
    fontSize: 22,
    fontFamily: 'Inter-Bold',
    color: Colors.textPrimary,
  },
  subGreetingText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontFamily: 'Inter-Medium',
    marginTop: 2,
  },
  avatarButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadow.subtle,
  },
  avatarInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: 16,
    paddingVertical: 16,
    ...Shadow.subtle,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: Colors.primary,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontFamily: 'Inter-Medium',
    marginTop: 4,
  },
  requestAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  alertTitle: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: '#991B1B',
  },
  alertSubtitle: {
    fontSize: 12,
    color: '#7F1D1D',
    fontFamily: 'Inter-Medium',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: Colors.textPrimary,
    marginBottom: 16,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  orderCardRevamped: {
    backgroundColor: Colors.white,
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#EEF2FF',
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  boutiquePill: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  boutiquePillText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#334155',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 10,
    fontFamily: 'Inter-Bold',
    textTransform: 'uppercase',
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  orderDateText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontFamily: 'Inter-SemiBold',
  },
  orderInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  orderNumberTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  photoRequestAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F97316',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
    marginLeft: 8,
  },
  photoRequestText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: 'Inter-Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  itemsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  itemsIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  itemsContent: {
    flex: 1,
  },
  itemsLabel: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontFamily: 'Inter-Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  itemsValue: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: Colors.textPrimary,
  },
  cardActionFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  actionFooterText: {
    color: Colors.primary,
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    marginRight: 8,
  },
  actionFooterIcon: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    marginTop: 4,
    marginBottom: 16,
  },
  stepperLine: {
    position: 'absolute',
    left: 20,
    right: 20,
    height: 3,
    backgroundColor: '#E2E8F0',
    top: 9,
    zIndex: 1,
  },
  stepperProgressLine: {
    height: '100%',
    backgroundColor: Colors.primary,
  },
  stepWrapper: {
    alignItems: 'center',
    zIndex: 2,
  },
  stepDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#E2E8F0',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepDotActive: {
    backgroundColor: Colors.primary,
    borderColor: '#EEF2FF',
  },
  stepLabel: {
    fontSize: 10,
    fontFamily: 'Inter-Medium',
    color: '#94A3B8',
    marginTop: 4,
  },
  stepLabelActive: {
    color: Colors.primary,
    fontFamily: 'Inter-SemiBold',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 14,
  },
  footerBalanceText: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#EF4444',
  },
  viewDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewDetailsText: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: Colors.primary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    backgroundColor: Colors.white,
    borderRadius: 20,
    paddingHorizontal: 24,
    ...Shadow.subtle,
  },
  emptyImg: {
    height: 120,
    width: 120,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: Colors.textPrimary,
  },
  emptySubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
  },

  // INTRO MODAL STYLES
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    backgroundColor: Colors.white,
    borderRadius: 24,
    padding: 24,
    ...Shadow.large,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalHeaderTitle: {
    fontSize: 15,
    fontFamily: 'Inter-Bold',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  indicatorContainer: {
    flexDirection: 'row',
    gap: 6,
  },
  indicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E2E8F0',
  },
  indicatorDotActive: {
    width: 18,
    backgroundColor: Colors.primary,
  },
  slideContainer: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    height: 280,
    justifyContent: 'center',
  },
  slideIconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    ...Shadow.subtle,
  },
  slideTitle: {
    fontSize: 22,
    fontFamily: 'Inter-Bold',
    color: Colors.textPrimary,
    marginBottom: 10,
    textAlign: 'center',
  },
  slideSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    fontFamily: 'Inter-Medium',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
  },
  introBackBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  introBackBtnText: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: Colors.textSecondary,
  },
  introNextBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    ...Shadow.subtle,
  },
  introNextBtnText: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: Colors.white,
  },
});
