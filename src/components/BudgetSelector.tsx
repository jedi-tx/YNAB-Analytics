import React from 'react';
import { useYNAB } from '../contexts/YNABContext';

export const BudgetSelector: React.FC = () => {
    const { budgets, selectBudget, isLoading, logout } = useYNAB();

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '16px', backgroundColor: 'var(--bg-base)' }}>
            <div className="glass-panel" style={{ padding: '32px', maxWidth: '500px', width: '100%', textAlign: 'center' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '8px' }}>Select a Budget</h2>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
                    Choose which budget you'd like to analyze.
                </p>

                {isLoading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', margin: '32px 0' }}>
                        <div className="spinner" style={{ width: '32px', height: '32px' }}></div>
                    </div>
                ) : budgets.length === 0 ? (
                    <div style={{ padding: '16px', backgroundColor: 'rgba(255, 69, 58, 0.1)', color: 'var(--error)', borderRadius: '8px' }}>
                        No budgets found for this account.
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {budgets.map((budget) => (
                            <button
                                key={budget.id}
                                onClick={() => selectBudget(budget.id)}
                                style={{
                                    padding: '16px',
                                    backgroundColor: 'var(--bg-panel)',
                                    border: '1px solid var(--border)',
                                    borderRadius: '12px',
                                    textAlign: 'left',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    cursor: 'pointer',
                                    transition: 'border-color 0.2s',
                                }}
                                onMouseOver={(e) => (e.currentTarget.style.borderColor = 'var(--primary)')}
                                onMouseOut={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
                            >
                                <div>
                                    <h3 style={{ fontWeight: '600', fontSize: '1.125rem', marginBottom: '4px', color: 'var(--text-primary)' }}>
                                        {budget.name}
                                    </h3>
                                    <p style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>
                                        Last modified: {new Date(budget.last_modified_on).toLocaleDateString()}
                                    </p>
                                </div>
                                <div style={{ color: 'var(--primary)', fontWeight: '500' }}>
                                    Analyze &rarr;
                                </div>
                            </button>
                        ))}
                    </div>
                )}

                <button
                    onClick={logout}
                    style={{
                        marginTop: '32px',
                        fontSize: '0.875rem',
                        color: 'var(--text-tertiary)',
                        cursor: 'pointer',
                        padding: '8px',
                        background: 'transparent',
                        border: 'none',
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
                    onMouseOut={(e) => (e.currentTarget.style.color = 'var(--text-tertiary)')}
                >
                    Disconnect Account
                </button>
            </div>
        </div>
    );
};
