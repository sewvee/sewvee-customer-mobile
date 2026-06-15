import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import { URL_SUBSCRIPTION_PLANS, URL_SUBSCRIPTION_UPGRADE, URL_SUBSCRIPTION_CURRENT, URL_SUBSCRIPTION_VERIFY_PAYMENT, URL_SUBSCRIPTION_CREATE_ORDER, URL_SUBSCRIPTION_PAYMENTS, URL_SUBSCRIPTION_INVOICE_DETAILS, URL_SUBSCRIPTION_START_TRIAL } from '../config/env';
import AsyncStorage from '@react-native-async-storage/async-storage';


const getAuthToken = async (getState) => {
    const authState = getState().auth;
    const user = authState.user;

    let token =
        user?.token ||
        user?.data?.token ||
        user?.accessToken ||
        user?.data?.accessToken ||
        user?.access_token ||
        user?.data?.access_token ||
        user?.jwt ||
        user?.data?.jwt;

    if (!token) {
        token = await AsyncStorage.getItem('userToken');
    }

    return token ? (token.startsWith('Bearer ') ? token : `Bearer ${token}`) : '';
};


export const fetchSubscriptionPlansAction = createAsyncThunk(
    'subscription/plans',
    async (_, { getState, rejectWithValue }) => {
        try {

            const token = await getAuthToken(getState);

            const response = await axios.get(URL_SUBSCRIPTION_PLANS, {
                headers: {
                    'accept': '*/*',
                    'Authorization': token,
                }
            });
            console.log(response);

            if (response.data && response.data.success === false) {
                return rejectWithValue(response.data);
            }

            console.log("fetchSubscriptionPlansAction SUCCESS:", response.data);

            return response.data;

        } catch (error) {

            console.warn(
                "fetchSubscriptionPlansAction ERROR:",
                error.response?.data || error.message
            );

            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const fetchSubscriptionUpgradeAction = createAsyncThunk(
    'subscription/upgrade',
    async (payload, { getState, rejectWithValue }) => {
        try {

            const token = await getAuthToken(getState);

            const response = await axios.post(URL_SUBSCRIPTION_UPGRADE, payload, {
                headers: {
                    'accept': '*/*',
                    'Authorization': token,
                }
            });
            console.log(response);

            if (response.data && response.data.success === false) {
                return rejectWithValue(response.data);
            }

            console.log("fetchSubscriptionUpgradeAction SUCCESS:", response.data);

            return response.data;

        } catch (error) {

            console.warn(
                "fetchSubscriptionUpgradeAction ERROR:",
                error.response?.data || error.message
            );

            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const fetchSubscriptionCurrentAction = createAsyncThunk(
    'subscription/current',
    async (_, { getState, rejectWithValue }) => {
        try {

            const token = await getAuthToken(getState);

            const response = await axios.get(URL_SUBSCRIPTION_CURRENT, {
                headers: {
                    'accept': '*/*',
                    'Authorization': token,
                }
            });
            console.log(response);

            if (response.data && response.data.success === false) {
                return rejectWithValue(response.data);
            }

            console.log("fetchSubscriptionCurrentAction SUCCESS:", response.data);

            return response.data;

        } catch (error) {

            console.warn(
                "fetchSubscriptionCurrentAction ERROR:",
                error.response?.data || error.message
            );

            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const fetchSubscriptionVerifyPaymentAction = createAsyncThunk(
    'subscription/verify-payment',
    async (payload, { getState, rejectWithValue }) => {
        try {

            const token = await getAuthToken(getState);

            const response = await axios.post(URL_SUBSCRIPTION_VERIFY_PAYMENT, payload, {
                headers: {
                    'accept': '*/*',
                    'Authorization': token,
                }
            });

            if (response.data && response.data.success === false) {
                return rejectWithValue(response.data);
            }

            console.log("fetchSubscriptionVerifyPaymentAction SUCCESS:", response.data);

            return response.data;

        } catch (error) {

            console.warn(
                "fetchSubscriptionVerifyPaymentAction ERROR:",
                error.response?.data || error.message
            );

            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const fetchSubscriptionCreateOrderAction = createAsyncThunk(
    'subscription/create-order',
    async (payload, { getState, rejectWithValue }) => {
        try {

            const token = await getAuthToken(getState);

            const response = await axios.post(URL_SUBSCRIPTION_CREATE_ORDER, payload, {
                headers: {
                    'accept': '*/*',
                    'Authorization': token,
                }
            });

            if (response.data && response.data.success === false) {
                return rejectWithValue(response.data);
            }

            console.log("fetchSubscriptionCreateOrderAction SUCCESS:", response.data);

            return response.data;

        } catch (error) {

            console.warn(
                "fetchSubscriptionCreateOrderAction ERROR:",
                error.response?.data || error.message
            );

            return rejectWithValue(error.response?.data || error.message);
        }
    }
);
export const fetchSubscriptionPaymentsAction = createAsyncThunk(
    'subscription/payments',
    async (_, { getState, rejectWithValue }) => {
        try {
            const token = await getAuthToken(getState);
            const response = await axios.get(URL_SUBSCRIPTION_PAYMENTS, {
                headers: {
                    'accept': '*/*',
                    'Authorization': token,
                }
            });

            if (response.data && response.data.success === false) {
                return rejectWithValue(response.data);
            }
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const fetchSubscriptionInvoiceDetailsAction = createAsyncThunk(
    'subscription/invoiceDetails',
    async (paymentId, { getState, rejectWithValue }) => {
        try {
            const token = await getAuthToken(getState);
            const response = await axios.get(`${URL_SUBSCRIPTION_INVOICE_DETAILS}/${paymentId}/details`, {
                headers: {
                    'accept': '*/*',
                    'Authorization': token,
                }
            });

            if (response.data && response.data.success === false) {
                return rejectWithValue(response.data);
            }
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const startTrialAction = createAsyncThunk(
    'subscription/startTrial',
    async (_, { getState, rejectWithValue }) => {
        try {
            const token = await getAuthToken(getState);
            const response = await axios.post(URL_SUBSCRIPTION_START_TRIAL, {}, {
                headers: {
                    'accept': 'application/json',
                    'Authorization': token,
                }
            });

            if (response.data && response.data.success === false) {
                return rejectWithValue(response.data);
            }
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

const subscriptionSlice = createSlice({
    name: 'subscription',

    initialState: {
        plans: [],
        loading: false,
        error: null,
    },

    reducers: {
        clearSubscriptionError: (state) => {
            state.error = null;
        }
    },

    extraReducers: (builder) => {

        builder

            .addCase(fetchSubscriptionPlansAction.pending, (state) => {
                state.loading = true;
                state.error = null;
            })

            .addCase(fetchSubscriptionPlansAction.fulfilled, (state, action) => {

                state.loading = false;

                const payload = action.payload;

                let parsedPlans = [];

                if (Array.isArray(payload)) {
                    parsedPlans = payload;
                }
                else if (payload?.data && Array.isArray(payload.data)) {
                    parsedPlans = payload.data;
                }
                else if (payload?.plans && Array.isArray(payload.plans)) {
                    parsedPlans = payload.plans;
                }

                state.plans = parsedPlans;
            })

            .addCase(fetchSubscriptionPlansAction.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

    },
});

export const { clearSubscriptionError } = subscriptionSlice.actions;

export default subscriptionSlice.reducer;