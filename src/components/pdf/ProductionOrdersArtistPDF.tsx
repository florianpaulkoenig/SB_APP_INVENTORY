// ---------------------------------------------------------------------------
// NOA Inventory -- Production Orders Artist Export PDF
// Simplified export for the artist: Item, Dimensions, Qty, Category only
//
// Pagination is computed manually from measured image dimensions so the
// content flows without large gaps: orders follow each other on shared
// pages, an order header is never separated from its first item, and when
// an order continues onto the next page its title bar + column header are
// repeated at the top of that page.
// ---------------------------------------------------------------------------

import type { ReactElement } from 'react';
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
// Layout metrics (pt) for manual pagination.
// A4 = 841.89pt tall; page padding 50 top + 60 bottom → ~732 usable.
// Slightly conservative values so estimate errors produce small bottom gaps
// instead of overflowing rows.
// ---------------------------------------------------------------------------
const PAGE_CONTENT_H = 712;    // usable height per page (with safety margin)
const FIRST_PAGE_EXTRA = 130;  // PDFHeader block on page 1
const ORDER_HEADER_H = 42;     // black title bar + column header row
const ORDER_SPACING = 14;      // gap below each order
const NO_ITEMS_H = 22;
const TOTAL_H = 40;
const IMG_W = 120;             // rendered thumbnail width
const IMGS_PER_ROW = 3;        // 120pt + gaps in ~455pt row width

type ArtistItem = OverviewOrder['items'][number];

function textLines(text: string, charsPerLine: number): number {
  return Math.max(1, Math.ceil(text.length / charsPerLine));
}

/** Estimated rendered height of one item block (row + reference images). */
function itemHeight(item: ArtistItem): number {
  // Description column is ~190pt wide at fontSize 10 → ~30 chars per line
  const descLines = textLines(item.description ?? '', 30);
  const rowH = 10 + descLines * 13;

  const n = item.referenceImageUrls?.length ?? 0;
  if (n === 0) return rowH + 1;

  // Per-image cell height from measured dimensions (fallback: square)
  const cellHs: number[] = [];
  for (let i = 0; i < n; i++) {
    const dims = item.referenceImageDims?.[i];
    const imgH = dims && dims.w > 0 ? (IMG_W * dims.h) / dims.w : IMG_W;
    const note = item.referenceImageNotes?.[i] ?? '';
    const noteH = note ? textLines(note, 30) * 9 + 2 : 0;
    cellHs.push(imgH + noteH);
  }
  let imagesH = 0;
  for (let i = 0; i < cellHs.length; i += IMGS_PER_ROW) {
    imagesH += Math.max(...cellHs.slice(i, i + IMGS_PER_ROW)) + 6;
  }
  return rowH + imagesH + 12 + 1;
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
    <>
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
                style={{ width: IMG_W, objectFit: 'contain' as const }}
              />
              {item.referenceImageNotes?.[imgIdx] ? (
                <Text style={{ fontFamily: 'AnzianoPro', fontSize: 7, color: PDF_COLORS.primary700, marginTop: 2, width: IMG_W }}>
                  {item.referenceImageNotes[imgIdx]}
                </Text>
              ) : null}
            </View>
          ))}
        </View>
      )}
    </>
  );
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

  // -------------------------------------------------------------------------
  // Manual pagination: walk all orders, track remaining page height, and emit
  // unbreakable blocks with explicit `break` flags. When an order spills onto
  // a new page, its header is repeated there together with the next item.
  // -------------------------------------------------------------------------
  const blocks: ReactElement[] = [];
  let rem = PAGE_CONTENT_H - FIRST_PAGE_EXTRA;

  const consume = (h: number) => { rem = Math.max(0, rem - h); };
  const newPage = () => { rem = PAGE_CONTENT_H; };

  orders.forEach((order, orderIdx) => {
    const itemHs = order.items.map(itemHeight);
    const bodyH = order.items.length === 0 ? NO_ITEMS_H : itemHs.reduce((a, b) => a + b, 0);
    const totalOrderH = ORDER_HEADER_H + bodyH + ORDER_SPACING;

    if (totalOrderH <= PAGE_CONTENT_H) {
      // Order fits on a single page → keep it atomic
      const breakBefore = totalOrderH > rem;
      if (breakBefore) newPage();
      blocks.push(
        <View
          key={`order-${orderIdx}`}
          wrap={false}
          break={breakBefore}
          style={{ marginBottom: ORDER_SPACING }}
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
        </View>,
      );
      consume(totalOrderH);
      return;
    }

    // Order longer than one page → flow items, repeating the header on
    // every page the order continues on. Header always stays glued to the
    // item that follows it.
    let headerPending = true; // header not yet emitted on current page

    order.items.forEach((item, itemIdx) => {
      const h = itemHs[itemIdx];
      const needed = (headerPending ? ORDER_HEADER_H : 0) + h;

      if (needed > rem) {
        newPage();
        // New page always starts with the (repeated) order header
        blocks.push(
          <View key={`order-${orderIdx}-cont-${itemIdx}`} wrap={false} break>
            <OrderHeader order={order} t={t} />
            <ItemBlock item={item} itemIdx={itemIdx} />
          </View>,
        );
        consume(ORDER_HEADER_H + h);
        headerPending = false;
      } else if (headerPending) {
        blocks.push(
          <View key={`order-${orderIdx}-head-${itemIdx}`} wrap={false}>
            <OrderHeader order={order} t={t} />
            <ItemBlock item={item} itemIdx={itemIdx} />
          </View>,
        );
        consume(needed);
        headerPending = false;
      } else {
        blocks.push(
          <View key={`item-${orderIdx}-${itemIdx}`} wrap={false}>
            <ItemBlock item={item} itemIdx={itemIdx} />
          </View>,
        );
        consume(h);
      }
    });

    blocks.push(<View key={`spacer-${orderIdx}`} style={{ height: ORDER_SPACING }} />);
    consume(ORDER_SPACING);
  });

  const totalBreak = TOTAL_H > rem;

  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        <PDFHeader
          title={t.title}
          subtitle={subtitle}
          language={language}
          companyName={ARTIST_NAME}
        />

        {blocks}

        {/* Total */}
        <View
          wrap={false}
          break={totalBreak}
          style={{ marginTop: 8, borderTopWidth: 1, borderTopColor: PDF_COLORS.primary900, paddingTop: 8 }}
        >
          <Text style={{ fontFamily: 'AnzianoPro', fontWeight: 'bold' as const, fontSize: 11, color: PDF_COLORS.primary900 }}>
            {t.totalPieces}: {totalPieces}
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>{`© ${ARTIST_NAME}`}</Text>
          <Text
            style={styles.pageNumber}
            render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}
