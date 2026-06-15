const hasStockFieldValue = value =>
  value !== null &&
  value !== undefined &&
  `${value}`.trim() !== '';

const normalizeStockUnit = unit => {
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

export const getNumericValueFromStock = value => {
  if (!hasStockFieldValue(value)) {
    return null;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  const match = `${value}`.trim().match(/-?\d+(?:\.\d+)?/);
  if (!match) {
    return null;
  }

  const parsedValue = Number(match[0]);
  return Number.isFinite(parsedValue) ? parsedValue : null;
};

const formatStockAmount = value => {
  const numericValue = getNumericValueFromStock(value);
  if (numericValue === null) {
    return null;
  }

  return Number.isInteger(numericValue)
    ? `${numericValue}`
    : `${numericValue}`;
};

export const formatStockDisplay = (value, unit) => {
  const formattedAmount = formatStockAmount(value);
  if (formattedAmount === null) {
    return null;
  }

  const normalizedUnit = `${unit || ''}`.trim().toLowerCase();
  const suffix = normalizedUnit === 'pcs' ? 'pcs' : 'm';

  return `${formattedAmount} ${suffix}`;
};

const getRawPieceStock = item => {
  if (hasStockFieldValue(item?.qty)) {
    return item.qty;
  }

  if (hasStockFieldValue(item?.quantity)) {
    return item.quantity;
  }

  return null;
};

const getRawMeterStock = item => {
  if (hasStockFieldValue(item?.qty_meters)) {
    return item.qty_meters;
  }

  if (hasStockFieldValue(item?.qtyMeters)) {
    return item.qtyMeters;
  }

  return null;
};

const getExplicitStockUnit = item => {
  const normalizedUnit =
    normalizeStockUnit(item?.unit) ||
    normalizeStockUnit(item?.stock_unit) ||
    normalizeStockUnit(item?.uom);

  if (normalizedUnit) {
    return normalizedUnit;
  }

  if (item?.is_meter === true || item?.isMeter === true) {
    return 'm';
  }

  if (item?.is_meter === false || item?.isMeter === false) {
    return 'pcs';
  }

  return null;
};

const getUnitFromStockValue = value => {
  if (!hasStockFieldValue(value)) {
    return null;
  }

  return normalizeStockUnit(
    `${value}`.replace(/-?\d+(?:\.\d+)?/g, '').trim(),
  );
};

export const getStockUnit = item => {
  const explicitUnit = getExplicitStockUnit(item);
  if (explicitUnit) {
    return explicitUnit;
  }

  const qty = getRawPieceStock(item);
  const qtyMeters = getRawMeterStock(item);
  const valueUnit =
    getUnitFromStockValue(qty) ||
    getUnitFromStockValue(qtyMeters) ||
    getUnitFromStockValue(item?.stock);

  if (valueUnit) {
    return valueUnit;
  }

  if (hasStockFieldValue(qty) && !hasStockFieldValue(qtyMeters)) {
    return 'pcs';
  }

  if (!hasStockFieldValue(qty) && hasStockFieldValue(qtyMeters)) {
    return 'm';
  }

  const typeText = [
    item?.cardType,
    item?.stockType,
    item?.type,
    item?.item_type,
    item?.inventory_type,
    item?.stock_type,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (['readymade', 'product'].some(value => typeText.includes(value))) {
    return 'pcs';
  }

  if (typeText.includes('material') || typeText.includes('meter')) {
    return 'm';
  }

  return 'pcs';
};

const getPreferredStockSource = item => {
  const qty = getRawPieceStock(item);
  if (hasStockFieldValue(qty)) {
    return {
      unit: getStockUnit(item),
      value: qty,
    };
  }

  const qtyMeters = getRawMeterStock(item);
  if (hasStockFieldValue(qtyMeters)) {
    return {
      unit: 'm',
      value: qtyMeters,
    };
  }

  return {
    unit: getStockUnit(item),
    value: null,
  };
};

export const getDisplayStock = item => {
  const { unit, value } = getPreferredStockSource(item);

  if (hasStockFieldValue(value)) {
    return formatStockDisplay(value, unit) || formatStockDisplay(0, unit);
  }

  return formatStockDisplay(0, unit);
};

export const getNumericStock = item => {
  const { value } = getPreferredStockSource(item);

  if (hasStockFieldValue(value)) {
    return getNumericValueFromStock(value);
  }

  return 0;
};

export const isOutOfStock = item => getNumericStock(item) === 0;

export const getDisplayStockUnit = item => getPreferredStockSource(item).unit;

export const getDisplayStockValue = item => getNumericStock(item) ?? 0;
