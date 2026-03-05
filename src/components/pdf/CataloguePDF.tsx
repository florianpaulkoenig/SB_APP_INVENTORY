// ---------------------------------------------------------------------------
// NOA Inventory -- Catalogue PDF
// Generates exhibition, collector, or gallery catalogues using @react-pdf/renderer.
// ---------------------------------------------------------------------------

import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';
import { PDF_COLORS } from './PDFStyles';
import { ARTIST_NAME, COMPANY_NAME } from '../../lib/constants';

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

/** Format dimensions as "H x W x D unit", skipping null parts. */
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

/** Format edition string according to type and language. */
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

/** Format price with currency symbol. */
function formatPrice(price: number, currency: string): string {
  const symbol = CURRENCY_SYMBOLS[currency] ?? currency;
  const formatted = price.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  // Place symbol before or after depending on currency
  if (currency === 'EUR') return `${formatted} ${symbol}`;
  if (currency === 'CHF') return `${symbol} ${formatted}`;
  return `${symbol}${formatted}`;
}

/** Chunk an array into groups of N. */
function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

// ---------------------------------------------------------------------------
// Internal styles (catalogue-specific, extending shared PDF_COLORS)
// ---------------------------------------------------------------------------
const catStyles = StyleSheet.create({
  // ---- Cover page --------------------------------------------------------
  coverPage: {
    fontFamily: 'Helvetica',
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
    fontFamily: 'Helvetica-Bold',
    fontSize: 32,
    color: PDF_COLORS.primary900,
    textTransform: 'uppercase',
    letterSpacing: 4,
    textAlign: 'center',
    marginBottom: 12,
  },
  coverSubtitle: {
    fontFamily: 'Helvetica',
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
    fontFamily: 'Helvetica',
    fontSize: 16,
    color: PDF_COLORS.primary700,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  coverCompany: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: PDF_COLORS.primary400,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },

  // ---- Artwork pages (shared) --------------------------------------------
  artworkPage: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: PDF_COLORS.primary900,
    backgroundColor: PDF_COLORS.white,
    paddingTop: 50,
    paddingBottom: 60,
    paddingHorizontal: 50,
  },

  // ---- Full-page layout --------------------------------------------------
  fullPageImageContainer: {
    alignItems: 'center',
    marginBottom: 24,
    flex: 1,
    justifyContent: 'center',
  },
  fullPageImage: {
    maxHeight: 420,
    maxWidth: '100%',
    objectFit: 'contain',
  },
  fullPageDetails: {
    borderTopWidth: 0.5,
    borderTopColor: PDF_COLORS.border,
    paddingTop: 16,
  },
  fullPageTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 18,
    color: PDF_COLORS.primary900,
    marginBottom: 4,
  },
  fullPageRefCode: {
    fontFamily: 'Helvetica',
    fontSize: 8,
    color: PDF_COLORS.primary400,
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  fullPageInfoRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  fullPageLabel: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
    color: PDF_COLORS.primary400,
    width: 100,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fullPageValue: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: PDF_COLORS.primary900,
    flex: 1,
  },

  // ---- Grid-2 layout -----------------------------------------------------
  grid2Container: {
    flex: 1,
  },
  grid2Item: {
    flex: 1,
    marginBottom: 20,
  },
  grid2ImageContainer: {
    alignItems: 'center',
    marginBottom: 12,
    height: 220,
    justifyContent: 'center',
  },
  grid2Image: {
    maxHeight: 220,
    maxWidth: '100%',
    objectFit: 'contain',
  },
  grid2Details: {
    borderTopWidth: 0.5,
    borderTopColor: PDF_COLORS.border,
    paddingTop: 10,
  },
  grid2Title: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 12,
    color: PDF_COLORS.primary900,
    marginBottom: 2,
  },
  grid2RefCode: {
    fontFamily: 'Helvetica',
    fontSize: 7,
    color: PDF_COLORS.primary400,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  grid2InfoRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  grid2Label: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
    color: PDF_COLORS.primary400,
    width: 80,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  grid2Value: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: PDF_COLORS.primary900,
    flex: 1,
  },
  grid2Separator: {
    borderBottomWidth: 0.5,
    borderBottomColor: PDF_COLORS.border,
    marginVertical: 10,
  },

  // ---- Grid-4 layout -----------------------------------------------------
  grid4Row: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  grid4Item: {
    width: '48%',
    marginRight: '4%',
  },
  grid4ItemRight: {
    width: '48%',
  },
  grid4ImageContainer: {
    alignItems: 'center',
    marginBottom: 8,
    height: 140,
    justifyContent: 'center',
  },
  grid4Image: {
    maxHeight: 140,
    maxWidth: '100%',
    objectFit: 'contain',
  },
  grid4Title: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
    color: PDF_COLORS.primary900,
    marginBottom: 1,
  },
  grid4RefCode: {
    fontFamily: 'Helvetica',
    fontSize: 6,
    color: PDF_COLORS.primary400,
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  grid4DetailText: {
    fontFamily: 'Helvetica',
    fontSize: 7,
    color: PDF_COLORS.primary700,
    lineHeight: 1.4,
  },
  grid4PriceText: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
    color: PDF_COLORS.primary900,
    marginTop: 3,
  },

  // ---- Footer ------------------------------------------------------------
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
    fontFamily: 'Helvetica',
    fontSize: 7,
    color: PDF_COLORS.primary400,
  },
  pageNumber: {
    fontFamily: 'Helvetica',
    fontSize: 7,
    color: PDF_COLORS.primary400,
  },

  // ---- No-image placeholder -----------------------------------------------
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: PDF_COLORS.backgroundLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderText: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: PDF_COLORS.primary400,
  },
});

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Page footer with copyright and page number (render prop skips cover). */
function CatalogueFooter() {
  return (
    <View style={catStyles.footer} fixed>
      <Text style={catStyles.footerText}>
        {`\u00a9 ${COMPANY_NAME}`}
      </Text>
      <Text
        style={catStyles.pageNumber}
        render={({ pageNumber }) =>
          pageNumber > 1 ? `${pageNumber - 1}` : ''
        }
      />
    </View>
  );
}

