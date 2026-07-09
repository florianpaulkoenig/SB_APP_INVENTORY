// ---------------------------------------------------------------------------
// NOA Inventory -- Production Orders Artist Export PDF
// Simplified export for the artist: Item, Dimensions, Qty, Category only
// ---------------------------------------------------------------------------

import { Document, Page, View, Text, Image } from '@react-pdf/renderer';
import styles, { PDF_COLORS } from './PDFStyles';
import { PDFHeader } from './PDFHeader';
import { ARTIST_NAME } from '../../lib/constants';
import type { OverviewOrder } from './ProductionOrdersOverviewPDF';

// ---------------------------------------------------------------------------
// Translations
// ---------------------------------------------------------------------------
const TRANSLATIONS: Record<string, Record<string, string>> = {
  en: {
    title: 'Production Schedule',
    item: 'Item',
    dimensions: 'Dimensions',
    qty: 'Qty',
    category: 'Category',
    deadline: 'Deadline',
    noItems: 'No items',
    totalPieces: 'Total Pieces',
    generatedOn: 'Generated on',
  },
  de: {
    title: 'Produktionsplan',
    item: 'Position',
    dimensions: 'Masse',
    qty: 'Anz.',
    category: 'Kategorie',
    deadline: 'Frist',
    noItems: 'Keine Positionen',
    totalPieces: 'Stück gesamt',
    generatedOn: 'Erstellt am',
  },
  fr: {
    title: 'Plan de production',
    item: 'Article',
    dimensions: 'Dimensions',
    qty: 'Qté',
    category: 'Catégorie',
    deadline: 'Délai',
    noItems: 'Aucun article',
    totalPieces: 'Total pièces',
    generatedOn: 'Généré le',
  },
};

// Column widths
const COL_ITEM = '40%';
const COL_DIMS = '25%';
const COL_QTY = '10%';
const COL_CATEGORY = '25%';

// ---------------------------------------------------------------------------
// Page-break height estimates (pt) — decide how much of an order to keep
// together. Small orders stay on one page; for long orders the header is at
// least kept together with the first item so the title is never separated
// from its reference images by a page break.
// ---------------------------------------------------------------------------
const EST_ORDER_HEADER = 40;       // order header + table header
const EST_ITEM_ROW = 24;           // text-only item row
const EST_IMAGE_ROW = 190;         // one row of reference images (~3 images)
const EST_IMAGES_PER_ROW = 3;
const EST_KEEP_ORDER_MAX = 450;    // keep the whole order together below this
const EST_KEEP_FIRST_MAX = 500;    // keep header + first item together below this

