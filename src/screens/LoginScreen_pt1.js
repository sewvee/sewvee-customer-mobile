import React, { useState, useRef, useEffect } from 'react';
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
  
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [emailOtp, setEmailOtp] = useState('');
  
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
      const savedPin = await AsyncStorage.getItem(`@sewvee_pin_${phone}`);
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

  
  const handleEmailSubmit = async () => {
    Keyboard.dismiss();
    const emailRegex = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;
    if (!emailRegex.test(email)) {
      setEmailError('Please enter a valid email address');
      return;
    }
    
    setLoading(true);
    // TODO: Call your backend API here to send the OTP to the email
    // await api.post('/send-email-otp', { email, phone });
    
    setTimeout(() => {
      setLoading(false);
      showToast('Verification code sent to your email!', 'success');
      setStep('EMAIL_OTP');
      fadeAnim.setValue(0);
    }, 1500);
  };


  const handleLoginSuccess = async () => {
    setLoading(true);
    let customerName = 'Guest Customer';
    let customerId = 'cust_guest_' + Date.now();
    try {
      const response = await fetch(`${URL_CUSTOMER_PORTAL_ORDERS}?phone=${phone}&limit=1`);
      if (response.ok) {
        const json = await response.json();
        if (json.success && json.data && json.data.length > 0) {
          const firstOrder = json.data[0];
          customerName = firstOrder.customerName || 'Customer';
          customerId = firstOrder.customerId || customerId;
        }
