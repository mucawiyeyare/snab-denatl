import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, Check, X, Loader2 } from 'lucide-react';

/**
 * Modern, accessible, high-performance Searchable Select dropdown.
 * Supports:
 * - Static in-memory option lists (with instant fuzzy/substring search)
 * - Dynamic server-side async search (with 250ms debouncing & loading spinner)
 * - Rich items with labels, sublabels (e.g. phone/ID), and badges (e.g. prices)
 * - Smooth keyboard navigation (ArrowUp, ArrowDown, Enter, Escape)
 * - Click-outside dismissal and mobile responsiveness
 */
const SearchableSelect = ({
  value,
  onChange,
  options = [],
  onSearch = null,
  placeholder = 'Select or search...',
  searchPlaceholder = 'Type to search...',
  label = '',
  required = false,
  disabled = false,
  error = '',
  icon: Icon = null,
  emptyMessage = 'No matching results found',
  clearable = true,
  className = '',
  renderOption = null,
  renderSelected = null
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [asyncOptions, setAsyncOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  // Active options pool: either from dynamic search or static props
  const displayOptions = onSearch
    ? (searchTerm.trim() ? asyncOptions : (options.length > 0 ? options : asyncOptions))
    : options.filter(opt => {
        if (!searchTerm.trim()) return true;
        const q = searchTerm.toLowerCase();
        const labelMatch = (opt.label || '').toLowerCase().includes(q);
        const sublabelMatch = (opt.sublabel || '').toLowerCase().includes(q);
        const searchKeywordsMatch = (opt.searchKeywords || '').toLowerCase().includes(q);
        return labelMatch || sublabelMatch || searchKeywordsMatch;
      });

  // Find currently selected option
  const selectedOption = (onSearch ? [...options, ...asyncOptions] : options).find(
    opt => String(opt.value) === String(value)
  );

  // Handle Async Search with 250ms debounce
  useEffect(() => {
    if (!onSearch || !isOpen) return;

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    setLoading(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const results = await onSearch(searchTerm);
        setAsyncOptions(results || []);
        setHighlightedIndex(0);
      } catch (err) {
        console.error('SearchableSelect async search error:', err);
        setAsyncOptions([]);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchTerm, isOpen, onSearch]);

  // Initial fetch for onSearch if options is empty
  useEffect(() => {
    if (onSearch && isOpen && asyncOptions.length === 0 && !searchTerm) {
      setLoading(true);
      onSearch('')
        .then(res => setAsyncOptions(res || []))
        .catch(() => setAsyncOptions([]))
        .finally(() => setLoading(false));
    }
  }, [isOpen, onSearch]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Auto-focus search input when opened
      setTimeout(() => inputRef.current?.focus(), 50);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => (prev < displayOptions.length - 1 ? prev + 1 : prev));
        scrollHighlightedIntoView(highlightedIndex + 1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => (prev > 0 ? prev - 1 : 0));
        scrollHighlightedIntoView(highlightedIndex - 1);
        break;
      case 'Enter':
        e.preventDefault();
        if (displayOptions[highlightedIndex]) {
          handleSelect(displayOptions[highlightedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSearchTerm('');
        break;
      case 'Tab':
        setIsOpen(false);
        setSearchTerm('');
        break;
      default:
        break;
    }
  };

  const scrollHighlightedIntoView = (index) => {
    if (!listRef.current) return;
    const items = listRef.current.children;
    if (items && items[index]) {
      items[index].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  };

  const handleSelect = (option) => {
    onChange(option.value, option.raw || option);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange('', null);
    setSearchTerm('');
  };

  return (
    <div className={`relative ${className}`} ref={containerRef} onKeyDown={handleKeyDown}>
      {label && (
        <label className="block text-xs font-bold text-slate-700 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      {/* Main Select Button Box */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            setIsOpen(!isOpen);
            if (!isOpen) setSearchTerm('');
          }
        }}
        className={`w-full px-3 py-2.5 bg-white border rounded-xl flex items-center justify-between text-left transition text-xs shadow-2xs ${
          disabled ? 'bg-slate-100 cursor-not-allowed opacity-60' : 'cursor-pointer hover:border-slate-400'
        } ${
          isOpen ? 'border-primary-500 ring-2 ring-primary-100' : error ? 'border-red-400' : 'border-slate-200'
        }`}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0 pr-1">
          {Icon && (
            <Icon className={`w-4 h-4 shrink-0 ${selectedOption ? 'text-primary-600' : 'text-slate-400'}`} />
          )}

          {renderSelected && selectedOption ? (
            renderSelected(selectedOption)
          ) : selectedOption ? (
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="font-semibold text-slate-800 truncate">{selectedOption.label}</span>
              {selectedOption.sublabel && (
                <span className="text-[11px] text-slate-400 truncate hidden sm:inline">
                  • {selectedOption.sublabel}
                </span>
              )}
              {selectedOption.badge && (
                <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono">
                  {selectedOption.badge}
                </span>
              )}
            </div>
          ) : (
            <span className="text-slate-400 truncate">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0 ml-1">
          {clearable && selectedOption && !disabled && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-md transition"
              title="Clear selection"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180 text-primary-600' : ''}`} />
        </div>
      </button>

      {error && <p className="mt-1 text-[11px] text-red-500">{error}</p>}

      {/* Floating Dropdown Popover */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden text-xs animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Search Input Bar */}
          <div className="p-2 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
            <Search className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setHighlightedIndex(0);
              }}
              placeholder={searchPlaceholder}
              className="w-full bg-transparent border-none outline-none text-xs text-slate-800 placeholder:text-slate-400 font-medium"
            />
            {loading && <Loader2 className="w-3.5 h-3.5 text-primary-600 animate-spin shrink-0" />}
            {searchTerm && !loading && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="p-1 text-slate-400 hover:text-slate-600 rounded"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Option Items List */}
          <div ref={listRef} className="max-h-60 overflow-y-auto p-1 divide-y divide-slate-50">
            {displayOptions.length === 0 ? (
              <div className="py-6 px-3 text-center text-slate-400">
                {loading ? (
                  <div className="flex items-center justify-center gap-2 text-primary-600 font-medium">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Searching records...</span>
                  </div>
                ) : (
                  <p className="text-slate-500 font-medium">{emptyMessage}</p>
                )}
              </div>
            ) : (
              displayOptions.map((opt, idx) => {
                const isSelected = String(opt.value) === String(value);
                const isHighlighted = idx === highlightedIndex;

                return (
                  <div
                    key={opt.value || idx}
                    onClick={() => handleSelect(opt)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`px-3 py-2.5 rounded-lg cursor-pointer flex items-center justify-between gap-2 transition ${
                      isSelected
                        ? 'bg-primary-50 text-primary-950 font-bold'
                        : isHighlighted
                        ? 'bg-slate-100 text-slate-900'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {renderOption ? (
                      renderOption(opt, { isSelected, isHighlighted })
                    ) : (
                      <div className="flex flex-col min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate">{opt.label}</span>
                          {opt.badge && (
                            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                              isSelected ? 'bg-primary-200 text-primary-900' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {opt.badge}
                            </span>
                          )}
                        </div>
                        {opt.sublabel && (
                          <span className="text-[10px] text-slate-400 truncate mt-0.5">
                            {opt.sublabel}
                          </span>
                        )}
                      </div>
                    )}

                    {isSelected && (
                      <Check className="w-4 h-4 text-primary-600 shrink-0" />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchableSelect;
