const fs = require('fs');
const path = 'src/screens/LoginScreen.js';

const code = `import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Keyboard,
  ImageBackground,
  Platform,
  Animated,
  StatusBar
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../constants/theme';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { URL_CUSTOMER_PORTAL_ORDERS } from '../config/env';

// A premium boutique background image
const BG_IMAGE_URL = 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&q=80&w=1200';

const LoginScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { login, saveUser } = useAuth();
  const { showToast } = useToast();

  const [step, setStep] = useState('PHONE_INPUT'); // PHONE_INPUT, CREATE_PIN, CONFIRM_PIN, ENTER_PIN
  
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [storedPin, setStoredPin] = useState(null);
  const [pinError, setPinError] = useState('');
  
  const [loading, setLoading] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, [step]);

  const handlePhoneSubmit = async () => {
    Keyboard.dismiss();
    if (phone.length !== 10) {
      showToast('Enter valid 10 digit phone number', 'error');
      return;
    }
    const phoneRegex = /^[6-9][0-9]{9}$/;
    if (!phoneRegex.test(phone)) {
      showToast('Please provide a valid phone number', 'error');
      return;
    }

    setLoading(true);
    try {
      // Check if PIN exists for this phone
      const savedPin = await AsyncStorage.getItem(\`@sewvee_pin_\${phone}\`);
      if (savedPin) {
        setStoredPin(savedPin);
        setStep('ENTER_PIN');
      } else {
        setStep('CREATE_PIN');
      }
      fadeAnim.setValue(0);
    } catch (e) {
      console.log('Error reading PIN', e);
    }
    setLoading(false);
  };

  const handleLoginSuccess = async () => {
    setLoading(true);
    let customerName = 'Guest Customer';
    let customerId = 'cust_guest_' + Date.now();
    try {
      const response = await fetch(\`\${URL_CUSTOMER_PORTAL_ORDERS}?phone=\${phone}&limit=1\`);
      if (response.ok) {
        const json = await response.json();
        if (json.success && json.data && json.data.length > 0) {
          const firstOrder = json.data[0];
          customerName = firstOrder.customerName || 'Customer';
          customerId = firstOrder.customerId || customerId;
        }
      }
    } catch (err) {
      console.log('Error fetching live customer info for login', err);
    }

    const customerProfile = {
      id: customerId,
      name: customerName,
      mobile: phone,
      role: 'Customer',
      lastLogin: new Date().toISOString(),
    };
    await saveUser(customerProfile);
    await login('customer_demo_token', true);
    setLoading(false);
    showToast('Welcome back, ' + customerName + '!', 'success');
    navigation.navigate('Main');
  };

  const handlePinChange = async (val, currentStep) => {
    const cleaned = val.replace(/[^0-9]/g, '');
    if (currentStep === 'CREATE_PIN') {
      setPin(cleaned);
      if (cleaned.length === 4) {
        setTimeout(() => {
          setStep('CONFIRM_PIN');
          fadeAnim.setValue(0);
        }, 300);
      }
    } else if (currentStep === 'CONFIRM_PIN') {
      setConfirmPin(cleaned);
      setPinError('');
      if (cleaned.length === 4) {
        if (cleaned === pin) {
          // Success! Save PIN
          await AsyncStorage.setItem(\`@sewvee_pin_\${phone}\`, pin);
          handleLoginSuccess();
        } else {
          setPinError('PINs do not match. Try again.');
          setConfirmPin('');
          setStep('CREATE_PIN');
          setPin('');
          fadeAnim.setValue(0);
          showToast('PINs do not match', 'error');
        }
      }
    } else if (currentStep === 'ENTER_PIN') {
      setPin(cleaned);
      setPinError('');
      if (cleaned.length === 4) {
        if (cleaned === storedPin) {
          handleLoginSuccess();
        } else {
          setPinError('Incorrect PIN. Please try again.');
          setPin('');
        }
      }
    }
  };

  const renderPinDots = (value) => {
    return (
      <View style={styles.pinDotsContainer}>
        {[1, 2, 3, 4].map((item, index) => (
          <View key={index} style={[styles.pinDot, value.length > index && styles.pinDotFilled]} />
        ))}
      </View>
    );
  };

  return (
    <ImageBackground source={{ uri: BG_IMAGE_URL }} style={styles.container} blurRadius={Platform.OS === 'ios' ? 8 : 4}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      <View style={styles.overlay}>
        <KeyboardAwareScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          enableOnAndroid={true}
          extraScrollHeight={20}
        >
          <Animated.View style={[styles.glassCard, { opacity: fadeAnim }]}>
            
            <View style={styles.header}>
              <View style={styles.logoCircle}>
                <Text style={styles.logoText}>S</Text>
              </View>
              <Text style={styles.title}>Sewvee</Text>
              <Text style={styles.subtitle}>
                {step === 'PHONE_INPUT' && 'Enter your phone number to access your boutique orders and designs.'}
                {step === 'CREATE_PIN' && 'Create a 4-digit PIN for quick access.'}
                {step === 'CONFIRM_PIN' && 'Confirm your 4-digit PIN.'}
                {step === 'ENTER_PIN' && \`Welcome back! Enter your PIN for \${phone}\`}
              </Text>
            </View>

            {step === 'PHONE_INPUT' && (
              <View style={styles.form}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Phone Number</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="call-outline" size={20} color="#94A3B8" />
                    <TextInput
                      style={styles.input}
                      placeholder="10 Digit Mobile Number"
                      placeholderTextColor="#94A3B8"
                      keyboardType="number-pad"
                      maxLength={10}
                      value={phone}
                      onChangeText={(val) => {
                        const cleaned = val.replace(/[^0-9]/g, '');
                        setPhone(cleaned);
                        if (cleaned.length > 0 && cleaned[0] < '6') setPhoneError('Invalid mobile number');
                        else setPhoneError('');
                      }}
                    />
                  </View>
                  {phoneError ? <Text style={styles.errorText}>{phoneError}</Text> : null}
                </View>

                <TouchableOpacity style={[styles.loginBtn, loading && styles.loginBtnDisabled]} onPress={handlePhoneSubmit} disabled={loading}>
                  {loading ? <ActivityIndicator color="#fff" /> : (
                    <>
                      <Text style={styles.loginBtnText}>Continue</Text>
                      <Ionicons name="arrow-forward" size={20} color="#fff" />
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {(step === 'CREATE_PIN' || step === 'CONFIRM_PIN' || step === 'ENTER_PIN') && (
              <View style={styles.form}>
                <View style={styles.pinWrapper}>
                  {renderPinDots(step === 'CONFIRM_PIN' ? confirmPin : pin)}
                  <TextInput
                    style={styles.hiddenPinInput}
                    keyboardType="number-pad"
                    maxLength={4}
                    autoFocus={true}
                    value={step === 'CONFIRM_PIN' ? confirmPin : pin}
                    onChangeText={(val) => handlePinChange(val, step)}
                  />
                </View>

                {pinError ? <Text style={[styles.errorText, {textAlign: 'center', marginBottom: 20}]}>{pinError}</Text> : null}

                {loading && <ActivityIndicator color="#6366F1" size="large" style={{ marginTop: 20 }} />}
                
                <TouchableOpacity style={styles.linkBtn} onPress={() => { setStep('PHONE_INPUT'); setPin(''); setConfirmPin(''); }}>
                  <Text style={styles.linkText}>Change Phone Number</Text>
                </TouchableOpacity>

                {step === 'ENTER_PIN' && (
                  <TouchableOpacity style={styles.linkBtn} onPress={() => {
                    // Reset PIN flow via OTP could go here. For now just reset it.
                    showToast('PIN reset flow would trigger here. We will integrate Google Email reset soon!', 'info');
                  }}>
                    <Text style={styles.linkText}>Forgot PIN?</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

          </Animated.View>
        </KeyboardAwareScrollView>
      </View>
    </ImageBackground>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)', // Darker overlay to make glass pop
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  glassCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderRadius: 24,
    padding: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  logoText: {
    color: '#FFF',
    fontSize: 32,
    fontFamily: 'Inter-Bold',
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#1E293B',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    fontFamily: 'Inter-Medium',
    lineHeight: 20,
  },
  form: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#334155',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 60,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  input: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#1E293B',
    fontFamily: 'Inter-SemiBold',
  },
  loginBtn: {
    backgroundColor: Colors.primary,
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  loginBtnDisabled: {
    opacity: 0.7,
  },
  loginBtnText: {
    fontSize: 16,
    color: '#fff',
    fontFamily: 'Inter-Bold',
    marginRight: 8,
  },
  errorText: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: '#EF4444',
    marginTop: 6,
    marginLeft: 4,
  },
  pinWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
    position: 'relative',
  },
  pinDotsContainer: {
    flexDirection: 'row',
    gap: 20,
  },
  pinDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    backgroundColor: 'transparent',
  },
  pinDotFilled: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  hiddenPinInput: {
    position: 'absolute',
    opacity: 0,
    width: '100%',
    height: '100%',
  },
  linkBtn: {
    alignItems: 'center',
    marginTop: 16,
  },
  linkText: {
    color: Colors.primary,
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
  }
});
`;

fs.writeFileSync(path, code);
