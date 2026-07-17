// ---------------------------------------------------------------------------
// NOA Inventory -- Production Order PDF (Artist Version)
// Layout mirrors the production list export (ProductionOrdersArtistPDF):
// PDFHeader, black order title bar, grey column header, alternating item
// rows with per-item notes and inline reference images. Ends with a
// signature section (artist / gallery-agent / client, dated with the
// export date).
// ---------------------------------------------------------------------------

import { Document, Page, View, Text, Image } from '@react-pdf/renderer';
import styles, { PDF_COLORS } from './PDFStyles';
import { PDFHeader } from './PDFHeader';
import { ARTIST_NAME, COMPANY_NAME } from '../../lib/constants';

// ---------------------------------------------------------------------------
// Multi-language translations
// ---------------------------------------------------------------------------
interface TranslationStrings {
  artworkCreationSchedule: string;
  orderNo: string;
  status: string;
  orderDate: string;
  deadline: string;
  dimensions: string;
  medium: string;
  gallery: string;
  client: string;
  price: string;
  notes: string;
  item: string;
  qty: string;
  totalItems: string;
  generatedOn: string;
  signatures: string;
  artist: string;
  galleryAgent: string;
  date: string;
}

const TRANSLATIONS: Record<string, TranslationStrings> = {
  en: {
    artworkCreationSchedule: 'Artwork Creation Schedule',
    orderNo: 'Order No.',
    status: 'Status',
    orderDate: 'Order Date',
    deadline: 'Deadline',
    dimensions: 'Dimensions',
    medium: 'Medium',
    gallery: 'Gallery',
    client: 'Client',
    price: 'Price',
    notes: 'Notes',
    item: 'Item',
    qty: 'Qty',
    totalItems: 'Total Items',
    generatedOn: 'Generated on',
    signatures: 'Signatures',
    artist: 'Artist',
    galleryAgent: 'Gallery / Agent',
    date: 'Date',
  },
  de: {
    artworkCreationSchedule: 'Kunstwerk-Produktionsplan',
    orderNo: 'Auftrag Nr.',
    status: 'Status',
    orderDate: 'Auftragsdatum',
    deadline: 'Frist',
    dimensions: 'Masse',
    medium: 'Technik',
    gallery: 'Galerie',
    client: 'Kunde',
    price: 'Preis',
    notes: 'Anmerkungen',
    item: 'Position',
    qty: 'Anz.',
    totalItems: 'Gesamtanzahl',
    generatedOn: 'Erstellt am',
    signatures: 'Unterschriften',
    artist: 'Künstler',
    galleryAgent: 'Galerie / Agent',
    date: 'Datum',
  },
  fr: {
    artworkCreationSchedule: "Calendrier de Création d'Oeuvres",
    orderNo: 'Commande N°',
    status: 'Statut',
    orderDate: 'Date de commande',
    deadline: 'Délai',
    dimensions: 'Dimensions',
    medium: 'Technique',
    gallery: 'Galerie',
    client: 'Client',
    price: 'Prix',
    notes: 'Notes',
    item: 'Article',
    qty: 'Qté',
    totalItems: 'Total articles',
    generatedOn: 'Généré le',
    signatures: 'Signatures',
    artist: 'Artiste',
    galleryAgent: 'Galerie / Agent',
    date: 'Date',
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
export interface ProductionOrderPDFProps {
  order: {
    order_number: string;
    title: string;
    description: string | null;
    status: string;
    ordered_date: string | null;
    deadline: string | null;
    notes: string | null;
    price?: number | null;
    currency?: string;
  };
  items: Array<{
    description: string;
    medium: string | null;
    dimensions: string;
    weight?: number | null;
    quantity: number;
    notes: string | null;
    referenceImageUrls?: string[];
    referenceImageNotes?: string[];
  }>;
  galleryName?: string | null;
  contactName?: string | null;
  language: 'en' | 'de' | 'fr';
  showPrice?: boolean;
}

// ---------------------------------------------------------------------------
// Column widths — mirrors the production list export
// ---------------------------------------------------------------------------
const COL_ITEM = '38%';
const COL_DIMS = '24%';
const COL_MEDIUM = '28%';
const COL_QTY = '10%';

const IMG_W = 120; // inline reference thumbnail width (same as list export)

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function ProductionOrderPDF({
  order,
  items,
  galleryName,
  contactName,
  language,
  showPrice = true,
}: ProductionOrderPDFProps) {
  const t = TRANSLATIONS[language] ?? TRANSLATIONS.en;
  const today = new Date().toLocaleDateString(
    language === 'de' ? 'de-DE' : language === 'fr' ? 'fr-FR' : 'en-GB',
  );

  // Build info rows -- only include rows that have a value
  const infoRows: { label: string; value: string }[] = [
    { label: t.orderNo, value: order.order_number },
    { label: t.status, value: translateStatus(order.status, language) },
  ];
  if (order.ordered_date) infoRows.push({ label: t.orderDate, value: order.ordered_date });
  if (order.deadline)     infoRows.push({ label: t.deadline, value: order.deadline });
  if (galleryName)        infoRows.push({ label: t.gallery, value: galleryName });
  if (contactName)        infoRows.push({ label: t.client, value: contactName });
  if (showPrice && order.price != null && order.price > 0) {
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: order.currency ?? 'EUR',
      minimumFractionDigits: 2,
    }).format(order.price);
    infoRows.push({ label: t.price, value: formatted });
  }

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  // Signature blocks: artist / gallery-agent / client — dated with export date
  const signatureBlocks: { role: string; name: string | null }[] = [
    { role: t.artist, name: ARTIST_NAME },
    { role: t.galleryAgent, name: galleryName ?? null },
    { role: t.client, name: contactName ?? null },
  ];

  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        {/* ----- Header — same style as the production list export -------- */}
        <PDFHeader
          title={t.artworkCreationSchedule}
          subtitle={`${order.order_number} · ${t.generatedOn} ${today}`}
          language={language}
          companyName={ARTIST_NAME}
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

        {/* ----- Items — black title bar + grey column header + rows ------ */}
        <View style={{ marginTop: 8 }}>
          {/* Black order title bar */}
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

          {/* Grey column header */}
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
            <Text style={[styles.tableHeaderCell, { width: COL_MEDIUM, color: PDF_COLORS.primary400 }]}>
              {t.medium}
            </Text>
            <Text style={[styles.tableHeaderCell, { width: COL_QTY, color: PDF_COLORS.primary400, textAlign: 'center' }]}>
              {t.qty}
            </Text>
          </View>

          {/* Item rows — row + notes + reference images stay together */}
          {items.map((item, itemIdx) => {
            const bg = itemIdx % 2 === 1 ? '#fafafa' : PDF_COLORS.white;
            const hasImages = !!item.referenceImageUrls && item.referenceImageUrls.length > 0;
            const hasNotes = !!item.notes;
            return (
              <View key={`item-${itemIdx}`} wrap={false}>
                <View
                  style={{
                    flexDirection: 'row',
                    paddingVertical: 5,
                    paddingHorizontal: 10,
                    borderBottomWidth: hasNotes || hasImages ? 0 : 0.5,
                    borderBottomColor: PDF_COLORS.border,
                    backgroundColor: bg,
                  }}
                >
                  <Text style={[styles.tableCell, { width: COL_ITEM, fontSize: 10, fontFamily: 'AnzianoPro', fontWeight: 'bold' as const }]}>
                    {item.description}
                  </Text>
                  <Text style={[styles.tableCell, { width: COL_DIMS }]}>
                    {[item.dimensions, item.weight != null && item.weight > 0 ? `${item.weight} kg` : null]
                      .filter(Boolean)
                      .join('\n') || '—'}
                  </Text>
                  <Text style={[styles.tableCell, { width: COL_MEDIUM }]}>
                    {item.medium || '—'}
                  </Text>
                  <Text style={[styles.tableCell, { width: COL_QTY, textAlign: 'center', fontFamily: 'AnzianoPro', fontWeight: 'bold' as const }]}>
                    {item.quantity}
                  </Text>
                </View>

                {/* Per-item notes */}
                {hasNotes && (
                  <View
                    style={{
                      paddingHorizontal: 10,
                      paddingBottom: 5,
                      borderBottomWidth: hasImages ? 0 : 0.5,
                      borderBottomColor: PDF_COLORS.border,
                      backgroundColor: bg,
                    }}
                  >
                    <Text style={{ fontFamily: 'AnzianoPro', fontSize: 8, color: PDF_COLORS.primary400 }}>
                      {t.notes}: <Text style={{ color: PDF_COLORS.primary700 }}>{item.notes}</Text>
                    </Text>
                  </View>
                )}

                {/* Inline reference images (same as list export) */}
                {hasImages && (
                  <View
                    style={{
                      flexDirection: 'row',
                      flexWrap: 'wrap',
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      borderBottomWidth: 0.5,
                      borderBottomColor: PDF_COLORS.border,
                      backgroundColor: bg,
                    }}
                  >
                    {item.referenceImageUrls!.map((url, imgIdx) => (
                      <View key={`ref-${itemIdx}-${imgIdx}`} style={{ marginRight: 8, marginBottom: 6 }}>
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
              </View>
            );
          })}
        </View>

        {/* ----- Total --------------------------------------------------- */}
        <View
          wrap={false}
          style={{ marginTop: 8, borderTopWidth: 1, borderTopColor: PDF_COLORS.primary900, paddingTop: 8 }}
        >
          <Text style={{ fontFamily: 'AnzianoPro', fontWeight: 'bold' as const, fontSize: 11, color: PDF_COLORS.primary900 }}>
            {t.totalItems}: {totalItems}
          </Text>
        </View>

        {/* ----- Order Notes ---------------------------------------------- */}
        {order.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t.notes}</Text>
            <Text style={styles.bodyText}>{order.notes}</Text>
          </View>
        )}

        {/* ----- Signatures ------------------------------------------------ */}
        <View wrap={false} style={{ marginTop: 48 }}>
          <Text
            style={{
              fontFamily: 'AnzianoPro',
              fontWeight: 'bold' as const,
              fontSize: 9,
              color: PDF_COLORS.primary400,
              textTransform: 'uppercase',
              letterSpacing: 1,
              marginBottom: 28,
            }}
          >
            {t.signatures}
          </Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            {signatureBlocks.map((block) => (
              <View key={block.role} style={{ width: '30%' }}>
                <View style={{ borderBottomWidth: 0.75, borderBottomColor: PDF_COLORS.primary900, marginBottom: 5 }} />
                <Text style={{ fontFamily: 'AnzianoPro', fontWeight: 'bold' as const, fontSize: 9, color: PDF_COLORS.primary900 }}>
                  {block.role}
                </Text>
                {block.name && (
                  <Text style={{ fontFamily: 'AnzianoPro', fontSize: 8, color: PDF_COLORS.primary700, marginTop: 1 }}>
                    {block.name}
                  </Text>
                )}
                <Text style={{ fontFamily: 'AnzianoPro', fontSize: 8, color: PDF_COLORS.primary400, marginTop: 3 }}>
                  {t.date}: {today}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* ----- Footer -------------------------------------------------- */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            {`© ${COMPANY_NAME}`}
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
