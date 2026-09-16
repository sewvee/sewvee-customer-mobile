const fs = require('fs');
const path = 'src/screens/CustomerChatListScreen.js';
let content = fs.readFileSync(path, 'utf8');

// We need to call fetchThreads inside useFocusEffect
// First, check if useFocusEffect exists and how it's used
content = content.replace(
  /useFocusEffect\(\s*React\.useCallback\(\(\) => \{\s*StatusBar\.setBackgroundColor\('#FFF'\);\s*StatusBar\.setBarStyle\('dark-content'\);\s*\}, \[\]\)\s*\);/,
  `useFocusEffect(
    React.useCallback(() => {
      StatusBar.setBackgroundColor('#FFF');
      StatusBar.setBarStyle('dark-content');
      fetchThreads();
    }, [user])
  );`
);

// We need to move fetchThreads UP so it can be called inside useFocusEffect?
// No, Javascript allows calling functions defined later in the same scope, or we can just redefine it if needed.
// Wait, fetchThreads is defined as const fetchThreads = async () => { ... } which means it's not hoisted!
// Let's change `const fetchThreads = async () => {` to `async function fetchThreads() {` so it's hoisted.

content = content.replace(
  /const fetchThreads = async \(\) => \{/,
  'async function fetchThreads() {'
);

fs.writeFileSync(path, content);
console.log('Patched chat list focus effect!');
