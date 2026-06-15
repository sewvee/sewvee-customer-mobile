import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Dimensions } from 'react-native';
import { ChevronLeft, ChevronRight, X } from 'lucide-react-native';
import { Colors, Shadow } from '../constants/theme';

const { width } = Dimensions.get('window');

const CustomCalendarPicker = ({ visible, selectedDate, onDateSelect, onClose }) => {
    const [currentMonth, setCurrentMonth] = useState(selectedDate || new Date());

    useEffect(() => {
        if (visible && selectedDate) {
            setCurrentMonth(selectedDate);
        }
    }, [visible, selectedDate]);

    const changeMonth = (increment) => {
        const newMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + increment, 1);
        setCurrentMonth(newMonth);
    };

    const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();

    const generateDays = () => {
        const days = [];
        // Add empty slots for days before the 1st of the month
        for (let i = 0; i < firstDayOfMonth; i++) {
            days.push(null);
        }
        for (let i = 1; i <= daysInMonth; i++) {
            days.push(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i));
        }
        return days;
    };

    const isSameDay = (d1, d2) => {
        if (!d1 || !d2) return false;
        return d1.getDate() === d2.getDate() &&
               d1.getMonth() === d2.getMonth() &&
               d1.getFullYear() === d2.getFullYear();
    };

    const isToday = (date) => isSameDay(date, new Date());

    const isFuture = (date) => {
        if (!date) return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return date > today;
    };

    const renderHeader = () => {
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        return (
            <View style={styles.header}>
                <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.arrowButton}>
                    <ChevronLeft size={24} color={Colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.monthText}>
                    {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                </Text>
                <TouchableOpacity onPress={() => changeMonth(1)} style={styles.arrowButton}>
                    <ChevronRight size={24} color={Colors.textPrimary} />
                </TouchableOpacity>
            </View>
        );
    };

    const renderDaysOfWeek = () => {
        const days = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
        return (
            <View style={styles.daysOfWeekContainer}>
                {days.map((day, index) => (
                    <Text key={index} style={styles.dayOfWeekText}>{day}</Text>
                ))}
            </View>
        );
    };

    const renderGrid = () => {
        const days = generateDays();
        return (
            <View style={styles.grid}>
                {days.map((date, index) => {
                    if (!date) return <View key={`empty-${index}`} style={styles.dayCell} />;
                    
                    const isSelected = isSameDay(date, selectedDate);
                    const isCurrentDate = isToday(date);
                    const disabled = isFuture(date);

                    return (
                        <TouchableOpacity
                            key={index}
                            style={[
                                styles.dayCell,
                                isSelected && styles.selectedDayCell,
                                isCurrentDate && !isSelected && styles.todayCell
                            ]}
                            onPress={() => {
                                if (!disabled) {
                                    onDateSelect(date);
                                }
                            }}
                            disabled={disabled}
                        >
                            <Text style={[
                                styles.dayText,
                                isSelected && styles.selectedDayText,
                                isCurrentDate && !isSelected && styles.todayText,
                                disabled && styles.disabledText
                            ]}>
                                {date.getDate()}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        );
    };

    return (
        <Modal
            animationType="fade"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
                
                <View style={styles.calendarContainer}>
                    <View style={styles.topRow}>
                        <Text style={styles.title}>Select Date</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <X size={20} color={Colors.textSecondary} />
                        </TouchableOpacity>
                    </View>
                    
                    {renderHeader()}
                    {renderDaysOfWeek()}
                    {renderGrid()}
                    
                    <TouchableOpacity style={styles.clearBtn} onPress={() => onDateSelect(null)}>
                        <Text style={styles.clearText}>Clear Selection</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    calendarContainer: {
        width: width * 0.85,
        backgroundColor: '#FFF',
        borderRadius: 20,
        padding: 20,
        ...Shadow.medium,
    },
    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    title: {
        fontFamily: 'Inter-Bold',
        fontSize: 18,
        color: Colors.textPrimary,
    },
    closeBtn: {
        padding: 4,
        backgroundColor: '#F3F4F6',
        borderRadius: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    arrowButton: {
        padding: 8,
    },
    monthText: {
        fontFamily: 'Inter-Bold',
        fontSize: 16,
        color: Colors.textPrimary,
    },
    daysOfWeekContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 10,
    },
    dayOfWeekText: {
        fontFamily: 'Inter-Medium',
        fontSize: 13,
        color: Colors.textSecondary,
        width: 32,
        textAlign: 'center',
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'flex-start',
    },
    dayCell: {
        width: `${100 / 7}%`,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 4,
    },
    selectedDayCell: {
        backgroundColor: Colors.primary,
        borderRadius: 20,
    },
    todayCell: {
        borderWidth: 1,
        borderColor: Colors.primary,
        borderRadius: 20,
    },
    dayText: {
        fontFamily: 'Inter-Medium',
        fontSize: 14,
        color: Colors.textPrimary,
    },
    selectedDayText: {
        color: '#FFF',
        fontFamily: 'Inter-Bold',
    },
    todayText: {
        color: Colors.primary,
    },
    disabledText: {
        color: '#D1D5DB',
    },
    clearBtn: {
        marginTop: 16,
        alignItems: 'center',
        paddingVertical: 12,
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
    },
    clearText: {
        fontFamily: 'Inter-Medium',
        fontSize: 14,
        color: Colors.textPrimary,
    }
});

export default CustomCalendarPicker;
