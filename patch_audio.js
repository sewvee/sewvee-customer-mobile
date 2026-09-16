const fs = require('fs');
const file = 'src/screens/NewStitchRequestScreen.js';
let content = fs.readFileSync(file, 'utf8');

// 1. Imports
const importTarget = "import { URL_UPLOAD, URL_ORDERS } from '../config/env';";
const importReplacement = `import { URL_UPLOAD, URL_ORDERS } from '../config/env';
import AudioRecord from 'react-native-audio-record';`;
content = content.replace(importTarget, importReplacement);

const lucideTarget = "import { ArrowLeft, Plus, Minus, Camera, ImageIcon, Calendar, X, ChevronRight, ChevronDown, Mic, Image as ImageIconLucide, CheckCircle2 } from 'lucide-react-native';";
const lucideReplacement = "import { ArrowLeft, Plus, Minus, Camera, ImageIcon, Calendar, X, ChevronRight, ChevronDown, Mic, Image as ImageIconLucide, CheckCircle2, Square, Trash2 } from 'lucide-react-native';";
content = content.replace(lucideTarget, lucideReplacement);


// 2. Add Audio State & Logic
const stateTarget = "const [submitting, setSubmitting] = useState(false);";
const stateReplacement = `const [submitting, setSubmitting] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const timerRef = React.useRef(null);
  
  const startRecording = async () => {
    try {
      if (Platform.OS === 'android') {
        const { PermissionsAndroid } = require('react-native');
        const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) return;
      }
      const options = { sampleRate: 16000, channels: 1, bitsPerSample: 16, audioSource: 6, wavFile: 'recorded_audio.wav' };
      AudioRecord.init(options);
      AudioRecord.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      timerRef.current = setInterval(() => setRecordingSeconds(s => s + 1), 1000);
    } catch (e) {
      Alert.alert('Error', 'Failed to start recording');
    }
  };
  
  const stopRecording = async () => {
    try {
      const audioFile = await AudioRecord.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioFile && editingOutfitId) {
        const path = Platform.OS === 'android' && !audioFile.startsWith('file://') ? \`file://\${audioFile}\` : audioFile;
        updateOutfit(editingOutfitId, 'audioUrl', path);
      }
    } catch (e) {
      console.warn('Failed to stop recording', e);
    }
  };
  
  const discardRecording = () => {
    if (editingOutfitId) updateOutfit(editingOutfitId, 'audioUrl', null);
  };`;
content = content.replace(stateTarget, stateReplacement);

// 3. Audio upload logic
const uploadTarget = "if (outfit.collageUrl) {";
const uploadReplacement = `if (outfit.audioUrl) {
          const formData = new FormData();
          formData.append('file', {
            uri: outfit.audioUrl,
            type: 'audio/wav',
            name: 'voice_note.wav'
          });
          formData.append('key_name', 'order_audios');
          try {
            const uploadRes = await axios.post(URL_UPLOAD, formData, { headers: { Authorization: formattedToken, 'Content-Type': 'multipart/form-data' }});
            const url = uploadRes.data?.file_url || uploadRes.data?.data?.file_url || uploadRes.data?.url;
            if (url) uploadedUrls.push(url);
          } catch (err) { console.warn('Failed to upload audio', err); }
        }
        if (outfit.collageUrl) {`;
content = content.replace(uploadTarget, uploadReplacement);


// 4. Render Audio UI
const renderAudioTarget = /<Text style=\{styles\.orText\}>Or record a voice note<\/Text>[\s\S]*?<\/TouchableOpacity>/;
const renderAudioReplacement = `<Text style={styles.orText}>Or record a voice note</Text>
                      {!activeOutfit.audioUrl ? (
                        <TouchableOpacity 
                          style={[styles.btnVoiceNote, isRecording && styles.btnVoiceNoteRecording]}
                          onPress={isRecording ? stopRecording : startRecording}
                        >
                          {isRecording ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                              <View style={styles.recordingDot} />
                              <Text style={styles.btnVoiceNoteRecordingText}>
                                Recording... {Math.floor(recordingSeconds / 60)}:{String(recordingSeconds % 60).padStart(2, '0')}
                              </Text>
                              <Square size={14} color="#EF4444" style={{ marginLeft: 12, marginRight: 4 }} />
                              <Text style={styles.btnVoiceNoteRecordingText}>Stop</Text>
                            </View>
                          ) : (
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                              <Mic size={18} color="#5B43EE" style={{marginRight: 8}} />
                              <Text style={styles.btnVoiceNoteText}>Record Voice Note</Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      ) : (
                        <View style={styles.audioSavedContainer}>
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <View style={styles.audioIconCircle}>
                              <Mic size={16} color="#5B43EE" />
                            </View>
                            <View>
                              <Text style={styles.audioSavedText}>Voice Note Attached</Text>
                              <Text style={styles.audioSavedSubtext}>Ready to upload</Text>
                            </View>
                          </View>
                          <TouchableOpacity onPress={discardRecording} style={styles.btnTrashAudio}>
                            <Trash2 size={18} color="#EF4444" />
                          </TouchableOpacity>
                        </View>
                      )}`;
content = content.replace(renderAudioTarget, renderAudioReplacement);

// 5. Styles
const stylesTarget = "btnVoiceNoteText: { fontSize: 14, fontFamily: 'Inter-Bold', color: '#5B43EE' },";
const stylesReplacement = `btnVoiceNoteText: { fontSize: 14, fontFamily: 'Inter-Bold', color: '#5B43EE' },
  btnVoiceNoteRecording: { borderColor: '#FCA5A5', backgroundColor: '#FEF2F2' },
  recordingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444', marginRight: 8 },
  btnVoiceNoteRecordingText: { fontSize: 14, fontFamily: 'Inter-Bold', color: '#EF4444' },
  audioSavedContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 12, marginBottom: 24 },
  audioIconCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  audioSavedText: { fontSize: 14, fontFamily: 'Inter-Bold', color: '#0F172A' },
  audioSavedSubtext: { fontSize: 12, fontFamily: 'Inter-Medium', color: '#64748B' },
  btnTrashAudio: { padding: 8, backgroundColor: '#FEF2F2', borderRadius: 20 },`;
content = content.replace(stylesTarget, stylesReplacement);

fs.writeFileSync(file, content);
console.log('Audio logic patched');
