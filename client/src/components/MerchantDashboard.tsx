import React, { useState } from 'react';
import { 
  ShoppingBag, 
  Clock, 
  CheckCircle2, 
  Truck, 
  AlertCircle, 
  Search, 
  CreditCard, 
  RefreshCw, 
  ToggleLeft, 
  ToggleRight, 
  PhoneCall, 
  MapPin, 
  TrendingUp,
  Store,
  Layers,
  Printer,
  Gift,
  Cake,
  UserCheck,
  AlertTriangle,
  Sparkles,
  Headphones
} from 'lucide-react';
import { Order, Conversation, MerchantSettings } from '../types';
import { Language, translations } from '../i18n';
import { ReceiptModal } from './ReceiptModal';

interface MerchantDashboardProps {
  orders: Order[];
  conversations: Conversation[];
  settings: MerchantSettings;
  onUpdateOrderStatus: (orderId: string, status: Order['status']) => Promise<void>;
  onSimulatePayment: (orderId: string) => Promise<void>;
  onUpdateSettings: (newSettings: Partial<MerchantSettings>) => Promise<void>;
  onRefreshData: () => Promise<void>;
  isRefreshing: boolean;
  selectedConversationPhone: string;
  onSelectConversationPhone: (phone: string) => void;
  onTakeoverConversation?: (phone: string, resolve: boolean) => Promise<void>;
  lang?: Language;
}

