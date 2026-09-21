const fs = require('fs');

function addPicker(file) {
  let content = fs.readFileSync(file, 'utf8');
  
  const pickerTag = `
      <CountryPickerBottomSheet
          visible={showCountryPicker}
          onClose={() => setShowCountryPicker(false)}
          onSelect={(code) => {
              setCountryCode(code);
              setShowCountryPicker(false);
          }}
      />
  `;
  
  if (!content.includes("<CountryPickerBottomSheet visible")) {
      // Find the last </View> or </SafeAreaView> in the main component.
      // Usually it's right before the final `}` of the component function, or we can just replace `</ScrollView>\n    </View>\n  );\n}`
      
      // For CustomerSignupScreen:
      if (content.includes("</ScrollView>\n    </View>\n  );\n}")) {
          content = content.replace(
              /<\/ScrollView>\n\s*<\/View>\n\s*\);\n\}/,
              `</ScrollView>\n${pickerTag}    </View>\n  );\n}`
          );
      } 
      // For LoginScreen:
      else if (content.includes("</ScrollView>\n      </KeyboardAvoidingView>\n    </SafeAreaView>\n  );\n};")) {
          content = content.replace(
              /<\/ScrollView>\n\s*<\/KeyboardAvoidingView>\n\s*<\/SafeAreaView>\n\s*\);\n\};/,
              `</ScrollView>\n      </KeyboardAvoidingView>\n${pickerTag}    </SafeAreaView>\n  );\n};`
          );
      }
      // General fallback if regex fails
      else if (content.includes("</View>\n  );\n}")) {
          content = content.replace(
              /<\/View>\n\s*\);\n\}/,
              `${pickerTag}    </View>\n  );\n}`
          );
      }
      
      fs.writeFileSync(file, content);
  }
}

addPicker('src/screens/CustomerSignupScreen.js');
addPicker('src/screens/LoginScreen.js');

