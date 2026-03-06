// ---------------------------------------------------------------------------
// NOA Inventory -- Production Order PDF (Artist Version)
// ---------------------------------------------------------------------------

import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import styles, { PDF_COLORS } from './PDFStyles';
import { ARTIST_NAME, COMPANY_NAME } from '../../lib/constants';

// ---------------------------------------------------------------------------
// Multi-language translations
// ---------------------------------------------------------------------------
interface TranslationStrings {
  artworkCreationSchedule: string;
  orderNo: string;
  title: string;
  status: string;
  orderDate: string;
  deadline: string;
  gallery: string;
  client: string;
  price: string;
  notes: string;
  totalItems: string;
}

const TRANSLATIONS: Record<string, TranslationStrings> = {
  en: {
    artworkCreationSchedule: 'Artwork Creation Schedule',
    orderNo: 'Order No.',
    title: 'Title',
    status: 'Status',
    orderDate: 'Order Date',
    deadline: 'Deadline',
    gallery: 'Gallery',
    client: 'Client',
    price: 'Price',
    notes: 'Notes',
    totalItems: 'Total Items',
  },
  de: {
    artworkCreationSchedule: 'Kunstwerk-Produktionsplan',
    orderNo: 'Auftrag Nr.',
    title: 'Titel',
    status: 'Status',
    orderDate: 'Auftragsdatum',
    deadline: 'Frist',
    gallery: 'Galerie',
    client: 'Kunde',
    price: 'Preis',
    notes: 'Anmerkungen',
    totalItems: 'Gesamtanzahl',
  },
  fr: {
    artworkCreationSchedule: "Calendrier de Cr\u00e9ation d'Oeuvres",
    orderNo: 'Commande N\u00b0',
    title: 'Titre',
    status: 'Statut',
    orderDate: 'Date de commande',
    deadline: 'D\u00e9lai',
    gallery: 'Galerie',
    client: 'Client',
    price: 'Prix',
    notes: 'Notes',
    totalItems: 'Total articles',
  },
};

// ---------------------------------------------------------------------------
// Status translations
// ---------------------------------------------------------------------------
interface StatusStrings {
  draft: string;
  ordered: string;
  in_production: string;
  quality_check: string;
  completed: string;
}

