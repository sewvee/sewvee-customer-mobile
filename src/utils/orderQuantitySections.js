import { URL_ORDERS } from '../config/env';

const toArray = value => (Array.isArray(value) ? value : []);

const toNumber = value => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toPositiveInteger = (value, fallback = 1) => {
  const parsed = Math.round(toNumber(value));
  return parsed > 0 ? parsed : fallback;
};

const hasValue = value =>
  value !== null &&
  value !== undefined &&
  `${value}`.trim() !== '';

const normalizeStatusToken = value =>
  String(value || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_');

const isCancelledStatus = value => normalizeStatusToken(value) === 'CANCELLED';

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

const API_BASE_URL = (URL_ORDERS || '')
  .replace(/\/orders\/?$/i, '')
  .replace(/\/+$/, '');

const getFirstNonEmpty = (...values) => {
  for (const value of values) {
    if (value === null || value === undefined) {
      continue;
    }

    const textValue = String(value).trim();
    if (textValue) {
      return textValue;
    }
  }

  return null;
};

const resolveFileUrl = value => {
  const rawValue = getFirstNonEmpty(value);
  if (!rawValue) {
    return null;
  }

  if (/^(https?:|file:|content:|data:)/i.test(rawValue)) {
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

const getMaterialIdentity = (material, index) =>
  getFirstNonEmpty(
    material?.id ? `id:${material.id}` : null,
    material?.linkId ? `link:${material.linkId}` : null,
    material?.material_id ? `material:${material.material_id}` : null,
    [
      material?.name,
      material?.material_name,
      material?.material?.material_name,
      material?.qty,
      material?.quantity,
      material?.price,
      material?.rate,
      material?.total_price,
      material?.totalCost,
      index,
    ]
      .filter(value => value !== null && value !== undefined && `${value}`.trim() !== '')
      .join('|'),
  ) || `material-${index}`;

const getServiceIdentity = (service, index) =>
  getFirstNonEmpty(
    service?.id ? `id:${service.id}` : null,
    service?.service_id ? `service:${service.service_id}` : null,
    [
      service?.service_name,
      service?.name,
      service?.price,
      service?.amount,
      service?.cost,
      service?.quantity_id,
      service?.quantityId,
      index,
    ]
      .filter(value => value !== null && value !== undefined && `${value}`.trim() !== '')
      .join('|'),
  ) || `service-${index}`;

const dedupeByIdentity = (items, getKey) => {
  const seen = new Set();

  return items.filter((item, index) => {
    const key = getKey(item, index);
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
};

const getMaterialUnit = material =>
  normalizeUnit(
    getFirstNonEmpty(
      material?.unit,
      material?.stock_unit,
      material?.uom,
      material?.material?.unit,
      material?.material?.stock_unit,
      material?.material?.uom,
    ),
  ) ||
  (() => {
    const meterFlag = [
      material?.is_meter,
      material?.isMeter,
      material?.material?.is_meter,
      material?.material?.isMeter,
    ].map(getMeterFlagValue).find(flag => flag !== null);

    if (meterFlag === true) {
      return 'm';
    }

    if (meterFlag === false) {
      return 'pcs';
    }

    return material?.type === 'Material' ? 'm' : 'pcs';
  })();

const normalizeMaterial = (material, index) => {
  const rawQty =
    material?.qty ?? material?.quantity ?? material?.qnt ?? material?.count;
  const displayQuantity = getDisplayQuantity(rawQty);
  const parsedQty = Number(rawQty);
  const qty =
    displayQuantity === null
      ? 1
      : Number.isFinite(parsedQty)
        ? parsedQty
        : 0;
  const amount = toNumber(
    material?.total_price ??
      material?.amount ??
      material?.totalCost ??
      material?.sellingPrice * qty ??
      material?.rate * qty,
  );
  const rate = toNumber(
    material?.price ??
      material?.rate ??
      material?.sellingPrice ??
      (qty > 0 ? amount / qty : 0),
  );
  const name =
    material?.name ||
    material?.material_name ||
    material?.material?.material_name ||
    material?.material?.name ||
    'Material';
  const id =
    getFirstNonEmpty(
      material?.id,
      material?.linkId,
      material?.material_id,
      `${name}-${index}`,
    ) || `${name}-${index}`;
  const image = resolveFileUrl(
    material?.image ||
      material?.photo ||
      material?.image_url ||
      material?.thumbnail_url ||
      material?.material?.image ||
      material?.material?.photo ||
      material?.material?.image_url ||
      material?.material?.thumbnail_url,
  );
  const unit = getMaterialUnit(material);

  return {
    ...material,
    amount,
    displayQuantity: displayQuantity || `${qty}`,
    id,
    image,
    images: image ? [image] : [],
    key: `${id}-${index}`,
    name,
    photo: image,
    quantity: qty,
    qty,
    rate,
    sellingPrice: rate,
    totalCost: amount || rate * qty,
    unit,
  };
};

const expandMaterialRows = (materials, quantityKey) =>
  dedupeByIdentity(materials, getMaterialIdentity).flatMap((material, index) => {
    const normalizedMaterial = normalizeMaterial(material, index);
    const unitCount = toPositiveInteger(
      normalizedMaterial?.qty ?? normalizedMaterial?.quantity,
      1,
    );
    const unitAmount =
      unitCount > 0
        ? toNumber(normalizedMaterial.totalCost || normalizedMaterial.amount) / unitCount
        : 0;

    return Array.from({ length: unitCount }, (_, unitIndex) => ({
      ...normalizedMaterial,
      amount: unitAmount,
      key: `${quantityKey}-material-${normalizedMaterial.id}-${unitIndex}`,
      quantity: 1,
      qty: 1,
      totalCost: unitAmount,
      unitIndex,
    }));
  });

const mapQuantityMaterials = materials =>
  dedupeByIdentity(materials, getMaterialIdentity).map((material, index) =>
    normalizeMaterial(material, index),
  );

const normalizeService = (service, index) => {
  const id =
    getFirstNonEmpty(
      service?.id,
      service?.service_id,
      `${service?.service_name || service?.name || 'Service'}-${index}`,
    ) || `service-${index}`;
  const amount = toNumber(service?.price ?? service?.amount ?? service?.cost);
  const quantityId = service?.quantity_id ?? service?.quantityId ?? null;

  return {
    ...service,
    amount,
    cost: amount,
    id,
    name: service?.service_name || service?.name || 'Service',
    quantityId,
    quantity_id: quantityId,
  };
};

const matchesQuantityId = (left, right) => {
  if (left === null || left === undefined || right === null || right === undefined) {
    return false;
  }

  return String(left) === String(right);
};

const distributeRowsAcrossSections = (rows, sectionCount, itemId) => {
  const bucketedRows = Array.from({ length: sectionCount }, () => []);

  rows.forEach((row, index) => {
    const bucketIndex = sectionCount > 0 ? index % sectionCount : 0;
    bucketedRows[bucketIndex].push({
      ...row,
      key: `${itemId}-distributed-${bucketIndex}-${row.id}-${index}`,
    });
  });

  return bucketedRows;
};

const getUnitServices = (item, sectionIndex) => {
  const unitServices = item?.unitServices;

  if (Array.isArray(unitServices)) {
    return toArray(unitServices[sectionIndex]);
  }

  if (unitServices && typeof unitServices === 'object') {
    return toArray(unitServices[sectionIndex]);
  }

  return [];
};

const getQuantityIdentity = (quantity, index, sourceKey) => {
  const quantityId = quantity?.quantity_id ?? quantity?.quantityId ?? null;
  const rowId = quantity?.id ?? quantity?.row_id ?? quantity?.rowId ?? null;

  if (hasValue(quantityId)) {
    return `quantity:${quantityId}`;
  }

  if (hasValue(rowId)) {
    return `row:${rowId}`;
  }

  return `${sourceKey}:${index}`;
};

const getQuantityPriority = quantity => {
  const hasItems = toArray(quantity?.items ?? quantity?.materials).length > 0 ? 1 : 0;
  const hasDates =
    hasValue(quantity?.trial_date ?? quantity?.trialDate) ||
    hasValue(quantity?.delivery_date ?? quantity?.deliveryDate)
      ? 1
      : 0;
  const isCancelled = isCancelledStatus(quantity?.status) ? 100 : 0;

  return isCancelled + hasItems + hasDates;
};

export const getMergedOrderQuantities = item => {
  const activeQuantities = toArray(item?.rawQuantities ?? item?.quantities);
  const cancelledQuantities = toArray(
    item?.rawCancelledQuantities ??
      item?.cancelled_quantities ??
      item?.cancelledQuantities,
  );
  const merged = new Map();

  [
    ...activeQuantities.map((quantity, index) => ({
      identity: getQuantityIdentity(quantity, index, 'active'),
      quantity,
    })),
    ...cancelledQuantities.map((quantity, index) => ({
      identity: getQuantityIdentity(quantity, index, 'cancelled'),
      quantity: {
        ...quantity,
        status:
          quantity?.status ||
          quantity?.status_name ||
          quantity?.statusLabel ||
          'CANCELLED',
      },
    })),
  ].forEach(({ identity, quantity }) => {
    const existingQuantity = merged.get(identity);

    if (!existingQuantity) {
      merged.set(identity, quantity);
      return;
    }

    if (getQuantityPriority(quantity) >= getQuantityPriority(existingQuantity)) {
      merged.set(identity, {
        ...existingQuantity,
        ...quantity,
      });
    }
  });

  return Array.from(merged.values()).sort((left, right) => {
    const leftQuantityId = Number(left?.quantity_id ?? left?.quantityId);
    const rightQuantityId = Number(right?.quantity_id ?? right?.quantityId);

    if (Number.isFinite(leftQuantityId) && Number.isFinite(rightQuantityId)) {
      return leftQuantityId - rightQuantityId;
    }

    return String(left?.id ?? '').localeCompare(String(right?.id ?? ''));
  });
};

const getServiceLinesForSection = (
  item,
  quantity,
  quantityId,
  sectionIndex,
  allServices,
) => {
  const explicitSectionServices = [
    ...toArray(quantity?.services),
    ...toArray(quantity?.addons),
  ];
  const hasTaggedServices = allServices.some(
    service => service?.quantity_id !== undefined || service?.quantityId !== undefined,
  );

  const taggedServices = quantityId === null
    ? []
    : allServices.filter(service =>
        matchesQuantityId(service?.quantity_id ?? service?.quantityId, quantityId),
      );

  const fallbackServices =
    !hasTaggedServices && explicitSectionServices.length === 0
      ? getUnitServices(item, sectionIndex)
      : [];

  const firstSectionServices =
    !hasTaggedServices &&
    explicitSectionServices.length === 0 &&
    fallbackServices.length === 0 &&
    sectionIndex === 0
      ? allServices
      : [];

  return dedupeByIdentity(
    [
      ...explicitSectionServices,
      ...taggedServices,
      ...fallbackServices,
      ...firstSectionServices,
    ].map(normalizeService),
    getServiceIdentity,
  );
};

export const formatQuantityOrdinalLabel = index => {
  if (index === 0) {
    return '1st';
  }

  if (index === 1) {
    return '2nd';
  }

  if (index === 2) {
    return '3rd';
  }

  return `${index + 1}th`;
};

export const getExplicitQuantityMaterialSections = item => {
  const rawQuantities = getMergedOrderQuantities(item);
  const itemId =
    getFirstNonEmpty(item?.id, item?.outfitId, item?.outfit_id, item?.name) ||
    'item';

  return rawQuantities
    .map((quantity, index) => {
      const quantityId = quantity?.quantity_id ?? quantity?.quantityId ?? index + 1;
      const quantityKey = `${itemId}-quantity-${quantityId}-${index}`;
      const materials = mapQuantityMaterials(toArray(quantity?.items)).map((material, materialIndex) => ({
        ...material,
        key: `${quantityKey}-material-${material.id}-${materialIndex}`,
      }));
      const materialsTotal = materials.reduce(
        (sum, material) => sum + toNumber(material?.totalCost ?? material?.amount),
        0,
      );

      return {
        deliveryDate:
          quantity?.delivery_date ?? quantity?.deliveryDate ?? item?.deliveryDate ?? null,
        id:
          getFirstNonEmpty(quantity?.id, `${itemId}-quantity-${quantityId}-${index}`) ||
          `${itemId}-quantity-${quantityId}-${index}`,
        key: quantityKey,
        materials,
        materialsTotal,
        quantityId,
        quantity_id: quantityId,
        raw: quantity,
        services: [],
        servicesTotal: 0,
        status: quantity?.status || item?.status || 'Yet to Start',
        statusId: quantity?.status_id ?? quantity?.statusId ?? null,
        total: materialsTotal,
        trialDate:
          quantity?.trial_date ?? quantity?.trialDate ?? item?.trialDate ?? null,
      };
    })
    .filter(section => section.materials.length > 0);
};

export const getItemQuantitySections = item => {
  if (Array.isArray(item?.quantitySections) && item.quantitySections.length > 0) {
    return item.quantitySections;
  }

  const rawQuantities = getMergedOrderQuantities(item);
  const fallbackSplits = toArray(item?.splits);
  const declaredQty = toPositiveInteger(
    item?.qty ?? item?.quantity ?? item?.qnt ?? item?.count,
    1,
  );
  const unitServicesCount = Array.isArray(item?.unitServices)
    ? item.unitServices.length
    : item?.unitServices && typeof item.unitServices === 'object'
      ? Object.keys(item.unitServices).length
      : 0;
  const sectionCount =
    rawQuantities.length ||
    Math.max(declaredQty, fallbackSplits.length, unitServicesCount, 1);
  const itemId =
    getFirstNonEmpty(item?.id, item?.outfitId, item?.outfit_id, item?.name) || 'item';
  const allServices = toArray(item?.rawServices ?? item?.services ?? item?.addons);
  const hasExplicitQuantityMaterials = rawQuantities.some(
    quantity => toArray(quantity?.items ?? quantity?.materials).length > 0,
  );
  const fallbackMaterialBuckets = hasExplicitQuantityMaterials
    ? []
    : distributeRowsAcrossSections(
        expandMaterialRows(toArray(item?.materials), itemId),
        sectionCount,
        itemId,
      );

  return Array.from({ length: sectionCount }, (_, index) => {
    const quantity = rawQuantities[index] || {};
    const fallbackSplit = fallbackSplits[index] || {};
    const quantityId =
      quantity?.quantity_id ??
      quantity?.quantityId ??
      fallbackSplit?.quantity_id ??
      fallbackSplit?.quantityId ??
      index + 1;
    const rowId =
      getFirstNonEmpty(
        quantity?.id,
        fallbackSplit?.id,
        fallbackSplit?.quantityRowId,
        fallbackSplit?.raw?.id,
      ) || `${itemId}-quantity-${quantityId}-${index}`;
    const quantityKey = `${itemId}-quantity-${quantityId}-${index}`;
    const sectionMaterials =
      toArray(quantity?.items ?? quantity?.materials).length > 0
        ? expandMaterialRows(toArray(quantity?.items ?? quantity?.materials), quantityKey)
        : fallbackMaterialBuckets[index] || [];
    const sectionServices = getServiceLinesForSection(
      item,
      quantity,
      quantityId,
      index,
      allServices,
    );
    const materialsTotal = sectionMaterials.reduce(
      (sum, material) => sum + toNumber(material?.totalCost ?? material?.amount),
      0,
    );
    const servicesTotal = sectionServices.reduce(
      (sum, service) => sum + toNumber(service?.amount ?? service?.cost),
      0,
    );

    return {
      deliveryDate:
        quantity?.delivery_date ??
        quantity?.deliveryDate ??
        fallbackSplit?.deliveryDate ??
        item?.deliveryDate ??
        null,
      id: rowId,
      key: quantityKey,
      materials: sectionMaterials,
      materialsTotal,
      quantityId,
      quantity_id: quantityId,
      raw: quantity,
      services: sectionServices,
      servicesTotal,
      status:
        quantity?.status || fallbackSplit?.status || item?.status || 'Yet to Start',
      statusId:
        quantity?.status_id ?? quantity?.statusId ?? fallbackSplit?.statusId ?? null,
      total: materialsTotal + servicesTotal,
      trialDate:
        quantity?.trial_date ??
        quantity?.trialDate ??
        fallbackSplit?.trialDate ??
        item?.trialDate ??
        null,
    };
  });
};
