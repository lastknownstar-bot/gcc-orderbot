import { GoogleGenAI } from '@google/genai';
import { config } from '../config.js';
import { store } from '../db/store.js';
import { CartItem, DeliveryAddress, Product, InteractiveButton } from '../db/types.js';

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

SPECIAL CONCIERGE FLOWS:
- If customer wants a gift, set isGift: true and ask for recipient name and greeting card message.
- If customer asks to speak with a human or custom wedding cake inquiries, set needsHumanAttention: true and reassure them.
- If recommending products, you may provide interactiveButtons so they can add to cart in 1 tap.

BOUTIQUE CONTEXT:
- Boutique: Maison de Sucre (ميزون دو سوكر), Riffa, Bahrain 🇧🇭
- Delivery Fee: ${settings.deliveryFee.toFixed(3)} BD

AVAILABLE PRODUCT CATALOG:
${catalogSummary}

CURRENT CUSTOMER STATE:
- Active Cart: ${currentCartSummary}
- Known Address: ${currentAddressSummary}

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
  "suggestedPayment": "BENEFITPAY" | "TAP" | "APPLEPAY" | "NONE",
  "isGift": false,
  "needsHumanAttention": false,
  "chocolatePlaqueMessage": "Happy Birthday Sarah",
  "interactiveButtons": [
    { "id": "btn_1", "title": "Button Title", "action": "ADD_TO_CART", "payload": "prod_id" }
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
      ['hello', 'hi', 'hey', 'good morning', 'good evening', 'menu', 'order', 'want', 'please', 'deliver', 'delivery', 'send', 'pay', 'benefit', 'card', 'checkout', 'how much', 'price', 'cake', 'gathering', 'gift', 'human', 'agent', 'location'].some(w => text.includes(w)) ||
      /^[a-zA-Z0-9\s.,!?'"#-]+$/.test(text)
    );

    // Check Human Agent Handoff
    const isHumanRequest = ['موظف', 'أكلم موظف', 'خدمة العملاء', 'شيف', 'عرس', 'زواج', 'كيكة عرس', 'human', 'agent', 'manager', 'person', 'representative', 'wedding cake'].some(w => text.includes(w));
    if (isHumanRequest) {
      if (isEnglish) {
        return {
          replyText: `With great pleasure! 👩‍🍳✨\nI have immediately flagged your request to our *Executive Pastry Chef & Boutique Manager* at Maison de Sucre. They have your contact details (+973...) and will attend to you directly on WhatsApp right away.\n\nIs there anything else I can prepare in the meantime?`,
          intent: 'GENERAL',
          needsHumanAttention: true,
        };
      }
      return {
        replyText: `من عيوني وسم طال عمرك! 👩‍🍳✨\nتم تحويل محادثتك وطلبك الخاص فوراً إلى *الشيف التنفيذي ومسؤول خدمة العملاء* في ميزون دو سوكر. سيقوم بمراجعة التفاصيل والتواصل معك عبر الواتساب فوراً.\n\nهل تحب أجهز لك أي طلب آخر في هذه الأثناء؟`,
        intent: 'GENERAL',
        needsHumanAttention: true,
      };
    }

    // Check Gift Mode
    const isGift = ['هدية', 'أبيها كهدية', 'ارسلها كهدية', 'هديه', 'كارت هدية', 'gift', 'as a gift', 'send as gift', 'present'].some(w => text.includes(w));
    if (isGift) {
      if (isEnglish) {
        return {
          replyText: `How lovely! 🎁✨ We will wrap your order with *Maison de Sucre's Royal Gold Ribbon* and exclude all pricing from the delivery packaging.\n\nPlease share:\n1️⃣ Recipient Name & Phone Number\n2️⃣ Personal dedication message to print on the luxury gold card 💌`,
          intent: 'GENERAL',
          isGift: true,
        };
      }
      return {
        replyText: `ألف مبارك والله يديم المحبة! 🎁✨ تم تسجيل الطلب كـ *هدية فاخرة*.\nسنقوم بتغليفه بشريطة ميزون الملكية الذهبية وبدون وضع أسعار في طرد التوصيل.\n\nلطفاً زودني بـ:\n1️⃣ اسم ورقم هاتف مستلم الهدية\n2️⃣ عبارة الإهداء التي تحب أن نطبعها على كارت الهدية الفاخر 💌`,
        intent: 'GENERAL',
        isGift: true,
      };
    }

    // Check Plaque Inscription Text provided by user
    const isPlaqueInscription = ['اكتب', 'مبروك', 'عيد ميلاد', 'graduation', 'happy birthday', 'congrats', 'sarah', 'write', 'message'].some(w => text.includes(w)) && (text.length > 5 && text.length < 80) && !text.includes('الرفاع');
    if (isPlaqueInscription && (text.includes('اكتب') || text.includes('write') || text.includes('مبروك') || text.includes('happy'))) {
      const plaqueMsg = rawText.replace(/^(اكتب|write|please write|نعم اكتب)\s*[:]?\s*/i, '').trim();
      return {
        replyText: isEnglish
          ? `Wonderful! We will hand-inscribe your message on the artisan Belgian chocolate plaque: 🎂✨\n*"${plaqueMsg}"*\n\n📍 Now, please provide your delivery details: Area, Block, Road, Building.`
          : `ذوق رفيع! سيتم كتابة إهدائك بالخط الأنيق على لوح الشوكولاتة البلجيكية الفاخرة: 🎂✨\n*"${plaqueMsg}"*\n\n📍 والآن، لطفاً زودنا ببيانات التوصيل: المنطقة، المجمع، الطريق، والمبنى.`,
        intent: 'GENERAL',
        chocolatePlaqueMessage: plaqueMsg,
        interactiveButtons: [
          { id: 'btn_loc', title: '📍 مشاركة موقع التوصيل', action: 'SHARE_LOCATION', variant: 'gold' }
        ]
      };
    }

    // Check Location pin share simulation
    const isLocationMsg = ['location', 'gps', 'coords', 'موقع', 'لوكيشن', 'اللوكيشن', 'خريطة'].some(w => text.includes(w));
    if (isLocationMsg) {
      const westRiffaAddress = {
        city: 'الرفاع',
        area: 'الرفاع الغربي (West Riffa)',
        block: '912',
        road: '1402',
        building: '55',
        coordinates: { lat: 26.1155, lng: 50.5577 },
        rawText: '📍 WhatsApp Location: West Riffa, Block 912'
      };

      return {
        replyText: isEnglish
          ? `Location pin received! 📍\n• West Riffa, Block 912, Road 1402, Building 55\n• Delivery Fee: 1.000 BD\n\nYour order is ready to confirm! Choose your preferred instant payment method below 👇`
          : `تم استلام الموقع بدقة عبر الواتساب! 📍\n• الرفاع الغربي، مجمع 912، طريق 1402، مبنى 55\n• رسوم التوصيل: 1.000 BD\n\nطلبك جاهز للتأكيد! تفضل باختيار طريقة الدفع السريع أدناه 👇`,
        intent: 'PROVIDE_ADDRESS',
        extractedAddress: westRiffaAddress,
        readyForCheckout: true,
        suggestedPayment: 'BENEFITPAY',
        mediaType: 'location',
        mediaData: {
          title: 'West Riffa (الرفاع الغربي)',
          subtitle: 'Block 912, Road 1402, Bldg 55',
          coordinates: { lat: 26.1155, lng: 50.5577 }
        },
        interactiveButtons: [
          { id: 'btn_pay_benefit', title: '📲 الدفع عبر BenefitPay Fawri+', action: 'CHECKOUT', payload: 'BENEFITPAY', variant: 'primary' },
          { id: 'btn_pay_apple', title: '🍎 الدفع عبر Apple Pay', action: 'CHECKOUT', payload: 'APPLEPAY', variant: 'secondary' }
        ]
      };
    }

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

    // Gathering Recommendation Flow (When asking for recommendations for gathering / زوارة)
    if (isGathering && (text.includes('شنو') || text.includes('تنصح') || text.includes('اقترح') || text.includes('recommend') || text.includes('what') || !text.includes('أبي'))) {
      const gatheringPastry = products.find(p => p.id === 'prod_gathering_pastry');
      return {
        replyText: isEnglish
          ? `Hello! I'm *Lulwa* from *Maison de Sucre* in Riffa 🌸✨\nFor your gathering and family visit (زوارة), I warmly recommend:\n\n🥐 *Mini Pastry Gathering Box (24 Pcs)* - ${formatPrice(6.500)}\n(Exquisite assortment of luxury French & Gulf mini savories)\n\n☕ *Signature Karak Box (12 Cups)* - ${formatPrice(2.200)}\n(Authentic cardamom & saffron karak with thermal cups)\n\nTap a button below to add directly to your cart! 👇`
          : `يا هلا والله ومسهلا! معك *لولوة* من *ميزون دو سوكر (Maison de Sucre)* بالرفاع 🌸✨\nبمناسبة الزوارة والجمعة الحلوة، أنصحك وبشدة باختياراتنا الملكية اللي تبيّض الوجه مع الأهل والضيوف:\n\n🥐 *بوكس معجنات ميني للجمعات والزوارة (24 حبة)* - ${formatPrice(6.500)}\n☕ *بوكس كرك ميزون الفاخر (Signature Karak Box)* - ${formatPrice(2.200)}\n\nاضغط على الزر بالأسفل لإضافتها لسلتك فوراً! 👇`,
        intent: 'INQUIRY',
        mediaType: 'image',
        mediaUrl: gatheringPastry?.image || 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&auto=format&fit=crop&q=80',
        mediaData: {
          title: 'Mini Pastry Gathering Box (24 Pcs)',
          subtitle: 'بوكس معجنات ميني للجمعات والزوارة',
          price: '6.500 BD',
          productId: 'prod_gathering_pastry'
        },
        interactiveButtons: [
          { id: 'btn_add_pastry', title: '🥐 إضافة بوكس المعجنات (6.500 BD)', action: 'ADD_TO_CART', payload: 'prod_gathering_pastry', variant: 'gold' },
          { id: 'btn_add_karak', title: '☕ إضافة بوكس الكرك (2.200 BD)', action: 'ADD_TO_CART', payload: 'prod_karak_box', variant: 'primary' }
        ]
      };
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
    const checkoutKeywords = ['ادفع', 'دفع', 'بينفت', 'رابط', 'بينفت باي', 'لينك', 'حساب', 'كم المجموع', 'benefit', 'benefitpay', 'pay', 'checkout', 'payment link', 'fawri', 'apple pay', 'apple'];
    const isCheckoutRequest = checkoutKeywords.some((k) => text.includes(k));

    // Hindi Greeting
    if (isHindi) {
      return {
        replyText: `नमस्ते! मैं *लुलवा (Lulwa)* हूँ, *Maison de Sucre* (रिफा, बहरीن) की आधिकारिक कंसीयर्ज। 🌸✨\nहम आपकी क्या सेवा कर सकते हैं? हमारी ताज़ा पेस्ट्री और सिग्नेचर कड़क चाय बहुत पसंद की जाती है! ☕🥐\n(आप नीचे दिए गए विकल्पों में से चुन सकते हैं)`,
        intent: 'GREETING',
        interactiveButtons: [
          { id: 'btn_pastry_hi', title: '🥐 Mini Pastry Box (6.500 BD)', action: 'ADD_TO_CART', payload: 'prod_gathering_pastry' },
          { id: 'btn_karak_hi', title: '☕ Signature Karak Box (2.200 BD)', action: 'ADD_TO_CART', payload: 'prod_karak_box' }
        ]
      };
    }

    // Greeting Response
    if (isGreeting) {
      return {
        replyText: isEnglish
          ? `Hello and a warm welcome to *Maison de Sucre*! 🌸✨\nI am *Lulwa*, your personal ordering concierge in Riffa, Bahrain.\n\nHere are our signature selections today:\n🥐 *Mini Pastry Gathering Box (24 Pcs)* - ${formatPrice(6.500)}\n🎂 *Maison Royal Chocolate Truffle Cake* - ${formatPrice(12.500)}\n☕ *Signature Karak Box (12 Cups)* - ${formatPrice(2.200)}\n🧀 *San Sebastian Cheesecake with Belgian Chocolate* - ${formatPrice(11.000)}\n\nWhat may I prepare for you today? 🛍️`
          : `يا هلا والله ومسهلا فيك بمحلنا *ميزون دو سوكر (Maison de Sucre)* بالرفاع! 🌸✨\nمعك *لولوة*، خادمتك وأتمنى لك أطيب الأوقات. تفضل أشهر مختاراتنا اليوم:\n\n🥐 *بوكس معجنات ميني للجمعات والزوارة (24 حبة)* - ${formatPrice(6.500)}\n🎂 *كيكة الشوكولاتة الملكية الفاخرة* - ${formatPrice(12.500)}\n☕ *بوكس كرك ميزون الفاخر (Signature Karak Box)* - ${formatPrice(2.200)}\n🧀 *كيكة سان سباستيان الأصلية بالشوكولاتة البلجيكية* - ${formatPrice(11.000)}\n\nشنو حاب نجهز لك اليوم طال عمرك؟ 🛍️`,
        intent: 'GREETING',
        interactiveButtons: [
          { id: 'btn_pastry_g', title: '🥐 بوكس المعجنات للزوارة', action: 'ADD_TO_CART', payload: 'prod_gathering_pastry', variant: 'gold' },
          { id: 'btn_cake_g', title: '🎂 كيكة الشوكولاتة الملكية', action: 'ADD_TO_CART', payload: 'prod_royal_cake' },
          { id: 'btn_karak_g', title: '☕ بوكس الكرك الفاخر', action: 'ADD_TO_CART', payload: 'prod_karak_box' }
        ]
      };
    }

    // Cart Added Response
    if (cartActions.length > 0) {
      const hasCake = isCakeMention || cartActions.some(ca => ca.productId === 'prod_royal_cake' || ca.productId === 'prod_san_sebastian');

      const buttons: InteractiveButton[] = [];
      if (hasCake) {
        buttons.push({ id: 'btn_yes_plaque', title: '✍️ نعم، أريد كتابة عبارة إهداء', action: 'CONFIRM_PLAQUE', payload: 'YES', variant: 'gold' });
        buttons.push({ id: 'btn_no_plaque', title: '🚫 لا، بدون عبارة', action: 'DECLINE_PLAQUE', payload: 'NO', variant: 'secondary' });
      } else {
        buttons.push({ id: 'btn_loc_share', title: '📍 مشاركة موقع التوصيل', action: 'SHARE_LOCATION', variant: 'gold' });
      }

      if (isEnglish) {
        const itemNames = cartActions.map((ca) => {
          const prod = products.find((p) => p.id === ca.productId);
          return `• ${ca.quantity}x ${prod?.name_en || 'Item'}`;
        }).join('\n');

        const cakePlaqueQuestion = hasCake 
          ? '\n\n🎂 *Would you like a custom written message on the chocolate plaque?*' 
          : '';

        const addressPrompt = (!conv.address.area && !extractedAddress?.area)
          ? '\n\n📍 *Please share your delivery address:*\n• Area/City (المنطقة)\n• Block (المجمع)\n• Road (الطريق)\n• Building/House (المبنى/المنزل)'
          : '\n\n💳 Ready to checkout via *BenefitPay Fawri+* or *Apple Pay*?';

        return {
          replyText: `With great pleasure! Added to your cart: 🛒✨\n${itemNames}${cakePlaqueQuestion}\n${addressPrompt}`,
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

      const cakePlaqueQuestion = hasCake 
        ? '\n\n🎂 *هل تحب نكتب لك عبارة خاصة أو إهداء على لوح الشوكولاتة؟*' 
        : '';

      const addressPrompt = (!conv.address.area && !extractedAddress?.area)
        ? '\n\n📍 *لطفاً زودنا ببيانات التوصيل:*\n• المنطقة (Area/City)\n• المجمع (Block)\n• الطريق (Road)\n• المبنى/المنزل (Building)'
        : '\n\n💳 هل تحب نجهز لك رابط الدفع السريع عبر *BenefitPay Fawri+* الآن؟';

      return {
        replyText: `من عيوني وأبشر بعزك! تمت الإضافة لسلتك: 🛒✨\n${itemNames}${cakePlaqueQuestion}\n${addressPrompt}`,
        intent: 'ADD_TO_CART',
        cartActions,
        extractedAddress,
        readyForCheckout: !!(conv.address.area || extractedAddress?.area),
        suggestedPayment: 'BENEFITPAY',
        interactiveButtons: buttons
      };
    }

    // Address provided
    if (extractedAddress && (extractedAddress.area || extractedAddress.block)) {
      const checkoutButtons: InteractiveButton[] = [
        { id: 'btn_pay_benefit_addr', title: '📲 الدفع عبر BenefitPay Fawri+', action: 'CHECKOUT', payload: 'BENEFITPAY', variant: 'primary' },
        { id: 'btn_pay_apple_addr', title: '🍎 الدفع عبر Apple Pay', action: 'CHECKOUT', payload: 'APPLEPAY', variant: 'secondary' }
      ];

      if (isEnglish) {
        return {
          replyText: `Delivery address saved! 📍\n• Area/City: ${extractedAddress.area || 'Riffa'}\n• Block: ${extractedAddress.block || '—'} | Road: ${extractedAddress.road || '—'} | Building: ${extractedAddress.building || '—'}\n\n${conv.cart.items.length > 0 ? 'Your order is ready! Tap a payment method below to complete instant payment 📲' : 'What delicacies would you like to add to your order? 🥐🎂'}`,
          intent: 'PROVIDE_ADDRESS',
          extractedAddress,
          readyForCheckout: conv.cart.items.length > 0,
          suggestedPayment: 'BENEFITPAY',
          interactiveButtons: conv.cart.items.length > 0 ? checkoutButtons : undefined
        };
      }

      return {
        replyText: `تم تسجيل عنوان التوصيل بنجاح! 📍\n• المنطقة: ${extractedAddress.area || 'الرفاع'}\n• المجمع: ${extractedAddress.block || '—'} | الطريق: ${extractedAddress.road || '—'} | المبنى: ${extractedAddress.building || '—'}\n\n${conv.cart.items.length > 0 ? 'طلبك جاهز للتأكيد! اضغط على زر الدفع بالأسفل لإتمام الدفع الفوري 📲' : 'تفضل باختيار طلبك لإضافته للسلة طال عمرك! 🥐🎂'}`,
        intent: 'PROVIDE_ADDRESS',
        extractedAddress,
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
            ? `Your cart is currently empty! Please let Lulwa know what pastries or beverages you would like first 🥐☕`
            : `سلتك فاضية حالياً طال عمرك! تفضل اطلب أولاً شنو تحب نجهز لك من معجنات أو حلويات ميزون؟ 🥐☕`,
          intent: 'GENERAL',
        };
      }

      const checkoutButtons: InteractiveButton[] = [
        { id: 'btn_pay_benefit_chk', title: '📲 الدفع عبر BenefitPay Fawri+', action: 'CHECKOUT', payload: 'BENEFITPAY', variant: 'primary' },
        { id: 'btn_pay_apple_chk', title: '🍎 الدفع عبر Apple Pay', action: 'CHECKOUT', payload: 'APPLEPAY', variant: 'secondary' }
      ];

      return {
        replyText: isEnglish
          ? `Certainly! Your order from *Maison de Sucre* is confirmed. 🌸✨\nPlease select your preferred payment method below 👇`
          : `حاضرين وأبشر بعزك! تم تأكيد طلبك من *ميزون دو سوكر*. 🌸✨\nتفضل باختيار وسيلة الدفع بالأسفل لإتمام التحويل الفوري 👇`,
        intent: 'CHECKOUT',
        readyForCheckout: true,
        suggestedPayment: 'BENEFITPAY',
        interactiveButtons: checkoutButtons
      };
    }

    // General fallback
    return {
      replyText: isEnglish
        ? `Welcome to *Maison de Sucre* (Riffa, Bahrain)! 🌸✨\nI am *Lulwa*. We craft exquisite patisserie, artisanal mini pastry gathering boxes, luxury cakes, and signature Karak.\nFeel free to ask for recommendations or tell me your order! (e.g. *"I want 1 Mini Pastry Gathering Box and 1 Signature Karak Box"*).`
        : `أهلاً بك في *ميزون دو سوكر (Maison de Sucre)* بالرفاع! 🌸✨\nمعك *لولوة*. نقدم أرقى المعجنات الفرنسية، بوكسات الزوارة والجمعات، الكيك الفاخر، وشاي الكرك الملكي.\nتفضل اذكر طلبك مثل: *"أبي بوكس معجنات ميني للزوارة وبوكس كرك"* وراح أجهزه لك فوراً! 🛵`,
      intent: 'GENERAL',
      interactiveButtons: [
        { id: 'btn_pastry_def', title: '🥐 بوكس معجنات الزوارة', action: 'ADD_TO_CART', payload: 'prod_gathering_pastry', variant: 'gold' },
        { id: 'btn_cake_def', title: '🎂 كيكة الشوكولاتة الملكية', action: 'ADD_TO_CART', payload: 'prod_royal_cake' }
      ]
    };
  }
}
