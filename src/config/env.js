import { Platform } from 'react-native';

export const API_DOMAIN = process.env.EXPO_PUBLIC_API_URL || "https://api-stage.sewvee.com";
export const BASE_URL = `${API_DOMAIN}/mobile/`;
export const APP_VERSION = "1.41";

export const RAZORPAY_KEY = "rzp_live_SuH9oa1pqTO6qx";

export const URL_REGISTER = `${BASE_URL}auth/register`;
export const URL_VERIFYOTP = `${BASE_URL}auth/verify-otp`;
export const URL_LOGIN = `${BASE_URL}auth/login`;
export const URL_SENDOTP = `${BASE_URL}auth/send-otp`;
export const URL_FORGOTPIN = `${BASE_URL}auth/forgot-pin`;
export const URL_RESETPIN = `${BASE_URL}auth/reset-pin`;
export const URL_CHANGE_PIN = `${BASE_URL}auth/change-pin`;
export const URL_ME = `${BASE_URL}auth/me`;
export const URL_REFRESH_TOKEN = `${BASE_URL}auth/refresh-token`;
export const URL_FCM_TOKEN = `${BASE_URL}auth/fcm-token`;

export const URL_GET_COUNTRY = `${BASE_URL}location/countries`;
export const URL_GET_STATE = `${BASE_URL}location/states`;
export const URL_GET_CITY = `${BASE_URL}location/cities`;
export const URL_UPLOAD = `${API_DOMAIN}/upload/mobile`;
export const URL_COMPANY_ONBOARD = `${BASE_URL}onboardingscreen/company`;
export const URL_COMPANY_SECTIONS = `${URL_COMPANY_ONBOARD}/sections`;
export const URL_OUTFIT = `${BASE_URL}outfit`;
export const URL_OUTFIT_DETAIL = (id) => `${URL_OUTFIT}/${id}`;
export const URL_OUTFIT_STITCHING_STRUCTURE = (id) => `${URL_OUTFIT}/${id}/stitching-structure`;
export const URL_OUTFIT_MEASUREMENT = `${BASE_URL}inventory/settings/measurement`;
export const URL_OUTFIT_ASSIGNED_MEASUREMENTS = (outfitId) => `${URL_OUTFIT_MEASUREMENT}/outfit/${outfitId}`;
export const URL_MEASUREMENT_HISTORY = `${URL_OUTFIT_MEASUREMENT}/history`;
export const URL_MEASUREMENT_HISTORY_DETAIL = (orderId) => `${URL_MEASUREMENT_HISTORY}/${orderId}`;
export const URL_OUTFIT_CATEGORY = `${URL_OUTFIT}/category`;
export const URL_OUTFIT_CATEGORY_DETAIL = (id) => `${URL_OUTFIT_CATEGORY}/${id}`;
export const URL_OUTFIT_CATEGORY_LIST = (id) => `${URL_OUTFIT}/outfit/${id}/categories`;
export const URL_OUTFIT_SUBCATEGORY = `${URL_OUTFIT}/subcategory`;
export const URL_OUTFIT_SUBCATEGORY_DETAIL = (id) => `${URL_OUTFIT_SUBCATEGORY}/${id}`;
export const URL_OUTFIT_SUBCATEGORY_LIST = (id) => `${URL_OUTFIT}/category/${id}/subcategories`;
export const URL_OUTFIT_OPTION = `${URL_OUTFIT}/option`;
export const URL_OUTFIT_OPTION_DETAIL = (id) => `${URL_OUTFIT_OPTION}/${id}`;
export const URL_OUTFIT_OPTION_LIST = (id) => `${URL_OUTFIT}/subcategory/${id}/options`;
export const URL_OUTFIT_OPTION_ADD = (id) => `${URL_OUTFIT}/subcategory/${id}/option`;
export const URL_OUTFIT_SUBOPTION = `${URL_OUTFIT}/suboption`;
export const URL_OUTFIT_SUBOPTION_DETAIL = (id) => `${URL_OUTFIT_SUBOPTION}/${id}`;
export const URL_OUTFIT_SUBOPTION_LIST = (id) => `${URL_OUTFIT}/option/${id}/suboptions`;
export const URL_OUTFIT_SUBOPTION_ADD = (id) => `${URL_OUTFIT}/option/${id}/suboption`;
export const URL_CUSTOMERS = `${BASE_URL}customers`;
export const URL_ORDERS = `${BASE_URL}orders`;

