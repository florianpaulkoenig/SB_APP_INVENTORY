// ---------------------------------------------------------------------------
// NOA Inventory -- Catalogue PDF
// Generates exhibition, collector, or gallery catalogues using @react-pdf/renderer.
// ---------------------------------------------------------------------------

import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';
import { PDF_COLORS } from './PDFStyles';
import { ARTIST_NAME, COMPANY_NAME } from '../../lib/constants';

// Ensure AnzianoPro font is registered (side-effect import)
import './PDFStyles';

// ---------------------------------------------------------------------------
// Multi-language translations
// ---------------------------------------------------------------------------
interface CatalogueTranslations {
  artist: string;
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
  catalogue: string;
  exhibition: string;
  collector: string;
  gallery: string;
  referenceCode: string;
  page: string;
}

const TRANSLATIONS: Record<string, CatalogueTranslations> = {
  en: {
    artist: 'Artist',
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
    catalogue: 'Catalogue',
    exhibition: 'Exhibition Catalogue',
    collector: 'Collector Catalogue',
    gallery: 'Gallery Catalogue',
    referenceCode: 'Ref.',
    page: 'Page',
  },
  de: {
    artist: 'K\u00fcnstler',
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
    catalogue: 'Katalog',
    exhibition: 'Ausstellungskatalog',
    collector: 'Sammlerkatalog',
    gallery: 'Galeriekatalog',
    referenceCode: 'Ref.',
    page: 'Seite',
  },
  fr: {
    artist: 'Artiste',
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
    catalogue: 'Catalogue',
    exhibition: "Catalogue d'Exposition",
    collector: 'Catalogue Collectionneur',
    gallery: 'Catalogue Galerie',
    referenceCode: 'R\u00e9f.',
    page: 'Page',
  },
};

// ---------------------------------------------------------------------------
// Currency symbol lookup
// ---------------------------------------------------------------------------
const CURRENCY_SYMBOLS: Record<string, string> = {
  EUR: '\u20AC',
  USD: '$',
  CHF: 'CHF',
  GBP: '\u00A3',
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
  imageUrl?: string | null;
}

