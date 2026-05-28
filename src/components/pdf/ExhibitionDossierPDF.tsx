// ---------------------------------------------------------------------------
// Exhibition Dossier PDF
// Structure:
//   Page 1  — Title page (exhibition name, venue, dates)
//   Page 2+ — Exhibition text (if present)
//   Page N+ — Floor plan pages (one per uploaded page)
//   Last    — Linked production orders
// ---------------------------------------------------------------------------

import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';
import styles, { PDF_COLORS } from './PDFStyles';
import { ARTIST_NAME, COMPANY_NAME } from '../../lib/constants';
import { formatDate } from '../../lib/utils';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface DossierProductionOrder {
  order_number: string;
  title: string;
  status: string;
  deadline: string | null;
  items: Array<{
    description: string;
    medium: string | null;
    dimensions: string;
    quantity: number;
    referenceImageUrls?: string[];
  }>;
}

export interface ExhibitionDossierPDFProps {
  exhibition: {
    title: string;
    type?: string | null;
    venue?: string | null;
    city?: string | null;
    country?: string | null;
    start_date?: string | null;
    end_date?: string | null;
    description_text?: string | null;
    notes?: string | null;
  };
  /** data-URL of each floor plan page (JPEG) */
  floorPlanImages: string[];
  productionOrders: DossierProductionOrder[];
}

// ---------------------------------------------------------------------------
// Local styles
// ---------------------------------------------------------------------------

