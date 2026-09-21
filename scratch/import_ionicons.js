const fs = require('fs');
const file = 'src/screens/CustomerDashboardScreen.js';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes("import Ionicons")) {
  content = content.replace(
    /import \{ View, Text, StyleSheet/g,
    "import Ionicons from 'react-native-vector-icons/Ionicons';\nimport { View, Text, StyleSheet"
  );
  fs.writeFileSync(file, content);
}
