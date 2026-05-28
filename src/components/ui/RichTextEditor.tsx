// ---------------------------------------------------------------------------
// RichTextEditor — toolbar + textarea for exhibition text
//
// Supported markup (matches richText.ts parser):
//   **text**    → bold         (Cmd/Ctrl+B)
//   _text_      → italic       (Cmd/Ctrl+I)
//   ***text***  → bold+italic
//   ^[text]     → footnote     (toolbar button)
// ---------------------------------------------------------------------------

import { useRef } from 'react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  label?: string;
  saveStatus?: 'saving' | 'saved' | 'idle';
}

export function RichTextEditor({
  value,
  onChange,
  placeholder,
  rows = 10,
  label,
  saveStatus = 'idle',
}: RichTextEditorProps) {
  const taRef = useRef<HTMLTextAreaElement>(null);

  // ---- Wrap selection or insert placeholder --------------------------------

  function wrap(before: string, after: string, placeholder = '') {
    const ta = taRef.current;
    if (!ta) return;

    const start = ta.selectionStart;
    const end   = ta.selectionEnd;
    const sel   = value.slice(start, end) || placeholder;

    const newVal = value.slice(0, start) + before + sel + after + value.slice(end);
    onChange(newVal);

    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(
        start + before.length,
        start + before.length + sel.length,
      );
    });
  }

  function insertFootnote() {
    const ta = taRef.current;
    if (!ta) return;
    const pos       = ta.selectionStart;
    const fnHolder  = 'Fussnote eingeben';
    const insertion = `^[${fnHolder}]`;
    onChange(value.slice(0, pos) + insertion + value.slice(pos));
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(pos + 2, pos + 2 + fnHolder.length);
    });
  }

  // ---- Keyboard shortcuts --------------------------------------------------

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    const mod = e.metaKey || e.ctrlKey;
    if (mod && e.key === 'b') { e.preventDefault(); wrap('**', '**', 'fett'); }
    if (mod && e.key === 'i') { e.preventDefault(); wrap('_', '_', 'kursiv'); }
  }

  // ---- Render --------------------------------------------------------------

  return (
    <div>
      {label && (
        <div className="mb-1.5 flex items-center justify-between">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</label>
          <span className="text-xs text-gray-400 h-4">
            {saveStatus === 'saving' ? 'Speichern…' : saveStatus === 'saved' ? '✓ Gespeichert' : ''}
          </span>
        </div>
      )}

      <div className="rounded-lg border border-gray-200 overflow-hidden focus-within:border-gray-400 focus-within:ring-2 focus-within:ring-black/10 transition-shadow">
        {/* Toolbar */}
        <div className="flex items-center gap-0.5 border-b border-gray-100 bg-gray-50 px-2 py-1.5">
          {/* Bold */}
          <ToolbarBtn onClick={() => wrap('**', '**', 'fett')} title="Fett (⌘B)">
            <span className="font-bold text-sm leading-none">B</span>
          </ToolbarBtn>

          {/* Italic */}
          <ToolbarBtn onClick={() => wrap('_', '_', 'kursiv')} title="Kursiv (⌘I)">
            <span className="italic text-sm leading-none font-serif">I</span>
          </ToolbarBtn>

          {/* Bold+Italic */}
          <ToolbarBtn onClick={() => wrap('***', '***', 'fett kursiv')} title="Fett + Kursiv">
            <span className="font-bold italic text-sm leading-none font-serif">BI</span>
          </ToolbarBtn>

          <div className="w-px h-4 bg-gray-200 mx-1.5 shrink-0" />

          {/* Footnote */}
          <ToolbarBtn onClick={insertFootnote} title="Fussnote einfügen">
            <span className="text-xs leading-none">
              Fn<sup className="text-[8px]">1</sup>
            </span>
          </ToolbarBtn>

          {/* Syntax hint */}
          <div className="ml-auto hidden sm:flex items-center gap-2 pr-1 text-[10px] text-gray-400 select-none">
            <span><strong className="text-gray-500">**fett**</strong></span>
            <span><em className="text-gray-500">_kursiv_</em></span>
            <span className="text-gray-400">^[Fussnote]</span>
          </div>
        </div>

        {/* Editor area */}
        <textarea
          ref={taRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={rows}
          spellCheck
          className="w-full px-3 py-2.5 text-sm text-gray-800 leading-relaxed resize-y focus:outline-none bg-white font-sans"
        />

        {/* Footnote preview — shows extracted footnotes below the editor */}
        <FootnotePreview text={value} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Small button
// ---------------------------------------------------------------------------

function ToolbarBtn({
  children, onClick, title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="flex items-center justify-center w-8 h-7 rounded text-gray-600 hover:bg-gray-200 hover:text-gray-900 transition-colors"
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Live footnote list below the editor
// ---------------------------------------------------------------------------

function FootnotePreview({ text }: { text: string }) {
  const FN_RE = /\^\[([^\]]*)\]/g;
  const footnotes: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = FN_RE.exec(text)) !== null) {
    footnotes.push(m[1].trim());
  }

  if (footnotes.length === 0) return null;

  const SUPS = ['¹','²','³','⁴','⁵','⁶','⁷','⁸','⁹','¹⁰','¹¹','¹²'];

  return (
    <div className="border-t border-gray-100 bg-gray-50 px-3 py-2">
      <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Fussnoten</p>
      {footnotes.map((fn, i) => (
        <p key={i} className="text-xs text-gray-600">
          <span className="text-gray-400 mr-1">{SUPS[i] ?? `${i + 1}`}</span>
          {fn || <span className="italic text-gray-400">leer</span>}
        </p>
      ))}
    </div>
  );
}
