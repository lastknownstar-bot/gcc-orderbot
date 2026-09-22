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
  ChevronRight,
  MapPin,
  Play,
  Pause,
  Plus,
  Volume2,
  Gift,
  Cake,
  Apple
} from 'lucide-react';
import { Conversation, InteractiveButton } from '../types';
import { BenefitPayModal } from './BenefitPayModal';
import { Language, translations } from '../i18n';
import { soundEngine } from '../utils/audio';

interface WhatsAppSimulatorProps {
  conversation: Conversation | null;
  onSendMessage: (text: string, mediaType?: 'text' | 'location') => Promise<void>;
  onButtonClick?: (action: string, payload?: string, title?: string) => Promise<void>;
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
  onButtonClick,
  onResetChat,
  isLoading,
  storeName,
  currency,
  onRefreshOrders,
  lang = 'ar',
}) => {
  const [inputText, setInputText] = useState('');
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [activePaymentModal, setActivePaymentModal] = useState<{
    isOpen: boolean;
    orderId?: string;
    orderNumber?: string;
    amount: number;
    reference: string;
    qrPayload?: string;
    initialMethod?: 'BENEFITPAY' | 'APPLEPAY';
  }>({
    isOpen: false,
    amount: 0,
    reference: '',
    initialMethod: 'BENEFITPAY',
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

  const handleLocationClick = () => {
    onSendMessage('موقعي: مدينة عيسى، مجمع 812، طريق 1238، مبنى 5202A', 'location');
  };

  const handlePlayVoiceNote = () => {
    if (isPlayingAudio) return;
    setIsPlayingAudio(true);
    soundEngine.playVoiceNoteDemo(() => {
      setIsPlayingAudio(false);
    });
  };

  const handleInteractiveButtonClick = (btn: InteractiveButton) => {
    if (onButtonClick) {
      onButtonClick(btn.action, btn.payload, btn.title);
    } else {
      if (btn.action === 'SHARE_LOCATION') {
        handleLocationClick();
      } else if (btn.action === 'CHECKOUT') {
        onSendMessage(btn.payload === 'APPLEPAY' ? 'أبي أدفع عبر Apple Pay' : 'أبي أدفع عبر BenefitPay');
      } else {
        onSendMessage(btn.title);
      }
    }
  };

  const quickPrompts = t.prompts;

  // Format whatsapp markdown bold (*bold* -> <strong>bold</strong>)
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
      className="flex flex-col h-full bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl relative"
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
    >
      {/* WhatsApp Header */}
      <div className="bg-[#075E54] dark:bg-[#1f2c34] text-white px-4 py-3 flex items-center justify-between shadow-md z-10">
        <div className="flex items-center gap-3">
          <div className="relative">
            <img
              src="https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=100&auto=format&fit=crop&q=80"
              alt="Cupcake Boutique Avatar"
              className="w-10 h-10 rounded-full object-cover border-2 border-amber-400"
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

        <div className="flex items-center gap-1.5 text-slate-200">
          <button
            onClick={handlePlayVoiceNote}
            title={t.voiceNoteTooltip}
            className={`p-2 rounded-full transition-all ${
              isPlayingAudio ? 'bg-amber-500 text-slate-950 animate-pulse' : 'hover:bg-white/10 text-amber-300'
            }`}
          >
            <Volume2 className="w-4 h-4" />
          </button>
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
      <div className="bg-slate-900/90 backdrop-blur border-b border-slate-800 p-2 overflow-x-auto flex gap-1.5 no-scrollbar z-10">
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

      {/* WhatsApp Message Body with Authentic Doodle Background Pattern */}
      <div 
        className="flex-1 overflow-y-auto p-4 space-y-3 relative"
        style={{
          backgroundColor: '#0b141a',
          backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px)`,
          backgroundSize: '20px 20px',
        }}
      >
        {/* Today Pill & Encryption Notice */}
        <div className="flex flex-col items-center gap-2 mb-3">
          <span className="bg-slate-800/80 text-slate-400 text-[10px] px-3 py-0.5 rounded-full font-medium">
            {t.todayPill}
          </span>
          <div className="bg-[#182229] border border-amber-500/20 text-amber-200/90 text-[11px] px-4 py-2 rounded-xl text-center max-w-sm shadow-sm leading-relaxed">
            {t.encryptionNotice}
          </div>
        </div>

        {/* Voice Note Demonstration Banner */}
        <div className="flex justify-start">
          <div className="bg-[#202c33] rounded-2xl rounded-bl-none p-3 border border-amber-500/30 max-w-[85%] shadow-lg">
            <div className="flex items-center gap-3">
              <button
                onClick={handlePlayVoiceNote}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                  isPlayingAudio ? 'bg-amber-400 text-slate-900 animate-pulse' : 'bg-emerald-500 text-white'
                }`}
              >
                {isPlayingAudio ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
              </button>
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-amber-300">{t.voiceNoteLabel}</span>
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded-full font-mono">
                    Dana Concierge
                  </span>
                </div>
                {/* Audio Waveform visualization */}
                <div className="flex items-center gap-0.5 h-3">
                  {[4, 8, 12, 6, 14, 10, 8, 16, 12, 6, 10, 8, 14, 4, 10, 6].map((h, i) => (
                    <span 
                      key={i} 
                      className={`w-1 rounded-full transition-all duration-300 ${
                        isPlayingAudio ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'
                      }`}
                      style={{ height: `${isPlayingAudio ? Math.min(16, h * 1.3) : h}px` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Conversation Message List */}
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[85%] sm:max-w-[78%] rounded-2xl px-3.5 py-2.5 shadow-md relative ${
                  isUser
                    ? 'bg-[#005c4b] text-emerald-50 rounded-br-none'
                    : 'bg-[#202c33] text-slate-100 rounded-bl-none border border-slate-700/40'
                }`}
                dir="auto"
              >
                {/* Rich Image Card Attachment */}
                {msg.mediaType === 'image' && msg.mediaUrl && (
                  <div className="mb-2.5 overflow-hidden rounded-xl border border-amber-500/30 bg-slate-950/60">
                    <img 
                      src={msg.mediaUrl} 
                      alt={msg.mediaData?.title || 'Delicacy'} 
                      className="w-full h-36 object-cover"
                    />
                    <div className="p-2.5 flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-xs text-amber-300">{msg.mediaData?.title}</h4>
                        <span className="text-[11px] font-mono text-emerald-400 font-bold">{msg.mediaData?.price}</span>
                      </div>
                      {msg.mediaData?.productId && (
                        <button
                          onClick={() => handleInteractiveButtonClick({
                            id: 'btn_add_card',
                            title: `أضف ${msg.mediaData?.title}`,
                            action: 'ADD_TO_CART',
                            payload: msg.mediaData?.productId
                          })}
                          className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1 active:scale-95 transition-transform"
                        >
                          <Plus className="w-3 h-3" />
                          <span>إضافة</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* GPS Location Pin Card */}
                {msg.mediaType === 'location' && (
                  <div className="mb-2.5 p-3 rounded-xl bg-slate-900/90 border border-emerald-500/40 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div className="text-xs">
                      <span className="font-bold text-white block">{t.locationSharedTitle}</span>
                      <span className="text-slate-400 text-[11px]">26.1155° N, 50.5577° E • Block 912</span>
                    </div>
                  </div>
                )}

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
                        {msg.paymentPayload.type === 'APPLEPAY' ? ' Apple Pay Express' : 'BenefitPay (Fawri+)'}
                      </span>
                      <span className="font-mono text-emerald-400 font-bold" dir="ltr">
                        {msg.paymentPayload.amount.toFixed(msg.paymentPayload.currency === 'BHD' ? 3 : 2)} {msg.paymentPayload.currency}
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          setActivePaymentModal({
                            isOpen: true,
                            orderId: conversation?.currentOrderId,
                            orderNumber: msg.paymentPayload?.reference,
                            amount: msg.paymentPayload?.amount || 0,
                            reference: msg.paymentPayload?.reference || '',
                            qrPayload: msg.paymentPayload?.qrCodeText,
                            initialMethod: 'BENEFITPAY',
                          })
                        }
                        className="flex-1 py-2 px-3 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-semibold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all active:scale-95"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span>BenefitPay</span>
                      </button>

                      <button
                        onClick={() =>
                          setActivePaymentModal({
                            isOpen: true,
                            orderId: conversation?.currentOrderId,
                            orderNumber: msg.paymentPayload?.reference,
                            amount: msg.paymentPayload?.amount || 0,
                            reference: msg.paymentPayload?.reference || '',
                            initialMethod: 'APPLEPAY',
                          })
                        }
                        className="flex-1 py-2 px-3 bg-white hover:bg-slate-100 text-black font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-1 transition-all active:scale-95"
                      >
                        <span> Pay</span>
                      </button>
                    </div>
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

              {/* Interactive WhatsApp Quick Action Buttons underneath Bot Bubble */}
              {!isUser && msg.interactiveButtons && msg.interactiveButtons.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-1.5 max-w-[85%]">
                  {msg.interactiveButtons.map((btn) => (
                    <button
                      key={btn.id}
                      onClick={() => handleInteractiveButtonClick(btn)}
                      disabled={isLoading}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-95 flex items-center gap-1.5 shadow-sm border ${
                        btn.variant === 'gold'
                          ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-500/40'
                          : btn.variant === 'primary'
                          ? 'bg-emerald-600/30 hover:bg-emerald-600/40 text-emerald-300 border-emerald-500/40'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                      }`}
                    >
                      {btn.action === 'SHARE_LOCATION' && <MapPin className="w-3 h-3 text-amber-400" />}
                      {btn.action === 'ADD_TO_CART' && <Plus className="w-3 h-3 text-emerald-400" />}
                      {btn.action === 'CONFIRM_PLAQUE' && <Cake className="w-3 h-3 text-rose-400" />}
                      <span>{btn.title}</span>
                    </button>
                  ))}
                </div>
              )}
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
        <div className="bg-slate-900/95 backdrop-blur px-4 py-2 border-t border-slate-800 flex items-center justify-between text-xs z-10">
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

      {/* WhatsApp Input Bar with Location & Voice Tools */}
      <form
        onSubmit={handleSubmit}
        className="bg-[#1f2c34] p-3 flex items-center gap-2 border-t border-slate-800 z-10"
      >
        <button
          type="button"
          onClick={handleLocationClick}
          title={t.shareLocationTooltip}
          className="text-amber-400 hover:text-amber-300 p-1.5 rounded-full hover:bg-slate-800 transition-colors"
        >
          <MapPin className="w-5 h-5" />
        </button>
        <button
          type="button"
          onClick={handlePlayVoiceNote}
          title={t.voiceNoteTooltip}
          className="text-emerald-400 hover:text-emerald-300 p-1.5 rounded-full hover:bg-slate-800 transition-colors"
        >
          <Mic className="w-5 h-5" />
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
            onClick={handlePlayVoiceNote}
            className="w-10 h-10 bg-slate-800 text-emerald-400 hover:text-white rounded-full flex items-center justify-center transition-colors"
          >
            <Volume2 className="w-4 h-4" />
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
        initialMethod={activePaymentModal.initialMethod}
        onPaymentSuccess={() => {
          if (onRefreshOrders) onRefreshOrders();
        }}
        lang={lang}
      />
    </div>
  );
};