const d = StyleSheet.create({
  // ---------- Title page ---------------------------------------------------
  titlePage: {
    fontFamily: 'AnzianoPro',
    backgroundColor: PDF_COLORS.white,
    paddingHorizontal: 60,
    paddingTop: 60,
    paddingBottom: 60,
    flexDirection: 'column',
  },
  titleTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 0,
  },
  companySmall: {
    fontFamily: 'AnzianoPro',
    fontWeight: 'bold' as const,
    fontSize: 8,
    color: PDF_COLORS.primary400,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  dossierTag: {
    fontFamily: 'AnzianoPro',
    fontSize: 8,
    color: PDF_COLORS.primary400,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  // Spacer grows to push title to vertical center
  titleSpacer: {
    flexGrow: 1,
  },
  titleCenter: {
    flexGrow: 2,
    justifyContent: 'center',
  },
  artistNameTitle: {
    fontFamily: 'AnzianoPro',
    fontWeight: 'bold' as const,
    fontSize: 11,
    color: PDF_COLORS.primary400,
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  exhibitionTitleLarge: {
    fontFamily: 'AnzianoPro',
    fontWeight: 'bold' as const,
    fontSize: 32,
    color: PDF_COLORS.primary900,
    textTransform: 'uppercase',
    letterSpacing: 1,
    lineHeight: 1.15,
    marginBottom: 6,
  },
  exhibitionType: {
    fontFamily: 'AnzianoPro',
    fontSize: 12,
    color: PDF_COLORS.primary400,
    letterSpacing: 1,
    marginBottom: 28,
  },
  titleDivider: {
    height: 1,
    backgroundColor: PDF_COLORS.primary900,
    width: 50,
    marginBottom: 24,
  },
  titleMetaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  titleMetaLabel: {
    fontFamily: 'AnzianoPro',
    fontSize: 7,
    color: PDF_COLORS.primary400,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    width: 70,
    marginTop: 1,
  },
  titleMetaValue: {
    fontFamily: 'AnzianoPro',
    fontSize: 11,
    color: PDF_COLORS.primary700,
    flex: 1,
  },
  titleBottom: {
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  titleBottomLine: {
    height: 0.5,
    backgroundColor: PDF_COLORS.border,
    marginBottom: 10,
  },
  titleBottomText: {
    fontFamily: 'AnzianoPro',
    fontSize: 7,
    color: PDF_COLORS.primary400,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },

  // ---------- Exhibition text page -----------------------------------------
  textPageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: PDF_COLORS.border,
  },
  textPageArtist: {
    fontFamily: 'AnzianoPro',
    fontWeight: 'bold' as const,
    fontSize: 10,
    color: PDF_COLORS.primary900,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  textPageLabel: {
    fontFamily: 'AnzianoPro',
    fontSize: 10,
    color: PDF_COLORS.primary400,
    letterSpacing: 1,
  },
  textParagraph: {
    fontFamily: 'AnzianoPro',
    fontSize: 11,
    color: PDF_COLORS.primary700,
    lineHeight: 1.7,
    marginBottom: 14,
  },

  // ---------- Floor plan pages ---------------------------------------------
  floorPlanPage: {
    fontFamily: 'AnzianoPro',
    backgroundColor: PDF_COLORS.white,
    padding: 0,
  },
  floorPlanImage: {
    width: '100%',
    height: '100%',
    objectFit: 'contain' as const,
  },
  floorPlanLabel: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  floorPlanLabelText: {
    fontFamily: 'AnzianoPro',
    fontSize: 7,
    color: PDF_COLORS.primary400,
    letterSpacing: 2,
    textTransform: 'uppercase',
    backgroundColor: PDF_COLORS.white,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },

  // ---------- Production orders page ---------------------------------------
  poHeaderRow: {
    flexDirection: 'row',
    backgroundColor: PDF_COLORS.primary900,
    paddingVertical: 7,
    paddingHorizontal: 10,
    marginBottom: 0,
  },
  poHeaderCell: {
    fontFamily: 'AnzianoPro',
    fontWeight: 'bold' as const,
    fontSize: 8,
    color: PDF_COLORS.white,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  poOrderBlock: {
    marginBottom: 16,
    borderWidth: 0.5,
    borderColor: PDF_COLORS.border,
  },
  poOrderMeta: {
    flexDirection: 'row',
    backgroundColor: PDF_COLORS.backgroundLight,
    paddingVertical: 7,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  poOrderNumber: {
    fontFamily: 'AnzianoPro',
    fontWeight: 'bold' as const,
    fontSize: 9,
    color: PDF_COLORS.primary900,
    width: '22%',
  },
  poOrderTitle: {
    fontFamily: 'AnzianoPro',
    fontWeight: 'bold' as const,
    fontSize: 9,
    color: PDF_COLORS.primary900,
    flex: 1,
  },
  poOrderStatus: {
    fontFamily: 'AnzianoPro',
    fontSize: 8,
    color: PDF_COLORS.primary400,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    width: '18%',
    textAlign: 'right' as const,
  },
  poItemRow: {
    flexDirection: 'row',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderTopWidth: 0.5,
    borderTopColor: PDF_COLORS.border,
  },
  poItemRowAlt: {
    flexDirection: 'row',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderTopWidth: 0.5,
    borderTopColor: PDF_COLORS.border,
    backgroundColor: PDF_COLORS.backgroundLight,
  },
  poItemDesc: {
    fontFamily: 'AnzianoPro',
    fontWeight: 'bold' as const,
    fontSize: 8,
    color: PDF_COLORS.primary900,
    flex: 1,
  },
  poItemMeta: {
    fontFamily: 'AnzianoPro',
    fontSize: 8,
    color: PDF_COLORS.primary700,
    width: '25%',
  },
  poItemDims: {
    fontFamily: 'AnzianoPro',
    fontSize: 8,
    color: PDF_COLORS.primary700,
    width: '22%',
  },
  poItemQty: {
    fontFamily: 'AnzianoPro',
    fontSize: 8,
    color: PDF_COLORS.primary700,
    width: '8%',
    textAlign: 'right' as const,
  },

  // ---------- Reference photos (per order) ---------------------------------
  refSection: {
    paddingTop: 10,
    paddingHorizontal: 10,
    paddingBottom: 10,
    borderTopWidth: 0.5,
    borderTopColor: PDF_COLORS.border,
  },
  refSectionLabel: {
    fontFamily: 'AnzianoPro',
    fontWeight: 'bold' as const,
    fontSize: 7,
    color: PDF_COLORS.primary400,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  refItemBlock: {
    marginBottom: 10,
  },
  refItemCaption: {
    fontFamily: 'AnzianoPro',
    fontWeight: 'bold' as const,
    fontSize: 8,
    color: PDF_COLORS.primary900,
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  refPhotoGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
  },
  refPhotoCellBox: {
    height: 120,
    backgroundColor: '#F4F3F1',
    borderRadius: 2,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  refPhotoCellImage: {
    width: '100%',
    height: 120,
    objectFit: 'contain' as const,
  },
});

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ExhibitionDossierPDF({
  exhibition,
  floorPlanImages,
  productionOrders,
}: ExhibitionDossierPDFProps) {
  const location = [exhibition.city, exhibition.country].filter(Boolean).join(', ');
  const dateStr = [
    exhibition.start_date ? formatDate(exhibition.start_date) : null,
    exhibition.end_date   ? formatDate(exhibition.end_date)   : null,
  ].filter(Boolean).join(' — ');

  const hasText   = !!exhibition.description_text?.trim();
  const hasFloors = floorPlanImages.length > 0;
  const hasPOs    = productionOrders.length > 0;

  // Split exhibition text into paragraphs
  const paragraphs = hasText
    ? exhibition.description_text!
        .split(/\n{2,}/)
        .map((p) => p.trim())
        .filter(Boolean)
    : [];

  return (
    <Document>
      {/* ================================================================ */}
      {/* PAGE 1 — TITLE PAGE                                              */}
      {/* ================================================================ */}
      <Page size="A4" style={d.titlePage}>
        {/* Top bar: company | dossier tag */}
        <View style={d.titleTop}>
          <Text style={d.companySmall}>{COMPANY_NAME}</Text>
          <Text style={d.dossierTag}>Exhibition Dossier</Text>
        </View>

        <View style={d.titleSpacer} />

        {/* Main title block */}
        <View style={d.titleCenter}>
          <Text style={d.artistNameTitle}>{ARTIST_NAME}</Text>
          <Text style={d.exhibitionTitleLarge}>{exhibition.title}</Text>
          {exhibition.type && (
            <Text style={d.exhibitionType}>{exhibition.type}</Text>
          )}
          <View style={d.titleDivider} />

          {exhibition.venue && (
            <View style={d.titleMetaRow}>
              <Text style={d.titleMetaLabel}>Venue</Text>
              <Text style={d.titleMetaValue}>{exhibition.venue}</Text>
            </View>
          )}
          {location && (
            <View style={d.titleMetaRow}>
              <Text style={d.titleMetaLabel}>Location</Text>
              <Text style={d.titleMetaValue}>{location}</Text>
            </View>
          )}
          {dateStr && (
            <View style={d.titleMetaRow}>
              <Text style={d.titleMetaLabel}>Dates</Text>
              <Text style={d.titleMetaValue}>{dateStr}</Text>
            </View>
          )}
        </View>

        <View style={d.titleSpacer} />

        {/* Bottom: copyright line */}
        <View style={d.titleBottom}>
          <View style={d.titleBottomLine} />
          <Text style={d.titleBottomText}>{`© ${ARTIST_NAME} · ${COMPANY_NAME}`}</Text>
        </View>
      </Page>

      {/* ================================================================ */}
      {/* EXHIBITION TEXT                                                   */}
      {/* ================================================================ */}
      {hasText && (
        <Page size="A4" style={styles.page}>
          {/* Header */}
          <View style={d.textPageHeader}>
            <Text style={d.textPageArtist}>{ARTIST_NAME}</Text>
            <Text style={d.textPageLabel}>{exhibition.title}</Text>
          </View>

          {/* Section label */}
          <Text style={[styles.sectionTitle, { marginBottom: 16 }]}>
            Exhibition Text
          </Text>

          {/* Paragraphs */}
          {paragraphs.map((para, i) => (
            <Text key={i} style={d.textParagraph}>
              {para}
            </Text>
          ))}

          {/* Standard footer */}
          <View style={styles.footer} fixed>
            <Text style={styles.footerText}>{`© ${ARTIST_NAME}`}</Text>
            <Text
              style={styles.pageNumber}
              render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
            />
          </View>
        </Page>
      )}

      {/* ================================================================ */}
      {/* FLOOR PLAN PAGES — one per image                                 */}
      {/* ================================================================ */}
      {hasFloors &&
        floorPlanImages.map((imgUrl, idx) => (
          <Page key={`fp-${idx}`} size="A4" style={d.floorPlanPage}>
            <Image src={imgUrl} style={d.floorPlanImage} />
            {/* Floating label */}
            <View style={d.floorPlanLabel} fixed>
              <Text style={d.floorPlanLabelText}>
                {`Floor Plan${floorPlanImages.length > 1 ? ` ${idx + 1}` : ''} · ${exhibition.title}`}
              </Text>
            </View>
          </Page>
        ))}

      {/* ================================================================ */}
      {/* PRODUCTION ORDERS                                                */}
      {/* ================================================================ */}
      {hasPOs && (
        <Page size="A4" style={styles.page}>
          {/* Header */}
          <View style={d.textPageHeader}>
            <Text style={d.textPageArtist}>{ARTIST_NAME}</Text>
            <Text style={d.textPageLabel}>{exhibition.title}</Text>
          </View>

          <Text style={[styles.sectionTitle, { marginBottom: 16 }]}>
            Production Orders
          </Text>

          {productionOrders.map((po) => {
            const itemsWithPhotos = po.items.filter(
              (it) => it.referenceImageUrls && it.referenceImageUrls.length > 0,
            );
            return (
            <View key={po.order_number} style={d.poOrderBlock}>
              {/* Order meta row */}
              <View style={d.poOrderMeta}>
                <Text style={d.poOrderNumber}>{po.order_number}</Text>
                <Text style={d.poOrderTitle}>{po.title || '—'}</Text>
                <Text style={d.poOrderStatus}>{po.status}</Text>
              </View>

              {/* Column header */}
              {po.items.length > 0 && (
                <View style={d.poHeaderRow}>
                  <Text style={[d.poHeaderCell, { flex: 1 }]}>Description</Text>
                  <Text style={[d.poHeaderCell, { width: '25%' }]}>Medium</Text>
                  <Text style={[d.poHeaderCell, { width: '22%' }]}>Dimensions</Text>
                  <Text style={[d.poHeaderCell, { width: '8%', textAlign: 'right' as const }]}>Qty</Text>
                </View>
              )}

              {/* Item rows */}
              {po.items.map((item, iIdx) => (
                <View
                  key={iIdx}
                  style={iIdx % 2 === 1 ? d.poItemRowAlt : d.poItemRow}
                >
                  <Text style={d.poItemDesc}>{item.description}</Text>
                  <Text style={d.poItemMeta}>{item.medium || '—'}</Text>
                  <Text style={d.poItemDims}>{item.dimensions || '—'}</Text>
                  <Text style={d.poItemQty}>{item.quantity}</Text>
                </View>
              ))}

              {po.items.length === 0 && (
                <View style={d.poItemRow}>
                  <Text style={[d.poItemMeta, { color: PDF_COLORS.primary400 }]}>
                    No items
                  </Text>
                </View>
              )}

              {/* Reference photos — one grid per item that has images */}
              {itemsWithPhotos.length > 0 && (
                <View style={d.refSection}>
                  <Text style={d.refSectionLabel}>Reference Photos</Text>
                  {itemsWithPhotos.map((item, rIdx) => {
                    const imgs = item.referenceImageUrls!;
                    const cols = imgs.length >= 3 ? 3 : imgs.length;
                    const cellW = cols === 1 ? '58%' : cols === 2 ? '47%' : '31.3%';
                    const gapW  = cols === 1 ? '0%'  : cols === 2 ? '6%'  : '3.05%';
                    return (
                      <View key={`rp-${rIdx}`} style={d.refItemBlock} wrap={false}>
                        <Text style={d.refItemCaption}>
                          {item.description}{item.dimensions ? ` — ${item.dimensions}` : ''}
                        </Text>
                        <View style={d.refPhotoGrid}>
                          {imgs.map((url, imgIdx) => {
                            const isLast = (imgIdx + 1) % cols === 0 || imgIdx === imgs.length - 1;
                            return (
                              <View
                                key={`rp-img-${rIdx}-${imgIdx}`}
                                style={{ width: cellW, marginRight: isLast ? '0%' : gapW, marginBottom: 4 }}
                              >
                                <View style={d.refPhotoCellBox}>
                                  <Image style={d.refPhotoCellImage} src={url} />
                                </View>
                              </View>
                            );
                          })}
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
            );
          })}

          {/* Footer */}
          <View style={styles.footer} fixed>
            <Text style={styles.footerText}>{`© ${ARTIST_NAME}`}</Text>
            <Text
              style={styles.pageNumber}
              render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
            />
          </View>
        </Page>
      )}
    </Document>
  );
}