//Subscription
export const URL_SUBSCRIPTION_PLANS = `${BASE_URL}subscription/plans`;
export const URL_SUBSCRIPTION_START_TRIAL = `${BASE_URL}subscription/start-trial`;
export const URL_SUBSCRIPTION_UPGRADE = `${BASE_URL}subscription/upgrade`;
export const URL_SUBSCRIPTION_CURRENT = `${BASE_URL}subscription/current`;
export const URL_SUBSCRIPTION_VERIFY_PAYMENT = `${BASE_URL}subscription/verify-payment`;
export const URL_SUBSCRIPTION_CREATE_ORDER = `${BASE_URL}subscription/create-order`;
export const URL_SUBSCRIPTION_PAYMENTS = `${BASE_URL}subscription/payments`;
export const URL_SUBSCRIPTION_INVOICE_DETAILS = `${BASE_URL}subscription/invoice`;

// Dashboard
export const URL_DASHBOARD_INSIGHTS = `${BASE_URL}dashboard/insights`;


// Payments
export const URL_PAYMENTS = `${BASE_URL}payments`;
export const URL_PAYMENT_DETAIL = (id) => `${URL_PAYMENTS}/${id}`;
export const URL_PAYMENT_INVOICE = (id) => `${URL_PAYMENTS}/${id}/invoice`;
export const URL_PAYMENT_DOWNLOAD = (id) => `${URL_PAYMENTS}/${id}/invoice/download`;
export const URL_ORDER_PAYMENT = `${URL_ORDERS}/payment`;
export const URL_ORDER_PAYMENTS = (orderId) => `${URL_ORDERS}/${orderId}/payments`;
export const URL_ORDER_INVOICE_DOWNLOAD = (orderId) => `${URL_ORDERS}/${orderId}/invoice/download`;
export const URL_ORDER_TAILORING_COPY = (id) => `${URL_ORDERS}/${id}/tailoringcopy`;
export const URL_ORDER_TAILORING_COPY_DOWNLOAD = (id) => `${URL_ORDERS}/${id}/tailoringcopy/download`;

// Inventory Settings
export const URL_INVENTORY_MATERIAL_TYPE = `${BASE_URL}inventory/settings/material-type`;
export const URL_INVENTORY_BRAND = `${BASE_URL}inventory/settings/brand`;
export const URL_INVENTORY_SUPPLIER = `${BASE_URL}inventory/settings/supplier`;
export const URL_INVENTORY_PRODUCT_TYPE = `${BASE_URL}inventory/settings/readymade-product-type`;
export const URL_INVENTORY_READYMADE_CATEGORY = `${BASE_URL}inventory/settings/readymade-category`;
export const URL_INVENTORY_READYMADE_SIZES = `${BASE_URL}inventory/settings/readymade-size`;
export const URL_INVENTORY_MASTER = `${BASE_URL}inventory/settings/master`;
export const URL_GET_PRODUCT_TYPES = `${BASE_URL}inventory/settings/readymade-category`;

// Inventory Main
export const URL_INVENTORY_MATERIAL = `${BASE_URL}inventory/material`;
export const URL_INVENTORY_READYMADE = `${BASE_URL}inventory/readymade`;
export const URL_INVENTORY_PURCHASE  = `${BASE_URL}inventory/purchase`;
export const URL_INVENTORY_STOCK     = `${BASE_URL}inventory/stock`;

export const YOUR_UPLOAD_URL = `${API_DOMAIN}/upload/mobile`;
export const URL_APP_VERSION = `${API_DOMAIN}/app-version/all`;
export const URL_NOTIFICATIONS = `${API_DOMAIN}/notifications`;
export const URL_NOTIFICATIONS_READ_ALL = `${URL_NOTIFICATIONS}/read-all`;
export const URL_NOTIFICATION_READ = (id) => `${URL_NOTIFICATIONS}/${id}/read`;
export const URL_NOTIFICATIONS_UNREAD_COUNT = `${URL_NOTIFICATIONS}/unread-count`;

export const URL_CUSTOMER_PORTAL_ORDERS = `${BASE_URL}customer-portal/orders`;
export const URL_CUSTOMER_PORTAL_SHOP = `${BASE_URL}customer-portal/shop`;

export const URL_CUSTOMER_AUTH_REGISTER = `${BASE_URL}customer-auth/register`;
export const URL_CUSTOMER_AUTH_LOGIN = `${BASE_URL}customer-auth/login`;
export const URL_CUSTOMER_AUTH_PROFILE = `${BASE_URL}customer-auth/profile`;
export const URL_CUSTOMER_AUTH_CHANGE_PIN = `${BASE_URL}customer-auth/change-pin`;
