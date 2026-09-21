const fs = require('fs');
const path = 'src/screens/CustomerResetPinScreen.js';
let content = fs.readFileSync(path, 'utf8');

// 1. Add focusedField state
content = content.replace(
  /const \[errorMsg, setErrorMsg\] = useState\(''\);/,
  "const [errorMsg, setErrorMsg] = useState('');\n  const [focusedField, setFocusedField] = useState(null);"
);

// 2. Modify renderPinBoxes signature and logic
const oldRender = /const renderPinBoxes = \(value, setValue, maxLength = 4\) => \([\s\S]*?<TextInput\s+style=\{styles\.hiddenInput\}[\s\S]*?onChangeText=\{\(val\) => \{[\s\S]*?setValue\(val\.replace\(\/\[\^0-9\]\/g, ''\)\);[\s\S]*?setErrorMsg\(''\);[\s\S]*?\}\}\s*\/>\s*<\/View>\s*\);/;

const newRender = `const renderPinBoxes = (value, setValue, maxLength = 4, fieldName) => (
    <View style={styles.pinBoxRow}>
      {Array.from({ length: maxLength }).map((_, i) => (
        <View key={i} style={[
          styles.pinBox, 
          value.length > i && styles.pinBoxFilled, 
          (value.length === i && focusedField === fieldName) && styles.pinBoxActive
        ]}>
          <Text style={styles.pinBoxText}>{value.length > i ? (maxLength === 4 ? '●' : value[i]) : ''}</Text>
        </View>
      ))}
      <TextInput
        style={styles.hiddenInput}
        keyboardType="number-pad"
        maxLength={maxLength}
        value={value}
        onFocus={() => setFocusedField(fieldName)}
        onBlur={() => setFocusedField(null)}
        onChangeText={(val) => {
          setValue(val.replace(/[^0-9]/g, ''));
          setErrorMsg('');
        }}
      />
    </View>
  );`;

content = content.replace(oldRender, newRender);

// 3. Update the render calls to pass the field name and change OTP to 4 digits
content = content.replace(
  /<View style=\{styles\.pinContainer\}>\{renderPinBoxes\(otp, setOtp, 6\)\}<\/View>/,
  "<View style={styles.pinContainer}>{renderPinBoxes(otp, setOtp, 4, 'otp')}</View>"
);
content = content.replace(
  /<View style=\{styles\.pinContainer\}>\{renderPinBoxes\(newPin, setNewPin, 4\)\}<\/View>/,
  "<View style={styles.pinContainer}>{renderPinBoxes(newPin, setNewPin, 4, 'newPin')}</View>"
);
content = content.replace(
  /<View style=\{styles\.pinContainer\}>\{renderPinBoxes\(confirmPin, setConfirmPin, 4\)\}<\/View>/,
  "<View style={styles.pinContainer}>{renderPinBoxes(confirmPin, setConfirmPin, 4, 'confirmPin')}</View>"
);

fs.writeFileSync(path, content);
console.log('Patched reset pin UI!');
