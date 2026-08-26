import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import { URL_UPLOAD } from '../config/env';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const uploadImageAction = createAsyncThunk(
    'upload/uploadImage',
    async (imageData, { getState, rejectWithValue }) => {
        try {
            const authState = getState().auth;
            const user = authState.user;
            let token = user?.token || user?.data?.token || user?.accessToken || user?.data?.accessToken || user?.access_token || user?.data?.access_token || user?.jwt || user?.data?.jwt;
            if (!token) {
                token = await AsyncStorage.getItem('userToken');
            }
            const formattedToken = token ? (token.startsWith('Bearer ') ? token : `Bearer ${token}`) : '';

            const formData = new FormData();
            formData.append('file', {
                uri: imageData.uri,
                type: imageData.type,
                name: imageData.name,
            });
            formData.append('key_name', imageData.key_name);

            console.log("UPLOAD IMAGE - URL:", URL_UPLOAD);
            console.log("UPLOAD IMAGE - File:", imageData.name);
            console.log("Formdatass", formData);

            

            const response = await fetch(URL_UPLOAD, {
                method: 'POST',
                headers: {
                    'accept': '*/*',
                    'Authorization': formattedToken,
                    // DO NOT set Content-Type manually with fetch and FormData in React Native
                },
                body: formData
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                console.log("UPLOAD IMAGE - API Error:", data);
                return rejectWithValue(data);
            }
            
            console.log("UPLOAD IMAGE - Response:", data);
            return data;
        } catch (error) {
            console.log("UPLOAD IMAGE - Catch Error:", error.message);
            return rejectWithValue(error.message);
        }
    }
);

const uploadSlice = createSlice({
    name: 'upload',
    initialState: {
        loading: false,
        error: null,
        uploadData: null,
    },
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(uploadImageAction.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(uploadImageAction.fulfilled, (state, action) => {
                state.loading = false;
                state.uploadData = action.payload;
            })
            .addCase(uploadImageAction.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });
    },
});

export default uploadSlice.reducer;
