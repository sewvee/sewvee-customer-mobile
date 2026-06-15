import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { Colors, Spacing } from '../constants/theme';
import { X } from 'lucide-react-native';
import CalendarView from './CalendarView';
import { formatDate } from '../utils/dateUtils';

const EditLeaveRequestModal = ({
    visible,
    onClose,
    request,
    onSave,
}) => {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [calendarVisible, setCalendarVisible] = useState(false);
    const [calendarField, setCalendarField] = useState('start');

    useEffect(() => {
        if (visible && request) {
            setStartDate(request.startDate || '');
            setEndDate(request.endDate || '');
        }
    }, [visible, request]);

    const handleSave = () => {
        if (!startDate || !endDate) return;
        if (new Date(startDate) > new Date(endDate)) return;
        onSave({ startDate, endDate });
        onClose();
    };

    const handleCalendarSelect = (ddmmyyyy) => {
        const [d, m, y] = ddmmyyyy.split('/');
        const iso = `${y}-${m}-${d}`;
        if (calendarField === 'start') setStartDate(iso);
        else setEndDate(iso);
        setCalendarVisible(false);
    };

    const initialDateForField = () => {
        const val = calendarField === 'start' ? startDate : endDate;
        if (!val) return null;
        const [y, m, d] = val.split('-');
        return `${d}/${m}/${y}`;
    };

    if (!request) return null;

    const isValid = startDate && endDate && new Date(startDate) <= new Date(endDate);

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
                        <Text style={styles.title}>Edit Leave Dates</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <X size={24} color={Colors.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Start Date</Text>
                            <TouchableOpacity
                                style={styles.dateInput}
                                onPress={() => { setCalendarField('start'); setCalendarVisible(true); }}
                            >
                                <Text style={[styles.dateInputText, !startDate && styles.placeholder]}>
                                    {startDate ? formatDate(startDate) : 'Select date'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                        <View style={styles.formGroup}>
                            <Text style={styles.label}>End Date</Text>
                            <TouchableOpacity
                                style={styles.dateInput}
                                onPress={() => { setCalendarField('end'); setCalendarVisible(true); }}
                            >
                                <Text style={[styles.dateInputText, !endDate && styles.placeholder]}>
                                    {endDate ? formatDate(endDate) : 'Select date'}
                                </Text>
                            </TouchableOpacity>
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

                {calendarVisible && (
                    <View style={styles.calendarOverlay}>
                        <TouchableOpacity
                            style={styles.calendarOverlayTouchable}
                            activeOpacity={1}
                            onPress={() => setCalendarVisible(false)}
                        />
                        <View style={styles.calendarModal}>
                            <View style={styles.calendarHeader}>
                                <Text style={styles.calendarTitle}>
                                    {calendarField === 'start' ? 'Select Start Date' : 'Select End Date'}
                                </Text>
                                <TouchableOpacity onPress={() => setCalendarVisible(false)}>
                                    <X size={24} color={Colors.textPrimary} />
                                </TouchableOpacity>
                            </View>
                            <CalendarView
                                initialDate={initialDateForField()}
                                onSelect={handleCalendarSelect}
                                disablePastDates={false}
                            />
                        </View>
                    </View>
                )}
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
    formGroup: { marginBottom: Spacing.md },
    label: { fontFamily: 'Inter-Medium', fontSize: 14, color: Colors.textSecondary, marginBottom: Spacing.xs },
    dateInput: {
        backgroundColor: Colors.card,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 10,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
    },
    dateInputText: { fontFamily: 'Inter-Regular', fontSize: 16, color: Colors.textPrimary },
    placeholder: { color: Colors.textSecondary },
    confirmBtn: {
        backgroundColor: Colors.primary,
        paddingVertical: Spacing.md,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: Spacing.md,
    },
    confirmBtnDisabled: { opacity: 0.5 },
    confirmBtnText: { fontFamily: 'Inter-SemiBold', fontSize: 16, color: Colors.white },
    calendarOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    calendarOverlayTouchable: {
        flex: 1,
    },
    calendarModal: {
        backgroundColor: Colors.white,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: Spacing.lg,
    },
    calendarHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    calendarTitle: { fontFamily: 'Inter-SemiBold', fontSize: 16, color: Colors.textPrimary },
});

export default EditLeaveRequestModal;
