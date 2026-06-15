// src/screens/SplashScreen.js

import React, { useEffect, useState } from 'react';
import {
  View,
  Image,
  StyleSheet,
  StatusBar,
  Modal,
  Text,
  TouchableOpacity,
  Linking,
  AppState,
} from 'react-native';
import { Colors, Spacing, Shadow } from '../constants/theme';
import { fetchSubscriptionCurrentAction } from '../store/subscriptionSlice';
import { useDispatch } from 'react-redux';
import { requestUserPermission } from '../utils/pushNotificationHelper';
import { APP_VERSION, URL_APP_VERSION } from '../config/env';
import axios from 'axios';

const SplashScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const [updateModalVisible, setUpdateModalVisible] = useState(false);
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

    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active' && updateModalVisible) {
        console.log('SplashScreen: App came to foreground, re-checking version...');
        checkAppVersion();
      }
    });

    return () => {
      if (timer) clearTimeout(timer);
      subscription.remove();
    };
  }, [updateModalVisible]);

  const checkAppVersion = async () => {
    try {
      console.log('SplashScreen: Fetching app version from:', URL_APP_VERSION);
      const response = await axios.get(URL_APP_VERSION);
      
      if (response.data && response.data.success && response.data.data.length > 0) {
        const remoteVersion = response.data.data[0].version;
        const remoteStoreUrl = response.data.data[0].store_url;
        
        console.log(`SplashScreen: Current Version: ${APP_VERSION}, Remote Version: ${remoteVersion}`);
        
        if (APP_VERSION !== remoteVersion) {
          setStoreUrl(remoteStoreUrl);
          setUpdateModalVisible(true);
          return false;
        } else {
          setUpdateModalVisible(false);
          if (updateModalVisible) {
            // If it was visible and now it's not, it means user updated and came back
            await fetchSubscriptionCurrent();
          }
          return true;
        }
      }
      return true;
    } catch (error) {
      console.log('SplashScreen: Error checking app version:', error);
      return true; 
    }
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
        navigation.replace('Login');
      }
    } catch (error) {
      console.log('SplashScreen: fetchSubscriptionCurrent error:', error);
      navigation.replace('Login');
    }
  };

  const handleUpdate = () => {
    if (storeUrl) {
      Linking.openURL(storeUrl).catch(err => console.error("Couldn't load page", err));
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

      <Modal
        visible={updateModalVisible}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.iconContainer}>
              <Image 
                source={require('../assets/splash_logo.png')} 
                style={styles.modalLogo}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.modalTitle}>Update Available</Text>
            <Text style={styles.modalMessage}>
              A new version of Sewvee is available. Please update to continue using the app.
            </Text>
            <TouchableOpacity style={styles.updateButton} onPress={handleUpdate}>
              <Text style={styles.updateButtonText}>Update Now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
