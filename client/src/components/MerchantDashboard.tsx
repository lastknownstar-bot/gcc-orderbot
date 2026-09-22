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
  Layers
} from 'lucide-react';
import { Order, Conversation, MerchantSettings } from '../types';
import { Language, translations } from '../i18n';

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
  lang = 'ar',
}) => {
  const [activeTab, setActiveTab] = useState<'orders' | 'conversations' | 'integrations'>('orders');
  const [orderFilter, setOrderFilter] = useState<'ALL' | Order['status']>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const t = translations[lang];

  // Calculate KPIs
  const totalRevenue = orders
    .filter((o) => o.status === 'PAID' || o.status === 'DISPATCHED')
    .reduce((sum, o) => sum + o.total, 0);

  const pendingOrders = orders.filter((o) => o.status === 'PENDING_PAYMENT').length;
  const paidOrders = orders.filter((o) => o.status === 'PAID').length;
  const dispatchedOrders = orders.filter((o) => o.status === 'DISPATCHED').length;

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
            <Clock className="w-3 h-3" /> {lang === 'ar' ? 'بانتظار الدفع (Pending)' : 'Pending Payment'}
          </span>
        );
      case 'PAID':
        return (
          <span className="px-2.5 py-1 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold rounded-full flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> {lang === 'ar' ? 'مدفوع (Paid)' : 'Paid'}
          </span>
        );
      case 'DISPATCHED':
        return (
          <span className="px-2.5 py-1 bg-sky-500/15 border border-sky-500/30 text-sky-400 text-xs font-semibold rounded-full flex items-center gap-1">
            <Truck className="w-3 h-3" /> {lang === 'ar' ? 'جاري التوصيل (Dispatched)' : 'Dispatched'}
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="px-2.5 py-1 bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-semibold rounded-full flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> {lang === 'ar' ? 'ملغي (Cancelled)' : 'Cancelled'}
          </span>
        );
    }
  };

  return (
    <div 
      className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl"
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
    >
      {/* Merchant Top Bar */}
      <div className="bg-slate-950/80 backdrop-blur border-b border-slate-800 p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-amber-500 to-amber-700 rounded-2xl shadow-lg shadow-amber-500/20 text-slate-950 font-bold">
            <Store className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-white leading-tight">{settings.name}</h1>
              <span className="px-2 py-0.5 text-[10px] bg-slate-800 text-amber-400 rounded-md font-mono border border-slate-700" dir="ltr">
                {settings.currency} &bull; {settings.country === 'BH' ? 'Bahrain 🇧🇭' : settings.country === 'SA' ? 'Saudi Arabia 🇸🇦' : 'UAE 🇦🇪'}
              </span>
            </div>
            <p className="text-xs text-slate-400">{t.centerTitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onRefreshData()}
            disabled={isRefreshing}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 transition-all flex items-center gap-1 text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{t.refreshBtn}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-slate-950/40 border-b border-slate-800/80">
        <div className="bg-slate-800/60 border border-slate-700/60 p-3 rounded-2xl">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>{t.kpiRevenue}</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-extrabold text-white font-mono mt-1" dir="ltr">
            {totalRevenue.toFixed(settings.currency === 'BHD' ? 3 : 2)}{' '}
            <span className="text-xs font-normal text-amber-400">{settings.currency}</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">{t.kpiRevenueSub}</div>
        </div>

        <div className="bg-slate-800/60 border border-slate-700/60 p-3 rounded-2xl">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>{t.kpiChats}</span>
            <PhoneCall className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-xl font-extrabold text-white font-mono mt-1" dir="ltr">
            {conversations.length}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">{t.kpiChatsSub}</div>
        </div>

        <div className="bg-slate-800/60 border border-slate-700/60 p-3 rounded-2xl">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>{t.kpiPending}</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-extrabold text-amber-400 font-mono mt-1" dir="ltr">
            {pendingOrders}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">{t.kpiPendingSub}</div>
        </div>

        <div className="bg-slate-800/60 border border-slate-700/60 p-3 rounded-2xl">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>{t.kpiDispatched}</span>
            <Truck className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-xl font-extrabold text-purple-400 font-mono mt-1" dir="ltr">
            {paidOrders + dispatchedOrders}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">{t.kpiDispatchedSub}</div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-800 px-4 bg-slate-900/50">
        <button
          onClick={() => setActiveTab('orders')}
          className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'orders'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          <span>{t.tabOrders}</span>
          <span className="ml-1 px-1.5 py-0.2 bg-slate-800 rounded-full text-[10px]">
            {orders.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('conversations')}
          className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'conversations'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>{t.tabConversations}</span>
          <span className="ml-1 px-1.5 py-0.2 bg-slate-800 rounded-full text-[10px]">
            {conversations.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('integrations')}
          className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'integrations'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>{t.tabIntegrations}</span>
        </button>
      </div>

      {/* Tab 1: Orders Table & Quick Status Changer */}
      {activeTab === 'orders' && (
        <div className="flex-1 flex flex-col p-4 overflow-hidden">
          {/* Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search className={`w-3.5 h-3.5 text-slate-400 absolute top-2.5 ${lang === 'ar' ? 'left-3' : 'left-3'}`} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.searchPlaceholder}
                className="w-full bg-slate-800/80 border border-slate-700 text-xs text-slate-100 pl-8 pr-3 py-1.5 rounded-xl focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex gap-1 overflow-x-auto text-[11px]">
              {(['ALL', 'PENDING_PAYMENT', 'PAID', 'DISPATCHED', 'CANCELLED'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setOrderFilter(st)}
                  className={`px-2.5 py-1 rounded-lg border transition-all ${
                    orderFilter === st
                      ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
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
                        #{order.orderNumber}
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
                          {order.paymentMethod}
                        </div>
                      </td>

                      <td className="p-3 text-center">
                        <div className="flex justify-center">{getStatusBadge(order.status)}</div>
                      </td>

                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {order.status === 'PENDING_PAYMENT' && (
                            <button
                              onClick={() => onSimulatePayment(order.id)}
                              className="px-2.5 py-1 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 text-white text-[11px] font-semibold rounded-lg shadow-sm flex items-center gap-1 transition-all active:scale-95"
                              title="Simulate customer completing BenefitPay payment"
                            >
                              <CreditCard className="w-3 h-3" />
                              <span>{t.btnSimulatePay}</span>
                            </button>
                          )}

                          {order.status === 'PAID' && (
                            <button
                              onClick={() => onUpdateOrderStatus(order.id, 'DISPATCHED')}
                              className="px-2.5 py-1 bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-semibold rounded-lg shadow-sm flex items-center gap-1 transition-all active:scale-95"
                              title="Mark as dispatched & notify on WhatsApp"
                            >
                              <Truck className="w-3 h-3" />
                              <span>{t.btnDispatch}</span>
                            </button>
                          )}

                          <select
                            value={order.status}
                            onChange={(e) =>
                              onUpdateOrderStatus(order.id, e.target.value as Order['status'])
                            }
                            className="bg-slate-800 border border-slate-700 text-slate-300 text-[10px] rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          >
                            <option value="PENDING_PAYMENT">{t.filterPending}</option>
                            <option value="PAID">{t.filterPaid}</option>
                            <option value="DISPATCHED">{t.filterDispatched}</option>
                            <option value="CANCELLED">{t.filterCancelled}</option>
                          </select>
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

      {/* Tab 2: Live WhatsApp Conversations & Cart State Inspector */}
      {activeTab === 'conversations' && (
        <div className="flex-1 flex overflow-hidden p-4 gap-4">
          {/* Conversation List */}
          <div className="w-1/3 border border-slate-800 rounded-2xl bg-slate-950/40 p-3 overflow-y-auto space-y-2">
            <h3 className="text-xs font-bold text-slate-400 px-1 mb-2">
              {t.activeChatsTitle} ({conversations.length})
            </h3>
            {conversations.map((conv) => {
              const isSelected = conv.customerPhone === (activeConversation?.customerPhone);
              return (
                <div
                  key={conv.id}
                  onClick={() => onSelectConversationPhone(conv.customerPhone)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-slate-800 border-emerald-500/80 shadow-md'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-xs text-white">{conv.customerName}</div>
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
                  <span className="px-3 py-1 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold rounded-full">
                    {t.aiConnectedBadge}
                  </span>
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

                {/* Extracted Delivery Address */}
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-rose-400" />
                    <span>{t.extractedAddressTitle}</span>
                  </h4>
                  <div className="bg-slate-900/70 border border-slate-800 p-4 rounded-xl space-y-3">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                      <div className="bg-slate-800/50 p-2.5 rounded-lg border border-slate-700/50">
                        <div className="text-[10px] text-slate-400">{t.areaLabel}</div>
                        <div className="font-bold text-emerald-300">
                          {activeConversation.address.area || '—'}
                        </div>
                      </div>
                      <div className="bg-slate-800/50 p-2.5 rounded-lg border border-slate-700/50">
                        <div className="text-[10px] text-slate-400">{t.blockLabel}</div>
                        <div className="font-bold text-white font-mono">
                          {activeConversation.address.block || '—'}
                        </div>
                      </div>
                      <div className="bg-slate-800/50 p-2.5 rounded-lg border border-slate-700/50">
                        <div className="text-[10px] text-slate-400">{t.roadLabel}</div>
                        <div className="font-bold text-white font-mono">
                          {activeConversation.address.road || '—'}
                        </div>
                      </div>
                      <div className="bg-slate-800/50 p-2.5 rounded-lg border border-slate-700/50">
                        <div className="text-[10px] text-slate-400">{t.bldgLabel}</div>
                        <div className="font-bold text-white font-mono">
                          {activeConversation.address.building || '—'}
                        </div>
                      </div>
                    </div>

                    {activeConversation.address.rawText && (
                      <div className="text-[11px] text-slate-400 bg-slate-950 p-2.5 rounded-lg border border-slate-800/80 font-mono">
                        <span className="text-amber-400">{t.rawTextLabel}</span> "
                        {activeConversation.address.rawText}"
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-20 text-slate-500 text-xs">
                {t.selectChatPrompt}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Regional Payment Gateways & Integrations */}
      {activeTab === 'integrations' && (
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="max-w-3xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-400" />
              <span>{t.gatewaysTitle}</span>
            </h3>
            <p className="text-xs text-slate-400">
              {t.gatewaysDesc}
            </p>

            <div className="space-y-3">
              {/* BenefitPay Bahrain */}
              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-red-600 rounded-xl flex items-center justify-center font-black text-white text-xs shadow-md">
                    BP
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-2">
                      {t.bpTitle}
                      <span className="px-2 py-0.2 bg-red-500/20 text-red-400 text-[10px] rounded-md font-semibold">
                        {t.bpBadge}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {t.bpDesc}
                    </p>
                    <div className="text-[10px] text-slate-500 font-mono mt-1" dir="ltr">
                      IBAN: {settings.benefitPayIban} &bull; Merchant: {settings.benefitPayMerchantId}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() =>
                    onUpdateSettings({
                      gateways: { ...settings.gateways, benefitPay: !settings.gateways.benefitPay },
                    })
                  }
                  className="text-2xl transition-colors"
                >
                  {settings.gateways.benefitPay ? (
                    <ToggleRight className="w-9 h-9 text-emerald-500" />
                  ) : (
                    <ToggleLeft className="w-9 h-9 text-slate-600" />
                  )}
                </button>
              </div>

              {/* Tap Payments GCC */}
              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center font-bold text-white text-xs shadow-md">
                    TAP
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-2">
                      {t.tapTitle}
                      <span className="px-2 py-0.2 bg-emerald-500/20 text-emerald-400 text-[10px] rounded-md font-semibold">
                        {t.tapBadge}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {t.tapDesc}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() =>
                    onUpdateSettings({
                      gateways: { ...settings.gateways, tap: !settings.gateways.tap },
                    })
                  }
                  className="text-2xl transition-colors"
                >
                  {settings.gateways.tap ? (
                    <ToggleRight className="w-9 h-9 text-emerald-500" />
                  ) : (
                    <ToggleLeft className="w-9 h-9 text-slate-600" />
                  )}
                </button>
              </div>

              {/* Shopify Sync Toggle */}
              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-[#95BF47] rounded-xl flex items-center justify-center font-bold text-slate-900 text-xs shadow-md">
                    Shopify
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-2">
                      {t.shopifyTitle}
                      <span className="px-2 py-0.2 bg-lime-500/20 text-lime-400 text-[10px] rounded-md font-semibold">
                        {t.shopifyBadge}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {t.shopifyDesc}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() =>
                    onUpdateSettings({
                      gateways: { ...settings.gateways, shopifySync: !settings.gateways.shopifySync },
                    })
                  }
                  className="text-2xl transition-colors"
                >
                  {settings.gateways.shopifySync ? (
                    <ToggleRight className="w-9 h-9 text-emerald-500" />
                  ) : (
                    <ToggleLeft className="w-9 h-9 text-slate-600" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
