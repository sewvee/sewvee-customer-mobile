const fs = require('fs');
const screenPath = 'src/screens/CustomerOrderDetailScreen.js';
const tabPath = 'src/components/CustomerRequestsTab.js';

// 1. Update CustomerOrderDetailScreen.js to pass refreshData
let screenContent = fs.readFileSync(screenPath, 'utf8');
screenContent = screenContent.replace(
  '<CustomerRequestsTab order={order} />',
  '<CustomerRequestsTab order={order} onUpdateStatus={refreshData} />'
);
fs.writeFileSync(screenPath, screenContent);

// 2. Update CustomerRequestsTab.js to call onUpdateStatus when reading
let tabContent = fs.readFileSync(tabPath, 'utf8');
tabContent = tabContent.replace(
  "fetch(`${API_DOMAIN}/mobile/customer-portal/orders/${order.id}/outfits/${outfit.id}/requests/read`, { method: 'POST', headers: { 'Authorization': getToken() } }).then(() => fetchRequests()).catch(e => console.log(e));",
  "fetch(`${API_DOMAIN}/mobile/customer-portal/orders/${order.id}/outfits/${outfit.id}/requests/read`, { method: 'POST', headers: { 'Authorization': getToken() } }).then(() => { fetchRequests(); if (onUpdateStatus) onUpdateStatus(); }).catch(e => console.log(e));"
);
fs.writeFileSync(tabPath, tabContent);

console.log("Patched Customer App successfully");
