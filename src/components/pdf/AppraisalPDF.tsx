// ---------------------------------------------------------------------------
// NOA Inventory -- Artwork Appraisal PDF
// Formal appraisal document for insurance, resale, estate or donation.
// ---------------------------------------------------------------------------

import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';
import styles, { PDF_COLORS, pdfFont } from './PDFStyles';
import { PDFHeader } from './PDFHeader';
import { ARTIST_NAME, COMPANY_NAME } from '../../lib/constants';
import type { AppraisalPurpose } from '../../types/database';

// ---------------------------------------------------------------------------
// Multi-language translations
// ---------------------------------------------------------------------------

interface TranslationStrings {
  appraisalTitle: string;
  appraisalNumber: string;
  artist: string;
  title: string;
  referenceCode: string;
  medium: string;
  year: string;
  dimensions: string;
  edition: string;
  condition: string;
  appraisalDate: string;
  appraisedValue: string;
  purpose: string;
  appraiser: string;
  credentials: string;
  signature: string;
  notes: string;
  purposeLabels: Record<AppraisalPurpose, string>;
  disclaimer: string;
  unique: string;
  artistProof: string;
  horsCommerce: string;
  epreuveArtiste: string;
  of: string;
}

const TRANSLATIONS: Record<string, TranslationStrings> = {
  en: {
    appraisalTitle: 'Artwork Appraisal',
    appraisalNumber: 'Appraisal No.',
    artist: 'Artist',
    title: 'Title',
    referenceCode: 'Reference Code',
    medium: 'Medium',
    year: 'Year',
    dimensions: 'Dimensions',
    edition: 'Edition',
    condition: 'Condition',
    appraisalDate: 'Appraisal Date',
    appraisedValue: 'Appraised Value',
    purpose: 'Purpose',
    appraiser: 'Appraiser',
    credentials: 'Credentials',
    signature: 'Signature',
    notes: 'Notes',
    purposeLabels: {
      insurance: 'Insurance',
      resale: 'Resale',
      estate: 'Estate',
      donation: 'Donation',
      other: 'Other',
    },
    disclaimer:
      'This appraisal has been prepared by NOA Contemporary for the purpose stated above. The appraised value reflects fair market value as of the appraisal date, based on current market conditions, comparable sales, and the condition of the work. This document is confidential and intended solely for the named purpose. NOA Contemporary accepts no liability for subsequent changes in value.',
    unique: 'Unique',
    artistProof: 'Artist Proof',
    horsCommerce: 'Hors Commerce',
    epreuveArtiste: "Epreuve d'Artiste",
    of: 'of',
  },
  de: {
    appraisalTitle: 'Kunstgutachten',
    appraisalNumber: 'Gutachten-Nr.',
    artist: 'Künstler',
    title: 'Titel',
    referenceCode: 'Referenzcode',
    medium: 'Technik',
    year: 'Jahr',
    dimensions: 'Maße',
    edition: 'Auflage',
    condition: 'Zustand',
    appraisalDate: 'Gutachtendatum',
    appraisedValue: 'Gutachtenwert',
    purpose: 'Zweck',
    appraiser: 'Gutachter',
    credentials: 'Qualifikation',
    signature: 'Unterschrift',
    notes: 'Hinweise',
    purposeLabels: {
      insurance: 'Versicherung',
      resale: 'Wiederverkauf',
      estate: 'Nachlass',
      donation: 'Schenkung',
      other: 'Sonstige',
    },
    disclaimer:
      'Dieses Gutachten wurde von NOA Contemporary für den oben genannten Zweck erstellt. Der gutachterlich festgestellte Wert entspricht dem Marktwert zum Gutachtendatum auf Basis aktueller Marktbedingungen, vergleichbarer Verkäufe und des Erhaltungszustands des Werkes. Dieses Dokument ist vertraulich und ausschließlich für den genannten Zweck bestimmt. NOA Contemporary übernimmt keine Haftung für nachträgliche Wertänderungen.',
    unique: 'Unikat',
    artistProof: 'Künstlerexemplar',
    horsCommerce: 'Hors Commerce',
    epreuveArtiste: "Epreuve d'Artiste",
    of: 'von',
  },
  fr: {
    appraisalTitle: "Expertise d'Oeuvre",
    appraisalNumber: "N° d'expertise",
    artist: 'Artiste',
    title: 'Titre',
    referenceCode: 'Code de référence',
    medium: 'Technique',
    year: 'Année',
    dimensions: 'Dimensions',
    edition: 'Édition',
    condition: 'État',
    appraisalDate: "Date d'expertise",
    appraisedValue: 'Valeur expertisée',
    purpose: 'Objet',
    appraiser: 'Expert',
    credentials: 'Qualifications',
    signature: 'Signature',
    notes: 'Notes',
    purposeLabels: {
      insurance: 'Assurance',
      resale: 'Revente',
      estate: 'Succession',
      donation: 'Donation',
      other: 'Autre',
    },
    disclaimer:
      "Cette expertise a été réalisée par NOA Contemporary pour l’objet indiqué ci-dessus. La valeur expertisée reflète la valeur vénale à la date d’expertise, basée sur les conditions actuelles du marché, les ventes comparables et l’état de l’oeuvre. Ce document est confidentiel et destiné uniquement à l’objet mentionné. NOA Contemporary n’assume aucune responsabilité pour les variations de valeur ultérieures.",
    unique: 'Unique',
    artistProof: "Epreuve d'Artiste",
    horsCommerce: 'Hors Commerce',
    epreuveArtiste: "Epreuve d'Artiste",
    of: 'de',
  },
};

