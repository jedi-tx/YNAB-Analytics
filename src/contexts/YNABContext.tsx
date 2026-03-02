import React, { createContext, useContext, useState, useEffect } from 'react';
import { ynabAPI, type BudgetSummary, type Account, type CategoryGroup, type Payee, type Transaction } from '../services/ynab';

interface YNABState {
    // Auth & Status
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;

    // Data
    budgets: BudgetSummary[];
    activeBudget: BudgetSummary | null;

    // Budget detailed data
    accounts: Account[];
    categoryGroups: CategoryGroup[];
    payees: Payee[];
    transactions: Transaction[];

    // UI State
    isPrivacyMode: boolean;
}

interface YNABContextType extends YNABState {
    login: (token: string) => Promise<void>;
    logout: () => void;
    selectBudget: (budgetId: string) => Promise<void>;
    togglePrivacyMode: () => void;
}

const YNABContext = createContext<YNABContextType | undefined>(undefined);

export const YNABProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [state, setState] = useState<YNABState>({
        isAuthenticated: false,
        isLoading: true, // Initially true while checking local storage
        error: null,
        budgets: [],
        activeBudget: null,
        accounts: [],
        categoryGroups: [],
        payees: [],
        transactions: [],
        isPrivacyMode: false,
    });

    // Check valid token on mount
    useEffect(() => {
        const savedToken = localStorage.getItem('ynab_token');
        if (savedToken) {
            handleLogin(savedToken);
        } else {
            setState(s => ({ ...s, isLoading: false }));
        }
    }, []);

    const handleLogin = async (token: string) => {
        setState(s => ({ ...s, isLoading: true, error: null }));
        try {
            ynabAPI.setToken(token);
            const budgets = await ynabAPI.getBudgets();
            localStorage.setItem('ynab_token', token);

            setState(s => ({
                ...s,
                isAuthenticated: true,
                budgets,
                isLoading: false
            }));
        } catch (err: any) {
            ynabAPI.setToken('');
            localStorage.removeItem('ynab_token');
            setState(s => ({
                ...s,
                isAuthenticated: false,
                error: err.message || 'Failed to authenticate',
                isLoading: false
            }));
        }
    };

    const handleLogout = () => {
        ynabAPI.setToken('');
        localStorage.removeItem('ynab_token');
        setState({
            isAuthenticated: false,
            isLoading: false,
            error: null,
            budgets: [],
            activeBudget: null,
            accounts: [],
            categoryGroups: [],
            payees: [],
            transactions: [],
            isPrivacyMode: false,
        });
    };

    const handleSelectBudget = async (budgetId: string) => {
        const budget = state.budgets.find(b => b.id === budgetId);
        if (!budget) return;

        setState(s => ({ ...s, isLoading: true, error: null }));
        try {
            const data = await ynabAPI.getBudgetData(budgetId);
            setState(s => ({
                ...s,
                activeBudget: budget,
                accounts: data.accounts,
                categoryGroups: data.categoryGroups,
                payees: data.payees,
                transactions: data.transactions,
                isLoading: false,
            }));
        } catch (err: any) {
            setState(s => ({
                ...s,
                error: err.message || 'Failed to load budget data',
                isLoading: false
            }));
        }
    };

    const handleTogglePrivacyMode = () => {
        setState(s => ({ ...s, isPrivacyMode: !s.isPrivacyMode }));
    };

    return (
        <YNABContext.Provider value={{
            ...state,
            login: handleLogin,
            logout: handleLogout,
            selectBudget: handleSelectBudget,
            togglePrivacyMode: handleTogglePrivacyMode,
        }}>
            {children}
        </YNABContext.Provider>
    );
};

export const useYNAB = () => {
    const context = useContext(YNABContext);
    if (context === undefined) {
        throw new Error('useYNAB must be used within a YNABProvider');
    }
    return context;
};
