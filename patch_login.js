const fs = require('fs');
const file = 'src/screens/LoginScreen.js';
let content = fs.readFileSync(file, 'utf8');

// Fix "Sign up now" text to actually navigate to Signup
content = content.replace(
  "onPress={() => showToast('Enter your mobile and a new PIN above to sign up', 'info')}",
  "onPress={() => navigation.navigate('Signup')}"
);

fs.writeFileSync(file, content);
console.log('LoginScreen sign-up navigation patched');
