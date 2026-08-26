import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Image, ScrollView, Dimensions, Keyboard, Animated } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { API_DOMAIN } from '../config/env';
// We'll use Lottie for the animation later if they have it, but for now we can mock it or use an ActivityIndicator

const { width, height } = Dimensions.get('window');
const WEB_PRIMARY = '#5B43EE';

export default function CustomerSignupScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const { login, saveUser } = useAuth();
  
  const [step, setStep] = useState(1); // 1: Info, 2: PIN
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  // Step 1
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  
  // Step 2
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const nextStep = () => {
    Keyboard.dismiss();
    setErrorMsg('');
    if (!name.trim()) return setErrorMsg('Please enter your First Name');
    if (phone.length !== 10) return setErrorMsg('Please enter a valid 10-digit mobile number');
    if (!email.includes('@')) return setErrorMsg('Please enter a valid email address');
    setStep(2);
  };

  const handleSignup = async () => {
    Keyboard.dismiss();
    setErrorMsg('');
    if (pin.length !== 4) return setErrorMsg('PIN must be exactly 4 digits');
    if (pin !== confirmPin) return setErrorMsg('PINs do not match');
    
    setLoading(true);
    try {
      const response = await fetch(`${API_DOMAIN}/mobile/customer-auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, mobile: phone, email, pin })
      });
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        setLoading(false);
        return setErrorMsg(data.message || 'Failed to create account');
      }

      setLoading(false);
      setShowSuccess(true);
      setTimeout(() => {
        showToast('Account created successfully!', 'success');
        saveUser(data.customer);
        login(data.accessToken, true);
      }, 2000);

    } catch (e) {
      setLoading(false);
      setErrorMsg('Failed to create account. Please check your network.');
    }
  };

  const [focusedField, setFocusedField] = useState(null);

  const renderPinBoxes = (value, setValue, fieldName) => (
    <View style={styles.pinBoxRow}>
      {[0, 1, 2, 3].map((i) => (
        <View key={i} style={[styles.pinBox, value.length > i && styles.pinBoxFilled, value.length === i && focusedField === fieldName && styles.pinBoxActive]}>
          <Text style={styles.pinBoxText}>{value.length > i ? '●' : ''}</Text>
        </View>
      ))}
      <TextInput
        style={styles.hiddenInput}
        keyboardType="number-pad"
        maxLength={4}
        value={value}
        onFocus={() => setFocusedField(fieldName)}
        onBlur={() => setFocusedField(null)}
        onChangeText={(val) => {
          setValue(val.replace(/[^0-9]/g, ''));
          setErrorMsg('');
        }}
      />
    </View>
  );

  const [pulseAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    if (showSuccess) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.2, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [showSuccess]);

  if (showSuccess) {
    return (
      <View style={[styles.root, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' }]}>
        <Animated.View style={{ transform: [{ scale: pulseAnim }], backgroundColor: '#D1FAE5', width: 120, height: 120, borderRadius: 60, justifyContent: 'center', alignItems: 'center', marginBottom: 20 }}>
          <View style={{ backgroundColor: '#10B981', width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center' }}>
            <Ionicons name="checkmark" size={50} color="#FFF" />
          </View>
        </Animated.View>
        <Text style={{ fontSize: 26, fontFamily: 'Inter-Bold', color: '#1E293B' }}>Welcome to Sewvee!</Text>
        <Text style={{ fontSize: 16, fontFamily: 'Inter-Medium', color: '#64748B', marginTop: 12 }}>Setting up your dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Image source={require('../assets/login_bg.png')} style={styles.bgImage} resizeMode="cover" />
      <View style={styles.bgOverlay} />

      <ScrollView style={styles.scroll} contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          
          <View style={styles.header}>
            <Image source={require('../assets/logo.png')} style={styles.logo} resizeMode="contain" />
            <Text style={styles.appName}>Sign Up</Text>
            <Text style={styles.subtitle}>{step === 1 ? 'Create your Sewvee Customer account' : 'Set up a secure PIN'}</Text>
          </View>

          {step === 1 ? (
            <View style={styles.formSection}>
              <Text style={styles.label}>FIRST NAME</Text>
              <View style={styles.inputRow}>
                <Ionicons name="person-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
                <TextInput style={styles.textInput} placeholder="Your name" placeholderTextColor="#94A3B8" value={name} onChangeText={(v) => {setName(v); setErrorMsg('');}} />
              </View>

              <Text style={styles.label}>MOBILE NUMBER</Text>
              <View style={styles.inputRow}>
                <Ionicons name="call-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
                <TextInput style={styles.textInput} placeholder="10-digit number" placeholderTextColor="#94A3B8" keyboardType="number-pad" maxLength={10} value={phone} onChangeText={(v) => {setPhone(v.replace(/[^0-9]/g, '')); setErrorMsg('');}} />
              </View>

              <Text style={styles.label}>EMAIL ADDRESS</Text>
              <View style={styles.inputRow}>
                <Ionicons name="mail-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
                <TextInput style={styles.textInput} placeholder="Your email" placeholderTextColor="#94A3B8" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={(v) => {setEmail(v); setErrorMsg('');}} />
              </View>

              {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

              <TouchableOpacity style={styles.btn} onPress={nextStep}>
                <Text style={styles.btnText}>Next Step</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.footerRow} onPress={() => navigation.navigate('Login')}>
                <Text style={styles.footerText}>Already have an account? </Text>
                <Text style={styles.footerLink}>Log in</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.formSection}>
              <Text style={styles.label}>4-DIGIT PIN</Text>
              <View style={styles.pinContainer}>{renderPinBoxes(pin, setPin, 'pin')}</View>

              <Text style={styles.label}>CONFIRM PIN</Text>
              <View style={styles.pinContainer}>{renderPinBoxes(confirmPin, setConfirmPin, 'confirmPin')}</View>

              {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

              <TouchableOpacity style={[styles.btn, loading && styles.btnDisabled]} onPress={handleSignup} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Let's get started</Text>}
              </TouchableOpacity>

              <TouchableOpacity style={{ alignItems: 'center', marginTop: 10 }} onPress={() => setStep(1)}>
                <Text style={styles.footerLink}>Back</Text>
              </TouchableOpacity>
            </View>
          )}

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
  card: { backgroundColor: '#fff', borderRadius: 24, padding: 32, width: '100%', maxWidth: 420, elevation: 12 },
  header: { alignItems: 'center', marginBottom: 28 },
  logo: { width: 140, height: 40, marginBottom: 16 },
  appName: { fontSize: 24, fontFamily: 'Inter-Bold', color: '#1E293B', marginBottom: 6 },
  subtitle: { fontSize: 14, color: '#64748B', fontFamily: 'Inter-Medium', textAlign: 'center' },
  formSection: { width: '100%' },
  label: { fontSize: 11, fontFamily: 'Inter-Bold', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', height: 52, paddingHorizontal: 16, marginBottom: 20 },
  inputIcon: { marginRight: 12 },
  textInput: { flex: 1, fontSize: 15, color: '#0F172A', fontFamily: 'Inter-Medium' },
  pinContainer: { marginBottom: 24, alignItems: 'center' },
  pinBoxRow: { flexDirection: 'row', gap: 12, position: 'relative' },
  pinBox: { width: 54, height: 54, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  pinBoxActive: { borderColor: WEB_PRIMARY, borderWidth: 2 },
  pinBoxFilled: { borderColor: '#E2E8F0', backgroundColor: '#F8FAFC' },
  pinBoxText: { fontSize: 16, color: '#1E293B', fontFamily: 'Inter-Bold' },
  hiddenInput: { position: 'absolute', width: '100%', height: '100%', opacity: 0, fontSize: 1 },
  errorText: { fontSize: 13, color: '#EF4444', fontFamily: 'Inter-Medium', textAlign: 'center', marginBottom: 16 },
  btn: { backgroundColor: WEB_PRIMARY, height: 52, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  btnDisabled: { opacity: 0.7 },
  btnText: { color: '#fff', fontSize: 15, fontFamily: 'Inter-SemiBold' },
  footerRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  footerText: { fontSize: 13, color: '#64748B', fontFamily: 'Inter-Medium' },
  footerLink: { fontSize: 13, color: WEB_PRIMARY, fontFamily: 'Inter-SemiBold' }
});
