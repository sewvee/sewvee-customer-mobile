import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  Image, 
  Dimensions, 
  Linking,
  Modal,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Platform,
  RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, Shadow } from '../constants/theme';
import { 
  ShoppingBag, 
  MessageCircle, 
  X, 
  ChevronRight, 
  Star,
  Sparkles,
  Heart,
  Check,
  MapPin,
  Store,
  ChevronDown
} from 'lucide-react-native';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { URL_CUSTOMER_PORTAL_ORDERS, URL_CUSTOMER_PORTAL_SHOP, BASE_URL } from '../config/env';
import axios from 'axios';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const CustomerShopScreen = () => {
  const { showToast } = useToast();
  const navigation = useNavigation();
  const { user, getAuthToken } = useAuth();
  const { orders, refreshData } = useData();

  const [selectedBoutique, setSelectedBoutique] = useState(null);
  const [boutiques, setBoutiques] = useState([]);
  
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [fullScreenImageIndex, setFullScreenImageIndex] = useState(null);
  const [favorites, setFavorites] = useState([]);
  
  const [cart, setCart] = useState([]);
  const [isCartVisible, setIsCartVisible] = useState(false);
  const [isDeliveryModalVisible, setIsDeliveryModalVisible] = useState(false);
  const [isBoutiqueModalVisible, setIsBoutiqueModalVisible] = useState(false);
  const [deliveryMethod, setDeliveryMethod] = useState('COURIER');
  
  const [shippingAddress, setShippingAddress] = useState({
    name: user?.name || '',
    address_line_1: user?.address?.line_1 || '',
    address_line_2: user?.address?.line_2 || '',
    city: user?.address?.city || '',
    state: user?.address?.state || '',
    zipcode: user?.address?.zip || '',
    phone: user?.mobile || user?.phone || ''
  });

  const SEWVEE_DIRECT = {
    id: 'sewvee_direct',
    name: 'Sewvee Originals',
    isSewveeDirect: true,
  };

  useEffect(() => {
    if (orders && orders.length > 0) {
      const uniqueBoutiques = [];
      const map = new Map();
      orders.forEach(o => {
        if (o.boutiqueId && !map.has(o.boutiqueId)) {
          map.set(o.boutiqueId, true);
          uniqueBoutiques.push({ id: o.boutiqueId, name: o.boutiqueName, mobile: o.boutiqueMobile || '' });
        }
      });
      setBoutiques(uniqueBoutiques);
      if (uniqueBoutiques.length > 0 && !selectedBoutique) {
        setSelectedBoutique(SEWVEE_DIRECT);
      }
    } else if (!selectedBoutique) {
      setSelectedBoutique(SEWVEE_DIRECT);
    }
  }, [orders]);

  useEffect(() => {
    if (selectedBoutique) {
      fetchProducts(selectedBoutique);
    } else {
      setProducts([]);
    }
  }, [selectedBoutique]);

  const fetchProducts = async (boutique) => {
    try {
      setLoadingProducts(true);
      const url = boutique.isSewveeDirect 
        ? `${BASE_URL}customer/store/catalogue` 
        : `${URL_CUSTOMER_PORTAL_SHOP}?companyId=${boutique.id}`;
      const res = await axios.get(url);
      if (res.data && res.data.success) {
        const rootUrl = BASE_URL.replace('/mobile/', '/');
        const formatImageUrls = (urlStr) => {
          if (!urlStr) return [];
          return urlStr.split(',').map(u => u.trim()).filter(Boolean).map(firstUrl => {
            if (Platform.OS === 'android' && firstUrl.includes('localhost')) {
              firstUrl = firstUrl.replace('localhost', '10.0.2.2');
            }
            if (firstUrl.startsWith('http')) return encodeURI(firstUrl);
            if (firstUrl.startsWith('/')) return encodeURI(rootUrl + firstUrl.substring(1));
            return encodeURI(rootUrl + firstUrl);
          });
        };
        const formatImageUrl = (url) => {
          if (!url) return null;
          let firstUrl = url.split(',')[0].trim();
          if (Platform.OS === 'android' && firstUrl.includes('localhost')) {
            firstUrl = firstUrl.replace('localhost', '10.0.2.2');
          }
          if (firstUrl.startsWith('http')) {
            return encodeURI(firstUrl);
          }
          if (firstUrl.startsWith('/')) {
            return encodeURI(rootUrl + firstUrl.substring(1));
          }
          return encodeURI(rootUrl + firstUrl);
        };

        const mapped = res.data.data.map(p => {
          const validImg = formatImageUrl(p.image_url);
          return {
            id: p.id,
            name: p.name,
            category: p.readymade_category?.name || 'Uncategorized',
            price: p.selling_price || 0,
            formattedPrice: `₹${Number(p.selling_price || 0).toLocaleString('en-IN')}`,
            rating: '4.5',
            reviews: 120,
            stock: Number(p.current_stock || 0),
            description: p.description || 'No description available',
            features: p.quality_specifications ? p.quality_specifications.split('\n') : ['Premium Quality'],
            images: (formatImageUrls(p.image_url).length > 0) ? formatImageUrls(p.image_url).map(u => ({uri: u})) : [require('../assets/bridal_blouse.png')],
            image: validImg ? { uri: validImg } : require('../assets/bridal_blouse.png')
          };
        });
        setProducts(mapped);
      } else {
        setProducts([]);
      }
    } catch (err) {
      console.log('Error fetching shop products:', err);
      showToast('Failed to load products', 'error');
    } finally {
      setLoadingProducts(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      if (selectedBoutique) {
        fetchProducts(selectedBoutique.id);
      }
    }, [selectedBoutique])
  );

  const onRefresh = async () => {
    if (selectedBoutique) {
      setRefreshing(true);
      await fetchProducts(selectedBoutique.id);
      setRefreshing(false);
    }
  };

  const categories = ['All', ...new Set(products.map(p => p.category))];

  const filteredProducts = React.useMemo(() => {
    let list = products.filter(p => p.stock > 0);
    if (selectedCategory !== 'All') {
      list = list.filter(p => p.category === selectedCategory);
    }
    return list;
  }, [selectedCategory, products]);

  const handleToggleFavorite = (id, event) => {
    event?.stopPropagation?.();
    if (favorites.includes(id)) {
      setFavorites(favorites.filter(favId => favId !== id));
    } else {
      setFavorites([...favorites, id]);
    }
  };

  const handleWhatsAppInquiry = (product) => {
    if (!selectedBoutique) return;
    const message = `Hi, I am interested in this design from your catalog:\n\n*${product.name}*\nCategory: ${product.category}\nPrice: ${product.formattedPrice}\n\nCould you share more details?`;
    
    Linking.canOpenURL(`whatsapp://send?text=${message}`)
      .then(supported => {
        if (supported && selectedBoutique.mobile) {
          return Linking.openURL(`whatsapp://send?phone=${selectedBoutique.mobile}&text=${encodeURIComponent(message)}`);
        }
        Linking.openURL(`https://wa.me/${(selectedBoutique.mobile||'').replace('+', '')}?text=${encodeURIComponent(message)}`);
      });
  };

  const handleAddToCart = (item) => {
    if (!cart.find(c => c.id === item.id)) {
      setCart([...cart, { ...item, quantity: 1 }]);
      showToast('Added to cart!', 'success');
    }
  };

  const handleIncrement = (item) => {
    setCart(cart.map(c => c.id === item.id ? { ...c, quantity: (c.quantity || 1) + 1 } : c));
  };

  const handleDecrement = (item) => {
    setCart(cart.map(c => c.id === item.id ? { ...c, quantity: (c.quantity || 1) - 1 } : c).filter(c => c.quantity > 0));
  };

  const handleProceedToDelivery = () => {
    if (cart.length === 0) return;
    setIsCartVisible(false);
    setIsDeliveryModalVisible(true);
  };

  const handleSendOrderRequest = async () => {
    if (cart.length === 0) return;
    if (!selectedBoutique) {
      showToast('Please select a boutique', 'error');
      return;
    }
    
    const total = cart.reduce((acc, c) => acc + (Number(c.price) * (c.quantity || 1)), 0);
    
    try {
      if (user && (user.id || user.mobile)) {
        const token = await AsyncStorage.getItem('userToken');
        await axios.post(URL_CUSTOMER_PORTAL_ORDERS, {
          customer_id: user.customer_id || user.id,
          customer_mobile: user.mobile,
          customer_name: user.name || 'App Customer',
          company_id: selectedBoutique.id,
          order_type: 'SALE_ORDER',
          order_date: new Date().toISOString(),
          final_amount: total,
          total_amount: total,
          total_outfits: cart.length,
          order_notes: 'Online App Order',
          delivery_method: deliveryMethod,
          shipping_address: deliveryMethod === 'COURIER' ? shippingAddress : null,
          outfits: cart.map(c => ({
            name: c.name,
            quantity: c.quantity || 1,
            total_amount: Number(c.price) * (c.quantity || 1),
            items: [{
              item_type: 'READYMADE',
              readymade_id: c.id,
              qty: c.quantity || 1,
              price: Number(c.price),
              total_price: Number(c.price) * (c.quantity || 1)
            }]
          }))
        }, {
          headers: { Authorization: token ? (token.startsWith('Bearer ') ? token : `Bearer ${token}`) : '', 'Content-Type': 'application/json' }
        });
        showToast('Order Request Sent Successfully!', 'success');
        await refreshData();
        setIsDeliveryModalVisible(false);
        setCart([]);
        navigation.navigate('CustomerRequestedOrders');
      } else {
        showToast('Please set up your profile first.', 'error');
      }
    } catch(err) {
      console.log('Order sync failed', err?.response?.data || err?.message);
      showToast('Failed to send order request.', 'error');
    }
  };

  const renderProductItem = ({ item }) => {
    const cartItem = cart.find(c => c.id === item.id);
    const isOut = item.stock <= 0;

    return (
      <TouchableOpacity 
        style={styles.productCard}
        activeOpacity={0.9}
        onPress={() => setSelectedProduct(item)}
      >
        <View style={styles.imageContainer}>
          <Image source={item.image} style={[styles.productImage, isOut && { opacity: 0.5 }]} />
          {isOut && (
            <View style={styles.outOfStockBadge}>
              <Text style={styles.outOfStockText}>OUT OF STOCK</Text>
            </View>
          )}
        </View>
        <View style={styles.cardDetails}>
          <Text style={styles.productCategory}>{item.category}</Text>
          <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
          <View style={styles.priceRow}>
            <Text style={styles.productPrice}>{item.formattedPrice}</Text>
            {cartItem ? (
              <View style={styles.stepperContainer}>
                <TouchableOpacity style={styles.stepperBtn} onPress={(e) => { e.stopPropagation(); handleDecrement(item); }}>
                  <Text style={styles.stepperBtnText}>-</Text>
                </TouchableOpacity>
                <Text style={styles.stepperValue}>{cartItem.quantity || 1}</Text>
                <TouchableOpacity style={styles.stepperBtn} onPress={(e) => { e.stopPropagation(); handleIncrement(item); }}>
                  <Text style={styles.stepperBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity 
                style={[styles.addToCartBtnCard, isOut && { backgroundColor: '#F1F5F9', borderColor: '#E2E8F0' }]}
                disabled={isOut}
                onPress={(e) => { e.stopPropagation(); handleAddToCart(item); }}
              >
                <Text style={[styles.addToCartBtnCardText, isOut && { color: '#94A3B8' }]}>{isOut ? 'Out' : 'Add'}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: '#F5F3FF' }}>
                <View style={[styles.navbar, { justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 16, height: 'auto' }]}>
          <TouchableOpacity 
            style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
            onPress={() => setIsBoutiqueModalVisible(true)}
            activeOpacity={0.7}
          >
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#F5F3FF', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
              <Store size={22} color={Colors.primary} />
            </View>
            <View style={{ flex: 1, justifyContent: 'center' }}>
              <Text style={{ fontSize: 11, color: '#94A3B8', fontFamily: 'Inter-Bold', letterSpacing: 0.5, marginBottom: 2 }}>
                SHOPPING AT
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ fontSize: 17, fontFamily: 'Inter-Bold', color: '#0F172A', marginRight: 6, flexShrink: 1 }} numberOfLines={1}>
                  {selectedBoutique ? selectedBoutique.name : 'Select Boutique'}
                </Text>
                <ChevronDown size={16} color="#64748B" />
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cartIconBtn} onPress={() => setIsCartVisible(true)}>
            <ShoppingBag size={24} color={Colors.textPrimary} />
            {cart.length > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{cart.reduce((a, c) => a + (c.quantity || 1), 0)}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <View style={styles.categoriesWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
          {categories.map(cat => {
            const isActive = selectedCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[styles.categoryTab, isActive && styles.categoryTabActive]}
                onPress={() => setSelectedCategory(cat)}
              >
                <Text style={[styles.categoryTabText, isActive && styles.categoryTabTextActive]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {loadingProducts ? (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.emptySubtitle}>Loading catalog...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          renderItem={renderProductItem}
          keyExtractor={item => item.id.toString()}
          numColumns={2}
          contentContainerStyle={styles.listContent}
          columnWrapperStyle={{ justifyContent: 'space-between', marginBottom: 16 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <ShoppingBag size={48} color={Colors.textSecondary} />
              <Text style={styles.emptyTitle}>Coming Soon</Text>
              <Text style={styles.emptySubtitle}>
                {selectedBoutique ? 'This boutique has not added any products yet.' : 'Please select a boutique first.'}
              </Text>
            </View>
          }
        />
      )}

      {/* BOUTIQUE SELECTOR MODAL */}
      <Modal visible={isBoutiqueModalVisible} transparent animationType="fade">
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setIsBoutiqueModalVisible(false)}
        >
          <View style={[styles.modalCard, { height: 'auto', maxHeight: '50%', marginTop: 'auto', marginBottom: 0, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Boutique</Text>
              <TouchableOpacity onPress={() => setIsBoutiqueModalVisible(false)} style={{ padding: 4 }}>
                <X size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ padding: 20 }}>
              <Text style={{ fontSize: 13, color: Colors.textSecondary, fontFamily: 'Inter-Bold', marginBottom: 12, marginTop: 8 }}>SEWVEE DIRECT</Text>
              <TouchableOpacity
                style={[styles.boutiqueOption, selectedBoutique?.id === 'sewvee_direct' && styles.boutiqueOptionActive]}
                onPress={() => {
                  setSelectedBoutique(SEWVEE_DIRECT);
                  setIsBoutiqueModalVisible(false);
                }}
              >
                <Sparkles size={20} color={selectedBoutique?.id === 'sewvee_direct' ? Colors.primary : Colors.textSecondary} />
                <Text style={[styles.boutiqueOptionText, selectedBoutique?.id === 'sewvee_direct' && { color: Colors.primary, fontFamily: 'Inter-Bold' }]}>
                  Sewvee Originals
                </Text>
                {selectedBoutique?.id === 'sewvee_direct' && <Check size={18} color={Colors.primary} />}
              </TouchableOpacity>

              {boutiques.length > 0 && (
                <>
                  <Text style={{ fontSize: 13, color: Colors.textSecondary, fontFamily: 'Inter-Bold', marginBottom: 12, marginTop: 16 }}>MY BOUTIQUES</Text>
                  {boutiques.map(b => (
                    <TouchableOpacity
                      key={b.id}
                      style={[styles.boutiqueOption, selectedBoutique?.id === b.id && styles.boutiqueOptionActive]}
                      onPress={() => {
                        setSelectedBoutique(b);
                        setIsBoutiqueModalVisible(false);
                      }}
                    >
                      <Store size={20} color={selectedBoutique?.id === b.id ? Colors.primary : Colors.textSecondary} />
                      <Text style={[styles.boutiqueOptionText, selectedBoutique?.id === b.id && { color: Colors.primary, fontFamily: 'Inter-Bold' }]}>
                        {b.name}
                      </Text>
                      {selectedBoutique?.id === b.id && <Check size={18} color={Colors.primary} />}
                    </TouchableOpacity>
                  ))}
                </>
              )}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={!!selectedProduct} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleBox}>
                <Sparkles size={16} color={Colors.primary} />
                <Text style={styles.modalCategory}>{selectedProduct?.category}</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedProduct(null)} style={{ padding: 4 }}>
                <X size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {selectedProduct && (
              <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
                
                <View style={{ marginBottom: 16 }}>
                  {selectedProduct.images && selectedProduct.images.length > 1 ? (
                    <ScrollView 
                      horizontal 
                      showsHorizontalScrollIndicator={false}
                      snapToInterval={(SCREEN_WIDTH - 40) * 0.8 + 8}
                      decelerationRate="fast"
                      contentContainerStyle={{ gap: 8 }}
                    >
                      {selectedProduct.images.map((img, idx) => (
                        <TouchableOpacity key={idx} activeOpacity={0.9} onPress={() => setFullScreenImageIndex(idx)}>
                          <Image 
                            source={img} 
                            style={[styles.modalImage, { width: (SCREEN_WIDTH - 40) * 0.8, marginBottom: 0 }]} 
                            resizeMode="cover" 
                          />
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  ) : (
                    <TouchableOpacity activeOpacity={0.9} onPress={() => setFullScreenImageIndex(0)}>
                      <Image 
                        source={selectedProduct.image} 
                        style={styles.modalImage} 
                        resizeMode="cover" 
                      />
                    </TouchableOpacity>
                  )}
                </View>

                
                <View style={styles.modalBody}>
                  <View style={styles.modalPriceRow}>
                    <Text style={styles.modalName}>{selectedProduct.name}</Text>
                    <Text style={styles.modalPrice}>{selectedProduct.formattedPrice}</Text>
                  </View>



                  <Text style={styles.modalDescriptionTitle}>Description</Text>
                  <Text style={styles.modalDescriptionText}>{selectedProduct.description}</Text>

                  <Text style={styles.modalFeaturesTitle}>Quality Specifications</Text>
                  {selectedProduct.features.map((feat, idx) => (
                    <View key={idx} style={styles.featureRow}>
                      <View style={styles.featureDot} />
                      <Text style={styles.featureText}>{feat}</Text>
                    </View>
                  ))}
                </View>
              </ScrollView>
            )}

            <View style={styles.modalFooter}>
              {selectedProduct && cart.find(c => c.id === selectedProduct.id) ? (
                <View style={[styles.stepperContainer, { height: 52, width: '100%', backgroundColor: '#F8FAFC' }]}>
                  <TouchableOpacity style={[styles.stepperBtn, { flex: 1 }]} onPress={() => handleDecrement(selectedProduct)}>
                    <Text style={[styles.stepperBtnText, { fontSize: 24 }]}>-</Text>
                  </TouchableOpacity>
                  <Text style={[styles.stepperValue, { fontSize: 18 }]}>{cart.find(c => c.id === selectedProduct.id).quantity || 1}</Text>
                  <TouchableOpacity style={[styles.stepperBtn, { flex: 1 }]} onPress={() => handleIncrement(selectedProduct)}>
                    <Text style={[styles.stepperBtnText, { fontSize: 24 }]}>+</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity 
                  style={[styles.inquireBtn, { width: '100%' }]}
                  onPress={() => handleAddToCart(selectedProduct)}
                >
                  <ShoppingBag size={20} color="white" style={{ marginRight: 8 }} />
                  <Text style={styles.inquireBtnText}>Add to Cart</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={isCartVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { height: '70%' }]}>
            <View style={styles.modalHeader}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: Colors.textPrimary }}>Your Cart</Text>
              <TouchableOpacity onPress={() => setIsCartVisible(false)} style={{ padding: 4 }}>
                <X size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
              {cart.length === 0 ? (
                <View style={{ padding: 40, alignItems: 'center' }}>
                  <ShoppingBag size={40} color="#94A3B8" />
                  <Text style={{ marginTop: 12, color: '#64748B', fontFamily: 'Inter-Medium' }}>Your cart is empty.</Text>
                </View>
              ) : (
                cart.map((item, idx) => (
                  <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', padding: 12, borderRadius: 12, marginBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
                    <View style={{ width: 60, height: 60, borderRadius: 8, marginRight: 12, overflow: 'hidden', backgroundColor: '#E2E8F0' }}>
                      <Image source={item.image} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: Colors.textPrimary, marginBottom: 4 }}>{item.name}</Text>
                      <Text style={{ fontSize: 14, color: Colors.primary, fontWeight: 'bold' }}>{item.formattedPrice}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', marginLeft: 12 }}>
                      <TouchableOpacity onPress={() => setCart(cart.filter(c => c.id !== item.id))} style={{ padding: 4, marginBottom: 8 }}>
                        <X size={20} color="#EF4444" />
                      </TouchableOpacity>
                      <View style={styles.stepperContainer}>
                        <TouchableOpacity style={styles.stepperBtn} onPress={() => handleDecrement(item)}>
                          <Text style={styles.stepperBtnText}>-</Text>
                        </TouchableOpacity>
                        <Text style={styles.stepperValue}>{item.quantity || 1}</Text>
                        <TouchableOpacity style={styles.stepperBtn} onPress={() => handleIncrement(item)}>
                          <Text style={styles.stepperBtnText}>+</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={[styles.inquireBtn, cart.length === 0 && { backgroundColor: '#CBD5E1' }]}
                disabled={cart.length === 0}
                onPress={handleProceedToDelivery}
              >
                <Text style={styles.inquireBtnText}>Proceed to Delivery</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={isDeliveryModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: Colors.textPrimary }}>Delivery Options</Text>
              <TouchableOpacity onPress={() => setIsDeliveryModalVisible(false)} style={{ padding: 4 }}>
                <X size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1, padding: 20 }}>
              <View style={{ flexDirection: 'row', marginBottom: 20, backgroundColor: '#F1F5F9', borderRadius: 12, padding: 4 }}>
                <TouchableOpacity 
                  style={{ flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center', backgroundColor: deliveryMethod === 'COURIER' ? 'white' : 'transparent', shadowColor: deliveryMethod === 'COURIER' ? '#000' : 'transparent', shadowOpacity: 0.05, shadowRadius: 2 }}
                  onPress={() => setDeliveryMethod('COURIER')}
                >
                  <Text style={{ fontWeight: '600', color: deliveryMethod === 'COURIER' ? Colors.primary : Colors.textSecondary }}>Courier</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={{ flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center', backgroundColor: deliveryMethod === 'IN_PERSON' ? 'white' : 'transparent', shadowColor: deliveryMethod === 'IN_PERSON' ? '#000' : 'transparent', shadowOpacity: 0.05, shadowRadius: 2 }}
                  onPress={() => setDeliveryMethod('IN_PERSON')}
                >
                  <Text style={{ fontWeight: '600', color: deliveryMethod === 'IN_PERSON' ? Colors.primary : Colors.textSecondary }}>Store Pickup</Text>
                </TouchableOpacity>
              </View>

              {deliveryMethod === 'COURIER' && (
                <View style={{ gap: 12 }}>
                  <Text style={{ fontSize: 14, fontWeight: 'bold', color: Colors.textPrimary, marginBottom: 4 }}>Shipping Address</Text>
                  
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Name</Text>
                    <TextInput style={styles.inputField} value={shippingAddress.name} onChangeText={(t) => setShippingAddress({...shippingAddress, name: t})} />
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Phone Number</Text>
                    <TextInput style={styles.inputField} keyboardType="phone-pad" value={shippingAddress.phone} onChangeText={(t) => setShippingAddress({...shippingAddress, phone: t})} />
                  </View>
                  
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Address Line 1</Text>
                    <TextInput style={styles.inputField} value={shippingAddress.address_line_1} onChangeText={(t) => setShippingAddress({...shippingAddress, address_line_1: t})} />
                  </View>
                  
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Address Line 2 (Optional)</Text>
                    <TextInput style={styles.inputField} value={shippingAddress.address_line_2} onChangeText={(t) => setShippingAddress({...shippingAddress, address_line_2: t})} />
                  </View>

                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <View style={[styles.inputContainer, { flex: 1 }]}>
                      <Text style={styles.inputLabel}>City</Text>
                      <TextInput style={styles.inputField} value={shippingAddress.city} onChangeText={(t) => setShippingAddress({...shippingAddress, city: t})} />
                    </View>
                    <View style={[styles.inputContainer, { flex: 1 }]}>
                      <Text style={styles.inputLabel}>State</Text>
                      <TextInput style={styles.inputField} value={shippingAddress.state} onChangeText={(t) => setShippingAddress({...shippingAddress, state: t})} />
                    </View>
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Zipcode</Text>
                    <TextInput style={styles.inputField} keyboardType="number-pad" value={shippingAddress.zipcode} onChangeText={(t) => setShippingAddress({...shippingAddress, zipcode: t})} />
                  </View>
                </View>
              )}

              {deliveryMethod === 'IN_PERSON' && (
                <View style={{ padding: 20, alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 12, marginTop: 10 }}>
                  <MapPin size={32} color={Colors.primary} style={{ marginBottom: 12 }} />
                  <Text style={{ textAlign: 'center', color: Colors.textSecondary, fontSize: 14, lineHeight: 20 }}>
                    You will need to visit the boutique directly to pick up your order once it is ready.
                  </Text>
                </View>
              )}
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.inquireBtn} onPress={handleSendOrderRequest}>
                <Check size={20} color="white" style={{ marginRight: 8 }} />
                <Text style={styles.inquireBtnText}>Confirm Order</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
          <Modal visible={fullScreenImageIndex !== null} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center' }}>
          <TouchableOpacity 
            style={{ position: 'absolute', top: 50, right: 20, zIndex: 10, padding: 8 }} 
            onPress={() => setFullScreenImageIndex(null)}
          >
            <X size={32} color="#FFF" />
          </TouchableOpacity>
          {fullScreenImageIndex !== null && selectedProduct?.images && (
            <ScrollView 
              horizontal 
              pagingEnabled 
              showsHorizontalScrollIndicator={false}
              contentOffset={{ x: SCREEN_WIDTH * fullScreenImageIndex, y: 0 }}
            >
              {selectedProduct.images.map((img, idx) => (
                <View key={idx} style={{ width: SCREEN_WIDTH, height: '100%', justifyContent: 'center', alignItems: 'center' }}>
                  <Image 
                    source={img} 
                    style={{ width: SCREEN_WIDTH, height: '80%' }} 
                    resizeMode="contain" 
                  />
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      </Modal>
    </View>
  );
};

export default CustomerShopScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 56,
    backgroundColor: '#F5F3FF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: Colors.textPrimary,
  },
  headerBoutiqueSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    maxWidth: 120,
  },
  headerBoutiqueText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: Colors.textPrimary,
    flexShrink: 1,
  },
  boutiqueOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    marginBottom: 8,
    gap: 12,
  },
  boutiqueOptionActive: {
    backgroundColor: '#F5F3FF',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  boutiqueOptionText: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Inter-Medium',
    color: Colors.textPrimary,
  },
  cartIconBtn: {
    padding: 6,
    position: 'relative'
  },
  cartBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: Colors.primary,
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartBadgeText: {
    color: 'white',
    fontSize: 9,
    fontWeight: 'bold',
  },
  boutiqueWrapper: {
    backgroundColor: Colors.white,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  boutiqueScroll: {
    paddingHorizontal: 16,
    gap: 10,
  },
  boutiqueTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  boutiqueTabActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  boutiqueTabText: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: Colors.textSecondary,
  },
  boutiqueTabTextActive: {
    color: Colors.white,
  },
  categoriesWrapper: {
    backgroundColor: Colors.white,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  categoryScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  categoryTabActive: {
    backgroundColor: Colors.primary,
  },
  categoryTabText: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  categoryTabTextActive: {
    color: Colors.white,
    fontFamily: 'Inter-SemiBold',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  productCard: {
    width: (SCREEN_WIDTH - 44) / 2,
    backgroundColor: Colors.white,
    borderRadius: 20,
    overflow: 'hidden',
    ...Shadow.subtle,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  imageContainer: {
    position: 'relative',
    height: 160,
    width: '100%',
    backgroundColor: '#F8FAFC',
  },
  productImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  outOfStockBadge: {
    position: 'absolute',
    top: '45%',
    left: 0,
    right: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    paddingVertical: 6,
    alignItems: 'center',
  },
  outOfStockText: {
    color: '#FFF',
    fontSize: 10,
    fontFamily: 'Inter-Bold',
    letterSpacing: 1,
  },
  favoriteBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadow.subtle,
  },
  cardDetails: {
    padding: 12,
  },
  productCategory: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontFamily: 'Inter-Medium',
    textTransform: 'uppercase',
  },
  productName: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: Colors.textPrimary,
    marginTop: 2,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  productPrice: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: Colors.primary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: Colors.textPrimary,
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    height: '85%',
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    ...Shadow.large,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modalCategory: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    color: Colors.primary,
    textTransform: 'uppercase',
  },
  modalImage: {
    width: '100%',
    height: 260,
    borderRadius: 20,
    marginBottom: 16,
  },
  modalBody: {
    paddingBottom: 24,
  },
  modalPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  modalName: {
    flex: 1,
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: Colors.textPrimary,
  },
  modalPrice: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: Colors.primary,
  },
  modalRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    marginBottom: 16,
  },
  modalRatingText: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: Colors.textSecondary,
  },
  modalDescriptionTitle: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  modalDescriptionText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontFamily: 'Inter-Medium',
    lineHeight: 18,
    marginBottom: 18,
  },
  modalFeaturesTitle: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: Colors.textPrimary,
    marginBottom: 10,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
    marginRight: 10,
  },
  featureText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontFamily: 'Inter-Medium',
  },
  modalFooter: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
  },
  inquireBtn: {
    backgroundColor: Colors.primary,
    height: 52,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadow.subtle,
  },
  inquireBtnText: {
    fontSize: 15,
    fontFamily: 'Inter-Bold',
    color: Colors.white,
  },
  addToCartBtnCard: {
    backgroundColor: '#F5F3FF',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EDE9FE',
  },
  addToCartBtnCardText: {
    color: Colors.primary,
    fontSize: 11,
    fontFamily: 'Inter-Bold',
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  stepperBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperBtnText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  stepperValue: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
    minWidth: 20,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  inputField: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: Colors.textPrimary,
  },
});
