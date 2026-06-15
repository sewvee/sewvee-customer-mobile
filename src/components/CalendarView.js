import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ChevronLeft, ChevronRight, Flame } from 'lucide-react-native';
import { Colors } from '../constants/theme';

const CalendarView = ({
    onSelect,
    onMonthChange,
    initialDate,
    deliveryLoad,
    urgencySummary,
    disablePastDates = true,
    minDate,
    maxDate,
    showLegend = false,
    style
}) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Parse initialDate (DD/MM/YYYY)
    let startMonth = today.getMonth();
    let startYear = today.getFullYear();

    if (initialDate && initialDate.includes('/')) {
        const parts = initialDate.split('/');
        if (parts.length === 3) {
            startMonth = parseInt(parts[1], 10) - 1;
            startYear = parseInt(parts[2], 10);
        }
    }

    const [currentMonth, setCurrentMonth] = useState(startMonth);
    const [currentYear, setCurrentYear] = useState(startYear);

    useEffect(() => {
        if (initialDate && initialDate.includes('/')) {
            const parts = initialDate.split('/');
            if (parts.length === 3) {
                setCurrentMonth(parseInt(parts[1], 10) - 1);
                setCurrentYear(parseInt(parts[2], 10));
            }
        }
    }, [initialDate]);

    useEffect(() => {
        if (!onMonthChange) {
            return;
        }

        onMonthChange(new Date(currentYear, currentMonth, 1));
    }, [currentMonth, currentYear, onMonthChange]);

    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();

    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const handlePrevMonth = () => {
        if (currentMonth === 0) {
            setCurrentMonth(11);
            setCurrentYear(currentYear - 1);
        } else {
            setCurrentMonth(currentMonth - 1);
        }
    };

    const handleNextMonth = () => {
        if (currentMonth === 11) {
            setCurrentMonth(0);
            setCurrentYear(currentYear + 1);
        } else {
            setCurrentMonth(currentMonth + 1);
        }
    };

    const handleDateClick = (day) => {
        if (!onSelect) return;
        const d = String(day).padStart(2, '0');
        const m = String(currentMonth + 1).padStart(2, '0');
        onSelect(`${d}/${m}/${currentYear}`);
    };

    const renderDays = () => {
        const days = [];
        const todayStr = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;

        for (let i = 0; i < firstDay; i++) {
            days.push(<View key={`empty-${i}`} style={styles.calendarDayEmpty} />);
        }

        for (let i = 1; i <= daysInMonth; i++) {
            const dateStr = `${String(i).padStart(2, '0')}/${String(currentMonth + 1).padStart(2, '0')}/${currentYear}`;
            const cellDate = new Date(currentYear, currentMonth, i);
            cellDate.setHours(0, 0, 0, 0);

            let isDisabled = false;
            if (minDate) {
                isDisabled = cellDate < minDate;
            } else if (disablePastDates) {
                isDisabled = cellDate < today;
            }

            if (!isDisabled && maxDate) {
                isDisabled = cellDate > maxDate;
            }

            const isSelected = initialDate === dateStr;
            const isToday = todayStr === dateStr && !isSelected;

            const load = deliveryLoad ? deliveryLoad[dateStr] : null;
            let loadColor = 'transparent';

            if (load) {
                if (load.status === 'low') loadColor = '#10B981';
                else if (load.status === 'medium') loadColor = '#F59E0B';
                else if (load.status === 'high') loadColor = '#EF4444';
            }

            days.push(
                <TouchableOpacity
                    key={i}
                    style={[
                        styles.calendarDay,
                        isSelected && styles.calendarDaySelected,
                        isToday && styles.calendarDayToday,
                        isDisabled && styles.calendarDayDisabled
                    ]}
                    onPress={() => !isDisabled && handleDateClick(i)}
                    disabled={isDisabled}
                >
                    <Text
                        style={[
                            styles.calendarDayText,
                            isSelected && styles.calendarDayTextSelected,
                            isToday && styles.calendarDayTextToday,
                            isDisabled && styles.calendarDayTextDisabled
                        ]}
                    >
                        {i}
                    </Text>

                    {load && (
                        <View style={[styles.loadBadge, { backgroundColor: loadColor }]}>
                            <Text style={styles.loadCount}>{load.count}</Text>
                            {load.urgentCount > 0 && (
                                <View style={styles.flameIcon}>
                                    <Flame size={8} color="white" fill="white" />
                                </View>
                            )}
                        </View>
                    )}
                </TouchableOpacity>
            );
        }
        return days;
    };

    return (
        <View style={[styles.container, style]}>
            <View style={styles.calendarHeader}>
                <TouchableOpacity onPress={handlePrevMonth} style={{ padding: 8 }}>
                    <ChevronLeft size={20} color={Colors.textPrimary} />
                </TouchableOpacity>

                <Text style={styles.calendarTitle}>
                    {monthNames[currentMonth]} {currentYear}
                </Text>

                <TouchableOpacity onPress={handleNextMonth} style={{ padding: 8 }}>
                    <ChevronRight size={20} color={Colors.textPrimary} />
                </TouchableOpacity>
            </View>

            <View style={styles.weekRow}>
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                    <Text key={i} style={styles.weekDayText}>{d}</Text>
                ))}
            </View>

            <View style={styles.daysGrid}>{renderDays()}</View>

            {showLegend && (
                <View style={styles.legendContainer}>
                    <View style={styles.legendItem}>
                        <View style={[styles.loadBadge, { backgroundColor: '#10B981' }]}>
                            <Text style={styles.loadCount}>{urgencySummary?.low ?? 0}</Text>
                        </View>
                        <Text style={styles.legendText}>Low</Text>
                    </View>

                    <View style={styles.legendItem}>
                        <View style={[styles.loadBadge, { backgroundColor: '#F59E0B' }]}>
                            <Text style={styles.loadCount}>{urgencySummary?.medium ?? 0}</Text>
                        </View>
                        <Text style={styles.legendText}>Medium</Text>
                    </View>

                    <View style={styles.legendItem}>
                        <View style={[styles.loadBadge, { backgroundColor: '#EF4444' }]}>
                            <Text style={styles.loadCount}>{urgencySummary?.high ?? 0}</Text>
                        </View>
                        <Text style={styles.legendText}>High</Text>
                    </View>

                    <View style={styles.legendItem}>
                        <View style={[styles.loadBadge, { backgroundColor: '#F59E0B' }]}>
                            <Text style={styles.loadCount}>{urgencySummary?.urgent ?? 0}</Text>
                        </View>
                        <Text style={styles.legendText}>Urgent</Text>
                    </View>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { width: '100%' },
    calendarHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20
    },
    calendarTitle: {
        fontFamily: 'Inter-Bold',
        fontSize: 18,
        color: '#0F172A'
    },
    weekRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8
    },
    weekDayText: {
        width: '14.2%',
        textAlign: 'center',
        fontFamily: 'Inter-SemiBold',
        fontSize: 12,
        color: Colors.textSecondary
    },
    daysGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap'
    },
    calendarDay: {
        width: '14.2%',
        aspectRatio: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 4,
        borderRadius: 12
    },
    calendarDayEmpty: {
        width: '14.2%',
        aspectRatio: 1,
        marginBottom: 4
    },
    calendarDaySelected: {
        backgroundColor: Colors.primary
    },
    calendarDayToday: {
        borderWidth: 1,
        borderColor: Colors.primary
    },
    calendarDayText: {
        fontFamily: 'Inter-Medium',
        fontSize: 14,
        color: Colors.textPrimary
    },
    calendarDayDisabled: {
        opacity: 0.25
    },
    calendarDayTextDisabled: {
        color: Colors.textSecondary
    },
    calendarDayTextSelected: {
        color: Colors.white,
        fontFamily: 'Inter-Bold'
    },
    calendarDayTextToday: {
        color: Colors.primary
    },
    legendContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        flexWrap: 'wrap',
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
        gap: 16
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6
    },
    legendText: {
        fontFamily: 'Inter-Medium',
        fontSize: 12,
        color: Colors.textSecondary
    },
    loadBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 4,
        paddingVertical: 1,
        borderRadius: 6,
        minWidth: 16,
        height: 16
    },
    loadCount: {
        fontFamily: 'Inter-Bold',
        fontSize: 10,
        color: 'white'
    },
    flameIcon: {
        marginLeft: 2
    }
});

export default CalendarView;
