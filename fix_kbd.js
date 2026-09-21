const fs = require('fs');
const path = 'src/components/CustomerRequestsTab.js';
let content = fs.readFileSync(path, 'utf8');

content = content.replace("behavior={Platform.OS === 'ios' ? 'padding' : 'height'}", "behavior={Platform.OS === 'ios' ? 'padding' : undefined}");

fs.writeFileSync(path, content);
console.log("Fixed KeyboardAvoidingView in CustomerRequestsTab");
