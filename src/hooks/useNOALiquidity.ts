// ---------------------------------------------------------------------------
// useNOALiquidity — income + expenses, 12-month view
//   • paid_at tracking (paid / unpaid / late)
//   • Startsaldo + projected & Ist-Saldo per month
// ---------------------------------------------------------------------------

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/Toast';
import type {
  NOALiquidityIncomeRow,
  NOALiquidityExpenseRow,
  NOALiquidityExpensePaymentRow,
  NOALiquiditySettingsRow,
  NOALiquidityActualBalanceRow,
  NOALiquidityBalanceCorrectionRow,
  LiquidityExpenseType,
} from '../types/database';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** An unpaid expense instance from a past month, carried into the current month */
export interface LateExpenseInstance {
  expense: NOALiquidityExpenseRow;
  year: number;
  month: number; // 1-indexed
}

export interface MonthBucket {
  year: number;
  month: number;           // 0-indexed
  label: string;
  /** Unpaid entries whose expected_date falls in this month */
  entries: NOALiquidityIncomeRow[];
  /** Paid entries whose expected_date falls in this month */
  paidEntries: NOALiquidityIncomeRow[];
  /**
   * Overdue unpaid entries from past months — only populated on the
   * first (current) month bucket.
   */
  lateEntries: NOALiquidityIncomeRow[];
  /**
   * Unpaid expense instances from past months — only populated on the
   * first (current) month bucket.
   */
  lateExpenses: LateExpenseInstance[];
  expenses: NOALiquidityExpenseRow[];
  /**
   * Map from expense_id → payment_id for expenses paid in this month.
   * If expense_id is a key, the expense instance for this month is paid.
   */
  paidExpenseMap: Record<string, string>;
  /** Map from expense_id → paid_at timestamp for expenses paid in this month */
  paidExpenseAtMap: Record<string, string>;
  /** Running projected balance at end of this month */
  projectedBalance: number;
  /** User-entered actual account balance (null if not set) */
  actualBalance: number | null;
  actualBalanceId: string | null;
}

export interface UseNOALiquidityReturn {
  months: MonthBucket[];
  /** Months before the current one that contain data — ascending (oldest first) */
  pastMonths: MonthBucket[];
  expenses: NOALiquidityExpenseRow[];
  startsaldo: number;
  startsaldoCurrency: string;
  /** Date the Startsaldo was recorded (YYYY-MM-DD, null if never set) */
  startsaldoDate: string | null;
  /** Sum of income marked paid AFTER the Startsaldo was set (any month) */
  paidIncomeSinceStart: number;
  /** Sum of expense payments recorded AFTER the Startsaldo was set (any month) */
  paidExpensesSinceStart: number;
  /** User-entered real bank balance (null if none recorded) */
  effectiveBalance: number | null;
  effectiveBalanceDate: string | null;
  /** Latest Saldokorrektur — final bank snapshot anchoring the Tagessaldo */
  lastCorrection: NOALiquidityBalanceCorrectionRow | null;
  /** Items with period dates before this are locked (= lastCorrection date) */
  lockDate: string | null;
  /** Moment the latest correction was recorded (ms epoch) */
  lockTs: number | null;
  loading: boolean;
  // Income CRUD
  addIncome: (data: {
    description: string;
    amount: number;
    currency: string;
    expected_date: string;
    notes?: string | null;
  }) => Promise<boolean>;
  updateIncome: (id: string, data: {
    description: string;
    amount: number;
    currency: string;
    expected_date: string;
    notes?: string | null;
  }) => Promise<boolean>;
  deleteIncome: (id: string) => Promise<boolean>;
  markIncomePaid:   (id: string) => Promise<boolean>;
  markIncomeUnpaid: (id: string) => Promise<boolean>;
  // Expenses
  addExpense: (data: {
    description: string;
    amount: number;
    currency: string;
    type: LiquidityExpenseType;
    due_date: string;
  }) => Promise<boolean>;
  updateExpense: (id: string, data: {
    description: string;
    amount: number;
    currency: string;
    type: LiquidityExpenseType;
    due_date: string;
  }) => Promise<boolean>;
  deleteExpense: (id: string) => Promise<boolean>;
  toggleExpenseActive: (id: string, active: boolean) => Promise<boolean>;
  markExpensePaid:   (expenseId: string, year: number, month: number) => Promise<boolean>;
  markExpenseUnpaid: (paymentId: string) => Promise<boolean>;
  // Startsaldo
  upsertStartsaldo: (amount: number, currency: string, date: string) => Promise<boolean>;
  // Effektiver Konto-Saldo
  upsertEffectiveBalance: (amount: number) => Promise<boolean>;
  clearEffectiveBalance: () => Promise<boolean>;
  /** Accept the difference: set a new Startsaldo and clear the effective balance */
  acceptEffectiveBalance: (newStartingBalance: number, currency: string) => Promise<boolean>;
  // Ist-Saldo
  upsertActualBalance: (year: number, month: number, balance: number, currency: string) => Promise<boolean>;
  deleteActualBalance: (id: string) => Promise<boolean>;
  refetch: () => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MONTH_LABELS_DE = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
];

