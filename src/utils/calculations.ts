import { type Account, type Transaction } from '../services/ynab';
import { subDays, isAfter, parseISO, startOfDay, format, subMonths } from 'date-fns';

export interface DashboardMetrics {
    totalNetWorth: number;
    dailyNetIncome: number;
    daysOfBuffer: number;
    monthlySpend: number;
    totalIncome: number;
}

/**
 * Flattens YNAB transactions, expanding split transactions into multiple entries.
 * This is crucial for accurate category/payee analysis.
 */
export const flattenTransactions = (transactions: Transaction[]): Transaction[] => {
    const flattened: Transaction[] = [];
    for (const t of transactions) {
        if (t.deleted) continue;

        if (t.subtransactions && t.subtransactions.length > 0) {
            for (const st of t.subtransactions) {
                if (st.deleted) continue;
                flattened.push({
                    ...t,
                    id: st.id, // Use subtransaction ID
                    amount: st.amount,
                    memo: st.memo || t.memo,
                    payee_id: st.payee_id || t.payee_id,
                    payee_name: st.payee_name || t.payee_name,
                    category_id: st.category_id,
                    category_name: st.category_name,
                    transfer_account_id: st.transfer_account_id,
                    transfer_transaction_id: st.transfer_transaction_id,
                    subtransactions: [], // Prevent recursion
                });
            }
        } else {
            flattened.push(t);
        }
    }
    return flattened;
};

// ----------------------------------------------------
// CORE FILTERS for YNAB accuracy
// ----------------------------------------------------
const isTransfer = (t: Transaction) => !!t.transfer_account_id;

const isStartingBalance = (t: Transaction) =>
    !!t.payee_name?.includes('Starting Balance') ||
    !!t.payee_name?.includes('Manual Balance Adjustment');

const isIncomeCategory = (t: Transaction) =>
    t.category_name === 'Inflow: Ready to Assign' ||
    t.category_name === 'To be Budgeted';

// Valid Income = Positive amount + Inflow Category + Not a Transfer + Not Starting Balance
const tsIsIncome = (t: Transaction) =>
    t.amount > 0 && !isTransfer(t) && isIncomeCategory(t) && !isStartingBalance(t);

// Valid Expense Transaction (could be positive if reimbursement, but must not be inflow/transfer/start)
const tsIsValidExpenseTx = (t: Transaction) =>
    !isTransfer(t) && !isIncomeCategory(t) && !isStartingBalance(t);

// ----------------------------------------------------
// CALCULATIONS
// ----------------------------------------------------
export const calculateMetrics = (
    accounts: Account[],
    transactions: Transaction[]
): DashboardMetrics => {
    // 1. Net Worth: Sum of all non-closed accounts
    const totalNetWorth = accounts
        .filter((a) => !a.closed)
        .reduce((sum, a) => sum + a.balance, 0) / 1000;

    // 2. Daily Net Income (last 30 days)
    const thirtyDaysAgo = subDays(new Date(), 30);
    const recentTransactions = transactions.filter(
        (t) => !t.deleted && isAfter(parseISO(t.date), thirtyDaysAgo)
    );

    const totalIncome = recentTransactions
        .filter(tsIsIncome)
        .reduce((sum, t) => sum + t.amount, 0) / 1000;

    // Net expense over 30 days (summing negative and positive reimbursements)
    const netExpenseSum = recentTransactions
        .filter(tsIsValidExpenseTx)
        .reduce((sum, t) => sum + t.amount, 0) / 1000;

    // Convert to positive number assuming it's an outflow
    const totalExpense = netExpenseSum < 0 ? Math.abs(netExpenseSum) : 0;

    const dailyNetIncome = (totalIncome - totalExpense) / 30;

    // 3. Days of Buffer
    // Total Cash Assets / Average Daily Spend
    const cashAssets = accounts
        .filter((a) => !a.closed && (a.type === 'checking' || a.type === 'savings' || a.type === 'cash'))
        .reduce((sum, a) => sum + a.balance, 0) / 1000;

    const dailySpend = totalExpense / 30;
    const daysOfBuffer = dailySpend > 0 ? cashAssets / dailySpend : 0;

    return {
        totalNetWorth,
        dailyNetIncome,
        daysOfBuffer,
        monthlySpend: totalExpense,
        totalIncome,
    };
};

export const formatCurrency = (amount: number, isPrivacyMode: boolean = false) => {
    if (isPrivacyMode) return '****';
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    }).format(amount);
};

// -- CHART DATA PREPARATION --

