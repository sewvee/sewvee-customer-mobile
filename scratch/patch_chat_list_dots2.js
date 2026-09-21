const fs = require('fs');
const path = 'src/screens/CustomerChatListScreen.js';
let content = fs.readFileSync(path, 'utf8');

// Add state
content = content.replace(
  /const \[lastVisited, setLastVisited\] = useState\(\{\}\);/,
  "const [lastVisited, setLastVisited] = useState({});\n  const [menuVisible, setMenuVisible] = useState(false);\n  const [selectedThread, setSelectedThread] = useState(null);"
);

// Add Modal import
content = content.replace(
  /import \{ View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, StatusBar \} from 'react-native';/,
  "import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, StatusBar, Modal } from 'react-native';"
);

// Add markAsRead import
content = content.replace(
  /import \{ useDispatch \} from 'react-redux';/,
  "import { useDispatch } from 'react-redux';\nimport { markAsRead } from '../store/chatSlice';"
);

fs.writeFileSync(path, content);
console.log('Fixed state and imports!');
