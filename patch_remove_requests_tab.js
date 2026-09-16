const fs = require('fs');
const path = 'src/screens/CustomerOrderDetailScreen.js';
let content = fs.readFileSync(path, 'utf8');

// 1. Remove the CustomerRequestsTab import
content = content.replace(/import CustomerRequestsTab from '\.\.\/components\/CustomerRequestsTab';\n/, '');

// 2. Remove the TouchableOpacity for Requests
const tabRegex = /\s*<TouchableOpacity[^>]*onPress=\{.*?setActiveTab\('requests'\).*?\}[^>]*>[\s\S]*?<\/TouchableOpacity>/;
content = content.replace(tabRegex, '');

// 3. Remove the rendering block for requests
// The original is:
//       {activeTab === 'requests' ? (
//         <CustomerRequestsTab order={order} onUpdateStatus={refreshData} onChatActive={setIsOutfitChatActive} />
//       ) : activeTab === 'payment' ? (

const renderingRegex = /\{activeTab === 'requests' \? \([\s\S]*?<CustomerRequestsTab[^>]*\/>\s*\) : activeTab === 'payment' \? \(/;
content = content.replace(renderingRegex, "{activeTab === 'payment' ? (");

// 4. Remove setIsOutfitChatActive if it exists
content = content.replace(/const \[isOutfitChatActive, setIsOutfitChatActive\] = useState\(false\);\n/g, '');
content = content.replace(/if \(isOutfitChatActive\) \{[\s\S]*?\}\n/g, '');

fs.writeFileSync(path, content);
console.log("Patched CustomerOrderDetailScreen!");
