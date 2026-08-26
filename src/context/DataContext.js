import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCurrentDate } from '../utils/dateUtils';
import { useAuth } from './AuthContext';
import { formatOrderNumber, formatPaymentBillId } from '../utils/orderIdFormatter';
import { URL_CUSTOMER_PORTAL_ORDERS } from '../config/env';

/* -------------------- CONTEXT -------------------- */

const DataContext = createContext({});

const PERSIST_DEBOUNCE_MS = 600;
const STORAGE_KEYS = {
    ORDERS: 'sewvee_orders',
    CUSTOMERS: 'sewvee_customers',
    PAYMENTS: 'sewvee_payments',
    DATA_SEED_VERSION: 'sewvee_data_seed_version',
};
const FORCE_SEED_VERSION = 'v1';

/* -------------------- DEFAULT OUTFITS -------------------- */

const generateId = (prefix) =>
    `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

const createOption = (name) => ({ id: generateId('opt'), name });

const createSubCat = (name, options = []) => ({
    id: generateId('sub'),
    name,
    options: options.map(o => createOption(o))
});

const createCat = (name, subCats) => ({
    id: generateId('cat'),
    name,
    isVisible: true,
    subCategories: subCats.map(sc =>
        createSubCat(sc.name, sc.options)
    )
});

export const DEFAULT_OUTFITS = [
    {
        name: 'Chudi',
        category: 'Stitching',
        basePrice: 0,
        isVisible: true,
        categories: [
            createCat('Top', [
                { name: 'Side slit top' },
                { name: 'Side slit chudi top' },
                { name: 'A-line top' },
                { name: 'Pumrod top' },
                { name: 'Umbrella top' }
            ]),
            createCat('Pant', [
                { name: 'Straight cut pant' },
                { name: 'Semi patiyala pant' },
                { name: 'Gathering pant' },
                { name: 'Normal cut pant' }
            ])
        ]
    },
    {
        name: 'Lehenga',
        category: 'Stitching',
        basePrice: 0,
        isVisible: true,
        categories: [
            createCat('Top', [
                { name: 'Dussut top', options: ['Front neck', 'Back neck', 'Sleeve', 'Hook'] },
                { name: 'Normal top', options: ['Front neck', 'Back neck', 'Sleeve', 'Hook'] }
            ]),
            createCat('Skirt', [
                { name: 'Umbrella cut', options: ['Zip', 'Hook', 'Rope'] },
                { name: 'Box pleat', options: ['Zip', 'Hook', 'Rope'] },
                { name: 'Panel cut', options: ['Zip', 'Hook', 'Rope'] },
                { name: 'Pleat one side', options: ['Zip', 'Hook', 'Rope'] }
            ])
        ]
    },
    {
        name: 'Blouse',
        category: 'Stitching',
        basePrice: 0,
        isVisible: true,
        categories: [
            createCat('Back', [
                { name: 'Boat', options: ['Scallop', 'Balls', 'Shapes'] },
                { name: 'Normal', options: ['Scallop', 'Balls', 'Shapes'] },
                { name: 'Close neck', options: ['Scallop', 'Balls', 'Shapes'] },
                { name: 'High neck', options: ['Scallop', 'Balls', 'Shapes'] },
                { name: 'Collar neck', options: ['Shirt collar', 'Chinese collar', 'High collar'] },
                { name: 'Semi boat', options: ['Scallop', 'Balls', 'Shapes'] }
            ]),
            createCat('Front', [
                { name: 'Boat', options: ['Scallop', 'Balls', 'Shapes'] },
                { name: 'Normal', options: ['Scallop', 'Balls', 'Shapes'] },
                { name: 'Close neck', options: ['Scallop', 'Balls', 'Shapes'] },
                { name: 'High neck', options: ['Scallop', 'Balls', 'Shapes'] },
                { name: 'V neck', options: ['Scallop', 'Balls', 'Shapes'] }
            ]),
            createCat('Sleeve', [
                { name: 'Elbow' },
                { name: 'Short' },
                { name: '3/4th' },
                { name: 'Full sleeve' }
            ]),
            createCat('Hook', [
                { name: 'Front' },
                { name: 'Back' },
                { name: 'Zip' }
            ])
        ]
    }
];

/* -------------------- MOCK SEED DATA -------------------- */

const getMockSeedData = () => {
    return { MOCK_CUSTOMERS: [], MOCK_ORDERS: [], MOCK_PAYMENTS: [] };
};

/* -------------------- PROVIDER -------------------- */

export const DataProvider = ({ children }) => {
    const [customers, setCustomers] = useState([]);
    const [orders, setOrders] = useState([]);
    const [payments, setPayments] = useState([]);
    const [outfits, setOutfits] = useState([]);
    const [loading, setLoading] = useState(true);

    const { userToken, user, saveUser } = useAuth();
    const persistTimeoutRef = useRef(null);

    /* -------------------- FETCH LIVE ORDERS FROM BACKEND -------------------- */

    const fetchOrdersFromBackend = useCallback(async () => {
        try {
            const mobile = user?.mobile;
            console.log('DEBUG: fetchOrders mobile:', mobile);
            if (!mobile) return [];
            const cleanPhone = String(mobile).replace(/[^0-9]/g, '').slice(-10);
            console.log('DEBUG: fetchOrders cleanPhone:', cleanPhone);
            if (!cleanPhone || cleanPhone.length < 10) return [];

            console.log(`DEBUG: fetch URL: ${URL_CUSTOMER_PORTAL_ORDERS}?phone=${cleanPhone}&limit=100`);
            const response = await fetch(`${URL_CUSTOMER_PORTAL_ORDERS}?phone=${cleanPhone}&limit=100`);
            console.log('DEBUG: fetch status:', response.status);
            if (!response.ok) return [];
            const json = await response.json();
            console.log('DEBUG: fetch json success:', json.success, 'data length:', json.data?.length);
            if (!json.success || !Array.isArray(json.data)) return [];
            return json.data;
        } catch (err) {
            console.log('DEBUG: fetchOrdersFromBackend error:', err?.message || err);
            return [];
        }
    }, [user]);

    /* -------------------- LOAD FROM STORAGE -------------------- */

    const loadFromStorage = useCallback(async () => {
        try {
            const [ordersJson, customersJson, paymentsJson, seedVersion] = await Promise.all([
                AsyncStorage.getItem(STORAGE_KEYS.ORDERS),
                AsyncStorage.getItem(STORAGE_KEYS.CUSTOMERS),
                AsyncStorage.getItem(STORAGE_KEYS.PAYMENTS),
                AsyncStorage.getItem(STORAGE_KEYS.DATA_SEED_VERSION),
            ]);

            let loadedOrders = [];
            let loadedCustomers = [];
            let loadedPayments = [];

            if (ordersJson) {
                try { loadedOrders = JSON.parse(ordersJson); } catch {}
            }
            if (customersJson) {
                try { loadedCustomers = JSON.parse(customersJson); } catch {}
            }
            if (paymentsJson) {
                try { loadedPayments = JSON.parse(paymentsJson); } catch {}
            }

            setCustomers(Array.isArray(loadedCustomers) ? loadedCustomers : []);
            setPayments(Array.isArray(loadedPayments) ? loadedPayments : []);

            const needsReSeed = seedVersion !== FORCE_SEED_VERSION;
            if (needsReSeed) {
                await AsyncStorage.setItem(STORAGE_KEYS.DATA_SEED_VERSION, FORCE_SEED_VERSION);
            }

            // Fetch live orders from backend by phone number
            const liveOrders = await fetchOrdersFromBackend();
            if (liveOrders && liveOrders.length > 0) {
                setOrders(liveOrders);
                // Cache them locally for offline access
                await AsyncStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(liveOrders));
                
                // Update Guest Customer name from backend
                const realName = liveOrders[0].customerName;
                if (realName && realName !== 'Customer' && user?.name === 'Guest Customer') {
                    // Only update if not already updated to avoid infinite loop
                    saveUser({ ...user, name: realName });
                }
            } else {
                setOrders(Array.isArray(loadedOrders) ? loadedOrders : []);
            }
        } catch (e) {
            console.log('DataContext load error', e);
            setCustomers([]);
            setOrders([]);
            setPayments([]);
        } finally {
            setLoading(false);
        }
    }, [fetchOrdersFromBackend]);


    useEffect(() => {
        if (!userToken) {
            setCustomers([]);
            setOrders([]);
            setPayments([]);
            setLoading(false);
            return;
        }

        setCustomers([]);
        setOrders([]);
        setPayments([]);
        setLoading(true);
        loadFromStorage();
    }, [loadFromStorage, userToken]);

    /* -------------------- PERSIST TO STORAGE -------------------- */

    const persistToStorage = useCallback(async (ordList, custList, payList) => {
        try {
            await Promise.all([
                AsyncStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(ordList)),
                AsyncStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(custList)),
                AsyncStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(payList)),
            ]);
        } catch (e) {
            console.log('DataContext persist error', e);
        }
    }, []);

    useEffect(() => {
        if (!loading) {
            if (persistTimeoutRef.current) clearTimeout(persistTimeoutRef.current);
            persistTimeoutRef.current = setTimeout(() => {
                persistToStorage(orders, customers, payments);
                persistTimeoutRef.current = null;
            }, PERSIST_DEBOUNCE_MS);
            return () => {
                if (persistTimeoutRef.current) clearTimeout(persistTimeoutRef.current);
            };
        }
    }, [orders, customers, payments, loading, persistToStorage]);

    /* -------------------- CRUD: ORDERS -------------------- */

    const addOrder = useCallback(async (data) => {
        const id = data.id || generateId('ord');
        const newOrder = {
            ...data,
            id,
            billNo: formatOrderNumber(data.billNo),
            advance: data.advance ?? 0,
            balance: data.balance ?? (Number(data.total) || 0) - (Number(data.advance) || 0),
        };
        setOrders(prev => [...prev, newOrder]);
        return newOrder;
    }, []);

    const updateOrder = useCallback(async (orderId, updates) => {
        setOrders(prev =>
            prev.map(o => (o.id === orderId ? { ...o, ...updates, updatedAt: new Date().toISOString() } : o))
        );
    }, []);

    const deleteOrder = useCallback(async (orderId) => {
        setOrders(prev => prev.filter(o => o.id !== orderId));
        setPayments(prev => prev.filter(p => p.orderId !== orderId));
    }, []);

    const cancelItem = useCallback(async (orderId, itemIndex) => {
        setOrders(prev =>
            prev.map(o => {
                if (o.id !== orderId) return o;
                const items = o.outfits?.length ? [...o.outfits] : [...(o.items || [])];
                if (itemIndex >= 0 && itemIndex < items.length) {
                    items[itemIndex] = { ...items[itemIndex], status: 'Cancelled' };
                }
                return o.outfits?.length
                    ? { ...o, outfits: items, updatedAt: new Date().toISOString() }
                    : { ...o, items, updatedAt: new Date().toISOString() };
            })
        );
    }, []);

    /* -------------------- CRUD: CUSTOMERS -------------------- */

    const addCustomer = useCallback(async (data) => {
        const id = data.id || generateId('cust');
        const newCustomer = { ...data, id };
        setCustomers(prev => [...prev, newCustomer]);
        return newCustomer;
    }, []);

    const updateCustomer = useCallback(async (customerId, updates) => {
        setCustomers(prev =>
            prev.map(c => (c.id === customerId ? { ...c, ...updates } : c))
        );
    }, []);

    /* -------------------- CRUD: PAYMENTS -------------------- */

    const addPayment = useCallback(async (data) => {
        const id = data.id || generateId('pay');
        const amount = Number(data.amount) || 0;
        const formattedBillId = formatPaymentBillId(data.bill_id || data.billId || id);
        const newPayment = {
            id,
            bill_id: formattedBillId,
            billId: formattedBillId,
            orderId: data.orderId,
            customerId: data.customerId,
            amount,
            mode: data.mode || 'Cash',
            type: data.type || 'Advance',
            date: data.date || getCurrentDate(),
            time: data.time || new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        };
        setPayments(prev => [...prev, newPayment]);

        if (data.orderId && amount > 0) {
            setOrders(prev =>
                prev.map(o => {
                    if (o.id !== data.orderId) return o;
                    const newAdvance = (Number(o.advance) || 0) + amount;
                    const newBalance = Math.max(0, (Number(o.total) || 0) - newAdvance);
                    return { ...o, advance: newAdvance, balance: newBalance, updatedAt: new Date().toISOString() };
                })
            );
        }
        return newPayment;
    }, []);

    const updatePayment = useCallback(async (paymentId, updates) => {
        const payment = payments.find(p => p.id === paymentId);
        if (!payment) return;

        const oldAmount = Number(payment.amount) || 0;
        const newAmount = updates.amount !== undefined ? Number(updates.amount) : oldAmount;
        const diff = newAmount - oldAmount;

        setPayments(prev =>
            prev.map(p => (p.id === paymentId ? { ...p, ...updates } : p))
        );

        if (payment.orderId && diff !== 0) {
            setOrders(prev =>
                prev.map(o => {
                    if (o.id !== payment.orderId) return o;
                    const newAdvance = (Number(o.advance) || 0) + diff;
                    const newBalance = Math.max(0, (Number(o.total) || 0) - newAdvance);
                    return { ...o, advance: newAdvance, balance: newBalance, updatedAt: new Date().toISOString() };
                })
            );
        }
    }, [payments]);

    const deletePayment = useCallback(async (paymentId) => {
        const payment = payments.find(p => p.id === paymentId);
        if (!payment) return;

        const amount = Number(payment.amount) || 0;
        const isCancelled = payment.status === 'Cancelled';
        const orderId = payment.orderId;
        setPayments(prev => prev.filter(p => p.id !== paymentId));

        if (orderId && amount > 0 && !isCancelled) {
            setOrders(prev =>
                prev.map(o => {
                    if (o.id !== orderId) return o;
                    const newAdvance = Math.max(0, (Number(o.advance) || 0) - amount);
                    const newBalance = Math.max(0, (Number(o.total) || 0) - newAdvance);
                    return { ...o, advance: newAdvance, balance: newBalance, updatedAt: new Date().toISOString() };
                })
            );
        }
    }, [payments]);

    const cancelPayment = useCallback(async (paymentId, reason) => {
        const payment = payments.find(p => p.id === paymentId);
        if (!payment || payment.status === 'Cancelled') return;

        const amount = Number(payment.amount) || 0;
        const orderId = payment.orderId;

        setPayments(prev =>
            prev.map(p => (p.id === paymentId ? { ...p, status: 'Cancelled', cancellationReason: reason } : p))
        );

        if (orderId && amount > 0) {
            setOrders(prev =>
                prev.map(o => {
                    if (o.id !== orderId) return o;
                    const newAdvance = Math.max(0, (Number(o.advance) || 0) - amount);
                    const newBalance = Math.max(0, (Number(o.total) || 0) - newAdvance);
                    return { ...o, advance: newAdvance, balance: newBalance, updatedAt: new Date().toISOString() };
                })
            );
        }
    }, [payments]);

    /* -------------------- HELPERS -------------------- */

    const getCustomerOrders = useCallback((customerId) =>
        orders.filter(o => o.customerId === customerId), [orders]);

    const resetEnvironment = async () => {
        await AsyncStorage.multiRemove([STORAGE_KEYS.ORDERS, STORAGE_KEYS.CUSTOMERS, STORAGE_KEYS.PAYMENTS, STORAGE_KEYS.DATA_SEED_VERSION]);
        const { MOCK_CUSTOMERS, MOCK_ORDERS, MOCK_PAYMENTS } = getMockSeedData();
        setCustomers(MOCK_CUSTOMERS);
        setOrders(MOCK_ORDERS);
        setPayments(MOCK_PAYMENTS);
    };

    /* -------------------- PROVIDER -------------------- */

    return (
        <DataContext.Provider
            value={{
                customers,
                orders,
                payments,
                outfits,
                loading,
                getCustomerOrders,
                resetEnvironment,
                addOrder,
                updateOrder,
                deleteOrder,
                cancelItem,
                addCustomer,
                updateCustomer,
                addPayment,
                updatePayment,
                deletePayment,
                cancelPayment,
                refreshData: loadFromStorage,
            }}
        >
            {children}
        </DataContext.Provider>
    );
};

/* -------------------- HOOK -------------------- */

export const useData = () => {
    const ctx = useContext(DataContext);
    if (!ctx) {
        throw new Error('useData must be used within DataProvider');
    }
    return ctx;
};
