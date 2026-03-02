import { type Transaction } from '../services/ynab';

export interface RecurringTransaction {
    payeeName: string;
    payeeId: string | null;
    categoryName: string | null;
    typicalAmount: number; // milliunit
    frequency: 'weekly' | 'biweekly' | 'monthly' | 'annual' | 'irregular';
    occurrences: number;
    lastDate: string;
    avgDaysBetween: number;
    amounts: number[];
}

export function detectRecurringTransactions(transactions: Transaction[]): RecurringTransaction[] {
    // Filter to non-transfer, non-starting-balance expense/income transactions with a payee
    const validTxs = transactions.filter(t =>
        !t.deleted &&
        !t.transfer_account_id &&
        t.payee_name &&
        !t.payee_name.includes('Starting Balance') &&
        !t.payee_name.includes('Manual Balance Adjustment')
    );

    // Group by payee name
    const byPayee = new Map<string, Transaction[]>();
    for (const t of validTxs) {
        const key = t.payee_name!;
        if (!byPayee.has(key)) byPayee.set(key, []);
        byPayee.get(key)!.push(t);
    }

    const results: RecurringTransaction[] = [];

    for (const [payeeName, txs] of byPayee) {
        // Need at least 3 occurrences to detect a pattern
        if (txs.length < 3) continue;

        // Sort by date
        const sorted = [...txs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        // Group by similar amount clusters
        const clusters = new Map<number, Transaction[]>();
        for (const t of sorted) {
            const amt = Math.abs(t.amount);
            // Find matching cluster
            let matched = false;
            for (const [clusterAmt, clusterTxs] of clusters) {
                if (Math.abs(amt - clusterAmt) / clusterAmt < 0.25) {
                    clusterTxs.push(t);
                    matched = true;
                    break;
                }
            }
            if (!matched) {
                clusters.set(amt, [t]);
            }
        }

        for (const [_, clusterTxs] of clusters) {
            if (clusterTxs.length < 3) continue;

            // Calculate intervals between consecutive transactions
            const intervals: number[] = [];
            for (let i = 1; i < clusterTxs.length; i++) {
                const days = (new Date(clusterTxs[i].date).getTime() - new Date(clusterTxs[i - 1].date).getTime()) / (1000 * 60 * 60 * 24);
                intervals.push(days);
            }

            const avgInterval = intervals.reduce((s, d) => s + d, 0) / intervals.length;
            const typicalAmount = clusterTxs.reduce((s, t) => s + Math.abs(t.amount), 0) / clusterTxs.length;

            // Classify frequency
            let frequency: RecurringTransaction['frequency'] = 'irregular';
            if (avgInterval >= 5 && avgInterval <= 10) frequency = 'weekly';
            else if (avgInterval >= 12 && avgInterval <= 18) frequency = 'biweekly';
            else if (avgInterval >= 25 && avgInterval <= 38) frequency = 'monthly';
            else if (avgInterval >= 340 && avgInterval <= 400) frequency = 'annual';

            if (frequency === 'irregular') continue; // Skip non-regular patterns

            results.push({
                payeeName,
                payeeId: clusterTxs[0].payee_id,
                categoryName: clusterTxs[0].category_name,
                typicalAmount,
                frequency,
                occurrences: clusterTxs.length,
                lastDate: clusterTxs[clusterTxs.length - 1].date,
                avgDaysBetween: Math.round(avgInterval),
                amounts: clusterTxs.map(t => t.amount / 1000),
            });
        }
    }

    return results.sort((a, b) => Math.abs(b.typicalAmount) - Math.abs(a.typicalAmount));
}
