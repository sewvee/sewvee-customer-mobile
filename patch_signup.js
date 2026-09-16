const fs = require('fs');
const file = 'src/screens/CustomerSignupScreen.js';
let content = fs.readFileSync(file, 'utf8');

// Imports to add
if (!content.includes('CountryPickerBottomSheet')) {
  content = content.replace("import { useAuth }", "import CountryPickerBottomSheet from '../components/CountryPickerBottomSheet';\nimport { COUNTRY_CODES } from '../constants/countryCodes';\nimport { useAuth }");
}

// Add state for modal
if (!content.includes('showCountryPicker')) {
  content = content.replace("const [loading, setLoading] = useState(false);", "const [loading, setLoading] = useState(false);\n  const [showCountryPicker, setShowCountryPicker] = useState(false);");
}

// Replace Picker with TouchableOpacity
const pickerRegex = /<Picker[\s\S]*?<\/Picker>/;
const replacement = `
                  <TouchableOpacity 
                      style={{ flexDirection: 'row', alignItems: 'center', height: 50, paddingHorizontal: 10 }}
                      onPress={() => setShowCountryPicker(true)}
                  >
                      <Text style={{ fontSize: 16, color: '#0F172A', marginRight: 4 }}>
                          {COUNTRY_CODES.find(c => c.code === countryCode)?.flag || '🌍'} {countryCode}
                      </Text>
                      <Text style={{ color: '#94A3B8', fontSize: 12 }}>▼</Text>
                  </TouchableOpacity>
`.trim();

content = content.replace(pickerRegex, replacement);

// Add the modal at the bottom of the component
if (!content.includes('<CountryPickerBottomSheet')) {
  const modalPlacement = `
        <CountryPickerBottomSheet
            visible={showCountryPicker}
            onClose={() => setShowCountryPicker(false)}
            onSelect={(code) => setCountryCode(code)}
            selectedCode={countryCode}
        />
    </KeyboardAvoidingView>
  `;
  content = content.replace('</KeyboardAvoidingView>', modalPlacement.trim() + '\n');
}

fs.writeFileSync(file, content);
console.log("Patched CustomerSignupScreen");
