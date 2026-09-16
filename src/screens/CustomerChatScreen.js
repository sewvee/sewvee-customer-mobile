import React, { useEffect, useState, useRef } from 'react';
import { View, Linking, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StatusBar, Keyboard } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Send, Store, ShoppingBag } from 'lucide-react-native';
const KeyboardView = Platform.OS === 'ios' ? KeyboardAvoidingView : ({ style, children }) => <View style={style}>{children}</View>;
import { Colors } from '../constants/theme';
import { formatChatMessage } from '../utils/chatUtils';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import axios from 'axios';
import { BASE_URL, URL_UPLOAD, API_DOMAIN } from '../config/env';
import CustomerFeedbackModal from '../components/CustomerFeedbackModal';
import CollageMaker from '../components/CollageMaker';
import * as ImagePicker from 'react-native-image-picker';
import {
  Check,
  Camera, Paperclip, MoreVertical, Image as ImageIcon, Star, Edit2, Trash2, X, FileText, ShoppingBag as Shirt, Scissors } from 'lucide-react-native';
import { TouchableWithoutFeedback, Modal, ActionSheetIOS, Alert, Image, Pressable } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDispatch } from 'react-redux';
import { resetChatUnread, setChatUnread } from '../store/chatSlice';
import io from 'socket.io-client';
import chatSocketService from '../utils/chatSocketService';

