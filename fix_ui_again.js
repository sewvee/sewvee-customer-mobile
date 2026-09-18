const fs = require('fs');
const path = 'src/screens/CustomerChatScreen.js';
let content = fs.readFileSync(path, 'utf8');

// Fix Photo Request condition
content = content.replace(
  /if \(!isCustomer && msgText && \(msgText\.includes\("\[ACTION_REQUIRED:PHOTO_REQUEST\]"\) \|\| msgText\.toLowerCase\(\)\.includes\("photo requested"\)\)\) \{/,
  'if (!isCustomer && msgText && (msgText.includes("PHOTO_REQUEST") || msgText.toLowerCase().includes("photo requested"))) {'
);

// Fix Feedback Request condition and UI text
content = content.replace(
  /if \(!isCustomer && msgText && \(\(msgText\.includes\("\[ACTION_REQUIRED:"\) && !msgText\.includes\("PHOTO_REQUEST"\)\) \|\| msgText\.toLowerCase\(\)\.includes\("action required"\)\)\) \{/,
  'if (!isCustomer && msgText && ((msgText.includes("[ACTION_REQUIRED:") && !msgText.includes("PHOTO_REQUEST")) || msgText.toLowerCase().includes("action required") || msgText.toLowerCase().includes("feedback requested"))) {'
);

content = content.replace(
  /<Text style=\{\{ fontSize: 16, fontWeight: 'bold', color: '#5B21B6', marginBottom: 8, textAlign: 'center' \}\}>⚠️ Action Required<\/Text>/,
  "<Text style={{ fontSize: 16, fontWeight: 'bold', color: '#5B21B6', marginBottom: 8, textAlign: 'center' }}>⭐ Feedback Requested</Text>"
);

content = content.replace(
  /Your outfit is ready! We would love to hear your feedback on the stitching and overall experience\./,
  "We'd love to hear about your experience! Please leave your feedback."
);

content = content.replace(
  /<Text style=\{\{ color: '#FFF', fontWeight: 'bold', fontSize: 14 \}\}>Submit Feedback<\/Text>/,
  "<Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 14 }}>Leave Feedback</Text>"
);

fs.writeFileSync(path, content);
console.log('Fixed chat UI text and conditions!');
