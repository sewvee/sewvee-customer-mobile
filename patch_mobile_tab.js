const fs = require('fs');
const path = 'src/screens/CustomerOrderDetailScreen.js';
let content = fs.readFileSync(path, 'utf8');

const target = `          <TouchableOpacity 
            style={{ flex: 1, paddingVertical: 14, alignItems: 'center', borderBottomWidth: 2, borderColor: activeTab === 'requests' ? Colors.primary : 'transparent' }}
            onPress={() => setActiveTab('requests')}
          >
            <Text style={{ fontSize: 14, fontFamily: 'Inter-Bold', color: activeTab === 'requests' ? Colors.primary : '#64748B' }}>Change Requests</Text>
          </TouchableOpacity>`;

const replacement = `          <TouchableOpacity 
            style={{ flex: 1, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', borderBottomWidth: 2, borderColor: activeTab === 'requests' ? Colors.primary : 'transparent' }}
            onPress={() => setActiveTab('requests')}
          >
            <Text style={{ fontSize: 14, fontFamily: 'Inter-Bold', color: activeTab === 'requests' ? Colors.primary : '#64748B' }}>Change Requests</Text>
            {order?.has_unread_messages ? (
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444', marginLeft: 6 }} />
            ) : null}
          </TouchableOpacity>`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync(path, content);
  console.log("Patched tab successfully");
} else {
  console.log("Target not found");
}
