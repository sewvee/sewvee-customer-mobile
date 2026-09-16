import { createSlice } from '@reduxjs/toolkit';

const chatSlice = createSlice({
  name: 'chat',
  initialState: {
    unreadChatCount: 0,
  },
  reducers: {
    incrementChatUnread: (state) => {
      state.unreadChatCount += 1;
    },
    resetChatUnread: (state) => {
      state.unreadChatCount = 0;
    },
    setChatUnread: (state, action) => {
      state.unreadChatCount = action.payload;
    },
  },
});

export const { incrementChatUnread, resetChatUnread, setChatUnread } = chatSlice.actions;
export default chatSlice.reducer;
