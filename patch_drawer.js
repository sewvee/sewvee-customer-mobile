const fs = require('fs');
const path = 'src/screens/CustomerOrderDetailScreen.js';
let code = fs.readFileSync(path, 'utf8');

// 1. Add state variables for the drawer
const stateVars = `
  const [confirmDrawerVisible, setConfirmDrawerVisible] = useState(false);
  const [confirmOutfitId, setConfirmOutfitId] = useState(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
`;

code = code.replace(
  /const \[editDrawerVisible, setEditDrawerVisible\] = useState\(false\);/,
  "const [editDrawerVisible, setEditDrawerVisible] = useState(false);\n" + stateVars
);

// 2. Rename handleConfirmPhotos to handleOpenConfirmDrawer, and create actualSubmitPhotos
const handleOpenConfirmDrawer = `
  const handleConfirmPhotosClick = (outfitId) => {
    setConfirmOutfitId(outfitId);
    setAgreedToTerms(false);
    setConfirmDrawerVisible(true);
  };
`;

code = code.replace(
  /const handleConfirmPhotos = async \(outfitId\) => \{/,
  handleOpenConfirmDrawer + "\n  const handleConfirmPhotos = async (outfitId) => {"
);

// 3. Update the button to call handleConfirmPhotosClick
code = code.replace(
  /onPress=\{\(\) => handleConfirmPhotos\(outfit\.id\)\}/g,
  "onPress={() => handleConfirmPhotosClick(outfit.id)}"
);

// 4. Add the JSX for the Confirm Drawer right before {/* ── Photo Edit Drawer ── */}
const termsText = "${order?.company?.invoice_terms || order?.company?.termsAndConditions || order?.boutiqueTerms || 'No Refund / No Exchange / No Cancellation\\nE & O.E.'}";

const drawerJsx = `
      {/* ── Confirm Photos Drawer ── */}
      <Modal visible={confirmDrawerVisible} transparent animationType="slide" onRequestClose={() => setConfirmDrawerVisible(false)}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' }} activeOpacity={1} onPress={() => setConfirmDrawerVisible(false)} />
        <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 36 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
              <AlertCircle size={20} color="#EF4444" />
            </View>
            <Text style={{ fontSize: 17, fontFamily: 'Inter-Bold', color: '#1E293B', flex: 1 }}>Confirm Photos</Text>
            <TouchableOpacity onPress={() => setConfirmDrawerVisible(false)} style={{ padding: 4 }}>
              <X size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          <Text style={{ fontSize: 14, fontFamily: 'Inter-Medium', color: '#475569', marginBottom: 24, lineHeight: 22 }}>
            Are you sure you want to confirm these photos? Once submitted, you cannot change them and they will be sent directly to the boutique for reference.
          </Text>

          <TouchableOpacity 
            style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 24 }}
            activeOpacity={0.7}
            onPress={() => setAgreedToTerms(!agreedToTerms)}
          >
            <View style={{ 
              width: 20, height: 20, borderRadius: 6, 
              borderWidth: agreedToTerms ? 0 : 2, 
              borderColor: '#CBD5E1', 
              backgroundColor: agreedToTerms ? Colors.primary : 'transparent',
              alignItems: 'center', justifyContent: 'center',
              marginTop: 2, marginRight: 12
            }}>
              {agreedToTerms && <Check size={14} color="#FFF" strokeWidth={3} />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontFamily: 'Inter-SemiBold', color: '#1E293B', marginBottom: 6 }}>
                I agree with the terms and conditions
              </Text>
              <View style={{ backgroundColor: '#F8FAFC', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#F1F5F9' }}>
                <Text style={{ fontSize: 12, fontFamily: 'Inter-Medium', color: '#64748B', lineHeight: 18 }}>
                  {\`${termsText}\`}
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={{ 
              backgroundColor: agreedToTerms ? Colors.primary : '#E2E8F0', 
              borderRadius: 12, 
              paddingVertical: 16, 
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center'
            }}
            disabled={!agreedToTerms}
            onPress={() => {
              setConfirmDrawerVisible(false);
              if (confirmOutfitId) handleConfirmPhotos(confirmOutfitId);
            }}
          >
            <Text style={{ color: agreedToTerms ? '#FFF' : '#94A3B8', fontFamily: 'Inter-Bold', fontSize: 15 }}>Submit Photos</Text>
          </TouchableOpacity>
        </View>
      </Modal>

`;

code = code.replace(
  /\{\/\* ── Photo Edit Drawer ── \*\/\}/,
  drawerJsx + "\n      {/* ── Photo Edit Drawer ── */}"
);

fs.writeFileSync(path, code);
