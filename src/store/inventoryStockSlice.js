import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import axios from 'axios';
import { URL_INVENTORY_STOCK } from '../config/env';
import getAuthToken from '../utils/getAuthToken';
import {
  formatStockDisplay,
  getDisplayStock,
  getNumericValueFromStock,
} from '../utils/stockHelpers';

const buildErrorPayload = error =>
  error?.response?.data || {
    message: error?.message || 'Failed to load stock',
  };

const normalizeSortOrder = sortOrder => {
  const normalized = `${sortOrder || 'asc'}`.toLowerCase();
  return normalized === 'desc' ? 'desc' : 'asc';
};

const normalizeListParams = (params = {}) => ({
  page: Number(params.page) || 1,
  limit: Number(params.limit) || 10,
  sort_by: params.sort_by || 'name',
  sort_order: normalizeSortOrder(params.sort_order),
  ...(params.search?.trim() ? { search: params.search.trim() } : {}),
});

const isSameQuery = (left = {}, right = {}) =>
  ['page', 'limit', 'search', 'sort_by', 'sort_order'].every(
    key => String(left[key] ?? '') === String(right[key] ?? ''),
  );

const isLowStockItem = value =>
  value === true ||
  value === 1 ||
  value === '1' ||
  `${value}`.toLowerCase() === 'true';

const toPositiveInteger = value => {
  const parsedValue = Number(value);
  return Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : null;
};

const normalizeSizeLabel = value => `${value || ''}`.trim().toUpperCase();

const getPriceValue = value => {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : null;
};

const getStockItemType = item => {
  const rawType =
    item?.item_type ||
    item?.type ||
    item?.inventory_type ||
    item?.stock_type ||
    '';

  if (`${rawType}`.toUpperCase().includes('READY')) {
    return 'Readymade';
  }

  if (`${rawType}`.toUpperCase().includes('MAT')) {
    return 'Material';
  }

  if (
    item?.size ||
    item?.brand ||
    item?.section ||
    item?.readymade_id ||
    item?.gender
  ) {
    return 'Readymade';
  }

  return 'Material';
};

const getSizeName = item =>
  item?.size?.name ||
  item?.size_name ||
  item?.size?.label ||
  item?.size?.value ||
  item?.size ||
  '';

const normalizeSizeOption = (
  size,
  fallbackId = null,
  fallbackQty = null,
  fallbackPrice = null,
  fallbackLowStock = null,
  fallbackImage = '',
) => {
  if (size === undefined || size === null || size === '') {
    return null;
  }

  if (typeof size === 'string' || typeof size === 'number') {
    return {
      id: toPositiveInteger(fallbackId ?? size),
      size_id: toPositiveInteger(fallbackId ?? size),
      name: `${size}`,
      size: `${size}`,
      qty:
        fallbackQty === undefined || fallbackQty === null
          ? null
          : getNumericValueFromStock(fallbackQty),
      stock: formatStockDisplay(fallbackQty, 'pcs'),
      price: getPriceValue(fallbackPrice),
      lowStock:
        fallbackLowStock === null || fallbackLowStock === undefined
          ? undefined
          : isLowStockItem(fallbackLowStock),
      image: fallbackImage || '',
    };
  }

  const name =
    size?.name ||
    size?.size_name ||
    size?.label ||
    size?.value ||
    size?.size?.name ||
    '';

  if (!name) {
    return null;
  }

  const rawQty =
    size?.qty ??
    size?.quantity ??
    size?.stock ??
    size?.available_qty ??
    size?.available_quantity ??
    fallbackQty;
  const rawPrice =
    size?.selling_price ??
    size?.sellingPrice ??
    size?.price ??
    size?.rate ??
    size?.mrp ??
    size?.size_price ??
    size?.sizePrice ??
    fallbackPrice;

  const normalizedSizeId = toPositiveInteger(
    size?.id ??
      size?.size_id ??
      size?.sizeId ??
      size?.size?.id ??
      size?.size?.size_id ??
      fallbackId,
  );

  return {
    id: normalizedSizeId,
    size_id: normalizedSizeId,
    name,
    size: name,
    qty:
      rawQty === undefined || rawQty === null
        ? null
        : getNumericValueFromStock(rawQty),
    stock: formatStockDisplay(rawQty, 'pcs'),
    price: getPriceValue(rawPrice),
    lowStock:
      size?.low_stock !== undefined || size?.lowStock !== undefined
        ? isLowStockItem(size?.low_stock ?? size?.lowStock)
        : fallbackLowStock === null || fallbackLowStock === undefined
          ? undefined
          : isLowStockItem(fallbackLowStock),
    image:
      size?.image_url ||
      size?.photo ||
      size?.image ||
      size?.readymade_image ||
      fallbackImage ||
      '',
  };
};

