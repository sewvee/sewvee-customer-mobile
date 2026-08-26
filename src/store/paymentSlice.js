import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import { URL_PAYMENTS, URL_PAYMENT_DETAIL, URL_ORDER_PAYMENT, URL_ORDER_PAYMENTS } from '../config/env';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { formatPaymentBillId } from '../utils/orderIdFormatter';

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

const API_BASE_URL = (URL_PAYMENTS || '')
    .replace(/\/mobile\/payments\/?$/i, '')
    .replace(/\/+$/, '');

const toNumber = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
};

const formatLabel = (value) => {
    if (value === null || value === undefined || value === '') {
        return '';
    }

    const rawValue = String(value).trim();
    const upperValue = rawValue.toUpperCase();

    if (upperValue === 'UPI' || upperValue === 'BANK' || upperValue === 'CARD' || upperValue === 'CASH') {
        return upperValue;
    }

    return rawValue
        .replace(/_/g, ' ')
        .toLowerCase()
        .replace(/\b\w/g, char => char.toUpperCase());
};

const resolveFileUrl = (value) => {
    if (!value) {
        return null;
    }

    const rawValue = String(value).trim();
    if (!rawValue) {
        return null;
    }

    if (/^(https?:|file:|content:|data:)/i.test(rawValue)) {
        if (rawValue.includes('localhost:')) {
            const { API_DOMAIN } = require('../config/env');
            return rawValue.replace(/http:\/\/localhost:\d+/, API_DOMAIN);
        }
        return rawValue;
    }

    if (!API_BASE_URL) {
        return rawValue;
    }

    if (rawValue.startsWith('/')) {
        return `${API_BASE_URL}${rawValue}`;
    }

    return `${API_BASE_URL}/${rawValue.replace(/^\/+/, '')}`;
};

const normalizeOrderPayment = (payment) => {
    const billId = payment?.bill_id || payment?.billId || '';
    const formattedBillId = formatPaymentBillId(billId);
    return {
        ...payment,
        id: `${payment?.id ?? payment?.payment_id ?? ''}`,
        payment_id: payment?.payment_id ?? payment?.id ?? '',
        bill_id: formattedBillId,
        billId: formattedBillId,
        order_id: payment?.order_id ?? payment?.orderId ?? '',
        orderId: payment?.order_id ?? payment?.orderId ?? '',
        amount: toNumber(payment?.amount),
        payment_mode: formatLabel(payment?.payment_mode || payment?.mode) || 'CASH',
        mode: formatLabel(payment?.payment_mode || payment?.mode) || 'CASH',
        transaction_id: payment?.transaction_id || payment?.transactionId || '',
        transactionId: payment?.transaction_id || payment?.transactionId || '',
        payment_status: formatLabel(payment?.payment_status || payment?.status) || 'SUCCESS',
        status: formatLabel(payment?.payment_status || payment?.status) || 'SUCCESS',
        balance_amount: toNumber(payment?.balance_amount ?? payment?.balance),
        balance: toNumber(payment?.balance_amount ?? payment?.balance),
        created_at: payment?.created_at || payment?.payment_date || payment?.date || payment?.updated_at || '',
        date: payment?.created_at || payment?.payment_date || payment?.date || payment?.updated_at || '',
        invoice_url: resolveFileUrl(payment?.invoice_url || payment?.invoiceUrl),
        invoiceUrl: resolveFileUrl(payment?.invoice_url || payment?.invoiceUrl),
    };
};

