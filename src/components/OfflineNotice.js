import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, Platform } from 'react-native';
import { useNetInfo } from '@react-native-community/netinfo';
import { WifiOff } from 'lucide-react-native';
import { Colors, Typography, Spacing } from '../constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const OfflineNotice = () => {
    const netInfo = useNetInfo();
    const insets = useSafeAreaInsets();
    const [isOffline, setIsOffline] = useState(false);

    useEffect(() => {
        // Only set offline if explicit false. null means unknown/initializing.
        if (netInfo.isConnected === false) {
            setIsOffline(true);
        } else {
            setIsOffline(false);
        }
    }, [netInfo.isConnected]);

    if (!isOffline) return null;

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.content}>
                <View style={styles.iconContainer}>
                    <WifiOff size={32} color={Colors.white} />
                </View>
                <Text style={styles.title}>No Internet Connection</Text>
                <Text style={styles.subtitle}>
                    Please check your network settings. Used offline mode for now.
                </Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.7)', // Semi-transparent blocking overlay
        zIndex: 9999, // On top of everything
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        backgroundColor: Colors.white,
        width: width * 0.85,
        padding: Spacing.xl,
        borderRadius: 16,
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: Colors.danger, // Red for error/attention
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.lg,
    },
    title: {
        ...Typography.h2,
        textAlign: 'center',
        marginBottom: Spacing.sm,
    },
    subtitle: {
        ...Typography.bodyMedium,
        color: Colors.textSecondary,
        textAlign: 'center',
    }
});

export default OfflineNotice;
