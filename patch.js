const fs = require('fs');
const path = 'src/screens/CustomerDashboardScreen.js';
let code = fs.readFileSync(path, 'utf8');
code = code.replace(
  "outfit.requestedPhotosFromClient === true || outfit.requestedPhotosFromClient === 'true' || outfit.requestedPhotosFromClient === 1 || String(outfit.requestedPhotosFromClient) === '1'",
  "outfit.requestedPhotosFromClient === true || outfit.requestedPhotosFromClient === 'true' || outfit.requestedPhotosFromClient === 1 || String(outfit.requestedPhotosFromClient) === '1' || outfit.requested_photos_from_client === true || outfit.requested_photos_from_client === 'true' || outfit.requested_photos_from_client === 1 || String(outfit.requested_photos_from_client) === '1'"
);
fs.writeFileSync(path, code);