// GET /mobile/payments
// Params: limit, page, status (ALL | PAID | PENDING), date_to (YYYY-MM-DD), date_from (YYYY-MM-DD)
export const fetchPaymentsAction = createAsyncThunk(
    'payments/fetchPayments',
    async (params = {}, { getState, rejectWithValue }) => {
        try {
            const token = await getAuthToken(getState);

            const { limit = 20, page = 1, status, date_from, date_to, search } = params;

            const queryParams = { limit, page };
            if (status && status !== 'ALL') queryParams.status = status;
            if (date_from) queryParams.date_from = date_from;
            if (date_to) queryParams.date_to = date_to;
            if (search) queryParams.search = search;

            const response = await axios.get(URL_PAYMENTS, {
                headers: {
                    accept: '*/*',
                    Authorization: token,
                },
                params: queryParams,
            });

            if (response.data && response.data.success === false) {
                return rejectWithValue(response.data);
            }

            console.log('fetchPaymentsAction SUCCESS:', response.data);
            return response.data;
        } catch (error) {
            console.warn('fetchPaymentsAction ERROR:', error.response?.data || error.message);
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

// GET /mobile/payments/{id}
export const fetchPaymentDetailAction = createAsyncThunk(
    'payments/fetchPaymentDetail',
    async (paymentId, { getState, rejectWithValue }) => {
        try {
            const token = await getAuthToken(getState);
            const response = await axios.get(URL_PAYMENT_DETAIL(paymentId), {
                headers: {
                    accept: '*/*',
                    Authorization: token,
                },
            });

            if (response.data && response.data.success === false) {
                return rejectWithValue(response.data);
            }

            console.log('fetchPaymentDetailAction SUCCESS:', response.data);
            return response.data;
        } catch (error) {
            console.warn('fetchPaymentDetailAction ERROR:', error.response?.data || error.message);
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const createOrderPaymentAction = createAsyncThunk(
    'payments/createOrderPayment',
    async (payload, { getState, rejectWithValue }) => {
        try {
            const token = await getAuthToken(getState);
            const response = await axios.post(URL_ORDER_PAYMENT, payload, {
                headers: {
                    'Content-Type': 'application/json',
                    accept: '*/*',
                    Authorization: token,
                },
            });

            if (response.data && response.data.success === false) {
                return rejectWithValue(response.data);
            }

            console.log('createOrderPaymentAction SUCCESS:', response.data);
            return response.data;
        } catch (error) {
            console.warn('createOrderPaymentAction ERROR:', error.response?.data || error.message);
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const getOrderPaymentsAction = createAsyncThunk(
    'payments/getOrderPayments',
    async (orderId, { getState, rejectWithValue }) => {
        try {
            const token = await getAuthToken(getState);
            const response = await axios.get(URL_ORDER_PAYMENTS(orderId), {
                headers: {
                    accept: '*/*',
                    Authorization: token,
                },
            });

            if (response.data && response.data.success === false) {
                return rejectWithValue(response.data);
            }

            console.log('getOrderPaymentsAction SUCCESS:', response.data);
            return {
                orderId,
                data: Array.isArray(response.data?.data) ? response.data.data.map(normalizeOrderPayment) : [],
                message: response.data?.message || '',
            };
        } catch (error) {
            console.warn('getOrderPaymentsAction ERROR:', error.response?.data || error.message);
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

const paymentSlice = createSlice({
    name: 'payments',

    initialState: {
        // Summary totals from API
        summary: {
            total_amount: 0,
            collected_amount: 0,
            balance_amount: 0,
        },
        // Flat payment list
        list: [],
        // Pagination info
        pagination: {
            total: 0,
            page: 1,
            limit: 20,
        },
        selectedPayment: null, // For single payment detail view
        orderPaymentHistoryList: [],
        orderPaymentHistoryOrderId: null,
        orderPaymentHistoryLoading: false,
        orderPaymentHistoryError: null,
        loading: false,
        createOrderPaymentLoading: false,
        createOrderPaymentError: null,
        error: null,
    },

    reducers: {
        clearPaymentsError: (state) => {
            state.error = null;
        },
        resetPayments: (state) => {
            state.list = [];
            state.summary = { total_amount: 0, collected_amount: 0, balance_amount: 0 };
            state.pagination = { total: 0, page: 1, limit: 20 };
            state.orderPaymentHistoryList = [];
            state.orderPaymentHistoryOrderId = null;
            state.orderPaymentHistoryError = null;
        },
    },

    extraReducers: (builder) => {
        builder
            .addCase(fetchPaymentsAction.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchPaymentsAction.fulfilled, (state, action) => {
                state.loading = false;
                const payload = action.payload;

                // Response shape: { success, data: { summary, data: [], pagination }, message }
                if (payload?.data) {
                    state.summary = payload.data.summary || state.summary;
                    state.list = Array.isArray(payload.data.data) ? payload.data.data.map(normalizeOrderPayment) : [];
                    state.pagination = payload.data.pagination || state.pagination;
                }
            })
            .addCase(fetchPaymentsAction.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            // Payment Detail
            .addCase(fetchPaymentDetailAction.pending, (state) => {
                state.loading = true;
                state.selectedPayment = null;
                state.error = null;
            })
            .addCase(fetchPaymentDetailAction.fulfilled, (state, action) => {
                state.loading = false;
                state.selectedPayment = action.payload?.data ? normalizeOrderPayment(action.payload.data) : null;
            })
            .addCase(fetchPaymentDetailAction.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(createOrderPaymentAction.pending, (state) => {
                state.createOrderPaymentLoading = true;
                state.createOrderPaymentError = null;
            })
            .addCase(createOrderPaymentAction.fulfilled, (state) => {
                state.createOrderPaymentLoading = false;
            })
            .addCase(createOrderPaymentAction.rejected, (state, action) => {
                state.createOrderPaymentLoading = false;
                state.createOrderPaymentError = action.payload;
            })
            .addCase(getOrderPaymentsAction.pending, (state, action) => {
                state.orderPaymentHistoryLoading = true;
                state.orderPaymentHistoryError = null;
                state.orderPaymentHistoryOrderId = action.meta.arg != null ? String(action.meta.arg) : null;
            })
            .addCase(getOrderPaymentsAction.fulfilled, (state, action) => {
                state.orderPaymentHistoryLoading = false;
                state.orderPaymentHistoryError = null;
                state.orderPaymentHistoryOrderId = action.payload?.orderId != null ? String(action.payload.orderId) : null;
                state.orderPaymentHistoryList = Array.isArray(action.payload?.data) ? action.payload.data : [];
            })
            .addCase(getOrderPaymentsAction.rejected, (state, action) => {
                state.orderPaymentHistoryLoading = false;
                state.orderPaymentHistoryError = action.payload;
            });
    },
});

export const { clearPaymentsError, resetPayments } = paymentSlice.actions;
export default paymentSlice.reducer;
