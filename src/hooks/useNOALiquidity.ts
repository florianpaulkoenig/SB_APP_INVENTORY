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
  LiquidityExpenseType,
} from '../types/database';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

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
  expenses: NOALiquidityExpenseRow[];
  /**
   * Map from expense_id → payment_id for expenses paid in this month.
   * If expense_id is a key, the expense instance for this month is paid.
   */
  paidExpenseMap: Record<string, string>;
  /** Running projected balance at end of this month */
  projectedBalance: number;
  /** User-entered actual account balance (null if not set) */
  actualBalance: number | null;
  actualBalanceId: string | null;
}

export interface UseNOALiquidityReturn {
  months: MonthBucket[];
  expenses: NOALiquidityExpenseRow[];
  startsaldo: number;
  startsaldoCurrency: string;
  /** User-entered real bank balance (null if none recorded) */
  effectiveBalance: number | null;
  effectiveBalanceDate: string | null;
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
  upsertStartsaldo: (amount: number, currency: string) => Promise<boolean>;
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
  const [months, setMonths]     = useState<MonthBucket[]>([]);
  const [expenses, setExpenses] = useState<NOALiquidityExpenseRow[]>([]);
  const [startsaldo, setStartsaldo]                 = useState(0);
  const [startsaldoCurrency, setStartsaldoCurrency] = useState('CHF');
  const [effectiveBalance, setEffectiveBalance]         = useState<number | null>(null);
  const [effectiveBalanceDate, setEffectiveBalanceDate] = useState<string | null>(null);
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

      const windowStartYear  = windowStart.getFullYear();
      const windowStartMonth = windowStart.getMonth() + 1; // 1-indexed
      const windowEndYear    = new Date(today.getFullYear(), today.getMonth() + 12, 0).getFullYear();
      const windowEndMonth   = new Date(today.getFullYear(), today.getMonth() + 12, 0).getMonth() + 1;

      const [incomeRes, lateRes, expensesRes, settingsRes, actualBalancesRes, expPaymentsRes] = await Promise.all([
        // Income within the 12-month window (paid or unpaid)
        supabase
          .from('noa_liquidity_income' as never)
          .select('*')
          .gte('expected_date', wsStr)
          .lte('expected_date', weStr)
          .order('expected_date', { ascending: true }),

        // Overdue unpaid income from BEFORE the window
        supabase
          .from('noa_liquidity_income' as never)
          .select('*')
          .lt('expected_date', wsStr)
          .is('paid_at', null)
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

        // Expense payments within the 12-month window
        supabase
          .from('noa_liquidity_expense_payments' as never)
          .select('*')
          .or(
            `and(year.eq.${windowStartYear},month.gte.${windowStartMonth}),` +
            `and(year.gt.${windowStartYear},year.lt.${windowEndYear}),` +
            `and(year.eq.${windowEndYear},month.lte.${windowEndMonth})`
          ),
      ]);

      if (incomeRes.error) {
        toast({ title: 'Fehler', description: incomeRes.error.message, variant: 'error' });
        setLoading(false);
        return;
      }

      const windowEntries  = (incomeRes.data       ?? []) as NOALiquidityIncomeRow[];
      const lateEntries    = (lateRes.data          ?? []) as NOALiquidityIncomeRow[];
      const allExpenses    = (expensesRes.data      ?? []) as NOALiquidityExpenseRow[];
      const settings       = settingsRes.data             as NOALiquiditySettingsRow | null;
      const actualBalList  = (actualBalancesRes.data ?? []) as NOALiquidityActualBalanceRow[];
      const expPaymentList = (expPaymentsRes.data   ?? []) as NOALiquidityExpensePaymentRow[];

      // Expense payment lookup: "expenseId:year-MM" → payment_id
      const expPaymentMap: Record<string, string> = {};
      for (const p of expPaymentList) {
        const key = `${p.expense_id}:${p.year}-${String(p.month).padStart(2, '0')}`;
        expPaymentMap[key] = p.id;
      }