// ---------------------------------------------------------------------------
// Month names for date formatting
// ---------------------------------------------------------------------------
const MONTH_NAMES: Record<string, string[]> = {
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  de: ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'],
  fr: ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'],
};

// ---------------------------------------------------------------------------
// Appraisal-specific styles
// ---------------------------------------------------------------------------
const s = StyleSheet.create({
  imageContainer: {
    marginBottom: 24,
    alignItems: 'center',
  },
  artworkImage: {
    width: '100%',
    maxHeight: 380,
    objectFit: 'contain',
  },
  signatureImage: {
    width: 120,
    height: 40,
    objectFit: 'contain',
  },
  divider: {
    borderBottomWidth: 0.5,
    borderBottomColor: PDF_COLORS.primary400,
    marginTop: 20,
    marginBottom: 12,
  },
  disclaimer: {
    fontFamily: 'AnzianoPro',
    fontSize: 7,
    color: PDF_COLORS.primary400,
    lineHeight: 1.5,
  },
  appraisalNumber: {
    fontFamily: 'AnzianoPro',
    fontSize: 8,
    color: PDF_COLORS.primary400,
    marginBottom: 20,
    letterSpacing: 0.5,
  },
  valueHighlight: {
    fontFamily: 'AnzianoPro',
    fontWeight: 'bold' as const,
    fontSize: 12,
    color: PDF_COLORS.primary900,
    flex: 1,
  },
});

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
export interface AppraisalPDFProps {
  artwork: {
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
  };
  appraisal: {
    appraisal_number: string;
    appraised_value: number;
    currency: string;
    appraisal_date: string;
    purpose: AppraisalPurpose;
    appraiser_name: string;
    appraiser_credentials: string | null;
    condition: string | null;
    notes: string | null;
  };
  artworkImageUrl?: string | null;
  signatureUrl?: string | null;
  language: 'en' | 'de' | 'fr';
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
  return `${parts.join(' × ')} ${unit}`;
}

function formatEdition(
  editionType: string,
  editionNumber: number | null,
  editionTotal: number | null,
  t: TranslationStrings,
): string {
  switch (editionType) {
    case 'unique':      return t.unique;
    case 'numbered':
      if (editionNumber != null && editionTotal != null) return `${editionNumber} ${t.of} ${editionTotal}`;
      if (editionNumber != null) return `#${editionNumber}`;
      return t.edition;
    case 'AP': return t.artistProof;
    case 'HC': return t.horsCommerce;
    case 'EA': return t.epreuveArtiste;
    default:   return editionType;
  }
}

