const fs = require('fs');

let content = fs.readFileSync('src/screens/LoginScreen.js', 'utf8');

// Add state
content = content.replace(
  /const \[loading, setLoading\] = useState\(false\);/,
  "const [loading, setLoading] = useState(false);\n  const [isPinFocused, setIsPinFocused] = useState(false);"
);

// Update pinBoxActive logic
content = content.replace(
  /pin\.length === i && styles\.pinBoxActive/g,
  "isPinFocused && pin.length === i && styles.pinBoxActive"
);

// Add focus handlers to hiddenInput
content = content.replace(
  /keyboardType="number-pad"\s*maxLength=\{4\}/,
  "keyboardType=\"number-pad\"\n        maxLength={4}\n        onFocus={() => setIsPinFocused(true)}\n        onBlur={() => setIsPinFocused(false)}"
);

fs.writeFileSync('src/screens/LoginScreen.js', content);
