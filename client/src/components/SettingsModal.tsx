import React, { useState } from 'react';
import { X, Settings, Check, Globe } from 'lucide-react';
import { MerchantSettings } from '../types';
import { Language, translations } from '../i18n';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: MerchantSettings;
  onSave: (updated: Partial<MerchantSettings>) => Promise<void>;
  lang?: Language;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSave,
  lang = 'ar',
}) => {
  const [formData, setFormData] = useState({
    name: settings.name,
    country: settings.country,
    currency: settings.currency,
    deliveryFee: settings.deliveryFee,
    benefitPayIban: settings.benefitPayIban,
  });
  const [isSaving, setIsSaving] = useState(false);
  const t = translations[lang];

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    await onSave(formData);
    setIsSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div 
        className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl overflow-hidden shadow-2xl"
        dir={lang === 'ar' ? 'rtl' : 'ltr'}
      >
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-sm text-white">{t.settingsTitle}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              {t.storeNameLabel}
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 text-xs text-white p-2.5 rounded-xl focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {t.defaultCountryLabel}
              </label>
              <select
                value={formData.country}
                onChange={(e) => {
                  const country = e.target.value as 'BH' | 'SA' | 'AE';
                  const currency = country === 'BH' ? 'BHD' : country === 'SA' ? 'SAR' : 'AED';
                  const deliveryFee = country === 'BH' ? 1.000 : 15.0;
                  setFormData({ ...formData, country, currency, deliveryFee });
                }}
                className="w-full bg-slate-800 border border-slate-700 text-xs text-white p-2.5 rounded-xl focus:outline-none focus:border-emerald-500"
              >
                <option value="BH">{t.countryBH}</option>
                <option value="SA">{t.countrySA}</option>
                <option value="AE">{t.countryAE}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {t.currencyLabel}
              </label>
              <select
                value={formData.currency}
                onChange={(e) =>
                  setFormData({ ...formData, currency: e.target.value as 'BHD' | 'SAR' | 'AED' })
                }
                className="w-full bg-slate-800 border border-slate-700 text-xs text-white p-2.5 rounded-xl focus:outline-none focus:border-emerald-500 font-mono"
              >
                <option value="BHD">{t.currBHD}</option>
                <option value="SAR">{t.currSAR}</option>
                <option value="AED">{t.currAED}</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {t.deliveryFeeInputLabel}
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.deliveryFee}
                onChange={(e) =>
                  setFormData({ ...formData, deliveryFee: parseFloat(e.target.value) || 0 })
                }
                className="w-full bg-slate-800 border border-slate-700 text-xs text-white p-2.5 rounded-xl focus:outline-none focus:border-emerald-500 font-mono"
                dir="ltr"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {t.benefitPayIbanLabel}
              </label>
              <input
                type="text"
                value={formData.benefitPayIban}
                onChange={(e) => setFormData({ ...formData, benefitPayIban: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 text-xs text-white p-2.5 rounded-xl focus:outline-none focus:border-emerald-500 font-mono"
                dir="ltr"
              />
            </div>
          </div>

          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
            <div className="text-amber-400 font-semibold flex items-center gap-1">
              <Globe className="w-3.5 h-3.5" /> {t.metaWebhookTitle}
            </div>
            <div>{t.webhookUrlLabel} <code className="text-slate-300 font-mono" dir="ltr">http://localhost:5000/api/webhook/whatsapp</code></div>
            <div>{t.verifyTokenLabel} <code className="text-emerald-400 font-mono" dir="ltr">gcc_orderbot_secret_token_2026</code></div>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs text-slate-400 hover:text-white rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors"
            >
              {t.cancelBtn}
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-lg transition-all flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>{t.saveBtn}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
