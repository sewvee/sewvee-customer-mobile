const fs = require('fs');
const file = 'src/screens/NewStitchRequestScreen.js';
let content = fs.readFileSync(file, 'utf8');

const target = `        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressLine} />
          {[1, 2, 3].map(num => (
            <View key={num} style={[styles.progressDot, step >= num && styles.progressDotActive]}>
              <Text style={[styles.progressDotText, step >= num && styles.progressDotTextActive]}>{num}</Text>
            </View>
          ))}
        </View>`;

content = content.replace(target, '');

fs.writeFileSync(file, content);
console.log('Progress bar removed');
