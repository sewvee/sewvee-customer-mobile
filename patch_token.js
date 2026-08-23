const fs = require('fs');

const files = [
  'src/screens/CustomerShopScreen.js',
  'src/screens/CustomerRequestedOrdersScreen.js'
];

files.forEach(file => {
  if (fs.existsSync(file)) {
    let code = fs.readFileSync(file, 'utf8');
    code = code.replace(/AsyncStorage\.getItem\('sewvee_token'\)/g, "AsyncStorage.getItem('userToken')");
    fs.writeFileSync(file, code);
    console.log('Patched', file);
  }
});
