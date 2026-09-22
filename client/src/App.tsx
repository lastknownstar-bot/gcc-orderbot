import React, { useState, useEffect, useCallback } from 'react';
import { 
  Bot, 
  Settings as SettingsIcon, 
  Package, 
  Sparkles, 
  Smartphone, 
  LayoutDashboard, 
  Languages
} from 'lucide-react';
import { WhatsAppSimulator } from './components/WhatsAppSimulator';
import { MerchantDashboard } from './components/MerchantDashboard';
import { CatalogModal } from './components/CatalogModal';
import { SettingsModal } from './components/SettingsModal';
import { Order, Conversation, Product, MerchantSettings } from './types';
import { Language, translations } from './i18n';
import { apiUrl, getApiBaseUrl, setCustomApiBaseUrl, getSavedCustomApiBaseUrl } from './config';
import { AlertTriangle, Globe } from 'lucide-react';

export const App: React.FC = () => {
  const [lang, setLang] = useState<Language>('en'); // Default to English as requested
  const t = translations[lang];

  const [orders, setOrders] = useState<Order[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<MerchantSettings>({
    name: 'Al-Ameed Roastery & Sweets (العميد للحلويات والقهوة)',
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
    document.documentElement.lang = lang;
  }, [lang]);

  // Fetch all initial data
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

      if (!healthRes.ok) {
        throw new Error(`Server returned status ${healthRes.status}`);
      }

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
  const handleSendMessage = async (text: string) => {
    setIsLoadingMessage(true);
    try {
      const res = await fetch(apiUrl('/api/chat/simulate'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: currentPhone,
          name: currentCustomerName,
          text,
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

  // Update product stock
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
      console.error('Failed to update product:', err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {/* Top Application Header */}
      <header className="h-16 border-b border-slate-800 bg-slate-900/90 backdrop-blur px-4 sm:px-6 flex items-center justify-between z-30 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-amber-500 p-0.5 shadow-lg shadow-emerald-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <Bot className="w-5 h-5 text-emerald-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm sm:text-base tracking-tight text-white">
                GCC-Order<span className="text-emerald-400">Bot</span>
              </span>
              <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                {t.edition}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-none hidden sm:block">
              {t.subTitle}
            </p>
          </div>
        </div>

        {/* AI Engine Status & Quick Navigation Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Language Switcher Button */}
          <button
            onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
            className="px-3 py-1.5 bg-gradient-to-r from-emerald-700/80 to-teal-700/80 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl border border-emerald-500/40 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
            title="Toggle English / Arabic"
          >
            <Languages className="w-3.5 h-3.5 text-emerald-200" />
            <span>{lang === 'ar' ? 'English (EN)' : 'العربية (AR)'}</span>
          </button>

          {/* Gemini AI Status Badge */}
          <div
            className={`hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs border ${
              systemHealth.geminiActive
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
            }`}
            title={systemHealth.geminiActive ? 'Gemini 2.5 Flash Active' : 'Khaleeji AI Engine Active'}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>
              {systemHealth.geminiActive ? t.geminiActive : t.heuristicActive}
            </span>
          </div>

          {/* Currency Pill */}
          <div className="px-2.5 py-1 bg-slate-800 border border-slate-700 rounded-xl text-xs font-mono font-bold text-amber-400 flex items-center gap-1" dir="ltr">
            <span>{settings.currency}</span>
            <span className="text-[10px] text-slate-400">
              ({settings.currency === 'BHD' ? t.decimals : t.decimals2})
            </span>
          </div>

          {/* Product Catalog Button */}
          <button
            onClick={() => setIsCatalogOpen(true)}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Package className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">{t.catalogBtn}</span>
          </button>

          {/* Settings Button */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition-colors"
            title="Merchant Regional Settings"
          >
            <SettingsIcon className="w-4 h-4" />
          </button>

          {/* Mobile View Switcher */}
          <div className="flex lg:hidden bg-slate-800 p-0.5 rounded-xl border border-slate-700">
            <button
              onClick={() => setActiveMobileView('chat')}
              className={`p-1.5 rounded-lg text-xs ${
                activeMobileView === 'chat' ? 'bg-emerald-600 text-white' : 'text-slate-400'
              }`}
            >
              <Smartphone className="w-4 h-4" />
            </button>
            <button
              onClick={() => setActiveMobileView('dashboard')}
              className={`p-1.5 rounded-lg text-xs ${
                activeMobileView === 'dashboard' ? 'bg-emerald-600 text-white' : 'text-slate-400'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Vercel Cross-Domain Backend Connection Helper Banner */}
      {connectionError && (
        <div className="bg-amber-950/90 border-b border-amber-500/40 px-4 py-2.5 text-xs text-amber-200 flex flex-wrap items-center justify-between gap-3 z-30 shadow-md">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
            <span>
              <strong>Backend connection issue:</strong> If deploying on Vercel, connect your Render backend URL (e.g. <code>https://gcc-orderbot.onrender.com</code>):
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
