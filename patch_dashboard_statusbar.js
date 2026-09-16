const fs = require('fs');
const file = 'src/screens/CustomerDashboardScreen.js';
let content = fs.readFileSync(file, 'utf8');

// 1. Import useFocusEffect
content = content.replace(
  "import { useAuth } from '../context/AuthContext';",
  "import { useAuth } from '../context/AuthContext';\nimport { useFocusEffect } from '@react-navigation/native';"
);

// 2. Add useFocusEffect hook inside the component
const hookTarget = "const { orders } = useData();";
const hookReplacement = `const { orders } = useData();
  
  useFocusEffect(
    React.useCallback(() => {
      StatusBar.setBackgroundColor('#F5F3FF');
      StatusBar.setBarStyle('dark-content');
    }, [])
  );`;

content = content.replace(hookTarget, hookReplacement);

fs.writeFileSync(file, content);
console.log('Dashboard status bar patched with useFocusEffect');
