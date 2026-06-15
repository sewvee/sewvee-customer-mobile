import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const InsightsCard = ({ title, icon: Icon, children, style }) => (
    <View style={[styles.card, style]}>
        {(title || Icon) && (
            <View style={styles.cardHeader}>
                {Icon && <Icon size={20} color="#5B43EE" />}
                {title && <Text style={styles.cardTitle}>{title}</Text>}
            </View>
        )}
        {children}
    </View>
);

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#FFFFFF',
        marginHorizontal: 20,
        marginBottom: 20,
        borderRadius: 20,
        padding: 20,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    cardTitle: {
        marginLeft: 10,
        fontSize: 16,
        fontWeight: 'bold',
        color: '#0F172A',
    },
});

export default InsightsCard;
