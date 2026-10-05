// ---------------------------------------------------------------------------
// NOA Inventory -- Certificate of Authenticity PDF
// NOA dossier style (reference: NOA_SB_Basisdokumente/COA.pdf): A4 landscape,
// black header band, artwork image left, certificate details right.
// Bebas Neue for headlines, Manrope for text. Every measurement below was
// matched against the reference layout (scratch/coa design PDF, A4 landscape):
// rule at y=185, detail rows on a 19.4pt pitch, place & date line at y=422,
// signature line at y=477, disclaimer bottom at y=530.
// ---------------------------------------------------------------------------

import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';
import './PDFStyles'; // registers Bebas Neue / Manrope / script fallback fonts
import { MixedText } from './MixedText';
import { ARTIST_NAME, COMPANY_NAME } from '../../lib/constants';

// ---------------------------------------------------------------------------
// Multi-language translations
// ---------------------------------------------------------------------------
interface TranslationStrings {
  certificateTitle: string;
  intro: string;
  title: string;
  titleOriginal: string;
  medium: string;
  year: string;
  dimensions: string;
  diameter: string;
  framedDimensions: string;
  weight: string;
  edition: string;
  code: string;
  placeDate: string;
  signature: string;
  disclaimer: string;
  unique: string;
  artistProof: string;
  horsCommerce: string;
  epreuveArtiste: string;
  of: string;
  provenance: string;
  currentOwner: string;
}

const TRANSLATIONS: Record<string, TranslationStrings> = {
  en: {
    certificateTitle: 'Certificate of Authenticity',
    intro:
      `This is to certify that the work described below is an original work by ${ARTIST_NAME}, created by the artist’s own hand.`,
    title: 'Title',
    titleOriginal: 'Original Title',
    medium: 'Medium',
    year: 'Year',
    dimensions: 'Dimensions',
    diameter: 'Diameter',
    framedDimensions: 'Framed',
    weight: 'Weight',
    edition: 'Edition',
    code: 'Code',
    placeDate: 'Place & Date',
    signature: 'Signature',
    disclaimer:
      `This certificate should remain with the work. Please inform ${COMPANY_NAME} of any change of ownership.`,
    unique: 'Unique work',
    artistProof: 'Artist Proof',
    horsCommerce: 'Hors Commerce',
    epreuveArtiste: "Epreuve d'Artiste",
    of: 'of',
    provenance: 'Provenance',
    currentOwner: 'Current Owner',
  },
  de: {
    certificateTitle: 'Echtheitszertifikat',
    intro:
      `Hiermit wird bestätigt, dass das nachfolgend beschriebene Werk ein Original von ${ARTIST_NAME} ist, eigenhändig vom Künstler geschaffen.`,
    title: 'Titel',
    titleOriginal: 'Originaltitel',
    medium: 'Technik',
    year: 'Jahr',
    dimensions: 'Masse',
    diameter: 'Durchmesser',
    framedDimensions: 'Gerahmt',
    weight: 'Gewicht',
    edition: 'Auflage',
    code: 'Code',
    placeDate: 'Ort & Datum',
    signature: 'Unterschrift',
    disclaimer:
      `Dieses Zertifikat sollte stets beim Werk verbleiben. Bitte informieren Sie ${COMPANY_NAME} über jeden Eigentümerwechsel.`,
    unique: 'Unikat',
    artistProof: 'Künstlerexemplar',
    horsCommerce: 'Hors Commerce',
    epreuveArtiste: "Epreuve d'Artiste",
    of: 'von',
    provenance: 'Provenienz',
    currentOwner: 'Aktueller Eigentümer',
  },
  fr: {
    certificateTitle: "Certificat d'Authenticité",
    intro:
      `Nous certifions que l’œuvre décrite ci-dessous est une œuvre originale de ${ARTIST_NAME}, réalisée de la main de l’artiste.`,
    title: 'Titre',
    titleOriginal: 'Titre original',
    medium: 'Technique',
    year: 'Année',
    dimensions: 'Dimensions',
    diameter: 'Diamètre',
    framedDimensions: 'Encadré',
    weight: 'Poids',
    edition: 'Édition',
    code: 'Code',
    placeDate: 'Lieu & date',
    signature: 'Signature',
    disclaimer:
      `Ce certificat doit toujours accompagner l’œuvre. Merci d’informer ${COMPANY_NAME} de tout changement de propriétaire.`,
    unique: 'Œuvre unique',
    artistProof: "Epreuve d'Artiste",
    horsCommerce: 'Hors Commerce',
    epreuveArtiste: "Epreuve d'Artiste",
    of: 'de',
    provenance: 'Provenance',
    currentOwner: 'Propriétaire actuel',
  },
};

