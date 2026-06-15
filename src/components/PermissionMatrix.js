import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Colors, Spacing, Shadow } from '../constants/theme';
import { MODULES, ACTIONS } from '../constants/permissions';

const MODULE_LABELS = {
    [MODULES.DASHBOARD]: 'Dashboard',
    [MODULES.CLIENTS]: 'Customers',
    [MODULES.ORDERS]: 'Orders',
    [MODULES.PAYMENTS]: 'Payments',
    [MODULES.INSIGHTS]: 'Insights',
    [MODULES.OUTFITS]: 'Outfits',
    [MODULES.TEAM_MANAGEMENT]: 'Team Management',
    [MODULES.PAYROLL]: 'Payroll',
};

const MODULE_ICONS = {
    [MODULES.DASHBOARD]: 'grid-outline',
    [MODULES.CLIENTS]: 'people-outline',
    [MODULES.ORDERS]: 'receipt-outline',
    [MODULES.PAYMENTS]: 'card-outline',
    [MODULES.INSIGHTS]: 'analytics-outline',
    [MODULES.OUTFITS]: 'shirt-outline',
    [MODULES.TEAM_MANAGEMENT]: 'people-circle-outline',
    [MODULES.PAYROLL]: 'wallet-outline',
};

const ACTION_LABELS = {
    [ACTIONS.CREATE]: 'Create',
    [ACTIONS.EDIT]: 'Edit',
    [ACTIONS.VIEW]: 'View',
    [ACTIONS.DELETE]: 'Delete',
};

const MODULE_ORDER = [
    MODULES.DASHBOARD,
    MODULES.CLIENTS,
    MODULES.ORDERS,
    MODULES.PAYMENTS,
    MODULES.INSIGHTS,
    MODULES.OUTFITS,
    MODULES.TEAM_MANAGEMENT,
    MODULES.PAYROLL,
];

const MODULE_ACTIONS = {
    [MODULES.DASHBOARD]: [ACTIONS.VIEW],
    [MODULES.CLIENTS]: [ACTIONS.CREATE, ACTIONS.EDIT, ACTIONS.VIEW, ACTIONS.DELETE],
    [MODULES.ORDERS]: [ACTIONS.CREATE, ACTIONS.EDIT, ACTIONS.VIEW, ACTIONS.DELETE],
    [MODULES.PAYMENTS]: [ACTIONS.VIEW],
    [MODULES.INSIGHTS]: [ACTIONS.VIEW],
    [MODULES.OUTFITS]: [ACTIONS.CREATE, ACTIONS.EDIT, ACTIONS.VIEW, ACTIONS.DELETE],
    [MODULES.TEAM_MANAGEMENT]: [ACTIONS.CREATE, ACTIONS.EDIT, ACTIONS.VIEW, ACTIONS.DELETE],
    [MODULES.PAYROLL]: [ACTIONS.EDIT, ACTIONS.VIEW],
};

const VIEW_SCOPE_SELF = 'self';
const VIEW_SCOPE_ALL = 'all';

