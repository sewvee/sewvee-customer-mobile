import React from 'react';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { MoreVertical, Pencil, User, Power } from 'lucide-react-native';
import { Colors, Spacing } from '../constants/theme';
import BottomActionSheet from './BottomActionSheet';

const UserActionsMenu = ({ user, onEdit, onViewProfile, onToggleStatus }) => {
    const [visible, setVisible] = React.useState(false);
    const isActive = user?.status === 'Active';

    return (
        <>
            <TouchableOpacity
                onPress={() => setVisible(true)}
                style={styles.trigger}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
                <MoreVertical size={20} color={Colors.textSecondary} />
            </TouchableOpacity>

            <BottomActionSheet
                visible={visible}
                onClose={() => setVisible(false)}
                title={user?.name}
            >
                <TouchableOpacity
                    style={styles.actionOption}
                    onPress={() => {
                        setVisible(false);
                        onEdit?.(user);
                    }}
                >
                    <Pencil size={20} color={Colors.textPrimary} />
                    <Text style={styles.actionText}>Edit User</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.actionOption}
                    onPress={() => {
                        setVisible(false);
                        onViewProfile?.(user);
                    }}
                >
                    <User size={20} color={Colors.textPrimary} />
                    <Text style={styles.actionText}>View Profile</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.actionOption}
                    onPress={() => {
                        setVisible(false);
                        onToggleStatus?.(user);
                    }}
                >
                    <Power size={20} color={isActive ? Colors.danger : Colors.success} />
                    <Text style={[styles.actionText, { color: isActive ? Colors.danger : Colors.success }]}>
                        {isActive ? 'Disable User' : 'Enable User'}
                    </Text>
                </TouchableOpacity>
            </BottomActionSheet>
        </>
    );
};

const styles = StyleSheet.create({
    trigger: {
        padding: Spacing.sm,
    },
    actionOption: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 18,
        gap: 16,
    },
    actionText: {
        fontFamily: 'Inter-Medium',
        fontSize: 16,
        color: Colors.textPrimary,
    },
});

export default UserActionsMenu;
