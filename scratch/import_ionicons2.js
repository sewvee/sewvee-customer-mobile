const fs = require('fs');
const file = 'src/screens/CustomerDashboardScreen.js';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes("import Ionicons from")) {
  content = "import Ionicons from 'react-native-vector-icons/Ionicons';\n" + content;
  fs.writeFileSync(file, content);
}
