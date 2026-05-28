// ---------------------------------------------------------------------------
// richText — parser for the exhibition text markup format
//
// Supported syntax:
//   **text**      → bold
//   _text_        → italic
//   ***text***    → bold + italic
//   ^[Footnote]   → inline footnote (auto-numbered, text collected at bottom)
//   \n            → soft line break within a paragraph
//   \n\n (or more) → paragraph break
// ---------------------------------------------------------------------------

export type RichToken =
  | { type: 'text';        text: string }
  | { type: 'bold';        text: string }
  | { type: 'italic';      text: string }
  | { type: 'bold-italic'; text: string }
  | { type: 'fn-ref';      num: number }
  | { type: 'linebreak' };

export interface RichParagraph {
  tokens: RichToken[];
}

export interface ParseResult {
  paragraphs: RichParagraph[];
  /** Footnote texts in order of appearance, 1-indexed (footnotes[0] = fn #1) */
  footnotes: string[];
}

// ---------------------------------------------------------------------------
// Unicode superscript digits for footnote refs in PDF
// ---------------------------------------------------------------------------
const SUPS: Record<number, string> = {
  1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵',
  6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹', 10: '¹⁰',
  11: '¹¹', 12: '¹²',
};

export function superscript(n: number): string {
  return SUPS[n] ?? String(n);
}

const FN_MARKER = '\x00FN';

// ---------------------------------------------------------------------------
// Tokenise a single line — footnotes already replaced with \x00FNn\x00 markers
// ---------------------------------------------------------------------------
function tokeniseLine(line: string): RichToken[] {
  const tokens: RichToken[] = [];
  // bold-italic first, then bold, then italic, then fn-ref marker, then plain text
  const RE = /\*\*\*([^*]+)\*\*\*|\*\*([^*]+)\*\*|_([^_\n]+)_|\x00FN(\d+)\x00|([^\x00*_]+)/g;
  let m: RegExpExecArray | null;
  while ((m = RE.exec(line)) !== null) {
    if (m[1] !== undefined) tokens.push({ type: 'bold-italic', text: m[1] });
    else if (m[2] !== undefined) tokens.push({ type: 'bold',   text: m[2] });
    else if (m[3] !== undefined) tokens.push({ type: 'italic', text: m[3] });
    else if (m[4] !== undefined) tokens.push({ type: 'fn-ref', num: parseInt(m[4]) });
    else if (m[5] !== undefined) tokens.push({ type: 'text',   text: m[5] });
  }
  return tokens;
}

// ---------------------------------------------------------------------------
// Main parse function
// ---------------------------------------------------------------------------
export function parseRichText(input: string): ParseResult {
  if (!input?.trim()) return { paragraphs: [], footnotes: [] };

  const footnotes: string[] = [];

  // Split into paragraphs on blank lines
  const rawParagraphs = input.split(/\n{2,}/);

  const paragraphs: RichParagraph[] = rawParagraphs
    .map((raw) => raw.trim())
    .filter(Boolean)
    .map((raw) => {
      // Extract footnotes at PARAGRAPH level before splitting into lines.
      // [\s\S]*? matches lazily across newlines — fixes multi-line footnotes
      // like ^[text that\nspans multiple\nlines].
      const processed = raw.replace(/\^\[([\s\S]*?)\]/g, (_, fnText: string) => {
        // Normalise internal whitespace: newlines → single space
        footnotes.push(fnText.trim().replace(/\s+/g, ' '));
        return `${FN_MARKER}${footnotes.length}\x00`;
      });

      const lines = processed.split('\n');
      const tokens: RichToken[] = [];
      lines.forEach((line, i) => {
        tokens.push(...tokeniseLine(line));
        if (i < lines.length - 1) tokens.push({ type: 'linebreak' });
      });
      return { tokens };
    });

  return { paragraphs, footnotes };
}

// ---------------------------------------------------------------------------
// Strip all markup → plain text (for PDF fallback / search)
// ---------------------------------------------------------------------------
export function stripMarkup(input: string): string {
  return input
    .replace(/\^\[[^\]]*\]/g, '')   // remove footnotes
    .replace(/\*\*\*([^*]+)\*\*\*/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/_([^_\n]+)_/g, '$1')
    .trim();
}