const STATUS_TRANSLATIONS: Record<string, StatusStrings> = {
  en: {
    draft: 'Draft',
    ordered: 'Ordered',
    in_production: 'In Production',
    quality_check: 'Quality Check',
    completed: 'Completed',
  },
  de: {
    draft: 'Entwurf',
    ordered: 'Bestellt',
    in_production: 'In Produktion',
    quality_check: 'Qualit\u00e4tspr\u00fcfung',
    completed: 'Abgeschlossen',
  },
  fr: {
    draft: 'Brouillon',
    ordered: 'Command\u00e9',
    in_production: 'En production',
    quality_check: 'Contr\u00f4le qualit\u00e9',
    completed: 'Termin\u00e9',
  },
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
export interface ProductionOrderPDFProps {
  order: {
    order_number: string;
    title: string;
    description: string | null;
    status: string;
    ordered_date: string | null;
    deadline: string | null;
    notes: string | null;
    price?: number | null;
    currency?: string;
  };
  items: Array<{
    description: string;
    medium: string | null;
    dimensions: string;
    quantity: number;
    notes: string | null;
  }>;
  galleryName?: string | null;
  contactName?: string | null;
  language: 'en' | 'de' | 'fr';
}

// ---------------------------------------------------------------------------
// Column widths for the items table (Title / Gallery / Deadline)
// ---------------------------------------------------------------------------
const COL_TITLE = '50%';
const COL_GALLERY = '30%';
const COL_DEADLINE = '20%';

// ---------------------------------------------------------------------------
// Custom styles for the artist version
// ---------------------------------------------------------------------------
const artistStyles = StyleSheet.create({
  headerContainer: {
    marginBottom: 24,
  },
  artistName: {
    fontFamily: 'AnzianoPro',
    fontWeight: 'bold' as const,
    fontSize: 22,
    color: PDF_COLORS.primary900,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  scheduleTitle: {
    fontFamily: 'AnzianoPro',
    fontSize: 14,
    color: PDF_COLORS.primary700,
    marginTop: 4,
    letterSpacing: 1,
  },
  orderNumber: {
    fontFamily: 'AnzianoPro',
    fontSize: 10,
    color: PDF_COLORS.primary400,
    marginTop: 2,
  },
  titleBar: {
    flexDirection: 'row',
    backgroundColor: PDF_COLORS.primary900,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginTop: 16,
  },
  titleBarText: {
    fontFamily: 'AnzianoPro',
    fontWeight: 'bold' as const,
    fontSize: 9,
    color: PDF_COLORS.white,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  itemRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: PDF_COLORS.border,
    paddingVertical: 7,
    paddingHorizontal: 10,
  },
  itemRowAlt: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: PDF_COLORS.border,
    paddingVertical: 7,
    paddingHorizontal: 10,
    backgroundColor: PDF_COLORS.backgroundLight,
  },
  itemText: {
    fontFamily: 'AnzianoPro',
    fontSize: 9,
    color: PDF_COLORS.primary700,
  },
  itemTitleText: {
    fontFamily: 'AnzianoPro',
    fontWeight: 'bold' as const,
    fontSize: 9,
    color: PDF_COLORS.primary900,
  },
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Translate a production status value. */
function translateStatus(status: string, language: string): string {
  const statusMap = STATUS_TRANSLATIONS[language] ?? STATUS_TRANSLATIONS.en;
  return (statusMap as Record<string, string>)[status] ?? status;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function ProductionOrderPDF({
  order,
  items,
  galleryName,
  contactName,
  language,
}: ProductionOrderPDFProps) {
  const t = TRANSLATIONS[language] ?? TRANSLATIONS.en;

  // Build info rows -- only include rows that have a value
  const infoRows: { label: string; value: string }[] = [
    { label: t.orderNo, value: order.order_number },
    { label: t.status, value: translateStatus(order.status, language) },
  ];

  if (order.ordered_date) {
    infoRows.push({ label: t.orderDate, value: order.ordered_date });
  }

  if (contactName) {
    infoRows.push({ label: t.client, value: contactName });
  }

  if (order.price != null && order.price > 0) {
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: order.currency ?? 'EUR',
      minimumFractionDigits: 2,
    }).format(order.price);
    infoRows.push({ label: t.price, value: formatted });
  }

  // Total quantity across all items
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* ----- Header: Artist Name + Artwork Creation Schedule ---------- */}
        <View style={artistStyles.headerContainer}>
          <Text style={artistStyles.artistName}>{ARTIST_NAME}</Text>
          <Text style={artistStyles.scheduleTitle}>
            {t.artworkCreationSchedule}
          </Text>
          <Text style={artistStyles.orderNumber}>{order.order_number}</Text>
        </View>

        {/* ----- Order Info ---------------------------------------------- */}
        <View style={styles.infoGrid}>
          {infoRows.map((row) => (
            <View style={styles.infoRow} key={row.label}>
              <Text style={styles.infoLabel}>{row.label}</Text>
              <Text style={styles.infoValue}>{row.value}</Text>
            </View>
          ))}
        </View>

        {/* ----- Items: Black title bar + rows --------------------------- */}
        <View style={styles.table}>
          {/* Black title bar: Title | Gallery | Deadline */}
          <View style={artistStyles.titleBar}>
            <Text style={[artistStyles.titleBarText, { width: COL_TITLE }]}>
              {t.title}
            </Text>
            <Text style={[artistStyles.titleBarText, { width: COL_GALLERY }]}>
              {t.gallery}
            </Text>
            <Text style={[artistStyles.titleBarText, { width: COL_DEADLINE }]}>
              {t.deadline}
            </Text>
          </View>

          {/* Item rows — each shows: description (title), gallery, deadline */}
          {items.map((item, index) => (
            <View
              style={index % 2 === 1 ? artistStyles.itemRowAlt : artistStyles.itemRow}
              key={`${item.description}-${index}`}
            >
              <Text style={[artistStyles.itemTitleText, { width: COL_TITLE }]}>
                {item.description}
              </Text>
              <Text style={[artistStyles.itemText, { width: COL_GALLERY }]}>
                {galleryName ?? '\u2014'}
              </Text>
              <Text style={[artistStyles.itemText, { width: COL_DEADLINE }]}>
                {order.deadline ?? '\u2014'}
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
        </View>

        {/* ----- Notes --------------------------------------------------- */}
        {order.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t.notes}</Text>
            <Text style={styles.bodyText}>{order.notes}</Text>
          </View>
        )}

        {/* ----- Footer -------------------------------------------------- */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            {`\u00a9 ${ARTIST_NAME}`}
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