function formatDateFull(dateStr: string, language: string): string {
  try {
    const d = new Date(dateStr);
    const day = d.getDate();
    const month = (MONTH_NAMES[language] ?? MONTH_NAMES.en)[d.getMonth()];
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  } catch {
    return dateStr;
  }
}

function formatValue(amount: number, currency: string): string {
  return new Intl.NumberFormat('de-CH', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function AppraisalPDF({
  artwork,
  appraisal,
  artworkImageUrl,
  signatureUrl,
  language,
}: AppraisalPDFProps) {
  const t = TRANSLATIONS[language] ?? TRANSLATIONS.en;

  const dims = formatDimensions(artwork.height, artwork.width, artwork.depth, artwork.dimension_unit);
  const editionText = formatEdition(artwork.edition_type, artwork.edition_number, artwork.edition_total, t);
  const formattedDate = formatDateFull(appraisal.appraisal_date, language);
  const formattedValue = formatValue(appraisal.appraised_value, appraisal.currency);
  const purposeLabel = t.purposeLabels[appraisal.purpose] ?? appraisal.purpose;

  const detailRows: { label: string; value: string; highlight?: boolean }[] = [
    { label: t.artist, value: ARTIST_NAME },
    { label: t.title, value: artwork.title },
    { label: t.referenceCode, value: artwork.reference_code },
  ];

  if (artwork.medium) detailRows.push({ label: t.medium, value: artwork.medium });
  if (artwork.year != null) detailRows.push({ label: t.year, value: String(artwork.year) });
  if (dims) detailRows.push({ label: t.dimensions, value: dims });
  detailRows.push({ label: t.edition, value: editionText });
  if (appraisal.condition) detailRows.push({ label: t.condition, value: appraisal.condition });

  detailRows.push({ label: t.purpose, value: purposeLabel });
  detailRows.push({ label: t.appraisalDate, value: formattedDate });
  detailRows.push({ label: t.appraisedValue, value: formattedValue, highlight: true });
  detailRows.push({ label: t.appraiser, value: appraisal.appraiser_name });
  if (appraisal.appraiser_credentials) detailRows.push({ label: t.credentials, value: appraisal.appraiser_credentials });
  if (appraisal.notes) detailRows.push({ label: t.notes, value: appraisal.notes });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <PDFHeader
          title={t.appraisalTitle}
          subtitle={COMPANY_NAME}
          language={language}
          companyName={ARTIST_NAME}
        />

        {/* Appraisal number */}
        <Text style={s.appraisalNumber}>
          {t.appraisalNumber} {appraisal.appraisal_number}
        </Text>

        {/* Artwork image */}
        {artworkImageUrl && (
          <View style={s.imageContainer}>
            <Image src={artworkImageUrl} style={s.artworkImage} />
          </View>
        )}

        {/* Detail rows */}
        <View style={styles.infoGrid}>
          {detailRows.map((row) => (
            <View style={styles.infoRow} key={row.label}>
              <Text style={styles.infoLabel}>{row.label}</Text>
              {row.highlight ? (
                <Text style={s.valueHighlight}>{row.value}</Text>
              ) : (
                <Text style={[styles.infoValue, { fontFamily: pdfFont(row.value) }]}>{row.value}</Text>
              )}
            </View>
          ))}

          {/* Signature row */}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t.signature}</Text>
            <View style={{ flex: 1 }}>
              {signatureUrl ? (
                <Image src={signatureUrl} style={s.signatureImage} />
              ) : (
                <Text style={styles.infoValue}>{appraisal.appraiser_name}</Text>
              )}
            </View>
          </View>
        </View>

        {/* Divider */}
        <View style={s.divider} />

        {/* Disclaimer */}
        <Text style={s.disclaimer}>{t.disclaimer}</Text>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>{`© ${ARTIST_NAME} — ${COMPANY_NAME}`}</Text>
          <Text
            style={styles.pageNumber}
            render={({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) =>
              `${pageNumber} / ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}
