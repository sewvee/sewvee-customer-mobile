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
    Image,
    Modal,
    TouchableWithoutFeedback
} from 'react-native';
import { Colors, Spacing, Typography, Shadow } from '../constants/theme';
import { Building2, MapPin, Phone, Hash, Mail, ArrowLeft, Save, UploadCloud, Trash2 } from 'lucide-react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../context/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { validateEmail, validatePhone } from '../utils/validation';
import SuccessModal from '../components/SuccessModal';
import ImagePicker from 'react-native-image-crop-picker';
import { useDispatch, useSelector } from 'react-redux';
import { uploadImageAction } from '../store/uploadSlice';
import { getCountries, getStates, getCities } from '../store/authSlice';
import { getCompanyAction, updateCompanyAction } from '../store/companyOnboardSlice';
import ImageZoomModal from '../components/ImageZoomModal';

const EditBusinessProfileScreen = ({ navigation }) => {
    const { company, saveCompany } = useAuth();
    const insets = useSafeAreaInsets();
    const dispatch = useDispatch();

    const { countries, states, cities } = useSelector(state => state.auth);

    const [loading, setLoading] = useState(true);
    const [companyName, setCompanyName] = useState('');
    const [profileImage, setProfileImage] = useState(null);
    const [address, setAddress] = useState('');
    const [phone, setPhone] = useState('');
    const [phoneError, setPhoneError] = useState('');
    const [secondaryPhone, setSecondaryPhone] = useState('');
    const [secondaryPhoneError, setSecondaryPhoneError] = useState('');

    const [email, setEmail] = useState('');
    const [emailError, setEmailError] = useState('');
    const [postalCodeError, setPostalCodeError] = useState('');
    const [gstinError, setGstinError] = useState('');
    const [gstin, setGstin] = useState('');
    const [successVisible, setSuccessVisible] = useState(false);
    const [companyIdVal, setCompanyIdVal] = useState(null);

    // Location fields
    const [postalCode, setPostalCode] = useState('');
    const [country, setCountry] = useState('');
    const [countryId, setCountryId] = useState(0);
    const [state, setState] = useState('');
    const [stateId, setStateId] = useState(0);
    const [city, setCity] = useState('');
    const [cityId, setCityId] = useState(0);


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

    const [countryModal, setCountryModal] = useState(false);
    const [stateModal, setStateModal] = useState(false);
    const [cityModal, setCityModal] = useState(false);

    const [searchCountry, setSearchCountry] = useState('');
    const [searchState, setSearchState] = useState('');
    const [searchCity, setSearchCity] = useState('');

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

        // Fetch company details
        const fetchCompanyDetails = async () => {
            try {
                setLoading(true);
                const res = await dispatch(getCompanyAction()).unwrap();
                console.log('res', res)
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
                    }

                    if (companyData.id) {
                        setCompanyIdVal(companyData.id);
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
            } finally {
                setLoading(false);
            }
        };

        fetchCompanyDetails();
    }, []);

    const handleCountrySelect = (item) => {
        setCountry(item.countryName);
        setCountryId(item.countryId || 0);
        dispatch(getStates(item.countryId));
        setState('');
        setStateId(0);
        setCity('');
        setCityId(0);
    };

    const handleStateSelect = (item) => {
        setState(item.stateName);
        setStateId(item.stateId || 0);
        dispatch(getCities(item.stateId));
        setCity('');
        setCityId(0);
    };


    // Alert Modal state
    const [alertVisible, setAlertVisible] = useState(false);
    const [alertTitle, setAlertTitle] = useState('');
    const [alertDesc, setAlertDesc] = useState('');
    const [alertType, setAlertType] = useState('success');
    const [zoomVisible, setZoomVisible] = useState(false);

    // Get initials from company name
    const getInitials = (name) => {
        return name.trim().substring(0, 2).toUpperCase() || 'BT';
    };

    const handleImagePicker = async () => {
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

            // Set local preview
            setProfileImage(imageData);

            // Dispatch upload and receive the URL 
            setLoading(true);
            const data = await dispatch(uploadImageAction(imageData)).unwrap();

            // Update profileImage with backend URL so it gets saved properly
            if (data?.data?.url) {
                setProfileImage({ 
                    uri: data.data.full_url || data.url, 
                    saveUrl: data.data.url 
                });
            }
            setLoading(false);

        } catch (error) {
            setLoading(false);
            console.log('ImagePicker Error: ', error);
        }
    };

    const handleSave = async () => {
        if (!companyName.trim() || !address.trim()) {
            setAlertTitle('Error');
            setAlertDesc('Please fill all mandatory fields marked with *');
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

        if (!validatePhone(phone)) {
            setAlertTitle('Invalid Phone');
            setAlertDesc('Primary Phone Number must be 10 digits');
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

        if (!validateEmail(email)) {
            setAlertTitle('Invalid Email');
            setAlertDesc('Please enter a valid email address.');
            setAlertType('warning');
            setAlertVisible(true);
            return;
        }

        if (postalCode && !/^[a-zA-Z0-9\s-]{3,12}$/.test(postalCode)) {
            setAlertTitle('Invalid Postal Code');
            setAlertDesc('Please enter a valid postal code.');
            setAlertType('warning');
            setAlertVisible(true);
            return;
        }

        const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
        if (gstin && !gstinRegex.test(gstin)) {
            setAlertTitle('Invalid GSTIN');
            setAlertDesc('Please enter a valid 15-digit GSTIN.');
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

        setLoading(true);
        try {
            const payload = {
                name: companyName,
                address: address,
                phone: phone,
                secondaryPhone: secondaryPhone,
                email: email,
                gstin: gstin,
                termsAndConditions: "",
                subscriptionId: company?.subscriptionId || "",
                planId: company?.planId || 0,
                countryId: countryId,
                stateId: stateId,
                districtId: cityId,
                pincode: postalCode,
                profileIconUrl: profileImage?.saveUrl || profileImage?.uri || "",
                timing: company?.timing || "",
                sections: {
                    men: boutiqueType.men,
                    women: boutiqueType.women,
                    kids: {
                        boy: boutiqueType.kids.boy,
                        girl: boutiqueType.kids.girl
                    }
                }
            };

            await dispatch(updateCompanyAction({ id: companyIdVal, payload })).unwrap();

            await saveCompany({
                ...company,
                name: companyName,
                address,
                phone,
                secondaryPhone,
                email,
                gstin,
                profileIconUrl: profileImage?.uri, // Save image url back to context
                pincode: postalCode,
                countryId,
                countryName: country,
                stateId,
                stateName: state,
                cityId,
                cityName: city
            });
            setSuccessVisible(true);
        } catch (error) {
            console.log("UPDATE COMPANY ERROR", error, JSON.stringify(error?.response?.data || error));
            setAlertTitle('Error');
            setAlertDesc('Failed to save business details. Please try again.');
            setAlertType('error');
            setAlertVisible(true);
        } finally {
            setLoading(false);
        }
    };

    const handleSuccessDone = () => {
        setSuccessVisible(false);
        navigation.goBack();
    };

    if (loading && !companyName) {
        return (
            <View style={[styles.container, styles.loaderContainer, { paddingTop: insets.top }]}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <ArrowLeft size={24} color={Colors.textPrimary} />
                    </TouchableOpacity>
                    <Text style={Typography.h3}>Edit Business Profile</Text>
                    <View style={{ width: 32 }} />
                </View>
                <View style={styles.centerLoader}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                </View>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ArrowLeft size={24} color={Colors.textPrimary} />
                </TouchableOpacity>
                <Text style={Typography.h3}>Edit Business Profile</Text>
                <TouchableOpacity onPress={handleSave} style={styles.saveIconButton}>
                    <Save size={24} color={Colors.primary} />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.imageSection}>
                    <View style={[styles.initialsContainer, profileImage && { backgroundColor: 'transparent' }]}>
                        {profileImage ? (
                            <View>
                                <TouchableOpacity 
                                    activeOpacity={1} 
                                    onPress={() => setZoomVisible(true)}
                                >
                                    <Image
                                        source={{ uri: profileImage.uri }}
                                        style={styles.profileImage}
                                    />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.deleteBtn}
                                    onPress={() => setProfileImage(null)}
                                >
                                    <Trash2 size={16} color={Colors.white} />
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <Text style={styles.initialsText}>{getInitials(companyName)}</Text>
                        )}
                    </View>

                    <TouchableOpacity style={styles.uploadBtn} onPress={handleImagePicker}>
                        <UploadCloud size={20} color={Colors.primary} />
                        <Text style={styles.uploadText}>
                            {profileImage ? 'Change Image' : 'Upload Image'}
                        </Text>
                    </TouchableOpacity>

                    <Text style={styles.initialsHint}>{!profileImage && 'Your business initials'}</Text>
                </View>

                <View style={styles.form}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Business Name<Text style={{ color: "red", fontSize: 16 }}> *</Text></Text>
                        <View style={styles.inputContainer}>
                            <Building2 size={18} color={Colors.textSecondary} />
                            <TextInput
                                style={styles.input}
                                placeholderTextColor={Colors.textSecondary}
                                placeholder="Enter boutique name"
                                value={companyName}
                                onChangeText={setCompanyName}
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Email Address<Text style={{ color: "red", fontSize: 16 }}> *</Text></Text>
                        <View style={styles.inputContainer}>
                            <Mail size={18} color={Colors.textSecondary} />
                            <TextInput
                                style={styles.input}
                                placeholderTextColor={Colors.textSecondary}
                                placeholder="boutique@example.com"
                                value={email}
                                onChangeText={(val) => {
                                    setEmail(val);
                                    if (val.length > 0 && !validateEmail(val)) {
                                        setEmailError('Please enter a valid email address');
                                    } else {
                                        setEmailError('');
                                    }
                                }}
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                        </View>
                        {emailError ? (
                            <Text style={styles.errorText}>
                                {emailError}
                            </Text>
                        ) : null}
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Primary Phone Number<Text style={{ color: "red", fontSize: 16 }}> *</Text></Text>
                        <View style={styles.inputContainer}>
                            <Phone size={18} color={Colors.textSecondary} />
                            <TextInput
                                style={styles.input}
                                placeholderTextColor={Colors.textSecondary}
                                placeholder="Customer care number"
                                value={phone}
                                onChangeText={(val) => {
                                    const cleaned = val.replace(/[^0-9]/g, '');
                                    setPhone(cleaned);
                                    const phoneRegex = /^[6-9][0-9]{9}$/;
                                    if (cleaned.length > 0 && cleaned[0] < '6') {
                                        setPhoneError('Please enter a valid phone number');
                                    } else if (cleaned.length === 10 && !phoneRegex.test(cleaned)) {
                                        setPhoneError('Please enter a valid phone number');
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

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Secondary Phone Number</Text>
                        <View style={styles.inputContainer}>
                            <Phone size={18} color={Colors.textSecondary} />
                            <TextInput
                                style={styles.input}
                                placeholderTextColor={Colors.textSecondary}
                                placeholder="Alternative contact"
                                value={secondaryPhone}
                                onChangeText={(val) => {
                                    const cleaned = val.replace(/[^0-9]/g, '');
                                    setSecondaryPhone(cleaned);
                                    const phoneRegex = /^[6-9][0-9]{9}$/;
                                    if (cleaned.length > 0 && cleaned[0] < '6') {
                                        setSecondaryPhoneError('Please enter a valid phone number');
                                    } else if (cleaned.length === 10 && !phoneRegex.test(cleaned)) {
                                        setSecondaryPhoneError('Please enter a valid phone number');
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
                    <Text style={styles.label}>Boutique Type<Text style={{ color: "red", fontSize: 16 }}> *</Text></Text>
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



                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Address<Text style={{ color: "red", fontSize: 16 }}> *</Text></Text>
                        <View style={[styles.inputContainer, styles.multiLineContainer]}>
                            <MapPin size={18} color={Colors.textSecondary} style={{ marginTop: 10 }} />
                            <TextInput
                                style={[styles.input, styles.multiLineInput]}
                                placeholderTextColor={Colors.textSecondary}
                                placeholder="Full address..."
                                value={address}
                                onChangeText={setAddress}
                                multiline
                                numberOfLines={3}
                                textAlignVertical="top"
                            />
                        </View>
                    </View>

                    <TextInput
                        style={styles.inputBox}
                        placeholderTextColor={Colors.textSecondary}
                        placeholder="Postal Code"
                        value={postalCode}
                        onChangeText={(val) => {
                            setPostalCode(val);
                            if (val.length > 0 && !/^[a-zA-Z0-9\s-]{3,12}$/.test(val)) {
                                setPostalCodeError('Invalid postal code');
                            } else {
                                setPostalCodeError('');
                            }
                        }}
                        keyboardType="default"
                        maxLength={12}
                    />
                    {postalCodeError ? (
                        <Text style={[styles.errorText, { marginTop: -8, marginBottom: 8 }]}>
                            {postalCodeError}
                        </Text>
                    ) : null}

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
                                {city || 'Select City'}
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
                        <Text style={styles.label}>GSTIN</Text>
                        <View style={styles.inputContainer}>
                            <Hash size={18} color={Colors.textSecondary} />
                            <TextInput
                                style={styles.input}
                                placeholderTextColor={Colors.textSecondary}
                                placeholder="33BKPK44338F1ZC"
                                value={gstin}
                                onChangeText={(val) => {
                                    setGstin(val);
                                    const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
                                    if (val.length > 0 && !gstinRegex.test(val)) {
                                        setGstinError('Invalid GSTIN format');
                                    } else {
                                        setGstinError('');
                                    }
                                }}
                                autoCapitalize="characters"
                                maxLength={15}
                            />
                        </View>
                        {gstinError ? (
                            <Text style={styles.errorText}>
                                {gstinError}
                            </Text>
                        ) : null}
                    </View>

                </View>

                <TouchableOpacity
                    style={[styles.saveButton, loading && { opacity: 0.8 }]}
                    onPress={handleSave}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color={Colors.white} />
                    ) : (
                        <Text style={styles.saveButtonText}>Save Changes</Text>
                    )}
                </TouchableOpacity>

                <View style={{ height: 40 }} />
            </ScrollView>

            <SuccessModal
                visible={successVisible}
                onClose={handleSuccessDone}
                title="Profile Updated"
                description="Your business profile has been successfully updated."
            />

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

            {/* MODALS */}
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
                                                handleCountrySelect(item);
                                                setCountryModal(false);
                                                setSearchCountry('');
                                            }}
                                        >
                                            <Text style={styles.countryText}>{item.countryName}</Text>
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
                                                handleStateSelect(item);
                                                setStateModal(false);
                                                setSearchState('');
                                            }}
                                        >
                                            <Text style={styles.countryText}>{item.stateName}</Text>
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
                                            <Text style={styles.countryText}>{item.cityName}</Text>
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

        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.md,
        paddingBottom: Spacing.md,
        backgroundColor: Colors.white,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    backButton: {
        padding: 4,
    },
    saveIconButton: {
        padding: 4,
    },
    scrollContent: {
        padding: Spacing.lg,
    },
    imageSection: {
        alignItems: 'center',
        marginBottom: Spacing.xl,
    },

    imageContainer: {
        position: 'relative',
    },
    initialsContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: Colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        ...Shadow.medium,
    },
    profileImage: {
        width: 100,
        height: 100,
        borderRadius: 50,
        resizeMode: 'cover',
    },
    deleteBtn: {
        position: 'absolute',
        top: 0,
        right: 0,
        backgroundColor: '#FF4D4D',
        width: 32,
        height: 32,
        borderRadius: 16,
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
        fontFamily: 'Inter-Bold',
        fontSize: 36,
        color: Colors.white,
    },
    initialsHint: {
        fontFamily: 'Inter-Regular',
        fontSize: 12,
        color: Colors.textSecondary,
        marginTop: 8,
    },
    uploadBtn: {
        flexDirection: 'row',
        backgroundColor: '#E9E7FF',
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 8,
        marginTop: 12,
        gap: 6,
        alignItems: 'center'
    },
    uploadText: {
        color: Colors.primary,
        fontFamily: 'Inter-SemiBold',
        fontSize: 14
    },
    form: {
        gap: Spacing.md,
    },
    inputGroup: {
        gap: 6,
    },
    label: {
        fontFamily: 'Inter-Medium',
        fontSize: 14,
        color: Colors.textPrimary,
        marginLeft: 4,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.card,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 12,
        paddingHorizontal: Spacing.md,
        height: 52,
    },
    multiLineContainer: {
        height: 100,
        alignItems: 'flex-start',
        paddingTop: 8,
    },
    input: {
        flex: 1,
        fontFamily: 'Inter-Regular',
        fontSize: 15,
        color: Colors.textPrimary,
        marginLeft: Spacing.sm,
    },
    multiLineInput: {
        height: '100%',
    },
    saveButton: {
        backgroundColor: Colors.primary,
        borderRadius: 12,
        height: 54,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: Spacing.xl,
        ...Shadow.medium,
    },
    saveButtonText: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 16,
        color: Colors.white,
    },
    inputBox: {
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 12,
        height: 52,
        paddingHorizontal: 15,
        marginBottom: 12,
        fontFamily: 'Inter-Regular',
        color: Colors.textPrimary,
        fontSize: 15,
        backgroundColor: Colors.card
    },
    dropdownInput: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.card,
        paddingHorizontal: 12,
        height: 52,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: Colors.border,
        justifyContent: 'space-between'
    },

    boutiqueTypeContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.sm,
        marginTop: 4,
        marginBottom: 8,
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
        marginBottom: 8,
        paddingLeft: 16,
        borderLeftWidth: 1,
        borderLeftColor: Colors.border,
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
        paddingVertical: 8
    },
    loaderContainer: {
        backgroundColor: Colors.white,
    },
    centerLoader: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 12,
        fontFamily: 'Inter-Medium',
        fontSize: 15,
        color: Colors.textSecondary,
    },
    errorText: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 12,
        color: 'red',
        marginTop: "1%",
        marginLeft: 4,
    }
});

export default EditBusinessProfileScreen;
