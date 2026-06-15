import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    ActivityIndicator,
    Dimensions,
    Platform
} from 'react-native';
import { Colors, Spacing, Shadow } from '../constants/theme';
import { AlertCircle } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const BottomConfirmationSheet = ({
    visible,
    onClose,
    onConfirm,
    title,
    description,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    type = 'danger',
    loading = false,
}) => {

    const insets = useSafeAreaInsets();

    const getIconColor = () => {
        switch (type) {
            case 'danger':
                return Colors.danger;
            case 'warning':
                return '#F59E0B';
            default:
                return Colors.primary;
        }
    };

    const getIconBg = () => {
        switch (type) {
            case 'danger':
                return '#FEF2F2';
            case 'warning':
                return '#FFFBEB';
            default:
                return '#F0F9FF';
        }
    };

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="slide"
            onRequestClose={loading ? () => {} : onClose}
            statusBarTranslucent
        >
            <View style={styles.overlay}>
                {/* Tap outside to close */}
                <TouchableOpacity
                    style={styles.backdrop}
                    onPress={loading ? undefined : onClose}
                    disabled={loading}
                    activeOpacity={1}
                />

                <View
                    style={[
                        styles.sheet,
                        {
                            paddingBottom: Math.max(
                                insets.bottom,
                                Platform.OS === 'android' ? 80 : 32
                            ),
                        },
                    ]}
                >
                    <View style={styles.contentRow}>
                        {/* Icon */}
                        <View
                            style={[
                                styles.iconBox,
                                { backgroundColor: getIconBg() },
                            ]}
                        >
                            <AlertCircle
                                size={24}
                                color={getIconColor()}
                            />
                        </View>

                        {/* Text */}
                        <View style={styles.textContainer}>
                            <Text style={styles.title}>{title}</Text>
                            <Text style={styles.description}>
                                {description}
                            </Text>
                        </View>
                    </View>

                    {/* Buttons */}
                    <View style={styles.btnRow}>
                        <TouchableOpacity
                            style={styles.cancelBtn}
                            onPress={onClose}
                            disabled={loading}
                        >
                            <Text style={styles.cancelBtnText}>
                                {cancelText}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.confirmBtn,
                                {
                                    backgroundColor:
                                        type === 'danger'
                                            ? Colors.danger
                                            : Colors.primary,
                                    opacity: loading ? 0.85 : 1,
                                },
                            ]}
                            onPress={onConfirm}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color={Colors.white} size="small" />
                            ) : (
                                <Text style={styles.confirmBtnText}>
                                    {confirmText}
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    sheet: {
        backgroundColor: Colors.white,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        ...Shadow.medium,
    },
    contentRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 24,
    },
    iconBox: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16, // replaced gap
    },
    textContainer: {
        flex: 1,
        paddingTop: 2,
    },
    title: {
        fontFamily: 'Inter-Bold',
        fontSize: 18,
        color: Colors.textPrimary,
        marginBottom: 6,
    },
    description: {
        fontFamily: 'Inter-Regular',
        fontSize: 14,
        color: Colors.textSecondary,
        lineHeight: 20,
    },
    btnRow: {
        flexDirection: 'row',
    },
    cancelBtn: {
        flex: 1,
        height: 52,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: Colors.border,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.white,
        marginRight: 6, // replaced gap
    },
    cancelBtnText: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 15,
        color: Colors.textPrimary,
    },
    confirmBtn: {
        flex: 1,
        height: 52,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 6, // replaced gap
        ...Shadow.subtle,
    },
    confirmBtnText: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 15,
        color: Colors.white,
    },
});

export default BottomConfirmationSheet;
