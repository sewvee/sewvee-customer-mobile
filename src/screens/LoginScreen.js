import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
  Keyboard
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Spacing, Shadow } from '../constants/theme';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useDispatch } from 'react-redux';
import { loginUser, saveFcmTokenAction,sendOtpAction } from '../store/authSlice';
import { useToast } from '../context/ToastContext';
import PinInput from '../components/PinInput';
import { getCompanyAction } from '../store/companyOnboardSlice';
import { sendWhatsAppOtp } from '../services/otpService';

const isPhoneNotVerifiedResponse = payload => {
  const candidateValues = [
    payload?.code,
    payload?.errorCode,
    payload?.error_code,
    payload?.error,
    payload?.message,
    payload?.data?.code,
    payload?.data?.errorCode,
    payload?.data?.error_code,
    payload?.data?.error,
    payload?.data?.message,
  ];

  return candidateValues.some(value =>
    String(value || '').toUpperCase().includes('PHONE_NOT_VERIFIED')
  );
};

const LoginScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { login, saveUser } = useAuth();
  const dispatch = useDispatch();
  const { showToast } = useToast();

  const [loginRole, setLoginRole] = useState('Customer'); // Default to Customer in the Customer App!
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');

  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);

  const redirectToOtpVerification = async mobileNo => {
    let verificationOtp = null;

    try {
      const otpResultAction = await dispatch(
        sendOtpAction({
          mobileNo,
          purpose: 'registration',
        }),
      );

      if (sendOtpAction.fulfilled.match(otpResultAction)) {
        verificationOtp =
          otpResultAction.payload?.otp ||
          otpResultAction.payload?.data?.otp ||
          null;

        // Send real-time WhatsApp OTP
        if (verificationOtp) {
          sendWhatsAppOtp(mobileNo, verificationOtp).catch(err => {
            console.error('[Login] Failed to send WhatsApp OTP:', err.message);
          });
        }
      }
    } catch (error) {
      // Intentionally continue to OTP screen without surfacing login error.
    }

    navigation.navigate('VerifyOtp', {
      mobileNo,
      otp: verificationOtp,
      type: 'register',
    });
  };

  const handleLogin = async () => {
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

    if (loginRole === 'Customer') {
      setLoading(true);
      let customerName = 'Guest Customer';
      let customerId = 'cust_guest_' + Date.now();
      try {
        const ordersJson = await AsyncStorage.getItem('sewvee_orders');
        if (ordersJson) {
          const orders = JSON.parse(ordersJson);
          const matchingOrder = orders.find(o => {
            const mobile = o.customerMobile || o.customer?.whatsappNumber || o.customer?.mobile_number || '';
            return mobile.replace(/[^0-9]/g, '').slice(-10) === phone.replace(/[^0-9]/g, '').slice(-10);
          });
          if (matchingOrder) {
            customerName = matchingOrder.customerName || matchingOrder.customer?.customerName || 'Customer';
            customerId = matchingOrder.customerId || matchingOrder.customer?.id || customerId;
          }
        }
      } catch (err) {
        console.log('Error reading orders for customer login', err);
      }

      setTimeout(async () => {
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
      }, 1000);
      return;
    }

    if (pin.length !== 4) {
      showToast('Enter 4 digit PIN', 'error');
      return;
    }

    setLoading(true);

    const payload = {
      mobileNo: phone,
      pin: pin
    };

    try {
      const resultAction = await dispatch(loginUser(payload));
      if (loginUser.fulfilled.match(resultAction)) {
        if (resultAction.payload && resultAction.payload.success === false) {
          if (isPhoneNotVerifiedResponse(resultAction.payload)) {
            await redirectToOtpVerification(phone);
            setLoading(false);
            return;
          }

          const errorMsg = resultAction.payload.message || 'Login failed';
          showToast(errorMsg, 'error');
          setLoading(false);
        } else {
          // Extract the token from the resultAction payload
          const userData = resultAction.payload;
          const userToken = userData?.token || userData?.data?.token || userData?.accessToken || userData?.data?.accessToken || userData?.access_token || userData?.data?.access_token || userData?.jwt || userData?.data?.jwt;
          const isOnboarded = userData?.is_onboarded === true;

          if (userToken) {
            await login(userToken, isOnboarded);
          } else {
            // Fallback for demo mode if no token is returned
            await login('demo', true);
          }

          // Fetch and save FCM token after login
          try {
            const fcmToken = await AsyncStorage.getItem('fcmToken');
            if (fcmToken) {
              await dispatch(saveFcmTokenAction({ fcm_token: fcmToken }));
            }
          } catch (fcmError) {
            console.error('Error saving FCM token after login:', fcmError);
          }

          const companyResult = await dispatch(getCompanyAction());
          if (getCompanyAction.fulfilled.match(companyResult)) {
            const companyData = companyResult.payload.data;
          
            if (companyData.subscriptionStatus === "active") {
              navigation.navigate('Main');
            } else if (companyData.subscriptionStatus === "in-active") {
              if (companyData.isTrialCompleted === true) {
                navigation.navigate('TrialEndedScreen');
              } else if (companyData.isTrialCompleted === false) {
                navigation.navigate('TrialActiveScreen');
              }
            } else if (companyData.subscriptionStatus === "expired") {
              navigation.navigate('TrialExpiredScreen');
            }
          }

          showToast(resultAction.payload?.message || 'Login successful', 'success');
        }
      } else {
        if (isPhoneNotVerifiedResponse(resultAction.payload)) {
          await redirectToOtpVerification(phone);
          setLoading(false);
          return;
        }

        const errorMsg = resultAction.payload?.message || resultAction.payload || 'Login failed';
        showToast(errorMsg, 'error');
        setLoading(false);
      }
    } catch (error) {
      console.error('Login Error:', error);
      showToast(error.message || 'Login failed', 'error');
      setLoading(false);
    }
  };

  return (

    <KeyboardAwareScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      enableOnAndroid={true}
      extraScrollHeight={20}
    >
 

        <View style={styles.header}>
          <View style={{ justifyContent: 'center', alignItems: 'center' }}>
            <Image
              source={require('../assets/lightBlue.png')}
              style={{ position: 'absolute' }}
              resizeMode="contain"
            />

            <Image
              source={require('../assets/logo.png')}
              style={{ height: 150, width: 185 }}
              resizeMode="contain"
            />
          </View>

          <Text style={styles.title}>{loginRole === 'Customer' ? 'Sewvee Customer' : 'Welcome Back'}</Text>
          <Text style={styles.subtitle}>
            {loginRole === 'Customer' 
              ? 'Enter your phone number to track orders, share designs, and shop' 
              : 'Enter your details to access your account'}
          </Text>
        </View>

        {/* FORM */}
        <View style={styles.form}>

          {/* ROLE SELECTOR */}
          <View style={styles.segmentContainer}>
            <TouchableOpacity 
              style={[styles.segmentButton, loginRole === 'Customer' && styles.segmentButtonActive]}
              onPress={() => { setLoginRole('Customer'); setPhoneError(''); }}
            >
              <Text style={[styles.segmentButtonText, loginRole === 'Customer' && styles.segmentButtonTextActive]}>
                Customer
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.segmentButton, loginRole === 'Boutique' && styles.segmentButtonActive]}
              onPress={() => { setLoginRole('Boutique'); setPhoneError(''); }}
            >
              <Text style={[styles.segmentButtonText, loginRole === 'Boutique' && styles.segmentButtonTextActive]}>
                Boutique Owner
              </Text>
            </TouchableOpacity>
          </View>

          {/* PHONE */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number<Text style={{ color: "red", fontSize: 16 }}> *</Text></Text>

            <View style={styles.inputWrapper}>
              <Ionicons
                name="call-outline"
                size={20}
                color={Colors.textSecondary}
              />

              <TextInput
                style={styles.input}
                placeholder="10 Digit Mobile Number"
                placeholderTextColor={Colors.textSecondary}
                keyboardType="number-pad"
                maxLength={10}
                value={phone}
                onChangeText={(val) => {
                  const cleaned = val.replace(/[^0-9]/g, '');
                  setPhone(cleaned);
                  const phoneRegex = /^[6-9][0-9]{9}$/;
                  if (cleaned.length > 0 && cleaned[0] < '6') {
                    setPhoneError('Please enter a valid mobile number');
                  } else if (cleaned.length === 10 && !phoneRegex.test(cleaned)) {
                    setPhoneError('Please enter a valid mobile number');
                  } else {
                    setPhoneError('');
                  }
                }}
              />
            </View>
            {phoneError ? (
              <Text style={styles.errorText}>{phoneError}</Text>
            ) : null}

          </View>


          {/* PIN */}
          {loginRole === 'Boutique' && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Enter 4-Digit PIN<Text style={{ color: "red", fontSize: 16 }}> *</Text></Text>
              <PinInput
                value={pin}
                onValueChange={setPin}
                length={4}
              />
            </View>
          )}

          {/* FORGOT */}
          {loginRole === 'Boutique' && (
            <TouchableOpacity
              style={styles.forgotPass}
              onPress={() => navigation.navigate('ForgotPin')}
            >
              <Text style={styles.forgotPassText}>Forgot PIN?</Text>
            </TouchableOpacity>
          )}

          {/* BUTTON */}
          <TouchableOpacity
            style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.loginBtnText}>
                  {loginRole === 'Customer' ? 'Login as Customer' : 'Login Account'}
                </Text>
                <Ionicons name="arrow-forward" size={20} color="#fff" />
              </>
            )}
          </TouchableOpacity>

          {/* FOOTER */}
          {loginRole === 'Boutique' && (
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                Don't have an account?{' '}
              </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('Signup')}
              >
                <Text style={styles.signupText}>Sign Up</Text>
              </TouchableOpacity>
            </View>
          )}


        </View>
    </KeyboardAwareScrollView>
  );

};

