import { Router } from 'express';
import { store } from '../db/store.js';
import { PaymentService } from '../services/payment.js';

export const ordersRouter = Router();

ordersRouter.get('/', (req, res) => {
  const orders = store.getOrders();
  return res.json({ success: true, orders });
});

ordersRouter.get('/:id', (req, res) => {
  const order = store.getOrderById(req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  return res.json({ success: true, order });
});

ordersRouter.patch('/:id/status', (req, res) => {
  const { status } = req.body;
  if (!['PENDING_PAYMENT', 'PAID', 'DISPATCHED', 'CANCELLED'].includes(status)) {
    return res.status(400).json({ error: 'Invalid order status' });
  }

  const updated = store.updateOrderStatus(req.params.id, status);
  if (!updated) return res.status(404).json({ error: 'Order not found' });

  // If merchant dispatches the order, also send a WhatsApp notification!
  if (status === 'DISPATCHED') {
    store.addMessage(updated.customerPhone, {
      sender: 'bot',
      text: `🛵 *تم خروج طلبك للتوصيل!*
طلبك رقم #${updated.orderNumber} في الطريق إليك الآن مع المندوب.
يرجى التأكد من الرد على الاتصال. بالهناء والشفاء! ✨`
    });
  }

  return res.json({ success: true, order: updated });
});

/**
 * Trigger simulated payment from merchant dashboard or simulated payment gateway
 */
ordersRouter.post('/:id/simulate-pay', (req, res) => {
  try {
    const orderId = req.params.id;
    const { paymentMethod = 'BENEFITPAY' } = req.body;
    const order = store.getOrderById(orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const updated = PaymentService.processPaymentWebhook(
      orderId,
      'PAID',
      `SIM-${paymentMethod}-${Date.now().toString().slice(-6)}`
    );

    return res.json({
      success: true,
      order: updated,
      message: 'Simulated payment completed! Confirmation sent to customer chat.'
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});
