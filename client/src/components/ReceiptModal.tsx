import React from 'react';
import { X, Printer, CheckCircle, Gift, Sparkles, MapPin } from 'lucide-react';
import { Order } from '../types';
import { Language, translations } from '../i18n';

interface ReceiptModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  lang?: Language;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  order,
  isOpen,
  onClose,
  lang = 'ar'
}) => {
  if (!isOpen || !order) return null;

  const t = translations[lang];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-slate-900 border border-amber-500/30 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col text-slate-100 max-h-[90vh]"
        dir={lang === 'ar' ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-950 via-slate-900 to-amber-950 border-b border-amber-500/20 p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-amber-300">Maison de Sucre (ميزون دو سوكر)</h3>
              <p className="text-xs text-slate-400">Riffa, Kingdom of Bahrain • {t.taxInvoice}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Receipt Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm">
          {/* Status & TRN Banner */}
          <div className="flex items-center justify-between p-3.5 bg-slate-950/60 rounded-2xl border border-slate-800">
            <div>
              <span className="text-[11px] font-mono text-slate-400 block">{t.vatTrn}</span>
              <span className="text-xs font-semibold text-slate-200">
                {order.orderNumber} • {new Date(order.createdAt).toLocaleDateString()}
              </span>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <CheckCircle className="w-3.5 h-3.5" />
              {order.status}
            </span>
          </div>

          {/* Customer & Address */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-800">
              <span className="text-slate-400 block mb-1">{t.colCustomer}</span>
              <p className="font-semibold text-slate-200">{order.customerName}</p>
              <p className="text-slate-400 font-mono text-[11px]">{order.customerPhone}</p>
            </div>
            <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-800">
              <span className="text-slate-400 block mb-1 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-amber-400" />
                {t.colAddress}
              </span>
              <p className="font-medium text-slate-200">
                {order.deliveryAddress.area || 'West Riffa'}
              </p>
              <p className="text-slate-400 text-[11px]">
                Block {order.deliveryAddress.block || '912'}, Road {order.deliveryAddress.road || '1402'}
              </p>
            </div>
          </div>

          {/* Special Gift or Chocolate Plaque Notice */}
          {order.isGift && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-start gap-2.5">
              <Gift className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs">
                <span className="font-bold text-amber-300 block">{t.giftBadge}</span>
                <p className="text-slate-300">
                  {order.giftCardMessage ? `"${order.giftCardMessage}"` : 'Wrapped in luxury gold ribbon. No prices attached on delivery.'}
                </p>
              </div>
            </div>
          )}

          {order.chocolatePlaqueMessage && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-xs">
              <span className="font-bold text-rose-300 block mb-0.5">{t.plaqueLabel}:</span>
              <p className="text-slate-200 italic font-serif">"{order.chocolatePlaqueMessage}"</p>
            </div>
          )}

          {/* Items Table */}
          <div className="border border-slate-800 rounded-2xl overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-slate-800/60 text-slate-400 font-medium">
                <tr>
                  <th className="p-2.5 text-start">{t.colProduct}</th>
                  <th className="p-2.5 text-center">{t.colQty}</th>
                  <th className="p-2.5 text-end">{t.colUnitPrice}</th>
                  <th className="p-2.5 text-end">{t.colSubtotal}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {order.items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/20">
                    <td className="p-2.5 text-slate-200">
                      {lang === 'ar' ? item.productNameAr : item.productNameEn}
                    </td>
                    <td className="p-2.5 text-center text-slate-400 font-mono">x{item.quantity}</td>
                    <td className="p-2.5 text-end text-slate-400 font-mono">{item.unitPrice.toFixed(3)} BD</td>
                    <td className="p-2.5 text-end font-semibold text-slate-200 font-mono">{item.totalPrice.toFixed(3)} BD</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pricing Calculation */}
          <div className="space-y-1.5 pt-2 text-xs border-t border-slate-800">
            <div className="flex justify-between text-slate-400">
              <span>{t.colSubtotal}</span>
              <span className="font-mono">{order.subtotal.toFixed(3)} BD</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>{t.deliveryFeeLabel}</span>
              <span className="font-mono">{order.deliveryFee.toFixed(3)} BD</span>
            </div>
            <div className="flex justify-between text-base font-bold text-amber-300 pt-2 border-t border-slate-800/80">
              <span>{t.totalLabel}</span>
              <span className="font-mono text-lg">{order.total.toFixed(3)} BD</span>
            </div>
          </div>

          {/* Payment Method Details */}
          <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-800/60 flex items-center justify-between text-xs">
            <span className="text-slate-400">Payment Rail:</span>
            <span className="font-semibold text-emerald-400">
              {order.paymentMethod === 'APPLEPAY' ? ' Apple Pay' : 'BenefitPay Fawri+ (بنفت باي)'}
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs text-slate-300 hover:bg-slate-800 rounded-xl transition-colors"
          >
            {t.closeReceipt}
          </button>
          <button
            onClick={handlePrint}
            className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
          >
            <Printer className="w-4 h-4" />
            {t.printReceipt}
          </button>
        </div>
      </div>
    </div>
  );
};