// ---------------------------------------------------------------------------
// Helper — does a recurring expense apply to a given calendar month?
// ---------------------------------------------------------------------------

function expenseAppliesTo(
  e: NOALiquidityExpenseRow,
  year: number,
  month: number, // 0-indexed
): boolean {
  if (!e.active || !e.due_date) return false;

  const anchor = new Date(e.due_date + 'T00:00:00');
  const aY = anchor.getFullYear();
  const aM = anchor.getMonth();

  if (year < aY || (year === aY && month < aM)) return false;

  const diff = (year - aY) * 12 + (month - aM);

  switch (e.type) {
    case 'one_time':    return diff === 0;
    case 'monthly':     return true;
    case 'quarterly':   return diff % 3 === 0;
    case 'semi_annual': return diff % 6 === 0;
    case 'annual':      return diff % 12 === 0;
    default:            return false;
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useNOALiquidity(): UseNOALiquidityReturn {
  const [months, setMonths]         = useState<MonthBucket[]>([]);
  const [pastMonths, setPastMonths] = useState<MonthBucket[]>([]);
  const [expenses, setExpenses]     = useState<NOALiquidityExpenseRow[]>([]);
  const [startsaldo, setStartsaldo]                 = useState(0);
  const [startsaldoCurrency, setStartsaldoCurrency] = useState('CHF');
  const [startsaldoDate, setStartsaldoDate]         = useState<string | null>(null);
  const [paidIncomeSinceStart, setPaidIncomeSinceStart]     = useState(0);
  const [paidExpensesSinceStart, setPaidExpensesSinceStart] = useState(0);
  const [effectiveBalance, setEffectiveBalance]         = useState<number | null>(null);
  const [effectiveBalanceDate, setEffectiveBalanceDate] = useState<string | null>(null);
  const [lastCorrection, setLastCorrection] = useState<NOALiquidityBalanceCorrectionRow | null>(null);
  const [loading, setLoading]   = useState(true);
  const [tick, setTick]         = useState(0);
  const { toast } = useToast();

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    async function load() {
      setLoading(true);

      const today       = new Date();
      const windowStart = new Date(today.getFullYear(), today.getMonth(), 1);
      const windowEnd   = new Date(today.getFullYear(), today.getMonth() + 12, 0);
      const wsStr = windowStart.toISOString().slice(0, 10);
      const weStr = windowEnd.toISOString().slice(0, 10);

      const [incomeRes, pastIncomeRes, expensesRes, settingsRes, actualBalancesRes, expPaymentsRes, correctionsRes] = await Promise.all([
        // Income within the 12-month window (paid or unpaid)
        supabase
          .from('noa_liquidity_income' as never)
          .select('*')
          .gte('expected_date', wsStr)
          .lte('expected_date', weStr)
          .order('expected_date', { ascending: true }),

        // ALL income from BEFORE the window (paid + unpaid) — for the
        // past-months review and the overdue list
        supabase
          .from('noa_liquidity_income' as never)
          .select('*')
          .lt('expected_date', wsStr)
          .order('expected_date', { ascending: true }),

        supabase
          .from('noa_liquidity_expenses' as never)
          .select('*')
          .order('created_at', { ascending: true }),

        supabase
          .from('noa_liquidity_settings' as never)
          .select('*')
          .maybeSingle(),

        supabase
          .from('noa_liquidity_actual_balances' as never)
          .select('*'),

        // All expense payments (past months included)
        supabase
          .from('noa_liquidity_expense_payments' as never)
          .select('*'),

        // Saldokorrekturen, newest first (missing table pre-migration → empty)
        supabase
          .from('noa_liquidity_balance_corrections' as never)
          .select('*')
          .order('correction_date', { ascending: false }),
      ]);

      if (incomeRes.error) {
        toast({ title: 'Fehler', description: incomeRes.error.message, variant: 'error' });
        setLoading(false);
        return;
      }

      const windowEntries  = (incomeRes.data       ?? []) as NOALiquidityIncomeRow[];
      const pastIncome     = (pastIncomeRes.data    ?? []) as NOALiquidityIncomeRow[];
      const lateEntries    = pastIncome.filter((e) => !e.paid_at);
      const allExpenses    = (expensesRes.data      ?? []) as NOALiquidityExpenseRow[];
      const settings       = settingsRes.data             as NOALiquiditySettingsRow | null;
      const actualBalList  = (actualBalancesRes.data ?? []) as NOALiquidityActualBalanceRow[];
      const expPaymentList = (expPaymentsRes.data   ?? []) as NOALiquidityExpensePaymentRow[];
      const corrections    = (correctionsRes.data   ?? []) as NOALiquidityBalanceCorrectionRow[];
      const correction     = corrections[0] ?? null; // newest
      setLastCorrection(correction);

      // Expense payment lookup: "expenseId:year-MM" → payment_id / paid_at
      const expPaymentMap: Record<string, string> = {};
      const expPaymentAtMap: Record<string, string> = {};
      for (const p of expPaymentList) {
        const key = `${p.expense_id}:${p.year}-${String(p.month).padStart(2, '0')}`;
        expPaymentMap[key] = p.id;
        expPaymentAtMap[key] = p.paid_at;
      }

      const saldo    = settings?.starting_balance ?? 0;
      const currency = settings?.currency         ?? 'CHF';
      setStartsaldo(saldo);
      setStartsaldoCurrency(currency);
      setStartsaldoDate(settings?.starting_balance_date ?? null);
      setEffectiveBalance(settings?.effective_balance ?? null);
      setEffectiveBalanceDate(settings?.effective_balance_date ?? null);

      // ---- Tagessaldo components ---------------------------------------------
      // Anchor = the latest Saldokorrektur if one exists, else the Startsaldo:
      // the bank balance as of anchorDate (D), recorded at moment anchorTs (T).
      // A paid item counts when
      //   • it was marked paid AFTER T — a settlement that happened after the
      //     snapshot was taken, OR
      //   • it was already marked paid at T but belongs to a period BETWEEN D
      //     and the day the snapshot was saved — backfilled entries whose
      //     money moved after the snapshot date.
      // Anything else was already reflected in the bank balance at D. In
      // particular, items with periods after the save day that were marked
      // paid before T (prepaid future items) are part of the snapshot.
      const anchorBalance = correction?.balance ?? saldo;
      const anchorDate = correction?.correction_date
        ?? settings?.starting_balance_date
        ?? null; // D, 'YYYY-MM-DD'
      const anchorTs = correction
        ? new Date(correction.created_at).getTime()
        : settings?.starting_balance_at
          ? new Date(settings.starting_balance_at).getTime()
          : anchorDate
            ? new Date(anchorDate + 'T00:00:00').getTime()
            : 0;
      // Local calendar day of T
      const anchorSaveDay = (() => {
        const d = new Date(anchorTs);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      })();

      const countsPaidItem = (paidAt: string, periodDate: string): boolean => {
        if (anchorDate === null) return true;
        if (new Date(paidAt).getTime() >= anchorTs) return true;
        return periodDate >= anchorDate && periodDate < anchorSaveDay;
      };

      const allIncome = [...windowEntries, ...pastIncome];
      const paidIncomeSince = allIncome
        .filter((e) => e.paid_at !== null && countsPaidItem(e.paid_at as string, e.expected_date))
        .reduce((s, e) => s + e.amount, 0);
      setPaidIncomeSinceStart(paidIncomeSince);

      const expenseById = new Map(allExpenses.map((e) => [e.id, e]));
      const paidExpensesSince = expPaymentList
        .filter((p) => {
          const exp = expenseById.get(p.expense_id);
          if (!exp) return false;
          // Instance due date = due day of the expense within the paid month
          const dueDay      = exp.due_date ? Number(exp.due_date.slice(8, 10)) : 1;
          const daysInMonth = new Date(p.year, p.month, 0).getDate();
          const instanceDate =
            `${p.year}-${String(p.month).padStart(2, '0')}-${String(Math.min(dueDay, daysInMonth)).padStart(2, '0')}`;
          return countsPaidItem(p.paid_at, instanceDate);
        })
        .reduce((s, p) => s + (expenseById.get(p.expense_id)?.amount ?? 0), 0);
      setPaidExpensesSinceStart(paidExpensesSince);

      // Current cash position — anchors the current month's projection
      const tagessaldoBase = anchorBalance + paidIncomeSince - paidExpensesSince;

      // Actual balance lookup: "YYYY-MM" → { id, balance }
      const actualMap: Record<string, { id: string; balance: number }> = {};
      for (const ab of actualBalList) {
        const key = `${ab.year}-${String(ab.month).padStart(2, '0')}`;
        actualMap[key] = { id: ab.id, balance: ab.balance };
      }

      // ---- Past months (review) --------------------------------------------
      // Contiguous range from the earliest month with data up to the month
      // before the current one, capped at 24 months back.

      const dataMonths: Date[] = [
        ...pastIncome.map((e) => {
          const d = new Date(e.expected_date + 'T00:00:00');
          return new Date(d.getFullYear(), d.getMonth(), 1);
        }),
        ...actualBalList.map((ab) => new Date(ab.year, ab.month - 1, 1)),
        ...expPaymentList.map((p) => new Date(p.year, p.month - 1, 1)),
      ].filter((d) => d < windowStart);

      const earliest = dataMonths.length > 0
        ? dataMonths.reduce((min, d) => (d < min ? d : min))
        : null;

      const capDate = new Date(today.getFullYear(), today.getMonth() - 24, 1);
      const rangeStart = earliest !== null && earliest < capDate ? capDate : earliest;

      const pastBuckets: MonthBucket[] = [];
      const lateExpenses: LateExpenseInstance[] = [];
      if (rangeStart !== null) {
        const nPast =
          (windowStart.getFullYear() - rangeStart.getFullYear()) * 12 +
          (windowStart.getMonth() - rangeStart.getMonth());

        for (let i = nPast; i >= 1; i--) {
          const d     = new Date(today.getFullYear(), today.getMonth() - i, 1);
          const year  = d.getFullYear();
          const month = d.getMonth();
          const key   = `${year}-${String(month + 1).padStart(2, '0')}`;
          const monthKey1 = String(month + 1).padStart(2, '0');

          const unpaid = pastIncome.filter((e) => e.expected_date.startsWith(key) && !e.paid_at);
          const paid   = pastIncome.filter((e) => e.expected_date.startsWith(key) &&  e.paid_at);

          // Applicable expenses — plus expenses with a recorded payment for
          // this month even if they no longer apply (e.g. deactivated since)
          const monthExpenses = allExpenses.filter(
            (e) => expenseAppliesTo(e, year, month) || !!expPaymentMap[`${e.id}:${year}-${monthKey1}`],
          );
          const paidExpenseMap: Record<string, string> = {};
          const paidExpenseAtMap: Record<string, string> = {};
          for (const e of monthExpenses) {
            const pKey = `${e.id}:${year}-${monthKey1}`;
            if (expPaymentMap[pKey]) {
              paidExpenseMap[e.id]   = expPaymentMap[pKey];
              paidExpenseAtMap[e.id] = expPaymentAtMap[pKey];
            }
          }

          const abEntry = actualMap[key] ?? null;

          pastBuckets.push({
            year,
            month,
            label:           `${MONTH_LABELS_DE[month]} ${year}`,
            entries:         unpaid,
            paidEntries:     paid,
            lateEntries:     [],
            lateExpenses:    [],
            expenses:        monthExpenses,
            paidExpenseMap,
            paidExpenseAtMap,
            projectedBalance: 0, // filled by the backward chain below
            actualBalance:   abEntry?.balance ?? null,
            actualBalanceId: abEntry?.id      ?? null,
          });
        }

        // Unpaid past expense instances carry over into the current month
        for (const b of pastBuckets) {
          for (const e of b.expenses) {
            if (!b.paidExpenseMap[e.id]) {
              lateExpenses.push({ expense: e, year: b.year, month: b.month + 1 });
            }
          }
        }

        // Balance chains, anchored at the Startsaldo date's month.
        //   • Months from the anchor month up to the current one are filled
        //     FORWARD using paid-only nets (actual cash movement; unpaid items
        //     carry into the current month as überfällig and count there).
        //   • Months before the anchor month are filled BACKWARD using
        //     expected nets. Ist-Saldi override the chain where present.
        const expectedNetOf = (b: MonthBucket) => {
          const inc = [...b.entries, ...b.paidEntries].reduce((s, e) => s + e.amount, 0);
          const exp = b.expenses.reduce((s, e) => s + e.amount, 0);
          return inc - exp;
        };
        const paidNetOf = (b: MonthBucket) => {
          const inc = b.paidEntries.reduce((s, e) => s + e.amount, 0);
          const exp = b.expenses.filter((e) => b.paidExpenseMap[e.id]).reduce((s, e) => s + e.amount, 0);
          return inc - exp;
        };

        const anchorMonthStart = anchorDate !== null
          ? new Date(
              new Date(anchorDate + 'T00:00:00').getFullYear(),
              new Date(anchorDate + 'T00:00:00').getMonth(),
              1,
            )
          : windowStart;

        let pivot = pastBuckets.length; // anchor in/after the current month
        if (anchorMonthStart < windowStart) {
          const found = pastBuckets.findIndex(
            (b) => b.year === anchorMonthStart.getFullYear() && b.month === anchorMonthStart.getMonth(),
          );
          // Anchor older than the review range → forward-fill everything
          pivot = found >= 0 ? found : 0;
        }

        // Forward from the anchor month (display only — the current-month
        // projection is anchored at the Tagessaldo base, not at this chain)
        let carry = saldo;
        for (let j = pivot; j < pastBuckets.length; j++) {
          const b = pastBuckets[j];
          b.projectedBalance = carry + paidNetOf(b);
          carry = b.actualBalance ?? b.projectedBalance;
        }

        // Backward for months before the anchor month
        let back = saldo;
        for (let j = pivot - 1; j >= 0; j--) {
          const b = pastBuckets[j];
          b.projectedBalance = back;
          back = (b.actualBalance ?? back) - expectedNetOf(b);
        }
      }

      // ---- Current + next 11 months ------------------------------------------
      // Chain: bucket 0 starts at the Tagessaldo base (anchor + paid since),
      // every month adds only its outstanding (unpaid) amounts.
      let runningBalance = tagessaldoBase;

      const buckets: MonthBucket[] = Array.from({ length: 12 }, (_, i) => {
        const d     = new Date(today.getFullYear(), today.getMonth() + i, 1);
        const year  = d.getFullYear();
        const month = d.getMonth(); // 0-indexed
        const key   = `${year}-${String(month + 1).padStart(2, '0')}`;

        // Split window entries into unpaid / paid for this month
        const unpaid     = windowEntries.filter((e) => e.expected_date.startsWith(key) && !e.paid_at);
        const paid       = windowEntries.filter((e) => e.expected_date.startsWith(key) &&  e.paid_at);
        // Late income & expenses only in the first (current) bucket
        const late       = i === 0 ? lateEntries  : [];
        const lateExp    = i === 0 ? lateExpenses : [];

        const monthExpenses = allExpenses.filter((e) => expenseAppliesTo(e, year, month));

        // Build paidExpenseMap for this month: expenseId → paymentId
        const monthKey1 = String(month + 1).padStart(2, '0'); // 1-indexed month string
        const paidExpenseMap: Record<string, string> = {};
        const paidExpenseAtMap: Record<string, string> = {};
        for (const e of monthExpenses) {
          const pKey = `${e.id}:${year}-${monthKey1}`;
          if (expPaymentMap[pKey]) {
            paidExpenseMap[e.id]   = expPaymentMap[pKey];
            paidExpenseAtMap[e.id] = expPaymentAtMap[pKey];
          }
        }

        // Only UNPAID amounts enter the projection. Every paid item — past,
        // current or prepaid future — is already inside tagessaldoBase
        // (either in the anchor snapshot or in the paid-since components);
        // adding it to a month again would double-count it.
        const unpaidIncome = [...unpaid, ...late].reduce((s, e) => s + e.amount, 0);
        const unpaidExpenseSum =
          monthExpenses.filter((e) => !paidExpenseMap[e.id]).reduce((s, e) => s + e.amount, 0) +
          lateExp.reduce((s, le) => s + le.expense.amount, 0);
        const projectedBalance =
          (i === 0 ? tagessaldoBase : runningBalance) + unpaidIncome - unpaidExpenseSum;

        const abEntry = actualMap[key] ?? null;
        runningBalance = abEntry !== null ? abEntry.balance : projectedBalance;

        return {
          year,
          month,
          label:           `${MONTH_LABELS_DE[month]} ${year}`,
          entries:         unpaid,
          paidEntries:     paid,
          lateEntries:     late,
          lateExpenses:    lateExp,
          expenses:        monthExpenses,
          paidExpenseMap,
          paidExpenseAtMap,
          projectedBalance,
          actualBalance:   abEntry?.balance  ?? null,
          actualBalanceId: abEntry?.id       ?? null,
        };
      });

      setMonths(buckets);
      setPastMonths(pastBuckets);
      setExpenses(allExpenses);
      setLoading(false);
    }

    load();
  }, [tick]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Income ---------------------------------------------------------------

  const addIncome = useCallback(async (data: {
    description: string;
    amount: number;
    currency: string;
    expected_date: string;
    notes?: string | null;
  }): Promise<boolean> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return false;

    const { error } = await supabase
      .from('noa_liquidity_income' as never)
      .insert({
        user_id:       session.user.id,
        description:   data.description,
        amount:        data.amount,
        currency:      data.currency,
        expected_date: data.expected_date,
        notes:         data.notes ?? null,
      } as never);

    if (error) { toast({ title: 'Fehler', description: error.message, variant: 'error' }); return false; }
    toast({ title: 'Einnahme hinzugefügt', variant: 'success' });
    refetch();
    return true;
  }, [toast, refetch]);

  const updateIncome = useCallback(async (id: string, data: {
    description: string;
    amount: number;
    currency: string;
    expected_date: string;
    notes?: string | null;
  }): Promise<boolean> => {
    const { error } = await supabase
      .from('noa_liquidity_income' as never)
      .update({
        description:   data.description,
        amount:        data.amount,
        currency:      data.currency,
        expected_date: data.expected_date,
        notes:         data.notes ?? null,
        updated_at:    new Date().toISOString(),
      } as never)
      .eq('id', id);

    if (error) { toast({ title: 'Fehler', description: error.message, variant: 'error' }); return false; }
    toast({ title: 'Einnahme aktualisiert', variant: 'success' });
    refetch();
    return true;
  }, [toast, refetch]);

  const deleteIncome = useCallback(async (id: string): Promise<boolean> => {
    const { error } = await supabase
      .from('noa_liquidity_income' as never)
      .delete()
      .eq('id', id);

    if (error) { toast({ title: 'Fehler', description: error.message, variant: 'error' }); return false; }
    toast({ title: 'Einnahme gelöscht', variant: 'success' });
    refetch();
    return true;
  }, [toast, refetch]);

  const markIncomePaid = useCallback(async (id: string): Promise<boolean> => {
    const { error } = await supabase
      .from('noa_liquidity_income' as never)
      .update({ paid_at: new Date().toISOString(), updated_at: new Date().toISOString() } as never)
      .eq('id', id);

    if (error) { toast({ title: 'Fehler', description: error.message, variant: 'error' }); return false; }
    toast({ title: 'Als bezahlt markiert', variant: 'success' });
    refetch();
    return true;
  }, [toast, refetch]);

  const markIncomeUnpaid = useCallback(async (id: string): Promise<boolean> => {
    const { error } = await supabase
      .from('noa_liquidity_income' as never)
      .update({ paid_at: null, updated_at: new Date().toISOString() } as never)
      .eq('id', id);

    if (error) { toast({ title: 'Fehler', description: error.message, variant: 'error' }); return false; }
    refetch();
    return true;
  }, [toast, refetch]);

  // ---- Expenses -------------------------------------------------------------

  const addExpense = useCallback(async (data: {
    description: string;
    amount: number;
    currency: string;
    type: LiquidityExpenseType;
    due_date: string;
  }): Promise<boolean> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return false;

    const { error } = await supabase
      .from('noa_liquidity_expenses' as never)
      .insert({
        user_id:     session.user.id,
        description: data.description,
        amount:      data.amount,
        currency:    data.currency,
        type:        data.type,
        due_date:    data.due_date,
        active:      true,
      } as never);

    if (error) { toast({ title: 'Fehler', description: error.message, variant: 'error' }); return false; }
    toast({ title: 'Ausgabe hinzugefügt', variant: 'success' });
    refetch();
    return true;
  }, [toast, refetch]);

  const deleteExpense = useCallback(async (id: string): Promise<boolean> => {
    const { error } = await supabase
      .from('noa_liquidity_expenses' as never)
      .delete()
      .eq('id', id);

    if (error) { toast({ title: 'Fehler', description: error.message, variant: 'error' }); return false; }
    toast({ title: 'Ausgabe gelöscht', variant: 'success' });
    refetch();
    return true;
  }, [toast, refetch]);

  const toggleExpenseActive = useCallback(async (id: string, active: boolean): Promise<boolean> => {
    const { error } = await supabase
      .from('noa_liquidity_expenses' as never)
      .update({ active } as never)
      .eq('id', id);

    if (error) { toast({ title: 'Fehler', description: error.message, variant: 'error' }); return false; }
    refetch();
    return true;
  }, [toast, refetch]);

  const updateExpense = useCallback(async (id: string, data: {
    description: string;
    amount: number;
    currency: string;
    type: LiquidityExpenseType;
    due_date: string;
  }): Promise<boolean> => {
    const { error } = await supabase
      .from('noa_liquidity_expenses' as never)
      .update({
        description: data.description,
        amount:      data.amount,
        currency:    data.currency,
        type:        data.type,
        due_date:    data.due_date,
        updated_at:  new Date().toISOString(),
      } as never)
      .eq('id', id);

    if (error) { toast({ title: 'Fehler', description: error.message, variant: 'error' }); return false; }
    toast({ title: 'Ausgabe aktualisiert', variant: 'success' });
    refetch();
    return true;
  }, [toast, refetch]);

  const markExpensePaid = useCallback(async (expenseId: string, year: number, month: number): Promise<boolean> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return false;

    const { error } = await supabase
      .from('noa_liquidity_expense_payments' as never)
      .upsert({
        user_id:    session.user.id,
        expense_id: expenseId,
        year,
        month,
        paid_at:    new Date().toISOString(),
      } as never, { onConflict: 'user_id,expense_id,year,month' } as never);

    if (error) { toast({ title: 'Fehler', description: error.message, variant: 'error' }); return false; }
    toast({ title: 'Ausgabe als bezahlt markiert', variant: 'success' });
    refetch();
    return true;
  }, [toast, refetch]);

  const markExpenseUnpaid = useCallback(async (paymentId: string): Promise<boolean> => {
    const { error } = await supabase
      .from('noa_liquidity_expense_payments' as never)
      .delete()
      .eq('id', paymentId);

    if (error) { toast({ title: 'Fehler', description: error.message, variant: 'error' }); return false; }
    refetch();
    return true;
  }, [toast, refetch]);

  // ---- Startsaldo -----------------------------------------------------------

  const upsertStartsaldo = useCallback(async (amount: number, currency: string, date: string): Promise<boolean> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return false;

    const { error } = await supabase
      .from('noa_liquidity_settings' as never)
      .upsert({
        user_id:               session.user.id,
        starting_balance:      amount,
        currency,
        starting_balance_date: date,
        starting_balance_at:   new Date().toISOString(),
        updated_at:            new Date().toISOString(),
      } as never, { onConflict: 'user_id' } as never);

    if (error) { toast({ title: 'Fehler', description: error.message, variant: 'error' }); return false; }
    toast({ title: 'Startsaldo gespeichert', variant: 'success' });
    refetch();
    return true;
  }, [toast, refetch]);

  // ---- Effektiver Konto-Saldo -------------------------------------------------

  const upsertEffectiveBalance = useCallback(async (amount: number): Promise<boolean> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return false;

    const today = new Date().toISOString().slice(0, 10);

    const { data, error } = await supabase
      .from('noa_liquidity_settings' as never)
      .update({
        effective_balance:      amount,
        effective_balance_date: today,
        updated_at:             new Date().toISOString(),
      } as never)
      .eq('user_id', session.user.id)
      .select('id');

    if (error) { toast({ title: 'Fehler', description: error.message, variant: 'error' }); return false; }

    // No settings row yet — create one with default Startsaldo 0
    if (!data || data.length === 0) {
      const { error: insErr } = await supabase
        .from('noa_liquidity_settings' as never)
        .insert({
          user_id:                session.user.id,
          starting_balance:       0,
          starting_balance_date:  today,
          effective_balance:      amount,
          effective_balance_date: today,
        } as never);
      if (insErr) { toast({ title: 'Fehler', description: insErr.message, variant: 'error' }); return false; }
    }

    toast({ title: 'Konto-Saldo gespeichert', variant: 'success' });
    refetch();
    return true;
  }, [toast, refetch]);

  const clearEffectiveBalance = useCallback(async (): Promise<boolean> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return false;

    const { error } = await supabase
      .from('noa_liquidity_settings' as never)
      .update({
        effective_balance:      null,
        effective_balance_date: null,
        updated_at:             new Date().toISOString(),
      } as never)
      .eq('user_id', session.user.id);

    if (error) { toast({ title: 'Fehler', description: error.message, variant: 'error' }); return false; }
    refetch();
    return true;
  }, [toast, refetch]);

  const acceptEffectiveBalance = useCallback(async (
    balance: number,
    currency: string,
  ): Promise<boolean> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return false;

    const today = new Date();
    const correctionDate =
      `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    // Final Saldokorrektur — the Startsaldo stays untouched
    const { error } = await supabase
      .from('noa_liquidity_balance_corrections' as never)
      .upsert({
        user_id:         session.user.id,
        correction_date: correctionDate,
        balance,
        currency,
        created_at:      new Date().toISOString(),
      } as never, { onConflict: 'user_id,correction_date' } as never);

    if (error) { toast({ title: 'Fehler', description: error.message, variant: 'error' }); return false; }

    // Clear the reconciliation entry
    const { error: clearErr } = await supabase
      .from('noa_liquidity_settings' as never)
      .update({
        effective_balance:      null,
        effective_balance_date: null,
        updated_at:             new Date().toISOString(),
      } as never)
      .eq('user_id', session.user.id);

    if (clearErr) { toast({ title: 'Fehler', description: clearErr.message, variant: 'error' }); return false; }

    toast({
      title: 'Saldokorrektur erfasst',
      description: `Kontostand ${balance.toLocaleString('de-CH')} ${currency} per heute ist neu der Anker. Ältere Einträge sind fixiert.`,
      variant: 'success',
    });
    refetch();
    return true;
  }, [toast, refetch]);

  // ---- Ist-Saldo ------------------------------------------------------------

  const upsertActualBalance = useCallback(async (
    year: number,
    month: number,
    balance: number,
    currency: string,
  ): Promise<boolean> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return false;

    const { error } = await supabase
      .from('noa_liquidity_actual_balances' as never)
      .upsert({
        user_id:    session.user.id,
        year,
        month,
        balance,
        currency,
        updated_at: new Date().toISOString(),
      } as never, { onConflict: 'user_id,year,month' } as never);

    if (error) { toast({ title: 'Fehler', description: error.message, variant: 'error' }); return false; }
    refetch();
    return true;
  }, [toast, refetch]);

  const deleteActualBalance = useCallback(async (id: string): Promise<boolean> => {
    const { error } = await supabase
      .from('noa_liquidity_actual_balances' as never)
      .delete()
      .eq('id', id);

    if (error) { toast({ title: 'Fehler', description: error.message, variant: 'error' }); return false; }
    refetch();
    return true;
  }, [toast, refetch]);

  // ---------------------------------------------------------------------------

  return {
    months,
    pastMonths,
    expenses,
    startsaldo,
    startsaldoCurrency,
    startsaldoDate,
    paidIncomeSinceStart,
    paidExpensesSinceStart,
    effectiveBalance,
    effectiveBalanceDate,
    lastCorrection,
    lockDate: lastCorrection?.correction_date ?? null,
    lockTs:   lastCorrection ? new Date(lastCorrection.created_at).getTime() : null,
    loading,
    addIncome,
    updateIncome,
    deleteIncome,
    markIncomePaid,
    markIncomeUnpaid,
    addExpense,
    updateExpense,
    deleteExpense,
    toggleExpenseActive,
    markExpensePaid,
    markExpenseUnpaid,
    upsertStartsaldo,
    upsertEffectiveBalance,
    clearEffectiveBalance,
    acceptEffectiveBalance,
    upsertActualBalance,
    deleteActualBalance,
    refetch,
  };
}
