import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Modal,
    Image,
    TouchableWithoutFeedback
} from 'react-native';

import { Colors, Spacing, Typography, Shadow } from '../constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { validateEmail, validatePhone } from '../utils/validation';
import SuccessModal from '../components/SuccessModal';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Octicons from 'react-native-vector-icons/Octicons';
import { useAuth } from '../context/AuthContext';
import ImagePicker from 'react-native-image-crop-picker';
import { useDispatch, useSelector } from 'react-redux';
import { getCountries, getStates, getCities, refreshTokenAction } from '../store/authSlice';
import { uploadImageAction } from '../store/uploadSlice';
import { companyOnboardAction } from '../store/companyOnboardSlice';
import { useToast } from '../context/ToastContext';
import BusinessHoursModal from '../components/BusinessHoursModal';
import { getCompanyAction } from '../store/companyOnboardSlice';
import ImageZoomModal from '../components/ImageZoomModal';
import BottomConfirmationSheet from '../components/BottomConfirmationSheet';

const OnboardingScreen = ({ navigation }) => {
    const dispatch = useDispatch();
    const { countries, states, cities, user } = useSelector(state => state.auth);
    const insets = useSafeAreaInsets();
    const { login, setIsOnboarded, logout, company, saveCompany } = useAuth();
    const { showToast } = useToast();

    const [companyName, setCompanyName] = useState('');
    const [profileImage, setProfileImage] = useState(null);
    const [uploadedProfileImageUrl, setUploadedProfileImageUrl] = useState('');
    const [address, setAddress] = useState('');
    const [address2, setAddress2] = useState('');
    const [city, setCity] = useState('');
    const [state, setState] = useState('');
    const [postalCode, setPostalCode] = useState('');
    const [country, setCountry] = useState('');
    const [countryId, setCountryId] = useState(0);
    const [stateId, setStateId] = useState(0);
    const [cityId, setCityId] = useState(0);


    const [phone, setPhone] = useState('');
    const [phoneError, setPhoneError] = useState('');
    const [secondaryPhone, setSecondaryPhone] = useState('');
    const [secondaryPhoneError, setSecondaryPhoneError] = useState('');

    const [email, setEmail] = useState('');
    const [emailError, setEmailError] = useState('');
    const [gstin, setGstin] = useState('');

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isUploadingImage, setIsUploadingImage] = useState(false);

    const [alertVisible, setAlertVisible] = useState(false);
    const [alertTitle, setAlertTitle] = useState('');
    const [alertDesc, setAlertDesc] = useState('');
    const [alertType, setAlertType] = useState('success');
    const [zoomVisible, setZoomVisible] = useState(false);
    const [showDeleteImageSheet, setShowDeleteImageSheet] = useState(false);


    const [countryModal, setCountryModal] = useState(false);
    const [stateModal, setStateModal] = useState(false);
    const [cityModal, setCityModal] = useState(false);
    const [hoursModal, setHoursModal] = useState(false)
    const [searchCountry, setSearchCountry] = useState('');
    const [searchState, setSearchState] = useState('');
    const [searchCity, setSearchCity] = useState('');

    const [boutiqueType, setBoutiqueType] = useState({
        men: false,
        women: false,
        kids: {
            selected: false,
            boy: false,
            girl: false
        }
    });
    const toggleBoutiqueType = (key, subKey = null) => {
        setBoutiqueType(prev => {
            if (subKey) {
                return {
                    ...prev,
                    kids: {
                        ...prev.kids,
                        [subKey]: !prev.kids[subKey]
                    }
                };
            } else if (key === 'kids') {
                const newSelected = !prev.kids.selected;
                return {
                    ...prev,
                    kids: {
                        ...prev.kids,
                        selected: newSelected,
                        boy: newSelected ? prev.kids.boy : false,
                        girl: newSelected ? prev.kids.girl : false
                    }
                };
            } else {
                return {
                    ...prev,
                    [key]: !prev[key]
                };
            }
        });
    };

    const filteredCountries = countries?.data?.filter(item =>
        item.countryName.toLowerCase().includes(searchCountry.toLowerCase())
    );

    const filteredStates = states?.data?.filter(item =>
        item.stateName.toLowerCase().includes(searchState.toLowerCase())
    );

    const filteredCities = cities?.data?.filter(item =>
        item.cityName.toLowerCase().includes(searchCity.toLowerCase())
    );

    useEffect(() => {
        dispatch(getCountries());

        const fetchCompanyDetails = async () => {
            try {
                const res = await dispatch(getCompanyAction()).unwrap();
                if (res?.data) {
                    const companyData = res.data;
                    setCompanyName(companyData.name || '');
                    setAddress(companyData.address || '');
                    setPhone(companyData.phone || '');
                    setSecondaryPhone(companyData.secondaryPhone || '');
                    setEmail(companyData.email || '');
                    setGstin(companyData.gstin || '');
                    setPostalCode(companyData.pincode || '');
                    setCountry(companyData.countryName || '');
                    setCountryId(companyData.countryId || 0);
                    setState(companyData.stateName || '');
                    setStateId(companyData.stateId || 0);
                    setCity(companyData.cityName || '');
                    setCityId(companyData.districtId || 0);
                    
                    if (companyData.profileIconUrl) {
                        setProfileImage({ uri: companyData.profileIconUrl });
                        setUploadedProfileImageUrl(companyData.profileIconUrl);
                    }

                    if (companyData.countryId) {
                        dispatch(getStates(companyData.countryId));
                    }
                    if (companyData.stateId) {
                        dispatch(getCities(companyData.stateId));
                    }

                    if (companyData.sections) {
                        try {
                            const sections = companyData.sections;
                            setBoutiqueType({
                                men: sections.men || false,
                                women: sections.women || false,
                                kids: {
                                    selected: sections.kids ? (sections.kids.boy || sections.kids.girl) : false,
                                    boy: sections.kids?.boy || false,
                                    girl: sections.kids?.girl || false
                                }
                            });
                        } catch (e) {
                            console.log("Error parsing sections", e);
                        }
                    }
                }
            } catch (error) {
                console.log('Failed to fetch company details', error);
            }
        };

        fetchCompanyDetails();
    }, [dispatch]);

    const handleCountrySelect = (item) => {
        setCountry(item.countryName);
        setCountryId(item.countryId || 0);
        dispatch(getStates(item.countryId));
    };

    const handleStateSelect = (item) => {
        setState(item.stateName);
        setStateId(item.stateId || 0);
        dispatch(getCities(item.stateId));
    };

    const getInitials = (name) => {
        return name.trim().substring(0, 2).toUpperCase() || 'BT';
    };

    const handleImagePicker = async () => {
        const previousProfileImage = profileImage;
        const previousUploadedProfileImageUrl = uploadedProfileImageUrl;

        try {
            const image = await ImagePicker.openPicker({
                width: 400,
                height: 400,
                cropping: true,
                mediaType: 'photo',
            });
            const imageData = {
                uri: image.path,
                type: image.mime,
                name: image.path.split('/').pop() || 'profile.jpg',
                key_name: 'company_logo'
            };

            setProfileImage(imageData);
            setUploadedProfileImageUrl('');

            setIsUploadingImage(true);
            const res = await dispatch(uploadImageAction(imageData)).unwrap();
            const remoteImageUrl = res?.data?.full_url || res?.url || res?.data?.url || '';
            if (!remoteImageUrl) {
                throw new Error('Image upload completed, but no image URL was returned.');
            }

            setUploadedProfileImageUrl(remoteImageUrl);
            setProfileImage({ uri: remoteImageUrl });
        } catch (error) {
            if (
                error?.message !== 'User cancelled image selection' &&
                error?.message !== 'User cancelled image cropping'
            ) {
                setProfileImage(previousProfileImage);
                setUploadedProfileImageUrl(previousUploadedProfileImageUrl);
                showToast(error?.message || error?.error || 'Failed to upload image', 'error');
                console.log('ImagePicker Error: ', error);
            }
        } finally {
            setIsUploadingImage(false);
        }
    };

    const handleRemoveProfileImageRequest = () => {
        if (isUploadingImage || !profileImage) {
            return;
        }
        setShowDeleteImageSheet(true);
    };

    const confirmRemoveProfileImage = () => {
        setProfileImage(null);
        setUploadedProfileImageUrl('');
        setZoomVisible(false);
        setShowDeleteImageSheet(false);
    };

    const handleSave = async () => {

        if (!companyName.trim() || !address.trim()) {
            setAlertTitle('Missing Information');
            setAlertDesc('Please enter company name and address.');
            setAlertType('warning');
            setAlertVisible(true);
            return;
        }

        if (!validatePhone(phone)) {
            setAlertTitle('Invalid Phone');
            setAlertDesc('Primary Phone Number must be 10 digits.');
            setAlertType('warning');
            setAlertVisible(true);
            return;
        }

        if (secondaryPhone && !validatePhone(secondaryPhone)) {
            setAlertTitle('Invalid Secondary Phone');
            setAlertDesc('Secondary Phone Number must be 10 digits.');
            setAlertType('warning');
            setAlertVisible(true);
            return;
        }

        if (!boutiqueType.men && !boutiqueType.women && !boutiqueType.kids.selected) {
            setAlertTitle('Selection Required');
            setAlertDesc('Please select at least one Boutique Type.');
            setAlertType('warning');
            setAlertVisible(true);
            return;
        }

        if (boutiqueType.kids.selected && !boutiqueType.kids.boy && !boutiqueType.kids.girl) {
            setAlertTitle('Selection Required');
            setAlertDesc('Please select Boy or Girl in Kids section.');
            setAlertType('warning');
            setAlertVisible(true);
            return;
        }

        if (email && !validateEmail(email)) {
            setAlertTitle('Invalid Email');
            setAlertDesc('Please enter a valid email address.');
            setAlertType('warning');
            setAlertVisible(true);
            return;
        }

        if (country == "") {
            setAlertTitle('Invalid country');
            setAlertDesc('Please select a country.');
            setAlertType('warning');
            setAlertVisible(true);
            return;
        }

        if (state == "") {
            setAlertTitle('Invalid state');
            setAlertDesc('Please select a state.');
            setAlertType('warning');
            setAlertVisible(true);
            return;
        }

        if (city == "") {
            setAlertTitle('Invalid city');
            setAlertDesc('Please select a city.');
            setAlertType('warning');
            setAlertVisible(true);
            return;
        }



        // Removed: login(phone, '1234') - This was overwriting original auth token with dummy data
        setIsSubmitting(true);

        try {

            console.log("DEBUG - profileImage:", profileImage);
            console.log("DEBUG - uploadedProfileImageUrl:", uploadedProfileImageUrl);

            const payload = {
                name: companyName,
                address: address,
                phone: phone,
                secondaryPhone: secondaryPhone,
                email: email,
                gstin: gstin,
                termsAndConditions: "",
                subscriptionId: "",
                planId: 0,
                countryId: countryId,
                stateId: stateId,
                districtId: cityId,
                pincode: postalCode,
                profileIconUrl: uploadedProfileImageUrl || (profileImage?.uri?.startsWith('http') ? profileImage.uri : ""),
                timing: "",
                sections: {
                    men: boutiqueType.men,
                    women: boutiqueType.women,
                    kids: {
                        boy: boutiqueType.kids.boy,
                        girl: boutiqueType.kids.girl
                    }
                }
            };

            console.log("COMPLETE SETUP PAYLOAD:", JSON.stringify(payload, null, 2));

            const data = await dispatch(companyOnboardAction({ payload })).unwrap();

            const fallbackCompanyData = {
                ...company,
                ...(data?.data || {}),
                ...payload,
                profileIconUrl: payload.profileIconUrl || data?.data?.profileIconUrl || company?.profileIconUrl || "",
            };

            try {
                const companyResponse = await dispatch(getCompanyAction()).unwrap();
                if (companyResponse?.data) {
                    await saveCompany(companyResponse.data);
                } else {
                    await saveCompany(fallbackCompanyData);
                }
            } catch (companyError) {
                console.log('Failed to refresh company after onboarding:', companyError);
                await saveCompany(fallbackCompanyData);
            }
            
            // Refresh token after successful onboarding
            const refreshToken = user?.refreshToken || user?.data?.refreshToken;
            if (refreshToken) {
                const refreshPayload = {
                    refresh_token: refreshToken
                };
                const refreshResult = await dispatch(refreshTokenAction(refreshPayload)).unwrap();
                const newToken = refreshResult?.accessToken || refreshResult?.data?.accessToken;
                if (newToken) {
                    await login(newToken, true);
                }
            }

            showToast(data?.message || 'Business profile created successfully', 'success');
            await setIsOnboarded(true);

            if (data?.data?.planId == null) {
                navigation.navigate('TrialActiveScreen');
            }
            else {
                navigation.navigate('Main');
            }



        } catch (error) {

            console.log('error', error);

            const errorMsg = error?.message || 'Failed to save company details. Please try again.';
            showToast(errorMsg, 'error');
            setAlertTitle('Setup Failed');
            setAlertDesc(errorMsg);
            setAlertType('error');
            setAlertVisible(true);

        } finally {

            setIsSubmitting(false);

        }

    };


    return (

        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={[styles.container, { paddingTop: insets.top }]}
        >

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                <TouchableOpacity
                    style={styles.logoutBtn}
                    onPress={() => logout()}
                >
                    {/* <LogOut size={18} color={Colors.danger} /> */}
                    <Text style={styles.logoutText}>Logout</Text>
                </TouchableOpacity>
                <View style={{ alignSelf: 'center' }}>
                    <Text style={styles.title}>Create Business Profile</Text>

                    <Text style={styles.subtitle}>
                        Setup your boutique details for the invoice
                    </Text>
                </View>

                <View style={styles.imageSection}>

                    <View style={styles.imageContainer}>
                        <View style={[styles.initialsContainer, profileImage && { backgroundColor: 'transparent' }]}>
                            {profileImage ? (
                                <TouchableOpacity 
                                    activeOpacity={1} 
                                    disabled={isUploadingImage}
                                    onPress={() => setZoomVisible(true)}
                                >
                                    <Image
                                        source={{ uri: profileImage.uri }}
                                        style={styles.profileImage}
                                    />
                                </TouchableOpacity>
                            ) : (
                                <Text style={styles.initialsText}>
                                    {getInitials(companyName)}
                                </Text>
                            )}
                            {isUploadingImage && (
                                <View style={styles.imageLoaderOverlay}>
                                    <ActivityIndicator size="small" color={Colors.white} />
                                </View>
                            )}
                        </View>
                        {profileImage && (
                            <TouchableOpacity
                                style={styles.deleteBtn}
                                onPress={handleRemoveProfileImageRequest}
                                disabled={isUploadingImage}
                            >
                                <Ionicons name="trash" size={16} color={Colors.white} />
                            </TouchableOpacity>
                        )}
                    </View>

                    <TouchableOpacity
                        style={[styles.uploadBtn, isUploadingImage && styles.uploadBtnDisabled]}
                        onPress={handleImagePicker}
                        disabled={isUploadingImage}
                    >

                        <Ionicons
                            name="cloud-upload-outline"
                            size={20}
                            color={Colors.primary}
                        />

                        <Text style={styles.uploadText}>
                            {isUploadingImage ? 'Uploading Image...' : (profileImage ? 'Change Image' : 'Upload Image')}
                        </Text>

                    </TouchableOpacity>

                    <Text style={styles.initialsHint}>
                        Your business initials will appear on invoices
                    </Text>

                </View>

                <View style={styles.form}>

                    {/* Business Name */}

                    <View style={styles.inputGroup}>

                        <Text style={styles.label}>
                            Business Name<Text style={{ color: "red", fontSize: 16 }}> *</Text>
                        </Text>

                        <View style={styles.inputContainer}>

                            <Ionicons
                                name="business-outline"
                                size={20}
                                color={Colors.textSecondary}
                            />

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

                        <Text style={styles.label}>
                            Email ID<Text style={{ color: "red", fontSize: 16 }}> *</Text>
                        </Text>

                        <View style={styles.inputContainer}>

                            <Ionicons
                                name="mail-outline"
                                size={20}
                                color={Colors.textSecondary}
                            />

                            <TextInput
                                style={styles.input}
                                placeholder="boutique@example.com"
                                placeholderTextColor={Colors.textSecondary}
                                value={email}
                                onChangeText={(val) => {
                                    setEmail(val);

                                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

                                    if (val.length > 0 && !emailRegex.test(val)) {
                                        setEmailError('Please enter valid email id');
                                    } else {
                                        setEmailError('');
                                    }
                                }}

                                keyboardType="email-address"
                            />

                        </View>
                        {emailError ? (
                            <Text style={styles.errorText}>
                                {emailError}
                            </Text>
                        ) : null}
                    </View>

                    {/* Primary Phone */}

                    <View style={styles.inputGroup}>

                        <Text style={styles.label}>
                            Primary Phone Number<Text style={{ color: "red", fontSize: 16 }}> *</Text>
                        </Text>

                        <View style={styles.inputContainer}>

                            <Ionicons
                                name="call-outline"
                                size={20}
                                color={Colors.textSecondary}
                            />

                            <TextInput
                                style={styles.input}
                                placeholder="10 Digit phone number"
                                placeholderTextColor={Colors.textSecondary}
                                value={phone}
                                onChangeText={(val) => {
                                    const cleaned = val.replace(/[^0-9]/g, '');
                                    setPhone(cleaned);

                                    const phoneRegex = /^[6-9][0-9]{9}$/;

                                    if (cleaned.length === 10 && !phoneRegex.test(cleaned)) {
                                        setPhoneError('Please enter a valid primary phone number');
                                    } else {
                                        setPhoneError('');
                                    }
                                }}

                                keyboardType="phone-pad"
                                maxLength={10}
                            />

                        </View>
                        {phoneError ? (
                            <Text style={styles.errorText}>
                                {phoneError}
                            </Text>
                        ) : null}

                    </View>

                    {/* Secondary */}

                    <View style={styles.inputGroup}>

                        <Text style={styles.label}>
                            Secondary Phone Number
                        </Text>

                        <View style={styles.inputContainer}>

                            <Ionicons
                                name="call-outline"
                                size={20}
                                color={Colors.textSecondary}
                            />

                            <TextInput
                                style={styles.input}
                                placeholder="Alternative Contact"
                                placeholderTextColor={Colors.textSecondary}
                                value={secondaryPhone}

                                onChangeText={(val) => {
                                    const cleaned = val.replace(/[^0-9]/g, '');
                                    setSecondaryPhone(cleaned);

                                    const phoneRegex = /^[6-9][0-9]{9}$/;

                                    if (cleaned.length === 10 && !phoneRegex.test(cleaned)) {
                                        setSecondaryPhoneError('Please enter a valid secondary phone number');
                                    } else {
                                        setSecondaryPhoneError('');
                                    }
                                }}
                                keyboardType="phone-pad"
                                maxLength={10}
                            />

                        </View>
                        {secondaryPhoneError ? (
                            <Text style={styles.errorText}>
                                {secondaryPhoneError}
                            </Text>
                        ) : null}
                    </View>

                    {/* Boutique Type */}
                    <Text style={styles.label}>
                        Boutique Type<Text style={{ color: "red", fontSize: 16 }}> *</Text>
                    </Text>

                    <View style={styles.boutiqueTypeContainer}>

                        <TouchableOpacity
                            style={[styles.typeChip, boutiqueType.kids.selected && styles.typeChipActive]}
                            onPress={() => toggleBoutiqueType('kids')}
                            activeOpacity={0.7}
                        >
                            {boutiqueType.kids.selected && <Ionicons name="checkmark" size={14} color={Colors.primary} style={styles.chipIcon} />}
                            <Text style={[styles.typeChipText, boutiqueType.kids.selected && styles.typeChipTextActive]}>Kids</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.typeChip, boutiqueType.women && styles.typeChipActive]}
                            onPress={() => toggleBoutiqueType('women')}
                            activeOpacity={0.7}
                        >
                            {boutiqueType.women && <Ionicons name="checkmark" size={14} color={Colors.primary} style={styles.chipIcon} />}
                            <Text style={[styles.typeChipText, boutiqueType.women && styles.typeChipTextActive]}>Women</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.typeChip, boutiqueType.men && styles.typeChipActive]}
                            onPress={() => toggleBoutiqueType('men')}
                            activeOpacity={0.7}
                        >
                            {boutiqueType.men && <Ionicons name="checkmark" size={14} color={Colors.primary} style={styles.chipIcon} />}
                            <Text style={[styles.typeChipText, boutiqueType.men && styles.typeChipTextActive]}>Men</Text>
                        </TouchableOpacity>


                    </View>

                    {boutiqueType.kids.selected && (
                        <View style={styles.subDivisionContainer}>
                            <View style={styles.boutiqueTypeContainer}>
                                <TouchableOpacity
                                    style={[styles.typeChip, boutiqueType.kids.boy && styles.typeChipActive]}
                                    onPress={() => toggleBoutiqueType('kids', 'boy')}
                                    activeOpacity={0.7}
                                >
                                    {boutiqueType.kids.boy && <Ionicons name="checkmark" size={14} color={Colors.primary} style={styles.chipIcon} />}
                                    <Text style={[styles.typeChipText, boutiqueType.kids.boy && styles.typeChipTextActive]}>Boy</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.typeChip, boutiqueType.kids.girl && styles.typeChipActive]}
                                    onPress={() => toggleBoutiqueType('kids', 'girl')}
                                    activeOpacity={0.7}
                                >
                                    {boutiqueType.kids.girl && <Ionicons name="checkmark" size={14} color={Colors.primary} style={styles.chipIcon} />}
                                    <Text style={[styles.typeChipText, boutiqueType.kids.girl && styles.typeChipTextActive]}>Girl</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    {/* Address */}

                    <Text style={styles.sectionTitle}>
                        Address<Text style={{ color: "red", fontSize: 16 }}> *</Text>
                    </Text>

                    <TextInput
                        style={styles.inputBox}
                        placeholder="Address"
                        value={address}
                        onChangeText={setAddress}
                        placeholderTextColor={Colors.textSecondary}

                    />

                    {/* <TextInput
                        style={styles.inputBox}
                        placeholder="Address Line 2"
                        value={address2}
                        onChangeText={setAddress2}
                    /> */}

                    {/* <TextInput
                        style={styles.inputBox}
                        placeholder="City / District"
                        value={city}
                        onChangeText={setCity}
                    />

                    <TextInput
                        style={styles.inputBox}
                        placeholder="State"
                        value={state}
                        onChangeText={setState}
                    /> */}

                    <TextInput
                        style={styles.inputBox}
                        placeholder="Postal Code"
                        value={postalCode}
                        onChangeText={setPostalCode}
                        keyboardType="phone-pad"
                        placeholderTextColor={Colors.textSecondary}
                    />

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Country<Text style={{ color: "red", fontSize: 16 }}> *</Text></Text>
                        <TouchableOpacity
                            style={styles.dropdownInput}
                            onPress={() => setCountryModal(true)}
                        >
                            <Ionicons
                                name="globe-outline"
                                size={18}
                                color="#908B95"
                                style={{ marginRight: 10 }}
                            />
                            <Text
                                style={[
                                    styles.dropdownInputText,
                                    !country && { color: Colors.textSecondary }
                                ]}
                            >
                                {country || 'Select Country'}
                            </Text>
                            <Ionicons
                                name="chevron-down"
                                size={18}
                                color={Colors.textSecondary}
                                style={{ marginLeft: 10 }}
                            />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>State<Text style={{ color: "red", fontSize: 16 }}> *</Text></Text>
                        <TouchableOpacity
                            style={styles.dropdownInput}
                            onPress={() => setStateModal(true)}
                        >
                            <Ionicons
                                name="business-outline"
                                size={18}
                                color="#908B95"
                                style={{ marginRight: 10 }}
                            />
                            <Text
                                style={[
                                    styles.dropdownInputText,
                                    !state && { color: Colors.textSecondary }
                                ]}
                            >
                                {state || 'Select State'}
                            </Text>
                            <Ionicons
                                name="chevron-down"
                                size={18}
                                color={Colors.textSecondary}
                                style={{ marginLeft: 10 }}
                            />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>City<Text style={{ color: "red", fontSize: 16 }}> *</Text></Text>
                        <TouchableOpacity
                            style={styles.dropdownInput}
                            onPress={() => setCityModal(true)}
                        >
                            <Ionicons
                                name="location-outline"
                                size={18}
                                color="#908B95"
                                style={{ marginRight: 10 }}
                            />
                            <Text
                                style={[
                                    styles.dropdownInputText,
                                    !city && { color: Colors.textSecondary }
                                ]}
                            >
                                {city || 'Select /city'}
                            </Text>
                            <Ionicons
                                name="chevron-down"
                                size={18}
                                color={Colors.textSecondary}
                                style={{ marginLeft: 10 }}
                            />
                        </TouchableOpacity>
                    </View>

                    {/* GST */}

                    <View style={styles.inputGroup}>

                        <Text style={styles.label}>
                            GSTIN
                        </Text>

                        <View style={styles.inputContainer}>

                            <Octicons
                                name="hash"
                                size={20}
                                color={Colors.textSecondary}
                            />

                            <TextInput
                                style={styles.input}
                                placeholder="#33BKPK44338F1ZC"
                                placeholderTextColor={Colors.textSecondary}
                                value={gstin}
                                onChangeText={setGstin}
                            />

                        </View>
                    </View>

                    {/* Business Hours */}
                    {/*
                    <TouchableOpacity style={styles.businessRow} onPress={() => setHoursModal(true)}>

                        <View>

                            <Text style={styles.businessTitle}>
                                Business Hours
                            </Text>

                            <Text style={styles.businessSub}>
                                Set Your Business Hours
                            </Text>

                        </View>

                        <Ionicons
                            name="chevron-forward"
                            size={20}
                            color={Colors.textSecondary}
                        />

                    </TouchableOpacity>
                    <BusinessHoursModal
                        visible={hoursModal}
                        onClose={() => setHoursModal(false)}
                    />
*/}

                </View>

                <TouchableOpacity
                    style={[styles.saveButton, (isSubmitting || isUploadingImage) && { opacity: 0.8 }]}
                    onPress={handleSave}
                    disabled={isSubmitting || isUploadingImage}
                >

                    {isSubmitting ?

                        <ActivityIndicator color={Colors.white} />

                        :

                        <Text style={styles.saveButtonText}>
                            Complete Setup
                        </Text>

                    }

                </TouchableOpacity>

                <Modal
                    visible={countryModal}
                    transparent
                    animationType="fade"
                    onRequestClose={() => setCountryModal(false)}
                >

                    <TouchableOpacity
                        style={styles.modalOverlay}
                        activeOpacity={1}
                        onPress={() => setCountryModal(false)}
                    >

                        <TouchableWithoutFeedback>

                            <View style={styles.modalContainer}>

                                {/* SEARCH BOX */}

                                <TextInput
                                    placeholder="Search country"
                                    placeholderTextColor={Colors.textSecondary}
                                    value={searchCountry}
                                    onChangeText={setSearchCountry}
                                    style={styles.searchInput}
                                />

                                <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

                                    {filteredCountries?.length > 0 ? (
                                        filteredCountries.map((item, index) => (

                                            <TouchableOpacity
                                                key={index}
                                                style={styles.countryItem}
                                                onPress={() => {
                                                    handleCountrySelect(item)
                                                    setCountryModal(false);
                                                    setSearchCountry('');
                                                }}
                                            >

                                                <Text style={styles.countryText}>
                                                    {item.countryName}
                                                </Text>

                                            </TouchableOpacity>

                                        ))
                                    ) : (
                                        <View style={{ padding: 20, alignItems: 'center' }}>
                                            <Text style={{ color: Colors.textSecondary, fontFamily: 'Inter-Medium' }}>No results found</Text>
                                        </View>
                                    )}

                                </ScrollView>

                            </View>

                        </TouchableWithoutFeedback>

                    </TouchableOpacity>

                </Modal>

                <Modal
                    visible={stateModal}
                    transparent
                    animationType="fade"
                    onRequestClose={() => setStateModal(false)}
                >

                    <TouchableOpacity
                        style={styles.modalOverlay}
                        activeOpacity={1}
                        onPress={() => setStateModal(false)}
                    >

                        <TouchableWithoutFeedback>

                            <View style={styles.modalContainer}>

                                {/* SEARCH BOX */}

                                <TextInput
                                    placeholder="Search state"
                                    placeholderTextColor={Colors.textSecondary}
                                    value={searchState}
                                    onChangeText={setSearchState}
                                    style={styles.searchInput}
                                />

                                <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

                                    {filteredStates?.length > 0 ? (
                                        filteredStates.map((item, index) => (

                                            <TouchableOpacity
                                                key={index}
                                                style={styles.countryItem}
                                                onPress={() => {
                                                    handleStateSelect(item)
                                                    setStateModal(false);
                                                    setSearchState('');
                                                }}
                                            >

                                                <Text style={styles.countryText}>
                                                    {item.stateName}
                                                </Text>

                                            </TouchableOpacity>

                                        ))
                                    ) : (
                                        <View style={{ padding: 20, alignItems: 'center' }}>
                                            <Text style={{ color: Colors.textSecondary, fontFamily: 'Inter-Medium' }}>No results found</Text>
                                        </View>
                                    )}

                                </ScrollView>

                            </View>

                        </TouchableWithoutFeedback>

                    </TouchableOpacity>

                </Modal>

                <Modal
                    visible={cityModal}
                    transparent
                    animationType="fade"
                    onRequestClose={() => setCityModal(false)}
                >

                    <TouchableOpacity
                        style={styles.modalOverlay}
                        activeOpacity={1}
                        onPress={() => setCityModal(false)}
                    >

                        <TouchableWithoutFeedback>

                            <View style={styles.modalContainer}>

                                {/* SEARCH BOX */}

                                <TextInput
                                    placeholder="Search City"
                                    placeholderTextColor={Colors.textSecondary}
                                    value={searchCity}
                                    onChangeText={setSearchCity}
                                    style={styles.searchInput}
                                />

                                <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

                                    {filteredCities?.length > 0 ? (
                                        filteredCities.map((item, index) => (

                                            <TouchableOpacity
                                                key={index}
                                                style={styles.countryItem}
                                                onPress={() => {
                                                    setCity(item.cityName);
                                                    setCityId(item.cityId || item.id || 0);
                                                    setCityModal(false);
                                                    setSearchCity('');
                                                }}
                                            >

                                                <Text style={styles.countryText}>
                                                    {item.cityName}
                                                </Text>

                                            </TouchableOpacity>

                                        ))
                                    ) : (
                                        <View style={{ padding: 20, alignItems: 'center' }}>
                                            <Text style={{ color: Colors.textSecondary, fontFamily: 'Inter-Medium' }}>No results found</Text>
                                        </View>
                                    )}

                                </ScrollView>

                            </View>

                        </TouchableWithoutFeedback>

                    </TouchableOpacity>

                </Modal>
            </ScrollView>

            <SuccessModal
                visible={alertVisible}
                onClose={() => setAlertVisible(false)}
                title={alertTitle}
                description={alertDesc}
                type={alertType}
            />

            <ImageZoomModal
                visible={zoomVisible}
                imageUrl={profileImage?.uri}
                onClose={() => setZoomVisible(false)}
            />

            <BottomConfirmationSheet
                visible={showDeleteImageSheet}
                onClose={() => setShowDeleteImageSheet(false)}
                onConfirm={confirmRemoveProfileImage}
                title="Remove image"
                description="Are you sure you want to remove this business image?"
                confirmText="Remove"
                type="danger"
            />

        </KeyboardAvoidingView>

    );
};