      const saldo    = settings?.starting_balance ?? 0;
      const currency = settings?.currency         ?? 'CHF';
      setStartsaldo(saldo);
      setStartsaldoCurrency(currency);
      setEffectiveBalance(settings?.effective_balance ?? null);
      setEffectiveBalanceDate(settings?.effective_balance_date ?? null);

      // Actual balance lookup: "YYYY-MM" → { id, balance }
      const actualMap: Record<string, { id: string; balance: number }> = {};
      for (const ab of actualBalList) {
        const key = `${ab.year}-${String(ab.month).padStart(2, '0')}`;
        actualMap[key] = { id: ab.id, balance: ab.balance };
      }

      // Build 12 monthly buckets
      let runningBalance = saldo;

      const buckets: MonthBucket[] = Array.from({ length: 12 }, (_, i) => {
        const d     = new Date(today.getFullYear(), today.getMonth() + i, 1);
        const year  = d.getFullYear();
        const month = d.getMonth(); // 0-indexed
        const key   = `${year}-${String(month + 1).padStart(2, '0')}`;

        // Split window entries into unpaid / paid for this month
        const unpaid     = windowEntries.filter((e) => e.expected_date.startsWith(key) && !e.paid_at);
        const paid       = windowEntries.filter((e) => e.expected_date.startsWith(key) &&  e.paid_at);
        // Late entries only in the first (current) bucket
        const late       = i === 0 ? lateEntries : [];

        const monthExpenses = allExpenses.filter((e) => expenseAppliesTo(e, year, month));

        // Build paidExpenseMap for this month: expenseId → paymentId
        const monthKey1 = String(month + 1).padStart(2, '0'); // 1-indexed month string
        const paidExpenseMap: Record<string, string> = {};
        for (const e of monthExpenses) {
          const pKey = `${e.id}:${year}-${monthKey1}`;
          if (expPaymentMap[pKey]) paidExpenseMap[e.id] = expPaymentMap[pKey];
        }

        // Projected income = all expected amounts for this month (including late & paid)
        const incomeSum  = [...unpaid, ...paid, ...late].reduce((s, e) => s + e.amount, 0);
        const expenseSum = monthExpenses.reduce((s, e) => s + e.amount, 0);
        const net        = incomeSum - expenseSum;

        const projectedBalance = runningBalance + net;

        const abEntry = actualMap[key] ?? null;
        runningBalance = abEntry !== null ? abEntry.balance : projectedBalance;

        return {
          year,
          month,
          label:           `${MONTH_LABELS_DE[month]} ${year}`,
          entries:         unpaid,
          paidEntries:     paid,
          lateEntries:     late,
          expenses:        monthExpenses,
          paidExpenseMap,
          projectedBalance,
          actualBalance:   abEntry?.balance  ?? null,
          actualBalanceId: abEntry?.id       ?? null,
        };
      });

      setMonths(buckets);
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

  const upsertStartsaldo = useCallback(async (amount: number, currency: string): Promise<boolean> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return false;

    const { error } = await supabase
      .from('noa_liquidity_settings' as never)
      .upsert({
        user_id:               session.user.id,
        starting_balance:      amount,
        currency,
        starting_balance_date: new Date().toISOString().slice(0, 10),
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
    newStartingBalance: number,
    currency: string,
  ): Promise<boolean> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return false;

    const { error } = await supabase
      .from('noa_liquidity_settings' as never)
      .upsert({
        user_id:                session.user.id,
        starting_balance:       newStartingBalance,
        currency,
        starting_balance_date:  new Date().toISOString().slice(0, 10),
        effective_balance:      null,
        effective_balance_date: null,
        updated_at:             new Date().toISOString(),
      } as never, { onConflict: 'user_id' } as never);

    if (error) { toast({ title: 'Fehler', description: error.message, variant: 'error' }); return false; }
    toast({ title: 'Differenz übernommen', description: 'Der Startsaldo wurde angepasst.', variant: 'success' });
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
    expenses,
    startsaldo,
    startsaldoCurrency,
    effectiveBalance,
    effectiveBalanceDate,
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
