const fs = require('fs');
const file = '/Users/bhuvan/Documents/Bhuvan/Products/Sewvee-Customer-Mobile/src/screens/CustomerMyProfileScreen.js';
let content = fs.readFileSync(file, 'utf8');

const importStr = "import React, { useState, useEffect } from 'react';";
content = content.replace("import React, { useState } from 'react';", importStr);

const useEffectStr = `
  useEffect(() => {
    async function syncProfile() {
      try {
        const res = await fetch(\`\${API_DOMAIN}/mobile/customer-auth/profile\`, {
          headers: { Authorization: \`Bearer \${userToken}\` }
        });
        const data = await res.json();
        if (data?.success && data?.customer) {
          saveUser({ ...user, ...data.customer });
        }
      } catch (err) {}
    }
    syncProfile();
  }, []);
`;

content = content.replace("  // ── Edit Name/Email modal ──", useEffectStr + "\n  // ── Edit Name/Email modal ──");

fs.writeFileSync(file, content);
