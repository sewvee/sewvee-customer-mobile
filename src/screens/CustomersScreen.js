import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchCustomersAction } from '../store/customerSlice';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    TextInput,
    Modal,
    ActivityIndicator,
    RefreshControl,
    LayoutAnimation
} from 'react-native';
import { Colors, Shadow } from '../constants/theme';
import {
    Plus,
    Search,
    ChevronRight,
    Phone,
    ShoppingBag,
    ListFilter,
    X,
    Check,
    Users
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

const CUSTOMER_SORT_OPTIONS = [
    { label: 'Name (A-Z)', value: 'name' },
    { label: 'Newest First', value: 'newest' },
    { label: 'Most Orders', value: 'most_orders' },
];

const getCustomerCreatedTime = item =>
    new Date(
        item?.created_at ||
        item?.createdAt ||
        item?.date ||
        item?.updated_at ||
        item?.updatedAt ||
        0,
    ).getTime();

const getCustomerName = item =>
    `${item?.customerName || item?.name || ''}`.trim().toLowerCase();

const getCustomerOrderCount = item =>
    Number(
        item?.totalOrders ??
        item?.total_orders ??
        item?.ordersCount ??
        item?.order_count ??
        0,
    ) || 0;

const CustomersScreen = ({ navigation }) => {

    const insets = useSafeAreaInsets();

    const dispatch = useDispatch();
    const {
        customers = [],
        loading,
        loadingMore,
        totalCustomers,
        totalPages,
        currentPage
    } = useSelector((state) => state.customers);

    const [search, setSearch] = useState('');
    const [isSearchVisible, setIsSearchVisible] = useState(false);
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isFilterVisible, setIsFilterVisible] = useState(false);
    const [selectedSortBy, setSelectedSortBy] = useState('newest');
    const [draftSortBy, setDraftSortBy] = useState('newest');

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
        }, 500);
        return () => clearTimeout(timer);
    }, [search]);

    const fetchData = useCallback((page = 1) => {
        const payload = {
            search: debouncedSearch,
            sortBy: selectedSortBy,
            page,
            limit: 10
        };
        dispatch(fetchCustomersAction(payload));
    }, [dispatch, debouncedSearch, selectedSortBy]);

    // Refresh on focus
    useFocusEffect(
        useCallback(() => {
            fetchData(1);
        }, [fetchData])
    );

    useEffect(() => {
        fetchData(1);
    }, [fetchData]);

    const customerList = useMemo(() => {
        return [...customers].sort((a, b) => {
            if (selectedSortBy === 'name') {
                const nameCompare = getCustomerName(a).localeCompare(getCustomerName(b));
                return nameCompare !== 0
                    ? nameCompare
                    : getCustomerCreatedTime(b) - getCustomerCreatedTime(a);
            }

            if (selectedSortBy === 'most_orders') {
                const orderCountDiff = getCustomerOrderCount(b) - getCustomerOrderCount(a);
                return orderCountDiff !== 0
                    ? orderCountDiff
                    : getCustomerCreatedTime(b) - getCustomerCreatedTime(a);
            }

            return getCustomerCreatedTime(b) - getCustomerCreatedTime(a);
        });
    }, [customers, selectedSortBy]);

    const handleLoadMore = () => {
        if (!loading && !loadingMore && currentPage < totalPages) {
            fetchData(currentPage + 1);
        }
    };

    const handleRefresh = async () => {
        try {
            setIsRefreshing(true);
            await dispatch(fetchCustomersAction({
                search: debouncedSearch,
                sortBy: selectedSortBy,
                page: 1,
                limit: 10
            })).unwrap();
        } finally {
            setIsRefreshing(false);
        }
    };

    const handleOpenFilters = () => {
        setDraftSortBy(selectedSortBy);
        setIsFilterVisible(true);
    };

    const handleCloseFilters = () => {
        setDraftSortBy(selectedSortBy);
        setIsFilterVisible(false);
    };

    const handleApplyFilters = () => {
        setSelectedSortBy(draftSortBy);
        setIsFilterVisible(false);
    };

    const isSortApplied = selectedSortBy !== 'newest';
    const totalCustomerCount =
        Number(totalCustomers) > 0 ? Number(totalCustomers) : customerList.length;

    const selectedSortLabel =
        CUSTOMER_SORT_OPTIONS.find(option => option.value === selectedSortBy)?.label ||
        'Newest First';


    const renderItem = ({ item }) => (
        <TouchableOpacity
            style={styles.customerCard}
            onPress={() =>
                navigation.navigate('CustomerDetail', { customer: item })
            }
        >
            <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.customerName}>{item.customerName || item.name}</Text>
                    <View style={styles.mobileRow}>
                        <Phone size={12} color={Colors.textSecondary} />
                        <Text style={styles.customerMobile}>
                            {item.whatsappNumber || item.mobile}
                        </Text>
                    </View>
                </View>

                <View style={styles.badgeContainer}>
                    <Text style={styles.badgeText}>
                        {item.displayId || item.customerId ? `#${item.displayId || item.customerId}` : (item.id ? `#${item.id.includes('_') ? item.id.split('_')[1] : item.id.slice(-6).toUpperCase()}` : '—')}
                    </Text>
                </View>
            </View>
            <View style={styles.cardContent}>
                <View style={styles.statsContainer}>
                    <ShoppingBag size={14} color={Colors.primary} />
                    <Text style={styles.statsText}>
                        {item.totalOrders || 0} Orders
                    </Text>
                </View>

                <ChevronRight size={18} color={Colors.textSecondary} />
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top }]}>
                {/* Header Top Row: Title + Actions */}
                <View style={styles.headerTop}>
                    <View>
                        <Text style={styles.screenTitle}>Customers</Text>
                        <Text style={styles.screenSubtitle}>{totalCustomerCount} Total</Text>
                    </View>

                    <View style={styles.actionButtons}>
                        <TouchableOpacity
                            style={[styles.filterBtn, isSearchVisible && styles.filterBtnActive]}
                            onPress={() => {
                                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                                setIsSearchVisible(!isSearchVisible);
                            }}
                        >
                            <Search size={22} color={isSearchVisible ? Colors.white : Colors.textPrimary} />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.filterBtn, isSortApplied && styles.filterBtnActive]}
                            onPress={handleOpenFilters}
                        >
                            <ListFilter size={22} color={isSortApplied ? Colors.white : Colors.textPrimary} />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.plusBtn}
                            onPress={() => navigation.navigate('AddCustomerScreen')}
                        >
                            <Plus size={24} color={Colors.white} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* SEARCH */}
                {isSearchVisible && (
                    <View style={styles.searchContainer}>
                        <Search size={18} color={Colors.textSecondary} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search Customers..."
                            placeholderTextColor={Colors.textSecondary}
                            value={search}
                            onChangeText={setSearch}
                            autoFocus={true}
                        />
                        {search.length > 0 && (
                            <TouchableOpacity 
                                onPress={() => setSearch('')}
                                style={styles.resetButton}
                            >
                                <X size={18} color={Colors.textSecondary} />
                            </TouchableOpacity>
                        )}
                    </View>
                )}
            </View>

            {loading && currentPage === 1 ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={customerList}
                    renderItem={renderItem}
                    keyExtractor={(item, index) => `cust-${item.id || item._id || index}-${index}`}
                    contentContainerStyle={styles.listContent}
                    onEndReached={handleLoadMore}
                    onEndReachedThreshold={0.5}
                    scrollEventThrottle={16}
                    refreshControl={
                        <RefreshControl
                            refreshing={isRefreshing}
                            onRefresh={handleRefresh}
                            colors={[Colors.primary]}
                            tintColor={Colors.primary}
                        />
                    }
                    ListFooterComponent={() => {
                        if (!loadingMore) return null;
                        return (
                            <View style={{ paddingVertical: 20 }}>
                                <ActivityIndicator size="small" color={Colors.primary} />
                            </View>
                        );
                    }}
                    ListEmptyComponent={
                        !loading && (
                            <View style={styles.emptyState}>
                                <View style={styles.emptyStateIconContainer}>
                                    <Users size={40} color={Colors.textSecondary} />
                                </View>
                                <Text style={styles.emptyStateTitle}>No Customers Found</Text>
                                <Text style={styles.emptyStateSub}>Try adjusting your search or filters</Text>
                            </View>
                        )
                    }
                />
            )}

            {/* FILTER MODAL */}
            <Modal
                visible={isFilterVisible}
                animationType="slide"
                transparent
                onRequestClose={handleCloseFilters}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={handleCloseFilters}
                >
                    <View
                        style={[
                            styles.modalContent,
                            { paddingBottom: Math.max(insets.bottom, 24) }
                        ]}
                    >
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Filter & Sort</Text>
                            <TouchableOpacity
                                onPress={handleCloseFilters}
                            >
                                <X size={24} color={Colors.textPrimary} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.modalBody}>

                            <Text style={styles.groupLabel}>Sort By</Text>

                            {/* <View style={styles.fixedSortInfo}>
                                <Check size={16} color={Colors.primary} />
                                <Text style={styles.fixedSortInfoText}>
                                    Current sort: {selectedSortLabel}
                                </Text>
                            </View> */}

                            <View style={styles.chipGrid}>
                                {CUSTOMER_SORT_OPTIONS.map(option => {
                                    const isActive = draftSortBy === option.value;

                                    return (
                                        <TouchableOpacity
                                            key={option.value}
                                            style={[
                                                styles.filterChip,
                                                isActive && styles.filterChipActive,
                                            ]}
                                            onPress={() => setDraftSortBy(option.value)}
                                        >
                                            <Text
                                                style={[
                                                    styles.filterChipText,
                                                    isActive && styles.filterChipTextActive,
                                                ]}
                                            >
                                                {option.label}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            <TouchableOpacity
                                style={styles.applyBtn}
                                onPress={handleApplyFilters}
                            >
                                <Text style={styles.applyBtnText}>
                                    Apply Filters
                                </Text>
                            </TouchableOpacity>

                        </View>
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
};

export default CustomersScreen;

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },

    header: {
        backgroundColor: Colors.white,
        paddingHorizontal: 16,
        paddingVertical: 12,
    },

    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    screenTitle: {
        fontFamily: 'Inter-Bold',
        fontSize: 20,
        color: Colors.textPrimary,
    },
    screenSubtitle: {
        fontSize: 13,
        color: Colors.textSecondary,
        fontFamily: 'Inter-Medium',
        marginTop: 2,
    },

    monthSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        borderRadius: 10,
        paddingHorizontal: 6,
        paddingVertical: 6,
        gap: 4,
    },

    monthText: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 13,
        minWidth: 55,
        textAlign: 'center',
        color: Colors.textPrimary,
    },

    actionButtons: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    filterBtn: {
        width: 42,
        height: 42,
        backgroundColor: '#F3F4F6',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    filterBtnActive: {
        backgroundColor: Colors.primary,
    },

    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.background,
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 50,
        borderWidth: 1,
        borderColor: Colors.border,
    },

    searchInput: {
        flex: 1,
        marginLeft: 8,
        fontSize: 15,
        color: Colors.textPrimary,
    },

    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#F8FAFC',
        borderRadius: 10,
        paddingHorizontal: 16,
        paddingVertical: 10,
        marginTop: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },

    resetButton: {
        padding: 4,
        marginLeft: 4,
    },

    statText: {
        fontSize: 13,
        fontFamily: 'Inter-SemiBold',
    },

    statLabel: {
        fontSize: 13,
        fontFamily: 'Inter-SemiBold',
        color: Colors.textSecondary,
    },

    statValue: {
        marginTop: 4,
        fontSize: 18,
        fontFamily: 'Inter-Bold',
        color: Colors.textPrimary,
    },

    statDivider: {
        width: 1,
        height: 16,
        backgroundColor: '#CBD5E1',
    },

    listContent: {
        padding: 16,
        paddingBottom: 100,
    },

    customerCard: {
        backgroundColor: Colors.white,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: Colors.border,
        ...Shadow.subtle,
    },

    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
        paddingBottom: 8,
    },

    customerName: {
        fontSize: 18,
        fontFamily: 'Inter-SemiBold',
        fontWeight: '700',
        color: Colors.textPrimary,
    },

    mobileRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        marginTop: 5
    },

    customerMobile: {
        fontSize: 14,
        fontFamily: 'Inter-Medium',
        color: Colors.textSecondary,

    },

    badgeContainer: {
        paddingHorizontal: 8,
        paddingVertical: 4,

    },

    badgeText: {
        fontSize: 12,
        fontFamily: 'Inter-Medium',
        color: Colors.textSecondary,
        borderRadius: 6,
        backgroundColor: '#F3F4F6',
        padding: 5
    },

    cardContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },

    statsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },

    statsText: {
        fontSize: 14,
        fontFamily: 'Inter-Medium',
        color: Colors.primary,
    },

    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },

    modalContent: {
        backgroundColor: Colors.white,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
    },

    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },

    modalTitle: {
        fontSize: 18,
        fontFamily: 'Inter-Bold',
        color: Colors.textPrimary,
    },

    modalBody: {
        padding: 20,
    },

    groupLabel: {
        fontSize: 14,
        marginBottom: 12,
        color: Colors.textSecondary,
        fontFamily: 'Inter-SemiBold',
    },
    fixedSortInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 14,
        paddingVertical: 14,
        borderRadius: 14,
        backgroundColor: '#EEF6FF',
        borderWidth: 1,
        borderColor: '#D6E8FF',
        marginBottom: 20,
    },
    fixedSortInfoText: {
        flex: 1,
        fontSize: 14,
        color: Colors.textPrimary,
        fontFamily: 'Inter-Medium',
    },

    chipGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: 24,
    },

    filterChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        backgroundColor: '#F3F4F6',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },

    filterChipActive: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },

    filterChipText: {
        fontSize: 14,
        fontFamily: 'Inter-Medium',
        color: Colors.textPrimary,
    },

    filterChipTextActive: {
        color: '#fff',
        fontFamily: 'Inter-Bold',
    },

    applyBtn: {
        backgroundColor: Colors.primary,
        height: 54,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },

    applyBtnText: {
        color: '#fff',
        fontSize: 16,
        fontFamily: 'Inter-Bold',
    },
    plusBtn: {
        width: 42,
        height: 42,
        backgroundColor: Colors.primary,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        ...Shadow.medium,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 80,
    },
    emptyStateIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#F1F5F9',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    emptyStateTitle: {
        fontSize: 18,
        fontFamily: 'Inter-SemiBold',
        color: Colors.textPrimary,
        marginBottom: 8,
    },
    emptyStateSub: {
        fontSize: 14,
        fontFamily: 'Inter-Regular',
        color: Colors.textSecondary,
    },
});
