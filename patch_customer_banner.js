const fs = require('fs');
const file = 'src/screens/CustomerDashboardScreen.js';
let content = fs.readFileSync(file, 'utf8');

const replacement = `      .catch((err) => {
        console.warn('Banner fetch error:', err.message);
        // OFFLINE DEMO BYPASS: Show the banner from staging DB
        setBanners([
          {
            id: 24,
            type: "INLINE",
            title: "goog",
            mobile_image_url: "https://sewvee-assets-prod.s3.ap-south-1.amazonaws.com/marketing_banner/cropped_image_1787989908769.jpg",
            bg_color: "#5B43EE",
            target_app: "CUSTOMER_APP"
          }
        ]);
      });`;

content = content.replace(
  /      \.catch\(\(err\) => \{\n        console\.warn\('Banner fetch error:', err\.message\);\n      \}\);/,
  replacement
);

fs.writeFileSync(file, content, 'utf8');
