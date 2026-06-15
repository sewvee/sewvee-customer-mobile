import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    Platform,
    Keyboard
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Colors, Spacing, Shadow } from '../constants/theme';
import { ArrowRight, ShieldCheck } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
// import { getAuth } from '@react-native-firebase/auth';
// import { getFirestore, doc, updateDoc } from '@react-native-firebase/firestore';
// import { COLLECTIONS } from '../config/firebase';
import AlertModal from '../components/AlertModal';
import { useDispatch } from 'react-redux';
import { verifyOtp, sendOtpAction } from '../store/authSlice';
import { useToast } from '../context/ToastContext';
import { companyOnboardAction } from '../store/companyOnboardSlice';
import { getCompanyAction } from '../store/companyOnboardSlice';
import { sendWhatsAppOtp } from '../services/otpService';

const VerifyOtpScreen = ({ route, navigation }) => {
    const { email, otp: responseOtp, type, businessDetails } = route.params || {};
    const { sendOtp, user } = useAuth();
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [loading, setLoading] = useState(false);
    const [timer, setTimer] = useState(30);
    const inputs = useRef([]);
    const dispatch = useDispatch();
    const { showToast } = useToast();

    // Use email from params OR from user context (fixes race condition on signup)
    const targetEmail = email || user?.email;

    useEffect(() => {
        if (responseOtp) {
            showToast(`Your verification OTP is: ${responseOtp}`, 'info', 6000);
        }
    }, [responseOtp, showToast]);

    // Modal state
    const [modalConfig, setModalConfig] = useState({
        visible: false,
        title: '',
        message: '',
        type: 'success',
        onClose: () => { }
    });

    const showAlert = (title, message, type, onClose) => {
        setModalConfig({
            visible: true,
            title,
            message,
            type,
            onClose: () => {
                setModalConfig(prev => ({ ...prev, visible: false }));
                if (onClose) onClose();
            }
        });
    };

    // Effect to handle countdown timer for resending OTP
    useEffect(() => {
        const interval = setInterval(() => {
            setTimer((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    const handleChange = (text, index) => {
        const newOtp = [...otp];
        newOtp[index] = text.replace(/[^0-9]/g, '');
        setOtp(newOtp);

        if (text && index < 5) {
            inputs.current[index + 1].focus();
        }
    };

    const handleKeyPress = (e, index) => {
        if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
            inputs.current[index - 1].focus();
        }
    };

    const handleVerify = async () => {
        const code = otp.join('');
        if (code.length < 6) {
            showAlert('Wait!', 'Please enter the full 6-digit code', 'info');
            return;
        }

        Keyboard.dismiss();
        setLoading(true);
        try {
            const payload = {
                email: targetEmail,
                otp: code,
                purpose: type === 'forgot_pin' ? 'forgot-pin' : 'registration'
            };
            const resultAction = await dispatch(verifyOtp(payload));
            if (verifyOtp.fulfilled.match(resultAction)) {
                if (resultAction.payload && resultAction.payload.success === false) {
                    const errorMsg = resultAction.payload.message || 'Invalid code';
                    showAlert('Failed', errorMsg, 'error');
                } else {
                    showToast('Email address verified successfully!', 'success');
                    setTimeout(async () => {
                        if (type === 'forgot_pin') {
                            navigation.navigate('ResetPin', {
                                email: targetEmail,
                                otp: code
                            });
                        } else {
                            // Submit business profile in background if details were passed
                            if (businessDetails) {
                                dispatch(companyOnboardAction({ payload: businessDetails }))
                                    .catch(err => console.log('[VerifyOtp] Business onboard error:', err));
                            }
                            navigation.navigate('TrialActiveScreen');
                        }
                    }, 500);
                }
            } else {
                const errorMsg = resultAction.payload?.message || resultAction.payload || 'Invalid code';
                showAlert('Failed', errorMsg, 'error');
            }
        } catch (error) {
            console.error('Verify OTP Error:', error);
            showAlert('Failed', error.message || 'Invalid code', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        if (timer > 0) return;

        if (!targetEmail) {
            showAlert('Error', 'Email address is missing. Please restart the app or try logging in again.', 'error');
            return;
        }

        setLoading(true);
        try {
            const payload = {
                email: targetEmail,
                purpose: type === 'forgot_pin' ? 'forgot-pin' : 'registration'
            };
            const resultAction = await dispatch(sendOtpAction(payload));
            if (sendOtpAction.fulfilled.match(resultAction)) {
                setTimer(30);

                // Show the OTP in toast for 6 seconds
                const newOtp = resultAction.payload?.otp || resultAction.payload?.data?.otp;
                if (newOtp) {
                    showToast(`Your verification OTP is: ${newOtp}`, 'info', 6000);
                } else {
                    showAlert('Error', resultAction.payload?.message, 'error');
                }
            } else {
                const errorMsg = resultAction.payload?.message || 'Failed to resend code';
                showAlert('Error', errorMsg, 'error');
            }
        } catch (error) {
            showAlert('Error', error.message || 'Failed to resend code', 'error');
        } finally {
            setLoading(false);
        }
    };


    const [manualEmail, setManualEmail] = useState('');

    // Render Manual Input if Email is Missing (e.g. Offline + Email Login)
    if (!targetEmail || targetEmail.trim() === '') {

        const handleManualSubmit = () => {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (manualEmail && emailRegex.test(manualEmail)) {
                // Update the param so the component re-renders with the targetEmail
                navigation.setParams({ email: manualEmail });
            } else {
                showAlert('Invalid Email', 'Please enter a valid email address', 'error');
            }
        };

        return (
            <KeyboardAwareScrollView 
                style={styles.container} 
                contentContainerStyle={[styles.container, { padding: Spacing.xl, justifyContent: 'center' }]}
                enableOnAndroid={true}
                keyboardShouldPersistTaps="handled"
            >
                    <Text style={styles.title}>Enter Email Address</Text>
                    <Text style={styles.subtitle}>
                        We couldn't retrieve your email address. Please enter it to proceed with verification.
                    </Text>

                    <TextInput
                        style={[styles.otpInput, { flex: 0, width: '100%', fontSize: 18, textAlign: 'left', paddingHorizontal: 16, marginTop: 20 }]}
                        value={manualEmail}
                        onChangeText={setManualEmail}
                        placeholder="name@example.com"
                        keyboardType="email-address"
                        autoCapitalize="none"
                    />

                    <TouchableOpacity
                        style={[styles.verifyBtn, { marginTop: 20 }]}
                        onPress={handleManualSubmit}
                    >
                        <Text style={styles.verifyBtnText}>Send OTP</Text>
                        <ArrowRight size={20} color={Colors.white} />
                    </TouchableOpacity>
                <AlertModal
                    visible={modalConfig.visible}
                    title={modalConfig.title}
                    message={modalConfig.message}
                    onClose={modalConfig.onClose}
                />
            </KeyboardAwareScrollView>
        );
    }

    return (
        <KeyboardAwareScrollView
            style={styles.container}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            enableOnAndroid={true}
            extraScrollHeight={20}
        >
                <View style={styles.header}>
                    <View style={styles.iconContainer}>
                        <ShieldCheck size={40} color={Colors.white} />
                    </View>
                    <Text style={styles.title}>Verify Email</Text>
                    <Text style={styles.subtitle}>
                        We sent a 6-digit code to your email address {'\n'}
                        <Text style={styles.phoneText}>{targetEmail}</Text>
                    </Text>
                </View>

                <View style={styles.otpContainer}>
                    {otp.map((digit, index) => (
                        <TextInput
                            key={index}
                            ref={(ref) => { inputs.current[index] = ref; }}
                            style={styles.otpInput}
                            value={digit}
                            onChangeText={(text) => handleChange(text, index)}
                            onKeyPress={(e) => handleKeyPress(e, index)}
                            keyboardType="numeric"
                            maxLength={1}
                            selectTextOnFocus
                        />
                    ))}
                </View>

                <TouchableOpacity
                    style={[styles.verifyBtn, loading && styles.verifyBtnDisabled]}
                    onPress={handleVerify}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color={Colors.white} />
                    ) : (
                        <>
                            <Text style={styles.verifyBtnText}>Verify & Continue</Text>
                            <ArrowRight size={20} color={Colors.white} />
                        </>
                    )}
                </TouchableOpacity>

                <View style={styles.footer}>
                    <Text style={styles.footerText}>Didn't receive code? </Text>
                    <TouchableOpacity onPress={handleResend} disabled={timer > 0}>
                        <Text style={[styles.resendText, timer > 0 && styles.resendTextDisabled]}>
                            {timer > 0 ? `Resend in ${timer}s` : 'Resend Code'}
                        </Text>
                    </TouchableOpacity>
                </View>


            <AlertModal
                visible={modalConfig.visible}
                title={modalConfig.title}
                message={modalConfig.message}
                onClose={modalConfig.onClose}
            />
        </KeyboardAwareScrollView >
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    scrollContent: {
        flexGrow: 1,
        padding: Spacing.xl,
        justifyContent: 'center',
    },
    header: {
        alignItems: 'center',
        marginBottom: 40,
    },
    iconContainer: {
        width: 80,
        height: 80,
        backgroundColor: Colors.primary,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
        ...Shadow.medium,
    },
    title: {
        fontFamily: 'Inter-Bold',
        fontSize: 28,
        color: Colors.textPrimary,
        marginBottom: 12,
    },
    subtitle: {
        fontFamily: 'Inter-Regular',
        fontSize: 16,
        color: Colors.textSecondary,
        textAlign: 'center',
        lineHeight: 24,
        paddingHorizontal: Spacing.md,
    },
    phoneText: {
        fontFamily: 'Inter-Bold',
        color: Colors.textPrimary,
    },
    otpContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 40,
        gap: 8,
    },
    otpInput: {
        flex: 1,
        height: 56,
        backgroundColor: Colors.white,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: Colors.border,
        textAlign: 'center',
        fontSize: 24,
        fontFamily: 'Inter-Bold',
        color: Colors.primary,
        ...Shadow.subtle,
    },
    verifyBtn: {
        backgroundColor: Colors.primary,
        height: 56,
        borderRadius: 16,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
        ...Shadow.medium,
    },
    verifyBtnDisabled: {
        opacity: 0.7,
    },
    verifyBtnText: {
        fontFamily: 'Inter-Bold',
        fontSize: 18,
        color: Colors.white,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 32,
    },
    footerText: {
        fontFamily: 'Inter-Regular',
        fontSize: 15,
        color: Colors.textSecondary,
    },
    resendText: {
        fontFamily: 'Inter-Bold',
        fontSize: 15,
        color: Colors.primary,
    },
    resendTextDisabled: {
        color: '#CBD5E1',
    },
});

export default VerifyOtpScreen;
