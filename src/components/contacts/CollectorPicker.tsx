// ---------------------------------------------------------------------------
// CollectorPicker -- one input for "who bought it"
// Type a name: existing contacts are suggested and linked on pick (or on an
// exact match); anything else stays free text and becomes a new collector
// contact when the sale is saved (see ensureCollectorContact).
// ---------------------------------------------------------------------------

import { useEffect, useMemo, useRef, useState } from 'react';
import { contactDisplayName, findContactByName, searchContacts } from '../../lib/collectorName';
import { loadPickerContacts, peekPickerContacts } from '../../lib/collectorContacts';
import type { PickerContact } from '../../lib/collectorContacts';
import type { CollectorValue } from '../../lib/collectors';

interface CollectorPickerProps {
  value: CollectorValue;
  onChange: (value: CollectorValue) => void;
  label?: string;
  placeholder?: string;
  autoFocus?: boolean;
}

export function CollectorPicker({ value, onChange, label = 'Collector / Buyer', placeholder = 'Name — existing contact or new', autoFocus }: CollectorPickerProps) {
  const [contacts, setContacts] = useState<PickerContact[]>(peekPickerContacts);
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    loadPickerContacts().then((list) => { if (!cancelled) setContacts(list); });
    return () => { cancelled = true; };
  }, []);

  const suggestions = useMemo(
    () => (open && !value.contactId ? searchContacts(contacts, value.name) : []),
    [open, contacts, value.name, value.contactId],
  );

  const linked = value.contactId ? contacts.find((c) => c.id === value.contactId) ?? null : null;

  function pick(c: PickerContact) {
    onChange({ contactId: c.id, name: contactDisplayName(c) });
    setOpen(false);
  }

  function handleInput(text: string) {
    // Typing after a pick unlinks; an exact match re-links automatically
    const exact = findContactByName(contacts, text);
    onChange({ contactId: exact?.id ?? null, name: text });
    setOpen(true);
    setCursor(0);
  }

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (suggestions.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor((i) => (i + 1) % suggestions.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setCursor((i) => (i - 1 + suggestions.length) % suggestions.length); }
    else if (e.key === 'Enter') { e.preventDefault(); pick(suggestions[cursor]); }
    else if (e.key === 'Escape') { setOpen(false); }
  }

  const trimmed = value.name.trim();

  return (
    <div>
      {label && <label className="mb-1 block text-sm font-medium text-primary-700">{label}</label>}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value.name}
          onChange={(e) => handleInput(e.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={handleKey}
          placeholder={placeholder}
          autoFocus={autoFocus}
          autoComplete="off"
          maxLength={256}
          role="combobox"
          aria-expanded={suggestions.length > 0}
          aria-autocomplete="list"
          className="w-full rounded-md border border-primary-300 px-3 py-2 pr-8 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        />
        {trimmed && (
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => { onChange({ contactId: null, name: '' }); inputRef.current?.focus(); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-primary-300 hover:text-primary-600"
            aria-label="Clear"
          >
            ✕
          </button>
        )}
      </div>

      {suggestions.length > 0 && (
        <ul role="listbox" className="mt-1 divide-y divide-primary-50 border border-primary-200 bg-white text-sm shadow-sm">
          {suggestions.map((c, i) => (
            <li
              key={c.id}
              role="option"
              aria-selected={i === cursor}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(c)}
              onMouseEnter={() => setCursor(i)}
              className={`flex cursor-pointer items-center justify-between px-3 py-1.5 ${i === cursor ? 'bg-primary-50' : ''}`}
            >
              <span className="text-primary-900">{contactDisplayName(c)}</span>
              <span className="ml-3 shrink-0 text-xs text-primary-400">
                {[c.type, c.city].filter(Boolean).join(' · ')}
              </span>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-1 min-h-4 text-xs">
        {linked ? (
          <span className="text-emerald-700">✓ Existing contact{linked.type !== 'collector' ? ` (${linked.type})` : ''}</span>
        ) : trimmed ? (
          <span className="text-amber-700">New — will be added to Contacts as a collector when the sale is saved</span>
        ) : (
          <span className="text-primary-400">Optional. Start typing to search your contacts.</span>
        )}
      </p>
    </div>
  );
}
