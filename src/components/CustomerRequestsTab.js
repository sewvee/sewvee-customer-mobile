import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { Camera, Send, MessageCircle, MessageSquare, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { Colors } from '../constants/theme';
import { launchImageLibrary } from 'react-native-image-picker';
import { useDispatch, useSelector } from 'react-redux';
import { uploadImageAction } from '../store/uploadSlice';
import { useToast } from '../context/ToastContext';
import { API_DOMAIN } from '../config/env';

export default function CustomerRequestsTab({ order, onUpdateStatus }) {
  const [activeOutfit, setActiveOutfit] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [fullScreenImage, setFullScreenImage] = useState(null);
  
  const dispatch = useDispatch();
  const { showToast } = useToast();
  const scrollViewRef = useRef();

  // Get auth token from Redux
  const authUser = useSelector(state => state.auth?.user);
  const getToken = () => {
    const token = authUser?.token || authUser?.data?.token || authUser?.accessToken || authUser?.data?.accessToken || authUser?.access_token || authUser?.data?.access_token || '';
    return token ? (token.startsWith('Bearer ') ? token : `Bearer ${token}`) : '';
  };

  const fetchRequests = async () => {
    try {
      if (!order?.id) return;
      const API_BASE = API_DOMAIN;
      
      const res = await fetch(`${API_BASE}/mobile/customer-portal/orders/${order.id}/requests`, {
        headers: { 'Authorization': getToken() },
      });
      const json = await res.json();
      if (json.success) {
        setRequests(json.data || []);
      }
    } catch (err) {
      console.log('fetchRequests err', err);
    }
  };

  useEffect(() => {
    fetchRequests();
    const interval = setInterval(fetchRequests, 10000);
    return () => clearInterval(interval);
  }, [order?.id]);

  const handleSend = async (attachmentUrl = null) => {
    if (!message.trim() && !attachmentUrl) return;
    
    setSending(true);
    try {
      const API_BASE = API_DOMAIN;
      const res = await fetch(`${API_BASE}/mobile/customer-portal/orders/${order.id}/outfits/${activeOutfit.id}/requests`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': getToken(),
        },
        body: JSON.stringify({
          message: message.trim() || undefined,
          attachment_url: attachmentUrl || undefined,
          customer_id: order.customer_id,
        })
      });
      const json = await res.json();
      console.log('handleSend response:', JSON.stringify(json));
      if (json.success) {
        setMessage('');
        fetchRequests();
        if (onUpdateStatus) onUpdateStatus();
      } else {
        showToast(json.message || json.error || 'Failed to send message', 'error');
      }
    } catch (err) {
      console.log('handleSend error:', err);
      showToast('Error sending message', 'error');
    }
    setSending(false);
  };


  const handleAttachImage = () => {
    launchImageLibrary({ mediaType: 'photo', quality: 0.8 }, async (response) => {
      if (response.didCancel || !response.assets?.length) return;
      
      setSending(true);
      try {
        const asset = response.assets[0];
        const uploadResult = await dispatch(uploadImageAction({
          uri: asset.uri,
          type: asset.type || 'image/jpeg',
          name: asset.fileName || `req_${Date.now()}.jpg`,
          key_name: 'order_photos',
        })).unwrap();

        const fileUrl = uploadResult?.file_url || uploadResult?.data?.file_url || uploadResult?.full_url || uploadResult?.data?.full_url || uploadResult?.url || uploadResult?.data?.url || '';
        if (fileUrl) {
          await handleSend(fileUrl);
        } else {
          showToast('Failed to upload image', 'error');
          setSending(false);
        }
      } catch (err) {
        showToast('Image upload failed', 'error');
        setSending(false);
      }
    });
  };

  const outfits = order?.outfits || [];
  
  if (!activeOutfit) {
    return (
      <View style={{ flex: 1, padding: 16, backgroundColor: '#F8FAFC' }}>
        <View style={{ marginBottom: 20, paddingHorizontal: 4 }}>
          <Text style={{ fontSize: 18, fontFamily: 'Inter-Bold', color: '#0F172A', marginBottom: 6 }}>
            Boutique Support Chat
          </Text>
          <Text style={{ fontSize: 14, fontFamily: 'Inter-Regular', color: '#64748B' }}>
            Select an outfit below to message the boutique or request changes.
          </Text>
        </View>

        {outfits.map((outfit, index) => (
          <TouchableOpacity
            key={outfit.id}
            style={[styles.outfitCard, { 
              backgroundColor: '#fff', 
              borderWidth: 1,
              borderColor: '#E2E8F0',
              borderRadius: 12,
              shadowColor: '#000',
              shadowOpacity: 0.05,
              shadowRadius: 5,
              shadowOffset: { width: 0, height: 2 },
              elevation: 2,
              paddingVertical: 16,
              paddingHorizontal: 16
            }]}
            onPress={() => {
              setActiveOutfit(outfit);
              fetch(`${API_DOMAIN}/mobile/customer-portal/orders/${order.id}/outfits/${outfit.id}/requests/read`, { method: 'POST', headers: { 'Authorization': getToken() } }).then(() => fetchRequests()).catch(e => console.log(e));
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontFamily: 'Inter-Bold', color: '#1E293B' }}>
                {outfit.name ? outfit.name.toUpperCase() : `OUTFIT ${index + 1}`}
              </Text>
              <Text style={{ fontSize: 13, fontFamily: 'Inter-Medium', color: '#64748B', marginTop: 6 }}>
                {outfit.orderType || 'Stitching'} • {outfit.urgency || 'NORMAL'}
              </Text>
            </View>
            {(() => {
              const unreadCount = requests.filter(r => Number(r.order_outfit_id) === Number(outfit.id) && r.sender_type === 'BOUTIQUE' && !r.is_read_by_customer).length;
              return unreadCount > 0 ? (
                <View style={{ backgroundColor: '#25D366', width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: '#fff', fontSize: 12, fontFamily: 'Inter-Bold' }}>{unreadCount}</Text>
                </View>
              ) : (
                <View style={{ backgroundColor: '#F1F5F9', padding: 8, borderRadius: 12 }}>
                  <MessageSquare size={18} color={'#94A3B8'} />
                </View>
              );
            })()}
          </TouchableOpacity>
        ))}
      </View>
    );
  }

  const outfitRequests = requests.filter(r => r.order_outfit_id === activeOutfit.id);

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#F8FAFC' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Header */}
      <View style={styles.chatHeader}>
        <TouchableOpacity onPress={() => setActiveOutfit(null)} style={{ padding: 8, marginRight: 8 }}>
          <ChevronLeft size={24} color="#1E293B" />
        </TouchableOpacity>
        <View>
          <Text style={{ fontSize: 15, fontFamily: 'Inter-Bold', color: '#1E293B' }}>
            {activeOutfit.name ? activeOutfit.name.toUpperCase() : 'OUTFIT'}
          </Text>
          <Text style={{ fontSize: 12, color: '#64748B' }}>Boutique Support</Text>
        </View>
      </View>

      {/* Messages */}
      <ScrollView 
        style={{ flex: 1, padding: 16 }}
        contentContainerStyle={{ paddingBottom: 32 }}
        ref={scrollViewRef}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        {outfitRequests.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconBg}>
              <MessageCircle size={28} color="#94A3B8" />
            </View>
            <Text style={{ fontSize: 14, fontFamily: 'Inter-Bold', color: '#64748B', marginTop: 12 }}>No messages yet</Text>
            <Text style={{ fontSize: 13, color: '#94A3B8', textAlign: 'center', marginTop: 4 }}>
              Send a message or photo to request changes to this outfit.
            </Text>
          </View>
        ) : (
          outfitRequests.map(req => {
            const isCustomer = req.sender_type === 'CUSTOMER';
            return (
              <View key={req.id} style={[styles.messageRow, isCustomer ? styles.msgRight : styles.msgLeft]}>
                <View style={[styles.bubble, isCustomer ? styles.bubbleCustomer : styles.bubbleBoutique]}>
                  {req.attachment_url ? (
                    <Image source={{ uri: req.attachment_url }} style={{ width: 200, height: 200, borderRadius: 8, marginBottom: req.message ? 8 : 0 }} />
                  ) : null}
                  {req.message ? (
                    <Text style={{ fontSize: 14, color: isCustomer ? '#FFF' : '#1E293B' }}>{req.message}</Text>
                  ) : null}
                  <Text style={{ fontSize: 10, color: isCustomer ? 'rgba(255,255,255,0.7)' : '#94A3B8', marginTop: 4, alignSelf: 'flex-end' }}>
                    {new Date(req.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Input */}
      <View style={styles.inputArea}>
        <TouchableOpacity style={styles.attachBtn} onPress={handleAttachImage} disabled={sending}>
          <Camera size={22} color="#64748B" />
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          placeholderTextColor="#94A3B8"
          value={message}
          onChangeText={setMessage}
          multiline
        />
        <TouchableOpacity 
          style={[styles.sendBtn, (!message.trim() || sending) && { opacity: 0.5 }]} 
          onPress={() => handleSend()}
          disabled={!message.trim() || sending}
        >
          {sending ? <ActivityIndicator size="small" color="#FFF" /> : <Send size={18} color="#FFF" />}
        </TouchableOpacity>
      </View>
      <Modal visible={!!fullScreenImage} transparent animationType="fade" onRequestClose={() => setFullScreenImage(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' }}>
          <TouchableOpacity style={{ position: 'absolute', top: 40, right: 20, zIndex: 10, padding: 10 }} onPress={() => setFullScreenImage(null)}>
            <Text style={{ color: '#FFF', fontSize: 18, fontWeight: 'bold' }}>Close</Text>
          </TouchableOpacity>
          {fullScreenImage && <Image source={{ uri: fullScreenImage }} style={{ width: '100%', height: '80%' }} resizeMode="contain" />}
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  outfitCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    marginTop: 40,
  },
  emptyIconBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  msgLeft: {
    justifyContent: 'flex-start',
  },
  msgRight: {
    justifyContent: 'flex-end',
  },
  bubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
  },
  bubbleCustomer: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleBoutique: {
    backgroundColor: '#FFF',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  inputArea: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  attachBtn: {
    padding: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    maxHeight: 100,
    marginHorizontal: 8,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
