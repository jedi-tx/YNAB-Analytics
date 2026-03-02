import React, { useState, useMemo } from 'react';
import { useYNAB } from '../../contexts/YNABContext';
import { useFilters } from '../../contexts/FiltersContext';
import { DataTable, type Column } from '../ui/DataTable';
import { TransactionModal } from '../ui/TransactionModal';
import { formatCurrency } from '../../utils/calculations';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface PayeeRow {
    id: string;
    name: string;
    totalSpend: number;
    txCount: number;
    avgAmount: number;
    lastDate: string;
}

const COLORS = ['#BF5AF2', '#5E5CE6', '#FF6482', '#FF9F0A', '#30D158', '#64D2FF', '#AC8E68', '#8E8E93', '#FF453A', '#FFD60A'];

export const PayeeDetailView: React.FC = () => {
    const { isPrivacyMode } = useYNAB();
    const { filteredTransactions } = useFilters();
    const [selectedPayee, setSelectedPayee] = useState<PayeeRow | null>(null);

    const payeeRows: PayeeRow[] = useMemo(() => {
        const expenseTxs = filteredTransactions.filter(t =>
            t.amount < 0 && !t.transfer_account_id && t.payee_name
        );

        const byPayee = new Map<string, { name: string; spend: number; count: number; lastDate: string }>();

        for (const t of expenseTxs) {
            const key = t.payee_id || t.payee_name || 'unknown';
            const existing = byPayee.get(key) || { name: t.payee_name || 'Unknown', spend: 0, count: 0, lastDate: '1900-01-01' };
            existing.spend += Math.abs(t.amount);
            existing.count++;
            if (t.date > existing.lastDate) existing.lastDate = t.date;
            byPayee.set(key, existing);
        }

        return [...byPayee.entries()]
            .map(([id, data]) => ({
                id,
                name: data.name,
                totalSpend: data.spend / 1000,
                txCount: data.count,
                avgAmount: data.count > 0 ? (data.spend / data.count) / 1000 : 0,
                lastDate: data.lastDate,
            }))
            .sort((a, b) => b.totalSpend - a.totalSpend);
    }, [filteredTransactions]);

    const chartData = payeeRows.slice(0, 10).map(r => ({
        name: r.name.length > 20 ? r.name.slice(0, 18) + '…' : r.name,
        value: r.totalSpend,
    }));

    const columns: Column<PayeeRow>[] = [
        { key: 'name', header: 'Payee', render: (r) => <span style={{ fontWeight: '500' }}>{r.name}</span>, sortValue: (r) => r.name },
        { key: 'totalSpend', header: 'Total Spend', render: (r) => formatCurrency(r.totalSpend, isPrivacyMode), sortValue: (r) => r.totalSpend, align: 'right' },
        { key: 'txCount', header: 'Transactions', render: (r) => r.txCount.toString(), sortValue: (r) => r.txCount, align: 'right' },
        { key: 'avgAmount', header: 'Avg Amount', render: (r) => formatCurrency(r.avgAmount, isPrivacyMode), sortValue: (r) => r.avgAmount, align: 'right' },
        { key: 'lastDate', header: 'Last Transaction', render: (r) => new Date(r.lastDate).toLocaleDateString(), sortValue: (r) => r.lastDate, align: 'right' },
    ];

    const txsForPayee = selectedPayee
        ? filteredTransactions.filter(t =>
            (t.payee_id === selectedPayee.id || t.payee_name === selectedPayee.name) &&
            t.amount < 0 && !t.transfer_account_id
        )
        : [];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '4px' }}>Spending by Payee</h2>
                <p style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>{payeeRows.length} payees with activity</p>
            </div>

            {chartData.length > 0 && (
                <div className="glass-panel" style={{ padding: '20px', height: '300px' }}>
                    <h3 style={{ fontSize: '0.9rem', fontWeight: '500', color: 'var(--text-secondary)', marginBottom: '12px' }}>Top 10 Payees</h3>
                    <ResponsiveContainer width="100%" height="85%">
                        <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 20 }}>
                            <XAxis type="number" tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }}
                                tickFormatter={(v) => isPrivacyMode ? '****' : `$${v.toLocaleString()}`} />
                            <YAxis type="category" dataKey="name" width={150} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                            <Tooltip formatter={(v) => formatCurrency(Number(v), isPrivacyMode)} contentStyle={{ backgroundColor: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: '8px' }} />
                            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                {chartData.map((_, i) => (
                                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}

            <div className="glass-panel" style={{ padding: '4px' }}>
                <DataTable
                    columns={columns}
                    data={payeeRows}
                    keyExtractor={(r) => r.id}
                    onRowClick={(r) => setSelectedPayee(r)}
                    emptyMessage="No payee spending in this date range"
                />
            </div>

            {selectedPayee && (
                <TransactionModal
                    title={`${selectedPayee.name} Transactions`}
                    transactions={txsForPayee}
                    onClose={() => setSelectedPayee(null)}
                />
            )}
        </div>
    );
};
