import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Shadow } from '../constants/theme';
import { Store, ChevronLeft } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { BASE_URL } from '../config/env';

import AsyncStorage from '@react-native-async-storage/async-storage';

const CustomerChatListScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchThreads();
  }, [user]);

  const fetchThreads = async () => {
    if (!user?.mobile) {
      setLoading(false);
      return;
    }
    try {
      let token = await AsyncStorage.getItem('userToken');
      token = token ? (token.startsWith('Bearer ') ? token : `Bearer ${token}`) : '';
      
      // Fetch both active threads and all boutiques
      const [threadsRes, boutiquesRes] = await Promise.all([
        axios.get(`${BASE_URL}customer-portal/chat/threads`, { params: { phone: user.mobile }, headers: { Authorization: token } }).catch(() => null),
        axios.get(`${BASE_URL}customer-portal/boutiques`, { headers: { Authorization: token } }).catch(() => null)
      ]);

      let activeThreads = [];
      if (threadsRes?.data) {
        activeThreads = Array.isArray(threadsRes.data) ? threadsRes.data : (Array.isArray(threadsRes.data.data) ? threadsRes.data.data : []);
      }

      let allBoutiques = [];
      if (boutiquesRes?.data?.success) {
        allBoutiques = Array.isArray(boutiquesRes?.data?.data) ? boutiquesRes.data.data : [];
      }

      // Merge: if a boutique doesn't have an active thread, add it as an empty thread so the user can start a chat
      // Instead of grouping by boutique, we show all active threads (orders) directly.
      // And we append any boutique that has NO active thread so the user can start a new order/chat.
      const activeBoutiqueIds = new Set(activeThreads.map(t => t.boutique_id));
      
      const newBoutiqueThreads = allBoutiques
        .filter(b => !activeBoutiqueIds.has(b.id))
        .map(b => ({
          boutique_id: b.id,
          boutique_name: b.boutique_name || b.name,
          profile_icon_url: b.profile_icon_url || null,
          latest_message_text: 'Tap to start a conversation',
          latest_message_timestamp: null,
          order_id: null,
          order_number: ''
        }));
        
      setThreads([...activeThreads, ...newBoutiqueThreads]);
    } catch (err) {
      console.warn('Failed to fetch chat data', err);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (isoStr) => {
    if (!isoStr) return '';
    const date = new Date(isoStr);
    const today = new Date();
    if (date.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.chatItem}
      onPress={() => navigation.navigate('CustomerChat', { 
        boutiqueId: item.boutique_id, 
        boutiqueName: item.boutique_name,
        orderId: item.order_id,
        orderNumber: item.order_number
      })}
    >
      <View style={styles.avatar}>
        {item.profile_icon_url ? (
          <Image source={{ uri: item.profile_icon_url }} style={styles.avatarImg} />
        ) : (
          <Store size={24} color="#6366F1" />
        )}
      </View>
      <View style={styles.chatInfo}>
        <View style={styles.chatHeaderRow}>
          <Text style={styles.boutiqueName} numberOfLines={1}>
            {item.boutique_name} {item.order_number ? `#${item.order_number}` : ''}
          </Text>
          <Text style={styles.timeText}>{formatTime(item.latest_message_timestamp)}</Text>
        </View>
        <Text style={styles.lastMessage} numberOfLines={1}>
          {item.latest_message_text || (item.latest_message_attachment ? '📷 Image' : 'Started a conversation')}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Chats</Text>
      </View>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : threads.length === 0 ? (
        <View style={styles.center}>
          <Store size={48} color="#CBD5E1" style={{ marginBottom: 16 }} />
          <Text style={styles.emptyTitle}>No chats yet</Text>
          <Text style={styles.emptySubtitle}>When you interact with a boutique, your messages will appear here.</Text>
        </View>
      ) : (
        <FlatList
          data={threads}
          keyExtractor={item => item.boutique_id.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 20 }}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </SafeAreaView>
  );
};

export default CustomerChatListScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    padding: 16,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#0F172A',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#64748B',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#94A3B8',
    textAlign: 'center',
  },
  chatItem: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: Colors.white,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  chatInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  chatHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  boutiqueName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#0F172A',
    flex: 1,
  },
  timeText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#94A3B8',
    marginLeft: 8,
  },
  lastMessage: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
  },
  separator: {
    height: 1,
    backgroundColor: '#F1F5F9',
  },
});
