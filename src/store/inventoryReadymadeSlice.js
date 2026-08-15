import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import axios from 'axios';
import { URL_INVENTORY_READYMADE } from '../config/env';
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

  // Keep list filters in the exact query shape the backend expects.
  if (params.search?.trim()) {
    normalized.search = params.search.trim();
  }

  if (params.status !== undefined && params.status !== '') {
    normalized.status = Array.isArray(params.status)
      ? params.status.filter(Boolean).join(',')
      : `${params.status}`.trim();
  }

  ['category_id', 'product_type_id', 'brand_id'].forEach(key => {
    const value = params[key];
    if (Array.isArray(value)) {
      const serialized = value.map(item => `${item}`.trim()).filter(Boolean);
      if (serialized.length > 0) {
        normalized[key] = serialized.join(',');
      }
      return;
    }

    if (value !== undefined && value !== null) {
      const serialized = `${value}`.trim();
      if (serialized) {
        normalized[key] = serialized;
      }
    }
  });

  return normalized;
};

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
    'category_id',
    'product_type_id',
    'brand_id',
  ].every(key => String(left[key] ?? '') === String(right[key] ?? ''));

const syncReadymadeInList = (list, updatedItem) =>
  list.map(item => (item.id === updatedItem?.id ? updatedItem : item));

