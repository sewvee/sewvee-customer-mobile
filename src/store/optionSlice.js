import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import { URL_OUTFIT_OPTION_ADD, URL_OUTFIT_OPTION_LIST, URL_OUTFIT_OPTION_DETAIL } from '../config/env';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const addOptionAction = createAsyncThunk(
    'option/addOption',
    async ({ subcategoryId, optionData }, { getState, rejectWithValue }) => {
        try {
            const authState = getState().auth;
            const user = authState.user;
            let token = user?.token || user?.data?.token || user?.accessToken || user?.data?.accessToken || user?.access_token || user?.data?.access_token || user?.jwt || user?.data?.jwt;
            if (!token) {
                token = await AsyncStorage.getItem('userToken');
            }
            const formattedToken = token ? (token.startsWith('Bearer ') ? token : `Bearer ${token}`) : '';

            const response = await axios.post(URL_OUTFIT_OPTION_ADD(subcategoryId), optionData, {
                headers: {
                    'Content-Type': 'application/json',
                    'accept': '*/*',
                    'Authorization': formattedToken,
                }
            });
            console.log("ADD OPTION - Response:", response.data);
            return response.data;
        } catch (error) {
            console.log("ADD OPTION - Error:", error.response?.data || error.message);
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const getOptionsAction = createAsyncThunk(
    'option/getOptions',
    async ({ subcategoryId, page = 1, limit = 10 } = {}, { getState, rejectWithValue }) => {
        try {
            const authState = getState().auth;
            const user = authState.user;
            let token = user?.token || user?.data?.token || user?.accessToken || user?.data?.accessToken || user?.access_token || user?.data?.access_token || user?.jwt || user?.data?.jwt;
            if (!token) {
                token = await AsyncStorage.getItem('userToken');
            }
            const formattedToken = token ? (token.startsWith('Bearer ') ? token : `Bearer ${token}`) : '';

            const baseUrl = URL_OUTFIT_OPTION_LIST(subcategoryId);
            const url = `${baseUrl}?page=${page}&limit=${limit}`;
            const response = await axios.get(url, {
                headers: {
                    'accept': '*/*',
                    'Authorization': formattedToken,
                }
            });
            console.log("GET OPTIONS - Response:", response.data);
            return { ...response.data, page };
        } catch (error) {
            console.log("GET OPTIONS - Error:", error.response?.data || error.message);
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const updateOptionAction = createAsyncThunk(
    'option/updateOption',
    async ({ id, optionData }, { getState, rejectWithValue }) => {
        try {
            const authState = getState().auth;
            const user = authState.user;
            let token = user?.token || user?.data?.token || user?.accessToken || user?.data?.accessToken || user?.access_token || user?.data?.access_token || user?.jwt || user?.data?.jwt;
            if (!token) {
                token = await AsyncStorage.getItem('userToken');
            }
            const formattedToken = token ? (token.startsWith('Bearer ') ? token : `Bearer ${token}`) : '';

            const response = await axios.put(URL_OUTFIT_OPTION_DETAIL(id), optionData, {
                headers: {
                    'Content-Type': 'application/json',
                    'accept': '*/*',
                    'Authorization': formattedToken,
                }
            });
            console.log("UPDATE OPTION - Response:", response.data);
            return response.data;
        } catch (error) {
            console.log("UPDATE OPTION - Error:", error.response?.data || error.message);
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const deleteOptionAction = createAsyncThunk(
    'option/deleteOption',
    async (id, { getState, rejectWithValue }) => {
        try {
            const authState = getState().auth;
            const user = authState.user;
            let token = user?.token || user?.data?.token || user?.accessToken || user?.data?.accessToken || user?.access_token || user?.data?.access_token || user?.jwt || user?.data?.jwt;
            if (!token) {
                token = await AsyncStorage.getItem('userToken');
            }
            const formattedToken = token ? (token.startsWith('Bearer ') ? token : `Bearer ${token}`) : '';

            const response = await axios.delete(URL_OUTFIT_OPTION_DETAIL(id), {
                headers: {
                    'accept': '*/*',
                    'Authorization': formattedToken,
                }
            });
            console.log("DELETE OPTION - Response:", response.data);
            return response.data;
        } catch (error) {
            console.log("DELETE OPTION - Error:", error.response?.data || error.message);
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

const optionSlice = createSlice({
    name: 'option',
    initialState: {
        loading: true,
        loadingMore: false,
        error: null,
        options: [],
        hasMore: true,
    },
    reducers: {
        clearOptionError: (state) => {
            state.error = null;
        },
        resetOptions: (state) => {
            state.options = [];
            state.hasMore = true;
            state.loading = true;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(addOptionAction.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(addOptionAction.fulfilled, (state) => {
                state.loading = false;
            })
            .addCase(addOptionAction.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(getOptionsAction.pending, (state, action) => {
                const page = action.meta.arg?.page ?? 1;
                if (page === 1) state.loading = true;
                else state.loadingMore = true;
                state.error = null;
            })
            .addCase(getOptionsAction.fulfilled, (state, action) => {
                state.loading = false;
                state.loadingMore = false;
                const incoming = action.payload?.data ?? [];
                const page = action.payload?.page ?? 1;
                if (page === 1) state.options = incoming;
                else state.options = [...state.options, ...incoming];
                const meta = action.payload?.meta || action.payload?.pagination;
                if (meta) {
                    const currentPage = meta.page ?? meta.currentPage ?? meta.current_page ?? 1;
                    const limit = meta.limit ?? meta.per_page ?? 10;
                    const total = meta.total ?? meta.totalCount ?? meta.total_count;
                    const totalPages = meta.totalPages ?? meta.total_pages ??
                        (total != null ? Math.ceil(total / limit) : null);
                    if (totalPages != null) {
                        state.hasMore = currentPage < totalPages;
                    } else {
                        state.hasMore = incoming.length >= limit;
                    }
                } else {
                    state.hasMore = incoming.length >= 10;
                }
            })
            .addCase(getOptionsAction.rejected, (state, action) => {
                state.loading = false;
                state.loadingMore = false;
                state.error = action.payload;
            })
            .addCase(updateOptionAction.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(updateOptionAction.fulfilled, (state) => {
                state.loading = false;
            })
            .addCase(updateOptionAction.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(deleteOptionAction.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(deleteOptionAction.fulfilled, (state) => {
                state.loading = false;
            })
            .addCase(deleteOptionAction.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });
    },
});

export const { clearOptionError, resetOptions } = optionSlice.actions;
export default optionSlice.reducer;
