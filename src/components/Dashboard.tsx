import React, { useMemo, useState } from 'react';
import { useYNAB } from '../contexts/YNABContext';
import { useFilters } from '../contexts/FiltersContext';
import { BudgetSelector } from './BudgetSelector';
import { LayoutDashboard, LogOut, PieChart, Eye, EyeOff, Printer, Layers, Users, RefreshCw, FileText, Filter } from 'lucide-react';
import { calculateMetrics, formatCurrency } from '../utils/calculations';
import { NetWorthChart } from './charts/NetWorthChart';
import { IncomeExpenseChart } from './charts/IncomeExpenseChart';
import { CategorySpendChart } from './charts/CategorySpendChart';
import { DayOfWeekChart } from './charts/DayOfWeekChart';
import { TopPayeesChart } from './charts/TopPayeesChart';
import { DateRangePicker } from './ui/DateRangePicker';
import { MultiSelect, type SelectOption } from './ui/MultiSelect';
import { CategoryDetailView } from './views/CategoryDetailView';
import { SubCategoryDetailView } from './views/SubCategoryDetailView';
import { PayeeDetailView } from './views/PayeeDetailView';
import { RecurringView } from './views/RecurringView';
import { MonthInReviewView } from './views/MonthInReviewView';

type ViewId = 'overview' | 'categories' | 'subcategories' | 'payees' | 'recurring' | 'month-review';

const NAV_ITEMS: { id: ViewId; label: string; icon: React.FC<{ size?: number }> }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'categories', label: 'Categories', icon: PieChart },
    { id: 'subcategories', label: 'Subcategories', icon: Layers },
    { id: 'payees', label: 'Payees', icon: Users },
    { id: 'recurring', label: 'Recurring', icon: RefreshCw },
    { id: 'month-review', label: 'Month Review', icon: FileText },
];

