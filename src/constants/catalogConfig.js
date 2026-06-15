// constants/catalogConfig.js

import {
  getMaterialTypesAction,
  addMaterialTypeAction,
  updateMaterialTypeAction,
  deleteMaterialTypeAction,
  toggleMaterialTypeStatusAction
} from '../store/inventoryMaterialTypeSlice';

import {
  getReadymadeCategoriesAction,
  addReadymadeCategoryAction,
  updateReadymadeCategoryAction,
  deleteReadymadeCategoryAction,
  toggleReadymadeCategoryStatusAction
} from '../store/inventoryReadymadeCategorySlice';

import {
  getProductTypesAction,
  addProductTypeAction,
  updateProductTypeAction,
  deleteProductTypeAction,
  toggleProductTypeStatusAction
} from '../store/inventoryProductTypeSlice';

import {
  getBrandsAction,
  addBrandAction,
  updateBrandAction,
  deleteBrandAction,
  toggleBrandStatusAction,
} from '../store/inventoryBrandSlice';

import {
  getSuppliersAction,
  addSupplierAction,
  updateSupplierAction,
  deleteSupplierAction,
  toggleSupplierStatusAction,
} from '../store/inventorySupplierSlice';

import {
  getReadymadeSizesAction,
  addReadymadeSizeAction,
  updateReadymadeSizeAction,
  deleteReadymadeSizeAction,
  toggleReadymadeSizeStatusAction,
} from '../store/inventoryReadymadeSizeSlice';

export const CATALOG_CONFIG = {
  'Material Types': {
    selector: state => state.inventoryMaterialType,
    actions: {
      get: getMaterialTypesAction,
      add: addMaterialTypeAction,
      update: updateMaterialTypeAction,
      delete: deleteMaterialTypeAction,
      toggleStatus: toggleMaterialTypeStatusAction,
    },
  },
  'Readymade Categories': {
    selector: state => state.inventoryReadymadeCategory,
    actions: {
      get: getReadymadeCategoriesAction,
      add: addReadymadeCategoryAction,
      update: updateReadymadeCategoryAction,
      delete: deleteReadymadeCategoryAction,
      toggleStatus: toggleReadymadeCategoryStatusAction,
    },
  },
  'Product Types': {
    selector: state => state.inventoryProductType,
    actions: {
      get: getProductTypesAction,
      add: addProductTypeAction,
      update: updateProductTypeAction,
      delete: deleteProductTypeAction,
      toggleStatus: toggleProductTypeStatusAction,
    },
  },
  Brands: {
    selector: state => state.inventoryBrand,
    actions: {
      get: getBrandsAction,
      add: addBrandAction,
      update: updateBrandAction,
      delete: deleteBrandAction,
      toggleStatus: toggleBrandStatusAction,
    },
  },
  Suppliers: {
    selector: state => state.inventorySupplier,
    actions: {
      get: getSuppliersAction,
      add: addSupplierAction,
      update: updateSupplierAction,
      delete: deleteSupplierAction,
      toggleStatus: toggleSupplierStatusAction,
    },
  },
  'Readymade Sizes': {
    selector: state => state.inventoryReadymadeSize,
    actions: {
      get: getReadymadeSizesAction,
      add: addReadymadeSizeAction,
      update: updateReadymadeSizeAction,
      delete: deleteReadymadeSizeAction,
      toggleStatus: toggleReadymadeSizeStatusAction,
    },
  },
};
