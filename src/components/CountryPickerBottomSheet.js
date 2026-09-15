import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, TextInput, StyleSheet } from 'react-native';
import { Search, X } from 'lucide-react-native';
import { Colors, Shadow, Spacing } from '../constants/theme';
import { COUNTRY_CODES } from '../constants/countryCodes';

const CountryPickerBottomSheet = ({ visible, onClose, onSelect, selectedCode }) => {
    const [searchQuery, setSearchQuery] = useState('');

    const filteredCountries = COUNTRY_CODES.filter(country => 
        country.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        country.code.includes(searchQuery)
    );

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
                
                <View style={styles.bottomSheet}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Select Country</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <X size={24} color={Colors.textSecondary} />
                        </TouchableOpacity>
                    </View>
                    
                    <View style={styles.searchContainer}>
                        <Search size={20} color={Colors.textSecondary} style={styles.searchIcon} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search country or code..."
                            placeholderTextColor={Colors.textSecondary}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchQuery('')}>
                                <X size={18} color={Colors.textSecondary} />
                            </TouchableOpacity>
                        )}
                    </View>
                    
                    <FlatList
                        data={filteredCountries}
                        keyExtractor={(item) => item.code + item.name}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.listContent}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={[
                                    styles.countryItem,
                                    selectedCode === item.code && styles.countryItemActive
                                ]}
                                onPress={() => {
                                    onSelect(item.code, item.flag);
                                    onClose();
                                    setSearchQuery('');
                                }}
                            >
                                <Text style={styles.flag}>{item.flag}</Text>
                                <Text style={[
                                    styles.countryName,
                                    selectedCode === item.code && styles.countryNameActive
                                ]}>
                                    {item.name}
                                </Text>
                                <Text style={[
                                    styles.countryCode,
                                    selectedCode === item.code && styles.countryCodeActive
                                ]}>
                                    {item.code}
                                </Text>
                            </TouchableOpacity>
                        )}
                        ListEmptyComponent={() => (
                            <View style={styles.emptyContainer}>
                                <Text style={styles.emptyText}>No countries found.</Text>
                            </View>
                        )}
                    />
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    bottomSheet: {
        backgroundColor: Colors.white,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '80%',
        minHeight: '50%',
        ...Shadow.large,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: Spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    title: {
        fontFamily: 'Inter-Bold',
        fontSize: 18,
        color: Colors.textPrimary,
    },
    closeBtn: {
        padding: 4,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.background,
        margin: Spacing.lg,
        paddingHorizontal: Spacing.md,
        borderRadius: 12,
        height: 48,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    searchIcon: {
        marginRight: Spacing.sm,
    },
    searchInput: {
        flex: 1,
        fontFamily: 'Inter-Regular',
        fontSize: 15,
        color: Colors.textPrimary,
        height: '100%',
    },
    listContent: {
        paddingHorizontal: Spacing.lg,
        paddingBottom: Spacing.xxl,
    },
    countryItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    countryItemActive: {
        backgroundColor: Colors.primary + '10',
        borderRadius: 8,
        borderBottomWidth: 0,
        paddingHorizontal: Spacing.sm,
        marginHorizontal: -Spacing.sm,
    },
    flag: {
        fontSize: 24,
        marginRight: Spacing.md,
    },
    countryName: {
        flex: 1,
        fontFamily: 'Inter-Medium',
        fontSize: 16,
        color: Colors.textPrimary,
    },
    countryNameActive: {
        fontFamily: 'Inter-SemiBold',
        color: Colors.primary,
    },
    countryCode: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 16,
        color: Colors.textSecondary,
    },
    countryCodeActive: {
        color: Colors.primary,
    },
    emptyContainer: {
        padding: Spacing.xl,
        alignItems: 'center',
    },
    emptyText: {
        fontFamily: 'Inter-Regular',
        fontSize: 15,
        color: Colors.textSecondary,
    },
});

export default CountryPickerBottomSheet;
