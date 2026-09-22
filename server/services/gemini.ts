import { GoogleGenAI } from '@google/genai';
import { config } from '../config.js';
import { store } from '../db/store.js';
import { CartItem, DeliveryAddress, Product, InteractiveButton } from '../db/types.js';

export interface AgentOutput {
  replyText: string;
  intent: 'GREETING' | 'INQUIRY' | 'ADD_TO_CART' | 'MODIFY_CART' | 'PROVIDE_ADDRESS' | 'CHECKOUT' | 'TRACKING' | 'GENERAL' | 'FAQ_DELIVERY' | 'FAQ_HOURS' | 'FAQ_LOCATION' | 'FAQ_CONTACT';
  cartActions?: Array<{
    action: 'ADD' | 'REMOVE' | 'SET';
    productId: string;
    quantity: number;
  }>;
  extractedAddress?: Partial<DeliveryAddress>;
  readyForCheckout?: boolean;
  suggestedPayment?: 'BENEFITPAY' | 'TAP' | 'APPLEPAY' | 'NONE';
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
  isGift?: boolean;
  giftRecipientName?: string;
  giftRecipientPhone?: string;
  giftCardMessage?: string;
  chocolatePlaqueMessage?: string;
  needsHumanAttention?: boolean;
  calculatedDeliveryFee?: number;
}

export class GeminiAgentService {
  private static aiClient: GoogleGenAI | null = null;

  private static getClient(): GoogleGenAI | null {
    if (!this.aiClient && config.geminiApiKey) {
      this.aiClient = new GoogleGenAI({ apiKey: config.geminiApiKey });
    }
    return this.aiClient;
  }

  /**
   * Helper to compute dynamic delivery fee for Bahrain regions
   * Central Governorate / Isa Town, Jid Ali, Tubli, Sanad: 0.800 BD
   * Other regions (Riffa, Manama, Muharraq, Saar, Seef, etc.): 1.200 BD
   */
  static computeDeliveryFee(addressTextOrArea: string): number {
    const t = (addressTextOrArea || '').toLowerCase();
    const isCentralArea = ['مدينة عيسى', 'عيسى', 'isa town', 'جدا علي', 'جدعلي', 'jid ali', 'توبلي', 'tubli', 'سند', 'sanad', '812', '814', '816'].some(k => t.includes(k));
    return isCentralArea ? 0.800 : 1.200;
  }

  /**
   * Process a customer message in the context of their conversation and current cart
   */
  static async processMessage(
    customerPhone: string,
    customerName: string,
    incomingText: string
  ): Promise<AgentOutput> {
    const conv = store.getOrCreateConversation(customerPhone, 'WHATSAPP', customerName);
    const products = store.getProducts();
    const settings = store.getMerchantSettings();

    const client = this.getClient();

    if (client) {
      try {
        return await this.callGemini(conv, products, settings, incomingText);
      } catch (err) {
        console.warn('⚠️ Gemini API call failed or timed out. Falling back to Dana Khaleeji Heuristic Engine:', err);
        return this.fallbackKhaleejiEngine(conv, products, settings, incomingText);
      }
    } else {
      // Offline / Keyless Mode: Intelligent Dana Khaleeji Heuristic Engine
      return this.fallbackKhaleejiEngine(conv, products, settings, incomingText);
    }
  }

