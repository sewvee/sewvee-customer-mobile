const fs = require('fs');
const file = 'src/screens/NewStitchRequestScreen.js';
let content = fs.readFileSync(file, 'utf8');

// The corrupted block:
const corruptBlock = `    setOutfits(prev => prev.map(o => {
      if (o.id === outfitId) {
        return { ...o, [key]: value };
const removeOutfit = (outfitId) => {
    setOutfits(prev => {
      const outfitToRemove = prev.find(o => o.id === outfitId);
      if (outfitToRemove) {
        updateCount(outfitToRemove.category, -1);
      }
      return prev.filter(o => o.id !== outfitId);
    });
  };
  
        }
      return o;
    }));
  };`;

const fixedBlock = `    setOutfits(prev => prev.map(o => {
      if (o.id === outfitId) {
        return { ...o, [key]: value };
      }
      return o;
    }));
  };

  const removeOutfit = (outfitId) => {
    setOutfits(prev => {
      const outfitToRemove = prev.find(o => o.id === outfitId);
      if (outfitToRemove) {
        updateCount(outfitToRemove.category, -1);
      }
      return prev.filter(o => o.id !== outfitId);
    });
  };`;

content = content.replace(corruptBlock, fixedBlock);

fs.writeFileSync(file, content);
console.log('Fixed removeOutfit syntax block');
