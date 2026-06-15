import React, { useState } from 'react';
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
  SafeAreaView
} from 'react-native';
import { Colors, Spacing, Shadow } from '../constants/theme';
import { 
  ShoppingBag, 
  MessageCircle, 
  X, 
  ChevronRight, 
  Star,
  Sparkles,
  Heart
} from 'lucide-react-native';
import { useToast } from '../context/ToastContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const PRODUCTS_DATA = [
  {
    id: 'p1',
    name: 'Zari Work Bridal Blouse',
    category: 'Blouses',
    price: '₹3,500',
    description: 'Made of pure banarasi silk, this exquisite bridal blouse showcases traditional gold zari and zardozi threadwork custom stitched to your exact measurements.',
    image: require('../assets/bridal_blouse.png'),
    rating: 4.9,
    reviews: 24,
    features: ['100% Pure Silk', 'Intricate Zardozi Work', 'Custom Fitted Padding', 'Lining Included']
  },
  {
    id: 'p2',
    name: 'Vibrant Kids Lehenga Choli',
    category: 'Kids Wear',
    price: '₹4,200',
    description: 'A rich and elegant silk lehenga choli for kids in pink and green, finished with gold laces, custom tassels, and a lightweight net dupatta.',
    image: require('../assets/silk_lehenga.png'),
    rating: 4.8,
    reviews: 16,
    features: ['Premium Art Silk', 'Comfort Lining', 'Adjustable Skirt Waist', 'Lightweight Net Dupatta']
  },
  {
    id: 'p3',
    name: 'Teal Silk Salwar Dress Material',
    category: 'Chudiyars',
    price: '₹2,800',
    description: 'A premium deep teal dress material set with fine hand-embroidered neckline patterns. Comes with a matching dupatta and solid color bottom fabric.',
    image: require('../assets/chudi_material.png'),
    rating: 4.7,
    reviews: 12,
    features: ['Teal Silk Fabric', 'Fine Neck Embroidery', 'Matching Dupatta Included', '2.5 Meters Fabric Length']
  }
];

const CustomerShopScreen = () => {
  const { showToast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [favorites, setFavorites] = useState([]);

  const filteredProducts = React.useMemo(() => {
    if (selectedCategory === 'All') return PRODUCTS_DATA;
    return PRODUCTS_DATA.filter(p => p.category === selectedCategory);
  }, [selectedCategory]);

  const handleToggleFavorite = (id, event) => {
    event?.stopPropagation?.();
    if (favorites.includes(id)) {
      setFavorites(prev => prev.filter(x => x !== id));
      showToast('Removed from wishlist', 'success');
    } else {
      setFavorites(prev => [...prev, id]);
      showToast('Added to wishlist!', 'success');
    }
  };

  const handleWhatsAppInquiry = (product) => {
    const boutiqueMobile = "+919876543210"; // Boutique Owner registered phone
    const message = `Hi Sewvee Boutique, I am interested in inquiring about the "${product.name}" priced at ${product.price}. Please let me know how I can send my measurements!`;
    const url = `whatsapp://send?phone=${boutiqueMobile}&text=${encodeURIComponent(message)}`;
    
    Linking.canOpenURL(url)
      .then(supported => {
        if (supported) {
          Linking.openURL(url);
        } else {
          // Fallback to web link
          Linking.openURL(`https://wa.me/${boutiqueMobile.replace('+', '')}?text=${encodeURIComponent(message)}`);
        }
      })
      .catch(() => {
        showToast('Could not open WhatsApp. Opening browser link...', 'warning');
        Linking.openURL(`https://wa.me/${boutiqueMobile.replace('+', '')}?text=${encodeURIComponent(message)}`);
      });
  };

  const renderProductItem = ({ item }) => {
    const isFav = favorites.includes(item.id);

    return (
      <TouchableOpacity 
        style={styles.productCard}
        activeOpacity={0.9}
        onPress={() => setSelectedProduct(item)}
      >
        <View style={styles.imageContainer}>
          <Image source={item.image} style={styles.productImage} />
          <TouchableOpacity 
            style={styles.favoriteBtn}
            onPress={(e) => handleToggleFavorite(item.id, e)}
          >
            <Heart size={18} color={isFav ? '#EF4444' : '#64748B'} fill={isFav ? '#EF4444' : 'transparent'} />
          </TouchableOpacity>
        </View>
        <View style={styles.cardDetails}>
          <Text style={styles.productCategory}>{item.category}</Text>
          <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
          <View style={styles.priceRow}>
            <Text style={styles.productPrice}>{item.price}</Text>
            <View style={styles.ratingBox}>
              <Star size={12} color="#F59E0B" fill="#F59E0B" />
              <Text style={styles.ratingText}>{item.rating}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.navbar}>
        <View style={{ width: 24 }} />
        <Text style={styles.navbarTitle}>Design Catalog</Text>
        <TouchableOpacity style={styles.cartIconBtn}>
          <ShoppingBag size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Category Tabs */}
      <View style={styles.categoriesWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
          {['All', 'Blouses', 'Lehengas', 'Chudiyars', 'Kids Wear'].map(cat => {
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

      {/* Feed List */}
      <FlatList
        data={filteredProducts}
        renderItem={renderProductItem}
        keyExtractor={item => item.id}
        numColumns={2}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={{ justifyContent: 'space-between', marginBottom: 16 }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <ShoppingBag size={48} color={Colors.textSecondary} />
            <Text style={styles.emptyTitle}>Coming Soon</Text>
            <Text style={styles.emptySubtitle}>We are currently preparing gorgeous collections in this category.</Text>
          </View>
        }
      />

      {/* PRODUCT DETAIL MODAL */}
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
                <Image source={selectedProduct.image} style={styles.modalImage} resizeMode="cover" />
                
                <View style={styles.modalBody}>
                  <View style={styles.modalPriceRow}>
                    <Text style={styles.modalName}>{selectedProduct.name}</Text>
                    <Text style={styles.modalPrice}>{selectedProduct.price}</Text>
                  </View>

                  <View style={styles.modalRatingRow}>
                    <Star size={16} color="#F59E0B" fill="#F59E0B" />
                    <Text style={styles.modalRatingText}>{selectedProduct.rating} ({selectedProduct.reviews} reviews)</Text>
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
              <TouchableOpacity 
                style={styles.inquireBtn}
                onPress={() => handleWhatsAppInquiry(selectedProduct)}
              >
                <MessageCircle size={20} color="white" style={{ marginRight: 8 }} />
                <Text style={styles.inquireBtnText}>Inquire on WhatsApp</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
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
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: Colors.white,
  },
  navbarTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: Colors.textPrimary,
  },
  cartIconBtn: {
    padding: 6,
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
  ratingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    color: Colors.textPrimary,
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

  // Modal
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
});
