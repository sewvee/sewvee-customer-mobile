import {
    getMessaging,
    requestPermission,
    getToken,
    onMessage,
    onNotificationOpenedApp,
    getInitialNotification,
    AuthorizationStatus
} from '@react-native-firebase/messaging';
import PushNotification from 'react-native-push-notification';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, PermissionsAndroid, Alert, Linking } from 'react-native';

export const onDisplayNotification = async (remoteMessage) => {
    const channelId = 'default';
    
    // Create a channel (required for Android)
    PushNotification.createChannel(
        {
            channelId: channelId,
            channelName: "Default Channel",
            importance: 4, // HIGH
            vibrate: true,
        },
        (created) => console.log(`createChannel returned '${created}'`)
    );

    // Display a notification
    PushNotification.localNotification({
    channelId: channelId,
    title: remoteMessage.notification?.title || remoteMessage.data?.title ,
    message: remoteMessage.notification?.body || remoteMessage.data?.body ,
    priority: "high",
    importance: "high",
    largeIcon: "ic_launcher", // App icon (large icon on notification)
    largeIconUrl: "ic_launcher", // Use high-quality icon
    smallIcon: "ic_launcher", // App icon (status bar and notification)
    userInfo: remoteMessage.data, // This carries the FCM data to the click event
     });
}

export const requestUserPermission = async () => {
    console.log('Attempting to request notification permission...');
    let enabled = false;

    if (Platform.OS === 'android' && Platform.Version >= 33) {
        try {
            const status = await PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
            );
            console.log('Android 13+ Notification permission status:', status);
            
            if (status === PermissionsAndroid.RESULTS.GRANTED) {
                enabled = true;
            } else if (status === PermissionsAndroid.RESULTS.DENIED || status === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
                // If denied, we can't force the system prompt, so we show a custom one
                Alert.alert(
                    'Notifications Disabled',
                    'Please allow notifications to receive important updates and order alerts.',
                    [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Open Settings', onPress: () => Linking.openSettings() }
                    ]
                );
            }
        } catch (err) {
            console.warn('Error requesting notification permission:', err);
        }
    }

    const messaging = getMessaging();
    const authStatus = await requestPermission(messaging);
    const fcmEnabled =
        authStatus === AuthorizationStatus.AUTHORIZED ||
        authStatus === AuthorizationStatus.PROVISIONAL;

    if (fcmEnabled || enabled) {
        console.log('Authorization status:', authStatus);
        
        // Pre-create channels for background/heads-up notifications
        PushNotification.createChannel({
            channelId: 'default',
            channelName: 'Default Channel',
            importance: 4,
        }, (created) => console.log(`createChannel default returned '${created}'`));

        PushNotification.createChannel({
            channelId: 'fcm_fallback_notification_channel',
            channelName: 'FCM Fallback Channel',
            importance: 4,
        }, (created) => console.log(`createChannel fallback returned '${created}'`));

        PushNotification.createChannel({
            channelId: 'com.sewvee',
            channelName: 'Sewvee Notifications',
            importance: 4,
        }, (created) => console.log(`createChannel sewvee returned '${created}'`));

        getFcmToken();
    }
    return fcmEnabled || enabled;
}


const getFcmToken = async () => {
    let fcmToken = await AsyncStorage.getItem('fcmToken');
    console.log('Old FCM Token:', fcmToken);
    if (!fcmToken) {
        try {
            const messaging = getMessaging();
            const token = await getToken(messaging);
            if (token) {
                console.log('New FCM Token:', token);
                await AsyncStorage.setItem('fcmToken', token);
            }
        } catch (error) {
            console.log('Error in getting FCM Token, retrying in 5s...', error);
            // Retry after 5 seconds if service is not available
            setTimeout(getFcmToken, 5000);
        }
    }
}

export const notificationListener = async () => {
    const messaging = getMessaging();

    const handleRemoteMessage = (remoteMessage) => {
        if (remoteMessage && remoteMessage.data) {
            const data = remoteMessage.data;
            const page = data.page;
            
            let innerData = {};
            try {
                innerData = typeof data.data === 'string' ? JSON.parse(data.data) : data.data;
            } catch (e) {
                console.log("Error parsing inner data in listener:", e);
            }

            const id = innerData?.id || data.id;

            if (id) {
                console.log("Preparing to dispatch markAsRead from listener for ID:", id);
                // Increased delay to ensure auth/store is ready
                setTimeout(() => {
                    import('../store').then(({ store }) => {
                        import('../store/notificationSlice').then(({ markAsRead }) => {
                            console.log("Executing delayed listener dispatch for markAsRead ID:", id);
                            store.dispatch(markAsRead(id))
                                .unwrap()
                                .then(res => console.log("Listener markAsRead success:", res))
                                .catch(err => console.error("Listener markAsRead error:", err));
                        });
                    });
                }, 3500);
            }

            if (page === 'TRIAL_STARTED' || page === 'SUBSCRIPTION') {
                setTimeout(() => {
                    import('./navigationService').then((navigationService) => {
                        navigationService.navigate('Dashboard');
                    });
                }, 3000);
            } else if (page === 'TRIAL_EXPIRING') {
                setTimeout(() => {
                    import('./navigationService').then((navigationService) => {
                        navigationService.navigate('Subscription');
                    });
                }, 3000);
            } else if (page === 'TRIAL_EXPIRED') {
                setTimeout(() => {
                    import('./navigationService').then((navigationService) => {
                        navigationService.navigate('TrialEndedScreen');
                    });
                }, 3000);
            } else if (page === 'SUBSCRIPTION_PAYMENT' || page === 'SUBSCRIPTION_SUCCESS') {
                setTimeout(() => {
                    import('./navigationService').then((navigationService) => {
                        navigationService.navigate('SubscriptionHistoryScreen');
                    });
                }, 3000);
            } else if (page === 'SUBSCRIPTION_EXPIRED') {
                setTimeout(() => {
                    import('./navigationService').then((navigationService) => {
                        navigationService.navigate('TrialExpiredScreen');
                    });
                }, 3000);
            } else if (page === 'LOW_STOCK') {
                setTimeout(() => {
                    import('./navigationService').then((navigationService) => {
                        navigationService.navigate('InventoryScreen');
                    });
                }, 3000);
            } else {
                setTimeout(() => {
                    import('./navigationService').then((navigationService) => {
                        navigationService.navigate('NotificationsScreen');
                    });
                }, 3000);
            }
        }
    };

    // When the app is running, but in the background and the user taps on the notification
    onNotificationOpenedApp(messaging, remoteMessage => {
        console.log(
            'Notification caused app to open from background state:',
            remoteMessage,
        );
        handleRemoteMessage(remoteMessage);
    });

    // Check whether an initial notification is available (app opened from a quit state)
    getInitialNotification(messaging)
        .then(remoteMessage => {
            if (remoteMessage) {
                console.log(
                    'Notification caused app to open from quit state:',
                    remoteMessage,
                );
                // Increased delay to ensure SplashScreen navigation finishes first
                setTimeout(() => {
                    handleRemoteMessage(remoteMessage);
                }, 3000);
            }
        });

    // Foreground state messages
    onMessage(messaging, async remoteMessage => {
        console.log('Foreground notification received:', remoteMessage);
        onDisplayNotification(remoteMessage);
    });
}
