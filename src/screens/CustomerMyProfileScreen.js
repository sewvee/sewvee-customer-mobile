import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Modal, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, User, Phone, Mail, Lock, Pencil, X, Eye, EyeOff } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { API_DOMAIN } from '../config/env';

const PRIMARY = '#5B43EE';
const DANGER = '#EF4444';

const CustomerMyProfileScreen = () => {
  const { user, userToken, saveUser } = useAuth();
  const navigation = useNavigation();


  useEffect(() => {
    async function syncProfile() {
      try {
        const res = await fetch(`${API_DOMAIN}/mobile/customer-auth/profile`, {
          headers: { Authorization: `Bearer ${userToken}` }
        });
        const data = await res.json();
        if (data?.success && data?.customer) {
          saveUser({ ...user, ...data.customer });
        }
      } catch (err) {}
    }
    syncProfile();
  }, []);

  // ── Edit Name/Email modal ──
  const [editModal, setEditModal] = useState(false);
  const [editField, setEditField] = useState('name');
  const [editValue, setEditValue] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  const openEdit = (field) => {
    setEditField(field);
    setEditValue(field === 'name' ? (user?.name || '') : (user?.email || ''));
    setEditError('');
    setEditModal(true);
  };

  const saveEdit = async () => {
    if (!editValue.trim()) { setEditError('This field cannot be empty'); return; }
    if (editField === 'email' && !editValue.includes('@')) { setEditError('Enter a valid email'); return; }
    setEditLoading(true);
    setEditError('');
    try {
      const res = await fetch(`${API_DOMAIN}/mobile/customer-auth/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userToken}` },
        body: JSON.stringify({ [editField]: editValue.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) { setEditError(data.message || 'Failed to update'); return; }
      await saveUser({ ...user, ...data.customer });
      setEditModal(false);
    } catch {
      setEditError('Network error. Please try again.');
    } finally {
      setEditLoading(false);
    }
  };

  // ── Change PIN modal ──
  const [pinModal, setPinModal] = useState(false);
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pinLoading, setPinLoading] = useState(false);
  const [pinError, setPinError] = useState('');

  const openPinModal = () => {
    setCurrentPin(''); setNewPin(''); setConfirmPin('');
    setPinError(''); setPinModal(true);
  };

  const savePin = async () => {
    if (currentPin.length < 4) { setPinError('Enter your current 4-digit PIN'); return; }
    if (newPin.length < 4) { setPinError('New PIN must be 4 digits'); return; }
    if (newPin !== confirmPin) { setPinError('New PINs do not match'); return; }
    setPinLoading(true);
    setPinError('');
    try {
      const res = await fetch(`${API_DOMAIN}/mobile/customer-auth/change-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: user?.mobile, currentPin, newPin }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) { setPinError(data.message || 'Failed to change PIN'); return; }
      setPinModal(false);
      Alert.alert('Success', 'Your PIN has been changed successfully!');
    } catch {
      setPinError('Network error. Please try again.');
    } finally {
      setPinLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={22} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Profile Info Card */}
        <View style={styles.infoCard}>

          {/* Name */}
          <TouchableOpacity style={styles.infoRow} onPress={() => openEdit('name')}>
            <View style={styles.infoIconBox}>
              <User size={16} color={PRIMARY} />
            </View>
            <View style={styles.infoTextGroup}>
              <Text style={styles.infoLabel}>Full Name</Text>
              <Text style={styles.infoValue}>{user?.name || '—'}</Text>
            </View>
            <Pencil size={14} color="#CBD5E1" />
          </TouchableOpacity>

          <View style={styles.rowSep} />

          {/* Phone */}
          <View style={styles.infoRow}>
            <View style={styles.infoIconBox}>
              <Phone size={16} color={PRIMARY} />
            </View>
            <View style={styles.infoTextGroup}>
              <Text style={styles.infoLabel}>Mobile Number</Text>
              <Text style={styles.infoValue}>{user?.mobile || '—'}</Text>
            </View>
            {/* Not editable — it's your login identifier */}
          </View>

          <View style={styles.rowSep} />

          {/* Email */}
          <TouchableOpacity style={styles.infoRow} onPress={() => openEdit('email')}>
            <View style={styles.infoIconBox}>
              <Mail size={16} color={PRIMARY} />
            </View>
            <View style={styles.infoTextGroup}>
              <Text style={styles.infoLabel}>Email Address</Text>
              <Text style={styles.infoValue}>{user?.email || 'Not set'}</Text>
            </View>
            <Pencil size={14} color="#CBD5E1" />
          </TouchableOpacity>

          <View style={styles.rowSep} />

          {/* PIN */}
          <TouchableOpacity style={styles.infoRow} onPress={openPinModal}>
            <View style={styles.infoIconBox}>
              <Lock size={16} color={PRIMARY} />
            </View>
            <View style={styles.infoTextGroup}>
              <Text style={styles.infoLabel}>PIN</Text>
              <Text style={styles.infoValue}>••••</Text>
            </View>
            <Text style={styles.changeText}>Change</Text>
          </TouchableOpacity>

        </View>
      </ScrollView>

      {/* ── Edit Name/Email Modal ── */}
      <Modal visible={editModal} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editField === 'name' ? 'Edit Name' : 'Edit Email'}
              </Text>
              <TouchableOpacity onPress={() => setEditModal(false)}>
                <X size={20} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>
              {editField === 'name' ? 'Full Name' : 'Email Address'}
            </Text>
            <TextInput
              style={styles.inputBox}
              value={editValue}
              onChangeText={setEditValue}
              autoFocus
              keyboardType={editField === 'email' ? 'email-address' : 'default'}
              autoCapitalize={editField === 'email' ? 'none' : 'words'}
              placeholder={editField === 'name' ? 'Your name' : 'your@email.com'}
              placeholderTextColor="#94A3B8"
            />
            {editError ? <Text style={styles.errorText}>{editError}</Text> : null}

            <TouchableOpacity style={styles.saveBtn} onPress={saveEdit} disabled={editLoading}>
              {editLoading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.saveBtnText}>Save Changes</Text>
              }
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Change PIN Modal ── */}
      <Modal visible={pinModal} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change PIN</Text>
              <TouchableOpacity onPress={() => setPinModal(false)}>
                <X size={20} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Current PIN</Text>
            <View style={styles.pinRow}>
              <TextInput
                style={[styles.inputBox, { flex: 1, marginBottom: 0 }]}
                value={currentPin}
                onChangeText={setCurrentPin}
                keyboardType="number-pad"
                maxLength={4}
                secureTextEntry={!showCurrent}
                placeholder="••••"
                placeholderTextColor="#94A3B8"
              />
              <TouchableOpacity onPress={() => setShowCurrent(!showCurrent)} style={styles.eyeBtn}>
                {showCurrent ? <EyeOff size={18} color="#94A3B8" /> : <Eye size={18} color="#94A3B8" />}
              </TouchableOpacity>
            </View>

            <Text style={[styles.inputLabel, { marginTop: 16 }]}>New PIN</Text>
            <View style={styles.pinRow}>
              <TextInput
                style={[styles.inputBox, { flex: 1, marginBottom: 0 }]}
                value={newPin}
                onChangeText={setNewPin}
                keyboardType="number-pad"
                maxLength={4}
                secureTextEntry={!showNew}
                placeholder="••••"
                placeholderTextColor="#94A3B8"
              />
              <TouchableOpacity onPress={() => setShowNew(!showNew)} style={styles.eyeBtn}>
                {showNew ? <EyeOff size={18} color="#94A3B8" /> : <Eye size={18} color="#94A3B8" />}
              </TouchableOpacity>
            </View>

            <Text style={[styles.inputLabel, { marginTop: 16 }]}>Confirm New PIN</Text>
            <View style={styles.pinRow}>
              <TextInput
                style={[styles.inputBox, { flex: 1, marginBottom: 0 }]}
                value={confirmPin}
                onChangeText={setConfirmPin}
                keyboardType="number-pad"
                maxLength={4}
                secureTextEntry={!showConfirm}
                placeholder="••••"
                placeholderTextColor="#94A3B8"
              />
              <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)} style={styles.eyeBtn}>
                {showConfirm ? <EyeOff size={18} color="#94A3B8" /> : <Eye size={18} color="#94A3B8" />}
              </TouchableOpacity>
            </View>

            {pinError ? <Text style={styles.errorText}>{pinError}</Text> : null}

            <TouchableOpacity style={styles.saveBtn} onPress={savePin} disabled={pinLoading}>
              {pinLoading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.saveBtnText}>Change PIN</Text>
              }
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

export default CustomerMyProfileScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontFamily: 'Inter-Bold', color: '#0F172A' },

  scrollContent: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 40 },

  infoCard: {
    backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1,
    borderColor: '#E2E8F0', overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 16, paddingHorizontal: 16,
  },
  infoIconBox: {
    width: 34, height: 34, borderRadius: 9, backgroundColor: '#EEF2FF',
    justifyContent: 'center', alignItems: 'center', marginRight: 14,
  },
  infoTextGroup: { flex: 1 },
  infoLabel: {
    fontSize: 10, fontFamily: 'Inter-SemiBold', color: '#94A3B8',
    textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 3,
  },
  infoValue: { fontSize: 15, fontFamily: 'Inter-SemiBold', color: '#0F172A' },
  rowSep: { height: 1, backgroundColor: '#F1F5F9', marginHorizontal: 16 },
  changeText: { fontSize: 12, fontFamily: 'Inter-SemiBold', color: PRIMARY },

  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 24, paddingBottom: 36,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 20,
  },
  modalTitle: { fontSize: 16, fontFamily: 'Inter-Bold', color: '#0F172A' },
  inputLabel: {
    fontSize: 11, fontFamily: 'Inter-SemiBold', color: '#64748B',
    textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8,
  },
  inputBox: {
    borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10,
    height: 48, paddingHorizontal: 14, fontSize: 15, color: '#0F172A',
    fontFamily: 'Inter-Medium', marginBottom: 16,
  },
  pinRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eyeBtn: { padding: 10 },
  errorText: {
    fontSize: 12, color: '#EF4444', fontFamily: 'Inter-Medium',
    marginBottom: 12, marginTop: 8,
  },
  saveBtn: {
    backgroundColor: PRIMARY, height: 48, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center', marginTop: 8,
  },
  saveBtnText: { color: '#fff', fontSize: 15, fontFamily: 'Inter-SemiBold' },
});
