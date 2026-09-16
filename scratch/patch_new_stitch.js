const fs = require('fs');

let content = fs.readFileSync('src/screens/NewStitchRequestScreen.js', 'utf8');

// Import useToast
if (!content.includes('useToast')) {
  content = content.replace(
    /import \{ useAuth \} from '\.\.\/context\/AuthContext';/,
    "import { useAuth } from '../context/AuthContext';\nimport { useToast } from '../context/ToastContext';"
  );
}

// Add showToast to component
if (!content.includes('const { showToast } = useToast();')) {
  content = content.replace(
    /const \{ user \} = useAuth\(\);/,
    "const { user } = useAuth();\n  const { showToast } = useToast();"
  );
}

// Replace Alert.alert('Success', 'Stitch Request Sent Successfully!');
content = content.replace(
  /Alert\.alert\('Success', 'Stitch Request Sent Successfully!'\);/,
  "showToast('Stitch Request Sent Successfully!', 'success');"
);

// Replace Alert.alert('Error', 'Failed to submit request');
content = content.replace(
  /Alert\.alert\('Error', 'Failed to submit request'\);/,
  "showToast('Failed to submit request', 'error');"
);

fs.writeFileSync('src/screens/NewStitchRequestScreen.js', content);
