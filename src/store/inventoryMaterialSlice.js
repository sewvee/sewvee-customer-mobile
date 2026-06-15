import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import axios from 'axios';
import { URL_INVENTORY_MATERIAL } from '../config/env';
import getAuthToken from '../utils/getAuthToken';

const buildErrorPayload = error =>
  error?.response?.data || {
    message: error?.message || 'Something went wrong',
  };

const normalizeListParams = (params = {}) => {
  const normalized = {
    page: Number(params.page) || 1,
    limit: Number(params.limit) || 10,
    sort_by: params.sort_by || 'created_at',
    sort_order: params.sort_order || 'DESC',
  };

  if (params.search?.trim()) {
    normalized.search = params.search.trim();
  }

  if (params.status !== undefined && params.status !== '') {
    normalized.status = params.status;
  }

  const materialTypeFilter = params.material_type_id;
  if (Array.isArray(materialTypeFilter)) {
    const value = materialTypeFilter
      .map(v => `${v}`.trim())
      .filter(Boolean);
    if (value.length > 0) {
      normalized.material_type_id = value.join(',');
    }
  } else if (materialTypeFilter !== undefined && materialTypeFilter !== null) {
    const value = `${materialTypeFilter}`.trim();
    if (value) {
      normalized.material_type_id = value;
    }
  }

  return normalized;
};

const syncMaterialInList = (list, updatedItem) =>
  list.map(item => (item.id === updatedItem?.id ? updatedItem : item));

const serializeListParams = params => {
  const searchParams = new URLSearchParams();

  Object.entries(params || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }

    searchParams.append(key, `${value}`);
  });

  return searchParams.toString();
};

const isSameQuery = (left = {}, right = {}) =>
  [
    'page',
    'limit',
    'search',
    'status',
    'sort_by',
    'sort_order',
    'material_type_id',
  ].every(key => String(left[key] ?? '') === String(right[key] ?? ''));

export const getMaterialsAction = createAsyncThunk(
  'inventoryMaterial/getAll',
  async (params = {}, { getState, rejectWithValue }) => {
    try {
      const token = await getAuthToken(getState);
      const requestParams = normalizeListParams(params);
      const res = await axios.get(URL_INVENTORY_MATERIAL, {
        headers: { accept: '*/*', Authorization: token },
        params: requestParams,
        paramsSerializer: params => serializeListParams(params),
      });

      return {
        ...res.data,
        requestParams,
        requestPage: requestParams.page,
      };
    } catch (error) {
      return rejectWithValue(buildErrorPayload(error));
    }
  },
);

export const getMaterialByIdAction = createAsyncThunk(
  'inventoryMaterial/getById',
  async (id, { getState, rejectWithValue }) => {
    try {
      const token = await getAuthToken(getState);
      const res = await axios.get(`${URL_INVENTORY_MATERIAL}/${id}`, {
        headers: { accept: '*/*', Authorization: token },
      });
      return res.data;
    } catch (error) {
      return rejectWithValue(buildErrorPayload(error));
    }
  },
);

export const addMaterialAction = createAsyncThunk(
  'inventoryMaterial/add',
  async (payload, { getState, rejectWithValue }) => {
    try {
      const token = await getAuthToken(getState);
      const res = await axios.post(URL_INVENTORY_MATERIAL, payload, {
        headers: {
          'Content-Type': 'application/json',
          accept: '*/*',
          Authorization: token,
        },
      });
      return res.data;
    } catch (error) {
      return rejectWithValue(buildErrorPayload(error));
    }
  },
);

export const updateMaterialAction = createAsyncThunk(
  'inventoryMaterial/update',
  async ({ id, payload }, { getState, rejectWithValue }) => {
    try {
      const token = await getAuthToken(getState);
      const res = await axios.put(`${URL_INVENTORY_MATERIAL}/${id}`, payload, {
        headers: {
          'Content-Type': 'application/json',
          accept: '*/*',
          Authorization: token,
        },
      });
      return res.data;
    } catch (error) {
      return rejectWithValue(buildErrorPayload(error));
    }
  },
);

export const deleteMaterialAction = createAsyncThunk(
  'inventoryMaterial/delete',
  async (id, { getState, rejectWithValue }) => {
    try {
      const token = await getAuthToken(getState);
      const res = await axios.delete(`${URL_INVENTORY_MATERIAL}/${id}`, {
        headers: { accept: '*/*', Authorization: token },
      });
      return { ...res.data, id };
    } catch (error) {
      return rejectWithValue(buildErrorPayload(error));
    }
  },
);

