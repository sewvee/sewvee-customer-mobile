import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Keyboard
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Spacing, Typography, Shadow } from '../constants/theme';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../context/AuthContext';
import PinInput from '../components/PinInput';
// import { logEvent } from '../config/firebase';
import { useDispatch } from 'react-redux';
import { registerUser } from '../store/authSlice';
import { useToast } from '../context/ToastContext';
import { sendWhatsAppOtp } from '../services/otpService';

const SignupScreen = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const dispatch = useDispatch();
    const { showToast } = useToast();
    const { login } = useAuth();

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [emailError, setEmailError] = useState('');
    const [phone, setPhone] = useState('');
    const [phoneError, setPhoneError] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [checked, setChecked] = useState(false);
    const handleSignup = async () => {
        if (!name || !email || !password || !phone) {
            showToast('Please fill in all fields', 'error');
            return;
        }

        if (password.length < 4) {
            showToast('PIN should be exactly 4 digits', 'error');
            return;
        }

        if (phone.length !== 10) {
            showToast('Enter valid 10 digit phone number', 'error');
            return;
        }

        const phoneRegex = /^[6-9][0-9]{9}$/;

        if (!phoneRegex.test(phone)) {
            showToast('Please provide a valid phone number', 'error');
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(email)) {
            showToast('Please provide a valid email id', 'error');
            return;
        }

        if (!checked) {
            showToast('Please agree to the Terms & Privacy Policy', 'error');
            return;
        }

        Keyboard.dismiss();
        setLoading(true);

        const payload = {
            fullName: name,
            email: email,
            mobileNo: phone,
            dialCode: "+91",
            roleId: 2,
            pin: password
        };

        try {
            const resultAction = await dispatch(registerUser(payload));
            console.log('resultAction', resultAction)
            if (registerUser.fulfilled.match(resultAction)) {
                if (resultAction.payload && resultAction.payload.success === false) {
                    const errorMsg = resultAction.payload.message || 'Could not create account';
                    showToast(errorMsg, 'error');
                } else {
                    // Save email for pre-filling Forgot PIN
                    await AsyncStorage.setItem('registeredEmail', email);

                    const userData = resultAction.payload;
                    const userToken = userData?.token || userData?.data?.token || userData?.accessToken || userData?.data?.accessToken || userData?.access_token || userData?.data?.access_token || userData?.jwt || userData?.data?.jwt;
                    
                    if (userToken) {
                        await login(userToken, false);
                    } else {
                        await login('demo', false);
                    }
                }
            } else {
                const errorMsg = resultAction.payload?.message || resultAction.payload || 'Could not create account';
                showToast(errorMsg, 'error');
            }
        } catch (error) {
            console.error('Signup Error:', error);
            showToast(error.message || 'Could not create account', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAwareScrollView
            style={styles.container}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            enableOnAndroid={true}
            extraScrollHeight={20}
        >


 

                <TouchableOpacity
                    // style={styles.backBtn}
                    style={{ width:"100%",marginTop:"8%" }}
                    onPress={() => navigation.goBack()}
                >
                    <Ionicons
                        name="arrow-back"
                        size={28}
                        color={Colors.textSecondary}
                    />
                    {/* <ArrowLeft size={24} color={Colors.textPrimary} /> */}
                </TouchableOpacity>
                <View style={styles.header}>
                    <Text style={styles.title}>Create Account</Text>
                    <Text style={styles.subtitle}>
                        Join Sewvee and start managing your boutique professionally
                    </Text>
                </View>

                <View style={styles.form}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Full Name<Text style={{color:"red", fontSize:16}}> *</Text></Text>
                        <View style={styles.inputWrapper}>
                            <Ionicons
                                name="person-outline"
                                size={20}
                                color={Colors.textSecondary}
                            />
                            {/* <User size={20} color={Colors.textSecondary} /> */}
                            <TextInput
                                style={styles.input}
                                placeholder="Your Name"
                                placeholderTextColor={Colors.textSecondary}
                                value={name}
                                onChangeText={setName}
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Email ID<Text style={{color:"red", fontSize:16}}> *</Text></Text>
                        <View style={styles.inputWrapper}>
                            <Ionicons
                                name="mail-outline"
                                size={20}
                                color={Colors.textSecondary}
                            />
                            <TextInput
                                style={styles.input}
                                placeholder="name@example.com"
                                placeholderTextColor={Colors.textSecondary}
                                keyboardType="email-address"
                                autoCapitalize="none"
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
                            />
                        </View>
                           {emailError ? (
                        <Text style={styles.errorText}>
                            {emailError}
                        </Text>
                    ) : null}
                    </View>

                 



                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Phone Number<Text style={{color:"red", fontSize:16}}> *</Text></Text>
                        <View style={styles.inputWrapper}>
                            <Ionicons
                                name="call-outline"
                                size={20}
                                color={Colors.textSecondary}
                            />
                            <TextInput
                                style={styles.input}
                                placeholder="10 Digit phone number"
                                placeholderTextColor={Colors.textSecondary}
                                keyboardType="phone-pad"
                                maxLength={10}
                                value={phone}
                                onChangeText={(val) => {
                                    const cleaned = val.replace(/[^0-9]/g, '');
                                    setPhone(cleaned);

                                    const phoneRegex = /^[6-9][0-9]{9}$/;

                                    if (cleaned.length === 10 && !phoneRegex.test(cleaned)) {
                                        setPhoneError('Please enter a valid phone number');
                                    } else {
                                        setPhoneError('');
                                    }
                                }}

                            />
                        </View>
                         {phoneError ? (
                        <Text style={styles.errorText}>
                            {phoneError}
                        </Text>
                    ) : null}
                    </View>

                   


                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Set 4-Digit PIN<Text style={{color:"red", fontSize:16}}> *</Text></Text>
                        <PinInput
                            value={password}
                            onValueChange={setPassword}
                            length={4}
                        />
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20, marginTop: 10 }}>
                        <View style={styles.container1}>

                            <TouchableOpacity
                                style={[styles.checkbox, checked && styles.checked]}
                                onPress={() => setChecked(!checked)}
                            >
                                {checked && <Text style={styles.tick}>✓</Text>}
                            </TouchableOpacity>
                        </View>
                        <Text style={{ color: Colors.textPrimary, fontFamily: 'Inter-Medium', fontSize: 14, flex: 1 }}>
                            I agree to{' '}
                            <Text 
                                onPress={() => navigation.navigate('Termsscreen')}
                                style={{ color: Colors.primary, textDecorationLine: 'underline' }}
                            >
                                Terms and Conditions
                            </Text>
                            {' & '}
                            <Text 
                                onPress={() => navigation.navigate('PrivacyPolicyScreen')}
                                style={{ color: Colors.primary, textDecorationLine: 'underline' }}
                            >
                                Privacy Policy
                            </Text>
                        </Text>
                    </View>
                    <TouchableOpacity
                        style={[styles.signupBtn, loading && styles.signupBtnDisabled]}
                        onPress={handleSignup}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color={Colors.white} />
                        ) : (
                            <>
                                <Text style={styles.signupBtnText}>Create Account</Text>
                                <Ionicons
                                    name="arrow-forward"
                                    size={20}
                                    color={Colors.white}
                                />
                            </>
                        )}
                    </TouchableOpacity>

                    <View style={styles.footer}>
                        <Text style={styles.footerText}>
                            Already have an account?{' '}
                        </Text>
                        <TouchableOpacity
                            onPress={() => navigation.navigate('Login')}
                        >
                            <Text style={styles.loginText}>Login</Text>
                        </TouchableOpacity>
                    </View>
                </View>
        </KeyboardAwareScrollView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    backBtn: {
        position: 'absolute',
        // top: 60,
        // left: 20,
        // zIndex: 10,
        // width: 44,
        // height: 44,
        // backgroundColor: Colors.white,
        // borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        // ...Shadow.subtle,
    },
    scrollContent: {
        flexGrow: 1,
        padding: Spacing.xl,
        // paddingTop: 120,
    },
    header: { alignItems: 'center' },
    title: {
        fontFamily: 'Inter-Bold',
        fontSize: 32,
        color: Colors.textPrimary,
        marginBottom: 8,
    },
    subtitle: {
        fontFamily: 'Inter-Regular',
        fontSize: 17,
        color: Colors.textSecondary,
        lineHeight: 24,
        textAlign: 'center',
    },
    form: { width: '100%', marginTop:"5%" },
    inputGroup: { marginBottom: 20, },
    label: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 16,
        color: '#000000',
        marginBottom: 8,
        marginLeft: 4,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.white,
        borderRadius: 10,
        paddingHorizontal: 16,
        height: 56,
        borderWidth: 1,
        borderColor: Colors.border,
        ...Shadow.subtle,
    },
    input: {
        flex: 1,
        marginLeft: 12,
        fontFamily: 'Inter-Medium',
        fontSize: 16,
        color: Colors.textPrimary,
    },
    signupBtn: {
        backgroundColor: Colors.primary,
        height: 56,
        borderRadius: 16,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 10,
        marginTop: 10,
        ...Shadow.medium,
    },
    signupBtnDisabled: { opacity: 0.7 },
    signupBtnText: {
        fontFamily: 'Inter-Bold',
        fontSize: 18,
        color: Colors.white,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 30,
        marginBottom: 40,
    },
    footerText: {
        fontFamily: 'Inter-Regular',
        fontSize: 15,
        color: Colors.textSecondary,
    },
    loginText: {
        fontFamily: 'Inter-Bold',
        fontSize: 15,
        color: Colors.primary,
    },
    container1: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    checkbox: {
        width: 20,
        height: 20,
        borderWidth: 1.5,
        borderColor: '#999',
        borderRadius: 4,
        justifyContent: 'center',
        alignItems: 'center'
    },
    checked: {
        backgroundColor: '#5B4BEB',
        borderColor: '#5B4BEB'
    },
    tick: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold'
    },
    errorText: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 12,
        color: 'red',
        marginTop: "2%",
        marginLeft: 4,
    }

});

export default SignupScreen;
