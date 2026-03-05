// ---------------------------------------------------------------------------
// NOA Inventory -- Production Order PDF
// ---------------------------------------------------------------------------

import { Document, Page, View, Text } from '@react-pdf/renderer';
import styles, { PDF_COLORS } from './PDFStyles';
import { PDFHeader } from './PDFHeader';
import { COMPANY_NAME } from '../../lib/constants';

// ---------------------------------------------------------------------------
// Multi-language translations
// ---------------------------------------------------------------------------
interface TranslationStrings {
  productionOrder: string;
  orderNo: string;
  title: string;
  status: string;
  orderDate: string;
  deadline: string;
  description: string;
  item: string;
  medium: string;
  dimensions: string;
  quantity: string;
  notes: string;
  totalItems: string;
}

const TRANSLATIONS: Record<string, TranslationStrings> = {
  en: {
    productionOrder: 'Production Order',
    orderNo: 'Order No.',
    title: 'Title',
    status: 'Status',
    orderDate: 'Order Date',
    deadline: 'Deadline',
    description: 'Description',
    item: 'Item',
    medium: 'Medium',
    dimensions: 'Dimensions',
    quantity: 'Quantity',
    notes: 'Notes',
    totalItems: 'Total Items',
  },
  de: {
    productionOrder: 'Produktionsauftrag',
    orderNo: 'Auftrag Nr.',
    title: 'Titel',
    status: 'Status',
    orderDate: 'Auftragsdatum',
    deadline: 'Frist',
    description: 'Beschreibung',
    item: 'Position',
    medium: 'Medium',
    dimensions: 'Ma\u00dfe',
    quantity: 'Menge',
    notes: 'Anmerkungen',
    totalItems: 'Gesamtanzahl',
  },
  fr: {
    productionOrder: 'Ordre de production',
    orderNo: 'Commande N\u00b0',
    title: 'Titre',
    status: 'Statut',
    orderDate: 'Date de commande',
    deadline: 'D\u00e9lai',
    description: 'Description',
    item: 'Article',
    medium: 'M\u00e9dium',
    dimensions: 'Dimensions',
    quantity: 'Quantit\u00e9',
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
  };
  items: Array<{
    description: string;
    medium: string | null;
    dimensions: string;
    quantity: number;
    notes: string | null;
  }>;
  language: 'en' | 'de' | 'fr';
}

// ---------------------------------------------------------------------------
// Table column widths (percentages)
// ---------------------------------------------------------------------------
const COL_NUM = '6%';
const COL_DESC = '28%';
const COL_MEDIUM = '16%';
const COL_DIM = '18%';
const COL_QTY = '8%';
const COL_NOTES = '24%';

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
  language,
}: ProductionOrderPDFProps) {
  const t = TRANSLATIONS[language] ?? TRANSLATIONS.en;

  // Build info rows -- only include rows that have a value
  const infoRows: { label: string; value: string }[] = [
    { label: t.orderNo, value: order.order_number },
    { label: t.title, value: order.title },
    { label: t.status, value: translateStatus(order.status, language) },
  ];

  if (order.ordered_date) {
    infoRows.push({ label: t.orderDate, value: order.ordered_date });
  }

  if (order.deadline) {
    infoRows.push({ label: t.deadline, value: order.deadline });
  }

  // Total quantity across all items
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* ----- Header -------------------------------------------------- */}
        <PDFHeader
          title={t.productionOrder}
          subtitle={order.order_number}
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

        {/* ----- Description --------------------------------------------- */}
        {order.description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t.description}</Text>
            <Text style={styles.bodyText}>{order.description}</Text>
          </View>
        )}

        {/* ----- Items Table --------------------------------------------- */}
        <View style={styles.table}>
          {/* Table header */}
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.tableHeaderCell, { width: COL_NUM }]}>#</Text>
            <Text style={[styles.tableHeaderCell, { width: COL_DESC }]}>
              {t.item}
            </Text>
            <Text style={[styles.tableHeaderCell, { width: COL_MEDIUM }]}>
              {t.medium}
            </Text>
            <Text style={[styles.tableHeaderCell, { width: COL_DIM }]}>
              {t.dimensions}
            </Text>
            <Text style={[styles.tableHeaderCell, { width: COL_QTY }]}>
              {t.quantity}
            </Text>
            <Text style={[styles.tableHeaderCell, { width: COL_NOTES }]}>
              {t.notes}
            </Text>
          </View>

          {/* Table body */}
          {items.map((item, index) => (
            <View
              style={index % 2 === 1 ? styles.tableBodyRowAlt : styles.tableBodyRow}
              key={`${item.description}-${index}`}
            >
              <Text style={[styles.tableCell, { width: COL_NUM }]}>
                {index + 1}
              </Text>
              <Text style={[styles.tableCell, { width: COL_DESC }]}>
                {item.description}
              </Text>
              <Text style={[styles.tableCell, { width: COL_MEDIUM }]}>
                {item.medium ?? '\u2014'}
              </Text>
              <Text style={[styles.tableCell, { width: COL_DIM }]}>
                {item.dimensions}
              </Text>
              <Text style={[styles.tableCell, { width: COL_QTY }]}>
                {item.quantity}
              </Text>
              <Text style={[styles.tableCell, { width: COL_NOTES }]}>
                {item.notes ?? '\u2014'}
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
