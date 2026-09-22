import React, { useState, useEffect, useCallback } from 'react';
import { 
  Bot, 
  Settings as SettingsIcon, 
  Package, 
  Sparkles, 
  Smartphone, 
  LayoutDashboard, 
  Languages,
  AlertTriangle,
  Globe
} from 'lucide-react';
import { WhatsAppSimulator } from './components/WhatsAppSimulator';
import { MerchantDashboard } from './components/MerchantDashboard';
import { CatalogModal } from './components/CatalogModal';
import { SettingsModal } from './components/SettingsModal';
import { Order, Conversation, Product, MerchantSettings } from './types';
import { Language, translations } from './i18n';
import { apiUrl, getApiBaseUrl, setCustomApiBaseUrl, getSavedCustomApiBaseUrl } from './config';
import { soundEngine } from './utils/audio';

export const App: React.FC = () => {
  const [lang, setLang] = useState<Language>('en'); // Default to English as requested
  const t = translations[lang];

  const [orders, setOrders] = useState<Order[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<MerchantSettings>({
    name: 'Maison de Sucre (ميزون دو سوكر)',
    country: 'BH',
    currency: 'BHD',
    deliveryFee: 1.000,
    benefitPayIban: 'BH00BBGO00000001234567',
    benefitPayMerchantId: 'MERC_BH_88992',
    gateways: {
      benefitPay: true,
      tap: true,
      myfatoorah: false,
      shopifySync: true,
      applePay: true,
    },
  });

  const [currentPhone, setCurrentPhone] = useState<string>('+97339887766');
  const [currentCustomerName, setCurrentCustomerName] = useState<string>('Mohamed Al-Doseri (محمد الدوسري)');
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);

  const [isLoadingMessage, setIsLoadingMessage] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeMobileView, setActiveMobileView] = useState<'both' | 'chat' | 'dashboard'>('both');
  const [systemHealth, setSystemHealth] = useState<{ geminiActive: boolean; status: string }>({
    geminiActive: false,
    status: 'ok',
  });
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [customApiUrlInput, setCustomApiUrlInput] = useState<string>(getSavedCustomApiBaseUrl());

  // Keep html direction in sync with language
  useEffect(() => {
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang]);

  // Load initial backend state
  const fetchData = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const [ordersRes, convsRes, prodsRes, settingsRes, healthRes] = await Promise.all([
        fetch(apiUrl('/api/orders')),
        fetch(apiUrl('/api/conversations')),
        fetch(apiUrl('/api/products')),
        fetch(apiUrl('/api/merchant/settings')),
        fetch(apiUrl('/api/health')),
      ]);

      const [ordersData, convsData, prodsData, settingsData, healthData] = await Promise.all([
        ordersRes.json(),
        convsRes.json(),
        prodsRes.json(),
        settingsRes.json(),
        healthRes.json(),
      ]);

      if (ordersData.orders) setOrders(ordersData.orders);
      if (convsData.conversations) {
        setConversations(convsData.conversations);
        const match = convsData.conversations.find((c: Conversation) => c.customerPhone === currentPhone);
        if (match) setCurrentConversation(match);
      }
      if (prodsData.products) setProducts(prodsData.products);
      if (settingsData.settings) setSettings(settingsData.settings);
      if (healthData) setSystemHealth({ geminiActive: healthData.geminiActive, status: healthData.status });
      setConnectionError(null);
    } catch (err: any) {
      console.error('Failed to load data from backend:', err);
      setConnectionError(err.message || 'Cannot reach backend server');
    } finally {
      setIsRefreshing(false);
    }
  }, [currentPhone]);

  useEffect(() => {
    fetchData();
    // Lightweight polling every 3 seconds for real-time dashboard updates
    const timer = setInterval(() => {
      fetch(apiUrl('/api/orders'))
        .then((r) => r.json())
        .then((d) => d.orders && setOrders(d.orders))
        .catch(() => {});

      fetch(apiUrl('/api/conversations'))
        .then((r) => r.json())
        .then((d) => {
          if (d.conversations) {
            setConversations(d.conversations);
            const match = d.conversations.find((c: Conversation) => c.customerPhone === currentPhone);
            if (match) setCurrentConversation(match);
          }
        })
        .catch(() => {});
    }, 3000);

    return () => clearInterval(timer);
  }, [fetchData, currentPhone]);

  // Handle customer sending a message in WhatsApp
  const handleSendMessage = async (text: string, mediaType?: 'text' | 'location') => {
    setIsLoadingMessage(true);
    try {
      const res = await fetch(apiUrl('/api/chat/simulate'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: currentPhone,
          name: currentCustomerName,
          text,
          mediaType: mediaType || 'text',
        }),
      });

      const data = await res.json();
      if (data.success) {
        setCurrentConversation(data.conversation);
        await fetchData(); // Refresh dashboard orders & carts immediately
      }
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setIsLoadingMessage(false);
    }
  };

  // Handle interactive button click
  const handleButtonClick = async (action: string, payload?: string, title?: string) => {
    setIsLoadingMessage(true);
    try {
      const res = await fetch(apiUrl('/api/chat/simulate'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: currentPhone,
          name: currentCustomerName,
          text: title,
          buttonAction: action,
          buttonPayload: payload,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setCurrentConversation(data.conversation);
        await fetchData();
      }
    } catch (err) {
      console.error('Error triggering button action:', err);
    } finally {
      setIsLoadingMessage(false);
    }
  };

  // Handle human agent takeover / resolve
  const handleTakeoverConversation = async (phone: string, resolve: boolean) => {
    try {
      const res = await fetch(apiUrl(`/api/chat/handoff/${encodeURIComponent(phone)}`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolve }),
      });
      const data = await res.json();
      if (data.success) {
        fetchData();
      }
    } catch (err) {
      console.error('Failed to update handoff:', err);
    }
  };

  // Reset current conversation
  const handleResetChat = async () => {
    try {
      const res = await fetch(apiUrl(`/api/chat/reset/${encodeURIComponent(currentPhone)}`), {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        setCurrentConversation(data.conversation);
        fetchData();
      }
    } catch (err) {
      console.error('Failed to reset chat:', err);
    }
  };

  // Update order status
  const handleUpdateOrderStatus = async (orderId: string, status: Order['status']) => {
    try {
      const res = await fetch(apiUrl(`/api/orders/${orderId}/status`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (data.success) {
        fetchData();
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  // Simulate payment from merchant dashboard
  const handleSimulatePayment = async (orderId: string) => {
    try {
      const res = await fetch(apiUrl(`/api/orders/${orderId}/simulate-pay`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentMethod: 'BENEFITPAY' }),
      });
      const data = await res.json();
      if (data.success) {
        soundEngine.playCashRegister();
        fetchData();
      }
    } catch (err) {
      console.error('Failed to simulate payment:', err);
    }
  };

  // Update merchant settings
  const handleUpdateSettings = async (updated: Partial<MerchantSettings>) => {
    try {
      const res = await fetch(apiUrl('/api/merchant/settings'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
      const data = await res.json();
      if (data.success) {
        setSettings(data.settings);
        fetchData();
      }
    } catch (err) {
      console.error('Failed to update settings:', err);
    }
  };

  // Update stock level for catalog
  const handleUpdateStock = async (productId: string, newStock: number) => {
    try {
      const res = await fetch(apiUrl(`/api/products/${productId}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock: newStock }),
      });
      const data = await res.json();
      if (data.success) {
        fetchData();
      }
    } catch (err) {
      console.error('Failed to update product stock:', err);
    }
  };

  return (
    <div 
      className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500/30 selection:text-amber-200"
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
    >
      {/* Top Main Navigation Header */}
      <header className="bg-slate-900/90 backdrop-blur border-b border-slate-800 px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-30 shadow-lg">
        {/* Brand identity */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-amber-600 to-yellow-500 p-0.5 shadow-lg shadow-amber-500/20">
            <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center text-amber-400">
              <Bot className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-base sm:text-lg tracking-tight text-white flex items-center gap-2">
                <span>{t.appName}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  {t.edition}
                </span>
              </h1>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              {t.subTitle}
            </p>
          </div>
        </div>

        {/* Action Controls & Language Switcher */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Language Switcher */}
          <button
            onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all active:scale-95 shadow-sm"
            title="Toggle Language / تغيير اللغة"
          >
            <Languages className="w-3.5 h-3.5 text-amber-400" />
            <span>{lang === 'ar' ? 'English (EN)' : 'العربية (AR)'}</span>
          </button>

          {/* AI Engine Status Pill */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs">
            <span
              className={`w-2 h-2 rounded-full ${
                systemHealth.geminiActive ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`}
            />
            <span className="text-slate-300 font-medium">
              {systemHealth.geminiActive ? t.geminiActive : t.heuristicActive}
            </span>
          </div>

          {/* Catalog Modal Trigger */}
          <button
            onClick={() => setIsCatalogOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors shadow-sm"
          >
            <Package className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">{t.catalogBtn}</span>
          </button>

          {/* Settings Modal Trigger */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors shadow-sm"
          >
            <SettingsIcon className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">{t.settingsBtn}</span>
          </button>

          {/* Mobile View Toggle */}
          <div className="flex lg:hidden bg-slate-800 p-0.5 rounded-xl border border-slate-700">
            <button
              onClick={() => setActiveMobileView('chat')}
              className={`p-1.5 rounded-lg transition-colors ${
                activeMobileView === 'chat' ? 'bg-emerald-600 text-white' : 'text-slate-400'
              }`}
            >
              <Smartphone className="w-4 h-4" />
            </button>
            <button
              onClick={() => setActiveMobileView('dashboard')}
              className={`p-1.5 rounded-lg transition-colors ${
                activeMobileView === 'dashboard' ? 'bg-emerald-600 text-white' : 'text-slate-400'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Cross-domain / Backend connection alert if needed */}
      {connectionError && (
        <div className="bg-amber-950/80 border-b border-amber-500/40 px-4 py-2.5 text-xs text-amber-200 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>Backend Disconnected:</strong> {connectionError}. If running frontend on Vercel, set your Render backend URL below:
            </span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={customApiUrlInput}
              onChange={(e) => setCustomApiUrlInput(e.target.value)}
              placeholder="https://your-backend.onrender.com"
              className="bg-slate-900 border border-slate-700 px-3 py-1 text-xs text-white rounded-lg focus:outline-none focus:border-amber-400 font-mono w-64"
              dir="ltr"
            />
            <button
              onClick={() => {
                setCustomApiBaseUrl(customApiUrlInput);
                fetchData();
              }}
              className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs transition-colors shadow-sm"
            >
              Save & Connect
            </button>
          </div>
        </div>
      )}

      {/* Main Studio View: Dual-pane Split Screen */}
      <main className="flex-1 p-3 sm:p-5 overflow-hidden flex gap-5 max-w-[1920px] w-full mx-auto">
        {/* Left Side: Interactive WhatsApp Client Simulator */}
        <div
          className={`w-full lg:w-[420px] xl:w-[460px] shrink-0 h-[calc(100vh-5.5rem)] ${
            activeMobileView === 'dashboard' ? 'hidden lg:block' : 'block'
          }`}
        >
          <WhatsAppSimulator
            conversation={currentConversation}
            onSendMessage={handleSendMessage}
            onButtonClick={handleButtonClick}
            onResetChat={handleResetChat}
            isLoading={isLoadingMessage}
            storeName={settings.name}
            currency={settings.currency}
            onRefreshOrders={fetchData}
            lang={lang}
          />
        </div>

        {/* Right Side: Merchant Operations & Live Order Center */}
        <div
          className={`flex-1 h-[calc(100vh-5.5rem)] min-w-0 ${
            activeMobileView === 'chat' ? 'hidden lg:block' : 'block'
          }`}
        >
          <MerchantDashboard
            orders={orders}
            conversations={conversations}
            settings={settings}
            onUpdateOrderStatus={handleUpdateOrderStatus}
            onSimulatePayment={handleSimulatePayment}
            onUpdateSettings={handleUpdateSettings}
            onRefreshData={fetchData}
            isRefreshing={isRefreshing}
            selectedConversationPhone={currentPhone}
            onSelectConversationPhone={(phone) => setCurrentPhone(phone)}
            onTakeoverConversation={handleTakeoverConversation}
            lang={lang}
          />
        </div>
      </main>

      {/* Product Catalog Modal */}
      <CatalogModal
        isOpen={isCatalogOpen}
        onClose={() => setIsCatalogOpen(false)}
        products={products}
        currency={settings.currency}
        onUpdateStock={handleUpdateStock}
        lang={lang}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSave={handleUpdateSettings}
        lang={lang}
      />
    </div>
  );
};
