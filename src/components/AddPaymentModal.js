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

const getTodayDate = () => new Date().toISOString().split('T')[0];
const PAYMENT_MODES = ['Cash', 'UPI', 'Bank'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const AddPaymentModal = ({
    visible,
    onClose,
    user,
    month,
    year,
    payrollRecord,
    netPayableForMonth,
    existingAdvanceTotal,
    onSave,
}) => {
    const [type, setType] = useState('Advance');
    const [date, setDate] = useState(getTodayDate());
    const [amount, setAmount] = useState('');
    const [paymentMode, setPaymentMode] = useState('Cash');

    useEffect(() => {
        if (visible) {
            setType('Advance');
            setDate(getTodayDate());
            setAmount('');
            setPaymentMode('Cash');
        }
    }, [visible]);

    useEffect(() => {
        if (visible && type === 'Salary' && netPayableForMonth != null) {
            const balance = Math.max(0, netPayableForMonth - (existingAdvanceTotal ?? 0));
            setAmount(String(Math.round(balance * 100) / 100));
        }
    }, [visible, type, netPayableForMonth, existingAdvanceTotal]);

    const handleSave = () => {
        const amt = parseFloat(amount);
        if (isNaN(amt) || amt <= 0) return;
        const d = new Date(date + 'T00:00:00');
        const now = new Date();
        d.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), 0);
        onSave({
            type,
            date: d.toISOString(),
            amount: amt,
            paymentMode,
        });
        onClose();
    };

    if (!user) return null;

    const balanceForMonth = netPayableForMonth != null ? Math.max(0, netPayableForMonth - (existingAdvanceTotal ?? 0)) : 0;
    const amtNum = parseFloat(amount) || 0;
    const isValidAmount = amtNum > 0;
    const isValidSalary = type !== 'Salary' || (amtNum <= balanceForMonth && payrollRecord?.paymentStatus !== 'Paid');

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
                        <Text style={styles.title}>Add Payment</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <X size={24} color={Colors.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
                        <Text style={styles.empName}>{user.name}</Text>
                        <Text style={styles.month}>{MONTH_NAMES[month - 1]} {year}</Text>

                        <Text style={styles.sectionLabel}>Type</Text>
                        <View style={styles.chipRow}>
                            {['Advance', 'Salary'].map((t) => (
                                <TouchableOpacity
                                    key={t}
                                    style={[styles.chip, type === t && styles.chipActive]}
                                    onPress={() => setType(t)}
                                >
                                    <Text style={[styles.chipText, type === t && styles.chipTextActive]}>{t}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {type === 'Salary' && payrollRecord?.paymentStatus === 'Paid' && (
                            <Text style={styles.hint}>Salary already paid for this month.</Text>
                        )}

                        <Text style={styles.sectionLabel}>Date</Text>
                        <TextInput
                            style={styles.input}
                            value={date}
                            onChangeText={setDate}
                            placeholder="YYYY-MM-DD"
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
                            style={[styles.confirmBtn, (!isValidAmount || !isValidSalary) && styles.confirmBtnDisabled]}
                            onPress={handleSave}
                            disabled={!isValidAmount || !isValidSalary}
                        >
                            <Text style={styles.confirmBtnText}>Add Payment</Text>
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
    month: { fontFamily: 'Inter-Regular', fontSize: 14, color: Colors.textSecondary, marginTop: 2, marginBottom: Spacing.md },
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
    hint: { fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.danger, marginTop: Spacing.xs },
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

export default AddPaymentModal;
