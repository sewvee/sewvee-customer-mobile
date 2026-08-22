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
    const filtered = orders.filter(order => {
      const orderMobile = (order.customerMobile || order.customer?.whatsappNumber || order.customer?.mobile || order.customer?.mobile_number || '').replace(/[^0-9]/g, '').slice(-10);
      return orderMobile === targetMobile;
    });
    return filtered.sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));
  }, [orders, user]);

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
    const isSale = item.order_type === 'SALE_ORDER';
    const orderLabel = item.billNo || item.order_number || (isSale ? `INV-${item.id}` : `ORD-${item.id}`);
    
    const outfits = item.outfits || item.items || [];
    const hasPendingPhotoRequest = !isSale && outfits.some(
      (outfit) => 
        ((outfit.requestedPhotosFromClient && outfit.requestedPhotosFromClient !== '0' && outfit.requestedPhotosFromClient !== 'false' && outfit.requestedPhotosFromClient !== 0) || (outfit.requested_photos_from_client && outfit.requested_photos_from_client !== '0' && outfit.requested_photos_from_client !== 'false' && outfit.requested_photos_from_client !== 0)) && 
        (!outfit.photos || outfit.photos.filter(p => p.category === 'REFERENCE').length === 0)
    );

    const deliveryDate = outfits.find(o => o.deliveryDate)?.deliveryDate;
    
    const typeLabel = isSale ? 'READY-MADE' : 'STITCHING';

    return (
      <TouchableOpacity
        style={styles.orderCardRevamped}
        activeOpacity={0.7}
        onPress={() => navigation.navigate('CustomerOrderDetail', { orderId: item.id })}
      >
        {/* Row 1: Boutique name (left), Date (right) */}
        <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12}}>
          {item.boutiqueName ? (
            <Text style={{fontSize: 15, fontFamily: 'Inter-Bold', color: '#1E293B', flex: 1}} numberOfLines={1}>
              {item.boutiqueName}
            </Text>
          ) : <View style={{ flex: 1 }} />}
          <View style={{flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#F1F5F9'}}>
            <Clock size={12} color="#64748B" style={{ marginRight: 4 }} />
            <Text style={{fontSize: 11, fontFamily: 'Inter-Medium', color: '#475569'}}>
              {deliveryDate ? formatDate(deliveryDate) : formatDate(item.date)}
            </Text>
          </View>
        </View>

        {/* Horizontal Divider */}
        <View style={{height: 1, backgroundColor: '#E2E8F0', marginBottom: 12}} />

        {/* Row 2: 4 columns with vertical dividers */}
        <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}}>
          {/* Col 1: Order No */}
          <View style={{flex: 1, alignItems: 'flex-start'}}>
            <Text style={{fontSize: 10, color: '#64748B', fontFamily: 'Inter-Medium', marginBottom: 4}}>Order No</Text>
            <Text style={{fontSize: 13, color: '#1E293B', fontFamily: 'Inter-Bold'}}>{orderLabel}</Text>
          </View>
          
          <View style={{width: 1, height: '100%', backgroundColor: '#E2E8F0', marginHorizontal: 6}} />
          
          {/* Col 2: Type */}
          <View style={{flex: 1, alignItems: 'center'}}>
            <Text style={{fontSize: 10, color: '#64748B', fontFamily: 'Inter-Medium', marginBottom: 4}}>Type</Text>
            <Text style={{fontSize: 11, color: isSale ? '#4338CA' : '#D97706', fontFamily: 'Inter-Bold'}}>{typeLabel}</Text>
          </View>

          <View style={{width: 1, height: '100%', backgroundColor: '#E2E8F0', marginHorizontal: 6}} />

          {/* Col 3: Total Amount */}
          <View style={{flex: 1, alignItems: 'center'}}>
            <Text style={{fontSize: 10, color: '#64748B', fontFamily: 'Inter-Medium', marginBottom: 4}}>Total Amount</Text>
            <Text style={{fontSize: 13, color: '#1E293B', fontFamily: 'Inter-Bold'}}>
              ₹{item.totalAmount || item.total || (Number(item.advance || item.paid || 0) + Number(item.balance || 0))}
            </Text>
          </View>

          <View style={{width: 1, height: '100%', backgroundColor: '#E2E8F0', marginHorizontal: 6}} />

          {/* Col 4: Due */}
          <View style={{flex: 1, alignItems: 'flex-end'}}>
            <Text style={{fontSize: 10, color: '#64748B', fontFamily: 'Inter-Medium', marginBottom: 4}}>Due</Text>
            <Text style={{fontSize: 13, color: '#EF4444', fontFamily: 'Inter-Bold'}}>₹{item.balance || 0}</Text>
          </View>
        </View>

        {/* PHOTO NEEDED Alert (Full Width below) */}
        {hasPendingPhotoRequest && (
          <View style={[styles.photoRequestAlert, { marginTop: 14, alignSelf: 'stretch', justifyContent: 'center', marginLeft: 0 }]}>
            <Camera size={14} color="#FFFFFF" style={{marginRight: 6}} />
            <Text style={[styles.photoRequestText, {fontSize: 12}]}>PHOTO NEEDED</Text>
          </View>
        )}
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

      <View style={{ flex: 1, backgroundColor: Colors.background }}>
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
            <View style={styles.requestAlertIconBg}>
              <Camera size={22} color="#F97316" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.alertTitle}>Photo Request</Text>
              <Text style={styles.alertSubtitle}>
                Boutique requested reference photos for your {req.outfitName} in Order #{req.billNo}.
              </Text>
            </View>
            <View style={styles.requestAlertActionBtn}>
              <Text style={styles.requestAlertActionText}>Upload</Text>
              <ChevronRight size={14} color="#F97316" strokeWidth={3} />
            </View>
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
      </View>

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
    backgroundColor: '#F5F3FF',
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
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  requestAlertIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    borderWidth: 1,
    borderColor: '#FFEDD5',
  },
  alertTitle: {
    fontSize: 15,
    fontFamily: 'Inter-Bold',
    color: '#9A3412',
    marginBottom: 2,
  },
  alertSubtitle: {
    fontSize: 13,
    color: '#C2410C',
    fontFamily: 'Inter-Medium',
    lineHeight: 18,
  },
  requestAlertActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FFEDD5',
    marginLeft: 8,
  },
  requestAlertActionText: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    color: '#F97316',
    marginRight: 2,
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
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  boutiquePill: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  boutiquePillText: {
    fontSize: 10,
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
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  orderDateText: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontFamily: 'Inter-SemiBold',
  },
  orderInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  orderNumberTitle: {
    fontSize: 13,
    fontFamily: 'Inter-Bold',
    color: Colors.textPrimary,
    letterSpacing: -0.2,
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
