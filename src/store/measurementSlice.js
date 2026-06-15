import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import { URL_OUTFIT_MEASUREMENT, URL_OUTFIT_ASSIGNED_MEASUREMENTS, URL_MEASUREMENT_HISTORY, URL_MEASUREMENT_HISTORY_DETAIL } from '../config/env';
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

const getMeasurementEntityId = item =>
    item?.measurement_id ?? item?.id ?? null;

const normalizeMeasurementEntity = (measurement, fallback = {}) => {
    if (!measurement && !fallback) {
        return null;
    }

    const source = measurement || {};
    const normalizedId = getMeasurementEntityId(source) ?? getMeasurementEntityId(fallback);

    return {
        ...fallback,
        ...source,
        ...(normalizedId !== null && normalizedId !== undefined
            ? {
                measurement_id: normalizedId,
                id: source?.id ?? fallback?.id ?? normalizedId,
            }
            : {}),
        measurement_name:
            source?.measurement_name ??
            fallback?.measurement_name ??
            source?.name ??
            fallback?.name ??
            source?.title ??
            fallback?.title ??
            '',
        image_url:
            source?.image_url ??
            fallback?.image_url ??
            source?.img ??
            fallback?.img ??
            '',
        section_id:
            source?.section_id ??
            fallback?.section_id ??
            source?.sectionId ??
            fallback?.sectionId ??
            [],
        outfit_id:
            source?.outfit_id ??
            fallback?.outfit_id ??
            source?.outfitId ??
            fallback?.outfitId ??
            null,
        is_default:
            source?.is_default ??
            fallback?.is_default ??
            false,
    };
};

const upsertMeasurementList = (list = [], incomingMeasurement) => {
    const normalizedMeasurement = normalizeMeasurementEntity(incomingMeasurement);
    if (!normalizedMeasurement) {
        return list;
    }

    const normalizedId = String(getMeasurementEntityId(normalizedMeasurement) ?? '').trim();
    const normalizedName = String(normalizedMeasurement.measurement_name || '').trim().toLowerCase();
    let wasUpdated = false;

    const nextList = list.map(item => {
        const itemId = String(getMeasurementEntityId(item) ?? '').trim();
        const itemName = String(item?.measurement_name || '').trim().toLowerCase();
        const isMatch =
            (normalizedId && itemId && normalizedId === itemId) ||
            (normalizedName && itemName && normalizedName === itemName);

        if (!isMatch) {
            return item;
        }

        wasUpdated = true;
        return {
            ...item,
            ...normalizedMeasurement,
        };
    });

    if (wasUpdated) {
        return nextList;
    }

    return [normalizedMeasurement, ...nextList];
};

const removeMeasurementFromList = (list = [], measurementId) => {
    const normalizedId = String(measurementId ?? '').trim();
    if (!normalizedId) {
        return list;
    }

    return list.filter(item => String(getMeasurementEntityId(item) ?? '').trim() !== normalizedId);
};