// ---------------------------------------------------------------------------
// Month names for formatted issue date
// ---------------------------------------------------------------------------
const MONTH_NAMES: Record<string, string[]> = {
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  de: ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'],
  fr: ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'],
};

// ---------------------------------------------------------------------------
// Layout (A4 landscape = 842 x 595 pt)
// ---------------------------------------------------------------------------
const PAGE_W = 842;
const MARGIN = 45;
const HEADER_H = 45;
const BODY_TOP = 68;
const IMAGE_SIZE = 425;
const COLUMN_GAP = 35;
const RIGHT_W = PAGE_W - 2 * MARGIN - IMAGE_SIZE - COLUMN_GAP;

const HEADLINE_FONT = 'BebasNeue';

const BLACK = '#000000';
const GREY = '#555555';
const RULE_GREY = '#999999';

const s = StyleSheet.create({
  page: {
    fontFamily: 'Manrope',
    fontSize: 10,
    color: BLACK,
    backgroundColor: '#ffffff',
  },

  // ---- Header band --------------------------------------------------------
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: HEADER_H,
    backgroundColor: BLACK,
    paddingHorizontal: MARGIN,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerBrand: {
    fontFamily: HEADLINE_FONT,
    fontSize: 15,
    letterSpacing: 0.16,
    color: '#ffffff',
    textTransform: 'uppercase',
  },
  headerLabel: {
    fontSize: 8.5,
    letterSpacing: 1.8,
    color: '#ffffff',
    textTransform: 'uppercase',
  },

  // ---- Body ---------------------------------------------------------------
  body: {
    position: 'absolute',
    top: BODY_TOP,
    left: MARGIN,
    right: MARGIN,
    bottom: 65,
    flexDirection: 'row',
  },

  // Left column — artwork image + caption
  imageColumn: {
    width: IMAGE_SIZE,
  },
  imageBox: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholder: {
    backgroundColor: '#f2f2f2',
  },
  artworkImage: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    objectFit: 'contain',
  },
  caption: {
    marginTop: 7,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  captionText: {
    fontSize: 7.5,
    letterSpacing: 1.1,
    color: GREY,
    textTransform: 'uppercase',
  },

  // Right column — certificate text. Positioned on its own so the Bebas
  // headline's cap height sits level with the image top (2.9pt above it).
  textColumn: {
    position: 'absolute',
    top: BODY_TOP - 2.9,
    bottom: 65,
    left: MARGIN + IMAGE_SIZE + COLUMN_GAP,
    width: RIGHT_W,
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  artistName: {
    fontFamily: HEADLINE_FONT,
    fontSize: 26,
    lineHeight: 1.1,
    textTransform: 'uppercase',
  },
  certTitle: {
    fontSize: 13,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 5.7,
  },
  intro: {
    fontSize: 10,
    lineHeight: 1.43,
    marginTop: 19,
    maxWidth: 280, // wraps after "original" like the reference
  },
  rule: {
    borderTopWidth: 0.8,
    borderTopColor: BLACK,
    marginTop: 20.3,
    marginBottom: 10.9,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  label: {
    width: 96,
    fontSize: 8,
    fontWeight: 500,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    paddingTop: 1.5,
  },
  value: {
    flex: 1,
    fontSize: 10,
    lineHeight: 1.3,
  },
  lineText: {
    fontSize: 10,
    lineHeight: 1.3,
  },
  valueCurrent: {
    flex: 1,
    fontSize: 10,
    lineHeight: 1.3,
    fontWeight: 600,
  },

  // Place & date / signature lines
  lineRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  lineValue: {
    flex: 1,
    borderBottomWidth: 0.8,
    borderBottomColor: RULE_GREY,
    paddingBottom: 6,
  },
  signatureRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: 54,
  },
  signatureArea: {
    flex: 1,
    position: 'relative',
  },
  // Sits above the line without pushing the layout — the line positions stay
  // identical with and without the printed signature
  signatureImage: {
    position: 'absolute',
    left: 0,
    bottom: 16,
    width: 130,
    height: 42,
    objectFit: 'contain',
  },
  signatureLine: {
    borderTopWidth: 0.8,
    borderTopColor: RULE_GREY,
    paddingTop: 3.2,
  },
  signatureName: {
    fontSize: 7.5,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  disclaimer: {
    fontSize: 8.5,
    lineHeight: 1.45,
    color: GREY,
    marginTop: 14.4,
  },

  // ---- Footer -------------------------------------------------------------
  footer: {
    position: 'absolute',
    bottom: 26,
    left: MARGIN,
    right: MARGIN,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: {
    fontSize: 7.5,
    letterSpacing: 1.1,
    color: GREY,
    textTransform: 'uppercase',
  },
});

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
export interface CertificateProvenanceEntry {
  owner_name: string;
  owner_type: string;
  acquisition_date: string | null;
  acquisition_method: string | null;
  notes: string | null;
}

export interface CertificatePDFProps {
  artwork: {
    title: string;
    title_secondary?: string | null;
    reference_code: string;
    medium: string | null;
    year: number | null;
    /** Place printed in the "Place & Date" line. Default Niederönz (studio). */
    placeOfCreation?: string | null;
    height: number | null;
    width: number | null;
    depth: number | null;
    dimension_unit: string;
    framed_height: number | null;
    framed_width: number | null;
    framed_depth: number | null;
    /** Circular work — printed as a single "Diameter" line */
    is_circular?: boolean | null;
    /** Weight in kg */
    weight?: number | null;
    edition_type: string;
    edition_number: number | null;
    edition_total: number | null;
  };
  certificate: {
    certificate_number: string;
    issue_date: string;
    qr_code_url: string | null;
  };
  artworkImageUrl?: string | null;
  signatureUrl?: string | null;
  language: 'en' | 'de' | 'fr';
  provenanceEntries?: CertificateProvenanceEntry[];
  currentOwner?: string | null;
  currentOwnerDate?: string | null;
  /** Show the provenance block (entries + current owner). Default true. */
  showProvenance?: boolean;
  /** Print the artist's signature image above the signature line. Default true.
   *  When off (or no image), the line stays empty for a handwritten signature. */
  showSignature?: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
export const DEFAULT_CERTIFICATE_PLACE = 'Niederönz';

function formatDimensions(
  h: number | null,
  w: number | null,
  d: number | null,
  unit: string,
): string | null {
  const parts = [h, w, d].filter((v): v is number => v != null);
  if (parts.length === 0) return null;
  return `${parts.join(' × ')} ${unit}`;
}

function formatEdition(
  editionType: string,
  editionNumber: number | null,
  editionTotal: number | null,
  t: TranslationStrings,
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

function ordinal(day: number): string {
  const mod100 = day % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${day}th`;
  switch (day % 10) {
    case 1: return `${day}st`;
    case 2: return `${day}nd`;
    case 3: return `${day}rd`;
    default: return `${day}th`;
  }
}

function formatIssueDateFull(dateStr: string, language: string): string {
  try {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    const day = d.getDate();
    const month = (MONTH_NAMES[language] ?? MONTH_NAMES.en)[d.getMonth()];
    const year = d.getFullYear();
    if (language === 'de') return `${day}. ${month} ${year}`;
    if (language === 'fr') return `${day === 1 ? '1er' : day} ${month} ${year}`;
    return `${month} ${ordinal(day)}, ${year}`;
  } catch {
    return dateStr;
  }
}

// Formats an acquisition date as "Month YYYY" (abstracted, no day)
function formatAcquisitionDate(dateStr: string | null | undefined, language: string): string | null {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    const month = (MONTH_NAMES[language] ?? MONTH_NAMES.en)[d.getMonth()];
    return `${month} ${d.getFullYear()}`;
  } catch {
    return dateStr;
  }
}

function formatWeight(weight: number | null | undefined): string | null {
  if (weight == null) return null;
  return `${String(weight).replace(/\.0+$/, '')} kg`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function CertificatePDF({
  artwork,
  certificate,
  artworkImageUrl,
  signatureUrl,
  language,
  provenanceEntries,
  currentOwner,
  currentOwnerDate,
  showProvenance = true,
  showSignature = true,
}: CertificatePDFProps) {
  const t = TRANSLATIONS[language] ?? TRANSLATIONS.en;

  const diameter = artwork.is_circular ? (artwork.height ?? artwork.width) : null;
  const dimensions = diameter != null
    ? `${diameter} ${artwork.dimension_unit}`
    : formatDimensions(artwork.height, artwork.width, artwork.depth, artwork.dimension_unit);
  const framedRaw = formatDimensions(
    artwork.framed_height,
    artwork.framed_width,
    artwork.framed_depth,
    artwork.dimension_unit,
  );
  // Framed dimensions only add information when they differ from the work itself
  const framedDimensions = framedRaw && framedRaw !== dimensions ? framedRaw : null;
  const weight = formatWeight(artwork.weight);
  const editionText = formatEdition(artwork.edition_type, artwork.edition_number, artwork.edition_total, t);
  const place = artwork.placeOfCreation?.trim() || DEFAULT_CERTIFICATE_PLACE;
  const placeAndDate = `${place}, ${formatIssueDateFull(certificate.issue_date, language)}`;

  // Detail rows — only rows that have a value, in the reference order
  const detailRows: { label: string; value: string; isCurrent?: boolean }[] = [
    { label: t.title, value: artwork.title },
  ];
  if (artwork.title_secondary) {
    // Own row so the original-script title renders in its script's font
    detailRows.push({ label: t.titleOriginal, value: artwork.title_secondary });
  }
  if (artwork.year != null) detailRows.push({ label: t.year, value: String(artwork.year) });
  if (artwork.medium) detailRows.push({ label: t.medium, value: artwork.medium });
  if (dimensions) detailRows.push({ label: diameter != null ? t.diameter : t.dimensions, value: dimensions });
  if (framedDimensions) detailRows.push({ label: t.framedDimensions, value: framedDimensions });
  if (weight) detailRows.push({ label: t.weight, value: weight });
  detailRows.push({ label: t.edition, value: editionText });
  detailRows.push({ label: t.code, value: artwork.reference_code });

  // Provenance — appended to the detail table, label only on the first line
  if (showProvenance) {
    const lines: { value: string; isCurrent: boolean }[] = [
      ...(provenanceEntries ?? []).map((e) => {
        const methodLabel = e.acquisition_method === 'creation'
          ? (artwork.year ? `Creation in ${artwork.year}` : 'Creation')
          : e.acquisition_method
            ? e.acquisition_method.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
            : undefined;
        return {
          value: [e.owner_name, formatAcquisitionDate(e.acquisition_date, language), methodLabel, e.notes ?? undefined]
            .filter(Boolean)
            .join(' · '),
          isCurrent: false,
        };
      }),
      ...(currentOwner
        ? [{
            value: [currentOwner, formatAcquisitionDate(currentOwnerDate, language), t.currentOwner]
              .filter(Boolean)
              .join(' · '),
            isCurrent: true,
          }]
        : []),
    ];
    lines.forEach((line, i) =>
      detailRows.push({ label: i === 0 ? t.provenance : '', value: line.value, isCurrent: line.isCurrent }),
    );
  }

  // Tighten row spacing when provenance makes the table long — everything
  // must fit on one sheet. (No wrap={false} on the Page: in react-pdf 4 it
  // makes the page height follow the content instead of A4.)
  // 6.4 → 19.4pt row pitch as in the reference; tighter when provenance adds rows
  const rowGap = detailRows.length > 11 ? 2 : detailRows.length > 9 ? 3.5 : detailRows.length > 7 ? 5 : 6.4;

  const caption = [artwork.title, artwork.year != null ? String(artwork.year) : null, artwork.medium]
    .filter(Boolean)
    .join(' · ');

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={s.page}>
        {/* ----- Header band ---------------------------------------------- */}
        <View style={s.header}>
          <Text style={s.headerBrand}>{COMPANY_NAME}</Text>
          <Text style={s.headerLabel}>{t.certificateTitle}</Text>
        </View>

        <View style={s.body}>
          {/* ----- Left: artwork image + caption -------------------------- */}
          <View style={s.imageColumn}>
            <View style={artworkImageUrl ? s.imageBox : [s.imageBox, s.imagePlaceholder]}>
              {artworkImageUrl && <Image src={artworkImageUrl} style={s.artworkImage} />}
            </View>
            <View style={s.caption}>
              <MixedText style={[s.captionText, { maxWidth: IMAGE_SIZE - 90 }]}>{caption}</MixedText>
              <Text style={s.captionText}>{artwork.reference_code}</Text>
            </View>
          </View>

        </View>

        {/* ----- Right: certificate text ---------------------------------- */}
        <View style={s.textColumn}>
            <View>
              <Text style={s.artistName}>{ARTIST_NAME}</Text>
              <Text style={s.certTitle}>{t.certificateTitle}</Text>
              <Text style={s.intro}>{t.intro}</Text>

              <View style={s.rule} />

              {detailRows.map((row, i) => (
                <View style={[s.row, { marginBottom: rowGap }]} key={`${row.label}-${i}`}>
                  <Text style={s.label}>{row.label}</Text>
                  <MixedText style={row.isCurrent ? s.valueCurrent : s.value}>{row.value}</MixedText>
                </View>
              ))}
            </View>

            <View style={{ marginTop: 12 }}>
              {/* Place & date */}
              <View style={s.lineRow}>
                <Text style={[s.label, { paddingBottom: 0 }]}>{t.placeDate}</Text>
                <View style={s.lineValue}>
                  <Text style={s.lineText}>{placeAndDate}</Text>
                </View>
              </View>

              {/* Signature */}
              <View style={s.signatureRow}>
                <Text style={[s.label, { paddingBottom: 1 }]}>{t.signature}</Text>
                <View style={s.signatureArea}>
                  {showSignature && signatureUrl && <Image src={signatureUrl} style={s.signatureImage} />}
                  <View style={s.signatureLine}>
                    <Text style={s.signatureName}>{ARTIST_NAME}</Text>
                  </View>
                </View>
              </View>

              <Text style={s.disclaimer}>{t.disclaimer}</Text>
            </View>
        </View>

        {/* ----- Footer --------------------------------------------------- */}
        <View style={s.footer}>
          <Text style={s.footerText}>{`© ${ARTIST_NAME} · ${COMPANY_NAME}`}</Text>
          <Text style={s.footerText}>noacontemporary.com</Text>
        </View>
      </Page>
    </Document>
  );
}
