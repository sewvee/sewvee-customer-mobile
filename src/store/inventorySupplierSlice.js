import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import { URL_INVENTORY_SUPPLIER } from '../config/env';
import getAuthToken from '../utils/getAuthToken'; // ← இது மட்டும் import

// ─── GET ALL ─────────────────────────────────────────────────────
export const getSuppliersAction = createAsyncThunk(
  'inventorySupplier/getAll',
  async (params = {}, { getState, rejectWithValue }) => {
    try {
      const token = await getAuthToken(getState); // ← one line
      const res = await axios.get(URL_INVENTORY_SUPPLIER, {
        headers: { accept: '*/*', Authorization: token },
        params: {
          page: params.page || 1,
          limit: params.limit || 10,
          ...(params.search ? { search: params.search } : {}),
          ...(params.status !== undefined && params.status !== ''
            ? { status: params.status }
            : {}),
        },
      });
      console.log('GET SUPPLIERS - Response:', res.data);
      return { ...res.data, requestPage: params.page || 1 };
    } catch (e) {
      console.log('GET SUPPLIERS - Error:', e.response?.data || e.message);
      return rejectWithValue(e.response?.data || e.message);
    }
  },
);

// ─── ADD ─────────────────────────────────────────────────────────
export const addSupplierAction = createAsyncThunk(
  'inventorySupplier/add',
  async (payload, { getState, rejectWithValue }) => {
    try {
      const token = await getAuthToken(getState);
      const res = await axios.post(URL_INVENTORY_SUPPLIER, payload, {
        headers: {
          'Content-Type': 'application/json',
          accept: '*/*',
          Authorization: token,
        },
      });
      console.log('ADD SUPPLIER - Response:', res.data);
      return res.data;
    } catch (e) {
      console.log('ADD SUPPLIER - Error:', e.response?.data || e.message);
      return rejectWithValue(e.response?.data || e.message);
    }
  },
);

// ─── UPDATE ──────────────────────────────────────────────────────
export const updateSupplierAction = createAsyncThunk(
  'inventorySupplier/update',
  async ({ id, payload }, { getState, rejectWithValue }) => {
    try {
      const token = await getAuthToken(getState);
      const res = await axios.put(`${URL_INVENTORY_SUPPLIER}/${id}`, payload, {
        headers: {
          'Content-Type': 'application/json',
          accept: '*/*',
          Authorization: token,
        },
      });
      console.log('UPDATE SUPPLIER - Response:', res.data);
      return res.data;
    } catch (e) {
      console.log('UPDATE SUPPLIER - Error:', e.response?.data || e.message);
      return rejectWithValue(e.response?.data || e.message);
    }
  },
);

// ─── DELETE ──────────────────────────────────────────────────────
export const deleteSupplierAction = createAsyncThunk(
  'inventorySupplier/delete',
  async (id, { getState, rejectWithValue }) => {
    try {
      const token = await getAuthToken(getState);
      const res = await axios.delete(`${URL_INVENTORY_SUPPLIER}/${id}`, {
        headers: { accept: '*/*', Authorization: token },
      });
      console.log('DELETE SUPPLIER - Response:', res.data);
      return { ...res.data, id };
    } catch (e) {
      console.log('DELETE SUPPLIER - Error:', e.response?.data || e.message);
      return rejectWithValue(e.response?.data || e.message);
    }
  },
);

//active inactive toggle
export const toggleSupplierStatusAction = createAsyncThunk(
  'inventorySupplier/toggleStatus',
  async ({ id, status }, { getState, rejectWithValue }) => {
    try {
      const token = await getAuthToken(getState);

      const res = await axios.patch(
        `${URL_INVENTORY_SUPPLIER}/${id}/status`,
        { status },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: token,
          },
        },
      );

      return { id, status };
    } catch (e) {
      return rejectWithValue(e.response?.data || e.message);
    }
  },
);

// ─── SLICE ───────────────────────────────────────────────────────
const inventorySupplierSlice = createSlice({
  name: 'inventorySupplier',
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
    hasMore: true,
  },
  reducers: {
    clearError: state => {
      state.error = null;
    },
  },
  extraReducers: builder => {
    builder
      .addCase(getSuppliersAction.pending, (state, { meta }) => {
        if (meta.arg?.requestPage > 1) {
          state.paginationLoading = true; // ← load more
        } else {
          state.loading = true; // ← first load / search / filter
        }
        state.error = null;
      })
      .addCase(getSuppliersAction.fulfilled, (state, { payload }) => {
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
      .addCase(getSuppliersAction.rejected, (state, { payload }) => {
        state.loading = false;
        state.paginationLoading = false;
        state.error = payload;
      })

      .addCase(addSupplierAction.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addSupplierAction.fulfilled, (state, { payload }) => {
        state.loading = false;
        if (payload.data) state.list.push(payload.data);
      })
      .addCase(addSupplierAction.rejected, (state, { payload }) => {
        state.loading = false;
        state.error = payload;
      })

      .addCase(updateSupplierAction.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateSupplierAction.fulfilled, (state, { payload }) => {
        state.loading = false;
        const idx = state.list.findIndex(i => i.id === payload.data?.id);
        if (idx !== -1) state.list[idx] = payload.data;
      })
      .addCase(updateSupplierAction.rejected, (state, { payload }) => {
        state.loading = false;
        state.error = payload;
      })

      .addCase(deleteSupplierAction.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteSupplierAction.fulfilled, (state, { payload }) => {
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
      .addCase(deleteSupplierAction.rejected, (state, { payload }) => {
        state.loading = false;
        state.error = payload;
      })
      .addCase(toggleSupplierStatusAction.fulfilled, (state, { payload }) => {
        const item = state.list.find(i => i.id === payload.id);
        if (item) {
          item.status = payload.status; // ← optimistic update
        }
      });
  },
});

export const { clearError } = inventorySupplierSlice.actions;
export default inventorySupplierSlice.reducer;
