import { Order } from '../db/types.js';
import { store } from '../db/store.js';

export interface PaymentLinkResult {
  method: 'BENEFITPAY' | 'TAP';
  paymentUrl: string;
  qrCodeText?: string;
  reference: string;
  amount: number;
  currency: string;
}

export class PaymentService {
  /**
   * Generates a BenefitPay QR string & dynamic checkout URL
   * In Bahrain, BenefitPay Fawri+ uses standard merchant QR formats
   */
  static generateBenefitPayLink(order: Order): PaymentLinkResult {
    const settings = store.getMerchantSettings();
    const reference = `BENEFIT-${order.orderNumber}`;

    // Standardized Bahrain BenefitPay Fawri+ URI scheme
    const qrCodeText = `BENEFITPAY://PAY?merchantId=${settings.benefitPayMerchantId}&iban=${settings.benefitPayIban}&amount=${order.total.toFixed(3)}&currency=${order.currency}&ref=${reference}`;
    
    // Web payment link stub for simulation
    const paymentUrl = `/pay/benefit?orderId=${order.id}&ref=${reference}&amount=${order.total.toFixed(3)}`;

    return {
      method: 'BENEFITPAY',
      paymentUrl,
      qrCodeText,
      reference,
      amount: order.total,
      currency: order.currency,
    };
  }

  /**
   * Generates a Tap Payments GCC checkout link
   */
  static generateTapLink(order: Order): PaymentLinkResult {
    const reference = `TAP-${order.orderNumber}`;
    const paymentUrl = `https://checkout.tap.company/mock-pay?charge_id=${reference}&amount=${order.total.toFixed(2)}&currency=${order.currency}`;

    return {
      method: 'TAP',
      paymentUrl,
      reference,
      amount: order.total,
      currency: order.currency,
    };
  }

  /**
   * Process incoming payment webhook (from BenefitPay / Tap / MyFatoorah)
   */
  static processPaymentWebhook(orderId: string, status: 'PAID' | 'FAILED', transactionRef?: string) {
    const order = store.getOrderById(orderId);
    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    if (status === 'PAID') {
      const updatedOrder = store.updateOrderStatus(orderId, 'PAID', {
        paymentReference: transactionRef || order.paymentReference,
      });

      // Append bilingual confirmation to WhatsApp conversation thread
      const receiptMessage = 
`✅ *تم استلام المبلغ بنجاح عبر ${order.paymentMethod}*
✅ *Payment Received Successfully via ${order.paymentMethod}*
━━━━━━━━━━━━━━━━━
📋 *رقم الطلب / Order #:* #${order.orderNumber}
💰 *المبلغ المدفوع / Amount Paid:* ${order.total.toFixed(order.currency === 'BHD' ? 3 : 2)} ${order.currency}
📍 *العنوان / Address:* ${order.deliveryAddress.area || ''}، Block ${order.deliveryAddress.block || ''}، Road ${order.deliveryAddress.road || ''}، Bldg ${order.deliveryAddress.building || ''}

🛵 جاري تجهيز طلبك الآن وسيقوم المندوب بالتواصل معك عند الوصول.
🛵 Your order is being prepared and our courier will contact you upon arrival.
شكراً لاختيارك ${store.getMerchantSettings().name}! ✨`;

      store.addMessage(order.customerPhone, {
        sender: 'bot',
        text: receiptMessage,
      });

      return updatedOrder;
    } else {
      return store.updateOrderStatus(orderId, 'CANCELLED');
    }
  }
}
