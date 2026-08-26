const fs = require('fs');
const screenPath = 'src/screens/CustomerOrderDetailScreen.js';

let screenContent = fs.readFileSync(screenPath, 'utf8');
screenContent = screenContent.replace(
  "Type,\n} from 'lucide-react-native';",
  "Type,\n  X,\n} from 'lucide-react-native';"
);
fs.writeFileSync(screenPath, screenContent);

console.log("Patched CustomerOrderDetailScreen.js successfully to include X");
