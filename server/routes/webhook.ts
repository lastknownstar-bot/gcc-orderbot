import { Router } from 'express';
import { config } from '../config.js';
import { store } from '../db/store.js';
import { GeminiAgentService } from '../services/gemini.js';
import { PaymentService } from '../services/payment.js';

export const webhookRouter = Router();

/**
 * Meta Graph API Webhook Verification (WhatsApp / Instagram)
 */
webhookRouter.get('/whatsapp', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === config.metaVerifyToken) {
    console.log('✅ Meta Webhook successfully verified with challenge token');
    return res.status(200).send(challenge);
  } else {
    console.warn('❌ Meta Webhook verification failed. Token mismatch.');
    return res.status(403).json({ error: 'Verification token mismatch' });
  }
});

/**
 * Meta Graph API Inbound Messages (WhatsApp Business API / Cloud API)
 */
webhookRouter.post('/whatsapp', async (req, res) => {
  try {
    const body = req.body;

    // Meta sends an object with entry -> changes -> value -> messages
    if (body.object === 'whatsapp_business_account' || body.entry) {
      const entries = body.entry || [];
      for (const entry of entries) {
        for (const change of entry.changes || []) {
          const value = change.value;
          if (value && value.messages) {
            for (const message of value.messages) {
              const fromPhone = message.from;
              const contactName = value.contacts?.[0]?.profile?.name || `Customer ${fromPhone.slice(-4)}`;
              const messageText = message.text?.body || '';

              if (messageText) {
                console.log(`📩 Inbound WhatsApp from ${fromPhone}: "${messageText}"`);

                // Record user message
                store.addMessage(fromPhone, {
                  sender: 'user',
                  text: messageText,
                });

                // Run through AI Agent
                const agentOutput = await GeminiAgentService.processMessage(fromPhone, contactName, messageText);

                // Add bot reply to conversation
                store.addMessage(fromPhone, {
                  sender: 'bot',
                  text: agentOutput.replyText,
                });
              }
            }
          }
        }
      }
      return res.status(200).json({ status: 'EVENT_RECEIVED' });
    }

    return res.status(200).send('OK');
  } catch (error: any) {
    console.error('Meta Webhook Error:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * Dynamic Payment Webhook (BenefitPay / Tap Payments / MyFatoorah)
 * When payment status shifts to PAID, this triggers automated receipt & dispatch notification to WhatsApp thread
 */
webhookRouter.post('/payment-status', (req, res) => {
  try {
    const { orderId, status = 'PAID', transactionRef, paymentMethod } = req.body;

    if (!orderId) {
      return res.status(400).json({ error: 'orderId is required' });
    }

    console.log(`💳 Payment Webhook Received for Order ${orderId}: Status=${status}`);

    const updatedOrder = PaymentService.processPaymentWebhook(orderId, status as 'PAID' | 'FAILED', transactionRef);

    return res.json({
      success: true,
      order: updatedOrder,
      message: 'Payment status updated and automated confirmation sent to customer chat thread.'
    });
  } catch (error: any) {
    console.error('Payment Webhook Error:', error);
    return res.status(500).json({ error: error.message });
  }
});
