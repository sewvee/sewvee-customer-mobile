const fs = require('fs');
const file = 'src/components/CustomerSelectionModal.js';
let content = fs.readFileSync(file, 'utf8');

const codesRegex = /const COUNTRY_CODES = \[\s*\{ code: '\+91'[\s\S]*?\];/;
content = content.replace(codesRegex, "import { COUNTRY_CODES } from '../constants/countryCodes';\nimport CountryPickerBottomSheet from './CountryPickerBottomSheet';");

const oldModalRegex = /\{showCountryPicker && \([\s\S]*?<\/View>\s*\)\}/;
if (content.match(oldModalRegex)) {
  const newModal = `
                <CountryPickerBottomSheet
                    visible={showCountryPicker}
                    onClose={() => setShowCountryPicker(false)}
                    onSelect={(code, flag) => {
                        setNewCustomer(prev => ({ ...prev, countryCode: code }));
                        setSelectedFlag(flag);
                    }}
                    selectedCode={newCustomer.countryCode}
                />
  `.trim();
  content = content.replace(oldModalRegex, newModal);
}

fs.writeFileSync(file, content);
console.log("Patched CustomerSelectionModal");
