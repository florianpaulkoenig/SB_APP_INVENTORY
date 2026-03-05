// ---------------------------------------------------------------------------
// NOA Inventory -- Delivery Receipt PDF
// ---------------------------------------------------------------------------

import { Document, Page, View, Text } from '@react-pdf/renderer';
import styles, { PDF_COLORS } from './PDFStyles';
import { PDFHeader } from './PDFHeader';
import { COMPANY_NAME } from '../../lib/constants';

// ---------------------------------------------------------------------------
// Multi-language translations
// ---------------------------------------------------------------------------
interface TranslationStrings {
  deliveryReceipt: string;
  deliveryNo: string;
  date: string;
  recipient: string;
  address: string;
  gallery: string;
  item: string;
  reference: string;
  title: string;
  medium: string;
  dimensions: string;
  notes: string;
  deliveredBy: string;
  receivedBy: string;
  signature: string;
  signatureDate: string;
}

const TRANSLATIONS: Record<string, TranslationStrings> = {
  en: {
    deliveryReceipt: 'Delivery Receipt',
    deliveryNo: 'Delivery No.',
    date: 'Date',
    recipient: 'Recipient',
    address: 'Address',
    gallery: 'Gallery',
    item: '#',
    reference: 'Reference',
    title: 'Title',
    medium: 'Medium',
    dimensions: 'Dimensions',
    notes: 'Notes',
    deliveredBy: 'Delivered by',
    receivedBy: 'Received by',
    signature: 'Signature',
    signatureDate: 'Date',
  },
  de: {
    deliveryReceipt: 'Lieferschein',
    deliveryNo: 'Lieferschein Nr.',
    date: 'Datum',
    recipient: 'Empf\u00e4nger',
    address: 'Adresse',
    gallery: 'Galerie',
    item: '#',
    reference: 'Referenz',
    title: 'Titel',
    medium: 'Technik',
    dimensions: 'Ma\u00dfe',
    notes: 'Anmerkungen',
    deliveredBy: '\u00dcbergeben von',
    receivedBy: 'Empfangen von',
    signature: 'Unterschrift',
    signatureDate: 'Datum',
  },
  fr: {
    deliveryReceipt: 'Bon de livraison',
    deliveryNo: 'Bon de livraison N\u00b0',
    date: 'Date',
    recipient: 'Destinataire',
    address: 'Adresse',
    gallery: 'Galerie',
    item: '#',
    reference: 'R\u00e9f\u00e9rence',
    title: 'Titre',
    medium: 'Technique',
    dimensions: 'Dimensions',
    notes: 'Notes',
    deliveredBy: 'Livr\u00e9 par',
    receivedBy: 'Re\u00e7u par',
    signature: 'Signature',
    signatureDate: 'Date',
  },
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
export interface DeliveryReceiptPDFProps {
  delivery: {
    delivery_number: string;
    recipient_name: string;
    recipient_address: string | null;
    delivery_date: string | null;
    status: string;
    notes: string | null;
  };
  galleryName?: string | null;
  items: Array<{
    artwork_title: string;
    artwork_reference_code: string;
    artwork_medium: string | null;
    artwork_dimensions: string;
    notes: string | null;
  }>;
  language: 'en' | 'de' | 'fr';
}

// ---------------------------------------------------------------------------
// Table column widths (percentages)
// ---------------------------------------------------------------------------
const COL_NUM = '6%';
const COL_REF = '16%';
const COL_TITLE = '24%';
const COL_MEDIUM = '18%';
const COL_DIM = '18%';
const COL_NOTES = '18%';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function DeliveryReceiptPDF({
  delivery,
  galleryName,
  items,
  language,
}: DeliveryReceiptPDFProps) {
  const t = TRANSLATIONS[language] ?? TRANSLATIONS.en;

  // Build info rows -- only include rows that have a value
  const infoRows: { label: string; value: string }[] = [
    { label: t.deliveryNo, value: delivery.delivery_number },
  ];

  if (delivery.delivery_date) {
    infoRows.push({ label: t.date, value: delivery.delivery_date });
  }

  infoRows.push({ label: t.recipient, value: delivery.recipient_name });

  if (delivery.recipient_address) {
    infoRows.push({ label: t.address, value: delivery.recipient_address });
  }

  if (galleryName) {
    infoRows.push({ label: t.gallery, value: galleryName });
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* ----- Header -------------------------------------------------- */}
        <PDFHeader
          title={t.deliveryReceipt}
          subtitle={delivery.delivery_number}
          language={language}
        />

        {/* ----- Delivery Info ------------------------------------------- */}
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
            <Text style={[styles.tableHeaderCell, { width: COL_NUM }]}>
              {t.item}
            </Text>
            <Text style={[styles.tableHeaderCell, { width: COL_REF }]}>
              {t.reference}
            </Text>
            <Text style={[styles.tableHeaderCell, { width: COL_TITLE }]}>
              {t.title}
            </Text>
            <Text style={[styles.tableHeaderCell, { width: COL_MEDIUM }]}>
              {t.medium}
            </Text>
            <Text style={[styles.tableHeaderCell, { width: COL_DIM }]}>
              {t.dimensions}
            </Text>
            <Text style={[styles.tableHeaderCell, { width: COL_NOTES }]}>
              {t.notes}
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
              <Text style={[styles.tableCell, { width: COL_TITLE }]}>
                {item.artwork_title}
              </Text>
              <Text style={[styles.tableCell, { width: COL_MEDIUM }]}>
                {item.artwork_medium ?? '\u2014'}
              </Text>
              <Text style={[styles.tableCell, { width: COL_DIM }]}>
                {item.artwork_dimensions}
              </Text>
              <Text style={[styles.tableCell, { width: COL_NOTES }]}>
                {item.notes ?? ''}
              </Text>
            </View>
          ))}
        </View>

        {/* ----- Notes --------------------------------------------------- */}
        {delivery.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t.notes}</Text>
            <Text style={styles.bodyText}>{delivery.notes}</Text>
          </View>
        )}

        {/* ----- Signature Area ------------------------------------------ */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginTop: 40,
          }}
        >
          {/* Delivered by */}
          <View style={{ width: '45%' }}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>{t.deliveredBy}</Text>
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

          {/* Received by */}
          <View style={{ width: '45%' }}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>{t.receivedBy}</Text>
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
