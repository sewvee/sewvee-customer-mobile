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
  Alert,
  Modal,
} from 'react-native';
import CustomerRequestsTab from '../components/CustomerRequestsTab';
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
  ShoppingBag,
  Image as ImageIcon,
  FileText,
  Download,
  ChevronDown,
  PenTool,
  ClipboardList,
  Plus,
  Edit2,
  ImagePlus,
  Type,
  X,
  Check,
} from 'lucide-react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import ImageCropPicker from 'react-native-image-crop-picker';
import { useDispatch } from 'react-redux';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { uploadImageAction } from '../store/uploadSlice';
import { useToast } from '../context/ToastContext';
import { formatDate } from '../utils/dateUtils';
import { formatOrderNumber } from '../utils/orderIdFormatter';
import { URL_CUSTOMER_PORTAL_ORDERS } from '../config/env';
import CollageMaker from '../components/CollageMaker';


const resolveImageUrl = (url) => {
  if (!url) return url;
  if (url.includes('localhost:')) {
    const { API_DOMAIN } = require('../config/env');
    return url.replace(/http:\/\/localhost:\d+/, API_DOMAIN);
  }
  if (!url.startsWith('http')) {
    const { API_DOMAIN } = require('../config/env');
    return `${API_DOMAIN}${url.startsWith('/') ? '' : '/'}${url}`;
  }
  return url;
};

