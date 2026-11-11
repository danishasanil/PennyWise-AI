import React, { useState, useRef, useEffect } from 'react';
import { ALL_CURRENCIES, CurrencyInfo } from '../data/internationalData';
import { Search, ChevronDown, Check, DollarSign } from 'lucide-react';

interface SearchableCurrencySelectProps {
  value: string; // ISO 4217 code
  onChange: (currency: CurrencyInfo) => void;
  label?: string;
  className?: string;
}

export const SearchableCurrencySelect: React.FC<SearchableCurrencySelectProps> = ({
  value,
  onChange,
  label = 'Preferred Currency',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedCurrency =
    ALL_CURRENCIES.find((c) => c.code.toUpperCase() === value.toUpperCase()) ||
    ALL_CURRENCIES[0];

  const filteredCurrencies = ALL_CURRENCIES.filter(
    (c) =>
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.symbol.toLowerCase().includes(search.toLowerCase())
  );

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-xs font-semibold text-slate-700 mb-1">
          {label}
        </label>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          setSearch('');
        }}
        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white hover:bg-slate-50/70 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 flex items-center justify-between text-left transition-colors"
      >
        <div className="flex items-center gap-2 truncate">
          <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded text-xs shrink-0">
            {selectedCurrency.code}
          </span>
          <span className="font-medium text-slate-800 truncate">{selectedCurrency.name}</span>
          <span className="text-xs text-slate-400 shrink-0 font-mono">({selectedCurrency.symbol})</span>
        </div>
        <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1 max-h-64 bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden flex flex-col animate-in fade-in duration-100">
          {/* Search Input */}
          <div className="p-2 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
            <input
              type="text"
              autoFocus
              placeholder="Search code or currency name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-xs bg-transparent border-none focus:outline-none placeholder-slate-400 text-slate-800"
            />
          </div>

          {/* List of Currencies */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
            {filteredCurrencies.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                No currency found matching "{search}"
              </div>
            ) : (
              filteredCurrencies.map((c) => {
                const isSelected = selectedCurrency.code === c.code;
                return (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => {
                      onChange(c);
                      setIsOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-xs flex items-center justify-between text-left hover:bg-slate-50 transition-colors ${
                      isSelected ? 'bg-emerald-50/60 font-semibold text-emerald-950' : 'text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="font-mono font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded text-[11px] shrink-0">
                        {c.code}
                      </span>
                      <span className="truncate">{c.name}</span>
                      <span className="text-slate-400 font-mono shrink-0">({c.symbol})</span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      {c.paypalSupported ? (
                        <span className="text-[10px] text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded font-medium">
                          PayPal Ready
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                          Converted for PayPal
                        </span>
                      )}
                      {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
