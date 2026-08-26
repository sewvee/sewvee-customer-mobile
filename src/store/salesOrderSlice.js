import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import RNFS from 'react-native-fs';
import { Platform } from 'react-native';
import {
  URL_ORDERS,
  URL_PAYMENT_DOWNLOAD,
  URL_PAYMENT_INVOICE,
  URL_ORDER_INVOICE_DOWNLOAD,
  URL_ORDER_TAILORING_COPY,
  URL_ORDER_TAILORING_COPY_DOWNLOAD,
} from '../config/env';
import getAuthToken from '../utils/getAuthToken';
import { formatOrderNumber, formatPaymentBillId } from '../utils/orderIdFormatter';
import {
  getItemQuantitySections,
  getMergedOrderQuantities,
} from '../utils/orderQuantitySections';

const STATUS_ID_LABELS = {
  1: 'Pending',
  2: 'In Progress',
  6: 'Stitching',
  3: 'Completed',
  5: 'Delivered',
  4: 'Cancelled',
};

const API_VALUE_LABELS = {
  AUDIO: 'Audio',
  CANCELLED: 'Cancelled',
  COMPLETED: 'Completed',
  DELIVERED: 'Delivered',
  FAILED: 'Failed',
  IN_PROGRESS: 'In Progress',
  INPROGRESS: 'In Progress',
  MATERIAL: 'Material',
  NORMAL: 'Normal',
  PENDING: 'Pending',
  READYMADE: 'Readymade',
  REFERENCE: 'Reference',
  SALE_ORDER: 'Sales',
  SKETCH: 'Sketch',
  STITCHING: 'Stitching',
  SUCCESS: 'Success',
  TAILORING: 'Tailoring',
  URGENT: 'Urgent',
  YET_TO_START: 'Yet to Start',
};

const ORDER_ITEM_STATUS_IDS = {
  YET_TO_START: 1,
  PENDING: 1,
  STITCHING: 2,
  IN_PROGRESS: 2,
  INPROGRESS: 2,
  COMPLETED: 3,
  DELIVERED: 5,
  CANCELLED: 4,
};

const API_BASE_URL = (URL_ORDERS || '')
  .replace(/\/mobile\/orders\/?$/i, '')
  .replace(/\/+$/, '');

const getStatusLabelFromStatusId = statusId => {
  if (statusId === null || statusId === undefined) {
    return null;
  }

  return STATUS_ID_LABELS[statusId] || STATUS_ID_LABELS[Number(statusId)] || null;
};

const toNumber = value => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toArray = value => (Array.isArray(value) ? value : []);

const compact = list => list.filter(Boolean);

const hasValue = value =>
  value !== null &&
  value !== undefined &&
  `${value}`.trim() !== '';

const getDisplayQuantity = value => {
  if (!hasValue(value)) {
    return null;
  }

  const textValue = `${value}`.trim();
  const numericValue = Number(textValue);

  if (Number.isFinite(numericValue) && /^-?\d+(?:\.0+)?$/.test(textValue)) {
    return `${numericValue}`;
  }

  return textValue;
};

const normalizeUnit = unit => {
  const normalizedUnit = `${unit || ''}`.trim().toLowerCase();

  if (
    normalizedUnit === 'm' ||
    normalizedUnit === 'meter' ||
    normalizedUnit === 'meters' ||
    normalizedUnit === 'metre' ||
    normalizedUnit === 'metres'
  ) {
    return 'm';
  }

  if (
    normalizedUnit === 'pc' ||
    normalizedUnit === 'pcs' ||
    normalizedUnit === 'piece' ||
    normalizedUnit === 'pieces'
  ) {
    return 'pcs';
  }

  return null;
};

const getMeterFlagValue = value => {
  if (value === true || value === 1) {
    return true;
  }

  if (value === false || value === 0) {
    return false;
  }

  const normalizedValue = `${value ?? ''}`.trim().toLowerCase();

  if (['true', '1', 'yes'].includes(normalizedValue)) {
    return true;
  }

  if (['false', '0', 'no'].includes(normalizedValue)) {
    return false;
  }

  return null;
};

const getTailoringMaterialUnit = item =>
  normalizeUnit(
    item?.unit ||
      item?.stock_unit ||
      item?.uom ||
      item?.material?.unit ||
      item?.material?.stock_unit ||
      item?.material?.uom,
  ) ||
  (() => {
    const meterFlag = [
      item?.is_meter,
      item?.isMeter,
      item?.material?.is_meter,
      item?.material?.isMeter,
    ].map(getMeterFlagValue).find(flag => flag !== null);

    if (meterFlag === true) {
      return 'm';
    }

    if (meterFlag === false) {
      return 'pcs';
    }

    return getSalesItemType(item) === 'Material' ? 'm' : 'pcs';
  })();

const formatEnumLabel = value => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const rawValue = String(value).trim();
  const upperValue = rawValue.toUpperCase();

  if (API_VALUE_LABELS[upperValue]) {
    return API_VALUE_LABELS[upperValue];
  }

  return rawValue
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, char => char.toUpperCase());
};

const getOrderTypeLabel = orderType => {
  if (orderType === 'SALE_ORDER') {
    return 'Sales';
  }

  if (orderType === 'TAILORING') {
    return 'Tailoring';
  }

  return 'N/A';
};

const getOrdersResponseData = response => {
  const candidates = [
    response?.data?.data?.data,
    response?.data?.data,
    response?.data?.orders,
    response?.data,
  ];

  const match = candidates.find(item => Array.isArray(item));
  return Array.isArray(match) ? match : [];
};

const getOrdersPaginationData = response => {
  const candidates = [
    response?.data?.data?.pagination,
    response?.data?.data,
    response?.data?.pagination,
    response?.pagination,
  ];

  const match = candidates.find(
    item => item && typeof item === 'object' && !Array.isArray(item),
  );

  return match && typeof match === 'object' && !Array.isArray(match)
    ? match
    : null;
};

const parseDownloadFilename = (contentDisposition, fallbackName) => {
  const headerValue = String(contentDisposition || '').trim();

  if (!headerValue) {
    return fallbackName;
  }

  const utf8Match = headerValue.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]).replace(/["']/g, '');
  }

  const plainMatch = headerValue.match(/filename="?([^";]+)"?/i);
  if (plainMatch?.[1]) {
    return plainMatch[1].trim();
  }

  return fallbackName;
};

