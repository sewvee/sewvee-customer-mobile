import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Keyboard,
    Modal
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Spacing, Typography, Shadow } from '../constants/theme';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useDispatch } from 'react-redux';
import { sendOtpAction } from '../store/authSlice';
import { useToast } from '../context/ToastContext';
import { sendWhatsAppOtp } from '../services/otpService';

const ForgotPinScreen = ({ navigation }) => {
    const [email, setEmail] = useState('');
    const [emailError, setEmailError] = useState('');
    const [loading, setLoading] = useState(false);
    const dispatch = useDispatch();
    const { showToast } = useToast();
    const [alertConfig, setAlertConfig] = useState({
        visible: false,
        title: '',
        message: '',
        confirmText: null,
        onConfirm: null
    });

    useEffect(() => {
        const fetchEmail = async () => {
            const storedEmail = await AsyncStorage.getItem('registeredEmail');
            if (storedEmail) {
                setEmail(storedEmail);
            }
        };
        fetchEmail();
    }, []);

    const showAlert = (title, message, confirmText = null, onConfirm = null) => {
        setAlertConfig({
            visible: true,
            title,
            message,
            confirmText,
            onConfirm
        });
    };

    const handleNext = async () => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email || !emailRegex.test(email)) {
            showAlert('Required', 'Please enter a valid email address');
            return;
        }
        Keyboard.dismiss();
        setLoading(true);
        try {
            const payload = {
                email: email,
                purpose: 'forgot-pin'
            };
            const resultAction = await dispatch(sendOtpAction(payload));
            if (sendOtpAction.fulfilled.match(resultAction)) {
                if (resultAction.payload && resultAction.payload.success === false) {
                    const errorMsg = resultAction.payload.message || 'Failed to send OTP';
                    showAlert('Error', errorMsg);
                } else {
                    showToast(resultAction.payload?.message || 'OTP sent successfully', 'success');
                    
                    navigation.navigate('VerifyOtp', {
                        email: email,
                        otp: resultAction.payload?.otp,
                        type: 'forgot_pin'
                    });
                }
            } else {
                const errorMsg = resultAction.payload?.message || resultAction.payload || 'Failed to send OTP';
                showAlert('Error', errorMsg);
            }
        } catch (error) {
            console.error('Forgot PIN Error:', error);
            showAlert('Error', error.message || 'Failed to send OTP');
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
                    style={styles.backBtn}
                    onPress={() => navigation.goBack()}
                >
                    <Ionicons
                        name="arrow-back"
                        size={24}
                        color={Colors.textPrimary}
                    />
                </TouchableOpacity>

                <View style={styles.header}>
                    <Text style={styles.title}>Forgot PIN?</Text>
                    <Text style={styles.subtitle}>
                        Enter your registered email address to reset your PIN
                    </Text>
                </View>

                <View style={styles.form}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Email Address<Text style={{ color: "red", fontSize: 16 }}> *</Text></Text>

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
                                autoFocus
                                onChangeText={(val) => {
                                    setEmail(val);
                                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                                    if (val.length > 0 && !emailRegex.test(val)) {
                                        setEmailError('Please enter a valid email address');
                                    } else {
                                        setEmailError('');
                                    }
                                }}
                            />
                        </View>
                        {emailError ? (
                            <Text style={styles.errorText}>{emailError}</Text>
                        ) : null}

                    </View>

                    <TouchableOpacity
                        style={[
                            styles.nextBtn,
                            loading && styles.nextBtnDisabled
                        ]}
                        onPress={handleNext}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color={Colors.white} />
                        ) : (
                            <>
                                <Text style={styles.nextBtnText}>
                                    Send OTP
                                </Text>

                                <Ionicons
                                    name="arrow-forward"
                                    size={20}
                                    color={Colors.white}
                                />
                            </>
                        )}
                    </TouchableOpacity>
                </View>
 


            <Modal
                visible={alertConfig.visible}
                transparent
                animationType="fade"
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalBox}>
                        <Text style={styles.modalTitle}>
                            {alertConfig.title}
                        </Text>

                        <Text style={styles.modalMessage}>
                            {alertConfig.message}
                        </Text>

                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                onPress={() =>
                                    setAlertConfig(prev => ({
                                        ...prev,
                                        visible: false
                                    }))
                                }
                                style={styles.modalBtn}
                            >
                                <Text style={styles.modalBtnText}>
                                    OK
                                </Text>
                            </TouchableOpacity>

                            {alertConfig.confirmText && (
                                <TouchableOpacity
                                    onPress={alertConfig.onConfirm}
                                    style={styles.modalBtn}
                                >
                                    <Text style={styles.modalBtnText}>
                                        {alertConfig.confirmText}
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                </View>
            </Modal>

        </KeyboardAwareScrollView>
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
    },
    backBtn: {
        marginTop: 20,
        marginBottom: 40,
        width: 40,
        height: 40,
        justifyContent: 'center',
    },
    header: {
        marginBottom: 40,
    },
    title: {
        fontSize: 32,
        color: Colors.textPrimary,
        marginBottom: 12,
        fontWeight: 'bold',
    },
    subtitle: {
        fontSize: 16,
        color: Colors.textSecondary,
        lineHeight: 24,
    },
    form: {
        width: '100%',
    },
    inputGroup: {
        marginBottom: 32,
    },
    label: {
        fontSize: 18,
        color: Colors.textPrimary,
        marginBottom: 8,
        marginLeft: 4,
        fontWeight: '600',
        fontFamily: 'Inter-SemiBold',

    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.white,
        borderRadius: 16,
        paddingHorizontal: 16,
        height: 56,
        borderWidth: 1,
        borderColor: Colors.border,
        ...Shadow.subtle,
    },
    input: {
        flex: 1,
        marginLeft: 12,
        fontSize: 16,
        color: Colors.textPrimary,
        fontFamily: 'Inter-Medium',

    },
    nextBtn: {
        backgroundColor: Colors.primary,
        height: 56,
        borderRadius: 16,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 10,
        ...Shadow.medium,
        marginTop: 10,
    },
    nextBtnDisabled: {
        opacity: 0.7,
    },
    nextBtnText: {
        fontSize: 18,
        color: Colors.white,
        fontWeight: 'bold',
    },
    modalContainer: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalBox: {
        backgroundColor: '#fff',
        width: '100%',
        borderRadius: 16,
        padding: 20,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
        color: Colors.textPrimary,
    },
    modalMessage: {
        fontSize: 14,
        marginBottom: 20,
        color: '#555',
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 20,
    },
    modalBtn: {
        paddingVertical: 8,
    },
    modalBtnText: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.primary,
    },
    errorText: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 12,
        color: 'red',
        marginTop: "2%",
        marginLeft: 4,
    },
});

export default ForgotPinScreen;
