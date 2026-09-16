const fs = require('fs');
let code = fs.readFileSync('src/store/authSlice.js', 'utf8');
code = code.replace(
  /async \(fcmData, \{ getState, rejectWithValue \}\) => \{/g,
  "async (fcmData, { getState, rejectWithValue }) => {\n        console.log('--- ENTERED saveFcmTokenAction ---', fcmData);"
);
fs.writeFileSync('src/store/authSlice.js', code);
