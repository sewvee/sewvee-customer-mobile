import { formatDate } from '../../utils/dateUtils';
import {
  InvoiceCompany,
  InvoiceCopyType,
  InvoiceMeasurementMap,
  InvoicePreviewItem,
  InvoicePreviewOrder,
} from './types';

export const formatInvoiceText = (
  value: unknown,
  fallback = '-',
): string => {
  if (value === null || value === undefined) {
    return fallback;
  }

  const text = String(value).trim();
  return text ? text : fallback;
};

export const formatInvoiceCurrency = (value: unknown): string => {
  const amount = Number(value ?? 0);

  return `₹${amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export const formatInvoiceQuantity = (value: unknown): string => {
  const quantity = Number(value ?? 0);

  if (!Number.isFinite(quantity) || quantity <= 0) {
    return '0';
  }

  return Number.isInteger(quantity) ? `${quantity}` : quantity.toFixed(2);
};

export const formatInvoiceDate = (value: unknown, fallback = '-'): string => {
  if (!value) {
    return fallback;
  }

  const formatted = formatDate(value as string);
  return formatted || fallback;
};

export const getInvoiceCopyLabel = (copyType: InvoiceCopyType): string => (
  copyType === 'tailor' ? 'Tailoring Copy' : 'Customer Copy'
);

export const getInvoiceDocumentTitle = (
  copyType: InvoiceCopyType,
): string => getInvoiceCopyLabel(copyType);

export const getInvoiceMetaRows = (
  order: InvoicePreviewOrder,
) => [
  {
    label: 'Customer',
    value: formatInvoiceText(order.customerName),
  },
  {
    label: 'Mobile',
    value: formatInvoiceText(order.customerMobile),
  },
  {
    label: 'Order No',
    value: `#${formatInvoiceText(order.billNo, 'Draft')}`,
  },
  {
    label: 'Date',
    value: formatInvoiceDate(order.date, formatInvoiceDate(new Date().toISOString())),
  },
  {
    label: 'ID',
    value: `#${formatInvoiceText(order.customerDisplayId, '---')}`,
  },
];

export const getCustomerInvoiceTotals = (order: InvoicePreviewOrder) => ([
  {
    label: 'Subtotal',
    value: formatInvoiceCurrency(order.total ?? order.subtotal ?? 0),
  },
  {
    label: 'Advance',
    value: formatInvoiceCurrency(order.advance ?? 0),
  },
  {
    label: 'Balance',
    value: formatInvoiceCurrency(order.balance ?? 0),
    highlighted: true,
  },
]);

export const getTailorWorkSummary = (items: InvoicePreviewItem[]) => {
  const pieces = items.reduce((sum, item) => {
    const quantity = Number(item.quantity ?? item.qty ?? 0);
    return sum + (Number.isFinite(quantity) && quantity > 0 ? quantity : 0);
  }, 0);

  return [
    {
      label: 'Total Items',
      value: `${items.length}`,
    },
    {
      label: 'Total Pieces',
      value: `${pieces}`,
      highlighted: true,
    },
  ];
};

export const getBoutiqueInitials = (company: InvoiceCompany): string => {
  const text = formatInvoiceText(company.name, 'My Boutique')
    .replace(/[^A-Za-z0-9\s]/g, ' ')
    .trim();

  const parts = text.split(/\s+/).filter(Boolean);
  const initials = parts.slice(0, 2).map(part => part.charAt(0).toUpperCase()).join('');

  return initials || text.slice(0, 2).toUpperCase() || 'MB';
};

export const getItemDeliveryDate = (
  item: InvoicePreviewItem,
  order: InvoicePreviewOrder,
): string | null => item.deliveryDate || order.deliveryDate || null;

export const getMeasurementsEntries = (
  measurements?: InvoiceMeasurementMap,
): Array<[string, string | number | null | undefined]> => {
  if (!measurements || typeof measurements !== 'object') {
    return [];
  }

  return Object.entries(measurements).filter(([, value]) => (
    value !== null && value !== undefined && `${value}`.trim() !== ''
  ));
};

export const getItemMediaUris = (item: InvoicePreviewItem): string[] => {
  const groups = [
    ...(item.images || []),
    ...(item.sketches || []),
    ...(item.materialImages || []),
    ...(item.measurementDressImages || []),
  ];

  return groups.filter(Boolean);
};
