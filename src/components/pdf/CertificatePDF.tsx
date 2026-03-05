// ---------------------------------------------------------------------------
// NOA Inventory -- Certificate of Authenticity PDF
// ---------------------------------------------------------------------------

import { Document, Page, View, Text, Image } from '@react-pdf/renderer';
import styles, { PDF_COLORS } from './PDFStyles';
import { PDFHeader, getCertificateTitle } from './PDFHeader';
import { ARTIST_NAME, COMPANY_NAME } from '../../lib/constants';

// ---------------------------------------------------------------------------
// Multi-language translations
// ---------------------------------------------------------------------------
interface TranslationStrings {
  certificateTitle: string;
  artist: string;
  title: string;
  referenceCode: string;
  medium: string;
  year: string;
  dimensions: string;
  framedDimensions: string;
  edition: string;
  certificateNo: string;
  issueDate: string;
  disclaimer: string;
  unique: string;
  artistProof: string;
  horsCommerce: string;
  epreuveArtiste: string;
  of: string; // e.g. "1 of 10"
}

const TRANSLATIONS: Record<string, TranslationStrings> = {
  en: {
    certificateTitle: 'Certificate of Authenticity',
    artist: 'Artist',
    title: 'Title',
    referenceCode: 'Reference Code',
    medium: 'Medium',
    year: 'Year',
    dimensions: 'Dimensions',
    framedDimensions: 'Framed Dimensions',
    edition: 'Edition',
    certificateNo: 'Certificate No.',
    issueDate: 'Issue Date',
    disclaimer:
      'This certificate confirms the authenticity of the above-described artwork. It has been issued by NOA Contemporary and is valid only in conjunction with the referenced artwork. Unauthorized reproduction of this certificate is prohibited.',
    unique: 'Unique',
    artistProof: 'Artist Proof',
    horsCommerce: 'Hors Commerce',
    epreuveArtiste: "Epreuve d'Artiste",
    of: 'of',
  },
  de: {
    certificateTitle: 'Echtheitszertifikat',
    artist: 'K\u00fcnstler',
    title: 'Titel',
    referenceCode: 'Referenzcode',
    medium: 'Technik',
    year: 'Jahr',
    dimensions: 'Ma\u00dfe',
    framedDimensions: 'Gerahmte Ma\u00dfe',
    edition: 'Auflage',
    certificateNo: 'Zertifikat Nr.',
    issueDate: 'Ausstellungsdatum',
    disclaimer:
      'Dieses Zertifikat best\u00e4tigt die Echtheit des oben beschriebenen Kunstwerks. Es wurde von NOA Contemporary ausgestellt und ist nur in Verbindung mit dem referenzierten Kunstwerk g\u00fcltig. Die unbefugte Vervielf\u00e4ltigung dieses Zertifikats ist untersagt.',
    unique: 'Unikat',
    artistProof: 'K\u00fcnstlerexemplar',
    horsCommerce: 'Hors Commerce',
    epreuveArtiste: "Epreuve d'Artiste",
    of: 'von',
  },
  fr: {
    certificateTitle: "Certificat d'Authenticit\u00e9",
    artist: 'Artiste',
    title: 'Titre',
    referenceCode: 'Code de r\u00e9f\u00e9rence',
    medium: 'Technique',
    year: 'Ann\u00e9e',
    dimensions: 'Dimensions',
    framedDimensions: 'Dimensions encadr\u00e9',
    edition: '\u00c9dition',
    certificateNo: 'Certificat N\u00b0',
    issueDate: "Date d'\u00e9mission",
    disclaimer:
      "Ce certificat confirme l'authenticit\u00e9 de l'\u0153uvre d\u00e9crite ci-dessus. Il a \u00e9t\u00e9 \u00e9mis par NOA Contemporary et n'est valable qu'en association avec l'\u0153uvre r\u00e9f\u00e9renc\u00e9e. La reproduction non autoris\u00e9e de ce certificat est interdite.",
    unique: 'Unique',
    artistProof: "Epreuve d'Artiste",
    horsCommerce: 'Hors Commerce',
    epreuveArtiste: "Epreuve d'Artiste",
    of: 'de',
  },
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
export interface CertificatePDFProps {
  artwork: {
    title: string;
    reference_code: string;
    medium: string | null;
    year: number | null;
    height: number | null;
    width: number | null;
    depth: number | null;
    dimension_unit: string;
    framed_height: number | null;
    framed_width: number | null;
    framed_depth: number | null;
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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function CertificatePDF({
  artwork,
  certificate,
  artworkImageUrl,
  signatureUrl,
  language,
}: CertificatePDFProps) {
  const t = TRANSLATIONS[language] ?? TRANSLATIONS.en;

  const unframedDimensions = formatDimensions(
    artwork.height,
    artwork.width,
    artwork.depth,
    artwork.dimension_unit,
  );

  const framedDimensions = formatDimensions(
    artwork.framed_height,
    artwork.framed_width,
    artwork.framed_depth,
    artwork.dimension_unit,
  );

  const editionText = formatEdition(
    artwork.edition_type,
    artwork.edition_number,
    artwork.edition_total,
    t,
  );

  // Build detail rows -- only include rows that have a value
  const detailRows: { label: string; value: string }[] = [
    { label: t.artist, value: ARTIST_NAME },
    { label: t.title, value: artwork.title },
    { label: t.referenceCode, value: artwork.reference_code },
  ];

  if (artwork.medium) {
    detailRows.push({ label: t.medium, value: artwork.medium });
  }
  if (artwork.year != null) {
    detailRows.push({ label: t.year, value: String(artwork.year) });
  }
  if (unframedDimensions) {
    detailRows.push({ label: t.dimensions, value: unframedDimensions });
  }
  if (framedDimensions) {
    detailRows.push({ label: t.framedDimensions, value: framedDimensions });
  }
  detailRows.push({ label: t.edition, value: editionText });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* ----- Header -------------------------------------------------- */}
        <PDFHeader
          title={getCertificateTitle(language)}
          subtitle={certificate.certificate_number}
          language={language}
        />

        {/* ----- Artwork Image ------------------------------------------- */}
        {artworkImageUrl && (
          <View style={styles.artworkImageContainer}>
            <Image src={artworkImageUrl} style={styles.artworkImage} />
          </View>
        )}

        {/* ----- Artwork Details Grid ------------------------------------ */}
        <View style={styles.infoGrid}>
          {detailRows.map((row) => (
            <View style={styles.infoRow} key={row.label}>
              <Text style={styles.infoLabel}>{row.label}</Text>
              <Text style={styles.infoValue}>{row.value}</Text>
            </View>
          ))}
        </View>

        {/* ----- Certificate Info ---------------------------------------- */}
        <View style={styles.infoGrid}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t.certificateNo}</Text>
            <Text style={styles.infoValue}>{certificate.certificate_number}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t.issueDate}</Text>
            <Text style={styles.infoValue}>{certificate.issue_date}</Text>
          </View>
        </View>

        {/* ----- QR Code & Signature ------------------------------------- */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            marginTop: 10,
          }}
        >
          {/* QR Code */}
          {certificate.qr_code_url ? (
            <View>
              <Image src={certificate.qr_code_url} style={styles.qrCode} />
            </View>
          ) : (
            <View />
          )}

          {/* Signature area */}
          <View style={styles.signatureArea}>
            {signatureUrl ? (
              <Image src={signatureUrl} style={styles.signatureImage} />
            ) : (
              <View style={styles.signatureLine} />
            )}
            <Text style={styles.signatureLabel}>{COMPANY_NAME}</Text>
          </View>
        </View>

        {/* ----- Disclaimer ---------------------------------------------- */}
        <Text style={styles.disclaimer}>{t.disclaimer}</Text>

        {/* ----- Footer -------------------------------------------------- */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            {`\u00a9 ${COMPANY_NAME}`}
          </Text>
          <Text
            style={styles.pageNumber}
            render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}
