const fs = require('fs');
const file = 'src/screens/SplashScreen.js';
let content = fs.readFileSync(file, 'utf8');

const regex = /const fetchSubscriptionCurrent = async \(\) => \{[\s\S]*?\};/;

const replacement = `const fetchSubscriptionCurrent = async () => {
    // For Customer app, we skip company subscription checks.
    // In a real flow, you would check AsyncStorage for a token.
    // For now, we will route to Login directly or whatever the default auth is.
    setTimeout(() => {
      navigation.replace('Login');
    }, 1000);
  };`;

content = content.replace(regex, replacement);

fs.writeFileSync(file, content);
console.log('Splash screen patched');
