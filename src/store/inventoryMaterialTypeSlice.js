import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import { URL_INVENTORY_MATERIAL_TYPE } from '../config/env';
import getAuthToken from '../utils/getAuthToken';

const mergeUniqueById = (existingItems = [], nextItems = []) => {
  const nextItemsById = new Map(
    nextItems.map(item => [String(item?.id ?? ''), item]),
  );
  const seenIds = new Set();

  const merged = existingItems.map(item => {
    const itemId = String(item?.id ?? '');
    seenIds.add(itemId);
    return nextItemsById.get(itemId) || item;
  });

  nextItems.forEach(item => {
    const itemId = String(item?.id ?? '');
    if (!seenIds.has(itemId)) {
      seenIds.add(itemId);
      merged.push(item);
    }
  });

  return merged;
};

export const getMaterialTypesAction = createAsyncThunk(
  'inventoryMaterialType/getAll',
  async (params = {}, { getState, rejectWithValue }) => {
    try {
      const token = await getAuthToken(getState);
      const res = await axios.get(URL_INVENTORY_MATERIAL_TYPE, {
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
      console.log('GET MATERIAL TYPES - Response:', res.data);
      return { ...res.data, requestPage: params.page || 1 };
    } catch (e) {
      console.log('GET MATERIAL TYPES - Error:', e.response?.data || e.message);
      return rejectWithValue(e.response?.data || e.message);
    }
  },
);

export const addMaterialTypeAction = createAsyncThunk(
  'inventoryMaterialType/add',
  async (payload, { getState, rejectWithValue }) => {
    try {
      const token = await getAuthToken(getState);
      const res = await axios.post(URL_INVENTORY_MATERIAL_TYPE, payload, {
        headers: {
          'Content-Type': 'application/json',
          accept: '*/*',
          Authorization: token,
        },
      });
      console.log('ADD MATERIAL TYPE - Response:', res.data);
      return res.data;
    } catch (e) {
      console.log('ADD MATERIAL TYPE - Error:', e.response?.data || e.message);
      return rejectWithValue(e.response?.data || e.message);
    }
  },
);

export const updateMaterialTypeAction = createAsyncThunk(
  'inventoryMaterialType/update',
  async ({ id, payload }, { getState, rejectWithValue }) => {
    try {
      const token = await getAuthToken(getState);
      const res = await axios.put(
        `${URL_INVENTORY_MATERIAL_TYPE}/${id}`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            accept: '*/*',
            Authorization: token,
          },
        },
      );
      console.log('UPDATE MATERIAL TYPE - Response:', res.data);
      return res.data;
    } catch (e) {
      console.log(
        'UPDATE MATERIAL TYPE - Error:',
        e.response?.data || e.message,
      );
      return rejectWithValue(e.response?.data || e.message);
    }
  },
);

export const deleteMaterialTypeAction = createAsyncThunk(
  'inventoryMaterialType/delete',
  async (id, { getState, rejectWithValue }) => {
    try {
      const token = await getAuthToken(getState);
      const res = await axios.delete(`${URL_INVENTORY_MATERIAL_TYPE}/${id}`, {
        headers: { accept: '*/*', Authorization: token },
      });
      console.log('DELETE MATERIAL TYPE - Response:', res.data);
      return { ...res.data, id };
    } catch (e) {
      console.log(
        'DELETE MATERIAL TYPE - Error:',
        e.response?.data || e.message,
      );
      return rejectWithValue(e.response?.data || e.message);
    }
  },
);

export const toggleMaterialTypeStatusAction = createAsyncThunk(
  'inventoryMaterialType/toggleStatus',
  async ({ id, status }, { getState, rejectWithValue }) => {
    try {
      const token = await getAuthToken(getState);

      await axios.patch(
        `${URL_INVENTORY_MATERIAL_TYPE}/${id}/status`,
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

const inventoryMaterialTypeSlice = createSlice({
  name: 'inventoryMaterialType',
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
      .addCase(getMaterialTypesAction.pending, (state, { meta }) => {
        if (meta.arg?.requestPage > 1) {
          state.paginationLoading = true;
        } else {
          state.loading = true;
        }
        state.error = null;
      })
      .addCase(getMaterialTypesAction.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.paginationLoading = false;

        const newData = payload.data || [];
        const pg = payload.pagination;

        if (payload.requestPage > 1) {
          state.list = mergeUniqueById(state.list, newData);
        } else {
          state.list = newData;
        }

        state.pagination = {
          page: Number(pg?.page) || 1,
          limit: Number(pg?.limit) || 10,
          total: pg?.total || 0,
          totalPages: pg?.totalPages || 1,
        };
        state.hasMore = Number(pg?.page) < (pg?.totalPages || 1);
      })
      .addCase(getMaterialTypesAction.rejected, (state, { payload }) => {
        state.loading = false;
        state.paginationLoading = false;
        state.error = payload;
      })

      .addCase(addMaterialTypeAction.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addMaterialTypeAction.fulfilled, (state, { payload }) => {
        state.loading = false;
        if (payload.data) state.list.push(payload.data);
      })
      .addCase(addMaterialTypeAction.rejected, (state, { payload }) => {
        state.loading = false;
        state.error = payload;
      })

      .addCase(updateMaterialTypeAction.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateMaterialTypeAction.fulfilled, (state, { payload }) => {
        state.loading = false;
        const idx = state.list.findIndex(i => i.id === payload.data?.id);
        if (idx !== -1) state.list[idx] = payload.data;
      })
      .addCase(updateMaterialTypeAction.rejected, (state, { payload }) => {
        state.loading = false;
        state.error = payload;
      })

      .addCase(deleteMaterialTypeAction.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteMaterialTypeAction.fulfilled, (state, { payload }) => {
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
      .addCase(deleteMaterialTypeAction.rejected, (state, { payload }) => {
        state.loading = false;
        state.error = payload;
      })
      .addCase(toggleMaterialTypeStatusAction.fulfilled, () => {});
  },
});

export const { clearError } = inventoryMaterialTypeSlice.actions;
export default inventoryMaterialTypeSlice.reducer;