const getOrderResponseData = response => {
  const candidates = [
    response?.data?.data?.data,
    response?.data?.data,
    response?.data?.order,
    response?.data,
  ];

  const match = candidates.find(
    item => item && typeof item === 'object' && !Array.isArray(item),
  );

  return match && typeof match === 'object' && !Array.isArray(match) ? match : null;
};

const getOrderStatusesResponseData = response => {
  const candidates = [
    response?.data?.data?.data,
    response?.data?.data,
    response?.data?.statuses,
    response?.data,
  ];

  const match = candidates.find(item => Array.isArray(item));
  return Array.isArray(match) ? match : [];
};

const resolveFileUrl = value => {
  if (!value) {
    return null;
  }

  const rawValue = String(value).trim();
  if (!rawValue) {
    return null;
  }

  if (/^(https?:|file:|content:|data:)/i.test(rawValue)) {
    if (rawValue.includes('localhost:')) {
      const { API_DOMAIN } = require('../config/env');
      return rawValue.replace(/http:\/\/localhost:\d+/, API_DOMAIN);
    }
    return rawValue;
  }

  if (!API_BASE_URL) {
    return rawValue;
  }

  if (rawValue.startsWith('/')) {
    return `${API_BASE_URL}${rawValue}`;
  }

  return `${API_BASE_URL}/${rawValue.replace(/^\/+/, '')}`;
};

const getCustomerName = item =>
  item?.customer?.customerName ||
  item?.customer?.customer_name ||
  item?.customer?.name ||
  item?.customer_name ||
  '-';

const getCustomerMobile = item =>
  item?.customer?.whatsappNumber ||
  item?.customer?.mobile_number ||
  item?.customer?.phone ||
  item?.customer_mobile ||
  '';

const getCustomerDisplayId = item =>
  item?.customer?.displayId ||
  item?.customer?.customerId ||
  item?.customer?.customer_id ||
  item?.customer_display_id ||
  null;

const getStatusLabel = (status, statusId) =>
  formatEnumLabel(status) || getStatusLabelFromStatusId(statusId) || 'N/A';

const getSizeLabel = item =>
  item?.size?.size_name ||
  item?.size?.name ||
  item?.size_name ||
  item?.sizeLabel ||
  (item?.size_id ? `Size #${item.size_id}` : '');

const getMaterialName = item =>
  item?.material?.material_name ||
  item?.material?.name ||
  item?.material_name ||
  (item?.material_id ? `Material #${item.material_id}` : 'Material');

const getReadymadeName = item =>
  item?.readymade?.readymade_name ||
  item?.readymade?.name ||
  item?.readymade_name ||
  (item?.readymade_id ? `Readymade #${item.readymade_id}` : 'Readymade');

const getSalesItemName = item =>
  item?.item_type === 'MATERIAL' ? getMaterialName(item) : getReadymadeName(item);

const getSalesItemType = item =>
  item?.item_type === 'MATERIAL' ? 'Material' : 'Readymade';

const normalizeOrderItem = (item, outfit, order) => {
  const qty =
    toNumber(item?.qty ?? item?.quantity ?? item?.qnt ?? item?.count ?? 0) || 0;
  const rate = toNumber(item?.price ?? item?.rate);
  const amount = toNumber(item?.total_price ?? item?.amount ?? rate * qty);
  const size = getSizeLabel(item);
  const image = resolveFileUrl(
    item?.image ||
      item?.image_url ||
      item?.thumbnail_url ||
      item?.material?.image_url ||
      item?.material?.thumbnail_url ||
      item?.readymade?.image_url ||
      item?.readymade?.thumbnail_url,
  );
  const status = getStatusLabel(item?.status, item?.status_id);

  return {
    ...item,
    id: `${item?.id ?? ''}`,
    qty,
    quantity: qty,
    type: getSalesItemType(item),
    name: getSalesItemName(item),
    amount,
    totalCost: amount,
    rate,
    size,
    status,
    deliveryDate: outfit?.delivery_date || '',
    trialDate: outfit?.trial_date || null,
    sku:
      item?.material?.sku ||
      item?.readymade?.sku ||
      item?.sku ||
      '',
    brand:
      item?.readymade?.brand ||
      item?.material?.brand ||
      item?.brand ||
      '',
    materialType:
      item?.material?.material_type ||
      item?.material?.type ||
      item?.materialType ||
      '',
    gender:
      item?.readymade?.gender ||
      item?.material?.gender ||
      item?.gender ||
      '',
    tag: formatEnumLabel(item?.item_type) || '',
    image,
    images: compact([image]),
    sketches: [],
  };
};

const normalizeService = service => ({
  ...service,
  id: `${service?.id ?? ''}`,
  name: service?.service_name || service?.name || 'Service',
  amount: toNumber(service?.price ?? service?.amount),
  cost: toNumber(service?.price ?? service?.amount),
});

const getOutfitSectionLabel = outfit =>
  outfit?.section?.name ||
  outfit?.section_name ||
  outfit?.section ||
  (outfit?.section_id ? `Section #${outfit.section_id}` : 'N/A');

const getOutfitTypeLabel = outfit =>
  outfit?.outfit?.name ||
  outfit?.outfit_name ||
  outfit?.outfit_type ||
  outfit?.type ||
  outfit?.name ||
  (outfit?.outfit_id ? `Outfit #${outfit.outfit_id}` : `Outfit #${outfit?.id}`);

const getQuantityLevelServices = quantities =>
  quantities.flatMap(quantity => [
    ...compact(toArray(quantity?.services).map(normalizeService)),
    ...compact(toArray(quantity?.addons).map(normalizeService)),
  ]);

const getQuantityLevelMaterials = quantities =>
  quantities.flatMap(quantity =>
    toArray(quantity?.items ?? quantity?.materials).map(normalizeTailoringMaterial),
  );

