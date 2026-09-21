const fs = require('fs');
const path = require('path');

function patchFile(filePath) {
  const fullPath = path.join('/Users/bhuvan/Documents/Bhuvan/Products/Sewvee-Customer-Mobile', filePath);
  let content = fs.readFileSync(fullPath, 'utf8');

  const newUI = `<View style={{ flexDirection: 'row', alignItems: 'center' }}>
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
                style={[styles.textInput, { flex: 1, paddingLeft: 0 }]}
                placeholder="Mobile number"
                placeholderTextColor="#94A3B8"
                keyboardType="number-pad"
                maxLength={15}
                value={phone}
                onChangeText={(val) => {
                  setPhone(val.replace(/[^0-9]/g, ''));
                  setErrorMsg('');
                }}
              />`;

  // Find the exact block
  const startStr = '<Ionicons name="call-outline" size={20} color="#94A3B8" style={styles.inputIcon} />';
  
  if (content.includes(startStr)) {
    // For Signup
    content = content.replace(/<Ionicons name="call-outline"[\s\S]*?onChangeText=\{\(v\) => \{setPhone\(v\.replace\(\/\[\^0-9\]\/g, ''\)\); setErrorMsg\(''\);\}\} \/>/, newUI);
    // For Login
    content = content.replace(/<Ionicons name="call-outline"[\s\S]*?onChangeText=\{\(val\) => \{\s*setPhone\(val\.replace\(\/\[\^0-9\]\/g, ''\)\);\s*setErrorMsg\(''\);\s*\}\}\s*\/>/, newUI);
  }

  fs.writeFileSync(fullPath, content);
  console.log('Patched', filePath);
}

patchFile('src/screens/CustomerSignupScreen.js');
patchFile('src/screens/LoginScreen.js');
