const fs = require('fs');
const file = 'src/screens/CustomerDashboardScreen.js';
let content = fs.readFileSync(file, 'utf8');

const target = "const CustomerDashboardScreen = ({ navigation, route }) => {";
const replacement = `const CustomerDashboardScreen = ({ navigation, route }) => {
  useFocusEffect(
    React.useCallback(() => {
      StatusBar.setBarStyle('dark-content');
      if (Platform.OS === 'android') {
        StatusBar.setBackgroundColor('#F5F3FF');
      }
    }, [])
  );`;

content = content.replace(target, replacement);

fs.writeFileSync(file, content);
console.log('Clean statusbar patch applied');
