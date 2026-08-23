const fs = require('fs');
let code = fs.readFileSync('src/components/CollageMaker.js', 'utf8');

// 1. Fix Undo
code = code.replace(
  /const handleUndo = \(\) => \{[\s\S]*?\};\n/m,
  `const handleUndo = () => {
    if (selectedTextId) {
      setTextItems(prev => prev.filter(t => t.id !== selectedTextId));
      setSelectedTextId(null);
      return;
    }
    if (paths.length > 0) {
      setPaths(prev => prev.slice(0, -1));
    } else if (textItems.length > 0) {
      setTextItems(prev => prev.slice(0, -1));
    }
  };
`
);

// 2. Fix Text Tap Overlay
code = code.replace(
  /\{\/\* Annotations Overlay \*\/\}[\s\S]*?<Svg/m,
  `{/* Annotations Overlay */}
            {activeTool === 'marker' && (
              <View style={StyleSheet.absoluteFill} {...canvasPan.panHandlers} />
            )}
            {activeTool === 'text' && (
              <TouchableOpacity
                activeOpacity={1}
                style={StyleSheet.absoluteFill}
                onPress={(e) => {
                  const { locationX: x, locationY: y } = e.nativeEvent;
                  setSelectedTextId(null);
                  setPendingPos({ x, y });
                  setDraftText('');
                  setAddingText(true);
                }}
              />
            )}
            <Svg`
);

// 3. Fix makeTextPan synchronous ox/oy
// We need to insert textItemsRef
code = code.replace(
  /const panRefs = useRef\(\{\}\);/m,
  `const panRefs = useRef({});
  const textItemsRef = useRef(textItems);
  textItemsRef.current = textItems;`
);

// Replace the whole makeTextPan block
code = code.replace(
  /const makeTextPan = useCallback\(\(id\) => \{[\s\S]*?\}, \[activeTool\]\);/m,
  `const makeTextPan = useCallback((id) => {
    if (!panRefs.current[id]) {
      let ox = 0, oy = 0;
      panRefs.current[id] = PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          setSelectedTextId(id);
          if (activeTool !== 'text') setActiveTool('text');
          const item = textItemsRef.current.find(t => t.id === id);
          if (item) {
            ox = item.x;
            oy = item.y;
          }
        },
        onPanResponderMove: (e, g) => {
          setTextItems(prev => prev.map(t => t.id === id ? { ...t, x: ox + g.dx, y: oy + g.dy } : t));
        },
        onPanResponderRelease: (e, g) => {
          if (Math.abs(g.dx) < 5 && Math.abs(g.dy) < 5) {
            const item = textItemsRef.current.find(t => t.id === id);
            if (item) {
              setDraftText(item.text);
              setTextColor(item.color);
              setFontSize(item.fontSize);
              setEditingTextId(id);
              setAddingText(true);
            }
          }
        },
      });
    }
    return panRefs.current[id].panHandlers;
  }, [activeTool]);`
);

fs.writeFileSync('src/components/CollageMaker.js', code);
