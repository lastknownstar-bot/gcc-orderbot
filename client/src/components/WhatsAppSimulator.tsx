import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  RotateCcw, 
  Phone, 
  Video, 
  CheckCheck, 
  Smile, 
  Paperclip, 
  Mic, 
  CreditCard, 
  QrCode, 
  Sparkles,
  ShoppingBag,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { Conversation } from '../types';
import { BenefitPayModal } from './BenefitPayModal';
import { Language, translations } from '../i18n';

interface WhatsAppSimulatorProps {
  conversation: Conversation | null;
  onSendMessage: (text: string) => Promise<void>;
  onResetChat: () => void;
  isLoading: boolean;
  storeName: string;
  currency: string;
  onRefreshOrders?: () => void;
  lang?: Language;
}

export const WhatsAppSimulator: React.FC<WhatsAppSimulatorProps> = ({
  conversation,
  onSendMessage,
  onResetChat,
  isLoading,
  storeName,
  currency,
  onRefreshOrders,
  lang = 'ar',
}) => {
  const [inputText, setInputText] = useState('');
  const [activePaymentModal, setActivePaymentModal] = useState<{
    isOpen: boolean;
    orderId?: string;
    orderNumber?: string;
    amount: number;
    reference: string;
    qrPayload?: string;
  }>({
    isOpen: false,
    amount: 0,
    reference: '',
  });

  const t = translations[lang];
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversation?.messages, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;
    const text = inputText;
    setInputText('');
    onSendMessage(text);
  };

  const quickPrompts = t.prompts;

  // Helper to format whatsapp markdown bold (*bold* -> <strong>bold</strong>)
  const formatWhatsAppText = (content: string) => {
    const lines = content.split('\n');
    return lines.map((line, idx) => {
      const parts = line.split(/(\*[^*]+\*)/g);
      return (
        <span key={idx} className="block min-h-[1.2em]">
          {parts.map((part, pIdx) => {
            if (part.startsWith('*') && part.endsWith('*')) {
              return (
                <strong key={pIdx} className="font-bold text-white">
                  {part.slice(1, -1)}
                </strong>
              );
            }
            return part;
          })}
        </span>
      );
    });
  };

  const messages = conversation?.messages || [];

  return (
    <div 
      className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl relative"
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
    >
      {/* WhatsApp Header */}
      <div className="bg-[#075E54] dark:bg-[#1f2c34] text-white px-4 py-3 flex items-center justify-between shadow-md z-10">
        <div className="flex items-center gap-3">
          <div className="relative">
            <img
              src="https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=100&auto=format&fit=crop&q=80"
              alt="Avatar"
              className="w-10 h-10 rounded-full object-cover border-2 border-emerald-400"
            />
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 border-2 border-slate-900 rounded-full" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="font-semibold text-sm leading-tight text-white">{storeName}</h2>
              <span className="bg-emerald-500 text-[10px] text-white px-1.5 py-0.2 rounded-full font-bold flex items-center">
                ✓
              </span>
            </div>
            <p className="text-[11px] text-emerald-200/90 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {t.onlineStatus} ({t.verifiedBadge})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-slate-200">
          <button
            onClick={onResetChat}
            title="Reset Chat Session"
            className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-300 hover:text-white"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <Video className="w-4 h-4" />
          </button>
          <button className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <Phone className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Quick Testing Prompts Bar */}
      <div className="bg-slate-950/80 backdrop-blur border-b border-slate-800 p-2.5 overflow-x-auto flex gap-1.5 no-scrollbar z-10">
        <div className="flex items-center gap-1 text-[11px] text-amber-400 font-semibold px-1.5 shrink-0">
          <Sparkles className="w-3.5 h-3.5" />
          <span>{t.quickTestsLabel}</span>
        </div>
        {quickPrompts.map((item, idx) => (
          <button
            key={idx}
            onClick={() => onSendMessage(item.text)}
            disabled={isLoading}
            className="shrink-0 px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-full border border-slate-700/80 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1"
          >
            <span>{item.label}</span>
          </button>
        ))}
      </div>

      {/* WhatsApp Message Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 whatsapp-bg relative">
        {/* Date Pill */}
        <div className="flex justify-center my-1">
          <span className="bg-slate-800/90 text-slate-400 text-[11px] px-3 py-0.5 rounded-lg border border-slate-700/50 shadow-sm">
            {t.todayPill}
          </span>
        </div>

        {/* Security message */}
        <div className="flex justify-center my-1">
          <span className="bg-amber-500/10 text-amber-300 text-[10px] px-3 py-1 rounded-lg border border-amber-500/20 max-w-xs text-center">
            {t.encryptionNotice}
          </span>
        </div>

        {messages.length === 0 && (
          <div className="text-center py-12 text-slate-400 text-xs">
            <p className="mb-2">{t.emptyChatPrompt}</p>
            <p className="text-[11px] text-slate-500">"{lang === 'ar' ? 'أبي 2 بوكس كرك و 1 كنافة' : 'I want 2 Karak boxes and 1 Kunafa'}"</p>
          </div>
        )}

        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} transition-all`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-md relative ${
                  isUser
                    ? 'bg-[#005c4b] text-emerald-50 rounded-br-none'
                    : 'bg-[#202c33] text-slate-100 rounded-bl-none border border-slate-700/40'
                }`}
                dir="auto"
              >
                {/* Message text with formatting */}
                <div className="text-[13px] leading-relaxed break-words">
                  {formatWhatsAppText(msg.text)}
                </div>

                {/* Embedded Payment Card if generated */}
                {msg.paymentPayload && (
                  <div className="mt-3 pt-3 border-t border-slate-600/50 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-white flex items-center gap-1.5">
                        <CreditCard className="w-3.5 h-3.5 text-rose-400" />
                        {msg.paymentPayload.type === 'BENEFITPAY' ? 'BenefitPay (Fawri+)' : 'Tap GCC Checkout'}
                      </span>
                      <span className="font-mono text-emerald-400 font-bold" dir="ltr">
                        {msg.paymentPayload.amount.toFixed(msg.paymentPayload.currency === 'BHD' ? 3 : 2)} {msg.paymentPayload.currency}
                      </span>
                    </div>

                    {msg.paymentPayload.type === 'BENEFITPAY' ? (
                      <button
                        onClick={() =>
                          setActivePaymentModal({
                            isOpen: true,
                            orderId: conversation?.currentOrderId,
                            orderNumber: msg.paymentPayload?.reference,
                            amount: msg.paymentPayload?.amount || 0,
                            reference: msg.paymentPayload?.reference || '',
                            qrPayload: msg.paymentPayload?.qrCodeText,
                          })
                        }
                        className="w-full py-2 px-3 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-semibold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition-all active:scale-95"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span>{t.openBenefitPayQR}</span>
                        <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" />
                      </button>
                    ) : (
                      <a
                        href={msg.paymentPayload.paymentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all text-center"
                      >
                        <span>{t.payWithTap}</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                )}

                {/* Timestamp and ticks */}
                <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-slate-400" dir="ltr">
                  <span>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {isUser && <CheckCheck className="w-3.5 h-3.5 text-sky-400" />}
                </div>
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-start">
            <div className="bg-[#202c33] rounded-2xl rounded-bl-none px-4 py-2.5 text-xs text-slate-400 flex items-center gap-2 shadow border border-slate-700/40">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>{t.typingBot}</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Floating Active Cart preview at bottom of chat */}
      {conversation?.cart && conversation.cart.items.length > 0 && (
        <div className="bg-slate-800/95 backdrop-blur px-4 py-2 border-t border-slate-700/80 flex items-center justify-between text-xs z-10">
          <div className="flex items-center gap-2 text-slate-300">
            <ShoppingBag className="w-4 h-4 text-emerald-400" />
            <span>
              {t.cartBar} <strong className="text-white">{conversation.cart.items.length} {t.cartItemsCount}</strong>
            </span>
          </div>
          <div className="font-mono text-emerald-400 font-bold" dir="ltr">
            {conversation.cart.total.toFixed(currency === 'BHD' ? 3 : 2)} {currency}
          </div>
        </div>
      )}

      {/* WhatsApp Input Bar */}
      <form
        onSubmit={handleSubmit}
        className="bg-[#1f2c34] p-3 flex items-center gap-2 border-t border-slate-800 z-10"
      >
        <button
          type="button"
          className="text-slate-400 hover:text-slate-200 p-1.5 rounded-full hover:bg-slate-800 transition-colors"
        >
          <Smile className="w-5 h-5" />
        </button>
        <button
          type="button"
          className="text-slate-400 hover:text-slate-200 p-1.5 rounded-full hover:bg-slate-800 transition-colors"
        >
          <Paperclip className="w-5 h-5" />
        </button>

        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={t.inputPlaceholder}
          className="flex-1 bg-slate-800 text-slate-100 placeholder-slate-400 text-sm px-4 py-2.5 rounded-full focus:outline-none focus:ring-2 focus:ring-emerald-500 font-sans"
          dir="auto"
        />

        {inputText.trim() ? (
          <button
            type="submit"
            disabled={isLoading}
            className="w-10 h-10 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-lg transition-all active:scale-95 disabled:opacity-50"
          >
            <Send className="w-4 h-4 rtl:rotate-180" />
          </button>
        ) : (
          <button
            type="button"
            className="w-10 h-10 bg-slate-800 text-slate-300 hover:text-white rounded-full flex items-center justify-center transition-colors"
          >
            <Mic className="w-4 h-4" />
          </button>
        )}
      </form>

      {/* BenefitPay Modal Integration */}
      <BenefitPayModal
        isOpen={activePaymentModal.isOpen}
        onClose={() => setActivePaymentModal((prev) => ({ ...prev, isOpen: false }))}
        orderId={activePaymentModal.orderId}
        orderNumber={activePaymentModal.orderNumber}
        amount={activePaymentModal.amount}
        currency={currency}
        reference={activePaymentModal.reference}
        qrPayload={activePaymentModal.qrPayload}
        onPaymentSuccess={() => {
          if (onRefreshOrders) onRefreshOrders();
        }}
        lang={lang}
      />
    </div>
  );
};
