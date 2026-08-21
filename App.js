import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import RootNavigator from './src/navigation/RootNavigator.js';
import { AuthProvider } from './src/context/AuthContext';
import { DataProvider } from './src/context/DataContext';
import { TeamProvider } from './src/context/TeamContext';
import { ToastProvider } from './src/context/ToastContext';
import ErrorBoundary from './src/components/ErrorBoundary';
import OfflineNotice from './src/components/OfflineNotice';
import Toast from './src/components/Toast';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar, StyleSheet, View } from 'react-native';
import OTABlocker from './src/components/OTABlocker';

import { Provider } from 'react-redux';
import { store } from './src/store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { requestUserPermission, notificationListener } from './src/utils/pushNotificationHelper';

import { navigationRef } from './src/utils/navigationService';

function App() {
  // App.js or Main Index file
  useEffect(() => {
    const initGlobalSettings = async () => {
      const savedValue = await AsyncStorage.getItem('@warning_level');
      // Global variable-ah initialize panrom
      global.warningLevel = savedValue ? parseInt(savedValue, 10) : 10;
    };
    initGlobalSettings();
    // requestUserPermission(); // Moved to Splash and Dashboard
    notificationListener();
  }, []);
  return (
    <Provider store={store}>
      <GestureHandlerRootView style={{ flex: 1 }}>

        <SafeAreaProvider>

          <View style={styles.container}>

            <StatusBar
              translucent
              backgroundColor="transparent"
              barStyle="dark-content"
            />

            <ErrorBoundary>
              <ToastProvider>
                <AuthProvider>
                  <DataProvider>
                    <TeamProvider>
                      <NavigationContainer ref={navigationRef}>
                        <OfflineNotice />
                        <OTABlocker />
                        <RootNavigator />
                      </NavigationContainer>
                    </TeamProvider>
                  </DataProvider>
                  <Toast />
                </AuthProvider>
              </ToastProvider>
            </ErrorBoundary>

          </View>

        </SafeAreaProvider>

      </GestureHandlerRootView>
    </Provider>
  );
}

export default App;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});