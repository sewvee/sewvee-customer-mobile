const fs = require('fs');
const file = 'src/screens/CustomerOrdersScreen.js';
let content = fs.readFileSync(file, 'utf8');

// 1. Import useFocusEffect
content = content.replace(
  "import { useAuth } from '../context/AuthContext';",
  "import { useAuth } from '../context/AuthContext';\nimport { useFocusEffect } from '@react-navigation/native';"
);

// 2. Add useFocusEffect hook inside the component
const hookTarget = "const { user, logout } = useAuth();";
const hookReplacement = `const { user, logout } = useAuth();

  useFocusEffect(
    React.useCallback(() => {
      StatusBar.setBackgroundColor('#FFF');
      StatusBar.setBarStyle('dark-content');
    }, [])
  );`;

content = content.replace(hookTarget, hookReplacement);

// 3. Remove the declarative <StatusBar /> component since it causes issues
content = content.replace(/<StatusBar barStyle="dark-content" backgroundColor="#(fff|FFF)" \/>/, '');

fs.writeFileSync(file, content);
console.log('Orders status bar patched with useFocusEffect');
