import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import uploadReducer from './uploadSlice';
import companyOnboardReducer from './companyOnboardSlice';
import customerReducer from './customerSlice';
import subscriptionReducer from './subscriptionSlice';
import profileReducer from './profileSlice';
import sectionReducer from './sectionSlice';
import outfitReducer from './outfitSlice';
import categoryReducer from './categorySlice';
import subcategoryReducer from './subcategorySlice';
import optionReducer from './optionSlice';
import suboptionReducer from './suboptionSlice';
// Inventory Settings
import inventorySettingsReducer from './inventorySettingsSlice';
import inventoryMaterialTypeReducer from './inventoryMaterialTypeSlice';
import inventoryBrandReducer from './inventoryBrandSlice';
import inventorySupplierReducer from './inventorySupplierSlice';
import inventoryProductTypeReducer from './inventoryProductTypeSlice';
import inventoryReadymadeCategoryReducer from './inventoryReadymadeCategorySlice';
import inventoryReadymadeSizeReducer from './inventoryReadymadeSizeSlice';
import inventoryMaterialReducer from './inventoryMaterialSlice';
import inventoryReadymadeReducer from './inventoryReadymadeSlice';
import inventoryPurchaseReducer from './inventoryPurchaseSlice';
import inventoryStockReducer from './inventoryStockSlice';
import measurementReducer from './measurementSlice';
import paymentReducer from './paymentSlice';
import dashboardReducer from './dashboardSlice';
import salesOrderReducer from './salesOrderSlice';
import notificationReducer from './notificationSlice';

export const store = configureStore({
  reducer: {
    dashboard: dashboardReducer,
    auth: authReducer,
    upload: uploadReducer,
    companyOnboard: companyOnboardReducer,
    customers: customerReducer,
    subscription: subscriptionReducer,
    profile: profileReducer,
    section: sectionReducer,
    outfit: outfitReducer,
    category: categoryReducer,
    subcategory: subcategoryReducer,
    option: optionReducer,
    suboption: suboptionReducer,
    // Inventory Settings

    inventorySettings: inventorySettingsReducer,
    inventoryMaterialType: inventoryMaterialTypeReducer,
    inventoryBrand: inventoryBrandReducer,
    inventorySupplier: inventorySupplierReducer,
    inventoryProductType: inventoryProductTypeReducer,
    inventoryReadymadeCategory: inventoryReadymadeCategoryReducer,
    inventoryReadymadeSize: inventoryReadymadeSizeReducer,
    inventoryMaterial: inventoryMaterialReducer,
    inventoryReadymade: inventoryReadymadeReducer,
    inventoryPurchase: inventoryPurchaseReducer,
    inventoryStock: inventoryStockReducer,
    measurement: measurementReducer,
    payment: paymentReducer,
    salesOrder: salesOrderReducer,
    notifications: notificationReducer,
  },
});
