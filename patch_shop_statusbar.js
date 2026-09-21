const fs = require('fs');
const file = 'src/screens/CustomerShopScreen.js';
let content = fs.readFileSync(file, 'utf8');

// 1. Import useFocusEffect
content = content.replace(
  "import { useAuth } from '../context/AuthContext';",
  "import { useAuth } from '../context/AuthContext';\nimport { useFocusEffect } from '@react-navigation/native';"
);

// 2. Add useFocusEffect hook inside the component
const hookTarget = "const { user } = useAuth();";
const hookReplacement = `const { user } = useAuth();

  useFocusEffect(
    React.useCallback(() => {
      StatusBar.setBackgroundColor('#FFF');
      StatusBar.setBarStyle('dark-content');
    }, [])
  );`;

content = content.replace(hookTarget, hookReplacement);

fs.writeFileSync(file, content);
console.log('Shop status bar patched with useFocusEffect');
