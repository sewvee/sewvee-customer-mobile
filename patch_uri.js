const fs = require('fs');
let code = fs.readFileSync('src/screens/CustomerOrderDetailScreen.js', 'utf8');

code = code.replace(
  /const handleSaveCollage = async \(uri\) => \{[\s\S]*?setLoading\(true\);/m,
  `const handleSaveCollage = async (uri) => {
    setShowCollageMaker(false);
    setUploadingOutfitId(collageOutfitId);
    setLoading(true);
    
    // Ensure URI is properly formatted for React Native FormData
    const fileUri = Platform.OS === 'android' && !uri.startsWith('file://') ? 'file://' + uri : uri;
`
);

// We need to replace `uri: uri,` with `uri: fileUri,` in the uploadImageAction payload
code = code.replace(
  /uri: uri,/g,
  `uri: fileUri,`
);

fs.writeFileSync('src/screens/CustomerOrderDetailScreen.js', code);
