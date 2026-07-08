// ---------------------------------------------------------------------------
// NOA Inventory -- Packing List PDF
// Grouped by crate: each crate has a header row, then its artworks.
// ---------------------------------------------------------------------------

import React from 'react';
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import styles, { PDF_COLORS } from './PDFStyles';
import { MixedText } from './MixedText';
import { PDFHeader } from './PDFHeader';
import { COMPANY_NAME } from '../../lib/constants';

// ---------------------------------------------------------------------------
// Multi-language translations
// ---------------------------------------------------------------------------
interface TranslationStrings {
  packingList: string;
  packingNo: string;
  date: string;
  recipient: string;
  delivery: string;
  reference: string;
  title: string;
  dimensions: string;
  weight: string;
  handling: string;
  notes: string;
  totalItems: string;
  totalWeight: string;
  packedBy: string;
  signatureDate: string;
  unassigned: string;
  packaging: string;
}

const TRANSLATIONS: Record<string, TranslationStrings> = {
  en: {
    packingList: 'Packing List',
    packingNo: 'Packing No.',
    date: 'Date',
    recipient: 'Recipient',
    delivery: 'Delivery',
    reference: 'Ref Code',
    title: 'Title',
    dimensions: 'Dimensions',
    weight: 'Weight',
    handling: 'Handling',
    notes: 'Notes',
    totalItems: 'Total Items',
    totalWeight: 'Total Weight',
    packedBy: 'Packed by',
    signatureDate: 'Date',
    unassigned: 'Unassigned Artworks',
    packaging: 'Packaging',
  },
  de: {
    packingList: 'Packliste',
    packingNo: 'Packliste Nr.',
    date: 'Datum',
    recipient: 'Empfänger',
    delivery: 'Lieferung',
    reference: 'Ref.-Code',
    title: 'Titel',
    dimensions: 'Maße',
    weight: 'Gewicht',
    handling: 'Handhabung',
    notes: 'Anmerkungen',
    totalItems: 'Gesamtanzahl',
    totalWeight: 'Gesamtgewicht',
    packedBy: 'Verpackt von',
    signatureDate: 'Datum',
    unassigned: 'Nicht zugeordnete Werke',
    packaging: 'Verpackung',
  },
  fr: {
    packingList: 'Liste de colisage',
    packingNo: 'Colisage N°',
    date: 'Date',
    recipient: 'Destinataire',
    delivery: 'Livraison',
    reference: 'Réf.',
    title: 'Titre',
    dimensions: 'Dimensions',
    weight: 'Poids',
    handling: 'Manutention',
    notes: 'Notes',
    totalItems: 'Total articles',
    totalWeight: 'Poids total',
    packedBy: 'Emballé par',
    signatureDate: 'Date',
    unassigned: 'Œuvres non assignées',
    packaging: 'Emballage',
  },
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface PDFPackingItem {
  artwork_title: string;
  artwork_reference_code: string;
  artwork_dimensions: string;
  artwork_weight: number | null;
  special_handling: string | null;
  notes: string | null;
}

export interface PDFCrateGroup {
  crate_name: string;
  dimensions: string | null;
  weight: number | null;
  packaging_type: string | null;
  notes: string | null;
  items: PDFPackingItem[];
}

export interface PackingListPDFProps {
  packingList: {
    packing_number: string;
    recipient_name: string;
    packing_date: string | null;
    notes: string | null;
  };
  deliveryNumber?: string | null;
  /** New crate-grouped structure */
  crates?: PDFCrateGroup[];
  unassignedItems?: PDFPackingItem[];
  /** Legacy flat items — used only when crates are not provided */
  items?: Array<{
    artwork_title: string;
    artwork_reference_code: string;
    artwork_dimensions: string;
    artwork_weight: number | null;
    crate_number: string | null;
    packaging_type: string | null;
    special_handling: string | null;
    notes: string | null;
  }>;
  language: 'en' | 'de' | 'fr';
}

// ---------------------------------------------------------------------------
// Local styles
// ---------------------------------------------------------------------------

const s = StyleSheet.create({
  crateHeader: {
    flexDirection: 'column',
    marginTop: 12,
    borderRadius: 3,
    overflow: 'hidden',
    borderLeftWidth: 3,
    borderLeftColor: PDF_COLORS.primary900,
  },
  crateHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PDF_COLORS.border,   // #cccccc — clear grey title band
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  crateTitle: {
    fontFamily: 'AnzianoPro',
    fontSize: 10,
    fontWeight: 700,
    color: PDF_COLORS.primary900,
    flex: 1,
  },
  cratePackaging: {
    fontFamily: 'AnzianoPro',
    fontSize: 8,
    color: PDF_COLORS.primary700,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  crateDimRow: {
    flexDirection: 'row',
    backgroundColor: PDF_COLORS.backgroundLight,  // #f7f7f7 — subtle contrast
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 10,
  },
  crateDimItem: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  crateDimLabel: {
    fontFamily: 'AnzianoPro',
    fontSize: 7,
    fontWeight: 700,
    color: PDF_COLORS.primary900,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  crateDimValue: {
    fontFamily: 'AnzianoPro',
    fontSize: 8,
    color: PDF_COLORS.primary700,
  },
  crateSeparator: {
    fontFamily: 'AnzianoPro',
    fontSize: 8,
    color: PDF_COLORS.primary400,
    marginHorizontal: 2,
  },
  crateMeta: {
    fontFamily: 'AnzianoPro',
    fontSize: 8,
    color: PDF_COLORS.primary400,
  },
  unassignedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginTop: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: PDF_COLORS.border,
  },
  unassignedTitle: {
    fontFamily: 'AnzianoPro',
    fontSize: 9,
    fontWeight: 700,
    color: PDF_COLORS.primary400,
    fontStyle: 'italic',
  },
});

// ---------------------------------------------------------------------------
// Table column widths
// ---------------------------------------------------------------------------
const COL_NUM = '5%';
const COL_REF = '19%';
const COL_TITLE = '23%';
const COL_DIM = '17%';
const COL_WEIGHT = '9%';
const COL_HANDLING = '27%';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatWeight(weight: number | null): string {
  if (weight == null) return '—';
  return `${weight} kg`;
}


function TableHeader({ t }: { t: TranslationStrings }) {
  return (
    <View style={styles.tableHeaderRow}>
      <Text style={[styles.tableHeaderCell, { width: COL_NUM }]}>#</Text>
      <Text style={[styles.tableHeaderCell, { width: COL_REF }]}>{t.reference}</Text>
      <Text style={[styles.tableHeaderCell, { width: COL_TITLE }]}>{t.title}</Text>
      <Text style={[styles.tableHeaderCell, { width: COL_DIM }]}>{t.dimensions}</Text>
      <Text style={[styles.tableHeaderCell, { width: COL_WEIGHT }]}>{t.weight}</Text>
      <Text style={[styles.tableHeaderCell, { width: COL_HANDLING }]}>{t.handling}</Text>
    </View>
  );
}

function Cell({ width, children, style }: { width: string; children: React.ReactNode; style?: import('@react-pdf/types').Style }) {
  const cellStyle = style ? [styles.tableCell, style] : styles.tableCell;
  return (
    <View style={{ width, overflow: 'hidden' }}>
      {typeof children === 'string'
        ? <MixedText style={cellStyle}>{children}</MixedText>
        : <Text style={cellStyle}>{children}</Text>}
    </View>
  );
}

function ItemRow({ item, index }: { item: PDFPackingItem; index: number }) {
  return (
    <View style={index % 2 === 1 ? styles.tableBodyRowAlt : styles.tableBodyRow} key={index}>
      <Cell width={COL_NUM}>{index + 1}</Cell>
      <Cell width={COL_REF}>{item.artwork_reference_code}</Cell>
      <Cell width={COL_TITLE}>
        {item.artwork_title}
      </Cell>
      <Cell width={COL_DIM}>{item.artwork_dimensions || '—'}</Cell>
      <Cell width={COL_WEIGHT}>{formatWeight(item.artwork_weight)}</Cell>
      <Cell width={COL_HANDLING}>{item.special_handling ?? '—'}</Cell>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function PackingListPDF({
  packingList,
  deliveryNumber,
  crates,
  unassignedItems,
  items,
  language,
}: PackingListPDFProps) {
  const t = TRANSLATIONS[language] ?? TRANSLATIONS.en;

  // Build info rows
  const infoRows: { label: string; value: string }[] = [
    { label: t.packingNo, value: packingList.packing_number },
  ];
  if (packingList.packing_date) {
    infoRows.push({ label: t.date, value: packingList.packing_date });
  }
  infoRows.push({ label: t.recipient, value: packingList.recipient_name });
  if (deliveryNumber) {
    infoRows.push({ label: t.delivery, value: deliveryNumber });
  }

  // Determine if we use crate-grouped mode or legacy flat mode
  const useCrateMode = Array.isArray(crates);

  // Summary
  let totalItems = 0;
  let totalWeight = 0;
  let hasAnyWeight = false;

  if (useCrateMode) {
    const allItems = [
      ...(crates ?? []).flatMap((c) => c.items),
      ...(unassignedItems ?? []),
    ];
    totalItems = allItems.length;
    allItems.forEach((item) => {
      if (item.artwork_weight != null) {
        totalWeight += item.artwork_weight;
        hasAnyWeight = true;
      }
    });
  } else if (items) {
    totalItems = items.length;
    items.forEach((item) => {
      if (item.artwork_weight != null) {
        totalWeight += item.artwork_weight;
        hasAnyWeight = true;
      }
    });
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <PDFHeader title={t.packingList} subtitle={packingList.packing_number} language={language} />

        {/* Packing List Info */}
        <View style={styles.infoGrid}>
          {infoRows.map((row) => (
            <View style={styles.infoRow} key={row.label}>
              <Text style={styles.infoLabel}>{row.label}</Text>
              <Text style={styles.infoValue}>{row.value}</Text>
            </View>
          ))}
        </View>

        {/* ---- Crate-grouped mode ---------------------------------------- */}
        {useCrateMode ? (
          <View style={styles.table}>
            <TableHeader t={t} />

            {(crates ?? []).map((crate, ci) => {
              // Parse dimensions into L/W/H parts for explicit labeling
              const dimStr = crate.dimensions?.replace(/\s*cm\s*$/i, '').trim() ?? '';
              const dimParts = dimStr ? dimStr.split(/\s*[×x]\s*/) : [];
              const hasLWH = dimParts.length === 3;

              return (
                <View key={ci}>
                  {/* Crate header */}
                  <View style={s.crateHeader}>
                    <View style={s.crateHeaderRow}>
                      <Text style={s.crateTitle}>{crate.crate_name}</Text>
                      {crate.packaging_type && (
                        <Text style={s.cratePackaging}>{crate.packaging_type.replace(/_/g, ' ')}</Text>
                      )}
                    </View>
                    {/* Explicit dimension + weight row */}
                    {(hasLWH || crate.weight != null || crate.notes) && (
                      <View style={s.crateDimRow}>
                        {hasLWH && (
                          <>
                            <View style={s.crateDimItem}>
                              <Text style={s.crateDimLabel}>Length</Text>
                              <Text style={s.crateDimValue}> {dimParts[0]} cm</Text>
                            </View>
                            <Text style={s.crateSeparator}>·</Text>
                            <View style={s.crateDimItem}>
                              <Text style={s.crateDimLabel}>Width</Text>
                              <Text style={s.crateDimValue}> {dimParts[1]} cm</Text>
                            </View>
                            <Text style={s.crateSeparator}>·</Text>
                            <View style={s.crateDimItem}>
                              <Text style={s.crateDimLabel}>Height</Text>
                              <Text style={s.crateDimValue}> {dimParts[2]} cm</Text>
                            </View>
                          </>
                        )}
                        {!hasLWH && crate.dimensions && (
                          <Text style={s.crateDimValue}>{crate.dimensions}</Text>
                        )}
                        {crate.weight != null && (
                          <>
                            {hasLWH && <Text style={s.crateSeparator}>·</Text>}
                            <View style={s.crateDimItem}>
                              <Text style={s.crateDimLabel}>Weight</Text>
                              <Text style={s.crateDimValue}> {crate.weight} kg</Text>
                            </View>
                          </>
                        )}
                        {crate.notes && (
                          <>
                            <Text style={s.crateSeparator}>·</Text>
                            <Text style={s.crateMeta}>{crate.notes}</Text>
                          </>
                        )}
                      </View>
                    )}
                  </View>
                  {/* Artwork rows */}
                  {crate.items.length > 0 ? (
                    crate.items.map((item, ii) => (
                      <ItemRow key={ii} item={item} index={ii} />
                    ))
                  ) : (
                    <View style={styles.tableBodyRow}>
                      <Text style={[styles.tableCell, { flex: 1, color: PDF_COLORS.primary400, fontStyle: 'italic' }]}>
                        No artworks assigned
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}

            {/* Unassigned artworks */}
            {(unassignedItems ?? []).length > 0 && (
              <View>
                <View style={s.unassignedHeader}>
                  <Text style={s.unassignedTitle}>{t.unassigned}</Text>
                </View>
                {(unassignedItems ?? []).map((item, ii) => (
                  <ItemRow key={ii} item={item} index={ii} />
                ))}
              </View>
            )}
          </View>
        ) : (
          /* ---- Legacy flat mode ---------------------------------------- */
          <View style={styles.table}>
            <TableHeader t={t} />
            {(items ?? []).map((item, index) => (
              <ItemRow
                key={index}
                index={index}
                item={{
                  artwork_title: item.artwork_title,
                  artwork_reference_code: item.artwork_reference_code,
                  artwork_dimensions: item.artwork_dimensions,
                  artwork_weight: item.artwork_weight,
                  special_handling: item.special_handling,
                  notes: item.notes,
                }}
              />
            ))}
          </View>
        )}

        {/* Summary */}
        <View style={[styles.infoGrid, { marginTop: 12 }]}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t.totalItems}</Text>
            <Text style={styles.infoValue}>{totalItems}</Text>
          </View>
          {hasAnyWeight && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{t.totalWeight}</Text>
              <Text style={styles.infoValue}>{formatWeight(totalWeight)}</Text>
            </View>
          )}
        </View>

        {/* Notes */}
        {packingList.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t.notes}</Text>
            <Text style={styles.bodyText}>{packingList.notes}</Text>
          </View>
        )}

        {/* Signature */}
        <View style={{ marginTop: 40 }}>
          <View style={styles.signatureLine} />
          <Text style={styles.signatureLabel}>{t.packedBy}</Text>
          <View style={{ width: 200, borderBottomWidth: 0.5, borderBottomColor: PDF_COLORS.border, marginTop: 20, marginBottom: 4 }} />
          <Text style={styles.signatureLabel}>{t.signatureDate}</Text>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>{`© ${COMPANY_NAME}`}</Text>
          <Text
            style={styles.pageNumber}
            render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}
