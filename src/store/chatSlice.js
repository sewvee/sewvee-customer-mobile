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
    decrementChatUnread: (state) => {
      state.unreadChatCount = Math.max(0, state.unreadChatCount - 1);
    },
    setChatUnread: (state, action) => {
      state.unreadChatCount = action.payload;
    },
  },
});

export const { incrementChatUnread, resetChatUnread, decrementChatUnread, setChatUnread } = chatSlice.actions;
export default chatSlice.reducer;
