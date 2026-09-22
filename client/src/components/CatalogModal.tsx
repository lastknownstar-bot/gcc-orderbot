import React, { useState } from 'react';
import { X, Package } from 'lucide-react';
import { Product } from '../types';
import { Language, translations } from '../i18n';

interface CatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  currency: string;
  onUpdateStock: (productId: string, newStock: number) => Promise<void>;
  lang?: Language;
}

export const CatalogModal: React.FC<CatalogModalProps> = ({
  isOpen,
  onClose,
  products,
  currency,
  onUpdateStock,
  lang = 'ar',
}) => {
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const t = translations[lang];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div 
        className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
        dir={lang === 'ar' ? 'rtl' : 'ltr'}
      >
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-sm text-white">{t.catalogTitle}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {products.map((p) => {
            const price =
              currency === 'BHD'
                ? `${p.price_bhd.toFixed(3)} BHD`
                : currency === 'SAR'
                ? `${p.price_sar.toFixed(2)} SAR`
                : `${p.price_aed.toFixed(2)} AED`;

            return (
              <div
                key={p.id}
                className="p-3 bg-slate-950/60 border border-slate-800 rounded-2xl flex items-center gap-3.5 hover:border-slate-700 transition-colors"
              >
                <img
                  src={p.image}
                  alt={p.name_en}
                  className="w-14 h-14 object-cover rounded-xl border border-slate-700 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-xs text-white truncate">
                      {lang === 'ar' ? p.name_ar : p.name_en}
                    </h4>
                    <span className="font-mono text-xs text-amber-400 font-bold shrink-0" dir="ltr">{price}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate">
                    {lang === 'ar' ? p.name_en : p.name_ar}
                  </p>
                  <div className="text-[10px] text-slate-500 mt-1">
                    {t.keywordsLabel} {p.keywords.join(', ')}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className={lang === 'ar' ? 'text-right' : 'text-left'}>
                    <div className="text-[10px] text-slate-400">{t.stockAvailable}</div>
                    <div className="text-xs font-mono font-bold text-white" dir="ltr">{p.stock} {t.unitPcs}</div>
                  </div>
                  <button
                    onClick={async () => {
                      setUpdatingId(p.id);
                      await onUpdateStock(p.id, p.stock > 0 ? 0 : 25);
                      setUpdatingId(null);
                    }}
                    disabled={updatingId === p.id}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition-all ${
                      p.stock > 0
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-rose-500/10 hover:border-rose-500/30 hover:text-rose-400'
                        : 'bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-emerald-500/10 hover:border-emerald-500/30 hover:text-emerald-400'
                    }`}
                  >
                    {p.stock > 0 ? t.statusInStock : t.statusOutOfStock}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
