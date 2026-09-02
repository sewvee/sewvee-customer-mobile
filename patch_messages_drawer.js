const fs = require('fs');
const path = '/Users/bhuvan/Documents/Bhuvan/Products/Sewvee-Business-Mobile/src/screens/MessagesListScreen.js';
let content = fs.readFileSync(path, 'utf8');

// 1. Add imports for Modal, etc.
if (!content.includes('Modal')) {
  content = content.replace(
    /import \{\s*View,\s*Text,\s*StyleSheet,\s*FlatList,\s*TouchableOpacity,\s*TextInput,\s*ActivityIndicator,\s*RefreshControl,\s*\} from 'react-native';/,
    `import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator, RefreshControl, Modal } from 'react-native';`
  );
}

// 2. Add state for the drawer
content = content.replace(
  /const dispatch = useDispatch\(\);/,
  `const dispatch = useDispatch();\n  const [drawerVisible, setDrawerVisible] = useState(false);`
);

// 3. Extract orders from redux
content = content.replace(
  /const \{ threads, loadingThreads \} = useSelector\(\(state\) => state\.chat\);/,
  `const { threads, loadingThreads } = useSelector((state) => state.chat);\n  const recentOrders = useSelector((state) => state.salesOrder?.ordersList || []);`
);

// 4. Modify the + button onPress
content = content.replace(
  /onPress=\{.*?navigation\.navigate\('Customers'\).*?\}/,
  `onPress={() => setDrawerVisible(true)}`
);

// 5. Add the Modal render block right before the final </View>
const modalCode = `
      {/* Recent Orders Drawer */}
      <Modal visible={drawerVisible} transparent animationType="slide" onRequestClose={() => setDrawerVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setDrawerVisible(false)}>
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Order to Chat</Text>
              <TouchableOpacity onPress={() => setDrawerVisible(false)}>
                <X size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={recentOrders.slice(0, 15)} // limit to recent 15
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={styles.drawerItem}
                  onPress={() => {
                    setDrawerVisible(false);
                    navigation.navigate('ChatScreen', {
                      thread: {
                        order_id: item.id,
                        customer_id: item.customer_id || item.customer?.id,
                        customer_name: item.customer_name || item.customer?.name || 'Unknown',
                        order_name: item.order_number,
                        order_type: item.order_type,
                      }
                    });
                  }}
                >
                  <View style={styles.drawerItemLeft}>
                    <Text style={styles.drawerItemName}>{item.customer_name || item.customer?.name || 'Unknown Customer'}</Text>
                    <Text style={styles.drawerItemOrder}>#{item.order_number}</Text>
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={{padding: 20, textAlign: 'center'}}>No recent orders</Text>}
            />
          </View>
        </TouchableOpacity>
      </Modal>
`;

content = content.replace(
  /      \}\)\}\n    <\/View>\n  \);\n\}/,
  `      })}\n${modalCode}\n    </View>\n  );\n}`
);

// 6. Add styles
content = content.replace(
  /const styles = StyleSheet\.create\(\{/,
  `const styles = StyleSheet.create({\n  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },\n  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '70%', paddingBottom: 20 },\n  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },\n  modalTitle: { fontSize: 18, fontFamily: 'Inter-Bold', color: Colors.textPrimary },\n  drawerItem: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', flexDirection: 'row', alignItems: 'center' },\n  drawerItemLeft: { flex: 1 },\n  drawerItemName: { fontSize: 16, fontFamily: 'Inter-SemiBold', color: Colors.textPrimary },\n  drawerItemOrder: { fontSize: 14, fontFamily: 'Inter-Regular', color: Colors.textSecondary, marginTop: 4 },`
);

fs.writeFileSync(path, content);
console.log('Drawer patched.');
