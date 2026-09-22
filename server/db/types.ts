export interface Product {
  id: string;
  name_ar: string;
  name_en: string;
  category: string;
  price_bhd: number;
  price_sar: number;
  price_aed: number;
  stock: number;
  image: string;
  description_ar: string;
  description_en: string;
  keywords: string[];
}

export interface CartItem {
  productId: string;
  productNameAr: string;
  productNameEn: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface DeliveryAddress {
  country?: string;
  city?: string;
  area?: string;
  block?: string;
  road?: string;
  building?: string;
  floor?: string;
  flat?: string;
  notes?: string;
  rawText?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerPhone: string;
  customerName: string;
  items: CartItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  currency: 'BHD' | 'SAR' | 'AED';
  status: 'PENDING_PAYMENT' | 'PAID' | 'DISPATCHED' | 'CANCELLED';
  deliveryAddress: DeliveryAddress;
  paymentMethod: 'BENEFITPAY' | 'TAP' | 'MYFATOORAH' | 'CASH';
  paymentLink?: string;
  paymentReference?: string;
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'bot' | 'system';
  text: string;
  timestamp: string;
  paymentPayload?: {
    type: 'BENEFITPAY' | 'TAP';
    amount: number;
    currency: string;
    qrCodeText?: string;
    paymentUrl: string;
    reference: string;
  };
  metadata?: Record<string, any>;
}

export interface Conversation {
  id: string;
  platform: 'WHATSAPP' | 'INSTAGRAM';
  customerPhone: string;
  customerName: string;
  messages: ChatMessage[];
  cart: {
    items: CartItem[];
    subtotal: number;
    deliveryFee: number;
    total: number;
    currency: 'BHD' | 'SAR' | 'AED';
  };
  address: DeliveryAddress;
  currentOrderId?: string;
  lastActive: string;
}

export interface MerchantSettings {
  name: string;
  country: 'BH' | 'SA' | 'AE';
  currency: 'BHD' | 'SAR' | 'AED';
  deliveryFee: number;
  benefitPayIban: string;
  benefitPayMerchantId: string;
  gateways: {
    benefitPay: boolean;
    tap: boolean;
    myfatoorah: boolean;
    shopifySync: boolean;
  };
}
