const fs = require('fs');

let content = fs.readFileSync('src/screens/CustomerDashboardScreen.js', 'utf8');

content = content.replace(
  /const customerOrders = React\.useMemo\(\(\) => \{\n    if \(\!orders \|\| orders\.length === 0\) return \[\];\n    return \[\.\.\.orders\]\.sort\(\(a, b\) => new Date\(b\.date \|\| b\.createdAt\) - new Date\(a\.date \|\| a\.createdAt\)\)\.slice\(0, 5\);\n  \}, \[orders\]\);/,
  `const customerOrders = React.useMemo(() => {
    if (!orders || orders.length === 0) return [];
    let filtered = orders;
    if (selectedBoutique) {
      filtered = orders.filter(o => String(o.boutiqueId || o.company_id) === String(selectedBoutique.id));
    }
    return [...filtered].sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt)).slice(0, 5);
  }, [orders, selectedBoutique]);`
);

// Also remove "Quick Actions" heading
content = content.replace(
  /<Text style=\{\[styles\.sectionTitle, \{ marginBottom: 16 \}\]\}>Quick Actions<\/Text>/,
  ""
);
content = content.replace(
  /<Text style=\{styles\.sectionTitle\}>Quick Actions<\/Text>/,
  ""
);
content = content.replace(
  /<Text style=\{\[styles\.sectionTitle, \{marginBottom: 16\}\]\}>Quick Actions<\/Text>/,
  ""
);

fs.writeFileSync('src/screens/CustomerDashboardScreen.js', content);
