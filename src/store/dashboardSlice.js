import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import { URL_DASHBOARD_INSIGHTS } from '../config/env';
import AsyncStorage from '@react-native-async-storage/async-storage';

const getAuthToken = async (getState) => {
    const authState = getState().auth;
    const user = authState.user;

    let token =
        user?.token ||
        user?.data?.token ||
        user?.accessToken ||
        user?.data?.accessToken ||
        user?.access_token ||
        user?.data?.access_token ||
        user?.jwt ||
        user?.data?.jwt;

    if (!token) {
        token = await AsyncStorage.getItem('userToken');
    }

    return token ? (token.startsWith('Bearer ') ? token : `Bearer ${token}`) : '';
};

export const fetchDashboardInsights = createAsyncThunk(
    'dashboard/fetchInsights',
    async (params, { getState, rejectWithValue }) => {
        try {
            const token = await getAuthToken(getState);
            const response = await axios.get(URL_DASHBOARD_INSIGHTS, {
                headers: {
                    accept: '*/*',
                    Authorization: token,
                },
                params, // type, quick, from_date, to_date
            });

            if (response.data && response.data.success === false) {
                return rejectWithValue(response.data);
            }

            console.log('fetchDashboardInsights SUCCESS:', response.data);
            return response.data;
        } catch (error) {
            console.warn('fetchDashboardInsights ERROR:', error.response?.data || error.message);
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

const dashboardSlice = createSlice({
    name: 'dashboard',
    initialState: {
        insights: null,
        loading: false,
        error: null,
    },
    reducers: {
        resetDashboardInsights: (state) => {
            state.insights = null;
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchDashboardInsights.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchDashboardInsights.fulfilled, (state, action) => {
                state.loading = false;
                state.insights = action.payload?.data || null;
            })
            .addCase(fetchDashboardInsights.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });
    },
});

export const { resetDashboardInsights } = dashboardSlice.actions;
export default dashboardSlice.reducer;
