import { Router } from 'express';
import { store } from '../db/store.js';
import { GeminiAgentService } from '../services/gemini.js';
import { PaymentService } from '../services/payment.js';
import { CartItem } from '../db/types.js';

export const chatRouter = Router();

/**
 * Endpoint for the simulated WhatsApp web widget
 */
chatRouter.post('/simulate', async (req, res) => {
  try {
    const { 
      phone = '+97339887766', 
      name = 'محمد الدوسري (Mohamed Al-Doseri)', 
      text,
      buttonAction,
      buttonPayload,
      mediaType
    } = req.body;

    if (!text && !buttonAction) {
      return res.status(400).json({ error: 'Message text or buttonAction is required' });
    }

    const messageText = text || buttonAction;

    // 1. Record incoming customer message
    store.addMessage(phone, {
      sender: 'user',
      text: messageText,
      mediaType: mediaType || 'text',
      metadata: buttonAction ? { buttonAction, buttonPayload } : undefined,
    });

    // 2. Call Gemini AI Agent (or button interceptor)
    let processedText = messageText;
    if (buttonAction === 'ADD_TO_CART' && buttonPayload) {
      const p = store.getProductById(buttonPayload);
      processedText = p ? `أبي ${p.name_ar}` : `أبي أطلب ${buttonPayload}`;
    } else if (buttonAction === 'CONFIRM_PLAQUE') {
      processedText = buttonPayload === 'YES' ? 'نعم، أريد كتابة عبارة إهداء على لوح الشوكولاتة' : 'لا بدون عبارة';
    } else if (buttonAction === 'SHARE_LOCATION') {
      processedText = 'موقعي: مدينة عيسى، مجمع 812، طريق 1238، مبنى 5202A';
    } else if (buttonAction === 'CHECKOUT') {
      processedText = buttonPayload === 'APPLEPAY' ? 'أبي أدفع عن طريق Apple Pay' : 'أبي أدفع بينفت باي فوري+';
    } else if (buttonAction === 'REQUEST_HUMAN') {
      processedText = 'أبي أكلم موظف أو الشيف بخصوص كيكة عرس خاصة أو مناسبة كبيرة';
    }

    const agentOutput = await GeminiAgentService.processMessage(phone, name, processedText);

    const conv = store.getOrCreateConversation(phone);
    const settings = store.getMerchantSettings();

    // 3. Process Cart Updates if agent identified items
    if (agentOutput.cartActions && agentOutput.cartActions.length > 0) {
      const currentItems = [...conv.cart.items];

      for (const action of agentOutput.cartActions) {
        const product = store.getProductById(action.productId);
        if (!product) continue;

        const unitPrice = settings.currency === 'BHD'
          ? product.price_bhd
          : settings.currency === 'SAR'
          ? product.price_sar
          : product.price_aed;

        const existingIndex = currentItems.findIndex((i) => i.productId === action.productId);

        if (action.action === 'ADD') {
          if (existingIndex > -1) {
            currentItems[existingIndex].quantity += action.quantity;
            currentItems[existingIndex].totalPrice = currentItems[existingIndex].quantity * unitPrice;
          } else {
            currentItems.push({
              productId: product.id,
              productNameAr: product.name_ar,
              productNameEn: product.name_en,
              quantity: action.quantity,
              unitPrice,
              totalPrice: action.quantity * unitPrice,
            });
          }
        } else if (action.action === 'SET') {
          if (existingIndex > -1) {
            currentItems[existingIndex].quantity = action.quantity;
            currentItems[existingIndex].totalPrice = action.quantity * unitPrice;
          }
        } else if (action.action === 'REMOVE') {
          if (existingIndex > -1) {
            currentItems.splice(existingIndex, 1);
          }
        }
      }

      store.updateConversationCart(phone, currentItems, agentOutput.calculatedDeliveryFee);
    } else if (agentOutput.calculatedDeliveryFee !== undefined) {
      const conv = store.getOrCreateConversation(phone);
      if (conv.cart.items.length > 0) {
        store.updateConversationCart(phone, conv.cart.items, agentOutput.calculatedDeliveryFee);
      }
    }

    // 4. Update address if extracted
    if (agentOutput.extractedAddress) {
      store.updateConversationAddress(phone, agentOutput.extractedAddress);
    }

    // Update conversation metadata (Gift, Plaque, Human Attention)
    if (agentOutput.isGift) {
      store.updateConversationData(phone, { isGift: true });
    }
    if (agentOutput.chocolatePlaqueMessage) {
      store.updateConversationData(phone, { chocolatePlaqueMessage: agentOutput.chocolatePlaqueMessage });
    }
    if (agentOutput.needsHumanAttention) {
      store.updateConversationData(phone, { needsHumanAttention: true, assignedAgent: 'HUMAN' });
    }

    // 5. Check if Ready for Payment Checkout
    let paymentPayload: any = undefined;
    const updatedConv = store.getOrCreateConversation(phone);

    if (agentOutput.readyForCheckout && updatedConv.cart.items.length > 0) {
      const paymentMethod = (agentOutput.suggestedPayment === 'APPLEPAY' ? 'APPLEPAY' : agentOutput.suggestedPayment === 'TAP' ? 'TAP' : 'BENEFITPAY');

      // Create or reuse pending order
      const order = store.createOrder({
        customerPhone: phone,
        customerName: name,
        items: [...updatedConv.cart.items],
        subtotal: updatedConv.cart.subtotal,
        deliveryFee: updatedConv.cart.deliveryFee,
        total: updatedConv.cart.total,
        currency: settings.currency,
        status: 'PENDING_PAYMENT',
        deliveryAddress: updatedConv.address,
        paymentMethod,
        isGift: updatedConv.isGift || agentOutput.isGift,
        giftRecipientName: updatedConv.giftRecipientName || agentOutput.giftRecipientName,
        giftRecipientPhone: updatedConv.giftRecipientPhone || agentOutput.giftRecipientPhone,
        giftCardMessage: updatedConv.giftCardMessage || agentOutput.giftCardMessage,
        chocolatePlaqueMessage: updatedConv.chocolatePlaqueMessage || agentOutput.chocolatePlaqueMessage,
      });

      updatedConv.currentOrderId = order.id;

      // Generate dynamic payment link (BenefitPay / Tap / ApplePay)
      if (order.paymentMethod === 'BENEFITPAY') {
        const benefitInfo = PaymentService.generateBenefitPayLink(order);
        paymentPayload = {
          type: 'BENEFITPAY',
          amount: benefitInfo.amount,
          currency: benefitInfo.currency,
          qrCodeText: benefitInfo.qrCodeText,
          paymentUrl: benefitInfo.paymentUrl,
          reference: benefitInfo.reference,
        };
      } else if (order.paymentMethod === 'APPLEPAY') {
        const tapInfo = PaymentService.generateTapLink(order);
        paymentPayload = {
          type: 'APPLEPAY',
          amount: tapInfo.amount,
          currency: tapInfo.currency,
          paymentUrl: tapInfo.paymentUrl,
          reference: `APL-${order.orderNumber}`,
        };
      } else {
        const tapInfo = PaymentService.generateTapLink(order);
        paymentPayload = {
          type: 'TAP',
          amount: tapInfo.amount,
          currency: tapInfo.currency,
          paymentUrl: tapInfo.paymentUrl,
          reference: tapInfo.reference,
        };
      }
    }

    // 6. Record Bot Response
    store.addMessage(phone, {
      sender: 'bot',
      text: agentOutput.replyText,
      paymentPayload,
      mediaType: agentOutput.mediaType,
      mediaUrl: agentOutput.mediaUrl,
      mediaData: agentOutput.mediaData,
      interactiveButtons: agentOutput.interactiveButtons,
      metadata: {
        intent: agentOutput.intent,
        readyForCheckout: agentOutput.readyForCheckout,
        isGift: agentOutput.isGift,
        needsHumanAttention: agentOutput.needsHumanAttention,
        chocolatePlaqueMessage: agentOutput.chocolatePlaqueMessage,
      }
    });

    return res.json({
      success: true,
      conversation: store.getOrCreateConversation(phone),
      latestReply: agentOutput.replyText,
      paymentPayload,
    });
  } catch (error: any) {
    console.error('Chat simulation error:', error);
    return res.status(500).json({ error: error.message || 'Internal error' });
  }
});

/**
 * Fetch conversation history
 */
chatRouter.get('/history/:phone', (req, res) => {
  const phone = req.params.phone;
  const conv = store.getOrCreateConversation(phone);
  return res.json({ success: true, conversation: conv });
});

/**
 * Reset conversation for fresh testing
 */
chatRouter.post('/reset/:phone', (req, res) => {
  const phone = req.params.phone;
  const conv = store.resetConversation(phone);
  return res.json({ success: true, conversation: conv });
});

/**
 * Human agent takeover / resolve endpoint
 */
chatRouter.post('/handoff/:phone', (req, res) => {
  const phone = req.params.phone;
  const { resolve = false } = req.body;
  
  const conv = store.updateConversationData(phone, {
    needsHumanAttention: !resolve,
    assignedAgent: resolve ? 'BOT' : 'HUMAN',
  });

  return res.json({ success: true, conversation: conv });
});
