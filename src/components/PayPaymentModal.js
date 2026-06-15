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

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const PayPaymentModal = ({
    visible,
    onClose,
    onConfirm,
    type, // 'advance' | 'salary'
    record,
    month,
    year,
}) => {
    const [advanceAmount, setAdvanceAmount] = useState('');
    const [paymentMode, setPaymentMode] = useState('Cash');

    const totalSalary = record?.netPayable ?? 0;
    const previousAdvance = record?.advance ?? 0;
    const newAdvance = parseFloat(advanceAmount) || 0;
    const totalAdvance = previousAdvance + (type === 'advance' ? newAdvance : 0);
    const remainingPayable = Math.max(0, totalSalary - totalAdvance);

    useEffect(() => {
        if (visible) {
            setAdvanceAmount('');
            setPaymentMode('Cash');
        }
    }, [visible, type]);

    const handleConfirm = () => {
        if (type === 'advance') {
            if (newAdvance <= 0) return;
            onConfirm({
                type: 'advance',
                advanceToAdd: newAdvance,
                paymentMode,
                newAdvanceTotal: totalAdvance,
            });
        } else {
            onConfirm({
                type: 'salary',
                paymentMode,
            });
        }
        onClose();
    };

    const isValid = type === 'advance' ? newAdvance > 0 && totalAdvance <= totalSalary : true;

    if (!record) return null;

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
                        <Text style={styles.title}>
                            {type === 'advance' ? 'Pay Advance' : `Pay ${record?.salaryType || 'Monthly'} Salary`}
                        </Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <X size={24} color={Colors.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
                        <Text style={styles.empName}>{record.user?.name}</Text>
                        <Text style={styles.empRole}>{record.roleName || '—'}</Text>
                        <Text style={styles.month}>Payroll Period: {MONTH_NAMES[month - 1]} {year}</Text>

                        <View style={styles.section}>
                            <View style={styles.row}>
                                <Text style={styles.label}>Total Salary</Text>
                                <Text style={styles.value}>₹{totalSalary.toLocaleString('en-IN')}</Text>
                            </View>
                            <View style={styles.row}>
                                <Text style={styles.label}>Previous Advance</Text>
                                <Text style={styles.value}>₹{previousAdvance.toLocaleString('en-IN')}</Text>
                            </View>
                            {type === 'advance' && (
                                <View style={styles.row}>
                                    <Text style={styles.label}>New Advance</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={advanceAmount}
                                        onChangeText={setAdvanceAmount}
                                        keyboardType="numeric"
                                        placeholder="0"
                                        placeholderTextColor={Colors.textSecondary}
                                    />
                                </View>
                            )}
                            <View style={[styles.row, styles.rowHighlight]}>
                                <Text style={styles.labelBold}>Remaining Payable</Text>
                                <Text style={styles.valueBold}>₹{remainingPayable.toLocaleString('en-IN')}</Text>
                            </View>
                        </View>

                        <Text style={styles.modeLabel}>Payment Mode</Text>
                        <View style={styles.modeRow}>
                            {['Cash', 'UPI', 'Bank'].map((m) => (
                                <TouchableOpacity
                                    key={m}
                                    style={[styles.modeBtn, paymentMode === m && styles.modeBtnActive]}
                                    onPress={() => setPaymentMode(m)}
                                >
                                    <Text style={[styles.modeBtnText, paymentMode === m && styles.modeBtnTextActive]}>
                                        {m}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <TouchableOpacity
                            style={[styles.confirmBtn, !isValid && styles.confirmBtnDisabled]}
                            onPress={handleConfirm}
                            disabled={!isValid}
                        >
                            <Text style={styles.confirmBtnText}>
                                {type === 'advance' ? 'Pay Advance' : 'Confirm Payment'}
                            </Text>
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
        maxHeight: '80%',
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
    empRole: { fontFamily: 'Inter-Regular', fontSize: 14, color: Colors.textSecondary, marginTop: 2 },
    month: { fontFamily: 'Inter-Medium', fontSize: 14, color: Colors.textSecondary, marginTop: 4, marginBottom: Spacing.md },
    section: {
        backgroundColor: Colors.background,
        borderRadius: 12,
        padding: Spacing.md,
        marginBottom: Spacing.lg,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: Spacing.sm,
    },
    rowHighlight: {
        borderTopWidth: 1,
        borderTopColor: Colors.border,
        marginTop: Spacing.xs,
        paddingTop: Spacing.md,
    },
    label: { fontFamily: 'Inter-Regular', fontSize: 14, color: Colors.textSecondary },
    value: { fontFamily: 'Inter-Medium', fontSize: 14, color: Colors.textPrimary },
    labelBold: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: Colors.textPrimary },
    valueBold: { fontFamily: 'Inter-Bold', fontSize: 16, color: Colors.primaryDark },
    input: {
        fontFamily: 'Inter-Medium',
        fontSize: 14,
        color: Colors.textPrimary,
        backgroundColor: Colors.white,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 8,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        minWidth: 100,
        textAlign: 'right',
    },
    modeLabel: { fontFamily: 'Inter-Medium', fontSize: 14, color: Colors.textSecondary, marginBottom: Spacing.sm },
    modeRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
    modeBtn: {
        flex: 1,
        paddingVertical: Spacing.sm,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: Colors.border,
        alignItems: 'center',
    },
    modeBtnActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight + '40' },
    modeBtnText: { fontFamily: 'Inter-Medium', fontSize: 14, color: Colors.textSecondary },
    modeBtnTextActive: { color: Colors.primaryDark, fontFamily: 'Inter-SemiBold' },
    confirmBtn: {
        backgroundColor: Colors.primary,
        paddingVertical: Spacing.md,
        borderRadius: 12,
        alignItems: 'center',
    },
    confirmBtnDisabled: { opacity: 0.5 },
    confirmBtnText: { fontFamily: 'Inter-SemiBold', fontSize: 16, color: Colors.white },
});

export default PayPaymentModal;