/** Cover page for the catalogue. */
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
    <Page size="A4" style={catStyles.coverPage}>
      {/* Cover image */}
      {coverImageUrl && (
        <View style={catStyles.coverImageContainer}>
          <Image src={coverImageUrl} style={catStyles.coverImage} />
        </View>
      )}

      {/* Title block */}
      <Text style={catStyles.coverTitle}>{title}</Text>
      {subtitle && <Text style={catStyles.coverSubtitle}>{subtitle}</Text>}

      {/* Gold accent line */}
      <View style={catStyles.coverAccentLine} />

      {/* Artist + branding */}
      <Text style={catStyles.coverArtist}>{ARTIST_NAME}</Text>
      <Text style={catStyles.coverCompany}>{COMPANY_NAME}</Text>
    </Page>
  );
}

// ---------------------------------------------------------------------------
// Artwork detail renderers per layout
// ---------------------------------------------------------------------------

/** Build the common detail lines for an artwork. */
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

  if (showPrices && artwork.price != null) {
    rows.push({ label: t.price, value: formatPrice(artwork.price, artwork.currency) });
  }

  return rows;
}

/** Full-page layout: one artwork per page with large image. */
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
    <Page size="A4" style={catStyles.artworkPage}>
      {/* Image */}
      <View style={catStyles.fullPageImageContainer}>
        {artwork.imageUrl ? (
          <Image src={artwork.imageUrl} style={catStyles.fullPageImage} />
        ) : (
          <View style={catStyles.imagePlaceholder}>
            <Text style={catStyles.imagePlaceholderText}>{artwork.title}</Text>
          </View>
        )}
      </View>

      {/* Details */}
      <View style={catStyles.fullPageDetails}>
        <Text style={catStyles.fullPageTitle}>{artwork.title}</Text>
        <Text style={catStyles.fullPageRefCode}>{artwork.reference_code}</Text>
        {rows.map((row) => (
          <View style={catStyles.fullPageInfoRow} key={row.label}>
            <Text style={catStyles.fullPageLabel}>{row.label}</Text>
            <Text style={catStyles.fullPageValue}>{row.value}</Text>
          </View>
        ))}
      </View>

      <CatalogueFooter />
    </Page>
  );
}

