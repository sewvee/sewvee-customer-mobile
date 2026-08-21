import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Modal } from 'react-native';
import * as Updates from 'expo-updates';

const OTABlocker = () => {
    const [isUpdating, setIsUpdating] = useState(false);
    const [updateMessage, setUpdateMessage] = useState('Checking for updates...');

    useEffect(() => {
        const checkAndApplyUpdate = async () => {
            try {
                if (__DEV__) return;

                const update = await Updates.checkForUpdateAsync();

                if (update.isAvailable) {
                    setIsUpdating(true); 
                    setUpdateMessage('Downloading new update...\nPlease wait, do not close the app.');
                    
                    await Updates.fetchUpdateAsync();
                    
                    setUpdateMessage('Update finished! Restarting...');
                    setTimeout(async () => {
                        await Updates.reloadAsync();
                    }, 500); 
                }
            } catch (error) {
                console.log('OTA Check failed silently:', error);
                setIsUpdating(false);
            }
        };

        checkAndApplyUpdate();
    }, []);

    if (!isUpdating) return null;

    return (
        <Modal transparent={true} animationType="fade" visible={isUpdating}>
            <View style={styles.overlay}>
                <View style={styles.box}>
                    <ActivityIndicator size="large" color="#4F46E5" style={{ marginBottom: 20 }} />
                    <Text style={styles.title}>Updating App</Text>
                    <Text style={styles.subtitle}>{updateMessage}</Text>
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
        padding: 24,
    },
    box: {
        backgroundColor: 'white',
        padding: 30,
        borderRadius: 16,
        alignItems: 'center',
        width: '100%',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 20,
    }
});

export default OTABlocker;
