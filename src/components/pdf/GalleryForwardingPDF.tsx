// ---------------------------------------------------------------------------
// NOA Inventory -- Gallery Forwarding Order PDF
// Redesigned to match the CataloguePDF list layout aesthetic.
// ---------------------------------------------------------------------------

import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';
import { PDF_COLORS } from './PDFStyles';

// Ensure AnzianoPro font is registered (side-effect import)
import './PDFStyles';

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
  no: string;
  image: string;
  reference: string;
  title: string;
  category: string;
  dimensions: string;
  notes: string;
  shippedBy: string;
  receivedBy: string;
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
    no: '#',
    image: '',
    reference: 'Reference',
    title: 'Title',
    category: 'Category',
    dimensions: 'Dimensions',
    notes: 'Notes',
    shippedBy: 'Shipped by',
    receivedBy: 'Received by',
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
    no: '#',
    image: '',
    reference: 'Referenz',
    title: 'Titel',
    category: 'Kategorie',
    dimensions: 'Ma\u00dfe',
    notes: 'Anmerkungen',
    shippedBy: 'Versendet von',
    receivedBy: 'Empfangen von',
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
    no: '#',
    image: '',
    reference: 'R\u00e9f\u00e9rence',
    title: 'Titre',
    category: 'Cat\u00e9gorie',
    dimensions: 'Dimensions',
    notes: 'Notes',
    shippedBy: 'Exp\u00e9di\u00e9 par',
    receivedBy: 'Re\u00e7u par',
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
    category: string | null;
    dimensions: string;
    image_url: string | null;
  }>;
  fromGalleryName?: string | null;
  toGalleryName?: string | null;
  contactName?: string | null;
  language: 'en' | 'de' | 'fr';
}

// ---------------------------------------------------------------------------
// Proportional column widths (matching DeliveryReceiptPDF / CataloguePDF)
// ---------------------------------------------------------------------------
const USABLE = 535;
const COL_NO = 18;
const COL_IMG = 50;
const FLEX_SPACE = USABLE - COL_NO - COL_IMG;

// Column weights for: ref, title, category, dimensions
const WEIGHTS = { ref: 1.3, title: 1.5, category: 1, dims: 1.2 };
const TOTAL_WEIGHT = WEIGHTS.ref + WEIGHTS.title + WEIGHTS.category + WEIGHTS.dims;

const COL_REF = Math.round((WEIGHTS.ref / TOTAL_WEIGHT) * FLEX_SPACE);
const COL_TITLE = Math.round((WEIGHTS.title / TOTAL_WEIGHT) * FLEX_SPACE);
const COL_CAT = Math.round((WEIGHTS.category / TOTAL_WEIGHT) * FLEX_SPACE);
const COL_DIM = Math.round((WEIGHTS.dims / TOTAL_WEIGHT) * FLEX_SPACE);

// ---------------------------------------------------------------------------
// Helper: format currency
// ---------------------------------------------------------------------------
function fmtCurrency(value: number, currency: string | null): string {
  const cur = currency ?? 'EUR';
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: cur,
    }).format(value);
  } catch {
    return `${cur} ${value.toFixed(2)}`;
  }
}

