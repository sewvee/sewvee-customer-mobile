const fs = require('fs');
const file = 'src/screens/NewStitchRequestScreen.js';
let content = fs.readFileSync(file, 'utf8');

const target = `{showDatePicker && (
        <DateTimePicker
          value={new Date()}
          mode="date"
          display="default"
          minimumDate={new Date()}
          onChange={(event, date) => {
            setShowDatePicker(Platform.OS === 'ios');
            if (date) {
              const formattedDate = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
              setDeliveryDate(formattedDate);
            }
          }}
        />
      )}`;

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

content = content.replace(target, replacement);
fs.writeFileSync(file, content);
console.log('Calendar render patched');
