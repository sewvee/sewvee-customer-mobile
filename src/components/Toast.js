import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Animated,
    Dimensions,
    Platform,
    StatusBar,
    TouchableOpacity
} from 'react-native';
import { useToast } from '../context/ToastContext';
import { Colors, Spacing, Shadow } from '../constants/theme';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const Toast = () => {
    const { toast, hideToast } = useToast();
    const insets = useSafeAreaInsets();
    const slideAnim = useRef(new Animated.Value(-100)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;
    const [show, setShow] = React.useState(toast.visible);

    useEffect(() => {
        if (toast.visible) {
            setShow(true);
            // Slide in
            Animated.parallel([
                Animated.spring(slideAnim, {
                    toValue: 0,
                    useNativeDriver: true,
                    tension: 50,
                    friction: 8
                }),
                Animated.timing(opacityAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true
                })
            ]).start();
        } else {
            // Slide out
            Animated.parallel([
                Animated.timing(slideAnim, {
                    toValue: -150,
                    duration: 300,
                    useNativeDriver: true
                }),
                Animated.timing(opacityAnim, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true
                })
            ]).start(() => setShow(false));
        }
    }, [toast.visible]);

    if (!show) return null;

    const getIcon = () => {
        const size = 20;
        switch (toast.type) {
            case 'success':
                return <CheckCircle2 size={size} color="#FFFFFF" />;
            case 'error':
                return <AlertCircle size={size} color="#FFFFFF" />;
            case 'warning':
                return <AlertTriangle size={size} color="#FFFFFF" />;
            case 'dark':
                return <AlertCircle size={size} color="#FCD34D" />;
            case 'info':
            default:
                return <Info size={size} color="#FFFFFF" />;
        }
    };

    const getBgColor = () => {
        switch (toast.type) {
            case 'success':
                return '#059669';
            case 'error':
                return '#EF4444';
            case 'warning':
                return '#F59E0B';
            default:
                return '#1F2937';
        }
    };

    const getBorderColor = () => {
        switch (toast.type) {
            case 'success':
                return '#059669';
            case 'error':
                return '#EF4444';
            case 'warning':
                return '#F59E0B';
            case 'dark':
                return '#F59E0B';
            case 'info':
            default:
                return '#3B82F6';
        }
    };

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    top: insets.top + 10,
                    transform: [{ translateY: slideAnim }],
                    opacity: opacityAnim,
                }
            ]}
        >
            <View style={[
                styles.content,
                { backgroundColor: getBgColor(), borderLeftColor: getBorderColor() }
            ]}>
                <View style={styles.iconContainer}>
                    {getIcon()}
                </View>
                <Text style={styles.message} numberOfLines={2}>
                    {toast.message}
                </Text>
                <TouchableOpacity 
                    onPress={hideToast} 
                    style={styles.closeButton} 
                    activeOpacity={0.7}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <X size={18} color="#FFFFFF" />
                </TouchableOpacity>
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        left: 8,
        right: 8,
        zIndex: 99999,
        elevation: 99,
        alignItems: 'center',
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 18, // Increased height
        paddingHorizontal: 20,
        borderRadius: 12, // Slightly sharper corners for modern look
        width: '100%',
        maxWidth: 600,
        borderLeftWidth: 4,
        ...Shadow.medium,
        ...Platform.select({
            android: {
                elevation: 10,
            }
        }),
        backgroundColor: '#1F2937', // Default dark
    },
    iconContainer: {
        marginRight: 10,
    },
    message: {
        flex: 1,
        fontFamily: 'Inter-Medium',
        fontSize: 14,
        color: '#FFFFFF', // Always white text
    },
    closeButton: {
        marginLeft: 10,
        padding: 2,
    }
});

export default Toast;
