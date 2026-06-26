// ---------------------------------------------------------------------------
// NOA Inventory -- Shared PDF Styles
// Uses @react-pdf/renderer StyleSheet for all PDF documents.
// ---------------------------------------------------------------------------

import { StyleSheet, Font } from '@react-pdf/renderer';

// ---------------------------------------------------------------------------
// Register Anziano Pro font for all PDF exports
// Uses the same Regular weight for both normal and bold (only weight available)
// ---------------------------------------------------------------------------
const FONT_URL          = `${import.meta.env.BASE_URL}fonts/AnzianoPro-Regular.otf`;
// EB Garamond Italic — true italic substitute, served from /public/fonts/
// Download from https://fonts.google.com/specimen/EB+Garamond → "Download family"
// Place EBGaramond-Italic.ttf + EBGaramond-BoldItalic.ttf in /public/fonts/
const EB_ITALIC_URL      = `${import.meta.env.BASE_URL}fonts/EBGaramond-Italic.ttf`;
const EB_BOLD_ITALIC_URL = `${import.meta.env.BASE_URL}fonts/EBGaramond-BoldItalic.ttf`;

Font.register({
  family: 'AnzianoPro',
  fonts: [
    { src: FONT_URL, fontWeight: 'normal' },
    { src: FONT_URL, fontWeight: 'bold' },
  ],
});

// Separate family for italic — registered only when the font files are present.
// Falls back gracefully: if the files are missing, AnzianoPro (regular) is used
// for italic tokens, which is still readable.
try {
  Font.register({
    family: 'AnzianoProItalic',
    fonts: [
      { src: EB_ITALIC_URL,      fontWeight: 'normal' },
      { src: EB_BOLD_ITALIC_URL, fontWeight: 'bold' },
    ],
  });
} catch {
  // Font files not yet added to /public/fonts/ — italic falls back to regular
}

// ---------------------------------------------------------------------------
// Register Noto Sans SC for CJK (Chinese/Japanese/Korean) character support
// ---------------------------------------------------------------------------
Font.register({
  family: 'NotoSansSC',
  src: 'https://fonts.gstatic.com/s/notosanssc/v40/k3kCo84MPvpLmixcA63oeAL7Iqp5IZJF9bmaG9_FnYw.ttf',
});

// Register Noto Sans Arabic for Arabic/RTL character support
Font.register({
  family: 'NotoSansArabic',
  src: 'https://fonts.gstatic.com/s/notosansarabic/v18/nwpxtLGrOAZMl5nJ_wfgRg3DrWFZWsnVBJ_sS6tlqHHFlhQ5l3sQWIHPqzCfyG2vu3CBFQLaig.ttf',
});

// Disable hyphenation for CJK/Arabic text
Font.registerHyphenationCallback((word) => {
  if (/[一-鿿㐀-䶿]/.test(word)) {
    return word.split('');
  }
  return [word];
});

// ---------------------------------------------------------------------------
// Script detection helpers — pick font based on text content
// ---------------------------------------------------------------------------
const CJK_REGEX    = /[一-鿿㐀-䶿　-〿＀-￯぀-ゟ゠-ヿ가-힯]/;
const ARABIC_REGEX = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;

/** Returns true if text contains CJK characters */
export function hasCJK(text: string): boolean {
  return CJK_REGEX.test(text);
}

/** Returns true if text contains Arabic/RTL characters */
export function hasArabic(text: string): boolean {
  return ARABIC_REGEX.test(text);
}

/** Pick the right font family for the given text */
export function pdfFont(text?: string | null): string {
  if (!text) return 'AnzianoPro';
  if (hasCJK(text))    return 'NotoSansSC';
  if (hasArabic(text)) return 'NotoSansArabic';
  return 'AnzianoPro';
}

// ---------------------------------------------------------------------------
// Color palette -- Black & white gallery aesthetic with grey lines
// ---------------------------------------------------------------------------
export const PDF_COLORS = {
  primary900: '#1a1a1a',
  primary700: '#404040',
  primary400: '#999999',
  accent: '#666666',        // neutral grey (was gold #c9a96e)
  white: '#ffffff',
  backgroundLight: '#f7f7f7',
  border: '#cccccc',
} as const;