export default LoginScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    width: 80,
    height: 80,
    backgroundColor: Colors.primary,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    ...Shadow.medium,
  },
  logoText: {
    fontSize: 32,
    color: '#fff',
    fontWeight: 'bold',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 17,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  form: {
    width: '100%',
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
  },
  segmentButtonActive: {
    backgroundColor: '#FFFFFF',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
  },
  segmentButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  segmentButtonTextActive: {
    color: Colors.primary,
    fontFamily: 'Inter-SemiBold',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
    fontFamily: 'Inter-SemiBold',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 16,
    height: 56,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  input: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: Colors.textPrimary,
    fontFamily: 'Inter-Medium',
  },
  forgotPass: {
    alignSelf: 'flex-end',
    marginBottom: 30,
  },
  forgotPassText: {
    fontSize: 18,
    color: Colors.primary,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
  },
  loginBtn: {
    backgroundColor: Colors.primary,
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  loginBtnDisabled: {
    opacity: 0.7,
  },
  loginBtnText: {
    fontSize: 18,
    color: '#fff',
    fontFamily: 'Inter-SemiBold',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 30,
  },
  footerText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  signupText: {
    fontSize: 16,
    color: Colors.primary,
    fontFamily: 'Inter-SemiBold',
  },
  envContainer: {
    marginTop: 20,
    alignItems: 'center',
    opacity: 0.5,
  },
  envText: {
    fontSize: 10,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  errorText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: 'red',
    marginTop: "2%",
    marginLeft: 4,
  },

  scrollContent: {
    flexGrow: 1,
    padding: Spacing.xl,
    justifyContent: 'center',
  },
});
