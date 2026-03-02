import React, { useMemo, useState } from 'react';
import { useYNAB } from '../../contexts/YNABContext';
import { formatCurrency, flattenTransactions } from '../../utils/calculations';
import { format, subDays, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';
import { Copy, Check, FileText, Calendar } from 'lucide-react';

import { useFilters } from '../../contexts/FiltersContext';

interface ReviewPeriod {
    label: string;
    startDate: Date;
    endDate: Date;
}

const PERIOD_PRESETS: { label: string; getRange: () => { startDate: Date; endDate: Date } }[] = [
    { label: 'Last Month', getRange: () => ({ startDate: startOfMonth(subMonths(new Date(), 1)), endDate: endOfMonth(subMonths(new Date(), 1)) }) },
    { label: '2 Months Ago', getRange: () => ({ startDate: startOfMonth(subMonths(new Date(), 2)), endDate: endOfMonth(subMonths(new Date(), 2)) }) },
    { label: 'This Month So Far', getRange: () => ({ startDate: startOfMonth(new Date()), endDate: new Date() }) },
    { label: 'Last 7 Days', getRange: () => ({ startDate: subDays(new Date(), 7), endDate: new Date() }) },
    { label: 'Last 2 Days', getRange: () => ({ startDate: subDays(new Date(), 2), endDate: new Date() }) },
    { label: 'Last Week', getRange: () => ({ startDate: startOfWeek(subDays(new Date(), 7), { weekStartsOn: 1 }), endDate: endOfWeek(subDays(new Date(), 7), { weekStartsOn: 1 }) }) },
    { label: 'Last 30 Days', getRange: () => ({ startDate: subDays(new Date(), 30), endDate: new Date() }) },
    { label: 'Last 90 Days', getRange: () => ({ startDate: subDays(new Date(), 90), endDate: new Date() }) },
];

export const MonthInReviewView: React.FC = () => {
    const { transactions, accounts, categoryGroups, isPrivacyMode } = useYNAB();
    const { selectedAccountIds, selectedCategoryIds } = useFilters();
    const [copied, setCopied] = useState(false);
    const [showPeriodPicker, setShowPeriodPicker] = useState(false);

    // Default to last complete month
    const defaultRange = PERIOD_PRESETS[0].getRange();
    const [period, setPeriod] = useState<ReviewPeriod>({
        label: 'Last Month',
        startDate: defaultRange.startDate,
        endDate: defaultRange.endDate,
    });

    const [customStart, setCustomStart] = useState(format(period.startDate, 'yyyy-MM-dd'));
    const [customEnd, setCustomEnd] = useState(format(period.endDate, 'yyyy-MM-dd'));

    const selectPreset = (preset: typeof PERIOD_PRESETS[0]) => {
        const range = preset.getRange();
        setPeriod({ label: preset.label, ...range });
        setCustomStart(format(range.startDate, 'yyyy-MM-dd'));
        setCustomEnd(format(range.endDate, 'yyyy-MM-dd'));
        setShowPeriodPicker(false);
    };

    const applyCustomRange = () => {
        const s = new Date(customStart);
        const e = new Date(customEnd);
        if (!isNaN(s.getTime()) && !isNaN(e.getTime()) && s <= e) {
            setPeriod({
                label: `${format(s, 'MMM d, yyyy')} – ${format(e, 'MMM d, yyyy')}`,
                startDate: s,
                endDate: e,
            });
            setShowPeriodPicker(false);
        }
    };

    // Build category name lookup that includes ALL categories (including hidden/deleted)
    const catNameMap = useMemo(() => {
        const map = new Map<string, { name: string; groupName: string }>();
        for (const g of categoryGroups) {
            for (const c of g.categories) {
                map.set(c.id, { name: c.name, groupName: g.name });
            }
        }
        return map;
    }, [categoryGroups]);

    // Build account name lookup
    const accountNameMap = useMemo(() => {
        const map = new Map<string, string>();
        for (const a of accounts) map.set(a.id, a.name);
        return map;
    }, [accounts]);

    const review = useMemo(() => {
        const start = period.startDate;
        const end = period.endDate;
        const periodLabel = period.label;
        const accSet = new Set(selectedAccountIds);
        const catSet = new Set(selectedCategoryIds);

        // Flatten splits once here since we bypass FiltersContext for specific ranges
        const allTransactions = flattenTransactions(transactions);

        // Comparison period (same duration, immediately before)
        const durationMs = end.getTime() - start.getTime();
        const prevEnd = new Date(start.getTime() - 1);
        const prevStart = new Date(prevEnd.getTime() - durationMs);

        const inRange = (t: typeof allTransactions[0], s: Date, e: Date) => {
            const d = new Date(t.date);
            // Must be in date range
            if (d < s || d > e || t.deleted) return false;
            // Must match selected accounts
            if (accSet.size > 0 && !accSet.has(t.account_id)) return false;
            // Must match selected categories (allow null if filter exists, following FiltersContext logic)
            if (catSet.size > 0 && t.category_id && !catSet.has(t.category_id)) return false;

            return true;
        };

        const periodTxs = allTransactions.filter(t => inRange(t, start, end));
        const prevTxs = allTransactions.filter(t => inRange(t, prevStart, prevEnd));

        const calcTotals = (txs: typeof allTransactions) => {
            let income = 0;
            let expenses = 0;
            for (const t of txs) {
                if (t.transfer_account_id) continue;
                if (t.payee_name?.includes('Starting Balance') || t.payee_name?.includes('Manual Balance Adjustment')) continue;
                if (t.amount > 0 && (t.category_name === 'Inflow: Ready to Assign' || t.category_name === 'To be Budgeted')) {
                    income += t.amount;
                } else if (t.amount < 0) {
                    expenses += Math.abs(t.amount);
                }
            }
            return { income: income / 1000, expenses: expenses / 1000 };
        };

        const current = calcTotals(periodTxs);
        const previous = calcTotals(prevTxs);

        // ALL categories (not just top 5)
        const byCat = new Map<string, { name: string; groupName: string; spend: number; count: number }>();
        for (const t of periodTxs) {
            if (t.amount >= 0 || t.transfer_account_id || !t.category_id) continue;
            const info = catNameMap.get(t.category_id);
            const catName = info?.name || t.category_name || 'Uncategorized';
            const groupName = info?.groupName || '';
            const key = t.category_id;
            const existing = byCat.get(key) || { name: catName, groupName, spend: 0, count: 0 };
            existing.spend += Math.abs(t.amount) / 1000;
            existing.count++;
            byCat.set(key, existing);
        }
        const allCategories = [...byCat.values()].sort((a, b) => b.spend - a.spend);

        // ALL payees
        const byPayee = new Map<string, { name: string; spend: number; count: number }>();
        for (const t of periodTxs) {
            if (t.amount >= 0 || t.transfer_account_id || !t.payee_name) continue;
            const key = t.payee_name;
            const existing = byPayee.get(key) || { name: key, spend: 0, count: 0 };
            existing.spend += Math.abs(t.amount) / 1000;
            existing.count++;
            byPayee.set(key, existing);
        }
        const allPayees = [...byPayee.values()].sort((a, b) => b.spend - a.spend);

        // Net worth (current snapshot)
        const netWorth = accounts.filter(a => !a.deleted && !a.closed).reduce((s, a) => s + a.balance, 0) / 1000;

        // All non-transfer transactions for the LLM export
        const exportTxs = periodTxs
            .filter(t => !t.transfer_account_id)
            .map(t => ({
                date: t.date,
                payee: t.payee_name || '',
                category: catNameMap.get(t.category_id || '')?.name || t.category_name || 'Uncategorized',
                categoryGroup: catNameMap.get(t.category_id || '')?.groupName || '',
                account: accountNameMap.get(t.account_id) || t.account_name || '',
                amount: t.amount / 1000,
                memo: t.memo || '',
            }))
            .sort((a, b) => a.date.localeCompare(b.date));

        return {
            periodLabel,
            startLabel: format(start, 'MMM d, yyyy'),
            endLabel: format(end, 'MMM d, yyyy'),
            income: current.income,
            expenses: current.expenses,
            netSavings: current.income - current.expenses,
            savingsRate: current.income > 0 ? ((current.income - current.expenses) / current.income) * 100 : 0,
            prevIncome: previous.income,
            prevExpenses: previous.expenses,
            incomeChange: previous.income > 0 ? ((current.income - previous.income) / previous.income) * 100 : 0,
            expenseChange: previous.expenses > 0 ? ((current.expenses - previous.expenses) / previous.expenses) * 100 : 0,
            allCategories,
            allPayees,
            netWorth,
            txCount: periodTxs.filter(t => !t.transfer_account_id).length,
            exportTxs,
        };
    }, [transactions, accounts, categoryGroups, period, catNameMap, accountNameMap, selectedAccountIds, selectedCategoryIds]);

    const generateText = () => {
        const r = review;
        const lines = [
            `# Financial Review: ${r.startLabel} to ${r.endLabel}`,
            '',
            `## Summary`,
            `- Total Income: ${formatCurrency(r.income, false)}`,
            `- Total Expenses: ${formatCurrency(r.expenses, false)}`,
            `- Net Savings: ${formatCurrency(r.netSavings, false)} (${r.savingsRate.toFixed(1)}% savings rate)`,
            `- Current Net Worth: ${formatCurrency(r.netWorth, false)}`,
            `- Transaction Count: ${r.txCount}`,
            '',
            `## vs. Previous Period (same duration)`,
            `- Income: ${r.incomeChange >= 0 ? '+' : ''}${r.incomeChange.toFixed(1)}% (prev: ${formatCurrency(r.prevIncome, false)})`,
            `- Expenses: ${r.expenseChange >= 0 ? '+' : ''}${r.expenseChange.toFixed(1)}% (prev: ${formatCurrency(r.prevExpenses, false)})`,
            '',
            `## All Spending Categories (${r.allCategories.length} total)`,
            ...r.allCategories.map((c, i) => {
                const pct = r.expenses > 0 ? ((c.spend / r.expenses) * 100).toFixed(1) : '0';
                return `${i + 1}. ${c.name}${c.groupName ? ` (${c.groupName})` : ''}: ${formatCurrency(c.spend, false)} — ${c.count} transactions — ${pct}% of total spend`;
            }),
            '',
            `## All Payees (${r.allPayees.length} total)`,
            ...r.allPayees.map((p, i) => `${i + 1}. ${p.name}: ${formatCurrency(p.spend, false)} — ${p.count} transactions`),
            '',
            `## Complete Transaction Log (${r.exportTxs.length} transactions)`,
            `Date | Payee | Category | Category Group | Account | Amount | Memo`,
            `--- | --- | --- | --- | --- | --- | ---`,
            ...r.exportTxs.map(t =>
                `${t.date} | ${t.payee} | ${t.category} | ${t.categoryGroup} | ${t.account} | ${formatCurrency(t.amount, false)} | ${t.memo}`
            ),
            '',
            `---`,
            `Please analyze ALL of the above financial data comprehensively and provide:`,
            `1. Key observations about spending patterns and trends`,
            `2. Areas where spending could potentially be reduced`,
            `3. Assessment of the savings rate and financial health`,
            `4. Any concerning trends, anomalies, or positive developments`,
            `5. Specific actionable recommendations for the next period`,
            `6. Notable payee patterns or subscriptions worth reviewing`,
            `7. Category group analysis — which areas of life are consuming the most budget?`,
        ];
        return lines.join('\n');
    };

    const handleCopy = async () => {
        const text = generateText();
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            const ta = document.createElement('textarea');
            ta.value = text;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const r = review;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Header with period picker */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FileText size={22} />
                        Financial Review
                    </h2>
                    <p style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>{r.startLabel} – {r.endLabel} • {r.txCount} transactions</p>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {/* Period Picker */}
                    <div style={{ position: 'relative' }}>
                        <button
                            onClick={() => setShowPeriodPicker(!showPeriodPicker)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '8px',
                                padding: '8px 14px', borderRadius: '8px',
                                backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)',
                                color: 'var(--text-primary)', fontSize: '0.85rem', cursor: 'pointer',
                            }}
                        >
                            <Calendar size={16} />
                            {period.label}
                        </button>

                        {showPeriodPicker && (
                            <div style={{
                                position: 'absolute', top: '100%', right: 0, marginTop: '6px', zIndex: 50,
                                backgroundColor: 'var(--bg-panel)', border: '1px solid var(--border)',
                                borderRadius: '12px', boxShadow: 'var(--shadow-lg)',
                                padding: '16px', minWidth: '300px',
                            }}>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.05em' }}>Quick Presets</p>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginBottom: '16px' }}>
                                    {PERIOD_PRESETS.map((p) => (
                                        <button
                                            key={p.label}
                                            onClick={() => selectPreset(p)}
                                            style={{
                                                padding: '8px 12px', borderRadius: '6px', textAlign: 'left',
                                                fontSize: '0.85rem', cursor: 'pointer',
                                                backgroundColor: period.label === p.label ? 'rgba(94,92,230,0.15)' : 'transparent',
                                                color: period.label === p.label ? 'var(--primary)' : 'var(--text-secondary)',
                                                fontWeight: period.label === p.label ? '600' : '400',
                                            }}
                                        >
                                            {p.label}
                                        </button>
                                    ))}
                                </div>

                                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.05em' }}>Custom Range</p>
                                    <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                                        <input
                                            type="date"
                                            value={customStart}
                                            onChange={(e) => setCustomStart(e.target.value)}
                                            style={{ flex: 1, padding: '6px 8px', fontSize: '0.8rem', borderRadius: '6px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                                        />
                                        <input
                                            type="date"
                                            value={customEnd}
                                            onChange={(e) => setCustomEnd(e.target.value)}
                                            style={{ flex: 1, padding: '6px 8px', fontSize: '0.8rem', borderRadius: '6px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                                        />
                                    </div>
                                    <button
                                        onClick={applyCustomRange}
                                        style={{
                                            width: '100%', padding: '8px', borderRadius: '6px',
                                            backgroundColor: 'var(--primary)', color: 'white',
                                            fontSize: '0.85rem', fontWeight: '500', cursor: 'pointer',
                                        }}
                                    >
                                        Apply
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={handleCopy}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px',
                            borderRadius: '8px', backgroundColor: 'var(--primary)', color: 'white',
                            fontWeight: '500', cursor: 'pointer', fontSize: '0.85rem',
                            transition: 'opacity 0.2s',
                        }}
                    >
                        {copied ? <><Check size={16} /> Copied!</> : <><Copy size={16} /> Copy for LLM</>}
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <div className="glass-panel" style={{ padding: '16px' }}>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '4px' }}>Income</p>
                    <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--success)' }}>{formatCurrency(r.income, isPrivacyMode)}</p>
                    <p style={{ fontSize: '0.75rem', color: r.incomeChange >= 0 ? 'var(--success)' : 'var(--error)', marginTop: '4px' }}>
                        {r.incomeChange >= 0 ? '▲' : '▼'} {Math.abs(r.incomeChange).toFixed(1)}% vs prev period
                    </p>
                </div>
                <div className="glass-panel" style={{ padding: '16px' }}>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '4px' }}>Expenses</p>
                    <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{formatCurrency(r.expenses, isPrivacyMode)}</p>
                    <p style={{ fontSize: '0.75rem', color: r.expenseChange <= 0 ? 'var(--success)' : 'var(--error)', marginTop: '4px' }}>
                        {r.expenseChange >= 0 ? '▲' : '▼'} {Math.abs(r.expenseChange).toFixed(1)}% vs prev period
                    </p>
                </div>
                <div className="glass-panel" style={{ padding: '16px' }}>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '4px' }}>Net Savings</p>
                    <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: r.netSavings >= 0 ? 'var(--success)' : 'var(--error)' }}>{formatCurrency(r.netSavings, isPrivacyMode)}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                        {isPrivacyMode ? '**' : r.savingsRate.toFixed(1) + '% savings rate'}
                    </p>
                </div>
                <div className="glass-panel" style={{ padding: '16px' }}>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '4px' }}>Net Worth</p>
                    <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--success)' }}>{formatCurrency(r.netWorth, isPrivacyMode)}</p>
                </div>
            </div>

            {/* Top Categories & Payees Side by Side */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="glass-panel" style={{ padding: '20px' }}>
                    <h3 style={{ fontSize: '0.9rem', fontWeight: '500', color: 'var(--text-secondary)', marginBottom: '16px' }}>Top 10 Categories</h3>
                    {r.allCategories.slice(0, 10).map((c, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: i < 9 ? '1px solid var(--border)' : 'none' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', width: '24px' }}>{i + 1}.</span>
                                <span style={{ fontSize: '0.85rem' }}>{c.name}</span>
                            </span>
                            <span style={{ fontWeight: '500', fontSize: '0.85rem' }}>{formatCurrency(c.spend, isPrivacyMode)}</span>
                        </div>
                    ))}
                    {r.allCategories.length > 10 && (
                        <p style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem', marginTop: '8px' }}>+ {r.allCategories.length - 10} more in LLM export</p>
                    )}
                </div>

                <div className="glass-panel" style={{ padding: '20px' }}>
                    <h3 style={{ fontSize: '0.9rem', fontWeight: '500', color: 'var(--text-secondary)', marginBottom: '16px' }}>Top 10 Payees</h3>
                    {r.allPayees.slice(0, 10).map((p, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: i < 9 ? '1px solid var(--border)' : 'none' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', width: '24px' }}>{i + 1}.</span>
                                <span style={{ fontSize: '0.85rem' }}>{p.name}</span>
                            </span>
                            <span style={{ fontWeight: '500', fontSize: '0.85rem' }}>{formatCurrency(p.spend, isPrivacyMode)}</span>
                        </div>
                    ))}
                    {r.allPayees.length > 10 && (
                        <p style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem', marginTop: '8px' }}>+ {r.allPayees.length - 10} more in LLM export</p>
                    )}
                </div>
            </div>

            {/* LLM Preview */}
            <div className="glass-panel" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h3 style={{ fontSize: '0.9rem', fontWeight: '500', color: 'var(--text-secondary)' }}>LLM Prompt Preview</h3>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                        {r.allCategories.length} categories • {r.allPayees.length} payees • {r.exportTxs.length} transactions
                    </span>
                </div>
                <pre style={{
                    backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)',
                    borderRadius: '8px', padding: '16px', fontSize: '0.75rem',
                    color: 'var(--text-secondary)', whiteSpace: 'pre-wrap',
                    maxHeight: '400px', overflowY: 'auto', lineHeight: '1.4',
                }}>
                    {isPrivacyMode ? 'Enable normal mode to preview the LLM prompt' : generateText()}
                </pre>
            </div>
        </div>
    );
};