const CustomerOrderDetailScreen = ({ route, navigation }) => {
  const { orderId } = route.params;
  const dispatch = useDispatch();
  const { showToast } = useToast();
  const { user } = useAuth();
  const { orders, updateOrder, refreshData } = useData();

  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  const [uploadingOutfitId, setUploadingOutfitId] = useState(null);
  const [submittingOutfitId, setSubmittingOutfitId] = useState(null);
  const [showCollageMaker, setShowCollageMaker] = useState(false);
  const [pendingPhotos, setPendingPhotos] = useState({});
  const [collageOutfitId, setCollageOutfitId] = useState(null);
  const [courierName, setCourierName] = useState('');
  const [trackingId, setTrackingId] = useState('');
  const [isSavingCourier, setIsSavingCourier] = useState(false);
  const [editingPhoto, setEditingPhoto] = useState(null); // { file_url, outfitId }
  const [editDrawerVisible, setEditDrawerVisible] = useState(false);
  const [activeOutfitIndex, setActiveOutfitIndex] = useState(0);

  const [confirmDrawerVisible, setConfirmDrawerVisible] = useState(false);
  const [confirmOutfitId, setConfirmOutfitId] = useState(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const [customerAddedRefPhotos, setCustomerAddedRefPhotos] = useState([]);
  const [galleryFolders, setGalleryFolders] = useState([]);
  const [isOutfitChatActive, setIsOutfitChatActive] = useState(false);

  // Fetch Sewvee gallery folders so customer can pick from their saved photos
  useEffect(() => {
    const fetchGallery = async () => {
      try {
        const token = user?.token || user?.data?.token || user?.accessToken || user?.data?.accessToken || user?.access_token || user?.data?.access_token || '';
        const formattedToken = token ? (token.startsWith('Bearer ') ? token : `Bearer ${token}`) : '';
        const { API_DOMAIN } = require('../config/env');
        const res = await fetch(`${API_DOMAIN}/mobile/customer-portal/gallery`, {
          headers: { Authorization: formattedToken },
        });
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setGalleryFolders(json.data);
        }
      } catch (e) {
        console.log('Gallery fetch error:', e);
      }
    };
    fetchGallery();
  }, []);

  // Find target order
  const order = React.useMemo(() => {
    return orders.find(o => String(o.id) === String(orderId));
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
    setCollageOutfitId(outfitId);
    setShowCollageMaker(true);
  };

  const handleSaveCollage = async (uri) => {
    setShowCollageMaker(false);
    setUploadingOutfitId(collageOutfitId);
    setLoading(true);
    
    // Ensure URI is properly formatted for React Native FormData
    const fileUri = Platform.OS === 'android' && !uri.startsWith('file://') ? 'file://' + uri : uri;

    try {
      const uploadResult = await dispatch(uploadImageAction({
        uri: fileUri,
        type: 'image/jpeg',
        name: `collage_${Date.now()}.jpg`,
        key_name: 'order_photos',
      })).unwrap();

      const fileUrl = uploadResult?.file_url || uploadResult?.data?.file_url || uploadResult?.full_url || uploadResult?.data?.full_url || uploadResult?.url || uploadResult?.data?.url || '';

      if (!fileUrl) {
        throw new Error('No image URL returned from upload server');
      }

      if (editingPhoto) {
        if (editingPhoto.isPending) {
          setPendingPhotos(prev => {
            const list = [...(prev[editingPhoto.outfitId] || [])];
            list[editingPhoto.pendingIndex] = fileUrl;
            return { ...prev, [editingPhoto.outfitId]: list };
          });
        } else {
          // It was an already submitted photo, so we send it as a change request directly
          await fetch(`${URL_CUSTOMER_PORTAL_ORDERS}/${order.id}/outfits/${editingPhoto.outfitId}/requests`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ attachment_url: fileUrl, message: 'Updated reference photo (edited)' }),
          });
          refreshData();
          showToast('Edited photo submitted successfully', 'success');
        }
        setEditingPhoto(null);
      } else {
        setPendingPhotos(prev => ({
          ...prev,
          [collageOutfitId]: [...(prev[collageOutfitId] || []), fileUrl]
        }));
      }

    } catch (err) {
      console.log('Upload error:', err);
      showToast(err?.message || 'Failed to upload photo', 'error');
    } finally {
      setUploadingOutfitId(null);
      setSubmittingOutfitId(null);
      setLoading(false);
    }
  };

  const removePendingPhoto = (outfitId, index) => {
    setPendingPhotos(prev => {
      const list = [...(prev[outfitId] || [])];
      list.splice(index, 1);
      return { ...prev, [outfitId]: list };
    });
  };

  
  const handleConfirmPhotosClick = (outfitId) => {
    setConfirmOutfitId(outfitId);
    setAgreedToTerms(false);
    setConfirmDrawerVisible(true);
  };

  const handleConfirmPhotos = async (outfitId) => {
    const urls = pendingPhotos[outfitId] || [];
    if (urls.length === 0) return;

    setSubmittingOutfitId(outfitId);
    setLoading(true);
    try {
      // NOTE: Using a local fallback URL if the staging backend isn't updated yet!
      const API_BASE = URL_CUSTOMER_PORTAL_ORDERS;

      for (const fileUrl of urls) {
        const response = await fetch(`${API_BASE}/${order.id}/outfits/${outfitId}/requests`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            attachment_url: fileUrl,
            message: 'Uploaded via Customer App',
            phone: '9090909090'
          })
        });

        if (!response.ok) {
           const errText = await response.text();
           throw new Error(`API Error: ${errText}`);
        }
      }

      setPendingPhotos(prev => {
        const copy = { ...prev };
        delete copy[outfitId];
        return copy;
      });

      refreshData();
      showToast('Photos submitted successfully!', 'success');
    } catch (err) {
      console.log('Confirm error:', err);
      showToast(err?.message || 'Failed to notify backend', 'error');
    } finally {
      setUploadingOutfitId(null);
      setSubmittingOutfitId(null);
      setLoading(false);
    }
  };

  const handleCropUploadedPhoto = async () => {
    setEditDrawerVisible(false);
    if (!editingPhoto?.file_url) return;
    try {
      const cropped = await ImageCropPicker.openCropper({
        path: editingPhoto.file_url,
        mediaType: 'photo',
        cropperToolbarTitle: 'Crop Photo',
      });
      setLoading(true);
      const uploadResult = await dispatch(uploadImageAction({
        uri: cropped.path,
        type: cropped.mime || 'image/jpeg',
        name: `cropped_${Date.now()}.jpg`,
        key_name: 'order_photos',
      })).unwrap();
      const fileUrl = uploadResult?.file_url || uploadResult?.data?.file_url || uploadResult?.full_url || uploadResult?.data?.full_url || uploadResult?.url || uploadResult?.data?.url || '';
      if (!fileUrl) throw new Error('Upload failed');
      
      if (editingPhoto.isPending) {
        setPendingPhotos(prev => {
          const list = [...(prev[editingPhoto.outfitId] || [])];
          list[editingPhoto.pendingIndex] = fileUrl;
          return { ...prev, [editingPhoto.outfitId]: list };
        });
      } else {
        await fetch(`${URL_CUSTOMER_PORTAL_ORDERS}/${order.id}/outfits/${editingPhoto.outfitId}/requests`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ attachment_url: fileUrl, message: 'Updated reference photo (cropped)' }),
        });
      }
      refreshData();
      showToast('Photo updated successfully', 'success');
    } catch (err) {
      showToast(err?.message || 'Failed to update photo', 'error');
    } finally {
      setLoading(false);
      setEditingPhoto(null);
    }
  };

  const handleChangeUploadedPhoto = () => {
    setEditDrawerVisible(false);
    launchImageLibrary({ mediaType: 'photo', quality: 0.9 }, async (response) => {
      if (response.didCancel || !response.assets?.length) return;
      setLoading(true);
      try {
        const asset = response.assets[0];
        const uploadResult = await dispatch(uploadImageAction({
          uri: asset.uri,
          type: asset.type || 'image/jpeg',
          name: asset.fileName || `ref_${Date.now()}.jpg`,
          key_name: 'order_photos',
        })).unwrap();
        const fileUrl = uploadResult?.file_url || uploadResult?.data?.file_url || uploadResult?.full_url || uploadResult?.data?.full_url || uploadResult?.url || uploadResult?.data?.url || '';
        if (!fileUrl) throw new Error('Upload failed');
        
        if (editingPhoto.isPending) {
          setPendingPhotos(prev => {
            const list = [...(prev[editingPhoto.outfitId] || [])];
            list[editingPhoto.pendingIndex] = fileUrl;
            return { ...prev, [editingPhoto.outfitId]: list };
          });
        } else {
          await fetch(`${URL_CUSTOMER_PORTAL_ORDERS}/${order.id}/outfits/${editingPhoto.outfitId}/requests`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ attachment_url: fileUrl, message: 'Updated reference photo' }),
          });
        }
        refreshData();
        showToast('Photo updated successfully', 'success');
      } catch (err) {
        showToast(err?.message || 'Failed to update photo', 'error');
      } finally {
        setLoading(false);
        setEditingPhoto(null);
      }
    });
  };


  return (
    <SafeAreaView style={styles.container}>
      {!isOutfitChatActive && (
        <>
          {/* Navbar */}
          <View style={styles.navbar}>
            <TouchableOpacity style={styles.backIconBtn} onPress={() => navigation.goBack()}>
              <ArrowLeft size={22} color={Colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.navbarTitle}>
              {order.order_type === 'SALE_ORDER' ? 'Invoice' : 'Order'} #{order.billNo || order.id}
            </Text>
            <View style={{ width: 22 }} />
          </View>

          {/* TABS */}
          <View style={{ flexDirection: 'row', backgroundColor: '#FFF', borderBottomWidth: 1, borderColor: '#E2E8F0' }}>
            <TouchableOpacity 
              style={{ flex: 1, paddingVertical: 14, alignItems: 'center', borderBottomWidth: 2, borderColor: activeTab === 'details' ? Colors.primary : 'transparent' }}
              onPress={() => setActiveTab('details')}
            >
              <Text style={{ fontSize: 13, fontFamily: 'Inter-Bold', color: activeTab === 'details' ? Colors.primary : '#64748B' }}>Details</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={{ flex: 1, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', borderBottomWidth: 2, borderColor: activeTab === 'requests' ? Colors.primary : 'transparent' }}
              onPress={() => setActiveTab('requests')}
            >
              <Text style={{ fontSize: 13, fontFamily: 'Inter-Bold', color: activeTab === 'requests' ? Colors.primary : '#64748B' }}>Requests</Text>
              {order?.has_unread_messages ? (
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444', marginLeft: 6 }} />
              ) : null}
            </TouchableOpacity>
            <TouchableOpacity 
              style={{ flex: 1, paddingVertical: 14, alignItems: 'center', borderBottomWidth: 2, borderColor: activeTab === 'payment' ? Colors.primary : 'transparent' }}
              onPress={() => setActiveTab('payment')}
            >
              <Text style={{ fontSize: 13, fontFamily: 'Inter-Bold', color: activeTab === 'payment' ? Colors.primary : '#64748B' }}>Payments</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {activeTab === 'requests' ? (
        <CustomerRequestsTab order={order} onUpdateStatus={refreshData} onChatActive={setIsOutfitChatActive} />
      ) : activeTab === 'payment' ? (
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={[styles.sectionHeading, { marginTop: 16 }]}>ORDER BILLING SUMMARY</Text>
        <View style={styles.pricingCard}>
          {outfits.map((outfit, idx) => {
             const outfitName = outfit.outfit_name || outfit.name || 'Outfit';
             const isLast = idx === outfits.length - 1;
             return (
               <View key={'billing-' + (outfit.id || idx)} style={{ paddingBottom: 12, borderBottomWidth: isLast ? 0 : 1, borderBottomColor: '#F1F5F9' }}>
                 <Text style={{ fontSize: 11, fontFamily: 'Inter-Bold', color: Colors.primary, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                   {outfitName}
                 </Text>
                 
                 {order.order_type === 'SALE_ORDER' ? (
                   <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 8 }}>
                     <Text style={{ fontSize: 13, fontFamily: 'Inter-Medium', color: '#475569' }}>Readymade (x{outfit.quantity || 1})</Text>
                     <Text style={{ fontSize: 13, fontFamily: 'Inter-Bold', color: Colors.textPrimary }}>₹{Number(outfit.totalAmount || outfit.total_amount || outfit.price || 0).toFixed(2)}</Text>
                   </View>
                 ) : (
                   <View>
                     {(outfit.services || []).map((service, sIdx) => (
                       <View key={'srv-' + sIdx} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 8 }}>
                         <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                           <Scissors size={12} color="#94A3B8" style={{ marginRight: 6 }} />
                           <Text style={{ fontSize: 13, fontFamily: 'Inter-Medium', color: '#475569' }}>{service.service_name || service.name || 'Stitching'}</Text>
                         </View>
                         <Text style={{ fontSize: 13, fontFamily: 'Inter-Bold', color: Colors.textPrimary }}>₹{Number(service.price || 0).toFixed(2)}</Text>
                       </View>
                     ))}
                     {(outfit.services?.length === 0 || !outfit.services) && (
                       <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 8 }}>
                         <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                           <Scissors size={12} color="#94A3B8" style={{ marginRight: 6 }} />
                           <Text style={{ fontSize: 13, fontFamily: 'Inter-Medium', color: '#475569' }}>Stitching</Text>
                         </View>
                         <Text style={{ fontSize: 13, fontFamily: 'Inter-Bold', color: Colors.textPrimary }}>₹{Number(outfit.totalAmount || outfit.total_amount || outfit.price || 0).toFixed(2)}</Text>
                       </View>
                     )}
                     {(outfit.items || []).filter(i => i.item_type === 'MATERIAL').map((mat, mIdx) => (
                       <View key={'mat-' + mIdx} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 8 }}>
                         <View style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: 18 }}>
                           <Text style={{ fontSize: 13, fontFamily: 'Inter-Medium', color: '#475569' }}>{mat.material_name || mat.name || 'Material'}</Text>
                         </View>
                         <Text style={{ fontSize: 13, fontFamily: 'Inter-Bold', color: Colors.textPrimary }}>₹{Number(mat.total_amount || mat.amount || mat.price || 0).toFixed(2)}</Text>
                       </View>
                     ))}
                   </View>
                 )}
                 <View style={{ height: 1, backgroundColor: '#F1F5F9', marginTop: 8 }} />
               </View>
             );
          })}
          
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 }}>
            <Text style={{ fontSize: 12, fontFamily: 'Inter-Bold', color: Colors.textPrimary }}>TOTAL BILLING</Text>
            <Text style={{ fontSize: 14, fontFamily: 'Inter-Bold', color: Colors.textPrimary }}>₹{Number(order.totalAmount || order.total || 0).toFixed(2)}</Text>
          </View>
          
          <View style={styles.pricingSeparator} />
          
          {order.order_type === 'SALE_ORDER' && (
            <View style={styles.pricingAdvanceRow}>
              <Text style={styles.pricingAdvanceLabel}>Delivery Method</Text>
              <Text style={[styles.pricingAdvanceValue, { color: Colors.primary }]}>{order.delivery_method ? String(order.delivery_method).replace('_', ' ') : 'STORE PICKUP'}</Text>
            </View>
          )}

          <View style={styles.pricingAdvanceRow}>
            <Text style={styles.pricingAdvanceLabel}>Advance / Paid Amount</Text>
            <Text style={styles.pricingAdvanceValue}>₹{Number(order.advanceAmount || order.advance || order.paid_amount || 0).toFixed(2)}</Text>
          </View>
          
          <View style={styles.pricingDueRow}>
            <Text style={styles.pricingDueLabel}>DUE BALANCE</Text>
            <Text style={styles.pricingDueValue}>₹{Number((order.totalAmount || order.total || 0) - (order.advanceAmount || order.advance || order.paid_amount || 0)).toFixed(2)}</Text>
          </View>
        </View>

        {(order.payments && order.payments.length > 0) ? (
          <>
            <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
              <Text style={styles.sectionHeading}>TRANSACTION LOGS</Text>
            </View>

            <View style={styles.transactionCard}>
              {order.payments.map((payment, pIdx) => (
                <View key={'payment-' + pIdx} style={[styles.transactionRow, pIdx !== order.payments.length - 1 && { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }]}>
                   <View>
                     <View style={{flexDirection: 'row', alignItems: 'center'}}>
                       <Text style={styles.transactionAmount}>₹{Number(payment.amount).toFixed(2)}</Text>
                       <View style={styles.upiBadge}><Text style={styles.upiBadgeText}>{payment.payment_mode || 'PAID'}</Text></View>
                     </View>
                     <Text style={styles.transactionDate}>Date: {formatDate(payment.payment_date || payment.createdAt || new Date())}</Text>
                     {payment.transaction_id && (
                       <Text style={{ fontSize: 10, color: '#94A3B8', marginTop: 2, fontFamily: 'Inter-Medium' }}>Txn ID: {payment.transaction_id}</Text>
                     )}
                   </View>
                </View>
              ))}
            </View>
          </>
        ) : (Number(order.advanceAmount || order.advance || order.paid_amount || 0) > 0) && (
          <>
            <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
              <Text style={styles.sectionHeading}>TRANSACTION LOGS</Text>
            </View>

            <View style={styles.transactionCard}>
              <View style={styles.transactionRow}>
                 <View>
                   <View style={{flexDirection: 'row', alignItems: 'center'}}>
                     <Text style={styles.transactionAmount}>₹{Number(order.advanceAmount || order.advance || order.paid_amount || 0).toFixed(2)}</Text>
                     <View style={styles.upiBadge}><Text style={styles.upiBadgeText}>PAID</Text></View>
                   </View>
                   <Text style={styles.transactionDate}>Date: {formatDate(order.date || order.createdAt || order.order_date || new Date())}</Text>
                 </View>
              </View>
            </View>
          </>
        )}

        <TouchableOpacity 
          style={[styles.invoiceBtn, { paddingVertical: 14, justifyContent: 'center', marginBottom: 32, backgroundColor: '#FFF' }]}
          onPress={() => navigation.navigate('InvoicePreview', { 
            order, 
            orderId: order.id,
            allowedCopyTypes: ['customer'],
            initialCopyType: 'customer',
            company: {
              name: order.boutiqueName || 'Sewvee Premium Boutique',
              address: 'Block C, 4th Cross Road, Indira Nagar, Bengaluru',
              phone: '+91 9999999999'
            }
          })}
        >
          <Download size={16} color={Colors.textPrimary} style={{marginRight: 6}} />
          <Text style={[styles.invoiceBtnText, { fontSize: 14 }]}>Download Invoice</Text>
        </TouchableOpacity>
      </ScrollView>

      ) : (

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {order.order_type === 'SALE_ORDER' ? (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <ShoppingBag size={14} color={Colors.primary} />
              <Text style={styles.cardTitle}>PURCHASED ITEMS</Text>
            </View>
            <View style={styles.stitchingTable}>
              {outfits.map((outfit, index) => (
                <View key={outfit.id || index} style={[styles.tableRow, index === outfits.length - 1 && styles.tableRowLast]}>
                  <View style={styles.tableColLeft}>
                    <Text style={styles.tableColLeftText}>{outfit.outfit_name || outfit.name || "Ready-Made Item"} {outfit.quantity ? `(x${outfit.quantity})` : ''}</Text>
                  </View>
                  <View style={styles.tableColRight}>
                    <Text style={styles.tableColRightText}>₹{outfit.totalAmount || outfit.price || 0}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        ) : (
          <View>
            {outfits.length > 1 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.outfitTabsContainer} contentContainerStyle={styles.outfitTabsContent}>
                {outfits.map((o, idx) => (
                  <TouchableOpacity 
                    key={o.id || idx}
                    style={[styles.outfitTabItem, activeOutfitIndex === idx && styles.activeOutfitTabItem]}
                    onPress={() => setActiveOutfitIndex(idx)}
                  >
                    <Text style={[styles.outfitTabItemText, activeOutfitIndex === idx && styles.activeOutfitTabItemText]}>
                      {o.name ? o.name.toUpperCase() : `OUTFIT ${idx + 1}`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
            
            {(() => {
              const outfit = outfits[activeOutfitIndex];
              if (!outfit) return null;
              const index = activeOutfitIndex;
              const isUploading = uploadingOutfitId === outfit.id;
              const apiRefPhotos = (outfit.photos || []).filter(p => p.category === 'REFERENCE' || p.category === 'SKETCH');
              const localRefPhotos = customerAddedRefPhotos.filter(p => p.outfitId === outfit.id);
              const refPhotos = [...apiRefPhotos, ...localRefPhotos];
              const hasStitching = outfit.stitching && outfit.stitching.length > 0;
              const outfitName = outfit.name ? outfit.name.toUpperCase() : `OUTFIT ${index + 1}`;

              return (
                <View key={outfit.id || index} style={styles.outfitBlock}>

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
                    <View style={[styles.tableRow, styles.tableRowLast, { justifyContent: 'center', paddingVertical: 12 }]}>
                       <Text style={{ fontSize: 13, color: '#94A3B8', fontStyle: 'italic' }}>No stitching specifications provided.</Text>
                    </View>
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
                    refPhotos.map((photo, pIdx) => {
                      let fullUrl = resolveImageUrl(photo.file_url);
                      return (
                      <View key={photo.id || pIdx} style={styles.photoWrapper}>
                        <Image source={{ uri: fullUrl }} style={styles.photoImg} />
                      </View>
                    )})
                  ) : (
                    <Text style={{ fontSize: 13, color: '#94A3B8', fontStyle: 'italic', paddingVertical: 8 }}>
                      No photos uploaded by boutique.
                    </Text>
                  )}
                </View>

                {outfit.requestedPhotosFromClient && (
                  <View style={{ borderTopWidth: 1, borderColor: '#FFEDD5', padding: 16, backgroundColor: '#FFF7ED', borderBottomLeftRadius: 12, borderBottomRightRadius: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                      <AlertCircle size={16} color="#F97316" style={{ marginRight: 6 }} />
                      <Text style={{ fontSize: 14, fontFamily: 'Inter-Bold', color: '#9A3412' }}>
                        Action Required
                      </Text>
                    </View>
                    <Text style={{ fontSize: 13, color: '#C2410C', marginBottom: 14, lineHeight: 18 }}>
                      Boutique has requested you to upload reference photos or sketches for this outfit.
                    </Text>
                    {(pendingPhotos[outfit.id] || []).length > 0 && (
                      <View style={{ marginBottom: 12 }}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 8, paddingRight: 8 }}>
                          {pendingPhotos[outfit.id].map((rawUrl, idx) => { const url = resolveImageUrl(rawUrl); return (
                            <View key={idx} style={{ width: 72, height: 72, marginRight: 16 }}>
                              <Image source={{ uri: url }} style={{ width: '100%', height: '100%', borderRadius: 8, backgroundColor: '#FFEDD5' }} resizeMode="cover" />
                              
                              {/* Edit Button */}
                              <TouchableOpacity
                                style={{ position: 'absolute', top: -8, right: 24, backgroundColor: '#6366F1', borderRadius: 12, width: 24, height: 24, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff', elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 2, shadowOffset: {width: 0, height: 1} }}
                                onPress={() => {
                                  setEditingPhoto({ file_url: url, outfitId: outfit.id, isPending: true, pendingIndex: idx });
                                  setEditDrawerVisible(true);
                                }}
                              >
                                <Edit2 size={12} color="#fff" />
                              </TouchableOpacity>

                              {/* Delete Button */}
                              <TouchableOpacity
                                style={{ position: 'absolute', top: -8, right: -8, backgroundColor: '#EF4444', borderRadius: 12, width: 24, height: 24, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff', elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 2, shadowOffset: {width: 0, height: 1} }}
                                onPress={() => removePendingPhoto(outfit.id, idx)}
                              >
                                <Text style={{ color: 'white', fontSize: 11, fontWeight: 'bold' }}>X</Text>
                              </TouchableOpacity>
                            </View>
                          ); })}
                        </ScrollView>
                      </View>
                    )}

                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <TouchableOpacity 
                        style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F97316', paddingVertical: 12, borderRadius: 8 }}
                        onPress={() => handleUploadReferencePhoto(outfit.id)}
                        disabled={uploadingOutfitId === outfit.id || submittingOutfitId === outfit.id}
                      >
                        {uploadingOutfitId === outfit.id ? (
                          <ActivityIndicator size="small" color="#FFF" />
                        ) : (
                          <>
                            <Upload size={18} color="#FFF" style={{ marginRight: 8 }} />
                            <Text style={{ color: '#FFF', fontFamily: 'Inter-Bold', fontSize: 14 }}>
                              {(pendingPhotos[outfit.id] || []).length > 0 ? 'Add More' : 'Upload Photo'}
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>

                      {(pendingPhotos[outfit.id] || []).length > 0 && (
                        <TouchableOpacity 
                          style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#10B981', paddingVertical: 12, borderRadius: 8 }}
                          onPress={() => handleConfirmPhotosClick(outfit.id)}
                          disabled={uploadingOutfitId === outfit.id || submittingOutfitId === outfit.id}
                        >
                          {submittingOutfitId === outfit.id ? (
                            <ActivityIndicator size="small" color="#FFF" />
                          ) : (
                            <Text style={{ color: '#FFF', fontFamily: 'Inter-Bold', fontSize: 14 }}>Confirm Photos</Text>
                          )}
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                )}
              </View>

              {/* BOUTIQUE NOTES */}
              {outfit.notes ? (
                <View style={styles.notesCard}>
                  <Text style={styles.notesTitle}>BOUTIQUE NOTES</Text>
                  <Text style={styles.notesText}>{outfit.notes}</Text>
                </View>
              ) : null}

              

            </View>
              );
            })()}
          </View>
        )}

        

      </ScrollView>
      )}
      <CollageMaker
        visible={showCollageMaker}
        onClose={() => { setShowCollageMaker(false); setEditingPhoto(null); }}
        onSaveReference={handleSaveCollage}
        galleryFolders={galleryFolders}
        initialImage={editingPhoto ? editingPhoto.file_url : null}
      />

      
      {/* ── Confirm Photos Drawer ── */}
      <Modal visible={confirmDrawerVisible} transparent animationType="slide" onRequestClose={() => setConfirmDrawerVisible(false)}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' }} activeOpacity={1} onPress={() => setConfirmDrawerVisible(false)} />
        <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 36 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
              <AlertCircle size={20} color="#EF4444" />
            </View>
            <Text style={{ fontSize: 17, fontFamily: 'Inter-Bold', color: '#1E293B', flex: 1 }}>Confirm Photos</Text>
            <TouchableOpacity onPress={() => setConfirmDrawerVisible(false)} style={{ padding: 4 }}>
              <X size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          <Text style={{ fontSize: 14, fontFamily: 'Inter-Medium', color: '#475569', marginBottom: 24, lineHeight: 22 }}>
            Are you sure you want to confirm these photos? Once submitted, you cannot change them and they will be sent directly to the boutique for reference.
          </Text>

          <TouchableOpacity 
            style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 24 }}
            activeOpacity={0.7}
            onPress={() => setAgreedToTerms(!agreedToTerms)}
          >
            <View style={{ 
              width: 20, height: 20, borderRadius: 6, 
              borderWidth: agreedToTerms ? 0 : 2, 
              borderColor: '#CBD5E1', 
              backgroundColor: agreedToTerms ? Colors.primary : 'transparent',
              alignItems: 'center', justifyContent: 'center',
              marginTop: 2, marginRight: 12
            }}>
              {agreedToTerms && <Check size={14} color="#FFF" strokeWidth={3} />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontFamily: 'Inter-SemiBold', color: '#1E293B', marginBottom: 6 }}>
                I agree with the terms and conditions
              </Text>
              <View style={{ backgroundColor: '#F8FAFC', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#F1F5F9' }}>
                <Text style={{ fontSize: 12, fontFamily: 'Inter-Medium', color: '#64748B', lineHeight: 18 }}>
                  {`${order?.company?.invoice_terms || order?.company?.termsAndConditions || order?.boutiqueTerms || 'No Refund / No Exchange / No Cancellation\nE & O.E.'}`}
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={{ 
              backgroundColor: agreedToTerms ? Colors.primary : '#E2E8F0', 
              borderRadius: 12, 
              paddingVertical: 16, 
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center'
            }}
            disabled={!agreedToTerms}
            onPress={() => {
              setConfirmDrawerVisible(false);
              if (confirmOutfitId) handleConfirmPhotos(confirmOutfitId);
            }}
          >
            <Text style={{ color: agreedToTerms ? '#FFF' : '#94A3B8', fontFamily: 'Inter-Bold', fontSize: 15 }}>Submit Photos</Text>
          </TouchableOpacity>
        </View>
      </Modal>


      {/* ── Photo Edit Drawer ── */}
      <Modal visible={editDrawerVisible} transparent animationType="slide" onRequestClose={() => setEditDrawerVisible(false)}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' }} activeOpacity={1} onPress={() => setEditDrawerVisible(false)} />
        <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 36 }}>
          <Text style={{ fontSize: 17, fontFamily: 'Inter-Bold', color: '#1E293B', marginBottom: 4 }}>Edit Photo</Text>
          <Text style={{ fontSize: 13, fontFamily: 'Inter-Medium', color: '#64748B', marginBottom: 20 }}>What would you like to do with this photo?</Text>

          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#E2E8F0' }}
            onPress={() => {
              setEditDrawerVisible(false);
              setCollageOutfitId(editingPhoto.outfitId);
              setShowCollageMaker(true); // Open the unified editor!
            }}
          >
            <View style={{ width: 42, height: 42, borderRadius: 10, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
              <ImagePlus size={22} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontFamily: 'Inter-Bold', color: '#1E293B' }}>Edit Photo</Text>
              <Text style={{ fontSize: 12, fontFamily: 'Inter-Medium', color: '#64748B', marginTop: 2 }}>Crop, draw, or add text</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#E2E8F0' }}
            onPress={handleChangeUploadedPhoto}
          >
            <View style={{ width: 42, height: 42, borderRadius: 10, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
              <ImageIcon size={22} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontFamily: 'Inter-Bold', color: '#1E293B' }}>Change Photo</Text>
              <Text style={{ fontSize: 12, fontFamily: 'Inter-Medium', color: '#64748B', marginTop: 2 }}>Replace with a new image</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={{ alignItems: 'center', paddingVertical: 14, marginTop: 4 }}
            onPress={() => setEditDrawerVisible(false)}
          >
            <Text style={{ fontSize: 15, fontFamily: 'Inter-SemiBold', color: '#64748B' }}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      
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
  outfitTabsContainer: {
    marginBottom: 16,
  },
  outfitTabsContent: {
    paddingHorizontal: 2,
    paddingBottom: 4,
  },
  outfitTabItem: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  activeOutfitTabItem: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  outfitTabItemText: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
  },
  activeOutfitTabItemText: {
    color: '#FFF',
    fontFamily: 'Inter-Bold',
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