const getSizeOptions = item => {
  const rowLevelSizeId =
    item?.size_id ??
    item?.sizeId ??
    item?.readymade_size_id ??
    item?.readymadeSizeId ??
    item?.inventory_size_id ??
    item?.inventorySizeId ??
    item?.size?.id ??
    item?.size?.size_id ??
    item?.readymade_size?.id ??
    item?.readymade_size?.size_id ??
    null;
  const rowLevelSizeName = getSizeName(item);
  const rowLevelQty = item?.qty ?? item?.quantity ?? null;
  const rowLevelPrice = item?.selling_price ?? item?.sellingPrice ?? item?.price ?? item?.rate ?? null;
  const rowLevelLowStock = item?.low_stock ?? item?.lowStock;
  const rowLevelImage =
    item?.image_url ||
    item?.photo ||
    item?.image ||
    item?.readymade_image ||
    '';
  const arrayCandidate = [
    item?.sizes,
    item?.size_list,
    item?.sizeList,
    item?.readymade?.sizes,
    item?.readymade?.size_list,
  ].find(candidate => Array.isArray(candidate) && candidate.length > 0);

  if (arrayCandidate) {
    return arrayCandidate
      .map(size => {
        const normalizedOption = normalizeSizeOption(
          size,
          arrayCandidate.length === 1 ? rowLevelSizeId : null,
          rowLevelQty,
          rowLevelPrice,
          rowLevelLowStock,
          rowLevelImage,
        );

        if (!normalizedOption) {
          return null;
        }

        if (
          !normalizedOption.id &&
          rowLevelSizeId &&
          normalizeSizeLabel(normalizedOption.name) ===
          normalizeSizeLabel(rowLevelSizeName)
        ) {
          return {
            ...normalizedOption,
            id: toPositiveInteger(rowLevelSizeId),
            size_id: toPositiveInteger(rowLevelSizeId),
          };
        }

        return normalizedOption;
      })
      .filter(Boolean);
  }

  const singleSize = normalizeSizeOption(
    item?.size || getSizeName(item),
    rowLevelSizeId,
    rowLevelQty,
    rowLevelPrice,
    rowLevelLowStock,
    rowLevelImage,
  );
  return singleSize ? [singleSize] : [];
};

const normalizeStockRow = item => {
  const type = getStockItemType(item);
  const isMaterial = type === 'Material';
  const rawQty = item?.qty ?? item?.quantity ?? null;
  const rawQtyMeters = item?.qty_meters ?? item?.qtyMeters ?? null;
  const qtyMeters = getNumericValueFromStock(rawQtyMeters);
  const sizeOptions = !isMaterial ? getSizeOptions(item) : [];
  const sizeNames = sizeOptions.map(size => size.name);
  const outOfStockSizes = sizeOptions
    .filter(size => size?.qty === 0)
    .map(size => size.name);
  const baseId =
    item?.item_id ||
    item?.readymade_id ||
    item?.material_id ||
    item?.id ||
    item?._id ||
    item?.sku_code ||
    item?.sku ||
    item?.name ||
    item?.readymade_name ||
    item?.material_name;
  const sizeId =
    item?.size_id ||
    item?.sizeId ||
    item?.readymade_size_id ||
    item?.readymadeSizeId ||
    item?.inventory_size_id ||
    item?.inventorySizeId ||
    item?.size?.id ||
    item?.size?.size_id ||
    item?.readymade_size?.id ||
    item?.readymade_size?.size_id ||
    item?.size?.name ||
    item?.size?.label ||
    item?.size;
  const rowId = baseId ? `${baseId}` : `temp-${Math.random().toString(36).substring(7)}`;

  return {
    id: String(rowId),
    name:
      item?.name ||
      item?.material_name ||
      item?.readymade_name ||
      'Unnamed Item',
    sku: item?.sku_code || item?.sku?.sku_code || item?.sku || 'N/A',
    type,
    stock:
      getDisplayStock({
        qty: rawQty,
        qty_meters: rawQtyMeters,
        stock: item?.stock,
      }) || '--',
    price: Number(item?.selling_price ?? item?.price) || 0,
    tag: isMaterial
      ? item?.material_type?.name || item?.material_type_name || ''
      : '',
    image: item?.image_url || item?.photo || '',
    brand:
      item?.brand?.name ||
      item?.brand_name ||
      (typeof item?.brand === 'string' ? item?.brand : ''),
    gender:
      item?.section?.name ||
      item?.section_name ||
      (typeof item?.section === 'string' ? item?.section : '') ||
      item?.gender ||
      '',
    sizes: !isMaterial && sizeNames.length > 0 ? sizeNames : undefined,
    sizeOptions,
    outOfStockSizes: !isMaterial ? outOfStockSizes : [],
    qty: rawQty,
    qtyMeters,
    qty_meters: rawQtyMeters,
    lowStock: isLowStockItem(item?.low_stock),
    item_type: item?.item_type,
    image_url: item?.image_url || item?.photo || '',
    item_id: item?.item_id || item?.id || item?._id || '',
    size_id: toPositiveInteger(sizeId) || null,
  };
};

