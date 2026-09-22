import { GoogleGenAI } from '@google/genai';
import { config } from '../config.js';
import { store } from '../db/store.js';
import { CartItem, DeliveryAddress, Product } from '../db/types.js';

export interface AgentOutput {
  replyText: string;
  intent: 'GREETING' | 'INQUIRY' | 'ADD_TO_CART' | 'MODIFY_CART' | 'PROVIDE_ADDRESS' | 'CHECKOUT' | 'TRACKING' | 'GENERAL';
  cartActions?: Array<{
    action: 'ADD' | 'REMOVE' | 'SET';
    productId: string;
    quantity: number;
  }>;
  extractedAddress?: Partial<DeliveryAddress>;
  readyForCheckout?: boolean;
  suggestedPayment?: 'BENEFITPAY' | 'TAP' | 'NONE';
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
        console.warn('⚠️ Gemini API call failed or timed out. Falling back to Khaleeji Heuristic Engine:', err);
        return this.fallbackKhaleejiEngine(conv, products, settings, incomingText);
      }
    } else {
      // Offline / Keyless Mode: Intelligent Khaleeji Heuristic Engine
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
      const price = settings.currency === 'BHD' 
        ? `${p.price_bhd.toFixed(3)} BHD`
        : settings.currency === 'SAR'
        ? `${p.price_sar.toFixed(2)} SAR`
        : `${p.price_aed.toFixed(2)} AED`;
      return `ID: ${p.id} | ${p.name_ar} (${p.name_en}) | Price: ${price} | Stock: ${p.stock} | Keywords: [${p.keywords.join(', ')}]`;
    }).join('\n');

    const currentCartSummary = conv.cart.items.length > 0
      ? conv.cart.items.map((i: CartItem) => `${i.productNameAr} x${i.quantity} = ${i.totalPrice.toFixed(settings.currency === 'BHD' ? 3 : 2)} ${settings.currency}`).join(', ')
      : 'Empty';

    const currentAddressSummary = JSON.stringify(conv.address);

    const systemPrompt = `
You are "GCC-OrderBot", an expert conversational sales representative for "${settings.name}" in ${settings.country === 'BH' ? 'Bahrain (مملكة البحرين)' : settings.country === 'SA' ? 'Saudi Arabia (المملكة العربية السعودية)' : 'UAE (الإمارات)'}.
You converse on WhatsApp and Instagram Direct.

CULTURAL TONE & LANGUAGE INSTRUCTIONS:
- Speak warmly and hospitably in natural Khaleeji / Gulf Arabic (Bahraini/Saudi/Emirati nuance: "هلا والله", "يا هلا ومسهلا", "سم طال عمرك", "ابشر بعزك", "جم سعره", "طرش لي", "من عيوني").
- If the customer writes in English, reply in friendly professional English.
- If the customer uses mixed Arabic/English or Hindi/Urdu, reply in their language naturally.
- Current currency: ${settings.currency} (${settings.currency === 'BHD' ? '3 decimal places e.g., 2.500 BD' : '2 decimal places'}).
- Delivery fee: ${settings.deliveryFee.toFixed(settings.currency === 'BHD' ? 3 : 2)} ${settings.currency}.

AVAILABLE PRODUCT CATALOG:
${catalogSummary}

CURRENT CUSTOMER STATE:
- Active Cart: ${currentCartSummary}
- Known Address: ${currentAddressSummary}

YOUR MISSION:
1. Identify Intent:
   - GREETING: Customer says hi ("هلا", "سلام عليكم", "مرحبا"). Welcome warmly, offer today's specialties.
   - INQUIRY: Customer asks price, ingredients, or recommendation.
   - ADD_TO_CART: Customer wants to buy ("أبي 2 كرك", "حط لي معمول", "I want 1 box kunafa"). Add item(s) to cartActions.
   - MODIFY_CART: Customer wants to change or remove items.
   - PROVIDE_ADDRESS: Customer shares delivery area/block/road/building. Extract fields into extractedAddress.
   - CHECKOUT: Customer asks to pay ("طرش لي الرابط", "ابي ادفع بينفت", "send payment link").
   - GENERAL: Questions about delivery times, locations, etc.

2. Address Extraction:
   In Bahrain/GCC, addresses typically follow: Area (المنطقة مثل الرفاع / المحرق / السيف / الرياض / العليا), Block (مجمع), Road (طريق / شارع), Building (مبنى / عمارة), Flat/Floor (شقة / دور).
   Always extract any mentions into the extractedAddress JSON.

3. Checkout & Payment:
   - When the customer has items in cart and has provided delivery location (or asks for payment), mark readyForCheckout: true.
   - In Bahrain (BHD), default to BENEFITPAY (or ask: "تحب تدفع عن طريق BenefitPay أو بطاقة بنكية؟").
   - In KSA (SAR) or UAE (AED), default to TAP.

RESPONSE FORMAT RULES:
You MUST respond with a pure JSON object without markdown fences, matching this schema:
{
  "replyText": "Your Khaleeji/Arabic or English message to the customer formatted nicely for WhatsApp with emojis",
  "intent": "GREETING" | "INQUIRY" | "ADD_TO_CART" | "MODIFY_CART" | "PROVIDE_ADDRESS" | "CHECKOUT" | "TRACKING" | "GENERAL",
  "cartActions": [
    { "action": "ADD", "productId": "prod_karak", "quantity": 2 }
  ],
  "extractedAddress": {
    "area": "الرفاع الغربي",
    "block": "912",
    "road": "1402",
    "building": "55",
    "notes": "بجانب المسجد"
  },
  "readyForCheckout": false,
  "suggestedPayment": "BENEFITPAY" | "TAP" | "NONE"
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
   * High-accuracy Gulf / Khaleeji Fallback Heuristic Engine
   * Executes when GEMINI_API_KEY is not configured or offline.
   */
  private static fallbackKhaleejiEngine(
    conv: any,
    products: Product[],
    settings: any,
    rawText: string
  ): AgentOutput {
    const text = rawText.toLowerCase().trim();
    const currency = settings.currency;
    const formatPrice = (val: number) => val.toFixed(currency === 'BHD' ? 3 : 2) + ` ${currency}`;

    // Detect if customer wrote in English
    const hasArabicChars = /[\u0600-\u06FF]/.test(text);
    const isEnglish = !hasArabicChars && (
      ['hello', 'hi', 'hey', 'good morning', 'good evening', 'menu', 'order', 'want', 'please', 'deliver', 'delivery', 'send', 'pay', 'benefit', 'card', 'checkout', 'how much', 'price'].some(w => text.includes(w)) ||
      /^[a-zA-Z0-9\s.,!?'"#-]+$/.test(text)
    );

    // 1. Check for Greeting
    const greetingMatches = ['هلا', 'مرحبا', 'السلام', 'سلام', 'صباح الخير', 'مساء الخير', 'hello', 'hi', 'hey', 'kaise ho'];
    const isGreeting = greetingMatches.some((g) => text.includes(g)) && text.length < 35;

    // 2. Check for Address pattern (Arabic & English: block, road, building, street, area names)
    const addressKeywords = [
      'مجمع', 'طريق', 'شارع', 'مبنى', 'عمارة', 'شقة', 'الرفاع', 'المحرق', 'المنامة', 'سار', 'مدينة عيسى', 'الرياض', 'جدة', 'دبي',
      'block', 'road', 'street', 'building', 'bldg', 'house', 'flat', 'apartment', 'riffa', 'manama', 'seef', 'muharraq', 'saar', 'riyadh', 'dubai'
    ];
    const hasAddressSignal = addressKeywords.some((k) => text.includes(k));

    let extractedAddress: Partial<DeliveryAddress> | undefined;
    if (hasAddressSignal) {
      extractedAddress = {};
      // Extract block / مجمع
      const blockMatch = text.match(/(?:مجمع|block)\s*[:]?\s*([0-9]+)/i);
      if (blockMatch) extractedAddress.block = blockMatch[1];

      // Extract road / طريق / شارع
      const roadMatch = text.match(/(?:طريق|شارع|road|street)\s*[:]?\s*([0-9]+|[a-z0-9\s]+)/i);
      if (roadMatch) extractedAddress.road = roadMatch[1].trim();

      // Extract building / مبنى / عمارة / بيت
      const bldgMatch = text.match(/(?:مبنى|عمارة|بيت|منزل|building|bldg|house)\s*[:]?\s*([0-9]+)/i);
      if (bldgMatch) extractedAddress.building = bldgMatch[1];

      // Extract known areas (Arabic & English)
      const areasMap: Record<string, string> = {
        'الرفاع الغربي': 'الرفاع الغربي',
        'west riffa': 'West Riffa',
        'الرفاع الشرقي': 'الرفاع الشرقي',
        'east riffa': 'East Riffa',
        'الرفاع': 'الرفاع (Riffa)',
        'riffa': 'Riffa',
        'المحرق': 'المحرق (Muharraq)',
        'muharraq': 'Muharraq',
        'المنامة': 'المنامة (Manama)',
        'manama': 'Manama',
        'السيف': 'ضاحية السيف (Seef)',
        'seef': 'Seef District',
        'سار': 'سار (Saar)',
        'saar': 'Saar',
        'الرياض': 'الرياض (Riyadh)',
        'riyadh': 'Riyadh',
        'جدة': 'جدة (Jeddah)',
        'jeddah': 'Jeddah',
        'دبي': 'دبي (Dubai)',
        'dubai': 'Dubai'
      };

      for (const [key, areaLabel] of Object.entries(areasMap)) {
        if (text.includes(key)) {
          extractedAddress.area = areaLabel;
          break;
        }
      }
      extractedAddress.rawText = rawText;
    }

    // 3. Match items to add to cart
    const cartActions: AgentOutput['cartActions'] = [];
    
    products.forEach((p) => {
      let matched = false;
      for (const kw of p.keywords) {
        if (text.includes(kw.toLowerCase())) {
          matched = true;
          break;
        }
      }
      // Also match English names
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
          const numMatch = text.match(/([0-9]+)\s*(?:حبة|بوكس|علبة|كوب|كرك|معمول|كنافة|box|boxes|cups|pcs|items)?/i);
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

    // 4. Check for Payment / Checkout requests
    const checkoutKeywords = ['ادفع', 'دفع', 'بينفت', 'رابط', 'بينفت باي', 'لينك', 'حساب', 'كم المجموع', 'benefit', 'benefitpay', 'pay', 'checkout', 'tap', 'card', 'payment link'];
    const isCheckoutRequest = checkoutKeywords.some((k) => text.includes(k));

    // Formulate intelligent response (Bilingual English / Khaleeji Arabic)
    if (isGreeting) {
      if (isEnglish) {
        return {
          replyText: `Hello and welcome to *${settings.name}*! ☕✨
