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
        console.warn('⚠️ Gemini API call failed or timed out. Falling back to Lulwa Khaleeji Heuristic Engine:', err);
        return this.fallbackKhaleejiEngine(conv, products, settings, incomingText);
      }
    } else {
      // Offline / Keyless Mode: Intelligent Lulwa Khaleeji Heuristic Engine
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
You are "Lulwa" (لولوة), the official automated ordering concierge for "Maison de Sucre" (ميزون دو سوكر), a luxury boutique patisserie in Riffa, Bahrain.
You converse directly with customers on WhatsApp and Instagram Direct.

BEHAVIOR RULES:
1. Speak warmly using authentic Khaleeji Arabic / English / Hindi based on customer input ("هلا والله ومسهلا", "يا هلا فيك بميزون دو سوكر بالرفاع", "سم طال عمرك", "من عيوني", "ابشر بعزك").
   - If customer writes in English, reply in warm, polished English as a luxury concierge.
   - If customer writes in Hindi/Urdu, reply warmly in polite Hindi.
2. Recommend the "Mini Pastry Gathering Box" or "Signature Karak Box" if the user mentions a gathering, party, or family visit (زوارة).
3. If ordering a cake, ask: "Would you like a custom written message on the chocolate plaque?" ("هل تحب نكتب لك عبارة خاصة على لوح الشوكولاتة؟").
4. When asking for delivery, request: Area/City (المنطقة), Block (المجمع), Road (الطريق), and Building (المبنى/المنزل).
5. Format all prices in BHD with 3 decimals (e.g., 4.500 BD).
6. When the order is confirmed, prompt them to pay via BenefitPay Fawri+.

BOUTIQUE CONTEXT:
- Boutique: Maison de Sucre (ميزون دو سوكر), Riffa, Bahrain 🇧🇭
- Delivery Fee: ${settings.deliveryFee.toFixed(3)} BD

AVAILABLE PRODUCT CATALOG:
${catalogSummary}

CURRENT CUSTOMER STATE:
- Active Cart: ${currentCartSummary}
- Known Address: ${currentAddressSummary}

YOUR MISSION:
1. Identify Intent:
   - GREETING: Customer says hi ("هلا", "سلام عليكم", "مرحبا"). Welcome warmly as Lulwa from Maison de Sucre in Riffa.
   - INQUIRY: Customer asks price, ingredients, or recommendations.
   - ADD_TO_CART: Customer wants to buy. Extract item(s) to cartActions. If cake, ask rule #3! If gathering/party mentioned, suggest rule #2!
   - MODIFY_CART: Customer wants to change or remove items.
   - PROVIDE_ADDRESS: Customer shares delivery location. Extract fields into extractedAddress.
   - CHECKOUT: Customer asks to pay or confirm order. Mark readyForCheckout: true, suggest BENEFITPAY, prompt rule #6.
   - GENERAL: Questions about store, timings, location in Riffa.

2. Address Extraction:
   In Bahrain, addresses follow: Area/City (المنطقة), Block (المجمع), Road (الطريق), and Building (المبنى/المنزل).
   Always extract any mentions into the extractedAddress JSON.

RESPONSE FORMAT RULES:
You MUST respond with a pure JSON object without markdown fences, matching this schema:
{
  "replyText": "Your message to the customer formatted nicely for WhatsApp with emojis",
  "intent": "GREETING" | "INQUIRY" | "ADD_TO_CART" | "MODIFY_CART" | "PROVIDE_ADDRESS" | "CHECKOUT" | "TRACKING" | "GENERAL",
  "cartActions": [
    { "action": "ADD", "productId": "prod_gathering_pastry", "quantity": 1 }
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
   * Lulwa - High-accuracy Gulf / Khaleeji Heuristic Engine
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

    // Detect language: Hindi, English, or Arabic
    const isHindi = ['namaste', 'kaise ho', 'kya haal', 'kya hal', 'chahiye', 'bhai', 'shukriya', 'aap', 'kripya', 'kitna hai'].some(w => text.includes(w));
    const hasArabicChars = /[\u0600-\u06FF]/.test(text);
    const isEnglish = !isHindi && !hasArabicChars && (
      ['hello', 'hi', 'hey', 'good morning', 'good evening', 'menu', 'order', 'want', 'please', 'deliver', 'delivery', 'send', 'pay', 'benefit', 'card', 'checkout', 'how much', 'price', 'cake', 'gathering'].some(w => text.includes(w)) ||
      /^[a-zA-Z0-9\s.,!?'"#-]+$/.test(text)
    );

    // Rule 2 check: Gathering / Party / زوارة
    const isGathering = ['زوارة', 'زواره', 'جمعة', 'جمعه', 'جمعات', 'حفلة', 'حفله', 'عزيمة', 'عزيمه', 'gathering', 'party', 'family visit', 'friends gathering'].some(w => text.includes(w));

    // Rule 3 check: Cake ordering
    const isCakeMention = ['كيك', 'كيكة', 'كيكه', 'cake', 'cheesecake', 'truffle', 'سان سباستيان', 'سباستيان'].some(w => text.includes(w));

    // 1. Check for Greeting
    const greetingMatches = ['هلا', 'مرحبا', 'السلام', 'سلام', 'صباح الخير', 'مساء الخير', 'hello', 'hi', 'hey', 'namaste'];
    const isGreeting = greetingMatches.some((g) => text.includes(g)) && text.length < 40;

    // 2. Address pattern detection (Area, Block, Road, Building)
    const addressKeywords = [
      'مجمع', 'طريق', 'شارع', 'مبنى', 'عمارة', 'منزل', 'بيت', 'شقة', 'الرفاع', 'المحرق', 'المنامة', 'سار', 'مدينة عيسى', 'السيف', 'البديع',
      'block', 'road', 'street', 'building', 'bldg', 'house', 'flat', 'apartment', 'riffa', 'manama', 'seef', 'muharraq', 'saar'
    ];
    const hasAddressSignal = addressKeywords.some((k) => text.includes(k));

    let extractedAddress: Partial<DeliveryAddress> | undefined;
    if (hasAddressSignal) {
      extractedAddress = {};
      const blockMatch = text.match(/(?:مجمع|block)\s*[:]?\s*([0-9]+)/i);
      if (blockMatch) extractedAddress.block = blockMatch[1];

      const roadMatch = text.match(/(?:طريق|شارع|road|street)\s*[:]?\s*([0-9]+|[a-z0-9\s]+)/i);
      if (roadMatch) extractedAddress.road = roadMatch[1].trim();

      const bldgMatch = text.match(/(?:مبنى|عمارة|بيت|منزل|building|bldg|house)\s*[:]?\s*([0-9]+)/i);
      if (bldgMatch) extractedAddress.building = bldgMatch[1];

      const areasMap: Record<string, string> = {
        'الرفاع الغربي': 'الرفاع الغربي (West Riffa)',
        'west riffa': 'West Riffa',
        'الرفاع الشرقي': 'الرفاع الشرقي (East Riffa)',
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
        'مدينة عيسى': 'مدينة عيسى (Isa Town)',
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
          const numMatch = text.match(/([0-9]+)\s*(?:حبة|بوكس|علبة|كوب|كيكة|cake|box|boxes|cups|pcs)?/i);
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
    const checkoutKeywords = ['ادفع', 'دفع', 'بينفت', 'رابط', 'بينفت باي', 'لينك', 'حساب', 'كم المجموع', 'benefit', 'benefitpay', 'pay', 'checkout', 'payment link', 'fawri'];
    const isCheckoutRequest = checkoutKeywords.some((k) => text.includes(k));

    // --- RESPONSES ---

    // Special Rule 2 Handling: Gathering / Party recommendation (if no explicit cart add yet)
    if (isGathering && cartActions.length === 0) {
      if (isEnglish) {
        return {
          replyText: `Hello! I'm *Lulwa* from *Maison de Sucre* in Riffa 🌸✨
For your gathering and family visit (زوارة), I warmly recommend:

🥐 *Mini Pastry Gathering Box (24 Pcs)* - ${formatPrice(6.500)}
(An exquisite assortment of luxury French & Gulf mini savories)

☕ *Signature Karak Box (12 Cups)* - ${formatPrice(2.200)}
(Authentic cardamom & saffron karak with thermal cups)

Would you like me to prepare these for your gathering? 🛍️`,
          intent: 'INQUIRY'
        };
      }
      return {
        replyText: `يا هلا والله ومسهلا! معك *لولوة* من *ميزون دو سوكر (Maison de Sucre)* بالرفاع 🌸✨
بمناسبة الزوارة والجمعة الحلوة، أنصحك وبشدة باختياراتنا الملكية اللي تبيّض الوجه مع الأهل والضيوف:

🥐 *بوكس معجنات ميني للجمعات والزوارة (24 حبة)* - ${formatPrice(6.500)}
☕ *بوكس كرك ميزون الفاخر (Signature Karak Box)* - ${formatPrice(2.200)}

تحب أضيف لك منهم للسلة ونجهزه لك؟ 🛍️`,
        intent: 'INQUIRY'
      };
    }

    // Rule 1: Hindi Greeting
    if (isHindi) {
      return {
        replyText: `नमस्ते! मैं *लुलवा (Lulwa)* हूँ, *Maison de Sucre* (रिफा, बहरीन) की आधिकारिक कंसीयर्ज। 🌸✨
हम आपकी क्या सेवा कर सकते हैं? हमारी ताज़ा पेस्ट्री और सिग्नेचर कड़क चाय बहुत पसंद की जाती है! ☕🥐
(आप सीधे बता सकते हैं: "1 Karak Box and 1 Cake chahiye")`,
        intent: 'GREETING'
      };
    }

    // Greeting Response
    if (isGreeting) {
      if (isEnglish) {
        return {
          replyText: `Hello and a warm welcome to *Maison de Sucre*! 🌸✨
I am *Lulwa*, your personal ordering concierge in Riffa, Bahrain.

Here are our boutique signature selections today:
🥐 *Mini Pastry Gathering Box (24 Pcs)* - ${formatPrice(6.500)}
🎂 *Maison Royal Chocolate Truffle Cake* - ${formatPrice(12.500)}
☕ *Signature Karak Box (12 Cups)* - ${formatPrice(2.200)}
🧀 *San Sebastian Cheesecake with Belgian Chocolate* - ${formatPrice(11.000)}

What may I prepare for you today? 🛍️`,
          intent: 'GREETING',
        };
      }

      return {
        replyText: `يا هلا والله ومسهلا فيك بمحلنا *ميزون دو سوكر (Maison de Sucre)* بالرفاع! 🌸✨
معك *لولوة*، خادمتك وأتمنى لك أطيب الأوقات. تفضل أشهر مختاراتنا اليوم:

🥐 *بوكس معجنات ميني للجمعات والزوارة (24 حبة)* - ${formatPrice(6.500)}
🎂 *كيكة الشوكولاتة الملكية الفاخرة* - ${formatPrice(12.500)}
☕ *بوكس كرك ميزون الفاخر (Signature Karak Box)* - ${formatPrice(2.200)}
🧀 *كيكة سان سباستيان الأصلية بالشوكولاتة البلجيكية* - ${formatPrice(11.000)}

شنو حاب نجهز لك اليوم طال عمرك؟ 🛍️`,
        intent: 'GREETING',
      };
    }

    // Rule 3: If ordering cake, ask about custom message on chocolate plaque!
    if (cartActions.length > 0) {
      const hasCake = isCakeMention || cartActions.some(ca => ca.productId === 'prod_royal_cake' || ca.productId === 'prod_san_sebastian');

      if (isEnglish) {
        const itemNames = cartActions.map((ca) => {
          const prod = products.find((p) => p.id === ca.productId);
          return `• ${ca.quantity}x ${prod?.name_en || 'Item'}`;
        }).join('\n');

        const cakePlaqueQuestion = hasCake 
          ? '\n\n🎂 *Would you like a custom written message on the chocolate plaque?*' 
          : '';

        // Rule 4: Delivery address prompt
        const addressPrompt = (!conv.address.area && !extractedAddress?.area)
          ? '\n\n📍 *Please share your delivery address:*\n• Area/City (المنطقة)\n• Block (المجمع)\n• Road (الطريق)\n• Building/House (المبنى/المنزل)'
          : '\n\n💳 Would you like to confirm and pay via *BenefitPay Fawri+* now?';

        return {
          replyText: `With great pleasure! Added to your cart: 🛒✨
${itemNames}${cakePlaqueQuestion}
${addressPrompt}`,
          intent: 'ADD_TO_CART',
          cartActions,
          extractedAddress,
          readyForCheckout: !!(conv.address.area || extractedAddress?.area),
          suggestedPayment: 'BENEFITPAY'
        };
      }

      // Arabic
      const itemNames = cartActions.map((ca) => {
        const prod = products.find((p) => p.id === ca.productId);
        return `• ${ca.quantity}x ${prod?.name_ar || 'منتج'}`;
      }).join('\n');

      const cakePlaqueQuestion = hasCake 
        ? '\n\n🎂 *هل تحب نكتب لك عبارة خاصة أو إهداء على لوح الشوكولاتة؟*' 
        : '';

      // Rule 4: Delivery address prompt
      const addressPrompt = (!conv.address.area && !extractedAddress?.area)
        ? '\n\n📍 *لطفاً زودنا ببيانات التوصيل:*\n• المنطقة (Area/City)\n• المجمع (Block)\n• الطريق (Road)\n• المبنى/المنزل (Building)'
        : '\n\n💳 هل تحب نجهز لك رابط الدفع السريع عبر *BenefitPay Fawri+* الآن؟';

      return {
        replyText: `من عيوني وأبشر بعزك! تمت الإضافة لسلتك: 🛒✨
${itemNames}${cakePlaqueQuestion}
${addressPrompt}`,
        intent: 'ADD_TO_CART',
        cartActions,
        extractedAddress,
        readyForCheckout: !!(conv.address.area || extractedAddress?.area),
        suggestedPayment: 'BENEFITPAY'
      };
    }

    // Address Provided Response
    if (extractedAddress && (extractedAddress.area || extractedAddress.block)) {
      if (isEnglish) {
        return {
          replyText: `Delivery address saved! 📍
• Area/City: ${extractedAddress.area || 'Riffa'}
• Block: ${extractedAddress.block || '—'} | Road: ${extractedAddress.road || '—'} | Building: ${extractedAddress.building || '—'}

${conv.cart.items.length > 0 ? 'Your order is ready! Send "Pay" to generate your *BenefitPay Fawri+* payment link 📲' : 'What delicacies would you like to add to your order? 🥐🎂'}`,
          intent: 'PROVIDE_ADDRESS',
          extractedAddress,
          readyForCheckout: conv.cart.items.length > 0,
          suggestedPayment: 'BENEFITPAY'
        };
      }

      return {
        replyText: `تم تسجيل عنوان التوصيل بنجاح! 📍
• المنطقة: ${extractedAddress.area || 'الرفاع'}
• المجمع: ${extractedAddress.block || '—'} | الطريق: ${extractedAddress.road || '—'} | المبنى: ${extractedAddress.building || '—'}

${conv.cart.items.length > 0 ? 'طلبك جاهز للتأكيد! اكتب "ادفع" أو "بينفت" لنرسل لك رابط الدفع عبر *BenefitPay Fawri+* فوراً 📲' : 'تفضل باختيار طلبك لإضافته للسلة طال عمرك! 🥐🎂'}`,
        intent: 'PROVIDE_ADDRESS',
        extractedAddress,
        readyForCheckout: conv.cart.items.length > 0,
        suggestedPayment: 'BENEFITPAY'
      };
    }

    // Rule 6: Payment / Checkout Request
    if (isCheckoutRequest) {
      if (conv.cart.items.length === 0) {
        return {
          replyText: isEnglish
            ? `Your cart is currently empty! Please let Lulwa know what pastries or beverages you would like first 🥐☕`
            : `سلتك فاضية حالياً طال عمرك! تفضل اطلب أولاً شنو تحب نجهز لك من معجنات أو حلويات ميزون؟ 🥐☕`,
          intent: 'GENERAL',
        };
      }

      if (isEnglish) {
        return {
          replyText: `Certainly! Your order from *Maison de Sucre* is confirmed. 🌸✨
Please click the link below to complete instant payment via *BenefitPay Fawri+* 👇`,
          intent: 'CHECKOUT',
          readyForCheckout: true,
          suggestedPayment: 'BENEFITPAY'
        };
      }

      return {
        replyText: `حاضرين وأبشر بعزك! تم تأكيد طلبك من *ميزون دو سوكر*. 🌸✨
تفضل بالضغط على الرابط بالأسفل لإتمام الدفع الفوري عبر *BenefitPay Fawri+ (بنفت باي فوري+)* 👇`,
        intent: 'CHECKOUT',
        readyForCheckout: true,
        suggestedPayment: 'BENEFITPAY'
      };
    }

    // General fallback
    if (isEnglish) {
      return {
        replyText: `Welcome to *Maison de Sucre* (Riffa, Bahrain)! 🌸✨
I am *Lulwa*. We craft exquisite patisserie, artisanal mini pastry gathering boxes, luxury cakes, and signature Karak.
Feel free to ask for recommendations or tell me your order! (e.g. *"I want 1 Mini Pastry Gathering Box and 1 Signature Karak Box"*).`,
        intent: 'GENERAL',
      };
    }

    return {
      replyText: `أهلاً بك في *ميزون دو سوكر (Maison de Sucre)* بالرفاع! 🌸✨
معك *لولوة*. نقدم أرقى المعجنات الفرنسية، بوكسات الزوارة والجمعات، الكيك الفاخر، وشاي الكرك الملكي.
تفضل اذكر طلبك مثل: *"أبي بوكس معجنات ميني للزوارة وبوكس كرك"* وراح أجهزه لك فوراً! 🛵`,
      intent: 'GENERAL',
    };
  }
}
