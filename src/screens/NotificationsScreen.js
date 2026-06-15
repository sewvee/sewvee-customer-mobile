import { CheckCheck, Crown, PartyPopper, Bell, Check } from "lucide-react-native";
import React, { useState, useEffect, useCallback } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    FlatList,
    ActivityIndicator,
    LayoutAnimation,
    Platform,
    UIManager
} from "react-native";
import Feather from "react-native-vector-icons/Feather";
import { Colors } from "../constants/theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import { fetchNotifications, markAllAsRead, markAsRead } from "../store/notificationSlice";
import { useToast } from "../context/ToastContext";

if (Platform.OS === 'android') {
    if (UIManager.setLayoutAnimationEnabledExperimental) {
        UIManager.setLayoutAnimationEnabledExperimental(true);
    }
}

const NotificationItem = ({ item }) => {
    const dispatch = useDispatch();
    const { showToast } = useToast();
    const [isExpanded, setIsExpanded] = useState(false);

    const toggleExpand = async () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setIsExpanded(!isExpanded);
        
        if (!item.is_read) {
            try {
                const resultAction = await dispatch(markAsRead(item.id));
                if (markAsRead.fulfilled.match(resultAction)) {
                    const message = resultAction.payload.data?.message;
                    if (message) {
                        showToast(message, 'success');
                    }
                }
            } catch (error) {
                console.error('Failed to mark notification as read:', error);
            }
        }
    };

    const renderIcon = (type) => {
        const upperType = type?.toUpperCase() || '';
        
        if (upperType.includes('ORDER') || upperType.includes('PAYMENT')) {
            return (
                <View style={[styles.iconContainer, { backgroundColor: '#E1F9E6' }]}>
                    <Check size={20} color="#22C55E" />
                </View>
            );
        }
        
        if (upperType.includes('TRIAL') || upperType.includes('SUBSCRIPTION')) {
            return (
                <View style={[styles.iconContainer, { backgroundColor: '#EDE9FE' }]}>
                    <Crown size={20} color="#5B43EE" />
                </View>
            );
        }
        
        if (upperType.includes('WELCOME')) {
            return (
                <View style={[styles.iconContainer, { backgroundColor: '#EDE9FE' }]}>
                    <PartyPopper size={20} color="#5B43EE" />
                </View>
            );
        }

        return (
            <View style={[styles.iconContainer, { backgroundColor: '#F3F4F6' }]}>
                <Bell size={20} color="#6B7280" />
            </View>
        );
    };

    const formatTime = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <TouchableOpacity 
            style={styles.card} 
            onPress={toggleExpand} 
            activeOpacity={0.8}
        >
            {renderIcon(item.type)}

            <View style={styles.content}>
                <View style={styles.rowBetween}>
                    <Text style={styles.title} numberOfLines={2}>
                        {item.title}
                    </Text>
                    <View style={styles.rightSide}>
                        <Text style={styles.time}>{formatTime(item.created_at)}</Text>
                        {!item.is_read && <View style={styles.unreadDot} />}
                    </View>
                </View>

                <Text 
                    style={styles.description} 
                    numberOfLines={isExpanded ? undefined : 1}
                    ellipsizeMode="tail"
                >
                    {item.message}
                </Text>
            </View>
        </TouchableOpacity>
    );
};

