// ---------------------------------------------------------------------------
// NOA Inventory -- Catalogue PDF
// Clean catalogue with artwork image + details on same page,
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
  weight: string;
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
    medium: 'Medium', year: 'Year', dimensions: 'Dimensions', weight: 'Weight',
    edition: 'Edition', price: 'Price', unique: 'Unique', artistProof: 'Artist Proof',
    horsCommerce: 'Hors Commerce', epreuveArtiste: "Epreuve d'Artiste",
    of: 'of', referenceCode: 'Ref.', title: 'Title', no: '#',
  },
  de: {
    medium: 'Technik', year: 'Jahr', dimensions: 'Ma\u00dfe', weight: 'Gewicht',
    edition: 'Auflage',
    price: 'Preis', unique: 'Unikat', artistProof: 'K\u00fcnstlerexemplar',
    horsCommerce: 'Hors Commerce', epreuveArtiste: "Epreuve d'Artiste",
    of: 'von', referenceCode: 'Ref.', title: 'Titel', no: '#',
  },
  fr: {
    medium: 'Technique', year: 'Ann\u00e9e', dimensions: 'Dimensions', weight: 'Poids',
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
  weight: number | null;
  edition_type: string;
  edition_number: number | null;
  edition_total: number | null;
  price: number | null;
  currency: string;
  status: string | null;
  category: string | null;
  series: string | null;
  imageUrl?: string | null;
}

export interface FieldVisibility {
  showReferenceCode: boolean;
  showMedium: boolean;
  showYear: boolean;
  showDimensions: boolean;
  showWeight: boolean;
  showEdition: boolean;
  showPrice: boolean;
  showSoldDot: boolean;
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
  dimensionUnit: 'cm' | 'inches';
  weightUnit: 'kg' | 'lbs';
}

// ---------------------------------------------------------------------------
// Format helpers
// ---------------------------------------------------------------------------
const CM_PER_INCH = 2.54;

function convertDim(value: number, fromUnit: string, toUnit: string): number {
  if (fromUnit === toUnit) return value;
  if (fromUnit === 'cm' && toUnit === 'inches') return value / CM_PER_INCH;
  if (fromUnit === 'inches' && toUnit === 'cm') return value * CM_PER_INCH;
  return value;
}

function formatDimensions(
  h: number | null, w: number | null, d: number | null,
  sourceUnit: string, displayUnit: string,
): string | null {
  const parts = [h, w, d].filter((v): v is number => v != null);
  if (parts.length === 0) return null;
  const converted = parts.map((v) => {
    const val = convertDim(v, sourceUnit, displayUnit);
    // Show 1 decimal for inches, 0 for cm
    return displayUnit === 'inches' ? val.toFixed(1) : Math.round(val).toString();
  });
  const label = displayUnit === 'inches' ? 'in' : 'cm';
  return `${converted.join(' \u00d7 ')} ${label}`;
}

const KG_PER_LB = 0.45359237;

