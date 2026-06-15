import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import { URL_OUTFIT_SUBCATEGORY, URL_OUTFIT_SUBCATEGORY_LIST, URL_OUTFIT_SUBCATEGORY_DETAIL } from '../config/env';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const addSubcategoryAction = createAsyncThunk(
    'subcategory/addSubcategory',
    async (subcategoryData, { getState, rejectWithValue }) => {
        try {
            const authState = getState().auth;
            const user = authState.user;
            let token = user?.token || user?.data?.token || user?.accessToken || user?.data?.accessToken || user?.access_token || user?.data?.access_token || user?.jwt || user?.data?.jwt;
            if (!token) {
                token = await AsyncStorage.getItem('userToken');
            }
            const formattedToken = token ? (token.startsWith('Bearer ') ? token : `Bearer ${token}`) : '';

            const response = await axios.post(URL_OUTFIT_SUBCATEGORY, subcategoryData, {
                headers: {
                    'Content-Type': 'application/json',
                    'accept': '*/*',
                    'Authorization': formattedToken,
                }
            });
            console.log("ADD SUBCATEGORY - Response:", response.data);
            return response.data;
        } catch (error) {
            console.log("ADD SUBCATEGORY - Error:", error.response?.data || error.message);
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const getSubcategoriesAction = createAsyncThunk(
    'subcategory/getSubcategories',
    async ({ categoryId, page = 1, limit = 10 } = {}, { getState, rejectWithValue }) => {
        try {
            const authState = getState().auth;
            const user = authState.user;
            let token = user?.token || user?.data?.token || user?.accessToken || user?.data?.accessToken || user?.access_token || user?.data?.access_token || user?.jwt || user?.data?.jwt;
            if (!token) {
                token = await AsyncStorage.getItem('userToken');
            }
            const formattedToken = token ? (token.startsWith('Bearer ') ? token : `Bearer ${token}`) : '';

            const baseUrl = categoryId ? URL_OUTFIT_SUBCATEGORY_LIST(categoryId) : URL_OUTFIT_SUBCATEGORY;
            const url = `${baseUrl}?page=${page}&limit=${limit}`;
            const response = await axios.get(url, {
                headers: {
                    'accept': '*/*',
                    'Authorization': formattedToken,
                }
            });
            console.log("GET SUBCATEGORIES - Response:", response.data);
            return { ...response.data, page };
        } catch (error) {
            console.log("GET SUBCATEGORIES - Error:", error.response?.data || error.message);
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const updateSubcategoryAction = createAsyncThunk(
    'subcategory/updateSubcategory',
    async ({ id, subcategoryData }, { getState, rejectWithValue }) => {
        try {
            const authState = getState().auth;
            const user = authState.user;
            let token = user?.token || user?.data?.token || user?.accessToken || user?.data?.accessToken || user?.access_token || user?.data?.access_token || user?.jwt || user?.data?.jwt;
            if (!token) {
                token = await AsyncStorage.getItem('userToken');
            }
            const formattedToken = token ? (token.startsWith('Bearer ') ? token : `Bearer ${token}`) : '';

            const response = await axios.put(URL_OUTFIT_SUBCATEGORY_DETAIL(id), subcategoryData, {
                headers: {
                    'Content-Type': 'application/json',
                    'accept': '*/*',
                    'Authorization': formattedToken,
                }
            });
            console.log("UPDATE SUBCATEGORY - Response:", response.data);
            return response.data;
        } catch (error) {
            console.log("UPDATE SUBCATEGORY - Error:", error.response?.data || error.message);
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const deleteSubcategoryAction = createAsyncThunk(
    'subcategory/deleteSubcategory',
    async (id, { getState, rejectWithValue }) => {
        try {
            const authState = getState().auth;
            const user = authState.user;
            let token = user?.token || user?.data?.token || user?.accessToken || user?.data?.accessToken || user?.access_token || user?.data?.access_token || user?.jwt || user?.data?.jwt;
            if (!token) {
                token = await AsyncStorage.getItem('userToken');
            }
            const formattedToken = token ? (token.startsWith('Bearer ') ? token : `Bearer ${token}`) : '';

            const response = await axios.delete(URL_OUTFIT_SUBCATEGORY_DETAIL(id), {
                headers: {
                    'accept': '*/*',
                    'Authorization': formattedToken,
                }
            });
            console.log("DELETE SUBCATEGORY - Response:", response.data);
            return response.data;
        } catch (error) {
            console.log("DELETE SUBCATEGORY - Error:", error.response?.data || error.message);
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

const subcategorySlice = createSlice({
    name: 'subcategory',
    initialState: {
        loading: true,
        loadingMore: false,
        error: null,
        subcategories: [],
        hasMore: true,
    },
    reducers: {
        clearSubcategoryError: (state) => {
            state.error = null;
        },
        resetSubcategories: (state) => {
            state.subcategories = [];
            state.hasMore = true;
            state.loading = true;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(addSubcategoryAction.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(addSubcategoryAction.fulfilled, (state) => {
                state.loading = false;
            })
            .addCase(addSubcategoryAction.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(getSubcategoriesAction.pending, (state, action) => {
                const page = action.meta.arg?.page ?? 1;
                if (page === 1) state.loading = true;
                else state.loadingMore = true;
                state.error = null;
            })
            .addCase(getSubcategoriesAction.fulfilled, (state, action) => {
                state.loading = false;
                state.loadingMore = false;
                const incoming = action.payload?.data ?? [];
                const page = action.payload?.page ?? 1;
                if (page === 1) state.subcategories = incoming;
                else state.subcategories = [...state.subcategories, ...incoming];
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
            .addCase(getSubcategoriesAction.rejected, (state, action) => {
                state.loading = false;
                state.loadingMore = false;
                state.error = action.payload;
            })
            .addCase(updateSubcategoryAction.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(updateSubcategoryAction.fulfilled, (state) => {
                state.loading = false;
            })
            .addCase(updateSubcategoryAction.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(deleteSubcategoryAction.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(deleteSubcategoryAction.fulfilled, (state) => {
                state.loading = false;
            })
            .addCase(deleteSubcategoryAction.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });
    },
});

export const { clearSubcategoryError, resetSubcategories } = subcategorySlice.actions;
export default subcategorySlice.reducer;
