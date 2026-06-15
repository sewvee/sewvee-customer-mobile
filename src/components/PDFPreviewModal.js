import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ActivityIndicator, Platform, StatusBar } from 'react-native';
import { WebView } from 'react-native-webview';
import { Colors, Shadow } from '../constants/theme';
import { ChevronLeft, Printer, Download, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';


const PDFPreviewModal = ({
    visible,
    onClose,
    html,
    onDownload,
    downloadLoading = false,
    onPrint,
    title = 'PDF Preview'
}) => {
    const insets = useSafeAreaInsets();

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <View style={[styles.container, { paddingTop: Platform.OS === 'android' ? 0 : 0 }]}>
                {/* Header with Safe Area Padding */}
                <View style={[
                    styles.header,
                    {
                        paddingTop: insets.top,
                        height: 60 + insets.top
                    }
                ]}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={onClose}
                        activeOpacity={0.7}
                    >
                        <ChevronLeft size={28} color={Colors.primary} />
                    </TouchableOpacity>

                    <Text style={[styles.headerTitle, { marginTop: 0 }]}>{title}</Text>

                    <View style={styles.headerActions}>
                        <TouchableOpacity style={styles.headerIcon} onPress={onClose}>
                            <X size={22} color={Colors.textPrimary} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* WebView Container */}
                <View style={styles.webviewContainer}>
                    <WebView
                        originWhitelist={['*']}
                        source={{ html }}
                        style={styles.webview}
                        startInLoadingState={true}
                        renderLoading={() => (
                            <View style={styles.loaderContainer}>
                                <ActivityIndicator size="large" color={Colors.primary} />
                            </View>
                        )}
                    />
                </View>

                {/* Footer Actions */}
                <View style={[styles.footer, { paddingBottom: insets.bottom + (Platform.OS === 'android' ? 24 : 16) }]}>
                    <TouchableOpacity
                        style={[styles.footerBtn, styles.printBtn]}
                        onPress={onDownload}
                        disabled={downloadLoading || !onDownload}
                    >
                        {downloadLoading ? (
                            <>
                                <ActivityIndicator size="small" color={Colors.white} style={{ marginRight: 8 }} />
                                <Text style={styles.printBtnText}>Downloading...</Text>
                            </>
                        ) : (
                            <>
                                <Download size={20} color={Colors.white} style={{ marginRight: 8 }} />
                                <Text style={styles.printBtnText}>Download</Text>
                            </>
                        )}
                    </TouchableOpacity>

                    {onPrint && (
                        <TouchableOpacity style={[styles.footerBtn, styles.printBtn]} onPress={onPrint}>
                            <Printer size={20} color={Colors.white} style={{ marginRight: 8 }} />
                            <Text style={styles.printBtnText}>Print Now</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </Modal >
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        backgroundColor: Colors.white,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
        ...Shadow.subtle,
        paddingBottom: 8 // Slight padding at bottom of header content
    },
    backButton: {
        padding: 8,
        marginLeft: -8,
        marginTop: 0 // removed marginTop as logic handles it
    },
    headerTitle: {
        fontFamily: 'Inter-Bold',
        fontSize: 17,
        color: Colors.textPrimary,
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerIcon: {
        padding: 8,
        marginLeft: 8,
    },
    webviewContainer: {
        flex: 1,
        backgroundColor: '#F3F4F6',
    },
    webview: {
        flex: 1,
    },
    loaderContainer: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
    },
    footer: {
        padding: 16,
        paddingTop: 16,
        flexDirection: 'row',
        backgroundColor: Colors.white,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
        gap: 12,
    },
    footerBtn: {
        flex: 1,
        height: 50,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        ...Shadow.small,
    },
    closeBtn: {
        backgroundColor: Colors.white,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    closeBtnText: {
        color: Colors.textSecondary,
        fontFamily: 'Inter-SemiBold',
        fontSize: 16,
    },
    printBtn: {
        backgroundColor: Colors.primary,
    },
    printBtnText: {
        color: Colors.white,
        fontFamily: 'Inter-SemiBold',
        fontSize: 16,
    },
});

export default PDFPreviewModal;
