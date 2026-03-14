// ---------------------------------------------------------------------------
// NOA Inventory -- Delivery Receipt PDF
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
  deliveryReceipt: string;
  deliveryNo: string;
  date: string;
  recipient: string;
  address: string;
  gallery: string;
  no: string;
  image: string;
  reference: string;
  title: string;
  category: string;
  dimensions: string;
  deliveredBy: string;
  receivedBy: string;
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
    no: '#',
    image: '',
    reference: 'Reference',
    title: 'Title',
    category: 'Category',
    dimensions: 'Dimensions',
    deliveredBy: 'Delivered by',
    receivedBy: 'Received by',
    signatureDate: 'Date',
  },
  de: {
    deliveryReceipt: 'Lieferschein',
    deliveryNo: 'Lieferschein Nr.',
    date: 'Datum',
    recipient: 'Empf\u00e4nger',
    address: 'Adresse',
    gallery: 'Galerie',
    no: '#',
    image: '',
    reference: 'Referenz',
    title: 'Titel',
    category: 'Kategorie',
    dimensions: 'Ma\u00dfe',
    deliveredBy: '\u00dcbergeben von',
    receivedBy: 'Empfangen von',
    signatureDate: 'Datum',
  },
  fr: {
    deliveryReceipt: 'Bon de livraison',
    deliveryNo: 'Bon de livraison N\u00b0',
    date: 'Date',
    recipient: 'Destinataire',
    address: 'Adresse',
    gallery: 'Galerie',
    no: '#',
    image: '',
    reference: 'R\u00e9f\u00e9rence',
    title: 'Titre',
    category: 'Cat\u00e9gorie',
    dimensions: 'Dimensions',
    deliveredBy: 'Livr\u00e9 par',
    receivedBy: 'Re\u00e7u par',
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
    artwork_category: string | null;
    artwork_dimensions: string;
    artwork_image_url: string | null;
  }>;
  language: 'en' | 'de' | 'fr';
}

// ---------------------------------------------------------------------------
// Proportional column widths (matching CataloguePDF list approach)
// ---------------------------------------------------------------------------
const USABLE = 535; // A4 width minus 30pt margins each side
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
    width: 120,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontFamily: 'AnzianoPro',
    fontSize: 10,
    color: PDF_COLORS.primary900,
    flex: 1,
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
export function DeliveryReceiptPDF({
  delivery,
  galleryName,
  items,
  language,
}: DeliveryReceiptPDFProps) {
  const t = TRANSLATIONS[language] ?? TRANSLATIONS.en;

  // Build info rows
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

  // Table columns (matching catalogue order: #, image, title, ref, ...)
  const cols = [
    { key: 'no', label: t.no, width: COL_NO },
    { key: 'image', label: t.image, width: COL_IMG },
    { key: 'title', label: t.title, width: COL_TITLE },
    { key: 'ref', label: t.reference, width: COL_REF },
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
            <Text style={s.headerSubtitle}>{t.deliveryReceipt}</Text>
          </View>
          <Text style={s.headerRight}>{delivery.delivery_number}</Text>
        </View>

        {/* ----- Delivery Info ------------------------------------------- */}
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
            key={`${item.artwork_reference_code}-${index}`}
            style={index % 2 === 1 ? s.listBodyRowAlt : s.listBodyRow}
            wrap={false}
          >
            <Text style={[s.listCell, { width: COL_NO }]}>{index + 1}</Text>
            <View style={{ width: COL_IMG }}>
              {item.artwork_image_url ? (
                <Image src={item.artwork_image_url} style={s.listThumbnail} />
              ) : (
                <View style={s.listThumbPlaceholder}>
                  <Text style={s.listThumbText}>{'\u2014'}</Text>
                </View>
              )}
            </View>
            <Text style={[s.listCellBold, { width: COL_TITLE }]}>
              {item.artwork_title}
            </Text>
            <Text style={[s.listCell, { width: COL_REF }]}>
              {item.artwork_reference_code}
            </Text>
            <Text style={[s.listCell, { width: COL_CAT }]}>
              {item.artwork_category ?? '\u2014'}
            </Text>
            <Text style={[s.listCell, { width: COL_DIM }]}>
              {item.artwork_dimensions || '\u2014'}
            </Text>
          </View>
        ))}

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
            <Text style={s.signatureLabel}>{t.deliveredBy}</Text>
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
