const fs = require('fs');
let file = 'src/screens/CustomerChatListScreen.js';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  "import { useAuth } from '../context/AuthContext';",
  "import { useAuth } from '../context/AuthContext';\nimport { useFocusEffect } from '@react-navigation/native';"
);
content = content.replace(
  "import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Platform } from 'react-native';",
  "import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Platform, StatusBar } from 'react-native';"
);
let hookTarget = "const { user } = useAuth();";
let hookReplacement = `const { user } = useAuth();
  useFocusEffect(
    React.useCallback(() => {
      StatusBar.setBackgroundColor('#FFF');
      StatusBar.setBarStyle('dark-content');
    }, [])
  );`;
content = content.replace(hookTarget, hookReplacement);
fs.writeFileSync(file, content);

file = 'src/screens/CustomerProfileScreen.js';
content = fs.readFileSync(file, 'utf8');

content = content.replace(
  "import { useAuth } from '../context/AuthContext';",
  "import { useAuth } from '../context/AuthContext';\nimport { useFocusEffect } from '@react-navigation/native';"
);
content = content.replace(
  "import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Alert, Platform } from 'react-native';",
  "import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Alert, Platform, StatusBar } from 'react-native';"
);
hookTarget = "const { user, logout } = useAuth();";
hookReplacement = `const { user, logout } = useAuth();
  useFocusEffect(
    React.useCallback(() => {
      StatusBar.setBackgroundColor('#FFF');
      StatusBar.setBarStyle('dark-content');
    }, [])
  );`;
content = content.replace(hookTarget, hookReplacement);
fs.writeFileSync(file, content);

console.log('ChatList and Profile StatusBar patched');
