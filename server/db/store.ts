import { Product, Order, Conversation, MerchantSettings, CartItem } from './types.js';
import { initialProducts } from './seed.js';
import { config } from '../config.js';

class InMemoryStore {
  private products: Map<string, Product> = new Map();
  private orders: Map<string, Order> = new Map();
  private conversations: Map<string, Conversation> = new Map();
  private merchantSettings: MerchantSettings;

  constructor() {
    // Initialize products
    initialProducts.forEach((p) => this.products.set(p.id, { ...p }));

    // Initialize merchant settings
    this.merchantSettings = {
      name: config.merchant.name,
      country: config.merchant.defaultCountry as 'BH' | 'SA' | 'AE',
      currency: config.merchant.defaultCurrency,
      deliveryFee: config.merchant.defaultDeliveryFee,
      benefitPayIban: config.merchant.benefitPayIban,
      benefitPayMerchantId: config.merchant.benefitPayMerchantId,
      gateways: {
        benefitPay: true,
        tap: true,
        myfatoorah: false,
        shopifySync: true,
      }
    };

    // Seed a mock past order and conversation
    this.seedMockActivity();
  }

  private seedMockActivity() {
    const mockOrder: Order = {
      id: 'ord_sample_9841',
      orderNumber: 'GCC-9841',
      customerPhone: '+97339123456',
      customerName: 'فاطمة الكعبي (Fatima Al-Kaabi)',
      items: [
        {
          productId: 'cb_prod_pistachio_cake',
          productNameAr: 'كيكة الفستق الشهيرة (Famous Pistachio Cake)',
          productNameEn: 'Famous Pistachio Cake (8-10 Pax)',
          quantity: 1,
          unitPrice: 14.000,
          totalPrice: 14.000,
        },
        {
          productId: 'cb_prod_mini_cupcakes_box',
          productNameAr: 'بوكس مشكل ميني كب كيك (12 قطعة)',
          productNameEn: 'Assorted Mini Cupcakes Box (12 pcs)',
          quantity: 1,
          unitPrice: 7.500,
          totalPrice: 7.500,
        }
      ],
      subtotal: 21.500,
      deliveryFee: 0.800,
      total: 22.300,
      currency: 'BHD',
      status: 'PAID',
      deliveryAddress: {
        country: 'البحرين',
        city: 'مدينة عيسى',
        area: 'مدينة عيسى (Isa Town)',
        block: '812',
        road: '1238',
        building: '5202A',
        notes: 'بجانب مجمع السيف مدينة عيسى',
        rawText: 'مدينة عيسى، مجمع 812، طريق 1238، مبنى 5202A'
      },
      paymentMethod: 'BENEFITPAY',
      paymentReference: 'BP-REF-CB812',
      chocolatePlaqueMessage: 'مبروك التخرج يا فاطمة 🎓',
      paidAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
      createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
      updatedAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    };

    this.orders.set(mockOrder.id, mockOrder);
  }

  // --- Products ---
  getProducts(): Product[] {
    return Array.from(this.products.values());
  }

  getProductById(id: string): Product | undefined {
    return this.products.get(id);
  }

