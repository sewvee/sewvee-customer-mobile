const fs = require('fs');

let content = fs.readFileSync('src/screens/CustomerShopScreen.js', 'utf8');

content = content.replace(
  /import \{ useNavigation, useFocusEffect \} from '@react-navigation\/native';/,
  "import { useNavigation } from '@react-navigation/native';"
);

fs.writeFileSync('src/screens/CustomerShopScreen.js', content);
