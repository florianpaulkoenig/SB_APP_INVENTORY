// ---------------------------------------------------------------------------
// NOA Inventory -- Catalogue PDF
// Magazine-style catalogue with cover image, text page, section dividers,
// and two layout options (full-page spreads or compact list).
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
  page: string;
  title: string;
  no: string;
}

const TRANSLATIONS: Record<string, CatalogueTranslations> = {
  en: {
    medium: 'Medium',
    year: 'Year',
    dimensions: 'Dimensions',
    edition: 'Edition',
    price: 'Price',
    unique: 'Unique',
    artistProof: 'Artist Proof',
    horsCommerce: 'Hors Commerce',
    epreuveArtiste: "Epreuve d'Artiste",
    of: 'of',
    referenceCode: 'Ref.',
    page: 'Page',
    title: 'Title',
    no: '#',
  },
  de: {
    medium: 'Technik',
    year: 'Jahr',
    dimensions: 'Ma\u00dfe',
    edition: 'Auflage',
    price: 'Preis',
    unique: 'Unikat',
    artistProof: 'K\u00fcnstlerexemplar',
    horsCommerce: 'Hors Commerce',
    epreuveArtiste: "Epreuve d'Artiste",
    of: 'von',
    referenceCode: 'Ref.',
    page: 'Seite',
    title: 'Titel',
    no: '#',
  },
  fr: {
    medium: 'Technique',
    year: 'Ann\u00e9e',
    dimensions: 'Dimensions',
    edition: '\u00c9dition',
    price: 'Prix',
    unique: 'Unique',
    artistProof: "Epreuve d'Artiste",
    horsCommerce: 'Hors Commerce',
    epreuveArtiste: "Epreuve d'Artiste",
    of: 'de',
    referenceCode: 'R\u00e9f.',
    page: 'Page',
    title: 'Titre',
    no: '#',
  },
};

// ---------------------------------------------------------------------------
// Date formatting per language
// ---------------------------------------------------------------------------
const DATE_LOCALES: Record<string, string> = { en: 'en-US', de: 'de-DE', fr: 'fr-FR' };

function formatLocalizedDate(language: string): string {
  const locale = DATE_LOCALES[language] ?? 'en-US';
  return new Date().toLocaleDateString(locale, { month: 'long', year: 'numeric' });
}

// ---------------------------------------------------------------------------
// Currency symbol lookup
// ---------------------------------------------------------------------------
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
// Helpers
// ---------------------------------------------------------------------------

function formatDimensions(
  h: number | null, w: number | null, d: number | null, unit: string,
): string | null {
  const parts = [h, w, d].filter((v): v is number => v != null);
  if (parts.length === 0) return null;
  return `${parts.join(' \u00d7 ')} ${unit}`;
}

function formatEdition(
  editionType: string, editionNumber: number | null, editionTotal: number | null,
  t: CatalogueTranslations,
): string {
  switch (editionType) {
    case 'unique': return t.unique;
    case 'numbered':
      if (editionNumber != null && editionTotal != null) return `${editionNumber} ${t.of} ${editionTotal}`;
      if (editionNumber != null) return `#${editionNumber}`;
      return t.edition;
    case 'AP': return t.artistProof;
    case 'HC': return t.horsCommerce;
    case 'EA': return t.epreuveArtiste;
    default: return editionType;
  }
}

function formatPrice(price: number, currency: string): string {
  const symbol = CURRENCY_SYMBOLS[currency] ?? currency;
  const formatted = price.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  if (currency === 'EUR') return `${formatted} ${symbol}`;
  if (currency === 'CHF') return `${symbol} ${formatted}`;
  return `${symbol}${formatted}`;
}

