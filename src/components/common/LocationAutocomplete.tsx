'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { MapPin, Loader2, X, Search, Check } from 'lucide-react'

export interface PlaceSuggestion {
  id: string
  title: string
  subtitle: string
  fullAddress: string
  lat?: string
  lon?: string
  type?: string
}

interface LocationAutocompleteProps {
  id?: string
  name?: string
  value: string
  onChange: (value: string) => void
  onSelectSuggestion?: (suggestion: PlaceSuggestion) => void
  placeholder?: string
  required?: boolean
  className?: string
  autoFocus?: boolean
}

export function LocationAutocomplete({
  id = 'location',
  name = 'location',
  value,
  onChange,
  onSelectSuggestion,
  placeholder = 'Ej: Castell del Remei, Lleida o Finca Los Rosales...',
  required = false,
  className = '',
  autoFocus = false
}: LocationAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  const fetchSuggestions = useCallback(async (query: string) => {
    if (!query || query.trim().length < 2) {
      setSuggestions([])
      setIsOpen(false)
      setLoading(false)
      return
    }

    // Skip autocomplete if it's already a full http/maps link
    if (/^https?:\/\//i.test(query.trim())) {
      setSuggestions([])
      setIsOpen(false)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const res = await fetch(`/api/places/autocomplete?q=${encodeURIComponent(query.trim())}`)
      if (res.ok) {
        const data = await res.json()
        const results = data.suggestions || []
        setSuggestions(results)
        setIsOpen(results.length > 0)
        setHighlightedIndex(-1)
      }
    } catch (err) {
      console.error('Error fetching suggestions:', err)
      setSuggestions([])
    } finally {
      setLoading(false)
    }
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value
    onChange(newVal)

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = setTimeout(() => {
      fetchSuggestions(newVal)
    }, 280)
  }

  const handleSelect = (item: PlaceSuggestion) => {
    // Fill with formatted name/address
    onChange(item.fullAddress || item.title)
    if (onSelectSuggestion) {
      onSelectSuggestion(item)
    }
    setIsOpen(false)
    setSuggestions([])
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1))
    } else if (e.key === 'Enter') {
      if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
        e.preventDefault()
        handleSelect(suggestions[highlightedIndex])
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    }
  }, [])

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative flex items-center">
        <Input
          id={id}
          name={name}
          type="text"
          value={value}
          onChange={handleInputChange}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true)
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          required={required}
          autoFocus={autoFocus}
          autoComplete="off"
          className={`pr-16 ${className}`}
        />

        {/* Right Action Icons (Loading / Clear / Search) */}
        <div className="absolute right-2.5 flex items-center gap-1 text-muted-foreground pointer-events-auto">
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
          ) : value ? (
            <button
              type="button"
              onClick={() => {
                onChange('')
                setSuggestions([])
                setIsOpen(false)
              }}
              className="p-1 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title="Borrar ubicación"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <Search className="w-4 h-4 opacity-40" />
          )}
        </div>
      </div>

      {/* Floating Auto-suggestions Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-card/95 backdrop-blur-xl border border-border/80 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150 max-h-72 overflow-y-auto">
          <div className="p-1.5 bg-muted/40 border-b border-border/40 text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between px-3">
            <span className="flex items-center gap-1.5">
              <MapPin className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
              Sugerencias de lugares
            </span>
            <span className="text-[10px] opacity-70 font-normal lowercase">pulsa para seleccionar</span>
          </div>

          <ul className="p-1 space-y-0.5" role="listbox">
            {suggestions.map((item, index) => {
              const isSelected = highlightedIndex === index
              return (
                <li
                  key={item.id || index}
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  onClick={() => handleSelect(item)}
                  className={`p-2.5 px-3 rounded-lg cursor-pointer flex items-start gap-2.5 transition-colors select-none ${
                    isSelected
                      ? 'bg-primary/10 text-primary dark:bg-primary/20'
                      : 'hover:bg-muted/80 text-foreground'
                  }`}
                >
                  <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5 border border-emerald-500/20">
                    <MapPin className="w-3.5 h-3.5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-xs sm:text-sm truncate">
                      {item.title}
                    </p>
                    {item.subtitle && (
                      <p className="text-[11px] sm:text-xs text-muted-foreground truncate mt-0.5">
                        {item.subtitle}
                      </p>
                    )}
                  </div>

                  {isSelected && (
                    <Check className="w-4 h-4 text-primary shrink-0 self-center opacity-80" />
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
