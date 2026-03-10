// ---------------------------------------------------------------------------
// NOA Inventory -- Production Orders Overview PDF
// Landscape overview listing all production orders with their items.
// ---------------------------------------------------------------------------

import { Document, Page, View, Text } from '@react-pdf/renderer';
import styles, { PDF_COLORS } from './PDFStyles';
import { PDFHeader } from './PDFHeader';
import { ARTIST_NAME, COMPANY_NAME } from '../../lib/constants';

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
  totalItems: string;
  generatedOn: string;
  item: string;
  medium: string;
  dimensions: string;
  qty: string;
  edition: string;
  year: string;
  category: string;
  noItems: string;
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
    totalItems: 'Total Items',
    generatedOn: 'Generated on',
    item: 'Item',
    medium: 'Medium',
    dimensions: 'Dimensions',
    qty: 'Qty',
    edition: 'Edition',
    year: 'Year',
    category: 'Category',
    noItems: 'No items',
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
    totalItems: 'Positionen gesamt',
    generatedOn: 'Erstellt am',
    item: 'Position',
    medium: 'Medium',
    dimensions: 'Masse',
    qty: 'Anz.',
    edition: 'Auflage',
    year: 'Jahr',
    category: 'Kategorie',
    noItems: 'Keine Positionen',
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
    totalItems: 'Total articles',
    generatedOn: 'Généré le',
    item: 'Article',
    medium: 'Technique',
    dimensions: 'Dimensions',
    qty: 'Qté',
    edition: 'Édition',
    year: 'Année',
    category: 'Catégorie',
    noItems: 'Aucun article',
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

export interface OverviewItem {
  description: string;
  medium: string | null;
  dimensions: string;
  quantity: number | null;
  year: number | null;
  edition_type: string | null;
  edition_number: number | null;
  edition_total: number | null;
  price: number | null;
  currency: string | null;
  category: string | null;
  referenceImageUrls?: string[];
}

export interface OverviewOrder {
  order_number: string;
  title: string;
  status: string;
  ordered_date: string | null;
  deadline: string | null;
  gallery_name: string | null;
  contact_name: string | null;
  price: number | null;
  currency: string;
  items: OverviewItem[];
}

export interface GalleryValueSummary {
  name: string;
  value: number;
}

export interface ProductionOrdersOverviewPDFProps {
  orders: OverviewOrder[];
  language: 'en' | 'de' | 'fr';
  totalValueCHF?: number;
  perGalleryValues?: GalleryValueSummary[];
}

// ---------------------------------------------------------------------------
// Item table column widths
// ---------------------------------------------------------------------------
const ITEM_COL_DESC = '28%';
const ITEM_COL_MEDIUM = '16%';
const ITEM_COL_DIMS = '16%';
const ITEM_COL_YEAR = '7%';
const ITEM_COL_EDITION = '10%';
const ITEM_COL_QTY = '6%';
const ITEM_COL_CATEGORY = '9%';
const ITEM_COL_PRICE = '8%';

