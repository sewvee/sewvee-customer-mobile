import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Clock, LogIn, LogOut } from 'lucide-react-native';
import { Colors, Spacing, Typography, Shadow } from '../constants/theme';

const getCurrentTime = () => {
    const n = new Date();
    return `${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`;
};

const getTodayDate = () => new Date().toISOString().split('T')[0];

const ClockInOutCard = ({ userId, onClockIn, onClockOut, attendance }) => {
    const handleClockIn = () => {
        const time = getCurrentTime();
        const date = getTodayDate();
        onClockIn?.({ userId, date, checkIn: time });
    };

    const handleClockOut = () => {
        const time = getCurrentTime();
        const checkIn = attendance?.checkIn || '';
        const [h1, m1] = checkIn.split(':').map(Number);
        const [h2, m2] = time.split(':').map(Number);
        const mins = (h2 * 60 + m2) - (h1 * 60 + m1);
        const totalHours = (mins / 60).toFixed(1);
        onClockOut?.({ attendanceId: attendance?.id, checkOut: time, totalHours });
    };

    const today = getTodayDate();
    const isToday = attendance?.date === today;
    const isClockedIn = isToday && attendance?.checkIn;
    const isClockedOut = isClockedIn && !!attendance?.checkOut;

    return (
        <View style={[styles.card, isClockedIn && styles.cardClockedIn]}>
            <View style={styles.header}>
                <View style={[styles.iconBox, isClockedIn && styles.iconBoxSuccess]}>
                    <Clock size={26} color={isClockedIn ? Colors.success : Colors.primary} />
                </View>
                <Text style={styles.title}>Today's Attendance</Text>
            </View>
            {isClockedIn ? (
                <View style={styles.status}>
                    <View style={styles.timeRow}>
                        <Text style={styles.timeLabel}>Check-in</Text>
                        <Text style={styles.timeValue}>{attendance.checkIn}</Text>
                    </View>
                    {isClockedOut ? (
                        <>
                            <View style={styles.timeRow}>
                                <Text style={styles.timeLabel}>Check-out</Text>
                                <Text style={styles.timeValue}>{attendance.checkOut}</Text>
                            </View>
                            <View style={styles.hoursBadge}>
                                <Text style={styles.hoursText}>{attendance.totalHours || '0'} hrs</Text>
                            </View>
                        </>
                    ) : (
                        <TouchableOpacity style={styles.clockOutBtn} onPress={handleClockOut} activeOpacity={0.7}>
                            <LogOut size={20} color={Colors.white} />
                            <Text style={styles.clockOutText}>Clock Out</Text>
                        </TouchableOpacity>
                    )}
                </View>
            ) : (
                <TouchableOpacity style={styles.clockInBtn} onPress={handleClockIn} activeOpacity={0.7}>
                    <LogIn size={24} color={Colors.white} />
                    <Text style={styles.clockInText}>Clock In</Text>
                </TouchableOpacity>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: Colors.card,
        borderRadius: 16,
        padding: Spacing.lg,
        marginBottom: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.border,
        ...Shadow.medium,
    },
    cardClockedIn: { borderColor: Colors.success + '40' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        marginBottom: Spacing.md,
    },
    iconBox: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: Colors.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconBoxSuccess: { backgroundColor: Colors.success + '25' },
    title: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 17,
        color: Colors.textPrimary,
    },
    status: { gap: Spacing.md },
    timeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    timeLabel: { fontFamily: 'Inter-Regular', fontSize: 14, color: Colors.textSecondary },
    timeValue: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: Colors.textPrimary },
    hoursBadge: {
        alignSelf: 'flex-start',
        backgroundColor: Colors.primaryLight,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: 10,
    },
    hoursText: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: Colors.primaryDark },
    clockInBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
        backgroundColor: Colors.primary,
        paddingVertical: Spacing.lg,
        borderRadius: 12,
        minHeight: 52,
    },
    clockInText: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 17,
        color: Colors.white,
    },
    clockOutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
        backgroundColor: Colors.danger,
        paddingVertical: Spacing.md,
        borderRadius: 12,
        paddingHorizontal: Spacing.xl,
        minHeight: 44,
    },
    clockOutText: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 15,
        color: Colors.white,
    },
});

export default ClockInOutCard;
