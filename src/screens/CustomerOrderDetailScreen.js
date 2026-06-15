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
  Scissors
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
  const statusDisplayText = (statusValue) => {
    if (!statusValue) return 'Pending';
    const normalized = String(statusValue).toUpperCase().trim();
    if (normalized === 'YET TO START' || normalized === 'PENDING' || normalized === 'YET_TO_START') return 'Pending';
    if (normalized === 'STITCHING' || normalized === 'IN PROGRESS' || normalized === 'IN_PROGRESS') return 'Stitching';
    if (normalized === 'COMPLETED' || normalized === 'READY') return 'Ready';
    if (normalized === 'DELIVERED') return 'Delivered';
    if (normalized === 'CANCELLED') return 'Cancelled';
    return statusValue;
  };

  const getStatusColor = (status) => {
    const text = statusDisplayText(status);
    switch (text) {
      case 'Pending':
        return { color: '#F97316', bg: '#FFF7ED' };
      case 'Stitching':
        return { color: '#3B82F6', bg: '#EFF6FF' };
      case 'Ready':
        return { color: '#10B981', bg: '#F0FDF4' };
      case 'Delivered':
        return { color: '#8B5CF6', bg: '#F5F3FF' };
      default:
        return { color: '#6B7280', bg: '#F3F4F6' };
    }
  };

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
      // Update locally in useData context and AsyncStorage
      await updateOrder(order.id, {
        courierService: courierName.trim(),
        courierTrackingId: trackingId.trim(),
        courierStatus: 'Shipped'
      });
      
      // Update AsyncStorage manually to force sync immediately
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

        // Add photo to outfit
        const updatedOutfits = outfits.map(outfit => {
          if (outfit.id === outfitId) {
            const currentPhotos = outfit.photos || [];
            return {
              ...outfit,
              requestedPhotosFromClient: false, // Clear the pending request flag
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

        // Sync with local context & storage
        await updateOrder(order.id, { outfits: updatedOutfits });

        // Update AsyncStorage manually to force sync immediately
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
        <Text style={styles.navbarTitle}>Order Details</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Order Header Summary */}
        <View style={styles.orderSummaryCard}>
          <View style={styles.summaryRow}>
            <View>
              <Text style={styles.summaryBillNo}>Order #{order.billNo || order.id}</Text>
              <Text style={styles.summaryDate}>Placed: {formatDate(order.date)}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status).bg }]}>
              <Text style={[styles.statusBadgeText, { color: getStatusColor(order.status).color }]}>
                {statusDisplayText(order.status)}
              </Text>
            </View>
          </View>

          <View style={styles.separator} />

          <View style={styles.datesRow}>
            <View style={styles.dateCol}>
              <Calendar size={16} color={Colors.textSecondary} style={{ marginRight: 6 }} />
              <Text style={styles.dateLabel}>Trial Date: </Text>
              <Text style={styles.dateValue}>{order.trialDate ? formatDate(order.trialDate) : 'N/A'}</Text>
            </View>
            <View style={styles.dateCol}>
              <Clock size={16} color={Colors.textSecondary} style={{ marginRight: 6 }} />
              <Text style={styles.dateLabel}>Delivery: </Text>
              <Text style={styles.dateValue}>{order.deliveryDate ? formatDate(order.deliveryDate) : 'N/A'}</Text>
            </View>
          </View>

          <View style={styles.paymentSummary}>
            <Text style={styles.paymentTotal}>Total: ₹{order.total ?? 0}</Text>
            <Text style={styles.paymentPaid}>Paid: ₹{order.advance ?? 0}</Text>
            {order.balance > 0 ? (
              <Text style={styles.paymentDue}>Due: ₹{order.balance}</Text>
            ) : (
              <Text style={styles.paymentPaidBadge}>Fully Paid</Text>
            )}
          </View>
        </View>

        {/* Outfit List */}
        <Text style={styles.sectionTitle}>Outfits in this Order</Text>
        
        {outfits.map((outfit, index) => {
          const isUploading = uploadingOutfitId === outfit.id;
          const outfitStatus = getStatusColor(outfit.status);
          const refPhotos = (outfit.photos || []).filter(p => p.category === 'REFERENCE');
          const hasStitching = outfit.stitching && outfit.stitching.length > 0;

          return (
            <View key={outfit.id || index} style={styles.outfitCard}>
              <View style={styles.outfitHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={styles.outfitName}>{outfit.name || outfit.type || 'Custom Outfit'}</Text>
                  <Text style={styles.qtyText}>x{outfit.qty || 1}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: outfitStatus.bg }]}>
                  <Text style={[styles.statusBadgeText, { color: outfitStatus.color }]}>
                    {statusDisplayText(outfit.status)}
                  </Text>
                </View>
              </View>

              {/* Stitching Choices */}
              {hasStitching && (
                <View style={styles.stitchingContainer}>
                  <Text style={styles.stitchingTitle}>Styling Parameters</Text>
                  <View style={styles.stitchingGrid}>
                    {outfit.stitching.map((stitch, sIdx) => (
                      <View key={stitch.id || sIdx} style={styles.stitchItem}>
                        <Text style={styles.stitchLabel}>{stitch.category?.name || 'Style'}</Text>
                        <Text style={styles.stitchValue}>
                          {[
                            stitch.sub_category?.name,
                            stitch.option?.name,
                            stitch.sub_option?.name
                          ].filter(Boolean).join(' - ') || 'Custom'}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Design Upload Request */}
              {outfit.requestedPhotosFromClient && (
                <View style={styles.photoRequestBox}>
                  <AlertCircle size={20} color="#F97316" style={{ marginRight: 8 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.photoRequestTitle}>Reference Design Needed</Text>
                    <Text style={styles.photoRequestText}>
                      Please upload necklines, back shapes, or embroidery design references for stitching this garment.
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.uploadBtnSmall}
                    onPress={() => handleUploadReferencePhoto(outfit.id)}
                    disabled={loading}
                  >
                    {isUploading ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <>
                        <Upload size={14} color="white" style={{ marginRight: 4 }} />
                        <Text style={styles.uploadBtnTextSmall}>Upload</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {/* Reference Photos List */}
              <View style={styles.photosSection}>
                <Text style={styles.photoSectionTitle}>Ideas & Inspirations</Text>
                <View style={styles.photoGrid}>
                  {refPhotos.map((photo, pIdx) => (
                    <View key={photo.id || pIdx} style={styles.photoThumbnailWrapper}>
                      <Image source={{ uri: photo.file_url }} style={styles.photoThumbnail} />
                      {photo.uploadedBy === 'Customer' && (
                        <View style={styles.clientPhotoBadge}>
                          <Text style={styles.clientPhotoBadgeText}>Shared</Text>
                        </View>
                      )}
                    </View>
                  ))}
                  
                  {/* Plus upload photo square button */}
                  <TouchableOpacity 
                    style={styles.addPhotoSquare}
                    onPress={() => handleUploadReferencePhoto(outfit.id)}
                    disabled={loading}
                  >
                    {isUploading ? (
                      <ActivityIndicator size="small" color={Colors.primary} />
                    ) : (
                      <>
                        <Upload size={18} color={Colors.primary} />
                        <Text style={styles.addPhotoSquareText}>Add Photo</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        })}

        {/* Courier / Beautify Garments Module */}
        <View style={styles.courierCard}>
          <View style={styles.courierHeader}>
            <Truck size={24} color={Colors.primary} style={{ marginRight: 10 }} />
            <Text style={styles.courierTitle}>Beautify Your Things (Courier)</Text>
          </View>
          <Text style={styles.courierText}>
            Need to send a sample blouse/garment for measurements? Ship it to the boutique using DTDC, Blue Dart, etc.
          </Text>

          {/* Boutique Shipping Address */}
          <View style={styles.addressBox}>
            <MapPin size={18} color={Colors.primary} style={{ marginRight: 8 }} />
            <Text style={styles.addressText} numberOfLines={2}>
              Sewvee Premium Boutique, Block C, 4th Cross Road, Indira Nagar, Bengaluru, KA 560038
            </Text>
            <TouchableOpacity style={styles.copyBtn} onPress={handleCopyBoutiqueAddress}>
              <Copy size={16} color={Colors.primary} />
            </TouchableOpacity>
          </View>

          {/* Courier Entry Form */}
          <Text style={styles.formLabel}>Log Your Shipment Details</Text>
          
          <TextInput
            style={styles.inputField}
            placeholder="Courier Service (e.g. DTDC, Blue Dart)"
            placeholderTextColor={Colors.textSecondary}
            value={courierName}
            onChangeText={setCourierName}
          />
          <TextInput
            style={styles.inputField}
            placeholder="Tracking ID / AWB Number"
            placeholderTextColor={Colors.textSecondary}
            value={trackingId}
            onChangeText={setTrackingId}
          />

          <TouchableOpacity
            style={[styles.saveCourierBtn, isSavingCourier && { opacity: 0.7 }]}
            onPress={handleSaveCourierDetails}
            disabled={isSavingCourier}
          >
            {isSavingCourier ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text style={styles.saveCourierBtnText}>Save Tracking Details</Text>
            )}
          </TouchableOpacity>

          {order.courierTrackingId ? (
            <View style={styles.shippingStatusBox}>
              <CheckCircle size={16} color={Colors.success} style={{ marginRight: 6 }} />
              <Text style={styles.shippingStatusText}>
                Shipment logged: {order.courierService} - {order.courierTrackingId}
              </Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default CustomerOrderDetailScreen;

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
  orderSummaryCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 18,
    marginBottom: 24,
    ...Shadow.subtle,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryBillNo: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: Colors.textPrimary,
  },
  summaryDate: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontFamily: 'Inter-Medium',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
  },
  separator: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 14,
  },
  datesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  dateCol: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontFamily: 'Inter-Medium',
  },
  dateValue: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: Colors.textPrimary,
  },
  paymentSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    padding: 12,
  },
  paymentTotal: {
    fontSize: 13,
    fontFamily: 'Inter-Bold',
    color: Colors.textPrimary,
  },
  paymentPaid: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#10B981',
  },
  paymentDue: {
    fontSize: 13,
    fontFamily: 'Inter-Bold',
    color: '#EF4444',
  },
  paymentPaidBadge: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    color: Colors.white,
    backgroundColor: Colors.success,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: Colors.textPrimary,
    marginBottom: 14,
  },
  outfitCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    ...Shadow.subtle,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  outfitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  outfitName: {
    fontSize: 15,
    fontFamily: 'Inter-Bold',
    color: Colors.textPrimary,
  },
  qtyText: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: Colors.textSecondary,
  },
  stitchingContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  stitchingTitle: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    color: '#64748B',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  stitchingGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  stitchItem: {
    width: '48%',
    marginBottom: 6,
  },
  stitchLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontFamily: 'Inter-Medium',
  },
  stitchValue: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: Colors.textPrimary,
    marginTop: 2,
  },
  photoRequestBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  photoRequestTitle: {
    fontSize: 13,
    fontFamily: 'Inter-Bold',
    color: '#C2410C',
  },
  photoRequestText: {
    fontSize: 11,
    color: '#9A3412',
    fontFamily: 'Inter-Medium',
    marginTop: 1,
  },
  uploadBtnSmall: {
    backgroundColor: '#F97316',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginLeft: 8,
  },
  uploadBtnTextSmall: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    color: Colors.white,
  },
  photosSection: {
    marginTop: 8,
  },
  photoSectionTitle: {
    fontSize: 13,
    fontFamily: 'Inter-Bold',
    color: Colors.textPrimary,
    marginBottom: 10,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  photoThumbnailWrapper: {
    position: 'relative',
    width: 66,
    height: 66,
    borderRadius: 10,
    overflow: 'hidden',
  },
  photoThumbnail: {
    width: '100%',
    height: '100%',
  },
  clientPhotoBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(91, 67, 238, 0.85)',
    paddingVertical: 2,
    alignItems: 'center',
  },
  clientPhotoBadgeText: {
    fontSize: 8,
    fontFamily: 'Inter-Bold',
    color: Colors.white,
  },
  addPhotoSquare: {
    width: 66,
    height: 66,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.primary,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  addPhotoSquareText: {
    fontSize: 10,
    fontFamily: 'Inter-Bold',
    color: Colors.primary,
  },
  courierCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 16,
    marginTop: 8,
    marginBottom: 20,
    ...Shadow.subtle,
    borderWidth: 1,
    borderColor: '#F1F5F9',
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
});
