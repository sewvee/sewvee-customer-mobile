import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import { URL_COMPANY_SECTIONS } from '../config/env';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const getSectionsAction = createAsyncThunk(
    'section/getSections',
    async (_, { getState, rejectWithValue }) => {
        try {
            const authState = getState().auth;
            const user = authState.user;
            let token = user?.token || user?.data?.token || user?.accessToken || user?.data?.accessToken || user?.access_token || user?.data?.access_token || user?.jwt || user?.data?.jwt;
            if (!token) {
                token = await AsyncStorage.getItem('userToken');
            }
            const formattedToken = token ? (token.startsWith('Bearer ') ? token : `Bearer ${token}`) : '';

            const response = await axios.get(URL_COMPANY_SECTIONS, {
                headers: {
                    'accept': 'application/json',
                    'Authorization': formattedToken,
                }
            });
            console.log("GET SECTIONS - Response:", response.data);
            return response.data;
        } catch (error) {
            console.log("GET SECTIONS - Error:", error.response?.data || error.message);
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

const sectionSlice = createSlice({
    name: 'section',
    initialState: {
        loading: false,
        error: null,
        sections: [],
    },
    reducers: {
        clearSections: (state) => {
            state.sections = [];
            state.error = null;
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(getSectionsAction.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(getSectionsAction.fulfilled, (state, action) => {
                state.loading = false;
                state.sections = action.payload.data;
            })
            .addCase(getSectionsAction.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });
    },
});

export const { clearSections } = sectionSlice.actions;
export default sectionSlice.reducer;
