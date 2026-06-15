import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import { URL_CUSTOMERS } from '../config/env';
import AsyncStorage from '@react-native-async-storage/async-storage';

const getAuthToken = async (getState) => {
    const authState = getState().auth;
    const user = authState.user;
    let token = user?.token || user?.data?.token || user?.accessToken || user?.data?.accessToken || user?.access_token || user?.data?.access_token || user?.jwt || user?.data?.jwt;
    if (!token) {
        token = await AsyncStorage.getItem('userToken');
    }
    return token ? (token.startsWith('Bearer ') ? token : `Bearer ${token}`) : '';
};

export const fetchCustomersAction = createAsyncThunk(
    'customers/fetchAll',
    async (params = {}, { getState, rejectWithValue }) => {
        try {
            const token = await getAuthToken(getState);
            const response = await axios.get(URL_CUSTOMERS, {
                headers: {
                    'accept': '*/*',
                    'Authorization': token,
                },
                params: {
                    search: params.search || '',
                    sortBy: params.sortBy || 'newest',
                    page: params.page || 1,
                    limit: params.limit || 10,
                    month: params.month,
                    year: params.year
                }
            });
            if (response.data && response.data.success === false) {
                return rejectWithValue(response.data);
            }
            console.log('fetchCustomersAction SUCCESS:', response.data);
            return {
                ...response.data,
                page: params.page || 1
            };
        } catch (error) {
            // console.warn('fetchCustomersAction ERROR:', error.response?.data || error.message);
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const fetchCustomerByIdAction = createAsyncThunk(
    'customers/fetchById',
    async (id, { getState, rejectWithValue }) => {
        try {
            const token = await getAuthToken(getState);
            const response = await axios.get(`${URL_CUSTOMERS}/${id}`, {
                headers: {
                    'accept': '*/*',
                    'Authorization': token,
                }
            });
            if (response.data && response.data.success === false) {
                return rejectWithValue(response.data);
            }
            console.log('fetchCustomerByIdAction SUCCESS:', response.data);
            return response.data;
        } catch (error) {
            console.warn('fetchCustomerByIdAction ERROR:', error.response?.data || error.message);
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const createCustomerAction = createAsyncThunk(
    'customers/create',
    async (customerData, { getState, rejectWithValue }) => {
        try {
            const token = await getAuthToken(getState);
            const response = await axios.post(URL_CUSTOMERS, customerData, {
                headers: {
                    'Content-Type': 'application/json',
                    'accept': '*/*',
                    'Authorization': token,
                }
            });
            if (response.data && response.data.success === false) {
                return rejectWithValue(response.data);
            }
            console.log('createCustomerAction SUCCESS:', response.data);
            return response.data;
        } catch (error) {
            console.warn('createCustomerAction ERROR:', error.response?.data || error.message);
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const updateCustomerAction = createAsyncThunk(
    'customers/update',
    async ({ id, payload }, { getState, rejectWithValue }) => {
        try {
            const token = await getAuthToken(getState);
            const response = await axios.patch(`${URL_CUSTOMERS}/${id}`, payload, {
                headers: {
                    'Content-Type': 'application/json',
                    'accept': '*/*',
                    'Authorization': token,
                }
            });
            if (response.data && response.data.success === false) {
                return rejectWithValue(response.data);
            }
            console.log('updateCustomerAction SUCCESS:', response.data);
            return response.data;
        } catch (error) {
            console.warn('updateCustomerAction ERROR:', error.response?.data || error.message);
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const deleteCustomerAction = createAsyncThunk(
    'customers/delete',
    async (id, { getState, rejectWithValue }) => {
        try {
            const token = await getAuthToken(getState);
            const response = await axios.delete(`${URL_CUSTOMERS}/${id}`, {
                headers: {
                    'accept': '*/*',
                    'Authorization': token,
                }
            });
            if (response.data && response.data.success === false) {
                return rejectWithValue(response.data);
            }
            console.log('deleteCustomerAction SUCCESS:', response.data);
            return { id, data: response.data };
        } catch (error) {
            console.warn('deleteCustomerAction ERROR:', error.response?.data || error.message);
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

const initialState = {
    customers: [],
    currentCustomer: null,
    loading: false,
    loadingMore: false,
    error: null,
    totalItems: 0,
    totalCustomers: 0,
    thisMonthCustomers: 0,
    totalPages: 1,
    currentPage: 1,
};

const customerSlice = createSlice({
    name: 'customers',
    initialState,
    reducers: {
        clearCustomerError: (state) => {
            state.error = null;
        },
        resetCustomersState: (state) => {
            Object.assign(state, initialState);
        },
    },
    extraReducers: (builder) => {
        builder
            // Fetch All
            .addCase(fetchCustomersAction.pending, (state, action) => {
                const isFirstPage = !action.meta.arg || action.meta.arg.page === 1;
                if (isFirstPage) {
                    state.loading = true;
                } else {
                    state.loadingMore = true;
                }
                state.error = null;
            })
            .addCase(fetchCustomersAction.fulfilled, (state, action) => {
                state.loading = false;
                state.loadingMore = false;
                
                const payload = action.payload;
                const pagination = payload.pagination || payload.data?.pagination || {};
                const summary = payload.summary || payload.data?.summary || {};
                
                // Use page from payload if available, else from action meta
                const pageNum = Number(pagination.page || payload.page || action.meta.arg?.page || 1);
                
                // Data can be in payload.data or payload.data.data depending on wrapper
                let parsedList = Array.isArray(payload.data) ? payload.data : (Array.isArray(payload.data?.data) ? payload.data.data : []);

                if (pageNum === 1) {
                    state.customers = parsedList;
                } else {
                    const existingIds = new Set(state.customers.map(c => (c.id || c._id)?.toString()));
                    const newUniqueItems = parsedList.filter(c => !existingIds.has((c.id || c._id)?.toString()));
                    state.customers = [...state.customers, ...newUniqueItems];
                }

                // Pagination state from the confirmed structure
                state.totalItems = Number(pagination.total || summary.totalCount || 0);
                state.totalPages = Number(pagination.totalPages || 1);
                state.currentPage = pageNum;

                // Overall counts from the confirmed summary object
                state.totalCustomers = summary.totalCount || pagination.total || 0;
                state.thisMonthCustomers = summary.thisMonthCount || 0;
            })
            .addCase(fetchCustomersAction.rejected, (state, action) => {
                state.loading = false;
                state.loadingMore = false;
                state.error = action.payload;
            })

            // Fetch One
            .addCase(fetchCustomerByIdAction.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchCustomerByIdAction.fulfilled, (state, action) => {
                state.loading = false;
                state.currentCustomer = action.payload?.data || action.payload;
            })
            .addCase(fetchCustomerByIdAction.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            // Create
            .addCase(createCustomerAction.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(createCustomerAction.fulfilled, (state, action) => {
                state.loading = false;
                const newCustomer = action.payload?.data || action.payload?.customer || action.payload;
                if (newCustomer && typeof newCustomer === 'object' && !Array.isArray(newCustomer)) {
                    state.customers.push(newCustomer);
                }
            })
            .addCase(createCustomerAction.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            // Update
            .addCase(updateCustomerAction.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(updateCustomerAction.fulfilled, (state, action) => {
                state.loading = false;
                const updatedCustomer = action.payload?.data || action.payload;
                if (updatedCustomer) {
                    const idToMatch = updatedCustomer.id || updatedCustomer._id;
                    const index = state.customers.findIndex(c => (c.id || c._id) === idToMatch);
                    if (index !== -1) {
                        state.customers[index] = updatedCustomer;
                    }
                    if ((state.currentCustomer?.id || state.currentCustomer?._id) === idToMatch) {
                        state.currentCustomer = updatedCustomer;
                    }
                }
            })
            .addCase(updateCustomerAction.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            // Delete
            .addCase(deleteCustomerAction.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(deleteCustomerAction.fulfilled, (state, action) => {
                state.loading = false;
                const idToRemove = action.payload.id;
                state.customers = state.customers.filter(c => (c.id || c._id) !== idToRemove);
                if ((state.currentCustomer?.id || state.currentCustomer?._id) === idToRemove) {
                    state.currentCustomer = null;
                }
            })
            .addCase(deleteCustomerAction.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });
    },
});

export const { clearCustomerError, resetCustomersState } = customerSlice.actions;
export default customerSlice.reducer;
