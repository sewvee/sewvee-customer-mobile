import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Clipboard,
  TextInput,
  LayoutAnimation,
  Platform,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Spacing, Shadow } from '../constants/theme';
import { 
  ArrowLeft, 
  Calendar, 
  MapPin, 
  Copy, 
  Clock, 
  AlertCircle, 
  Upload, 
  Trash2, 
  Truck, 
  MessageSquare,
  CheckCircle,
  HelpCircle,
  Scissors,
  ShoppingBag as Shirt,
  Image as ImageIcon,
  FileText,
  Download,
  ChevronDown,
  PenTool,
  ClipboardList,
  Plus
} from 'lucide-react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { useDispatch } from 'react-redux';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { uploadImageAction } from '../store/uploadSlice';
import { useToast } from '../context/ToastContext';
import { formatDate } from '../utils/dateUtils';
import { formatOrderNumber } from '../utils/orderIdFormatter';

const CustomerOrderDetailScreen = ({ route, navigation }) => {
  const { orderId } = route.params;
  const dispatch = useDispatch();
  const { showToast } = useToast();
  const { user } = useAuth();
  const { orders, updateOrder } = useData();

  const [loading, setLoading] = useState(false);
  const [uploadingOutfitId, setUploadingOutfitId] = useState(null);
  const [courierName, setCourierName] = useState('');
  const [trackingId, setTrackingId] = useState('');
  const [isSavingCourier, setIsSavingCourier] = useState(false);

  // Find target order
  const order = React.useMemo(() => {
    return orders.find(o => o.id === orderId);
  }, [orders, orderId]);

  useEffect(() => {
    if (order) {
      setCourierName(order.courierService || '');
      setTrackingId(order.courierTrackingId || '');
    }
  }, [order]);

  if (!order) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Order not found</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>Back to Dashboard</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const outfits = order.outfits || order.items || [];

  const handleCopyBoutiqueAddress = () => {
    const address = "Sewvee Premium Boutique, Block C, 4th Cross Road, Indira Nagar, Bengaluru, Karnataka 560038";
    Clipboard.setString(address);
    showToast('Boutique address copied to clipboard!', 'success');
  };

  const handleSaveCourierDetails = async () => {
    if (!courierName.trim() || !trackingId.trim()) {
      showToast('Please fill in both Courier Service and Tracking ID', 'error');
      return;
    }

    setIsSavingCourier(true);
    try {
      await updateOrder(order.id, {
        courierService: courierName.trim(),
        courierTrackingId: trackingId.trim(),
        courierStatus: 'Shipped'
      });
      
      const ordersJson = await AsyncStorage.getItem('sewvee_orders');
      if (ordersJson) {
        const localOrders = JSON.parse(ordersJson);
        const index = localOrders.findIndex(o => o.id === order.id);
        if (index !== -1) {
          localOrders[index] = {
            ...localOrders[index],
            courierService: courierName.trim(),
            courierTrackingId: trackingId.trim(),
            courierStatus: 'Shipped'
          };
          await AsyncStorage.setItem('sewvee_orders', JSON.stringify(localOrders));
        }
      }

      showToast('Courier tracking details saved successfully!', 'success');
    } catch (e) {
      showToast('Failed to save courier details', 'error');
    } finally {
      setIsSavingCourier(false);
    }
  };

  const handleUploadReferencePhoto = (outfitId) => {
    setUploadingOutfitId(outfitId);
    launchImageLibrary({ mediaType: 'photo', quality: 0.8 }, async (response) => {
      if (response.didCancel || response.errorCode || !response.assets?.length) {
        setUploadingOutfitId(null);
        return;
      }

      const asset = response.assets[0];
      setLoading(true);
      try {
        const uploadResult = await dispatch(uploadImageAction({
          uri: asset.uri,
          type: asset.type || 'image/jpeg',
          name: asset.fileName || `design_${Date.now()}.jpg`,
          key_name: 'reference_images',
        })).unwrap();

        const fileUrl = uploadResult?.file_url || uploadResult?.data?.file_url || uploadResult?.url || uploadResult?.data?.url || '';

        if (!fileUrl) {
          throw new Error('No image URL returned from upload server');
        }

        const updatedOutfits = outfits.map(outfit => {
          if (outfit.id === outfitId) {
            const currentPhotos = outfit.photos || [];
            return {
              ...outfit,
              requestedPhotosFromClient: false,
              photos: [
                ...currentPhotos,
                {
                  id: 'photo_' + Date.now(),
                  file_url: fileUrl,
                  file_type: 'IMAGE',
                  category: 'REFERENCE',
                  uploadedBy: 'Customer'
                }
              ]
            };
          }
          return outfit;
        });

        await updateOrder(order.id, { outfits: updatedOutfits });

        const ordersJson = await AsyncStorage.getItem('sewvee_orders');
        if (ordersJson) {
          const localOrders = JSON.parse(ordersJson);
          const index = localOrders.findIndex(o => o.id === order.id);
          if (index !== -1) {
            localOrders[index] = {
              ...localOrders[index],
              outfits: updatedOutfits
            };
            await AsyncStorage.setItem('sewvee_orders', JSON.stringify(localOrders));
          }
        }

        showToast('Reference design uploaded successfully!', 'success');
      } catch (err) {
        console.log('Upload image error:', err);
        showToast('Upload failed: ' + (err.message || 'Server error'), 'error');
      } finally {
        setLoading(false);
        setUploadingOutfitId(null);
      }
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Navbar */}
      <View style={styles.navbar}>
        <TouchableOpacity style={styles.backIconBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.navbarTitle}>Order #{order.billNo || order.id}</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {outfits.map((outfit, index) => {
          const isUploading = uploadingOutfitId === outfit.id;
          const refPhotos = (outfit.photos || []).filter(p => p.category === 'REFERENCE');
          const hasStitching = outfit.stitching && outfit.stitching.length > 0;
          const outfitName = (outfit.name || outfit.type || 'Custom Outfit').toUpperCase();

          return (
            <View key={outfit.id || index} style={styles.outfitBlock}>
              <View style={styles.outfitTitleRow}>
                <Text style={styles.outfitTitleText}>{outfitName}</Text>
              </View>

              {/* OUTFIT DETAILS Card */}
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Shirt size={14} color={Colors.primary} />
                  <Text style={styles.cardTitle}>OUTFIT DETAILS</Text>
                </View>
                <View style={styles.detailsGrid}>
                  <View style={styles.detailsCol}>
                    <Text style={styles.detailsLabel}>ORDER TYPE</Text>
                    <Text style={styles.detailsValue}>{outfit.orderType || 'Stitching'}</Text>
                  </View>
                  <View style={[styles.detailsCol, styles.borderLeft]}>
                    <Text style={styles.detailsLabel}>URGENCY</Text>
                    <Text style={styles.detailsValue}>{outfit.urgency || 'NORMAL'}</Text>
                  </View>
                  <View style={[styles.detailsCol, styles.borderLeft]}>
                    <Text style={styles.detailsLabel}>TRIAL DATE</Text>
                    <View style={styles.dateBadge}>
                      <Calendar size={12} color={Colors.primary} />
                      <Text style={styles.dateBadgeText}>{outfit.trialDate ? formatDate(outfit.trialDate) : '31 Aug 2026'}</Text>
                    </View>
                  </View>
                  <View style={[styles.detailsCol, styles.borderLeft]}>
                    <Text style={styles.detailsLabel}>DELIVERY DATE</Text>
                    <View style={styles.dateBadge}>
                      <Calendar size={12} color={Colors.primary} />
                      <Text style={styles.dateBadgeText}>{outfit.deliveryDate ? formatDate(outfit.deliveryDate) : '05 Sep 2026'}</Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* STITCHING SPECIFICATIONS */}
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Scissors size={14} color={Colors.primary} />
                  <Text style={styles.cardTitle}>STITCHING SPECIFICATIONS</Text>
                </View>
                <View style={styles.stitchingTable}>
                  {hasStitching ? outfit.stitching.map((stitch, sIdx) => (
                    <View key={stitch.id || sIdx} style={[styles.tableRow, sIdx === outfit.stitching.length - 1 && styles.tableRowLast]}>
                      <View style={styles.tableColLeft}>
                        <Text style={styles.tableColLeftText}>{(stitch.category?.name || 'STYLE').toUpperCase()}</Text>
                      </View>
                      <View style={styles.tableColRight}>
                        <Text style={styles.tableColRightText}>
                           {[stitch.sub_category?.name, stitch.option?.name].filter(Boolean).join(' > ') || 'Custom'}
                        </Text>
                      </View>
                    </View>
                  )) : (
                    <>
                      <View style={styles.tableRow}>
                        <View style={styles.tableColLeft}><Text style={styles.tableColLeftText}>PRINCESSCUT</Text></View>
                        <View style={styles.tableColRight}><Text style={styles.tableColRightText}>Hook {'>'} Front hook</Text></View>
                      </View>
                      <View style={styles.tableRow}>
                        <View style={styles.tableColLeft}><Text style={styles.tableColLeftText}>PRINCESSCUT</Text></View>
                        <View style={styles.tableColRight}><Text style={styles.tableColRightText}>Sleeve {'>'} Elbow</Text></View>
                      </View>
                      <View style={[styles.tableRow, styles.tableRowLast]}>
                        <View style={styles.tableColLeft}><Text style={styles.tableColLeftText}>PRINCESSCUT</Text></View>
                        <View style={styles.tableColRight}><Text style={styles.tableColRightText}>Front neck {'>'} Normal neck</Text></View>
                      </View>
                    </>
                  )}
                </View>
              </View>

              {/* DESIGN PHOTOS & SKETCHES */}
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <ImageIcon size={14} color={Colors.primary} />
                  <Text style={styles.cardTitle}>DESIGN PHOTOS & SKETCHES</Text>
                </View>
                <View style={styles.photosContent}>
                  {refPhotos.length > 0 ? (
                    refPhotos.map((photo, pIdx) => (
                      <View key={photo.id || pIdx} style={styles.photoWrapper}>
                        <Image source={{ uri: photo.file_url }} style={styles.photoImg} />
                      </View>
                    ))
                  ) : (
                    <Text style={{ fontSize: 13, color: '#94A3B8', fontStyle: 'italic', paddingVertical: 8 }}>
                      No photos uploaded by boutique.
                    </Text>
                  )}
                </View>
              </View>

              {/* BOUTIQUE NOTES */}
              <View style={styles.notesCard}>
                <Text style={styles.notesTitle}>BOUTIQUE NOTES</Text>
                <Text style={styles.notesText}>{outfit.notes || 'Add piping in al place replace plain and designer cloths and balls also same sweet heart front neck 18000'}</Text>
              </View>

            </View>
          );
        })}

        {/* ACCOUNT SUMMARY */}
        <Text style={styles.sectionHeading}>ACCOUNT SUMMARY</Text>
        <View style={styles.pricingCard}>
          <View style={styles.pricingRow}>
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
              <Scissors size={14} color="#94A3B8" style={{marginRight: 8}} />
              <Text style={styles.pricingItemText}>Total Order Value</Text>
            </View>
            <Text style={styles.pricingItemValue}>₹{order.total || 0}</Text>
          </View>
          
          <View style={styles.pricingSeparator} />
          
          <View style={styles.pricingAdvanceRow}>
            <Text style={styles.pricingAdvanceLabel}>Advance / Paid Amount</Text>
            <Text style={styles.pricingAdvanceValue}>₹{order.advance || 0}</Text>
          </View>
          <View style={styles.pricingDueRow}>
            <Text style={styles.pricingDueLabel}>DUE BALANCE</Text>
            <Text style={styles.pricingDueValue}>₹{order.balance || 0}</Text>
          </View>
        </View>

        {/* TRANSACTION LOGS */}
        <Text style={styles.sectionHeading}>TRANSACTION LOGS</Text>
        <View style={styles.transactionCard}>
          <View style={styles.transactionRow}>
             <View>
               <View style={{flexDirection: 'row', alignItems: 'center'}}>
                 <Text style={styles.transactionAmount}>₹{order.advance || 1020}</Text>
                 <View style={styles.upiBadge}><Text style={styles.upiBadgeText}>UPI</Text></View>
               </View>
               <Text style={styles.transactionDate}>Date: {formatDate(order.date)}</Text>
             </View>
             <TouchableOpacity style={styles.invoiceBtn}>
               <Download size={14} color={Colors.textPrimary} style={{marginRight: 4}} />
               <Text style={styles.invoiceBtnText}>Invoice</Text>
             </TouchableOpacity>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 56,
    backgroundColor: Colors.background,
  },
  backIconBtn: {
    padding: 6,
  },
  navbarTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: Colors.textPrimary,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: Colors.background,
  },
  errorText: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontFamily: 'Inter-Medium',
    marginBottom: 16,
  },
  backBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  backBtnText: {
    color: Colors.white,
    fontFamily: 'Inter-Bold',
  },
  outfitBlock: {
    marginBottom: 32,
  },
  outfitTitleRow: {
    marginBottom: 12,
  },
  outfitTitleText: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: Colors.textPrimary,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  cardTitle: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    color: '#475569',
    marginLeft: 8,
    letterSpacing: 0.5,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  detailsCol: {
    width: '50%',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  borderLeft: {
    borderLeftWidth: 1,
    borderLeftColor: '#F1F5F9',
  },
  detailsLabel: {
    fontSize: 11,
    fontFamily: 'Inter-Bold',
    color: '#64748B',
    marginBottom: 6,
  },
  detailsValue: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: Colors.textPrimary,
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignSelf: 'flex-start',
  },
  dateBadgeText: {
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
    color: Colors.textPrimary,
    marginLeft: 4,
  },
  stitchingTable: {
    backgroundColor: '#FFFFFF',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  tableRowLast: {
    borderBottomWidth: 0,
  },
  tableColLeft: {
    width: '40%',
    padding: 12,
    borderRightWidth: 1,
    borderRightColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  tableColLeftText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
  },
  tableColRight: {
    flex: 1,
    padding: 12,
    backgroundColor: '#FFFFFF',
  },
  tableColRightText: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: Colors.textPrimary,
  },
  photosContent: {
    padding: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  photoWrapper: {
    width: 72,
    height: 72,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  photoImg: {
    width: '100%',
    height: '100%',
  },
  addPhotoBtn: {
    width: 72,
    height: 72,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.primary,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notesCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FEF3C7',
    padding: 16,
    marginBottom: 24,
  },
  notesTitle: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    color: '#92400E',
    marginBottom: 8,
  },
  notesText: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    color: '#B45309',
    lineHeight: 20,
  },
  pricingCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 32,
    overflow: 'hidden',
  },
  pricingTitle: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    color: Colors.primary,
    letterSpacing: 0.5,
    padding: 16,
    paddingBottom: 8,
  },
  pricingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  pricingItemText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#475569',
  },
  pricingItemValue: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: Colors.textPrimary,
  },
  pricingSeparator: {
    height: 4,
    backgroundColor: '#F8FAFC',
  },
  pricingTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  pricingTotalLabel: {
    fontSize: 13,
    fontFamily: 'Inter-Bold',
    color: Colors.textPrimary,
  },
  pricingTotalValue: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: Colors.textPrimary,
  },
  pricingAdvanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  pricingAdvanceLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
  },
  pricingAdvanceValue: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: '#10B981',
  },
  pricingDueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  pricingDueLabel: {
    fontSize: 13,
    fontFamily: 'Inter-Bold',
    color: '#EF4444',
  },
  pricingDueValue: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#EF4444',
  },
  sectionHeading: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: '#64748B',
    marginBottom: 8,
  },
  transactionCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 32,
    padding: 16,
  },
  transactionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  transactionAmount: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: Colors.textPrimary,
    marginRight: 8,
  },
  upiBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  upiBadgeText: {
    fontSize: 10,
    fontFamily: 'Inter-Bold',
    color: Colors.primary,
  },
  transactionDate: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontFamily: 'Inter-Medium',
    marginTop: 4,
  },
  invoiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  invoiceBtnText: {
    fontSize: 13,
    fontFamily: 'Inter-Bold',
    color: Colors.textPrimary,
  },
  courierCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  courierHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  courierTitle: {
    fontSize: 15,
    fontFamily: 'Inter-Bold',
    color: Colors.textPrimary,
  },
  courierText: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
    fontFamily: 'Inter-Medium',
    marginBottom: 12,
  },
  addressBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  addressText: {
    flex: 1,
    fontSize: 12,
    color: Colors.textPrimary,
    fontFamily: 'Inter-Medium',
    lineHeight: 18,
  },
  copyBtn: {
    padding: 6,
    marginLeft: 8,
  },
  formLabel: {
    fontSize: 13,
    fontFamily: 'Inter-Bold',
    color: Colors.textPrimary,
    marginBottom: 10,
  },
  inputField: {
    height: 48,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 13,
    color: Colors.textPrimary,
    fontFamily: 'Inter-Medium',
    marginBottom: 10,
  },
  saveCourierBtn: {
    backgroundColor: Colors.primary,
    height: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  saveCourierBtnText: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: Colors.white,
  },
  shippingStatusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    backgroundColor: '#ECFDF5',
    padding: 8,
    borderRadius: 8,
  },
  shippingStatusText: {
    fontSize: 12,
    color: '#065F46',
    fontFamily: 'Inter-SemiBold',
  },
});

export default CustomerOrderDetailScreen;
