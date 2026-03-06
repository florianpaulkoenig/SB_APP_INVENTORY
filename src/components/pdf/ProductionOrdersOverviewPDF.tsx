// ---------------------------------------------------------------------------
// NOA Inventory -- Production Orders Overview PDF
// A single-document overview listing all production orders in a table.
// ---------------------------------------------------------------------------

import { Document, Page, View, Text } from '@react-pdf/renderer';
import styles, { PDF_COLORS } from './PDFStyles';
import { PDFHeader } from './PDFHeader';
import { COMPANY_NAME } from '../../lib/constants';

// ---------------------------------------------------------------------------
// Multi-language translations
// ---------------------------------------------------------------------------
interface TranslationStrings {
  overviewTitle: string;
  orderNo: string;
  title: string;
  status: string;
  orderDate: string;
  deadline: string;
  gallery: string;
  client: string;
  price: string;
  totalOrders: string;
  generatedOn: string;
}

const TRANSLATIONS: Record<string, TranslationStrings> = {
  en: {
    overviewTitle: 'Production Orders Overview',
    orderNo: 'Order No.',
    title: 'Title',
    status: 'Status',
    orderDate: 'Ordered',
    deadline: 'Deadline',
    gallery: 'Gallery',
    client: 'Client',
    price: 'Price',
    totalOrders: 'Total Orders',
    generatedOn: 'Generated on',
  },
  de: {
    overviewTitle: 'Produktionsaufträge Übersicht',
    orderNo: 'Auftrag Nr.',
    title: 'Titel',
    status: 'Status',
    orderDate: 'Bestellt',
    deadline: 'Frist',
    gallery: 'Galerie',
    client: 'Kunde',
    price: 'Preis',
    totalOrders: 'Aufträge gesamt',
    generatedOn: 'Erstellt am',
  },
  fr: {
    overviewTitle: 'Aperçu des ordres de production',
    orderNo: 'Commande N°',
    title: 'Titre',
    status: 'Statut',
    orderDate: 'Commandé',
    deadline: 'Délai',
    gallery: 'Galerie',
    client: 'Client',
    price: 'Prix',
    totalOrders: 'Total commandes',
    generatedOn: 'Généré le',
  },
};

// ---------------------------------------------------------------------------
// Status translations
// ---------------------------------------------------------------------------
const STATUS_TRANSLATIONS: Record<string, Record<string, string>> = {
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
    quality_check: 'Qualitätsprüfung',
    completed: 'Abgeschlossen',
  },
  fr: {
    draft: 'Brouillon',
    ordered: 'Commandé',
    in_production: 'En production',
    quality_check: 'Contrôle qualité',
    completed: 'Terminé',
  },
};

function translateStatus(status: string, language: string): string {
  return STATUS_TRANSLATIONS[language]?.[status] ?? STATUS_TRANSLATIONS.en[status] ?? status;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
export interface ProductionOrdersOverviewPDFProps {
  orders: Array<{
    order_number: string;
    title: string;
    status: string;
    ordered_date: string | null;
    deadline: string | null;
    gallery_name: string | null;
    contact_name: string | null;
    price: number | null;
    currency: string;
  }>;
  language: 'en' | 'de' | 'fr';
}

// ---------------------------------------------------------------------------
// Table column widths
// ---------------------------------------------------------------------------
const COL_NUM = '12%';
const COL_TITLE = '18%';
const COL_STATUS = '13%';
const COL_DATE = '11%';
const COL_DEADLINE = '11%';
const COL_GALLERY = '14%';
const COL_CLIENT = '12%';
const COL_PRICE = '9%';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function ProductionOrdersOverviewPDF({
  orders,
  language,
}: ProductionOrdersOverviewPDFProps) {
  const t = TRANSLATIONS[language] ?? TRANSLATIONS.en;
  const today = new Date().toLocaleDateString(language === 'de' ? 'de-DE' : language === 'fr' ? 'fr-FR' : 'en-GB');

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        {/* Header */}
        <PDFHeader
          title={t.overviewTitle}
          subtitle={`${t.generatedOn} ${today}`}
          language={language}
        />

        {/* Table */}
        <View style={styles.table}>
          {/* Table header */}
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.tableHeaderCell, { width: COL_NUM }]}>
              {t.orderNo}
            </Text>
            <Text style={[styles.tableHeaderCell, { width: COL_TITLE }]}>
              {t.title}
            </Text>
            <Text style={[styles.tableHeaderCell, { width: COL_STATUS }]}>
              {t.status}
            </Text>
            <Text style={[styles.tableHeaderCell, { width: COL_DATE }]}>
              {t.orderDate}
            </Text>
            <Text style={[styles.tableHeaderCell, { width: COL_DEADLINE }]}>
              {t.deadline}
            </Text>
            <Text style={[styles.tableHeaderCell, { width: COL_GALLERY }]}>
              {t.gallery}
            </Text>
            <Text style={[styles.tableHeaderCell, { width: COL_CLIENT }]}>
              {t.client}
            </Text>
            <Text style={[styles.tableHeaderCell, { width: COL_PRICE, textAlign: 'right' }]}>
              {t.price}
            </Text>
          </View>

          {/* Table body */}
          {orders.map((order, index) => (
            <View
              style={index % 2 === 1 ? styles.tableBodyRowAlt : styles.tableBodyRow}
              key={`${order.order_number}-${index}`}
              wrap={false}
            >
              <Text style={[styles.tableCell, { width: COL_NUM, fontFamily: 'Helvetica-Bold' }]}>
                {order.order_number}
              </Text>
              <Text style={[styles.tableCell, { width: COL_TITLE }]}>
                {order.title}
              </Text>
              <Text style={[styles.tableCell, { width: COL_STATUS }]}>
                {translateStatus(order.status, language)}
              </Text>
              <Text style={[styles.tableCell, { width: COL_DATE }]}>
                {order.ordered_date ?? '\u2014'}
              </Text>
              <Text style={[styles.tableCell, { width: COL_DEADLINE }]}>
                {order.deadline ?? '\u2014'}
              </Text>
              <Text style={[styles.tableCell, { width: COL_GALLERY }]}>
                {order.gallery_name ?? '\u2014'}
              </Text>
              <Text style={[styles.tableCell, { width: COL_CLIENT }]}>
                {order.contact_name ?? '\u2014'}
              </Text>
              <Text style={[styles.tableCell, { width: COL_PRICE, textAlign: 'right' }]}>
                {order.price != null && order.price > 0
                  ? new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: order.currency ?? 'EUR',
                      minimumFractionDigits: 0,
                    }).format(order.price)
                  : '\u2014'}
              </Text>
            </View>
          ))}
        </View>

        {/* Summary */}
        <View style={{ marginTop: 8 }}>
          <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 10, color: PDF_COLORS.primary900 }}>
            {t.totalOrders}: {orders.length}
          </Text>
        </View>

        {/* Footer */}
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
