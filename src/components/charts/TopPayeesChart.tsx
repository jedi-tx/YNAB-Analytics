import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { generateTopPayees, formatCurrency } from '../../utils/calculations';
import { useYNAB } from '../../contexts/YNABContext';

export const TopPayeesChart: React.FC = () => {
    const { transactions, isPrivacyMode } = useYNAB();

    const data = useMemo(() => {
        return generateTopPayees(transactions, 30);
    }, [transactions]);

    return (
        <div className="glass-panel" style={{ padding: '24px', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ marginBottom: '16px' }}>
                <h3 style={{ fontWeight: 'bold', fontSize: '1.125rem', marginBottom: '4px' }}>Top Payees</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Last 30 days</p>
            </div>
            <div style={{ flex: 1, width: '100%', position: 'relative', minHeight: '250px' }}>
                {data.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-text-tertiary">No data</div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                            <XAxis type="number" stroke="var(--text-tertiary)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
                            <YAxis dataKey="payee" type="category" stroke="var(--text-primary)" fontSize={11} tickLine={false} axisLine={false} width={80} />
                            <Tooltip
                                contentStyle={{ backgroundColor: 'var(--bg-surface-active)', borderColor: 'var(--border)', borderRadius: '8px', color: 'var(--text-primary)' }}
                                formatter={(value: any) => [formatCurrency(value, isPrivacyMode), 'Spent']}
                                cursor={{ fill: 'var(--bg-surface-hover)' }}
                            />
                            <Bar dataKey="amount" fill="var(--chart-4)" radius={[0, 4, 4, 0]} barSize={20} />
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
};
