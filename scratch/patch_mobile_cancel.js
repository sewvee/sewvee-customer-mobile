const fs = require('fs');
let content = fs.readFileSync('src/screens/CustomerRequestedOrdersScreen.js', 'utf8');

// 1. Add cancelReason state
content = content.replace(
  /const \[orderToCancel, setOrderToCancel\] = useState\(null\);/,
  "const [orderToCancel, setOrderToCancel] = useState(null);\n  const [cancelReason, setCancelReason] = useState('');"
);

// 2. Add cancelReason to confirmCancel axios call
content = content.replace(
  /await axios\.patch\(`\$\{URL_ORDERS\}\/\$\{orderToCancel\.id\}\/status`, \{ status_id: 4 \}, \{/,
  "await axios.patch(`${URL_ORDERS}/${orderToCancel.id}/status`, { status_id: 4, cancel_reason: cancelReason }, {"
);

// 3. Reset cancelReason in finally block
content = content.replace(
  /setOrderToCancel\(null\);\n\s*\}\n\s*\};/,
  "setOrderToCancel(null);\n      setCancelReason('');\n    }\n  };"
);

// 4. Reset cancelReason when clicking 'No, Keep it'
content = content.replace(
  /onPress=\{\(\) => \{\n\s*setCancelModalVisible\(false\);\n\s*setOrderToCancel\(null\);\n\s*\}\}/,
  "onPress={() => {\n                  setCancelModalVisible(false);\n                  setOrderToCancel(null);\n                  setCancelReason('');\n                }}"
);

// 5. Add TextInput into the modal JSX
// Find the text "Are you sure you want to cancel this order request? This action cannot be undone."
content = content.replace(
  /<Text style=\{\{ fontFamily: 'Inter-Regular', fontSize: 15, color: '#6B7280', textAlign: 'center', marginBottom: 24 \}\}>\n\s*Are you sure you want to cancel this order request\? This action cannot be undone\.\n\s*<\/Text>/,
  `<Text style={{ fontFamily: 'Inter-Regular', fontSize: 15, color: '#6B7280', textAlign: 'center', marginBottom: 16 }}>
              Are you sure you want to cancel this order request? This action cannot be undone.
            </Text>
            
            <TextInput
              style={{ width: '100%', backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 12, minHeight: 80, textAlignVertical: 'top', fontFamily: 'Inter-Regular', fontSize: 14, color: '#1F2937', marginBottom: 24 }}
              placeholder="Reason for cancellation (optional)"
              placeholderTextColor="#9CA3AF"
              multiline
              value={cancelReason}
              onChangeText={setCancelReason}
            />`
);

// Import TextInput if missing
if (!content.includes("TextInput")) {
  content = content.replace(/from 'react-native';/, ", TextInput } from 'react-native';");
}

fs.writeFileSync('src/screens/CustomerRequestedOrdersScreen.js', content);
