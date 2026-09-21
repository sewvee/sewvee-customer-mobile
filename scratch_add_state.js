const fs = require('fs');
let content = fs.readFileSync('src/screens/CustomerChatScreen.js', 'utf8');

content = content.replace('const [showAttachMenu, setShowAttachMenu] = useState(false);', 
`const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);`);

fs.writeFileSync('src/screens/CustomerChatScreen.js', content);
