import React, { useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Modal,
    Image
} from "react-native";
import LinearGradient from "react-native-linear-gradient";
import Feather from "react-native-vector-icons/Feather";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const DeleteAccountScreen = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const [showModal, setShowModal] = useState(false);

    return (

        <View style={styles.container}>

            {/* HEADER */}

            <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Feather name="arrow-left" size={22} color="#111827" />
                </TouchableOpacity>

                <Text style={styles.headerTitle}>Delete Account</Text>
            </View>


            {/* CONTENT */}

            <ScrollView
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >

                <Text style={styles.title}>
                    Are you sure you want to delete your account?
                </Text>

                <Text style={styles.description}>
                    When you delete your Sewvee account, your account will be{" "}
                    <Text style={styles.bold}>deactivated immediately</Text>. Your data
                    will be scheduled for permanent deletion after{" "}
                    <Text style={styles.bold}>30 days</Text>.
                </Text>

                <Text style={styles.description}>
                    If you change your mind, you can log in again within 30 days to restore
                    your account and data.
                </Text>

                <Text style={styles.description}>
                    After 30 days, your account and all associated data will be permanently
                    deleted.
                </Text>

            </ScrollView>


            {/* BOTTOM BUTTONS */}

            <View style={[styles.bottomContainer, { paddingBottom: insets.bottom + 20 }]}>

                <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => setShowModal(true)}
                >
                    <Text style={styles.deleteText}>Delete Account</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.backBtn}
                    onPress={() => navigation.goBack()}
                >
                    <Text style={styles.backText}>Go Back</Text>
                </TouchableOpacity>

            </View>


            {/* MODAL */}

            <Modal
                visible={showModal}
                transparent
                animationType="fade"
            >

                <View style={styles.modalOverlay}>

                    <View style={styles.modalCard}>

                        <LinearGradient
                            colors={[
                                "rgba(255,225,225,0.9)",
                                "rgba(253,136,136,0.6)"
                            ]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.iconBox}
                        >
                            <Feather name="alert-triangle" size={36} color="#EF4444" />
                        </LinearGradient>

                        <Text style={styles.modalTitle}>
                            Confirm Account Deletion
                        </Text>

                        <Text style={styles.modalDescription}>
                            Your Sewvee account will be deactivated now and permanently
                            deleted after 30 days. You can log in within 30 days to restore it.
                        </Text>


                        <TouchableOpacity style={styles.confirmBtn}>
                            <Text style={styles.confirmText}>Confirm</Text>
                        </TouchableOpacity>


                        <TouchableOpacity
                            style={styles.cancelBtn}
                            onPress={() => setShowModal(false)}
                        >
                            <Text style={styles.cancelText}>Cancel</Text>
                        </TouchableOpacity>

                    </View>

                </View>

            </Modal>

        </View>

    );
};

export default DeleteAccountScreen;


const styles = StyleSheet.create({

    container: {
        flex: 1,
        backgroundColor: "#F9FAFB"
    },

    header: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingBottom: 14,
        backgroundColor: "#fff"
    },

    headerTitle: {
        fontSize: 20,
        fontFamily: "Inter-SemiBold",
        marginLeft: 12,
        color: "#111827"
    },

    content: {
        paddingHorizontal: 20,
        paddingTop: 24
    },

    title: {
        fontSize: 26,
        fontFamily: "Inter-SemiBold",
        color: "#111827",
        lineHeight: 34,
        marginBottom: 16
    },

    description: {
        fontSize: 16,
        fontFamily: "Inter-Regular",
        color: "#4B5563",
        lineHeight: 24,
        marginBottom: 16
    },

    bold: {
        fontFamily: "Inter-SemiBold",
        color: "#111827"
    },

    bottomContainer: {
        paddingHorizontal: 20,
    },

    deleteBtn: {
        backgroundColor: "#E45757",
        paddingVertical: 16,
        borderRadius: 10,
        alignItems: "center",
        marginBottom: 12
    },

    deleteText: {
        fontSize: 18,
        fontFamily: "Inter-SemiBold",
        color: "#fff"
    },

    backBtn: {
        backgroundColor: "#E5E7EB",
        paddingVertical: 16,
        borderRadius: 10,
        alignItems: "center"
    },

    backText: {
        fontSize: 18,
        fontFamily: "Inter-SemiBold",
        color: "#111827"
    },

    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.4)",
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 24,
    },

    modalCard: {
        backgroundColor: "#fff",
        width: "100%",
        borderRadius: 16,
        padding: 24,
        alignItems: "center"
    },

    iconBox: {
        width: 70,
        height: 70,
        borderRadius: 14,
        backgroundColor: "#FEE2E2",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 30,
        marginTop:30
    },

    modalTitle: {
        fontSize: 20,
        fontFamily: "Inter-SemiBold",
        color: "#111827",
        textAlign: "center",
        marginBottom: 8
    },

    modalDescription: {
        fontSize: 14,
        fontFamily: "Inter-Regular",
        color: "#6B7280",
        textAlign: "center",
        lineHeight: 22,
        marginBottom: 20
    },

    confirmBtn: {
        width: "100%",
        backgroundColor: "#FEE2E2",
        paddingVertical: 14,
        borderRadius: 10,
        alignItems: "center",
        marginBottom: 10
    },

    confirmText: {
        fontSize: 16,
        fontFamily: "Inter-SemiBold",
        color: "#EF4444"
    },

    cancelBtn: {
        width: "100%",
        backgroundColor: "#E5E7EB",
        paddingVertical: 14,
        borderRadius: 10,
        alignItems: "center"
    },

    cancelText: {
        fontSize: 16,
        fontFamily: "Inter-Medium",
        color: "#111827"
    }

});