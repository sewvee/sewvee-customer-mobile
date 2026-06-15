import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
const normalizeListParams = (params = {}) => ({
  page: Number(params.page) || 1,
  limit: Number(params.limit) || 10,
  search: params.search || '',
  status:
    params.status !== undefined && params.status !== null ? params.status : '',
  sort_by: params.sort_by || 'created_at',
  sort_order: params.sort_order || 'DESC',
  category_id: params.category_id || '',
});

const isSameQuery = (left = {}, right = {}) =>
  [
    'page',
    'limit',
    'search',
    'status',
    'sort_by',
    'sort_order',
    'category_id',
  ].every(key => String(left[key] ?? '') === String(right[key] ?? ''));

const normalizeProductTypePayload = (payload = {}) => {
  const normalizedPayload = { ...payload };
  const categoryId =
    normalizedPayload.readymade_category_id ??
    normalizedPayload.category_id ??
    null;

  if (typeof normalizedPayload.name === 'string') {
    normalizedPayload.name = normalizedPayload.name.trim();
  }

  if (categoryId !== null && categoryId !== undefined && categoryId !== '') {
    normalizedPayload.readymade_category_id = categoryId;
    normalizedPayload.category_id = categoryId;
  }

  return normalizedPayload;
};
import {
  URL_GET_PRODUCT_TYPES,
  URL_INVENTORY_PRODUCT_TYPE,
} from '../config/env';
import getAuthToken from '../utils/getAuthToken'; // ← இது மட்டும் import

// ─── GET ALL ─────────────────────────────────────────────────────
export const getProductTypesAction = createAsyncThunk(
  'inventoryProductType/getAll',
  async (params = {}, { getState, rejectWithValue }) => {
    try {
      const token = await getAuthToken(getState);
      const requestParams = normalizeListParams(params);
      const res = await axios.get(URL_INVENTORY_PRODUCT_TYPE, {
        headers: { accept: '*/*', Authorization: token },
        params: {
          page: requestParams.page,
          limit: requestParams.limit,
          ...(requestParams.search ? { search: requestParams.search } : {}),
          ...(requestParams.status !== '' && requestParams.status !== undefined
            ? { status: requestParams.status }
            : {}),
          ...(requestParams.sort_by
            ? { sort_by: requestParams.sort_by }
            : { sort_by: 'created_at' }),
          ...(requestParams.sort_order
            ? { sort_order: requestParams.sort_order }
            : { sort_order: 'DESC' }),
          ...(requestParams.category_id
            ? { category_id: requestParams.category_id }
            : {}),
        },
      });
      console.log('GET PRODUCT TYPES - Response:', res.data);
      return {
        ...res.data,
        requestPage: requestParams.page,
        requestParams,
      };
    } catch (e) {
      return rejectWithValue(e.response?.data || e.message);
    }
  },
);

// ─── ADD ─────────────────────────────────────────────────────────
export const addProductTypeAction = createAsyncThunk(
  'inventoryProductType/add',
  async (payload, { getState, rejectWithValue }) => {
    try {
      const token = await getAuthToken(getState);
      const requestPayload = normalizeProductTypePayload(payload);
      const categoryId =
        requestPayload.readymade_category_id || requestPayload.category_id;
      const res = await axios.post(
        `${URL_GET_PRODUCT_TYPES}/${categoryId}/product-type`,
        requestPayload,
        {
          headers: {
            'Content-Type': 'application/json',
            accept: '*/*',
            Authorization: token,
          },
        },
      );
      console.log('ADD PRODUCT TYPE - Response:', res.data);
      return res.data;
    } catch (e) {
      console.log('ADD PRODUCT TYPE - Error:', e.response?.data || e.message);
      return rejectWithValue(e.response?.data || e.message);
    }
  },
);

// ─── UPDATE ──────────────────────────────────────────────────────
export const updateProductTypeAction = createAsyncThunk(
  'inventoryProductType/update',
  async ({ id, payload }, { getState, rejectWithValue }) => {
    try {
      const token = await getAuthToken(getState);
      const requestPayload = normalizeProductTypePayload(payload);
      const res = await axios.put(
        `${URL_INVENTORY_PRODUCT_TYPE}/${id}`,
        requestPayload,
        {
          headers: {
            'Content-Type': 'application/json',
            accept: '*/*',
            Authorization: token,
          },
        },
      );
      console.log('UPDATE PRODUCT TYPE - Response:', res.data);
      return res.data;
    } catch (e) {
      console.log(
        'UPDATE PRODUCT TYPE - Error:',
        e.response?.data || e.message,
      );
      return rejectWithValue(e.response?.data || e.message);
    }
  },
);

// ─── DELETE ──────────────────────────────────────────────────────
export const deleteProductTypeAction = createAsyncThunk(
  'inventoryProductType/delete',
  async (payload, { getState, rejectWithValue }) => {
    try {
      const token = await getAuthToken(getState);
      const id = typeof payload === 'object' ? payload?.id : payload;
      const categoryId =
        typeof payload === 'object'
          ? payload?.category_id || payload?.readymade_category_id
          : null;
      const requestUrl = categoryId
        ? `${URL_GET_PRODUCT_TYPES}/${categoryId}/product-type/${id}`
        : `${URL_INVENTORY_PRODUCT_TYPE}/${id}`;
      const res = await axios.delete(
        requestUrl,
        {
          headers: { accept: '*/*', Authorization: token },
        },
      );
      console.log('DELETE PRODUCT TYPE - Response:', res.data);
      return { ...res.data, id };
    } catch (e) {
      console.log(
        'DELETE PRODUCT TYPE - Error:',
        e.response?.data || e.message,
      );
      return rejectWithValue(e.response?.data || e.message);
    }
  },
);

