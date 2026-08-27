import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Send, Store } from 'lucide-react-native';
import { Colors } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import axios from 'axios';
import { BASE_URL } from '../config/env';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CustomerChatScreen = ({ route, navigation }) => {
  const { boutiqueId, boutiqueName: initBoutiqueName } = route.params;
  const { user } = useAuth();
  const { orders } = useData();
  
  const [messages, setMessages] = useState([]);
  const [boutiqueName, setBoutiqueName] = useState(initBoutiqueName || 'Boutique Chat');
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [contextSelected, setContextSelected] = useState(''); 

  const flatListRef = useRef(null);

  const boutiqueOrders = orders.filter(o => o.boutiqueId?.toString() === boutiqueId?.toString());
  
  useEffect(() => {
    if (!contextSelected && boutiqueOrders.length > 0) {
      const order = boutiqueOrders[0];
      const outfits = order.outfits || order.items || [];
      if (outfits.length > 0) {
        setContextSelected(`${order.id}_${outfits[0].id || outfits[0].order_outfit_id}`);
      }
    }
  }, [boutiqueOrders, contextSelected]);

  useEffect(() => {
    fetchMessages();
  }, [user]);

  const fetchMessages = async () => {
    if (!user?.mobile) return;
    try {
      let token = await AsyncStorage.getItem('userToken');
      token = token ? (token.startsWith('Bearer ') ? token : `Bearer ${token}`) : '';
      const res = await axios.get(`${BASE_URL}customer-portal/chat/${boutiqueId}/messages`, {
        params: { phone: user.mobile },
        headers: { Authorization: token }
      });
      if (res.data && res.data.success !== false) {
        setMessages(Array.isArray(res.data.data) ? res.data.data : []);
      }
    } catch (err) {
      console.warn('Failed to fetch messages', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
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

  const renderMessage = ({ item }) => {
    const isCustomer = item.sender_type === 'CUSTOMER';
    return (
      <View style={[styles.msgWrapper, isCustomer ? styles.msgWrapperRight : styles.msgWrapperLeft]}>
        {!isCustomer && (
          <View style={styles.avatar}>
            <Store size={14} color="#FFF" />
          </View>
        )}
        <View style={[styles.bubble, isCustomer ? styles.bubbleCustomer : styles.bubbleBusiness]}>
          <Text style={styles.contextTag}>{item.order_number} - {item.outfit_name}</Text>
          <Text style={[styles.msgText, isCustomer ? styles.msgTextCustomer : styles.msgTextBusiness]}>
            {item.message}
          </Text>
          <Text style={[styles.msgTime, isCustomer ? styles.msgTimeCustomer : styles.msgTimeBusiness]}>
            {formatTime(item.created_at)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8 }}>
          <ChevronLeft size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{boutiqueName}</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : null}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={item => item.id.toString()}
            renderItem={renderMessage}
            contentContainerStyle={styles.listContent}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          />
        )}
        <View style={styles.inputContainer}>
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
    </SafeAreaView>
  );
};

export default CustomerChatScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
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
