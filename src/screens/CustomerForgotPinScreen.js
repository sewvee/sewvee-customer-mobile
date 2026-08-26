import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Image, Keyboard, ScrollView, Dimensions } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useToast } from '../context/ToastContext';
import { API_DOMAIN } from '../config/env';

const WEB_PRIMARY = '#5B43EE';

export default function CustomerForgotPinScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSendOtp = async () => {
    Keyboard.dismiss();
    setErrorMsg('');
    if (phone.length !== 10) return setErrorMsg('Please enter a valid 10-digit mobile number');
    if (!email.includes('@')) return setErrorMsg('Please enter a valid email address');
    
    setLoading(true);
    try {
      const response = await fetch(`${API_DOMAIN}/mobile/customer-auth/forgot-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        setLoading(false);
        return setErrorMsg(data.message || 'Failed to send verification email');
      }

      setLoading(false);
      showToast('OTP sent to your email!', 'success');
      navigation.navigate('CustomerResetPin', { email });
    } catch (e) {
      setLoading(false);
      setErrorMsg('Network error. Please try again.');
    }
  };

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
            <Text style={styles.appName}>Reset PIN</Text>
            <Text style={styles.subtitle}>Enter your details to receive an OTP</Text>
          </View>

          <View style={styles.formSection}>
            <Text style={styles.label}>MOBILE NUMBER</Text>
            <View style={styles.inputRow}>
              <Ionicons name="call-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
              <TextInput style={styles.textInput} placeholder="10-digit number" placeholderTextColor="#94A3B8" keyboardType="number-pad" maxLength={10} value={phone} onChangeText={(v) => {setPhone(v.replace(/[^0-9]/g, '')); setErrorMsg('');}} />
            </View>

            <Text style={styles.label}>EMAIL ADDRESS</Text>
            <View style={styles.inputRow}>
              <Ionicons name="mail-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
              <TextInput style={styles.textInput} placeholder="Your registered email" placeholderTextColor="#94A3B8" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={(v) => {setEmail(v); setErrorMsg('');}} />
            </View>

            {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

            <TouchableOpacity style={[styles.btn, loading && styles.btnDisabled]} onPress={handleSendOtp} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Send Verification Email</Text>}
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
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', height: 52, paddingHorizontal: 16, marginBottom: 20 },
  inputIcon: { marginRight: 12 },
  textInput: { flex: 1, fontSize: 15, color: '#0F172A', fontFamily: 'Inter-Medium' },
  errorText: { fontSize: 13, color: '#EF4444', fontFamily: 'Inter-Medium', textAlign: 'center', marginBottom: 16 },
  btn: { backgroundColor: WEB_PRIMARY, height: 52, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  btnDisabled: { opacity: 0.7 },
  btnText: { color: '#fff', fontSize: 15, fontFamily: 'Inter-SemiBold' }
});
