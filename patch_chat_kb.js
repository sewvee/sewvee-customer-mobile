const fs = require('fs');
const file = 'src/screens/CustomerChatScreen.js';
let content = fs.readFileSync(file, 'utf8');

// 1. Import useSafeAreaInsets
content = content.replace(
  "import { SafeAreaView } from 'react-native-safe-area-context';",
  "import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';"
);

// 2. Invoke hook
content = content.replace(
  "const CustomerChatScreen = ({ route, navigation }) => {",
  "const CustomerChatScreen = ({ route, navigation }) => {\n  const insets = useSafeAreaInsets();"
);

// 3. Update KeyboardAvoidingView
content = content.replace(
  "<KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#F8FAFC' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}\n        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>",
  "<KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#F8FAFC' }}\n        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}\n        keyboardVerticalOffset={Platform.OS === 'ios' ? (insets.top + 56) : 0}>"
);

// 4. Add dynamic padding to inputContainer
content = content.replace(
  "<View style={styles.inputContainer}>",
  "<View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, 8) }]}>"
);

fs.writeFileSync(file, content);
console.log('Chat Keyboard Patched');
