const fs = require('fs');
let content = fs.readFileSync('src/screens/NewStitchRequestScreen.js', 'utf8');

// Add Keyboard import
content = content.replace(
  /Platform, KeyboardAvoidingView, Modal,/,
  'Platform, KeyboardAvoidingView, Modal, Keyboard,'
);

// Add state
const stateHook = "const [isKeyboardVisible, setKeyboardVisible] = useState(false);\n  useEffect(() => {\n    const showSub = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));\n    const hideSub = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));\n    return () => {\n      showSub.remove();\n      hideSub.remove();\n    };\n  }, []);\n";
content = content.replace(
  /const \[step, setStep\] = useState\(1\);/,
  stateHook + '  const [step, setStep] = useState(1);'
);

// Update onRequestClose
content = content.replace(
  /onRequestClose=\{\(\) => setEditingOutfitId\(null\)\}/g,
  "onRequestClose={() => {\n            if (isKeyboardVisible) {\n              Keyboard.dismiss();\n            } else {\n              setEditingOutfitId(null);\n            }\n          }}"
);

fs.writeFileSync('src/screens/NewStitchRequestScreen.js', content);