  private static async callGemini(
    conv: any,
    products: Product[],
    settings: any,
    userText: string
  ): Promise<AgentOutput> {
    const client = this.getClient()!;

    const catalogSummary = products.map((p) => {
      const price = `${p.price_bhd.toFixed(3)} BD`;
      return `ID: ${p.id} | ${p.name_ar} (${p.name_en}) | Price: ${price} | Stock: ${p.stock} | Keywords: [${p.keywords.join(', ')}]`;
    }).join('\n');

    const currentCartSummary = conv.cart.items.length > 0
      ? conv.cart.items.map((i: CartItem) => `${i.productNameAr} x${i.quantity} = ${i.totalPrice.toFixed(3)} BD`).join(', ')
      : 'Empty';

    const currentAddressSummary = JSON.stringify(conv.address);

    const systemPrompt = `
You are "Dana" (دانة), the friendly AI Operations & Automated Ordering Assistant for "Cupcake Boutique" (كب كيك بوتيك), located at Shop 5202A, Road 1238, Block 812, Isa Town, Bahrain (محل 5202A، طريق 1238، مجمع 812، مدينة عيسى، مملكة البحرين 🇧🇭).
You converse directly with customers on WhatsApp and Instagram Direct.

BEHAVIOR RULES:
1. Greet warmly in Khaleeji style ("هلا والله بزبائن كب كيك بوتيك مدينة عيسى 🧁", "يا هلا ومسهلا فيك", "من عيوني", "سم طال عمرك").
   - If customer writes in English, reply in friendly, warm professional English as Dana.
2. Highlight our famous "Famous Pistachio Cake" (كيكة الفستق الشهيرة - 14.000 BD) or "Assorted Mini Cupcakes Box" (بوكس مشكل ميني كب كيك - 7.500 BD) if the user asks for recommendations or mentions gatherings/events.
3. For cake orders, ask if they want a personalized plaque inscription ("شنو العبارة اللي تحب نكتبها على الكيكة؟" / "What personalized message would you like on the chocolate plaque?").
4. Delivery fees in Bahrain:
   - Isa Town, Jid Ali, Tubli, Sanad: 0.800 BD
   - Other Bahrain areas (Riffa, Manama, Muharraq, Saar, Seef): 1.200 BD
5. Format all prices strictly as BHD with 3 decimal places (e.g., 14.000 BD, 7.500 BD, 0.800 BD).
6. When the order is confirmed, prompt them to pay via BenefitPay Fawri+ (IBAN: BH64BIBB00001234567890).
7. Trigger human agent alert (needsHumanAttention: true) if the customer asks for complex tiered wedding cakes or bulk catering discounts.

OFFICIAL SHOP KNOWLEDGE BASE & FAQS:
1. Operating Hours:
   - Daily (Monday – Sunday): 8:30 AM to 9:00 PM.
   - When asked about operating hours or open/close times, answer directly and concisely, and set intent to "FAQ_HOURS".
2. Delivery & Fulfillment Options:
   - Yes, we provide home delivery across Bahrain!
   - Local Isa Town / Central Governorate (Block 812, Jid Ali, Tubli, Sanad): 0.800 BHD delivery fee.
   - All other regions in Bahrain (Riffa, Manama, Muharraq, Saar, Seef): 1.200 BHD delivery fee.
   - In-store pickup is also available at Shop 5202A, Road 1238, Block 812, Isa Town.
   - When asked about home delivery availability, delivery fees, or in-store pickup, answer directly with these rates/options and set intent to "FAQ_DELIVERY".
3. Store Location:
   - Shop 5202A, Road 1238, Block 812, Isa Town, Bahrain (near Seef Mall Isa Town).
   - When asked about shop location or address, answer directly with the address and set intent to "FAQ_LOCATION".
4. Contact Details:
   - Phone / WhatsApp: +973 1710 0130
   - Instagram: @cupcake.boutique
   - When asked for contact details or phone number, answer directly and set intent to "FAQ_CONTACT".

CRITICAL FAQ RULE:
When customers ask non-ordering questions (operating hours, delivery options, location, contact), NEVER echo a generic welcome greeting. You MUST answer the specific question directly using the knowledge base above first, and then politely offer to show the menu or take an order.

AVAILABLE PRODUCT CATALOG:
${catalogSummary}

CURRENT CUSTOMER STATE:
- Active Cart: ${currentCartSummary}
- Known Address: ${currentAddressSummary}

RESPONSE FORMAT RULES:
You MUST respond with a pure JSON object without markdown fences, matching this schema:
{
  "replyText": "Your message to the customer formatted nicely for WhatsApp with emojis",
  "intent": "GREETING" | "INQUIRY" | "ADD_TO_CART" | "MODIFY_CART" | "PROVIDE_ADDRESS" | "CHECKOUT" | "TRACKING" | "GENERAL" | "FAQ_DELIVERY" | "FAQ_HOURS" | "FAQ_LOCATION" | "FAQ_CONTACT",
  "cartActions": [
    { "action": "ADD", "productId": "cb_prod_pistachio_cake", "quantity": 1 }
  ],
  "extractedAddress": {
    "city": "مدينة عيسى",
    "area": "مدينة عيسى (Isa Town)",
    "block": "812",
    "road": "1238",
    "building": "5202A",
    "notes": "قريب من مجمع السيف مدينة عيسى"
  },
  "calculatedDeliveryFee": 0.800,
  "readyForCheckout": false,
  "suggestedPayment": "BENEFITPAY" | "TAP" | "APPLEPAY" | "NONE",
  "isGift": false,
  "needsHumanAttention": false,
  "chocolatePlaqueMessage": "مبروك التخرج",
  "interactiveButtons": [
    { "id": "btn_1", "title": "Button Title", "action": "ADD_TO_CART", "payload": "cb_prod_pistachio_cake" }
  ]
}
`;

    // Call Gemini 2.5 Flash
    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        { role: 'user', parts: [{ text: `${systemPrompt}\n\nCustomer Message: "${userText}"` }] }
      ],
      config: {
        responseMimeType: 'application/json',
        temperature: 0.3,
      }
    });

    const responseText = response.text || '{}';
    const parsed: AgentOutput = JSON.parse(responseText);
    return parsed;
  }

  /**
   * Dana - High-accuracy Gulf / Khaleeji Heuristic Engine
   * Executes when GEMINI_API_KEY is not configured or offline.
   */
  private static fallbackKhaleejiEngine(
    conv: any,
    products: Product[],
    settings: any,
    rawText: string
  ): AgentOutput {
    const text = rawText.toLowerCase().trim();
    const formatPrice = (val: number) => `${val.toFixed(3)} BD`;

    // Detect language
    const isHindi = ['namaste', 'kaise ho', 'kya haal', 'kya hal', 'chahiye', 'bhai', 'shukriya', 'aap', 'kripya', 'kitna hai'].some(w => text.includes(w));
    const hasArabicChars = /[\u0600-\u06FF]/.test(text);
    const isEnglish = !isHindi && !hasArabicChars && (
      ['hello', 'hi', 'hey', 'good morning', 'good evening', 'menu', 'order', 'want', 'cupcake', 'cake', 'pistachio', 'deliver', 'delivery', 'send', 'pay', 'benefit', 'card', 'checkout', 'how much', 'price', 'isa town'].some(w => text.includes(w)) ||
      /^[a-zA-Z0-9\s.,!?'"#-]+$/.test(text)
    );

    // Rule 7: Check Human Agent Handoff (tiered wedding cakes or bulk catering discounts)
    const isHumanRequest = ['عرس', 'زواج', 'كيكة عرس', 'طبقات', 'خصم كميات', 'تموين', 'حفلات كبيرة', 'موظف', 'أكلم موظف', 'wedding', 'wedding cake', 'tiered cake', 'bulk', 'catering', 'discount', 'human', 'agent'].some(w => text.includes(w));
    if (isHumanRequest) {
      if (isEnglish) {
        return {
          replyText: `With great pleasure! 🧁👩‍🍳\nI have immediately forwarded your custom inquiry to our *Head Pastry Chef & Boutique Manager* at Cupcake Boutique (Isa Town). We specialize in custom multi-tier wedding cakes and luxury event catering.\nOur team will contact you directly on WhatsApp shortly! ✨`,
          intent: 'GENERAL',
          needsHumanAttention: true,
        };
      }
      return {
        replyText: `من عيوني وسم طال عمرك! 🧁👩‍🍳\nتم تحويل طلبك الخاص بكيكات الأعراس والطلبات الكبيرة فوراً إلى *الشيف التنفيذي وإدارة كب كيك بوتيك مدينة عيسى*. يسعدنا تصميم كيكة أحلامك وتقديم أفضل عروض المناسبات.\nسيتواصل معك فريقنا المختص عبر الواتساب مباشرة! ✨`,
        intent: 'GENERAL',
        needsHumanAttention: true,
      };
    }

    // Check Gift Mode
    const isGift = ['هدية', 'أبيها كهدية', 'ارسلها كهدية', 'هديه', 'كارت هدية', 'gift', 'as a gift', 'send as gift', 'present'].some(w => text.includes(w));
    if (isGift) {
      return {
        replyText: isEnglish
          ? `How delightful! 🎁🧁 We will package your order in Cupcake Boutique's signature gift box with a luxury satin ribbon and exclude pricing from the delivery slip.\n\nPlease share:\n1️⃣ Recipient Name & Phone Number\n2️⃣ Dedication message to print on our signature gift card 💌`
          : `ألف مبارك والله يديم المحبة! 🎁🧁 تم تسجيل الطلب كـ *هدية فاخرة*.\nسنقوم بتغليفه بشريطة كب كيك بوتيك الحريرية الملكية وبدون وضع أسعار في طرد التوصيل.\n\nلطفاً زودني بـ:\n1️⃣ اسم ورقم هاتف مستلم الهدية\n2️⃣ عبارة الإهداء التي تحب أن نطبعها على كارت الهدية الفاخر 💌`,
        intent: 'GENERAL',
        isGift: true,
      };
    }

    // Plaque Inscription Text provided by user
    const isPlaqueInscription = ['اكتب', 'مبروك', 'عيد ميلاد', 'graduation', 'happy birthday', 'congrats', 'sarah', 'fatima', 'write', 'message'].some(w => text.includes(w)) && (text.length > 4 && text.length < 80) && !text.includes('مدينة عيسى') && !text.includes('مجمع');
    if (isPlaqueInscription && (text.includes('اكتب') || text.includes('write') || text.includes('مبروك') || text.includes('happy'))) {
      const plaqueMsg = rawText.replace(/^(اكتب|write|please write|نعم اكتب)\s*[:]?\s*/i, '').trim();
      return {
        replyText: isEnglish
          ? `Wonderful! We will hand-inscribe your personalized message on the chocolate plaque: 🎂✨\n*"${plaqueMsg}"*\n\n📍 Now, please share your delivery address or drop a location pin (Isa Town, Jid Ali, Tubli, Sanad: 0.800 BD | Others: 1.200 BD).`
          : `ذوق رائع! سيتم كتابة إهدائك بالخط الأنيق على لوح الشوكولاتة: 🎂✨\n*"${plaqueMsg}"*\n\n📍 والآن، لطفاً شاركنا موقع أو عنوان التوصيل (مدينة عيسى، جدعلي، توبلي، سند: 0.800 BD | باقي المناطق: 1.200 BD).`,
        intent: 'GENERAL',
        chocolatePlaqueMessage: plaqueMsg,
        interactiveButtons: [
          { id: 'btn_loc', title: '📍 مشاركة موقع التوصيل', action: 'SHARE_LOCATION', variant: 'gold' }
        ]
      };
    }

    // Location Pin share simulation (WhatsApp GPS drop-pin)
    const isPureLocationPin = (
      ['gps', 'coords', 'خريطة'].some(w => text.includes(w))
      || (['لوكيشن', 'اللوكيشن'].some(w => text.includes(w)) && !text.includes('مجمع') && !text.includes('طريق') && !text.includes('الرفاع') && !text.includes('road'))
    );
    if (isPureLocationPin) {
      const isaTownAddress = {
        city: 'مدينة عيسى',
        area: 'مدينة عيسى (Isa Town)',
        block: '812',
        road: '1238',
        building: '5202A',
        coordinates: { lat: 26.1738, lng: 50.5472 },
        rawText: '📍 WhatsApp Location: Shop 5202A, Road 1238, Block 812, Isa Town'
      };

      const fee = GeminiAgentService.computeDeliveryFee(isaTownAddress.area);

      return {
        replyText: isEnglish
          ? `Location pin received! 📍\n• Isa Town, Block 812, Road 1238, Building 5202A\n• Delivery Fee: ${fee.toFixed(3)} BD (Central Governorate rate)\n\nYour order is ready to confirm! Choose your preferred payment method below 👇`
          : `تم استلام الموقع بدقة عبر الواتساب! 📍\n• مدينة عيسى، مجمع 812، طريق 1238، مبنى 5202A\n• رسوم التوصيل: ${fee.toFixed(3)} BD (سعر المنطقة الوسطى)\n\nطلبك جاهز للتأكيد! تفضل باختيار طريقة الدفع السريع أدناه 👇`,
        intent: 'PROVIDE_ADDRESS',
        extractedAddress: isaTownAddress,
        calculatedDeliveryFee: fee,
        readyForCheckout: true,
        suggestedPayment: 'BENEFITPAY',
        mediaType: 'location',
        mediaData: {
          title: 'Isa Town (مدينة عيسى)',
          subtitle: 'Block 812, Road 1238, Shop 5202A',
          coordinates: { lat: 26.1738, lng: 50.5472 }
        },
        interactiveButtons: [
          { id: 'btn_pay_benefit', title: '📲 الدفع عبر BenefitPay Fawri+', action: 'CHECKOUT', payload: 'BENEFITPAY', variant: 'primary' },
          { id: 'btn_pay_apple', title: '🍎 الدفع عبر Apple Pay', action: 'CHECKOUT', payload: 'APPLEPAY', variant: 'secondary' }
        ]
      };
    }

    // Check if customer mentions a specific product in our catalog
    const mentionsSpecificProduct = products.some(p => 
      p.keywords.some(kw => text.includes(kw.toLowerCase())) || 
      text.includes(p.name_en.toLowerCase())
    );

    // Direct purchase intent (explicitly wanting to order a specific product)
    const isDirectPurchase = mentionsSpecificProduct && ['أبي', 'اطلب', 'أطلب', 'اريد', 'أريد', 'want', 'buy', 'send me', 'احتاج'].some(w => text.includes(w));

    // General order intent detector (excludes pickup inquiries)
    const isOrderIntent = ['أبي', 'اطلب', 'أطلب', 'اريد', 'أريد', 'want', 'احتاج', 'أحتاج'].some(w => text.includes(w)) || (['order', 'طلب'].some(w => text.includes(w)) && !text.includes('pick up') && !text.includes('pickup') && !text.includes('can i') && !text.includes('home delivery'));

    // FAQ 1: Operating Hours
    const isHoursQuestion = [
      'operating hours', 'opening hours', 'hours', 'what time', 'timings', 'timing', 'opening time', 'closing time', 'when do you open', 'when do you close',
      'أوقات', 'اوقات', 'ساعات العمل', 'أوقات العمل', 'دوام', 'الدوام', 'تفتحون', 'تسكرون', 'متى تفتحون', 'متى تسكرون', 'ساعة كم', 'مفتوحين', 'مفتوح', 'شغالين', 'وقت العمل'
    ].some(w => text.includes(w));

    // FAQ 2: Store Location
    const isLocationQuestion = [
      'where is your store', 'where are you located', 'where is your shop', 'store location', 'shop location', 'your address', 'where located', 'where is cupcake boutique',
      'وين مكانكم', 'وين المحل', 'موقع المحل', 'وين موقعكم', 'عنوانكم', 'وين موجودين', 'وين الفرع', 'مكان المحل', 'وين صايرين', 'وين صاير', 'موقعكم وين', 'عنوان المحل'
    ].some(w => text.includes(w)) || (text.includes('where') && (text.includes('shop') || text.includes('store') || text.includes('boutique') || text.includes('located')));

    // FAQ 3: Contact Details
    const isContactQuestion = [
      'contact number', 'phone number', 'whatsapp number', 'call you', 'instagram', 'how can i reach you', 'contact details', 'telephone', 'contact you', 'contact us', 'contact'
    ].some(w => text.includes(w)) || [
      'رقمكم', 'رقم التلفون', 'رقم الواتساب', 'انستغرامكم', 'انستقرام', 'انستغرام', 'كيف اتواصل', 'طرق التواصل', 'رقم الاتصال', 'هاتفكم', 'هاتف المحل', 'تواصل'
    ].some(w => text.includes(w));

    // FAQ 4: Delivery & Fulfillment Options (Home delivery, delivery areas & fees, in-store pickup)
    const isDeliveryQuestion = (
      ['home delivery', 'do you deliver', 'do you guys do home delivery', 'is delivery available', 'delivery options', 'delivery fee', 'delivery fees', 'how much is delivery', 'can you deliver', 'deliver to', 'pick up', 'pickup', 'can i pick up', 'can i pickup', 'pick up my order', 'pickup my order', 'in-store pickup', 'instore pickup', 'in store pickup'].some(w => text.includes(w))
      || ['توصلون', 'عندكم توصيل', 'في توصيل', 'خدمة توصيل', 'توصيل منازل', 'توصيل بيوت', 'كم التوصيل', 'رسوم التوصيل', 'استلام', 'استلم من المحل', 'استلام من الفرع', 'أقدر استلم', 'اقدر استلم', 'بيك اب'].some(w => text.includes(w))
      || (['deliver', 'delivery', 'توصيل'].some(w => text.includes(w)) && (text.includes('?') || text.includes('do you') || text.includes('can you') || text.includes('هل') || text.includes('عندكم') || text.includes('كم')))
    ) && !text.match(/(?:مجمع|block)\s*[:]?\s*[0-9]+/i) && !text.match(/(?:طريق|road)\s*[:]?\s*[0-9]+/i);

    const isFaqQuestion = isHoursQuestion || isLocationQuestion || isContactQuestion || isDeliveryQuestion;

    if (!isDirectPurchase) {
      if (isHoursQuestion) {
        return {
          replyText: isEnglish
            ? `Our operating hours at Cupcake Boutique are Monday – Sunday (daily) from 8:30 AM to 9:00 PM ⏰🧁\nYou are welcome to visit our boutique in Isa Town or order for doorstep delivery across Bahrain! Would you like to view our menu or place an order?`
            : `أوقات العمل في كب كيك بوتيك يومياً (من الإثنين إلى الأحد) من الساعة 8:30 صباحاً حتى 9:00 مساءً ⏰🧁\nيسعدنا استقبالكم في فرعنا بمدينة عيسى أو توصيل طلباتكم لكافة مناطق البحرين! شنو حاب تطلب اليوم؟`,
          intent: 'FAQ_HOURS',
          interactiveButtons: [
            { id: 'btn_faq_h1', title: '🎂 كيكة الفستق الشهيرة', action: 'ADD_TO_CART', payload: 'cb_prod_pistachio_cake', variant: 'gold' },
            { id: 'btn_faq_h2', title: '🧁 بوكس ميني كب كيك', action: 'ADD_TO_CART', payload: 'cb_prod_mini_cupcakes_box' }
          ]
        };
      }

      if (isLocationQuestion) {
        return {
          replyText: isEnglish
            ? `Cupcake Boutique is located at Shop 5202A, Road 1238, Block 812, Isa Town, Bahrain (near Seef Mall Isa Town) 📍🧁\nWe offer both convenient in-store pickup and doorstep delivery across Bahrain. Would you like to pick up or have your order delivered?`
            : `موقع كب كيك بوتيك: محل 5202A، طريق 1238، مجمع 812، مدينة عيسى، البحرين (بالقرب من مجمع السيف مدينة عيسى) 📍🧁\nنوفر الاستلام المباشر من الفرع والتوصيل السريع لجميع مناطق المملكة.\nهل تفضل استلام طلبك من المحل أو نوصله لباب بيتك؟`,
          intent: 'FAQ_LOCATION',
          interactiveButtons: [
            { id: 'btn_faq_loc', title: '📍 مشاركة موقع التوصيل', action: 'SHARE_LOCATION', variant: 'gold' },
            { id: 'btn_faq_menu', title: '🎂 كيكة الفستق الشهيرة', action: 'ADD_TO_CART', payload: 'cb_prod_pistachio_cake', variant: 'secondary' }
          ]
        };
      }

      if (isContactQuestion) {
        return {
          replyText: isEnglish
            ? `We'd love to assist you! 📞🧁\n• Phone / WhatsApp: +973 1710 0130\n• Instagram: @cupcake.boutique\n• Address: Shop 5202A, Road 1238, Block 812, Isa Town\n\nHow may we help you today?`
            : `يسعدنا تواصلك معنا دائماً في كب كيك بوتيك! 📞🧁\n• هاتف / واتساب: +973 1710 0130\n• إنستغرام: @cupcake.boutique\n• العنوان: محل 5202A، طريق 1238، مجمع 812، مدينة عيسى\n\nكيف نقدر نخدمك اليوم طال عمرك؟`,
          intent: 'FAQ_CONTACT',
          interactiveButtons: [
            { id: 'btn_faq_c1', title: '🎂 طلب كيكة الفستق', action: 'ADD_TO_CART', payload: 'cb_prod_pistachio_cake', variant: 'gold' },
            { id: 'btn_faq_c2', title: '👩‍🍳 التحدث مع موظف', action: 'REQUEST_HUMAN', variant: 'secondary' }
          ]
        };
      }

      if (isDeliveryQuestion) {
        return {
          replyText: isEnglish
            ? `Yes! We deliver all across Bahrain, and in-store pickup is also available! 🛵🧁\n• Local Isa Town & Central Governorate (Block 812, Jid Ali, Tubli, Sanad): 0.800 BD\n• All other Bahrain areas (Riffa, Manama, Muharraq, Saar, Seef): 1.200 BD\n• In-Store Pickup: Shop 5202A, Road 1238, Block 812, Isa Town.\n\nWould you like to view our menu or place an order for delivery? 🛍️`
            : `نعم، نوفر خدمة التوصيل السريع لجميع مناطق البحرين، وكذلك الاستلام المباشر من الفرع! 🛵🧁\n• مدينة عيسى والمحافظة الوسطى (مجمع 812، جدعلي، توبلي، سند): 0.800 BD\n• باقي مناطق البحرين (الرفاع، المنامة، المحرق، سار، السيف): 1.200 BD\n• الاستلام من المحل: متاح في محل 5202A، طريق 1238، مجمع 812، مدينة عيسى.\n\nهل تحب تستعرض المنيو أو نجهز لك طلب توصيل؟ 🛍️`,
          intent: 'FAQ_DELIVERY',
          interactiveButtons: [
            { id: 'btn_faq_d1', title: '🎂 استعراض المنيو والطلب', action: 'ADD_TO_CART', payload: 'cb_prod_pistachio_cake', variant: 'gold' },
            { id: 'btn_faq_d2', title: '📍 مشاركة موقع التوصيل', action: 'SHARE_LOCATION', variant: 'primary' }
          ]
        };
      }
    }

    // Recommendation Inquiry
    const isRecommendation = ['تنصح', 'شنو عندك', 'عروض', 'أشهر', 'منيو', 'recommend', 'famous', 'best', 'popular', 'menu'].some(w => text.includes(w));
    if (isRecommendation && !isOrderIntent && !isFaqQuestion) {
      const pistachioCake = products.find(p => p.id === 'cb_prod_pistachio_cake');
      const cupcakesBox = products.find(p => p.id === 'cb_prod_mini_cupcakes_box');
      return {
        replyText: isEnglish
          ? `Cupcake Boutique's all-time bestseller is our *${pistachioCake?.name_en || 'Famous Pistachio Cake'}* (${formatPrice(14.000)}), along with our *${cupcakesBox?.name_en || 'Assorted Mini Cupcakes Box'}* (${formatPrice(7.500)})! 🧁✨\n\nWould you like me to reserve one for you today?`
          : `أكثر أطباقنا طلباً وشهرة في كب كيك بوتيك مدينة عيسى هي *${pistachioCake?.name_ar || 'كيكة الفستق الشهيرة'}* (${formatPrice(14.000)}) و *${cupcakesBox?.name_ar || 'بوكس مشكل ميني كب كيك 12 حبة'}* (${formatPrice(7.500)})! 🧁✨\n\nتحب أضيف لك كيكة الفستق اللذيذة أو بوكس الكب كيك الآن؟`,
        intent: 'INQUIRY',
        interactiveButtons: [
          { id: 'btn_rec_pistachio', title: '🎂 أضف كيكة الفستق للسلة', action: 'ADD_TO_CART', payload: 'cb_prod_pistachio_cake', variant: 'gold' },
          { id: 'btn_rec_cupcakes', title: '🧁 أضف بوكس ميني كب كيك', action: 'ADD_TO_CART', payload: 'cb_prod_mini_cupcakes_box' }
        ]
      };
    }

    // Greeting Response
    const greetingMatches = ['هلا', 'مرحبا', 'السلام', 'سلام', 'صباح الخير', 'مساء الخير', 'hello', 'hi', 'hey', 'namaste'];
    const isGreeting = greetingMatches.some((g) => text.includes(g)) && text.length < 40 && !isOrderIntent && !isFaqQuestion;
    if (isGreeting) {
      return {
        replyText: isEnglish
          ? `Hello and a very warm welcome to *Cupcake Boutique* (Isa Town, Block 812)! 🧁✨\nI am *Dana*, your automated concierge.\n\nHere are today's freshly baked favorites:\n🎂 *Famous Pistachio Cake* - ${formatPrice(14.000)}\n🧁 *Assorted Mini Cupcakes Box (12 pcs)* - ${formatPrice(7.500)}\n🍰 *Saffron Milk Cake* - ${formatPrice(4.500)}\n🧀 *San Sebastian Basque Cheesecake* - ${formatPrice(14.500)}\n\nWhat would you like me to prepare for you today? 🛍️`
          : `هلا والله بزبائن كب كيك بوتيك مدينة عيسى 🧁✨\nمعك *دانة*، المساعد الآلي لطلبات كب كيك بوتيك في مجمع 812.\n\nتفضل أشهر وأطيب اختياراتنا الطازجة اليوم:\n🎂 *كيكة الفستق الشهيرة* - ${formatPrice(14.000)}\n🧁 *بوكس مشكل ميني كب كيك (12 قطعة)* - ${formatPrice(7.500)}\n🍰 *كيكة الحليب بالزعفران* - ${formatPrice(4.500)}\n🧀 *سان سيباستيان تشيز كيك* - ${formatPrice(14.500)}\n\nشنو حاب نجهز لك اليوم طال عمرك؟ 🛍️`,
        intent: 'GREETING',
        interactiveButtons: [
          { id: 'btn_pistachio_g', title: '🎂 كيكة الفستق الشهيرة', action: 'ADD_TO_CART', payload: 'cb_prod_pistachio_cake', variant: 'gold' },
          { id: 'btn_cupcakes_g', title: '🧁 بوكس ميني كب كيك', action: 'ADD_TO_CART', payload: 'cb_prod_mini_cupcakes_box' },
          { id: 'btn_saffron_g', title: '🍰 كيكة الزعفران بالحليب', action: 'ADD_TO_CART', payload: 'cb_prod_saffron_milk_cake' }
        ]
      };
    }

    // Address extraction (Isa Town, Jid Ali, Tubli, Sanad, Riffa, Manama, Muharraq)
    const addressKeywords = [
      'مجمع', 'طريق', 'شارع', 'مبنى', 'عمارة', 'منزل', 'بيت', 'شقة', 'مدينة عيسى', 'عيسى', 'جدا علي', 'جدعلي', 'توبلي', 'سند', 'الرفاع', 'المحرق', 'المنامة', 'سار', 'السيف',
      'block', 'road', 'street', 'building', 'bldg', 'house', 'flat', 'isa town', 'jid ali', 'tubli', 'sanad', 'riffa', 'manama', 'muharraq', 'seef'
    ];
    const hasAddressSignal = addressKeywords.some((k) => text.includes(k));

    let extractedAddress: Partial<DeliveryAddress> | undefined;
    if (hasAddressSignal) {
      extractedAddress = {};
      const blockMatch = text.match(/(?:مجمع|block)\s*[:]?\s*([0-9]+)/i);
      if (blockMatch) extractedAddress.block = blockMatch[1];

      const roadMatch = text.match(/(?:طريق|شارع|road|street)\s*[:]?\s*([0-9]+|[a-z0-9\s]+)/i);
      if (roadMatch) extractedAddress.road = roadMatch[1].trim();

      const bldgMatch = text.match(/(?:مبنى|عمارة|بيت|منزل|محل|shop|building|bldg|house)\s*[:]?\s*([0-9a-z]+)/i);
      if (bldgMatch) extractedAddress.building = bldgMatch[1];

      const areasMap: Record<string, string> = {
        'مدينة عيسى': 'مدينة عيسى (Isa Town)',
        'isa town': 'Isa Town',
        'جدا علي': 'جدا علي (Jid Ali)',
        'جدعلي': 'جدا علي (Jid Ali)',
        'jid ali': 'Jid Ali',
        'توبلي': 'توبلي (Tubli)',
        'tubli': 'Tubli',
        'سند': 'سند (Sanad)',
        'sanad': 'Sanad',
        'الرفاع': 'الرفاع (Riffa)',
        'riffa': 'Riffa',
        'المحرق': 'المحرق (Muharraq)',
        'muharraq': 'Muharraq',
        'المنامة': 'المنامة (Manama)',
        'manama': 'Manama',
        'السيف': 'ضاحية السيف (Seef)',
        'seef': 'Seef District',
      };

      for (const [key, areaLabel] of Object.entries(areasMap)) {
        if (text.includes(key)) {
          extractedAddress.area = areaLabel;
          break;
        }
      }
      extractedAddress.rawText = rawText;
    }

    // Match products to add to cart
    const cartActions: AgentOutput['cartActions'] = [];
    products.forEach((p) => {
      let matched = false;
      for (const kw of p.keywords) {
        if (text.includes(kw.toLowerCase())) {
          matched = true;
          break;
        }
      }
      if (!matched && (text.includes(p.name_en.toLowerCase()) || text.includes(p.category.toLowerCase()))) {
        matched = true;
      }

      if (matched) {
        let quantity = 1;
        if (text.includes('درزن') || text.includes('dozen')) quantity = 12;
        else if (text.includes('نص درزن') || text.includes('half dozen')) quantity = 6;
        else if (text.includes('حبتين') || text.includes('ثنتين') || text.includes(' 2 ') || text.startsWith('2 ') || text.includes('two')) quantity = 2;
        else if (text.includes(' 3 ') || text.startsWith('3 ') || text.includes('ثلاث') || text.includes('three')) quantity = 3;
        else if (text.includes(' 4 ') || text.startsWith('4 ') || text.includes('اربع') || text.includes('four')) quantity = 4;
        else if (text.includes(' 5 ') || text.startsWith('5 ') || text.includes('خمس') || text.includes('five')) quantity = 5;
        else {
          const numMatch = text.match(/([0-9]+)\s*(?:حبة|بوكس|علبة|كيكة|كيك|cake|cupcake|box|boxes|pcs)?/i);
          if (numMatch && parseInt(numMatch[1], 10) > 0 && parseInt(numMatch[1], 10) < 50) {
            quantity = parseInt(numMatch[1], 10);
          }
        }

        cartActions.push({
          action: 'ADD',
          productId: p.id,
          quantity,
        });
      }
    });

    // Check Checkout keywords
    const checkoutKeywords = ['ادفع', 'دفع', 'بينفت', 'رابط', 'بينفت باي', 'لينك', 'حساب', 'كم المجموع', 'benefit', 'benefitpay', 'pay', 'checkout', 'payment link', 'fawri', 'apple pay', 'apple'];
    const isCheckoutRequest = checkoutKeywords.some((k) => text.includes(k));

    // Cart Added Response
    if (cartActions.length > 0) {
      const isCakeItem = cartActions.some(ca => {
        const prod = products.find(p => p.id === ca.productId);
        return prod?.category === 'Cakes' || prod?.category === 'Cheesecakes';
      });

      const buttons: InteractiveButton[] = [];
      if (isCakeItem) {
        buttons.push({ id: 'btn_yes_plaque', title: '✍️ نعم، أريد كتابة عبارة على الكيكة', action: 'CONFIRM_PLAQUE', payload: 'YES', variant: 'gold' });
        buttons.push({ id: 'btn_no_plaque', title: '🚫 لا، بدون عبارة', action: 'DECLINE_PLAQUE', payload: 'NO', variant: 'secondary' });
      } else {
        buttons.push({ id: 'btn_loc_share', title: '📍 مشاركة موقع التوصيل', action: 'SHARE_LOCATION', variant: 'gold' });
      }

      const plaqueQuestion = isCakeItem 
        ? (isEnglish ? '\n\n🎂 *Would you like a custom written message on the chocolate plaque?*' : '\n\n🎂 *شنو العبارة اللي تحب نكتبها على الكيكة؟*')
        : '';

      const addressPrompt = (!conv.address.area && !extractedAddress?.area)
        ? (isEnglish 
            ? '\n\n📍 *Please share your delivery location:*\n(Isa Town, Jid Ali, Tubli, Sanad: 0.800 BD | Other areas: 1.200 BD)'
            : '\n\n📍 *لطفاً زودنا بموقع التوصيل:*\n(مدينة عيسى، جدعلي، توبلي، سند: 0.800 BD | باقي المناطق: 1.200 BD)')
        : (isEnglish ? '\n\n💳 Ready to checkout via *BenefitPay Fawri+*?' : '\n\n💳 هل تحب نجهز لك رابط الدفع السريع عبر *BenefitPay Fawri+* الآن؟');

      if (isEnglish) {
        const itemNames = cartActions.map((ca) => {
          const prod = products.find((p) => p.id === ca.productId);
          return `• ${ca.quantity}x ${prod?.name_en || 'Item'}`;
        }).join('\n');

        return {
          replyText: `With great pleasure! Added to your Cupcake Boutique cart: 🛒🧁\n${itemNames}${plaqueQuestion}${addressPrompt}`,
          intent: 'ADD_TO_CART',
          cartActions,
          extractedAddress,
          readyForCheckout: !!(conv.address.area || extractedAddress?.area),
          suggestedPayment: 'BENEFITPAY',
          interactiveButtons: buttons
        };
      }

      const itemNames = cartActions.map((ca) => {
        const prod = products.find((p) => p.id === ca.productId);
        return `• ${ca.quantity}x ${prod?.name_ar || 'منتج'}`;
      }).join('\n');

      return {
        replyText: `من عيوني وأبشر بعزك! تمت الإضافة لسلتك: 🛒🧁\n${itemNames}${plaqueQuestion}${addressPrompt}`,
        intent: 'ADD_TO_CART',
        cartActions,
        extractedAddress,
        readyForCheckout: !!(conv.address.area || extractedAddress?.area),
        suggestedPayment: 'BENEFITPAY',
        interactiveButtons: buttons
      };
    }

    // Address Provided Response
    if (extractedAddress && (extractedAddress.area || extractedAddress.block)) {
      const fee = GeminiAgentService.computeDeliveryFee(extractedAddress.area || extractedAddress.block || '');
      const checkoutButtons: InteractiveButton[] = [
        { id: 'btn_pay_benefit_addr', title: '📲 الدفع عبر BenefitPay Fawri+', action: 'CHECKOUT', payload: 'BENEFITPAY', variant: 'primary' },
        { id: 'btn_pay_apple_addr', title: '🍎 الدفع عبر Apple Pay', action: 'CHECKOUT', payload: 'APPLEPAY', variant: 'secondary' }
      ];

      return {
        replyText: isEnglish
          ? `Delivery location recorded! 📍\n• Area: ${extractedAddress.area || 'Isa Town'}\n• Block: ${extractedAddress.block || '812'} | Road: ${extractedAddress.road || '—'} | Building: ${extractedAddress.building || '—'}\n• Delivery Fee: ${fee.toFixed(3)} BD\n\n${conv.cart.items.length > 0 ? 'Your order is ready to confirm! Tap below to complete instant payment 📲' : 'What would you like to order today? 🧁🎂'}`
          : `تم تسجيل موقع التوصيل بنجاح! 📍\n• المنطقة: ${extractedAddress.area || 'مدينة عيسى'}\n• المجمع: ${extractedAddress.block || '812'} | الطريق: ${extractedAddress.road || '—'} | المبنى: ${extractedAddress.building || '—'}\n• رسوم التوصيل: ${fee.toFixed(3)} BD\n\n${conv.cart.items.length > 0 ? 'طلبك جاهز للتأكيد! اضغط على زر الدفع بالأسفل لإتمام التحويل الفوري 📲' : 'تفضل باختيار طلبك لإضافته للسلة طال عمرك! 🧁🎂'}`,
        intent: 'PROVIDE_ADDRESS',
        extractedAddress,
        calculatedDeliveryFee: fee,
        readyForCheckout: conv.cart.items.length > 0,
        suggestedPayment: 'BENEFITPAY',
        interactiveButtons: conv.cart.items.length > 0 ? checkoutButtons : undefined
      };
    }

    // Checkout Request
    if (isCheckoutRequest) {
      if (conv.cart.items.length === 0) {
        return {
          replyText: isEnglish
            ? `Your cart is currently empty! Please let Dana know what cupcakes or cakes you would like first 🧁🎂`
            : `سلتك فاضية حالياً طال عمرك! تفضل اطلب أولاً شنو تحب نجهز لك من كب كيك أو كيكات البوتيك؟ 🧁🎂`,
          intent: 'GENERAL',
        };
      }

      const checkoutButtons: InteractiveButton[] = [
        { id: 'btn_pay_benefit_chk', title: '📲 الدفع عبر BenefitPay Fawri+', action: 'CHECKOUT', payload: 'BENEFITPAY', variant: 'primary' },
        { id: 'btn_pay_apple_chk', title: '🍎 الدفع عبر Apple Pay', action: 'CHECKOUT', payload: 'APPLEPAY', variant: 'secondary' }
      ];

      return {
        replyText: isEnglish
          ? `Certainly! Your order from *Cupcake Boutique* is confirmed. 🧁✨\nPlease select your preferred payment method below 👇`
          : `حاضرين وأبشر بعزك! تم تأكيد طلبك من *كب كيك بوتيك مدينة عيسى*. 🧁✨\nتفضل باختيار وسيلة الدفع بالأسفل لإتمام التحويل الفوري 👇`,
        intent: 'CHECKOUT',
        readyForCheckout: true,
        suggestedPayment: 'BENEFITPAY',
        interactiveButtons: checkoutButtons
      };
    }

    // General fallback
    return {
      replyText: isEnglish
        ? `I am at your service at *Cupcake Boutique*! 🧁✨\nYou can ask me about our operating hours, delivery options across Bahrain, store location in Isa Town, or place an order for our famous Pistachio Cake and artisan cupcakes. How can I help you today?`
        : `أنا في خدمتك دائماً في *كب كيك بوتيك مدينة عيسى*! 🧁✨\nيسعدني إجابتك عن أوقات العمل، خدمة التوصيل لجميع مناطق البحرين، أو مساعدتك في طلب كيكة الفستق الشهيرة وبوكسات الكب كيك اللذيذة. كيف أقدر أساعدك اليوم؟`,
      intent: 'GENERAL',
      interactiveButtons: [
        { id: 'btn_pistachio_def', title: '🎂 كيكة الفستق الشهيرة (14.000 BD)', action: 'ADD_TO_CART', payload: 'cb_prod_pistachio_cake', variant: 'gold' },
        { id: 'btn_cupcakes_def', title: '🧁 بوكس مشكل ميني كب كيك (7.500 BD)', action: 'ADD_TO_CART', payload: 'cb_prod_mini_cupcakes_box' }
      ]
    };
  }
}
