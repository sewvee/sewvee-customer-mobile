import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { createCustomerAction, fetchCustomersAction } from '../store/customerSlice';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    StatusBar,
    ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Colors, Spacing, Shadow } from '../constants/theme';
import { validatePhone } from '../utils/validation';
import { useToast } from '../context/ToastContext';

const COUNTRY_CODES = [
    { code: '+91', name: 'India', flag: '🇮🇳' },
    { code: '+1', name: 'USA/Canada', flag: '🇺🇸' },
    { code: '+44', name: 'UK', flag: '🇬🇧' },
    { code: '+971', name: 'UAE', flag: '🇦🇪' },
    { code: '+61', name: 'Australia', flag: '🇦🇺' },
    { code: '+65', name: 'Singapore', flag: '🇸🇬' },
    { code: '+60', name: 'Malaysia', flag: '🇲🇾' },
    { code: '+94', name: 'Sri Lanka', flag: '🇱🇰' },
    { code: '+977', name: 'Nepal', flag: '🇳🇵' },
    { code: '+880', name: 'Bangladesh', flag: '🇧🇩' },
    { code: '+27', name: 'South Africa', flag: '🇿🇦' },
    { code: '+353', name: 'Ireland', flag: '🇮🇪' },
    { code: '+31', name: 'Netherlands', flag: '🇳🇱' },
    { code: '+960', name: 'Maldives', flag: '🇲🇻' },
];

