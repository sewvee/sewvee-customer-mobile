const fs = require('fs');
const path = 'src/screens/CustomerChatScreen.js';
let content = fs.readFileSync(path, 'utf8');

const attachMenuClosingSearch = `          </View>
        </View>
      </Modal>

      {/* Collage Maker */}`;

const attachMenuClosingReplace = `            </View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>

      {/* Collage Maker */}`;

content = content.replace(attachMenuClosingSearch, attachMenuClosingReplace);
fs.writeFileSync(path, content);
console.log("Fixed attach menu closing tags!");
