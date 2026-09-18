const fs = require('fs');
const file = 'src/screens/CustomerChatScreen.js';
let content = fs.readFileSync(file, 'utf8');

const target = `<TouchableOpacity onPress={() => setFeedbackModalVisible(true)} style={{ padding: 8, marginRight: 8 }}>
            <Star size={20} color="#F59E0B" fill="#F59E0B" />
          </TouchableOpacity>`;

content = content.replace(target, '');
fs.writeFileSync(file, content);
console.log('Star icon removed');
