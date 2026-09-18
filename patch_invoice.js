const fs = require('fs');
const path = 'src/screens/InvoicePreviewScreen.js';
let content = fs.readFileSync(path, 'utf8');

const oldCode = `    setLoadingOrder(true);
    dispatch(getOrderByIdAction(routeOrderId))
      .unwrap()
      .then((response) => {
        if (isMounted) {
          setLatestOrder(response || route.params?.order || null);
        }
      })
      .catch(() => {
        if (isMounted) {
          setLatestOrder(route.params?.order || null);
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoadingOrder(false);
        }
      });`;

const newCode = `    if (isCustomerPortal) {
      if (isMounted) {
        setLatestOrder(route.params?.order || null);
        setLoadingOrder(false);
      }
      return () => {
        isMounted = false;
      };
    }

    setLoadingOrder(true);
    dispatch(getOrderByIdAction(routeOrderId))
      .unwrap()
      .then((response) => {
        if (isMounted) {
          setLatestOrder(response || route.params?.order || null);
        }
      })
      .catch(() => {
        if (isMounted) {
          setLatestOrder(route.params?.order || null);
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoadingOrder(false);
        }
      });`;

content = content.replace(oldCode, newCode);
fs.writeFileSync(path, content);
console.log('Patched InvoicePreviewScreen.js');