const PermissionMatrix = ({ permissions, onChange, readOnly = false }) => {
    const getPerm = (module, action) => {
        const m = permissions?.[module];
        if (!m) return false;
        return m[action] === true;
    };

    const getViewScope = (module) => {
        const m = permissions?.[module];
        return m?.viewScope || VIEW_SCOPE_ALL;
    };

    const setPerm = (moduleKey, action, value) => {
        const updated = { ...permissions };
        if (!updated[moduleKey]) updated[moduleKey] = {};
        updated[moduleKey] = { ...updated[moduleKey], [action]: value };
        onChange(updated);
    };

    const setViewScope = (moduleKey, scope) => {
        const updated = { ...permissions };
        if (!updated[moduleKey]) updated[moduleKey] = {};
        updated[moduleKey] = { ...updated[moduleKey], viewScope: scope };
        onChange(updated);
    };

    return (
        <View style={styles.container}>
            {MODULE_ORDER.map((moduleKey) => {
                const actions = MODULE_ACTIONS[moduleKey] || [];
                const hasView = actions.includes(ACTIONS.VIEW);
                if (actions.length === 0) return null;
                const icon = MODULE_ICONS[moduleKey] || 'folder-outline';

                return (
                    <View key={moduleKey} style={styles.moduleCard}>
                        <View style={styles.moduleHeader}>
                            <View style={styles.moduleIconWrap}>
                                <Ionicons name={icon} size={20} color={Colors.primary} />
                            </View>
                            <Text style={styles.moduleName}>{MODULE_LABELS[moduleKey] || moduleKey}</Text>
                        </View>
                        <View style={styles.toggles}>
                            {actions.map((action) => {
                                const isOn = getPerm(moduleKey, action);
                                if (readOnly) {
                                    return (
                                        <View
                                            key={action}
                                            style={[
                                                styles.toggle,
                                                styles.toggleReadOnly,
                                                isOn ? styles.toggleOn : styles.toggleOff,
                                            ]}
                                        >
                                            {isOn && <Ionicons name="checkmark" size={14} color={Colors.primaryDark} style={styles.toggleIcon} />}
                                            <Text style={[styles.toggleText, isOn ? styles.toggleTextOn : styles.toggleTextOff]}>
                                                {ACTION_LABELS[action]}
                                            </Text>
                                        </View>
                                    );
                                }
                                return (
                                    <TouchableOpacity
                                        key={action}
                                        style={[styles.toggle, isOn ? styles.toggleOn : styles.toggleOff]}
                                        onPress={() => setPerm(moduleKey, action, !isOn)}
                                        activeOpacity={0.7}
                                    >
                                        {isOn && <Ionicons name="checkmark" size={14} color={Colors.primaryDark} style={styles.toggleIcon} />}
                                        <Text style={[styles.toggleText, isOn ? styles.toggleTextOn : styles.toggleTextOff]}>
                                            {ACTION_LABELS[action]}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                            {hasView && !readOnly && (
                                <View style={styles.viewScopeRow}>
                                    <Text style={styles.viewScopeLabel}>View:</Text>
                                    <View style={styles.viewScopeChips}>
                                        <TouchableOpacity
                                            style={[styles.viewScopeChip, getViewScope(moduleKey) === VIEW_SCOPE_SELF && styles.viewScopeChipActive]}
                                            onPress={() => setViewScope(moduleKey, VIEW_SCOPE_SELF)}
                                            activeOpacity={0.7}
                                        >
                                            <Text style={[styles.viewScopeChipText, getViewScope(moduleKey) === VIEW_SCOPE_SELF && styles.viewScopeChipTextActive]}>
                                                Self
                                            </Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.viewScopeChip, getViewScope(moduleKey) === VIEW_SCOPE_ALL && styles.viewScopeChipActive]}
                                            onPress={() => setViewScope(moduleKey, VIEW_SCOPE_ALL)}
                                            activeOpacity={0.7}
                                        >
                                            <Text style={[styles.viewScopeChipText, getViewScope(moduleKey) === VIEW_SCOPE_ALL && styles.viewScopeChipTextActive]}>
                                                All
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            )}
                        </View>
                    </View>
                );
            })}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { gap: Spacing.sm },
    moduleCard: {
        backgroundColor: Colors.card,
        borderRadius: 14,
        padding: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.border,
        ...Shadow.subtle,
    },
    moduleHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing.sm,
        gap: Spacing.sm,
    },
    moduleIconWrap: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: Colors.primaryLight + '60',
        justifyContent: 'center',
        alignItems: 'center',
    },
    moduleName: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 15,
        color: Colors.textPrimary,
        flex: 1,
    },
    toggles: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.sm,
    },
    toggle: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 10,
        borderWidth: 2,
    },
    toggleOff: {
        backgroundColor: Colors.background,
        borderColor: Colors.border,
    },
    toggleReadOnly: { opacity: 0.95 },
    toggleOn: {
        backgroundColor: Colors.primaryLight,
        borderColor: Colors.primary,
    },
    toggleIcon: { marginRight: 4 },
    toggleText: { fontFamily: 'Inter-Medium', fontSize: 13 },
    toggleTextOff: { color: Colors.textSecondary },
    toggleTextOn: { color: Colors.primaryDark, fontFamily: 'Inter-SemiBold' },
    viewScopeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: Spacing.xs,
        gap: Spacing.sm,
    },
    viewScopeLabel: {
        fontFamily: 'Inter-Medium',
        fontSize: 12,
        color: Colors.textSecondary,
    },
    viewScopeChips: { flexDirection: 'row', gap: Spacing.xs },
    viewScopeChip: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: Colors.background,
        borderWidth: 2,
        borderColor: Colors.border,
    },
    viewScopeChipActive: {
        backgroundColor: Colors.primaryLight,
        borderColor: Colors.primary,
    },
    viewScopeChipText: {
        fontFamily: 'Inter-Medium',
        fontSize: 12,
        color: Colors.textSecondary,
    },
    viewScopeChipTextActive: {
        color: Colors.primaryDark,
        fontFamily: 'Inter-SemiBold',
    },
});

export default PermissionMatrix;