// ---------------------------------------------------------------------------
// StyleSheet
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  // ---- Page ---------------------------------------------------------------
  page: {
    fontFamily: 'AnzianoPro',
    fontSize: 10,
    color: PDF_COLORS.primary900,
    backgroundColor: PDF_COLORS.white,
    paddingTop: 50,
    paddingBottom: 60,
    paddingHorizontal: 50,
  },

  // ---- Header -------------------------------------------------------------
  header: {
    marginBottom: 24,
  },
  companyName: {
    fontFamily: 'AnzianoPro', fontWeight: 'bold' as const,
    fontSize: 22,
    color: PDF_COLORS.primary900,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  headerTitle: {
    fontFamily: 'AnzianoPro',
    fontSize: 14,
    color: PDF_COLORS.primary700,
    marginTop: 4,
    letterSpacing: 1,
  },
  headerSubtitle: {
    fontFamily: 'AnzianoPro',
    fontSize: 10,
    color: PDF_COLORS.primary400,
    marginTop: 2,
  },
  accentLine: {
    width: 60,
    height: 1,
    backgroundColor: PDF_COLORS.border,
    marginTop: 12,
    marginBottom: 20,
  },

  // ---- Section ------------------------------------------------------------
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontFamily: 'AnzianoPro', fontWeight: 'bold' as const,
    fontSize: 11,
    color: PDF_COLORS.primary900,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bodyText: {
    fontFamily: 'AnzianoPro',
    fontSize: 10,
    color: PDF_COLORS.primary700,
    lineHeight: 1.5,
  },

  // ---- Info Grid (label/value pairs) --------------------------------------
  infoGrid: {
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: PDF_COLORS.border,
    paddingVertical: 6,
  },
  infoLabel: {
    fontFamily: 'AnzianoPro', fontWeight: 'bold' as const,
    fontSize: 9,
    color: PDF_COLORS.primary400,
    width: 140,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontFamily: 'AnzianoPro',
    fontSize: 10,
    color: PDF_COLORS.primary900,
    flex: 1,
  },

  // ---- Table --------------------------------------------------------------
  table: {
    marginBottom: 16,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: PDF_COLORS.primary900,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  tableHeaderCell: {
    fontFamily: 'AnzianoPro', fontWeight: 'bold' as const,
    fontSize: 8,
    color: PDF_COLORS.white,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableBodyRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: PDF_COLORS.border,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  tableBodyRowAlt: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: PDF_COLORS.border,
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: PDF_COLORS.backgroundLight,
  },
  tableCell: {
    fontFamily: 'AnzianoPro',
    fontSize: 9,
    color: PDF_COLORS.primary700,
  },

  // ---- Footer -------------------------------------------------------------
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 50,
    right: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 0.5,
    borderTopColor: PDF_COLORS.border,
    paddingTop: 8,
  },
  footerText: {
    fontFamily: 'AnzianoPro',
    fontSize: 7,
    color: PDF_COLORS.primary400,
  },
  pageNumber: {
    fontFamily: 'AnzianoPro',
    fontSize: 7,
    color: PDF_COLORS.primary400,
  },

  // ---- Artwork Image ------------------------------------------------------
  artworkImageContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  artworkImage: {
    maxHeight: 200,
    objectFit: 'contain',
  },

  // ---- QR Code ------------------------------------------------------------
  qrCode: {
    width: 60,
    height: 60,
  },

  // ---- Signature ----------------------------------------------------------
  signatureArea: {
    marginTop: 30,
    alignItems: 'flex-start',
  },
  signatureLine: {
    width: 200,
    borderBottomWidth: 1,
    borderBottomColor: PDF_COLORS.primary900,
    marginBottom: 4,
  },
  signatureImage: {
    width: 150,
    height: 50,
    objectFit: 'contain',
    marginBottom: 4,
  },
  signatureLabel: {
    fontFamily: 'AnzianoPro',
    fontSize: 8,
    color: PDF_COLORS.primary400,
  },

  // ---- Disclaimer / fine print --------------------------------------------
  disclaimer: {
    fontFamily: 'AnzianoPro',
    fontSize: 7,
    color: PDF_COLORS.primary400,
    lineHeight: 1.4,
    marginTop: 20,
  },
});

export default styles;