// ---------------------------------------------------------------------------
// Helper: format edition
// ---------------------------------------------------------------------------
function formatEdition(
  editionType: string | null,
  editionNumber: number | null,
  editionTotal: number | null,
): string {
  if (!editionType || editionType === 'unique') return 'Unique';
  if (editionType === 'ap') return 'AP';
  if (editionType === 'hc') return 'HC';
  if (editionType === 'ea') return 'EA';
  if (editionType === 'numbered') {
    if (editionNumber != null && editionTotal != null) {
      return `${editionNumber}/${editionTotal}`;
    }
    return 'Numbered';
  }
  return editionType;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function ProductionOrdersOverviewPDF({
  orders,
  language,
  totalValueCHF,
  perGalleryValues,
}: ProductionOrdersOverviewPDFProps) {
  const t = TRANSLATIONS[language] ?? TRANSLATIONS.en;
  const today = new Date().toLocaleDateString(
    language === 'de' ? 'de-DE' : language === 'fr' ? 'fr-FR' : 'en-GB',
  );

  const totalItems = orders.reduce(
    (sum, o) => sum + o.items.reduce((s, i) => s + (i.quantity ?? 1), 0),
    0,
  );

  // Analysis: count per category & dimensions breakdown
  const categoryCounts: Record<string, number> = {};
  const dimsCounts: Record<string, number> = {};
  for (const o of orders) {
    for (const item of o.items) {
      const cat = item.category || 'Uncategorized';
      categoryCounts[cat] = (categoryCounts[cat] || 0) + (item.quantity ?? 1);
      if (item.dimensions) {
        dimsCounts[item.dimensions] = (dimsCounts[item.dimensions] || 0) + (item.quantity ?? 1);
      }
    }
  }

  const fmtCHF = (v: number) =>
    new Intl.NumberFormat('de-CH', { style: 'currency', currency: 'CHF', minimumFractionDigits: 0 }).format(v);

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        {/* Header */}
        <PDFHeader
          title={t.overviewTitle}
          subtitle={`${t.generatedOn} ${today}`}
          language={language}
          companyName={ARTIST_NAME}
        />

        {/* Revenue Summary & Analysis */}
        {(totalValueCHF != null || (perGalleryValues && perGalleryValues.length > 0) || Object.keys(categoryCounts).length > 0) && (
          <View style={{ marginBottom: 16, borderWidth: 0.5, borderColor: PDF_COLORS.border, padding: 10 }}>
            {/* Revenue per gallery table */}
            {totalValueCHF != null && totalValueCHF > 0 && (
              <View style={{ marginBottom: 8 }}>
                {/* Table header */}
                <View style={{ flexDirection: 'row', backgroundColor: PDF_COLORS.primary900, paddingVertical: 5, paddingHorizontal: 8 }}>
                  <Text style={{ fontFamily: 'AnzianoPro', fontWeight: 'bold' as const, fontSize: 8, color: PDF_COLORS.white, textTransform: 'uppercase', letterSpacing: 0.5, width: '50%' }}>Gallery</Text>
                  <Text style={{ fontFamily: 'AnzianoPro', fontWeight: 'bold' as const, fontSize: 8, color: PDF_COLORS.white, textTransform: 'uppercase', letterSpacing: 0.5, width: '30%', textAlign: 'right' }}>Revenue (CHF)</Text>
                  <Text style={{ fontFamily: 'AnzianoPro', fontWeight: 'bold' as const, fontSize: 8, color: PDF_COLORS.white, textTransform: 'uppercase', letterSpacing: 0.5, width: '20%', textAlign: 'right' }}>Share</Text>
                </View>
                {/* Total row */}
                <View style={{ flexDirection: 'row', paddingVertical: 5, paddingHorizontal: 8, borderBottomWidth: 0.5, borderBottomColor: PDF_COLORS.border, backgroundColor: PDF_COLORS.backgroundLight }}>
                  <Text style={{ fontFamily: 'AnzianoPro', fontWeight: 'bold' as const, fontSize: 10, color: PDF_COLORS.primary900, width: '50%' }}>TOTAL</Text>
                  <Text style={{ fontFamily: 'AnzianoPro', fontWeight: 'bold' as const, fontSize: 10, color: PDF_COLORS.primary900, width: '30%', textAlign: 'right' }}>{fmtCHF(totalValueCHF)}</Text>
                  <Text style={{ fontFamily: 'AnzianoPro', fontWeight: 'bold' as const, fontSize: 10, color: PDF_COLORS.primary900, width: '20%', textAlign: 'right' }}>100%</Text>
                </View>
                {/* Per-gallery rows */}
                {perGalleryValues && [...perGalleryValues].sort((a, b) => b.value - a.value).map((g, idx) => (
                  <View key={g.name} style={{ flexDirection: 'row', paddingVertical: 4, paddingHorizontal: 8, borderBottomWidth: 0.5, borderBottomColor: PDF_COLORS.border, backgroundColor: idx % 2 === 0 ? PDF_COLORS.white : '#fafafa' }}>
                    <Text style={{ fontFamily: 'AnzianoPro', fontSize: 9, color: PDF_COLORS.primary700, width: '50%' }}>{g.name}</Text>
                    <Text style={{ fontFamily: 'AnzianoPro', fontSize: 9, color: PDF_COLORS.accent, width: '30%', textAlign: 'right' }}>{fmtCHF(g.value)}</Text>
                    <Text style={{ fontFamily: 'AnzianoPro', fontSize: 9, color: PDF_COLORS.primary400, width: '20%', textAlign: 'right' }}>{(totalValueCHF > 0 ? ((g.value / totalValueCHF) * 100).toFixed(1) : '0.0')}%</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Analysis: categories & dimensions */}
            <View style={{ flexDirection: 'row', gap: 40, marginTop: 4 }}>
              {/* Categories */}
              {Object.keys(categoryCounts).length > 0 && (
                <View>
                  <Text style={{ fontFamily: 'AnzianoPro', fontWeight: 'bold' as const, fontSize: 8, color: PDF_COLORS.primary400, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 }}>
                    By Category
                  </Text>
                  {Object.entries(categoryCounts)
                    .sort((a, b) => b[1] - a[1])
                    .map(([cat, count]) => (
                      <Text key={cat} style={{ fontFamily: 'AnzianoPro', fontSize: 8, color: PDF_COLORS.primary700, marginBottom: 1 }}>
                        {cat}: {count}
                      </Text>
                    ))}
                </View>
              )}
              {/* Dimensions */}
              {Object.keys(dimsCounts).length > 0 && (
                <View>
                  <Text style={{ fontFamily: 'AnzianoPro', fontWeight: 'bold' as const, fontSize: 8, color: PDF_COLORS.primary400, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 }}>
                    By Dimensions
                  </Text>
                  {Object.entries(dimsCounts)
                    .sort((a, b) => b[1] - a[1])
                    .map(([dims, count]) => (
                      <Text key={dims} style={{ fontFamily: 'AnzianoPro', fontSize: 8, color: PDF_COLORS.primary700, marginBottom: 1 }}>
                        {dims}: {count}
                      </Text>
                    ))}
                </View>
              )}
            </View>
          </View>
        )}

        {/* Orders with items */}
        {orders.map((order, orderIdx) => (
          <View key={`${order.order_number}-${orderIdx}`} wrap={false} style={{ marginBottom: 12 }}>
            {/* Order header bar */}
            <View
              style={{
                flexDirection: 'row',
                backgroundColor: PDF_COLORS.primary900,
                paddingVertical: 5,
                paddingHorizontal: 8,
                justifyContent: 'space-between',
              }}
            >
              <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
                <Text
                  style={{
                    fontFamily: 'AnzianoPro', fontWeight: 'bold' as const,
                    fontSize: 9,
                    color: PDF_COLORS.white,
                  }}
                >
                  {order.order_number}
                </Text>
                <Text
                  style={{
                    fontFamily: 'AnzianoPro', fontWeight: 'bold' as const,
                    fontSize: 9,
                    color: PDF_COLORS.white,
                  }}
                >
                  {order.title}
                </Text>
                <Text
                  style={{
                    fontFamily: 'AnzianoPro',
                    fontSize: 8,
                    color: PDF_COLORS.accent,
                  }}
                >
                  {translateStatus(order.status, language)}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                {order.gallery_name && (
                  <Text style={{ fontFamily: 'AnzianoPro', fontSize: 8, color: '#cccccc' }}>
                    {order.gallery_name}
                  </Text>
                )}
                {order.contact_name && (
                  <Text style={{ fontFamily: 'AnzianoPro', fontSize: 8, color: '#cccccc' }}>
                    {order.contact_name}
                  </Text>
                )}
                {order.ordered_date && (
                  <Text style={{ fontFamily: 'AnzianoPro', fontSize: 8, color: '#cccccc' }}>
                    {order.ordered_date}
                  </Text>
                )}
                {order.deadline && (
                  <Text style={{ fontFamily: 'AnzianoPro', fontSize: 8, color: '#cccccc' }}>
                    {'\u2192'} {order.deadline}
                  </Text>
                )}
              </View>
            </View>

            {/* Item table header */}
            <View
              style={{
                flexDirection: 'row',
                backgroundColor: PDF_COLORS.backgroundLight,
                paddingVertical: 4,
                paddingHorizontal: 8,
                borderBottomWidth: 0.5,
                borderBottomColor: PDF_COLORS.border,
              }}
            >
              <Text style={[styles.tableHeaderCell, { width: ITEM_COL_DESC, color: PDF_COLORS.primary400 }]}>
                {t.item}
              </Text>
              <Text style={[styles.tableHeaderCell, { width: ITEM_COL_MEDIUM, color: PDF_COLORS.primary400 }]}>
                {t.medium}
              </Text>
              <Text style={[styles.tableHeaderCell, { width: ITEM_COL_DIMS, color: PDF_COLORS.primary400 }]}>
                {t.dimensions}
              </Text>
              <Text style={[styles.tableHeaderCell, { width: ITEM_COL_YEAR, color: PDF_COLORS.primary400 }]}>
                {t.year}
              </Text>
              <Text style={[styles.tableHeaderCell, { width: ITEM_COL_EDITION, color: PDF_COLORS.primary400 }]}>
                {t.edition}
              </Text>
              <Text style={[styles.tableHeaderCell, { width: ITEM_COL_QTY, color: PDF_COLORS.primary400, textAlign: 'center' }]}>
                {t.qty}
              </Text>
              <Text style={[styles.tableHeaderCell, { width: ITEM_COL_CATEGORY, color: PDF_COLORS.primary400 }]}>
                {t.category}
              </Text>
              <Text style={[styles.tableHeaderCell, { width: ITEM_COL_PRICE, color: PDF_COLORS.primary400, textAlign: 'right' }]}>
                {t.price}
              </Text>
            </View>

            {/* Item rows */}
            {order.items.length === 0 ? (
              <View
                style={{
                  paddingVertical: 6,
                  paddingHorizontal: 8,
                  borderBottomWidth: 0.5,
                  borderBottomColor: PDF_COLORS.border,
                }}
              >
                <Text style={{ fontFamily: 'AnzianoPro', fontSize: 8, color: PDF_COLORS.primary400, fontStyle: 'italic' }}>
                  {t.noItems}
                </Text>
              </View>
            ) : (
              order.items.map((item, itemIdx) => (
                <View
                  key={`item-${orderIdx}-${itemIdx}`}
                  style={{
                    flexDirection: 'row',
                    paddingVertical: 5,
                    paddingHorizontal: 8,
                    borderBottomWidth: 0.5,
                    borderBottomColor: PDF_COLORS.border,
                    backgroundColor: itemIdx % 2 === 1 ? '#fafafa' : PDF_COLORS.white,
                  }}
                >
                  <Text style={[styles.tableCell, { width: ITEM_COL_DESC }]}>
                    {item.description}
                  </Text>
                  <Text style={[styles.tableCell, { width: ITEM_COL_MEDIUM }]}>
                    {item.medium ?? '\u2014'}
                  </Text>
                  <Text style={[styles.tableCell, { width: ITEM_COL_DIMS }]}>
                    {item.dimensions || '\u2014'}
                  </Text>
                  <Text style={[styles.tableCell, { width: ITEM_COL_YEAR }]}>
                    {item.year != null ? String(item.year) : '\u2014'}
                  </Text>
                  <Text style={[styles.tableCell, { width: ITEM_COL_EDITION }]}>
                    {formatEdition(item.edition_type, item.edition_number, item.edition_total)}
                  </Text>
                  <Text style={[styles.tableCell, { width: ITEM_COL_QTY, textAlign: 'center' }]}>
                    {item.quantity ?? 1}
                  </Text>
                  <Text style={[styles.tableCell, { width: ITEM_COL_CATEGORY }]}>
                    {item.category ?? '\u2014'}
                  </Text>
                  <Text style={[styles.tableCell, { width: ITEM_COL_PRICE, textAlign: 'right' }]}>
                    {item.price != null && item.price > 0
                      ? new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: item.currency ?? 'EUR',
                          minimumFractionDigits: 0,
                        }).format(item.price)
                      : '\u2014'}
                  </Text>
                </View>
              ))
            )}
          </View>
        ))}

        {/* Summary */}
        <View style={{ marginTop: 8, flexDirection: 'row', gap: 24 }}>
          <Text style={{ fontFamily: 'AnzianoPro', fontWeight: 'bold' as const, fontSize: 10, color: PDF_COLORS.primary900 }}>
            {t.totalOrders}: {orders.length}
          </Text>
          <Text style={{ fontFamily: 'AnzianoPro', fontWeight: 'bold' as const, fontSize: 10, color: PDF_COLORS.primary900 }}>
            {t.totalItems}: {totalItems}
          </Text>
        </View>

        {/* Footer */}
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