const buildMeasurementsMap = measurements => {
  const mappedMeasurements = {};

  (Array.isArray(measurements) ? measurements : []).forEach((entry, index) => {
    const label =
      entry?.measurement?.name ||
      entry?.name ||
      entry?.measurement_name ||
      `Measurement ${index + 1}`;

    if (!mappedMeasurements[label]) {
      mappedMeasurements[label] = entry?.value ?? '-';
    }
  });

  return mappedMeasurements;
};

const buildStitchingMap = stitching => {
  const mappedStitching = {};

  (Array.isArray(stitching) ? stitching : []).forEach((entry, index) => {
    const baseLabel = entry?.category?.name || `Style ${index + 1}`;
    const label = mappedStitching[baseLabel]
      ? `${baseLabel} ${index + 1}`
      : baseLabel;
    const value = compact([
      entry?.sub_category?.name,
      entry?.option?.name,
      entry?.sub_option?.name,
    ]).join(' - ');

    mappedStitching[label] = value || 'Selected';
  });

  return mappedStitching;
};

const normalizeTailoringMaterial = item => {
  const rawQty = item?.qty ?? item?.quantity ?? item?.qnt ?? item?.count;
  const qty =
    toNumber(rawQty ?? 0) || 0;
  const rate = toNumber(item?.price ?? item?.rate);
  const amount = toNumber(item?.total_price ?? item?.amount ?? rate * qty);
  const image = resolveFileUrl(
    item?.image ||
      item?.image_url ||
      item?.thumbnail_url ||
      item?.material?.image_url ||
      item?.material?.thumbnail_url ||
      item?.readymade?.image_url ||
      item?.readymade?.thumbnail_url,
  );

  return {
    ...item,
    id: `${item?.id ?? ''}`,
    name: getSalesItemName(item),
    type: getSalesItemType(item),
    qty,
    quantity: qty,
    displayQuantity: getDisplayQuantity(rawQty) || `${qty}`,
    rate,
    sellingPrice: rate,
    amount,
    totalCost: amount,
    unit: getTailoringMaterialUnit(item),
    size: getSizeLabel(item),
    sku:
      item?.material?.sku ||
      item?.readymade?.sku ||
      item?.sku ||
      '',
    image,
    images: compact([image]),
  };
};

const normalizeQuantitySplit = quantity => ({
  ...quantity,
  id: `${quantity?.id ?? ''}`,
  quantityId: quantity?.quantity_id ?? null,
  statusId: quantity?.status_id ?? null,
  status: getStatusLabel(quantity?.status, quantity?.status_id),
  trialDate: quantity?.trial_date ?? null,
  deliveryDate: quantity?.delivery_date ?? null,
});

const getActiveQuantityCount = quantities => {
  const uniqueActiveQuantityIds = new Set();

  quantities.forEach(quantity => {
    if (String(quantity?.status || '').trim().toUpperCase() === 'CANCELLED') {
      return;
    }

    const quantityId = quantity?.quantity_id ?? quantity?.quantityId ?? quantity?.id ?? null;
    if (quantityId !== null && quantityId !== undefined && String(quantityId).trim() !== '') {
      uniqueActiveQuantityIds.add(String(quantityId));
    }
  });

  return uniqueActiveQuantityIds.size;
};

const normalizeOutfitForDetail = (outfit, order) => {
  const quantities = getMergedOrderQuantities(outfit);
  const explicitQty =
    toNumber(outfit?.quantity ?? outfit?.qty ?? outfit?.qnt ?? outfit?.count ?? 0) || 0;
  const qty =
    explicitQty ||
    getActiveQuantityCount(quantities) ||
    1;
  const totalCost = toNumber(outfit?.total_amount ?? outfit?.totalCost);
  const photos = Array.isArray(outfit?.photos) ? outfit.photos : [];
  const referenceImages = photos
    .filter(photo => photo?.file_type !== 'AUDIO' && photo?.category === 'REFERENCE')
    .map(photo => resolveFileUrl(photo?.file_url))
    .filter(Boolean);
  const sketches = photos
    .filter(photo => photo?.file_type !== 'AUDIO' && photo?.category === 'SKETCH')
    .map(photo => resolveFileUrl(photo?.file_url))
    .filter(Boolean);
  const materialImages = photos
    .filter(photo => photo?.file_type !== 'AUDIO' && photo?.category === 'MATERIAL')
    .map(photo => resolveFileUrl(photo?.file_url))
    .filter(Boolean);
  const measurementDressImages = photos
    .filter(
      photo =>
        photo?.file_type !== 'AUDIO' &&
        photo?.category === 'MEASUREMENT_DRESS',
    )
    .map(photo => resolveFileUrl(photo?.file_url))
    .filter(Boolean);
  const audioFile = photos.find(
    photo => photo?.file_type === 'AUDIO' || photo?.category === 'AUDIO',
  );
  const stitching = Array.isArray(outfit?.stitching) ? outfit.stitching : [];
  const measurements = {
    ...buildMeasurementsMap(outfit?.measurements),
    ...buildStitchingMap(stitching),
  };
  const topLevelServices = Array.isArray(outfit?.services)
    ? outfit.services.map(normalizeService)
    : [];
  const quantityLevelServices = getQuantityLevelServices(quantities);
  const services = [...topLevelServices, ...quantityLevelServices];
  const rawServices = [
    ...(Array.isArray(outfit?.services) ? outfit.services : []),
    ...quantities.flatMap(quantity => [
      ...toArray(quantity?.services),
      ...toArray(quantity?.addons),
    ]),
  ];
  const topLevelMaterials = Array.isArray(outfit?.items)
    ? outfit.items.map(normalizeTailoringMaterial)
    : [];
  const quantityLevelMaterials = getQuantityLevelMaterials(quantities);
  const materials =
    topLevelMaterials.length > 0 ? topLevelMaterials : quantityLevelMaterials;
  const rawSplits = quantities.map(normalizeQuantitySplit);
  const type = getOutfitTypeLabel(outfit);
  const sectionLabel = getOutfitSectionLabel(outfit);

  const normalizedOutfit = {
    ...outfit,
    id: `${outfit?.id ?? ''}`,
    type,
    name: type,
    qty,
    quantity: qty,
    totalCost,
    amount: totalCost,
    notes: outfit?.customer_notes || order?.order_notes || '',
    deliveryDate: outfit?.delivery_date || order?.delivery_date || '',
    trialDate: outfit?.trial_date || null,
    status: getStatusLabel(outfit?.status, outfit?.status_id || order?.status_id),
    urgency: formatEnumLabel(outfit?.urgency) || 'Normal',
    orderType: formatEnumLabel(outfit?.outfit_order_type) || 'Stitching',
    measurementDressGiven: outfit?.is_measurement_dress_given ? 'Yes' : 'No',
    requestedPhotosFromClient: outfit?.requested_photos_from_client || outfit?.requestedPhotosFromClient || false,
    measurements,
    rawQuantities: quantities,
    rawCancelledQuantities: toArray(outfit?.cancelled_quantities ?? outfit?.cancelledQuantities),
    rawServices,
    services,
    addons: services,
    materials,
    stitching,
    rawMeasurements: Array.isArray(outfit?.measurements) ? outfit.measurements : [],
    rawStitching: stitching,
    images: referenceImages,
    sketches,
    materialImages,
    measurementDressImages,
    audioUri: resolveFileUrl(audioFile?.file_url),
    audioDuration: toNumber(audioFile?.duration),
    unitServices: qty > 1 ? Array.from({ length: qty }, () => services) : undefined,
    gender: sectionLabel,
    section: sectionLabel,
  };

  const quantitySections = getItemQuantitySections({
    ...normalizedOutfit,
    rawQuantities: quantities,
    rawCancelledQuantities: normalizedOutfit.rawCancelledQuantities,
    rawServices,
    splits: rawSplits,
  });

  const quantitySectionsTotal = quantitySections.reduce(
    (sum, split) => sum + toNumber(split?.total),
    0,
  );

  return {
    ...normalizedOutfit,
    totalCost: totalCost || quantitySectionsTotal,
    amount: totalCost || quantitySectionsTotal,
    quantitySections,
    splits: quantitySections,
  };
};

