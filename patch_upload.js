const fs = require('fs');
let code = fs.readFileSync('src/store/uploadSlice.js', 'utf8');

code = code.replace(
  /const response = await axios\.post\(URL_UPLOAD, formData, \{[\s\S]*?\}\);/,
  `const response = await axios.post(URL_UPLOAD, formData, {
                headers: {
                    'accept': '*/*',
                    'Authorization': formattedToken,
                },
                transformRequest: [(data) => data]
            });`
);

fs.writeFileSync('src/store/uploadSlice.js', code);