Delighted to have you with us. Here are today's top picks:

1️⃣ *Luxury Karak Chai Box (12 Cups)* - ${formatPrice(1.800)}
2️⃣ *Royal Date Ma'amoul Box (12 Pcs)* - ${formatPrice(3.800)}
3️⃣ *Mini Kunafa Bites Box (16 Pcs)* - ${formatPrice(4.500)}
4️⃣ *Signature Saffron Cardamom Latte* - ${formatPrice(2.200)}

What would you like us to prepare for you? (e.g., "I want 2 boxes of Karak and 1 Kunafa") 🛍️`,
          intent: 'GREETING',
        };
      }

      return {
        replyText: `يا هلا والله ومسهلا فيك في *${settings.name}*! ☕✨
نورتنا، تفضل قائمة بأشهر طلباتنا اليوم:

1️⃣ *بوكس شاي كرك فاخر (12 كوب)* - ${formatPrice(1.800)}
2️⃣ *درزن معمول تمر ملكي بالهيل* - ${formatPrice(3.800)}
3️⃣ *بوكس ميني كنافة جبن وقشطة* - ${formatPrice(4.500)}
4️⃣ *سجنتشر لاتيه الزعفران والهيل* - ${formatPrice(2.200)}

شنو حاب نجهز لك اليوم؟ (مثال: "أبي 2 بوكس كرك و 1 معمول") 🛍️`,
        intent: 'GREETING',
      };
    }

    if (cartActions.length > 0) {
      if (isEnglish) {
        const itemNames = cartActions.map((ca) => {
          const prod = products.find((p) => p.id === ca.productId);
          return `• ${ca.quantity}x ${prod?.name_en || 'Product'}`;
        }).join('\n');

        const addressPrompt = (!conv.address.area && !extractedAddress?.area)
          ? '\n\n📍 *Please share your delivery address:* (Area, Block, Road, Building number)'
          : '\n\n💳 Would you like us to prepare the payment link now?';

        return {
          replyText: `With pleasure! Added to your cart: 🛒✨
