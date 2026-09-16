const fs = require('fs');
const path = 'src/utils/pushNotificationHelper.js';
let content = fs.readFileSync(path, 'utf8');

const newGetFcmToken = `const getFcmToken = async () => {
    let token = await AsyncStorage.getItem('fcmToken');
    try {
        const messaging = getMessaging();
        const newToken = await getToken(messaging);
        if (newToken) {
            token = newToken;
            await AsyncStorage.setItem('fcmToken', newToken);
        }
    } catch (error) {
        console.log('Error in getting FCM Token, using old token or retrying in 5s...', error);
        if (!token) {
            setTimeout(getFcmToken, 5000);
            return;
        }
    }

    if (token) {
        console.log('Syncing FCM Token to backend:', token);
        import('../store').then(({ store }) => {
            import('../store/authSlice').then(({ saveFcmTokenAction }) => {
                const state = store.getState();
                if (state.auth && state.auth.token) {
                    store.dispatch(saveFcmTokenAction({ fcm_token: token }))
                        .catch(err => console.log('FCM token dispatch error:', err));
                }
            }).catch(err => console.log('Could not import saveFcmTokenAction', err));
        }).catch(err => console.log('Could not import store', err));
    }
}`;

content = content.replace(
  /const getFcmToken = async \(\) => \{[\s\S]*?\}\n\}/,
  newGetFcmToken
);

fs.writeFileSync(path, content);
console.log('Patched getFcmToken!');
