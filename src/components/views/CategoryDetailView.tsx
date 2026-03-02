import React, { useState, useMemo } from 'react';
import { useYNAB } from '../../contexts/YNABContext';
import { useFilters } from '../../contexts/FiltersContext';
import { DataTable, type Column } from '../ui/DataTable';
import { TransactionModal } from '../ui/TransactionModal';
import { formatCurrency } from '../../utils/calculations';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface CategoryRow {
    id: string;
    groupName: string;
    name: string;
    totalSpend: number;
    pctOfTotal: number;
    txCount: number;
    avgAmount: number;
}

const CHART_COLORS = ['#5E5CE6', '#BF5AF2', '#FF6482', '#FF9F0A', '#30D158', '#64D2FF', '#AC8E68', '#8E8E93'];

export const CategoryDetailView: React.FC = () => {
    const { categoryGroups, isPrivacyMode } = useYNAB();
    const { filteredTransactions } = useFilters();
    const [selectedCategory, setSelectedCategory] = useState<CategoryRow | null>(null);

    const categoryRows: CategoryRow[] = useMemo(() => {
        // Build category name map — include ALL categories (even hidden/deleted)
        // so we can resolve names for transactions in those categories
        const catMap = new Map<string, { name: string; groupName: string }>();
        for (const g of categoryGroups) {
            for (const c of g.categories) {
                catMap.set(c.id, { name: c.name, groupName: g.name });
            }
        }

        // Only expense transactions (negative amounts, non-transfer)
        const expenseTxs = filteredTransactions.filter(t =>
            t.amount < 0 && !t.transfer_account_id && t.category_id
        );

        const totalExpense = expenseTxs.reduce((s, t) => s + Math.abs(t.amount), 0);

        // Group by category
        const byCat = new Map<string, { spend: number; count: number }>();
        for (const t of expenseTxs) {
            const key = t.category_id!;
            const existing = byCat.get(key) || { spend: 0, count: 0 };
            existing.spend += Math.abs(t.amount);
            existing.count++;
            byCat.set(key, existing);
        }

        // Look up name from catMap, fall back to transaction's category_name
        const getCatName = (id: string) => {
            const info = catMap.get(id);
            if (info) return info;
            // Try to find a display name from a transaction with this category
            const tx = expenseTxs.find(t => t.category_id === id);
            return { name: tx?.category_name || 'Uncategorized', groupName: '' };
        };

        return [...byCat.entries()]
            .map(([id, data]) => {
                const info = getCatName(id);
                return {
                    id,
                    groupName: info.groupName,
                    name: info.name,
                    totalSpend: data.spend / 1000,
                    pctOfTotal: totalExpense > 0 ? (data.spend / totalExpense) * 100 : 0,
                    txCount: data.count,
                    avgAmount: data.count > 0 ? (data.spend / data.count) / 1000 : 0,
                };
            })
            .sort((a, b) => b.totalSpend - a.totalSpend);
    }, [filteredTransactions, categoryGroups]);

    const chartData = categoryRows.slice(0, 10).map(r => ({
        name: r.name.length > 18 ? r.name.slice(0, 16) + '…' : r.name,
        value: r.totalSpend,
    }));

    const columns: Column<CategoryRow>[] = [
        {
            key: 'name', header: 'Category', render: (r) => (
                <div>
                    <div style={{ fontWeight: '500' }}>{r.name}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>{r.groupName}</div>
                </div>
            ), sortValue: (r) => r.name
        },
        { key: 'totalSpend', header: 'Total Spend', render: (r) => formatCurrency(r.totalSpend, isPrivacyMode), sortValue: (r) => r.totalSpend, align: 'right' },
        {
            key: 'pctOfTotal', header: '% of Total', render: (r) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '60px', height: '6px', borderRadius: '3px', backgroundColor: 'var(--border)', overflow: 'hidden' }}>
                        <div style={{ width: `${Math.min(r.pctOfTotal, 100)}%`, height: '100%', borderRadius: '3px', backgroundColor: 'var(--primary)' }} />
                    </div>
                    <span>{isPrivacyMode ? '**' : r.pctOfTotal.toFixed(1) + '%'}</span>
                </div>
            ), sortValue: (r) => r.pctOfTotal, align: 'right'
        },
        { key: 'txCount', header: 'Transactions', render: (r) => r.txCount.toString(), sortValue: (r) => r.txCount, align: 'right' },
        { key: 'avgAmount', header: 'Avg Amount', render: (r) => formatCurrency(r.avgAmount, isPrivacyMode), sortValue: (r) => r.avgAmount, align: 'right' },
    ];

    const txsForCategory = selectedCategory
        ? filteredTransactions.filter(t => t.category_id === selectedCategory.id && t.amount < 0 && !t.transfer_account_id)
        : [];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '4px' }}>Spending by Category</h2>
                <p style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>{categoryRows.length} categories with activity</p>
            </div>

            {/* Top 10 Chart */}
            {chartData.length > 0 && (
                <div className="glass-panel" style={{ padding: '20px', height: '300px' }}>
                    <h3 style={{ fontSize: '0.9rem', fontWeight: '500', color: 'var(--text-secondary)', marginBottom: '12px' }}>Top 10 Categories</h3>
                    <ResponsiveContainer width="100%" height="85%">
                        <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 20 }}>
                            <XAxis type="number" tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }}
                                tickFormatter={(v) => isPrivacyMode ? '****' : `$${(v / 1).toLocaleString()}`} />
                            <YAxis type="category" dataKey="name" width={140} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                            <Tooltip formatter={(v) => formatCurrency(Number(v), isPrivacyMode)} contentStyle={{ backgroundColor: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: '8px' }} />
                            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                {chartData.map((_, i) => (
                                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* Data Table */}
            <div className="glass-panel" style={{ padding: '4px' }}>
                <DataTable
                    columns={columns}
                    data={categoryRows}
                    keyExtractor={(r) => r.id}
                    onRowClick={(r) => setSelectedCategory(r)}
                    emptyMessage="No category spending in this date range"
                />
            </div>

            {selectedCategory && (
                <TransactionModal
                    title={`${selectedCategory.name} Transactions`}
                    transactions={txsForCategory}
                    onClose={() => setSelectedCategory(null)}
                />
            )}
        </div>
    );
};