${itemNames}
${addressPrompt}`,
          intent: 'ADD_TO_CART',
          cartActions,
          extractedAddress,
          readyForCheckout: !!(conv.address.area || extractedAddress?.area),
          suggestedPayment: currency === 'BHD' ? 'BENEFITPAY' : 'TAP'
        };
      }

      const itemNames = cartActions.map((ca) => {
        const prod = products.find((p) => p.id === ca.productId);
        return `• ${ca.quantity}x ${prod?.name_ar || 'منتج'}`;
      }).join('\n');

      const addressPrompt = (!conv.address.area && !extractedAddress?.area)
        ? '\n\n📍 *لطفاً زودنا بعنوان التوصيل:* (المنطقة، المجمع، الطريق، رقم المبنى)'
        : '\n\n💳 هل تحب نجهز لك رابط الدفع الآن؟';

      return {
        replyText: `من عيوني! تمت إضافة طلبك إلى السلة: 🛒✨
${itemNames}
${addressPrompt}`,
        intent: 'ADD_TO_CART',
        cartActions,
        extractedAddress,
        readyForCheckout: !!(conv.address.area || extractedAddress?.area),
        suggestedPayment: currency === 'BHD' ? 'BENEFITPAY' : 'TAP'
      };
    }

    if (extractedAddress && (extractedAddress.area || extractedAddress.block)) {
      if (isEnglish) {
        return {
          replyText: `Delivery address recorded! 📍
