// ---------------------------------------------------------------------------
// NOA Inventory -- Packing List PDF
// ---------------------------------------------------------------------------

import { Document, Page, View, Text } from '@react-pdf/renderer';
import styles, { PDF_COLORS, pdfFont } from './PDFStyles';
import { PDFHeader } from './PDFHeader';
import { COMPANY_NAME } from '../../lib/constants';

// ---------------------------------------------------------------------------
// Multi-language translations
// ---------------------------------------------------------------------------
interface TranslationStrings {
  packingList: string;
  packingNo: string;
  date: string;
  recipient: string;
  delivery: string;
  reference: string;
  title: string;
  dimensions: string;
  weight: string;
  crateNo: string;
  packaging: string;
  specialHandling: string;
  notes: string;
  totalItems: string;
  totalWeight: string;
  packedBy: string;
  signatureDate: string;
}

const TRANSLATIONS: Record<string, TranslationStrings> = {
  en: {
    packingList: 'Packing List',
    packingNo: 'Packing No.',
    date: 'Date',
    recipient: 'Recipient',
    delivery: 'Delivery',
    reference: 'Ref Code',
    title: 'Title',
    dimensions: 'Dimensions',
    weight: 'Weight',
    crateNo: 'Crate No.',
    packaging: 'Packaging',
    specialHandling: 'Special Handling',
    notes: 'Notes',
    totalItems: 'Total Items',
    totalWeight: 'Total Weight',
    packedBy: 'Packed by',
    signatureDate: 'Date',
  },
  de: {
    packingList: 'Packliste',
    packingNo: 'Packliste Nr.',
    date: 'Datum',
    recipient: 'Empf\u00e4nger',
    delivery: 'Lieferung',
    reference: 'Ref.-Code',
    title: 'Titel',
    dimensions: 'Ma\u00dfe',
    weight: 'Gewicht',
    crateNo: 'Kiste Nr.',
    packaging: 'Verpackung',
    specialHandling: 'Besondere Handhabung',
    notes: 'Anmerkungen',
    totalItems: 'Gesamtanzahl',
    totalWeight: 'Gesamtgewicht',
    packedBy: 'Verpackt von',
    signatureDate: 'Datum',
  },
  fr: {
    packingList: 'Liste de colisage',
    packingNo: 'Colisage N\u00b0',
    date: 'Date',
    recipient: 'Destinataire',
    delivery: 'Livraison',
    reference: 'R\u00e9f.',
    title: 'Titre',
    dimensions: 'Dimensions',
    weight: 'Poids',
    crateNo: 'Caisse N\u00b0',
    packaging: 'Emballage',
    specialHandling: 'Manutention sp\u00e9ciale',
    notes: 'Notes',
    totalItems: 'Total articles',
    totalWeight: 'Poids total',
    packedBy: 'Emball\u00e9 par',
    signatureDate: 'Date',
  },
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
export interface PackingListPDFProps {
  packingList: {
    packing_number: string;
    recipient_name: string;
    packing_date: string | null;
    notes: string | null;
  };
  deliveryNumber?: string | null;
  items: Array<{
    artwork_title: string;
    artwork_reference_code: string;
    artwork_dimensions: string;
    artwork_weight: number | null;
    crate_number: string | null;
    packaging_type: string | null;
    special_handling: string | null;
    notes: string | null;
  }>;
  language: 'en' | 'de' | 'fr';
}

// ---------------------------------------------------------------------------
// Table column widths (percentages)
// ---------------------------------------------------------------------------
const COL_NUM = '5%';
const COL_REF = '12%';
const COL_TITLE = '17%';
const COL_DIM = '13%';
const COL_WEIGHT = '9%';
const COL_CRATE = '10%';
const COL_PACK = '14%';
const COL_HANDLING = '20%';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format weight with "kg" suffix. */
function formatWeight(weight: number | null): string {
  if (weight == null) return '\u2014';
  return `${weight} kg`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function PackingListPDF({
  packingList,
  deliveryNumber,
  items,
  language,
}: PackingListPDFProps) {
  const t = TRANSLATIONS[language] ?? TRANSLATIONS.en;

  // Build info rows -- only include rows that have a value
  const infoRows: { label: string; value: string }[] = [
    { label: t.packingNo, value: packingList.packing_number },
  ];

  if (packingList.packing_date) {
    infoRows.push({ label: t.date, value: packingList.packing_date });
  }

  infoRows.push({ label: t.recipient, value: packingList.recipient_name });

  if (deliveryNumber) {
    infoRows.push({ label: t.delivery, value: deliveryNumber });
  }

  // Summary calculations
  const totalItems = items.length;
  const totalWeight = items.reduce((sum, item) => {
    return sum + (item.artwork_weight ?? 0);
  }, 0);
  const hasAnyWeight = items.some((item) => item.artwork_weight != null);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* ----- Header -------------------------------------------------- */}
        <PDFHeader
          title={t.packingList}
          subtitle={packingList.packing_number}
          language={language}
        />

        {/* ----- Packing List Info --------------------------------------- */}
        <View style={styles.infoGrid}>
          {infoRows.map((row) => (
            <View style={styles.infoRow} key={row.label}>
              <Text style={styles.infoLabel}>{row.label}</Text>
              <Text style={styles.infoValue}>{row.value}</Text>
            </View>
          ))}
        </View>

        {/* ----- Items Table --------------------------------------------- */}
        <View style={styles.table}>
          {/* Table header */}
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.tableHeaderCell, { width: COL_NUM }]}>#</Text>
            <Text style={[styles.tableHeaderCell, { width: COL_REF }]}>
              {t.reference}
            </Text>
            <Text style={[styles.tableHeaderCell, { width: COL_TITLE }]}>
              {t.title}
            </Text>
            <Text style={[styles.tableHeaderCell, { width: COL_DIM }]}>
              {t.dimensions}
            </Text>
            <Text style={[styles.tableHeaderCell, { width: COL_WEIGHT }]}>
              {t.weight}
            </Text>
            <Text style={[styles.tableHeaderCell, { width: COL_CRATE }]}>
              {t.crateNo}
            </Text>
            <Text style={[styles.tableHeaderCell, { width: COL_PACK }]}>
              {t.packaging}
            </Text>
            <Text style={[styles.tableHeaderCell, { width: COL_HANDLING }]}>
              {t.specialHandling}
            </Text>
          </View>

          {/* Table body */}
          {items.map((item, index) => (
            <View
              style={index % 2 === 1 ? styles.tableBodyRowAlt : styles.tableBodyRow}
              key={`${item.artwork_reference_code}-${index}`}
            >
              <Text style={[styles.tableCell, { width: COL_NUM }]}>
                {index + 1}
              </Text>
              <Text style={[styles.tableCell, { width: COL_REF }]}>
                {item.artwork_reference_code}
              </Text>
              <Text style={[styles.tableCell, { width: COL_TITLE, fontFamily: pdfFont(item.artwork_title) }]}>
                {item.artwork_title}
              </Text>
              <Text style={[styles.tableCell, { width: COL_DIM }]}>
                {item.artwork_dimensions}
              </Text>
              <Text style={[styles.tableCell, { width: COL_WEIGHT }]}>
                {formatWeight(item.artwork_weight)}
              </Text>
              <Text style={[styles.tableCell, { width: COL_CRATE }]}>
                {item.crate_number ?? '\u2014'}
              </Text>
              <Text style={[styles.tableCell, { width: COL_PACK }]}>
                {item.packaging_type ?? '\u2014'}
              </Text>
              <Text style={[styles.tableCell, { width: COL_HANDLING }]}>
                {item.special_handling ?? '\u2014'}
              </Text>
            </View>
          ))}
        </View>

        {/* ----- Summary ------------------------------------------------- */}
        <View style={styles.infoGrid}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t.totalItems}</Text>
            <Text style={styles.infoValue}>{totalItems}</Text>
          </View>
          {hasAnyWeight && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{t.totalWeight}</Text>
              <Text style={styles.infoValue}>{formatWeight(totalWeight)}</Text>
            </View>
          )}
        </View>

        {/* ----- Notes --------------------------------------------------- */}
        {packingList.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t.notes}</Text>
            <Text style={styles.bodyText}>{packingList.notes}</Text>
          </View>
        )}

        {/* ----- Signature Area ------------------------------------------ */}
        <View style={{ marginTop: 40 }}>
          <View style={styles.signatureLine} />
          <Text style={styles.signatureLabel}>{t.packedBy}</Text>
          <View
            style={{
              width: 200,
              borderBottomWidth: 0.5,
              borderBottomColor: PDF_COLORS.border,
              marginTop: 20,
              marginBottom: 4,
            }}
          />
          <Text style={styles.signatureLabel}>{t.signatureDate}</Text>
        </View>

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
