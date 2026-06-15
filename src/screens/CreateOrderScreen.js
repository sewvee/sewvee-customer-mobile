import React, { useState, useEffect, useLayoutEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Platform,
    ActivityIndicator,
    Modal,
    Alert
} from 'react-native';
import { Colors, Spacing, Typography, Shadow } from '../constants/theme';
import { Plus, Trash2, Calendar, User, ChevronDown, Check, Search, MapPin, Phone, ArrowLeft } from 'lucide-react-native';
// import { generateInvoicePDF } from '../services/pdfService';
// import { useAuth } from '../context/AuthContext';
// import { useData } from '../context/DataContext';
import SuccessModal from '../components/SuccessModal';
import { validatePhone } from '../utils/validation';
// import { logEvent } from '../config/firebase';
import { formatDate, getCurrentDate, getCurrentTime } from '../utils/dateUtils';
import { formatOrderNumber } from '../utils/orderIdFormatter';

const ITEM_TYPES = [
    'Chudithar',
    'Model Chudithar',
    'Blouse',
    'Model Blouse',
    'Lining',
    'Falls',
    'Lehanga',
    'Tops',
    'Others'
];

const CreateOrderScreen = ({ route, navigation }) => {
    const { company } = useAuth();
    const { addOrder, updateOrder, customers, addCustomer, orders, addPayment, outfits } = useData();
    const editOrderId = route.params?.editOrderId;

    const [billNo, setBillNo] = useState('');
    const [date, setDate] = useState(getCurrentDate());
    const [time, setTime] = useState(getCurrentTime());
    const [customerType, setCustomerType] = useState<'existing' | 'new'>('new');
    const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
    const [customerName, setCustomerName] = useState('');
    const [customerMobile, setCustomerMobile] = useState('');
    const [customerLocation, setCustomerLocation] = useState('');
    const [items, setItems] = useState([{ id: '1', name: '', qty: '1', rate: '', amount: 0, description: '' }]);
    const [advance, setAdvance] = useState('');
    const [advanceMode, setAdvanceMode] = useState<'Cash' | 'UPI'>('Cash');

    const [successVisible, setSuccessVisible] = useState(false);
    const [successTitle, setSuccessTitle] = useState('');
    const [successDesc, setSuccessDesc] = useState('');
    const [savedOrderId, setSavedOrderId] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isPrinting, setIsPrinting] = useState(false);

    // Custom Modal State
    const [alertVisible, setAlertVisible] = useState(false);
    const [alertTitle, setAlertTitle] = useState('');
    const [alertDesc, setAlertDesc] = useState('');
    const [alertType, setAlertType] = useState<'success' | 'warning' | 'info' | 'error'>('success');

    // Load order data if in edit mode
    useEffect(() => {
        if (editOrderId) {
            const existingOrder = orders.find(o => o.id === editOrderId);
            if (existingOrder) {
                setBillNo(formatOrderNumber(existingOrder.billNo));
                setDate(existingOrder.date);
                setCustomerName(existingOrder.customerName);
                setCustomerMobile(existingOrder.customerMobile);
                setItems(existingOrder.items.map((it, idx) => ({
                    id: (idx + 1).toString(),
                    name: it.name,
                    qty: it.qty?.toString() || '1',
                    rate: it.rate?.toString() || '0',
                    amount: it.amount,
                    description: it.description || ''
                })));
                setAdvance(existingOrder.advance.toString());
                setTime(existingOrder.time || getCurrentTime());

                const customer = customers.find(c => c.id === existingOrder.customerId);
                if (customer) {
                    setSelectedCustomer(customer);
                    setCustomerType('existing');
                    setCustomerLocation(customer.location || '');
                } else {
                    setCustomerType('new'); // If customer not found, treat as new
                }

                // Update header title
                navigation.setOptions({ title: `Edit Bill #${existingOrder.billNo}` });
            }
        } else {
            const prefix = 'ORD';
            // Filter orders that match the prefix
            const matchingOrders = orders.filter(o => o.billNo && o.billNo.startsWith(prefix));
            let nextNum = 1;
            if (matchingOrders.length > 0) {
                // Extract sequences and find max
                const nums = matchingOrders.map(o => {
                    const numStr = o.billNo.substring(prefix.length);
                    return parseInt(numStr);
                }).filter(n => !isNaN(n));

                if (nums.length > 0) {
                    nextNum = Math.max(...nums) + 1;
                }
            }
            setBillNo(`${prefix}${nextNum.toString().padStart(5, '0')}`);
        }
    }, [editOrderId, orders, customers, navigation]);

    useLayoutEffect(() => {
        navigation.setOptions({
            headerLeft: () => (
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={{ padding: 8, marginLeft: -8 }}
                >
                    <ArrowLeft size={24} color={Colors.textPrimary} />
                </TouchableOpacity>
            ),
        });
    }, [navigation]);

    // Dropdown state
    const [isPickerVisible, setPickerVisible] = useState(false);
    const [activeItemId, setActiveItemId] = useState<string | null>(null);

    // Suggestions for existing customers
    const suggestions = customerName.length > 0 && customerType === 'existing'
        ? customers.filter(c =>
            c.name.toLowerCase().includes(customerName.toLowerCase()) ||
            c.mobile.includes(customerName)
        )
        : [];

    // Use outfits from context, fallback to static if empty
    const availableItemTypes = outfits.length > 0
        ? Array.from(new Set([...outfits.filter(o => o.isVisible).map(o => o.name), 'Others']))
        : ITEM_TYPES;

    const calculateTotal = () => {
        return items.reduce((sum, item) => sum + (parseFloat(item.amount.toString()) || 0), 0);
    };

    const total = calculateTotal();
    const balance = total - (parseFloat(advance) || 0);

    const addItem = () => {
        const newId = items.length > 0 ? (Math.max(...items.map(i => parseInt(i.id))) + 1).toString() : '1';
        setItems([...items, { id: newId, name: '', qty: '1', rate: '', amount: 0, description: '' }]);
    };

    const removeItem = (id) => {
        if (items.length > 1) {
            setItems(items.filter(item => item.id !== id));
        }
    };

    const updateItem = (id, field, value) => {
        const newItems = items.map(item => {
            if (item.id === id) {
                const updated = { ...item, [field]: value };
                if (field === 'qty' || field === 'rate') {
                    const q = field === 'qty' ? parseFloat(value) : parseFloat(item.qty);
                    const r = field === 'rate' ? parseFloat(value) : parseFloat(item.rate);
                    updated.amount = q * r || 0;
                }
                return updated;
            }
            return item;
        });
        setItems(newItems);
    };

    const handleShare = async (saveOnly = false) => {
        if (!customerName) {
            setAlertTitle('Required');
            setAlertDesc('Please enter customer name');
            setAlertType('warning');
            setAlertVisible(true);
            return null;
        }

        if (customerMobile && !validatePhone(customerMobile)) {
            setAlertTitle('Invalid Mobile');
            setAlertDesc('Please enter a valid 10-digit WhatsApp number');
            setAlertType('warning');
            setAlertVisible(true);
            return null;
        }

        if (saveOnly) setIsSaving(true);
        else setIsPrinting(true);

        logEvent('order_save_initiated', { saveOnly, customerType });

        try {
            let finalCustomerId = selectedCustomer?.id || 'WALKIN';

            // Create new customer if needed
            if (customerType === 'new' && customerName && customerMobile) {
                const existing = customers.find(c => c.mobile === customerMobile);
                if (existing) {
                    finalCustomerId = existing.id;
                } else {
                    const newCust = await addCustomer({
                        name: customerName,
                        mobile: customerMobile,
                        location: customerLocation
                    });
                    finalCustomerId = newCust.id;
                    logEvent('customer_created_during_order');
                }
            }

            const initialAdvance = parseFloat(advance) || 0;

            const orderData = {
                id: editOrderId || Date.now().toString(),
                billNo,
                date,
                time,
                customerId: finalCustomerId,
                customerName,
                customerMobile,
                companyId: company?.id || 'default',
                items: items.map((i, idx) => ({
                    id: (idx + 1).toString(),
                    name: i.name,
                    qty: parseFloat(i.qty) || 0,
                    rate: parseFloat(i.rate) || 0,
                    amount: parseFloat(i.amount.toString()) || 0,
                    description: i.description || ''
                })),
                subtotal: total,
                advance: 0,
                total: total,
                balance: total,
                status: 'Due'
            };

            if (editOrderId) {
                const existing = orders.find(o => o.id === editOrderId);
                if (existing) {
                    orderData.advance = existing.advance;
                    orderData.balance = total - existing.advance;
                    orderData.status = (orderData.balance <= 0 ? 'Paid' : (total > orderData.balance ? 'Partial' : 'Due'));
                }
                await updateOrder(editOrderId, orderData);
                setSavedOrderId(editOrderId);
            } else {
                const savedOrder = await addOrder(orderData);
                const actualId = savedOrder.id; // Correct Firestore ID

                if (initialAdvance > 0) {
                    await addPayment({
                        orderId: actualId,
                        customerId: finalCustomerId,
                        amount: initialAdvance,
                        mode: advanceMode,
                        date: date
                    });
                    orderData.advance = initialAdvance;
                    orderData.balance = total - initialAdvance;
                    orderData.status = (orderData.balance <= 0 ? 'Paid' : (total > orderData.balance ? 'Partial' : 'Due'));
                }
                orderData.id = actualId;
                setSavedOrderId(actualId);
            }

            if (!saveOnly) {
                try {
                    const companyData = {
                        name: user?.boutiqueName || user?.name || 'My Boutique',
                        address: user?.address || 'Your Address Here',
                        phone: user?.mobile || user?.phone || 'Your Phone Here',
                        gstin: user?.gstin || '',
                        logo: company?.company_logo_url || company?.company_logo || company?.logoUrl || company?.logo_url || company?.logo || user?.company_logo_url || user?.logo_url || user?.logo || '',
                        billSignature: company?.billSignature || null,
                        billTerms: company?.billTerms || null
                    };
                    await generateInvoicePDF(orderData, companyData);
                } catch (pdfErr) {
                    console.error("PDF Generation Failed (Order Saved)", pdfErr);
                    // Instead of Alert.alert, we update the success modal description
                    setSuccessDesc(`Order successfully saved, but the PDF could not be generated: ${pdfErr.message || 'Unknown error'}. You can try printing again from the details screen.`);
                }
            }

            setSuccessTitle(editOrderId ? "Order Updated" : "Order Created");
            if (!successDesc) {
                setSuccessDesc(editOrderId ?
                    "The bill has been successfully updated." :
                    "A new bill has been successfully created and saved."
                );
            }
            setSuccessVisible(true);
            logEvent('order_save_success', { billNo: orderData.billNo, total: orderData.total });
            return orderData;
        } catch (error) {
            console.error(error);
            setAlertTitle('Error');
            setAlertDesc(error.message || 'Failed to save order');
            setAlertType('error');
            setAlertVisible(true);
            return null;
        } finally {
            setIsSaving(false);
            setIsPrinting(false);
        }
    };

    const handleSuccessDone = () => {
        setSuccessVisible(false);
        navigation.replace('OrderDetail', { orderId: savedOrderId });
    };

    const openPicker = (id) => {
        setActiveItemId(id);
        setPickerVisible(true);
    };

    const selectItemType = (type) => {
        if (activeItemId !== null) {
            updateItem(activeItemId, 'name', type);
        }
        setPickerVisible(false);
    };

    return (
        <KeyboardAvoidingView 
            style={styles.container} 
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 120 : 0}
        >
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.headerCard}>
                    <View style={styles.headerRow}>
                        <View style={styles.infoBox}>
                            <Text style={styles.infoLabel}>Bill No</Text>
                            <Text style={styles.infoValue}>#{billNo}</Text>
                        </View>
                        <View style={styles.infoBox}>
                            <Text style={styles.infoLabel}>Date</Text>
                            <View style={styles.row}>
                                <Calendar size={14} color={Colors.textSecondary} />
                                <Text style={styles.infoValue}>{date}</Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.customerSection}>
                        {editOrderId ? (
                            <>
                                <View style={[styles.inputRow, styles.readOnlyInput]}>
                                    <User size={20} color={Colors.primary} />
                                    <TextInput
                                        style={styles.customerInput}
                                        value={customerName}
                                        editable={false}
                                    />
                                </View>

                                <View style={[styles.inputRow, styles.readOnlyInput]}>
                                    <Phone size={20} color={Colors.primary} />
                                    <TextInput
                                        style={styles.customerInput}
                                        value={customerMobile}
                                        editable={false}
                                    />
                                </View>
                            </>
                        ) : (
                            <>
                                <View style={styles.typeToggle}>
                                    <TouchableOpacity
                                        style={[styles.typeBtn, customerType === 'existing' && styles.typeBtnActive]}
                                        onPress={() => {
                                            setCustomerType('existing');
                                            setCustomerName('');
                                            setCustomerMobile('');
                                            setCustomerLocation('');
                                        }}
                                    >
                                        <Text style={[styles.typeBtnText, customerType === 'existing' && styles.typeBtnTextActive]}>Existing Customer</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.typeBtn, customerType === 'new' && styles.typeBtnActive]}
                                        onPress={() => {
                                            setCustomerType('new');
                                            setSelectedCustomer(null);
                                            setCustomerName('');
                                            setCustomerMobile('');
                                            setCustomerLocation('');
                                        }}
                                    >
                                        <Text style={[styles.typeBtnText, customerType === 'new' && styles.typeBtnTextActive]}>New Customer</Text>
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.inputRow}>
                                    {customerType === 'existing' ? <Search size={20} color={Colors.primary} /> : <User size={20} color={Colors.primary} />}
                                    <TextInput
                                        style={styles.customerInput}
                                        placeholder={customerType === 'existing' ? "Search Name/Mobile" : "Customer Name"}
                                        value={customerName}
                                        onChangeText={(val) => {
                                            setCustomerName(val);
                                            if (selectedCustomer) setSelectedCustomer(null);
                                        }}
                                    />
                                </View>

                                {suggestions.length > 0 && !selectedCustomer && (
                                    <View style={styles.suggestionsContainer}>
                                        {suggestions.map(c => (
                                            <TouchableOpacity
                                                key={c.id}
                                                style={styles.suggestionItem}
                                                onPress={() => {
                                                    setSelectedCustomer(c);
                                                    setCustomerName(c.name);
                                                    setCustomerMobile(c.mobile);
                                                    setCustomerLocation(c.location || '');
                                                }}
                                            >
                                                <View>
                                                    <Text style={styles.suggestionName}>{c.name}</Text>
                                                    <Text style={styles.suggestionMobile}>{c.mobile}</Text>
                                                </View>
                                                {c.location && <Text style={styles.suggestionLocation}>{c.location}</Text>}
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                )}

                                <View style={styles.inputRow}>
                                    <Phone size={20} color={Colors.primary} />
                                    <TextInput
                                        style={styles.customerInput}
                                        placeholderTextColor={Colors.textSecondary}
                                        placeholder="WhatsApp Number"
                                        value={customerMobile}
                                        onChangeText={(val) => setCustomerMobile(val.replace(/[^0-9]/g, '').slice(0, 10))}
                                        keyboardType="phone-pad"
                                        maxLength={10}
                                        editable={customerType === 'new'}
                                    />
                                </View>

                                {customerType === 'new' && (
                                    <View style={styles.inputRow}>
                                        <MapPin size={20} color={Colors.primary} />
                                        <TextInput
                                            style={styles.customerInput}
                                            placeholderTextColor={Colors.textSecondary}
                                            placeholder="Location (Optional)"
                                            value={customerLocation}
                                            onChangeText={setCustomerLocation}
                                        />
                                    </View>
                                )}
                            </>
                        )}
                    </View>
                </View>

                <View style={styles.itemsSection}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Items</Text>
                        <TouchableOpacity onPress={addItem} style={styles.addButton}>
                            <Plus size={16} color={Colors.primary} />
                            <Text style={styles.addButtonText}>Add Item</Text>
                        </TouchableOpacity>
                    </View>

                    {items.map((item, index) => (
                        <View key={item.id} style={styles.itemRow}>
                            <View style={styles.itemTop}>
                                <View style={styles.itemNameContainer}>
                                    <Text style={styles.itemIndex}>{index + 1}.</Text>
                                    <TouchableOpacity
                                        style={styles.dropdownInput}
                                        onPress={() => openPicker(item.id)}
                                    >
                                        <Text style={[styles.dropdownInputText, !item.name && { color: Colors.textSecondary }]}>
                                            {item.name || 'Select Type'}
                                        </Text>
                                        <ChevronDown size={16} color={Colors.textSecondary} />
                                    </TouchableOpacity>
                                </View>
                                <TouchableOpacity onPress={() => removeItem(item.id)}>
                                    <Trash2 size={18} color={Colors.danger} />
                                </TouchableOpacity>
                            </View>

                            {item.name === 'Others' && (
                                <View style={styles.descriptionContainer}>
                                    <Text style={styles.smallLabel}>Description</Text>
                                    <TextInput
                                        style={styles.descriptionInput}
                                        placeholderTextColor={Colors.textSecondary}
                                        placeholder="Enter details (measurement, design, etc.)"
                                        value={(item).description}
                                        onChangeText={(val) => updateItem(item.id, 'description', val)}
                                        multiline
                                    />
                                </View>
                            )}

                            <View style={styles.itemBottom}>
                                <View style={styles.qtyContainer}>
                                    <Text style={styles.smallLabel}>Qty</Text>
                                    <TextInput
                                        style={styles.smallInput}
                                        placeholderTextColor={Colors.textSecondary}
                                        placeholder="0"
                                        value={item.qty.toString()}
                                        onChangeText={(val) => updateItem(item.id, 'qty', val)}
                                        keyboardType="numeric"
                                    />
                                </View>
                                <View style={[styles.qtyContainer, { flex: 1.5 }]}>
                                    <Text style={styles.smallLabel}>Rate</Text>
                                    <TextInput
                                        style={styles.smallInput}
                                        placeholderTextColor={Colors.textSecondary}
                                        placeholder="0.00"
                                        value={item.rate.toString()}
                                        onChangeText={(val) => updateItem(item.id, 'rate', val)}
                                        keyboardType="numeric"
                                    />
                                </View>
                                <View style={[styles.qtyContainer, { flex: 1.5, alignItems: 'flex-end' }]}>
                                    <Text style={styles.smallLabel}>Amount</Text>
                                    <Text style={styles.amountText}>₹{item.amount.toFixed(2)}</Text>
                                </View>
                            </View>
                        </View>
                    ))}
                </View>

                <View style={styles.paymentCard}>
                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Subtotal</Text>
                        <Text style={styles.summaryValue}>₹{total.toFixed(2)}</Text>
                    </View>

                    <View style={styles.advancePaymentSection}>
                        <Text style={styles.summaryLabel}>Advance Paid</Text>
                        <View style={styles.advanceInputRow}>
                            <View style={styles.advanceModeToggle}>
                                <TouchableOpacity
                                    style={[styles.smallModeBtn, advanceMode === 'Cash' && styles.smallModeBtnActive]}
                                    onPress={() => setAdvanceMode('Cash')}
                                >
                                    <Text style={[styles.smallModeBtnText, advanceMode === 'Cash' && styles.smallModeBtnTextActive]}>Cash</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.smallModeBtn, advanceMode === 'UPI' && styles.smallModeBtnActive]}
                                    onPress={() => setAdvanceMode('UPI')}
                                >
                                    <Text style={[styles.smallModeBtnText, advanceMode === 'UPI' && styles.smallModeBtnTextActive]}>UPI</Text>
                                </TouchableOpacity>
                            </View>
                            <TextInput
                                style={[styles.advanceInput, editOrderId && styles.readOnlyInput]}
                                placeholderTextColor={Colors.textSecondary}
                                placeholder="0.00"
                                value={advance}
                                onChangeText={setAdvance}
                                keyboardType="numeric"
                                textAlign="right"
                                editable={!editOrderId}
                            />
                        </View>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.summaryRow}>
                        <Text style={styles.totalLabel}>Balance Due</Text>
                        <Text style={styles.totalValue}>₹{balance.toFixed(2)}</Text>
                    </View>
                </View>

                <Modal
                    visible={isPickerVisible}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setPickerVisible(false)}
                >
                    <TouchableOpacity
                        style={styles.modalOverlay}
                        activeOpacity={1}
                        onPress={() => setPickerVisible(false)}
                    >
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>Select Item Type</Text>
                            {availableItemTypes.map((type) => (
                                <TouchableOpacity
                                    key={type}
                                    style={styles.modalItem}
                                    onPress={() => selectItemType(type)}
                                >
                                    <Text style={styles.modalItemText}>{type}</Text>
                                    {items.find(i => i.id === activeItemId)?.name === type && (
                                        <Check size={18} color={Colors.primary} />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>
                    </TouchableOpacity>
                </Modal>
            </ScrollView>

            <View style={styles.footer}>
                <View style={styles.footerRow}>
                    <TouchableOpacity
                        style={[styles.saveBtn, styles.saveBtnOutline, (isSaving || isPrinting) && { opacity: 0.7 }]}
                        onPress={() => handleShare(false)}
                        disabled={isSaving || isPrinting}
                    >
                        {isPrinting ? (
                            <ActivityIndicator size="small" color={Colors.primary} />
                        ) : (
                            <Text style={styles.saveBtnTextOutline}>Save & Print</Text>
                        )}
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.saveBtn, styles.saveBtnPrimary, (isSaving || isPrinting) && { opacity: 0.7 }]}
                        onPress={() => handleShare(true)}
                        disabled={isSaving || isPrinting}
                    >
                        {isSaving ? (
                            <ActivityIndicator size="small" color={Colors.white} />
                        ) : (
                            <Text style={styles.saveBtnText}>Save Order</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>

            <SuccessModal
                visible={successVisible}
                onClose={handleSuccessDone}
                title={successTitle}
                description={successDesc}
            />

            <SuccessModal
                visible={alertVisible}
                onClose={() => setAlertVisible(false)}
                title={alertTitle}
                description={alertDesc}
                type={alertType}
            />
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    scrollContent: {
        padding: Spacing.md,
        paddingBottom: 100,
    },
    headerCard: {
        backgroundColor: Colors.white,
        borderRadius: 16,
        padding: Spacing.md,
        marginBottom: Spacing.lg,
        ...Shadow.subtle,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.lg,
        paddingBottom: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    infoBox: {

    },
    infoLabel: {
        fontFamily: 'Inter-Regular',
        fontSize: 13,
        color: Colors.textSecondary,
        marginBottom: 2,
    },
    infoValue: {
        fontFamily: 'Inter-Bold',
        fontSize: 16,
        color: Colors.textPrimary,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    customerSection: {
        gap: Spacing.sm,
    },
    sectionTitle: {
        fontFamily: 'Inter-Bold',
        fontSize: 16,
        color: Colors.textPrimary,
        marginBottom: 8,
    },
    typeToggle: {
        flexDirection: 'row',
        backgroundColor: '#F3F4F6',
        borderRadius: 12,
        padding: 4,
        marginBottom: Spacing.md,
    },
    typeBtn: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 10,
    },
    typeBtnActive: {
        backgroundColor: Colors.white,
        ...Shadow.subtle,
    },
    typeBtnText: {
        fontFamily: 'Inter-Medium',
        fontSize: 14,
        color: Colors.textSecondary,
    },
    typeBtnTextActive: {
        color: Colors.primary,
        fontFamily: 'Inter-SemiBold',
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FCFCFC',
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 12,
        paddingHorizontal: Spacing.md,
        height: 54,
    },
    readOnlyInput: {
        backgroundColor: '#F9FAFB',
        borderStyle: 'dashed',
    },
    customerInput: {
        flex: 1,
        fontFamily: 'Inter-Medium',
        fontSize: 15,
        color: Colors.textPrimary,
        marginLeft: Spacing.sm,
    },
    itemsSection: {
        marginTop: Spacing.lg,
        gap: Spacing.sm,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F0FDF4', // Light green bg
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 4,
    },
    addButtonText: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 13,
        color: Colors.primary,
    },
    itemRow: {
        backgroundColor: Colors.white,
        borderRadius: 16,
        padding: Spacing.md,
        marginBottom: Spacing.sm,
        borderWidth: 1,
        borderColor: Colors.border,
        ...Shadow.subtle,
    },
    itemTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
        gap: 16,
    },
    itemNameContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    itemIndex: {
        fontFamily: 'Inter-Bold',
        fontSize: 14,
        color: Colors.textSecondary,
        marginRight: 12,
        width: 24,
    },
    dropdownInput: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    dropdownInputText: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 16,
        color: Colors.textPrimary,
    },
    itemBottom: {
        flexDirection: 'row',
        gap: 12,
    },
    qtyContainer: {
        flex: 1,
    },
    smallLabel: {
        fontFamily: 'Inter-Medium',
        fontSize: 12,
        color: Colors.textSecondary,
        marginBottom: 6,
    },
    smallInput: {
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 8,
        paddingHorizontal: 10,
        height: 40,
        fontFamily: 'Inter-SemiBold',
        fontSize: 15,
        color: Colors.textPrimary,
    },
    amountText: {
        fontFamily: 'Inter-Bold',
        fontSize: 16,
        color: Colors.textPrimary,
        height: 40,
        paddingTop: 10,
    },
    paymentCard: {
        marginTop: Spacing.lg,
        backgroundColor: Colors.white,
        borderRadius: 16,
        padding: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.border,
        ...Shadow.subtle,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    summaryLabel: {
        fontFamily: 'Inter-Medium',
        fontSize: 16,
        color: Colors.textSecondary,
    },
    summaryValue: {
        fontFamily: 'Inter-Bold',
        fontSize: 18,
        color: Colors.textPrimary,
    },
    divider: {
        height: 1,
        backgroundColor: '#F3F4F6',
        marginVertical: 8,
        marginBottom: 16,
    },
    advancePaymentSection: {
        marginTop: 4,
        marginBottom: 8,
    },
    advanceInputRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 8,
    },
    advanceModeToggle: {
        flexDirection: 'row',
        backgroundColor: '#F3F4F6',
        borderRadius: 8,
        padding: 4,
    },
    smallModeBtn: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
    },
    smallModeBtnActive: {
        backgroundColor: Colors.white,
        ...Shadow.subtle,
    },
    smallModeBtnText: {
        fontSize: 12,
        fontFamily: 'Inter-Medium',
        color: Colors.textSecondary,
    },
    smallModeBtnTextActive: {
        color: Colors.textPrimary,
        fontFamily: 'Inter-SemiBold',
    },
    advanceInput: {
        backgroundColor: '#FCFCFC',
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 8,
        paddingHorizontal: 12,
        height: 40,
        width: 120,
        fontFamily: 'Inter-Bold',
        fontSize: 16,
        color: Colors.textPrimary,
        textAlign: 'right',
    },
    totalRow: {
        marginTop: 12,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
    },
    totalLabel: {
        fontFamily: 'Inter-Bold',
        fontSize: 20,
        color: Colors.textPrimary,
    },
    totalValue: {
        fontFamily: 'Inter-Bold',
        fontSize: 28,
        color: Colors.primary,
    },
    footer: {
        padding: Spacing.md,
        backgroundColor: Colors.white,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
    },
    footerRow: {
        flexDirection: 'row',
        gap: Spacing.md,
    },
    saveBtn: {
        flex: 1,
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    saveBtnPrimary: {
        backgroundColor: Colors.primary,
        ...Shadow.medium,
    },
    saveBtnOutline: {
        backgroundColor: Colors.white,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    saveBtnText: {
        fontFamily: 'Inter-Bold',
        fontSize: 16,
        color: Colors.white,
    },
    saveBtnTextOutline: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 16,
        color: Colors.textPrimary,
    },
    suggestionsContainer: {
        backgroundColor: Colors.white,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 12,
        marginTop: 4,
        marginBottom: Spacing.md,
        maxHeight: 180,
        ...Shadow.subtle,
        zIndex: 100,
    },
    suggestionItem: {
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    suggestionName: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 14,
        color: Colors.textPrimary,
    },
    suggestionMobile: {
        fontFamily: 'Inter-Regular',
        fontSize: 12,
        color: Colors.textSecondary,
    },
    suggestionLocation: {
        fontFamily: 'Inter-Regular',
        fontSize: 11,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: Spacing.xl,
    },
    modalContent: {
        backgroundColor: Colors.white,
        borderRadius: 12,
        padding: Spacing.lg,
        maxHeight: '60%',
    },
    modalTitle: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 18,
        color: Colors.textPrimary,
        marginBottom: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
        paddingBottom: 10,
    },
    modalItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    modalItemText: {
        fontFamily: 'Inter-Regular',
        fontSize: 16,
        color: Colors.textPrimary,
    },
    descriptionContainer: {
        marginBottom: 12,
    },
    descriptionInput: {
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        fontFamily: 'Inter-Medium',
        fontSize: 14,
        color: Colors.textPrimary,
        height: 60,
        textAlignVertical: 'top'
    },
});
export default CreateOrderScreen;