• Area: ${extractedAddress.area || 'Specified'}
• Block: ${extractedAddress.block || '—'} | Road: ${extractedAddress.road || '—'} | Building: ${extractedAddress.building || '—'}

${conv.cart.items.length > 0 ? 'Ready to checkout? Type "Send payment link" or "BenefitPay" to get your link! 📲' : 'Please select your items to add to the cart! 🛒'}`,
          intent: 'PROVIDE_ADDRESS',
          extractedAddress,
          readyForCheckout: conv.cart.items.length > 0,
          suggestedPayment: currency === 'BHD' ? 'BENEFITPAY' : 'TAP'
        };
      }

      return {
        replyText: `تم تسجيل العنوان بنجاح! 📍
• المنطقة: ${extractedAddress.area || 'غير محدد'}
• مجمع: ${extractedAddress.block || '—'} | طريق: ${extractedAddress.road || '—'} | مبنى: ${extractedAddress.building || '—'}

${conv.cart.items.length > 0 ? 'جاهزين لإتمام الطلب؟ اكتب "طرش لي رابط الدفع" أو "بينفت" لنرسل لك الرابط فوراً! 📲' : 'تفضل باختيار منتجاتك لإضافتها للسلة! 🛒'}`,
        intent: 'PROVIDE_ADDRESS',
        extractedAddress,
        readyForCheckout: conv.cart.items.length > 0,
        suggestedPayment: currency === 'BHD' ? 'BENEFITPAY' : 'TAP'
      };
    }

    if (isCheckoutRequest) {
      if (conv.cart.items.length === 0) {
        return {
          replyText: isEnglish
            ? `Your cart is currently empty! Please let us know what you would like to order first ☕🍩`
            : `سلتك فاضية حالياً يا الغالي! تفضل اطلب أولاً شنو تحب نوصل لك؟ ☕🍩`,
          intent: 'GENERAL',
        };
      }

      if (isEnglish) {
        return {
          replyText: `Certainly! Your invoice is ready.
Click the link below to complete instant payment via *${currency === 'BHD' ? 'BenefitPay Fawri+' : 'Tap Payments / Card'}* 👇`,
          intent: 'CHECKOUT',
          readyForCheckout: true,
          suggestedPayment: currency === 'BHD' ? 'BENEFITPAY' : 'TAP'
        };
      }

      return {
        replyText: `حاضرين وأبشر بعزك! تم تجهيز فاتورة طلبك.
اضغط على الرابط بالأسفل لإتمام الدفع السريع عبر *${currency === 'BHD' ? 'BenefitPay (بنفت باي)' : 'بطاقة مدى / Tap Payments'}* 👇`,
        intent: 'CHECKOUT',
        readyForCheckout: true,
        suggestedPayment: currency === 'BHD' ? 'BENEFITPAY' : 'TAP'
      };
    }

    // Default Inquiry / General response
    if (isEnglish) {
      return {
        replyText: `Welcome to *${settings.name}*! We serve authentic Gulf beverages and luxury artisanal sweets.
Feel free to tell us what you'd like, e.g.: *"I want 2 luxury Karak boxes and 1 box of Maamoul"*, and we will add it to your cart and deliver to your doorstep! 🛵`,
        intent: 'GENERAL',
      };
    }

    return {
      replyText: `أهلاً بك! في *${settings.name}* نقدم أفضل المشروبات والحلويات الخليجية الفاخرة.
تفضل اذكر طلبك مثل: *"أبي 2 كرك فاخر ودرزن معمول"* وسنقوم بإضافته فوراً لسلتك وتوصيله لباب بيتك! 🛵`,
      intent: 'GENERAL',
    };
  }
}

