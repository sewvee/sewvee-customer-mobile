const fs = require('fs');
const path = 'src/context/AuthContext.js';
let code = fs.readFileSync(path, 'utf8');

const loginReplacement = `
    const login = async (token, onboarded = true) => {
        const tokenToSave = token || 'demo';
        await Promise.all([
            AsyncStorage.setItem(STORAGE_KEYS.TOKEN, tokenToSave),
            AsyncStorage.setItem(STORAGE_KEYS.ONBOARDED, String(onboarded))
        ]);
        
        try {
            const fcmToken = await AsyncStorage.getItem('fcmToken');
            if (fcmToken) {
                console.log('Sending FCM Token to backend on login:', fcmToken);
                dispatch(saveFcmTokenAction({ fcm_token: fcmToken })).catch(e => console.error('FCM Token dispatch error', e));
            }
        } catch (fcmError) {
            console.error('Error registering FCM token during login:', fcmError);
        }

        setUserToken(tokenToSave);
        setIsOnboarded(onboarded);
    };
`;

code = code.replace(
    /const login = async \([^]*?setIsOnboarded\(onboarded\);\n    \};/,
    loginReplacement.trim()
);

fs.writeFileSync(path, code);
