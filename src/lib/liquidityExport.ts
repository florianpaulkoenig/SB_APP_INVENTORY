// ---------------------------------------------------------------------------
// Excel export of the liquidity planning — positions + monthly summary.
// exceljs is loaded dynamically to keep the main bundle light.
// ---------------------------------------------------------------------------

import type { MonthBucket } from '../hooks/useNOALiquidity';
import { convertToCHF } from './currency';
import { getRatesCHF } from '../hooks/useExchangeRates';

const STATUS_LABELS = {
  paid:      'Bezahlt',
  open:      'Offen',
  late:      'Überfällig',
  provCarry: 'Provisorisch (aus Vormonat)',
} as const;

interface ExportRow {
  month: string;
  kind: 'Einnahme' | 'Ausgabe';
  status: string;
  provisional: boolean;
  project: string;
  description: string;
  amount: number;
  currency: string;
  amountCHF: number;
  date: string;
}

export async function exportLiquidityToExcel(
  months: MonthBucket[],
  pastMonths: MonthBucket[],
  projectNames: Record<string, string>,
): Promise<void> {
  const rates = await getRatesCHF();
  const chf = (amount: number, currency: string) => convertToCHF(amount, currency, rates);

  const rows: ExportRow[] = [];
  const proj = (pid?: string | null) => (pid ? projectNames[pid] ?? '' : '');

  const pushBucket = (b: MonthBucket) => {
    for (const e of [...b.lateEntries, ...b.provCarryIncome, ...b.entries, ...b.paidEntries]) {
      const status = e.paid_at
        ? STATUS_LABELS.paid
        : b.lateEntries.includes(e)
          ? STATUS_LABELS.late
          : b.provCarryIncome.includes(e)
            ? STATUS_LABELS.provCarry
            : STATUS_LABELS.open;
      rows.push({
        month: b.label,
        kind: 'Einnahme',
        status,
        provisional: !!e.provisional,
        project: proj(e.project_id),
        description: e.description,
        amount: e.amount,
        currency: e.currency,
        amountCHF: chf(e.amount, e.currency),
        date: e.expected_date,
      });
    }
    for (const e of b.expenses) {
      rows.push({
        month: b.label,
        kind: 'Ausgabe',
        status: b.paidExpenseMap[e.id] ? STATUS_LABELS.paid : STATUS_LABELS.open,
        provisional: !!e.provisional,
        project: proj(e.project_id),
        description: e.description,
        amount: e.amount,
        currency: e.currency,
        amountCHF: chf(e.amount, e.currency),
        date: e.due_date ?? '',
      });
    }
    for (const le of [...b.lateExpenses, ...b.provCarryExpenses]) {
      rows.push({
        month: b.label,
        kind: 'Ausgabe',
        status: b.lateExpenses.includes(le) ? STATUS_LABELS.late : STATUS_LABELS.provCarry,
        provisional: !!le.expense.provisional,
        project: proj(le.expense.project_id),
        description: le.expense.description,
        amount: le.expense.amount,
        currency: le.expense.currency,
        amountCHF: chf(le.expense.amount, le.expense.currency),
        date: le.expense.due_date ?? '',
      });
    }
  };

  pastMonths.forEach(pushBucket);
  months.forEach(pushBucket);

  const { default: ExcelJS } = await import('exceljs');
  const workbook = new ExcelJS.Workbook();

  // ---- Sheet 1: all positions ---------------------------------------------
  const sheet = workbook.addWorksheet('Positionen');
  sheet.columns = [
    { header: 'Monat',        key: 'month',       width: 16 },
    { header: 'Art',          key: 'kind',        width: 10 },
    { header: 'Status',       key: 'status',      width: 24 },
    { header: 'Provisorisch', key: 'provisional', width: 12 },
    { header: 'Projekt',      key: 'project',     width: 28 },
    { header: 'Beschreibung', key: 'description', width: 48 },
    { header: 'Betrag',       key: 'amount',      width: 14 },
    { header: 'Währung',      key: 'currency',    width: 9 },
    { header: 'Betrag CHF',   key: 'amountCHF',   width: 14 },
    { header: 'Datum',        key: 'date',        width: 12 },
  ];
  sheet.getRow(1).font = { bold: true };
  for (const r of rows) {
    sheet.addRow({ ...r, provisional: r.provisional ? 'ja' : '', amountCHF: Math.round(r.amountCHF * 100) / 100 });
  }
  sheet.getColumn('amount').numFmt = '#,##0.00';
  sheet.getColumn('amountCHF').numFmt = '#,##0.00';

  // ---- Sheet 2: monthly summary -------------------------------------------
  const summary = workbook.addWorksheet('Monatsübersicht');
  summary.columns = [
    { header: 'Monat',                 key: 'month',      width: 16 },
    { header: 'Einnahmen def. (CHF)',  key: 'incDef',     width: 20 },
    { header: 'Einnahmen prov. (CHF)', key: 'incProv',    width: 20 },
    { header: 'Ausgaben def. (CHF)',   key: 'expDef',     width: 20 },
    { header: 'Ausgaben prov. (CHF)',  key: 'expProv',    width: 20 },
    { header: 'Netto def. (CHF)',      key: 'netDef',     width: 18 },
    { header: 'Saldo projiziert (CHF)', key: 'saldo',     width: 20 },
    { header: 'Saldo inkl. prov. (CHF)', key: 'saldoProv', width: 20 },
    { header: 'Ist-Saldo (CHF)',       key: 'ist',        width: 16 },
  ];
  summary.getRow(1).font = { bold: true };

  for (const b of [...pastMonths, ...months]) {
    const inc = [...b.entries, ...b.lateEntries, ...b.provCarryIncome, ...b.paidEntries];
    const expAll = [
      ...b.expenses.map((e) => ({ amount: e.amount, currency: e.currency, provisional: !!e.provisional })),
      ...[...b.lateExpenses, ...b.provCarryExpenses].map((le) => ({
        amount: le.expense.amount, currency: le.expense.currency, provisional: !!le.expense.provisional,
      })),
    ];
    const sum = (arr: { amount: number; currency: string }[]) =>
      Math.round(arr.reduce((s, e) => s + chf(e.amount, e.currency), 0) * 100) / 100;
    const incProv = sum(inc);
    const incDef  = sum(inc.filter((e) => !e.provisional));
    const expProv = sum(expAll);
    const expDef  = sum(expAll.filter((e) => !e.provisional));
    summary.addRow({
      month:     b.label,
      incDef,
      incProv,
      expDef,
      expProv,
      netDef:    Math.round((incDef - expDef) * 100) / 100,
      saldo:     Math.round(b.projectedBalance * 100) / 100,
      saldoProv: Math.round(b.projectedBalanceProv * 100) / 100,
      ist:       b.actualBalance !== null ? Math.round(b.actualBalance * 100) / 100 : '',
    });
  }
  for (const key of ['incDef', 'incProv', 'expDef', 'expProv', 'netDef', 'saldo', 'saldoProv', 'ist']) {
    summary.getColumn(key).numFmt = '#,##0.00';
  }

  // ---- Download ------------------------------------------------------------
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const today = new Date();
  a.href = url;
  a.download = `Liquiditaetsplanung_${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
