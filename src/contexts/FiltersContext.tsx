import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { subDays } from 'date-fns';
import { useYNAB } from './YNABContext';
import type { DateRange } from '../components/ui/DateRangePicker';
import type { Transaction } from '../services/ynab';

import { flattenTransactions } from '../utils/calculations';

interface FiltersState {
    dateRange: DateRange;
    selectedCategoryIds: string[];
    selectedAccountIds: string[];
}

interface FiltersContextType extends FiltersState {
    setDateRange: (range: DateRange) => void;
    setSelectedCategoryIds: (ids: string[]) => void;
    setSelectedAccountIds: (ids: string[]) => void;
    filteredTransactions: Transaction[];
}

const FiltersContext = createContext<FiltersContextType | undefined>(undefined);

const DEFAULT_DATE_RANGE: DateRange = {
    startDate: subDays(new Date(), 30),
    endDate: new Date(),
    label: 'Last 30 Days',
};

const STORAGE_KEY_PREFIX = 'ynab_filters_';

export const FiltersProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { activeBudget, transactions, accounts, categoryGroups } = useYNAB();
    const budgetId = activeBudget?.id || '';

    const [dateRange, setDateRange] = useState<DateRange>(DEFAULT_DATE_RANGE);
    const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
    const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);

    // Load saved filters from localStorage when budget changes
    useEffect(() => {
        if (!budgetId) return;

        const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}${budgetId}`);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (parsed.selectedCategoryIds) setSelectedCategoryIds(parsed.selectedCategoryIds);
                if (parsed.selectedAccountIds) setSelectedAccountIds(parsed.selectedAccountIds);
            } catch {
                // ignore corrupt data
            }
        }
    }, [budgetId]);

    // Default to all categories/accounts if none selected
    useEffect(() => {
        if (categoryGroups.length > 0 && selectedCategoryIds.length === 0) {
            const allCatIds = categoryGroups.flatMap(g => g.categories.filter(c => !c.deleted && !c.hidden).map(c => c.id));
            setSelectedCategoryIds(allCatIds);
        }
    }, [categoryGroups]);

    useEffect(() => {
        if (accounts.length > 0 && selectedAccountIds.length === 0) {
            const allAccIds = accounts.filter(a => !a.deleted && !a.closed).map(a => a.id);
            setSelectedAccountIds(allAccIds);
        }
    }, [accounts]);

    // Persist to localStorage
    const handleCategoryChange = useCallback((ids: string[]) => {
        setSelectedCategoryIds(ids);
        if (budgetId) {
            const existing = JSON.parse(localStorage.getItem(`${STORAGE_KEY_PREFIX}${budgetId}`) || '{}');
            localStorage.setItem(`${STORAGE_KEY_PREFIX}${budgetId}`, JSON.stringify({ ...existing, selectedCategoryIds: ids }));
        }
    }, [budgetId]);

    const handleAccountChange = useCallback((ids: string[]) => {
        setSelectedAccountIds(ids);
        if (budgetId) {
            const existing = JSON.parse(localStorage.getItem(`${STORAGE_KEY_PREFIX}${budgetId}`) || '{}');
            localStorage.setItem(`${STORAGE_KEY_PREFIX}${budgetId}`, JSON.stringify({ ...existing, selectedAccountIds: ids }));
        }
    }, [budgetId]);

    // Compute filtered transactions
    const filteredTransactions = useMemo(() => {
        if (!transactions.length) return [];

        const start = dateRange.startDate.getTime();
        const end = dateRange.endDate.getTime();
        const catSet = new Set(selectedCategoryIds);
        const accSet = new Set(selectedAccountIds);

        // Flatten splits but keep them as Transaction objects for compatibility
        const allTransactions = flattenTransactions(transactions);
        const flattened: Transaction[] = [];

        for (const t of allTransactions) {
            // Basic filters (Date, Account)
            const dt = new Date(t.date).getTime();
            if (dt < start || dt > end) continue;
            if (accSet.size > 0 && !accSet.has(t.account_id)) continue;

            // Category filter
            if (catSet.size > 0 && t.category_id && !catSet.has(t.category_id)) continue;

            flattened.push(t);
        }

        return flattened;
    }, [transactions, dateRange, selectedCategoryIds, selectedAccountIds]);

    return (
        <FiltersContext.Provider value={{
            dateRange,
            selectedCategoryIds,
            selectedAccountIds,
            setDateRange,
            setSelectedCategoryIds: handleCategoryChange,
            setSelectedAccountIds: handleAccountChange,
            filteredTransactions,
        }}>
            {children}
        </FiltersContext.Provider>
    );
};

export const useFilters = () => {
    const context = useContext(FiltersContext);
    if (context === undefined) {
        throw new Error('useFilters must be used within a FiltersProvider');
    }
    return context;
};
