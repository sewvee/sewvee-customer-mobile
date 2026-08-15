import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Keyboard
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Spacing, Shadow } from '../constants/theme';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Image } from 'react-native';
import { URL_CUSTOMER_PORTAL_ORDERS } from '../config/env';

const LoginScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { login, saveUser } = useAuth();
  const { showToast } = useToast();

  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [loading, setLoading] = useState(false);

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

    setLoading(true);
    let customerName = 'Guest Customer';
    let customerId = 'cust_guest_' + Date.now();
    try {
      // Fetch live orders to get the real customer name immediately
      const response = await fetch(`${URL_CUSTOMER_PORTAL_ORDERS}?phone=${phone}&limit=1`);
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

          <Text style={styles.title}>Sewvee Customer</Text>
          <Text style={styles.subtitle}>
            Enter your phone number to track orders, share designs, and shop
          </Text>
        </View>

        {/* FORM */}
        <View style={styles.form}>
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
                  Login
                </Text>
                <Ionicons name="arrow-forward" size={20} color="#fff" />
              </>
            )}
          </TouchableOpacity>
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
  inputGroup: {
    marginBottom: 30,
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
