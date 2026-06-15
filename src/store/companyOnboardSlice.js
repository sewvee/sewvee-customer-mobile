import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import { URL_COMPANY_ONBOARD } from '../config/env';

import AsyncStorage from '@react-native-async-storage/async-storage';

export const companyOnboardAction = createAsyncThunk(
    'companyOnboard/submit',
    async (onboardData, { getState, rejectWithValue }) => {
        try {
            // Take token from auth state or pass from external
            const authState = getState().auth;
            const user = authState.user;
            let token = user?.token || user?.data?.token || user?.accessToken || user?.data?.accessToken || user?.access_token || user?.data?.access_token || user?.jwt || user?.data?.jwt;
            if (!token) {
                token = await AsyncStorage.getItem('userToken');
            }

            console.log("COMPANY ONBOARD - Auth State User:", JSON.stringify(user));
            console.log("COMPANY ONBOARD - Derived Token:", token);

            if (!token) {
                console.warn("COMPANY ONBOARD - No token found in Redux state! Request will likely fail.");
            }

            const formattedToken = token ? (token.startsWith('Bearer ') ? token : `Bearer ${token}`) : '';

            const response = await axios.post(URL_COMPANY_ONBOARD, onboardData.payload, {
                headers: {
                    'Content-Type': 'application/json',
                    'accept': '*/*',
                    'Authorization': formattedToken,
                }
            });
            console.log(response.data, "company-onboard");
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const getCompanyAction = createAsyncThunk(
    'companyOnboard/getCompany',
    async (_, { getState, rejectWithValue }) => {
        try {
            const authState = getState().auth;
            const user = authState.user;
            let token = user?.token || user?.data?.token || user?.accessToken || user?.data?.accessToken || user?.access_token || user?.data?.access_token || user?.jwt || user?.data?.jwt;
            if (!token) {
                token = await AsyncStorage.getItem('userToken');
            }
            const formattedToken = token ? (token.startsWith('Bearer ') ? token : `Bearer ${token}`) : '';

            const response = await axios.get(URL_COMPANY_ONBOARD, {
                headers: {
                    'accept': '*/*',
                    'Authorization': formattedToken,
                }
            });
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const updateCompanyAction = createAsyncThunk(
    'companyOnboard/updateCompany',
    async ({ id, payload }, { getState, rejectWithValue }) => {
        try {
            const authState = getState().auth;
            const user = authState.user;
            let token = user?.token || user?.data?.token || user?.accessToken || user?.data?.accessToken || user?.access_token || user?.data?.access_token || user?.jwt || user?.data?.jwt;
            if (!token) {
                token = await AsyncStorage.getItem('userToken');
            }
            const formattedToken = token ? (token.startsWith('Bearer ') ? token : `Bearer ${token}`) : '';

            const response = await axios.put(`${URL_COMPANY_ONBOARD}/${id}`, payload, {
                headers: {
                    'Content-Type': 'application/json',
                    'accept': '*/*',
                    'Authorization': formattedToken,
                }
            });
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const submitOnboardingDetailsAction = createAsyncThunk(
    'companyOnboard/submitOnboardingDetails',
    async (details, { getState, rejectWithValue }) => {
        try {
            const authState = getState().auth;
            const user = authState.user;
            let token = user?.token || user?.data?.token || user?.accessToken || user?.data?.accessToken || user?.access_token || user?.data?.access_token || user?.jwt || user?.data?.jwt;
            if (!token) {
                token = await AsyncStorage.getItem('userToken');
            }
            const formattedToken = token ? (token.startsWith('Bearer ') ? token : `Bearer ${token}`) : '';

            console.log("POST ONBOARDING DETAILS - Body:", JSON.stringify(details, null, 2));

            const response = await axios.post(`${URL_COMPANY_ONBOARD}/onboarding-details`, details, {
                headers: {
                    'Content-Type': 'application/json',
                    'accept': '*/*',
                    'Authorization': formattedToken,
                }
            });
            console.log("POST ONBOARDING DETAILS - Response:", response.data);
            return response.data;
        } catch (error) {
            console.log("POST ONBOARDING DETAILS - Error:", error.response?.data || error.message);
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const getOnboardingDetailsAction = createAsyncThunk(
    'companyOnboard/getOnboardingDetails',
    async (_, { getState, rejectWithValue }) => {
        try {
            const authState = getState().auth;
            const user = authState.user;
            let token = user?.token || user?.data?.token || user?.accessToken || user?.data?.accessToken || user?.access_token || user?.data?.access_token || user?.jwt || user?.data?.jwt;
            if (!token) {
                token = await AsyncStorage.getItem('userToken');
            }
            const formattedToken = token ? (token.startsWith('Bearer ') ? token : `Bearer ${token}`) : '';

            const response = await axios.get(`${URL_COMPANY_ONBOARD}/onboarding-details`, {
                headers: {
                    'accept': '*/*',
                    'Authorization': formattedToken,
                }
            });
            console.log("GET ONBOARDING DETAILS - Response:", response.data);
            return response.data;
        } catch (error) {
            console.log("GET ONBOARDING DETAILS - Error:", error.response?.data || error.message);
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

const companyOnboardSlice = createSlice({
    name: 'companyOnboard',
    initialState: {
        loading: false,
        error: null,
        data: null,
    },
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(companyOnboardAction.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(companyOnboardAction.fulfilled, (state, action) => {
                state.loading = false;
                state.data = action.payload;
            })
            .addCase(companyOnboardAction.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(getCompanyAction.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(getCompanyAction.fulfilled, (state, action) => {
                state.loading = false;
                state.data = action.payload.data;
            })
            .addCase(getCompanyAction.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(updateCompanyAction.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(updateCompanyAction.fulfilled, (state, action) => {
                state.loading = false;
                // Optional: you can update the state.data here with the new response payload if needed
            })
            .addCase(updateCompanyAction.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(submitOnboardingDetailsAction.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(submitOnboardingDetailsAction.fulfilled, (state, action) => {
                state.loading = false;
                state.data = { ...state.data, ...action.payload.data };
            })
            .addCase(submitOnboardingDetailsAction.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(getOnboardingDetailsAction.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(getOnboardingDetailsAction.fulfilled, (state, action) => {
                state.loading = false;
                state.data = { ...state.data, ...action.payload.data };
            })
            .addCase(getOnboardingDetailsAction.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });
    },
});

export default companyOnboardSlice.reducer;