const mergeUnique = items => [...new Set((items || []).filter(Boolean))];

const mergeSizeOptions = (existingOptions = [], nextOptions = []) => {
  const mergedMap = new Map();

  [...existingOptions, ...nextOptions].forEach(option => {
    if (!option?.name && !option?.id) {
      return;
    }

    const key = normalizeSizeLabel(option?.name) || `${option?.id ?? ''}`;
    const previous = mergedMap.get(key);
    const nextQty =
      option?.qty === null || option?.qty === undefined
        ? previous?.qty ?? null
        : Number(option.qty) || 0;
    const nextPrice =
      option?.price === null || option?.price === undefined
        ? previous?.price ?? null
        : getPriceValue(option.price);
    const nextStock = option?.stock || previous?.stock || null;
    const nextLowStock =
      option?.lowStock === undefined ? previous?.lowStock : option.lowStock;
    const nextImage = option?.image || previous?.image || '';
    const normalizedId =
      toPositiveInteger(option?.id ?? option?.size_id) ||
      toPositiveInteger(previous?.id ?? previous?.size_id) ||
      null;

    mergedMap.set(key, {
      ...previous,
      ...option,
      id: normalizedId,
      size_id: normalizedId,
      size: option?.size || option?.name || previous?.size || previous?.name || '',
      qty: nextQty,
      stock: nextStock,
      price: nextPrice,
      lowStock: nextLowStock,
      image: nextImage,
    });
  });

  return Array.from(mergedMap.values());
};

const mergeStockItems = (currentList, nextList) => {
  const mergedMap = new Map();

  [...(currentList || []), ...(nextList || [])].forEach(item => {
    const key = `${item?.type}-${item?.id}`;
    const existing = mergedMap.get(key);

    if (!existing) {
      mergedMap.set(key, {
        ...item,
        sizes: item?.sizes ? [...item.sizes] : item?.sizes,
        sizeOptions: item?.sizeOptions ? [...item.sizeOptions] : item?.sizeOptions,
        outOfStockSizes: item?.outOfStockSizes
          ? [...item.outOfStockSizes]
          : item?.outOfStockSizes,
      });
      return;
    }

    const nextQty =
      (getNumericValueFromStock(existing?.qty) ?? 0) +
      (getNumericValueFromStock(item?.qty) ?? 0);
    const nextQtyMeters =
      (getNumericValueFromStock(existing?.qtyMeters ?? existing?.qty_meters) ?? 0) +
      (getNumericValueFromStock(item?.qtyMeters ?? item?.qty_meters) ?? 0);
    const isMaterial = existing?.type === 'Material';
    const mergedSizeOptions = mergeSizeOptions(
      existing?.sizeOptions || [],
      item?.sizeOptions || [],
    );
    const mergedOutOfStockSizes = !isMaterial
      ? mergedSizeOptions
        .filter(sizeOption => sizeOption?.qty === 0)
        .map(sizeOption => sizeOption.name)
      : mergeUnique([
        ...(existing?.outOfStockSizes || []),
        ...(item?.outOfStockSizes || []),
      ]);

    mergedMap.set(key, {
      ...existing,
      ...item,
      qty: isMaterial ? null : nextQty,
      qtyMeters: isMaterial ? nextQtyMeters : existing?.qtyMeters ?? item?.qtyMeters,
      qty_meters: isMaterial ? nextQtyMeters : existing?.qty_meters ?? item?.qty_meters,
      stock: isMaterial
        ? formatStockDisplay(nextQtyMeters, 'm') || '--'
        : formatStockDisplay(nextQty, 'pcs') || '--',
      sizes:
        existing?.sizes || item?.sizes
          ? mergeUnique([...(existing?.sizes || []), ...(item?.sizes || [])])
          : undefined,
      sizeOptions: mergedSizeOptions,
      size_id: !isMaterial
        ? toPositiveInteger(existing?.size_id) ||
          toPositiveInteger(item?.size_id) ||
          toPositiveInteger(mergedSizeOptions[0]?.id)
        : existing?.size_id ?? item?.size_id ?? null,
      outOfStockSizes: mergeUnique(mergedOutOfStockSizes),
    });
  });

  return Array.from(mergedMap.values());
};

