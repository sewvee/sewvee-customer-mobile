import React, { useState } from "react";
import {
    View,
    Text,
    Modal,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Switch,
    Platform,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Colors, } from "../constants/theme";

const initialSchedule = [
    {
        day: "MONDAY",
        enabled: true,
        slots: [{ start: "09:00 AM", end: "05:00 PM" }],
        expanded: true,
    },
    {
        day: "TUESDAY",
        enabled: true,
        slots: [{ start: "09:00 AM", end: "02:00 PM" }, { start: "04:00 PM", end: "08:00 PM" }],
        expanded: true,
    },
    {
        day: "WEDNESDAY",
        enabled: true,
        slots: [{ start: "09:00 AM", end: "02:00 PM" }],
        expanded: false,
    },
    {
        day: "THURSDAY",
        enabled: true,
        slots: [{ start: "09:00 AM", end: "02:00 PM" }],
        expanded: false,
    },
    {
        day: "FRIDAY",
        enabled: true,
        slots: [{ start: "09:00 AM", end: "02:00 PM" }],
        expanded: false,
    },
    { day: "SATURDAY", enabled: false, slots: [], expanded: false },
    { day: "SUNDAY", enabled: false, slots: [], expanded: false },
];

const BusinessHoursModal = ({ visible, onClose }) => {
    const [schedule, setSchedule] = useState(initialSchedule);
    const [applyToAll, setApplyToAll] = useState(false);
    const [picker, setPicker] = useState({
        show: false,
        day: null,
        slotIndex: null,
        type: null,
        time: new Date(),
    });

    const toggleDay = (dayName) => {
        setSchedule((prevSchedule) =>
            prevSchedule.map((day) =>
                day.day === dayName
                    ? {
                        ...day,
                        enabled: !day.enabled,
                        expanded: !day.enabled && !day.expanded,
                    }
                    : day
            )
        );
    };

    const toggleExpand = (dayName) => {
        setSchedule((prevSchedule) =>
            prevSchedule.map((day) =>
                day.day === dayName ? { ...day, expanded: !day.expanded } : day
            )
        );
    };

    const showTimePicker = (dayName, slotIndex, type, currentTime) => {
        const date = new Date();
        const [time, ampm] = currentTime.split(" ");
        let [hours, minutes] = time.split(":").map(Number);
        if (ampm === "PM" && hours !== 12) hours += 12;
        if (ampm === "AM" && hours === 12) hours = 0;
        date.setHours(hours);
        date.setMinutes(minutes);

        setPicker({
            show: true,
            day: dayName,
            slotIndex,
            type,
            time: date,
        });
    };

    const onTimeChange = (event, selectedDate) => {
        setPicker((prev) => ({ ...prev, show: false }));
        if (event.type === "dismissed") return;

        const formattedTime = selectedDate.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
        });

        setSchedule((prevSchedule) =>
            prevSchedule.map((day) =>
                day.day === picker.day
                    ? {
                        ...day,
                        slots: day.slots.map((slot, index) =>
                            index === picker.slotIndex
                                ? { ...slot, [picker.type]: formattedTime }
                                : slot
                        ),
                    }
                    : day
            )
        );
    };

    const addSlot = (dayName) => {
        setSchedule((prevSchedule) =>
            prevSchedule.map((day) =>
                day.day === dayName
                    ? {
                        ...day,
                        slots: [...day.slots, { start: "09:00 AM", end: "05:00 PM" }],
                    }
                    : day
            )
        );
    };

    const removeSlot = (dayName, slotIndex) => {
        setSchedule((prevSchedule) =>
            prevSchedule.map((day) =>
                day.day === dayName
                    ? {
                        ...day,
                        slots: day.slots.filter((_, index) => index !== slotIndex),
                    }
                    : day
            )
        );
    };

    return (
        <Modal visible={visible} transparent animationType="slide">
            <View style={bhStyles.overlay}>
                <View style={bhStyles.container}>
                    {/* HEADER */}
                    <View style={bhStyles.headerRow}>
                        <View>
                            <Text style={bhStyles.title}>Business Hours</Text>
                            <Text style={bhStyles.subtitle}>Set Your Business Hours</Text>
                        </View>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={24} color={Colors.textPrimary} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false}>
                        {/* APPLY ALL */}
                        <TouchableOpacity
                            style={bhStyles.applyRow}
                            onPress={() => setApplyToAll(!applyToAll)}
                        >
                            <Ionicons
                                name={applyToAll ? "checkbox" : "square-outline"}
                                size={20}
                                color={applyToAll ? Colors.primary : Colors.textPrimary}
                            />
                            <Text style={bhStyles.applyText}>Apply same hours to all days</Text>
                        </TouchableOpacity>
                        {applyToAll &&
                            <View style={[bhStyles.timeRow, { marginTop: 0, paddingBottom: 20, paddingRight: 20, paddingLeft: 20 }]}>
                                <TouchableOpacity
                                    style={bhStyles.timeBox}
                                // onPress={() => showTimePicker(day.day, index, "start", slot.start)}
                                >
                                    <Text style={bhStyles.timeText}>09:00 AM</Text>
                                </TouchableOpacity>
                                <Text style={bhStyles.dash}>-</Text>
                                <TouchableOpacity
                                    style={bhStyles.timeBox}
                                // onPress={() => showTimePicker(day.day, index, "end", slot.end)}
                                >
                                    <Text style={bhStyles.timeText}>05:00 AM</Text>
                                </TouchableOpacity>
                            </View>
                        }
                        {/* DAY CARDS */}
                        {schedule.map((day) => (
                            <View key={day.day} style={bhStyles.dayCard}>
                                <TouchableOpacity
                                    style={bhStyles.dayHeader}
                                    onPress={() => toggleExpand(day.day)}
                                >
                                    <View style={bhStyles.dayLeft}>
                                        <Switch
                                            value={day.enabled}
                                            onValueChange={() => toggleDay(day.day)}
                                            trackColor={{ false: "#D1D5DB", true: "#6C5CE7" }}
                                            thumbColor="#ffffff"
                                            style={{ transform: [{ scaleX: 1 }, { scaleY: 1 }] }}
                                        />
                                        <Text style={bhStyles.dayText}>{day.day}</Text>
                                        {!day.expanded && (
                                            <Text style={bhStyles.collapsedTimeText}>
                                                {day.enabled
                                                    ? `${day.slots[0]?.start} - ${day.slots[0]?.end}`
                                                    : "Closed"}
                                            </Text>
                                        )}
                                    </View>
                                    <Ionicons
                                        name={day.expanded ? "chevron-up" : "chevron-down"}
                                        size={20}
                                        color={Colors.textPrimary}
                                    />
                                </TouchableOpacity>

                                {day.expanded && day.enabled && (
                                    <>
                                        {day.slots.map((slot, index) => (
                                            <View key={index} style={bhStyles.timeRow}>
                                                <TouchableOpacity
                                                    style={bhStyles.timeBox}
                                                    onPress={() => showTimePicker(day.day, index, "start", slot.start)}
                                                >
                                                    <Text style={bhStyles.timeText}>{slot.start}</Text>
                                                </TouchableOpacity>
                                                <Text style={bhStyles.dash}>-</Text>
                                                <TouchableOpacity
                                                    style={bhStyles.timeBox}
                                                    onPress={() => showTimePicker(day.day, index, "end", slot.end)}
                                                >
                                                    <Text style={bhStyles.timeText}>{slot.end}</Text>
                                                </TouchableOpacity>
                                                {/* <TouchableOpacity onPress={() => addSlot(day.day)} style={bhStyles.slotBtn}>
                                                    <Ionicons name="add-circle-outline" size={20} color={Colors.textPrimary} />
                                                </TouchableOpacity>
                                                {day.slots.length > 1 && (
                                                    <TouchableOpacity onPress={() => removeSlot(day.day, index)} style={bhStyles.slotBtn}>
                                                        <Ionicons name="trash-outline" size={20} color="red" />
                                                    </TouchableOpacity>
                                                )} */}
                                            </View>
                                        ))}
                                    </>
                                )}
                                {!day.enabled && day.expanded && (
                                    <Text style={bhStyles.closedText}>Closed</Text>
                                )}
                            </View>
                        ))}
                    </ScrollView>

                    {picker.show && (
                        <DateTimePicker
                            mode="time"
                            is24Hour={false}
                            value={picker.time}
                            onChange={onTimeChange}
                        />
                    )}

                    {/* FOOTER BUTTONS */}
                    <View style={bhStyles.footer}>
                        <TouchableOpacity style={bhStyles.resetBtn} onPress={() => setSchedule(initialSchedule)}>
                            <Text style={bhStyles.resetText}>Reset</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={bhStyles.saveBtn} onPress={onClose}>
                            <Text style={bhStyles.saveText}>Save</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

