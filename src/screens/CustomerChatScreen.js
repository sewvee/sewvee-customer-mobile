import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Send, Store, ShoppingBag } from 'lucide-react-native';
import { Colors } from '../constants/theme';
import { formatChatMessage } from '../utils/chatUtils';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import axios from 'axios';
import { BASE_URL, URL_UPLOAD } from '../config/env';
import CustomerFeedbackModal from '../components/CustomerFeedbackModal';
import CollageMaker from '../components/CollageMaker';
import * as ImagePicker from 'react-native-image-picker';
import { Camera, Paperclip, MoreVertical, Image as ImageIcon, Star, Edit2, Trash2, X, FileText } from 'lucide-react-native';
import { Modal, ActionSheetIOS, Alert, Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CustomerChatScreen = ({ route, navigation }) => {
  const { boutiqueId, boutiqueName: initBoutiqueName, orderId: passedOrderId, orderNumber } = route.params;
  const { user } = useAuth();
  const { orders } = useData();
  
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

  
  const renderMessageContent = (item, isCustomer) => {
    const msgText = item.message || '';
    
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
    
    if (msgText.startsWith("Category:")) {
      const lines = msgText.split("\n");
      const category = lines.find(l => l.startsWith("Category:"))?.replace("Category:", "").trim() || "";
      const description = lines.find(l => l.startsWith("Description:"))?.replace("Description:", "").trim() || "";
      const measurement = lines.find(l => l.startsWith("Measurement:"))?.replace("Measurement:", "").trim() || "";
      const delivery = lines.find(l => l.startsWith("Delivery Date:"))?.replace("Delivery Date:", "").trim() || lines.find(l => l.startsWith("Expected Date:"))?.replace("Expected Date:", "").trim() || "";
      
      return (
        <View style={[{ padding: 12, borderRadius: 12, marginTop: 4 }, isCustomer ? { backgroundColor: 'rgba(255,255,255,0.1)' } : { backgroundColor: '#EEF2FF', borderColor: '#E0E7FF', borderWidth: 1 }]}>
          {!!category && <Text style={{ fontWeight: 'bold', color: isCustomer ? '#FFF' : '#4F46E5', marginBottom: 4 }}>{category}</Text>}
          {!!description && <Text style={{ fontStyle: 'italic', color: isCustomer ? '#E0E7FF' : '#334155', marginBottom: 8 }}>"{description}"</Text>}
          <View style={{ borderTopWidth: 1, borderTopColor: isCustomer ? 'rgba(255,255,255,0.2)' : '#E0E7FF', paddingTop: 8 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={{ fontSize: 12, fontWeight: 'bold', color: isCustomer ? '#E0E7FF' : '#475569' }}>Measurements:</Text>
              <Text style={{ fontSize: 12, color: isCustomer ? '#E0E7FF' : '#475569', flex: 1, textAlign: 'right' }}>{measurement}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 12, fontWeight: 'bold', color: isCustomer ? '#E0E7FF' : '#475569' }}>Expected By:</Text>
              <Text style={{ fontSize: 12, color: isCustomer ? '#E0E7FF' : '#475569' }}>{delivery}</Text>
            </View>
          </View>
        </View>
      );
    }
    
    const isPdf = item.attachment_url && item.attachment_url.toLowerCase().endsWith('.pdf');
    return (
      <>
        {!!item.attachment_url && !isPdf && (
          <Image source={{ uri: item.attachment_url }} style={{ width: 200, height: 200, borderRadius: 8, marginBottom: 8 }} />
        )}
        {!!item.attachment_url && isPdf && (
          <TouchableOpacity 
            style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isCustomer ? 'rgba(255,255,255,0.2)' : '#EEF2FF', padding: 12, borderRadius: 8, marginBottom: 8 }}
            onPress={() => navigation.navigate('InvoicePreview', { previewMode: 'remote_pdf', pdfUrl: item.attachment_url })}
          >
            <FileText size={24} color={isCustomer ? '#FFF' : '#4F46E5'} style={{ marginRight: 8 }} />
            <Text style={{ color: isCustomer ? '#FFF' : '#4F46E5', fontWeight: 'bold' }}>View Invoice (PDF)</Text>
          </TouchableOpacity>
        )}
        {!!msgText && (
          <Text style={[styles.msgText, isCustomer ? styles.msgTextCustomer : styles.msgTextBusiness]}>
            {formatChatMessage(msgText)}
          </Text>
        )}
        {!isCustomer && msgText === "📷 Photo requested" && (
           <TouchableOpacity 
             style={{ backgroundColor: '#4F46E5', padding: 12, borderRadius: 8, marginTop: 8, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' }}
             onPress={() => {
               if (item.order_id && item.outfit_id) {
                 setContextSelected(item.order_id + '_' + item.outfit_id);
               }
               handleAttachment();
             }}
           >
             <Camera size={16} color="#FFF" style={{ marginRight: 6 }} />
             <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Upload Photo</Text>
           </TouchableOpacity>
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
        <View style={[styles.bubble, isCustomer ? styles.bubbleCustomer : styles.bubbleBusiness]}>
          <Text style={styles.contextTag}>{item.order_number} - {item.outfit_name}</Text>
          {renderMessageContent(item, isCustomer)}
          <Text style={[styles.msgTime, isCustomer ? styles.msgTimeCustomer : styles.msgTimeBusiness]}>
            {formatTime(item.created_at)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar backgroundColor="#5B43EE" barStyle="light-content" />
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

      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#F8FAFC' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={item => item.id?.toString() || Math.random().toString()}
            renderItem={renderMessage}
            contentContainerStyle={styles.listContent}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
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
        <View style={styles.inputContainer}>
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
      </KeyboardAvoidingView>
    
      {/* Android Attach Menu */}
      <Modal visible={showAttachMenu} transparent={true} animationType="fade" onRequestClose={() => setShowAttachMenu(false)}>
        <TouchableOpacity style={{flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center'}} onPress={() => setShowAttachMenu(false)}>
          <View style={{backgroundColor: '#FFF', borderRadius: 16, width: '80%', padding: 16}}>
            <Text style={{fontSize: 16, fontWeight: 'bold', marginBottom: 16}}>Attach File</Text>
            <TouchableOpacity style={{paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9'}} onPress={openCamera}><Text>Take Photo</Text></TouchableOpacity>
            <TouchableOpacity style={{paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9'}} onPress={openLibrary}><Text>Choose from Library</Text></TouchableOpacity>
            <TouchableOpacity style={{paddingVertical: 12}} onPress={() => {setShowAttachMenu(false); setCollageOutfitId(contextSelected); setCollageMakerVisible(true);}}><Text>Create Collage</Text></TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Collage Maker */}
      <Modal visible={collageMakerVisible} animationType="slide" onRequestClose={() => setCollageMakerVisible(false)}>
        <SafeAreaView style={{flex: 1, backgroundColor: '#000'}}>
          <View style={{flexDirection: 'row', justifyContent: 'space-between', padding: 16}}>
            <TouchableOpacity onPress={() => setCollageMakerVisible(false)}>
              <Text style={{color: '#FFF'}}>Cancel</Text>
            </TouchableOpacity>
          </View>
          <CollageMaker visible={collageMakerVisible} onClose={() => setCollageMakerVisible(false)} onSaveReference={handleCollageComplete} />
        </SafeAreaView>
      </Modal>

      <CustomerFeedbackModal 
        visible={feedbackModalVisible} 
        onClose={() => setFeedbackModalVisible(false)} 
        orderId={passedOrderId || (boutiqueOrders[0]?.id)}
        onSubmitSuccess={() => fetchMessages()}
      />

      <Modal visible={messageOptionsVisible} transparent animationType="fade" onRequestClose={() => setMessageOptionsVisible(false)}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }} activeOpacity={1} onPress={() => setMessageOptionsVisible(false)}>
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
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

export default CustomerChatScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#5B43EE' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 8, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontFamily: 'Inter-Bold', color: '#0F172A' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 16, flexGrow: 1, justifyContent: 'flex-end' },
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
  input: { flex: 1, backgroundColor: '#F1F5F9', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, fontFamily: 'Inter-Regular', maxHeight: 100 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#5B43EE', justifyContent: 'center', alignItems: 'center', marginLeft: 12 },
});
