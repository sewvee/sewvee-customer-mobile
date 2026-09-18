const fs = require('fs');
const file = 'src/navigation/RootNavigator.js';
let content = fs.readFileSync(file, 'utf8');

// Remove Onboarding screen import and usage
content = content.replace("import OnboardingScreen from '../screens/OnboardingScreen';\n", "");

const target = `          {!isOnboarded && (
            <Stack.Screen name="Onboarding" component={OnboardingScreen} />
          )}
          <Stack.Screen name="Main" component={MainTabs} />`;

const replacement = `          <Stack.Screen name="Main" component={MainTabs} />`;

content = content.replace(target, replacement);
fs.writeFileSync(file, content);
console.log('RootNavigator patched');
