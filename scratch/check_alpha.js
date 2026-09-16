const { Jimp } = require('jimp');

async function check() {
  const inPath = '/Users/bhuvan/.gemini/antigravity/brain/6f0412b5-fcb9-4753-851f-a1146da9d6c3/.user_uploaded/media_1789553607520.png';
  const image = await Jimp.read(inPath);
  
  let opaqueCount = 0;
  let transparentCount = 0;
  let semiCount = 0;

  image.scan(0, 0, image.bitmap.width, image.bitmap.height, function(x, y, idx) {
    const alpha = this.bitmap.data[idx + 3];
    if (alpha === 255) opaqueCount++;
    else if (alpha === 0) transparentCount++;
    else semiCount++;
  });
  
  console.log({ opaqueCount, transparentCount, semiCount, total: image.bitmap.width * image.bitmap.height });
}

check();
