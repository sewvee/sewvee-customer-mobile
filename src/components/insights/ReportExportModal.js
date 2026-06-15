import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
} from 'react-native';

const REPORT_TYPES = [
    { id: 'revenue', label: 'Revenue Report' },
    { id: 'orders', label: 'Orders Report' },
    { id: 'attendance', label: 'Attendance Report' },
    { id: 'payroll', label: 'Payroll Report' },
];

const FORMATS = [
    { id: 'excel', label: 'Excel', available: true },
    { id: 'pdf', label: 'PDF', available: false },
];

const ReportExportModal = ({ visible, onClose, onExport, reportData }) => {
    const [selectedReport, setSelectedReport] = useState('revenue');
    const [selectedFormat, setSelectedFormat] = useState('excel');
    const [exporting, setExporting] = useState(false);

    const handleExport = async () => {
        if (selectedFormat === 'pdf') {
            Alert.alert('Coming Soon', 'PDF export will be available when expo-print is configured.');
            return;
        }
        setExporting(true);
        try {
            await onExport(selectedReport, selectedFormat);
            onClose();
        } catch (err) {
            Alert.alert('Export Failed', err?.message || 'Could not export report');
        } finally {
            setExporting(false);
        }
    };

    return (
        <Modal visible={visible} transparent animationType="slide">
            <TouchableOpacity
                style={styles.overlay}
                activeOpacity={1}
                onPress={onClose}
            >
                <View style={styles.container}>
                    <TouchableOpacity activeOpacity={1} onPress={e => e.stopPropagation()}>
                        <View style={styles.sheet}>
                            <Text style={styles.title}>Export Report</Text>
                            <Text style={styles.sectionLabel}>Report Type</Text>
                            <View style={styles.options}>
                                {REPORT_TYPES.map(r => (
                                    <TouchableOpacity
                                        key={r.id}
                                        style={[styles.option, selectedReport === r.id && styles.optionActive]}
                                        onPress={() => setSelectedReport(r.id)}
                                    >
                                        <Text style={[styles.optionText, selectedReport === r.id && styles.optionTextActive]}>
                                            {r.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                            <Text style={styles.sectionLabel}>Format</Text>
                            <View style={styles.options}>
                                {FORMATS.map(f => (
                                    <TouchableOpacity
                                        key={f.id}
                                        style={[
                                            styles.option,
                                            selectedFormat === f.id && styles.optionActive,
                                            !f.available && styles.optionDisabled,
                                        ]}
                                        onPress={() => f.available && setSelectedFormat(f.id)}
                                    >
                                        <Text style={[
                                            styles.optionText,
                                            selectedFormat === f.id && styles.optionTextActive,
                                            !f.available && styles.optionDisabledText,
                                        ]}>
                                            {f.label} {!f.available && '(soon)'}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                            <View style={styles.actions}>
                                <TouchableOpacity
                                    style={[styles.btn, styles.btnSecondary]}
                                    onPress={onClose}
                                    disabled={exporting}
                                >
                                    <Text style={styles.btnSecondaryText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.btn, styles.btnPrimary]}
                                    onPress={handleExport}
                                    disabled={exporting}
                                >
                                    {exporting ? (
                                        <ActivityIndicator size="small" color="#FFF" />
                                    ) : (
                                        <Text style={styles.btnPrimaryText}>Export</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    container: { padding: 16 },
    sheet: { backgroundColor: '#FFF', borderRadius: 20, padding: 24 },
    title: { fontSize: 20, fontWeight: 'bold', color: '#0F172A', marginBottom: 20 },
    sectionLabel: { fontSize: 12, color: '#64748B', marginBottom: 8, textTransform: 'uppercase' },
    options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
    option: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, backgroundColor: '#F1F5F9' },
    optionActive: { backgroundColor: '#5B43EE' },
    optionDisabled: { opacity: 0.6 },
    optionText: { fontSize: 14, color: '#0F172A', fontWeight: '500' },
    optionTextActive: { color: '#FFF' },
    optionDisabledText: { color: '#94A3B8' },
    actions: { flexDirection: 'row', gap: 12, marginTop: 8 },
    btn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
    btnSecondary: { backgroundColor: '#F1F5F9' },
    btnPrimary: { backgroundColor: '#5B43EE' },
    btnSecondaryText: { color: '#64748B', fontWeight: '600' },
    btnPrimaryText: { color: '#FFF', fontWeight: '600' },
});

export default ReportExportModal;
