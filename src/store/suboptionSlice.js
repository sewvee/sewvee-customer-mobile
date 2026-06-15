import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import { URL_OUTFIT_SUBOPTION_ADD, URL_OUTFIT_SUBOPTION_LIST, URL_OUTFIT_SUBOPTION_DETAIL } from '../config/env';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const addSuboptionAction = createAsyncThunk(
    'suboption/addSuboption',
    async ({ optionId, suboptionData }, { getState, rejectWithValue }) => {
        try {
            const authState = getState().auth;
            const user = authState.user;
            let token = user?.token || user?.data?.token || user?.accessToken || user?.data?.accessToken || user?.access_token || user?.data?.access_token || user?.jwt || user?.data?.jwt;
            if (!token) {
                token = await AsyncStorage.getItem('userToken');
            }
            const formattedToken = token ? (token.startsWith('Bearer ') ? token : `Bearer ${token}`) : '';

            const response = await axios.post(URL_OUTFIT_SUBOPTION_ADD(optionId), suboptionData, {
                headers: {
                    'Content-Type': 'application/json',
                    'accept': '*/*',
                    'Authorization': formattedToken,
                }
            });
            console.log("ADD SUBOPTION - Response:", response.data);
            return response.data;
        } catch (error) {
            console.log("ADD SUBOPTION - Error:", error.response?.data || error.message);
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const getSuboptionsAction = createAsyncThunk(
    'suboption/getSuboptions',
    async ({ optionId, page = 1, limit = 10 } = {}, { getState, rejectWithValue }) => {
        try {
            const authState = getState().auth;
            const user = authState.user;
            let token = user?.token || user?.data?.token || user?.accessToken || user?.data?.accessToken || user?.access_token || user?.data?.access_token || user?.jwt || user?.data?.jwt;
            if (!token) {
                token = await AsyncStorage.getItem('userToken');
            }
            const formattedToken = token ? (token.startsWith('Bearer ') ? token : `Bearer ${token}`) : '';

            const baseUrl = URL_OUTFIT_SUBOPTION_LIST(optionId);
            const url = `${baseUrl}?page=${page}&limit=${limit}`;
            const response = await axios.get(url, {
                headers: {
                    'accept': '*/*',
                    'Authorization': formattedToken,
                }
            });
            console.log("GET SUBOPTIONS - Response:", response.data);
            return { ...response.data, page };
        } catch (error) {
            console.log("GET SUBOPTIONS - Error:", error.response?.data || error.message);
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const updateSuboptionAction = createAsyncThunk(
    'suboption/updateSuboption',
    async ({ id, suboptionData }, { getState, rejectWithValue }) => {
        try {
            const authState = getState().auth;
            const user = authState.user;
            let token = user?.token || user?.data?.token || user?.accessToken || user?.data?.accessToken || user?.access_token || user?.data?.access_token || user?.jwt || user?.data?.jwt;
            if (!token) {
                token = await AsyncStorage.getItem('userToken');
            }
            const formattedToken = token ? (token.startsWith('Bearer ') ? token : `Bearer ${token}`) : '';

            const response = await axios.put(URL_OUTFIT_SUBOPTION_DETAIL(id), suboptionData, {
                headers: {
                    'Content-Type': 'application/json',
                    'accept': '*/*',
                    'Authorization': formattedToken,
                }
            });
            console.log("UPDATE SUBOPTION - Response:", response.data);
            return response.data;
        } catch (error) {
            console.log("UPDATE SUBOPTION - Error:", error.response?.data || error.message);
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const deleteSuboptionAction = createAsyncThunk(
    'suboption/deleteSuboption',
    async (id, { getState, rejectWithValue }) => {
        try {
            const authState = getState().auth;
            const user = authState.user;
            let token = user?.token || user?.data?.token || user?.accessToken || user?.data?.accessToken || user?.access_token || user?.data?.access_token || user?.jwt || user?.data?.jwt;
            if (!token) {
                token = await AsyncStorage.getItem('userToken');
            }
            const formattedToken = token ? (token.startsWith('Bearer ') ? token : `Bearer ${token}`) : '';

            const response = await axios.delete(URL_OUTFIT_SUBOPTION_DETAIL(id), {
                headers: {
                    'accept': '*/*',
                    'Authorization': formattedToken,
                }
            });
            console.log("DELETE SUBOPTION - Response:", response.data);
            return response.data;
        } catch (error) {
            console.log("DELETE SUBOPTION - Error:", error.response?.data || error.message);
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

const suboptionSlice = createSlice({
    name: 'suboption',
    initialState: {
        loading: true,
        loadingMore: false,
        error: null,
        suboptions: [],
        hasMore: true,
    },
    reducers: {
        clearSuboptionError: (state) => {
            state.error = null;
        },
        resetSuboptions: (state) => {
            state.suboptions = [];
            state.hasMore = true;
            state.loading = true;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(addSuboptionAction.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(addSuboptionAction.fulfilled, (state) => {
                state.loading = false;
            })
            .addCase(addSuboptionAction.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(getSuboptionsAction.pending, (state, action) => {
                const page = action.meta.arg?.page ?? 1;
                if (page === 1) state.loading = true;
                else state.loadingMore = true;
                state.error = null;
            })
            .addCase(getSuboptionsAction.fulfilled, (state, action) => {
                state.loading = false;
                state.loadingMore = false;
                const incoming = action.payload?.data ?? [];
                const page = action.payload?.page ?? 1;
                if (page === 1) state.suboptions = incoming;
                else state.suboptions = [...state.suboptions, ...incoming];
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
            .addCase(getSuboptionsAction.rejected, (state, action) => {
                state.loading = false;
                state.loadingMore = false;
                state.error = action.payload;
            })
            .addCase(updateSuboptionAction.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(updateSuboptionAction.fulfilled, (state) => {
                state.loading = false;
            })
            .addCase(updateSuboptionAction.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(deleteSuboptionAction.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(deleteSuboptionAction.fulfilled, (state) => {
                state.loading = false;
            })
            .addCase(deleteSuboptionAction.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });
    },
});

export const { clearSuboptionError, resetSuboptions } = suboptionSlice.actions;
export default suboptionSlice.reducer;
