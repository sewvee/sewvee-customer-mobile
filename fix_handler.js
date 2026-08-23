const fs = require('fs');
let code = fs.readFileSync('src/screens/CustomerOrderDetailScreen.js', 'utf8');

const regex = /const handleAnnotateDone = async \(uri\) => \{[\s\S]*?showToast\('Annotation saved', 'success'\);\n    \} catch \(err\) \{[\s\S]*?showToast\('Failed to save annotation', 'error'\);\n    \}\n  \};\n/g;
code = code.replace(regex, "");

fs.writeFileSync('src/screens/CustomerOrderDetailScreen.js', code);
