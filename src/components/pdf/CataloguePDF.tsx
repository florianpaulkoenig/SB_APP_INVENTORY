// ---------------------------------------------------------------------------
// NOA Inventory -- Catalogue PDF
// Magazine-style catalogue with full-bleed images, 2-page artwork spreads,
// section dividers, and a compact list layout.
// Uses @react-pdf/renderer.
// ---------------------------------------------------------------------------

import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';
import { PDF_COLORS } from './PDFStyles';
import { COMPANY_NAME } from '../../lib/constants';

// Ensure AnzianoPro font is registered (side-effect import)
import './PDFStyles';

// ---------------------------------------------------------------------------
// Multi-language translations
// ---------------------------------------------------------------------------
interface CatalogueTranslations {
  medium: string;
  year: string;
  dimensions: string;
  edition: string;
  price: string;
  unique: string;
  artistProof: string;
  horsCommerce: string;
  epreuveArtiste: string;
  of: string;
  referenceCode: string;
  title: string;
  no: string;
}

const TRANSLATIONS: Record<string, CatalogueTranslations> = {
  en: {
    medium: 'Medium', year: 'Year', dimensions: 'Dimensions', edition: 'Edition',
    price: 'Price', unique: 'Unique', artistProof: 'Artist Proof',
    horsCommerce: 'Hors Commerce', epreuveArtiste: "Epreuve d'Artiste",
    of: 'of', referenceCode: 'Ref.', title: 'Title', no: '#',
  },
  de: {
    medium: 'Technik', year: 'Jahr', dimensions: 'Ma\u00dfe', edition: 'Auflage',
    price: 'Preis', unique: 'Unikat', artistProof: 'K\u00fcnstlerexemplar',
    horsCommerce: 'Hors Commerce', epreuveArtiste: "Epreuve d'Artiste",
    of: 'von', referenceCode: 'Ref.', title: 'Titel', no: '#',
  },
  fr: {
    medium: 'Technique', year: 'Ann\u00e9e', dimensions: 'Dimensions',
    edition: '\u00c9dition', price: 'Prix', unique: 'Unique',
    artistProof: "Epreuve d'Artiste", horsCommerce: 'Hors Commerce',
    epreuveArtiste: "Epreuve d'Artiste", of: 'de', referenceCode: 'R\u00e9f.',
    title: 'Titre', no: '#',
  },
};

// ---------------------------------------------------------------------------
// Date / Currency helpers
// ---------------------------------------------------------------------------
const DATE_LOCALES: Record<string, string> = { en: 'en-US', de: 'de-DE', fr: 'fr-FR' };

function formatLocalizedDate(language: string): string {
  const locale = DATE_LOCALES[language] ?? 'en-US';
  return new Date().toLocaleDateString(locale, { month: 'long', year: 'numeric' });
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  EUR: '\u20AC', USD: '$', CHF: 'CHF', GBP: '\u00A3',
};

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------
export interface CatalogueArtwork {
  title: string;
  reference_code: string;
  medium: string | null;
  year: number | null;
  height: number | null;
  width: number | null;
  depth: number | null;
  dimension_unit: string;
  edition_type: string;
  edition_number: number | null;
  edition_total: number | null;
  price: number | null;
  currency: string;
  category: string | null;
  series: string | null;
  imageUrl?: string | null;
}

export interface FieldVisibility {
  showReferenceCode: boolean;
  showMedium: boolean;
  showYear: boolean;
  showDimensions: boolean;
  showEdition: boolean;
  showPrice: boolean;
}

export interface CataloguePDFProps {
  title: string;
  subtitle?: string;
  coverText?: string;
  showDate?: boolean;
  showContactDetails?: boolean;
  coverImageUrl?: string | null;
  textPageContent?: string;
  layout: 'full-page' | 'list';
  artworks: CatalogueArtwork[];
  language: 'en' | 'de' | 'fr';
  visibility: FieldVisibility;
  dividerMode: 'none' | 'series' | 'category';
}

