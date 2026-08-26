const fs = require('fs');
const path = 'src/components/CustomerRequestsTab.js';
let code = fs.readFileSync(path, 'utf8');

// The closing tag is currently </KeyboardAvoidingView>.
// Wait! Let's check what it actually is in the file.
code = code.replace(
  /<\/KeyboardAvoidingView>/,
  "</KeyboardAvoidingView>" // Just to check
);

// Actually, let's just find the closing tag and the opening tag and fix them.
// The opening tag at line 181 is:
// <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#F8FAFC' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
// Wait, is it? Let's check my grep output.

