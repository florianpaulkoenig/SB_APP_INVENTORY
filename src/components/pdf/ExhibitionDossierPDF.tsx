// ---------------------------------------------------------------------------
// Exhibition Dossier PDF
// Structure:
//   Page 1  — Title page (exhibition name, venue, dates)
//   Page 2+ — Exhibition text (if present)
//   Page N+ — Floor plan / 3D model pages (one per uploaded file)
//   Page N+ — Venue photos (space shots without artwork)
//   Page N+ — Exhibition photos (installation views, 2-column grid)
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
  /** One entry per rendered floor plan page */
  floorPlanImages: Array<{ dataUrl: string; description?: string | null }>;
  /** Venue photos — space shots without artwork, shown before exhibition photos */
  venuePhotos?: Array<{ dataUrl: string; caption?: string }>;
  /** Exhibition photos — installation views / artwork in situ */
  exhibitionPhotos?: Array<{ dataUrl: string; caption?: string }>;
  productionOrders: DossierProductionOrder[];
  /** Shown on the cover page under "Created by" */
  createdBy?: string;
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
    paddingTop: 0,
    paddingBottom: 60,
    paddingHorizontal: 50,
  },
  floorPlanHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 24,
    paddingBottom: 12,
    marginBottom: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: PDF_COLORS.border,
  },
  floorPlanImageWrap: {
    flex: 1,
    justifyContent: 'flex-start',
    marginHorizontal: -50, // break out of page padding → full page width
  },
  floorPlanImage: {
    width: '100%',
    objectFit: 'contain' as const,
  },
  floorPlanDesc: {
    fontFamily: 'AnzianoPro',
    fontSize: 7,
    color: PDF_COLORS.primary400,
    letterSpacing: 0.5,
    lineHeight: 1.4,
    marginTop: 6,
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
    marginBottom: 20,
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

  // ---------- Exhibition photos page ---------------------------------------
  photoGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    marginTop: 4,
  },
  photoCell: {
    width: '48.5%',
    marginBottom: 14,
  },
  photoCellRight: {
    width: '48.5%',
    marginLeft: '3%',
    marginBottom: 14,
  },
  photoCellImage: {
    width: '100%',
    height: 180,
    objectFit: 'cover' as const,
    borderRadius: 1,
  },
  photoCellCaption: {
    fontFamily: 'AnzianoPro',
    fontSize: 7,
    color: PDF_COLORS.primary400,
    marginTop: 4,
    letterSpacing: 0.5,
    lineHeight: 1.4,
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
    padding: 10,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  refPhotoCellImage: {
    width: '100%',
    height: 100,
    objectFit: 'contain' as const,
  },
});

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ExhibitionDossierPDF({
  exhibition,
  floorPlanImages,
  venuePhotos = [],
  exhibitionPhotos = [],
  productionOrders,
  createdBy,
}: ExhibitionDossierPDFProps) {
  const location = [exhibition.city, exhibition.country].filter(Boolean).join(', ');
  const dateStr = [
    exhibition.start_date ? formatDate(exhibition.start_date) : null,
    exhibition.end_date   ? formatDate(exhibition.end_date)   : null,
  ].filter(Boolean).join(' — ');

  const hasText   = !!exhibition.description_text?.trim();
  const hasFloors = floorPlanImages.length > 0;
  const hasVenue  = venuePhotos.length > 0;
  const hasPhotos = exhibitionPhotos.length > 0;
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
          <View style={d.titleDivider} />

          {exhibition.type && (
            <View style={d.titleMetaRow}>
              <Text style={d.titleMetaLabel}>Category</Text>
              <Text style={d.titleMetaValue}>
                {exhibition.type.charAt(0).toUpperCase() + exhibition.type.slice(1)}
              </Text>
            </View>
          )}
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
          {exhibition.notes?.trim() && (
            <View style={[d.titleMetaRow, { marginTop: 14 }]}>
              <Text style={d.titleMetaLabel}>Notes</Text>
              <Text style={[d.titleMetaValue, { fontSize: 9, lineHeight: 1.5 }]}>
                {exhibition.notes}
              </Text>
            </View>
          )}
          {createdBy?.trim() && (
            <View style={[d.titleMetaRow, { marginTop: 14 }]}>
              <Text style={d.titleMetaLabel}>Created by</Text>
              <Text style={[d.titleMetaValue, { fontSize: 9, lineHeight: 1.5 }]}>
                {createdBy}
              </Text>
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
        floorPlanImages.map(({ dataUrl, description }, idx) => (
          <Page key={`fp-${idx}`} size="A4" style={d.floorPlanPage}>
            {/* Header */}
            <View style={d.floorPlanHeader}>
              <Text style={d.textPageArtist}>{ARTIST_NAME}</Text>
              <Text style={d.textPageLabel}>{exhibition.title}</Text>
            </View>

            {/* Section title — includes description after the counter */}
            <Text style={[styles.sectionTitle, { marginBottom: 12 }]}>
              {`Floor Plans / 3D Model${floorPlanImages.length > 1 ? ` (${idx + 1}/${floorPlanImages.length})` : ''}${description?.trim() ? ` — ${description}` : ''}`}
            </Text>

            {/* Image — full page width (marginHorizontal cancels page padding) */}
            <View style={d.floorPlanImageWrap}>
              <Image src={dataUrl} style={d.floorPlanImage} />
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>{`© ${ARTIST_NAME}`}</Text>
              <Text
                style={styles.pageNumber}
                render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
              />
            </View>
          </Page>
        ))}

      {/* ================================================================ */}
      {/* VENUE PHOTOS                                                      */}
      {/* ================================================================ */}
      {hasVenue && (
        <Page size="A4" style={styles.page}>
          <View style={d.textPageHeader}>
            <Text style={d.textPageArtist}>{ARTIST_NAME}</Text>
            <Text style={d.textPageLabel}>{exhibition.title}</Text>
          </View>
          <Text style={[styles.sectionTitle, { marginBottom: 16 }]}>Venue Photos</Text>
          <View style={d.photoGrid}>
            {venuePhotos.map((photo, idx) => {
              const isRight = idx % 2 === 1;
              return (
                <View key={`vp-${idx}`} style={isRight ? d.photoCellRight : d.photoCell}>
                  <Image src={photo.dataUrl} style={d.photoCellImage} />
                  {photo.caption?.trim() && (
                    <Text style={d.photoCellCaption}>{photo.caption}</Text>
                  )}
                </View>
              );
            })}
          </View>
          <View style={styles.footer} fixed>
            <Text style={styles.footerText}>{`© ${ARTIST_NAME}`}</Text>
            <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
          </View>
        </Page>
      )}

      {/* ================================================================ */}
      {/* EXHIBITION PHOTOS                                                 */}
      {/* ================================================================ */}
      {hasPhotos && (
        <Page size="A4" style={styles.page}>
          {/* Header */}
          <View style={d.textPageHeader}>
            <Text style={d.textPageArtist}>{ARTIST_NAME}</Text>
            <Text style={d.textPageLabel}>{exhibition.title}</Text>
          </View>

          <Text style={[styles.sectionTitle, { marginBottom: 16 }]}>
            Exhibition Photos
          </Text>

          {/* 2-column grid */}
          <View style={d.photoGrid}>
            {exhibitionPhotos.map((photo, idx) => {
              const isRight = idx % 2 === 1;
              return (
                <View key={`photo-${idx}`} style={isRight ? d.photoCellRight : d.photoCell}>
                  <Image src={photo.dataUrl} style={d.photoCellImage} />
                  {photo.caption?.trim() && (
                    <Text style={d.photoCellCaption}>{photo.caption}</Text>
                  )}
                </View>
              );
            })}
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
      )}

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
                    // Always 2 columns — uniform size regardless of image count
                    const cellW = '47%';
                    const gapW  = '6%';
                    return (
                      <View key={`rp-${rIdx}`} style={d.refItemBlock} wrap={false}>
                        <Text style={d.refItemCaption}>
                          {item.description}{item.dimensions ? ` — ${item.dimensions}` : ''}
                        </Text>
                        <View style={d.refPhotoGrid}>
                          {imgs.map((url, imgIdx) => {
                            const isLast = imgIdx % 2 === 1 || imgIdx === imgs.length - 1;
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
