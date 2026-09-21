const fs = require('fs');

let content = fs.readFileSync('src/screens/CustomerChatListScreen.js', 'utf8');

content = content.replace(
  /import \{ View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Image \} from 'react-native';/,
  "import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Image, StatusBar } from 'react-native';"
);

fs.writeFileSync('src/screens/CustomerChatListScreen.js', content);
