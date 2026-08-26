import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Image, Keyboard, ScrollView } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { API_DOMAIN } from '../config/env';

const WEB_PRIMARY = '#5B43EE';

export default function CustomerResetPinScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  
  const email = route.params?.email || '';
  
  const [otp, setOtp] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleReset = async () => {
    Keyboard.dismiss();
    setErrorMsg('');
    if (otp.length < 4) return setErrorMsg('Please enter a valid OTP');
    if (newPin.length !== 4) return setErrorMsg('PIN must be exactly 4 digits');
    if (newPin !== confirmPin) return setErrorMsg('PINs do not match');
    
    setLoading(true);
    try {
      const response = await fetch(`${API_DOMAIN}/mobile/customer-auth/reset-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, newPin })
      });
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        setLoading(false);
        return setErrorMsg(data.message || 'Failed to reset PIN');
      }

      setLoading(false);
      showToast('PIN reset successfully! You can now login.', 'success');
      navigation.navigate('Login');
    } catch (e) {
      setLoading(false);
      setErrorMsg('Network error. Please try again.');
    }
  };

  const renderPinBoxes = (value, setValue, maxLength = 4) => (
    <View style={styles.pinBoxRow}>
      {Array.from({ length: maxLength }).map((_, i) => (
        <View key={i} style={[styles.pinBox, value.length > i && styles.pinBoxFilled, value.length === i && styles.pinBoxActive]}>
          <Text style={styles.pinBoxText}>{value.length > i ? (maxLength === 4 ? '●' : value[i]) : ''}</Text>
        </View>
      ))}
      <TextInput
        style={styles.hiddenInput}
        keyboardType="number-pad"
        maxLength={maxLength}
        value={value}
        onChangeText={(val) => {
          setValue(val.replace(/[^0-9]/g, ''));
          setErrorMsg('');
        }}
      />
    </View>
  );

  return (
    <View style={styles.root}>
      <Image source={require('../assets/login_bg.png')} style={styles.bgImage} resizeMode="cover" />
      <View style={styles.bgOverlay} />

      <ScrollView style={styles.scroll} contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#1E293B" />
          </TouchableOpacity>

          <View style={styles.header}>
            <Image source={require('../assets/logo.png')} style={styles.logo} resizeMode="contain" />
            <Text style={styles.appName}>Verify & Reset</Text>
            <Text style={styles.subtitle}>Enter the OTP sent to {email}</Text>
          </View>

          <View style={styles.formSection}>
            <Text style={styles.label}>ENTER OTP</Text>
            <View style={styles.pinContainer}>{renderPinBoxes(otp, setOtp, 6)}</View>

            <Text style={styles.label}>NEW 4-DIGIT PIN</Text>
            <View style={styles.pinContainer}>{renderPinBoxes(newPin, setNewPin, 4)}</View>

            <Text style={styles.label}>CONFIRM NEW PIN</Text>
            <View style={styles.pinContainer}>{renderPinBoxes(confirmPin, setConfirmPin, 4)}</View>

            {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

            <TouchableOpacity style={[styles.btn, loading && styles.btnDisabled]} onPress={handleReset} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Reset PIN</Text>}
            </TouchableOpacity>
          </View>

        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  bgImage: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' },
  bgOverlay: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.15)' },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  card: { backgroundColor: '#fff', borderRadius: 24, padding: 32, width: '100%', maxWidth: 420, elevation: 12, position: 'relative' },
  backBtn: { position: 'absolute', top: 24, left: 24, zIndex: 10, padding: 4 },
  header: { alignItems: 'center', marginBottom: 28 },
  logo: { width: 140, height: 40, marginBottom: 16 },
  appName: { fontSize: 24, fontFamily: 'Inter-Bold', color: '#1E293B', marginBottom: 6 },
  subtitle: { fontSize: 14, color: '#64748B', fontFamily: 'Inter-Medium', textAlign: 'center' },
  formSection: { width: '100%' },
  label: { fontSize: 11, fontFamily: 'Inter-Bold', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  pinContainer: { marginBottom: 24, alignItems: 'center' },
  pinBoxRow: { flexDirection: 'row', gap: 8, position: 'relative' },
  pinBox: { width: 45, height: 45, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  pinBoxActive: { borderColor: WEB_PRIMARY, borderWidth: 2 },
  pinBoxFilled: { borderColor: '#E2E8F0', backgroundColor: '#F8FAFC' },
  pinBoxText: { fontSize: 16, color: '#1E293B', fontFamily: 'Inter-Bold' },
  hiddenInput: { position: 'absolute', width: '100%', height: '100%', opacity: 0, fontSize: 1 },
  errorText: { fontSize: 13, color: '#EF4444', fontFamily: 'Inter-Medium', textAlign: 'center', marginBottom: 16 },
  btn: { backgroundColor: WEB_PRIMARY, height: 52, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  btnDisabled: { opacity: 0.7 },
  btnText: { color: '#fff', fontSize: 15, fontFamily: 'Inter-SemiBold' }
});