const NotificationsScreen = ({ navigation }) => {
    const dispatch = useDispatch();
    const { showToast } = useToast();
    const insets = useSafeAreaInsets();
    
    const { 
        today, 
        yesterday, 
        older, 
        loading, 
        loadingMore, 
        pagination,
        unreadCount 
    } = useSelector(state => state.notifications);

    useEffect(() => {
        dispatch(fetchNotifications({ page: 1, limit: 10 }));
    }, [dispatch]);

    const handleLoadMore = useCallback(() => {
        if (!loading && !loadingMore && pagination && pagination.page < pagination.totalPages) {
            dispatch(fetchNotifications({ page: pagination.page + 1, limit: 10 }));
        }
    }, [dispatch, loading, loadingMore, pagination]);

    const handleMarkAllRead = async () => {
        const resultAction = await dispatch(markAllAsRead());
        if (markAllAsRead.fulfilled.match(resultAction)) {
            const message = resultAction.payload?.message;
            if (message) {
                showToast(message, 'success');
            }
        }
        dispatch(fetchNotifications({ page: 1, limit: 10 }));
    };

    const renderFooter = () => {
        if (!loadingMore) return <View style={{ height: 20 }} />;
        return (
            <View style={styles.loaderFooter}>
                <ActivityIndicator size="small" color={Colors.primary} />
            </View>
        );
    };

    const flatData = React.useMemo(() => [
        ...(today.length > 0 ? [{ type: 'header', id: 'header-today', title: 'Today' }, ...today.map(item => ({ ...item, section: 'today' }))] : []),
        ...(yesterday.length > 0 ? [{ type: 'header', id: 'header-yesterday', title: 'Yesterday' }, ...yesterday.map(item => ({ ...item, section: 'yesterday' }))] : []),
        ...(older.length > 0 ? [{ type: 'header', id: 'header-older', title: 'Older' }, ...older.map(item => ({ ...item, section: 'older' }))] : []),
    ], [today, yesterday, older]);

    const renderItem = ({ item }) => {
        if (item.type === 'header') {
            return <Text style={styles.sectionTitle}>{item.title}</Text>;
        }
        return <NotificationItem item={item} />;
    };

    return (
        <View style={styles.container}>
            {/* HEADER */}
            <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Feather name="arrow-left" size={24} color="#111827" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Notifications</Text>
            </View>

            {/* TAB SECTION */}
            <View style={styles.tabContainer}>
                <View style={styles.tabRow}>
                    <View style={[styles.tabItem, styles.activeTabItem]}>
                        <Text style={[styles.tabText, styles.activeTabText]}>
                            All
                        </Text>
                        <View style={[styles.countBadge, styles.activeCountBadge]}>
                            <Text style={[styles.countText, styles.activeCountText]}>
                                {today.length + yesterday.length + older.length}
                            </Text>
                        </View>
                    </View>

                    <View style={{ flex: 1 }} />

                    <TouchableOpacity style={styles.markRow} onPress={handleMarkAllRead}>
                        <CheckCheck size={20} color="#5B43EE" />
                        <Text style={styles.markText}>Mark all as read</Text>
                    </TouchableOpacity>
                </View>
                <View style={styles.tabSeparator} />
            </View>

            {loading ? (
                <View style={styles.centerLoader}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={flatData}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id ? item.id.toString() : item.title}
                    contentContainerStyle={styles.listContent}
                    onEndReached={handleLoadMore}
                    onEndReachedThreshold={0.2}
                    ListFooterComponent={renderFooter}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>No notifications yet</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
};

export default NotificationsScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F9FAFB"
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingBottom: 12,
        backgroundColor: "#fff"
    },
    headerTitle: {
        fontSize: 22,
        fontFamily: "Inter-SemiBold",
        color: "#111827",
        marginLeft: 12
    },
    backButton: {
        padding: 4
    },
    tabContainer: {
        backgroundColor: "#fff",
    },
    tabRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingTop: 14,
    },
    tabItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingBottom: 10,
        marginRight: 24,
        borderBottomWidth: 2,
        borderBottomColor: "transparent"
    },
    activeTabItem: {
        borderBottomColor: "#5B43EE"
    },
    tabText: {
        fontSize: 16,
        fontFamily: "Inter-Medium",
        color: "#6B7280"
    },
    activeTabText: {
        color: "#5B43EE"
    },
    countBadge: {
        marginLeft: 6,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
        minWidth: 24,
        alignItems: 'center',
        justifyContent: 'center'
    },
    activeCountBadge: {
        backgroundColor: "#EDE9FE",
    },
    inactiveCountBadge: {
        backgroundColor: "#F3F4F6",
    },
    countText: {
        fontSize: 12,
        fontFamily: "Inter-SemiBold",
    },
    activeCountText: {
        color: "#5B43EE"
    },
    inactiveCountText: {
        color: "#6B7280"
    },
    markRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingBottom: 10
    },
    markText: {
        fontSize: 14,
        fontFamily: "Inter-SemiBold",
        color: "#5B43EE",
        marginLeft: 6
    },
    tabSeparator: {
        height: 1,
        backgroundColor: "#F3F4F6"
    },
    listContent: {
        paddingBottom: 40,
        backgroundColor: "#F9FAFB"
    },
    sectionTitle: {
        fontSize: 16,
        fontFamily: "Inter-SemiBold",
        color: "#6B7280",
        marginTop: 24,
        marginLeft: 20,
        marginBottom: 8
    },
    card: {
        flexDirection: "row",
        alignItems: "flex-start",
        backgroundColor: "#FFFFFF",
        marginHorizontal: 16,
        marginTop: 12,
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "#F3F4F6"
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    content: {
        flex: 1,
        marginLeft: 14
    },
    rowBetween: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start"
    },
    rightSide: {
        flexDirection: "row",
        alignItems: "center",
        paddingTop: 2
    },
    title: {
        fontSize: 16,
        fontFamily: "Inter-SemiBold",
        color: "#111827",
        flex: 1,
        marginRight: 8,
        lineHeight: 22
    },
    time: {
        fontSize: 12,
        fontFamily: "Inter-Medium",
        color: "#9CA3AF"
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: "#5B43EE",
        marginLeft: 8
    },
    description: {
        fontSize: 14,
        fontFamily: "Inter-Regular",
        color: "#6B7280",
        marginTop: 4,
        lineHeight: 20
    },
    centerLoader: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center"
    },
    loaderFooter: {
        paddingVertical: 20,
        alignItems: "center"
    },
    emptyContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        marginTop: 100
    },
    emptyText: {
        fontSize: 16,
        fontFamily: "Inter-Medium",
        color: "#9CA3AF"
    }
});