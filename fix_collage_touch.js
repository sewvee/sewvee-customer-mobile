const fs = require('fs');
let code = fs.readFileSync('src/components/CollageMaker.js', 'utf8');

// 1. Remove the old touch interceptor from outside ViewShot
code = code.replace(
  /\{\/\* Touch Interceptor for Drawing\/Text mode \*\/\}[\s\S]*?\{\(activeTool !== 'select'\) && \([\s\S]*?<\/View>\s*\)\}/,
  ""
);

// We must use a simpler regex because the activeTool condition might be formatted differently
code = code.replace(
  /\{\/\* Touch Interceptor for Drawing\/Text mode \*\/\}[\s\S]*?<\/View>\s*\)\}/,
  ""
);

// 2. Insert the touch interceptor inside ViewShot, right before textItems
code = code.replace(
  /\{\/\* Annotations Overlay \*\/\}[\s\S]*?<Svg/,
  `{/* Annotations Overlay */}
            {activeTool !== 'select' && (
              <View style={StyleSheet.absoluteFill} {...(activeTool === 'marker' ? canvasPan.panHandlers : textTapPan.panHandlers)} />
            )}
            <Svg`
);

// 3. Fix the Undo logic to always pop whatever was last added. Wait, the user said Undo wasn't working.
// Let's change handleUndo to:
code = code.replace(
  /const handleUndo = \(\) => \{[\s\S]*?\};/,
  `const handleUndo = () => {
    if (activeTool === 'marker') {
      setPaths(prev => prev.slice(0, -1));
    } else if (activeTool === 'text') {
      setTextItems(prev => prev.slice(0, -1));
    } else {
      // if select tool is active, maybe undo the last added thing?
      if (paths.length > 0) setPaths(prev => prev.slice(0, -1));
      else if (textItems.length > 0) setTextItems(prev => prev.slice(0, -1));
    }
  };`
);

fs.writeFileSync('src/components/CollageMaker.js', code);
