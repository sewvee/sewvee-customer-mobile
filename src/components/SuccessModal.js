import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { Colors, Spacing, Typography, Shadow } from '../constants/theme';
import Ionicons from 'react-native-vector-icons/Ionicons';

const SuccessModal = ({
    visible,
    onClose,
    title,
    description,
    type = 'success',
    onConfirm,
    confirmText = 'Done',
    cancelText = 'Cancel'
}) => {

    const getConfig = () => {
        switch (type) {
            case 'warning':
                return {
                    outer: '#FEF3C7',
                    middle: '#FDE68A',
                    inner: '#F59E0B',
                    icon: 'warning',
                    btn: '#F59E0B'
                };
            case 'error':
                return {
                    outer: '#FEE2E2',
                    middle: '#FECACA',
                    inner: '#EF4444',
                    icon: 'close-circle',
                    btn: '#EF4444'
                };
            case 'info':
                return {
                    outer: '#DBEAFE',
                    middle: '#BFDBFE',
                    inner: '#3B82F6',
                    icon: 'information-circle',
                    btn: '#3B82F6'
                };
            default:
                return {
                    outer: '#D1FAE5',
                    middle: '#A7F3D0',
                    inner: '#5B43EE',
                    icon: 'checkmark',
                    btn: Colors.primary
                };
        }
    };

    const config = getConfig();

    return (
        <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={styles.container}>

                    {!onConfirm && (
                        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                            <Ionicons name="close" size={24} color={Colors.textPrimary} />
                        </TouchableOpacity>
                    )}

                    <View style={styles.iconContainer}>
                        <View style={[styles.circleOuter, { backgroundColor: config.outer }]}>
                            <View style={[styles.circleMiddle, { backgroundColor: config.middle }]}>
                                <View style={[styles.circleInner, { backgroundColor: config.inner }]}>
                                    <Ionicons name={config.icon} size={40} color={Colors.white} />
                                </View>
                            </View>
                        </View>
                    </View>

                    <Text style={styles.title}>{title}</Text>
                    <Text style={styles.description}>{description}</Text>

                    <View style={styles.footer}>
                        {onConfirm ? (
                            <>
                                <TouchableOpacity style={[styles.btn, styles.cancelBtn]} onPress={onClose}>
                                    <Text style={styles.cancelBtnText}>{cancelText}</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.btn, { backgroundColor: config.btn }]}
                                    onPress={() => {
                                        onConfirm && onConfirm();
                                        onClose && onClose();
                                    }}
                                >
                                    <Text style={styles.confirmBtnText}>{confirmText}</Text>
                                </TouchableOpacity>
                            </>
                        ) : (
                            <TouchableOpacity
                                style={[styles.doneBtn, { backgroundColor: config.btn }]}
                                onPress={onClose}
                            >
                                <Text style={styles.doneBtnText}>{confirmText}</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing.xl,
    },
    container: {
        backgroundColor: Colors.white,
        borderRadius: 32,
        padding: Spacing.xl,
        width: '100%',
        alignItems: 'center',
        ...Shadow.medium,
        position: 'relative',
    },
    closeBtn: {
        position: 'absolute',
        top: 24,
        right: 24,
        padding: 4,
        zIndex: 10,
    },
    iconContainer: {
        marginTop: 20,
        marginBottom: 30,
        alignItems: 'center',
        justifyContent: 'center',
    },
    circleOuter: {
        width: 140,
        height: 140,
        borderRadius: 70,
        justifyContent: 'center',
        alignItems: 'center',
    },
    circleMiddle: {
        width: 105,
        height: 105,
        borderRadius: 52.5,
        justifyContent: 'center',
        alignItems: 'center',
    },
    circleInner: {
        width: 70,
        height: 70,
        borderRadius: 35,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        ...Typography.h2,
        color: Colors.textPrimary,
        textAlign: 'center',
        marginBottom: Spacing.md,
        fontSize: 22,
    },
    description: {
        ...Typography.bodyMedium,
        color: Colors.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: Spacing.xl,
    },
    footer: {
        width: '100%',
        flexDirection: 'row',
        gap: Spacing.md,
    },
    btn: {
        flex: 1,
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        ...Shadow.subtle,
    },
    doneBtn: {
        width: '100%',
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        ...Shadow.subtle,
    },
    doneBtnText: {
        color: Colors.white,
        fontFamily: 'Inter-SemiBold',
        fontSize: 16,
    },
    cancelBtn: {
        backgroundColor: '#F3F4F6',
    },
    cancelBtnText: {
        color: Colors.textSecondary,
        fontFamily: 'Inter-SemiBold',
        fontSize: 16,
    },
    confirmBtnText: {
        color: Colors.white,
        fontFamily: 'Inter-SemiBold',
        fontSize: 16,
    }
});

export default SuccessModal;
