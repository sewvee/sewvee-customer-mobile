const { Jimp } = require('jimp');
const fs = require('fs');

async function processIcons() {
  const sizes = [
    { dir: 'mipmap-mdpi', out: 'drawable-mdpi' },
    { dir: 'mipmap-hdpi', out: 'drawable-hdpi' },
    { dir: 'mipmap-xhdpi', out: 'drawable-xhdpi' },
    { dir: 'mipmap-xxhdpi', out: 'drawable-xxhdpi' },
    { dir: 'mipmap-xxxhdpi', out: 'drawable-xxxhdpi' }
  ];

  for (const size of sizes) {
    const inPath = `../android/app/src/main/res/${size.dir}/ic_launcher_foreground.png`;
    const outDir = `../android/app/src/main/res/${size.out}`;
    const outPath = `${outDir}/ic_notification.png`;

    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    if (fs.existsSync(inPath)) {
      try {
        const image = await Jimp.read(inPath);
        
        image.scan(0, 0, image.bitmap.width, image.bitmap.height, function(x, y, idx) {
          const alpha = this.bitmap.data[idx + 3];
          
          if (alpha > 0) {
            // Make it solid white but preserve alpha
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
    } else {
      console.log(`Missing ${inPath}`);
    }
  }
}

processIcons();
