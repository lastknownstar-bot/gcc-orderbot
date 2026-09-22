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
  coordinates?: { lat: number; lng: number };
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
  paymentMethod: 'BENEFITPAY' | 'TAP' | 'APPLEPAY' | 'MYFATOORAH' | 'CASH';
  paymentLink?: string;
  paymentReference?: string;
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
  isGift?: boolean;
  giftRecipientName?: string;
  giftRecipientPhone?: string;
  giftCardMessage?: string;
  chocolatePlaqueMessage?: string;
  deliveryTimeSlot?: string;
}

export interface InteractiveButton {
  id: string;
  title: string;
  action: 'ADD_TO_CART' | 'CONFIRM_PLAQUE' | 'DECLINE_PLAQUE' | 'CHECKOUT' | 'SHARE_LOCATION' | 'REQUEST_HUMAN' | 'CUSTOM';
  payload?: string;
  variant?: 'primary' | 'secondary' | 'gold';
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'bot' | 'system';
  text: string;
  timestamp: string;
  mediaType?: 'text' | 'image' | 'audio' | 'location' | 'interactive_buttons';
  mediaUrl?: string;
  mediaData?: {
    title?: string;
    subtitle?: string;
    price?: string;
    productId?: string;
    coordinates?: { lat: number; lng: number };
    duration?: string;
    audioText?: string;
    mapPreview?: string;
  };
  interactiveButtons?: InteractiveButton[];
  paymentPayload?: {
    type: 'BENEFITPAY' | 'TAP' | 'APPLEPAY';
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
  assignedAgent?: 'BOT' | 'HUMAN';
  needsHumanAttention?: boolean;
  isGift?: boolean;
  giftRecipientName?: string;
  giftRecipientPhone?: string;
  giftCardMessage?: string;
  chocolatePlaqueMessage?: string;
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
    applePay?: boolean;
  };
}