//active inactive toggle
export const toggleProductTypeStatusAction = createAsyncThunk(
  'inventoryProductType/toggleStatus',
  async ({ id, status, category_id }, { getState, rejectWithValue }) => {
    try {
      const token = await getAuthToken(getState);
      const requestUrl = category_id
        ? `${URL_GET_PRODUCT_TYPES}/${category_id}/product-type/${id}/status`
        : `${URL_INVENTORY_PRODUCT_TYPE}/${id}/status`;

      const res = await axios.patch(
        requestUrl,
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
        ...(res.data || {}),
        id,
        status,
      };
    } catch (e) {
      return rejectWithValue(e.response?.data || e.message);
    }
  },
);
// ─── SLICE ───────────────────────────────────────────────────────
const inventoryProductTypeSlice = createSlice({
  name: 'inventoryProductType',
  initialState: {
    list: [],
    loading: false,
    paginationLoading: false,
    error: null,
    pagination: {
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 1,
    },
    lastQuery: normalizeListParams(),
    hasMore: true,
  },
  reducers: {
    clearError: state => {
      state.error = null;
    },
  },
  extraReducers: builder => {
    builder
      .addCase(getProductTypesAction.pending, (state, { meta }) => {
        const requestParams = normalizeListParams(meta.arg);
        if (meta.arg?.requestPage > 1) {
          state.paginationLoading = true; // ← load more
        } else {
          state.loading = true; // ← first load / search / filter
        }
        state.error = null;
        state.lastQuery = requestParams;
      })
      .addCase(getProductTypesAction.fulfilled, (state, { payload }) => {
        if (!isSameQuery(payload.requestParams, state.lastQuery)) {
          return;
        }

        state.loading = false;
        state.paginationLoading = false;
        const newData = payload.data || [];
        const pg = payload.pagination;

        if (payload.requestPage > 1) {
          // Pagination — append
          state.list = [...state.list, ...newData];
        } else {
          // Fresh load / search / filter — replace
          state.list = newData;
        }

        state.pagination = {
          page: Number(pg?.page) || 1,
          limit: Number(pg?.limit) || 10,
          total: pg?.total || 0,
          totalPages: pg?.totalPages || 1,
        };

        // அடுத்த page இருக்கா?
        state.hasMore = Number(pg?.page) < (pg?.totalPages || 1);
      })
      .addCase(getProductTypesAction.rejected, (state, { payload, meta }) => {
        if (!isSameQuery(normalizeListParams(meta.arg), state.lastQuery)) {
          return;
        }

        state.loading = false;
        state.paginationLoading = false;
        state.error = payload;
      })

      .addCase(addProductTypeAction.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addProductTypeAction.fulfilled, (state, { payload }) => {
        state.loading = false;
        if (payload.data) state.list.push(payload.data);
      })
      .addCase(addProductTypeAction.rejected, (state, { payload }) => {
        state.loading = false;
        state.error = payload;
      })

      .addCase(updateProductTypeAction.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateProductTypeAction.fulfilled, (state, { payload }) => {
        state.loading = false;
        const idx = state.list.findIndex(i => i.id === payload.data?.id);
        if (idx !== -1) state.list[idx] = payload.data;
      })
      .addCase(updateProductTypeAction.rejected, (state, { payload }) => {
        state.loading = false;
        state.error = payload;
      })

      .addCase(deleteProductTypeAction.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteProductTypeAction.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.list = state.list.filter(i => i.id !== payload.id);
        const currentPage = Number(state.pagination.page) || 1;
        const currentLimit = Number(state.pagination.limit) || 10;
        const nextTotal = Math.max(
          0,
          (Number(state.pagination.total) || 0) - 1,
        );
        const nextTotalPages = Math.max(1, Math.ceil(nextTotal / currentLimit));

        state.pagination = {
          ...state.pagination,
          page: Math.min(currentPage, nextTotalPages),
          total: nextTotal,
          totalPages: nextTotalPages,
        };
        state.hasMore = state.pagination.page < nextTotalPages;
      })
      .addCase(deleteProductTypeAction.rejected, (state, { payload }) => {
        state.loading = false;
        state.error = payload;
      })
      .addCase(toggleProductTypeStatusAction.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        toggleProductTypeStatusAction.fulfilled,
        (state, { payload }) => {
          state.loading = false;
          const updatedItem = payload.data;
          const item = state.list.find(i => i.id === payload.id);
          if (item && updatedItem) {
            Object.assign(item, updatedItem);
            return;
          }

          if (item) {
            item.status = payload.status;
          }
        },
      )
      .addCase(toggleProductTypeStatusAction.rejected, (state, { payload }) => {
        state.loading = false;
        state.error = payload;
      });
  },
});

export const { clearError } = inventoryProductTypeSlice.actions;
export default inventoryProductTypeSlice.reducer;
