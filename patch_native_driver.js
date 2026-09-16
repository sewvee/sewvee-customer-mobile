const fs = require('fs');
const file = 'src/components/QuickActionCard.js';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  "Animated.spring(scaleAnim, { toValue: 0.95, useNativeDriver: true, speed: 20 }).start();",
  "Animated.spring(scaleAnim, { toValue: 0.95, useNativeDriver: false, speed: 20 }).start();"
);

content = content.replace(
  "Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 20 }).start();",
  "Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: false, speed: 20 }).start();"
);

fs.writeFileSync(file, content);
console.log('useNativeDriver patched');