export const Dashboard: React.FC = () => {
    const { activeBudget, logout, isLoading, accounts, categoryGroups, isPrivacyMode, togglePrivacyMode } = useYNAB();
    const { dateRange, setDateRange, selectedCategoryIds, setSelectedCategoryIds, selectedAccountIds, setSelectedAccountIds, filteredTransactions } = useFilters();

    const mainRef = React.useRef<HTMLElement>(null);
    const [activeView, setActiveView] = useState<ViewId>('overview');
    const [showFilters, setShowFilters] = useState(false);

    const handlePrint = () => window.print();

    // Compute metrics from filtered transactions
    const metrics = useMemo(() => {
        if (!accounts || !filteredTransactions.length) return null;
        return calculateMetrics(accounts, filteredTransactions);
    }, [accounts, filteredTransactions]);

    // Build options for multi-selects
    const categoryOptions: SelectOption[] = useMemo(() => {
        return categoryGroups.flatMap(g =>
            g.categories
                .filter(c => !c.deleted && !c.hidden)
                .map(c => ({ id: c.id, label: c.name, group: g.name }))
        );
    }, [categoryGroups]);

    const accountOptions: SelectOption[] = useMemo(() => {
        return accounts
            .filter(a => !a.deleted && !a.closed)
            .map(a => ({ id: a.id, label: a.name, group: a.type }));
    }, [accounts]);

    if (!activeBudget) {
        return <BudgetSelector />;
    }

    const renderView = () => {
        switch (activeView) {
            case 'categories': return <CategoryDetailView />;
            case 'subcategories': return <SubCategoryDetailView />;
            case 'payees': return <PayeeDetailView />;
            case 'recurring': return <RecurringView />;
            case 'month-review': return <MonthInReviewView />;
            default: return renderOverview();
        }
    };

    const renderOverview = () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '80vh' }}>
            {/* Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                <StatCard title="Net Worth" value={metrics ? formatCurrency(metrics.totalNetWorth, isPrivacyMode) : '$0.00'} positive={metrics ? metrics.totalNetWorth >= 0 : true} />
                <StatCard title="Daily Net Income" value={metrics ? formatCurrency(metrics.dailyNetIncome, isPrivacyMode) : '$0.00'} tooltip="Based on filtered range" positive={metrics ? metrics.dailyNetIncome >= 0 : true} />
                <StatCard title="Days of Buffer" value={metrics ? (isPrivacyMode ? '****' : `${metrics.daysOfBuffer.toFixed(1)} days`) : '0 days'} tooltip="Cash Assets / Avg Daily Spend" />
                <StatCard title="Period Spend" value={metrics ? formatCurrency(metrics.monthlySpend, isPrivacyMode) : '$0.00'} tooltip="Selected date range" positive={false} />
            </div>

            {/* Charts */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: '24px' }}>
                <div style={{ height: '380px' }}><IncomeExpenseChart /></div>
                <div style={{ height: '380px' }}><NetWorthChart /></div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
                <div style={{ height: '380px' }}><CategorySpendChart /></div>
                <div style={{ height: '380px' }}><DayOfWeekChart /></div>
                <div style={{ height: '380px' }}><TopPayeesChart /></div>
            </div>
        </div>
    );

    return (
        <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', backgroundColor: 'var(--bg-base)' }}>
            {/* Sidebar */}
            <aside style={{
                width: '280px', minWidth: '280px',
                borderRight: '1px solid var(--border)',
                backgroundColor: 'var(--bg-panel)',
                display: 'flex', flexDirection: 'column'
            }}>
                <div style={{ padding: '24px' }}>
                    <h1 className="text-gradient" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.25rem', fontWeight: 'bold' }}>
                        <LayoutDashboard size={24} color="var(--primary)" />
                        YNAB Analytics
                    </h1>
                </div>

                <nav style={{ flex: 1, padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
                        const isActive = activeView === id;
                        return (
                            <button
                                key={id}
                                onClick={() => { setActiveView(id); mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '12px',
                                    padding: '12px 16px', borderRadius: '8px',
                                    backgroundColor: isActive ? 'rgba(94, 92, 230, 0.15)' : 'transparent',
                                    color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                                    fontWeight: isActive ? '600' : '400',
                                    width: '100%', textAlign: 'left',
                                    transition: 'all 0.2s ease', cursor: 'pointer', fontSize: '0.95rem',
                                }}
                                onMouseOver={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)'; }}
                                onMouseOut={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = 'transparent'; }}
                            >
                                <Icon size={20} />
                                {label}
                            </button>
                        );
                    })}
                </nav>

                <div style={{ padding: '16px', borderTop: '1px solid var(--border)' }}>
                    <div style={{ padding: '8px 16px', marginBottom: '8px' }}>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Active Budget</p>
                        <p style={{ fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={activeBudget.name}>{activeBudget.name}</p>
                    </div>
                    <button
                        onClick={logout}
                        style={{ display: 'flex', width: '100%', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '8px', color: 'var(--error)' }}
                    >
                        <LogOut size={20} />
                        Disconnect
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main ref={mainRef} style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
                <header style={{
                    position: 'sticky', top: 0, zIndex: 10,
                    backgroundColor: 'rgba(10, 10, 11, 0.8)',
                    backdropFilter: 'blur(12px)',
                    borderBottom: '1px solid var(--border)',
                    padding: '16px 24px',
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: showFilters ? '12px' : 0 }}>
                        <div>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Financial Dashboard</h2>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{dateRange.label} • {filteredTransactions.length} transactions</p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} className="hide-on-print">
                            {isLoading && <div className="spinner"></div>}
                            <button onClick={() => setShowFilters(!showFilters)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', fontSize: '0.82rem', cursor: 'pointer', backgroundColor: showFilters ? 'rgba(94,92,230,0.15)' : 'transparent', color: showFilters ? 'var(--primary)' : 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                                <Filter size={14} />
                                Filters
                            </button>
                            <button onClick={togglePrivacyMode} style={{ padding: '8px', borderRadius: '50%', color: 'var(--text-secondary)' }} title="Toggle Privacy Mode">
                                {isPrivacyMode ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                            <button onClick={handlePrint} style={{ padding: '8px', borderRadius: '50%', color: 'var(--text-secondary)' }} title="Export to PDF">
                                <Printer size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Filter Bar */}
                    {showFilters && (
                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                            <DateRangePicker value={dateRange} onChange={setDateRange} />
                            <MultiSelect label="Categories" options={categoryOptions} selected={selectedCategoryIds} onChange={setSelectedCategoryIds} />
                            <MultiSelect label="Accounts" options={accountOptions} selected={selectedAccountIds} onChange={setSelectedAccountIds} />
                        </div>
                    )}
                </header>

                <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
                    {renderView()}
                </div>
            </main>
        </div>
    );
};

const StatCard = ({ title, value, tooltip, positive }: { title: string, value: string, tooltip?: string, positive?: boolean }) => (
    <div className="glass-panel" style={{ padding: '20px', position: 'relative', overflow: 'hidden' }} title={tooltip}>
        <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: '500', marginBottom: '4px' }}>{title}</h3>
        <div style={{
            fontSize: '1.875rem', fontWeight: 'bold', marginBottom: '4px',
            color: positive === true ? 'var(--success)' : positive === false ? 'var(--text-primary)' : 'inherit'
        }}>
            {value}
        </div>
    </div>
);
