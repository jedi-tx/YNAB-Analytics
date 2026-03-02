import React, { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

export interface Column<T> {
    key: string;
    header: string;
    render: (row: T) => React.ReactNode;
    sortValue?: (row: T) => number | string;
    align?: 'left' | 'right' | 'center';
    width?: string;
}

interface Props<T> {
    columns: Column<T>[];
    data: T[];
    onRowClick?: (row: T) => void;
    emptyMessage?: string;
    keyExtractor: (row: T) => string;
}

export function DataTable<T>({ columns, data, onRowClick, emptyMessage = 'No data', keyExtractor }: Props<T>) {
    const [sortKey, setSortKey] = useState<string | null>(null);
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

    const handleSort = (key: string) => {
        if (sortKey === key) {
            setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(key);
            setSortDir('desc');
        }
    };

    const sortedData = useMemo(() => {
        if (!sortKey) return data;
        const col = columns.find(c => c.key === sortKey);
        if (!col?.sortValue) return data;
        const fn = col.sortValue;
        return [...data].sort((a, b) => {
            const va = fn(a);
            const vb = fn(b);
            const cmp = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb));
            return sortDir === 'asc' ? cmp : -cmp;
        });
    }, [data, sortKey, sortDir, columns]);

    if (data.length === 0) {
        return (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.9rem' }}>
                {emptyMessage}
            </div>
        );
    }

    return (
        <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                    <tr>
                        {columns.map(col => (
                            <th
                                key={col.key}
                                onClick={() => col.sortValue && handleSort(col.key)}
                                style={{
                                    padding: '10px 14px',
                                    textAlign: col.align || 'left',
                                    color: 'var(--text-tertiary)',
                                    fontWeight: '500',
                                    fontSize: '0.75rem',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                    borderBottom: '1px solid var(--border)',
                                    cursor: col.sortValue ? 'pointer' : 'default',
                                    whiteSpace: 'nowrap',
                                    width: col.width,
                                    userSelect: 'none',
                                }}
                            >
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                    {col.header}
                                    {sortKey === col.key && (
                                        sortDir === 'asc'
                                            ? <ChevronUp size={12} />
                                            : <ChevronDown size={12} />
                                    )}
                                </span>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {sortedData.map(row => (
                        <tr
                            key={keyExtractor(row)}
                            onClick={() => onRowClick?.(row)}
                            style={{
                                cursor: onRowClick ? 'pointer' : 'default',
                                transition: 'background-color 0.15s',
                            }}
                            onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)'}
                            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                            {columns.map(col => (
                                <td
                                    key={col.key}
                                    style={{
                                        padding: '12px 14px',
                                        textAlign: col.align || 'left',
                                        borderBottom: '1px solid var(--border)',
                                        color: 'var(--text-primary)',
                                        width: col.width,
                                    }}
                                >
                                    {col.render(row)}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
