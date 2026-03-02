import React from 'react';
import { X } from 'lucide-react';
import { type Transaction } from '../../services/ynab';
import { formatCurrency } from '../../utils/calculations';
import { useYNAB } from '../../contexts/YNABContext';

interface Props {
    title: string;
    transactions: Transaction[];
    onClose: () => void;
}

export const TransactionModal: React.FC<Props> = ({ title, transactions, onClose }) => {
    const { isPrivacyMode } = useYNAB();

    return (
        <div
            style={{
                position: 'fixed', inset: 0, zIndex: 100,
                backgroundColor: 'rgba(0,0,0,0.6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '24px',
            }}
            onClick={onClose}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    backgroundColor: 'var(--bg-panel)',
                    border: '1px solid var(--border)',
                    borderRadius: '16px',
                    boxShadow: 'var(--shadow-lg)',
                    width: '100%',
                    maxWidth: '800px',
                    maxHeight: '80vh',
                    display: 'flex',
                    flexDirection: 'column',
                }}
            >
                {/* Header */}
                <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '20px 24px', borderBottom: '1px solid var(--border)',
                }}>
                    <div>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '2px' }}>{title}</h3>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>{transactions.length} transactions</p>
                    </div>
                    <button onClick={onClose} style={{ padding: '6px', borderRadius: '6px', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                        <X size={20} />
                    </button>
                </div>

                {/* Table */}
                <div style={{ overflowY: 'auto', flex: 1 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                        <thead>
                            <tr style={{ position: 'sticky', top: 0, backgroundColor: 'var(--bg-panel)' }}>
                                <th style={{ padding: '10px 16px', textAlign: 'left', color: 'var(--text-tertiary)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--border)' }}>Date</th>
                                <th style={{ padding: '10px 16px', textAlign: 'left', color: 'var(--text-tertiary)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--border)' }}>Payee</th>
                                <th style={{ padding: '10px 16px', textAlign: 'left', color: 'var(--text-tertiary)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--border)' }}>Category</th>
                                <th style={{ padding: '10px 16px', textAlign: 'left', color: 'var(--text-tertiary)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--border)' }}>Memo</th>
                                <th style={{ padding: '10px 16px', textAlign: 'right', color: 'var(--text-tertiary)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--border)' }}>Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {transactions
                                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                .map(t => (
                                    <tr key={t.id}>
                                        <td style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>
                                            {new Date(t.date).toLocaleDateString()}
                                        </td>
                                        <td style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                                            {t.payee_name || '—'}
                                        </td>
                                        <td style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                                            {t.category_name || '—'}
                                        </td>
                                        <td style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', color: 'var(--text-tertiary)', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {t.memo || ''}
                                        </td>
                                        <td style={{
                                            padding: '10px 16px', borderBottom: '1px solid var(--border)', textAlign: 'right', fontWeight: '500',
                                            color: t.amount > 0 ? 'var(--success)' : 'var(--text-primary)',
                                        }}>
                                            {formatCurrency(t.amount / 1000, isPrivacyMode)}
                                        </td>
                                    </tr>
                                ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
