const fs = require('fs');
const path = './src/screens/CustomerChatScreen.js';
let content = fs.readFileSync(path, 'utf8');

// 1. Get orderId from params
content = content.replace(
  /const \{ boutiqueId, boutiqueName: initBoutiqueName \} = route\.params;/,
  `const { boutiqueId, boutiqueName: initBoutiqueName, orderId: passedOrderId, orderNumber } = route.params;`
);

// 2. Set title to include orderNumber if available
content = content.replace(
  /const \[boutiqueName, setBoutiqueName\] = useState\(initBoutiqueName \|\| 'Boutique Chat'\);/,
  `const [boutiqueName, setBoutiqueName] = useState(initBoutiqueName || 'Boutique Chat');
  const displayTitle = orderNumber ? \`\${boutiqueName} #\${orderNumber}\` : boutiqueName;`
);

content = content.replace(
  /<Text style=\{styles\.headerTitle\}>\{boutiqueName\}<\/Text>/,
  `<Text style={styles.headerTitle}>{displayTitle}</Text>`
);

// 3. Update fetchMessages to use orderId if passed
content = content.replace(
  /const res = await axios\.get\(\`\$\{BASE_URL\}customer-portal\/chat\/\$\{boutiqueId\}\/messages\`, \{\s*params: \{ phone: user\.mobile \},\s*headers: \{ Authorization: token \}\s*\}\);/m,
  `let res;
      if (passedOrderId) {
        res = await axios.get(\`\${BASE_URL}customer-portal/orders/\${passedOrderId}/requests\`, {
          headers: { Authorization: token }
        });
      } else {
        res = await axios.get(\`\${BASE_URL}customer-portal/chat/\${boutiqueId}/messages\`, {
          params: { phone: user.mobile },
          headers: { Authorization: token }
        });
      }`
);

// 4. Update the fallback logic for contextSelected if orderId is passed
content = content.replace(
  /useEffect\(\(\) => \{\s*if \(\!contextSelected && boutiqueOrders\.length > 0\) \{[\s\S]*?\}\s*\}, \[boutiqueOrders, contextSelected\]\);/m,
  `useEffect(() => {
    if (!contextSelected) {
      if (passedOrderId) {
        const order = orders.find(o => o.id?.toString() === passedOrderId?.toString());
        if (order) {
          const outfits = order.outfits || order.items || [];
          if (outfits.length > 0) {
            setContextSelected(\`\${order.id}_\${outfits[0].id || outfits[0].order_outfit_id}\`);
          }
        }
      } else if (boutiqueOrders.length > 0) {
        const order = boutiqueOrders[0];
        const outfits = order.outfits || order.items || [];
        if (outfits.length > 0) {
          setContextSelected(\`\${order.id}_\${outfits[0].id || outfits[0].order_outfit_id}\`);
        }
      }
    }
  }, [boutiqueOrders, contextSelected, passedOrderId, orders]);`
);

fs.writeFileSync(path, content);
console.log('CustomerChatScreen patched.');
