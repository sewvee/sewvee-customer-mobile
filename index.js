import { AppRegistry } from 'react-native';
import PushNotification from 'react-native-push-notification';
import { getMessaging, setBackgroundMessageHandler } from '@react-native-firebase/messaging';
import { onDisplayNotification } from './src/utils/pushNotificationHelper';
import App from './App';
import { name as appName } from './app.json';
import { store } from './src/store';
import { markAsRead } from './src/store/notificationSlice';
import * as navigationService from './src/utils/navigationService';

// Register background handler
setBackgroundMessageHandler(getMessaging(), async remoteMessage => {
    console.log('Message handled in the background!', remoteMessage);
    
    // Only display a manual notification if it's a data-only message
    // If it has a notification object, the manifest default channel ensures it pops up
    if (!remoteMessage.notification) {
        await onDisplayNotification(remoteMessage);
    }
});



// Configure PushNotification
PushNotification.configure({
    onNotification: function (notification) {
        console.log("PushNotification event received:", notification);

        if (notification.userInteraction) {
            const data = notification.data || notification.userInfo;
            console.log("Notification Data extracted:", data);
            
            if (data) {
                const page = data.page;
                console.log("Notification Page:", page);

                // Parse nested data if it's a string (FCM often sends nested JSON as string)
                let innerData = {};
                try {
                    innerData = typeof data.data === 'string' ? JSON.parse(data.data) : data.data;
                    console.log("Notification Inner Data parsed:", innerData);
                } catch (e) {
                    console.log("Error parsing inner data:", e);
                }

                const id = innerData?.id || data.id;
                console.log("Notification ID for API:", id);

                // Call markAsRead API if ID is present, regardless of page type
                if (id) {
                    console.log("Preparing to dispatch markAsRead for ID:", id);
                    // Increased delay to ensure SplashScreen navigation finishes first
                    setTimeout(() => {
                        console.log("Executing delayed dispatch for markAsRead ID:", id);
                        store.dispatch(markAsRead(id))
                            .unwrap()
                            .then(res => console.log("markAsRead dispatch success:", res))
                            .catch(err => console.error("markAsRead dispatch error:", err));
                    }, 3500);
                }

                if (page === 'TRIAL_STARTED' || page === 'SUBSCRIPTION') {
                    // Added small extra delay to navigation to ensure it wins over Splash navigation
                    setTimeout(() => {
                        navigationService.navigate('Dashboard');
                    }, 3000);
                } else if (page === 'TRIAL_EXPIRING') {
                    setTimeout(() => {
                        navigationService.navigate('Subscription');
                    }, 3000);
                } else if (page === 'TRIAL_EXPIRED') {
                    setTimeout(() => {
                        navigationService.navigate('TrialEndedScreen');
                    }, 3000);
                } else if (page === 'SUBSCRIPTION_PAYMENT' || page === 'SUBSCRIPTION_SUCCESS') {
                    setTimeout(() => {
                        navigationService.navigate('SubscriptionHistoryScreen');
                    }, 3000);
                } else if (page === 'SUBSCRIPTION_EXPIRED') {
                    setTimeout(() => {
                        navigationService.navigate('TrialExpiredScreen');
                    }, 3000);
                } else if (page === 'LOW_STOCK') {
                    setTimeout(() => {
                        navigationService.navigate('InventoryScreen');
                    }, 3000);
                } else {
                    setTimeout(() => {
                        navigationService.navigate('NotificationsScreen');
                    }, 3000);
                }
            }
        }
    },
    requestPermissions: false,
});

AppRegistry.registerComponent(appName, () => App);
