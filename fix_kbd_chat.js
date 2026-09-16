const fs = require('fs');
const path = 'src/screens/CustomerChatScreen.js';
let content = fs.readFileSync(path, 'utf8');

// Define KeyboardView
if (!content.includes('const KeyboardView =')) {
    content = content.replace("import { Colors }", "const KeyboardView = Platform.OS === 'ios' ? KeyboardAvoidingView : View;\nimport { Colors }");
}

// Replace KeyboardAvoidingView tags
content = content.replace(/<KeyboardAvoidingView/g, '<KeyboardView');
content = content.replace(/<\/KeyboardAvoidingView>/g, '</KeyboardView>');

fs.writeFileSync(path, content);
console.log("Fixed KeyboardAvoidingView in CustomerChatScreen");