function estimateItemHeight(item: OverviewOrder['items'][number]): number {
  const imageCount = item.referenceImageUrls?.length ?? 0;
  if (imageCount === 0) return EST_ITEM_ROW;
  return EST_ITEM_ROW + Math.ceil(imageCount / EST_IMAGES_PER_ROW) * EST_IMAGE_ROW + 12;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
export interface ProductionOrdersArtistPDFProps {
  orders: OverviewOrder[];
  language: 'en' | 'de' | 'fr';
  dateRange?: { from?: string; to?: string };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function ProductionOrdersArtistPDF({
  orders,
  language,
  dateRange,
}: ProductionOrdersArtistPDFProps) {
  const t = TRANSLATIONS[language] ?? TRANSLATIONS.en;
  const today = new Date().toLocaleDateString(
    language === 'de' ? 'de-DE' : language === 'fr' ? 'fr-FR' : 'en-GB',
  );

  let subtitle = `${t.generatedOn} ${today}`;
  if (dateRange) {
    const fromStr = dateRange.from || '...';
    const toStr = dateRange.to || '...';
    subtitle += ` | ${fromStr} \u2192 ${toStr}`;
  }

  let totalPieces = 0;
  for (const o of orders) {
    for (const i of o.items) {
      totalPieces += i.quantity ?? 1;
    }
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <PDFHeader
          title={t.title}
          subtitle={subtitle}
          language={language}
          companyName={ARTIST_NAME}
        />

        {orders.map((order, orderIdx) => {
          const estTotal =
            EST_ORDER_HEADER +
            order.items.reduce((sum, it) => sum + estimateItemHeight(it), 0);
          // Small orders are never split across pages. Long orders may wrap,
          // but the first item is rendered inside the unbreakable header
          // block, so the title is never separated from its reference images.
          const keepWholeOrder = estTotal <= EST_KEEP_ORDER_MAX;
          const firstItem = order.items[0];
          const keepFirstWithHeader =
            !keepWholeOrder &&
            firstItem != null &&
            EST_ORDER_HEADER + estimateItemHeight(firstItem) <= EST_KEEP_FIRST_MAX;

          const renderItem = (item: OverviewOrder['items'][number], itemIdx: number) => (
            <View key={`item-${orderIdx}-${itemIdx}`} wrap={false}>
              <View
                style={{
                  flexDirection: 'row',
                  paddingVertical: 5,
                  paddingHorizontal: 10,
                  borderBottomWidth: item.referenceImageUrls && item.referenceImageUrls.length > 0 ? 0 : 0.5,
                  borderBottomColor: PDF_COLORS.border,
                  backgroundColor: itemIdx % 2 === 1 ? '#fafafa' : PDF_COLORS.white,
                }}
              >
                <Text style={[styles.tableCell, { width: COL_ITEM, fontSize: 10 }]}>
                  {item.description}
                </Text>
                <Text style={[styles.tableCell, { width: COL_DIMS }]}>
                  {item.dimensions || '—'}
                </Text>
                <Text style={[styles.tableCell, { width: COL_QTY, textAlign: 'center', fontFamily: 'AnzianoPro', fontWeight: 'bold' as const }]}>
                  {item.quantity ?? 1}
                </Text>
                <Text style={[styles.tableCell, { width: COL_CATEGORY }]}>
                  {item.category ?? '—'}
                </Text>
              </View>
              {/* Per-item reference images */}
              {item.referenceImageUrls && item.referenceImageUrls.length > 0 && (
                <View
                  style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    gap: 6,
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderBottomWidth: 0.5,
                    borderBottomColor: PDF_COLORS.border,
                    backgroundColor: itemIdx % 2 === 1 ? '#fafafa' : PDF_COLORS.white,
                  }}
                >
                  {item.referenceImageUrls.map((url, imgIdx) => (
                    <View key={`ref-${orderIdx}-${itemIdx}-${imgIdx}`} style={{ marginRight: 8 }}>
                      <Image
                        src={url}
                        style={{ width: 120, objectFit: 'contain' as const }}
                      />
                      {item.referenceImageNotes?.[imgIdx] ? (
                        <Text style={{ fontFamily: 'AnzianoPro', fontSize: 7, color: PDF_COLORS.primary700, marginTop: 2, width: 120 }}>
                          {item.referenceImageNotes[imgIdx]}
                        </Text>
                      ) : null}
                    </View>
                  ))}
                </View>
              )}
            </View>
          );

          return (
          <View
            key={`${order.order_number}-${orderIdx}`}
            style={{ marginBottom: 14 }}
            wrap={!keepWholeOrder}
          >
            {/* Order header + table header (+ first item of long orders) kept together */}
            <View wrap={false}>
              {/* Order header */}
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  backgroundColor: PDF_COLORS.primary900,
                  paddingVertical: 6,
                  paddingHorizontal: 10,
                }}
              >
                <Text style={{ fontFamily: 'AnzianoPro', fontWeight: 'bold' as const, fontSize: 10, color: PDF_COLORS.white }}>
                  {order.title}
                </Text>
                {order.deadline && (
                  <Text style={{ fontFamily: 'AnzianoPro', fontWeight: 'bold' as const, fontSize: 10, color: PDF_COLORS.white }}>
                    {t.deadline}: {order.deadline}
                  </Text>
                )}
              </View>

              {/* Table header */}
              <View
                style={{
                  flexDirection: 'row',
                  backgroundColor: PDF_COLORS.backgroundLight,
                  paddingVertical: 4,
                  paddingHorizontal: 10,
                  borderBottomWidth: 0.5,
                  borderBottomColor: PDF_COLORS.border,
                }}
              >
                <Text style={[styles.tableHeaderCell, { width: COL_ITEM, color: PDF_COLORS.primary400 }]}>
                  {t.item}
                </Text>
                <Text style={[styles.tableHeaderCell, { width: COL_DIMS, color: PDF_COLORS.primary400 }]}>
                  {t.dimensions}
                </Text>
                <Text style={[styles.tableHeaderCell, { width: COL_QTY, color: PDF_COLORS.primary400, textAlign: 'center' }]}>
                  {t.qty}
                </Text>
                <Text style={[styles.tableHeaderCell, { width: COL_CATEGORY, color: PDF_COLORS.primary400 }]}>
                  {t.category}
                </Text>
              </View>

              {keepFirstWithHeader ? renderItem(firstItem, 0) : null}
            </View>

            {/* Remaining item rows — each item+images kept together */}
            {order.items.length === 0 ? (
              <View style={{ paddingVertical: 6, paddingHorizontal: 10, borderBottomWidth: 0.5, borderBottomColor: PDF_COLORS.border }}>
                <Text style={{ fontFamily: 'AnzianoPro', fontSize: 9, color: PDF_COLORS.primary400 }}>
                  {t.noItems}
                </Text>
              </View>
            ) : (
              order.items
                .slice(keepFirstWithHeader ? 1 : 0)
                .map((item, idx) => renderItem(item, keepFirstWithHeader ? idx + 1 : idx))
            )}
          </View>
          );
        })}

        {/* Total */}
        <View style={{ marginTop: 8, borderTopWidth: 1, borderTopColor: PDF_COLORS.primary900, paddingTop: 8 }}>
          <Text style={{ fontFamily: 'AnzianoPro', fontWeight: 'bold' as const, fontSize: 11, color: PDF_COLORS.primary900 }}>
            {t.totalPieces}: {totalPieces}
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>{`\u00a9 ${ARTIST_NAME}`}</Text>
          <Text
            style={styles.pageNumber}
            render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}
