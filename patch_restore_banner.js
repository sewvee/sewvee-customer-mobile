const fs = require('fs');
const path = 'src/screens/CustomerDashboardScreen.js';
let code = fs.readFileSync(path, 'utf8');

// 1. Add pendingRequests memo
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

if (!code.includes('const pendingRequests = React.useMemo')) {
  code = code.replace(
    /const customerOrders = React\.useMemo\(\(\) => \{[\s\S]*?\}, \[orders\]\);/,
    `$&` + '\n' + pendingRequestsCode
  );
}

// 2. Add JSX block above "Your Active Orders"
const jsxBlock = `
        {/* ACTIVE REQUESTS ALERT */}
        {pendingRequests.map((req, idx) => (
          <TouchableOpacity
            key={\`\${req.orderId}-\${req.outfitId}-\${idx}\`}
            style={styles.requestAlert}
            activeOpacity={0.9}
            onPress={() => navigation.navigate('CustomerOrderDetail', { orderId: req.orderId })}
          >
            <View style={styles.requestAlertIconBg}>
              <Camera size={22} color="#F97316" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.alertTitle}>Photo Request</Text>
              <Text style={styles.alertSubtitle}>
                Boutique requested reference photos for your {req.outfitName} in Order #{req.billNo}.
              </Text>
            </View>
            <View style={styles.requestAlertActionBtn}>
              <Text style={styles.requestAlertActionText}>Upload</Text>
              <ChevronRight size={14} color="#F97316" strokeWidth={3} />
            </View>
          </TouchableOpacity>
        ))}
`;

if (!code.includes('ACTIVE REQUESTS ALERT')) {
  code = code.replace(
    /\{\/\* ORDERS SECTION \*\/\}/,
    jsxBlock + '\n        {/* ORDERS SECTION */}'
  );
}

fs.writeFileSync(path, code);