function formatSeriesLabel(value: string): string {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const s = StyleSheet.create({
  // ---- Cover page (with background image) ----------------------------------
  coverPage: {
    fontFamily: 'AnzianoPro',
    backgroundColor: PDF_COLORS.primary900,
    position: 'relative',
    width: '100%',
    height: '100%',
  },
  coverBgImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    opacity: 0.6,
  },
  coverOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  coverContent: {
    position: 'relative',
    flex: 1,
    justifyContent: 'flex-end',
    padding: 50,
    paddingBottom: 60,
  },
  coverCompanyName: {
    fontFamily: 'AnzianoPro',
    fontSize: 10,
    color: PDF_COLORS.white,
    textTransform: 'uppercase',
    letterSpacing: 3,
    marginBottom: 20,
    opacity: 0.8,
  },
  coverTitle: {
    fontFamily: 'AnzianoPro',
    fontWeight: 'bold' as const,
    fontSize: 36,
    color: PDF_COLORS.white,
    textTransform: 'uppercase',
    letterSpacing: 3,
    lineHeight: 1.1,
    marginBottom: 8,
  },
  coverSubtitle: {
    fontFamily: 'AnzianoPro',
    fontSize: 13,
    color: PDF_COLORS.white,
    letterSpacing: 1,
    marginBottom: 16,
    opacity: 0.9,
  },
  coverText: {
    fontFamily: 'AnzianoPro',
    fontSize: 9,
    color: PDF_COLORS.white,
    lineHeight: 1.6,
    maxWidth: 320,
    marginBottom: 20,
    opacity: 0.85,
  },
  coverMeta: {
    flexDirection: 'row' as const,
    gap: 20,
    marginTop: 12,
  },
  coverMetaText: {
    fontFamily: 'AnzianoPro',
    fontSize: 8,
    color: PDF_COLORS.white,
    letterSpacing: 0.5,
    opacity: 0.7,
  },

  // ---- Cover page (no image — clean white) ---------------------------------
  coverPageClean: {
    fontFamily: 'AnzianoPro',
    backgroundColor: PDF_COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 60,
  },
  coverCleanCompany: {
    fontFamily: 'AnzianoPro',
    fontWeight: 'bold' as const,
    fontSize: 18,
    color: PDF_COLORS.primary900,
    textTransform: 'uppercase',
    letterSpacing: 3,
    marginBottom: 16,
  },
  coverAccentLine: {
    width: 80,
    height: 2,
    backgroundColor: PDF_COLORS.accent,
    marginBottom: 28,
  },
  coverCleanTitle: {
    fontFamily: 'AnzianoPro',
    fontWeight: 'bold' as const,
    fontSize: 28,
    color: PDF_COLORS.primary900,
    textTransform: 'uppercase',
    letterSpacing: 4,
    textAlign: 'center',
    marginBottom: 10,
  },
  coverCleanSubtitle: {
    fontFamily: 'AnzianoPro',
    fontSize: 13,
    color: PDF_COLORS.primary700,
    textAlign: 'center',
    letterSpacing: 1,
    marginBottom: 20,
  },
  coverCleanText: {
    fontFamily: 'AnzianoPro',
    fontSize: 10,
    color: PDF_COLORS.primary700,
    textAlign: 'center',
    lineHeight: 1.6,
    maxWidth: 400,
    marginBottom: 24,
  },
  coverCleanDate: {
    fontFamily: 'AnzianoPro',
    fontSize: 10,
    color: PDF_COLORS.primary400,
    letterSpacing: 1,
    marginBottom: 20,
  },
  coverCleanContactBlock: {
    alignItems: 'center',
    marginTop: 8,
  },
  coverCleanContactName: {
    fontFamily: 'AnzianoPro',
    fontSize: 10,
    color: PDF_COLORS.primary700,
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  coverCleanContactEmail: {
    fontFamily: 'AnzianoPro',
    fontSize: 9,
    color: PDF_COLORS.primary400,
    letterSpacing: 0.3,
  },

  // ---- Text page -----------------------------------------------------------
  textPage: {
    fontFamily: 'AnzianoPro',
    fontSize: 10,
    color: PDF_COLORS.primary900,
    backgroundColor: PDF_COLORS.white,
    paddingTop: 50,
    paddingBottom: 60,
    paddingHorizontal: 60,
  },
  textPageHeader: {
    fontFamily: 'AnzianoPro',
    fontWeight: 'bold' as const,
    fontSize: 12,
    color: PDF_COLORS.primary900,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 8,
  },
  textPageAccentLine: {
    width: 60,
    height: 1,
    backgroundColor: PDF_COLORS.border,
    marginBottom: 28,
  },
  textPageBody: {
    fontFamily: 'AnzianoPro',
    fontSize: 10,
    color: PDF_COLORS.primary700,
    lineHeight: 1.7,
    marginBottom: 12,
  },

  // ---- Section divider page ------------------------------------------------
  dividerPage: {
    fontFamily: 'AnzianoPro',
    backgroundColor: PDF_COLORS.white,
    justifyContent: 'center',
    paddingHorizontal: 60,
    paddingVertical: 60,
  },
  dividerTitle: {
    fontFamily: 'AnzianoPro',
    fontWeight: 'bold' as const,
    fontSize: 42,
    color: PDF_COLORS.primary900,
    textTransform: 'uppercase',
    letterSpacing: 3,
    lineHeight: 1.1,
    marginBottom: 16,
  },
  dividerAccentLine: {
    width: 60,
    height: 2,
    backgroundColor: PDF_COLORS.primary900,
    marginBottom: 12,
  },
  dividerCount: {
    fontFamily: 'AnzianoPro',
    fontSize: 10,
    color: PDF_COLORS.primary400,
    letterSpacing: 1,
  },

  // ---- Full-page layout: image page (full bleed) ---------------------------
  imagePage: {
    fontFamily: 'AnzianoPro',
    backgroundColor: PDF_COLORS.white,
    padding: 0,
  },
  imagePageFull: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
  },
  imagePageHeader: {
    position: 'absolute' as const,
    top: 24,
    left: 30,
    right: 30,
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
  },
  imagePageHeaderText: {
    fontFamily: 'AnzianoPro',
    fontSize: 7,
    color: PDF_COLORS.primary400,
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
  },
  imagePageHeaderPage: {
    fontFamily: 'AnzianoPro',
    fontSize: 7,
    color: PDF_COLORS.primary400,
  },

  // ---- Full-page layout: detail page ---------------------------------------
  detailPage: {
    fontFamily: 'AnzianoPro',
    fontSize: 10,
    color: PDF_COLORS.primary900,
    backgroundColor: PDF_COLORS.white,
    paddingTop: 50,
    paddingBottom: 60,
    paddingHorizontal: 50,
  },
  detailImageWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  detailImage: {
    maxHeight: 380,
    maxWidth: '100%',
    objectFit: 'contain',
  },
  detailDivider: {
    borderTopWidth: 0.5,
    borderTopColor: PDF_COLORS.border,
    paddingTop: 16,
  },
  detailTitle: {
    fontFamily: 'AnzianoPro',
    fontWeight: 'bold' as const,
    fontSize: 20,
    color: PDF_COLORS.primary900,
    marginBottom: 4,
  },
  detailRefCode: {
    fontFamily: 'AnzianoPro',
    fontSize: 8,
    color: PDF_COLORS.primary400,
    marginBottom: 14,
    letterSpacing: 0.5,
  },
  detailInfoRow: {
    flexDirection: 'row' as const,
    paddingVertical: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: PDF_COLORS.backgroundLight,
  },
  detailLabel: {
    fontFamily: 'AnzianoPro',
    fontSize: 8,
    color: PDF_COLORS.primary400,
    width: 100,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  detailValue: {
    fontFamily: 'AnzianoPro',
    fontSize: 10,
    color: PDF_COLORS.primary900,
    flex: 1,
  },
  detailHeader: {
    position: 'absolute' as const,
    top: 24,
    left: 50,
    right: 50,
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
  },
  detailHeaderText: {
    fontFamily: 'AnzianoPro',
    fontSize: 7,
    color: PDF_COLORS.primary400,
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
  },
  detailHeaderPage: {
    fontFamily: 'AnzianoPro',
    fontSize: 7,
    color: PDF_COLORS.primary400,
  },

  // ---- List layout ---------------------------------------------------------
  listPage: {
    fontFamily: 'AnzianoPro',
    fontSize: 10,
    color: PDF_COLORS.primary900,
    backgroundColor: PDF_COLORS.white,
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
    color: PDF_COLORS.white,
    textTransform: 'uppercase' as const,
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
    backgroundColor: PDF_COLORS.backgroundLight,
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
    width: 44,
    height: 44,
    objectFit: 'contain' as const,
  },
  listThumbnailPlaceholder: {
    width: 44,
    height: 44,
    backgroundColor: PDF_COLORS.backgroundLight,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  listPlaceholderText: {
    fontFamily: 'AnzianoPro',
    fontSize: 5,
    color: PDF_COLORS.primary400,
  },

  // ---- Placeholder when no image -------------------------------------------
  placeholder: {
    backgroundColor: PDF_COLORS.backgroundLight,
    paddingVertical: 60,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    width: '100%',
    height: '100%',
  },
  placeholderText: {
    fontFamily: 'AnzianoPro',
    fontSize: 12,
    color: PDF_COLORS.primary400,
  },

  // ---- Footer --------------------------------------------------------------
  footer: {
    position: 'absolute' as const,
    bottom: 30,
    left: 50,
    right: 50,
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
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
});

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function CatalogueFooter() {
  return (
    <View style={s.footer} fixed>
      <Text style={s.footerText}>{`\u00a9 ${COMPANY_NAME}`}</Text>
      <Text
        style={s.pageNumber}
        render={({ pageNumber }) => (pageNumber > 1 ? `${pageNumber - 1}` : '')}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Cover Page — image background variant
// ---------------------------------------------------------------------------
function CoverPageWithImage({
  title,
  subtitle,
  coverText,
  showDate,
  showContactDetails,
  coverImageUrl,
  language,
}: {
  title: string;
  subtitle?: string;
  coverText?: string;
  showDate?: boolean;
  showContactDetails?: boolean;
  coverImageUrl: string;
  language: string;
}) {
  return (
    <Page size="A4" style={s.coverPage}>
      {/* Background image */}
      <Image src={coverImageUrl} style={s.coverBgImage} />
      <View style={s.coverOverlay} />

      {/* Content overlay — bottom-aligned like the reference */}
      <View style={s.coverContent}>
        <Text style={s.coverCompanyName}>{COMPANY_NAME}</Text>
        <Text style={s.coverTitle}>{title}</Text>
        {subtitle ? <Text style={s.coverSubtitle}>{subtitle}</Text> : null}
        {coverText ? <Text style={s.coverText}>{coverText}</Text> : null}

        <View style={s.coverMeta}>
          {showDate && (
            <Text style={s.coverMetaText}>{formatLocalizedDate(language)}</Text>
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

// ---------------------------------------------------------------------------
// Cover Page — clean white variant (no image)
// ---------------------------------------------------------------------------
function CoverPageClean({
  title,
  subtitle,
  coverText,
  showDate,
  showContactDetails,
  language,
}: {
  title: string;
  subtitle?: string;
  coverText?: string;
  showDate?: boolean;
  showContactDetails?: boolean;
  language: string;
}) {
  return (
    <Page size="A4" style={s.coverPageClean}>
      <Text style={s.coverCleanCompany}>{COMPANY_NAME}</Text>
      <View style={s.coverAccentLine} />
      <Text style={s.coverCleanTitle}>{title}</Text>
      {subtitle ? <Text style={s.coverCleanSubtitle}>{subtitle}</Text> : null}
      {coverText ? <Text style={s.coverCleanText}>{coverText}</Text> : null}
      {showDate && <Text style={s.coverCleanDate}>{formatLocalizedDate(language)}</Text>}
      {showContactDetails && (
        <View style={s.coverCleanContactBlock}>
          <Text style={s.coverCleanContactName}>Florian Paul Koenig</Text>
          <Text style={s.coverCleanContactEmail}>florian.koenig@noacontemporary.com</Text>
        </View>
      )}
      <View style={s.footer}>
        <Text style={s.footerText}>{`\u00a9 ${COMPANY_NAME}`}</Text>
        <Text style={s.pageNumber} />
      </View>
    </Page>
  );
}

// ---------------------------------------------------------------------------
// Text Page (optional)
// ---------------------------------------------------------------------------
function TextPage({ content }: { content: string }) {
  const paragraphs = content.split(/\n\n+/).filter((p) => p.trim().length > 0);

  return (
    <Page size="A4" style={s.textPage}>
      <Text style={s.textPageHeader}>{COMPANY_NAME}</Text>
      <View style={s.textPageAccentLine} />
      {paragraphs.map((para, i) => (
        <Text key={i} style={s.textPageBody}>{para.trim()}</Text>
      ))}
      <CatalogueFooter />
    </Page>
  );
}

// ---------------------------------------------------------------------------
// Section Divider Page
// ---------------------------------------------------------------------------
function DividerPage({ title, count }: { title: string; count: number }) {
  return (
    <Page size="A4" style={s.dividerPage}>
      <View style={s.dividerAccentLine} />
      <Text style={s.dividerTitle}>{title}</Text>
      <Text style={s.dividerCount}>
        {count} artwork{count !== 1 ? 's' : ''}
      </Text>
      <CatalogueFooter />
    </Page>
  );
}

// ---------------------------------------------------------------------------
// Detail rows builder
// ---------------------------------------------------------------------------
function buildDetailRows(
  artwork: CatalogueArtwork,
  t: CatalogueTranslations,
  vis: FieldVisibility,
): { label: string; value: string }[] {
  const rows: { label: string; value: string }[] = [];

  if (vis.showMedium && artwork.medium) {
    rows.push({ label: t.medium, value: artwork.medium });
  }
  if (vis.showYear && artwork.year != null) {
    rows.push({ label: t.year, value: String(artwork.year) });
  }
  if (vis.showDimensions) {
    const dims = formatDimensions(artwork.height, artwork.width, artwork.depth, artwork.dimension_unit);
    if (dims) rows.push({ label: t.dimensions, value: dims });
  }
  if (vis.showEdition) {
    rows.push({
      label: t.edition,
      value: formatEdition(artwork.edition_type, artwork.edition_number, artwork.edition_total, t),
    });
  }
  if (vis.showPrice && artwork.price != null && artwork.price > 0) {
    rows.push({ label: t.price, value: formatPrice(artwork.price, artwork.currency) });
  }

  return rows;
}

// ---------------------------------------------------------------------------
// Full-page layout: artwork detail page with image + info
// ---------------------------------------------------------------------------
function ArtworkDetailPage({
  artwork,
  t,
  vis,
  sectionLabel,
}: {
  artwork: CatalogueArtwork;
  t: CatalogueTranslations;
  vis: FieldVisibility;
  sectionLabel?: string;
}) {
  const rows = buildDetailRows(artwork, t, vis);

  return (
    <Page size="A4" style={s.detailPage}>
      {/* Top header bar with section + page number */}
      <View style={s.detailHeader} fixed>
        <Text style={s.detailHeaderText}>
          {sectionLabel ? `${sectionLabel}` : COMPANY_NAME}
        </Text>
        <Text
          style={s.detailHeaderPage}
          render={({ pageNumber }) => (pageNumber > 1 ? `${pageNumber - 1}` : '')}
        />
      </View>

      {/* Artwork image */}
      <View style={s.detailImageWrap}>
        {artwork.imageUrl ? (
          <Image src={artwork.imageUrl} style={s.detailImage} />
        ) : (
          <View style={[s.placeholder, { height: 300 }]}>
            <Text style={s.placeholderText}>{artwork.title}</Text>
          </View>
        )}
      </View>

      {/* Details */}
      <View style={s.detailDivider}>
        <Text style={s.detailTitle}>{artwork.title}</Text>
        {vis.showReferenceCode && (
          <Text style={s.detailRefCode}>{artwork.reference_code}</Text>
        )}
        {rows.map((row) => (
          <View style={s.detailInfoRow} key={row.label}>
            <Text style={s.detailLabel}>{row.label}</Text>
            <Text style={s.detailValue}>{row.value}</Text>
          </View>
        ))}
      </View>

      <CatalogueFooter />
    </Page>
  );
}

// ---------------------------------------------------------------------------
// List layout: compact table with thumbnails
// ---------------------------------------------------------------------------

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

function ListHeader({ cols }: { cols: { key: string; label: string; width: number }[] }) {
  return (
    <View style={s.listHeaderRow} fixed>
      {cols.map((col) => (
        <Text key={col.key} style={[s.listHeaderCell, { width: col.width }]}>{col.label}</Text>
      ))}
    </View>
  );
}

function ListRow({
  artwork, index, cols, t,
}: {
  artwork: CatalogueArtwork;
  index: number;
  cols: { key: string; label: string; width: number }[];
  t: CatalogueTranslations;
}) {
  const isAlt = index % 2 === 1;
  const dims = formatDimensions(artwork.height, artwork.width, artwork.depth, artwork.dimension_unit);
  const editionText = formatEdition(artwork.edition_type, artwork.edition_number, artwork.edition_total, t);

  const cellValue = (key: string): string => {
    switch (key) {
      case 'no': return String(index + 1);
      case 'title': return artwork.title;
      case 'ref': return artwork.reference_code;
      case 'medium': return artwork.medium ?? '';
      case 'year': return artwork.year != null ? String(artwork.year) : '';
      case 'dims': return dims ?? '';
      case 'edition': return editionText;
      case 'price': return artwork.price != null && artwork.price > 0
        ? formatPrice(artwork.price, artwork.currency) : '';
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
                <View style={s.listThumbnailPlaceholder}>
                  <Text style={s.listPlaceholderText}>{'\u2014'}</Text>
                </View>
              )}
            </View>
          );
        }
        return (
          <Text
            key={col.key}
            style={[col.key === 'title' ? s.listCellBold : s.listCell, { width: col.width }]}
          >
            {cellValue(col.key)}
          </Text>
        );
      })}
    </View>
  );
}

function ListLayout({
  artworks, t, vis,
}: {
  artworks: CatalogueArtwork[];
  t: CatalogueTranslations;
  vis: FieldVisibility;
}) {
  const cols = getListColumns(t, vis);

  return (
    <Page size="A4" style={s.listPage} wrap>
      <ListHeader cols={cols} />
      {artworks.map((artwork, i) => (
        <ListRow key={artwork.reference_code} artwork={artwork} index={i} cols={cols} t={t} />
      ))}
      <CatalogueFooter />
    </Page>
  );
}

// ---------------------------------------------------------------------------
// Group artworks by divider mode
// ---------------------------------------------------------------------------
function groupArtworks(
  artworks: CatalogueArtwork[],
  dividerMode: 'none' | 'series' | 'category',
): { label: string; artworks: CatalogueArtwork[] }[] {
  if (dividerMode === 'none') {
    return [{ label: '', artworks }];
  }

  const groups = new Map<string, CatalogueArtwork[]>();
  for (const aw of artworks) {
    const key = dividerMode === 'series'
      ? (aw.series ?? 'other')
      : (aw.category ?? 'other');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(aw);
  }

  return Array.from(groups.entries()).map(([key, items]) => ({
    label: formatSeriesLabel(key),
    artworks: items,
  }));
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export function CataloguePDF({
  title,
  subtitle,
  coverText,
  showDate,
  showContactDetails,
  coverImageUrl,
  textPageContent,
  layout,
  artworks,
  language,
  visibility,
  dividerMode,
}: CataloguePDFProps) {
  const t = TRANSLATIONS[language] ?? TRANSLATIONS.en;
  const groups = groupArtworks(artworks, dividerMode);

  return (
    <Document>
      {/* Cover page */}
      {coverImageUrl ? (
        <CoverPageWithImage
          title={title}
          subtitle={subtitle}
          coverText={coverText}
          showDate={showDate}
          showContactDetails={showContactDetails}
          coverImageUrl={coverImageUrl}
          language={language}
        />
      ) : (
        <CoverPageClean
          title={title}
          subtitle={subtitle}
          coverText={coverText}
          showDate={showDate}
          showContactDetails={showContactDetails}
          language={language}
        />
      )}

      {/* Optional text page */}
      {textPageContent && textPageContent.trim().length > 0 && (
        <TextPage content={textPageContent} />
      )}

      {/* Artwork pages */}
      {layout === 'full-page' &&
        groups.map((group, gi) => (
          <View key={`group-${gi}`}>
            {/* Section divider */}
            {dividerMode !== 'none' && group.label && (
              <DividerPage title={group.label} count={group.artworks.length} />
            )}

            {/* Artwork detail pages */}
            {group.artworks.map((artwork) => (
              <ArtworkDetailPage
                key={artwork.reference_code}
                artwork={artwork}
                t={t}
                vis={visibility}
                sectionLabel={dividerMode !== 'none' ? group.label : undefined}
              />
            ))}
          </View>
        ))}

      {layout === 'list' && (
        <>
          {groups.map((group, gi) => (
            <View key={`group-${gi}`}>
              {dividerMode !== 'none' && group.label && (
                <DividerPage title={group.label} count={group.artworks.length} />
              )}
              <ListLayout artworks={group.artworks} t={t} vis={visibility} />
            </View>
          ))}
        </>
      )}
    </Document>
  );
}
