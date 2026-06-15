import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
} from 'react-native';
import { Colors, Spacing, Shadow } from '../constants/theme';

const AlertModal = ({
    visible,
    title,
    message,
    onClose,
    onConfirm,
    buttonText = 'OK',
    confirmText = 'Yes'
}) => {

    if (!visible) return null;

    return (
        <Modal
            transparent={true}
            visible={visible}
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.modalContainer}>
                    <Text style={styles.title}>{title}</Text>
                    <Text style={styles.message}>{message}</Text>

                    <View style={styles.buttonContainer}>
                        {!onConfirm && (
                            <TouchableOpacity
                                onPress={onClose}
                                style={styles.actionBtn}
                            >
                                <Text style={styles.primaryActionText}>
                                    {buttonText}
                                </Text>
                            </TouchableOpacity>
                        )}

                        {onConfirm && (
                            <>
                                <TouchableOpacity
                                    onPress={onClose}
                                    style={styles.actionBtn}
                                >
                                    <Text style={styles.secondaryActionText}>
                                        Cancel
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    onPress={() => {
                                        onClose();
                                        onConfirm();
                                    }}
                                    style={styles.actionBtn}
                                >
                                    <Text style={styles.primaryActionText}>
                                        {confirmText}
                                    </Text>
                                </TouchableOpacity>
                            </>
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
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing.xl,
    },
    modalContainer: {
        width: '100%',
        maxWidth: 320,
        backgroundColor: Colors.white,
        borderRadius: 8,
        padding: 24,
        ...Shadow.medium,
    },
    title: {
        fontSize: 20,
        fontFamily: 'Inter-Bold',
        color: Colors.textPrimary,
        marginBottom: 12,
    },
    message: {
        fontSize: 16,
        fontFamily: 'Inter-Regular',
        color: Colors.textSecondary,
        lineHeight: 24,
        marginBottom: 24,
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
    },
    actionBtn: {
        paddingVertical: 4,
        paddingHorizontal: 8,
        marginLeft: 16, // since gap is not supported in older RN versions
    },
    primaryActionText: {
        color: Colors.primary,
        fontSize: 15,
        fontFamily: 'Inter-SemiBold',
    },
    secondaryActionText: {
        color: Colors.textSecondary,
        fontSize: 15,
        fontFamily: 'Inter-Medium',
    },
});

export default AlertModal;
