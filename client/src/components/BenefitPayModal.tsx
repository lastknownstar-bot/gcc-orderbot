import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, CheckCircle2, ShieldCheck, Smartphone } from 'lucide-react';
import { Language, translations } from '../i18n';

interface BenefitPayModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId?: string;
  orderNumber?: string;
  amount: number;
  currency: string;
  reference: string;
  qrPayload?: string;
  onPaymentSuccess?: () => void;
  lang?: Language;
}

export const BenefitPayModal: React.FC<BenefitPayModalProps> = ({
  isOpen,
  onClose,
  orderId,
  orderNumber = 'GCC-ORDER',
  amount,
  currency = 'BHD',
  reference,
  qrPayload,
  onPaymentSuccess,
  lang = 'ar',
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const t = translations[lang];

  if (!isOpen) return null;

  const defaultQr = qrPayload || `BENEFITPAY://PAY?merchant=AL_AMEED&ref=${reference}&amount=${amount.toFixed(3)}&curr=${currency}`;

  const handleSimulatePayment = async () => {
    setIsProcessing(true);
    try {
      if (orderId) {
        const res = await fetch('/api/webhook/payment-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId,
            status: 'PAID',
            paymentMethod: 'BENEFITPAY',
            transactionRef: `BP-TXN-${Date.now().toString().slice(-6)}`
          }),
        });
        const data = await res.json();
        if (data.success) {
          setIsPaid(true);
          setTimeout(() => {
            if (onPaymentSuccess) onPaymentSuccess();
            onClose();
          }, 1600);
        }
      } else {
        setIsPaid(true);
        setTimeout(() => {
          if (onPaymentSuccess) onPaymentSuccess();
          onClose();
        }, 1600);
      }
    } catch (err) {
      console.error('Payment simulation failed:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-md overflow-hidden bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl"
        dir={lang === 'ar' ? 'rtl' : 'ltr'}
      >
        {/* BenefitPay Header Brand */}
        <div className="bg-gradient-to-r from-red-600 to-rose-700 p-5 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <div className="bg-white p-2 rounded-xl text-red-600 font-extrabold text-lg tracking-wider shadow-md">
              Benefit<span className="text-slate-900">Pay</span>
            </div>
            <div>
              <div className="font-semibold text-sm">{t.bpModalHeader}</div>
              <div className="text-xs text-rose-100 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> {t.bpModalSub}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 text-center">
          {isPaid ? (
            <div className="py-8 space-y-4">
              <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto animate-bounce">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-bold text-white">{t.bpSuccessTitle}</h3>
              <p className="text-sm text-slate-400">
                {t.bpSuccessDesc} (#{orderNumber})
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex justify-between items-center bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700/60">
                <div className={lang === 'ar' ? 'text-right' : 'text-left'}>
                  <div className="text-xs text-slate-400">{t.totalAmountLabel}</div>
                  <div className="text-xl font-bold text-white font-mono" dir="ltr">
                    {amount.toFixed(currency === 'BHD' ? 3 : 2)} {currency}
                  </div>
                </div>
                <div className={lang === 'ar' ? 'text-left' : 'text-right'}>
                  <div className="text-xs text-slate-400">{t.refLabel}</div>
                  <div className="text-xs font-semibold text-amber-400 font-mono" dir="ltr">{reference}</div>
                </div>
              </div>

              {/* QR Code Frame */}
              <div className="bg-white p-5 rounded-2xl inline-block shadow-inner mx-auto border-4 border-slate-700">
                <QRCodeSVG
                  value={defaultQr}
                  size={190}
                  level="H"
                  includeMargin={false}
                />
              </div>

              <div className="text-xs text-slate-400 flex items-center justify-center gap-1.5">
                <Smartphone className="w-4 h-4 text-emerald-400" />
                <span>{t.scanNotice}</span>
              </div>

              {/* Quick simulation button */}
              <div className="pt-2 space-y-2">
                <button
                  onClick={handleSimulatePayment}
                  disabled={isProcessing}
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-red-600 hover:from-red-500 to-rose-600 text-white font-semibold rounded-2xl shadow-lg shadow-red-600/30 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  {isProcessing ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>{t.simulatePayBtn}</span>
                      <CheckCircle2 className="w-4 h-4" />
                    </>
                  )}
                </button>

                <p className="text-[11px] text-slate-500">
                  {t.bpFooterNotice}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
