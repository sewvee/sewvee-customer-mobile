const fs = require('fs');
const file = 'src/screens/NewStitchRequestScreen.js';
let content = fs.readFileSync(file, 'utf8');

// 1. Remove Accordion State, Add Editing State & DateTimePicker
content = content.replace(
  "const [expandedOutfitId, setExpandedOutfitId] = useState(null);",
  "const [editingOutfitId, setEditingOutfitId] = useState(null);\n  const [showDatePicker, setShowDatePicker] = useState(false);"
);

// 2. Add Modal and DateTimePicker to imports
content = content.replace(
  "TextInput, Image, Alert, Platform, KeyboardAvoidingView,",
  "TextInput, Image, Alert, Platform, KeyboardAvoidingView, Modal,"
);
content = content.replace(
  "import CollageMaker from '../components/CollageMaker';",
  "import CollageMaker from '../components/CollageMaker';\nimport DateTimePicker from '@react-native-community/datetimepicker';"
);

// 3. Remove Progress Bar
const progressBarRegex = /\{\/\* Progress Bar \*\/\}.*?<\/View>\n        <\/View>/s;
content = content.replace(progressBarRegex, "");

// 4. Update Step 1 active color logic
const step1Regex = /\{CATEGORIES\.map\(cat => \(\n\s*<View key=\{cat\} style=\{styles\.categoryCard\}>.*?<\/View>\n\s*\)\)\}/s;
const step1Replacement = `{CATEGORIES.map(cat => {
        const count = categoryCounts[cat] || 0;
        const isActive = count > 0;
        return (
          <View key={cat} style={[styles.categoryCard, isActive && styles.categoryCardActive]}>
            <Text style={[styles.categoryName, isActive && styles.categoryNameActive]}>{cat}</Text>
            <View style={styles.counterBox}>
              <TouchableOpacity style={[styles.counterBtn, isActive && styles.counterBtnActive]} onPress={() => updateCount(cat, -1)}>
                <Minus size={16} color={isActive ? "#5B43EE" : "#64748B"} />
              </TouchableOpacity>
              <Text style={styles.counterText}>{count}</Text>
              <TouchableOpacity style={[styles.counterBtn, isActive && styles.counterBtnActive]} onPress={() => updateCount(cat, 1)}>
                <Plus size={16} color={isActive ? "#5B43EE" : "#64748B"} />
              </TouchableOpacity>
            </View>
          </View>
        );
      })}`;
content = content.replace(step1Regex, step1Replacement);

