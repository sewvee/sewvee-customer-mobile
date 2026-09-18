const fs = require('fs');
const path = 'src/screens/CustomerDashboardScreen.js';
let content = fs.readFileSync(path, 'utf8');

// 1. Ensure useRef is imported
if (!content.includes('useRef')) {
  content = content.replace(
    /import React, \{ useState, useEffect \} from 'react';/,
    `import React, { useState, useEffect, useRef } from 'react';`
  );
}

// 2. Add ref and state near stripIndex
if (!content.includes('bannerListRef')) {
  content = content.replace(
    /const \[stripIndex, setStripIndex\] = useState\(0\);/,
    `const [stripIndex, setStripIndex] = useState(0);\n  const bannerListRef = useRef(null);\n  const [bannerIndex, setBannerIndex] = useState(0);`
  );
}

// 3. Add useEffect for auto-scroll
if (!content.includes('bannerListRef.current.scrollToIndex')) {
  content = content.replace(
    /useEffect\(\(\) => \{\n    if \(stripBanners\.length <= 1\) return;/,
    `useEffect(() => {
    if (inlineBanners.length <= 1) return;
    const interval = setInterval(() => {
      setBannerIndex(prev => {
        const next = (prev + 1) % inlineBanners.length;
        if (bannerListRef.current) {
          try {
            bannerListRef.current.scrollToIndex({ index: next, animated: true });
          } catch(e) {}
        }
        return next;
      });
    }, 4500);
    return () => clearInterval(interval);
  }, [inlineBanners.length]);

  useEffect(() => {
    if (stripBanners.length <= 1) return;`
  );
}

// 4. Attach ref and getItemLayout to FlatList
content = content.replace(
  /<FlatList\s+horizontal\s+showsHorizontalScrollIndicator=\{false\}\s+data=\{inlineBanners\}/,
  `<FlatList\n              ref={bannerListRef}\n              getItemLayout={(_, index) => ({ length: SCREEN_WIDTH * 0.85 + 16, offset: (SCREEN_WIDTH * 0.85 + 16) * index, index })}\n              horizontal\n              showsHorizontalScrollIndicator={false}\n              data={inlineBanners}`
);

fs.writeFileSync(path, content);
console.log('Banner auto-scroll patched!');
