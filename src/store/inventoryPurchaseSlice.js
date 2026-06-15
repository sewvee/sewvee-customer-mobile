import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import { URL_INVENTORY_PURCHASE } from '../config/env';
import getAuthToken from '../utils/getAuthToken';

export const getPurchasesAction = createAsyncThunk(
  'inventoryPurchase/getAll',
  async (params = {}, { getState, rejectWithValue }) => {
    try {
      const token = await getAuthToken(getState);
      const page = Number(params.page) || 1;
      const limit = Number(params.limit) || 10;
      const res = await axios.get(URL_INVENTORY_PURCHASE, {
        headers: { accept: '*/*', Authorization: token },
        params: {
          page,
          limit,
          ...(params.search ? { search: params.search } : {}),
          ...(params.status !== undefined && params.status !== ''
            ? { status: params.status }
            : {}),
          ...(params.sort_by ? { sort_by: params.sort_by } : {}),
          ...(params.sort_order ? { sort_order: params.sort_order } : {}),
          ...(params.supplier_id ? { supplier_id: params.supplier_id } : {}),
        },
      });
      return { ...res.data, requestPage: page };
    } catch (e) {
      return rejectWithValue(e.response?.data || e.message);
    }
  },
);

export const addPurchaseAction = createAsyncThunk(
  'inventoryPurchase/add',
  async (payload, { getState, rejectWithValue }) => {
    try {
      const token = await getAuthToken(getState);
      const res = await axios.post(URL_INVENTORY_PURCHASE, payload, {
        headers: {
          'Content-Type': 'application/json',
          accept: '*/*',
          Authorization: token,
        },
      });
      return res.data;
    } catch (e) {
      return rejectWithValue(e.response?.data || e.message);
    }
  },
);

export const getPurchaseByIdAction = createAsyncThunk(
  'inventoryPurchase/getById',
  async (id, { getState, rejectWithValue }) => {
    try {
      const token = await getAuthToken(getState);
      const res = await axios.get(`${URL_INVENTORY_PURCHASE}/${id}`, {
        headers: {
          accept: '*/*',
          Authorization: token,
        },
      });
      return res.data;
    } catch (e) {
      return rejectWithValue(e.response?.data || e.message);
    }
  },
);

export const updatePurchaseAction = createAsyncThunk(
  'inventoryPurchase/update',
  async ({ id, payload }, { getState, rejectWithValue }) => {
    try {
      const token = await getAuthToken(getState);
      const res = await axios.put(`${URL_INVENTORY_PURCHASE}/${id}`, payload, {
        headers: {
          'Content-Type': 'application/json',
          accept: '*/*',
          Authorization: token,
        },
      });
      return res.data;
    } catch (e) {
      return rejectWithValue(e.response?.data || e.message);
    }
  },
);

export const deletePurchaseAction = createAsyncThunk(
  'inventoryPurchase/delete',
  async (id, { getState, rejectWithValue }) => {
    try {
      const token = await getAuthToken(getState);
      const res = await axios.delete(`${URL_INVENTORY_PURCHASE}/${id}`, {
        headers: {
          accept: '*/*',
          Authorization: token,
        },
      });
      return { ...res.data, id };
    } catch (e) {
      return rejectWithValue(e.response?.data || e.message);
    }
  },
);

const isPurchaseItemUsed = item => {
  const usedValue = item?.isUsed ?? item?.is_used;

  return (
    usedValue === true ||
    usedValue === 1 ||
    String(usedValue || '').toLowerCase() === 'true' ||
    String(usedValue || '').toLowerCase() === '1' ||
    String(usedValue || '').toLowerCase() === 'active'
  );
};

const hasUsedPurchaseItems = items => (items || []).some(isPurchaseItemUsed);

const shouldPreventPurchaseDelete = payload =>
  hasUsedPurchaseItems(payload?.data?.items || payload?.items);

const inventoryPurchaseSlice = createSlice({
  name: 'inventoryPurchase',
  initialState: {
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
    hasMore: true,
  },
  reducers: {
    clearError: state => {
      state.error = null;
    },
  },
  extraReducers: builder => {
    builder
      .addCase(getPurchasesAction.pending, (state, { meta }) => {
        if ((meta.arg?.page || 1) > 1) {
          state.paginationLoading = true;
        } else {
          state.loading = true;
        }
        state.error = null;
      })
      .addCase(getPurchasesAction.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.paginationLoading = false;

        const nextData = payload.data || [];
        const requestPage = Number(payload.requestPage) || 1;
        const nextPagination = payload.pagination || {};

        if (requestPage > 1) {
          const merged = [...state.list, ...nextData];
          const uniqueById = [];
          const seenIds = new Set();

          merged.forEach(item => {
            const itemId = String(item?.id ?? '');
            if (!seenIds.has(itemId)) {
              seenIds.add(itemId);
              uniqueById.push(item);
            }
          });

          state.list = uniqueById;
        } else {
          state.list = nextData;
        }

        state.pagination = {
          page: Number(nextPagination?.page) || requestPage,
          limit: Number(nextPagination?.limit) || 10,
          total: Number(nextPagination?.total) || 0,
          totalPages: Number(nextPagination?.totalPages) || 1,
        };
        state.hasMore =
          (Number(nextPagination?.page) || requestPage) <
          (Number(nextPagination?.totalPages) || 1);
      })
      .addCase(getPurchasesAction.rejected, (state, { payload }) => {
        state.loading = false;
        state.paginationLoading = false;
        state.error = payload;
      })

      .addCase(getPurchaseByIdAction.pending, state => {
        state.detailLoading = true;
        state.error = null;
      })
      .addCase(getPurchaseByIdAction.fulfilled, (state, { payload }) => {
        state.detailLoading = false;
        state.currentItem = payload.data || null;
      })
      .addCase(getPurchaseByIdAction.rejected, (state, { payload }) => {
        state.detailLoading = false;
        state.error = payload;
      })

      .addCase(addPurchaseAction.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addPurchaseAction.fulfilled, (state, { payload }) => {
        state.loading = false;
        if (payload.data) {
          state.list.unshift(payload.data);
          state.pagination.total += 1;
        }
      })
      .addCase(addPurchaseAction.rejected, (state, { payload }) => {
        state.loading = false;
        state.error = payload;
      })

      .addCase(updatePurchaseAction.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updatePurchaseAction.fulfilled, (state, { payload }) => {
        state.loading = false;
        const idx = state.list.findIndex(i => i.id === payload.data?.id);
        if (idx !== -1) state.list[idx] = payload.data;
      })
      .addCase(updatePurchaseAction.rejected, (state, { payload }) => {
        state.loading = false;
        state.error = payload;
      })

      .addCase(deletePurchaseAction.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deletePurchaseAction.fulfilled, (state, { payload }) => {
        state.loading = false;
        if (shouldPreventPurchaseDelete(payload)) {
          state.error =
            payload?.message ||
            'This purchase contains items that are already used, so it cannot be deleted.';
          return;
        }
        state.list = state.list.filter(item => item.id !== payload.id);
        state.pagination.total = Math.max(0, (state.pagination.total || 0) - 1);
        if (state.currentItem?.id === payload.id) {
          state.currentItem = null;
        }
      })
      .addCase(deletePurchaseAction.rejected, (state, { payload }) => {
        state.loading = false;
        state.error = payload;
      });
  },
});

export const { clearError } = inventoryPurchaseSlice.actions;
export default inventoryPurchaseSlice.reducer;
