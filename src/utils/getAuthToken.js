// utils/getAuthToken.js

import AsyncStorage from '@react-native-async-storage/async-storage';

const getAuthToken = async getState => {
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

export default getAuthToken;
