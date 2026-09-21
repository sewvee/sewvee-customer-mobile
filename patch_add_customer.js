const fs = require('fs');
const file = 'src/screens/AddCustomerScreen.js';
let content = fs.readFileSync(file, 'utf8');

// Replace old COUNTRY_CODES with import
const codesRegex = /const COUNTRY_CODES = \[\s*\{ code: '\+91'[\s\S]*?\];/;
content = content.replace(codesRegex, "import { COUNTRY_CODES } from '../constants/countryCodes';\nimport CountryPickerBottomSheet from '../components/CountryPickerBottomSheet';");

// Replace old modal rendering
const oldModalRegex = /\{showCountryPicker && \([\s\S]*?<\/View>\s*\)\}/;
if (content.match(oldModalRegex)) {
  const newModal = `
                <CountryPickerBottomSheet
                    visible={showCountryPicker}
                    onClose={() => setShowCountryPicker(false)}
                    onSelect={(code, flag) => {
                        setCountryCode(code);
                        setSelectedFlag(flag);
                    }}
                    selectedCode={countryCode}
                />
  `.trim();
  content = content.replace(oldModalRegex, newModal);
}

fs.writeFileSync(file, content);
console.log("Patched AddCustomerScreen");
