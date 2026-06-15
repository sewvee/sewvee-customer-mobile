import {
  getItemQuantitySections,
  getMergedOrderQuantities,
} from './orderQuantitySections';

const toPositiveInteger = (value, fallback = 1) => {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const getDisplayItemCount = items => (
  (Array.isArray(items) ? items : []).reduce((sum, item) => {
    const explicitCount = parseInt(
      item?.qty ?? item?.quantity ?? item?.qnt ?? item?.count,
      10,
    );

    if (Number.isFinite(explicitCount) && explicitCount > 0) {
      return sum + explicitCount;
    }

    const mergedQuantities = getMergedOrderQuantities(item);
    const activeMergedCount = mergedQuantities.filter(
      quantity => String(quantity?.status || '').trim().toUpperCase() !== 'CANCELLED',
    ).length;

    if (activeMergedCount > 0) {
      return sum + activeMergedCount;
    }

    const quantitySections =
      Array.isArray(item?.quantitySections) && item.quantitySections.length > 0
        ? item.quantitySections
        : getItemQuantitySections(item);

    const fallbackCount = toPositiveInteger(
      item?.qty ?? item?.quantity ?? item?.qnt ?? item?.count,
      1,
    );

    return sum + (quantitySections.length || fallbackCount);
  }, 0)
);
