const fs = require('fs');
const file = 'src/screens/NewStitchRequestScreen.js';
let content = fs.readFileSync(file, 'utf8');

// 1. Add state for active accordion and collage maker
const stateTarget = "const [deliveryDate, setDeliveryDate] = useState('');";
const stateReplacement = `const [deliveryDate, setDeliveryDate] = useState('');
  
  // Accordion & Features State
  const [expandedOutfitId, setExpandedOutfitId] = useState(null);
  const [collageMakerVisible, setCollageMakerVisible] = useState(false);
  const [activeCollageOutfitId, setActiveCollageOutfitId] = useState(null);`;

content = content.replace(stateTarget, stateReplacement);

// 2. Add CollageMaker import
const importTarget = "import { URL_UPLOAD, URL_ORDERS } from '../config/env';";
const importReplacement = `import { URL_UPLOAD, URL_ORDERS } from '../config/env';
import CollageMaker from '../components/CollageMaker';`;

content = content.replace(importTarget, importReplacement);

// 3. Add lucide icons for accordion
const iconsTarget = "import { ArrowLeft, Plus, Minus, Camera, ImageIcon, Calendar, X } from 'lucide-react-native';";
const iconsReplacement = "import { ArrowLeft, Plus, Minus, Camera, ImageIcon, Calendar, X, ChevronRight, ChevronDown, Mic, Image as ImageIconLucide, CheckCircle2 } from 'lucide-react-native';";

content = content.replace(iconsTarget, iconsReplacement);

// 4. Update the renderStep2 function to be an accordion
const renderStep2Target = /const renderStep2 = \(\) => \(\n    <View style=\{styles.stepContainer\}>.*?<\/View>\n  \);/s;

const renderStep2Replacement = `const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Configure Outfits</Text>
      <Text style={styles.stepSubtitle}>Tap each outfit to provide design references, details, and measurements.</Text>
      
      {outfits.map((outfit, index) => {
        const isExpanded = expandedOutfitId === outfit.id;
        
        return (
          <View key={outfit.id} style={[styles.outfitCard, isExpanded && styles.outfitCardExpanded]}>
            <TouchableOpacity 
              style={styles.accordionHeader} 
              onPress={() => setExpandedOutfitId(isExpanded ? null : outfit.id)}
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
              {isExpanded ? <ChevronDown size={20} color="#CBD5E1" /> : <ChevronRight size={20} color="#CBD5E1" />}
            </TouchableOpacity>
            
            {isExpanded && (
              <View style={styles.accordionBody}>
                
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
                      setActiveCollageOutfitId(outfit.id);
                      setCollageMakerVisible(true);
                    }}
                  >
                    <Text style={styles.btnCollageText}>Open Collage Maker</Text>
                  </TouchableOpacity>
                  
                  {/* Show collage thumbnail if it exists */}
                  {outfit.collageUrl && (
                    <View style={{marginTop: 12, position: 'relative'}}>
                      <Image source={{uri: outfit.collageUrl}} style={{width: '100%', height: 150, borderRadius: 8}} resizeMode="cover" />
                      <TouchableOpacity 
                        style={styles.removeImageBtn} 
                        onPress={() => updateOutfit(outfit.id, 'collageUrl', null)}
                      >
                        <X size={12} color="#FFF" />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                {/* Legacy Photo Grid (keeping it as backup) */}
                {outfit.images.length > 0 && (
                  <View style={styles.imagesGrid}>
                    {outfit.images.map((img, idx) => (
                      <View key={idx} style={styles.imageWrapper}>
                        <Image source={{ uri: img.uri }} style={styles.previewImage} />
                        <TouchableOpacity style={styles.removeImageBtn} onPress={() => removeImage(outfit.id, idx)}>
                          <X size={12} color="#FFF" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}

                {/* 2. Description & Voice Note */}
                <Text style={styles.sectionHeading}>2. Description & Voice Note</Text>
                <TextInput
                  style={styles.textArea}
                  multiline
                  numberOfLines={4}
                  placeholder="Describe your design, specific requirements, fabric details..."
                  value={outfit.description}
                  onChangeText={(text) => updateOutfit(outfit.id, 'description', text)}
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
                  const isActive = outfit.measurement === opt;
                  return (
                    <TouchableOpacity
                      key={opt}
                      style={[styles.measurementOptionBox, isActive && styles.measurementOptionBoxActive]}
                      onPress={() => updateOutfit(outfit.id, 'measurement', opt)}
                    >
                      <View style={styles.measurementOptionHeader}>
                        <Text style={[styles.measurementOptionText, isActive && styles.measurementOptionTextActive]}>{opt}</Text>
                        {isActive && <CheckCircle2 size={20} color="#5B43EE" />}
                      </View>
                      
                      {/* Tap to select an order... input if "Use Previous Measurements" */}
                      {isActive && opt === 'Use Previous Measurements' && (
                        <View style={styles.subInputBox}>
                          <Text style={styles.subInputText}>Tap to select an order...</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}

              </View>
            )}
          </View>
        );
      })}
      
      <CollageMaker
        visible={collageMakerVisible}
        onClose={() => setCollageMakerVisible(false)}
        onSaveReference={(url) => {
          if (activeCollageOutfitId) {
            updateOutfit(activeCollageOutfitId, 'collageUrl', url);
          }
          setCollageMakerVisible(false);
        }}
      />
    </View>
  );`;

content = content.replace(renderStep2Target, renderStep2Replacement);

fs.writeFileSync(file, content);
console.log('Step 2 Accordion implemented');
