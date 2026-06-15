import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import { URL_OUTFIT_CATEGORY, URL_OUTFIT_CATEGORY_LIST, URL_OUTFIT_CATEGORY_DETAIL } from '../config/env';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const addCategoryAction = createAsyncThunk(
    'category/addCategory',
    async (categoryData, { getState, rejectWithValue }) => {
        try {
            const authState = getState().auth;
            const user = authState.user;
            let token = user?.token || user?.data?.token || user?.accessToken || user?.data?.accessToken || user?.access_token || user?.data?.access_token || user?.jwt || user?.data?.jwt;
            if (!token) {
                token = await AsyncStorage.getItem('userToken');
            }
            const formattedToken = token ? (token.startsWith('Bearer ') ? token : `Bearer ${token}`) : '';

            const response = await axios.post(URL_OUTFIT_CATEGORY, categoryData, {
                headers: {
                    'Content-Type': 'application/json',
                    'accept': '*/*',
                    'Authorization': formattedToken,
                }
            });
            console.log("ADD CATEGORY - Response:", response.data);
            return response.data;
        } catch (error) {
            console.log("ADD CATEGORY - Error:", error.response?.data || error.message);
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const getCategoriesAction = createAsyncThunk(
    'category/getCategories',
    async ({ outfitId, page = 1, limit = 10 } = {}, { getState, rejectWithValue }) => {
        try {
            const authState = getState().auth;
            const user = authState.user;
            let token = user?.token || user?.data?.token || user?.accessToken || user?.data?.accessToken || user?.access_token || user?.data?.access_token || user?.jwt || user?.data?.jwt;
            if (!token) {
                token = await AsyncStorage.getItem('userToken');
            }
            const formattedToken = token ? (token.startsWith('Bearer ') ? token : `Bearer ${token}`) : '';

            const baseUrl = outfitId ? URL_OUTFIT_CATEGORY_LIST(outfitId) : URL_OUTFIT_CATEGORY;
            const url = `${baseUrl}?page=${page}&limit=${limit}`;
            const response = await axios.get(url, {
                headers: {
                    'accept': '*/*',
                    'Authorization': formattedToken,
                }
            });
            console.log("GET CATEGORIES - Response:", response.data);
            return { ...response.data, page };
        } catch (error) {
            console.log("GET CATEGORIES - Error:", error.response?.data || error.message);
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const updateCategoryAction = createAsyncThunk(
    'category/updateCategory',
    async ({ id, categoryData }, { getState, rejectWithValue }) => {
        try {
            const authState = getState().auth;
            const user = authState.user;
            let token = user?.token || user?.data?.token || user?.accessToken || user?.data?.accessToken || user?.access_token || user?.data?.access_token || user?.jwt || user?.data?.jwt;
            if (!token) {
                token = await AsyncStorage.getItem('userToken');
            }
            const formattedToken = token ? (token.startsWith('Bearer ') ? token : `Bearer ${token}`) : '';

            const response = await axios.put(URL_OUTFIT_CATEGORY_DETAIL(id), categoryData, {
                headers: {
                    'Content-Type': 'application/json',
                    'accept': '*/*',
                    'Authorization': formattedToken,
                }
            });
            console.log("UPDATE CATEGORY - Response:", response.data);
            return response.data;
        } catch (error) {
            console.log("UPDATE CATEGORY - Error:", error.response?.data || error.message);
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const deleteCategoryAction = createAsyncThunk(
    'category/deleteCategory',
    async (id, { getState, rejectWithValue }) => {
        try {
            const authState = getState().auth;
            const user = authState.user;
            let token = user?.token || user?.data?.token || user?.accessToken || user?.data?.accessToken || user?.access_token || user?.data?.access_token || user?.jwt || user?.data?.jwt;
            if (!token) {
                token = await AsyncStorage.getItem('userToken');
            }
            const formattedToken = token ? (token.startsWith('Bearer ') ? token : `Bearer ${token}`) : '';

            const response = await axios.delete(URL_OUTFIT_CATEGORY_DETAIL(id), {
                headers: {
                    'accept': '*/*',
                    'Authorization': formattedToken,
                }
            });
            console.log("DELETE CATEGORY - Response:", response.data);
            return response.data;
        } catch (error) {
            console.log("DELETE CATEGORY - Error:", error.response?.data || error.message);
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

const categorySlice = createSlice({
    name: 'category',
    initialState: {
        loading: true,
        loadingMore: false,
        error: null,
        categories: [],
        hasMore: true,
    },
    reducers: {
        clearCategoryError: (state) => {
            state.error = null;
        },
        resetCategories: (state) => {
            state.categories = [];
            state.hasMore = true;
            state.loading = true;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(addCategoryAction.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(addCategoryAction.fulfilled, (state) => {
                state.loading = false;
            })
            .addCase(addCategoryAction.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(getCategoriesAction.pending, (state, action) => {
                const page = action.meta.arg?.page ?? 1;
                if (page === 1) state.loading = true;
                else state.loadingMore = true;
                state.error = null;
            })
            .addCase(getCategoriesAction.fulfilled, (state, action) => {
                state.loading = false;
                state.loadingMore = false;
                const incoming = action.payload?.data ?? [];
                const page = action.payload?.page ?? 1;
                if (page === 1) state.categories = incoming;
                else state.categories = [...state.categories, ...incoming];
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
            .addCase(getCategoriesAction.rejected, (state, action) => {
                state.loading = false;
                state.loadingMore = false;
                state.error = action.payload;
            })
            .addCase(updateCategoryAction.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(updateCategoryAction.fulfilled, (state) => {
                state.loading = false;
            })
            .addCase(updateCategoryAction.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(deleteCategoryAction.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(deleteCategoryAction.fulfilled, (state) => {
                state.loading = false;
            })
            .addCase(deleteCategoryAction.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });
    },
});

export const { clearCategoryError, resetCategories } = categorySlice.actions;
export default categorySlice.reducer;
