const fs = require('fs');
const path = require('path');

const ENV_FILE_PATH = path.join(__dirname, '../src/config/env.js');
const EAS_JSON_PATH = path.join(__dirname, '../eas.json');

let hasError = false;

console.log('🔍 Checking production environment settings...');

if (fs.existsSync(ENV_FILE_PATH)) {
    const envContent = fs.readFileSync(ENV_FILE_PATH, 'utf8');
    
    if (envContent.includes('api-stage.sewvee.com') && !envContent.includes('__DEV__ ? "https://api-stage.sewvee.com"')) {
        console.error('❌ ERROR: Hardcoded staging URL (api-stage.sewvee.com) found in src/config/env.js!');
        hasError = true;
    }
}

if (fs.existsSync(EAS_JSON_PATH)) {
    const easContent = fs.readFileSync(EAS_JSON_PATH, 'utf8');
    
    if (easContent.includes('api-stage.sewvee.com') && easContent.includes('"production"')) {
        console.error('❌ ERROR: Staging URL found in production profile of eas.json!');
        hasError = true;
    }
}

if (hasError) {
    console.error('🛑 BUILD FAILED: Staging endpoints detected in production configuration.');
    process.exit(1);
}

console.log('✅ Environment check passed! No staging URLs found in production configs.');