export const getInventoryStockAction = createAsyncThunk(
  'inventoryStock/getAll',
  async (params = {}, { getState, rejectWithValue }) => {
    try {
      const token = await getAuthToken(getState);
      const requestParams = normalizeListParams(params);
      const response = await axios.get(URL_INVENTORY_STOCK, {
        headers: { accept: '*/*', Authorization: token },
        params: requestParams,
      });

      const rawList = Array.isArray(response?.data?.data) ? response.data.data : [];
      const normalizedList = mergeStockItems([], rawList.map(normalizeStockRow));

      return {
        ...response.data,
        data: normalizedList,
        requestParams,
        requestPage: requestParams.page,
      };
    } catch (error) {
      return rejectWithValue(buildErrorPayload(error));
    }
  },
);

const initialState = {
  list: [],
  loading: false,
  paginationLoading: false,
  error: null,
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  },
  lastQuery: normalizeListParams(),
};

const inventoryStockSlice = createSlice({
  name: 'inventoryStock',
  initialState,
  reducers: {
    clearInventoryStockError: state => {
      state.error = null;
    },
  },
  extraReducers: builder => {
    builder
      .addCase(getInventoryStockAction.pending, (state, { meta }) => {
        const requestParams = normalizeListParams(meta.arg);
        const requestPage = Number(requestParams.page) || 1;
        if (requestPage > 1) {
          state.paginationLoading = true;
        } else {
          state.loading = true;
          state.list = [];
          state.pagination = {
            page: 1,
            limit: Number(requestParams.limit) || 10,
            total: 0,
            totalPages: 1,
          };
        }
        state.error = null;
        state.lastQuery = requestParams;
      })
      .addCase(getInventoryStockAction.fulfilled, (state, { payload }) => {
        if (!isSameQuery(payload.requestParams, state.lastQuery)) {
          return;
        }

        state.loading = false;
        state.paginationLoading = false;

        if ((Number(payload.requestPage) || 1) > 1) {
          state.list = mergeStockItems(state.list, payload.data || []);
        } else {
          state.list = payload.data || [];
        }

        const pagination = payload.pagination || {};
        const page = Number(pagination.page) || Number(payload.requestPage) || 1;
        const limit = Number(pagination.limit) || payload.requestParams?.limit || 10;
        const total = Number(pagination.total) || 0;
        const serverTotalPages = Number(pagination.totalPages);
        const computedTotalPages = limit > 0 ? Math.max(1, Math.ceil(total / limit)) : 1;
        const totalPages =
          Number.isFinite(serverTotalPages) && serverTotalPages > 0
            ? Math.max(serverTotalPages, computedTotalPages)
            : computedTotalPages;

        state.pagination = {
          page,
          limit,
          total,
          totalPages,
        };
      })
      .addCase(getInventoryStockAction.rejected, (state, { payload, meta }) => {
        if (!isSameQuery(normalizeListParams(meta.arg), state.lastQuery)) {
          return;
        }

        state.loading = false;
        state.paginationLoading = false;
        state.error = payload;

        if ((Number(meta.arg?.page) || 1) === 1) {
          state.list = [];
          state.pagination = {
            page: 1,
            limit: Number(meta.arg?.limit) || 10,
            total: 0,
            totalPages: 1,
          };
        }
      });
  },
});

export const { clearInventoryStockError } = inventoryStockSlice.actions;
export default inventoryStockSlice.reducer;
