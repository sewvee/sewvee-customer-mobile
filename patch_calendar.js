const fs = require('fs');
const file = 'src/screens/NewStitchRequestScreen.js';
let content = fs.readFileSync(file, 'utf8');

// Replace import
content = content.replace(
  "import DateTimePicker from '@react-native-community/datetimepicker';",
  "import CalendarModal from '../components/CalendarModal';"
);

// Replace DateTimePicker render
const dtRegex = /\{showDatePicker && \([\s\S]*?\}\n\s*\)\}/;
const replacement = `{showDatePicker && (
        <CalendarModal
          visible={showDatePicker}
          onClose={() => setShowDatePicker(false)}
          onSelect={(date) => {
            const dateObj = new Date(date);
            const formattedDate = dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
            setDeliveryDate(formattedDate);
          }}
          disablePastDates={true}
        />
      )}`;

content = content.replace(dtRegex, replacement);

fs.writeFileSync(file, content);
console.log('Calendar swapped');
