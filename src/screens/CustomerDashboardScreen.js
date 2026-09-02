import React, { useState, useEffect } from 'react';
import {
  Platform,
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
  StatusBar, Alert,
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
  Scissors,
  ChevronDown,
  MessageCircle,
  Bell
} from 'lucide-react-native';
import axios from 'axios';
import { URL_CUSTOMER_PORTAL_SHOP, BASE_URL } from '../config/env';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { formatDate } from '../utils/dateUtils';
import { formatOrderNumber } from '../utils/orderIdFormatter';
import LinearGradient from 'react-native-linear-gradient';
import QuickActionCard from '../components/QuickActionCard';
import { Linking } from 'react-native';

const API_DOMAIN = BASE_URL.replace('/mobile/', '');

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const CustomerDashboardScreen = ({ navigation }) => {
  const { user, logout } = useAuth();
  const { orders, refreshData, loading } = useData();
  const [refreshing, setRefreshing] = useState(false);
  
  const [shopItems, setShopItems] = useState([]);
  const [loadingShop, setLoadingShop] = useState(false);
  const [banners, setBanners] = useState([]);
  const [stripIndex, setStripIndex] = useState(0);

  // Fetch banners from marketing API
  useEffect(() => {
    fetch(`${BASE_URL}marketing/banners?platform=MOBILE&target_app=CUSTOMER_APP`)
      .then(res => res.json())
      .then(data => {
        console.log('Banners response:', data);
        let fetchedBanners = [];
        if (data && data.banners) fetchedBanners = data.banners;
        else if (data && Array.isArray(data.data)) fetchedBanners = data.data;
        else if (Array.isArray(data)) fetchedBanners = data;
        
        // Ensure backend isn't sending business app banners
        const validBanners = fetchedBanners.filter(b => 
          b.target_app === 'CUSTOMER_APP' || 
          b.target_app === 'ALL' || 
          !b.target_app
        );
        
        setBanners(validBanners);
      })
      .catch((err) => {
        console.warn('Banner fetch error:', err.message);
      });
  }, []);

  // Auto-rotate strip banners
  const stripBanners = React.useMemo(() => banners.filter(b => b.type === 'STRIP'), [banners]);
  const inlineBanners = React.useMemo(() => banners.filter(b => b.type !== 'STRIP'), [banners]);

  useEffect(() => {
    if (stripBanners.length <= 1) return;
    const interval = setInterval(() => {
      setStripIndex(prev => (prev + 1) % stripBanners.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [stripBanners.length]);

  useEffect(() => {
    fetchInitialShopItems();
  }, [user, orders]);

  const fetchInitialShopItems = async () => {
    try {
      if (orders && orders.length > 0) {
        const boutiqueId = orders[0].boutiqueId || orders[0].company_id;
        if (boutiqueId) {
          await fetchShopItems(boutiqueId);
          return;
        }
      }
      const res = await fetch(`${BASE_URL}marketing/customer/store/catalogue`);
      const data = await res.json();
      if (data) {
        const items = data.data || data.products || (Array.isArray(data) ? data : []);
        setShopItems(items.slice(0, 5));
      }
    } catch (err) {
      console.warn('Failed to fetch initial shop items', err.message);
    }
  };

  const fetchShopItems = async (companyId) => {
    try {
      setLoadingShop(true);
      const res = await fetch(`${URL_CUSTOMER_PORTAL_SHOP}?companyId=${companyId}`);
      const data = await res.json();
      if (data) {
        const items = data.data || data.products || (Array.isArray(data) ? data : []);
        setShopItems(items.slice(0, 5));
      }
    } catch (err) {
      console.warn('Failed to fetch shop items for dashboard', err.message);
    } finally {
      setLoadingShop(false);
    }
  };

  // Welcome Carousel modal state
  const [showIntro, setShowIntro] = useState(false);
  const [introIndex, setIntroIndex] = useState(0);

  // Filter orders matching logged in customer's mobile

  

  const renderBanner = ({ item }) => {
    if (item.image_url || item.mobile_image_url) {
      const imgUrl = item.mobile_image_url || item.image_url;
      const fullUrl = imgUrl.startsWith('http') ? imgUrl : `${API_DOMAIN}/${imgUrl}`;
      return (
        <TouchableOpacity activeOpacity={0.9} style={{ width: SCREEN_WIDTH * 0.85, marginRight: 16 }} onPress={() => item.cta_action_value && Linking.openURL(item.cta_action_value).catch(()=>{})}>
          <View style={{ height: 140, borderRadius: 16, overflow: 'hidden', backgroundColor: '#E2E8F0' }}>
            <Image source={{ uri: fullUrl }} style={{ width: '100%', height: '100%', resizeMode: 'cover' }} />
          </View>
        </TouchableOpacity>
      );
    }
    // Fallback for strip/text
    return (
      <TouchableOpacity activeOpacity={0.9} style={{ width: SCREEN_WIDTH * 0.85, marginRight: 16 }} onPress={() => item.cta_action_value && Linking.openURL(item.cta_action_value).catch(()=>{})}>
        <View style={{ height: 140, borderRadius: 16, padding: 20, justifyContent: 'space-between', backgroundColor: item.bg_color || '#5B43EE' }}>
          <View>
            <Text style={{ fontSize: 20, fontFamily: 'Inter-Bold', color: item.text_color || '#FFF', marginBottom: 4 }}>{item.title}</Text>
            {item.subtitle && <Text style={{ fontSize: 13, fontFamily: 'Inter-Medium', color: item.text_color || '#FFF', opacity: 0.9 }}>{item.subtitle}</Text>}
          </View>
          {item.cta_label && (
            <View style={{ backgroundColor: 'rgba(255,255,255,0.25)', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 }}>
              <Text style={{ fontSize: 12, fontFamily: 'Inter-Bold', color: item.text_color || '#FFF' }}>{item.cta_label}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };
  const customerOrders = React.useMemo(() => {
    if (!orders || orders.length === 0) return [];
    return [...orders].sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt)).slice(0, 5);
  }, [orders]);

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

  
  const renderShopItem = ({ item }) => {
    let imageUrl = null;
    const itemImageStr = item.images || item.image_url;
    if (itemImageStr) {
      let firstUrl = itemImageStr.split(',')[0].trim();
      if (Platform.OS === 'android' && firstUrl.includes('localhost')) {
        firstUrl = firstUrl.replace('localhost', '10.0.2.2');
      }
      const rootUrl = BASE_URL.replace('/mobile/', '/');
      if (firstUrl.startsWith('http')) imageUrl = encodeURI(firstUrl);
      else if (firstUrl.startsWith('/')) imageUrl = encodeURI(rootUrl + firstUrl.substring(1));
      else imageUrl = encodeURI(rootUrl + firstUrl);
    }
    return (
      <TouchableOpacity 
        style={styles.dashShopCard}
        onPress={() => navigation.navigate('CustomerShop')}
      >
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.dashShopImg} />
        ) : (
          <View style={[styles.dashShopImg, { backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' }]}>
            <ShoppingBag color="#94A3B8" size={24} />
          </View>
        )}
        <View style={styles.dashShopInfo}>
          <Text style={styles.dashShopName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.dashShopPrice}>₹{item.price}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderOrderItem = ({ item }) => {
    const isSale = item.order_type === 'SALE_ORDER';
    const orderLabel = item.billNo || item.order_number || (isSale ? `INV-${item.id}` : `ORD-${item.id}`);
    
    const outfits = item.outfits || item.items || [];
    const hasPendingPhotoRequest = !isSale && outfits.some(
      (outfit) => 
        (outfit.requestedPhotosFromClient || outfit.requested_photos_from_client)
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
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{fontSize: 15, fontFamily: 'Inter-Bold', color: '#1E293B'}} numberOfLines={1}>
                {item.boutiqueName}
              </Text>
              {item.has_unread_messages ? (
                <View style={{ marginLeft: 6, backgroundColor: '#EF4444', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 }}>
                  <Text style={{ color: '#FFF', fontSize: 9, fontFamily: 'Inter-Bold' }}>New Message</Text>
                </View>
              ) : null}
            </View>
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

  const selectedBoutiqueName = React.useMemo(() => {
    if (orders && orders.length > 0 && orders[0].boutiqueName) {
      return orders[0].boutiqueName;
    }
    return 'Techno Genesis';
  }, [orders]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F3FF" />
      <View style={styles.header}>
        <TouchableOpacity style={[styles.boutiqueSelector, {flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', padding: 8, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', flex: 1, marginRight: 16}]}>
          <View style={{width: 36, height: 36, borderRadius: 18, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center', marginRight: 12}}>
            <ShoppingBag size={18} color="#5B43EE" />
          </View>
          <View style={{flex: 1}}>
            <Text style={[styles.shoppingAtText, {fontSize: 10, textTransform: 'uppercase', color: '#64748B', fontFamily: 'Inter-Bold', marginBottom: 0}]}>SHOPPING AT</Text>
            <View style={styles.boutiqueDropdown}>
              <Text style={[styles.boutiqueNameText, {fontSize: 15, color: '#1E293B', fontFamily: 'Inter-Bold'}]} numberOfLines={1}>{selectedBoutiqueName}</Text>
              <ChevronDown size={16} color="#1E293B" style={{ marginLeft: 4 }} />
            </View>
          </View>
        </TouchableOpacity>
        <View style={styles.headerActions}>
          
          <TouchableOpacity style={styles.iconButton} onPress={() => navigation.navigate('NotificationsScreen')}>
            <Bell size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ flex: 1, backgroundColor: Colors.background }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
        }
      >

        {/* STRIP BANNER — auto-rotating colored bar */}
        {stripBanners.length > 0 && (() => {
          const active = stripBanners[stripIndex];
          return (
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => active.cta_action_value && Linking.openURL(active.cta_action_value).catch(() => {})}
              style={{
                backgroundColor: active.bg_color || '#4F46E5',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 16,
                paddingVertical: 10,
                marginBottom: 0,
                marginHorizontal: -20,
              }}
            >
              {stripBanners.length > 1 && (
                <View style={{ flexDirection: 'row', gap: 4, marginRight: 8 }}>
                  {stripBanners.map((_, i) => (
                    <View key={i} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,' + (i === stripIndex ? '1' : '0.4') + ')' }} />
                  ))}
                </View>
              )}
              <Text
                style={{ flex: 1, color: active.text_color || '#FFF', fontSize: 12, fontFamily: 'Inter-SemiBold' }}
                numberOfLines={1}
              >
                {active.title}
              </Text>
              {active.cta_label && (
                <View style={{ backgroundColor: 'rgba(255,255,255,0.9)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, marginLeft: 8 }}>
                  <Text style={{ color: active.bg_color || '#4F46E5', fontSize: 10, fontFamily: 'Inter-Bold' }}>
                    {active.cta_label}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })()}

        {/* INLINE BANNERS */}
        {inlineBanners.length > 0 && (
          <View style={{ marginBottom: 8, marginTop: 16, marginHorizontal: -4 }}>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={inlineBanners}
              keyExtractor={item => item.id?.toString() || Math.random().toString()}
              renderItem={renderBanner}
              snapToInterval={SCREEN_WIDTH * 0.85 + 16}
              decelerationRate="fast"
              contentContainerStyle={{ paddingRight: 20 }}
            />
          </View>
        )}

        {/* QUICK ACTIONS */}
        <Text style={styles.sectionTitle}>Quick Actions (Banners: {banners.length}, Shop: {shopItems.length}, Orders: {orders?.length})</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 0, marginHorizontal: -4 }}>
          <QuickActionCard
            title="Stitching"
            icon={<Scissors size={20} color={Colors.primary} />}
            primary={true}
            onPress={() => navigation.navigate('NewStitchRequest')}
          />
          <QuickActionCard
            title="Readymade"
            icon={<ShoppingBag size={20} color={Colors.primary} />}
            onPress={() => navigation.navigate('CustomerShop')}
          />
          <QuickActionCard
            title="My Designs"
            icon={<Camera size={20} color={Colors.primary} />}
            onPress={() => navigation.navigate('CustomerGallery')}
          />
        </View>

        
        {shopItems.length > 0 && (
          <>
            <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginTop: 24, marginBottom: 16}}>
              <Text style={[styles.sectionTitle, {marginBottom:0, marginTop:0}]}>Featured in Shop</Text>
              <TouchableOpacity onPress={() => navigation.navigate('CustomerShop')}>
                <Text style={{color:Colors.primary, fontFamily:'Inter-SemiBold', fontSize:13}}>View All</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={shopItems}
              keyExtractor={item => item.id.toString()}
              renderItem={renderShopItem}
              contentContainerStyle={{ paddingRight: 20 }}
            />
          </>
        )}

        {/* ORDERS SECTION */}
        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Your Active Orders</Text>

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
            <Text style={styles.emptyTitle}>Welcome 👋</Text>
            <Text style={styles.emptySubtitle}>
              Start your first stitching order.
            </Text>
            <TouchableOpacity 
              style={styles.newOrderButton}
              onPress={() => { /* Navigate to new stitch order flow */ }}
            >
              <Text style={styles.newOrderButtonText}>New Stitch Order</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* OFFERS / RECOMMENDED COLLECTIONS SECTION */}
        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Recommended For You</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
          <View style={[styles.offerCard, { backgroundColor: '#FEF3C7' }]}>
            <Text style={styles.offerTitle}>Flat 20% Off</Text>
            <Text style={styles.offerSubtitle}>On Bridal Lehengas</Text>
          </View>
          <View style={[styles.offerCard, { backgroundColor: '#E0E7FF' }]}>
            <Text style={styles.offerTitle}>New Arrivals</Text>
            <Text style={styles.offerSubtitle}>Check out the latest blouses</Text>
          </View>
        </ScrollView>
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
  boutiqueSelector: {
    justifyContent: 'center',
  },
  shoppingAtText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  boutiqueDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  boutiqueNameText: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: Colors.textPrimary,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
    ...Shadow.subtle,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
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
    justifyContent: 'center',
    minHeight: 150,
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
    marginBottom: 20,
  },
  offerCard: {
    width: 200,
    height: 120,
    borderRadius: 12,
    padding: 16,
    marginRight: 16,
    justifyContent: 'center',
  },
  offerTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: Colors.textPrimary,
  },
  offerSubtitle: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    color: Colors.textSecondary,
    marginTop: 4,
  },
  newOrderButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newOrderButtonText: {
    color: Colors.white,
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
  },

  
  dashShopCard: {
    width: 140,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    overflow: 'hidden',
  },
  dashShopImg: {
    width: '100%',
    height: 140,
    resizeMode: 'cover',
  },
  dashShopInfo: {
    padding: 12,
  },
  dashShopName: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#0F172A',
    marginBottom: 4,
  },
  dashShopPrice: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: Colors.primary,
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
