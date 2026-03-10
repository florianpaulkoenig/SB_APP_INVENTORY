// ---------------------------------------------------------------------------
// NOA Inventory -- Production Orders Artist Export PDF
// Simplified export for the artist: Item, Dimensions, Qty, Category only
// ---------------------------------------------------------------------------

import { Document, Page, View, Text, Image } from '@react-pdf/renderer';
import styles, { PDF_COLORS } from './PDFStyles';
import { PDFHeader } from './PDFHeader';
import { ARTIST_NAME, COMPANY_NAME } from '../../lib/constants';
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

        {orders.map((order, orderIdx) => (
          <View key={`${order.order_number}-${orderIdx}`} wrap={false} style={{ marginBottom: 14 }}>
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

            {/* Item rows */}
            {order.items.length === 0 ? (
              <View style={{ paddingVertical: 6, paddingHorizontal: 10, borderBottomWidth: 0.5, borderBottomColor: PDF_COLORS.border }}>
                <Text style={{ fontFamily: 'AnzianoPro', fontSize: 9, color: PDF_COLORS.primary400, fontStyle: 'italic' }}>
                  {t.noItems}
                </Text>
              </View>
            ) : (
              order.items.map((item, itemIdx) => (
                <View key={`item-${orderIdx}-${itemIdx}`}>
                  <View
                    style={{
                      flexDirection: 'row',
                      paddingVertical: 5,
                      paddingHorizontal: 10,
                      borderBottomWidth: item.referenceImageUrl ? 0 : 0.5,
                      borderBottomColor: PDF_COLORS.border,
                      backgroundColor: itemIdx % 2 === 1 ? '#fafafa' : PDF_COLORS.white,
                    }}
                  >
                    <Text style={[styles.tableCell, { width: COL_ITEM, fontSize: 10 }]}>
                      {item.description}
                    </Text>
                    <Text style={[styles.tableCell, { width: COL_DIMS }]}>
                      {item.dimensions || '\u2014'}
                    </Text>
                    <Text style={[styles.tableCell, { width: COL_QTY, textAlign: 'center', fontFamily: 'AnzianoPro', fontWeight: 'bold' as const }]}>
                      {item.quantity ?? 1}
                    </Text>
                    <Text style={[styles.tableCell, { width: COL_CATEGORY }]}>
                      {item.category ?? '\u2014'}
                    </Text>
                  </View>
                  {/* Per-item reference image */}
                  {item.referenceImageUrl && (
                    <View
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderBottomWidth: 0.5,
                        borderBottomColor: PDF_COLORS.border,
                        backgroundColor: itemIdx % 2 === 1 ? '#fafafa' : PDF_COLORS.white,
                      }}
                    >
                      <Image
                        src={item.referenceImageUrl}
                        style={{ width: 120, objectFit: 'contain' as const }}
                      />
                    </View>
                  )}
                </View>
              ))
            )}
          </View>
        ))}

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
