import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { generateSpendByCategory, formatCurrency } from '../../utils/calculations';
import { useYNAB } from '../../contexts/YNABContext';

const COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)', 'var(--text-secondary)'];

export const CategorySpendChart: React.FC = () => {
    const { transactions, isPrivacyMode } = useYNAB();

    const data = useMemo(() => {
        return generateSpendByCategory(transactions, 30);
    }, [transactions]);

    return (
        <div className="glass-panel" style={{ padding: '24px', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ marginBottom: '16px' }}>
                <h3 style={{ fontWeight: 'bold', fontSize: '1.125rem', marginBottom: '4px' }}>Top Spending Categories</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Last 30 days</p>
            </div>
            <div style={{ flex: 1, width: '100%', position: 'relative', minHeight: '250px' }}>
                {data.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-text-tertiary">No data</div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                                stroke="none"
                            >
                                {data.map((_, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{ backgroundColor: 'var(--bg-surface-active)', borderColor: 'var(--border)', borderRadius: '8px', color: 'var(--text-primary)' }}
                                itemStyle={{ color: 'var(--text-primary)' }}
                                formatter={(value: any) => [formatCurrency(value, isPrivacyMode), 'Spent']}
                            />
                            <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                        </PieChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
};
