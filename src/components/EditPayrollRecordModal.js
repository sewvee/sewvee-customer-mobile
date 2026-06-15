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

const EditPayrollRecordModal = ({
    visible,
    onClose,
    record,
    user,
    roleName,
    onSave,
}) => {
    const [paymentStatus, setPaymentStatus] = useState('Pending');
    const [paymentDate, setPaymentDate] = useState('');
    const [paymentMode, setPaymentMode] = useState('Cash');
    const [advance, setAdvance] = useState('');

    useEffect(() => {
        if (visible && record) {
            setPaymentStatus(record.paymentStatus || 'Pending');
            setPaymentDate(record.paymentDate || '');
            setPaymentMode(record.paymentMode || 'Cash');
            setAdvance(String(record.advance ?? ''));
        }
    }, [visible, record]);

    const handleSave = () => {
        const advanceNum = parseFloat(advance) || 0;
        const updates = {
            paymentStatus,
            paymentDate: paymentStatus === 'Paid' ? (paymentDate || null) : null,
            paymentMode: paymentStatus === 'Paid' ? paymentMode : null,
            advance: advanceNum,
        };
        onSave(updates);
        onClose();
    };

    if (!record || !user) return null;

    const netPayable = record.netPayable ?? 0;
    const advanceNum = parseFloat(advance) || 0;
    const balance = Math.max(0, netPayable - advanceNum);
    const isValid = advanceNum <= netPayable;

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
                        <Text style={styles.title}>Edit Payroll Record</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <X size={24} color={Colors.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
                        <Text style={styles.empName}>{user.name}</Text>
                        <Text style={styles.empRole}>{roleName || '—'}</Text>
                        <Text style={styles.month}>Payroll Period: {MONTH_NAMES[record.month - 1]} {record.year}</Text>

                        <Text style={styles.sectionLabel}>Payment Status</Text>
                        <View style={styles.chipRow}>
                            {['Pending', 'Paid'].map((s) => (
                                <TouchableOpacity
                                    key={s}
                                    style={[styles.chip, paymentStatus === s && styles.chipActive]}
                                    onPress={() => setPaymentStatus(s)}
                                >
                                    <Text style={[styles.chipText, paymentStatus === s && styles.chipTextActive]}>{s}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {paymentStatus === 'Paid' && (
                            <>
                                <Text style={styles.sectionLabel}>Payment Date</Text>
                                <TextInput
                                    style={styles.input}
                                    value={paymentDate}
                                    onChangeText={setPaymentDate}
                                    placeholder="YYYY-MM-DD"
                                    placeholderTextColor={Colors.textSecondary}
                                />
                                <Text style={styles.sectionLabel}>Payment Mode</Text>
                                <View style={styles.chipRow}>
                                    {['Cash', 'UPI', 'Bank'].map((m) => (
                                        <TouchableOpacity
                                            key={m}
                                            style={[styles.chip, paymentMode === m && styles.chipActive]}
                                            onPress={() => setPaymentMode(m)}
                                        >
                                            <Text style={[styles.chipText, paymentMode === m && styles.chipTextActive]}>{m}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </>
                        )}

                        <Text style={styles.sectionLabel}>Advance (₹)</Text>
                        <TextInput
                            style={styles.input}
                            value={advance}
                            onChangeText={setAdvance}
                            placeholder="0"
                            placeholderTextColor={Colors.textSecondary}
                            keyboardType="numeric"
                        />

                        <View style={styles.section}>
                            <View style={styles.row}>
                                <Text style={styles.label}>Net Payable</Text>
                                <Text style={styles.value}>₹{netPayable.toLocaleString('en-IN')}</Text>
                            </View>
                            <View style={[styles.row, styles.rowHighlight]}>
                                <Text style={styles.labelBold}>Balance</Text>
                                <Text style={styles.valueBold}>₹{balance.toLocaleString('en-IN')}</Text>
                            </View>
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
    empRole: { fontFamily: 'Inter-Regular', fontSize: 14, color: Colors.textSecondary, marginTop: 2 },
    month: { fontFamily: 'Inter-Medium', fontSize: 14, color: Colors.textSecondary, marginTop: 4, marginBottom: Spacing.md },
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
    section: {
        backgroundColor: Colors.background,
        borderRadius: 12,
        padding: Spacing.md,
        marginTop: Spacing.md,
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
    confirmBtn: {
        backgroundColor: Colors.primary,
        paddingVertical: Spacing.md,
        borderRadius: 12,
        alignItems: 'center',
    },
    confirmBtnDisabled: { opacity: 0.5 },
    confirmBtnText: { fontFamily: 'Inter-SemiBold', fontSize: 16, color: Colors.white },
});

export default EditPayrollRecordModal;
