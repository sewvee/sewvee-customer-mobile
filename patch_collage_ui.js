const fs = require('fs');
const file = 'src/screens/NewStitchRequestScreen.js';
let content = fs.readFileSync(file, 'utf8');

const regex = /\{\/\* 1\. Build a Collage \*\/\}\n\s*<View style=\{styles\.dashedBox\}>[\s\S]*?<\/View>\n\n\s*\{\/\* 2\. Description & Voice Note \*\/\}/s;

const replacement = `{/* 1. Reference Photos (Collage) */}
                      <Text style={styles.sectionHeading}>1. Reference Photos</Text>
                      <Text style={styles.sectionSubheading}>Add your fabric & design inspiration. 1) Collage your saree/outfit material, any embroidery or patterns, and reference images.</Text>
                      
                      {activeOutfit.collageUrl ? (
                        <View style={styles.collagePreviewContainer}>
                          <Image 
                            source={{ uri: (activeOutfit.collageUrl.startsWith('file://') || activeOutfit.collageUrl.startsWith('http')) ? activeOutfit.collageUrl : \`file://\${activeOutfit.collageUrl}\` }} 
                            style={styles.collagePreviewImage} 
                            resizeMode="cover" 
                          />
                          <View style={styles.collageActionRow}>
                            <TouchableOpacity 
                              style={styles.btnEditCollage}
                              onPress={() => {
                                setActiveCollageOutfitId(activeOutfit.id);
                                setCollageMakerVisible(true);
                              }}
                            >
                              <Text style={styles.btnEditCollageText}>Edit Collage</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                              style={styles.btnRemoveCollage}
                              onPress={() => updateOutfit(activeOutfit.id, 'collageUrl', null)}
                            >
                              <Text style={styles.btnRemoveCollageText}>Remove</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ) : (
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
                        </View>
                      )}

                      {/* 2. Description & Voice Note */}`;

content = content.replace(regex, replacement);

fs.writeFileSync(file, content);
console.log('Collage UI patched');