const CustomerChatScreen = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const { boutiqueId, boutiqueName: initBoutiqueName, orderId: passedOrderId, orderNumber } = route.params;
  const { user } = useAuth();
  const { orders } = useData();
  const dispatch = useDispatch();

  // --- MANUAL ANDROID KEYBOARD SPACER ---
  // Since translucent status bar kills adjustResize, we must manually push the layout up.
  const [androidKeyboardHeight, setAndroidKeyboardHeight] = React.useState(0);


  // On mount: clear the unread badge and record last-visited time for this boutique
  useEffect(() => {
    dispatch(resetChatUnread());
    // Tell global socket service this chat is now open → suppress badge increments for this order
    chatSocketService.setActiveChatOrderId(passedOrderId);

    const saveLastVisited = async () => {
      try {
        const existing = await AsyncStorage.getItem('chat_last_visited');
        const map = existing ? JSON.parse(existing) : {};
        map[String(boutiqueId)] = new Date().toISOString();
        await AsyncStorage.setItem('chat_last_visited', JSON.stringify(map));
      } catch (e) {
        console.warn('Failed to save lastVisited', e);
      }
    };
    saveLastVisited();

    return () => {
      // Clear active chat so global socket resumes badge counting
      chatSocketService.clearActiveChatOrderId();
    };
  }, [boutiqueId, passedOrderId, dispatch]);

  // Socket.IO — real-time chat connection for this order
  useEffect(() => {
    if (!passedOrderId) return;
    let socket = null;

    const connectSocket = async () => {
      try {
        let token = await AsyncStorage.getItem('userToken');
        if (!token) return;
        token = token.startsWith('Bearer ') ? token.replace('Bearer ', '') : token;

        socket = io(API_DOMAIN, {
          transports: ['websocket'],
          auth: { token, orderId: passedOrderId },
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 2000,
        });

        socket.on('connect', () => {
          console.log('[Socket] Connected to order room:', passedOrderId);
        });

        socket.on('CHAT_MESSAGE_SENT', (event) => {
          const msg = event?.payload;
          if (!msg) return;
          // Only append if it came from the BUSINESS (boutique) — our own sends are handled optimistically
          if (msg.sender_type === 'BUSINESS') {
            setMessages(prev => {
              // Avoid duplicates
              if (prev.some(m => m.id === msg.id)) return prev;
              return [msg, ...prev];
            });
            // Update lastVisited so badge stays 0 while chat is open
            AsyncStorage.getItem('chat_last_visited').then(lv => {
              const map = lv ? JSON.parse(lv) : {};
              map[String(boutiqueId)] = new Date().toISOString();
              AsyncStorage.setItem('chat_last_visited', JSON.stringify(map));
            }).catch(() => {});
          }
        });

        socket.on('disconnect', () => {
          console.log('[Socket] Disconnected from order room');
        });

        socket.on('connect_error', (err) => {
          console.warn('[Socket] Connection error:', err.message);
        });
      } catch (e) {
        console.warn('[Socket] Setup error:', e);
      }
    };

    connectSocket();

    return () => {
      if (socket) {
        socket.disconnect();
        socket = null;
      }
    };
  }, [passedOrderId, boutiqueId]);

  const [messages, setMessages] = useState([]);
  const [boutiqueName, setBoutiqueName] = useState(initBoutiqueName || 'Boutique Chat');
  const displayTitle = orderNumber ? `${boutiqueName} #${orderNumber}` : boutiqueName;
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [contextSelected, setContextSelected] = useState('');
  const [feedbackModalVisible, setFeedbackModalVisible] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [messageOptionsVisible, setMessageOptionsVisible] = useState(false);
  const [editingMessage, setEditingMessage] = useState(null);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [collageMakerVisible, setCollageMakerVisible] = useState(false);
  const [collageOutfitId, setCollageOutfitId] = useState(null); 

  const flatListRef = useRef(null);

  const boutiqueOrders = orders.filter(o => o.boutiqueId?.toString() === boutiqueId?.toString());
  
  useEffect(() => {
    if (!contextSelected) {
      if (passedOrderId) {
        const order = orders.find(o => o.id?.toString() === passedOrderId?.toString());
        if (order) {
          const outfits = order.outfits || order.items || [];
          if (outfits.length > 0) {
            setContextSelected(`${order.id}_${outfits[0].id || outfits[0].order_outfit_id}`);
          }
        }
      } else if (boutiqueOrders.length > 0) {
        const order = boutiqueOrders[0];
        const outfits = order.outfits || order.items || [];
        if (outfits.length > 0) {
          setContextSelected(`${order.id}_${outfits[0].id || outfits[0].order_outfit_id}`);
        }
      }
    }
  }, [boutiqueOrders, contextSelected, passedOrderId, orders]);

  useEffect(() => {
    fetchMessages();
  }, [user]);

  const fetchMessages = async () => {
    if (!user?.mobile) return;
    try {
      let token = await AsyncStorage.getItem('userToken');
      token = token ? (token.startsWith('Bearer ') ? token : `Bearer ${token}`) : '';
      let res;
      if (passedOrderId) {
        res = await axios.get(`${BASE_URL}customer-portal/orders/${passedOrderId}/requests`, {
          headers: { Authorization: token }
        });
      } else {
        res = await axios.get(`${BASE_URL}customer-portal/chat/${boutiqueId}/messages`, {
          params: { phone: user.mobile },
          headers: { Authorization: token }
        });
      }
      if (res.data && res.data.success !== false) {
        setMessages(Array.isArray(res.data.data) ? res.data.data : []);
      }
    } catch (err) {
      console.warn('Failed to fetch messages', err);
    } finally {
      setLoading(false);
    }
  };

  
  const uploadImageAndSend = async (uri, contextId, msgText = 'Uploaded Photos') => {
    if (!uri || !contextId) return;
    const [orderId, outfitId] = contextId.split('_');
    try {
      setSending(true);
      let token = await AsyncStorage.getItem('userToken');
      token = token ? (token.startsWith('Bearer ') ? token : `Bearer ${token}`) : '';
      
      const formData = new FormData();
      formData.append('file', {
        uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
        name: `chat_${Date.now()}.jpg`,
        type: 'image/jpeg'
      });

      const uploadRes = await axios.post(URL_UPLOAD, formData, {
        headers: { 
          Authorization: token,
          'Content-Type': 'multipart/form-data'
        }
      });
      
      const fileUrl = uploadRes.data?.data?.full_url || uploadRes.data?.data?.url || uploadRes.data?.file_url || uploadRes.data?.url;
      if (fileUrl) {
        await axios.post(`${BASE_URL}customer-portal/orders/${orderId}/outfits/${outfitId}/requests`, {
          message: msgText,
          attachment_url: fileUrl
        }, {
          headers: { Authorization: token }
        });
        fetchMessages();
      }
    } catch (e) {
      console.warn('Upload failed', e);
      Alert.alert('Error', 'Failed to upload photo.');
    } finally {
      setSending(false);
    }
  };

  const handleAttachment = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Take Photo', 'Choose from Library', 'Create Collage'],
          cancelButtonIndex: 0,
        },
        buttonIndex => {
          if (buttonIndex === 1) openCamera();
          else if (buttonIndex === 2) openLibrary();
          else if (buttonIndex === 3) {
            setCollageOutfitId(contextSelected);
            setCollageMakerVisible(true);
          }
        }
      );
    } else {
      setShowAttachMenu(true);
    }
  };

  const openCamera = () => {
    setShowAttachMenu(false);
    ImagePicker.launchCamera({ mediaType: 'photo', quality: 0.8 }, (res) => {
      if (res.assets && res.assets.length > 0) {
        uploadImageAndSend(res.assets[0].uri, contextSelected);
      }
    });
  };

  const openLibrary = () => {
    setShowAttachMenu(false);
    ImagePicker.launchImageLibrary({ mediaType: 'photo', quality: 0.8 }, (res) => {
      if (res.assets && res.assets.length > 0) {
        uploadImageAndSend(res.assets[0].uri, contextSelected);
      }
    });
  };

  const handleCollageComplete = (uri) => {
    setCollageMakerVisible(false);
    if (uri && collageOutfitId) {
      uploadImageAndSend(uri, collageOutfitId);
    }
  };

  
  const handleUpdateMessage = async () => {
    if (!inputText.trim() || !editingMessage) return;
    try {
      setSending(true);
      let token = await AsyncStorage.getItem('userToken');
      token = token ? (token.startsWith('Bearer ') ? token : `Bearer ${token}`) : '';
      await axios.put(`${BASE_URL}customer-portal/orders/${editingMessage.order_id}/requests/${editingMessage.id}`, {
        message: inputText.trim()
      }, {
        headers: { Authorization: token }
      });
      setInputText('');
      setEditingMessage(null);
      fetchMessages();
    } catch (err) {
      console.warn('Failed to update message', err);
    } finally {
      setSending(false);
    }
  };

  const handleDeleteMessage = async (msgId) => {
    try {
      setSending(true);
      let token = await AsyncStorage.getItem('userToken');
      token = token ? (token.startsWith('Bearer ') ? token : `Bearer ${token}`) : '';
      await axios.delete(`${BASE_URL}customer-portal/orders/${selectedMessage ? selectedMessage.order_id : passedOrderId}/requests/${msgId}`, {
        headers: { Authorization: token }
      });
      fetchMessages();
    } catch (err) {
      console.warn('Failed to delete message', err);
    } finally {
      setSending(false);
      setMessageOptionsVisible(false);
    }
  };

  const handleSend = async () => {
    if (editingMessage) {
      return handleUpdateMessage();
    }

    if (!inputText.trim() || !contextSelected) return;
    const [orderId, outfitId] = contextSelected.split('_');
    if (!orderId || !outfitId) return;

    try {
      setSending(true);
      let token = await AsyncStorage.getItem('userToken');
      token = token ? (token.startsWith('Bearer ') ? token : `Bearer ${token}`) : '';
      const res = await axios.post(`${BASE_URL}customer-portal/orders/${orderId}/outfits/${outfitId}/requests`, {
        message: inputText.trim()
      }, {
        headers: { Authorization: token }
      });
      setInputText('');
      fetchMessages();
    } catch (err) {
      console.warn('Failed to send message', err);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (isoStr) => {
    if (!isoStr) return '';
    const date = new Date(isoStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  
  
  const getFullImageUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http') || url.startsWith('file://')) return url;
    return `${API_DOMAIN}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  const renderMessageContent = (item, isCustomer) => {
    const msgText = item.message || '';
    
    // 1. Feedback Submitted
    if (msgText.startsWith("⭐ Feedback Submitted!")) {
      const lines = msgText.split("\n");
      const ratingsStr = lines[1] || "";
      const commentsStr = lines.slice(2).join("\n").replace("Comments: ", "").trim();

      const parseRating = (section) => {
        const match = section.match(/(\d+)★/);
        return match ? parseInt(match[1]) : 0;
      };

      const parts = ratingsStr.split("|").map(s => s.trim());
      const stitching = parts.find(p => p.startsWith("Stitching:")) ? parseRating(parts.find(p => p.startsWith("Stitching:"))) : 0;
      const staff = parts.find(p => p.startsWith("Staff:")) ? parseRating(parts.find(p => p.startsWith("Staff:"))) : 0;
      const overall = parts.find(p => p.startsWith("Overall:")) ? parseRating(parts.find(p => p.startsWith("Overall:"))) : 0;

      const StarRow = ({ label, count }) => (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 }}>
          <Text style={{ fontSize: 12, color: isCustomer ? '#E0E7FF' : '#475569' }}>{label}</Text>
          <View style={{ flexDirection: 'row' }}>
            {[1, 2, 3, 4, 5].map((s) => (
              <Text key={s} style={{ fontSize: 12, color: s <= count ? '#FACC15' : 'rgba(0,0,0,0.1)' }}>★</Text>
            ))}
          </View>
        </View>
      );

      return (
        <View style={[{ padding: 12, borderRadius: 12, marginTop: 4 }, isCustomer ? { backgroundColor: 'rgba(255,255,255,0.1)' } : { backgroundColor: '#ECFDF5', borderColor: '#D1FAE5', borderWidth: 1 }]}>
          <Text style={{ fontWeight: 'bold', marginBottom: 8, color: isCustomer ? '#FFF' : '#047857' }}>⭐ Feedback Received</Text>
          <StarRow label="Stitching Quality" count={stitching} />
          <StarRow label="Staff Behavior" count={staff} />
          <StarRow label="Overall Experience" count={overall} />
          {!!commentsStr && (
            <Text style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: isCustomer ? 'rgba(255,255,255,0.2)' : 'rgba(4,120,87,0.2)', fontSize: 13, fontStyle: 'italic', color: isCustomer ? '#E0E7FF' : '#065F46' }}>
              "{commentsStr}"
            </Text>
          )}
        </View>
      );
    }
    
    // 2. Category / Details
    if (msgText.startsWith("Category:")) {
      const lines = msgText.split("\n");
      const category = lines.find(l => l.startsWith("Category:"))?.replace("Category:", "").trim() || "";
      const description = lines.find(l => l.startsWith("Description:"))?.replace("Description:", "").trim() || "";
      const measurement = lines.find(l => l.startsWith("Measurement:"))?.replace("Measurement:", "").trim() || "";
      const delivery = lines.find(l => l.startsWith("Delivery Date:"))?.replace("Delivery Date:", "").trim() || lines.find(l => l.startsWith("Expected Date:"))?.replace("Expected Date:", "").trim() || "";
      
      return (
        <View style={[{ padding: 12, borderRadius: 12, marginTop: 4 }, isCustomer ? { backgroundColor: 'rgba(255,255,255,0.1)' } : { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0', borderWidth: 1 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: isCustomer ? 'rgba(255,255,255,0.2)' : '#E2E8F0' }}>
            <Shirt size={16} color={isCustomer ? '#FFF' : '#475569'} style={{ marginRight: 6 }} />
            <Text style={{ fontWeight: 'bold', color: isCustomer ? '#FFF' : '#334155' }}>Outfit Details</Text>
          </View>
          
          <View style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: isCustomer ? '#E0E7FF' : '#475569', width: 95 }}>Category:</Text>
              <Text style={{ fontSize: 14, color: isCustomer ? '#FFF' : '#0F172A', flex: 1, fontWeight: '500' }}>{category}</Text>
            </View>
            
            {description ? (
              <View style={{ flexDirection: 'column', gap: 4 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: isCustomer ? '#E0E7FF' : '#475569' }}>Description:</Text>
                <View style={{ backgroundColor: isCustomer ? 'rgba(0,0,0,0.1)' : '#FFF', padding: 10, borderRadius: 8, borderWidth: isCustomer ? 0 : 1, borderColor: '#E2E8F0' }}>
                  <Text style={{ fontSize: 13, color: isCustomer ? '#FFF' : '#0F172A', lineHeight: 18 }}>{description}</Text>
                </View>
              </View>
            ) : null}

            {measurement ? (
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginTop: 4 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: isCustomer ? '#E0E7FF' : '#475569', width: 95 }}>Measurement:</Text>
                <Text style={{ fontSize: 13, color: isCustomer ? '#FFF' : '#0F172A', flex: 1, lineHeight: 18 }}>{measurement}</Text>
              </View>
            ) : null}

            {delivery ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: isCustomer ? '#E0E7FF' : '#475569', width: 95 }}>Expected:</Text>
                <Text style={{ fontSize: 13, color: isCustomer ? '#FFF' : '#0F172A', flex: 1 }}>{delivery}</Text>
              </View>
            ) : null}
          </View>
        </View>
      );
    }

    // 3. PWA-style Photo Request Card
    if (!isCustomer && msgText && (msgText.includes("PHOTO_REQUEST") || msgText.toLowerCase().includes("photo requested"))) {
      const hasUploadedAfter = messages.some(m => 
        m.order_outfit_id === item.order_outfit_id && 
        m.sender_type === 'CUSTOMER' && 
        m.attachment_url && 
        new Date(m.created_at) > new Date(item.created_at)
      );

      if (hasUploadedAfter) {
        return (
          <View style={{ backgroundColor: '#ECFDF5', borderRadius: 12, marginTop: 4, borderWidth: 1, borderColor: '#D1FAE5', borderTopWidth: 4, borderTopColor: '#34D399', padding: 16, alignItems: 'center', width: 260 }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#D1FAE5', justifyContent: 'center', alignItems: 'center', marginBottom: 12 }}>
              <Check size={20} color="#059669" />
            </View>
            <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#064E3B', marginBottom: 8, textAlign: 'center' }}>Photos Sent</Text>
            <Text style={{ fontSize: 13, color: '#065F46', textAlign: 'center', lineHeight: 18 }}>
              You have uploaded the requested photos.
            </Text>
          </View>
        );
      }

      return (
        <View style={{ 
          backgroundColor: '#FFF7ED', 
          borderRadius: 12, 
          marginTop: 4, 
          borderWidth: 1, 
          borderColor: '#FFEDD5',
          borderTopWidth: 4,
          borderTopColor: '#F97316',
          padding: 16,
          alignItems: 'center',
          width: 260
        }}>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFEDD5', justifyContent: 'center', alignItems: 'center', marginBottom: 12 }}>
            <ImageIcon size={20} color="#EA580C" />
          </View>
          <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#9A3412', marginBottom: 8, textAlign: 'center' }}>📸 Photos Requested</Text>
          <Text style={{ fontSize: 13, color: '#C2410C', textAlign: 'center', marginBottom: 16, lineHeight: 18 }}>
            {boutiqueName} needs reference photos for this outfit. Please upload them so they can get started!
          </Text>
          <TouchableOpacity 
            style={{ backgroundColor: '#EA580C', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, width: '100%', flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}
            onPress={() => {
              if (item.order_id && item.outfit_id) {
                setContextSelected(item.order_id + '_' + item.outfit_id);
              }
              handleAttachment();
            }}
          >
            <ImageIcon size={16} color="#FFF" style={{ marginRight: 8 }} />
            <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 14 }}>Upload Reference Photos</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // 4. PWA-style Feedback Request Card (Action required)
    if (!isCustomer && msgText && ((msgText.includes("[ACTION_REQUIRED:") && !msgText.includes("PHOTO_REQUEST")) || msgText.toLowerCase().includes("action required") || msgText.toLowerCase().includes("feedback requested"))) {
      const hasReviewedAfter = messages.some(m => 
        m.order_outfit_id === item.order_outfit_id && 
        m.sender_type === 'CUSTOMER' && 
        m.message && m.message.includes("⭐ Feedback Submitted!") && 
        new Date(m.created_at) > new Date(item.created_at)
      );

      if (hasReviewedAfter) {
        return (
          <View style={{ backgroundColor: '#ECFDF5', borderRadius: 12, marginTop: 4, borderWidth: 1, borderColor: '#D1FAE5', borderTopWidth: 4, borderTopColor: '#34D399', padding: 16, alignItems: 'center', width: 260 }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#D1FAE5', justifyContent: 'center', alignItems: 'center', marginBottom: 12 }}>
              <Check size={20} color="#059669" />
            </View>
            <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#064E3B', marginBottom: 8, textAlign: 'center' }}>Feedback Sent</Text>
            <Text style={{ fontSize: 13, color: '#065F46', textAlign: 'center', lineHeight: 18 }}>
              Thank you for providing your feedback!
            </Text>
          </View>
        );
      }

      return (
        <View style={{ 
          backgroundColor: '#F5F3FF', 
          borderRadius: 12, 
          marginTop: 4, 
          borderWidth: 1, 
          borderColor: '#EDE9FE',
          borderTopWidth: 4,
          borderTopColor: '#7C3AED',
          padding: 16,
          alignItems: 'center',
          width: 260
        }}>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#EDE9FE', justifyContent: 'center', alignItems: 'center', marginBottom: 12 }}>
            <Star size={20} color="#7C3AED" />
          </View>
          <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#5B21B6', marginBottom: 8, textAlign: 'center' }}>⭐ Feedback Requested</Text>
          <Text style={{ fontSize: 13, color: '#6D28D9', textAlign: 'center', marginBottom: 16, lineHeight: 18 }}>
            We'd love to hear about your experience! Please leave your feedback.
          </Text>
          <TouchableOpacity 
            style={{ backgroundColor: '#7C3AED', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, width: '100%', flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}
            onPress={() => {
              if (item.order_id && item.outfit_id) {
                setContextSelected(item.order_id + '_' + item.outfit_id);
              }
              setFeedbackModalVisible(true);
            }}
          >
            <Star size={16} color="#FFF" style={{ marginRight: 8 }} />
            <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 14 }}>Leave Feedback</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // 5. Standard Message + Attachments
    const isPdf = item.attachment_url && (item.attachment_url.toLowerCase().includes('.pdf') || item.attachment_type === 'application/pdf' || msgText.includes('invoice/receipt'));
    
    return (
      <>
        {!!item.attachment_url && !isPdf && (
          <Image source={{ uri: getFullImageUrl(item.attachment_url) }} style={{ width: 200, height: 200, borderRadius: 8, marginBottom: 8 }} />
        )}
        {!!item.attachment_url && isPdf && (
          <TouchableOpacity 
            style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isCustomer ? 'rgba(255,255,255,0.2)' : '#EEF2FF', padding: 12, borderRadius: 8, marginBottom: 8, width: 220 }}
            onPress={() => Linking.openURL(getFullImageUrl(item.attachment_url)).catch(err => console.error("Couldn't load page", err))}
          >
            <View style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: isCustomer ? 'rgba(255,255,255,0.3)' : '#C7D2FE', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
              <FileText size={20} color={isCustomer ? '#FFF' : '#4F46E5'} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: isCustomer ? '#FFF' : '#1E293B', fontWeight: 'bold', fontSize: 14 }}>Invoice.pdf</Text>
              <Text style={{ color: isCustomer ? 'rgba(255,255,255,0.7)' : '#64748B', fontSize: 12, marginTop: 2 }}>Tap to view</Text>
            </View>
          </TouchableOpacity>
        )}
        {!!msgText && (
          <Text style={[styles.msgText, isCustomer ? styles.msgTextCustomer : styles.msgTextBusiness]}>
            {formatChatMessage(msgText)}
          </Text>
        )}
      </>
    );
  };

  const renderMessage = ({ item }) => {
    const isCustomer = item.sender_type === 'CUSTOMER';
    return (
      <View style={[styles.msgWrapper, isCustomer ? styles.msgWrapperRight : styles.msgWrapperLeft]}>
        {!isCustomer && (
          <View style={styles.avatar}>
            <Store size={14} color="#FFF" />
          </View>
        )}
        {isCustomer && (
          <TouchableOpacity 
             style={{ padding: 8, alignSelf: 'center', marginRight: 4 }} 
             onPress={() => { setSelectedMessage(item); setMessageOptionsVisible(true); }}
          >
             <MoreVertical size={16} color="#94A3B8" />
          </TouchableOpacity>
        )}
        <View style={[styles.bubble, isCustomer ? styles.bubbleCustomer : styles.bubbleBusiness, { position: 'relative' }]}>
          {item.order_number || item.outfit_name ? (
             <Text style={styles.contextTag}>
               {[item.order_number, item.outfit_name].filter(Boolean).join(' - ')}
             </Text>
          ) : null}
          {renderMessageContent(item, isCustomer)}
          <Text style={[styles.msgTime, isCustomer ? styles.msgTimeCustomer : styles.msgTimeBusiness]}>
            {formatTime(item.created_at)}
          </Text>
          
          {item.reaction_emoji ? (
            <View style={{
              position: 'absolute',
              bottom: -10,
              right: isCustomer ? undefined : -5,
              left: isCustomer ? -5 : undefined,
              backgroundColor: '#FFF',
              borderRadius: 12,
              padding: 2,
              paddingHorizontal: 4,
              borderWidth: 1,
              borderColor: '#E2E8F0',
              elevation: 2,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.1,
              shadowRadius: 2,
            }}>
              <Text style={{ fontSize: 12 }}>{item.reaction_emoji}</Text>
            </View>
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar backgroundColor="#5B43EE" barStyle="light-content" translucent={false} />
      <View style={[styles.header, { backgroundColor: '#5B43EE', borderBottomWidth: 0, paddingVertical: 12, paddingHorizontal: 16 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 12, paddingVertical: 8, paddingRight: 8 }}>
          <ChevronLeft size={24} color="#FFF" />
        </TouchableOpacity>
        
        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
          <ShoppingBag size={20} color="#FFF" />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontFamily: 'Inter-Bold', color: '#FFF', marginBottom: 2 }}>
            {orderNumber ? orderNumber : 'Boutique Chat'}
          </Text>
          <Text style={{ fontSize: 13, fontFamily: 'Inter-Medium', color: 'rgba(255,255,255,0.8)' }} numberOfLines={1}>
            {boutiqueName}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          
          {passedOrderId && (
            <TouchableOpacity 
              onPress={() => navigation.navigate('CustomerOrderDetail', { orderId: passedOrderId })}
              style={{ backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16 }}
            >
              <Text style={{ color: '#FFF', fontSize: 13, fontFamily: 'Inter-SemiBold' }}>View Order</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <KeyboardView
        style={{ flex: 1, backgroundColor: '#F8FAFC' }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 60 : 0}
      >
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : (
          <FlatList
            style={{ flex: 1 }}
            ref={flatListRef}
            data={[...messages].reverse()}
            inverted={true}
            keyExtractor={item => item.id?.toString() || Math.random().toString()}
            renderItem={renderMessage}
            contentContainerStyle={styles.listContent}
          />
        )}

        {editingMessage && (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#EEF2FF', borderTopWidth: 1, borderTopColor: '#E0E7FF' }}>
            <View>
              <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#4F46E5' }}>Editing message</Text>
              <Text style={{ fontSize: 12, color: '#64748B' }} numberOfLines={1}>{editingMessage.message}</Text>
            </View>
            <TouchableOpacity onPress={() => { setEditingMessage(null); setInputText(''); }}>
              <X size={20} color="#64748B" />
            </TouchableOpacity>
          </View>
        )}
        <View style={[styles.inputContainer, { 
          paddingBottom: Math.max(insets.bottom, 8) 
        }]}>
          <TouchableOpacity 
            style={{ padding: 8, marginRight: 4 }} 
            onPress={handleAttachment}
            disabled={!contextSelected || sending}
          >
            <Paperclip size={24} color={!contextSelected || sending ? "#CBD5E1" : "#94A3B8"} />
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor="#94A3B8"
            value={inputText}
            onChangeText={setInputText}
            multiline
          />
          <TouchableOpacity 
            style={[styles.sendBtn, (!inputText.trim() || !contextSelected) && { opacity: 0.5 }]} 
            onPress={handleSend}
            disabled={!inputText.trim() || !contextSelected || sending}
          >
            {sending ? <ActivityIndicator size="small" color="#FFF" /> : <Send size={20} color="#FFF" />}
          </TouchableOpacity>
        </View>
      </KeyboardView>

      {/* Android Attach Menu */}
      <Modal visible={showAttachMenu} transparent={true} animationType="fade" onRequestClose={() => setShowAttachMenu(false)}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }} activeOpacity={1} onPress={() => setShowAttachMenu(false)}>
          <TouchableWithoutFeedback>
            <View style={{ backgroundColor: '#FFF', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20 }}>
            <View style={{ width: 40, height: 4, backgroundColor: '#CBD5E1', borderRadius: 2, alignSelf: 'center', marginBottom: 20 }} />
            <Text style={{fontSize: 18, fontFamily: 'Inter-Bold', color: '#0F172A', marginBottom: 20}}>Attach Photo</Text>
            
            <TouchableOpacity style={{flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9'}} onPress={() => { setShowAttachMenu(false); setTimeout(openCamera, 300); }}>
              <Camera size={20} color="#475569" style={{ marginRight: 16 }} />
              <Text style={{fontSize: 16, fontFamily: 'Inter-Medium', color: '#0F172A'}}>Take Photo</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={{flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9'}} onPress={() => { setShowAttachMenu(false); setTimeout(openLibrary, 300); }}>
              <ImageIcon size={20} color="#475569" style={{ marginRight: 16 }} />
              <Text style={{fontSize: 16, fontFamily: 'Inter-Medium', color: '#0F172A'}}>Choose from Library</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={{flexDirection: 'row', alignItems: 'center', paddingVertical: 16}} onPress={() => {setShowAttachMenu(false); setCollageOutfitId(contextSelected); setCollageMakerVisible(true);}}>
              <Scissors size={20} color="#475569" style={{ marginRight: 16 }} />
              <Text style={{fontSize: 16, fontFamily: 'Inter-Medium', color: '#0F172A'}}>Create Collage</Text>
            </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>

      {/* Collage Maker */}
      <CollageMaker 
        visible={collageMakerVisible} 
        onClose={() => setCollageMakerVisible(false)} 
        onSaveReference={handleCollageComplete} 
      />

      {(() => {
        const [ctxOrderId, ctxOutfitId] = (contextSelected || '').split('_');
        return (
          <CustomerFeedbackModal 
            visible={feedbackModalVisible} 
            onClose={() => setFeedbackModalVisible(false)} 
            orderId={ctxOrderId || passedOrderId || (boutiqueOrders[0]?.id)}
            outfitId={ctxOutfitId}
            onSubmitSuccess={() => fetchMessages()}
          />
        );
      })()}

      <Modal visible={messageOptionsVisible} transparent animationType="fade" onRequestClose={() => setMessageOptionsVisible(false)}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }} activeOpacity={1} onPress={() => setMessageOptionsVisible(false)}>
          <TouchableWithoutFeedback>
            <View style={{ backgroundColor: '#FFF', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20 }}>
            <View style={{ width: 40, height: 4, backgroundColor: '#CBD5E1', borderRadius: 2, alignSelf: 'center', marginBottom: 20 }} />
            
            {selectedMessage && (
              <Text style={{ fontSize: 13, color: '#64748B', marginBottom: 20 }} numberOfLines={1}>
                "{selectedMessage.message}"
              </Text>
            )}

            <TouchableOpacity 
              style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14 }}
              onPress={() => {
                setEditingMessage(selectedMessage);
                setInputText(selectedMessage.message);
                setMessageOptionsVisible(false);
              }}
            >
              <Edit2 size={20} color="#475569" style={{ marginRight: 16 }} />
              <Text style={{ fontSize: 16, color: '#0F172A', fontWeight: '500' }}>Edit message</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14 }}
              onPress={() => {
                Alert.alert(
                  'Delete Message',
                  'Are you sure you want to delete this message?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Delete', style: 'destructive', onPress: () => handleDeleteMessage(selectedMessage.id) }
                  ]
                );
              }}
            >
              <Trash2 size={20} color="#EF4444" style={{ marginRight: 16 }} />
              <Text style={{ fontSize: 16, color: '#EF4444', fontWeight: '500' }}>Delete message</Text>
            </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

export default CustomerChatScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#5B43EE' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 8, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontFamily: 'Inter-Bold', color: '#0F172A' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 16, flexGrow: 1 },
  msgWrapper: { flexDirection: 'row', marginBottom: 16, alignItems: 'flex-end' },
  msgWrapperRight: { justifyContent: 'flex-end' },
  msgWrapperLeft: { justifyContent: 'flex-start' },
  avatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#6366F1', justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  bubble: { maxWidth: '75%', padding: 12, borderRadius: 16 },
  bubbleCustomer: { backgroundColor: '#5B43EE', borderBottomRightRadius: 4 },
  bubbleBusiness: { backgroundColor: '#FFF', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#E2E8F0' },
  msgText: { fontSize: 15, fontFamily: 'Inter-Regular', lineHeight: 22 },
  msgTextCustomer: { color: '#FFF' },
  msgTextBusiness: { color: '#0F172A' },
  contextTag: { fontSize: 10, fontFamily: 'Inter-Bold', opacity: 0.7, marginBottom: 4, color: '#FFF' },
  msgTime: { fontSize: 10, fontFamily: 'Inter-Medium', marginTop: 4, alignSelf: 'flex-end' },
  msgTimeCustomer: { color: '#E0E7FF' },
  msgTimeBusiness: { color: '#94A3B8' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  input: { flex: 1, backgroundColor: '#F1F5F9', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, fontFamily: 'Inter-Regular', maxHeight: 100, color: '#0F172A' },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#5B43EE', justifyContent: 'center', alignItems: 'center', marginLeft: 12 },
});
