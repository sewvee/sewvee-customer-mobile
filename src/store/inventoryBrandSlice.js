import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import { URL_INVENTORY_BRAND } from '../config/env';
import getAuthToken from '../utils/getAuthToken'; // ← இது மட்டும் import

// ─── GET ALL ─────────────────────────────────────────────────────
export const getBrandsAction = createAsyncThunk(
  'inventoryBrand/getAll',
  async (params = {}, { getState, rejectWithValue }) => {
    try {
      const token = await getAuthToken(getState); // ← one line
      const res = await axios.get(URL_INVENTORY_BRAND, {
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
      console.log('GET BRANDS - Response:', res.data);
      return { ...res.data, requestPage: params.page || 1 };
    } catch (e) {
      console.log('GET BRANDS - Error:', e.response?.data || e.message);
      return rejectWithValue(e.response?.data || e.message);
    }
  },
);

// ─── ADD ─────────────────────────────────────────────────────────
export const addBrandAction = createAsyncThunk(
  'inventoryBrand/add',
  async (payload, { getState, rejectWithValue }) => {
    try {
      const token = await getAuthToken(getState);
      const res = await axios.post(URL_INVENTORY_BRAND, payload, {
        headers: {
          'Content-Type': 'application/json',
          accept: '*/*',
          Authorization: token,
        },
      });
      console.log('ADD BRAND - Response:', res.data);
      return res.data;
    } catch (e) {
      console.log('ADD BRAND - Error:', e.response?.data || e.message);
      return rejectWithValue(e.response?.data || e.message);
    }
  },
);

// ─── UPDATE ──────────────────────────────────────────────────────
export const updateBrandAction = createAsyncThunk(
  'inventoryBrand/update',
  async ({ id, payload }, { getState, rejectWithValue }) => {
    try {
      const token = await getAuthToken(getState);
      const res = await axios.put(`${URL_INVENTORY_BRAND}/${id}`, payload, {
        headers: {
          'Content-Type': 'application/json',
          accept: '*/*',
          Authorization: token,
        },
      });
      console.log('UPDATE BRAND - Response:', res.data);
      return res.data;
    } catch (e) {
      console.log('UPDATE BRAND - Error:', e.response?.data || e.message);
      return rejectWithValue(e.response?.data || e.message);
    }
  },
);

// ─── DELETE ──────────────────────────────────────────────────────
export const deleteBrandAction = createAsyncThunk(
  'inventoryBrand/delete',
  async (id, { getState, rejectWithValue }) => {
    try {
      const token = await getAuthToken(getState);
      const res = await axios.delete(`${URL_INVENTORY_BRAND}/${id}`, {
        headers: { accept: '*/*', Authorization: token },
      });
      console.log('DELETE BRAND - Response:', res.data);
      return { ...res.data, id };
    } catch (e) {
      console.log('DELETE BRAND - Error:', e.response?.data || e.message);
      return rejectWithValue(e.response?.data || e.message);
    }
  },
);

//active inactive toggle
export const toggleBrandStatusAction = createAsyncThunk(
  'inventoryBrand/toggleStatus',
  async ({ id, status }, { getState, rejectWithValue }) => {
    try {
      const token = await getAuthToken(getState);

      const res = await axios.patch(
        `${URL_INVENTORY_BRAND}/${id}/status`,
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
const inventoryBrandSlice = createSlice({
  name: 'inventoryBrand',
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
      .addCase(getBrandsAction.pending,(state, { meta }) => {
        if (meta.arg?.requestPage > 1) {
          state.paginationLoading = true; // ← load more
        } else {
          state.loading = true; // ← first load / search / filter
        }
        state.error = null;
      })
      .addCase(getBrandsAction.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.paginationLoading = false;
        const newData = payload.data || [];
        const pg = payload.pagination;
        const currentPage = Number(pg?.page) || Number(payload.requestPage) || 1;
        const limit = Number(pg?.limit) || 10;
        const total = Number(pg?.total) || 0;
        const totalPages =
          Number(pg?.totalPages) || Math.max(1, Math.ceil(total / limit));

        if (payload.requestPage > 1) {
          const seen = new Set(state.list.map(item => `${item?.id}`));
          state.list = [
            ...state.list,
            ...newData.filter(item => !seen.has(`${item?.id}`)),
          ];
        } else {
          state.list = newData;
        }

        state.pagination = {
          page: currentPage,
          limit,
          total,
          totalPages,
        };

        state.hasMore = currentPage < totalPages;
      })
      .addCase(getBrandsAction.rejected, (state, { payload }) => {
        state.loading = false;
         state.paginationLoading = false;
        state.error = payload;
      })

      .addCase(addBrandAction.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addBrandAction.fulfilled, (state, { payload }) => {
        state.loading = false;
        if (payload.data) state.list.push(payload.data);
      })
      .addCase(addBrandAction.rejected, (state, { payload }) => {
        state.loading = false;
        state.error = payload;
      })

      .addCase(updateBrandAction.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateBrandAction.fulfilled, (state, { payload }) => {
        state.loading = false;
        const idx = state.list.findIndex(i => i.id === payload.data?.id);
        if (idx !== -1) state.list[idx] = payload.data;
      })
      .addCase(updateBrandAction.rejected, (state, { payload }) => {
        state.loading = false;
        state.error = payload;
      })

      .addCase(deleteBrandAction.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteBrandAction.fulfilled, (state, { payload }) => {
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
      .addCase(deleteBrandAction.rejected, (state, { payload }) => {
        state.loading = false;
        state.error = payload;
      })
      .addCase(
        toggleBrandStatusAction.fulfilled,
        (state, { payload }) => {
          const item = state.list.find(i => i.id === payload.id);
          if (item) {
            item.status = payload.status; // ← optimistic update
          }
        },
      );
  },
});

export const { clearError } = inventoryBrandSlice.actions;
export default inventoryBrandSlice.reducer;
