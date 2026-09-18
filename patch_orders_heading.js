const fs = require('fs');
const file = 'src/screens/CustomerOrdersScreen.js';
let content = fs.readFileSync(file, 'utf8');

const target = `<SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F3FF" />
      {/* Welcome Banner */}`;

const replacement = `<SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F3FF" />
      
      {/* Header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12, backgroundColor: '#fff' }}>
        <Text style={{ fontSize: 22, fontFamily: 'Inter-Bold', color: '#0F172A' }}>My Orders</Text>
      </View>
      
      {/* Welcome Banner */}`;

content = content.replace(target, replacement);
fs.writeFileSync(file, content);
console.log('Orders heading added');