  updateProduct(id: string, updates: Partial<Product>): Product | undefined {
    const existing = this.products.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates };
    this.products.set(id, updated);
    return updated;
  }

  // --- Orders ---
  getOrders(): Order[] {
    return Array.from(this.orders.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  getOrderById(id: string): Order | undefined {
    return this.orders.get(id);
  }

  createOrder(orderData: Omit<Order, 'id' | 'orderNumber' | 'createdAt' | 'updatedAt'>): Order {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const id = `ord_${Date.now()}_${randomNum}`;
    const orderNumber = `GCC-${randomNum}`;
    const now = new Date().toISOString();

    const order: Order = {
      ...orderData,
      id,
      orderNumber,
      createdAt: now,
      updatedAt: now,
    };

    this.orders.set(id, order);
    return order;
  }

  updateOrderStatus(
    id: string,
    status: Order['status'],
    additionalData?: Partial<Order>
  ): Order | undefined {
    const existing = this.orders.get(id);
    if (!existing) return undefined;

    const updated: Order = {
      ...existing,
      status,
      ...additionalData,
      updatedAt: new Date().toISOString(),
    };

    if (status === 'PAID' && !updated.paidAt) {
      updated.paidAt = new Date().toISOString();
    }

    this.orders.set(id, updated);
    return updated;
  }

  // --- Conversations ---
  getConversations(): Conversation[] {
    return Array.from(this.conversations.values()).sort(
      (a, b) => new Date(b.lastActive).getTime() - new Date(a.lastActive).getTime()
    );
  }

  getOrCreateConversation(phone: string, platform: 'WHATSAPP' | 'INSTAGRAM' = 'WHATSAPP', name?: string): Conversation {
    const normalizedPhone = phone.trim();
    let conv = this.conversations.get(normalizedPhone);

    if (!conv) {
      conv = {
        id: `conv_${normalizedPhone}`,
        platform,
        customerPhone: normalizedPhone,
        customerName: name || `Customer ${normalizedPhone.slice(-4)}`,
        messages: [],
        cart: {
          items: [],
          subtotal: 0,
          deliveryFee: this.merchantSettings.deliveryFee,
          total: this.merchantSettings.deliveryFee,
          currency: this.merchantSettings.currency,
        },
        address: {},
        lastActive: new Date().toISOString(),
      };
      this.conversations.set(normalizedPhone, conv);
    } else if (name && conv.customerName.startsWith('Customer ')) {
      conv.customerName = name;
    }

    return conv;
  }

  updateConversationCart(phone: string, items: CartItem[], customDeliveryFee?: number): Conversation | undefined {
    const conv = this.getOrCreateConversation(phone);
    const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
    const fee = items.length > 0 
      ? (customDeliveryFee !== undefined ? customDeliveryFee : (conv.cart.deliveryFee || this.merchantSettings.deliveryFee))
      : 0;
    const total = subtotal + fee;

    conv.cart = {
      items,
      subtotal,
      deliveryFee: fee,
      total,
      currency: this.merchantSettings.currency,
    };
    conv.lastActive = new Date().toISOString();
    this.conversations.set(phone, conv);
    return conv;
  }

  clearConversationCart(phone: string): Conversation | undefined {
    return this.updateConversationCart(phone, []);
  }

  updateConversationAddress(phone: string, address: Partial<Conversation['address']>): Conversation | undefined {
    const conv = this.getOrCreateConversation(phone);
    conv.address = { ...conv.address, ...address };
    conv.lastActive = new Date().toISOString();
    this.conversations.set(phone, conv);
    return conv;
  }

  addMessage(phone: string, message: Omit<Conversation['messages'][0], 'id' | 'timestamp'>): Conversation {
    const conv = this.getOrCreateConversation(phone);
    const newMessage = {
      ...message,
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
    };
    conv.messages.push(newMessage);
    conv.lastActive = new Date().toISOString();
    this.conversations.set(phone, conv);
    return conv;
  }

  updateConversationData(phone: string, updates: Partial<Conversation>): Conversation | undefined {
    const conv = this.getOrCreateConversation(phone);
    Object.assign(conv, updates);
    conv.lastActive = new Date().toISOString();
    this.conversations.set(phone, conv);
    return conv;
  }

  resetConversation(phone: string): Conversation {
    this.conversations.delete(phone);
    return this.getOrCreateConversation(phone);
  }

  // --- Merchant Settings ---
  getMerchantSettings(): MerchantSettings {
    return { ...this.merchantSettings };
  }

  updateMerchantSettings(updates: Partial<MerchantSettings>): MerchantSettings {
    this.merchantSettings = {
      ...this.merchantSettings,
      ...updates,
      gateways: {
        ...this.merchantSettings.gateways,
        ...(updates.gateways || {})
      }
    };
    return this.merchantSettings;
  }
}

export const store = new InMemoryStore();
