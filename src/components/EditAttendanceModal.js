import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    TextInput,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { Colors, Spacing } from '../constants/theme';
import { X } from 'lucide-react-native';

const STATUS_OPTIONS = ['Present', 'Half Day', 'Leave', 'Absent'];

const EditAttendanceModal = ({
    visible,
    onClose,
    attendanceEntry,
    userId,
    onSave,
}) => {
    const [status, setStatus] = useState('Present');
    const [checkIn, setCheckIn] = useState('');
    const [checkOut, setCheckOut] = useState('');

    const isSynthetic = attendanceEntry?.id?.startsWith('absent_');
    const needsClockTimes = status === 'Present' || status === 'Half Day';

    useEffect(() => {
        if (visible && attendanceEntry) {
            setStatus(attendanceEntry.status || 'Absent');
            setCheckIn(attendanceEntry.checkIn || '');
            setCheckOut(attendanceEntry.checkOut || '');
        }
    }, [visible, attendanceEntry]);

    const computeTotalHours = (ci, co) => {
        if (!ci || !co) return null;
        const [h1, m1] = ci.split(':').map(Number);
        const [h2, m2] = co.split(':').map(Number);
        const mins = (h2 * 60 + m2) - (h1 * 60 + m1);
        return (mins / 60).toFixed(1);
    };

    const handleSave = () => {
        if (!attendanceEntry?.date || !userId) return;
        const payload = {
            date: attendanceEntry.date,
            status,
        };
        if (status === 'Present' || status === 'Half Day') {
            const ci = checkIn.trim() || '09:00';
            const co = checkOut.trim() || (status === 'Half Day' ? '13:00' : '18:00');
            const totalHours = computeTotalHours(ci, co);
            payload.checkIn = ci;
            payload.checkOut = co;
            payload.totalHours = totalHours;
        } else {
            payload.checkIn = null;
            payload.checkOut = null;
            payload.totalHours = null;
        }
        onSave(payload);
        onClose();
    };

    if (!attendanceEntry || !userId) return null;

    const isValid = !needsClockTimes || (checkIn.trim() && checkOut.trim());

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView
                style={styles.overlay}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
                <View style={styles.modal}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Edit Attendance</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <X size={24} color={Colors.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
                        <Text style={styles.dateLabel}>{attendanceEntry.date}</Text>

                        <Text style={styles.sectionLabel}>Status</Text>
                        <View style={styles.chipRow}>
                            {STATUS_OPTIONS.map((s) => (
                                <TouchableOpacity
                                    key={s}
                                    style={[styles.chip, status === s && styles.chipActive]}
                                    onPress={() => setStatus(s)}
                                >
                                    <Text style={[styles.chipText, status === s && styles.chipTextActive]}>{s}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {needsClockTimes && (
                            <>
                                <Text style={styles.sectionLabel}>Check-in</Text>
                                <TextInput
                                    style={styles.input}
                                    value={checkIn}
                                    onChangeText={setCheckIn}
                                    placeholder="09:00"
                                    placeholderTextColor={Colors.textSecondary}
                                />
                                <Text style={styles.sectionLabel}>Check-out</Text>
                                <TextInput
                                    style={styles.input}
                                    value={checkOut}
                                    onChangeText={setCheckOut}
                                    placeholder={status === 'Half Day' ? '13:00' : '18:00'}
                                    placeholderTextColor={Colors.textSecondary}
                                />
                            </>
                        )}

                        <TouchableOpacity
                            style={[styles.confirmBtn, !isValid && styles.confirmBtnDisabled]}
                            onPress={handleSave}
                            disabled={!isValid}
                        >
                            <Text style={styles.confirmBtnText}>Save</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modal: {
        width: '90%',
        maxWidth: 360,
        backgroundColor: Colors.white,
        borderRadius: 16,
        maxHeight: '85%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    title: { fontFamily: 'Inter-SemiBold', fontSize: 18, color: Colors.textPrimary },
    closeBtn: { padding: Spacing.xs },
    scroll: { padding: Spacing.lg },
    dateLabel: { fontFamily: 'Inter-Medium', fontSize: 16, color: Colors.textPrimary, marginBottom: Spacing.md },
    sectionLabel: { fontFamily: 'Inter-Medium', fontSize: 14, color: Colors.textSecondary, marginBottom: Spacing.xs, marginTop: Spacing.md },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.sm },
    chip: {
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.md,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: Colors.border,
    },
    chipActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight + '40' },
    chipText: { fontFamily: 'Inter-Medium', fontSize: 14, color: Colors.textSecondary },
    chipTextActive: { color: Colors.primaryDark, fontFamily: 'Inter-SemiBold' },
    input: {
        fontFamily: 'Inter-Medium',
        fontSize: 14,
        color: Colors.textPrimary,
        backgroundColor: Colors.card,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 10,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        marginBottom: Spacing.xs,
    },
    confirmBtn: {
        backgroundColor: Colors.primary,
        paddingVertical: Spacing.md,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: Spacing.lg,
    },
    confirmBtnDisabled: { opacity: 0.5 },
    confirmBtnText: { fontFamily: 'Inter-SemiBold', fontSize: 16, color: Colors.white },
});

export default EditAttendanceModal;
