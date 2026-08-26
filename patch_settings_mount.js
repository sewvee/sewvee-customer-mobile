const fs = require('fs');
const file = '/Users/bhuvan/Documents/Bhuvan/Products/sewvee-customer-web/src/app/(app)/profile/settings/page.tsx';
let content = fs.readFileSync(file, 'utf8');

const importStr = "import React, { useState, useEffect } from 'react';";
content = content.replace("import React, { useState } from 'react';", importStr);

const useEffectStr = `
  useEffect(() => {
    async function syncProfile() {
      try {
        const res = await api.get('/customer-auth/profile');
        if (res.data?.success && res.data?.customer) {
          setUser({ ...user, ...res.data.customer });
        }
      } catch (err) {
        // ignore errors silently for sync
      }
    }
    syncProfile();
  }, []);
`;

content = content.replace("  const API_DOMAIN =", useEffectStr + "\n  const API_DOMAIN =");

fs.writeFileSync(file, content);
