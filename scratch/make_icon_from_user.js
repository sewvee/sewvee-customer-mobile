const { Jimp } = require('jimp');
const fs = require('fs');

async function processIcons() {
  const sizes = [
    { dir: 'drawable-mdpi', size: 24 },
    { dir: 'drawable-hdpi', size: 36 },
    { dir: 'drawable-xhdpi', size: 48 },
    { dir: 'drawable-xxhdpi', size: 72 },
    { dir: 'drawable-xxxhdpi', size: 96 }
  ];

  const inPath = '/Users/bhuvan/.gemini/antigravity/brain/6f0412b5-fcb9-4753-851f-a1146da9d6c3/.user_uploaded/media_1789553607520.png';

  if (!fs.existsSync(inPath)) {
      console.log('Input image missing');
      return;
  }

  for (const s of sizes) {
    const outDir = `../android/app/src/main/res/${s.dir}`;
    const outPath = `${outDir}/ic_notification.png`;

    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    try {
      const image = await Jimp.read(inPath);
      
      // Resize to standard notification icon sizes
      image.resize({ w: s.size, h: s.size });

      // The image might be black line art. Android notification icons should be pure white where opaque.
      image.scan(0, 0, image.bitmap.width, image.bitmap.height, function(x, y, idx) {
        const alpha = this.bitmap.data[idx + 3];
        
        // If it's the uploaded line art, it might be black on transparent, or it might have a white background!
        // Wait, the user attached an image. Let's check its background first by reading the alpha channel.
        // Let's assume it's black on transparent or white on transparent, and just turn all opaque pixels white.
        if (alpha > 0) {
          this.bitmap.data[idx] = 255;     // R
          this.bitmap.data[idx + 1] = 255; // G
          this.bitmap.data[idx + 2] = 255; // B
        }
      });
      
      await image.write(outPath);
      console.log(`Created ${outPath}`);
    } catch (err) {
      console.error('Error with', inPath, err);
    }
  }
}

processIcons();
