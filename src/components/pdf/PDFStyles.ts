// ---------------------------------------------------------------------------
// NOA Inventory -- Shared PDF Styles
// Uses @react-pdf/renderer StyleSheet for all PDF documents.
// ---------------------------------------------------------------------------

import { StyleSheet, Font } from '@react-pdf/renderer';

// ---------------------------------------------------------------------------
// Register Anziano Pro font for all PDF exports
// Uses the same Regular weight for both normal and bold (only weight available)
// ---------------------------------------------------------------------------
const FONT_URL = `${import.meta.env.BASE_URL}fonts/AnzianoPro-Regular.otf`;

Font.register({
  family: 'AnzianoPro',
  fonts: [
    { src: FONT_URL, fontWeight: 'normal' },
    { src: FONT_URL, fontWeight: 'bold' },
  ],
});

// ---------------------------------------------------------------------------
// Color palette -- NOA Contemporary gallery aesthetic
// ---------------------------------------------------------------------------
export const PDF_COLORS = {
  primary900: '#1a1a1a',
  primary700: '#404040',
  primary400: '#999999',
  accent: '#c9a96e',
  white: '#ffffff',
  backgroundLight: '#f5f5f5',
  border: '#e0e0e0',
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
    height: 2,
    backgroundColor: PDF_COLORS.accent,
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