export interface CataloguePDFProps {
  title: string;
  subtitle?: string;
  catalogueType: 'exhibition' | 'collector' | 'gallery';
  layout: 'grid-2' | 'grid-4' | 'full-page';
  artworks: CatalogueArtwork[];
  showPrices: boolean;
  language: 'en' | 'de' | 'fr';
  coverImageUrl?: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDimensions(
  h: number | null,
  w: number | null,
  d: number | null,
  unit: string,
): string | null {
  const parts = [h, w, d].filter((v): v is number => v != null);
  if (parts.length === 0) return null;
  return `${parts.join(' \u00d7 ')} ${unit}`;
}

function formatEdition(
  editionType: string,
  editionNumber: number | null,
  editionTotal: number | null,
  t: CatalogueTranslations,
): string {
  switch (editionType) {
    case 'unique':
      return t.unique;
    case 'numbered':
      if (editionNumber != null && editionTotal != null) {
        return `${editionNumber} ${t.of} ${editionTotal}`;
      }
      if (editionNumber != null) return `#${editionNumber}`;
      return t.edition;
    case 'AP':
      return t.artistProof;
    case 'HC':
      return t.horsCommerce;
    case 'EA':
      return t.epreuveArtiste;
    default:
      return editionType;
  }
}

function formatPrice(price: number, currency: string): string {
  const symbol = CURRENCY_SYMBOLS[currency] ?? currency;
  const formatted = price.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  if (currency === 'EUR') return `${formatted} ${symbol}`;
  if (currency === 'CHF') return `${symbol} ${formatted}`;
  return `${symbol}${formatted}`;
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const s = StyleSheet.create({
  // ---- Cover page ----------------------------------------------------------
  coverPage: {
    fontFamily: 'AnzianoPro',
    backgroundColor: PDF_COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 60,
  },
  coverImageContainer: {
    width: '100%',
    maxHeight: 300,
    marginBottom: 40,
    alignItems: 'center',
  },
  coverImage: {
    maxHeight: 300,
    maxWidth: '100%',
    objectFit: 'contain',
  },
  coverTitle: {
    fontFamily: 'AnzianoPro',
    fontWeight: 'bold' as const,
    fontSize: 32,
    color: PDF_COLORS.primary900,
    textTransform: 'uppercase',
    letterSpacing: 4,
    textAlign: 'center',
    marginBottom: 12,
  },
  coverSubtitle: {
    fontFamily: 'AnzianoPro',
    fontSize: 14,
    color: PDF_COLORS.primary700,
    textAlign: 'center',
    letterSpacing: 1,
    marginBottom: 24,
  },
  coverAccentLine: {
    width: 80,
    height: 2,
    backgroundColor: PDF_COLORS.accent,
    marginBottom: 24,
  },
  coverArtist: {
    fontFamily: 'AnzianoPro',
    fontSize: 16,
    color: PDF_COLORS.primary700,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  coverCompany: {
    fontFamily: 'AnzianoPro',
    fontSize: 10,
    color: PDF_COLORS.primary400,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },

  // ---- Artwork page (shared base) ------------------------------------------
  artworkPage: {
    fontFamily: 'AnzianoPro',
    fontSize: 10,
    color: PDF_COLORS.primary900,
    backgroundColor: PDF_COLORS.white,
    paddingTop: 50,
    paddingBottom: 60,
    paddingHorizontal: 50,
  },

  // ---- Full-page layout ----------------------------------------------------
  fullImageWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  fullImage: {
    maxHeight: 440,
    maxWidth: '100%',
    objectFit: 'contain',
  },
  fullDivider: {
    borderTopWidth: 0.5,
    borderTopColor: PDF_COLORS.border,
    paddingTop: 16,
  },
  fullTitle: {
    fontFamily: 'AnzianoPro',
    fontWeight: 'bold' as const,
    fontSize: 18,
    color: PDF_COLORS.primary900,
    marginBottom: 4,
  },
  fullRefCode: {
    fontFamily: 'AnzianoPro',
    fontSize: 8,
    color: PDF_COLORS.primary400,
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  fullInfoRow: {
    flexDirection: 'row' as const,
    paddingVertical: 3,
  },
  fullLabel: {
    fontFamily: 'AnzianoPro',
    fontSize: 9,
    color: PDF_COLORS.primary400,
    width: 100,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  fullValue: {
    fontFamily: 'AnzianoPro',
    fontSize: 10,
    color: PDF_COLORS.primary900,
  },

  // ---- Grid-2 layout (2 artworks per page, stacked vertically) -------------
  g2Block: {
    marginBottom: 16,
  },
  g2ImageWrap: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: 12,
  },
  g2Image: {
    maxHeight: 240,
    maxWidth: '100%',
    objectFit: 'contain' as const,
  },
  g2Divider: {
    borderTopWidth: 0.5,
    borderTopColor: PDF_COLORS.border,
    paddingTop: 8,
  },
  g2Title: {
    fontFamily: 'AnzianoPro',
    fontWeight: 'bold' as const,
    fontSize: 12,
    color: PDF_COLORS.primary900,
    marginBottom: 2,
  },
  g2RefCode: {
    fontFamily: 'AnzianoPro',
    fontSize: 7,
    color: PDF_COLORS.primary400,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  g2InfoRow: {
    flexDirection: 'row' as const,
    paddingVertical: 2,
  },
  g2Label: {
    fontFamily: 'AnzianoPro',
    fontSize: 8,
    color: PDF_COLORS.primary400,
    width: 90,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.4,
  },
  g2Value: {
    fontFamily: 'AnzianoPro',
    fontSize: 9,
    color: PDF_COLORS.primary900,
  },
  g2Separator: {
    borderBottomWidth: 0.5,
    borderBottomColor: PDF_COLORS.border,
    marginTop: 8,
    marginBottom: 16,
  },

  // ---- Grid-4 layout (4 artworks per page, 2x2 grid) ----------------------
  g4Row: {
    flexDirection: 'row' as const,
    marginBottom: 16,
  },
  g4ItemLeft: {
    width: '48%',
    marginRight: '4%',
  },
  g4ItemRight: {
    width: '48%',
  },
  g4ImageWrap: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: 8,
  },
  g4Image: {
    maxHeight: 160,
    maxWidth: '100%',
    objectFit: 'contain' as const,
  },
  g4Title: {
    fontFamily: 'AnzianoPro',
    fontWeight: 'bold' as const,
    fontSize: 9,
    color: PDF_COLORS.primary900,
    marginBottom: 1,
  },
  g4RefCode: {
    fontFamily: 'AnzianoPro',
    fontSize: 6,
    color: PDF_COLORS.primary400,
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  g4DetailText: {
    fontFamily: 'AnzianoPro',
    fontSize: 7,
    color: PDF_COLORS.primary700,
    lineHeight: 1.4,
  },
  g4PriceText: {
    fontFamily: 'AnzianoPro',
    fontWeight: 'bold' as const,
    fontSize: 8,
    color: PDF_COLORS.primary900,
    marginTop: 3,
  },

  // ---- Placeholder when no image -------------------------------------------
  placeholder: {
    backgroundColor: PDF_COLORS.backgroundLight,
    paddingVertical: 30,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  placeholderSmall: {
    backgroundColor: PDF_COLORS.backgroundLight,
    paddingVertical: 20,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  placeholderText: {
    fontFamily: 'AnzianoPro',
    fontSize: 9,
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

function CoverPage({
  title,
  subtitle,
  coverImageUrl,
}: {
  title: string;
  subtitle?: string;
  coverImageUrl?: string | null;
}) {
  return (
    <Page size="A4" style={s.coverPage}>
      {coverImageUrl && (
        <View style={s.coverImageContainer}>
          <Image src={coverImageUrl} style={s.coverImage} />
        </View>
      )}
      <Text style={s.coverTitle}>{title}</Text>
      {subtitle && <Text style={s.coverSubtitle}>{subtitle}</Text>}
      <View style={s.coverAccentLine} />
      <Text style={s.coverArtist}>{ARTIST_NAME}</Text>
      <Text style={s.coverCompany}>{COMPANY_NAME}</Text>
    </Page>
  );
}

// ---------------------------------------------------------------------------
// Detail rows builder
// ---------------------------------------------------------------------------

function buildDetailRows(
  artwork: CatalogueArtwork,
  t: CatalogueTranslations,
  showPrices: boolean,
): { label: string; value: string }[] {
  const rows: { label: string; value: string }[] = [];

  if (artwork.medium) {
    rows.push({ label: t.medium, value: artwork.medium });
  }
  if (artwork.year != null) {
    rows.push({ label: t.year, value: String(artwork.year) });
  }

  const dims = formatDimensions(
    artwork.height,
    artwork.width,
    artwork.depth,
    artwork.dimension_unit,
  );
  if (dims) {
    rows.push({ label: t.dimensions, value: dims });
  }

  rows.push({
    label: t.edition,
    value: formatEdition(artwork.edition_type, artwork.edition_number, artwork.edition_total, t),
  });

  if (showPrices && artwork.price != null && artwork.price > 0) {
    rows.push({ label: t.price, value: formatPrice(artwork.price, artwork.currency) });
  }

  return rows;
}

// ---------------------------------------------------------------------------
// Full-page layout: one artwork per page
// ---------------------------------------------------------------------------

function FullPageArtwork({
  artwork,
  t,
  showPrices,
}: {
  artwork: CatalogueArtwork;
  t: CatalogueTranslations;
  showPrices: boolean;
}) {
  const rows = buildDetailRows(artwork, t, showPrices);

  return (
    <Page size="A4" style={s.artworkPage}>
      {/* Image */}
      <View style={s.fullImageWrap}>
        {artwork.imageUrl ? (
          <Image src={artwork.imageUrl} style={s.fullImage} />
        ) : (
          <View style={s.placeholder}>
            <Text style={s.placeholderText}>{artwork.title}</Text>
          </View>
        )}
      </View>

      {/* Details */}
      <View style={s.fullDivider}>
        <Text style={s.fullTitle}>{artwork.title}</Text>
        <Text style={s.fullRefCode}>{artwork.reference_code}</Text>
        {rows.map((row) => (
          <View style={s.fullInfoRow} key={row.label}>
            <Text style={s.fullLabel}>{row.label}</Text>
            <Text style={s.fullValue}>{row.value}</Text>
          </View>
        ))}
      </View>

      <CatalogueFooter />
    </Page>
  );
}

// ---------------------------------------------------------------------------
// Grid-2 layout: two artworks per page (stacked vertically)
// ---------------------------------------------------------------------------

function Grid2Page({
  artworks,
  t,
  showPrices,
}: {
  artworks: CatalogueArtwork[];
  t: CatalogueTranslations;
  showPrices: boolean;
}) {
  return (
    <Page size="A4" style={s.artworkPage}>
      {artworks.map((artwork, index) => {
        const rows = buildDetailRows(artwork, t, showPrices);
        return (
          <View key={artwork.reference_code} style={s.g2Block}>
            {/* Separator between artworks */}
            {index > 0 && <View style={s.g2Separator} />}

            {/* Image */}
            <View style={s.g2ImageWrap}>
              {artwork.imageUrl ? (
                <Image src={artwork.imageUrl} style={s.g2Image} />
              ) : (
                <View style={s.placeholder}>
                  <Text style={s.placeholderText}>{artwork.title}</Text>
                </View>
              )}
            </View>

            {/* Details */}
            <View style={s.g2Divider}>
              <Text style={s.g2Title}>{artwork.title}</Text>
              <Text style={s.g2RefCode}>{artwork.reference_code}</Text>
              {rows.map((row) => (
                <View style={s.g2InfoRow} key={row.label}>
                  <Text style={s.g2Label}>{row.label}</Text>
                  <Text style={s.g2Value}>{row.value}</Text>
                </View>
              ))}
            </View>
          </View>
        );
      })}

      <CatalogueFooter />
    </Page>
  );
}

// ---------------------------------------------------------------------------
// Grid-4 layout: four artworks per page (2x2)
// ---------------------------------------------------------------------------

function Grid4Page({
  artworks,
  t,
  showPrices,
}: {
  artworks: CatalogueArtwork[];
  t: CatalogueTranslations;
  showPrices: boolean;
}) {
  const topRow = artworks.slice(0, 2);
  const bottomRow = artworks.slice(2, 4);

  const renderItem = (artwork: CatalogueArtwork, isRight: boolean) => {
    const dims = formatDimensions(
      artwork.height,
      artwork.width,
      artwork.depth,
      artwork.dimension_unit,
    );
    const editionText = formatEdition(
      artwork.edition_type,
      artwork.edition_number,
      artwork.edition_total,
      t,
    );

    const lines: string[] = [];
    if (artwork.medium) lines.push(artwork.medium);
    if (artwork.year != null) lines.push(String(artwork.year));
    if (dims) lines.push(dims);
    lines.push(editionText);

    return (
      <View
        style={isRight ? s.g4ItemRight : s.g4ItemLeft}
        key={artwork.reference_code}
      >
        {/* Image */}
        <View style={s.g4ImageWrap}>
          {artwork.imageUrl ? (
            <Image src={artwork.imageUrl} style={s.g4Image} />
          ) : (
            <View style={s.placeholderSmall}>
              <Text style={s.placeholderText}>{artwork.title}</Text>
            </View>
          )}
        </View>

        {/* Details */}
        <Text style={s.g4Title}>{artwork.title}</Text>
        <Text style={s.g4RefCode}>{artwork.reference_code}</Text>
        <Text style={s.g4DetailText}>{lines.join('  |  ')}</Text>
        {showPrices && artwork.price != null && artwork.price > 0 && (
          <Text style={s.g4PriceText}>
            {formatPrice(artwork.price, artwork.currency)}
          </Text>
        )}
      </View>
    );
  };

  return (
    <Page size="A4" style={s.artworkPage}>
      {/* Top row */}
      <View style={s.g4Row}>
        {topRow.map((aw, i) => renderItem(aw, i === 1))}
      </View>

      {/* Bottom row */}
      {bottomRow.length > 0 && (
        <View style={s.g4Row}>
          {bottomRow.map((aw, i) => renderItem(aw, i === 1))}
        </View>
      )}

      <CatalogueFooter />
    </Page>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export function CataloguePDF({
  title,
  subtitle,
  catalogueType,
  layout,
  artworks,
  showPrices,
  language,
  coverImageUrl,
}: CataloguePDFProps) {
  const t = TRANSLATIONS[language] ?? TRANSLATIONS.en;
  void catalogueType;

  return (
    <Document>
      {/* Cover page */}
      <CoverPage title={title} subtitle={subtitle} coverImageUrl={coverImageUrl} />

      {/* Artwork pages */}
      {layout === 'full-page' &&
        artworks.map((artwork) => (
          <FullPageArtwork
            key={artwork.reference_code}
            artwork={artwork}
            t={t}
            showPrices={showPrices}
          />
        ))}

      {layout === 'grid-2' &&
        chunkArray(artworks, 2).map((chunk, pageIndex) => (
          <Grid2Page
            key={`grid2-${pageIndex}`}
            artworks={chunk}
            t={t}
            showPrices={showPrices}
          />
        ))}

      {layout === 'grid-4' &&
        chunkArray(artworks, 4).map((chunk, pageIndex) => (
          <Grid4Page
            key={`grid4-${pageIndex}`}
            artworks={chunk}
            t={t}
            showPrices={showPrices}
          />
        ))}
    </Document>
  );
}
