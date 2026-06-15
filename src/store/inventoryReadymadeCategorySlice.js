import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import { URL_INVENTORY_READYMADE_CATEGORY } from '../config/env';
import getAuthToken from '../utils/getAuthToken'; // ← இது மட்டும் import

// ─── GET ALL ─────────────────────────────────────────────────────
export const getReadymadeCategoriesAction = createAsyncThunk(
  'inventoryReadymadeCategory/getAll',
  async (params = {}, { getState, rejectWithValue }) => {
    try {
      const token = await getAuthToken(getState); // ← one line
      const res = await axios.get(URL_INVENTORY_READYMADE_CATEGORY, {
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
      console.log('GET READYMADE CATEGORIES - Response:', res.data);
      return { ...res.data, requestPage: params.page || 1 };
    } catch (e) {
      console.log(
        'GET READYMADE CATEGORIES - Error:',
        e.response?.data || e.message,
      );
      return rejectWithValue(e.response?.data || e.message);
    }
  },
);

// ─── ADD ─────────────────────────────────────────────────────────
export const addReadymadeCategoryAction = createAsyncThunk(
  'inventoryReadymadeCategory/add',
  async (payload, { getState, rejectWithValue }) => {
    try {
      const token = await getAuthToken(getState);
      const res = await axios.post(URL_INVENTORY_READYMADE_CATEGORY, payload, {
        headers: {
          'Content-Type': 'application/json',
          accept: '*/*',
          Authorization: token,
        },
      });
      console.log('ADD READYMADE CATEGORY - Response:', res.data);
      return res.data;
    } catch (e) {
      console.log(
        'ADD READYMADE CATEGORY - Error:',
        e.response?.data || e.message,
      );
      return rejectWithValue(e.response?.data || e.message);
    }
  },
);

// ─── UPDATE ──────────────────────────────────────────────────────
export const updateReadymadeCategoryAction = createAsyncThunk(
  'inventoryReadymadeCategory/update',
  async ({ id, payload }, { getState, rejectWithValue }) => {
    try {
      const token = await getAuthToken(getState);
      const res = await axios.put(
        `${URL_INVENTORY_READYMADE_CATEGORY}/${id}`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            accept: '*/*',
            Authorization: token,
          },
        },
      );
      console.log('UPDATE READYMADE CATEGORY - Response:', res.data);
      return res.data;
    } catch (e) {
      console.log(
        'UPDATE READYMADE CATEGORY - Error:',
        e.response?.data || e.message,
      );
      return rejectWithValue(e.response?.data || e.message);
    }
  },
);

// ─── DELETE ──────────────────────────────────────────────────────
export const deleteReadymadeCategoryAction = createAsyncThunk(
  'inventoryReadymadeCategory/delete',
  async (id, { getState, rejectWithValue }) => {
    try {
      const token = await getAuthToken(getState);
      const res = await axios.delete(
        `${URL_INVENTORY_READYMADE_CATEGORY}/${id}`,
        {
          headers: { accept: '*/*', Authorization: token },
        },
      );
      console.log('DELETE READYMADE CATEGORY - Response:', res.data);
      return { ...res.data, id };
    } catch (e) {
      console.log(
        'DELETE READYMADE CATEGORY - Error:',
        e.response?.data || e.message,
      );
      return rejectWithValue(e.response?.data || e.message);
    }
  },
);

//active inactive toggle
export const toggleReadymadeCategoryStatusAction = createAsyncThunk(
  'inventoryReadymadeCategory/toggleStatus',
  async ({ id, status }, { getState, rejectWithValue }) => {
    try {
      const token = await getAuthToken(getState);

      const res = await axios.patch(
        `${URL_INVENTORY_READYMADE_CATEGORY}/${id}/status`,
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
const inventoryReadymadeCategorySlice = createSlice({
  name: 'inventoryReadymadeCategory',
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
      .addCase(getReadymadeCategoriesAction.pending, (state, { meta }) => {
        if (meta.arg?.requestPage > 1) {
          state.paginationLoading = true; // ← load more
        } else {
          state.loading = true; // ← first load / search / filter
        }
        state.error = null;
      })
      .addCase(getReadymadeCategoriesAction.fulfilled, (state, { payload }) => {
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
      .addCase(getReadymadeCategoriesAction.rejected, (state, { payload }) => {
        state.loading = false;
        state.paginationLoading = false;
        state.error = payload;
      })

      .addCase(addReadymadeCategoryAction.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addReadymadeCategoryAction.fulfilled, (state, { payload }) => {
        state.loading = false;
        if (payload.data) state.list.push(payload.data);
      })
      .addCase(addReadymadeCategoryAction.rejected, (state, { payload }) => {
        state.loading = false;
        state.error = payload;
      })

      .addCase(updateReadymadeCategoryAction.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        updateReadymadeCategoryAction.fulfilled,
        (state, { payload }) => {
          state.loading = false;
          const idx = state.list.findIndex(i => i.id === payload.data?.id);
          if (idx !== -1) state.list[idx] = payload.data;
        },
      )
      .addCase(updateReadymadeCategoryAction.rejected, (state, { payload }) => {
        state.loading = false;
        state.error = payload;
      })

      .addCase(deleteReadymadeCategoryAction.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        deleteReadymadeCategoryAction.fulfilled,
        (state, { payload }) => {
          state.loading = false;
          state.list = state.list.filter(i => i.id !== payload.id);
          const currentPage = Number(state.pagination.page) || 1;
          const currentLimit = Number(state.pagination.limit) || 10;
          const nextTotal = Math.max(
            0,
            (Number(state.pagination.total) || 0) - 1,
          );
          const nextTotalPages = Math.max(
            1,
            Math.ceil(nextTotal / currentLimit),
          );

          state.pagination = {
            ...state.pagination,
            page: Math.min(currentPage, nextTotalPages),
            total: nextTotal,
            totalPages: nextTotalPages,
          };
          state.hasMore = state.pagination.page < nextTotalPages;
        },
      )
      .addCase(deleteReadymadeCategoryAction.rejected, (state, { payload }) => {
        state.loading = false;
        state.error = payload;
      })
      .addCase(
        toggleReadymadeCategoryStatusAction.fulfilled,
        (state, { payload }) => {
          const item = state.list.find(i => i.id === payload.id);
          if (item) {
            item.status = payload.status; // ← optimistic update
          }
        },
      );
  },
});

export const { clearError } = inventoryReadymadeCategorySlice.actions;
export default inventoryReadymadeCategorySlice.reducer;