// ---------------------------------------------------------------------------
// Format helpers
// ---------------------------------------------------------------------------
function formatDimensions(h: number | null, w: number | null, d: number | null, unit: string): string | null {
  const parts = [h, w, d].filter((v): v is number => v != null);
  if (parts.length === 0) return null;
  return `${parts.join(' \u00d7 ')} ${unit}`;
}

function formatEdition(et: string, en: number | null, total: number | null, t: CatalogueTranslations): string {
  switch (et) {
    case 'unique': return t.unique;
    case 'numbered':
      if (en != null && total != null) return `${en} ${t.of} ${total}`;
      if (en != null) return `#${en}`;
      return t.edition;
    case 'AP': return t.artistProof;
    case 'HC': return t.horsCommerce;
    case 'EA': return t.epreuveArtiste;
    default: return et;
  }
}

function formatPrice(price: number, currency: string): string {
  const sym = CURRENCY_SYMBOLS[currency] ?? currency;
  const f = price.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  if (currency === 'EUR') return `${f} ${sym}`;
  if (currency === 'CHF') return `${sym} ${f}`;
  return `${sym}${f}`;
}

function formatSeriesLabel(value: string): string {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const s = StyleSheet.create({
  // ---- Cover: full-bleed image background ----------------------------------
  coverPage: {
    fontFamily: 'AnzianoPro',
    backgroundColor: '#111111',
    position: 'relative',
  },
  coverBgImage: {
    position: 'absolute',
    top: 0, left: 0, width: '100%', height: '100%',
    objectFit: 'cover',
  },
  coverDarkOverlay: {
    position: 'absolute',
    top: 0, left: 0, width: '100%', height: '100%',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  coverContent: {
    position: 'relative',
    flex: 1,
    justifyContent: 'flex-end',
    padding: 48,
    paddingBottom: 56,
  },
  coverCompany: {
    fontFamily: 'AnzianoPro',
    fontSize: 9,
    color: '#ffffff',
    textTransform: 'uppercase',
    letterSpacing: 4,
    marginBottom: 24,
    opacity: 0.7,
  },
  coverTitle: {
    fontFamily: 'AnzianoPro',
    fontWeight: 'bold' as const,
    fontSize: 40,
    color: '#ffffff',
    textTransform: 'uppercase',
    letterSpacing: 2,
    lineHeight: 1.05,
    marginBottom: 6,
  },
  coverSubtitle: {
    fontFamily: 'AnzianoPro',
    fontSize: 14,
    color: '#ffffff',
    letterSpacing: 1,
    marginBottom: 16,
    opacity: 0.85,
  },
  coverBodyText: {
    fontFamily: 'AnzianoPro',
    fontSize: 9,
    color: '#ffffff',
    lineHeight: 1.7,
    maxWidth: 300,
    marginBottom: 24,
    opacity: 0.75,
  },
  coverMetaRow: {
    flexDirection: 'row' as const,
    marginTop: 8,
  },
  coverMetaText: {
    fontFamily: 'AnzianoPro',
    fontSize: 7,
    color: '#ffffff',
    letterSpacing: 0.5,
    opacity: 0.6,
  },

  // ---- Cover: clean white (no image) ---------------------------------------
  coverClean: {
    fontFamily: 'AnzianoPro',
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 60,
  },
  coverCleanCompany: {
    fontFamily: 'AnzianoPro',
    fontWeight: 'bold' as const,
    fontSize: 16,
    color: PDF_COLORS.primary900,
    textTransform: 'uppercase',
    letterSpacing: 4,
    marginBottom: 20,
  },
  coverCleanLine: {
    width: 60,
    height: 1.5,
    backgroundColor: PDF_COLORS.primary900,
    marginBottom: 32,
  },
  coverCleanTitle: {
    fontFamily: 'AnzianoPro',
    fontWeight: 'bold' as const,
    fontSize: 32,
    color: PDF_COLORS.primary900,
    textTransform: 'uppercase',
    letterSpacing: 3,
    textAlign: 'center',
    lineHeight: 1.1,
    marginBottom: 10,
  },
  coverCleanSubtitle: {
    fontFamily: 'AnzianoPro',
    fontSize: 12,
    color: PDF_COLORS.primary400,
    textAlign: 'center',
    letterSpacing: 1,
    marginBottom: 24,
  },
  coverCleanBody: {
    fontFamily: 'AnzianoPro',
    fontSize: 9,
    color: PDF_COLORS.primary700,
    textAlign: 'center',
    lineHeight: 1.7,
    maxWidth: 380,
    marginBottom: 28,
  },
  coverCleanDate: {
    fontFamily: 'AnzianoPro',
    fontSize: 9,
    color: PDF_COLORS.primary400,
    letterSpacing: 1.5,
    marginBottom: 20,
  },
  coverCleanContactName: {
    fontFamily: 'AnzianoPro',
    fontSize: 9,
    color: PDF_COLORS.primary700,
    marginBottom: 3,
  },
  coverCleanContactEmail: {
    fontFamily: 'AnzianoPro',
    fontSize: 8,
    color: PDF_COLORS.primary400,
  },

  // ---- Text page -----------------------------------------------------------
  textPage: {
    fontFamily: 'AnzianoPro',
    backgroundColor: '#ffffff',
    paddingTop: 60,
    paddingBottom: 60,
    paddingHorizontal: 60,
  },
  textPageCompany: {
    fontFamily: 'AnzianoPro',
    fontSize: 9,
    color: PDF_COLORS.primary400,
    textTransform: 'uppercase',
    letterSpacing: 3,
    marginBottom: 8,
  },
  textPageLine: {
    width: 40,
    height: 1,
    backgroundColor: PDF_COLORS.primary900,
    marginBottom: 32,
  },
  textPageParagraph: {
    fontFamily: 'AnzianoPro',
    fontSize: 10,
    color: PDF_COLORS.primary700,
    lineHeight: 1.8,
    marginBottom: 14,
  },

  // ---- Section divider page ------------------------------------------------
  dividerPage: {
    fontFamily: 'AnzianoPro',
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    paddingHorizontal: 60,
  },
  dividerLine: {
    width: 50,
    height: 2,
    backgroundColor: PDF_COLORS.primary900,
    marginBottom: 20,
  },
  dividerTitle: {
    fontFamily: 'AnzianoPro',
    fontWeight: 'bold' as const,
    fontSize: 48,
    color: PDF_COLORS.primary900,
    textTransform: 'uppercase',
    letterSpacing: 2,
    lineHeight: 1.05,
    marginBottom: 14,
  },
  dividerCount: {
    fontFamily: 'AnzianoPro',
    fontSize: 10,
    color: PDF_COLORS.primary400,
    letterSpacing: 1,
  },

  // ---- Full-bleed image page (Page 1 of spread) ----------------------------
  imgPage: {
    fontFamily: 'AnzianoPro',
    backgroundColor: '#ffffff',
    padding: 0,
    position: 'relative',
  },
  imgFull: {
    position: 'absolute',
    top: 0, left: 0, width: '100%', height: '100%',
    objectFit: 'cover',
  },
  imgContain: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
  },
  imgPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imgPlaceholderText: {
    fontFamily: 'AnzianoPro',
    fontSize: 14,
    color: PDF_COLORS.primary400,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  // Minimal header overlay on image page
  imgHeader: {
    position: 'absolute',
    top: 20, left: 24, right: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  imgHeaderLabel: {
    fontFamily: 'AnzianoPro',
    fontSize: 6,
    color: '#ffffff',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    opacity: 0.6,
  },
  imgHeaderPage: {
    fontFamily: 'AnzianoPro',
    fontSize: 6,
    color: '#ffffff',
    opacity: 0.6,
  },

  // ---- Detail page (Page 2 of spread) --------------------------------------
  detailPage: {
    fontFamily: 'AnzianoPro',
    backgroundColor: '#ffffff',
    paddingTop: 80,
    paddingBottom: 60,
    paddingHorizontal: 60,
    justifyContent: 'center',
  },
  detailTitle: {
    fontFamily: 'AnzianoPro',
    fontWeight: 'bold' as const,
    fontSize: 28,
    color: PDF_COLORS.primary900,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    lineHeight: 1.1,
    marginBottom: 6,
  },
  detailRefCode: {
    fontFamily: 'AnzianoPro',
    fontSize: 8,
    color: PDF_COLORS.primary400,
    letterSpacing: 1,
    marginBottom: 28,
  },
  detailLine: {
    width: 40,
    height: 1,
    backgroundColor: PDF_COLORS.primary900,
    marginBottom: 24,
  },
  detailRow: {
    flexDirection: 'row' as const,
    marginBottom: 10,
  },
  detailLabel: {
    fontFamily: 'AnzianoPro',
    fontSize: 7,
    color: PDF_COLORS.primary400,
    width: 90,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  detailValue: {
    fontFamily: 'AnzianoPro',
    fontSize: 10,
    color: PDF_COLORS.primary900,
    flex: 1,
  },
  // Header bar on detail page
  detailHeader: {
    position: 'absolute',
    top: 24, left: 60, right: 60,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailHeaderLabel: {
    fontFamily: 'AnzianoPro',
    fontSize: 6,
    color: PDF_COLORS.primary400,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  detailHeaderPage: {
    fontFamily: 'AnzianoPro',
    fontSize: 6,
    color: PDF_COLORS.primary400,
  },

  // ---- List layout ---------------------------------------------------------
  listPage: {
    fontFamily: 'AnzianoPro',
    backgroundColor: '#ffffff',
    paddingTop: 40,
    paddingBottom: 60,
    paddingHorizontal: 40,
  },
  listHeaderRow: {
    flexDirection: 'row' as const,
    backgroundColor: PDF_COLORS.primary900,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  listHeaderCell: {
    fontFamily: 'AnzianoPro',
    fontWeight: 'bold' as const,
    fontSize: 7,
    color: '#ffffff',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  listBodyRow: {
    flexDirection: 'row' as const,
    borderBottomWidth: 0.5,
    borderBottomColor: PDF_COLORS.border,
    paddingVertical: 5,
    paddingHorizontal: 8,
    alignItems: 'center' as const,
    minHeight: 54,
  },
  listBodyRowAlt: {
    flexDirection: 'row' as const,
    borderBottomWidth: 0.5,
    borderBottomColor: PDF_COLORS.border,
    paddingVertical: 5,
    paddingHorizontal: 8,
    alignItems: 'center' as const,
    minHeight: 54,
    backgroundColor: '#fafafa',
  },
  listCell: {
    fontFamily: 'AnzianoPro',
    fontSize: 8,
    color: PDF_COLORS.primary700,
  },
  listCellBold: {
    fontFamily: 'AnzianoPro',
    fontWeight: 'bold' as const,
    fontSize: 8,
    color: PDF_COLORS.primary900,
  },
  listThumbnail: {
    width: 44, height: 44,
    objectFit: 'contain' as const,
  },
  listThumbPlaceholder: {
    width: 44, height: 44,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listThumbText: {
    fontFamily: 'AnzianoPro',
    fontSize: 5,
    color: PDF_COLORS.primary400,
  },

  // ---- Shared footer -------------------------------------------------------
  footer: {
    position: 'absolute' as const,
    bottom: 24, left: 48, right: 48,
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
  },
  footerText: {
    fontFamily: 'AnzianoPro',
    fontSize: 6,
    color: PDF_COLORS.primary400,
    letterSpacing: 0.5,
  },
});

// ---------------------------------------------------------------------------
// Footer
// ---------------------------------------------------------------------------
function PageFooter() {
  return (
    <View style={s.footer} fixed>
      <Text style={s.footerText}>{`\u00a9 ${COMPANY_NAME}`}</Text>
      <Text
        style={s.footerText}
        render={({ pageNumber }) => (pageNumber > 1 ? String(pageNumber - 1) : '')}
      />
    </View>
  );
}

// ============================================================================
// COVER PAGES
// ============================================================================

function CoverWithImage({
  title, subtitle, coverText, showDate, showContactDetails, coverImageUrl, language,
}: {
  title: string; subtitle?: string; coverText?: string;
  showDate?: boolean; showContactDetails?: boolean;
  coverImageUrl: string; language: string;
}) {
  return (
    <Page size="A4" style={s.coverPage}>
      <Image src={coverImageUrl} style={s.coverBgImage} />
      <View style={s.coverDarkOverlay} />
      <View style={s.coverContent}>
        <Text style={s.coverCompany}>{COMPANY_NAME}</Text>
        <Text style={s.coverTitle}>{title}</Text>
        {subtitle ? <Text style={s.coverSubtitle}>{subtitle}</Text> : null}
        {coverText ? <Text style={s.coverBodyText}>{coverText}</Text> : null}
        <View style={s.coverMetaRow}>
          {showDate && (
            <Text style={s.coverMetaText}>{formatLocalizedDate(language)}    </Text>
          )}
          {showContactDetails && (
            <Text style={s.coverMetaText}>
              Florian Paul Koenig  |  florian.koenig@noacontemporary.com
            </Text>
          )}
        </View>
      </View>
    </Page>
  );
}

function CoverClean({
  title, subtitle, coverText, showDate, showContactDetails, language,
}: {
  title: string; subtitle?: string; coverText?: string;
  showDate?: boolean; showContactDetails?: boolean; language: string;
}) {
  return (
    <Page size="A4" style={s.coverClean}>
      <Text style={s.coverCleanCompany}>{COMPANY_NAME}</Text>
      <View style={s.coverCleanLine} />
      <Text style={s.coverCleanTitle}>{title}</Text>
      {subtitle ? <Text style={s.coverCleanSubtitle}>{subtitle}</Text> : null}
      {coverText ? <Text style={s.coverCleanBody}>{coverText}</Text> : null}
      {showDate && <Text style={s.coverCleanDate}>{formatLocalizedDate(language)}</Text>}
      {showContactDetails && (
        <View style={{ alignItems: 'center', marginTop: 8 }}>
          <Text style={s.coverCleanContactName}>Florian Paul Koenig</Text>
          <Text style={s.coverCleanContactEmail}>florian.koenig@noacontemporary.com</Text>
        </View>
      )}
    </Page>
  );
}

// ============================================================================
// TEXT PAGE
// ============================================================================

function TextPageComponent({ content }: { content: string }) {
  const paras = content.split(/\n\n+/).filter((p) => p.trim());
  return (
    <Page size="A4" style={s.textPage}>
      <Text style={s.textPageCompany}>{COMPANY_NAME}</Text>
      <View style={s.textPageLine} />
      {paras.map((p, i) => (
        <Text key={i} style={s.textPageParagraph}>{p.trim()}</Text>
      ))}
      <PageFooter />
    </Page>
  );
}

// ============================================================================
// SECTION DIVIDER
// ============================================================================

function DividerPage({ title, count }: { title: string; count: number }) {
  return (
    <Page size="A4" style={s.dividerPage}>
      <View style={s.dividerLine} />
      <Text style={s.dividerTitle}>{title}</Text>
      <Text style={s.dividerCount}>
        {count} artwork{count !== 1 ? 's' : ''}
      </Text>
    </Page>
  );
}

// ============================================================================
// FULL-PAGE LAYOUT — 2-PAGE SPREAD PER ARTWORK
// ============================================================================

function buildDetailRows(
  aw: CatalogueArtwork, t: CatalogueTranslations, vis: FieldVisibility,
): { label: string; value: string }[] {
  const rows: { label: string; value: string }[] = [];
  if (vis.showMedium && aw.medium) rows.push({ label: t.medium, value: aw.medium });
  if (vis.showYear && aw.year != null) rows.push({ label: t.year, value: String(aw.year) });
  if (vis.showDimensions) {
    const d = formatDimensions(aw.height, aw.width, aw.depth, aw.dimension_unit);
    if (d) rows.push({ label: t.dimensions, value: d });
  }
  if (vis.showEdition) {
    rows.push({ label: t.edition, value: formatEdition(aw.edition_type, aw.edition_number, aw.edition_total, t) });
  }
  if (vis.showPrice && aw.price != null && aw.price > 0) {
    rows.push({ label: t.price, value: formatPrice(aw.price, aw.currency) });
  }
  return rows;
}

/**
 * 2-page spread:
 * Page 1 — Full-bleed artwork image (edge to edge, no padding)
 * Page 2 — Clean details page with large title + metadata
 */
function ArtworkSpread({
  artwork, t, vis, sectionLabel,
}: {
  artwork: CatalogueArtwork;
  t: CatalogueTranslations;
  vis: FieldVisibility;
  sectionLabel?: string;
}) {
  const rows = buildDetailRows(artwork, t, vis);

  return (
    <>
      {/* PAGE 1: Full-bleed image */}
      <Page size="A4" style={s.imgPage}>
        {artwork.imageUrl ? (
          <Image src={artwork.imageUrl} style={s.imgContain} />
        ) : (
          <View style={s.imgPlaceholder}>
            <Text style={s.imgPlaceholderText}>{artwork.title}</Text>
          </View>
        )}
        {/* Subtle header overlay */}
        {artwork.imageUrl && (
          <View style={s.imgHeader}>
            <Text style={s.imgHeaderLabel}>
              {sectionLabel || COMPANY_NAME}
            </Text>
            <Text
              style={s.imgHeaderPage}
              render={({ pageNumber }) => (pageNumber > 1 ? String(pageNumber - 1) : '')}
            />
          </View>
        )}
      </Page>

      {/* PAGE 2: Details */}
      <Page size="A4" style={s.detailPage}>
        <View style={s.detailHeader} fixed>
          <Text style={s.detailHeaderLabel}>
            {sectionLabel || COMPANY_NAME}
          </Text>
          <Text
            style={s.detailHeaderPage}
            render={({ pageNumber }) => (pageNumber > 1 ? String(pageNumber - 1) : '')}
          />
        </View>

        <Text style={s.detailTitle}>{artwork.title}</Text>
        {vis.showReferenceCode && (
          <Text style={s.detailRefCode}>{artwork.reference_code}</Text>
        )}
        <View style={s.detailLine} />
        {rows.map((row) => (
          <View style={s.detailRow} key={row.label}>
            <Text style={s.detailLabel}>{row.label}</Text>
            <Text style={s.detailValue}>{row.value}</Text>
          </View>
        ))}
      </Page>
    </>
  );
}

// ============================================================================
// LIST LAYOUT
// ============================================================================

function getListColumns(t: CatalogueTranslations, vis: FieldVisibility) {
  const cols: { key: string; label: string; width: number }[] = [
    { key: 'no', label: t.no, width: 20 },
    { key: 'image', label: '', width: 50 },
    { key: 'title', label: t.title, width: 0 },
  ];
  if (vis.showReferenceCode) cols.push({ key: 'ref', label: t.referenceCode, width: 65 });
  if (vis.showMedium) cols.push({ key: 'medium', label: t.medium, width: 70 });
  if (vis.showYear) cols.push({ key: 'year', label: t.year, width: 35 });
  if (vis.showDimensions) cols.push({ key: 'dims', label: t.dimensions, width: 80 });
  if (vis.showEdition) cols.push({ key: 'edition', label: t.edition, width: 55 });
  if (vis.showPrice) cols.push({ key: 'price', label: t.price, width: 60 });

  const usable = 495;
  const fixedTotal = cols.reduce((sum, c) => sum + (c.key !== 'title' ? c.width : 0), 0);
  const titleCol = cols.find((c) => c.key === 'title');
  if (titleCol) titleCol.width = Math.max(80, usable - fixedTotal);
  return cols;
}

function ListRow({
  artwork, index, cols, t,
}: {
  artwork: CatalogueArtwork; index: number;
  cols: { key: string; label: string; width: number }[];
  t: CatalogueTranslations;
}) {
  const isAlt = index % 2 === 1;
  const dims = formatDimensions(artwork.height, artwork.width, artwork.depth, artwork.dimension_unit);
  const ed = formatEdition(artwork.edition_type, artwork.edition_number, artwork.edition_total, t);

  const val = (key: string): string => {
    switch (key) {
      case 'no': return String(index + 1);
      case 'title': return artwork.title;
      case 'ref': return artwork.reference_code;
      case 'medium': return artwork.medium ?? '';
      case 'year': return artwork.year != null ? String(artwork.year) : '';
      case 'dims': return dims ?? '';
      case 'edition': return ed;
      case 'price': return artwork.price != null && artwork.price > 0 ? formatPrice(artwork.price, artwork.currency) : '';
      default: return '';
    }
  };

  return (
    <View style={isAlt ? s.listBodyRowAlt : s.listBodyRow} wrap={false}>
      {cols.map((col) => {
        if (col.key === 'image') {
          return (
            <View key="image" style={{ width: col.width }}>
              {artwork.imageUrl ? (
                <Image src={artwork.imageUrl} style={s.listThumbnail} />
              ) : (
                <View style={s.listThumbPlaceholder}>
                  <Text style={s.listThumbText}>{'\u2014'}</Text>
                </View>
              )}
            </View>
          );
        }
        return (
          <Text key={col.key} style={[col.key === 'title' ? s.listCellBold : s.listCell, { width: col.width }]}>
            {val(col.key)}
          </Text>
        );
      })}
    </View>
  );
}

function ListLayout({ artworks, t, vis }: {
  artworks: CatalogueArtwork[]; t: CatalogueTranslations; vis: FieldVisibility;
}) {
  const cols = getListColumns(t, vis);
  return (
    <Page size="A4" style={s.listPage} wrap>
      <View style={s.listHeaderRow} fixed>
        {cols.map((col) => (
          <Text key={col.key} style={[s.listHeaderCell, { width: col.width }]}>{col.label}</Text>
        ))}
      </View>
      {artworks.map((aw, i) => (
        <ListRow key={aw.reference_code} artwork={aw} index={i} cols={cols} t={t} />
      ))}
      <PageFooter />
    </Page>
  );
}

// ============================================================================
// GROUP ARTWORKS
// ============================================================================

function groupArtworks(
  artworks: CatalogueArtwork[], mode: 'none' | 'series' | 'category',
): { label: string; artworks: CatalogueArtwork[] }[] {
  if (mode === 'none') return [{ label: '', artworks }];

  const groups = new Map<string, CatalogueArtwork[]>();
  for (const aw of artworks) {
    const key = mode === 'series' ? (aw.series ?? 'other') : (aw.category ?? 'other');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(aw);
  }
  return Array.from(groups.entries()).map(([key, items]) => ({
    label: formatSeriesLabel(key),
    artworks: items,
  }));
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function CataloguePDF({
  title, subtitle, coverText, showDate, showContactDetails,
  coverImageUrl, textPageContent, layout, artworks, language, visibility, dividerMode,
}: CataloguePDFProps) {
  const t = TRANSLATIONS[language] ?? TRANSLATIONS.en;
  const groups = groupArtworks(artworks, dividerMode);

  return (
    <Document>
      {/* Cover */}
      {coverImageUrl ? (
        <CoverWithImage
          title={title} subtitle={subtitle} coverText={coverText}
          showDate={showDate} showContactDetails={showContactDetails}
          coverImageUrl={coverImageUrl} language={language}
        />
      ) : (
        <CoverClean
          title={title} subtitle={subtitle} coverText={coverText}
          showDate={showDate} showContactDetails={showContactDetails}
          language={language}
        />
      )}

      {/* Text page */}
      {textPageContent && textPageContent.trim() && (
        <TextPageComponent content={textPageContent} />
      )}

      {/* Full-page: 2-page spreads per artwork */}
      {layout === 'full-page' &&
        groups.map((group, gi) => [
          dividerMode !== 'none' && group.label ? (
            <DividerPage key={`div-${gi}`} title={group.label} count={group.artworks.length} />
          ) : null,
          ...group.artworks.map((aw) => (
            <ArtworkSpread
              key={aw.reference_code}
              artwork={aw}
              t={t}
              vis={visibility}
              sectionLabel={dividerMode !== 'none' ? group.label : undefined}
            />
          )),
        ])}

      {/* List layout */}
      {layout === 'list' &&
        groups.map((group, gi) => [
          dividerMode !== 'none' && group.label ? (
            <DividerPage key={`div-${gi}`} title={group.label} count={group.artworks.length} />
          ) : null,
          <ListLayout key={`list-${gi}`} artworks={group.artworks} t={t} vis={visibility} />,
        ])}
    </Document>
  );
}
