// ---------------------------------------------------------------------------
// Arabic text preprocessing for @react-pdf/renderer
//
// react-pdf's textkit crashes on raw Arabic Unicode (BiDi run offset error).
// Fix: reshape Arabic letters to presentation forms (arabic-reshaper), apply
// BiDi visual reordering (bidi-js), wrap in LTR Override — textkit never sees
// raw RTL characters and does not crash.
//
// For mixed Arabic+Latin tokens, splitForPDF() returns typed runs so each
// segment can be rendered with the correct font (AnzianoPro / NotoSansArabic).
// ---------------------------------------------------------------------------

// @ts-ignore — no types for arabic-reshaper
import * as reshape from 'arabic-reshaper';
// @ts-ignore — bidi-js exports a factory function
import bidiFactory from 'bidi-js';

const bidi = bidiFactory('');

// LTR Override / Pop Directional Formatting control characters
const LRO = '‭';
const PDC = '‬';

// Arabic source characters (before reshaping)
const ARABIC_SRC_RE = /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/;

// Arabic presentation forms (after reshaping) — used to detect Arabic runs
// in the preprocessed output
const ARABIC_PRES_RE = /[ﭐ-﷿ﹰ-﻿؀-ۿݐ-ݿ]/;

export type PDFTextRun = { text: string; arabic: boolean };

/** Returns true if `text` contains Arabic characters. */
export function containsArabic(text: string | null | undefined): boolean {
  return !!text && ARABIC_SRC_RE.test(text);
}

/**
 * Reshape + bidi-reorder a string that contains Arabic, then wrap each Arabic
 * segment in LTR Override marks so textkit does not re-process BiDi.
 * Returns an array of typed runs; latin runs use 'arabic: false', Arabic runs
 * use 'arabic: true'.
 *
 * For purely Latin text the array contains a single run with arabic: false.
 */
export function splitForPDF(text: string | null | undefined): PDFTextRun[] {
  if (!text) return [{ text: '', arabic: false }];

  if (!containsArabic(text)) {
    return [{ text, arabic: false }];
  }

  try {
    // 1. Reshape: replace Arabic letters with contextual presentation forms
    const reshaped = reshape.convertArabic(text);

    // 2. BiDi visual reordering — produces LTR display order
    const levels   = bidi.getEmbeddingLevels(reshaped);
    const reordered = bidi.getReorderedString(reshaped, levels);

    // 3. Split into arabic / non-arabic runs
    const runs: PDFTextRun[] = [];
    let cur = '';
    let curAr = ARABIC_PRES_RE.test(reordered[0] ?? '');

    for (const ch of reordered) {
      const isAr = ARABIC_PRES_RE.test(ch);
      if (isAr !== curAr) {
        if (cur) runs.push({ text: curAr ? LRO + cur + PDC : cur, arabic: curAr });
        cur = ch;
        curAr = isAr;
      } else {
        cur += ch;
      }
    }
    if (cur) runs.push({ text: curAr ? LRO + cur + PDC : cur, arabic: curAr });

    return runs.length ? runs : [{ text, arabic: false }];
  } catch {
    return [{ text, arabic: false }];
  }
}

/**
 * Simple single-string version — wraps the entire preprocessed text in LTR
 * Override. Use this for fields that are purely (or mostly) Arabic.
 */
export function prepareForPDF(text: string | null | undefined): string {
  if (!text) return '';
  if (!containsArabic(text)) return text;
  try {
    const reshaped  = reshape.convertArabic(text);
    const levels    = bidi.getEmbeddingLevels(reshaped);
    const reordered = bidi.getReorderedString(reshaped, levels);
    return LRO + reordered + PDC;
  } catch {
    return text;
  }
}
