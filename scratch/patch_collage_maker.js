const fs = require('fs');
let content = fs.readFileSync('src/components/CollageMaker.js', 'utf8');

// Fix 1: Crop logic
// Find handleGlobalCrop
const handleGlobalCropRegex = /const handleGlobalCrop = async \(\) => \{[\s\S]*?\.catch\(e => console\.log\('Crop cancelled', e\)\);\n  \};/m;
const newHandleGlobalCrop = `const handleGlobalCrop = async () => {
    let slotToCrop = activeSlot;
    if (slotToCrop == null || !images[slotToCrop]) {
      const firstSlot = Object.keys(images).find(k => images[k]);
      if (firstSlot) slotToCrop = firstSlot;
    }
    if (!slotToCrop || !images[slotToCrop]) {
      showToast("Please select or add a photo to crop first", "error");
      return;
    }
    let sourcePath = originalImages[slotToCrop] || images[slotToCrop];

    if (sourcePath && sourcePath.startsWith('http')) {
      try {
        const localPath = \`\${RNFS.CachesDirectoryPath}/temp_crop_\${Date.now()}.jpg\`;
        await RNFS.downloadFile({ fromUrl: sourcePath, toFile: localPath }).promise;
        sourcePath = Platform.OS === 'android' ? \`file://\${localPath}\` : localPath;
      } catch (err) {
        showToast("Failed to download image for cropping", "error");
        return;
      }
    } else if (Platform.OS === 'android' && sourcePath && !sourcePath.startsWith('file://') && !sourcePath.startsWith('content://')) {
      sourcePath = 'file://' + sourcePath;
    }

    setTimeout(() => {
      ImageCropPicker.openCropper({ path: sourcePath, freeStyleCropEnabled: true, cropperToolbarTitle: 'Crop Photo' })
        .then(img => {
          setImages(prev => ({ ...prev, [slotToCrop]: img.path }));
          setActiveSlot(slotToCrop);
        })
        .catch(e => console.log('Crop cancelled', e));
    }, 100);
  };`;

content = content.replace(handleGlobalCropRegex, newHandleGlobalCrop);

// Fix 2: Text input overlay
// Find the text input overlay
const textInputOverlayRegex = /\{\/\* Text input overlay \*\/\}\n\s*\{addingText && \(\n\s*<KeyboardAvoidingView behavior=\{Platform\.OS === 'ios' \? 'padding' : 'height'\} style=\{s\.overlay\}>\n\s*<TouchableOpacity style=\{\{ flex: 1 \}\} activeOpacity=\{1\} onPress=\{\(\) => setAddingText\(false\)\} \/>\n\s*<View style=\{s\.inputCard\}>\n\s*<Text style=\{s\.inputTitle\}>Add Text Annotation<\/Text>\n\s*<TextInput\n\s*style=\{\[s\.inputField, \{ color: textColor, borderColor: textColor \}\]\}\n\s*placeholder="Type your annotation\.\.\."\n\s*placeholderTextColor="#475569"\n\s*value=\{draftText\}\n\s*onChangeText=\{setDraftText\}\n\s*autoFocus\n\s*multiline\n\s*maxLength=\{120\}\n\s*\/>\n\s*<View style=\{\{ flexDirection: 'row', gap: 12, marginTop: 14 \}\}>\n\s*<TouchableOpacity style=\{s\.cancelTextBtn\} onPress=\{\(\) => setAddingText\(false\)\}>\n\s*<Text style=\{\{ color: '#94A3B8', fontFamily: 'Inter-SemiBold', fontSize: 14 \}\}>Cancel<\/Text>\n\s*<\/TouchableOpacity>\n\s*<TouchableOpacity style=\{s\.placeBtn\} onPress=\{confirmText\}>\n\s*<Check size=\{15\} color="#fff" \/>\n\s*<Text style=\{\{ color: '#fff', fontFamily: 'Inter-Bold', fontSize: 14, marginLeft: 6 \}\}>Place<\/Text>\n\s*<\/TouchableOpacity>\n\s*<\/View>\n\s*<\/View>\n\s*<\/KeyboardAvoidingView>\n\s*\)\}/m;

const newTextInputOverlay = `{/* Text input overlay */}
      <Modal visible={addingText} transparent animationType="slide" onRequestClose={() => setAddingText(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setAddingText(false)} />
          <View style={s.inputCard}>
            <Text style={s.inputTitle}>Add Text Annotation</Text>
            <TextInput
              style={[s.inputField, { color: textColor, borderColor: textColor }]}
              placeholder="Type your annotation..."
              placeholderTextColor="#475569"
              value={draftText}
              onChangeText={setDraftText}
              autoFocus
              multiline
              maxLength={120}
            />
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 14 }}>
              <TouchableOpacity style={s.cancelTextBtn} onPress={() => setAddingText(false)}>
                <Text style={{ color: '#94A3B8', fontFamily: 'Inter-SemiBold', fontSize: 14 }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.placeBtn} onPress={confirmText}>
                <Check size={15} color="#fff" />
                <Text style={{ color: '#fff', fontFamily: 'Inter-Bold', fontSize: 14, marginLeft: 6 }}>Place</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>`;

content = content.replace(textInputOverlayRegex, newTextInputOverlay);

fs.writeFileSync('src/components/CollageMaker.js', content);