export default BusinessHoursModal;

const bhStyles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "center",
        alignItems: "center",
    },
    container: {
        backgroundColor: "#fff",
        borderRadius: 20,
        padding: 20,
        width: "90%",
        maxHeight: "90%",
        // ...SHADOWS.medium,
    },
    headerRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 20,
    },
    title: {
        fontSize: 20,
        color: Colors.textPrimary,
        fontWeight: "700",
        fontFamily: 'Inter-SemiBold'
    },
    subtitle: {
        fontSize: 14,
        color: Colors.textPrimary,
        opacity: 0.7,
        marginTop: 2,
        fontFamily: 'Inter-Regular'
    },
    applyRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 20,
    },
    applyText: {
        fontSize: 14,
        color: Colors.textPrimary,
        marginLeft: 10,
        fontWeight: "500",
        fontFamily: 'Inter_Medium'
    },
    dayCard: {
        borderWidth: 1,
        borderColor: "#E5E7EB",
        borderRadius: 12,
        padding: 10,
        marginBottom: 15,
    },
    dayHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    dayLeft: {
        flexDirection: "row",
        alignItems: "center",
    },
    dayText: {
        marginLeft: 10,
        fontWeight: "600",
        fontSize: 14,
        color: Colors.textPrimary,
        textTransform: "uppercase",
        fontFamily: 'Inter-Medium'
    },
    timeRow: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 15,
    },
    timeBox: {
        borderWidth: 1,
        borderColor: "#D1D5DB",
        borderRadius: 8,
        paddingVertical: 10,
        paddingHorizontal: 15,
        flex: 1,
        alignItems: "center",
    },
    timeText: {
        fontSize: 14,
        color: Colors.textPrimary,
        fontWeight: "500",
        fontFamily: 'Inter-Medium'
    },
    dash: {
        marginHorizontal: 10,
        color: Colors.textPrimary,
    },
    slotBtn: {
        marginLeft: 10,
    },
    closedText: {
        fontSize: 14,
        color: Colors.textPrimary,
        opacity: 0.5,
        marginTop: 15,
        alignSelf: "center",
    },
    footer: {
        flexDirection: "row",
        marginTop: 20,
    },
    resetBtn: {
        flex: 1,
        borderWidth: 1,
        borderColor: "#D1D5DB",
        borderRadius: 10,
        alignItems: "center",
        paddingVertical: 14,
        marginRight: 15,
    },
    saveBtn: {
        flex: 1,
        backgroundColor: "#6C5CE7",
        borderRadius: 10,
        alignItems: "center",
        paddingVertical: 14,
    },
    resetText: {
        fontSize: 16,
        color: Colors.textPrimary,
        fontWeight: "600",
        fontFamily: 'Inter-SemiBold'
    },
    saveText: {
        fontSize: 16,
        color: "#fff",
        fontWeight: "600",
        fontFamily: 'Inter-SemiBold'
    },
    dayLeft: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1, // Full space eduthuka
    },

    collapsedTimeText: {
        fontSize: 13,
        color: "#9CA3AF", // Light gray color (Disabled look)
        marginLeft: 'auto', // Right side push panna
        marginRight: 10,
        fontWeight: "400",
    },
});