const AddCustomerScreen = ({ navigation }) => {
    const { showToast } = useToast();

    const [name, setName] = useState('');
    const [countryCode, setCountryCode] = useState('+91');
    const [selectedFlag, setSelectedFlag] = useState('🇮🇳');
    const [mobile, setMobile] = useState('');
    const [mobileError, setMobileError] = useState('');
    const [showCountryPicker, setShowCountryPicker] = useState(false);

    const [location, setLocation] = useState('');
    const [loading, setLoading] = useState(false);
    const dispatch = useDispatch();

    const handleSave = async () => {
        if (!name.trim()) {
            showToast('Please enter customer name', 'error');
            return;
        }

        if (!mobile || mobile.length < 7 || mobile.length > 15) {
            showToast('Please enter a valid mobile number (7-15 digits)', 'error');
            return;
        }
        
        if (!countryCode || !countryCode.startsWith('+')) {
            showToast('Please enter a valid country code starting with +', 'error');
            return;
        }

        setLoading(true);

        try {
            const payload = {
                name: name,
                countryCode: countryCode,
                mobile: mobile,
            };
            if (location && location.trim().length > 0) {
                payload.location = location.trim();
            }

            const resultAction = await dispatch(createCustomerAction(payload));

            if (createCustomerAction.fulfilled.match(resultAction)) {
                const payload = resultAction.payload;

                // Handle case where API returns HTTP 200 but includes an error response
                if (payload?.success === false || payload?.statusCode >= 400 || payload?.error) {
                    showToast(payload.message || 'Failed to add customer', 'error');
                } else {
                    const successMessage = payload?.message || 'Customer added successfully!';
                    showToast(successMessage, 'success');
                    await dispatch(fetchCustomersAction()); // Refresh list
                    navigation.goBack();
                }
            } else {
                showToast(resultAction.payload?.message || 'Failed to add customer', 'error');
            }
        } catch (e) {
            showToast('An error occurred. Try again.', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar
                backgroundColor={Colors.background}
                barStyle="dark-content"
            />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={styles.container}
            >

                {/* HEADER */}
                <View style={styles.header}>
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        style={styles.backButton}
                    >
                        <Ionicons
                            name="arrow-back"
                            size={24}
                            color={Colors.textPrimary}
                        />
                    </TouchableOpacity>

                    <Text style={styles.headerTitle}>
                        Add Customer
                    </Text>
                </View>

                {/* CONTENT */}
                <View style={styles.content}>
                    <View style={styles.form}>

                        {/* Name */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Customer Name<Text style={{ color: "red", fontSize: 16 }}> *</Text></Text>
                            <View style={styles.inputContainer}>
                                <Ionicons
                                    name="person-outline"
                                    size={20}
                                    color={Colors.textSecondary}
                                />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter customer name"
                                    placeholderTextColor="#6B7280"
                                    value={name}
                                    onChangeText={setName}
                                />
                            </View>
                        </View>

                        {/* Mobile */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>WhatsApp Number<Text style={{ color: "red", fontSize: 16 }}> *</Text></Text>
                            <View style={styles.inputContainer}>
                                <TouchableOpacity
                                    style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        paddingHorizontal: 8,
                                        borderRightWidth: 1,
                                        borderColor: Colors.border,
                                        marginRight: 8,
                                        height: '100%'
                                    }}
                                    onPress={() => setShowCountryPicker(true)}
                                >
                                    <Text style={{ fontSize: 18, marginRight: 4 }}>{selectedFlag}</Text>
                                    <Text style={{ fontFamily: 'Inter-Medium', fontSize: 15, color: Colors.textPrimary }}>
                                        {countryCode}
                                    </Text>
                                    <Ionicons name="chevron-down" size={14} color={Colors.textSecondary} style={{ marginLeft: 4 }} />
                                </TouchableOpacity>
                                <TextInput
                                    style={[styles.input, { marginLeft: 0 }]}
                                    placeholder="Enter whatsapp number"
                                    placeholderTextColor="#6B7280"
                                    value={mobile}
                                    onChangeText={(val) => {
                                        const cleaned = val.replace(/[^0-9]/g, '');
                                        setMobile(cleaned);
                                        if (cleaned.length > 0 && (cleaned.length < 7 || cleaned.length > 15)) {
                                            setMobileError('Please enter a valid whatsapp number');
                                        } else {
                                            setMobileError('');
                                        }
                                    }}
                                    keyboardType="phone-pad"
                                    maxLength={15}
                                />
                            </View>
                            {mobileError ? (
                                <Text style={styles.errorText}>
                                    {mobileError}
                                </Text>
                            ) : null}
                        </View>

                        {/* Location */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Location</Text>
                            <View style={styles.inputContainer}>
                                <Ionicons
                                    name="location-outline"
                                    size={20}
                                    color={Colors.textSecondary}
                                />
                                <TextInput
                                    style={styles.input}
                                    placeholder="City, Area or Full Address"
                                    placeholderTextColor="#6B7280"
                                    value={location}
                                    onChangeText={setLocation}
                                />
                            </View>
                        </View>

                        {/* Button */}
                        <TouchableOpacity
                            style={[
                                styles.saveButton,
                                loading && { opacity: 0.8 }
                            ]}
                            onPress={handleSave}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color={Colors.white} />
                            ) : (
                                <Text style={styles.saveButtonText}>
                                    Add Customer
                                </Text>
                            )}
                        </TouchableOpacity>

                    </View>
                </View>

                {/* Country Code Picker Modal */}
                {showCountryPicker && (
                    <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }]}>
                        <View style={{ width: '85%', maxHeight: '70%', backgroundColor: '#FFF', borderRadius: 12, padding: 16, ...Shadow.medium }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                <Text style={{ fontSize: 18, fontFamily: 'Inter-SemiBold', color: Colors.textPrimary }}>Select Country</Text>
                                <TouchableOpacity onPress={() => setShowCountryPicker(false)}>
                                    <Ionicons name="close" size={24} color={Colors.textSecondary} />
                                </TouchableOpacity>
                            </View>
                            
                            <ScrollView style={{ flexShrink: 1 }}>
                                {COUNTRY_CODES.map((country, index) => (
                                    <TouchableOpacity
                                        key={index}
                                        style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            paddingVertical: 12,
                                            borderBottomWidth: index === COUNTRY_CODES.length - 1 ? 0 : 1,
                                            borderBottomColor: Colors.border
                                        }}
                                        onPress={() => {
                                            setCountryCode(country.code);
                                            setSelectedFlag(country.flag);
                                            setShowCountryPicker(false);
                                        }}
                                    >
                                        <Text style={{ fontSize: 24, marginRight: 12 }}>{country.flag}</Text>
                                        <Text style={{ flex: 1, fontFamily: 'Inter-Medium', fontSize: 16, color: Colors.textPrimary }}>
                                            {country.name}
                                        </Text>
                                        <Text style={{ fontFamily: 'Inter-SemiBold', fontSize: 16, color: Colors.textSecondary }}>
                                            {country.code}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    </View>
                )}

            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },

    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },

    /* HEADER */
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.lg,
        paddingVertical: 14,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },

    backButton: {
        marginRight: 16,
    },

    headerTitle: {
        fontSize: 18,
        fontFamily: 'Inter-SemiBold',
        color: Colors.textPrimary,
        fontWeight: "700"
    },

    content: {
        padding: Spacing.lg,
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
        fontWeight: "600"
    },

    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.card,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 8,
        paddingHorizontal: Spacing.md,
        height: 50,
    },

    input: {
        flex: 1,
        fontFamily: 'Inter-Regular',
        fontSize: 15,
        color: Colors.textPrimary,
        marginLeft: Spacing.sm,
    },

    saveButton: {
        backgroundColor: Colors.primary,
        borderRadius: 8,
        height: 54,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: Spacing.lg,
        ...Shadow.medium,
    },

    saveButtonText: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 16,
        color: Colors.white,
    },
    errorText: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 12,
        color: 'red',
        marginTop: "1%",
        marginLeft: 4,
    }
});

export default AddCustomerScreen;
