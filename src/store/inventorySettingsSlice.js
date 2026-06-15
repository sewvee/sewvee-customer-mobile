import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import getAuthToken from '../utils/getAuthToken';

const URL_INVENTORY_MASTER =
  'https://api.sewvee.com/mobile/inventory/settings/master';

// ─── GET ─────────────────────────────────────────────────────────
export const getInventoryMasterAction = createAsyncThunk(
  'inventorySettings/getMaster',
  async (_, { getState, rejectWithValue }) => {
    try {
      const token = await getAuthToken(getState);
      const res = await axios.get(URL_INVENTORY_MASTER, {
        headers: { accept: '*/*', Authorization: token },
      });
      console.log('GET INVENTORY MASTER:', res.data);
      return res.data;
    } catch (e) {
      console.log(
        'GET INVENTORY MASTER - Error:',
        e.response?.data || e.message,
      );
      return rejectWithValue(e.response?.data || e.message);
    }
  },
);

// ─── PUT ─────────────────────────────────────────────────────────
export const updateInventoryMasterAction = createAsyncThunk(
  'inventorySettings/updateMaster',
  async (payload, { getState, rejectWithValue }) => {
    try {
      const token = await getAuthToken(getState);
      const res = await axios.put(URL_INVENTORY_MASTER, payload, {
        headers: {
          'Content-Type': 'application/json',
          accept: '*/*',
          Authorization: token,
        },
      });
      console.log('UPDATE INVENTORY MASTER:', res.data);
      return res.data;
    } catch (e) {
      console.log(
        'UPDATE INVENTORY MASTER - Error:',
        e.response?.data || e.message,
      );
      return rejectWithValue(e.response?.data || e.message);
    }
  },
);

const inventorySettingsSlice = createSlice({
  name: 'inventorySettings',
  initialState: {
    master: null,
    loading: false,
    updateLoading: false,
    error: null,
  },
  reducers: {
    clearError: state => {
      state.error = null;
    },
  },
  extraReducers: builder => {
    builder
      .addCase(getInventoryMasterAction.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getInventoryMasterAction.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.master = payload.data;
      })
      .addCase(getInventoryMasterAction.rejected, (state, { payload }) => {
        state.loading = false;
        state.error = payload;
      })

      .addCase(updateInventoryMasterAction.pending, state => {
        state.updateLoading = true;
        state.error = null;
      })
      .addCase(updateInventoryMasterAction.fulfilled, (state, { payload }) => {
        state.updateLoading = false;
        state.master = payload.data; // ← updated data replace
      })
      .addCase(updateInventoryMasterAction.rejected, (state, { payload }) => {
        state.updateLoading = false;
        state.error = payload;
      });
  },
});

export const { clearError } = inventorySettingsSlice.actions;
export default inventorySettingsSlice.reducer;
