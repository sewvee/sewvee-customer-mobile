const fs = require('fs');
const path = 'src/screens/CustomerDashboardScreen.js';
let content = fs.readFileSync(path, 'utf8');

// 1. Define infiniteBanners
content = content.replace(
  /const inlineBanners = React\.useMemo\(\(\) => banners\.filter\(b => b\.type !== 'STRIP'\), \[banners\]\);/,
  `const inlineBanners = React.useMemo(() => banners.filter(b => b.type !== 'STRIP'), [banners]);

  const infiniteBanners = React.useMemo(() => {
    if (inlineBanners.length <= 1) return inlineBanners;
    const copies = [];
    for (let i = 0; i < 200; i++) {
      copies.push(...inlineBanners.map((b, idx) => ({ ...b, uniqueId: \`\${b.id}-\${i}-\${idx}\` })));
    }
    return copies;
  }, [inlineBanners]);`
);

// 2. Update useEffect to use infiniteBanners and handle next index safely
content = content.replace(
  /const next = \(prev \+ 1\) % inlineBanners\.length;/,
  `const next = prev + 1;
        if (next >= infiniteBanners.length) return 0;`
);

// 3. Update data={inlineBanners} to data={infiniteBanners}
content = content.replace(
  /data=\{inlineBanners\}/,
  `data={infiniteBanners}`
);

// 4. Update keyExtractor to use uniqueId if available
content = content.replace(
  /keyExtractor=\{item => item\.id\?\.toString\(\) \|\| Math\.random\(\)\.toString\(\)\}/,
  `keyExtractor={item => item.uniqueId || item.id?.toString() || Math.random().toString()}`
);

// 5. Add handleScrollEnd to sync manual swiping
if (!content.includes('const handleScrollEnd')) {
  content = content.replace(
    /const renderBanner = \(\{ item \}\) => \{/,
    `const handleScrollEnd = (e) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const itemWidth = SCREEN_WIDTH * 0.85 + 16;
    const newIndex = Math.round(offsetX / itemWidth);
    if (newIndex >= 0 && newIndex < infiniteBanners.length) {
      setBannerIndex(newIndex);
    }
  };

  const renderBanner = ({ item }) => {`
  );
  
  // Attach onMomentumScrollEnd
  content = content.replace(
    /renderItem=\{renderBanner\}/,
    `renderItem={renderBanner}
              onMomentumScrollEnd={handleScrollEnd}`
  );
}

fs.writeFileSync(path, content);
console.log('Infinite loop patched!');