/** Grid-2 layout: two artworks per page. */
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
    <Page size="A4" style={catStyles.artworkPage}>
      <View style={catStyles.grid2Container}>
        {artworks.map((artwork, index) => {
          const rows = buildDetailRows(artwork, t, showPrices);
          return (
            <View key={artwork.reference_code}>
              {index > 0 && <View style={catStyles.grid2Separator} />}
              <View style={catStyles.grid2Item}>
                {/* Image */}
                <View style={catStyles.grid2ImageContainer}>
                  {artwork.imageUrl ? (
                    <Image src={artwork.imageUrl} style={catStyles.grid2Image} />
                  ) : (
                    <View style={catStyles.imagePlaceholder}>
                      <Text style={catStyles.imagePlaceholderText}>{artwork.title}</Text>
                    </View>
                  )}
                </View>

                {/* Details */}
                <View style={catStyles.grid2Details}>
                  <Text style={catStyles.grid2Title}>{artwork.title}</Text>
                  <Text style={catStyles.grid2RefCode}>{artwork.reference_code}</Text>
                  {rows.map((row) => (
                    <View style={catStyles.grid2InfoRow} key={row.label}>
                      <Text style={catStyles.grid2Label}>{row.label}</Text>
                      <Text style={catStyles.grid2Value}>{row.value}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          );
        })}
      </View>

      <CatalogueFooter />
    </Page>
  );
}

/** Grid-4 layout: four artworks per page in a 2x2 grid. */
function Grid4Page({
  artworks,
  t,
  showPrices,
}: {
  artworks: CatalogueArtwork[];
  t: CatalogueTranslations;
  showPrices: boolean;
}) {
  // Pad to exactly 4 slots (or fewer on the last page)
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

    // Build a compact text block for grid-4
    const lines: string[] = [];
    if (artwork.medium) lines.push(artwork.medium);
    if (artwork.year != null) lines.push(String(artwork.year));
    if (dims) lines.push(dims);
    lines.push(editionText);

    return (
      <View style={isRight ? catStyles.grid4ItemRight : catStyles.grid4Item} key={artwork.reference_code}>
        {/* Image */}
        <View style={catStyles.grid4ImageContainer}>
          {artwork.imageUrl ? (
            <Image src={artwork.imageUrl} style={catStyles.grid4Image} />
          ) : (
            <View style={catStyles.imagePlaceholder}>
              <Text style={catStyles.imagePlaceholderText}>{artwork.title}</Text>
            </View>
          )}
        </View>

        {/* Details */}
        <Text style={catStyles.grid4Title}>{artwork.title}</Text>
        <Text style={catStyles.grid4RefCode}>{artwork.reference_code}</Text>
        <Text style={catStyles.grid4DetailText}>{lines.join('  |  ')}</Text>
        {showPrices && artwork.price != null && (
          <Text style={catStyles.grid4PriceText}>
            {formatPrice(artwork.price, artwork.currency)}
          </Text>
        )}
      </View>
    );
  };

  return (
    <Page size="A4" style={catStyles.artworkPage}>
      {/* Top row */}
      <View style={catStyles.grid4Row}>
        {topRow.map((aw, i) => renderItem(aw, i === 1))}
      </View>

      {/* Bottom row */}
      {bottomRow.length > 0 && (
        <View style={catStyles.grid4Row}>
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

  // Use the catalogueType label as subtitle fallback
  void catalogueType; // type is reflected in the title/subtitle by the caller

  return (
    <Document>
      {/* ----- Cover page ------------------------------------------------ */}
      <CoverPage
        title={title}
        subtitle={subtitle}
        coverImageUrl={coverImageUrl}
      />

      {/* ----- Artwork pages --------------------------------------------- */}
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
