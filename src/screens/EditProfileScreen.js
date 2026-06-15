import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator
} from 'react-native';
import { Colors, Spacing, Typography, Shadow } from '../constants/theme';
import { User, Phone, Mail, ArrowLeft, Save, Lock, Camera, UploadCloud, Trash2 } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { useDispatch, useSelector } from 'react-redux';
import { fetchUserProfile, updateUserProfile, resetUpdateStatus } from '../store/profileSlice';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEffect } from 'react';
import { Image } from 'react-native';
import { validateEmail, validatePhone } from '../utils/validation';
import SuccessModal from '../components/SuccessModal';
import ChangePinModal from '../components/ChangePinModal';
import ImagePicker from 'react-native-image-crop-picker';
import { uploadImageAction } from '../store/uploadSlice';
import ImageZoomModal from '../components/ImageZoomModal';
import { getUserProfilePhotoUri } from '../utils/branding';

const EditProfileScreen = ({ navigation }) => {
    const { user, company, saveUser } = useAuth();
    const dispatch = useDispatch();
    const {
        profileData: userProfile,
        loading: profileLoading,
        updateLoading,
        updateSuccess,
        updateError
    } = useSelector(state => state.profile);
    const { data: companyData } = useSelector(state => state.companyOnboard);
    const insets = useSafeAreaInsets();
    const [screenLoading, setScreenLoading] = useState(!userProfile);

    useEffect(() => {
        let isMounted = true;

        const loadProfile = async () => {
            if (userProfile) {
                if (isMounted) {
                    setScreenLoading(false);
                }
                return;
            }

            if (isMounted) {
                setScreenLoading(true);
            }

            try {
                await dispatch(fetchUserProfile()).unwrap();
            } catch (error) {
                console.log('Failed to fetch profile in EditProfile:', error);
            } finally {
                if (isMounted) {
                    setScreenLoading(false);
                }
            }
        };

        loadProfile();

        return () => {
            isMounted = false;
        };
    }, [dispatch, userProfile]);

    // Form State
    const [name, setName] = useState(userProfile?.fullName || user?.name || '');
    const [email, setEmail] = useState(userProfile?.email || user?.email || '');
    const [mobile, setMobile] = useState(userProfile?.mobileNo || user?.mobile || user?.phone || '');
    const [profileImage, setProfileImage] = useState(null);
    const [mobileError, setMobileError] = useState('');
    const [emailError, setEmailError] = useState('');


    useEffect(() => {
        if (userProfile) {
            setName(userProfile.fullName);
            setEmail(userProfile.email || '');
            setMobile(userProfile.mobileNo || '');
            if (userProfile.profilePhotoUrl) {
                setProfileImage({ uri: userProfile.profilePhotoUrl });
            }
        }
    }, [userProfile]);

    useEffect(() => {
        if (updateSuccess) {
            setSuccessVisible(true);
            if (userProfile) {
                saveUser({
                    ...user,
                    name: userProfile.fullName,
                    email: userProfile.email,
                    mobile: userProfile.mobileNo,
                    profilePhotoUrl: userProfile.profilePhotoUrl
                });
            }
            dispatch(resetUpdateStatus());
        }
    }, [updateSuccess, dispatch, userProfile, user, saveUser]);

    useEffect(() => {
        if (updateError) {
            showAlert('Error', updateError || 'Failed to update profile. Please try again.', 'error');
            dispatch(resetUpdateStatus());
        }
    }, [updateError, dispatch]);

    const editableProfileImageUri = getUserProfilePhotoUri(
        profileImage,
        userProfile,
        user,
    );
    const avatarImageUri = editableProfileImageUri;
    const avatarFallbackName =
        name ||
        userProfile?.fullName ||
        companyData?.name ||
        company?.name ||
        user?.name ||
        '';

    const getInitials = (fullName) => {
        if (!fullName || !fullName.trim()) return 'Aa';
        const name = fullName.trim();
        if (name.length >= 2) {
            return name[0].toUpperCase() + name[1].toLowerCase();
        }
        return name.toUpperCase();
    };

    const [imageUploading, setImageUploading] = useState(false);
    const [successVisible, setSuccessVisible] = useState(false);

    // PIN Modal State
    const [changePinVisible, setChangePinVisible] = useState(false);
    const [pinSuccessVisible, setPinSuccessVisible] = useState(false);

    // Alert State
    const [alertVisible, setAlertVisible] = useState(false);
    const [alertConfig, setAlertConfig] = useState({ title: '', message: '', type: 'info' });
    const [zoomVisible, setZoomVisible] = useState(false);

    const showAlert = (title, message, type) => {
        setAlertConfig({ title, message, type });
        setAlertVisible(true);
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
                key_name: 'profile_photo'
            };

            // Set local preview
            setProfileImage(imageData);

            // Dispatch upload and receive the URL 
            setImageUploading(true);
            const data = await dispatch(uploadImageAction(imageData)).unwrap();

            // Update profileImage with backend URL so it gets saved properly
            if (data?.data?.url) {
                setProfileImage({ 
                    uri: data.data.full_url || data.url, 
                    saveUrl: data.data.url 
                });
            }
            setImageUploading(false);

        } catch (error) {
            setImageUploading(false);
            console.log('ImagePicker Error: ', error);
        }
    };

    const isInitialLoading = screenLoading || (profileLoading && !userProfile);

    const handleSave = async () => {
        if (!name.trim()) {
            showAlert('Valid Name Required', 'Please enter your full name.', 'warning');
            return;
        }
        if (!validatePhone(mobile)) {
            showAlert('Invalid Phone', 'Please enter a valid 10-digit mobile number.', 'warning');
            return;
        }
        if (email && !validateEmail(email)) {
            showAlert('Invalid Email', 'Please enter a valid email address.', 'warning');
            return;
        }

        const phoneRegex = /^[6-9][0-9]{9}$/;
        if (!phoneRegex.test(mobile)) {
            showAlert('Invalid Phone', 'Please provide a valid phone number starting with 6-9', 'warning');
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (email && !emailRegex.test(email)) {
            showAlert('Invalid Email', 'Please provide a valid email address', 'warning');
            return;
        }

        const payload = {
            fullName: name,
            email: email,
            mobileNo: mobile,
            profilePhotoUrl: profileImage?.saveUrl || profileImage?.uri || ""
        };
        console.log('HANDLESAVE - Profile Update Payload:', payload);
        dispatch(updateUserProfile(payload));
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            {/* <View style={styles.container}> */}

            {/* HEADER */}

            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ArrowLeft size={24} color={Colors.textPrimary} />
                </TouchableOpacity>
                <Text style={Typography.h3}>Edit Profile</Text>
                <TouchableOpacity onPress={handleSave} style={styles.saveIconButton} disabled={isInitialLoading}>
                    <Save size={24} color={Colors.primary} />
                </TouchableOpacity>
            </View>

            {isInitialLoading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                    <Text style={styles.loadingText}>Loading profile...</Text>
                </View>
            ) : (
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.avatarSection}>
                    <View style={[styles.avatarContainer, avatarImageUri && { backgroundColor: 'transparent' }]}>
                        {avatarImageUri ? (
                            <View>
                                <TouchableOpacity 
                                    activeOpacity={1} 
                                    onPress={() => setZoomVisible(true)}
                                >
                                    <Image
                                        source={{ uri: avatarImageUri }}
                                        style={styles.avatarImage}
                                    />
                                </TouchableOpacity>
                                {profileImage?.uri ? (
                                    <TouchableOpacity
                                        style={styles.deleteBtn}
                                        onPress={() => setProfileImage(null)}
                                    >
                                        <Trash2 size={16} color={Colors.white} />
                                    </TouchableOpacity>
                                ) : null}
                            </View>
                        ) : (
                            <Text style={styles.avatarText}>{getInitials(avatarFallbackName)}</Text>
                        )}
                    </View>

                    <TouchableOpacity
                        style={[styles.uploadBtn, imageUploading && { opacity: 0.7 }]}
                        onPress={handleImagePicker}
                        disabled={imageUploading}
                    >
                        <UploadCloud size={20} color={Colors.primary} />
                        <Text style={styles.uploadText}>
                            {imageUploading
                                ? 'Uploading...'
                                : profileImage
                                    ? 'Change Image'
                                    : 'Upload Image'}
                        </Text>
                    </TouchableOpacity>

                    {/* <Text style={styles.avatarHint}>{!profileImage && 'Your profile initials'}</Text> */}
                </View>

                <View style={styles.form}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Full Name<Text style={{ color: "red", fontSize: 16 }}> *</Text></Text>
                        <View style={styles.inputContainer}>
                            <User size={18} color={Colors.textSecondary} />
                            <TextInput
                                style={styles.input}
                                placeholder="Enter your Name"
                                placeholderTextColor={Colors.textSecondary}
                                value={name}
                                onChangeText={setName}
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Mobile Number<Text style={{ color: "red", fontSize: 16 }}> *</Text></Text>
                        <View style={styles.inputContainer}>
                            <Phone size={18} color={Colors.textSecondary} />
                            <TextInput
                                style={styles.input}
                                placeholder="Enter your mobile number"
                                placeholderTextColor={Colors.textSecondary}
                                value={mobile}
                                onChangeText={(val) => {
                                    const cleaned = val.replace(/[^0-9]/g, '');
                                    setMobile(cleaned);
                                    const phoneRegex = /^[6-9][0-9]{9}$/;
                                    if (cleaned.length > 0 && cleaned[0] < '6') {
                                        setMobileError('Please enter a valid mobile number');
                                    } else if (cleaned.length === 10 && !phoneRegex.test(cleaned)) {
                                        setMobileError('Please enter a valid mobile number');
                                    } else {
                                        setMobileError('');
                                    }
                                }}
                                 keyboardType="phone-pad"
                                maxLength={10}
                            />
                        </View>
                        {mobileError ? (
                            <Text style={styles.errorText}>
                                {mobileError}
                            </Text>
                        ) : null}
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Email ID<Text style={{ color: "red", fontSize: 16 }}> *</Text></Text>
                        <View style={styles.inputContainer}>
                            <Mail size={18} color={Colors.textSecondary} />
                            <TextInput
                                style={styles.input}
                                placeholder="Enter your email id"
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
                                autoCapitalize="none"
                            />
                        </View>
                        {emailError ? (
                            <Text style={styles.errorText}>
                                {emailError}
                            </Text>
                        ) : null}
                    </View>
                </View>

                {/* Security Section specific to User */}
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>Security</Text>
                    <TouchableOpacity style={styles.securityCard} onPress={() => setChangePinVisible(true)}>
                        <View style={styles.securityIcon}>
                            <Lock size={20} color={Colors.white} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.securityTitle}>Change App PIN</Text>
                            <Text style={styles.securitySubtitle}>Update your 4-digit security code</Text>
                        </View>
                        <View style={styles.arrowIcon}>
                            <ArrowLeft size={16} color={Colors.textSecondary} style={{ transform: [{ rotate: '180deg' }] }} />
                        </View>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity
                    style={[styles.saveButton, updateLoading && { opacity: 0.8 }]}
                    onPress={handleSave}
                    disabled={updateLoading}
                >
                    {updateLoading ? (
                        <ActivityIndicator color={Colors.white} />
                    ) : (
                        <Text style={styles.saveButtonText}>Save Changes</Text>
                    )}
                </TouchableOpacity>

                <View style={{ height: 40 }} />
            </ScrollView>
            )}

            {/* Modals */}
            <SuccessModal
                visible={successVisible}
                onClose={() => {
                    setSuccessVisible(false);
                    navigation.goBack();
                }}
                title="Profile Updated"
                description="Your personal details have been updated."
            />

            <ChangePinModal
                visible={changePinVisible}
                onClose={() => setChangePinVisible(false)}
                onSuccess={() => {
                    setChangePinVisible(false);
                    setTimeout(() => setPinSuccessVisible(true), 500);
                }}
            />

            <SuccessModal
                visible={pinSuccessVisible}
                onClose={() => setPinSuccessVisible(false)}
                title="PIN Updated"
                description="Your security PIN has been changed successfully."
                type="success"
            />

            <SuccessModal
                visible={alertVisible}
                onClose={() => setAlertVisible(false)}
                title={alertConfig.title}
                description={alertConfig.message}
                type={alertConfig.type}
            />

            <ImageZoomModal
                visible={zoomVisible}
                imageUrl={avatarImageUri}
                onClose={() => setZoomVisible(false)}
            />
            {/* </View> */}
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: Spacing.lg,
    },
    loadingText: {
        marginTop: Spacing.md,
        fontFamily: 'Inter-Medium',
        fontSize: 14,
        color: Colors.textSecondary,
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
    avatarSection: {
        alignItems: 'center',
        marginBottom: Spacing.xl,
    },
    avatarContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: Colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        ...Shadow.medium,
    },
    avatarImage: {
        width: 100,
        height: 100,
        borderRadius: 50,
    },
    cameraIcon: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        backgroundColor: Colors.secondary || Colors.primary,
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: Colors.white,
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
    },
    avatarText: {
        fontFamily: 'Inter-Bold',
        fontSize: 32,
        color: Colors.white,
    },
    avatarHint: {
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
        marginBottom: Spacing.xl,
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
    input: {
        flex: 1,
        fontFamily: 'Inter-Regular',
        fontSize: 15,
        color: Colors.textPrimary,
        marginLeft: Spacing.sm,
    },
    section: {
        marginBottom: Spacing.xl,
    },
    sectionLabel: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 13,
        color: Colors.textSecondary,
        marginBottom: 10,
        marginLeft: 4,
        textTransform: 'uppercase',
    },
    securityCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.card,
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: Colors.border,
        ...Shadow.subtle,
    },
    securityIcon: {
        width: 40,
        height: 40,
        borderRadius: 10,
        backgroundColor: '#EF4444',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    securityTitle: {
        fontFamily: 'Inter-Medium',
        fontSize: 15,
        color: Colors.textPrimary,
    },
    securitySubtitle: {
        fontFamily: 'Inter-Regular',
        fontSize: 13,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    arrowIcon: {
        marginLeft: 8,
    },
    saveButton: {
        backgroundColor: Colors.primary,
        borderRadius: 12,
        height: 54,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: Spacing.sm,
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

export default EditProfileScreen;
