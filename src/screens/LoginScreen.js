import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Keyboard,
  Platform,
  StatusBar,
  Image,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CountryPickerBottomSheet from '../components/CountryPickerBottomSheet';
import { COUNTRY_CODES } from '../constants/countryCodes';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { API_DOMAIN } from '../config/env';

const { width, height } = Dimensions.get('window');
const WEB_PRIMARY = '#5B43EE';

const LoginScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { login, saveUser } = useAuth();
  const { showToast } = useToast();

  const [phone, setPhone] = useState('');
    const [countryCode, setCountryCode] = useState('+91');
  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [isPinFocused, setIsPinFocused] = useState(false);
  const [showCountryPicker, setShowCountryPicker] = useState(false);

  const handleContinue = async () => {
    Keyboard.dismiss();
    setErrorMsg('');
    if (phone.length !== 10) return setErrorMsg('Please enter a valid 10-digit mobile number');
    if (pin.length !== 4) return setErrorMsg('Please enter a 4-digit PIN');

    setLoading(true);
    try {
      const response = await fetch(`${API_DOMAIN}/mobile/customer-auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: countryCode === '+91' ? phone : countryCode + phone, pin })
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        setLoading(false);
        setPin('');
        return setErrorMsg(data.message || 'Invalid credentials');
      }

      await saveUser(data.customer);
      await login(data.accessToken, true);
      showToast(`Welcome back, ${data.customer.name}!`, 'success');
    } catch (e) {
      console.log('Error handling login', e);
      setErrorMsg('Network error. Please try again.');
    }
    setLoading(false);
  };

  const renderPinBoxes = () => (
    <View style={styles.pinBoxRow}>
      {[0, 1, 2, 3].map((i) => (
        <View key={i} style={[styles.pinBox, pin.length > i && styles.pinBoxFilled, isPinFocused && pin.length === i && styles.pinBoxActive]}>
          <Text style={styles.pinBoxText}>{pin.length > i ? '●' : ''}</Text>
        </View>
      ))}
      <TextInput
        style={styles.hiddenInput}
        keyboardType="number-pad"
        maxLength={4}
        onFocus={() => setIsPinFocused(true)}
        onBlur={() => setIsPinFocused(false)}
        value={pin}
        onChangeText={(val) => {
          setPin(val.replace(/[^0-9]/g, ''));
          setErrorMsg('');
        }}
      />
    </View>
  );

  return (
    <View style={styles.root}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* Background */}
      <Image
        source={require('../assets/login_bg.png')}
        style={styles.bgImage}
        resizeMode="cover"
      />
      <View style={styles.bgOverlay} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          
          <View style={styles.header}>
            <Image
              source={require('../assets/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.appName}>Sewvee Customer</Text>
            <Text style={styles.subtitle}>Log in to access your boutique orders</Text>
          </View>

          {/* Form */}
          <View style={styles.formSection}>
            <Text style={styles.label}>MOBILE NUMBER</Text>
            <View style={[styles.inputRow, errorMsg.includes('number') && styles.inputRowError]}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TouchableOpacity 
                    style={{ flexDirection: 'row', alignItems: 'center', height: 50, paddingHorizontal: 10, minWidth: 85 }}
                    onPress={() => setShowCountryPicker(true)}
                >
                    <Text style={{ fontSize: 16, color: '#0F172A', marginRight: 4 }}>
                        {COUNTRY_CODES.find(c => c.code === countryCode)?.flag || '🌍'} {countryCode}
                    </Text>
                    <Text style={{ color: '#94A3B8', fontSize: 12 }}>▼</Text>
                </TouchableOpacity>
                <View style={{ width: 1, height: 24, backgroundColor: '#E2E8F0', marginRight: 10 }} />
              </View>
              <TextInput
                style={[styles.textInput, { flex: 1, paddingLeft: 0 }]}
                placeholder="Mobile number"
                placeholderTextColor="#94A3B8"
                keyboardType="number-pad"
                maxLength={15}
                value={phone}
                onChangeText={(val) => {
                  setPhone(val.replace(/[^0-9]/g, ''));
                  setErrorMsg('');
                }}
              />
            </View>

            <View style={styles.pinHeaderRow}>
              <Text style={styles.label}>4-DIGIT PIN</Text>
              <TouchableOpacity onPress={() => navigation.navigate('CustomerForgotPin')}>
                <Text style={styles.forgotText}>Forgot PIN?</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.pinContainer}>
              {renderPinBoxes()}
            </View>

            {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

            <TouchableOpacity
              style={[styles.btn, loading && styles.btnDisabled]}
              onPress={handleContinue}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="#fff" /> : (
                <View style={styles.btnContent}>
                  <Text style={styles.btnText}>Continue</Text>
                  <Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 6 }} />
                </View>
              )}
            </TouchableOpacity>

            <View style={styles.footerRow}>
              <Text style={styles.footerText}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => showToast('Enter your mobile and a new PIN above to sign up', 'info')}>
                <Text style={styles.footerLink}>Sign up now</Text>
              </TouchableOpacity>
            </View>
          </View>

        </View>
      </ScrollView>

      <CountryPickerBottomSheet
          visible={showCountryPicker}
          onClose={() => setShowCountryPicker(false)}
          onSelect={(code) => {
              setCountryCode(code);
              setShowCountryPicker(false);
          }}
      />
      </View>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  bgImage: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' },
  bgOverlay: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.15)' },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 32,
    width: '100%',
    maxWidth: 420,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 12,
  },
  header: { alignItems: 'center', marginBottom: 28 },
  logo: { width: 140, height: 40, marginBottom: 16 },
  appName: { fontSize: 24, fontFamily: 'Inter-Bold', color: '#1E293B', marginBottom: 6 },
  subtitle: { fontSize: 14, color: '#64748B', fontFamily: 'Inter-Medium', textAlign: 'center' },
  formSection: { width: '100%' },
  label: { fontSize: 11, fontFamily: 'Inter-Bold', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    height: 52,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  inputRowError: { borderColor: '#EF4444' },
  inputIcon: { marginRight: 12 },
  textInput: { flex: 1, fontSize: 15, color: '#0F172A', fontFamily: 'Inter-Medium' },
  pinHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  forgotText: { fontSize: 12, color: WEB_PRIMARY, fontFamily: 'Inter-SemiBold', marginBottom: 8 },
  pinContainer: { marginBottom: 24 },
  pinBoxRow: { flexDirection: 'row', gap: 12, position: 'relative' },
  pinBox: {
    width: 54,
    height: 54,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinBoxActive: { borderColor: WEB_PRIMARY, borderWidth: 2 },
  pinBoxFilled: { borderColor: '#E2E8F0' },
  pinBoxText: { fontSize: 16, color: '#1E293B', fontFamily: 'Inter-Bold' },
  hiddenInput: { position: 'absolute', width: '100%', height: '100%', opacity: 0, fontSize: 1 },
  errorText: { fontSize: 13, color: '#EF4444', fontFamily: 'Inter-Medium', textAlign: 'center', marginBottom: 16 },
  btn: {
    backgroundColor: WEB_PRIMARY,
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  btnDisabled: { opacity: 0.7 },
  btnContent: { flexDirection: 'row', alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 15, fontFamily: 'Inter-SemiBold' },
  footerRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  footerText: { fontSize: 13, color: '#64748B', fontFamily: 'Inter-Medium' },
  footerLink: { fontSize: 13, color: WEB_PRIMARY, fontFamily: 'Inter-SemiBold' }
});
