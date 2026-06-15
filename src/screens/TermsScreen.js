import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import Feather from "react-native-vector-icons/Feather";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { Colors } from "../constants/theme";

export default function TermsScreen({ navigation }) {
    const insets = useSafeAreaInsets();

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Feather name="arrow-left" size={22} color="#111" />
                </TouchableOpacity>

                <Text style={styles.title}>Terms & Conditions</Text>

                <View style={{ width: 22 }} />
            </View>

            <WebView
                source={{ uri: "https://sewvee.com/terms" }}
                style={styles.webview}
                startInLoadingState={true}
                renderLoading={() => (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#111" />
                    </View>
                )}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#fff",
    },

    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 16,
        paddingHorizontal: 20
    },

    title: {
        fontSize: 22,
        fontFamily: "Inter-Bold",
          marginBottom: 10,
        color: Colors.textPrimary,
    },

    webview: {
        flex: 1,
    },

    loadingContainer: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#fff",
    },

    section: {
        fontSize: 16,
        fontFamily: "Inter-SemiBold",
        marginTop: 18,
        color: Colors.textPrimary,
        marginBottom: 6
    },

    text: {
        fontSize: 14,
        fontFamily: "Inter-Regular",
        color: "#4B5563",
        lineHeight: 22
    }

});
