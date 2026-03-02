import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { generateIncomeVsExpense, formatCurrency } from '../../utils/calculations';
import { useYNAB } from '../../contexts/YNABContext';

export const IncomeExpenseChart: React.FC = () => {
    const { transactions, isPrivacyMode } = useYNAB();

    const data = useMemo(() => {
        return generateIncomeVsExpense(transactions, 6);
    }, [transactions]);

    return (
        <div className="glass-panel" style={{ padding: '24px', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ marginBottom: '16px' }}>
                <h3 style={{ fontWeight: 'bold', fontSize: '1.125rem', marginBottom: '4px' }}>Income vs Expense</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Last 6 months</p>
            </div>
            <div style={{ flex: 1, width: '100%', position: 'relative', minHeight: '250px' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                        <XAxis dataKey="month" stroke="var(--text-tertiary)" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis
                            stroke="var(--text-tertiary)"
                            fontSize={12}
                            tickFormatter={(val) => isPrivacyMode ? '****' : `$${val.toLocaleString()}`}
                            tickLine={false}
                            axisLine={false}
                            width={60}
                        />
                        <Tooltip
                            contentStyle={{ backgroundColor: 'var(--bg-surface-active)', borderColor: 'var(--border)', borderRadius: '8px', color: 'var(--text-primary)' }}
                            itemStyle={{ color: 'var(--text-primary)' }}
                            formatter={(value: any) => [formatCurrency(value, isPrivacyMode)]}
                            cursor={{ fill: 'var(--bg-surface-hover)' }}
                        />
                        <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} />
                        <Bar dataKey="Income" fill="var(--success)" radius={[4, 4, 0, 0]} maxBarSize={40} />
                        <Bar dataKey="Expense" fill="var(--error)" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};
