import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDispatch } from 'react-redux';
import { clearAuth, saveFcmTokenAction } from '../store/authSlice';
import { DEFAULT_ROLE_PERMISSIONS } from '../constants/permissions';
import { clearProfile } from '../store/profileSlice';
import { resetDashboardInsights } from '../store/dashboardSlice';
import { resetPayments } from '../store/paymentSlice';
import { resetSalesOrderState } from '../store/salesOrderSlice';
import { resetCustomersState } from '../store/customerSlice';

const AuthContext = createContext(null);

const STORAGE_KEYS = {
    TOKEN: 'userToken',
    COMPANY: 'sewvee_company',
    ONBOARDED: 'isOnboarded',
    ORDERS: 'sewvee_orders',
    CUSTOMERS: 'sewvee_customers',
    PAYMENTS: 'sewvee_payments',
    DATA_SEED_VERSION: 'sewvee_data_seed_version',
    ORDER_DRAFT: '@create_order_draft',
};

/* -------------------- MOCK / DEMO DATA -------------------- */

const DEMO_USER = {
    id: 'user_demo_1',
    name: 'Boutique Owner',
    mobile: '9876543210',
    email: 'owner@myboutique.com',
    role: 'Owner',
    roleId: 'role_owner',
    lastLogin: new Date().toISOString(),
};

const DEMO_COMPANY = {
    id: 'company_demo_1',
    name: 'My Boutique',
    address: '',
    phone: '',
    email: '',
    gstin: '',
};

/* -------------------- PERMISSION HELPER -------------------- */

const hasPermissionForRole = (roleName, module, action) => {
    const normalizedRole = roleName === 'Support Staff' ? 'Receptionist' : roleName;
    const perms = DEFAULT_ROLE_PERMISSIONS[normalizedRole];
    if (!perms) return false;
    const modulePerms = perms[module];
    if (!modulePerms) return false;
    return modulePerms[action] === true;
};

export const AuthProvider = ({ children }) => {
    const [userToken, setUserToken] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isOnboarded, setIsOnboarded] = useState(false);
    const [user, setUser] = useState(DEMO_USER);
    const [company, setCompany] = useState(DEMO_COMPANY);

    useEffect(() => {
        loadStoredData();
    }, []);

    const loadStoredData = async () => {
        try {
            const [token, companyJson, onboarded, userJson] = await Promise.all([
                AsyncStorage.getItem(STORAGE_KEYS.TOKEN),
                AsyncStorage.getItem(STORAGE_KEYS.COMPANY),
                AsyncStorage.getItem(STORAGE_KEYS.ONBOARDED),
                AsyncStorage.getItem('sewvee_user_profile'),
            ]);
            setUserToken(token);
            setIsOnboarded(onboarded === 'true');
            if (userJson) {
                try {
                    setUser(JSON.parse(userJson));
                } catch (_) {
                    setUser(DEMO_USER);
                }
            }
            if (companyJson) {
                try {
                    setCompany(JSON.parse(companyJson));
                } catch (_) {
                    // Keep demo company
                }
            }
        } catch (e) {
            console.log('Auth load error', e);
        }
        setLoading(false);
    };

    const login = async (token, onboarded = true) => {
        const tokenToSave = token || 'demo';
        await Promise.all([
            AsyncStorage.setItem(STORAGE_KEYS.TOKEN, tokenToSave),
            AsyncStorage.setItem(STORAGE_KEYS.ONBOARDED, String(onboarded))
        ]);
        
        try {
            const fcmToken = await AsyncStorage.getItem('fcmToken');
            if (fcmToken) {
                console.log('Sending FCM Token to backend on login:', fcmToken);
                dispatch(saveFcmTokenAction({ fcm_token: fcmToken })).catch(e => console.error('FCM Token dispatch error', e));
            }
        } catch (fcmError) {
            console.error('Error registering FCM token during login:', fcmError);
        }

        setUserToken(tokenToSave);
        setIsOnboarded(onboarded);
    };

    const dispatch = useDispatch();

    const logout = async () => {
        try {
            // Unregister FCM token on backend before clearing local token/storage
            try {
                await dispatch(saveFcmTokenAction({ fcm_token: null }));
            } catch (fcmError) {
                console.error('Error unregistering FCM token during logout:', fcmError);
            }

            await AsyncStorage.multiRemove([
                STORAGE_KEYS.TOKEN,
                STORAGE_KEYS.COMPANY,
                STORAGE_KEYS.ONBOARDED,
                STORAGE_KEYS.ORDER_DRAFT,
                'sewvee_user_profile',
            ]);
            
            // SuccessModal already takes care of navigation by updating token to null
            setUserToken(null);
            setIsOnboarded(false);
            setCompany(DEMO_COMPANY);
            setUser(DEMO_USER);
            
            // Clear Redux Auth State
            dispatch(clearAuth());
            dispatch(clearProfile());
            dispatch(resetDashboardInsights());
            dispatch(resetPayments());
            dispatch(resetCustomersState());
            dispatch(resetSalesOrderState());
        } catch (e) {
            console.error('Logout error', e);
        }
    };

    const updateIsOnboarded = useCallback(async (value) => {
        setIsOnboarded(value);
        await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDED, String(value));
    }, []);

    const saveCompany = useCallback(async (updatedCompany) => {
        setCompany(updatedCompany);
        await AsyncStorage.setItem(STORAGE_KEYS.COMPANY, JSON.stringify(updatedCompany));
    }, []);

    const saveUser = useCallback(async (updatedUser) => {
        setUser(updatedUser);
        if (updatedUser) {
            await AsyncStorage.setItem('sewvee_user_profile', JSON.stringify(updatedUser));
        } else {
            await AsyncStorage.removeItem('sewvee_user_profile');
        }
    }, []);

    const hasPermission = useCallback((module, action) => {
        if (!user) return false;
        return hasPermissionForRole(user.role, module, action);
    }, [user]);

    const getViewScope = useCallback((module) => {
        if (!user) return 'self';
        const normalizedRole = user.role === 'Support Staff' ? 'Receptionist' : user.role;
        const perms = DEFAULT_ROLE_PERMISSIONS[normalizedRole];
        if (!perms) return 'self';
        const modulePerms = perms[module];
        return modulePerms?.viewScope || 'all';
    }, [user]);

    const hasViewAll = useCallback((module) => {
        return getViewScope(module) === 'all';
    }, [getViewScope]);

    const isOwnerOrAdmin = useCallback(() => {
        if (!user) return false;
        return user.role === 'Owner' || user.role === 'Admin';
    }, [user]);

    return (
        <AuthContext.Provider
            value={{
                userToken,
                user,
                company,
                isOnboarded,
                login,
                logout,
                loading,
                saveCompany,
                saveUser,
                hasPermission,
                getViewScope,
                hasViewAll,
                isOwnerOrAdmin,
                setIsOnboarded: updateIsOnboarded,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) {
        throw new Error('useAuth must be inside AuthProvider');
    }
    return ctx;
};
