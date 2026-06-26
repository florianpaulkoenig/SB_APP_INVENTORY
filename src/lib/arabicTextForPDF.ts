// ---------------------------------------------------------------------------
// Arabic text preprocessing for @react-pdf/renderer
//
// react-pdf's text layout engine (textkit) crashes on Arabic Unicode characters
// because its internal BiDi algorithm does not fully handle RTL runs.
//
// Fix: reshape Arabic letters to their visual presentation forms (using
// arabic-reshaper), apply BiDi visual reordering (bidi-js), then wrap the
// result in a Left-to-Right Override so textkit treats the whole string as LTR.
// ---------------------------------------------------------------------------

// @ts-ignore — no types for arabic-reshaper
import * as reshape from 'arabic-reshaper';
// @ts-ignore — bidi-js exports a factory function
import bidiFactory from 'bidi-js';

const bidi = bidiFactory('');

// LTR Override / Pop Directional Formatting Unicode control characters
const LRO = '‭';
const PDC = '‬';

// Fast check: does the string contain any Arabic-range code points?
const ARABIC_RE = /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/;

/**
 * Returns true if `text` contains Arabic characters.
 */
export function containsArabic(text: string | null | undefined): boolean {
  return !!text && ARABIC_RE.test(text);
}

/**
 * Prepares `text` for use inside @react-pdf/renderer.
 *
 * - If the text has no Arabic, it is returned unchanged.
 * - If it has Arabic, it is reshaped (contextual letter forms) + visually
 *   reordered for LTR display, then wrapped in Unicode LTR Override marks so
 *   textkit does not attempt a second BiDi pass.
 */
export function prepareForPDF(text: string | null | undefined): string {
  if (!text) return '';
  if (!containsArabic(text)) return text;

  try {
    const reshaped = reshape.convertArabic(text);
    const levels   = bidi.getEmbeddingLevels(reshaped);
    const reordered = bidi.getReorderedString(reshaped, levels);
    return LRO + reordered + PDC;
  } catch {
    // Fallback: return original text (may still crash react-pdf, but at least
    // we don't swallow the content).
    return text;
  }
}
