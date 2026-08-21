const fs = require('fs');
const path = '/Users/bhuvan/Documents/Bhuvan/Products/Sewvee-Customer-Mobile/src/screens/CustomerDashboardScreen.js';
let code = fs.readFileSync(path, 'utf8');

// 1. Remove pendingRequests useMemo
const useMemoStart = code.indexOf('  // Check if there are any active upload requests');
const metricsStart = code.indexOf('  // Metrics');
if (useMemoStart !== -1 && metricsStart !== -1) {
    code = code.substring(0, useMemoStart) + code.substring(metricsStart);
}

// 2. Remove the JSX block
const jsxStart = code.indexOf('        {/* ACTIVE REQUESTS ALERT */}');
const ordersSectionStart = code.indexOf('        {/* ORDERS SECTION */}');
if (jsxStart !== -1 && ordersSectionStart !== -1) {
    code = code.substring(0, jsxStart) + code.substring(ordersSectionStart);
}

fs.writeFileSync(path, code);
console.log("Photo request banner removed.");
