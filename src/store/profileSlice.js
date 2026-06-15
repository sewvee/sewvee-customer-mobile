import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { URL_ME } from '../config/env';

export const fetchUserProfile = createAsyncThunk(
    'profile/fetchProfile',
    async (_, { rejectWithValue }) => {
        try {
            let token = await AsyncStorage.getItem('userToken');
            
            if (!token) {
                return rejectWithValue('No authentication token found');
            }
            
            const formattedToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;

            const response = await axios.get(URL_ME, {
                headers: {
                    'accept': '*/*',
                    'Authorization': formattedToken
                }
            });
            return response.data;
        } catch (error) {
            console.log('Fetch profile error:', error.response?.data || error.message);
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const updateUserProfile = createAsyncThunk(
    'profile/updateProfile',
    async (profileData, { rejectWithValue }) => {
        try {
            let token = await AsyncStorage.getItem('userToken');
            
            if (!token) {
                return rejectWithValue('No authentication token found');
            }
            
            const formattedToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;

            const response = await axios.patch(URL_ME, profileData, {
                headers: {
                    'accept': '*/*',
                    'Content-Type': 'application/json',
                    'Authorization': formattedToken
                }
            });
            return response.data;
        } catch (error) {
            console.log('Update profile error:', error.response?.data || error.message);
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

const profileSlice = createSlice({
    name: 'profile',
    initialState: {
        profileData: null,
        loading: false,
        error: null,
        updateLoading: false,
        updateError: null,
        updateSuccess: false,
    },
    reducers: {
        clearProfile: (state) => {
            state.profileData = null;
            state.error = null;
            state.loading = false;
        },
        resetUpdateStatus: (state) => {
            state.updateLoading = false;
            state.updateError = null;
            state.updateSuccess = false;
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchUserProfile.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchUserProfile.fulfilled, (state, action) => {
                state.loading = false;
                state.profileData = action.payload.data;
                state.error = null;
            })
            .addCase(fetchUserProfile.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(updateUserProfile.pending, (state) => {
                state.updateLoading = true;
                state.updateError = null;
                state.updateSuccess = false;
            })
            .addCase(updateUserProfile.fulfilled, (state, action) => {
                state.updateLoading = false;
                state.profileData = action.payload.data;
                state.updateSuccess = true;
                state.updateError = null;
            })
            .addCase(updateUserProfile.rejected, (state, action) => {
                state.updateLoading = false;
                state.updateError = action.payload;
                state.updateSuccess = false;
            });
    },
});

export const { clearProfile, resetUpdateStatus } = profileSlice.actions;
export default profileSlice.reducer;
