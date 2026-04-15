// ---------------------------------------------------------------------------
// NOA Inventory -- Monthly Report PDF
// ---------------------------------------------------------------------------

import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import { PDFHeader } from './PDFHeader';
import { PDF_COLORS } from './PDFStyles';
import type { MonthlyReportData } from '../../hooks/useMonthlyReport';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface MonthlyReportPDFProps {
  year: number;
  month: number;
  monthLabel: string;
  data: MonthlyReportData;
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const s = StyleSheet.create({
  page: {
    fontFamily: 'AnzianoPro',
    fontSize: 9,
    color: PDF_COLORS.primary900,
    backgroundColor: PDF_COLORS.white,
    paddingTop: 40,
    paddingBottom: 40,
    paddingHorizontal: 40,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 8,
    color: PDF_COLORS.primary900,
  },
  summaryRow: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: PDF_COLORS.border,
    borderRadius: 4,
    padding: 10,
  },
  cardLabel: {
    fontSize: 7,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: PDF_COLORS.primary400,
    marginBottom: 4,
  },
  cardValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: PDF_COLORS.primary900,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: PDF_COLORS.backgroundLight,
    borderBottomWidth: 1,
    borderBottomColor: PDF_COLORS.border,
    paddingVertical: 5,
    paddingHorizontal: 6,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: PDF_COLORS.border,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  th: {
    fontSize: 7,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: PDF_COLORS.primary400,
  },
  td: {
    fontSize: 9,
    color: PDF_COLORS.primary700,
  },
  tdBold: {
    fontSize: 9,
    fontWeight: 'bold',
    color: PDF_COLORS.primary900,
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 40,
    right: 40,
    fontSize: 7,
    color: PDF_COLORS.primary400,
    textAlign: 'center',
  },
});

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function fmtCurrency(amount: number, currency = 'CHF'): string {
  return `${currency} ${amount.toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('de-CH', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MonthlyReportPDF({ year, monthLabel, data }: MonthlyReportPDFProps) {
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <PDFHeader title="Monthly Report" subtitle={`${monthLabel} ${year}`} />

        {/* Summary Cards */}
        <View style={s.summaryRow}>
          <View style={s.summaryCard}>
            <Text style={s.cardLabel}>Artworks Sold</Text>
            <Text style={s.cardValue}>{data.salesCount}</Text>
          </View>
          <View style={s.summaryCard}>
            <Text style={s.cardLabel}>Revenue</Text>
            <Text style={s.cardValue}>{fmtCurrency(data.totalRevenueCHF)}</Text>
          </View>
          <View style={s.summaryCard}>
            <Text style={s.cardLabel}>Artworks Created</Text>
            <Text style={s.cardValue}>{data.artworksCreatedCount}</Text>
          </View>
          <View style={s.summaryCard}>
            <Text style={s.cardLabel}>Production Orders</Text>
            <Text style={s.cardValue}>{data.productionOrdersCount}</Text>
          </View>
        </View>

        <View style={s.summaryRow}>
          <View style={s.summaryCard}>
            <Text style={s.cardLabel}>Artworks Edited</Text>
            <Text style={s.cardValue}>{data.artworksEditedCount}</Text>
          </View>
          <View style={s.summaryCard}>
            <Text style={s.cardLabel}>Forwarding Orders</Text>
            <Text style={s.cardValue}>{data.forwardingOrdersCount}</Text>
          </View>
          <View style={s.summaryCard}>
            <Text style={s.cardLabel}>Expenses</Text>
            <Text style={s.cardValue}>{fmtCurrency(data.totalExpensesCHF)}</Text>
          </View>
          <View style={s.summaryCard}>
            <Text style={s.cardLabel}>Net</Text>
            <Text style={s.cardValue}>{fmtCurrency(data.totalRevenueCHF - data.totalExpensesCHF)}</Text>
          </View>
        </View>

        {/* Sales Table */}
        {data.sales.length > 0 && (
          <View wrap={false}>
            <Text style={s.sectionTitle}>Sales ({data.sales.length})</Text>
            <View style={s.tableHeader}>
              <Text style={[s.th, { width: '35%' }]}>Artwork</Text>
              <Text style={[s.th, { width: '25%' }]}>Gallery</Text>
              <Text style={[s.th, { width: '20%' }]}>Date</Text>
              <Text style={[s.th, { width: '20%', textAlign: 'right' }]}>Price</Text>
            </View>
            {data.sales.map((sale) => (
              <View key={sale.id} style={s.tableRow}>
                <Text style={[s.td, { width: '35%' }]}>{sale.artworks?.title ?? '—'}</Text>
                <Text style={[s.td, { width: '25%' }]}>{sale.galleries?.name ?? '—'}</Text>
                <Text style={[s.td, { width: '20%' }]}>{fmtDate(sale.sale_date)}</Text>
                <Text style={[s.tdBold, { width: '20%', textAlign: 'right' }]}>{fmtCurrency(sale.sale_price, sale.currency)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* New Artworks */}
        {data.artworksCreated.length > 0 && (
          <View wrap={false}>
            <Text style={s.sectionTitle}>New Artworks ({data.artworksCreated.length})</Text>
            <View style={s.tableHeader}>
              <Text style={[s.th, { width: '25%' }]}>Reference</Text>
              <Text style={[s.th, { width: '35%' }]}>Title</Text>
              <Text style={[s.th, { width: '20%' }]}>Medium</Text>
              <Text style={[s.th, { width: '20%' }]}>Created</Text>
            </View>
            {data.artworksCreated.map((a) => (
              <View key={a.id} style={s.tableRow}>
                <Text style={[s.td, { width: '25%' }]}>{a.reference_code}</Text>
                <Text style={[s.td, { width: '35%' }]}>{a.title}</Text>
                <Text style={[s.td, { width: '20%' }]}>{a.medium ?? '—'}</Text>
                <Text style={[s.td, { width: '20%' }]}>{fmtDate(a.created_at)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Production Orders */}
        {data.productionOrders.length > 0 && (
          <View wrap={false}>
            <Text style={s.sectionTitle}>Production Orders ({data.productionOrders.length})</Text>
            <View style={s.tableHeader}>
              <Text style={[s.th, { width: '25%' }]}>Order #</Text>
              <Text style={[s.th, { width: '35%' }]}>Title</Text>
              <Text style={[s.th, { width: '20%' }]}>Status</Text>
              <Text style={[s.th, { width: '20%' }]}>Created</Text>
            </View>
            {data.productionOrders.map((o) => (
              <View key={o.id} style={s.tableRow}>
                <Text style={[s.td, { width: '25%' }]}>{o.order_number}</Text>
                <Text style={[s.td, { width: '35%' }]}>{o.title}</Text>
                <Text style={[s.td, { width: '20%' }]}>{o.status.replace(/_/g, ' ')}</Text>
                <Text style={[s.td, { width: '20%' }]}>{fmtDate(o.created_at)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Expenses by Category */}
        {Object.keys(data.expensesByCategory).length > 0 && (
          <View wrap={false}>
            <Text style={s.sectionTitle}>Expenses by Category</Text>
            <View style={s.tableHeader}>
              <Text style={[s.th, { width: '60%' }]}>Category</Text>
              <Text style={[s.th, { width: '40%', textAlign: 'right' }]}>Amount</Text>
            </View>
            {Object.entries(data.expensesByCategory)
              .sort(([, a], [, b]) => b - a)
              .map(([cat, amount]) => (
                <View key={cat} style={s.tableRow}>
                  <Text style={[s.td, { width: '60%', textTransform: 'capitalize' }]}>{cat.replace(/_/g, ' ')}</Text>
                  <Text style={[s.tdBold, { width: '40%', textAlign: 'right' }]}>{fmtCurrency(amount)}</Text>
                </View>
              ))}
          </View>
        )}

        <Text style={s.footer}>
          NOA x Simon Berger — Monthly Report — {monthLabel} {year} — Generated {new Date().toLocaleDateString('de-CH')}
        </Text>
      </Page>
    </Document>
  );
}
