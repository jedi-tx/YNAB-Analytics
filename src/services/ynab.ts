// YNAB API Interface and Service Layer

export const YNAB_BASE_URL = 'https://api.ynab.com/v1';

// ---------- TYPES ---------- //
export interface BudgetSummary {
    id: string;
    name: string;
    last_modified_on: string;
    first_month: string;
    last_month: string;
    date_format: {
        format: string;
    };
    currency_format: {
        iso_code: string;
        example_format: string;
        decimal_digits: number;
        decimal_separator: string;
        symbol_first: boolean;
        group_separator: string;
        currency_symbol: string;
        display_symbol: boolean;
    };
}

export interface Account {
    id: string;
    name: string;
    type: string;
    on_budget: boolean;
    closed: boolean;
    note: string | null;
    balance: number;
    cleared_balance: number;
    uncleared_balance: number;
    transfer_payee_id: string | null;
    direct_import_linked: boolean;
    direct_import_in_error: boolean;
    deleted: boolean;
}

export interface CategoryGroup {
    id: string;
    name: string;
    hidden: boolean;
    deleted: boolean;
    categories: Category[];
}

export interface Category {
    id: string;
    category_group_id: string;
    name: string;
    hidden: boolean;
    original_category_group_id: string | null;
    note: string | null;
    budgeted: number;
    activity: number;
    balance: number;
    goal_type: string | null;
    goal_creation_month: string | null;
    goal_target: number;
    goal_target_month: string | null;
    goal_percentage_complete: number | null;
    goal_months_to_budget: number | null;
    goal_under_funded: number | null;
    goal_overall_funded: number | null;
    goal_overall_left: number | null;
    deleted: boolean;
}

export interface Payee {
    id: string;
    name: string;
    transfer_account_id: string | null;
    deleted: boolean;
}

export interface Transaction {
    id: string;
    date: string;
    amount: number;
    memo: string | null;
    cleared: string;
    approved: boolean;
    flag_color: string | null;
    account_id: string;
    payee_id: string | null;
    category_id: string | null;
    transfer_account_id: string | null;
    transfer_transaction_id: string | null;
    matched_transaction_id: string | null;
    import_id: string | null;
    import_payee_name: string | null;
    import_payee_name_original: string | null;
    debt_transaction_type: string | null;
    deleted: boolean;
    account_name: string;
    payee_name: string | null;
    category_name: string | null;
    subtransactions: SubTransaction[];
}

export interface SubTransaction {
    id: string;
    transaction_id: string;
    amount: number;
    memo: string | null;
    payee_id: string | null;
    payee_name: string | null;
    category_id: string | null;
    category_name: string | null;
    transfer_account_id: string | null;
    transfer_transaction_id: string | null;
    deleted: boolean;
}

// ---------- API CLIENT ---------- //
class YNABClient {
    private token: string | null = null;

    setToken(token: string) {
        this.token = token;
    }

    hasToken(): boolean {
        return !!this.token;
    }

    private async fetchAPI<T>(endpoint: string): Promise<T> {
        if (!this.token) {
            throw new Error('No YNAB access token provided.');
        }

        const response = await fetch(`${YNAB_BASE_URL}${endpoint}`, {
            headers: {
                Authorization: `Bearer ${this.token}`,
            },
        });

        if (!response.ok) {
            let errorDetail = response.statusText;
            try {
                const errBody = await response.json();
                errorDetail = errBody?.error?.detail || errorDetail;
            } catch (e) {
                // Ignore json parse error
            }
            throw new Error(`API Error ${response.status}: ${errorDetail}`);
        }

        const json = await response.json();
        return json.data;
    }

    // Budgets
    async getBudgets(): Promise<BudgetSummary[]> {
        const data = await this.fetchAPI<{ budgets: BudgetSummary[] }>('/budgets');
        return data.budgets;
    }

    // Initial load helper
    async getBudgetData(budgetId: string) {
        // We can use concurrent fetching to get the heavy data
        const [accountsData, categoryGroupsData, payeesData, transactionsData] = await Promise.all([
            this.fetchAPI<{ accounts: Account[] }>(`/budgets/${budgetId}/accounts`),
            this.fetchAPI<{ category_groups: CategoryGroup[] }>(`/budgets/${budgetId}/categories`),
            this.fetchAPI<{ payees: Payee[] }>(`/budgets/${budgetId}/payees`),
            // Get all transactions for all time. To be more efficient, maybe ?since_date=...
            // But for total net worth we need all historical, unless we calculate it differently
            this.fetchAPI<{ transactions: Transaction[] }>(`/budgets/${budgetId}/transactions`),
        ]);

        return {
            accounts: accountsData.accounts,
            categoryGroups: categoryGroupsData.category_groups,
            payees: payeesData.payees,
            transactions: transactionsData.transactions,
        };
    }
}

export const ynabAPI = new YNABClient();
