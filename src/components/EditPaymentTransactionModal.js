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

const PAYMENT_MODES = ['Cash', 'UPI', 'Bank'];

const toDatePart = (val) => {
    if (!val) return '';
    if (typeof val === 'string' && val.includes('T')) {
        return val.split('T')[0];
    }
    return val;
};

const toTimePart = (val) => {
    if (!val) return '12:00';
    if (typeof val === 'string' && val.includes('T')) {
        const d = new Date(val);
        return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    }
    return '12:00';
};

const EditPaymentTransactionModal = ({
    visible,
    onClose,
    transaction,
    user,
    onSave,
}) => {
    const [date, setDate] = useState('');
    const [time, setTime] = useState('12:00');
    const [amount, setAmount] = useState('');
    const [paymentMode, setPaymentMode] = useState('Cash');

    useEffect(() => {
        if (visible && transaction) {
            setDate(toDatePart(transaction.date || ''));
            setTime(toTimePart(transaction.date || ''));
            setAmount(String(transaction.amount ?? ''));
            setPaymentMode(transaction.paymentMode || 'Cash');
        }
    }, [visible, transaction]);

    const handleSave = () => {
        const amt = parseFloat(amount);
        if (isNaN(amt) || amt <= 0 || !date) return;
        const [h, m] = (time || '12:00').split(':').map(Number);
        const d = new Date(date + 'T00:00:00');
        d.setHours(h || 12, m || 0, 0, 0);
        onSave({
            date: d.toISOString(),
            amount: amt,
            paymentMode,
        });
        onClose();
    };

    if (!transaction || !user) return null;

    const amtNum = parseFloat(amount) || 0;
    const isValid = amtNum > 0 && !!date.trim();

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
                        <Text style={styles.title}>Edit Payment</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <X size={24} color={Colors.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
                        <Text style={styles.empName}>{user.name}</Text>
                        <Text style={styles.typeChip}>{transaction.type}</Text>

                        <Text style={styles.sectionLabel}>Date</Text>
                        <TextInput
                            style={styles.input}
                            value={date}
                            onChangeText={setDate}
                            placeholder="YYYY-MM-DD"
                            placeholderTextColor={Colors.textSecondary}
                        />
                        <Text style={styles.sectionLabel}>Time (HH:MM)</Text>
                        <TextInput
                            style={styles.input}
                            value={time}
                            onChangeText={setTime}
                            placeholder="HH:MM"
                            placeholderTextColor={Colors.textSecondary}
                        />

                        <Text style={styles.sectionLabel}>Amount (₹)</Text>
                        <TextInput
                            style={styles.input}
                            value={amount}
                            onChangeText={setAmount}
                            placeholder="0"
                            placeholderTextColor={Colors.textSecondary}
                            keyboardType="numeric"
                        />

                        <Text style={styles.sectionLabel}>Payment Mode</Text>
                        <View style={styles.chipRow}>
                            {PAYMENT_MODES.map((m) => (
                                <TouchableOpacity
                                    key={m}
                                    style={[styles.chip, paymentMode === m && styles.chipActive]}
                                    onPress={() => setPaymentMode(m)}
                                >
                                    <Text style={[styles.chipText, paymentMode === m && styles.chipTextActive]}>{m}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <TouchableOpacity
                            style={[styles.confirmBtn, !isValid && styles.confirmBtnDisabled]}
                            onPress={handleSave}
                            disabled={!isValid}
                        >
                            <Text style={styles.confirmBtnText}>Save Changes</Text>
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
    empName: { fontFamily: 'Inter-Bold', fontSize: 18, color: Colors.textPrimary },
    typeChip: {
        fontFamily: 'Inter-Medium',
        fontSize: 12,
        color: Colors.primaryDark,
        backgroundColor: Colors.primaryLight + '40',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        alignSelf: 'flex-start',
        marginTop: 4,
        marginBottom: Spacing.md,
    },
    sectionLabel: { fontFamily: 'Inter-Medium', fontSize: 14, color: Colors.textSecondary, marginBottom: Spacing.xs, marginTop: Spacing.md },
    chipRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm },
    chip: {
        flex: 1,
        paddingVertical: Spacing.sm,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: Colors.border,
        alignItems: 'center',
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

export default EditPaymentTransactionModal;
