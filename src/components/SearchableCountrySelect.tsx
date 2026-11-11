import React, { useState, useRef, useEffect } from 'react';
import { ALL_COUNTRIES, CountryInfo } from '../data/internationalData';
import { Search, ChevronDown, Check, Globe } from 'lucide-react';

interface SearchableCountrySelectProps {
  value: string; // Country name or code
  onChange: (country: CountryInfo) => void;
  label?: string;
  className?: string;
}

export const SearchableCountrySelect: React.FC<SearchableCountrySelectProps> = ({
  value,
  onChange,
  label = 'Country of Residence',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Find currently selected country
  const selectedCountry =
    ALL_COUNTRIES.find(
      (c) => c.name.toLowerCase() === value.toLowerCase() || c.code.toLowerCase() === value.toLowerCase()
    ) || ALL_COUNTRIES[0];

  const filteredCountries = ALL_COUNTRIES.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      c.defaultCurrency.toLowerCase().includes(search.toLowerCase())
  );

  // Close when clicked outside
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
        <span className="flex items-center gap-2 truncate">
          <span className="text-base leading-none">{selectedCountry.flag}</span>
          <span className="font-medium text-slate-800 truncate">{selectedCountry.name}</span>
          <span className="text-[11px] text-slate-400 font-mono">({selectedCountry.code})</span>
        </span>
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
              placeholder="Search country name or code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-xs bg-transparent border-none focus:outline-none placeholder-slate-400 text-slate-800"
            />
          </div>

          {/* List of Countries */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
            {filteredCountries.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                No country found matching "{search}"
              </div>
            ) : (
              filteredCountries.map((c) => {
                const isSelected = selectedCountry.code === c.code;
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
                      <span className="text-sm shrink-0">{c.flag}</span>
                      <span className="truncate">{c.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono shrink-0">({c.code})</span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span className="text-[10px] text-slate-400 font-mono bg-slate-100 px-1.5 py-0.5 rounded">
                        {c.defaultCurrency}
                      </span>
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
