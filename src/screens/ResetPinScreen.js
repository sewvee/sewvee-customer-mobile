import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Alert,
    Keyboard
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Colors, Spacing, Typography, Shadow } from '../constants/theme';
import { Lock, ArrowRight, CheckCircle2 } from 'lucide-react-native';
import { useDispatch } from 'react-redux';
import { resetPinAction } from '../store/authSlice';
import PinInput from '../components/PinInput';
import SuccessModal from '../components/SuccessModal';
import AlertModal from '../components/AlertModal';

const ResetPinScreen = ({ route, navigation }) => {
    const { email, otp } = route.params || {};
    const dispatch = useDispatch();
    const [pin, setPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [loading, setLoading] = useState(false);
    const [successVisible, setSuccessVisible] = useState(false);
    const [alertConfig, setAlertConfig] = useState({
        visible: false,
        title: '',
        message: '',
        type: 'error'
    });

    const showAlert = (title, message, type) => {
        setAlertConfig({ visible: true, title, message, type });
    };

    const handleReset = async () => {
        Keyboard.dismiss();
        if (pin.length < 4 || confirmPin.length < 4) {
            showAlert('Required', 'Please enter both PINs', 'warning');
            return;
        }

        if (pin !== confirmPin) {
            showAlert('Mismatch', 'PINs does not match', 'error');
            return;
        }

        setLoading(true);
        try {
            const payload = {
                email: email,
                otp: otp,
                newPin: pin,
                confirmPin: confirmPin
            };
            const resultAction = await dispatch(resetPinAction(payload));
            if (resetPinAction.fulfilled.match(resultAction)) {
                if (resultAction.payload && resultAction.payload.success === false) {
                    const errorMsg = resultAction.payload.message || 'Failed to reset PIN';
                    showAlert('Reset Failed', errorMsg, 'error');
                } else {
                    setSuccessVisible(true);
                }
            } else {
                const errorMsg = resultAction.payload?.message || resultAction.payload || 'Failed to reset PIN';
                showAlert('Reset Failed', errorMsg, 'error');
            }
        } catch (error) {
            console.error('Reset PIN Error:', error);
            showAlert('Reset Failed', error.message || 'Failed to reset PIN', 'error');
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
 

                <View style={styles.header}>
                    <Text style={styles.title}>New PIN</Text>
                    <Text style={styles.subtitle}>Set a new 4-digit PIN for your account</Text>
                </View>

                <View style={styles.form}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Enter New PIN<Text style={{color:"red", fontSize:16}}> *</Text></Text>
                        <PinInput
                            value={pin}
                            onValueChange={setPin}
                            length={4}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Confirm New PIN<Text style={{color:"red", fontSize:16}}> *</Text></Text>
                        <PinInput
                            value={confirmPin}
                            onValueChange={setConfirmPin}
                            length={4}
                        />
                    </View>

                    <TouchableOpacity
                        style={[styles.resetBtn, loading && styles.resetBtnDisabled]}
                        onPress={handleReset}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color={Colors.white} />
                        ) : (
                            <>
                                <Text style={styles.resetBtnText}>Reset PIN</Text>
                                <ArrowRight size={20} color={Colors.white} />
                            </>
                        )}
                    </TouchableOpacity>
                </View>
 


            <SuccessModal
                visible={successVisible}
                onClose={() => {
                    setSuccessVisible(false);
                    navigation.navigate('Login');
                }}
                title="PIN Reset Successful"
                description="Your PIN has been updated successfully. You can now login with your new PIN."
                type="success"
            />

            <AlertModal
                visible={alertConfig.visible}
                title={alertConfig.title}
                message={alertConfig.message}
                onClose={() => setAlertConfig(prev => ({ ...prev, visible: false }))}
            />
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
        justifyContent: 'center',
    },
    header: {
        marginBottom: 40,
    },
    title: {
        fontFamily: 'Inter-Bold',
        fontSize: 32,
        color: Colors.textPrimary,
        marginBottom: 12,
    },
    subtitle: {
        fontFamily: 'Inter-Regular',
        fontSize: 16,
        color: Colors.textSecondary,
    },
    form: {
        width: '100%',
    },
    inputGroup: {
        marginBottom: 32,
    },
    label: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 18,
        color: Colors.textPrimary,
        marginBottom: 12,
        marginLeft: 4,
        fontWeight:'600'
    },
    resetBtn: {
        backgroundColor: Colors.primary,
        height: 56,
        borderRadius: 16,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 10,
        ...Shadow.medium,
        marginTop: 20,
    },
    resetBtnDisabled: {
        opacity: 0.7,
    },
    resetBtnText: {
        fontFamily: 'Inter-Bold',
        fontSize: 18,
        color: Colors.white,
    }
});

export default ResetPinScreen;
