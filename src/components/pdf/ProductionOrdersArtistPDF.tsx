// ---------------------------------------------------------------------------
// NOA Inventory -- Production Orders Artist Export PDF
// Simplified export for the artist: Item, Dimensions, Qty, Category only
//
// Pagination: small orders flow together and are never split across pages.
// Orders too long for one page get their own <Page> with the order header
// rendered `fixed`, so the title repeats on every page the order spans and
// is never separated from its items by a page break.
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
// Page-break height estimates (pt) — orders that fit comfortably on one page
// flow together; anything bigger gets its own page with a repeating header.
// ---------------------------------------------------------------------------
const EST_ORDER_HEADER = 40;       // order header + table header
const EST_ITEM_ROW = 24;           // text-only item row
const EST_IMAGE_ROW = 190;         // one row of reference images (~3 images)
const EST_IMAGES_PER_ROW = 3;
const EST_KEEP_ORDER_MAX = 450;    // keep the whole order together below this

type ArtistItem = OverviewOrder['items'][number];

function estimateItemHeight(item: ArtistItem): number {
  const imageCount = item.referenceImageUrls?.length ?? 0;
  if (imageCount === 0) return EST_ITEM_ROW;
  return EST_ITEM_ROW + Math.ceil(imageCount / EST_IMAGES_PER_ROW) * EST_IMAGE_ROW + 12;
}

// ---------------------------------------------------------------------------
// Building blocks
// ---------------------------------------------------------------------------

/** Black order title bar + grey column header row. */
function OrderHeader({ order, t }: { order: OverviewOrder; t: Record<string, string> }) {
  return (
    <>
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
    </>
  );
}

/** One item row + its reference images — never split across pages. */
function ItemBlock({ item, itemIdx }: { item: ArtistItem; itemIdx: number }) {
  return (
    <View wrap={false}>
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
            <View key={`ref-${imgIdx}`} style={{ marginRight: 8 }}>
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
}

// ---------------------------------------------------------------------------
// Pagination chunks — consecutive small orders share flowing pages, every
// long order gets its own <Page> so its header can repeat via `fixed`.
// ---------------------------------------------------------------------------

type Chunk =
  | { type: 'flow'; orders: { order: OverviewOrder; orderIdx: number }[] }
  | { type: 'single'; order: OverviewOrder; orderIdx: number };

function buildChunks(orders: OverviewOrder[]): Chunk[] {
  const chunks: Chunk[] = [];
  orders.forEach((order, orderIdx) => {
    const est =
      EST_ORDER_HEADER +
      order.items.reduce((sum, it) => sum + estimateItemHeight(it), 0);
    if (est <= EST_KEEP_ORDER_MAX) {
      const last = chunks[chunks.length - 1];
      if (last && last.type === 'flow') {
        last.orders.push({ order, orderIdx });
      } else {
        chunks.push({ type: 'flow', orders: [{ order, orderIdx }] });
      }
    } else {
      chunks.push({ type: 'single', order, orderIdx });
    }
  });
  return chunks;
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
    subtitle += ` | ${fromStr} → ${toStr}`;
  }

  let totalPieces = 0;
  for (const o of orders) {
    for (const i of o.items) {
      totalPieces += i.quantity ?? 1;
    }
  }

  const chunks = buildChunks(orders);

  const footer = (
    <View style={styles.footer} fixed>
      <Text style={styles.footerText}>{`© ${ARTIST_NAME}`}</Text>
      <Text
        style={styles.pageNumber}
        render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
      />
    </View>
  );

  const total = (
    <View style={{ marginTop: 8, borderTopWidth: 1, borderTopColor: PDF_COLORS.primary900, paddingTop: 8 }}>
      <Text style={{ fontFamily: 'AnzianoPro', fontWeight: 'bold' as const, fontSize: 11, color: PDF_COLORS.primary900 }}>
        {t.totalPieces}: {totalPieces}
      </Text>
    </View>
  );

  return (
    <Document>
      {chunks.map((chunk, chunkIdx) => {
        const isFirst = chunkIdx === 0;
        const isLast = chunkIdx === chunks.length - 1;

        const pdfHeader = (
          <PDFHeader
            title={t.title}
            subtitle={subtitle}
            language={language}
            companyName={ARTIST_NAME}
          />
        );

        if (chunk.type === 'single') {
          // Long order: own page, header repeats on every page it spans
          return (
            <Page key={chunkIdx} size="A4" style={styles.page} wrap>
              <View fixed>
                {isFirst ? pdfHeader : null}
                <OrderHeader order={chunk.order} t={t} />
              </View>

              <View style={{ marginBottom: 14 }}>
                {chunk.order.items.map((item, itemIdx) => (
                  <ItemBlock key={`item-${chunk.orderIdx}-${itemIdx}`} item={item} itemIdx={itemIdx} />
                ))}
              </View>

              {isLast ? total : null}
              {footer}
            </Page>
          );
        }

        // Consecutive small orders: flow together, each order unbreakable
        return (
          <Page key={chunkIdx} size="A4" style={styles.page} wrap>
            {isFirst ? pdfHeader : null}

            {chunk.orders.map(({ order, orderIdx }) => (
              <View
                key={`${order.order_number}-${orderIdx}`}
                style={{ marginBottom: 14 }}
                wrap={false}
              >
                <OrderHeader order={order} t={t} />

                {order.items.length === 0 ? (
                  <View style={{ paddingVertical: 6, paddingHorizontal: 10, borderBottomWidth: 0.5, borderBottomColor: PDF_COLORS.border }}>
                    <Text style={{ fontFamily: 'AnzianoPro', fontSize: 9, color: PDF_COLORS.primary400 }}>
                      {t.noItems}
                    </Text>
                  </View>
                ) : (
                  order.items.map((item, itemIdx) => (
                    <ItemBlock key={`item-${orderIdx}-${itemIdx}`} item={item} itemIdx={itemIdx} />
                  ))
                )}
              </View>
            ))}

            {isLast ? total : null}
            {footer}
          </Page>
        );
      })}
    </Document>
  );
}