const styles = StyleSheet.create({

    container: {
        flex: 1,
        backgroundColor: Colors.background
    },

    scrollContent: {
        padding: Spacing.lg
    },

    title: {
        fontSize: 32,
        fontFamily: 'Inter-SemiBold',
        color: Colors.textPrimary,
    },

    subtitle: {
        marginTop: 6,
        color: Colors.textSecondary,
        fontSize: 17,
        fontFamily: 'Inter-Regular',
        textAlign: 'center',
    },

    imageSection: {
        alignItems: 'center',
        marginTop: 30,
        marginBottom: 20
    },

    imageContainer: {
        position: 'relative',
    },

    initialsContainer: {
        width: 90,
        height: 90,
        borderRadius: 45,
        backgroundColor: Colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },

    profileImage: {
        width: 90,
        height: 90,
        borderRadius: 45,
        resizeMode: 'cover',
    },
    imageLoaderOverlay: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: 45,
        backgroundColor: 'rgba(0, 0, 0, 0.35)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    deleteBtn: {
        position: 'absolute',
        top: 0,
        right: 0,
        backgroundColor: '#FF4D4D',
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: Colors.white,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        zIndex: 1,
    },

    initialsText: {
        fontSize: 36,
        color: '#fff',
        fontFamily: 'Inter-Bold'
    },

    uploadBtn: {
        flexDirection: 'row',
        backgroundColor: '#E9E7FF',
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 8,
        marginTop: 12,
        gap: 6
    },

    uploadBtnDisabled: {
        opacity: 0.75,
    },

    uploadText: {
        color: Colors.primary,
        fontFamily: 'Inter-SemiBold',
        fontSize: 14
    },

    initialsHint: {
        marginTop: 10,
        fontSize: 17,
        color: Colors.textSecondary,
        textAlign: 'center',
        fontFamily: 'Inter-Regular'
    },

    form: {
        marginTop: 20
    },

    inputGroup: {
        marginBottom: 16
    },

    label: {
        fontSize: 16,
        marginBottom: 6,
        fontFamily: 'Inter-SemiBold',
        color: '#000000'
    },

    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 8,
        paddingHorizontal: 12,
        height: 50
    },

    input: {
        flex: 1,
        marginLeft: 10,
        fontSize: 16,
        fontFamily: 'Inter-Medium',
        color: Colors.textPrimary
    },

    inputBox: {
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 8,
        height: 50,
        paddingHorizontal: 12,
        marginBottom: 12,
        fontFamily: 'Inter-Medium',
        color: Colors.textPrimary,
        fontSize: 16
    },

    sectionTitle: {
        fontSize: 14,
        fontFamily: 'Inter-Medium',
        marginBottom: 8,
        color: Colors.textSecondary,
    },

    businessRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 10
    },

    businessTitle: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 16,
        color: '#000000'
    },

    businessSub: {
        color: Colors.textSecondary,
        fontFamily: 'Inter-Regular',
        fontSize: 14
    },

    saveButton: {
        backgroundColor: Colors.primary,
        height: 54,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 30
    },

    saveButtonText: {
        color: '#fff',
        fontSize: 18,
        fontFamily: 'Inter-SemiBold'
    },
    dropdownInput: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        paddingHorizontal: 12,
        paddingVertical: 14,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: Colors.border,
        justifyContent: 'space-between'
    },

    dropdownInputText: {
        fontFamily: 'Inter-Regular',
        fontSize: 15,
        color: Colors.textPrimary,
        flex: 1
    },

    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'center',
        alignItems: 'center'
    },

    modalContainer: {
        width: '85%',
        maxHeight: '60%',
        backgroundColor: '#fff',
        borderRadius: 10,
        paddingVertical: 10
    },

    countryItem: {
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#eee'
    },

    countryText: {
        fontSize: 16,
        color: Colors.textPrimary,
    },
    searchInput: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 6,
        marginHorizontal: 15,
        marginBottom: 10,
        paddingHorizontal: 10,
        paddingVertical: 8,
        color:Colors.textPrimary,
    },
    logoutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-end',
        gap: 6,
        marginBottom: Spacing.sm,
        padding: 8,
    },
    logoutText: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 14,
        color: Colors.danger,
    },

    boutiqueTypeContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.sm,
        marginTop: 8,
        marginBottom: 16,
    },

    typeChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: Colors.border,
        backgroundColor: Colors.card,
    },

    typeChipActive: {
        borderColor: Colors.primary,
        backgroundColor: Colors.primaryLight + '40',
    },

    typeChipText: {
        fontFamily: 'Inter-Medium',
        fontSize: 14,
        color: Colors.textSecondary,
    },

    typeChipTextActive: {
        color: Colors.primary,
        fontFamily: 'Inter-SemiBold',
    },

    chipIcon: {
        marginRight: 6,
    },

    subDivisionContainer: {
        marginLeft: 16,
        marginBottom: 16,
        paddingLeft: 16,
        borderLeftWidth: 1,
        borderLeftColor: Colors.border,
    },
    errorText: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 12,
        color: 'red',
        marginTop: "2%",
        marginLeft: 4,
    }
});

export default OnboardingScreen;
