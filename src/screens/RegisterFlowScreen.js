import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Modal,
    Image,
    TouchableWithoutFeedback,
    Keyboard,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Colors, Spacing, Shadow } from '../constants/theme';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Octicons from 'react-native-vector-icons/Octicons';
import { useDispatch, useSelector } from 'react-redux';
import { registerUser, getCountries, getStates, getCities } from '../store/authSlice';
import { uploadImageAction } from '../store/uploadSlice';
import { companyOnboardAction } from '../store/companyOnboardSlice';
import ImagePicker from 'react-native-image-crop-picker';
import { useToast } from '../context/ToastContext';
import { sendWhatsAppOtp } from '../services/otpService';
import PinInput from '../components/PinInput';
import { validatePhone, validateEmail } from '../utils/validation';

const TOTAL_STEPS = 3;

const RegisterFlowScreen = ({ navigation }) => {
    const dispatch = useDispatch();
    const { showToast } = useToast();
    const { countries, states, cities } = useSelector(state => state.auth);

    const [currentStep, setCurrentStep] = useState(1);
    const [loading, setLoading] = useState(false);

    // ── Step 1: Account + Business fields ───────────────────────────────────
    const [name, setName] = useState('');
    const [companyName, setCompanyName] = useState('');
    const [email, setEmail] = useState('');
    const [emailError, setEmailError] = useState('');
    const [phone, setPhone] = useState('');
    const [phoneError, setPhoneError] = useState('');
    const [secondaryPhone, setSecondaryPhone] = useState('');
    const [secondaryPhoneError, setSecondaryPhoneError] = useState('');

    // Logo / image
    const [profileImage, setProfileImage] = useState(null);
    const [uploadedProfileImageUrl, setUploadedProfileImageUrl] = useState('');
    const [isUploadingImage, setIsUploadingImage] = useState(false);

    // Boutique type
    const [boutiqueType, setBoutiqueType] = useState({
        men: false,
        women: false,
        kids: { selected: false, boy: false, girl: false },
    });

    // Address
    const [address, setAddress] = useState('');
    const [postalCode, setPostalCode] = useState('');
    const [country, setCountry] = useState('');
    const [countryId, setCountryId] = useState(0);
    const [state, setState] = useState('');
    const [stateId, setStateId] = useState(0);
    const [city, setCity] = useState('');
    const [cityId, setCityId] = useState(0);

    // Location modal state
    const [locationModal, setLocationModal] = useState(false);
    const [locationStep, setLocationStep] = useState('country'); // 'country', 'state', 'city'
    const [searchLocation, setSearchLocation] = useState('');

    // ── Step 2: PIN ─────────────────────────────────────────────────────────
    const [pin, setPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [pinError, setPinError] = useState('');

    // ── Step 3: Terms ───────────────────────────────────────────────────────
    const [agreedTerms, setAgreedTerms] = useState(false);
    const [agreedPrivacy, setAgreedPrivacy] = useState(false);

    // ── Location data ────────────────────────────────────────────────────────
    useEffect(() => { dispatch(getCountries()); }, [dispatch]);

    const filteredCountries = countries?.data?.filter(item =>
        item.countryName.toLowerCase().includes(searchLocation.toLowerCase())
    );
    const filteredStates = states?.data?.filter(item =>
        item.stateName.toLowerCase().includes(searchLocation.toLowerCase())
    );
    const filteredCities = cities?.data?.filter(item =>
        item.cityName.toLowerCase().includes(searchLocation.toLowerCase())
    );

    const handleCountrySelect = (item) => {
        setCountry(item.countryName);
        setCountryId(item.countryId || 0);
        setState(''); setStateId(0);
        setCity(''); setCityId(0);
        dispatch(getStates(item.countryId));
        setLocationStep('state');
        setSearchLocation('');
    };
    const handleStateSelect = (item) => {
        setState(item.stateName);
        setStateId(item.stateId || 0);
        setCity(''); setCityId(0);
        dispatch(getCities(item.stateId));
        setLocationStep('city');
        setSearchLocation('');
    };
    const handleCitySelect = (item) => {
        setCity(item.cityName);
        setCityId(item.cityId || item.id || 0);
        setLocationModal(false);
        setSearchLocation('');
    };


    // ── Boutique toggle ──────────────────────────────────────────────────────
    const toggleBoutiqueType = (key, subKey = null) => {
        setBoutiqueType(prev => {
            if (subKey) {
                return { ...prev, kids: { ...prev.kids, [subKey]: !prev.kids[subKey] } };
            } else if (key === 'kids') {
                const newSelected = !prev.kids.selected;
                return {
                    ...prev,
                    kids: { selected: newSelected, boy: newSelected ? prev.kids.boy : false, girl: newSelected ? prev.kids.girl : false },
                };
            } else {
                return { ...prev, [key]: !prev[key] };
            }
        });
    };

    // ── Avatar initials ──────────────────────────────────────────────────────
    const getInitials = (n) => (n || companyName).trim().substring(0, 2).toUpperCase() || 'BT';

    // ── Image picker ─────────────────────────────────────────────────────────
    const handleImagePicker = async () => {
        const prevImg = profileImage;
        const prevUrl = uploadedProfileImageUrl;
        try {
            const image = await ImagePicker.openPicker({
                width: 400, height: 400, cropping: true, mediaType: 'photo',
            });
            const imageData = {
                uri: image.path, type: image.mime,
                name: image.path.split('/').pop() || 'profile.jpg',
                key_name: 'company_logo',
            };
            setProfileImage(imageData);
            setUploadedProfileImageUrl('');
            setIsUploadingImage(true);
            const res = await dispatch(uploadImageAction(imageData)).unwrap();
            const remoteUrl = res?.data?.full_url || res?.url || res?.data?.url || '';
            if (!remoteUrl) throw new Error('Image upload completed, but no URL was returned.');
            setUploadedProfileImageUrl(remoteUrl);
            setProfileImage({ uri: remoteUrl });
        } catch (error) {
            if (error?.message !== 'User cancelled image selection' &&
                error?.message !== 'User cancelled image cropping') {
                setProfileImage(prevImg);
                setUploadedProfileImageUrl(prevUrl);
                showToast(error?.message || 'Failed to upload image', 'error');
            }
        } finally {
            setIsUploadingImage(false);
        }
    };

    // ── Step validators ──────────────────────────────────────────────────────
    const validateStep1 = () => {
        if (!name.trim()) { showToast('Please enter your full name', 'error'); return false; }
        if (!companyName.trim()) { showToast('Please enter your business name', 'error'); return false; }
        if (!email.trim() || !validateEmail(email)) { showToast('Please enter a valid email address', 'error'); return false; }
        if (!validatePhone(phone)) { showToast('Primary phone must be a valid 10-digit number', 'error'); return false; }
        if (secondaryPhone && !validatePhone(secondaryPhone)) { showToast('Secondary phone must be a valid 10-digit number', 'error'); return false; }
        if (!boutiqueType.men && !boutiqueType.women && !boutiqueType.kids.selected) {
            showToast('Please select at least one Boutique Type', 'error'); return false;
        }
        if (boutiqueType.kids.selected && !boutiqueType.kids.boy && !boutiqueType.kids.girl) {
            showToast('Please select Boy or Girl under Kids section', 'error'); return false;
        }
        if (!address.trim()) { showToast('Please enter your address', 'error'); return false; }
        return true;
    };

    const validateStep2 = () => {
        if (pin.length < 4) { setPinError('PIN must be exactly 4 digits'); return false; }
        if (pin !== confirmPin) { setPinError('PINs do not match. Please try again'); return false; }
        setPinError('');
        return true;
    };

    const validateStep3 = () => {
        if (!agreedTerms) { showToast('Please agree to Terms and Conditions', 'error'); return false; }
        if (!agreedPrivacy) { showToast('Please agree to Privacy Policy', 'error'); return false; }
        return true;
    };

    // ── Navigation between steps ─────────────────────────────────────────────
    const handleNext = () => {
        Keyboard.dismiss();
        if (currentStep === 1 && validateStep1()) setCurrentStep(2);
        else if (currentStep === 2 && validateStep2()) setCurrentStep(3);
    };

    const handleBack = () => {
        if (currentStep > 1) setCurrentStep(currentStep - 1);
        else navigation.goBack();
    };

    // ── Final submit on Step 3 ───────────────────────────────────────────────
    const handleCreateAccount = async () => {
        if (!validateStep3()) return;
        Keyboard.dismiss();
        setLoading(true);
        try {
            const accountPayload = {
                fullName: name,
                email,
                mobileNo: phone,
                dialCode: '+91',
                roleId: 2,
                pin,
            };
            const resultAction = await dispatch(registerUser(accountPayload));
            if (registerUser.fulfilled.match(resultAction)) {
                if (resultAction.payload && resultAction.payload.success === false) {
                    showToast(resultAction.payload.message || 'Could not create account', 'error');
                } else {
                    showToast('Account created successfully.', 'success');
                    
                    // Build business details to pass through to post-OTP step
                    const businessDetails = {
                        name: companyName,
                        address,
                        phone,
                        secondaryPhone,
                        email,
                        pincode: postalCode,
                        countryId,
                        stateId,
                        districtId: cityId,
                        profileIconUrl: uploadedProfileImageUrl || (profileImage?.uri?.startsWith('http') ? profileImage.uri : ''),
                        termsAndConditions: '',
                        subscriptionId: '',
                        planId: 0,
                        timing: '',
                        sections: {
                            men: boutiqueType.men,
                            women: boutiqueType.women,
                            kids: { boy: boutiqueType.kids.boy, girl: boutiqueType.kids.girl },
                        },
                    };

                    // Skip OTP Verification and directly submit business details
                    dispatch(companyOnboardAction({ payload: businessDetails }))
                        .catch(err => console.log('[RegisterFlow] Business onboard error:', err));
                    
                    setTimeout(() => {
                        navigation.navigate('TrialActiveScreen');
                    }, 800);
                }
            } else {
                const msg = resultAction.payload?.message || resultAction.payload || 'Could not create account';
                showToast(msg, 'error');
            }
        } catch (error) {
            showToast(error.message || 'Could not create account', 'error');
        } finally {
            setLoading(false);
        }
    };

    // ── Step indicator ───────────────────────────────────────────────────────
    const StepIndicator = () => (
        <View style={styles.stepRow}>
            {[1, 2, 3].map((s, i) => (
                <React.Fragment key={s}>
                    <View style={[styles.stepDot, currentStep >= s && styles.stepDotActive, currentStep > s && styles.stepDotDone]}>
                        {currentStep > s
                            ? <Ionicons name="checkmark" size={12} color="#fff" />
                            : <Text style={[styles.stepDotText, currentStep >= s && { color: '#fff' }]}>{s}</Text>
                        }
                    </View>
                    {i < 2 && <View style={[styles.stepLine, currentStep > s && styles.stepLineActive]} />}
                </React.Fragment>
            ))}
        </View>
    );

    // ── RENDER ───────────────────────────────────────────────────────────────
    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            {/* ── Header ── */}
            <View style={styles.header}>
                <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={Colors.textSecondary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>
                    {currentStep === 1 ? 'Create Account' : currentStep === 2 ? 'Set your PIN' : 'Terms & Agreement'}
                </Text>
                <View style={{ width: 40 }} />
            </View>

            <StepIndicator />

            {/* ═══════════════════════════════════════════════════════════════
                STEP 1 — Account + Business Details
            ═══════════════════════════════════════════════════════════════ */}
            {currentStep === 1 && (
                <KeyboardAwareScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    enableOnAndroid={true}
                    extraScrollHeight={20}
                >
                    {/* Subtitle */}
                    <Text style={styles.subtitle}>Setup your boutique details for the invoice</Text>

                    {/* Logo */}
                    <View style={styles.imageSection}>
                        <View style={styles.imageContainer}>
                            <View style={[styles.initialsContainer, profileImage && { backgroundColor: 'transparent' }]}>
                                {profileImage ? (
                                    <Image source={{ uri: profileImage.uri }} style={styles.profileImage} />
                                ) : (
                                    <Text style={styles.initialsText}>{getInitials(companyName || name)}</Text>
                                )}
                                {isUploadingImage && (
                                    <View style={styles.imageLoaderOverlay}>
                                        <ActivityIndicator size="small" color={Colors.white} />
                                    </View>
                                )}
                            </View>
                        </View>
                        <TouchableOpacity
                            style={[styles.uploadBtn, isUploadingImage && { opacity: 0.7 }]}
                            onPress={handleImagePicker}
                            disabled={isUploadingImage}
                        >
                            <Ionicons name="cloud-upload-outline" size={20} color={Colors.primary} />
                            <Text style={styles.uploadText}>
                                {isUploadingImage ? 'Uploading...' : profileImage ? 'Change Image' : 'Upload Image'}
                            </Text>
                        </TouchableOpacity>
                        <Text style={styles.initialsHint}>Your business initials will appear on invoices</Text>
                    </View>

                    {/* Full Name */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Full Name <Text style={styles.required}>*</Text></Text>
                        <View style={styles.inputContainer}>
                            <Ionicons name="person-outline" size={20} color={Colors.textSecondary} />
                            <TextInput
                                style={styles.input}
                                placeholder="Your Name"
                                placeholderTextColor={Colors.textSecondary}
                                value={name}
                                onChangeText={setName}
                            />
                        </View>
                    </View>

                    {/* Business Name */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Business Name <Text style={styles.required}>*</Text></Text>
                        <View style={styles.inputContainer}>
                            <Ionicons name="business-outline" size={20} color={Colors.textSecondary} />
                            <TextInput
                                style={styles.input}
                                placeholder="Enter shop name"
                                placeholderTextColor={Colors.textSecondary}
                                value={companyName}
                                onChangeText={setCompanyName}
                            />
                        </View>
                    </View>

                    {/* Email */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Email ID <Text style={styles.required}>*</Text></Text>
                        <View style={styles.inputContainer}>
                            <Ionicons name="mail-outline" size={20} color={Colors.textSecondary} />
                            <TextInput
                                style={styles.input}
                                placeholder="boutique@example.com"
                                placeholderTextColor={Colors.textSecondary}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                value={email}
                                onChangeText={val => {
                                    setEmail(val);
                                    const r = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                                    setEmailError(val.length > 0 && !r.test(val) ? 'Please enter a valid email' : '');
                                }}
                            />
                        </View>
                        {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
                    </View>

                    {/* Primary Phone */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Primary Phone Number <Text style={styles.required}>*</Text></Text>
                        <View style={styles.inputContainer}>
                            <Ionicons name="call-outline" size={20} color={Colors.textSecondary} />
                            <TextInput
                                style={styles.input}
                                placeholder="10 Digit phone number"
                                placeholderTextColor={Colors.textSecondary}
                                keyboardType="phone-pad"
                                maxLength={10}
                                value={phone}
                                onChangeText={val => {
                                    const cleaned = val.replace(/[^0-9]/g, '');
                                    setPhone(cleaned);
                                    setPhoneError(cleaned.length === 10 && !/^[6-9][0-9]{9}$/.test(cleaned) ? 'Enter a valid phone number' : '');
                                }}
                            />
                        </View>
                        {phoneError ? <Text style={styles.errorText}>{phoneError}</Text> : null}
                    </View>

                    {/* Secondary Phone */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Secondary Phone Number</Text>
                        <View style={styles.inputContainer}>
                            <Ionicons name="call-outline" size={20} color={Colors.textSecondary} />
                            <TextInput
                                style={styles.input}
                                placeholder="Alternative Contact"
                                placeholderTextColor={Colors.textSecondary}
                                keyboardType="phone-pad"
                                maxLength={10}
                                value={secondaryPhone}
                                onChangeText={val => {
                                    const cleaned = val.replace(/[^0-9]/g, '');
                                    setSecondaryPhone(cleaned);
                                    setSecondaryPhoneError(cleaned.length === 10 && !/^[6-9][0-9]{9}$/.test(cleaned) ? 'Enter a valid phone number' : '');
                                }}
                            />
                        </View>
                        {secondaryPhoneError ? <Text style={styles.errorText}>{secondaryPhoneError}</Text> : null}
                    </View>

                    {/* Boutique Type */}
                    <Text style={styles.label}>Boutique Type <Text style={styles.required}>*</Text></Text>
                    <View style={styles.boutiqueTypeContainer}>
                        {[['kids', 'Kids'], ['women', 'Women'], ['men', 'Men']].map(([key, label]) => {
                            const active = key === 'kids' ? boutiqueType.kids.selected : boutiqueType[key];
                            return (
                                <TouchableOpacity
                                    key={key}
                                    style={[styles.typeChip, active && styles.typeChipActive]}
                                    onPress={() => toggleBoutiqueType(key)}
                                    activeOpacity={0.7}
                                >
                                    {active && <Ionicons name="checkmark" size={14} color={Colors.primary} style={styles.chipIcon} />}
                                    <Text style={[styles.typeChipText, active && styles.typeChipTextActive]}>{label}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                    {boutiqueType.kids.selected && (
                        <View style={styles.subDivisionContainer}>
                            <View style={styles.boutiqueTypeContainer}>
                                {[['boy', 'Boy'], ['girl', 'Girl']].map(([key, label]) => (
                                    <TouchableOpacity
                                        key={key}
                                        style={[styles.typeChip, boutiqueType.kids[key] && styles.typeChipActive]}
                                        onPress={() => toggleBoutiqueType('kids', key)}
                                        activeOpacity={0.7}
                                    >
                                        {boutiqueType.kids[key] && <Ionicons name="checkmark" size={14} color={Colors.primary} style={styles.chipIcon} />}
                                        <Text style={[styles.typeChipText, boutiqueType.kids[key] && styles.typeChipTextActive]}>{label}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    )}

                    {/* Address */}
                    <Text style={[styles.label, { marginTop: 4 }]}>Address <Text style={styles.required}>*</Text></Text>
                    <TextInput
                        style={styles.inputBox}
                        placeholder="Address"
                        value={address}
                        onChangeText={setAddress}
                        placeholderTextColor={Colors.textSecondary}
                    />
                    <TextInput
                        style={styles.inputBox}
                        placeholder="Postal Code"
                        value={postalCode}
                        onChangeText={setPostalCode}
                        keyboardType="phone-pad"
                        placeholderTextColor={Colors.textSecondary}
                    />

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Location <Text style={styles.required}>*</Text></Text>
                        <TouchableOpacity style={styles.dropdownInput} onPress={() => { setLocationStep('country'); setLocationModal(true); }}>
                            <Ionicons name="location-outline" size={18} color="#908B95" style={{ marginRight: 10 }} />
                            <Text style={[styles.dropdownInputText, !(country && state && city) && { color: Colors.textSecondary }]}>
                                {country && state && city ? `${city}, ${state}, ${country}` : 'Select your location'}
                            </Text>
                            <Ionicons name="chevron-down" size={18} color={Colors.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    {/* Next button */}
                    <TouchableOpacity style={styles.primaryBtn} onPress={handleNext}>
                        <Text style={styles.primaryBtnText}>Continue</Text>
                        <Ionicons name="arrow-forward" size={20} color="#fff" />
                    </TouchableOpacity>

                    <View style={styles.loginRow}>
                        <Text style={styles.loginRowText}>Already have an account? </Text>
                        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                            <Text style={styles.loginLink}>Login</Text>
                        </TouchableOpacity>
                    </View>
                </KeyboardAwareScrollView>
            )}

            {/* ═══════════════════════════════════════════════════════════════
                STEP 2 — Set PIN
            ═══════════════════════════════════════════════════════════════ */}
            {currentStep === 2 && (
                <KeyboardAwareScrollView
                    contentContainerStyle={[styles.scrollContent, { alignItems: 'center' }]}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    enableOnAndroid={true}
                >
                    <View style={styles.pinIconCircle}>
                        <Ionicons name="lock-closed-outline" size={36} color={Colors.white} />
                    </View>
                    <Text style={styles.stepHeading}>Set Your 4-Digit PIN</Text>
                    <Text style={styles.stepSubHeading}>
                        This PIN is used to log in every time.{'\n'}Keep it safe.
                    </Text>

                    <View style={styles.pinBlock}>
                        <Text style={styles.label}>Enter PIN <Text style={styles.required}>*</Text></Text>
                        <PinInput value={pin} onValueChange={val => { setPin(val); setPinError(''); }} length={4} />
                    </View>

                    <View style={styles.pinBlock}>
                        <Text style={styles.label}>Confirm PIN <Text style={styles.required}>*</Text></Text>
                        <PinInput value={confirmPin} onValueChange={val => { setConfirmPin(val); setPinError(''); }} length={4} />
                    </View>

                    {pinError ? (
                        <Text style={[styles.errorText, { textAlign: 'center', marginBottom: 8 }]}>{pinError}</Text>
                    ) : null}

                    <TouchableOpacity style={[styles.primaryBtn, { width: '100%', marginTop: 20 }]} onPress={handleNext}>
                        <Text style={styles.primaryBtnText}>Continue</Text>
                        <Ionicons name="arrow-forward" size={20} color="#fff" />
                    </TouchableOpacity>
                </KeyboardAwareScrollView>
            )}

            {/* ═══════════════════════════════════════════════════════════════
                STEP 3 — Terms & Agreement
            ═══════════════════════════════════════════════════════════════ */}
            {currentStep === 3 && (
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    <Text style={styles.stepHeading}>Terms &amp; Agreement</Text>
                    <Text style={styles.stepSubHeading}>
                        Please read and agree to the following before creating your account.
                    </Text>

                    <View style={styles.termsBox}>
                        {[
                            { title: 'Data Privacy', desc: 'Your business and customer data is stored securely and never shared with third parties.' },
                            { title: 'No Hidden Charges', desc: 'The 14-day free trial has no payment required. Charges apply only after upgrading.' },
                            { title: 'Account Security', desc: 'You are responsible for keeping your 4-digit PIN confidential.' },
                            { title: 'Usage Policy', desc: 'Sewvee is intended for legitimate boutique management. Misuse will result in account suspension.' },
                        ].map((item, i) => (
                            <View key={i} style={[styles.termItem, i < 3 && styles.termItemBorder]}>
                                <Ionicons name="checkmark-circle-outline" size={18} color={Colors.primary} style={{ marginTop: 2 }} />
                                <View style={{ flex: 1, marginLeft: 10 }}>
                                    <Text style={styles.termTitle}>{item.title}</Text>
                                    <Text style={styles.termDesc}>{item.desc}</Text>
                                </View>
                            </View>
                        ))}
                    </View>

                    {/* Terms checkbox */}
                    <TouchableOpacity
                        style={styles.checkRow}
                        onPress={() => setAgreedTerms(!agreedTerms)}
                        activeOpacity={0.7}
                    >
                        <View style={[styles.checkbox, agreedTerms && styles.checkboxChecked]}>
                            {agreedTerms && <Text style={styles.tick}>✓</Text>}
                        </View>
                        <Text style={styles.checkLabel}>
                            I agree to{' '}
                            <Text
                                style={styles.checkLink}
                                onPress={() => navigation.navigate('Termsscreen')}
                            >
                                Terms and Conditions
                            </Text>
                        </Text>
                    </TouchableOpacity>

                    {/* Privacy checkbox */}
                    <TouchableOpacity
                        style={styles.checkRow}
                        onPress={() => setAgreedPrivacy(!agreedPrivacy)}
                        activeOpacity={0.7}
                    >
                        <View style={[styles.checkbox, agreedPrivacy && styles.checkboxChecked]}>
                            {agreedPrivacy && <Text style={styles.tick}>✓</Text>}
                        </View>
                        <Text style={styles.checkLabel}>
                            I agree to{' '}
                            <Text
                                style={styles.checkLink}
                                onPress={() => navigation.navigate('PrivacyPolicyScreen')}
                            >
                                Privacy Policy
                            </Text>
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.primaryBtn, loading && { opacity: 0.7 }]}
                        onPress={handleCreateAccount}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color={Colors.white} />
                        ) : (
                            <>
                                <Text style={styles.primaryBtnText}>Create Account</Text>
                                <Ionicons name="arrow-forward" size={20} color="#fff" />
                            </>
                        )}
                    </TouchableOpacity>
                </ScrollView>
            )}

            {/* ═══════════════════════════════════════════════════════════════
                LOCATION MODALS (reused from OnboardingScreen)
            ═══════════════════════════════════════════════════════════════ */}
            {/* Unified Location Modal */}
            <Modal visible={locationModal} transparent animationType="fade" onRequestClose={() => setLocationModal(false)}>
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setLocationModal(false)}>
                    <TouchableWithoutFeedback>
                        <View style={styles.modalContainer}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                                {locationStep !== 'country' && (
                                    <TouchableOpacity 
                                        onPress={() => {
                                            if (locationStep === 'city') setLocationStep('state');
                                            else if (locationStep === 'state') setLocationStep('country');
                                            setSearchLocation('');
                                        }} 
                                        style={{ paddingRight: 10 }}
                                    >
                                        <Ionicons name="arrow-back" size={20} color={Colors.textPrimary} />
                                    </TouchableOpacity>
                                )}
                                <Text style={{ fontSize: 18, fontFamily: 'Inter-SemiBold', color: Colors.textPrimary }}>
                                    {locationStep === 'country' ? 'Select Country' : locationStep === 'state' ? 'Select State' : 'Select City'}
                                </Text>
                            </View>
                            <TextInput
                                placeholder={`Search ${locationStep}`}
                                placeholderTextColor={Colors.textSecondary}
                                value={searchLocation}
                                onChangeText={setSearchLocation}
                                style={styles.searchInput}
                            />
                            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                                {locationStep === 'country' && (
                                    filteredCountries?.length > 0 ? filteredCountries.map((item, i) => (
                                        <TouchableOpacity key={i} style={styles.countryItem} onPress={() => handleCountrySelect(item)}>
                                            <Text style={styles.countryText}>{item.countryName}</Text>
                                        </TouchableOpacity>
                                    )) : (
                                        <View style={{ padding: 20, alignItems: 'center' }}>
                                            <Text style={{ color: Colors.textSecondary, fontFamily: 'Inter-Medium' }}>No countries found</Text>
                                        </View>
                                    )
                                )}
                                {locationStep === 'state' && (
                                    filteredStates?.length > 0 ? filteredStates.map((item, i) => (
                                        <TouchableOpacity key={i} style={styles.countryItem} onPress={() => handleStateSelect(item)}>
                                            <Text style={styles.countryText}>{item.stateName}</Text>
                                        </TouchableOpacity>
                                    )) : (
                                        <View style={{ padding: 20, alignItems: 'center' }}>
                                            <Text style={{ color: Colors.textSecondary, fontFamily: 'Inter-Medium' }}>No states found</Text>
                                        </View>
                                    )
                                )}
                                {locationStep === 'city' && (
                                    filteredCities?.length > 0 ? filteredCities.map((item, i) => (
                                        <TouchableOpacity key={i} style={styles.countryItem} onPress={() => handleCitySelect(item)}>
                                            <Text style={styles.countryText}>{item.cityName}</Text>
                                        </TouchableOpacity>
                                    )) : (
                                        <View style={{ padding: 20, alignItems: 'center' }}>
                                            <Text style={{ color: Colors.textSecondary, fontFamily: 'Inter-Medium' }}>No cities found</Text>
                                        </View>
                                    )
                                )}
                            </ScrollView>
                        </View>
                    </TouchableWithoutFeedback>
                </TouchableOpacity>
            </Modal>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },

    // ── Header
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: Spacing.lg, paddingTop: 52, paddingBottom: 12,
        backgroundColor: Colors.background,
    },
    backBtn: { padding: 4 },
    headerTitle: { fontFamily: 'Inter-Bold', fontSize: 18, color: Colors.textPrimary },

    // ── Step indicator
    stepRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        paddingHorizontal: Spacing.xl, paddingBottom: 16,
    },
    stepDot: {
        width: 28, height: 28, borderRadius: 14,
        borderWidth: 2, borderColor: Colors.border,
        backgroundColor: Colors.white,
        justifyContent: 'center', alignItems: 'center',
    },
    stepDotActive: { borderColor: Colors.primary, backgroundColor: Colors.primary },
    stepDotDone: { borderColor: '#16A34A', backgroundColor: '#16A34A' },
    stepDotText: { fontFamily: 'Inter-Bold', fontSize: 12, color: Colors.textSecondary },
    stepLine: { flex: 1, height: 2, backgroundColor: Colors.border, marginHorizontal: 6 },
    stepLineActive: { backgroundColor: '#16A34A' },

    // ── Scroll
    scrollContent: { padding: Spacing.lg, paddingBottom: 40 },
    subtitle: {
        fontFamily: 'Inter-Regular', fontSize: 15, color: Colors.textSecondary,
        textAlign: 'center', marginBottom: 8,
    },

    // ── Logo
    imageSection: { alignItems: 'center', marginBottom: 20 },
    imageContainer: { position: 'relative' },
    initialsContainer: {
        width: 90, height: 90, borderRadius: 45,
        backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center',
    },
    profileImage: { width: 90, height: 90, borderRadius: 45, resizeMode: 'cover' },
    imageLoaderOverlay: {
        ...StyleSheet.absoluteFillObject, borderRadius: 45,
        backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center',
    },
    initialsText: { fontSize: 36, color: '#fff', fontFamily: 'Inter-Bold' },
    uploadBtn: {
        flexDirection: 'row', backgroundColor: '#E9E7FF',
        paddingHorizontal: 20, paddingVertical: 8, borderRadius: 8, marginTop: 12, gap: 6,
    },
    uploadText: { color: Colors.primary, fontFamily: 'Inter-SemiBold', fontSize: 14 },
    initialsHint: {
        marginTop: 8, fontSize: 14, color: Colors.textSecondary,
        textAlign: 'center', fontFamily: 'Inter-Regular',
    },

    // ── Form fields
    inputGroup: { marginBottom: 16 },
    label: { fontSize: 16, marginBottom: 6, fontFamily: 'Inter-SemiBold', color: '#000000' },
    required: { color: 'red', fontSize: 16 },
    inputContainer: {
        flexDirection: 'row', alignItems: 'center',
        borderWidth: 1, borderColor: Colors.border,
        borderRadius: 8, paddingHorizontal: 12, height: 50,
        backgroundColor: Colors.white,
    },
    input: { flex: 1, marginLeft: 10, fontSize: 16, fontFamily: 'Inter-Medium', color: Colors.textPrimary },
    inputBox: {
        borderWidth: 1, borderColor: Colors.border, borderRadius: 8,
        height: 50, paddingHorizontal: 12, marginBottom: 12,
        fontFamily: 'Inter-Medium', color: Colors.textPrimary, fontSize: 16,
        backgroundColor: Colors.white,
    },
    errorText: { fontFamily: 'Inter-SemiBold', fontSize: 12, color: 'red', marginTop: 4, marginLeft: 4 },

    // ── Boutique chips
    boutiqueTypeContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: 8, marginBottom: 16 },
    typeChip: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, paddingVertical: 10,
        borderRadius: 12, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.white,
    },
    typeChipActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + '15' },
    typeChipText: { fontFamily: 'Inter-Medium', fontSize: 14, color: Colors.textSecondary },
    typeChipTextActive: { color: Colors.primary, fontFamily: 'Inter-SemiBold' },
    chipIcon: { marginRight: 6 },
    subDivisionContainer: { marginLeft: 16, marginBottom: 16, paddingLeft: 16, borderLeftWidth: 1, borderLeftColor: Colors.border },

    // ── Dropdowns
    dropdownInput: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white,
        paddingHorizontal: 12, paddingVertical: 14, borderRadius: 8,
        borderWidth: 1, borderColor: Colors.border, justifyContent: 'space-between',
    },
    dropdownInputText: { fontFamily: 'Inter-Regular', fontSize: 15, color: Colors.textPrimary, flex: 1 },

    // ── Modals
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
    modalContainer: { width: '85%', maxHeight: '60%', backgroundColor: '#fff', borderRadius: 10, paddingVertical: 10 },
    countryItem: { paddingVertical: 12, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#eee' },
    countryText: { fontSize: 16, color: Colors.textPrimary },
    searchInput: {
        borderWidth: 1, borderColor: '#ddd', borderRadius: 6,
        marginHorizontal: 15, marginBottom: 10, paddingHorizontal: 10,
        paddingVertical: 8, color: Colors.textPrimary,
    },

    // ── Primary button
    primaryBtn: {
        backgroundColor: Colors.primary, height: 54, borderRadius: 8,
        flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
        gap: 10, marginTop: 24, ...Shadow.medium,
    },
    primaryBtnText: { fontFamily: 'Inter-SemiBold', fontSize: 18, color: '#fff' },

    // ── Login link
    loginRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 24, marginBottom: 8 },
    loginRowText: { fontFamily: 'Inter-Regular', fontSize: 15, color: Colors.textSecondary },
    loginLink: { fontFamily: 'Inter-Bold', fontSize: 15, color: Colors.primary },

    // ── Step 2 — PIN
    pinIconCircle: {
        width: 80, height: 80, borderRadius: 40,
        backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center',
        marginBottom: 20, ...Shadow.medium,
    },
    stepHeading: { fontFamily: 'Inter-Bold', fontSize: 26, color: Colors.textPrimary, textAlign: 'center', marginBottom: 8 },
    stepSubHeading: { fontFamily: 'Inter-Regular', fontSize: 15, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 32 },
    pinBlock: { width: '100%', marginBottom: 24 },

    // ── Step 3 — Terms
    termsBox: {
        backgroundColor: Colors.white, borderRadius: 12, borderWidth: 1,
        borderColor: Colors.border, padding: 16, marginBottom: 24,
    },
    termItem: { flexDirection: 'row', paddingVertical: 12 },
    termItemBorder: { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    termTitle: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: Colors.textPrimary, marginBottom: 2 },
    termDesc: { fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
    checkRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 12 },
    checkbox: {
        width: 22, height: 22, borderWidth: 1.5, borderColor: '#999',
        borderRadius: 4, justifyContent: 'center', alignItems: 'center',
    },
    checkboxChecked: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    tick: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
    checkLabel: { fontFamily: 'Inter-Medium', fontSize: 14, color: Colors.textPrimary, flex: 1 },
    checkLink: { color: Colors.primary, textDecorationLine: 'underline' },
});

export default RegisterFlowScreen;