export const MerchantDashboard: React.FC<MerchantDashboardProps> = ({
  orders,
  conversations,
  settings,
  onUpdateOrderStatus,
  onSimulatePayment,
  onUpdateSettings,
  onRefreshData,
  isRefreshing,
  selectedConversationPhone,
  onSelectConversationPhone,
  onTakeoverConversation,
  lang = 'ar',
}) => {
  const [activeTab, setActiveTab] = useState<'orders' | 'conversations' | 'integrations'>('orders');
  const [orderFilter, setOrderFilter] = useState<'ALL' | Order['status']>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReceiptOrder, setSelectedReceiptOrder] = useState<Order | null>(null);

  const t = translations[lang];

  // Calculate KPIs
  const totalRevenue = orders
    .filter((o) => o.status === 'PAID' || o.status === 'DISPATCHED')
    .reduce((sum, o) => sum + o.total, 0);

  const pendingOrders = orders.filter((o) => o.status === 'PENDING_PAYMENT').length;
  const paidOrders = orders.filter((o) => o.status === 'PAID').length;
  const dispatchedOrders = orders.filter((o) => o.status === 'DISPATCHED').length;
  const humanAttentionCount = conversations.filter((c) => c.needsHumanAttention).length;

  const filteredOrders = orders.filter((order) => {
    const matchesStatus = orderFilter === 'ALL' || order.status === orderFilter;
    const matchesSearch =
      order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customerPhone.includes(searchQuery);
    return matchesStatus && matchesSearch;
  });

  const activeConversation = conversations.find(
    (c) => c.customerPhone === selectedConversationPhone
  ) || conversations[0];

  const getStatusBadge = (status: Order['status']) => {
    switch (status) {
      case 'PENDING_PAYMENT':
        return (
          <span className="px-2.5 py-1 bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-semibold rounded-full flex items-center gap-1">
            <Clock className="w-3 h-3" /> {lang === 'ar' ? 'بانتظار الدفع' : 'Pending Payment'}
          </span>
        );
      case 'PAID':
        return (
          <span className="px-2.5 py-1 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold rounded-full flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> {lang === 'ar' ? 'مدفوع' : 'Paid'}
          </span>
        );
      case 'DISPATCHED':
        return (
          <span className="px-2.5 py-1 bg-sky-500/15 border border-sky-500/30 text-sky-400 text-xs font-semibold rounded-full flex items-center gap-1">
            <Truck className="w-3 h-3" /> {lang === 'ar' ? 'جاري التوصيل' : 'Dispatched'}
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="px-2.5 py-1 bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-semibold rounded-full flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> {lang === 'ar' ? 'ملغي' : 'Cancelled'}
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div 
      className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl"
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
    >
      {/* Top Bar */}
      <div className="bg-slate-950/80 px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-sm text-white flex items-center gap-2">
              <span>{settings.name}</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-amber-300 font-normal">
                Boutique Riffa
              </span>
            </h2>
            <p className="text-[11px] text-slate-400">
              {t.centerTitle}
            </p>
          </div>
        </div>

        <button
          onClick={onRefreshData}
          disabled={isRefreshing}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-xl flex items-center gap-1.5 transition-all border border-slate-700/60 active:scale-95 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
          <span>{t.refreshBtn}</span>
        </button>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 p-4 bg-slate-950/40 border-b border-slate-800">
        {/* KPI 1: Revenue */}
        <div className="bg-slate-900/90 border border-slate-800/80 p-3.5 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-400">{t.kpiRevenue}</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-white font-mono" dir="ltr">
            {totalRevenue.toFixed(settings.currency === 'BHD' ? 3 : 2)}{' '}
            <span className="text-xs text-amber-400 font-semibold">{settings.currency}</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">{t.kpiRevenueSub}</div>
        </div>

        {/* KPI 2: Active Conversations */}
        <div className="bg-slate-900/90 border border-slate-800/80 p-3.5 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-400">{t.kpiChats}</span>
            <PhoneCall className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-xl font-bold text-white font-mono flex items-center gap-2">
            <span>{conversations.length}</span>
            {humanAttentionCount > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-normal flex items-center gap-1 animate-pulse">
                <AlertTriangle className="w-3 h-3" /> {humanAttentionCount}
              </span>
            )}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">{t.kpiChatsSub}</div>
        </div>

        {/* KPI 3: Pending Orders */}
        <div className="bg-slate-900/90 border border-slate-800/80 p-3.5 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-400">{t.kpiPending}</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-bold text-amber-400 font-mono">{pendingOrders}</div>
          <div className="text-[10px] text-slate-400 mt-1">{t.kpiPendingSub}</div>
        </div>

        {/* KPI 4: Dispatched Orders */}
        <div className="bg-slate-900/90 border border-slate-800/80 p-3.5 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-400">{t.kpiDispatched}</span>
            <Truck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-emerald-400 font-mono">
            {paidOrders + dispatchedOrders}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">{t.kpiDispatchedSub}</div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-800 bg-slate-950/60 px-4 text-xs font-semibold gap-2">
        <button
          onClick={() => setActiveTab('orders')}
          className={`py-3 px-3.5 border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'orders'
              ? 'border-amber-400 text-amber-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          <span>{t.tabOrders}</span>
          <span className="px-1.5 py-0.2 bg-slate-800 text-[10px] text-slate-300 rounded-full">
            {orders.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('conversations')}
          className={`py-3 px-3.5 border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'conversations'
              ? 'border-emerald-400 text-emerald-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <PhoneCall className="w-3.5 h-3.5" />
          <span>{t.tabConversations}</span>
          {humanAttentionCount > 0 && (
            <span className="px-1.5 py-0.2 bg-rose-500 text-[10px] text-white rounded-full font-bold animate-pulse">
              {humanAttentionCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('integrations')}
          className={`py-3 px-3.5 border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'integrations'
              ? 'border-sky-400 text-sky-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>{t.tabIntegrations}</span>
        </button>
      </div>

      {/* Tab 1: Orders Table */}
      {activeTab === 'orders' && (
        <div className="flex-1 flex flex-col overflow-hidden p-4">
          {/* Filter and Search Bar */}
          <div className="flex flex-col sm:flex-row gap-2 mb-3 justify-between items-stretch sm:items-center">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 absolute left-2.5 rtl:left-auto rtl:right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.searchPlaceholder}
                className="w-full bg-slate-800/80 border border-slate-700 text-xs text-slate-100 pl-8 pr-3 rtl:pr-8 rtl:pl-3 py-1.5 rounded-xl focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex gap-1 overflow-x-auto text-[11px]">
              {(['ALL', 'PENDING_PAYMENT', 'PAID', 'DISPATCHED', 'CANCELLED'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setOrderFilter(st)}
                  className={`px-2.5 py-1 rounded-lg border transition-all ${
                    orderFilter === st
                      ? 'bg-amber-600 text-slate-950 font-bold border-amber-500 shadow-sm'
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                  }`}
                >
                  {st === 'ALL'
                    ? t.filterAll
                    : st === 'PENDING_PAYMENT'
                    ? t.filterPending
                    : st === 'PAID'
                    ? t.filterPaid
                    : st === 'DISPATCHED'
                    ? t.filterDispatched
                    : t.filterCancelled}
                </button>
              ))}
            </div>
          </div>

          {/* Table Container */}
          <div className="flex-1 overflow-y-auto border border-slate-800 rounded-2xl bg-slate-950/30">
            <table className={`w-full text-xs ${lang === 'ar' ? 'text-right' : 'text-left'}`}>
              <thead className="bg-slate-950/80 sticky top-0 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="p-3">{t.colOrder}</th>
                  <th className="p-3">{t.colCustomer}</th>
                  <th className="p-3">{t.colItems}</th>
                  <th className="p-3">{t.colAddress}</th>
                  <th className="p-3">{t.colTotal}</th>
                  <th className="p-3 text-center">{t.colStatus}</th>
                  <th className="p-3 text-center">{t.colActions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-slate-500 text-xs">
                      {t.noOrders}
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-3 font-mono font-bold text-white">
                        <div className="flex items-center gap-1.5">
                          <span>#{order.orderNumber}</span>
                          {order.isGift && (
                            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500/20 text-amber-300 font-bold flex items-center gap-0.5">
                              <Gift className="w-2.5 h-2.5" /> Gift
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 font-normal">
                          {new Date(order.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </td>

                      <td className="p-3">
                        <div className="font-semibold text-slate-200">{order.customerName}</div>
                        <div className="text-[11px] text-emerald-400 font-mono" dir="ltr">
                          {order.customerPhone}
                        </div>
                      </td>

                      <td className="p-3 max-w-xs">
                        <div className="space-y-0.5">
                          {order.items.map((item, idx) => (
                            <div key={idx} className="text-[11px] text-slate-300 truncate">
                              • <span className="font-bold text-amber-300">{item.quantity}x</span>{' '}
                              {lang === 'ar' ? item.productNameAr : (item.productNameEn || item.productNameAr)}
                            </div>
                          ))}
                          {order.chocolatePlaqueMessage && (
                            <div className="text-[10px] text-rose-300 bg-rose-500/10 px-1.5 py-0.5 rounded mt-1 truncate">
                              🎂 Plaque: "{order.chocolatePlaqueMessage}"
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="p-3 max-w-xs">
                        <div className="text-[11px] text-slate-300">
                          {order.deliveryAddress.area ? (
                            <>
                              <div className="font-semibold text-emerald-300 flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-rose-400 shrink-0" />
                                <span>{order.deliveryAddress.area}</span>
                              </div>
                              <div className="text-[10px] text-slate-400">
                                {lang === 'ar' ? 'مجمع' : 'Block'} {order.deliveryAddress.block || '—'} &bull; {lang === 'ar' ? 'طريق' : 'Road'}{' '}
                                {order.deliveryAddress.road || '—'} &bull; {lang === 'ar' ? 'مبنى' : 'Bldg'}{' '}
                                {order.deliveryAddress.building || '—'}
                              </div>
                            </>
                          ) : (
                            <span className="text-slate-500">{t.noAddressYet}</span>
                          )}
                        </div>
                      </td>

                      <td className="p-3 font-mono font-bold text-white" dir="ltr">
                        {order.total.toFixed(order.currency === 'BHD' ? 3 : 2)}{' '}
                        <span className="text-xs text-amber-400 font-normal">{order.currency}</span>
                        <div className="text-[10px] text-slate-400 font-normal">
                          {order.paymentMethod === 'APPLEPAY' ? ' Apple Pay' : order.paymentMethod}
                        </div>
                      </td>

                      <td className="p-3 text-center">
                        <div className="flex justify-center">{getStatusBadge(order.status)}</div>
                      </td>

                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setSelectedReceiptOrder(order)}
                            title={t.btnReceipt}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-lg transition-colors border border-slate-700"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>

                          {order.status === 'PENDING_PAYMENT' && (
                            <button
                              onClick={() => onSimulatePayment(order.id)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-semibold transition-all active:scale-95"
                            >
                              {t.btnSimulatePay}
                            </button>
                          )}

                          {order.status === 'PAID' && (
                            <button
                              onClick={() => onUpdateOrderStatus(order.id, 'DISPATCHED')}
                              className="px-2.5 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-[11px] font-semibold transition-all active:scale-95"
                            >
                              {t.btnDispatch}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Live Conversations & Cart Inspector */}
      {activeTab === 'conversations' && (
        <div className="flex-1 flex overflow-hidden p-4 gap-4">
          {/* Conversation List */}
          <div className="w-1/3 border border-slate-800 rounded-2xl bg-slate-950/40 p-3 overflow-y-auto space-y-2">
            <h3 className="text-xs font-bold text-slate-400 px-1 mb-2 flex items-center justify-between">
              <span>{t.activeChatsTitle} ({conversations.length})</span>
            </h3>
            {conversations.map((conv) => {
              const isSelected = conv.customerPhone === (activeConversation?.customerPhone);
              return (
                <div
                  key={conv.id}
                  onClick={() => onSelectConversationPhone(conv.customerPhone)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    conv.needsHumanAttention
                      ? 'border-rose-500/80 bg-rose-950/20'
                      : isSelected
                      ? 'bg-slate-800 border-amber-500/80 shadow-md'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-xs text-white flex items-center gap-1.5">
                      <span>{conv.customerName}</span>
                      {conv.needsHumanAttention && (
                        <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono" dir="ltr">
                      {new Date(conv.lastActive).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <div className="text-[11px] text-emerald-400 font-mono mt-0.5" dir="ltr">
                    {conv.customerPhone}
                  </div>
                  {conv.needsHumanAttention && (
                    <div className="text-[10px] text-rose-300 font-bold mt-1 flex items-center gap-1">
                      <Headphones className="w-3 h-3" /> {t.humanAttentionBadge}
                    </div>
                  )}
                  <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
                    <span>
                      {conv.cart.items.length > 0
                        ? `🛒 ${conv.cart.items.length} ${t.cartItemsCount}`
                        : (lang === 'ar' ? 'السلة فارغة' : 'Empty Cart')}
                    </span>
                    <span className="font-mono text-amber-300 font-bold" dir="ltr">
                      {conv.cart.total.toFixed(settings.currency === 'BHD' ? 3 : 2)}{' '}
                      {settings.currency}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Active Cart & Address Breakdown */}
          <div className="flex-1 border border-slate-800 rounded-2xl bg-slate-950/40 p-5 overflow-y-auto space-y-5">
            {activeConversation ? (
              <>
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      {t.inspectCartTitle} {activeConversation.customerName}
                    </h3>
                    <p className="text-xs text-slate-400 font-mono" dir="ltr">
                      {activeConversation.customerPhone}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {activeConversation.needsHumanAttention ? (
                      <button
                        onClick={() => onTakeoverConversation && onTakeoverConversation(activeConversation.customerPhone, true)}
                        className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-full flex items-center gap-1 shadow-lg shadow-rose-600/30"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>{t.btnResolve}</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => onTakeoverConversation && onTakeoverConversation(activeConversation.customerPhone, false)}
                        className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs rounded-full flex items-center gap-1"
                      >
                        <Headphones className="w-3.5 h-3.5 text-amber-400" />
                        <span>{t.btnTakeover}</span>
                      </button>
                    )}

                    <span className="px-3 py-1 bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold rounded-full">
                      {t.aiConnectedBadge}
                    </span>
                  </div>
                </div>

                {/* Cart Table */}
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <ShoppingBag className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{t.currentCartTitle}</span>
                  </h4>
                  {activeConversation.cart.items.length === 0 ? (
                    <div className="p-6 bg-slate-900/60 rounded-xl text-center text-slate-500 text-xs border border-slate-800/80">
                      {t.emptyCartMsg}
                    </div>
                  ) : (
                    <div className="border border-slate-800 rounded-xl overflow-hidden">
                      <table className={`w-full text-xs ${lang === 'ar' ? 'text-right' : 'text-left'}`}>
                        <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                          <tr>
                            <th className="p-2.5">{t.colProduct}</th>
                            <th className="p-2.5 text-center">{t.colQty}</th>
                            <th className="p-2.5">{t.colUnitPrice}</th>
                            <th className="p-2.5">{t.colSubtotal}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                          {activeConversation.cart.items.map((item, i) => (
                            <tr key={i} className="hover:bg-slate-800/20">
                              <td className="p-2.5 font-medium text-white">
                                {lang === 'ar' ? item.productNameAr : (item.productNameEn || item.productNameAr)}
                              </td>
                              <td className="p-2.5 text-center font-bold text-amber-300 font-mono">
                                {item.quantity}
                              </td>
                              <td className="p-2.5 font-mono text-slate-300" dir="ltr">
                                {item.unitPrice.toFixed(settings.currency === 'BHD' ? 3 : 2)}{' '}
                                {settings.currency}
                              </td>
                              <td className="p-2.5 font-mono font-bold text-emerald-400" dir="ltr">
                                {item.totalPrice.toFixed(settings.currency === 'BHD' ? 3 : 2)}{' '}
                                {settings.currency}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="bg-slate-900/90 p-3 border-t border-slate-800 flex justify-between items-center text-xs">
                        <span className="text-slate-400" dir="ltr">
                          {t.deliveryFeeLabel} {settings.deliveryFee.toFixed(settings.currency === 'BHD' ? 3 : 2)} {settings.currency}
                        </span>
                        <div className="text-sm font-bold text-white font-mono" dir="ltr">
                          {t.totalLabel} {activeConversation.cart.total.toFixed(settings.currency === 'BHD' ? 3 : 2)} {settings.currency}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Address Extraction Inspector */}
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-rose-400" />
                    <span>{t.extractedAddressTitle}</span>
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-900/60 p-3 rounded-xl border border-slate-800 text-xs">
                    <div>
                      <span className="text-slate-500 block text-[10px]">{t.areaLabel}</span>
                      <span className="font-semibold text-white">
                        {activeConversation.address?.area || '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">{t.blockLabel}</span>
                      <span className="font-semibold text-white">
                        {activeConversation.address?.block || '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">{t.roadLabel}</span>
                      <span className="font-semibold text-white">
                        {activeConversation.address?.road || '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">{t.bldgLabel}</span>
                      <span className="font-semibold text-white">
                        {activeConversation.address?.building || '—'}
                      </span>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                {t.selectChatPrompt}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Regional Payment Gateways */}
      {activeTab === 'integrations' && (
        <div className="flex-1 p-5 overflow-y-auto space-y-4">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white">{t.gatewaysTitle}</h3>
            <p className="text-xs text-slate-400">{t.gatewaysDesc}</p>
          </div>

          <div className="space-y-3 max-w-3xl">
            {/* BenefitPay */}
            <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800 flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-sm text-white">{t.bpTitle}</h4>
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-red-500/20 text-red-400 font-semibold">
                    {t.bpBadge}
                  </span>
                </div>
                <p className="text-xs text-slate-400">{t.bpDesc}</p>
              </div>
              <button
                onClick={() =>
                  onUpdateSettings({
                    gateways: { ...settings.gateways, benefitPay: !settings.gateways.benefitPay },
                  })
                }
                className="text-2xl text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                {settings.gateways.benefitPay ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8 text-slate-600" />}
              </button>
            </div>

            {/* Apple Pay */}
            <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800 flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-sm text-white">{t.applePayTitle}</h4>
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-white/20 text-white font-semibold">
                    {t.applePayBadge}
                  </span>
                </div>
                <p className="text-xs text-slate-400">{t.applePayDesc}</p>
              </div>
              <button
                onClick={() =>
                  onUpdateSettings({
                    gateways: { ...settings.gateways, applePay: !settings.gateways.applePay },
                  })
                }
                className="text-2xl text-white hover:text-slate-200 transition-colors"
              >
                {settings.gateways.applePay !== false ? <ToggleRight className="w-8 h-8 text-white" /> : <ToggleLeft className="w-8 h-8 text-slate-600" />}
              </button>
            </div>

            {/* Tap Payments */}
            <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800 flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-sm text-white">{t.tapTitle}</h4>
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-sky-500/20 text-sky-400 font-semibold">
                    {t.tapBadge}
                  </span>
                </div>
                <p className="text-xs text-slate-400">{t.tapDesc}</p>
              </div>
              <button
                onClick={() =>
                  onUpdateSettings({
                    gateways: { ...settings.gateways, tap: !settings.gateways.tap },
                  })
                }
                className="text-2xl text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                {settings.gateways.tap ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8 text-slate-600" />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Official Receipt Modal */}
      <ReceiptModal
        order={selectedReceiptOrder}
        isOpen={!!selectedReceiptOrder}
        onClose={() => setSelectedReceiptOrder(null)}
        lang={lang}
      />
    </div>
  );
};
