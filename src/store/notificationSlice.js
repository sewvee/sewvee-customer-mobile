import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import { URL_NOTIFICATIONS, URL_NOTIFICATIONS_READ_ALL, URL_NOTIFICATION_READ, URL_NOTIFICATIONS_UNREAD_COUNT } from '../config/env';
import AsyncStorage from '@react-native-async-storage/async-storage';

const getAuthToken = async (getState) => {
    const authState = getState().auth;
    const user = authState.user;
    
    console.log('getAuthToken - Redux User:', !!user);

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
        console.log('getAuthToken - Token not in Redux, checking AsyncStorage...');
        token = await AsyncStorage.getItem('userToken');
    }

    const finalToken = token ? (token.startsWith('Bearer ') ? token : `Bearer ${token}`) : '';
    console.log('getAuthToken - Final Token status:', !!finalToken);
    return finalToken;
};

export const fetchUnreadCount = createAsyncThunk(
    'notifications/fetchUnreadCount',
    async (_, { getState, rejectWithValue }) => {
        try {
            const token = await getAuthToken(getState);
            const url = URL_NOTIFICATIONS_UNREAD_COUNT;
            console.log('API [fetchUnreadCount]:', url);
            
            const response = await axios.get(url, {
                headers: {
                    accept: '*/*',
                    Authorization: token,
                },
            });

            console.log('Response [fetchUnreadCount]:', response.data);

            if (response.data && response.data.success === false) {
                return rejectWithValue(response.data);
            }

            return response.data;
        } catch (error) {
            console.warn('Error [fetchUnreadCount]:', error.response?.data || error.message);
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const markAsRead = createAsyncThunk(
    'notifications/markAsRead',
    async (id, { getState, rejectWithValue }) => {
        try {
            const token = await getAuthToken(getState);
            const url = URL_NOTIFICATION_READ(id);
            console.log('API [markAsRead]:', url, 'Params:', { id });

            const response = await axios.patch(url, {}, {
                headers: {
                    accept: '*/*',
                    Authorization: token,
                },
            });

            console.log('Response [markAsRead]:', response.data);

            if (response.data && response.data.success === false) {
                return rejectWithValue(response.data);
            }

            return { id, data: response.data };
        } catch (error) {
            console.warn('Error [markAsRead]:', error.response?.data || error.message);
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const markAllAsRead = createAsyncThunk(
    'notifications/markAllAsRead',
    async (_, { getState, rejectWithValue }) => {
        try {
            const token = await getAuthToken(getState);
            const url = URL_NOTIFICATIONS_READ_ALL;
            console.log('API [markAllAsRead]:', url);

            const response = await axios.patch(url, {}, {
                headers: {
                    accept: '*/*',
                    Authorization: token,
                },
            });

            console.log('Response [markAllAsRead]:', response.data);

            if (response.data && response.data.success === false) {
                return rejectWithValue(response.data);
            }

            return response.data;
        } catch (error) {
            console.warn('Error [markAllAsRead]:', error.response?.data || error.message);
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const fetchNotifications = createAsyncThunk(
    'notifications/fetchNotifications',
    async ({ page = 1, limit = 10 }, { getState, rejectWithValue }) => {
        try {
            const token = await getAuthToken(getState);
            const url = URL_NOTIFICATIONS;
            console.log('API [fetchNotifications]:', url, 'Params:', { page, limit });

            const response = await axios.get(url, {
                headers: {
                    accept: '*/*',
                    Authorization: token,
                },
                params: { page, limit },
            });

            console.log('Response [fetchNotifications]:', response.data);

            if (response.data && response.data.success === false) {
                return rejectWithValue(response.data);
            }

            return response.data;
        } catch (error) {
            console.warn('Error [fetchNotifications]:', error.response?.data || error.message);
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

const notificationSlice = createSlice({
    name: 'notifications',
    initialState: {
        today: [],
        yesterday: [],
        older: [],
        pagination: null,
        loading: false,
        loadingMore: false,
        error: null,
        unreadCount: 0,
    },
    reducers: {
        resetNotifications: (state) => {
            state.today = [];
            state.yesterday = [];
            state.older = [];
            state.pagination = null;
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchNotifications.pending, (state, action) => {
                if (action.meta.arg.page === 1) {
                    state.loading = true;
                } else {
                    state.loadingMore = true;
                }
                state.error = null;
            })
            .addCase(fetchNotifications.fulfilled, (state, action) => {
                state.loading = false;
                state.loadingMore = false;
                const { data, pagination, unread_count } = action.payload;
                
                if (action.meta.arg.page === 1) {
                    state.today = data.today || [];
                    state.yesterday = data.yesterday || [];
                    state.older = data.older || [];
                } else {
                    state.today = [...state.today, ...(data.today || [])];
                    state.yesterday = [...state.yesterday, ...(data.yesterday || [])];
                    state.older = [...state.older, ...(data.older || [])];
                }
                state.pagination = pagination;
                state.unreadCount = unread_count;
            })
            .addCase(fetchNotifications.rejected, (state, action) => {
                state.loading = false;
                state.loadingMore = false;
                state.error = action.payload;
            })
            .addCase(markAllAsRead.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(markAllAsRead.fulfilled, (state) => {
                state.loading = false;
                state.unreadCount = 0;
                // We'll refetch in the screen, but let's clear dots locally for immediate feedback
                const markRead = (items) => items.map(item => ({ ...item, is_read: true }));
                state.today = markRead(state.today);
                state.yesterday = markRead(state.yesterday);
                state.older = markRead(state.older);
            })
            .addCase(markAllAsRead.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(markAsRead.fulfilled, (state, action) => {
                const id = action.payload.id;
                const updateItem = (items) => items.map(item => item.id === id ? { ...item, is_read: true } : item);
                
                state.today = updateItem(state.today);
                state.yesterday = updateItem(state.yesterday);
                state.older = updateItem(state.older);
                
                // Decrement unread count if it was unread
                if (state.unreadCount > 0) {
                    state.unreadCount -= 1;
                }
            })
            .addCase(fetchUnreadCount.fulfilled, (state, action) => {
                state.unreadCount = action.payload.unread_count;
            });
    },
});

export const { resetNotifications } = notificationSlice.actions;
export default notificationSlice.reducer;
