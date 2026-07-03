import { Document, Page, View, Text } from '@react-pdf/renderer';
import styles, { PDF_COLORS } from './PDFStyles';
import { PDFHeader } from './PDFHeader';
import type { PublicationBudgetRow, PublicationBudgetItemRow } from '../../types/database';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmt(amount: number, currency: string): string {
  return new Intl.NumberFormat('de-CH', { style: 'currency', currency, minimumFractionDigits: 2 }).format(amount);
}

function today(): string {
  return new Intl.DateTimeFormat('de-CH').format(new Date());
}

// ---------------------------------------------------------------------------
// Column widths
// ---------------------------------------------------------------------------

const COL_CAT   = '16%';
const COL_DESC  = '34%';
const COL_QTY   = '8%';
const COL_UNIT  = '14%';
const COL_TOTAL = '14%';
const COL_CUR   = '7%';
const COL_STA   = '7%';

// ---------------------------------------------------------------------------
// Table header row
// ---------------------------------------------------------------------------

function TableHeader() {
  return (
    <View style={styles.tableHeaderRow}>
      <Text style={[styles.tableHeaderCell, { width: COL_CAT }]}>Category</Text>
      <Text style={[styles.tableHeaderCell, { width: COL_DESC }]}>Description</Text>
      <Text style={[styles.tableHeaderCell, { width: COL_QTY, textAlign: 'right' }]}>Qty</Text>
      <Text style={[styles.tableHeaderCell, { width: COL_UNIT, textAlign: 'right' }]}>Unit Price</Text>
      <Text style={[styles.tableHeaderCell, { width: COL_TOTAL, textAlign: 'right' }]}>Total</Text>
      <Text style={[styles.tableHeaderCell, { width: COL_CUR }]}>Cur.</Text>
      <Text style={[styles.tableHeaderCell, { width: COL_STA }]}>Status</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Item row
// ---------------------------------------------------------------------------

function ItemRow({ item, alt }: { item: PublicationBudgetItemRow; alt: boolean }) {
  const rowStyle = alt ? styles.tableBodyRowAlt : styles.tableBodyRow;
  return (
    <View style={rowStyle} wrap={false}>
      <Text style={[styles.tableCell, { width: COL_CAT, fontSize: 8, color: PDF_COLORS.primary400 }]}>{item.category}</Text>
      <Text style={[styles.tableCell, { width: COL_DESC }]}>{item.description}</Text>
      <Text style={[styles.tableCell, { width: COL_QTY, textAlign: 'right' }]}>{item.quantity}</Text>
      <Text style={[styles.tableCell, { width: COL_UNIT, textAlign: 'right' }]}>{fmt(item.unit_price, item.currency)}</Text>
      <Text style={[styles.tableCell, { width: COL_TOTAL, textAlign: 'right', fontWeight: 'bold' }]}>{fmt(item.amount, item.currency)}</Text>
      <Text style={[styles.tableCell, { width: COL_CUR, fontSize: 8 }]}>{item.currency}</Text>
      <Text style={[styles.tableCell, { width: COL_STA, fontSize: 8, color: PDF_COLORS.primary400 }]}>{item.status}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Section subtotal row
// ---------------------------------------------------------------------------

function SubtotalRow({ label, total, currency }: { label: string; total: number; currency: string }) {
  return (
    <View style={{ flexDirection: 'row', borderTopWidth: 0.5, borderTopColor: PDF_COLORS.border, paddingVertical: 5, marginTop: 2 }}>
      <Text style={{ width: '72%', fontSize: 9, fontWeight: 'bold', color: PDF_COLORS.primary700, textAlign: 'right', paddingRight: 8 }}>{label}</Text>
      <Text style={{ width: '14%', fontSize: 9, fontWeight: 'bold', color: PDF_COLORS.primary900, textAlign: 'right' }}>{fmt(total, currency)}</Text>
      <Text style={{ width: '14%' }} />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Summary card row
// ---------------------------------------------------------------------------

function SummaryRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottomWidth: 0.5, borderBottomColor: PDF_COLORS.border }}>
      <Text style={{ fontSize: 9, color: PDF_COLORS.primary400, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</Text>
      <Text style={{ fontSize: highlight ? 12 : 10, fontWeight: 'bold', color: highlight ? PDF_COLORS.primary900 : PDF_COLORS.primary700 }}>{value}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main PDF
// ---------------------------------------------------------------------------

export interface PublicationBudgetPDFProps {
  budget: PublicationBudgetRow;
  items: PublicationBudgetItemRow[];
}

export function PublicationBudgetPDF({ budget, items }: PublicationBudgetPDFProps) {
  const revenues = items.filter((i) => i.type === 'revenue');
  const costs    = items.filter((i) => i.type === 'cost');

  // Use the first currency found, fall back to CHF
  const defaultCurrency = items[0]?.currency ?? 'CHF';
  const totalRevenue = revenues.reduce((s, i) => s + i.amount, 0);
  const totalCosts   = costs.reduce((s, i) => s + i.amount, 0);
  const netResult    = totalRevenue - totalCosts;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <PDFHeader
          title="Publication Budget"
          subtitle={budget.name + (budget.description ? `  ·  ${budget.description}` : '')}
        />

        {/* Summary */}
        <View style={{ marginBottom: 20, backgroundColor: PDF_COLORS.backgroundLight, padding: 12, borderWidth: 0.5, borderColor: PDF_COLORS.border }}>
          <Text style={[styles.sectionTitle, { marginBottom: 8 }]}>Summary</Text>
          <SummaryRow label="Total Revenue" value={fmt(totalRevenue, defaultCurrency)} />
          <SummaryRow label="Total Costs"   value={fmt(totalCosts,   defaultCurrency)} />
          <SummaryRow label="Net Result"    value={fmt(netResult,    defaultCurrency)} highlight />
        </View>

        {/* Revenue */}
        {revenues.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: '#16a34a' }]}>Revenue</Text>
            <View style={styles.table}>
              <TableHeader />
              {revenues.map((item, i) => <ItemRow key={item.id} item={item} alt={i % 2 === 1} />)}
            </View>
            <SubtotalRow label="Total Revenue" total={totalRevenue} currency={defaultCurrency} />
          </View>
        )}

        {/* Costs */}
        {costs.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: '#dc2626' }]}>Costs</Text>
            <View style={styles.table}>
              <TableHeader />
              {costs.map((item, i) => <ItemRow key={item.id} item={item} alt={i % 2 === 1} />)}
            </View>
            <SubtotalRow label="Total Costs" total={totalCosts} currency={defaultCurrency} />
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={styles.footerText}>NOA Contemporary — {budget.name}</Text>
            <Text style={styles.footerText}>Exported {today()}</Text>
            <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
          </View>
        </View>
      </Page>
    </Document>
  );
}