export const toggleMaterialStatusAction = createAsyncThunk(
  'inventoryMaterial/toggleStatus',
  async ({ id, status }, { getState, rejectWithValue }) => {
    try {
      const token = await getAuthToken(getState);
      const res = await axios.patch(
        `${URL_INVENTORY_MATERIAL}/${id}/status`,
        { status },
        {
          headers: {
            'Content-Type': 'application/json',
            accept: '*/*',
            Authorization: token,
          },
        },
      );
      return res.data;
    } catch (error) {
      return rejectWithValue(buildErrorPayload(error));
    }
  },
);

const initialState = {
  list: [],
  loading: false,
  paginationLoading: false,
  detailLoading: false,
  error: null,
  currentItem: null,
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  },
  lastQuery: normalizeListParams(),
};

const inventoryMaterialSlice = createSlice({
  name: 'inventoryMaterial',
  initialState,
  reducers: {
    clearError: state => {
      state.error = null;
    },
    clearCurrentMaterial: state => {
      state.currentItem = null;
      state.detailLoading = false;
    },
  },
  extraReducers: builder => {
    builder
      .addCase(getMaterialsAction.pending, (state, { meta }) => {
        const requestParams = normalizeListParams(meta.arg);
        const isLoadMore = Number(requestParams.page) > 1;

        if (isLoadMore) {
          state.paginationLoading = true;
          state.loading = false;
        } else {
          state.loading = true;
          state.paginationLoading = false;
        }

        state.error = null;
        state.lastQuery = requestParams;
      })
      .addCase(getMaterialsAction.fulfilled, (state, { payload }) => {
        if (!isSameQuery(payload.requestParams, state.lastQuery)) {
          return;
        }

        state.loading = false;
        state.paginationLoading = false;
        const newData = payload.data || [];
        if (Number(payload.requestPage) > 1) {
          state.list = [...state.list, ...newData];
        } else {
          state.list = newData;
        }

        const pg = payload.pagination || {};
        state.pagination = {
          page: Number(pg.page) || payload.requestPage || 1,
          limit: Number(pg.limit) || payload.requestParams?.limit || 10,
          total: Number(pg.total) || 0,
          totalPages: Number(pg.totalPages) || 1,
        };
      })
      .addCase(getMaterialsAction.rejected, (state, { payload, meta }) => {
        if (!isSameQuery(normalizeListParams(meta.arg), state.lastQuery)) {
          return;
        }

        state.loading = false;
        state.paginationLoading = false;
        state.error = payload;
      })

      .addCase(getMaterialByIdAction.pending, state => {
        state.detailLoading = true;
        state.error = null;
      })
      .addCase(getMaterialByIdAction.fulfilled, (state, { payload }) => {
        state.detailLoading = false;
        state.currentItem = payload.data || null;
        if (payload.data?.id) {
          state.list = syncMaterialInList(state.list, payload.data);
        }
      })
      .addCase(getMaterialByIdAction.rejected, (state, { payload }) => {
        state.detailLoading = false;
        state.error = payload;
      })

      .addCase(addMaterialAction.pending, state => {
        state.error = null;
      })
      .addCase(addMaterialAction.fulfilled, (state, { payload }) => {
        if (payload.data && state.pagination.page === 1) {
          state.list = [payload.data, ...state.list].slice(
            0,
            state.pagination.limit || 10,
          );
          state.pagination.total += 1;
        }
      })
      .addCase(addMaterialAction.rejected, (state, { payload }) => {
        state.error = payload;
      })

      .addCase(updateMaterialAction.pending, state => {
        state.error = null;
      })
      .addCase(updateMaterialAction.fulfilled, (state, { payload }) => {
        if (payload.data) {
          state.list = syncMaterialInList(state.list, payload.data);
          if (state.currentItem?.id === payload.data.id) {
            state.currentItem = payload.data;
          }
        }
      })
      .addCase(updateMaterialAction.rejected, (state, { payload }) => {
        state.error = payload;
      })

      .addCase(deleteMaterialAction.pending, state => {
        state.error = null;
      })
      .addCase(deleteMaterialAction.fulfilled, (state, { payload }) => {
        state.list = state.list.filter(item => item.id !== payload.id);
        state.pagination.total = Math.max(0, (state.pagination.total || 0) - 1);
        if (state.currentItem?.id === payload.id) {
          state.currentItem = null;
        }
      })
      .addCase(deleteMaterialAction.rejected, (state, { payload }) => {
        state.error = payload;
      })

      .addCase(toggleMaterialStatusAction.pending, state => {
        state.error = null;
      })
      .addCase(toggleMaterialStatusAction.fulfilled, (state, { payload }) => {
        if (payload.data) {
          state.list = syncMaterialInList(state.list, payload.data);
          if (state.currentItem?.id === payload.data.id) {
            state.currentItem = payload.data;
          }
        }
      })
      .addCase(toggleMaterialStatusAction.rejected, (state, { payload }) => {
        state.error = payload;
      });
  },
});

export const { clearError, clearCurrentMaterial } =
  inventoryMaterialSlice.actions;
export default inventoryMaterialSlice.reducer;
