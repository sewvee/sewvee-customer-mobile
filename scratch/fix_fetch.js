const fs = require('fs');

function fixFetch(file) {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(
        /body: JSON\.stringify\(\{ mobile: phone,/g,
        "body: JSON.stringify({ mobile: countryCode === '+91' ? phone : countryCode + phone,"
    );
    content = content.replace(
        /mobile: phone,/g,
        "mobile: countryCode === '+91' ? phone : countryCode + phone,"
    );
    fs.writeFileSync(file, content);
}

fixFetch('src/screens/LoginScreen.js');
fixFetch('src/screens/CustomerSignupScreen.js');
