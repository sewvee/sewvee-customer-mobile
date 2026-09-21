const fs = require('fs');
const file = 'src/screens/CustomerOrderDetailScreen.js';
let c = fs.readFileSync(file, 'utf8');

// 1. Add Sound to imports
if (!c.includes("import Sound from 'react-native-sound';")) {
  c = c.replace(
    "import { SafeAreaView } from 'react-native-safe-area-context';",
    "import { SafeAreaView } from 'react-native-safe-area-context';\nimport Sound from 'react-native-sound';"
  );
}

// 2. Add Play, Pause, Mic to lucide imports
if (!c.includes("Mic,")) {
  c = c.replace("import { \n  ArrowLeft,", "import { \n  ArrowLeft,\n  Mic,\n  Play,\n  Pause,");
}

// 3. Add VoiceNotePlayer component
const playerCode = `
const VoiceNotePlayer = ({ uri }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const soundRef = React.useRef(null);

  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.release();
      }
    };
  }, []);

  const togglePlay = () => {
    if (isPlaying) {
      if (soundRef.current) {
        soundRef.current.pause();
        setIsPlaying(false);
      }
    } else {
      if (soundRef.current) {
        soundRef.current.play((success) => {
          setIsPlaying(false);
          if (success) soundRef.current.setCurrentTime(0);
        });
        setIsPlaying(true);
      } else {
        Sound.setCategory('Playback');
        const sound = new Sound(uri, '', (error) => {
          if (error) {
            console.warn('failed to load the sound', error);
            return;
          }
          soundRef.current = sound;
          setIsPlaying(true);
          sound.play((success) => {
            setIsPlaying(false);
            if (success) sound.setCurrentTime(0);
          });
        });
      }
    }
  };

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', padding: 8, paddingRight: 16, borderRadius: 24, marginVertical: 4, width: '100%', borderWidth: 1, borderColor: '#E2E8F0' }}>
      <TouchableOpacity onPress={togglePlay} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', marginRight: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 }}>
        {isPlaying ? <Pause size={20} color="#1E293B" /> : <Play size={20} color="#1E293B" style={{ marginLeft: 3 }} />}
      </TouchableOpacity>
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ flex: 1, height: 4, backgroundColor: '#CBD5E1', borderRadius: 2, marginRight: 12 }}>
           <View style={{ width: '0%', height: '100%', backgroundColor: '#64748B', borderRadius: 2 }} />
        </View>
        <TouchableOpacity onPress={() => Linking.openURL(uri)}>
          <Mic size={20} color="#64748B" />
        </TouchableOpacity>
      </View>
    </View>
  );
};
`;

if (!c.includes("const VoiceNotePlayer")) {
  c = c.replace("const resolveImageUrl = (url) => {", playerCode + "\nconst resolveImageUrl = (url) => {");
}


// 4. Update the render logic
const oldRenderPhotos = `                      <View style={styles.card}>
                        <View style={styles.cardHeader}>
                          <ImageIcon size={14} color={Colors.primary} />
                          <Text style={styles.cardTitle}>REFERENCE PHOTOS</Text>
                        </View>
                        <View style={{ padding: 16, flexDirection: 'row', flexWrap: 'wrap' }}>
                          {outfit.photos && outfit.photos.length > 0 ? outfit.photos.map((p, i) => {
                             const url = p.file_url || p.url || '';
                             const isAudio = url.toLowerCase().endsWith('.wav') || url.toLowerCase().endsWith('.mp3') || url.toLowerCase().endsWith('.m4a');
                             if (isAudio) {
                               return (
                                 <TouchableOpacity key={i} onPress={() => Linking.openURL(resolveImageUrl(url))} style={{ width: 100, height: 100, borderRadius: 8, marginRight: 8, marginBottom: 8, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#C7D2FE' }}>
                                   <Mic size={32} color="#4F46E5" />
                                   <Text style={{ fontSize: 10, color: '#4F46E5', marginTop: 8, fontFamily: 'Inter-Medium' }}>Play Audio</Text>
                                 </TouchableOpacity>
                               );
                             }
                             return (
                               <TouchableOpacity key={i} onPress={() => Linking.openURL(resolveImageUrl(url))}>
                                 <Image source={{ uri: resolveImageUrl(url) }} style={{ width: 100, height: 100, borderRadius: 8, marginRight: 8, marginBottom: 8, backgroundColor: '#F1F5F9' }} />
                               </TouchableOpacity>
                             );
                          }) : <Text style={{ fontSize: 13, color: '#94A3B8', fontStyle: 'italic' }}>No reference photos provided.</Text>}
                        </View>
                      </View>`;

const newRenderPhotos = `                      {(() => {
                        const allPhotos = outfit.photos || [];
                        const images = allPhotos.filter(p => {
                          const u = (p.file_url || p.url || '').toLowerCase();
                          return !(u.endsWith('.wav') || u.endsWith('.mp3') || u.endsWith('.m4a'));
                        });
                        const audios = allPhotos.filter(p => {
                          const u = (p.file_url || p.url || '').toLowerCase();
                          return u.endsWith('.wav') || u.endsWith('.mp3') || u.endsWith('.m4a');
                        });

                        return (
                          <>
                            <View style={styles.card}>
                              <View style={styles.cardHeader}>
                                <ImageIcon size={14} color={Colors.primary} />
                                <Text style={styles.cardTitle}>REFERENCE PHOTOS</Text>
                              </View>
                              <View style={{ padding: 16, flexDirection: 'row', flexWrap: 'wrap' }}>
                                {images.length > 0 ? images.map((p, i) => (
                                  <TouchableOpacity key={i} onPress={() => Linking.openURL(resolveImageUrl(p.file_url || p.url || ''))}>
                                    <Image source={{ uri: resolveImageUrl(p.file_url || p.url || '') }} style={{ width: 100, height: 100, borderRadius: 8, marginRight: 8, marginBottom: 8, backgroundColor: '#F1F5F9' }} />
                                  </TouchableOpacity>
                                )) : <Text style={{ fontSize: 13, color: '#94A3B8', fontStyle: 'italic' }}>No reference photos provided.</Text>}
                              </View>
                            </View>
                            
                            {audios.length > 0 && (
                              <View style={styles.card}>
                                <View style={styles.cardHeader}>
                                  <Mic size={14} color={Colors.primary} />
                                  <Text style={styles.cardTitle}>VOICE NOTES</Text>
                                </View>
                                <View style={{ padding: 16 }}>
                                  {audios.map((a, i) => (
                                    <VoiceNotePlayer key={i} uri={resolveImageUrl(a.file_url || a.url || '')} />
                                  ))}
                                </View>
                              </View>
                            )}
                          </>
                        );
                      })()}`;

c = c.replace(oldRenderPhotos, newRenderPhotos);
fs.writeFileSync(file, c, 'utf8');
console.log('Done');
