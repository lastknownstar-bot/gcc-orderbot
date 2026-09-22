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
    const { phone = '+97339887766', name = 'محمد الدوسري (Mohamed Al-Doseri)', text } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Message text is required' });
    }

    // 1. Record incoming customer message
    store.addMessage(phone, {
      sender: 'user',
      text,
    });

    // 2. Call Gemini AI Agent
    const agentOutput = await GeminiAgentService.processMessage(phone, name, text);

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

      store.updateConversationCart(phone, currentItems);
    }

    // 4. Update address if extracted
    if (agentOutput.extractedAddress) {
      store.updateConversationAddress(phone, agentOutput.extractedAddress);
    }

    // 5. Check if Ready for Payment Checkout
    let paymentPayload: any = undefined;
    const updatedConv = store.getOrCreateConversation(phone);

    if (agentOutput.readyForCheckout && updatedConv.cart.items.length > 0) {
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
        paymentMethod: (agentOutput.suggestedPayment === 'TAP' ? 'TAP' : 'BENEFITPAY'),
      });

      updatedConv.currentOrderId = order.id;

      // Generate dynamic payment link (BenefitPay / Tap)
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
      metadata: {
        intent: agentOutput.intent,
        readyForCheckout: agentOutput.readyForCheckout,
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
