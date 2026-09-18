const fs = require('fs');
const file = 'src/screens/CustomerProfileScreen.js';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  "View, Text, StyleSheet, TouchableOpacity, ScrollView,",
  "View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar,"
);

fs.writeFileSync(file, content);
console.log('StatusBar imported in Profile');
