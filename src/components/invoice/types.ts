export type InvoiceCopyType = 'customer' | 'tailor';

export interface InvoiceCompany {
  name?: string;
  address?: string;
  phone?: string;
  gstin?: string;
  email?: string;
}

export interface InvoiceMeasurementMap {
  [key: string]: string | number | null | undefined;
}

export interface InvoiceServiceLine {
  id?: string | number;
  name?: string;
  amount?: string | number;
}

export interface InvoiceMaterialLine {
  id?: string | number;
  name?: string;
  qty?: string | number;
  quantity?: string | number;
  rate?: string | number;
  amount?: string | number;
}

export interface InvoicePreviewItem {
  id?: string | number;
  name?: string;
  type?: string;
  description?: string;
  qty?: string | number;
  quantity?: string | number;
  rate?: string | number;
  amount?: string | number;
  totalCost?: string | number;
  deliveryDate?: string | null;
  trialDate?: string | null;
  measurements?: InvoiceMeasurementMap;
  notes?: string;
  transcription?: string;
  urgency?: string;
  orderType?: string;
  fabricSource?: string;
  measurementDressGiven?: string;
  status?: string;
  images?: string[];
  sketches?: string[];
  materialImages?: string[];
  measurementDressImages?: string[];
  services?: InvoiceServiceLine[];
  addons?: InvoiceServiceLine[];
  materials?: InvoiceMaterialLine[];
}

export interface InvoicePreviewOrder {
  id?: string | number;
  billNo?: string | number;
  customerName?: string;
  customerMobile?: string;
  customerDisplayId?: string | number | null;
  date?: string | null;
  deliveryDate?: string | null;
  total?: string | number;
  subtotal?: string | number;
  advance?: string | number;
  balance?: string | number;
  notes?: string;
  orderNotes?: string;
  orderCategory?: string;
  orderTypeApi?: string;
  items?: InvoicePreviewItem[];
  outfits?: InvoicePreviewItem[];
}
