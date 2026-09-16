const fs = require('fs');
const file = 'src/screens/CustomerDashboardScreen.js';
let content = fs.readFileSync(file, 'utf8');

const target = `{/* QUICK ACTIONS */}
        
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 0, marginHorizontal: -4, marginTop: 16 }}>`;
        
const replacement = `{/* QUICK ACTIONS */}
        <Text style={[styles.sectionTitle, {marginTop: 24, marginBottom: 12}]}>Quick Actions</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 0, marginHorizontal: -4, marginTop: 4 }}>`;

content = content.replace(target, replacement);
fs.writeFileSync(file, content);
console.log('Dashboard Quick Actions heading added');
