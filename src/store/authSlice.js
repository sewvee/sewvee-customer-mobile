import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    URL_REGISTER,
    URL_VERIFYOTP,
    URL_LOGIN,
    URL_SENDOTP,
    URL_FORGOTPIN,
    URL_RESETPIN,
    URL_CHANGE_PIN,
    URL_GET_COUNTRY,
    URL_GET_STATE,
    URL_GET_CITY,
    URL_REFRESH_TOKEN,
    URL_FCM_TOKEN
} from '../config/env';

export const loginUser = createAsyncThunk(
    'auth/login',
    async (loginData, { rejectWithValue }) => {
        try {
            const response = await axios.post(URL_LOGIN, loginData, {
                headers: {
                    'Content-Type': 'application/json',
                    'accept': '*/*'
                }
            });
            console.log(response.data, "login-user")
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const registerUser = createAsyncThunk(
    'auth/register',
    async (userData, { rejectWithValue }) => {
        try {
            const response = await axios.post(URL_REGISTER, userData, {
                headers: {
                    'Content-Type': 'application/json',
                    'accept': '*/*'
                }
            });
            console.log(response.data, "login")
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const verifyOtp = createAsyncThunk(
    'auth/verifyOtp',
    async (otpData, { rejectWithValue }) => {
        try {
            const response = await axios.post(URL_VERIFYOTP, otpData, {
                headers: {
                    'Content-Type': 'application/json',
                    'accept': '*/*'
                }
            });
            console.log(response.data, "verify-otp")
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const sendOtpAction = createAsyncThunk(
    'auth/sendOtp',
    async (emailData, { rejectWithValue }) => {
        try {
            const response = await axios.post(URL_SENDOTP, emailData, {
                headers: {
                    'Content-Type': 'application/json',
                    'accept': '*/*'
                }
            });
            console.log(response.data, "send-otp")
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const forgotPinAction = createAsyncThunk(
    'auth/forgotPin',
    async (emailData, { rejectWithValue }) => {
        try {
            const response = await axios.post(URL_FORGOTPIN, emailData, {
                headers: {
                    'Content-Type': 'application/json',
                    'accept': '*/*'
                }
            });
            console.log(response.data, "forgot-pin")
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const resetPinAction = createAsyncThunk(
    'auth/resetPin',
    async (resetData, { rejectWithValue }) => {
        try {
            const response = await axios.post(URL_RESETPIN, resetData, {
                headers: {
                    'Content-Type': 'application/json',
                    'accept': '*/*'
                }
            });
            console.log(response.data, "reset-pin")
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const changePinAction = createAsyncThunk(
    'auth/changePin',
    async (pinData, { getState, rejectWithValue }) => {
        try {
            const authState = getState().auth;
            const user = authState.user;
            let token = user?.token || user?.data?.token || user?.accessToken || user?.data?.accessToken || user?.access_token || user?.data?.access_token || user?.jwt || user?.data?.jwt;
            
            if (!token) {
                token = await AsyncStorage.getItem('userToken');
            }
            
            const formattedToken = token ? (token.startsWith('Bearer ') ? token : `Bearer ${token}`) : '';

            const response = await axios.post(URL_CHANGE_PIN, pinData, {
                headers: {
                    'Content-Type': 'application/json',
                    'accept': '*/*',
                    'Authorization': formattedToken
                }
            });
            console.log(response.data, "change-pin")
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const refreshTokenAction = createAsyncThunk(
    'auth/refreshToken',
    async (refreshData, { getState, rejectWithValue }) => {
        try {
            const authState = getState().auth;
            const user = authState.user;
            let token = user?.token || user?.data?.token || user?.accessToken || user?.data?.accessToken || user?.access_token || user?.data?.access_token || user?.jwt || user?.data?.jwt;

            if (!token) {
                token = await AsyncStorage.getItem('userToken');
            }

            const formattedToken = token ? (token.startsWith('Bearer ') ? token : `Bearer ${token}`) : '';

            const response = await axios.post(URL_REFRESH_TOKEN, refreshData, {
                headers: {
                    'Content-Type': 'application/json',
                    'accept': '*/*',
                    'Authorization': formattedToken
                }
            });
            console.log(response.data, "refresh-token")
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const saveFcmTokenAction = createAsyncThunk(
    'auth/saveFcmToken',
    async (fcmData, { getState, rejectWithValue }) => {
        try {
            const authState = getState().auth;
            const user = authState.user;
            let token = user?.token || user?.data?.token || user?.accessToken || user?.data?.accessToken || user?.access_token || user?.data?.access_token || user?.jwt || user?.data?.jwt;

            if (!token) {
                token = await AsyncStorage.getItem('userToken');
            }

            const formattedToken = token ? (token.startsWith('Bearer ') ? token : `Bearer ${token}`) : '';

            console.log('FCM Token API Request Payload:', fcmData);

            const response = await axios.post(URL_FCM_TOKEN, fcmData, {
                headers: {
                    'Content-Type': 'application/json',
                    'accept': '*/*',
                    'Authorization': formattedToken
                }
            });
            console.log('FCM Token API Response:', response.data);
            return response.data;
        } catch (error) {
            console.warn('Save FCM Token Error Response:', error.response?.data || error.message);
            console.log('Save FCM Token Error Response:', error.response?.data || error.message);
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const getCountries = createAsyncThunk(
    'location/countries',
    async (_, { rejectWithValue }) => {
        try {
            const response = await axios.get(URL_GET_COUNTRY);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const getStates = createAsyncThunk(
    'location/states',
    async (countryId, { rejectWithValue }) => {
        console.log(`${URL_GET_STATE}?countryId=${countryId}`);

        try {
            const response = await axios.get(`${URL_GET_STATE}?countryId=${countryId}`);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const getCities = createAsyncThunk(
    'location/cities',
    async (stateId, { rejectWithValue }) => {

        try {
            const response = await axios.get(`${URL_GET_CITY}?stateId=${stateId}`);
            console.log('re', response);

            return response.data;
        } catch (error) {
            console.log(error);
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

const authSlice = createSlice({
    name: 'auth',
    initialState: {
        loading: false,
        user: null,
        error: null,
        countries: [],
        states: [],
        cities: []
    },
    reducers: {
        clearAuth: (state) => {
            state.user = null;
            state.error = null;
            state.loading = false;
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(registerUser.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(registerUser.fulfilled, (state, action) => {
                state.loading = false;
                state.user = action.payload;
            })
            .addCase(registerUser.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(verifyOtp.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(verifyOtp.fulfilled, (state, action) => {
                state.loading = false;
            })
            .addCase(verifyOtp.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(loginUser.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(loginUser.fulfilled, (state, action) => {
                state.loading = false;
                state.user = action.payload;
            })
            .addCase(loginUser.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(sendOtpAction.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(sendOtpAction.fulfilled, (state) => {
                state.loading = false;
            })
            .addCase(sendOtpAction.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(forgotPinAction.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(forgotPinAction.fulfilled, (state) => {
                state.loading = false;
            })
            .addCase(forgotPinAction.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(resetPinAction.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(resetPinAction.fulfilled, (state) => {
                state.loading = false;
            })
            .addCase(resetPinAction.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(changePinAction.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(changePinAction.fulfilled, (state) => {
                state.loading = false;
            })
            .addCase(changePinAction.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(refreshTokenAction.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(refreshTokenAction.fulfilled, (state, action) => {
                state.loading = false;
                state.user = action.payload;
            })
            .addCase(refreshTokenAction.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(getCountries.fulfilled, (state, action) => {
                state.countries = action.payload;
            })

            .addCase(getStates.fulfilled, (state, action) => {
                state.states = action.payload;
            })

            .addCase(getCities.fulfilled, (state, action) => {
                state.cities = action.payload;
            })
    },
});

export const { clearAuth } = authSlice.actions;
export default authSlice.reducer;
