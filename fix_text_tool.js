const fs = require('fs');
let code = fs.readFileSync('src/components/CollageMaker.js', 'utf8');

code = code.replace(
  /onPress=\{\(\) => setActiveTool\('text'\)\}/g,
  `onPress={() => {
    setActiveTool('text');
    setSelectedTextId(null);
    setPendingPos({ x: 100, y: 100 });
    setDraftText('');
    setAddingText(true);
  }}`
);

fs.writeFileSync('src/components/CollageMaker.js', code);
