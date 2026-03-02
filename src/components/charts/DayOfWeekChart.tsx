import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { generateSpendByDayOfWeek, formatCurrency } from '../../utils/calculations';
import { useYNAB } from '../../contexts/YNABContext';

export const DayOfWeekChart: React.FC = () => {
    const { transactions, isPrivacyMode } = useYNAB();

    const data = useMemo(() => {
        return generateSpendByDayOfWeek(transactions, 90);
    }, [transactions]);

    // Find max to highlight it
    const maxSpend = Math.max(...data.map(d => d.amount));

    return (
        <div className="glass-panel" style={{ padding: '24px', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ marginBottom: '16px' }}>
                <h3 style={{ fontWeight: 'bold', fontSize: '1.125rem', marginBottom: '4px' }}>Spend by Day of Week</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Total over last 90 days</p>
            </div>
            <div style={{ flex: 1, width: '100%', position: 'relative', minHeight: '250px' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                        <XAxis dataKey="day" stroke="var(--text-tertiary)" fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip
                            contentStyle={{ backgroundColor: 'var(--bg-surface-active)', borderColor: 'var(--border)', borderRadius: '8px', color: 'var(--text-primary)' }}
                            formatter={(value: any) => [formatCurrency(value, isPrivacyMode), 'Spent']}
                            cursor={{ fill: 'var(--bg-surface-hover)' }}
                        />
                        <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                            {data.map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={entry.amount === maxSpend && maxSpend > 0 ? 'var(--accent)' : 'var(--primary)'}
                                    fillOpacity={entry.amount === maxSpend ? 1 : 0.7}
                                />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};
