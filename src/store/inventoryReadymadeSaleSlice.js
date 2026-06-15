import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const BASE = '/inventory/settings/material-type';

// ─── GET ALL ──────────────────────────────────────────────────────
export const getReadymadeSalesAction = createAsyncThunk(
  'inventoryReadymadeSale/getAll',
  async (_, { rejectWithValue }) => {
    try {
      const res = await axios.get(BASE);
      console.log('GET READYMADE SALES - Response:', res.data);
      return res.data;
    } catch (e) {
      console.log('GET READYMADE SALES - Error:', e.response?.data || e.message);
      return rejectWithValue(e.response?.data || e.message);
    }
  },
);

// ─── ADD ──────────────────────────────────────────────────────────
export const addReadymadeSaleAction = createAsyncThunk(
  'inventoryReadymadeSale/add',
  async (payload, { rejectWithValue }) => {
    try {
      // payload = { name: "Cotton" }
      const res = await axios.post(BASE, payload);
      console.log('ADD READYMADE SALE - Response:', res.data);
      return res.data;
    } catch (e) {
      console.log('ADD READYMADE SALE - Error:', e.response?.data || e.message);
      return rejectWithValue(e.response?.data || e.message);
    }
  },
);

// ─── UPDATE ───────────────────────────────────────────────────────
export const updateReadymadeSaleAction = createAsyncThunk(
  'inventoryReadymadeSale/update',
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      // payload = { name: "Silk" }
      const res = await axios.put(`${BASE}/${id}`, payload);
      console.log('UPDATE READYMADE SALE - Response:', res.data);
      return res.data;
    } catch (e) {
      console.log(
        'UPDATE READYMADE SALE - Error:',
        e.response?.data || e.message,
      );
      return rejectWithValue(e.response?.data || e.message);
    }
  },
);

// ─── DELETE ───────────────────────────────────────────────────────
export const deleteReadymadeSaleAction = createAsyncThunk(
  'inventoryReadymadeSale/delete',
  async (id, { rejectWithValue }) => {
    try {
      const res = await axios.delete(`${BASE}/${id}`);
      console.log('DELETE READYMADE SALE - Response:', res.data);
      return { ...res.data, id }; // id திரும்ப pass பண்றோம் list-லிருந்து remove பண்ண
    } catch (e) {
      console.log(
        'DELETE READYMADE SALE - Error:',
        e.response?.data || e.message,
      );
      return rejectWithValue(e.response?.data || e.message);
    }
  },
);

// ─── SLICE ────────────────────────────────────────────────────────
const inventoryReadymadeSaleSlice = createSlice({
  name: 'inventoryReadymadeSale',
  initialState: {
    list: [],
    loading: false,
    error: null,
  },
  reducers: {
    clearError: state => {
      state.error = null;
    },
  },
  extraReducers: builder => {
    builder
      // GET
      .addCase(getReadymadeSalesAction.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getReadymadeSalesAction.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.list = payload.data || [];
      })
      .addCase(getReadymadeSalesAction.rejected, (state, { payload }) => {
        state.loading = false;
        state.error = payload;
      })

      // ADD
      .addCase(addReadymadeSaleAction.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addReadymadeSaleAction.fulfilled, (state, { payload }) => {
        state.loading = false;
        if (payload.data) state.list.push(payload.data); // List-ல direct add
      })
      .addCase(addReadymadeSaleAction.rejected, (state, { payload }) => {
        state.loading = false;
        state.error = payload;
      })

      // UPDATE
      .addCase(updateReadymadeSaleAction.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateReadymadeSaleAction.fulfilled, (state, { payload }) => {
        state.loading = false;
        const idx = state.list.findIndex(item => item.id === payload.data?.id);
        if (idx !== -1) state.list[idx] = payload.data; // List-ல in-place update
      })
      .addCase(updateReadymadeSaleAction.rejected, (state, { payload }) => {
        state.loading = false;
        state.error = payload;
      })

      // DELETE
      .addCase(deleteReadymadeSaleAction.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteReadymadeSaleAction.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.list = state.list.filter(item => item.id !== payload.id); // List-லிருந்து remove
      })
      .addCase(deleteReadymadeSaleAction.rejected, (state, { payload }) => {
        state.loading = false;
        state.error = payload;
      });
  },
});

export const { clearError } = inventoryReadymadeSaleSlice.actions;
export default inventoryReadymadeSaleSlice.reducer;
