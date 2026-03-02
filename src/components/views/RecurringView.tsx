import React, { useMemo } from 'react';
import { useYNAB } from '../../contexts/YNABContext';
import { detectRecurringTransactions, type RecurringTransaction } from '../../utils/recurring';
import { DataTable, type Column } from '../ui/DataTable';
import { formatCurrency } from '../../utils/calculations';
import { RefreshCw, AlertCircle } from 'lucide-react';

const FREQ_LABELS: Record<string, string> = {
    weekly: 'Weekly',
    biweekly: 'Bi-weekly',
    monthly: 'Monthly',
    annual: 'Annual',
    irregular: 'Irregular',
};

const FREQ_COLORS: Record<string, string> = {
    weekly: '#64D2FF',
    biweekly: '#30D158',
    monthly: '#5E5CE6',
    annual: '#FF9F0A',
    irregular: '#8E8E93',
};

export const RecurringView: React.FC = () => {
    const { transactions, isPrivacyMode } = useYNAB();

    const recurring = useMemo(() => {
        return detectRecurringTransactions(transactions);
    }, [transactions]);

    const monthlyTotal = useMemo(() => {
        let total = 0;
        for (const r of recurring) {
            const monthlyAmt = Math.abs(r.typicalAmount / 1000);
            if (r.frequency === 'weekly') total += monthlyAmt * 4.33;
            else if (r.frequency === 'biweekly') total += monthlyAmt * 2.17;
            else if (r.frequency === 'monthly') total += monthlyAmt;
            else if (r.frequency === 'annual') total += monthlyAmt / 12;
        }
        return total;
    }, [recurring]);

    const columns: Column<RecurringTransaction>[] = [
        {
            key: 'payeeName', header: 'Payee', render: (r) => (
                <div>
                    <div style={{ fontWeight: '500' }}>{r.payeeName}</div>
                    {r.categoryName && <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>{r.categoryName}</div>}
                </div>
            ), sortValue: (r) => r.payeeName
        },
        {
            key: 'typicalAmount', header: 'Typical Amount', render: (r) => (
                <span style={{ color: r.typicalAmount < 0 ? 'var(--text-primary)' : 'var(--success)' }}>
                    {formatCurrency(Math.abs(r.typicalAmount / 1000), isPrivacyMode)}
                </span>
            ), sortValue: (r) => Math.abs(r.typicalAmount), align: 'right'
        },
        {
            key: 'frequency', header: 'Frequency', render: (r) => (
                <span style={{
                    padding: '3px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '500',
                    backgroundColor: `${FREQ_COLORS[r.frequency]}20`, color: FREQ_COLORS[r.frequency],
                }}>
                    {FREQ_LABELS[r.frequency]}
                </span>
            ), sortValue: (r) => r.avgDaysBetween
        },
        { key: 'occurrences', header: 'Occurrences', render: (r) => r.occurrences.toString(), sortValue: (r) => r.occurrences, align: 'right' },
        { key: 'avgDays', header: 'Avg Interval', render: (r) => `${r.avgDaysBetween} days`, sortValue: (r) => r.avgDaysBetween, align: 'right' },
        { key: 'lastDate', header: 'Last Seen', render: (r) => new Date(r.lastDate).toLocaleDateString(), sortValue: (r) => r.lastDate, align: 'right' },
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <RefreshCw size={22} />
                    Recurring Transactions
                </h2>
                <p style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>Auto-detected from your transaction history</p>
            </div>

            {/* Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <div className="glass-panel" style={{ padding: '16px' }}>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '4px' }}>Total Recurring</p>
                    <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{recurring.length}</p>
                </div>
                <div className="glass-panel" style={{ padding: '16px' }}>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '4px' }}>Est. Monthly Cost</p>
                    <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{formatCurrency(monthlyTotal, isPrivacyMode)}</p>
                </div>
                <div className="glass-panel" style={{ padding: '16px' }}>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '4px' }}>Monthly</p>
                    <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{recurring.filter(r => r.frequency === 'monthly').length}</p>
                </div>
                <div className="glass-panel" style={{ padding: '16px' }}>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '4px' }}>Weekly / Bi-weekly</p>
                    <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{recurring.filter(r => r.frequency === 'weekly' || r.frequency === 'biweekly').length}</p>
                </div>
            </div>

            {recurring.length === 0 ? (
                <div className="glass-panel" style={{ padding: '40px', textAlign: 'center' }}>
                    <AlertCircle size={32} style={{ color: 'var(--text-tertiary)', marginBottom: '12px' }} />
                    <p style={{ color: 'var(--text-secondary)' }}>No recurring transactions detected yet.</p>
                    <p style={{ color: 'var(--text-tertiary)', fontSize: '0.8rem', marginTop: '4px' }}>Recurring patterns need at least 3 similar transactions at regular intervals.</p>
                </div>
            ) : (
                <div className="glass-panel" style={{ padding: '4px' }}>
                    <DataTable
                        columns={columns}
                        data={recurring}
                        keyExtractor={(r) => `${r.payeeName}-${r.typicalAmount}`}
                        emptyMessage="No recurring transactions detected"
                    />
                </div>
            )}
        </div>
    );
};
