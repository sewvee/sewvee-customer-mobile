const fs = require('fs');
const path = 'src/screens/CustomerOrderDetailScreen.js';
let content = fs.readFileSync(path, 'utf8');

// Insert const isOutfitChatActive = false; right after the activeTab useState
content = content.replace(/const \[activeTab, setActiveTab\] = useState\('details'\);/, "const [activeTab, setActiveTab] = useState('details');\n  const isOutfitChatActive = false;");

fs.writeFileSync(path, content);
