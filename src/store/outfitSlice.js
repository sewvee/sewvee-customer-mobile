import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import { URL_OUTFIT, URL_OUTFIT_DETAIL, URL_OUTFIT_STITCHING_STRUCTURE } from '../config/env';
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

export const addOutfitAction = createAsyncThunk(
    'outfit/addOutfit',
    async (outfitData, { getState, rejectWithValue }) => {
        try {
            const formattedToken = await getAuthToken(getState);
            const response = await axios.post(URL_OUTFIT, outfitData, {
                headers: {
                    'Content-Type': 'application/json',
                    'accept': '*/*',
                    'Authorization': formattedToken,
                }
            });
            console.log("ADD OUTFIT - Response:", response.data);
            return response.data;
        } catch (error) {
            console.log("ADD OUTFIT - Error:", error.response?.data || error.message);
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const getOutfitsAction = createAsyncThunk(
    'outfit/getOutfits',
    async ({ sectionId, page = 1, limit = 10 } = {}, { getState, rejectWithValue }) => {
        try {
            const formattedToken = await getAuthToken(getState);
            let url = sectionId
                ? `${URL_OUTFIT}?sectionId=${sectionId}&page=${page}&limit=${limit}`
                : `${URL_OUTFIT}?page=${page}&limit=${limit}`;
            const response = await axios.get(url, {
                headers: {
                    'accept': '*/*',
                    'Authorization': formattedToken,
                }
            });
            console.log("GET OUTFITS - Response:", response.data);
            return { ...response.data, page };
        } catch (error) {
            console.log("GET OUTFITS - Error:", error.response?.data || error.message);
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const updateOutfitAction = createAsyncThunk(
    'outfit/updateOutfit',
    async ({ id, outfitData }, { getState, rejectWithValue }) => {
        try {
            const formattedToken = await getAuthToken(getState);
            const response = await axios.put(URL_OUTFIT_DETAIL(id), outfitData, {
                headers: {
                    'Content-Type': 'application/json',
                    'accept': '*/*',
                    'Authorization': formattedToken,
                }
            });
            console.log("UPDATE OUTFIT - Response:", response.data);
            return response.data;
        } catch (error) {
            console.log("UPDATE OUTFIT - Error:", error.response?.data || error.message);
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const deleteOutfitAction = createAsyncThunk(
    'outfit/deleteOutfit',
    async (id, { getState, rejectWithValue }) => {
        try {
            const formattedToken = await getAuthToken(getState);
            const response = await axios.delete(URL_OUTFIT_DETAIL(id), {
                headers: {
                    'accept': '*/*',
                    'Authorization': formattedToken,
                }
            });
            console.log("DELETE OUTFIT - Response:", response.data);
            return response.data;
        } catch (error) {
            console.log("DELETE OUTFIT - Error:", error.response?.data || error.message);
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const getStitchingStructureAction = createAsyncThunk(
    'outfit/getStitchingStructure',
    async (id, { getState, rejectWithValue }) => {
        try {
            const formattedToken = await getAuthToken(getState);
            const response = await axios.get(URL_OUTFIT_STITCHING_STRUCTURE(id), {
                headers: {
                    'accept': '*/*',
                    'Authorization': formattedToken,
                }
            });
            console.log("GET STITCHING STRUCTURE - Response:", response.data);
            return response.data;
        } catch (error) {
            console.log("GET STITCHING STRUCTURE - Error:", error.response?.data || error.message);
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

const outfitSlice = createSlice({
    name: 'outfit',
    initialState: {
        loading: true,
        loadingMore: false,
        error: null,
        outfits: [],
        hasMore: true,
        stitchingStructure: null,
        stitchingLoading: false,
    },
    reducers: {
        clearOutfitError: (state) => {
            state.error = null;
        },
        resetOutfits: (state) => {
            state.outfits = [];
            state.hasMore = true;
            state.loading = true;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(addOutfitAction.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(addOutfitAction.fulfilled, (state) => {
                state.loading = false;
            })
            .addCase(addOutfitAction.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(getOutfitsAction.pending, (state, action) => {
                const page = action.meta.arg?.page ?? 1;
                if (page === 1) {
                    state.loading = true;
                } else {
                    state.loadingMore = true;
                }
                state.error = null;
            })
            .addCase(getOutfitsAction.fulfilled, (state, action) => {
                state.loading = false;
                state.loadingMore = false;
                const incoming = action.payload?.data ?? [];
                const page = action.payload?.page ?? 1;
                if (page === 1) {
                    state.outfits = incoming;
                } else {
                    state.outfits = [...state.outfits, ...incoming];
                }
                // Determine if more pages exist from metadata or list length
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
                        // Fallback: if returned less than limit, no more pages
                        state.hasMore = incoming.length >= limit;
                    }
                } else {
                    // Fallback: if returned less than limit, no more pages
                    state.hasMore = incoming.length >= 10;
                }
            })
            .addCase(getOutfitsAction.rejected, (state, action) => {
                state.loading = false;
                state.loadingMore = false;
                state.error = action.payload;
            })
            .addCase(updateOutfitAction.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(updateOutfitAction.fulfilled, (state) => {
                state.loading = false;
            })
            .addCase(updateOutfitAction.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(deleteOutfitAction.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(deleteOutfitAction.fulfilled, (state) => {
                state.loading = false;
            })
            .addCase(deleteOutfitAction.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(getStitchingStructureAction.pending, (state) => {
                state.stitchingLoading = true;
                state.error = null;
                state.stitchingStructure = null;
            })
            .addCase(getStitchingStructureAction.fulfilled, (state, action) => {
                state.stitchingLoading = false;
                state.stitchingStructure = action.payload?.data;
            })
            .addCase(getStitchingStructureAction.rejected, (state, action) => {
                state.stitchingLoading = false;
                state.error = action.payload;
            });
    },
});

export const { clearOutfitError, resetOutfits } = outfitSlice.actions;
export default outfitSlice.reducer;
