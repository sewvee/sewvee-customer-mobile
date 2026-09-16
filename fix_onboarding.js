const fs = require('fs');
const file = 'src/navigation/RootNavigator.js';
let content = fs.readFileSync(file, 'utf8');

// The exact block to remove:
const regex = /\{!isOnboarded && \([\s\S]*?<Stack\.Screen name="Onboarding" component=\{OnboardingScreen\} \/>[\s\S]*?\)\}/;
content = content.replace(regex, "");

fs.writeFileSync(file, content);
console.log('Fixed Onboarding Screen reference crash');
