import React, { useState, useMemo } from 'react';
import { useYNAB } from '../../contexts/YNABContext';
import { useFilters } from '../../contexts/FiltersContext';
import { TransactionModal } from '../ui/TransactionModal';
import { formatCurrency } from '../../utils/calculations';
import { ChevronRight, ChevronDown } from 'lucide-react';

interface GroupRow {
    id: string;
    name: string;
    totalSpend: number;
    pctOfTotal: number;
    txCount: number;
    subcategories: SubCatRow[];
}

interface SubCatRow {
    id: string;
    groupId: string;
    name: string;
    totalSpend: number;
    pctOfGroup: number;
    txCount: number;
    avgAmount: number;
}

export const SubCategoryDetailView: React.FC = () => {
    const { categoryGroups, isPrivacyMode } = useYNAB();
    const { filteredTransactions } = useFilters();
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
    const [selectedSubCat, setSelectedSubCat] = useState<SubCatRow | null>(null);

    const groupRows: GroupRow[] = useMemo(() => {
        // Include ALL categories so we can resolve names even for hidden/deleted ones
        const catMap = new Map<string, { name: string; groupId: string; groupName: string }>();
        for (const g of categoryGroups) {
            for (const c of g.categories) {
                catMap.set(c.id, { name: c.name, groupId: g.id, groupName: g.name });
            }
        }

        const expenseTxs = filteredTransactions.filter(t =>
            t.amount < 0 && !t.transfer_account_id && t.category_id
        );

        const totalExpense = expenseTxs.reduce((s, t) => s + Math.abs(t.amount), 0);

        // Group by category group, then subcategory
        const byGroup = new Map<string, { name: string; cats: Map<string, { name: string; spend: number; count: number }> }>();

        for (const t of expenseTxs) {
            let info = catMap.get(t.category_id!);
            if (!info) {
                info = { name: t.category_name || 'Uncategorized', groupId: 'unknown-group', groupName: 'Other/Hidden Categories' };
            }
            const { groupId, groupName, name } = info;
            if (!byGroup.has(groupId)) byGroup.set(groupId, { name: groupName, cats: new Map() });
            const group = byGroup.get(groupId)!;
            if (!group.cats.has(t.category_id!)) group.cats.set(t.category_id!, { name, spend: 0, count: 0 });
            const cat = group.cats.get(t.category_id!)!;
            cat.spend += Math.abs(t.amount);
            cat.count++;
        }

        return [...byGroup.entries()]
            .map(([groupId, groupData]) => {
                const groupSpend = [...groupData.cats.values()].reduce((s, c) => s + c.spend, 0);
                const groupCount = [...groupData.cats.values()].reduce((s, c) => s + c.count, 0);
                const subcategories: SubCatRow[] = [...groupData.cats.entries()]
                    .map(([catId, catData]) => ({
                        id: catId,
                        groupId,
                        name: catData.name,
                        totalSpend: catData.spend / 1000,
                        pctOfGroup: groupSpend > 0 ? (catData.spend / groupSpend) * 100 : 0,
                        txCount: catData.count,
                        avgAmount: catData.count > 0 ? (catData.spend / catData.count) / 1000 : 0,
                    }))
                    .sort((a, b) => b.totalSpend - a.totalSpend);

                return {
                    id: groupId,
                    name: groupData.name,
                    totalSpend: groupSpend / 1000,
                    pctOfTotal: totalExpense > 0 ? (groupSpend / totalExpense) * 100 : 0,
                    txCount: groupCount,
                    subcategories,
                };
            })
            .sort((a, b) => b.totalSpend - a.totalSpend);
    }, [filteredTransactions, categoryGroups]);

    const toggleGroup = (id: string) => {
        setExpandedGroups(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const txsForSubCat = selectedSubCat
        ? filteredTransactions.filter(t => t.category_id === selectedSubCat.id && t.amount < 0 && !t.transfer_account_id)
        : [];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '4px' }}>Spending by Subcategory</h2>
                <p style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>Click a group to expand subcategories, click a subcategory to view transactions</p>
            </div>

            <div className="glass-panel" style={{ padding: '4px' }}>
                {groupRows.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-tertiary)' }}>No spending data</div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                        <thead>
                            <tr>
                                <th style={{ padding: '10px 14px', textAlign: 'left', color: 'var(--text-tertiary)', fontWeight: '500', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--border)' }}>Category Group</th>
                                <th style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--text-tertiary)', fontWeight: '500', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--border)' }}>Total Spend</th>
                                <th style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--text-tertiary)', fontWeight: '500', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--border)' }}>% of Total</th>
                                <th style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--text-tertiary)', fontWeight: '500', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--border)' }}>Transactions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {groupRows.map(group => (
                                <React.Fragment key={group.id}>
                                    <tr
                                        onClick={() => toggleGroup(group.id)}
                                        style={{ cursor: 'pointer', transition: 'background-color 0.15s' }}
                                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)'}
                                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                    >
                                        <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', fontWeight: '600' }}>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                {expandedGroups.has(group.id) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                                {group.name}
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', textAlign: 'right', fontWeight: '500' }}>
                                            {formatCurrency(group.totalSpend, isPrivacyMode)}
                                        </td>
                                        <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', textAlign: 'right' }}>
                                            {isPrivacyMode ? '**' : group.pctOfTotal.toFixed(1) + '%'}
                                        </td>
                                        <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', textAlign: 'right' }}>
                                            {group.txCount}
                                        </td>
                                    </tr>
                                    {expandedGroups.has(group.id) && group.subcategories.map(sub => (
                                        <tr
                                            key={sub.id}
                                            onClick={() => setSelectedSubCat(sub)}
                                            style={{ cursor: 'pointer', backgroundColor: 'rgba(94,92,230,0.03)', transition: 'background-color 0.15s' }}
                                            onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(94,92,230,0.08)'}
                                            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'rgba(94,92,230,0.03)'}
                                        >
                                            <td style={{ padding: '10px 14px 10px 44px', borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)' }}>{sub.name}</td>
                                            <td style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', textAlign: 'right' }}>{formatCurrency(sub.totalSpend, isPrivacyMode)}</td>
                                            <td style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', textAlign: 'right', color: 'var(--text-tertiary)' }}>{isPrivacyMode ? '**' : sub.pctOfGroup.toFixed(1) + '%'}</td>
                                            <td style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', textAlign: 'right', color: 'var(--text-tertiary)' }}>{sub.txCount}</td>
                                        </tr>
                                    ))}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {selectedSubCat && (
                <TransactionModal
                    title={`${selectedSubCat.name} Transactions`}
                    transactions={txsForSubCat}
                    onClose={() => setSelectedSubCat(null)}
                />
            )}
        </div>
    );
};