export const getReadymadesAction = createAsyncThunk(
  'inventoryReadymade/getAll',
  async (params = {}, { getState, rejectWithValue }) => {
    try {
      const token = await getAuthToken(getState);
      const companyId = getState().profile?.profileData?.company?.id;
      const requestParams = normalizeListParams(params);
      const res = await axios.get(URL_INVENTORY_READYMADE, {
        headers: { 
          accept: '*/*', 
          Authorization: token,
          ...(companyId && { 'company-id': companyId })
        },
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

export const getReadymadeByIdAction = createAsyncThunk(
  'inventoryReadymade/getById',
  async (id, { getState, rejectWithValue }) => {
    try {
      const token = await getAuthToken(getState);
      const res = await axios.get(`${URL_INVENTORY_READYMADE}/${id}`, {
        headers: { accept: '*/*', Authorization: token },
      });
      return res.data;
    } catch (error) {
      return rejectWithValue(buildErrorPayload(error));
    }
  },
);

export const addReadymadeAction = createAsyncThunk(
  'inventoryReadymade/add',
  async (payload, { getState, rejectWithValue }) => {
    try {
      const token = await getAuthToken(getState);
      const res = await axios.post(URL_INVENTORY_READYMADE, payload, {
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

export const updateReadymadeAction = createAsyncThunk(
  'inventoryReadymade/update',
  async ({ id, payload }, { getState, rejectWithValue }) => {
    try {
      const token = await getAuthToken(getState);
      const res = await axios.put(`${URL_INVENTORY_READYMADE}/${id}`, payload, {
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

export const deleteReadymadeAction = createAsyncThunk(
  'inventoryReadymade/delete',
  async (id, { getState, rejectWithValue }) => {
    try {
      const token = await getAuthToken(getState);
      const res = await axios.delete(`${URL_INVENTORY_READYMADE}/${id}`, {
        headers: { accept: '*/*', Authorization: token },
      });
      return { ...res.data, id };
    } catch (error) {
      return rejectWithValue(buildErrorPayload(error));
    }
  },
);

export const toggleReadymadeStatusAction = createAsyncThunk(
  'inventoryReadymade/toggleStatus',
  async ({ id, status }, { getState, rejectWithValue }) => {
    try {
      const token = await getAuthToken(getState);
      const res = await axios.patch(
        `${URL_INVENTORY_READYMADE}/${id}/status`,
        { status },
        {
          headers: {
            'Content-Type': 'application/json',
            accept: '*/*',
            Authorization: token,
          },
        },
      );
      return {
        ...res.data,
        id,
        status,
      };
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

const inventoryReadymadeSlice = createSlice({
  name: 'inventoryReadymade',
  initialState,
  reducers: {
    clearError: state => {
      state.error = null;
    },
    clearCurrentReadymade: state => {
      state.currentItem = null;
      state.detailLoading = false;
    },
  },
  extraReducers: builder => {
    builder
      .addCase(getReadymadesAction.pending, (state, { meta }) => {
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
      .addCase(getReadymadesAction.fulfilled, (state, { payload }) => {
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
      .addCase(getReadymadesAction.rejected, (state, { payload, meta }) => {
        if (!isSameQuery(normalizeListParams(meta.arg), state.lastQuery)) {
          return;
        }

        state.loading = false;
        state.paginationLoading = false;
        state.error = payload;
      })

      .addCase(getReadymadeByIdAction.pending, state => {
        state.detailLoading = true;
        state.error = null;
      })
      .addCase(getReadymadeByIdAction.fulfilled, (state, { payload }) => {
        state.detailLoading = false;
        state.currentItem = payload.data || null;
        if (payload.data?.id) {
          state.list = syncReadymadeInList(state.list, payload.data);
        }
      })
      .addCase(getReadymadeByIdAction.rejected, (state, { payload }) => {
        state.detailLoading = false;
        state.error = payload;
      })

      .addCase(addReadymadeAction.pending, state => {
        state.error = null;
      })
      .addCase(addReadymadeAction.fulfilled, (state, { payload }) => {
        const isUnfilteredFirstPage =
          state.pagination.page === 1 &&
          !state.lastQuery.search &&
          !state.lastQuery.status &&
          !state.lastQuery.category_id &&
          !state.lastQuery.product_type_id &&
          !state.lastQuery.brand_id;

        if (payload.data && isUnfilteredFirstPage) {
          state.list = [payload.data, ...state.list].slice(
            0,
            state.pagination.limit || 10,
          );
          state.pagination.total += 1;
        }
      })
      .addCase(addReadymadeAction.rejected, (state, { payload }) => {
        state.error = payload;
      })

      .addCase(updateReadymadeAction.pending, state => {
        state.error = null;
      })
      .addCase(updateReadymadeAction.fulfilled, (state, { payload }) => {
        if (payload.data) {
          state.list = syncReadymadeInList(state.list, payload.data);
          if (state.currentItem?.id === payload.data.id) {
            state.currentItem = payload.data;
          }
        }
      })
      .addCase(updateReadymadeAction.rejected, (state, { payload }) => {
        state.error = payload;
      })

      .addCase(deleteReadymadeAction.pending, state => {
        state.error = null;
      })
      .addCase(deleteReadymadeAction.fulfilled, (state, { payload }) => {
        state.list = state.list.filter(item => item.id !== payload.id);
        state.pagination.total = Math.max(0, (state.pagination.total || 0) - 1);
        if (state.currentItem?.id === payload.id) {
          state.currentItem = null;
        }
      })
      .addCase(deleteReadymadeAction.rejected, (state, { payload }) => {
        state.error = payload;
      })

      .addCase(toggleReadymadeStatusAction.pending, state => {
        state.error = null;
      })
      .addCase(toggleReadymadeStatusAction.fulfilled, (state, { payload }) => {
        if (payload.data) {
          state.list = syncReadymadeInList(state.list, payload.data);
          if (state.currentItem?.id === payload.data.id) {
            state.currentItem = payload.data;
          }
          return;
        }

        if (payload.id !== undefined) {
          const item = state.list.find(i => i.id === payload.id);
          if (item) {
            item.status = payload.status;
          }

          if (state.currentItem?.id === payload.id) {
            state.currentItem = {
              ...state.currentItem,
              status: payload.status,
            };
          }
        }
      })
      .addCase(toggleReadymadeStatusAction.rejected, (state, { payload }) => {
        state.error = payload;
      });
  },
});

export const { clearError, clearCurrentReadymade } =
  inventoryReadymadeSlice.actions;
export default inventoryReadymadeSlice.reducer;
