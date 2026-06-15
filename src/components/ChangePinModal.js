import React, { useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    TouchableWithoutFeedback,
    Keyboard
} from 'react-native';
import { Colors, Spacing, Typography, Shadow } from '../constants/theme';
import { X } from 'lucide-react-native';
import { useDispatch } from 'react-redux';
import { changePinAction } from '../store/authSlice';
import { useAuth } from '../context/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PinInput from './PinInput';

const ChangePinModal = ({ visible, onClose, onSuccess }) => {
    const dispatch = useDispatch();
    const { userToken } = useAuth();

    const [step, setStep] = useState(0);
    const [oldPin, setOldPin] = useState('');
    const [newPin, setNewPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [sheetToast, setSheetToast] = useState({
        visible: false,
        message: '',
        type: 'error',
    });
    const { bottom, top } = useSafeAreaInsets();
    const toastTimerRef = useRef(null);

    const showSheetToast = (message, type = 'error') => {
        if (toastTimerRef.current) {
            clearTimeout(toastTimerRef.current);
        }

        setSheetToast({
            visible: true,
            message,
            type,
        });

        toastTimerRef.current = setTimeout(() => {
            setSheetToast({
                visible: false,
                message: '',
                type: 'error',
            });
            toastTimerRef.current = null;
        }, 4000);
    };

    useEffect(() => {
        return () => {
            if (toastTimerRef.current) {
                clearTimeout(toastTimerRef.current);
            }
        };
    }, []);

    const resetState = () => {
        setStep(0);
        setOldPin('');
        setNewPin('');
        setConfirmPin('');
        setError('');
        setLoading(false);
        if (toastTimerRef.current) {
            clearTimeout(toastTimerRef.current);
            toastTimerRef.current = null;
        }
        setSheetToast({
            visible: false,
            message: '',
            type: 'error',
        });
    };

    const handleClose = () => {
        resetState();
        onClose();
    };

    const verifyOldPin = () => {
        if (oldPin.length !== 4) return;
        setStep(1);
        setError('');
    };

    const handleUpdate = async () => {

        if (newPin.length !== 4 || confirmPin.length !== 4) {
            showSheetToast('Please enter complete PINs', 'warning');
            return;
        }

        if (newPin !== confirmPin) {
            showSheetToast('New PINs does not match', 'error');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const result = await dispatch(changePinAction({
                currentPin: oldPin,
                newPin: newPin,
                confirmPin: confirmPin
            })).unwrap();

            if (result.success) {
                resetState();
                onSuccess();
            } else {
                showSheetToast(result.message || 'Failed to update PIN', 'error');
            }
        } catch (err) {
            showSheetToast(err.message || err || 'Failed to update PIN', 'error');
            if (err.message && err.message.includes('Incorrect old PIN')) {
                setStep(0);
                setOldPin('');
            }
        } finally {
            setLoading(false);
        }
    };

    return (

        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={handleClose}
        >

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
                style={{ flex: 1 }}
            >

                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>

                    <View style={styles.overlay}>
                        {sheetToast.visible ? (
                            <View
                                pointerEvents="none"
                                style={[styles.sheetToastWrapper, { top: top + 12 }]}
                            >
                                <View
                                    style={[
                                        styles.sheetToast,
                                        sheetToast.type === 'warning'
                                            ? styles.sheetToastWarning
                                            : styles.sheetToastError,
                                    ]}
                                >
                                    <Text style={styles.sheetToastText} numberOfLines={2}>
                                        {sheetToast.message}
                                    </Text>
                                </View>
                            </View>
                        ) : null}

                        <View style={[
                            styles.container,
                            { paddingBottom: bottom + Spacing.xl }
                        ]}>

                            <View style={styles.header}>

                                <Text style={styles.title}>
                                    Change App PIN
                                </Text>

                                <TouchableOpacity
                                    onPress={handleClose}
                                    style={styles.closeBtn}
                                >
                                    <X size={24} color={Colors.textSecondary} />
                                </TouchableOpacity>

                            </View>

                            <View style={styles.content}>

                                {/* {step === 0 ? ( */}

                                    <>
                                        <Text style={styles.subtitle}>
                                            Enter your current 4-digit PIN
                                        </Text>

                                        <PinInput
                                            value={oldPin}
                                            onValueChange={(val) => {
                                                setOldPin(val);
                                                setError('');
                                            }}
                                            length={4}
                                        />

                                        {/* <TouchableOpacity
                                            style={[
                                                styles.actionBtn,
                                                oldPin.length !== 4 && styles.disabledBtn
                                            ]}
                                            onPress={verifyOldPin}
                                            disabled={oldPin.length !== 4}
                                        >

                                            <Text style={styles.btnText}>
                                                Next
                                            </Text>

                                        </TouchableOpacity> */}

                                    </>

                                {/* ) : ( */}

                                    <>
                                        <Text style={styles.subtitle}>
                                            Set your new 4-digit PIN
                                        </Text>

                                        <View style={styles.inputGroup}>

                                            <Text style={styles.label}>
                                                New PIN
                                            </Text>

                                            <PinInput
                                                value={newPin}
                                                onValueChange={(val) => {
                                                    setNewPin(val);
                                                    setError('');
                                                }}
                                                length={4}
                                            />

                                        </View>

                                        <View style={styles.inputGroup}>

                                            <Text style={styles.label}>
                                                Confirm New PIN
                                            </Text>

                                            <PinInput
                                                value={confirmPin}
                                                onValueChange={(val) => {
                                                    setConfirmPin(val);
                                                    setError('');
                                                }}
                                                length={4}
                                            />

                                        </View>

                                        <TouchableOpacity
                                            style={[
                                                styles.actionBtn,
                                                (newPin.length !== 4 ||
                                                    confirmPin.length !== 4)
                                                && styles.disabledBtn
                                            ]}
                                            onPress={handleUpdate}
                                            disabled={
                                                newPin.length !== 4 ||
                                                confirmPin.length !== 4 ||
                                                loading
                                            }
                                        >

                                            {loading ? (
                                                <ActivityIndicator color={Colors.white} />
                                            ) : (
                                                <Text style={styles.btnText}>
                                                    Update PIN
                                                </Text>
                                            )}

                                        </TouchableOpacity>

                                    </>

                                {/* )} */}

                                {/* Error will be shown via Toast */}

                            </View>

                        </View>

                    </View>

                </TouchableWithoutFeedback>

            </KeyboardAvoidingView>

        </Modal>

    );

};

const styles = StyleSheet.create({

    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },

    sheetToastWrapper: {
        position: 'absolute',
        left: 16,
        right: 16,
        zIndex: 9999,
        elevation: 9999,
    },

    sheetToast: {
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 8,
    },

    sheetToastError: {
        backgroundColor: '#EF4444',
    },

    sheetToastWarning: {
        backgroundColor: '#F59E0B',
    },

    sheetToastText: {
        color: '#FFFFFF',
        fontFamily: 'Inter-Medium',
        fontSize: 14,
    },

    container: {
        backgroundColor: Colors.white,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        minHeight: 400,
        padding: Spacing.xl,
        ...Shadow.large,
    },

    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.xl,
    },

    title: {
        fontSize: 20,
        color: Colors.textPrimary,
        fontFamily: 'Inter-Bold',
    },

    closeBtn: {
        padding: 4,
    },

    content: {
        gap: 20,
        alignItems: 'center',
    },

    subtitle: {
        fontSize: 15,
        color: Colors.textSecondary,
        marginBottom: 8,
        fontFamily: 'Inter-Medium',
    },

    inputGroup: {
        width: '100%',
        alignItems: 'center',
        marginBottom: 10,
    },

    label: {
        fontSize: 13,
        color: Colors.textSecondary,
        marginBottom: 8,
        alignSelf: 'flex-start',
        fontFamily: 'Inter-SemiBold',
    },

    actionBtn: {
        width: '100%',
        backgroundColor: Colors.primary,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 10,
    },

    disabledBtn: {
        backgroundColor: '#E5E7EB',
    },

    btnText: {
        fontSize: 16,
        color: Colors.white,
        fontFamily: 'Inter-Bold',
    },

    errorText: {
        fontSize: 13,
        color: Colors.danger,
        marginTop: 10,
        fontFamily: 'Inter-Medium',
    }

});

export default ChangePinModal;
