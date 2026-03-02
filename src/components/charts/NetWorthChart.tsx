import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { generateNetWorthHistory, formatCurrency } from '../../utils/calculations';
import { useYNAB } from '../../contexts/YNABContext';

export const NetWorthChart: React.FC = () => {
    const { accounts, transactions, isPrivacyMode } = useYNAB();

    const data = useMemo(() => {
        return generateNetWorthHistory(accounts, transactions, 90);
    }, [accounts, transactions]);

    return (
        <div className="glass-panel" style={{ padding: '24px', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ marginBottom: '16px' }}>
                <h3 style={{ fontWeight: 'bold', fontSize: '1.125rem', marginBottom: '4px' }}>Net Worth History</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Last 90 days</p>
            </div>
            <div style={{ flex: 1, width: '100%', position: 'relative', minHeight: '250px' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorNetWorth" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                        <XAxis dataKey="date" stroke="var(--text-tertiary)" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis
                            stroke="var(--text-tertiary)"
                            fontSize={12}
                            tickFormatter={(val) => `$${val.toLocaleString()}`}
                            tickLine={false}
                            axisLine={false}
                            width={60}
                        />
                        <Tooltip
                            contentStyle={{ backgroundColor: 'var(--bg-surface-active)', borderColor: 'var(--border)', borderRadius: '8px', color: 'var(--text-primary)' }}
                            itemStyle={{ color: 'var(--primary)' }}
                            formatter={(value: any) => [formatCurrency(value, isPrivacyMode), 'Net Worth']}
                        />
                        <Area type="monotone" dataKey="netWorth" stroke="var(--primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorNetWorth)" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};
