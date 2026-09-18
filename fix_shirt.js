const fs = require('fs');
const path = 'src/screens/CustomerChatScreen.js';
let content = fs.readFileSync(path, 'utf8');

if (!content.includes('ShoppingBag as Shirt')) {
  content = content.replace(
    /import \{ Camera, Paperclip, MoreVertical, Image as ImageIcon, Star, Edit2, Trash2, X, FileText \} from 'lucide-react-native';/,
    `import { Camera, Paperclip, MoreVertical, Image as ImageIcon, Star, Edit2, Trash2, X, FileText, ShoppingBag as Shirt } from 'lucide-react-native';`
  );
  fs.writeFileSync(path, content);
}
