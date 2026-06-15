// Company Template
export const Company = {
  id: '',
  name: '',
  address: '',
  phone: '',
  gstin: '',
  ownerId: '',
};

// Customer Template
export const Customer = {
  id: '',
  displayId: '',
  name: '',
  mobile: '',
  location: '',
  companyId: '',
  totalOrders: 0,
  totalSpent: 0,
  createdAt: null,
  measurementHistory: [],
};

// Order Item Template
export const OrderItem = {
  id: '',
  name: '',
  qty: 0,
  rate: 0,
  amount: 0,
  description: '',
  deliveryDate: '',
  status: 'Pending',
};

// Outfit Item Template
export const OutfitItem = {
  id: '',
  type: '',
  subtype: '',
  qty: 1,
  fabricSource: 'Customer',
  trialDate: '',
  deliveryDate: '',
  measurements: {},
  costItems: [],
  images: [],
  voiceNote: '',
  audioUri: '',
  transcription: '',
  sketchUri: '',
  sketches: [],
  notes: '',
  totalCost: 0,
  status: 'Pending',
};

// Order Template
export const Order = {
  id: '',
  billNo: '',
  customerId: '',
  customerName: '',
  customerMobile: '',
  companyId: '',
  items: [],
  outfits: [],
  subtotal: 0,
  advance: 0,
  total: 0,
  balance: 0,
  status: 'Pending',
  paymentStatus: '',
  notes: '',
  deliveryDate: null,
  trialDate: null,
  date: null,
  time: null,
  createdAt: null,
  updatedAt: null,
  urgency: '',
  orderType: '',
};

// Payment Template
export const Payment = {
  id: '',
  orderId: '',
  customerId: '',
  amount: 0,
  mode: '',
  type: '',
  date: null,
  time: null,
};
