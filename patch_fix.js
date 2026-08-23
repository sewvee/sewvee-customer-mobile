const fs = require('fs');
const path = 'src/screens/CustomerDashboardScreen.js';
let code = fs.readFileSync(path, 'utf8');

const pendingRequestsCode = `
  // Check if there are any active upload requests
  const pendingRequests = React.useMemo(() => {
    const requests = [];
    customerOrders.forEach(order => {
      if (order.status === 'Cancelled' || order.status === 'Delivered' || order.order_type === 'SALE_ORDER') return;
      const outfits = order.outfits || order.items || [];
      outfits.forEach(outfit => {
        const reqFlag = outfit.requestedPhotosFromClient ?? outfit.requested_photos_from_client;
        const isRequested = reqFlag && reqFlag !== '0' && reqFlag !== 'false' && reqFlag !== 0;
        if (isRequested && (!outfit.photos || outfit.photos.filter(p => p.category === 'REFERENCE').length === 0)) {
          requests.push({
            orderId: order.id,
            billNo: order.billNo || order.id,
            outfitName: outfit.name || outfit.type || 'Outfit',
            outfitId: outfit.id
          });
        }
      });
    });
    return requests;
  }, [customerOrders]);
`;

code = code.replace(
  /const metrics = React\.useMemo\(\(\) => \{/,
  pendingRequestsCode + '\n  const metrics = React.useMemo(() => {'
);

fs.writeFileSync(path, code);