export const generateNetWorthHistory = (
    accounts: Account[],
    transactions: Transaction[],
    days: number = 90
) => {
    // To get history, we start from current balances and work backwards using transactions
    const currentBalances = accounts.reduce((acc, a) => {
        acc[a.id] = a.balance / 1000;
        return acc;
    }, {} as Record<string, number>);

    let currentNetWorth = Object.values(currentBalances).reduce((a, b) => a + b, 0);

    const sortedTx = [...transactions]
        .filter(t => !t.deleted && t.amount !== 0)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const data = [];
    let txIndex = 0;

    // Create an array of the last N days
    const today = startOfDay(new Date());

    for (let i = 0; i <= days; i++) {
        const targetDate = subDays(today, i);
        const dateStr = format(targetDate, 'yyyy-MM-dd');

        while (txIndex < sortedTx.length && sortedTx[txIndex].date >= dateStr) {
            if (sortedTx[txIndex].date === dateStr) {
                // If the transaction happened via an account we care about
                // To accurately reverse, we just subtract the amount that affected the net worth today to get yesterday's.
                // Note: Inter-account transfers represent $0 sum here assuming both are tracked
                currentNetWorth -= (sortedTx[txIndex].amount / 1000);
            }
            txIndex++;
        }

        data.unshift({
            date: format(targetDate, 'MMM dd'),
            netWorth: Math.round(currentNetWorth),
        });
    }

    return data;
};

export const generateIncomeVsExpense = (transactions: Transaction[], months: number = 6) => {
    const data = [];
    for (let i = months - 1; i >= 0; i--) {
        const targetMonth = subMonths(new Date(), i);
        const monthStr = format(targetMonth, 'yyyy-MM');

        const monthTxs = transactions.filter(t => !t.deleted && t.date.startsWith(monthStr));

        const income = monthTxs.filter(tsIsIncome).reduce((s, t) => s + t.amount, 0) / 1000;

        const netExpenseSum = monthTxs.filter(tsIsValidExpenseTx).reduce((s, t) => s + t.amount, 0) / 1000;
        const expense = netExpenseSum < 0 ? Math.abs(netExpenseSum) : 0;

        data.push({
            month: format(targetMonth, 'MMM yyyy'),
            Income: Math.round(income),
            Expense: Math.round(expense)
        });
    }
    return data;
};

export const generateSpendByCategory = (transactions: Transaction[], days: number = 30) => {
    const targetDate = subDays(new Date(), days);
    const recentTx = transactions.filter(t =>
        !t.deleted && tsIsValidExpenseTx(t) && isAfter(parseISO(t.date), targetDate)
    );

    const categoryNetTotals: Record<string, number> = {};
    recentTx.forEach(t => {
        const name = t.category_name || 'Uncategorized';
        if (!categoryNetTotals[name]) categoryNetTotals[name] = 0;
        categoryNetTotals[name] += (t.amount / 1000);
    });

    // We only care about categories where the net total is a true OUTFLOW (< 0)
    const sorted = Object.entries(categoryNetTotals)
        .filter(([_, val]) => val < 0)
        .map(([name, val]) => [name, Math.abs(val)] as [string, number])
        .sort((a, b) => b[1] - a[1]);

    const top = sorted.slice(0, 5);
    const other = sorted.slice(5).reduce((sum, [_, val]) => sum + val, 0);

    const data = top.map(([name, value]) => ({ name, value: Math.round(value) }));
    if (other > 0) data.push({ name: 'Other', value: Math.round(other) });

    return data;
};

export const generateSpendByDayOfWeek = (transactions: Transaction[], days: number = 90) => {
    const targetDate = subDays(new Date(), days);
    const recentTx = transactions.filter(t =>
        !t.deleted && tsIsValidExpenseTx(t) && isAfter(parseISO(t.date), targetDate)
    );

    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    // We aggregate the NET amount for each day 
    const dayTotals = [0, 0, 0, 0, 0, 0, 0];

    recentTx.forEach(t => {
        const date = parseISO(t.date);
        dayTotals[date.getDay()] += (t.amount / 1000);
    });

    return daysOfWeek.map((day, i) => {
        const netAmount = dayTotals[i];
        // If net amount is negative (outflow), convert to positive for chart display
        return {
            day,
            amount: netAmount < 0 ? Math.round(Math.abs(netAmount)) : 0
        };
    });
};

export const generateTopPayees = (transactions: Transaction[], days: number = 30) => {
    const targetDate = subDays(new Date(), days);

    // For payees, we typically only care about individual outflow transactions, 
    // but to be mathematically correct, we aggregate net spend by payee.
    const recentTx = transactions.filter(t =>
        !t.deleted && tsIsValidExpenseTx(t) && isAfter(parseISO(t.date), targetDate)
    );

    const payeeNetTotals: Record<string, number> = {};
    recentTx.forEach(t => {
        const name = t.payee_name || 'Unknown';
        if (!payeeNetTotals[name]) payeeNetTotals[name] = 0;
        payeeNetTotals[name] += (t.amount / 1000);
    });

    // Only keep payees where net amount is negative (true outflow)
    return Object.entries(payeeNetTotals)
        .filter(([_, amount]) => amount < 0)
        .map(([payee, amount]) => [payee, Math.abs(amount)] as [string, number])
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([payee, amount]) => ({
            payee,
            amount: Math.round(amount)
        }));
};