function formatWeight(weight: number, displayUnit: string): string {
  if (displayUnit === 'lbs') {
    const lbs = weight / KG_PER_LB;
    return `${lbs.toFixed(1)} lbs`;
  }
  return `${weight.toFixed(1)} kg`;
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
  },
  coverBgLayer: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
  },
  coverBgImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  coverDarkOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.50)',
  },
  coverContent: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 48,
    paddingBottom: 56,
  },
  coverTitle: {
    fontFamily: 'AnzianoPro',
    fontWeight: 'bold' as const,
    fontSize: 36,
    color: '#ffffff',
    textTransform: 'uppercase',
    letterSpacing: 2,
    lineHeight: 1.1,
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
  coverMetaText: {
    fontFamily: 'AnzianoPro',
    fontSize: 7,
    color: '#ffffff',
    letterSpacing: 0.5,
    opacity: 0.6,
    marginBottom: 3,
  },
  coverCompanySmall: {
    fontFamily: 'AnzianoPro',
    fontSize: 7,
    color: '#ffffff',
    textTransform: 'uppercase',
    letterSpacing: 3,
    opacity: 0.5,
    marginTop: 16,
  },

  // ---- Cover: clean white (no image) ---------------------------------------
  coverClean: {
    fontFamily: 'AnzianoPro',
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 60,
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
    marginBottom: 16,
  },
  coverCleanLine: {
    width: 60,
    height: 1.5,
    backgroundColor: PDF_COLORS.primary900,
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
    marginBottom: 12,
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
    marginBottom: 16,
  },
  coverCleanCompany: {
    fontFamily: 'AnzianoPro',
    fontSize: 7,
    color: PDF_COLORS.primary400,
    textTransform: 'uppercase',
    letterSpacing: 3,
  },

  // ---- Text page -----------------------------------------------------------
  textPage: {
    fontFamily: 'AnzianoPro',
    backgroundColor: '#ffffff',
    paddingTop: 60,
    paddingBottom: 60,
    paddingHorizontal: 60,
  },
  textPageTitle: {
    fontFamily: 'AnzianoPro',
    fontWeight: 'bold' as const,
    fontSize: 22,
    color: PDF_COLORS.primary900,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  textPageSubtitle: {
    fontFamily: 'AnzianoPro',
    fontSize: 11,
    color: PDF_COLORS.primary400,
    letterSpacing: 0.5,
    marginBottom: 20,
  },
  textPageLine: {
    width: 40,
    height: 1,
    backgroundColor: PDF_COLORS.primary900,
    marginBottom: 24,
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
    fontSize: 36,
    color: PDF_COLORS.primary900,
    textTransform: 'uppercase',
    letterSpacing: 2,
    lineHeight: 1.1,
    marginBottom: 14,
  },
  dividerCount: {
    fontFamily: 'AnzianoPro',
    fontSize: 10,
    color: PDF_COLORS.primary400,
    letterSpacing: 1,
  },

  // ---- Full-page layout: image + details on same page ----------------------
  artworkPage: {
    fontFamily: 'AnzianoPro',
    backgroundColor: '#ffffff',
    paddingTop: 40,
    paddingBottom: 60,
    paddingHorizontal: 50,
  },
  artworkImageContainer: {
    width: '100%',
    marginBottom: 24,
  },
  artworkImage: {
    width: '100%',
    objectFit: 'contain',
  },
  artworkPlaceholder: {
    width: '100%',
    height: 300,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  artworkPlaceholderText: {
    fontFamily: 'AnzianoPro',
    fontSize: 12,
    color: PDF_COLORS.primary400,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  artworkTitleRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: 4,
  },
  artworkTitle: {
    fontFamily: 'AnzianoPro',
    fontWeight: 'bold' as const,
    fontSize: 18,
    color: PDF_COLORS.primary900,
    textTransform: 'uppercase',
    letterSpacing: 1,
    lineHeight: 1.15,
  },
  soldDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E53E3E',
    marginLeft: 8,
    marginTop: 2,
  },
  artworkRefCode: {
    fontFamily: 'AnzianoPro',
    fontSize: 8,
    color: PDF_COLORS.primary400,
    letterSpacing: 1,
    marginBottom: 16,
  },
  artworkLine: {
    width: 30,
    height: 1,
    backgroundColor: PDF_COLORS.primary900,
    marginBottom: 14,
  },
  artworkDetailRow: {
    flexDirection: 'row' as const,
    marginBottom: 6,
  },
  artworkDetailLabel: {
    fontFamily: 'AnzianoPro',
    fontSize: 7,
    color: PDF_COLORS.primary400,
    width: 80,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  artworkDetailValue: {
    fontFamily: 'AnzianoPro',
    fontSize: 9,
    color: PDF_COLORS.primary900,
    flex: 1,
  },
  artworkHeaderLabel: {
    fontFamily: 'AnzianoPro',
    fontSize: 6,
    color: PDF_COLORS.primary400,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
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
    backgroundColor: '#000000',
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  listHeaderCell: {
    fontFamily: 'AnzianoPro',
    fontWeight: 'bold' as const,
    fontSize: 6,
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
    fontSize: 7,
    color: PDF_COLORS.primary700,
  },
  listCellBold: {
    fontFamily: 'AnzianoPro',
    fontWeight: 'bold' as const,
    fontSize: 7,
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

// ---------------------------------------------------------------------------
// Detail rows builder
// ---------------------------------------------------------------------------
function buildDetailRows(
  aw: CatalogueArtwork, t: CatalogueTranslations, vis: FieldVisibility,
  displayUnit: string, weightUnit: string,
): { label: string; value: string }[] {
  const rows: { label: string; value: string }[] = [];
  if (vis.showMedium && aw.medium) rows.push({ label: t.medium, value: aw.medium });
  if (vis.showYear && aw.year != null) rows.push({ label: t.year, value: String(aw.year) });
  if (vis.showDimensions) {
    const d = formatDimensions(aw.height, aw.width, aw.depth, aw.dimension_unit, displayUnit);
    if (d) rows.push({ label: t.dimensions, value: d });
  }
  if (vis.showWeight && aw.weight != null && aw.weight > 0) {
    rows.push({ label: t.weight, value: formatWeight(aw.weight, weightUnit) });
  }
  if (vis.showEdition) {
    rows.push({ label: t.edition, value: formatEdition(aw.edition_type, aw.edition_number, aw.edition_total, t) });
  }
  if (vis.showPrice && aw.price != null && aw.price > 0) {
    rows.push({ label: t.price, value: formatPrice(aw.price, aw.currency) });
  }
  return rows;
}

// ============================================================================
// LIST LAYOUT HELPERS
// ============================================================================

function getListColumns(t: CatalogueTranslations, vis: FieldVisibility) {
  const usable = 515;
  const fixedNo = 18;
  const fixedImage = 50;
  const flexSpace = usable - fixedNo - fixedImage;

  // Proportional weights for each flexible column
  // Title gets ~2x weight, other text columns ~1x, short columns ~0.6x
  const flexCols: { key: string; label: string; weight: number }[] = [
    { key: 'title', label: t.title, weight: 2 },
  ];
  if (vis.showReferenceCode) flexCols.push({ key: 'ref', label: t.referenceCode, weight: 1.2 });
  if (vis.showMedium) flexCols.push({ key: 'medium', label: t.medium, weight: 1.2 });
  if (vis.showYear) flexCols.push({ key: 'year', label: t.year, weight: 0.6 });
  if (vis.showDimensions) flexCols.push({ key: 'dims', label: t.dimensions, weight: 1.2 });
  if (vis.showWeight) flexCols.push({ key: 'weight', label: t.weight, weight: 0.7 });
  if (vis.showEdition) flexCols.push({ key: 'edition', label: t.edition, weight: 0.8 });
  if (vis.showPrice) flexCols.push({ key: 'price', label: t.price, weight: 0.8 });

  const totalWeight = flexCols.reduce((s, c) => s + c.weight, 0);

  const cols: { key: string; label: string; width: number }[] = [
    { key: 'no', label: t.no, width: fixedNo },
    { key: 'image', label: '', width: fixedImage },
  ];
  for (const fc of flexCols) {
    cols.push({ key: fc.key, label: fc.label, width: Math.round((fc.weight / totalWeight) * flexSpace) });
  }
  return cols;
}

function ListRow({
  artwork, index, cols, t, displayUnit, weightUnit, showSoldDot,
}: {
  artwork: CatalogueArtwork; index: number;
  cols: { key: string; label: string; width: number }[];
  t: CatalogueTranslations;
  displayUnit: string;
  weightUnit: string;
  showSoldDot: boolean;
}) {
  const isAlt = index % 2 === 1;
  const dims = formatDimensions(artwork.height, artwork.width, artwork.depth, artwork.dimension_unit, displayUnit);
  const ed = formatEdition(artwork.edition_type, artwork.edition_number, artwork.edition_total, t);

  const val = (key: string): string => {
    switch (key) {
      case 'no': return String(index + 1);
      case 'title': return artwork.title;
      case 'ref': return artwork.reference_code;
      case 'medium': return artwork.medium ?? '';
      case 'year': return artwork.year != null ? String(artwork.year) : '';
      case 'dims': return dims ?? '';
      case 'weight': return artwork.weight != null && artwork.weight > 0 ? formatWeight(artwork.weight, weightUnit) : '';
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
        if (col.key === 'price' && showSoldDot && artwork.status === 'sold') {
          return (
            <View key={col.key} style={[{ width: col.width, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' }]}>
              <View style={[s.soldDot, { width: 6, height: 6, borderRadius: 3 }]} />
            </View>
          );
        }
        const cellStyle = col.key === 'title' ? s.listCellBold : s.listCell;
        const align = col.key === 'price' ? 'right' as const : undefined;
        return (
          <Text key={col.key} style={[cellStyle, { width: col.width, textAlign: align }]}>
            {val(col.key)}
          </Text>
        );
      })}
    </View>
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
  coverImageUrl, textPageContent, layout, artworks, language, visibility, dividerMode, dimensionUnit, weightUnit,
}: CataloguePDFProps) {
  const t = TRANSLATIONS[language] ?? TRANSLATIONS.en;
  const groups = groupArtworks(artworks, dividerMode);

  // Build ALL pages as a single flat array to guarantee ordering
  const allPages: React.ReactElement[] = [];

  // ---- COVER PAGE ----
  if (coverImageUrl) {
    allPages.push(
      <Page key="cover" size="A4" style={s.coverPage}>
        <View style={s.coverBgLayer}>
          <Image src={coverImageUrl} style={s.coverBgImage} />
          <View style={s.coverDarkOverlay} />
        </View>
        <View style={s.coverContent}>
          <Text style={s.coverTitle}>{title}</Text>
          {subtitle ? <Text style={s.coverSubtitle}>{subtitle}</Text> : null}
          {coverText ? <Text style={s.coverBodyText}>{coverText}</Text> : null}
          {showDate && (
            <Text style={s.coverMetaText}>{formatLocalizedDate(language)}</Text>
          )}
          {showContactDetails && (
            <Text style={s.coverMetaText}>
              Florian Paul Koenig  |  florian.koenig@noacontemporary.com
            </Text>
          )}
          <Text style={s.coverCompanySmall}>{COMPANY_NAME}</Text>
        </View>
      </Page>
    );
  } else {
    allPages.push(
      <Page key="cover" size="A4" style={s.coverClean}>
        <Text style={s.coverCleanTitle}>{title}</Text>
        {subtitle ? <Text style={s.coverCleanSubtitle}>{subtitle}</Text> : null}
        <View style={s.coverCleanLine} />
        {coverText ? <Text style={s.coverCleanBody}>{coverText}</Text> : null}
        {showDate && <Text style={s.coverCleanDate}>{formatLocalizedDate(language)}</Text>}
        {showContactDetails && (
          <View style={{ alignItems: 'center' }}>
            <Text style={s.coverCleanContactName}>Florian Paul Koenig</Text>
            <Text style={s.coverCleanContactEmail}>florian.koenig@noacontemporary.com</Text>
          </View>
        )}
        <Text style={s.coverCleanCompany}>{COMPANY_NAME}</Text>
      </Page>
    );
  }

  // ---- TEXT PAGE ----
  if (textPageContent && textPageContent.trim()) {
    allPages.push(
      <Page key="text" size="A4" style={s.textPage}>
        <Text style={s.textPageTitle}>{title}</Text>
        {subtitle ? <Text style={s.textPageSubtitle}>{subtitle}</Text> : null}
        <View style={s.textPageLine} />
        {textPageContent.split(/\n\n+/).filter((p) => p.trim()).map((p, i) => (
          <Text key={i} style={s.textPageParagraph}>{p.trim()}</Text>
        ))}
        <PageFooter />
      </Page>
    );
  }

  // ---- ARTWORK PAGES ----
  if (layout === 'full-page') {
    for (const group of groups) {
      if (dividerMode !== 'none' && group.label) {
        allPages.push(
          <Page key={`div-${group.label}`} size="A4" style={s.dividerPage}>
            <View style={s.dividerLine} />
            <Text style={s.dividerTitle}>{group.label}</Text>
            <Text style={s.dividerCount}>
              {group.artworks.length} artwork{group.artworks.length !== 1 ? 's' : ''}
            </Text>
          </Page>
        );
      }

      for (const aw of group.artworks) {
        const rows = buildDetailRows(aw, t, visibility, dimensionUnit, weightUnit);
        const sectionLabel = dividerMode !== 'none' ? group.label : undefined;

        allPages.push(
          <Page key={`aw-${aw.reference_code}`} size="A4" style={s.artworkPage}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }} fixed>
              <Text style={s.artworkHeaderLabel}>
                {sectionLabel || COMPANY_NAME}
              </Text>
              <Text
                style={s.artworkHeaderLabel}
                render={({ pageNumber }) => (pageNumber > 1 ? String(pageNumber - 1) : '')}
              />
            </View>

            <View style={s.artworkImageContainer}>
              {aw.imageUrl ? (
                <Image src={aw.imageUrl} style={s.artworkImage} />
              ) : (
                <View style={s.artworkPlaceholder}>
                  <Text style={s.artworkPlaceholderText}>{aw.title}</Text>
                </View>
              )}
            </View>

            <Text style={s.artworkTitle}>{aw.title}</Text>
            {visibility.showReferenceCode && (
              <Text style={s.artworkRefCode}>{aw.reference_code}</Text>
            )}
            <View style={s.artworkLine} />
            {rows.map((row) => (
              <View style={s.artworkDetailRow} key={row.label}>
                <Text style={s.artworkDetailLabel}>{row.label}</Text>
                <Text style={s.artworkDetailValue}>{row.value}</Text>
              </View>
            ))}
            {visibility.showSoldDot && aw.status === 'sold' && (
              <View style={s.artworkDetailRow}>
                <View style={s.soldDot} />
              </View>
            )}
            <PageFooter />
          </Page>
        );
      }
    }
  } else {
    for (const group of groups) {
      if (dividerMode !== 'none' && group.label) {
        allPages.push(
          <Page key={`div-${group.label}`} size="A4" style={s.dividerPage}>
            <View style={s.dividerLine} />
            <Text style={s.dividerTitle}>{group.label}</Text>
            <Text style={s.dividerCount}>
              {group.artworks.length} artwork{group.artworks.length !== 1 ? 's' : ''}
            </Text>
          </Page>
        );
      }

      const cols = getListColumns(t, visibility);
      allPages.push(
        <Page key={`list-${group.label}`} size="A4" style={s.listPage} wrap>
          <View style={s.listHeaderRow} fixed>
            {cols.map((col) => (
              <Text key={col.key} style={[s.listHeaderCell, { width: col.width, textAlign: col.key === 'price' ? 'right' : undefined }]}>{col.label}</Text>
            ))}
          </View>
          {group.artworks.map((aw, i) => (
            <ListRow key={aw.reference_code} artwork={aw} index={i} cols={cols} t={t} displayUnit={dimensionUnit} weightUnit={weightUnit} showSoldDot={visibility.showSoldDot} />
          ))}
          <PageFooter />
        </Page>
      );
    }
  }

  return (
    <Document>
      {allPages}
    </Document>
  );
}