// ---------------------------------------------------------------------------
// Styles (matching CataloguePDF list layout)
// ---------------------------------------------------------------------------
const s = StyleSheet.create({
  page: {
    fontFamily: 'AnzianoPro',
    backgroundColor: '#ffffff',
    paddingTop: 36,
    paddingBottom: 50,
    paddingHorizontal: 30,
  },
  // Header
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 20,
  },
  headerTitle: {
    fontFamily: 'AnzianoPro',
    fontWeight: 'bold' as const,
    fontSize: 22,
    color: PDF_COLORS.primary900,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  headerSubtitle: {
    fontFamily: 'AnzianoPro',
    fontSize: 11,
    color: PDF_COLORS.primary400,
    letterSpacing: 0.5,
    marginTop: 2,
  },
  headerRight: {
    fontFamily: 'AnzianoPro',
    fontSize: 10,
    color: PDF_COLORS.primary400,
    textAlign: 'right' as const,
    letterSpacing: 0.5,
  },
  // Info grid
  infoGrid: {
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row' as const,
    borderBottomWidth: 0.5,
    borderBottomColor: PDF_COLORS.border,
    paddingVertical: 5,
  },
  infoLabel: {
    fontFamily: 'AnzianoPro',
    fontWeight: 'bold' as const,
    fontSize: 10,
    color: PDF_COLORS.primary400,
    width: 140,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontFamily: 'AnzianoPro',
    fontSize: 10,
    color: PDF_COLORS.primary900,
    flex: 1,
  },
  // Notes
  notesTitle: {
    fontFamily: 'AnzianoPro',
    fontWeight: 'bold' as const,
    fontSize: 11,
    color: PDF_COLORS.primary900,
    marginTop: 20,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  notesText: {
    fontFamily: 'AnzianoPro',
    fontSize: 10,
    color: PDF_COLORS.primary700,
    lineHeight: 1.5,
  },
  // Table
  listHeaderRow: {
    flexDirection: 'row' as const,
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  listHeaderCell: {
    fontFamily: 'AnzianoPro',
    fontWeight: 'bold' as const,
    fontSize: 10,
    color: '#000000',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingRight: 6,
  },
  listBodyRow: {
    flexDirection: 'row' as const,
    borderBottomWidth: 0.5,
    borderBottomColor: PDF_COLORS.border,
    paddingVertical: 8,
    paddingHorizontal: 8,
    alignItems: 'center' as const,
    minHeight: 60,
  },
  listBodyRowAlt: {
    flexDirection: 'row' as const,
    borderBottomWidth: 0.5,
    borderBottomColor: PDF_COLORS.border,
    paddingVertical: 8,
    paddingHorizontal: 8,
    alignItems: 'center' as const,
    minHeight: 60,
    backgroundColor: '#fafafa',
  },
  listCell: {
    fontFamily: 'AnzianoPro',
    fontSize: 10,
    color: PDF_COLORS.primary700,
    paddingRight: 6,
  },
  listCellBold: {
    fontFamily: 'AnzianoPro',
    fontWeight: 'bold' as const,
    fontSize: 10,
    color: PDF_COLORS.primary900,
    paddingRight: 6,
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
    fontSize: 10,
    color: PDF_COLORS.primary400,
  },
  // Signature
  signatureLine: {
    width: 200,
    borderBottomWidth: 1,
    borderBottomColor: PDF_COLORS.primary900,
    marginBottom: 4,
  },
  signatureLabel: {
    fontFamily: 'AnzianoPro',
    fontSize: 10,
    color: PDF_COLORS.primary400,
  },
  // Footer
  footer: {
    position: 'absolute' as const,
    bottom: 24, left: 30, right: 30,
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
  },
  footerText: {
    fontFamily: 'AnzianoPro',
    fontSize: 10,
    color: PDF_COLORS.primary400,
    letterSpacing: 0.5,
  },
});

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

  // Table columns
  const cols = [
    { key: 'no', label: t.no, width: COL_NO },
    { key: 'image', label: t.image, width: COL_IMG },
    { key: 'ref', label: t.reference, width: COL_REF },
    { key: 'title', label: t.title, width: COL_TITLE },
    { key: 'category', label: t.category, width: COL_CAT },
    { key: 'dims', label: t.dimensions, width: COL_DIM },
  ];

  return (
    <Document>
      <Page size="A4" style={s.page} wrap>
        {/* ----- Header -------------------------------------------------- */}
        <View style={s.headerRow} fixed>
          <View>
            <Text style={s.headerTitle}>Simon Berger</Text>
            <Text style={s.headerSubtitle}>{t.forwardingOrder}</Text>
          </View>
          <Text style={s.headerRight}>{order.forwarding_number}</Text>
        </View>

        {/* ----- Order Info ---------------------------------------------- */}
        <View style={s.infoGrid}>
          {infoRows.map((row) => (
            <View style={s.infoRow} key={row.label}>
              <Text style={s.infoLabel}>{row.label}</Text>
              <Text style={s.infoValue}>{row.value}</Text>
            </View>
          ))}
        </View>

        {/* ----- Table Header -------------------------------------------- */}
        <View style={s.listHeaderRow} fixed>
          {cols.map((col) => (
            <Text
              key={col.key}
              style={[s.listHeaderCell, { width: col.width }]}
            >
              {col.label}
            </Text>
          ))}
        </View>

        {/* ----- Table Body ---------------------------------------------- */}
        {items.map((item, index) => (
          <View
            key={`${item.reference_code}-${index}`}
            style={index % 2 === 1 ? s.listBodyRowAlt : s.listBodyRow}
            wrap={false}
          >
            <Text style={[s.listCell, { width: COL_NO }]}>{index + 1}</Text>
            <View style={{ width: COL_IMG }}>
              {item.image_url ? (
                <Image src={item.image_url} style={s.listThumbnail} />
              ) : (
                <View style={s.listThumbPlaceholder}>
                  <Text style={s.listThumbText}>{'\u2014'}</Text>
                </View>
              )}
            </View>
            <Text style={[s.listCell, { width: COL_REF }]}>
              {item.reference_code}
            </Text>
            <Text style={[s.listCellBold, { width: COL_TITLE }]}>
              {item.title}
            </Text>
            <Text style={[s.listCell, { width: COL_CAT }]}>
              {item.category ?? '\u2014'}
            </Text>
            <Text style={[s.listCell, { width: COL_DIM }]}>
              {item.dimensions || '\u2014'}
            </Text>
          </View>
        ))}

        {/* ----- Notes --------------------------------------------------- */}
        {order.notes && (
          <View>
            <Text style={s.notesTitle}>{t.notes}</Text>
            <Text style={s.notesText}>{order.notes}</Text>
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
          <View style={{ width: '45%' }}>
            <View style={s.signatureLine} />
            <Text style={s.signatureLabel}>{t.shippedBy}</Text>
            <View
              style={{
                width: 200,
                borderBottomWidth: 0.5,
                borderBottomColor: PDF_COLORS.border,
                marginTop: 20,
                marginBottom: 4,
              }}
            />
            <Text style={s.signatureLabel}>{t.signatureDate}</Text>
          </View>
          <View style={{ width: '45%' }}>
            <View style={s.signatureLine} />
            <Text style={s.signatureLabel}>{t.receivedBy}</Text>
            <View
              style={{
                width: 200,
                borderBottomWidth: 0.5,
                borderBottomColor: PDF_COLORS.border,
                marginTop: 20,
                marginBottom: 4,
              }}
            />
            <Text style={s.signatureLabel}>{t.signatureDate}</Text>
          </View>
        </View>

        {/* ----- Footer -------------------------------------------------- */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>
            {'NOA Contemporary  \u2022  Florian Paul Koenig  \u2022  florian.koenig@noacontemporary.com  \u2022  +41 76 511 92 94'}
          </Text>
          <Text
            style={s.footerText}
            render={({ pageNumber, totalPages }) =>
              `${pageNumber} / ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}