export const getMeasurementsAction = createAsyncThunk(
    'measurement/getMeasurements',
    async ({ sectionId, outfitId, filterCompanyId, search, page = 1, limit = 20 } = {}, { getState, rejectWithValue }) => {
        try {
            const formattedToken = await getAuthToken(getState);
            const authState = getState().auth;
            const userCompanyId = filterCompanyId || authState.user?.data?.companyId || authState.user?.companyId || '';

            const params = { page, limit };
            if (sectionId) params.sectionId = sectionId;
            if (outfitId) params.outfitId = outfitId;
            if (userCompanyId) params.filterCompanyId = userCompanyId;
            if (search) params.search = search;

            const response = await axios.get(URL_OUTFIT_MEASUREMENT, {
                params,
                headers: {
                    'accept': '*/*',
                    'Authorization': formattedToken,
                }
            });
            console.log("GET MEASUREMENTS - Response:", response.data);
            return { ...response.data, page };
        } catch (error) {
            console.log("GET MEASUREMENTS - Error:", error.response?.data || error.message);
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const getOutfitMeasurementsAction = createAsyncThunk(
    'measurement/getOutfitMeasurements',
    async ({ outfitId, page = 1, limit = 10 } = {}, { getState, rejectWithValue }) => {
        try {
            const formattedToken = await getAuthToken(getState);
            const response = await axios.get(URL_OUTFIT_ASSIGNED_MEASUREMENTS(outfitId), {
                params: { page, limit },
                headers: {
                    'accept': '*/*',
                    'Authorization': formattedToken,
                }
            });
            console.log("GET OUTFIT MEASUREMENTS - Response:", response.data);
            return { ...response.data, page };
        } catch (error) {
            console.log("GET OUTFIT MEASUREMENTS - Error:", error.response?.data || error.message);
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const getMeasurementHistoryAction = createAsyncThunk(
    'measurement/getMeasurementHistory',
    async ({ customerId, outfitId, page = 1, limit = 10 } = {}, { getState, rejectWithValue }) => {
        try {
            const formattedToken = await getAuthToken(getState);
            const response = await axios.get(URL_MEASUREMENT_HISTORY, {
                params: { customer_id: customerId, outfit_id: outfitId, page, limit },
                headers: {
                    'accept': '*/*',
                    'Authorization': formattedToken,
                }
            });
            console.log("GET MEASUREMENT HISTORY - Response:", response.data);
            return { ...response.data, page };
        } catch (error) {
            console.log("GET MEASUREMENT HISTORY - Error:", error.response?.data || error.message);
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const getMeasurementHistoryDetailAction = createAsyncThunk(
    'measurement/getMeasurementHistoryDetail',
    async (orderId, { getState, rejectWithValue }) => {
        try {
            const formattedToken = await getAuthToken(getState);
            const response = await axios.get(URL_MEASUREMENT_HISTORY_DETAIL(orderId), {
                headers: {
                    'accept': '*/*',
                    'Authorization': formattedToken,
                }
            });
            console.log("GET MEASUREMENT HISTORY DETAIL - Response:", response.data);
            return response.data;
        } catch (error) {
            console.log("GET MEASUREMENT HISTORY DETAIL - Error:", error.response?.data || error.message);
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const addMeasurementAction = createAsyncThunk(
    'measurement/addMeasurement',
    async (payload, { getState, rejectWithValue }) => {
        console.log("ADD MEASUREMENT payload :", payload);

        try {
            const formattedToken = await getAuthToken(getState);
            const response = await axios.post(URL_OUTFIT_MEASUREMENT, payload, {
                headers: {
                    'accept': '*/*',
                    'Authorization': formattedToken,
                    'Content-Type': 'application/json'
                }
            });
            console.log("create MEASUREMENT - body:", payload);

            console.log("ADD MEASUREMENT - Response:", response.data);
            return response.data;
        } catch (error) {
            console.log("ADD MEASUREMENT - Error:", error.response?.data || error.message);
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const updateMeasurementAction = createAsyncThunk(
    'measurement/updateMeasurement',
    async ({ id, payload }, { getState, rejectWithValue }) => {
        try {
            const formattedToken = await getAuthToken(getState);
            const response = await axios.patch(`${URL_OUTFIT_MEASUREMENT}/${id}`, payload, {
                headers: {
                    'accept': '*/*',
                    'Authorization': formattedToken,
                    'Content-Type': 'application/json'
                }
            });
            console.log("UPDATE MEASUREMENT - Response:", response.data);
            console.log("UPDATE MEASUREMENT - body:", payload);

            return response.data;
        } catch (error) {
            console.log("UPDATE MEASUREMENT - Error:", error.response?.data || error.message);
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const deleteMeasurementAction = createAsyncThunk(
    'measurement/deleteMeasurement',
    async (id, { getState, rejectWithValue }) => {
        try {
            const formattedToken = await getAuthToken(getState);
            const response = await axios.delete(`${URL_OUTFIT_MEASUREMENT}/${id}`, {
                headers: {
                    'accept': '*/*',
                    'Authorization': formattedToken
                }
            });
            console.log("DELETE MEASUREMENT - Response:", response.data);
            return response.data;
        } catch (error) {
            console.log("DELETE MEASUREMENT - Error:", error.response?.data || error.message);
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const assignMeasurementsAction = createAsyncThunk(
    'measurement/assignMeasurements',
    async ({ outfitId, measurementIds }, { getState, rejectWithValue }) => {
        try {
            const formattedToken = await getAuthToken(getState);
            const response = await axios.post(`${URL_OUTFIT_MEASUREMENT}/${outfitId}/assign`, { measurement_ids: measurementIds }, {
                headers: {
                    'accept': '*/*',
                    'Authorization': formattedToken,
                    'Content-Type': 'application/json'
                }
            });
            console.log("ASSIGN MEASUREMENT - Response:", response.data);
            return response.data;
        } catch (error) {
            console.log("ASSIGN MEASUREMENT - Error:", error.response?.data || error.message);
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

const measurementSlice = createSlice({
    name: 'measurement',
    initialState: {
        loading: false,
        loadingMore: false,
        error: null,
        measurements: [],
        outfitMeasurements: [],
        measurementHistory: [],
        historyDetail: null,
        hasMore: true,
        outfitHasMore: true,
        historyHasMore: true,
        detailLoading: false,
    },
    reducers: {
        clearMeasurementError: (state) => {
            state.error = null;
        },
        resetMeasurements: (state) => {
            state.measurements = [];
            state.hasMore = true;
        },
        resetOutfitMeasurements: (state) => {
            state.outfitMeasurements = [];
            state.outfitHasMore = true;
            state.loading = false;
            state.loadingMore = false;
        },
        resetMeasurementHistory: (state) => {
            state.measurementHistory = [];
            state.historyHasMore = true;
            state.loading = false;
            state.loadingMore = false;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(getMeasurementsAction.pending, (state, action) => {
                const page = action.meta.arg?.page ?? 1;
                if (page === 1) {
                    state.loading = true;
                } else {
                    state.loadingMore = true;
                }
                state.error = null;
            })
            .addCase(getMeasurementsAction.fulfilled, (state, action) => {
                state.loading = false;
                state.loadingMore = false;
                const incoming = action.payload?.data?.data ?? []; // according to payload in prompt
                const page = action.payload?.page ?? 1;

                if (page === 1) {
                    state.measurements = incoming;
                } else {
                    state.measurements = [...state.measurements, ...incoming];
                }

                const meta = action.payload?.data; // { total: 3, page: "1", limit: 20 }
                if (meta) {
                    const currentPage = parseInt(meta.page, 10) || 1;
                    const limit = meta.limit ?? 20;
                    const total = meta.total;
                    const totalPages = total != null ? Math.ceil(total / limit) : null;
                    if (totalPages != null) {
                        state.hasMore = currentPage < totalPages;
                    } else {
                        state.hasMore = incoming.length >= limit;
                    }
                } else {
                    state.hasMore = incoming.length >= 20;
                }
            })
            .addCase(getMeasurementsAction.rejected, (state, action) => {
                state.loading = false;
                state.loadingMore = false;
                state.error = action.payload;
            })
            .addCase(getOutfitMeasurementsAction.pending, (state, action) => {
                const page = action.meta.arg?.page ?? 1;
                if (page === 1) {
                    state.loading = true;
                } else {
                    state.loadingMore = true;
                }
                state.error = null;
            })
            .addCase(getOutfitMeasurementsAction.fulfilled, (state, action) => {
                state.loading = false;
                state.loadingMore = false;
                const incoming = action.payload?.data ?? []; // Prompt shows "data" is the array directly or contains pagination?
                // Actually the prompt sample response:
                // { "success": true, "data": [...], "pagination": {...} }
                // My action returns { ...response.data, page }
                // So incoming is action.payload.data

                const page = action.payload?.page ?? 1;

                if (page === 1) {
                    state.outfitMeasurements = incoming;
                } else {
                    // Avoid duplicates
                    const existingIds = new Set(state.outfitMeasurements.map(m => m.measurement_id));
                    const newItems = incoming.filter(m => !existingIds.has(m.measurement_id));
                    state.outfitMeasurements = [...state.outfitMeasurements, ...newItems];
                }

                const pagination = action.payload?.pagination;
                if (pagination) {
                    const currentPage = pagination.page || 1;
                    const totalPages = pagination.totalPages || 1;
                    state.outfitHasMore = currentPage < totalPages;
                } else {
                    state.outfitHasMore = false;
                }
            })
            .addCase(getOutfitMeasurementsAction.rejected, (state, action) => {
                state.loading = false;
                state.loadingMore = false;
                state.error = action.payload;
            })
            .addCase(getMeasurementHistoryAction.pending, (state, action) => {
                const page = action.meta.arg?.page ?? 1;
                if (page === 1) {
                    state.loading = true;
                } else {
                    state.loadingMore = true;
                }
                state.error = null;
            })
            .addCase(getMeasurementHistoryAction.fulfilled, (state, action) => {
                state.loading = false;
                state.loadingMore = false;
                const incoming = action.payload?.data ?? [];
                const page = action.payload?.page ?? 1;

                if (page === 1) {
                    state.measurementHistory = incoming;
                } else {
                    const existingIds = new Set(state.measurementHistory.map(m => m.id));
                    const newItems = incoming.filter(m => !existingIds.has(m.id));
                    state.measurementHistory = [...state.measurementHistory, ...newItems];
                }

                const pagination = action.payload?.pagination;
                if (pagination) {
                    const currentPage = pagination.page || 1;
                    const totalPages = pagination.totalPages || 1;
                    state.historyHasMore = currentPage < totalPages;
                } else {
                    state.historyHasMore = false;
                }
            })
            .addCase(getMeasurementHistoryAction.rejected, (state, action) => {
                state.loading = false;
                state.loadingMore = false;
                state.error = action.payload;
            })
            .addCase(getMeasurementHistoryDetailAction.pending, (state) => {
                state.detailLoading = true;
                state.error = null;
            })
            .addCase(getMeasurementHistoryDetailAction.fulfilled, (state, action) => {
                state.detailLoading = false;
                state.historyDetail = action.payload?.data || null;
            })
            .addCase(getMeasurementHistoryDetailAction.rejected, (state, action) => {
                state.detailLoading = false;
                state.error = action.payload;
            })
            .addCase(addMeasurementAction.fulfilled, (state, action) => {
                const fallbackPayload = action.meta?.arg || {};
                const payloadData = action.payload?.data || action.payload?.measurement || action.payload?.item || action.payload;
                const measurementData = Array.isArray(payloadData) ? payloadData[0] : payloadData;
                const createdMeasurement = normalizeMeasurementEntity(
                    measurementData,
                    fallbackPayload,
                );

                if (!createdMeasurement) {
                    return;
                }

                state.measurements = upsertMeasurementList(state.measurements, createdMeasurement);

                if (createdMeasurement.outfit_id || fallbackPayload.outfit_id) {
                    state.outfitMeasurements = upsertMeasurementList(
                        state.outfitMeasurements,
                        createdMeasurement,
                    );
                }
            })
            .addCase(updateMeasurementAction.fulfilled, (state, action) => {
                const fallbackPayload = action.meta?.arg?.payload || {};
                const fallbackId = action.meta?.arg?.id;
                const payloadData = action.payload?.data || action.payload?.measurement || action.payload?.item || action.payload;
                const measurementData = Array.isArray(payloadData) ? payloadData[0] : payloadData;
                const updatedMeasurement = normalizeMeasurementEntity(
                    measurementData,
                    {
                        ...fallbackPayload,
                        measurement_id: fallbackId,
                        id: fallbackId,
                    },
                );

                if (!updatedMeasurement) {
                    return;
                }

                state.measurements = upsertMeasurementList(state.measurements, updatedMeasurement);
                state.outfitMeasurements = upsertMeasurementList(
                    state.outfitMeasurements,
                    updatedMeasurement,
                );
            })
            .addCase(deleteMeasurementAction.fulfilled, (state, action) => {
                const deletedMeasurementId =
                    action.payload?.id ??
                    action.payload?.measurement_id ??
                    action.meta?.arg ??
                    null;

                state.measurements = removeMeasurementFromList(
                    state.measurements,
                    deletedMeasurementId,
                );
                state.outfitMeasurements = removeMeasurementFromList(
                    state.outfitMeasurements,
                    deletedMeasurementId,
                );
            });
    },
});

export const { clearMeasurementError, resetMeasurements, resetOutfitMeasurements, resetMeasurementHistory } = measurementSlice.actions;
export default measurementSlice.reducer;
