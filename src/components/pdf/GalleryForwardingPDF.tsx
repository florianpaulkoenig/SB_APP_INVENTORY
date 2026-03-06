// ---------------------------------------------------------------------------
// NOA Inventory -- Gallery Forwarding Order PDF
// ---------------------------------------------------------------------------

import { Document, Page, View, Text } from '@react-pdf/renderer';
import styles, { PDF_COLORS } from './PDFStyles';
import { PDFHeader } from './PDFHeader';
import { COMPANY_NAME } from '../../lib/constants';

// ---------------------------------------------------------------------------
// Multi-language translations
// ---------------------------------------------------------------------------
interface TranslationStrings {
  forwardingOrder: string;
  forwardingNo: string;
  date: string;
  fromGallery: string;
  toGallery: string;
  contact: string;
  shippingDate: string;
  estimatedArrival: string;
  trackingNumber: string;
  shippingMethod: string;
  insuranceValue: string;
  item: string;
  reference: string;
  title: string;
  medium: string;
  dimensions: string;
  notes: string;
  shippedBy: string;
  receivedBy: string;
  signature: string;
  signatureDate: string;
}

const TRANSLATIONS: Record<string, TranslationStrings> = {
  en: {
    forwardingOrder: 'Forwarding Order',
    forwardingNo: 'Forwarding No.',
    date: 'Date',
    fromGallery: 'From Gallery',
    toGallery: 'To Gallery',
    contact: 'Contact',
    shippingDate: 'Shipping Date',
    estimatedArrival: 'Estimated Arrival',
    trackingNumber: 'Tracking Number',
    shippingMethod: 'Shipping Method',
    insuranceValue: 'Insurance Value',
    item: '#',
    reference: 'Reference',
    title: 'Title',
    medium: 'Medium',
    dimensions: 'Dimensions',
    notes: 'Notes',
    shippedBy: 'Shipped by',
    receivedBy: 'Received by',
    signature: 'Signature',
    signatureDate: 'Date',
  },
  de: {
    forwardingOrder: 'Speditionsauftrag',
    forwardingNo: 'Speditions Nr.',
    date: 'Datum',
    fromGallery: 'Von Galerie',
    toGallery: 'An Galerie',
    contact: 'Kontakt',
    shippingDate: 'Versanddatum',
    estimatedArrival: 'Voraussichtliche Ankunft',
    trackingNumber: 'Sendungsnummer',
    shippingMethod: 'Versandart',
    insuranceValue: 'Versicherungswert',
    item: '#',
    reference: 'Referenz',
    title: 'Titel',
    medium: 'Technik',
    dimensions: 'Ma\u00dfe',
    notes: 'Anmerkungen',
    shippedBy: 'Versendet von',
    receivedBy: 'Empfangen von',
    signature: 'Unterschrift',
    signatureDate: 'Datum',
  },
  fr: {
    forwardingOrder: 'Ordre de transfert',
    forwardingNo: 'N\u00b0 de transfert',
    date: 'Date',
    fromGallery: 'De la galerie',
    toGallery: '\u00c0 la galerie',
    contact: 'Contact',
    shippingDate: "Date d'exp\u00e9dition",
    estimatedArrival: "Arriv\u00e9e estim\u00e9e",
    trackingNumber: 'Num\u00e9ro de suivi',
    shippingMethod: "Mode d'exp\u00e9dition",
    insuranceValue: "Valeur d'assurance",
    item: '#',
    reference: 'R\u00e9f\u00e9rence',
    title: 'Titre',
    medium: 'Technique',
    dimensions: 'Dimensions',
    notes: 'Notes',
    shippedBy: 'Exp\u00e9di\u00e9 par',
    receivedBy: 'Re\u00e7u par',
    signature: 'Signature',
    signatureDate: 'Date',
  },
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
export interface GalleryForwardingPDFProps {
  order: {
    forwarding_number: string;
    title: string;
    shipping_date: string | null;
    estimated_arrival: string | null;
    tracking_number: string | null;
    shipping_method: string | null;
    insurance_value: number | null;
    currency: string | null;
    notes: string | null;
  };
  items: Array<{
    reference_code: string;
    title: string;
    medium: string | null;
    dimensions: string;
  }>;
  fromGalleryName?: string | null;
  toGalleryName?: string | null;
  contactName?: string | null;
  language: 'en' | 'de' | 'fr';
}

// ---------------------------------------------------------------------------
// Table column widths
// ---------------------------------------------------------------------------
const COL_NUM = '6%';
const COL_REF = '18%';
const COL_TITLE = '30%';
const COL_MEDIUM = '22%';
const COL_DIM = '24%';

// ---------------------------------------------------------------------------
// Helper: format currency
// ---------------------------------------------------------------------------
function fmtCurrency(value: number, currency: string | null): string {
  const cur = currency ?? 'EUR';
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: cur }).format(value);
  } catch {
    return `${cur} ${value.toFixed(2)}`;
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function GalleryForwardingPDF({
  order,
  items,
  fromGalleryName,
  toGalleryName,
  contactName,
  language,
}: GalleryForwardingPDFProps) {
  const t = TRANSLATIONS[language] ?? TRANSLATIONS.en;

  // Build info rows
  const infoRows: { label: string; value: string }[] = [
    { label: t.forwardingNo, value: order.forwarding_number },
  ];

  if (fromGalleryName) {
    infoRows.push({ label: t.fromGallery, value: fromGalleryName });
  }
  if (toGalleryName) {
    infoRows.push({ label: t.toGallery, value: toGalleryName });
  }
  if (contactName) {
    infoRows.push({ label: t.contact, value: contactName });
  }
  if (order.shipping_date) {
    infoRows.push({ label: t.shippingDate, value: order.shipping_date });
  }
  if (order.estimated_arrival) {
    infoRows.push({ label: t.estimatedArrival, value: order.estimated_arrival });
  }
  if (order.tracking_number) {
    infoRows.push({ label: t.trackingNumber, value: order.tracking_number });
  }
  if (order.shipping_method) {
    infoRows.push({ label: t.shippingMethod, value: order.shipping_method });
  }
  if (order.insurance_value != null) {
    infoRows.push({
      label: t.insuranceValue,
      value: fmtCurrency(order.insurance_value, order.currency),
    });
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* ----- Header -------------------------------------------------- */}
        <PDFHeader
          title={t.forwardingOrder}
          subtitle={order.forwarding_number}
          language={language}
        />

        {/* ----- Order Info ---------------------------------------------- */}
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
          </View>

          {/* Table body */}
          {items.map((item, index) => (
            <View
              style={index % 2 === 1 ? styles.tableBodyRowAlt : styles.tableBodyRow}
              key={`${item.reference_code}-${index}`}
            >
              <Text style={[styles.tableCell, { width: COL_NUM }]}>
                {index + 1}
              </Text>
              <Text style={[styles.tableCell, { width: COL_REF }]}>
                {item.reference_code}
              </Text>
              <Text style={[styles.tableCell, { width: COL_TITLE }]}>
                {item.title}
              </Text>
              <Text style={[styles.tableCell, { width: COL_MEDIUM }]}>
                {item.medium ?? '\u2014'}
              </Text>
              <Text style={[styles.tableCell, { width: COL_DIM }]}>
                {item.dimensions || '\u2014'}
              </Text>
            </View>
          ))}
        </View>

        {/* ----- Notes --------------------------------------------------- */}
        {order.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t.notes}</Text>
            <Text style={styles.bodyText}>{order.notes}</Text>
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
          {/* Shipped by */}
          <View style={{ width: '45%' }}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>{t.shippedBy}</Text>
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
