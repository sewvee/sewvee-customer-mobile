const fs = require('fs');
const path = 'src/screens/CustomerDashboardScreen.js';
let code = fs.readFileSync(path, 'utf8');

const oldCondition = `(outfit.requestedPhotosFromClient === true || outfit.requestedPhotosFromClient === 'true' || outfit.requestedPhotosFromClient === 1 || String(outfit.requestedPhotosFromClient) === '1' || outfit.requested_photos_from_client === true || outfit.requested_photos_from_client === 'true' || outfit.requested_photos_from_client === 1 || String(outfit.requested_photos_from_client) === '1')`;

const newCondition = `((outfit.requestedPhotosFromClient && outfit.requestedPhotosFromClient !== '0' && outfit.requestedPhotosFromClient !== 'false' && outfit.requestedPhotosFromClient !== 0) || (outfit.requested_photos_from_client && outfit.requested_photos_from_client !== '0' && outfit.requested_photos_from_client !== 'false' && outfit.requested_photos_from_client !== 0))`;

code = code.replace(oldCondition, newCondition);
fs.writeFileSync(path, code);
