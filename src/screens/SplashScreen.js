// src/screens/SplashScreen.js

import React, { useEffect, useState } from 'react';
import {
  View,
  Image,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
} from 'react-native';
import { Colors, Spacing, Shadow } from '../constants/theme';
import { fetchSubscriptionCurrentAction } from '../store/subscriptionSlice';
import { useDispatch } from 'react-redux';
import { requestUserPermission } from '../utils/pushNotificationHelper';
import { APP_VERSION, URL_APP_VERSION } from '../config/env';
import axios from 'axios';

const SplashScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const [storeUrl, setStoreUrl] = useState('');

  useEffect(() => {
    let timer;

    const run = async () => {
      console.log('SplashScreen: Running initial checks...');
      await requestUserPermission();
      
      const isVersionCorrect = await checkAppVersion();
      if (!isVersionCorrect) {
        console.log('SplashScreen: Version mismatch, showing update modal.');
        return;
      }

      await fetchSubscriptionCurrent();
    };

    run();

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, []);

  const checkAppVersion = async () => {
    return true; // Bypassed permanently
  };

  const fetchSubscriptionCurrent = async () => {
    try {
      const response = await dispatch(fetchSubscriptionCurrentAction()).unwrap();

      if (response?.message == 'Company has no subscription') {
        navigation.replace('TrialActiveScreen');
        return;
      }

      if (response.data?.status === 'expired') {
        if (response.data?.planId === 1) {
          navigation.replace('TrialEndedScreen');
        } else if (response.data?.planId === null) {
          navigation.replace('TrialActiveScreen');
        }
        else {
          navigation.replace('TrialExpiredScreen');
        }
      } else {
        navigation.replace('Signup');
      }
    } catch (error) {
      console.log('SplashScreen: fetchSubscriptionCurrent error:', error);
      navigation.replace('Signup');
    }
  };



  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={Colors.primary} barStyle="light-content" />
      <Image
        source={require('../assets/splash_logo.png')}
        style={styles.logo}
        resizeMode="contain"
      />

      {/* Update Available Modal removed */}
    </View>
  );
};

export default SplashScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 220,
    height: 220,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  modalContent: {
    width: '100%',
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: Spacing.xl,
    alignItems: 'center',
    ...Shadow.large,
  },
  iconContainer: {
    width: 100,
    height: 100,
    backgroundColor: Colors.primary,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  modalLogo: {
    width: 60,
    height: 60,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: 22,
  },
  updateButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    ...Shadow.small,
  },
  updateButtonText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: '600',
  },
});
