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

import React from 'react';
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';
import styles, { PDF_COLORS } from './PDFStyles';
import { ARTIST_NAME, COMPANY_NAME } from '../../lib/constants';
import { parseRichText, superscript } from '../../lib/richText';
import type { RichToken } from '../../lib/richText';
import { DOSSIER_STRINGS, formatDateLocalized } from '../../lib/dossierI18n';
import type { DossierLanguage } from '../../lib/dossierI18n';
import { prepareForPDF, containsArabic, splitForPDF } from '../../lib/arabicTextForPDF';

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
    referenceImageNotes?: string[];
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
  floorPlanImages: Array<{ dataUrl: string; description?: string | null; isLandscape?: boolean }>;
  /** Venue photos — space shots without artwork, shown before exhibition photos */
  venuePhotos?: Array<{ dataUrl: string; caption?: string }>;
  /** Exhibition photos — installation views / artwork in situ */
  exhibitionPhotos?: Array<{ dataUrl: string; caption?: string; isLandscape?: boolean }>;
  productionOrders: DossierProductionOrder[];
  /** Shown on the cover page under "Created by" */
  createdBy?: string;
  language?: DossierLanguage;
  /** Custom section titles (each overrides the i18n default when non-empty) */
  exhibitionTextTitle?: string;
  floorPlansTitle?: string;
  venuePhotosTitle?: string;
  exhibitionPhotosTitle?: string;
  productionOrdersTitle?: string;
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

  // ---------- Content pages (all non-cover pages) --------------------------
  // paddingTop: 64 → header bottom border is ~43pt, giving a ~21pt gap to content
  contentPage: {
    fontFamily: 'AnzianoPro',
    fontSize: 10,
    color: PDF_COLORS.primary900,
    backgroundColor: PDF_COLORS.white,
    paddingTop: 64,
    paddingBottom: 60,
    paddingHorizontal: 50,
  },

  // ---------- Fixed page header (all non-cover pages) ----------------------
  // Mirrors styles.footer: position absolute, same top/left/right as footer's bottom/left/right
  pageHeader: {
    position: 'absolute' as const,
    top: 30,
    left: 50,
    right: 50,
    flexDirection: 'row' as const,
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 0.5,
    borderBottomColor: PDF_COLORS.border,
    paddingBottom: 6,
  },
  pageHeaderText: {
    fontFamily: 'AnzianoPro',
    fontSize: 7,
    color: PDF_COLORS.primary400,
    letterSpacing: 0.5,
  },

  // ---------- Exhibition text page -----------------------------------------
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
    paddingTop: 64,
    paddingBottom: 60,
    paddingHorizontal: 50,
  },
  floorPlanImageWrap: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  floorPlanImage: {
    width: '100%',
    objectFit: 'contain' as const,
    objectPosition: 'left center' as const,
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
// Rich-text paragraph renderer (for exhibition text)
// ---------------------------------------------------------------------------

const BASE_TEXT_STYLE = {
  fontFamily: 'AnzianoPro',
  fontSize: 11,
  color: PDF_COLORS.primary700,
  lineHeight: 1.7,
} as const;

const FOOTNOTE_STYLE = {
  fontFamily: 'AnzianoPro',
  fontSize: 8,
  color: PDF_COLORS.primary400,
  lineHeight: 1.5,
  marginBottom: 3,
} as const;

function latinFamily(isItalic: boolean): 'AnzianoPro' | 'AnzianoProItalic' {
  return isItalic ? 'AnzianoProItalic' : 'AnzianoPro';
}

/** Renders a single paragraph. Arabic text is pre-processed with arabic-reshaper
 *  + bidi-js so react-pdf never sees raw RTL characters. Mixed tokens are split
 *  into typed runs so Latin segments keep AnzianoPro and Arabic segments use
 *  NotoSansArabic — all as flat siblings inside one parent Text. */
function RichPara({ tokens }: { tokens: RichToken[] }) {
  const spans: React.ReactElement[] = [];
  let key = 0;

  for (const tok of tokens) {
    if (tok.type === 'linebreak') {
      spans.push(<Text key={key++}>{'\n'}</Text>);
      continue;
    }
    if (tok.type === 'fn-ref') {
      spans.push(
        <Text key={key++} style={{ ...BASE_TEXT_STYLE, fontSize: 7, lineHeight: 1 }}>
          {superscript(tok.num)}
        </Text>,
      );
      continue;
    }
    const isBold   = tok.type === 'bold'   || tok.type === 'bold-italic';
    const isItalic = tok.type === 'italic' || tok.type === 'bold-italic';
    const fw       = isBold ? ('bold' as const) : ('normal' as const);

    for (const run of splitForPDF(tok.text)) {
      const family = run.arabic ? 'NotoSansArabic' : latinFamily(isItalic);
      spans.push(
        <Text key={key++} style={{ ...BASE_TEXT_STYLE, fontFamily: family, fontWeight: fw }}>
          {run.text}
        </Text>,
      );
    }
  }

  return <Text style={{ ...BASE_TEXT_STYLE, marginBottom: 14 }}>{spans}</Text>;
}

/** Renders footnotes section below the exhibition text. */
function FootnotesSection({ footnotes }: { footnotes: string[] }) {
  if (footnotes.length === 0) return null;
  return (
    <View style={{ marginTop: 16, paddingTop: 8, borderTopWidth: 0.5, borderTopColor: PDF_COLORS.border }}>
      {footnotes.map((fn, i) => (
        <Text key={i} style={FOOTNOTE_STYLE}>
          {superscript(i + 1)}{'  '}{fn}
        </Text>
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Layout constants (A4 = 841.89pt, floorPlanPage padding top 64 + bottom 60)
// ---------------------------------------------------------------------------
// Available content height after padding: 841.89 - 64 - 60 = 717.89
// Section title (fontSize 11 * ~1.3 + marginBottom 8) ≈ 22pt
// Available for images: ~696pt, use 660 to leave enough slack for react-pdf rounding
const IMG_AREA_H = 660;
const IMG_GAP    = 10;
const IMG_CAPTION_H = 10; // 7pt font + 3pt marginTop
// Single image: full area minus caption reserve
const IMG_H_SINGLE = IMG_AREA_H - IMG_CAPTION_H;
// Paired images: split area minus gap, each minus caption reserve
const IMG_H_PAIR = (IMG_AREA_H - IMG_GAP) / 2 - IMG_CAPTION_H;

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
  language = 'en',
  exhibitionTextTitle,
  floorPlansTitle,
  venuePhotosTitle,
  exhibitionPhotosTitle,
  productionOrdersTitle,
}: ExhibitionDossierPDFProps) {
  const t = DOSSIER_STRINGS[language];
  // German labels are longer ("AUSSTELLUNGSORT") — widen the column
  const labelWidth = language === 'de' ? 100 : 70;
  const location = [exhibition.city, exhibition.country].filter(Boolean).join(', ');
  const dateStr = [
    exhibition.start_date ? formatDateLocalized(exhibition.start_date, language) : null,
    exhibition.end_date   ? formatDateLocalized(exhibition.end_date,   language) : null,
  ].filter(Boolean).join(' — ');

  const hasText   = !!exhibition.description_text?.trim();
  const hasFloors = floorPlanImages.length > 0;
  const hasVenue  = venuePhotos.length > 0;
  const hasPhotos = exhibitionPhotos.length > 0;
  const hasPOs    = productionOrders.length > 0;

  // Parse rich text (bold / italic / footnotes)
  const richText = hasText
    ? parseRichText(exhibition.description_text!)
    : { paragraphs: [], footnotes: [] };

  return (
    <Document>
      {/* ================================================================ */}
      {/* PAGE 1 — TITLE PAGE                                              */}
      {/* ================================================================ */}
      <Page size="A4" style={d.titlePage}>
        <View style={d.titleSpacer} />

        {/* Main title block */}
        <View style={d.titleCenter}>
          <Text style={d.artistNameTitle}>{ARTIST_NAME}</Text>
          <Text style={[d.exhibitionTitleLarge, containsArabic(exhibition.title) ? { fontFamily: 'NotoSansArabic' } : {}]}>
            {prepareForPDF(exhibition.title)}
          </Text>
          <View style={d.titleDivider} />

          {exhibition.type && (
            <View style={d.titleMetaRow}>
              <Text style={[d.titleMetaLabel, { width: labelWidth }]}>{t.labelCategory}</Text>
              <Text style={d.titleMetaValue}>
                {t.exhibitionTypes[exhibition.type] ?? exhibition.type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
              </Text>
            </View>
          )}
          {exhibition.venue && (
            <View style={d.titleMetaRow}>
              <Text style={[d.titleMetaLabel, { width: labelWidth }]}>{t.labelVenue}</Text>
              <Text style={[d.titleMetaValue, containsArabic(exhibition.venue) ? { fontFamily: 'NotoSansArabic' } : {}]}>
                {prepareForPDF(exhibition.venue)}
              </Text>
            </View>
          )}
          {location && (
            <View style={d.titleMetaRow}>
              <Text style={[d.titleMetaLabel, { width: labelWidth }]}>{t.labelLocation}</Text>
              <Text style={[d.titleMetaValue, containsArabic(location) ? { fontFamily: 'NotoSansArabic' } : {}]}>
                {prepareForPDF(location)}
              </Text>
            </View>
          )}
          {dateStr && (
            <View style={d.titleMetaRow}>
              <Text style={[d.titleMetaLabel, { width: labelWidth }]}>{t.labelDates}</Text>
              <Text style={d.titleMetaValue}>{dateStr}</Text>
            </View>
          )}
          {exhibition.notes?.trim() && (
            <View style={[d.titleMetaRow, { marginTop: 14 }]}>
              <Text style={[d.titleMetaLabel, { width: labelWidth }]}>Notes</Text>
              <Text style={[d.titleMetaValue, { fontSize: 9, lineHeight: 1.5 }, containsArabic(exhibition.notes) ? { fontFamily: 'NotoSansArabic' } : {}]}>
                {prepareForPDF(exhibition.notes)}
              </Text>
            </View>
          )}
          {createdBy?.trim() && (
            <View style={[d.titleMetaRow, { marginTop: 14 }]}>
              <Text style={[d.titleMetaLabel, { width: labelWidth }]}>{t.labelCreatedBy}</Text>
              <Text style={[d.titleMetaValue, { fontSize: 9, lineHeight: 1.5 }]}>
                {createdBy}
              </Text>
            </View>
          )}
        </View>

        <View style={d.titleSpacer} />
      </Page>

      {/* ================================================================ */}
      {/* EXHIBITION TEXT                                                   */}
      {/* ================================================================ */}
      {hasText && (
        <Page size="A4" style={d.contentPage}>
          <View style={d.pageHeader} fixed>
            <Text style={d.pageHeaderText}>{ARTIST_NAME}</Text>
            <Text style={d.pageHeaderText}>{exhibition.title}</Text>
          </View>

          <Text style={[styles.sectionTitle, { marginBottom: 16 }]}>
            {exhibitionTextTitle?.trim() || t.sectionExhibitionText}
          </Text>

          {/* Rich-text paragraphs (bold / italic / footnote refs) */}
          {richText.paragraphs.map((para, i) => (
            <RichPara key={i} tokens={para.tokens} />
          ))}

          {/* Footnotes */}
          <FootnotesSection footnotes={richText.footnotes} />

          {/* Standard footer */}
          <View style={styles.footer} fixed>
            <Text style={styles.footerText}>{`© ${COMPANY_NAME}`}</Text>
            <Text
              style={styles.pageNumber}
              render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
            />
          </View>
        </Page>
      )}

      {/* ================================================================ */}
      {/* FLOOR PLAN PAGES — landscape pairs share a page                  */}
      {/* ================================================================ */}
      {hasFloors && (() => {
        // Group: two consecutive landscape images → one page; otherwise one per page
        type FPItem = { dataUrl: string; description?: string | null; isLandscape?: boolean; origIdx: number };
        const groups: FPItem[][] = [];
        let gi = 0;
        while (gi < floorPlanImages.length) {
          const curr = { ...floorPlanImages[gi], origIdx: gi };
          const next = floorPlanImages[gi + 1];
          if (curr.isLandscape && next?.isLandscape) {
            groups.push([curr, { ...next, origIdx: gi + 1 }]);
            gi += 2;
          } else {
            groups.push([curr]);
            gi += 1;
          }
        }
        const total = floorPlanImages.length;
        return groups.map((group, gIdx) => (
          <Page key={`fp-${gIdx}`} size="A4" style={d.floorPlanPage}>
            <View style={d.pageHeader} fixed>
              <Text style={d.pageHeaderText}>{ARTIST_NAME}</Text>
              <Text style={d.pageHeaderText}>{exhibition.title}</Text>
            </View>

            <Text style={[styles.sectionTitle, { marginBottom: 8 }]}>
              {`${floorPlansTitle?.trim() || t.sectionFloorPlans}${total > 1 ? ` (${group.map(f => f.origIdx + 1).join(', ')}/${total})` : ''}${group.length === 1 && group[0].description?.trim() ? ` — ${group[0].description}` : ''}`}
            </Text>

            <View style={{ flexDirection: 'column' }} wrap={false}>
              {group.map((fp, fi) => {
                const isPair = group.length > 1;
                const imgH = isPair ? IMG_H_PAIR : IMG_H_SINGLE;
                return (
                  <View key={fi} style={{ marginBottom: fi < group.length - 1 ? IMG_GAP : 0 }}>
                    <Image src={fp.dataUrl} style={[d.floorPlanImage, { height: imgH }]} />
                    {fp.description?.trim() && (
                      <Text style={{ fontFamily: 'AnzianoPro', fontSize: 7, color: PDF_COLORS.primary400, marginTop: 3, letterSpacing: 0.5 }}>
                        {fp.description}
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>

            <View style={styles.footer} fixed>
              <Text style={styles.footerText}>{`© ${COMPANY_NAME}`}</Text>
              <Text
                style={styles.pageNumber}
                render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
              />
            </View>
          </Page>
        ));
      })()}

      {/* ================================================================ */}
      {/* VENUE PHOTOS                                                      */}
      {/* ================================================================ */}
      {hasVenue && (
        <Page size="A4" style={d.contentPage}>
          <View style={d.pageHeader} fixed>
            <Text style={d.pageHeaderText}>{ARTIST_NAME}</Text>
            <Text style={d.pageHeaderText}>{exhibition.title}</Text>
          </View>
          <Text style={[styles.sectionTitle, { marginBottom: 16 }]}>{venuePhotosTitle?.trim() || t.sectionVenuePhotos}</Text>
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
            <Text style={styles.footerText}>{`© ${COMPANY_NAME}`}</Text>
            <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
          </View>
        </Page>
      )}

      {/* ================================================================ */}
      {/* EXHIBITION PHOTOS — 2 per page                                   */}
      {/* ================================================================ */}
      {hasPhotos && (() => {
        // Group: two consecutive landscape photos share a page; portrait → own page
        type EPItem = typeof exhibitionPhotos[0] & { origIdx: number };
        const groups: EPItem[][] = [];
        let ei = 0;
        while (ei < exhibitionPhotos.length) {
          const curr = { ...exhibitionPhotos[ei], origIdx: ei };
          const next = exhibitionPhotos[ei + 1];
          if (curr.isLandscape && next?.isLandscape) {
            groups.push([curr, { ...next, origIdx: ei + 1 }]);
            ei += 2;
          } else {
            groups.push([curr]);
            ei += 1;
          }
        }
        const total = exhibitionPhotos.length;
        const sectionTitle = exhibitionPhotosTitle?.trim() || t.sectionExhibitionPhotos;
        return groups.map((group, gIdx) => {
          const isPair = group.length > 1;
          // Solo landscape: use pair height (matches 1.571:1 crop); solo portrait: full height
          const imgH = isPair ? IMG_H_PAIR : (group[0].isLandscape ? IMG_H_PAIR : IMG_H_SINGLE);
          const nums = group.map(p => p.origIdx + 1);
          return (
            <Page key={`ep-${gIdx}`} size="A4" style={d.floorPlanPage}>
              <View style={d.pageHeader} fixed>
                <Text style={d.pageHeaderText}>{ARTIST_NAME}</Text>
                <Text style={d.pageHeaderText}>{exhibition.title}</Text>
              </View>

              <Text style={[styles.sectionTitle, { marginBottom: 8 }]}>
                {`${sectionTitle}${total > 1 ? ` (${nums.join('–')}/${total})` : ''}`}
              </Text>

              <View style={{ flexDirection: 'column' }} wrap={false}>
                {group.map((photo, fi) => (
                  <View key={fi} style={{ marginBottom: fi < group.length - 1 ? IMG_GAP : 0 }}>
                    <Image src={photo.dataUrl} style={[d.floorPlanImage, { height: imgH }]} />
                    {photo.caption?.trim() && (
                      <Text style={{ fontFamily: 'AnzianoPro', fontSize: 7, color: PDF_COLORS.primary400, marginTop: 3, letterSpacing: 0.5 }}>
                        {photo.caption}
                      </Text>
                    )}
                  </View>
                ))}
              </View>

              <View style={styles.footer} fixed>
                <Text style={styles.footerText}>{`© ${COMPANY_NAME}`}</Text>
                <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
              </View>
            </Page>
          );
        });
      })()}

      {/* ================================================================ */}
      {/* PRODUCTION ORDERS                                                */}
      {/* ================================================================ */}
      {hasPOs && (
        <Page size="A4" style={d.contentPage}>
          <View style={d.pageHeader} fixed>
            <Text style={d.pageHeaderText}>{ARTIST_NAME}</Text>
            <Text style={d.pageHeaderText}>{exhibition.title}</Text>
          </View>

          <Text style={[styles.sectionTitle, { marginBottom: 16 }]}>
            {productionOrdersTitle?.trim() || t.sectionProductionOrders}
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
                  <Text style={[d.poHeaderCell, { flex: 1 }]}>{t.colDescription}</Text>
                  <Text style={[d.poHeaderCell, { width: '25%' }]}>{t.colMedium}</Text>
                  <Text style={[d.poHeaderCell, { width: '22%' }]}>{t.colDimensions}</Text>
                  <Text style={[d.poHeaderCell, { width: '8%', textAlign: 'right' as const }]}>{t.colQty}</Text>
                </View>
              )}

              {/* Item rows */}
              {po.items.map((item, iIdx) => (
                <View
                  key={iIdx}
                  style={iIdx % 2 === 1 ? d.poItemRowAlt : d.poItemRow}
                >
                  <Text style={[d.poItemDesc, containsArabic(item.description) ? { fontFamily: 'NotoSansArabic' } : {}]}>
                    {prepareForPDF(item.description)}
                  </Text>
                  <Text style={d.poItemMeta}>{item.medium || '—'}</Text>
                  <Text style={d.poItemDims}>{item.dimensions || '—'}</Text>
                  <Text style={d.poItemQty}>{item.quantity}</Text>
                </View>
              ))}

              {po.items.length === 0 && (
                <View style={d.poItemRow}>
                  <Text style={[d.poItemMeta, { color: PDF_COLORS.primary400 }]}>
                    {t.noItems}
                  </Text>
                </View>
              )}

              {/* Reference photos — one grid per item that has images */}
              {itemsWithPhotos.length > 0 && (
                <View style={d.refSection}>
                  <Text style={d.refSectionLabel}>{t.referencePhotos}</Text>
                  {itemsWithPhotos.map((item, rIdx) => {
                    const imgs = item.referenceImageUrls!;
                    // 2-column grid — equal 8pt gap in both directions
                    const cellW = '49%';
                    return (
                      <View key={`rp-${rIdx}`} style={d.refItemBlock} wrap={false}>
                        <Text style={d.refItemCaption}>
                          {item.description}{item.dimensions ? ` — ${item.dimensions}` : ''}
                        </Text>
                        <View style={d.refPhotoGrid}>
                          {imgs.map((url, imgIdx) => {
                            const isLast = imgIdx % 2 === 1 || imgIdx === imgs.length - 1;
                            const imgNote = item.referenceImageNotes?.[imgIdx];
                            return (
                              <View
                                key={`rp-img-${rIdx}-${imgIdx}`}
                                style={{ width: cellW, marginRight: isLast ? 0 : 8, marginBottom: 8 }}
                              >
                                <View style={d.refPhotoCellBox}>
                                  <Image style={d.refPhotoCellImage} src={url} />
                                </View>
                                {imgNote ? (
                                  <Text style={{ fontFamily: 'AnzianoPro', fontSize: 8, color: PDF_COLORS.primary700, marginTop: 3, lineHeight: 1.4 }}>
                                    {imgNote}
                                  </Text>
                                ) : null}
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
            <Text style={styles.footerText}>{`© ${COMPANY_NAME}`}</Text>
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