// 5. Rewrite Step 2 (Cards instead of Accordion)
const step2Regex = /const renderStep2 = \(\) => \(\n.*?<CollageMaker/s;
const step2Replacement = `const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Configure Outfits</Text>
      <Text style={styles.stepSubtitle}>Tap each outfit to provide design references, details, and measurements.</Text>
      
      {outfits.map((outfit, index) => (
        <TouchableOpacity 
          key={outfit.id} 
          style={styles.outfitDrawerCard} 
          onPress={() => setEditingOutfitId(outfit.id)}
        >
          <View style={styles.accordionHeaderLeft}>
            <View style={styles.accordionIndexCircle}>
              <Text style={styles.accordionIndexText}>{index + 1}</Text>
            </View>
            <View>
              <Text style={styles.outfitTitle}>{outfit.name}</Text>
              <Text style={styles.outfitSubtitle}>Tap to add details</Text>
            </View>
          </View>
          <ChevronRight size={20} color="#CBD5E1" />
        </TouchableOpacity>
      ))}
      
      <CollageMaker`;
content = content.replace(step2Regex, step2Replacement);

// 6. Step 3 - Add Terms and Conditions & DateTimePicker
const step3Regex = /const renderStep3 = \(\) => \(\n.*?<\/View>\n  \);/s;
const step3Replacement = `const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Final Details</Text>
      
      <Text style={styles.fieldLabel}>Preferred Delivery Date (Optional)</Text>
      <TouchableOpacity 
        style={styles.dateInputWrapper}
        onPress={() => setShowDatePicker(true)}
      >
        <Calendar size={20} color="#64748B" style={{ marginRight: 10 }} />
        <Text style={[styles.dateInput, !deliveryDate && { color: '#94A3B8' }]}>
          {deliveryDate || 'e.g. 15th October'}
        </Text>
      </TouchableOpacity>
      
      {showDatePicker && (
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
      )}
      
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Order Summary</Text>
        <Text style={styles.summaryText}>Total Outfits: {outfits.length}</Text>
        <Text style={styles.summaryText}>Boutique: {boutiqueName}</Text>
      </View>
      
      {selectedBoutique?.terms_and_conditions ? (
        <View style={styles.termsCard}>
          <Text style={styles.termsTitle}>Terms & Conditions</Text>
          <Text style={styles.termsText}>{selectedBoutique.terms_and_conditions}</Text>
        </View>
      ) : null}
    </View>
  );`;
content = content.replace(step3Regex, step3Replacement);

// 7. Add Modal to root render
const editingOutfit = "const activeOutfit = outfits.find(o => o.id === editingOutfitId);";
const rootRenderRegex = /<ScrollView style=\{\{ flex: 1 \}\} contentContainerStyle=\{styles\.scrollContent\}>.*?<\/ScrollView>/s;
const rootRenderReplacement = `<ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent}>
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
        </ScrollView>

        {/* OUTFIT CONFIGURATION DRAWER (BOTTOM SHEET) */}
        <Modal
          visible={!!editingOutfitId}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setEditingOutfitId(null)}
        >
          <View style={styles.modalOverlay}>
            <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setEditingOutfitId(null)} />
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalContainer}>
              {(() => {
                const activeOutfit = outfits.find(o => o.id === editingOutfitId);
                if (!activeOutfit) return null;
                return (
                  <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                      <Text style={styles.modalTitle}>{activeOutfit.name}</Text>
                      <TouchableOpacity onPress={() => setEditingOutfitId(null)} style={styles.closeBtn}>
                        <X size={24} color="#0F172A" />
                      </TouchableOpacity>
                    </View>
                    <ScrollView style={styles.modalScroll} contentContainerStyle={{ paddingBottom: 40 }}>
                      
                      {/* 1. Build a Collage */}
                      <View style={styles.dashedBox}>
                        <View style={styles.iconCircle}>
                          <ImageIconLucide size={24} color="#5B43EE" />
                        </View>
                        <Text style={styles.boxTitle}>Build a Collage</Text>
                        <Text style={styles.boxSubtitle}>Combine your fabric photos with design references in one image.</Text>
                        <TouchableOpacity 
                          style={styles.btnCollage}
                          onPress={() => {
                            setActiveCollageOutfitId(activeOutfit.id);
                            setCollageMakerVisible(true);
                          }}
                        >
                          <Text style={styles.btnCollageText}>Open Collage Maker</Text>
                        </TouchableOpacity>
                        
                        {activeOutfit.collageUrl && (
                          <View style={{marginTop: 12, position: 'relative'}}>
                            <Image source={{uri: activeOutfit.collageUrl}} style={{width: '100%', height: 150, borderRadius: 8}} resizeMode="cover" />
                            <TouchableOpacity 
                              style={styles.removeImageBtn} 
                              onPress={() => updateOutfit(activeOutfit.id, 'collageUrl', null)}
                            >
                              <X size={12} color="#FFF" />
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>

                      {/* 2. Description & Voice Note */}
                      <Text style={styles.sectionHeading}>2. Description & Voice Note</Text>
                      <TextInput
                        style={styles.textArea}
                        multiline
                        numberOfLines={4}
                        placeholder="Describe your design, specific requirements, fabric details..."
                        value={activeOutfit.description}
                        onChangeText={(text) => updateOutfit(activeOutfit.id, 'description', text)}
                        textAlignVertical="top"
                      />
                      
                      <Text style={styles.orText}>Or record a voice note</Text>
                      <TouchableOpacity 
                        style={styles.btnVoiceNote}
                        onPress={() => Alert.alert('Coming Soon', 'Voice recording will be available in the next app update.')}
                      >
                        <Mic size={18} color="#5B43EE" style={{marginRight: 8}} />
                        <Text style={styles.btnVoiceNoteText}>Record Voice Note</Text>
                      </TouchableOpacity>

                      {/* 3. Measurement Option */}
                      <Text style={styles.sectionHeading}>3. Measurement Option</Text>
                      {MEASUREMENT_OPTIONS.map(opt => {
                        const isActive = activeOutfit.measurement === opt;
                        return (
                          <TouchableOpacity
                            key={opt}
                            style={[styles.measurementOptionBox, isActive && styles.measurementOptionBoxActive]}
                            onPress={() => updateOutfit(activeOutfit.id, 'measurement', opt)}
                          >
                            <View style={styles.measurementOptionHeader}>
                              <Text style={[styles.measurementOptionText, isActive && styles.measurementOptionTextActive]}>{opt}</Text>
                              {isActive && <CheckCircle2 size={20} color="#5B43EE" />}
                            </View>
                            
                            {isActive && opt === 'Use Previous Measurements' && (
                              <View style={styles.subInputBox}>
                                <Text style={styles.subInputText}>Tap to select an order...</Text>
                              </View>
                            )}
                          </TouchableOpacity>
                        );
                      })}

                      <TouchableOpacity style={styles.btnSaveDrawer} onPress={() => setEditingOutfitId(null)}>
                        <Text style={styles.btnSaveDrawerText}>Done</Text>
                      </TouchableOpacity>

                    </ScrollView>
                  </View>
                );
              })()}
            </KeyboardAvoidingView>
          </View>
        </Modal>`;
content = content.replace(rootRenderRegex, rootRenderReplacement);


// 8. Add styles
const endTarget = "});\n\nexport default NewStitchRequestScreen;";
const endReplacement = `  categoryCardActive: { borderColor: '#5B43EE', backgroundColor: '#EEF2FF' },
  categoryNameActive: { color: '#5B43EE' },
  counterBtnActive: { borderColor: '#5B43EE', backgroundColor: '#FFF' },
  outfitDrawerCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E2E8F0',
    borderRadius: 16, marginBottom: 16,
  },
  
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject },
  modalContainer: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%' },
  modalContent: { padding: 20, flexShrink: 1 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontFamily: 'Inter-Bold', color: '#0F172A' },
  closeBtn: { padding: 4 },
  modalScroll: { flexGrow: 0 },
  btnSaveDrawer: {
    backgroundColor: '#5B43EE', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 20
  },
  btnSaveDrawerText: { fontSize: 16, fontFamily: 'Inter-Bold', color: '#FFF' },
  
  termsCard: { marginTop: 24, padding: 16, backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  termsTitle: { fontSize: 14, fontFamily: 'Inter-Bold', color: '#475569', marginBottom: 8 },
  termsText: { fontSize: 13, fontFamily: 'Inter-Medium', color: '#64748B', lineHeight: 20 },
});

export default NewStitchRequestScreen;`;
content = content.replace(endTarget, endReplacement);

fs.writeFileSync(file, content);
console.log('Stitch Request updated with drawer, active states, calendar and terms');