const normalizePayment = payment => {
  const invoiceUrl = resolveFileUrl(payment?.invoice_url || payment?.invoiceUrl);
  const formattedBillId = formatPaymentBillId(payment?.bill_id || payment?.billId || '');

  return {
    ...payment,
    id: `${payment?.id ?? ''}`,
    bill_id: formattedBillId,
    billId: formattedBillId,
    orderId: `${payment?.order_id ?? payment?.orderId ?? ''}`,
    amount: toNumber(payment?.amount),
    mode: formatEnumLabel(payment?.payment_mode) || payment?.mode || 'Cash',
    paymentMode:
      formatEnumLabel(payment?.payment_mode) || payment?.paymentMode || 'Cash',
    transactionId: payment?.transaction_id || payment?.transactionId || '',
    status: formatEnumLabel(payment?.payment_status) || payment?.status || 'Pending',
    balance: toNumber(payment?.balance_amount ?? payment?.balance),
    date: payment?.created_at || payment?.date || payment?.updated_at || '',
    invoiceUrl,
    invoice_url: invoiceUrl,
  };
};

const normalizeOrderStatusOption = status => {
  const rawValue =
    status?.status ||
    status?.name ||
    status?.status_name ||
    status?.code ||
    status?.label ||
    '';
  const normalizedValue = String(rawValue || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_');
  const statusId = status?.id ?? status?.status_id ?? status?.value ?? null;
  const activeValue = status?.is_active ?? status?.active ?? status?.status_state;
  const isActive =
    activeValue === undefined ||
    activeValue === null ||
    activeValue === true ||
    activeValue === 1 ||
    String(activeValue).toLowerCase() === '1' ||
    String(activeValue).toLowerCase() === 'true' ||
    String(activeValue).toLowerCase() === 'active';

  return {
    ...status,
    id: `${statusId ?? normalizedValue}`,
    statusId: statusId !== null && statusId !== undefined ? Number(statusId) || statusId : null,
    value: normalizedValue,
    label: formatEnumLabel(rawValue) || rawValue || 'N/A',
    isActive,
  };
};

const normalizeOrderForList = item => {
  const orderType = item?.order_type || 'N/A';
  const outfits = Array.isArray(item?.outfits) ? item.outfits : [];
  const normalizedOutfits = outfits.map(outfit =>
    normalizeOutfitForDetail(outfit, item),
  );
  const saleOrderItems = Array.isArray(outfits?.[0]?.items)
    ? outfits[0].items.map(orderItem => normalizeOrderItem(orderItem, outfits[0], item))
    : [];
    const totalItemsCount =
      orderType === 'SALE_ORDER'
        ? saleOrderItems.length
        : Number(item?.total_outfits || item?.total_items) || normalizedOutfits.length || 0;
  const subtotalAmount = toNumber(item?.total_amount ?? item?.subtotal ?? item?.total);
  const finalAmount =
    toNumber(item?.final_amount ?? item?.total_amount ?? item?.total) || 0;
  const paidAmount = toNumber(item?.paid_amount ?? item?.advance_payment ?? item?.advance);
  const balanceAmount = toNumber(item?.balance_amount ?? item?.due ?? item?.balance);
  const discountAmount = toNumber(item?.discount_amount ?? item?.discount);
  const customerName = getCustomerName(item);
  const status = getStatusLabel(item?.status, item?.status_id);
  const orderDate =
    item?.order_date || item?.created_at || item?.createdAt || '';
  const normalizedPayments = Array.isArray(item?.payments)
    ? item.payments.map(normalizePayment)
    : [];
  const urgency = normalizedOutfits.find(outfit => outfit?.urgency)?.urgency || 'Normal';
  const tailorCopyUrl = resolveFileUrl(
    item?.tailor_copy_url ||
      item?.tailorCopyUrl ||
      item?.tailoring_copy_url ||
      item?.tailoringCopyUrl ||
      item?.tailor_copy?.url ||
      item?.tailorCopy?.url,
  );

  return {
    ...item,
    id: `${item?.id ?? item?.order_id ?? ''}`,
    billNo: formatOrderNumber(
      item?.billNo ||
      item?.bill_no ||
      item?.order_no ||
      item?.order_number ||
      (item?.order_id !== undefined && item?.order_id !== null ? `${item.order_id}` : `${item?.id ?? 'N/A'}`)
    ),
    customerName,
    customer: item?.customer || null,
    customerId: item?.customer_id ?? item?.customer?.id ?? '',
    customerMobile: getCustomerMobile(item),
    customerDisplayId: getCustomerDisplayId(item),
    date: orderDate,
    createdAt: item?.created_at || item?.createdAt || orderDate,
    updatedAt: item?.updated_at || item?.updatedAt || '',
    deliveryDate: item?.delivery_date || item?.deliveryDate || '',
    total: finalAmount,
    totalAmount: subtotalAmount,
    subtotal: subtotalAmount,
    finalAmount,
    advance: paidAmount,
    balance: balanceAmount,
    discount: discountAmount,
    discountAmount,
    discountType:
      item?.discount_type === 'PERCENTAGE'
        ? '%'
        : item?.discount_type || item?.discountType || '%',
    discountValue: toNumber(item?.discount_value ?? item?.discountValue),
    status,
    orderTypeApi: orderType,
    orderCategory: getOrderTypeLabel(orderType),
    totalItemsCount,
    notes: item?.order_notes || item?.notes || '-',
    orderNotes: item?.order_notes || item?.notes || '',
    urgency,
    tailorCopyUrl,
    tailor_copy_url: tailorCopyUrl,
    outfits: orderType === 'SALE_ORDER' ? [] : normalizedOutfits,
    items: orderType === 'SALE_ORDER' ? saleOrderItems : [],
    saleItems: saleOrderItems,
    payments: normalizedPayments,
  };
};

export const getOrdersListAction = createAsyncThunk(
  'salesOrder/list',
  async (payload = {}, { getState, rejectWithValue }) => {
    try {
      const token = await getAuthToken(getState);
      const params = {};

      if (payload?.search) {
        params.search = payload.search;
      }

      if (payload?.order_type) {
        params.order_type = payload.order_type;
      }

      if (payload?.status_id !== undefined && payload?.status_id !== null && payload?.status_id !== '') {
        params.status_id = payload.status_id;
      }

      if (payload?.payment_status) {
        params.payment_status = payload.payment_status;
      }

      if (payload?.sort_by) {
        params.sort_by = payload.sort_by;
      }

      if (payload?.page !== undefined && payload?.page !== null && payload?.page !== '') {
        params.page = payload.page;
      }

      if (payload?.limit !== undefined && payload?.limit !== null && payload?.limit !== '') {
        params.limit = payload.limit;
      }

      params._t = Date.now(); // Cache buster to ensure we get fresh data

      let url = URL_ORDERS;
      if (payload?.customer_id) {
        url = `${URL_ORDERS}/customer/${payload.customer_id}`;
      }

      console.log('Fetching Orders API Request:', { url, params });

      const response = await axios.get(url, {
        params,
        headers: {
          accept: '*/*',
          Authorization: token,
        },
      });

      console.log('Fetching Orders API Response:', response.data);

      const orders = getOrdersResponseData(response).map(normalizeOrderForList);
      const pagination = getOrdersPaginationData(response);
      const currentPage = Number(
        pagination?.page ??
        pagination?.currentPage ??
        pagination?.current_page ??
        payload?.page ??
        1,
      ) || 1;
      const total = Number(
        pagination?.total ??
        pagination?.totalCount ??
        pagination?.total_count ??
        orders.length,
      ) || 0;
      const limit = Number(
        pagination?.limit ??
        pagination?.perPage ??
        pagination?.per_page ??
        payload?.limit ??
        orders.length,
      ) || orders.length || 0;
      const totalPages = Number(
        pagination?.totalPages ??
        pagination?.total_pages ??
        pagination?.lastPage ??
        pagination?.last_page ??
        (limit > 0 ? Math.ceil(total / limit) : currentPage),
      ) || currentPage;

      return {
        orders,
        append: !!payload?.append,
        storeInList: payload?.storeInList !== false,
        silent: !!payload?.silent,
        query: params,
        pagination: {
          page: currentPage,
          totalPages,
          total,
          limit,
          hasNextPage: currentPage < totalPages,
        },
      };
    } catch (error) {
      console.log('Fetching Orders API Error:', error.response?.data || error.message);
      return rejectWithValue(error.response?.data || error.message);
    }
  },
);

export const getOrderByIdAction = createAsyncThunk(
  'salesOrder/byId',
  async (orderId, { getState, rejectWithValue }) => {
    try {
      const token = await getAuthToken(getState);
      const response = await axios.get(`${URL_ORDERS}/${orderId}`, {
        headers: {
          accept: '*/*',
          Authorization: token,
        },
      });

      const orderData = getOrderResponseData(response);
      if (!orderData) {
        return rejectWithValue(
          response?.data || { message: 'Order details not found' },
        );
      }

      return normalizeOrderForList(orderData);
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  },
);

export const getOrderStatusesAction = createAsyncThunk(
  'salesOrder/statuses',
  async (_, { getState, rejectWithValue }) => {
    try {
      const token = await getAuthToken(getState);
      const response = await axios.get(`${URL_ORDERS}/status`, {
        headers: {
          accept: '*/*',
          Authorization: token,
        },
      });

      return getOrderStatusesResponseData(response)
        .map(normalizeOrderStatusOption)
        .filter(status => status.isActive);
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  },
);

export const createSalesOrderAction = createAsyncThunk(
  'salesOrder/create',
  async (payload, { getState, rejectWithValue }) => {
    try {
      const token = await getAuthToken(getState);
      const response = await axios.post(URL_ORDERS, payload, {
        headers: {
          'Content-Type': 'application/json',
          accept: '*/*',
          Authorization: token,
        },
      });

      if (response.data && response.data.success === false) {
        return rejectWithValue(response.data);
      }

      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  },
);

export const updateOrderItemDatesAction = createAsyncThunk(
  'salesOrder/updateItemDates',
  async (payload, { getState, rejectWithValue }) => {
    try {
      const token = await getAuthToken(getState);
      const itemId = payload?.itemId ?? payload?.id;
      const requestBody = {};

      if (Object.prototype.hasOwnProperty.call(payload || {}, 'trial_date')) {
        requestBody.trial_date = payload?.trial_date ?? null;
      }

      if (Object.prototype.hasOwnProperty.call(payload || {}, 'delivery_date')) {
        requestBody.delivery_date = payload?.delivery_date ?? null;
      }

      const response = await axios.patch(
        `${URL_ORDERS}/item/${itemId}/dates`,
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json',
            accept: '*/*',
            Authorization: token,
          },
        },
      );

      if (response.data && response.data.success === false) {
        return rejectWithValue(response.data);
      }

      return {
        ...response.data,
        itemId,
        targetField:
          Object.prototype.hasOwnProperty.call(requestBody, 'trial_date')
            ? 'trial_date'
            : 'delivery_date',
      };
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  },
);

export const updateOrderItemStatusAction = createAsyncThunk(
  'salesOrder/updateItemStatus',
  async (payload, { getState, rejectWithValue }) => {
    try {
      const token = await getAuthToken(getState);
      const itemId = payload?.itemId ?? payload?.id;
      const normalizedStatus = String(payload?.status || payload?.statusLabel || 'PENDING')
        .trim()
        .toUpperCase()
        .replace(/\s+/g, '_');

      const requestBody = {
        status_id:
          payload?.status_id ??
          payload?.statusId ??
          ORDER_ITEM_STATUS_IDS[normalizedStatus] ??
          ORDER_ITEM_STATUS_IDS.PENDING,
        status: normalizedStatus,
        item_id: payload?.item_id ?? itemId,
      };

      if (payload?.order_id !== undefined && payload?.order_id !== null && payload?.order_id !== '') {
        requestBody.order_id = payload.order_id;
      }

      if (payload?.outfit_id !== undefined && payload?.outfit_id !== null && payload?.outfit_id !== '') {
        requestBody.outfit_id = payload.outfit_id;
      }

      if (payload?.quantity_id !== undefined && payload?.quantity_id !== null && payload?.quantity_id !== '') {
        requestBody.quantity_id = payload.quantity_id;
      }

      const response = await axios.patch(
        `${URL_ORDERS}/item/${itemId}/status`,
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json',
            accept: '*/*',
            Authorization: token,
          },
        },
      );

      if (response.data && response.data.success === false) {
        return rejectWithValue(response.data);
      }

      return {
        ...response.data,
        itemId,
        normalizedStatus,
        outfitId: payload?.outfit_id ?? null,
        orderId: payload?.order_id ?? null,
        quantityId: payload?.quantity_id ?? null,
      };
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  },
);

export const updateOrderStatusAction = createAsyncThunk(
  'salesOrder/updateStatus',
  async (payload, { getState, rejectWithValue }) => {
    try {
      console.log(payload);
      
      const token = await getAuthToken(getState);
      const orderId = payload?.orderId ?? payload?.id;
      const response = await axios.patch(
        `${URL_ORDERS}/${orderId}/status`,
        {status_id: payload?.status },
        {
          headers: {
            'Content-Type': 'application/json',
            accept: '*/*',
            Authorization: token,
          },
        },
      );
console.log('ress',response);

      if (response.data && response.data.success === false) {
        return rejectWithValue(response.data);
      }

      return {
        ...response.data,
        orderId,
      };
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  },
);

export const downloadOrderCopyAction = createAsyncThunk(
  'salesOrder/downloadOrderCopy',
  async (payload, { getState, rejectWithValue }) => {
    try {
      const token = await getAuthToken(getState);
      const copyType = payload?.copyType === 'tailor' ? 'tailor' : 'customer';
      const paymentId = payload?.paymentId;
      const orderId = payload?.orderId;
      const tailoringCopyId = orderId;
      const previewOnly = !!payload?.previewOnly;
      const directFileUrl = resolveFileUrl(payload?.fileUrl);

      if (copyType === 'customer' && !paymentId && !orderId && !directFileUrl) {
        return rejectWithValue({
          message: 'Payment details missing for customer copy download',
        });
      }

      if (copyType === 'tailor' && !tailoringCopyId && !directFileUrl) {
        return rejectWithValue({
          message: 'Tailoring copy ID missing for tailoring copy download',
        });
      }

      // Customer Copy preview: GET /mobile/payments/{paymentId}/invoice
      // Customer Copy download: GET /mobile/payments/{paymentId}/invoice/download
      // Fall back to the legacy order invoice endpoint only when paymentId is unavailable.
      // Tailoring Copy preview: GET /mobile/orders/{id}/tailoringcopy
      // Tailoring Copy download: GET /mobile/orders/{id}/tailoringcopy/download
      const endpoint =
        copyType === 'customer'
          ? paymentId
            ? (previewOnly ? URL_PAYMENT_INVOICE(paymentId) : URL_PAYMENT_DOWNLOAD(paymentId))
            : (directFileUrl || URL_ORDER_INVOICE_DOWNLOAD(orderId))
          : previewOnly
            ? URL_ORDER_TAILORING_COPY(tailoringCopyId)
            : (directFileUrl || URL_ORDER_TAILORING_COPY_DOWNLOAD(tailoringCopyId));
      
      const fallbackFilename =
        copyType === 'customer'
          ? `Customer_Copy_${paymentId || orderId}.pdf`
          : `Tailoring_Copy_${tailoringCopyId}.pdf`;
      const targetDirectory =
        previewOnly
          ? RNFS.CachesDirectoryPath
          : Platform.OS === 'android'
          ? RNFS.DownloadDirectoryPath
          : RNFS.DocumentDirectoryPath;
      const tempFilePath = `${targetDirectory}/${previewOnly ? 'invoice_preview' : 'preview_download'}_${Date.now()}.pdf`;
      
      let responseHeaders = {};

      const downloadResult = await RNFS.downloadFile({
        fromUrl: endpoint,
        toFile: tempFilePath,
        headers: {
          accept: '*/*',
          Authorization: token,
        },
        begin: result => {
          responseHeaders = result?.headers || {};
        },
      }).promise;

      if (downloadResult.statusCode !== 200) {
        const tempExists = await RNFS.exists(tempFilePath).catch(() => false);
        if (tempExists) {
          await RNFS.unlink(tempFilePath).catch(() => null);
        }

        return rejectWithValue({
          message: `Download failed with status ${downloadResult.statusCode}`,
          statusCode: downloadResult.statusCode,
        });
      }

      const contentDisposition =
        responseHeaders?.['content-disposition'] ||
        responseHeaders?.['Content-Disposition'];
      const fileName = parseDownloadFilename(
        contentDisposition,
        fallbackFilename,
      );
      const finalFilePath = previewOnly
        ? tempFilePath
        : `${targetDirectory}/${fileName}`;

      if (!previewOnly && String(finalFilePath) !== String(tempFilePath)) {
        const finalFileExists = await RNFS.exists(finalFilePath).catch(() => false);

        if (finalFileExists) {
          await RNFS.unlink(finalFilePath);
        }

        await RNFS.copyFile(tempFilePath, finalFilePath);
        await RNFS.unlink(tempFilePath).catch(() => null);
      }

      const finalExists = await RNFS.exists(finalFilePath).catch(() => false);

      if (!finalExists) {
        return rejectWithValue({
          message: 'Downloaded file was not saved to device storage',
        });
      }

      if (!previewOnly && Platform.OS === 'android' && typeof RNFS.scanFile === 'function') {
        await RNFS.scanFile(finalFilePath).catch(() => null);
      }
      return {
        copyType,
        fileName,
        filePath: finalFilePath,
        paymentId: paymentId ?? null,
        orderId: orderId ?? null,
        previewOnly,
      };
    } catch (error) {
      console.log('[Download] ERROR:', { error: error?.message, errorFull: error });
      return rejectWithValue({
        message:
          error?.message ||
          error?.error ||
          error?.response?.data?.message ||
          'Download Failed',
      });
    }
  },
);

const initialState = {
  loading: false,
  listLoading: false,
  listPaginationLoading: false,
  listLoaded: false,
  listNeedsRefresh: false,
  listPage: 1,
  listTotalPages: 1,
  listTotal: 0,
  listLimit: 10,
  listHasNextPage: false,
  currentOrderLoading: false,
  currentOrderError: null,
  currentOrderId: null,
  orderItemStatusesLoading: false,
  orderItemStatusesLoaded: false,
  orderItemStatusesError: null,
  orderItemStatuses: [],
  updateOrderItemDatesLoading: false,
  updateOrderItemDatesTarget: null,
  updateOrderItemDatesError: null,
  updateOrderItemStatusLoading: false,
  updateOrderItemStatusItemId: null,
  updateOrderItemStatusError: null,
  updateStatusLoading: false,
  updateStatusOrderId: null,
  updateStatusError: null,
  downloadOrderCopyLoading: false,
  downloadOrderCopyError: null,
  downloadOrderCopyMeta: null,
  error: null,
  listError: null,
  currentOrder: null,
  ordersList: [],
};

const salesOrderSlice = createSlice({
  name: 'salesOrder',
  initialState,
  reducers: {
    clearSalesOrderError: state => {
      state.error = null;
    },
    markOrdersListForRefresh: state => {
      state.listNeedsRefresh = true;
    },
    setListQuery(state, action) {
      state.listQuery = action.payload;
    },
    setInitialOrdersList(state, action) {
      if (state.ordersList.length === 0 && action.payload && action.payload.length > 0) {
        state.ordersList = action.payload;
      }
    },
    resetSalesOrderState: state => {
      Object.assign(state, initialState);
    },
  },
  extraReducers: builder => {
    builder
      .addCase(getOrdersListAction.pending, (state, action) => {
        const shouldStoreInList = action.meta.arg?.storeInList !== false;
        state.listError = null;
        if (!shouldStoreInList) {
          return;
        }

        if (action.meta.arg?.silent) {
          return;
        }

        if (action.meta.arg?.append) {
          state.listPaginationLoading = true;
        } else {
          state.listLoading = true;
        }
      })
      .addCase(getOrdersListAction.fulfilled, (state, { payload }) => {
        if (payload?.storeInList === false) {
          return;
        }

        state.listLoading = false;
        state.listPaginationLoading = false;
        state.listLoaded = true;
        state.listNeedsRefresh = false;
        state.listPage = payload?.pagination?.page || 1;
        state.listTotalPages = payload?.pagination?.totalPages || 1;
        state.listTotal = payload?.pagination?.total || 0;
        state.listLimit = payload?.pagination?.limit || state.listLimit;
        state.listHasNextPage = !!payload?.pagination?.hasNextPage;

        const newOrders = payload?.orders || [];
        const existingMap = new Map(state.ordersList.map(o => [String(o.id), o]));
        const mergedNewOrders = newOrders.map(newOrder => {
            const existing = existingMap.get(String(newOrder.id));
            if (existing) {
                const newHasOutfits = newOrder.outfits && newOrder.outfits.length > 0;
                const existingHasOutfits = existing.outfits && existing.outfits.length > 0;
                
                if (existingHasOutfits && !newHasOutfits) {
                    return { ...newOrder, outfits: existing.outfits, items: existing.items, saleItems: existing.saleItems };
                }
                
                if (existingHasOutfits && newHasOutfits) {
                    const newTime = new Date(newOrder.updatedAt || newOrder.updated_at || 0).getTime();
                    const oldTime = new Date(existing.updatedAt || existing.updated_at || 0).getTime();
                    
                    if (newTime > oldTime) {
                        return newOrder;
                    }

                    const mergedOutfits = newOrder.outfits.map(newOutfit => {
                        const existingOutfit = existing.outfits.find(eo => String(eo.id) === String(newOutfit.id));
                        if (existingOutfit) {
                            return {
                                ...newOutfit,
                                quantitySections: existingOutfit.quantitySections?.length ? existingOutfit.quantitySections : newOutfit.quantitySections,
                                splits: existingOutfit.splits?.length ? existingOutfit.splits : newOutfit.splits,
                                status: existingOutfit.status,
                                status_id: existingOutfit.status_id,
                                deliveryDate: existingOutfit.deliveryDate,
                                delivery_date: existingOutfit.delivery_date
                            };
                        }
                        return newOutfit;
                    });
                    return { ...newOrder, outfits: mergedOutfits, status: existing.status, status_id: existing.status_id };
                }
            }
            return newOrder;
        });

        if (payload?.append) {
          const mergedOrders = [...state.ordersList, ...mergedNewOrders];
          const dedupedOrders = [];
          const seenIds = new Set();

          mergedOrders.forEach(order => {
            const orderId = String(order?.id ?? '');
            if (seenIds.has(orderId)) {
              return;
            }

            seenIds.add(orderId);
            dedupedOrders.push(order);
          });

          state.ordersList = dedupedOrders;
          return;
        }

        state.ordersList = mergedNewOrders;
      })
      .addCase(getOrdersListAction.rejected, (state, action) => {
        const shouldStoreInList = action.meta.arg?.storeInList !== false;
        if (!shouldStoreInList) {
          return;
        }

        state.listLoading = false;
        state.listPaginationLoading = false;
        state.listLoaded = true;
        state.listError = action.payload;
      })
      .addCase(getOrderByIdAction.pending, (state, action) => {
        state.currentOrderLoading = true;
        state.currentOrderError = null;
        state.currentOrderId = action.meta.arg ?? null;
      })
      .addCase(getOrderByIdAction.fulfilled, (state, { payload }) => {
        state.currentOrderLoading = false;
        state.currentOrderError = null;
        state.currentOrderId = payload?.id ?? null;
        state.currentOrder = payload || null;

        const orderIndex = state.ordersList.findIndex(
          order => String(order?.id ?? '') === String(payload?.id ?? ''),
        );

        if (orderIndex >= 0) {
          state.ordersList[orderIndex] = payload;
        }
      })
      .addCase(getOrderByIdAction.rejected, (state, { payload, meta }) => {
        state.currentOrderLoading = false;
        state.currentOrderError = payload;
        state.currentOrderId = meta.arg ?? null;
      })
      .addCase(getOrderStatusesAction.pending, state => {
        state.orderItemStatusesLoading = true;
        state.orderItemStatusesError = null;
      })
      .addCase(getOrderStatusesAction.fulfilled, (state, { payload }) => {
        state.orderItemStatusesLoading = false;
        state.orderItemStatusesLoaded = true;
        state.orderItemStatusesError = null;
        state.orderItemStatuses = payload || [];
      })
      .addCase(getOrderStatusesAction.rejected, (state, { payload }) => {
        state.orderItemStatusesLoading = false;
        state.orderItemStatusesLoaded = true;
        state.orderItemStatusesError = payload;
      })
      .addCase(updateOrderItemDatesAction.pending, (state, action) => {
        state.updateOrderItemDatesLoading = true;
        state.updateOrderItemDatesError = null;
        state.updateOrderItemDatesTarget = {
          itemId: action.meta.arg?.itemId ?? action.meta.arg?.id ?? null,
          targetField: Object.prototype.hasOwnProperty.call(
            action.meta.arg || {},
            'trial_date',
          )
            ? 'trial_date'
            : 'delivery_date',
        };
      })
      .addCase(updateOrderItemDatesAction.fulfilled, state => {
        state.updateOrderItemDatesLoading = false;
        state.updateOrderItemDatesError = null;
        state.updateOrderItemDatesTarget = null;
        state.listNeedsRefresh = true;
      })
      .addCase(updateOrderItemDatesAction.rejected, (state, { payload }) => {
        state.updateOrderItemDatesLoading = false;
        state.updateOrderItemDatesError = payload;
        state.updateOrderItemDatesTarget = null;
      })
      .addCase(updateOrderItemStatusAction.pending, (state, action) => {
        state.updateOrderItemStatusLoading = true;
        state.updateOrderItemStatusError = null;
        state.updateOrderItemStatusItemId =
          action.meta.arg?.itemId ?? action.meta.arg?.id ?? null;
      })
      .addCase(updateOrderItemStatusAction.fulfilled, state => {
        state.updateOrderItemStatusLoading = false;
        state.updateOrderItemStatusError = null;
        state.updateOrderItemStatusItemId = null;
        state.listNeedsRefresh = true;
      })
      .addCase(updateOrderItemStatusAction.rejected, (state, { payload }) => {
        state.updateOrderItemStatusLoading = false;
        state.updateOrderItemStatusError = payload;
        state.updateOrderItemStatusItemId = null;
      })
      .addCase(createSalesOrderAction.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createSalesOrderAction.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.currentOrder = null;
        state.currentOrderId = null;
        state.listLoaded = false;
        state.listNeedsRefresh = true;
      })
      .addCase(createSalesOrderAction.rejected, (state, { payload }) => {
        state.loading = false;
        state.error = payload;
      })
      .addCase(updateOrderStatusAction.pending, (state, action) => {
        state.updateStatusLoading = true;
        state.updateStatusError = null;
        state.updateStatusOrderId = action.meta.arg?.orderId ?? action.meta.arg?.id ?? null;
      })
      .addCase(updateOrderStatusAction.fulfilled, state => {
        state.updateStatusLoading = false;
        state.updateStatusError = null;
        state.updateStatusOrderId = null;
        state.listNeedsRefresh = true;
      })
      .addCase(updateOrderStatusAction.rejected, (state, { payload }) => {
        state.updateStatusLoading = false;
        state.updateStatusError = payload;
        state.updateStatusOrderId = null;
      })
      .addCase(downloadOrderCopyAction.pending, (state, action) => {
        state.downloadOrderCopyLoading = true;
        state.downloadOrderCopyError = null;
        state.downloadOrderCopyMeta = action.meta.arg || null;
      })
      .addCase(downloadOrderCopyAction.fulfilled, (state, { payload }) => {
        state.downloadOrderCopyLoading = false;
        state.downloadOrderCopyError = null;
        state.downloadOrderCopyMeta = payload || null;
      })
      .addCase(downloadOrderCopyAction.rejected, (state, { payload, meta }) => {
        state.downloadOrderCopyLoading = false;
        state.downloadOrderCopyError = payload || null;
        state.downloadOrderCopyMeta = meta.arg || null;
      });
  },
});

export const {
  clearSalesOrderError,
  markOrdersListForRefresh,
  resetSalesOrderState,
  setInitialOrdersList,
} = salesOrderSlice.actions;
export default salesOrderSlice.reducer;
