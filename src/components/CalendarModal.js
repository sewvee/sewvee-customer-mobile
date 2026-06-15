import React from 'react';
import { View, Modal, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { Colors, Shadow, Spacing } from '../constants/theme';
import CalendarView from './CalendarView';

const CalendarModal = ({ visible, onClose, onSelect, initialDate, disablePastDates = true, minDate, maxDate, deliveryLoad, onReset }) => {
    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
                <View style={styles.calendarContainer}>
                    <CalendarView
                        onSelect={(date) => {
                            onSelect(date);
                            onClose();
                        }}
                        initialDate={initialDate}
                        disablePastDates={disablePastDates}
                        minDate={minDate}
                        maxDate={maxDate}
                        deliveryLoad={deliveryLoad}
                        showLegend={true}
                    />

                    <View style={styles.footer}>
                        <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                            style={styles.resetButton} 
                            onPress={() => {
                                onReset && onReset();
                                onClose();
                            }}
                        >
                            <Text style={styles.resetButtonText}>Reset</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </TouchableOpacity>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center'
    },
    calendarContainer: {
        backgroundColor: Colors.white,
        margin: 20,
        borderRadius: 24,
        padding: 24,
        ...Shadow.large,
        width: '90%',
        maxWidth: 360
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        marginTop: 20,
        gap: Spacing.md
    },
    cancelButton: {
        paddingVertical: 10,
        paddingHorizontal: 20,
    },
    cancelButtonText: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 14,
        color: Colors.textSecondary,
    },
    resetButton: {
        paddingVertical: 10,
        paddingHorizontal: 24,
        borderRadius: 12,
        backgroundColor: '#F1F5F9', // Subtle light gray for reset
    },
    resetButtonText: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 14,
        color: Colors.danger, // Red for reset
    }
});

export default CalendarModal;
