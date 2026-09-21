const fs = require('fs');
const file = 'src/screens/CustomerShopScreen.js';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  "import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Dimensions, Platform, ScrollView, Modal, ActivityIndicator } from 'react-native';",
  "import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Dimensions, Platform, ScrollView, Modal, ActivityIndicator, StatusBar } from 'react-native';"
);

fs.writeFileSync(file, content);
console.log('StatusBar imported');
