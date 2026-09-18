const fs = require('fs');
const path = require('path');

function patchFile(filePath, isSignup) {
  const fullPath = path.join('/Users/bhuvan/Documents/Bhuvan/Products/Sewvee-Customer-Mobile', filePath);
  let content = fs.readFileSync(fullPath, 'utf8');

  // Add Picker import if not exists
  if (!content.includes('@react-native-picker/picker')) {
    content = content.replace(
      /from 'react-native';/,
      "from 'react-native';\nimport { Picker } from '@react-native-picker/picker';"
    );
  }

  // Add countryCode state
  if (!content.includes('const [countryCode')) {
    content = content.replace(
      /const \[phone, setPhone\] = useState\(''\);/,
      "const [phone, setPhone] = useState('');\n    const [countryCode, setCountryCode] = useState('+91');"
    );
  }

  // Update backend submission logic
  content = content.replace(
      /await loginContext.login\(phone, /g,
      "await loginContext.login(countryCode === '+91' ? phone : countryCode + phone, "
  );
  content = content.replace(
      /const { login } = useAuth\(\);/,
      "const loginContext = useAuth();\n    const login = loginContext.login;"
  );
  content = content.replace(
      /await login\(phone, /g,
      "await loginContext.login(countryCode === '+91' ? phone : countryCode + phone, "
  );

  // Replace phone input UI
  const phoneUIAlt = `<Icon name="phone" size={20} color="#94A3B8" style={styles.inputIcon} />
                    <TextInput
                        style={styles.input}
                        placeholder="10-digit number"
                        keyboardType="numeric"
                        maxLength={10}`;
                        
  const newPhoneUI = `<View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Picker
                                selectedValue={countryCode}
                                onValueChange={(itemValue) => setCountryCode(itemValue)}
                                style={{ width: 110, height: 50, color: '#0F172A', marginLeft: -10 }}
                                dropdownIconColor="#94A3B8"
                            >
                                <Picker.Item label="🇮🇳 +91" value="+91" />
                                <Picker.Item label="🇺🇸 +1" value="+1" />
                                <Picker.Item label="🇬🇧 +44" value="+44" />
                                <Picker.Item label="🇦🇺 +61" value="+61" />
                                <Picker.Item label="🇦🇪 +971" value="+971" />
                            </Picker>
                            <View style={{ width: 1, height: 24, backgroundColor: '#E2E8F0', marginRight: 10 }} />
                        </View>
                        <TextInput
                            style={[styles.input, { flex: 1, paddingLeft: 0 }]}
                            placeholder="Mobile number"
                            keyboardType="numeric"
                            maxLength={15}`;

  if (content.includes('10-digit number')) {
      content = content.replace(phoneUIAlt, newPhoneUI);
  }

  fs.writeFileSync(fullPath, content);
  console.log('Patched', filePath);
}

patchFile('src/screens/LoginScreen.js', false);
