import fs from 'fs';
import Papa from 'papaparse';
import path from 'path';
import { processTransactions, calculateFIFO, calculateUnrealized, findHarvestingOpportunities } from '../src/utils/finance';

const csvPath = path.resolve(__dirname, '../../../example-robinhood-report.csv');
console.log(`Reading CSV from ${csvPath}`);
const csvContent = fs.readFileSync(csvPath, 'utf-8');

Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: true,
    complete: (results) => {
        const data = results.data as any[];
        console.log(`Parsed ${data.length} rows`);

        const transactions = processTransactions(data);
        console.log(`Processed ${transactions.length} transactions`);

        const { currentHoldings, realizedGains } = calculateFIFO(transactions);
        console.log(`Realized Gains Events: ${realizedGains.length}`);

        let totalRealized = 0;
        realizedGains.forEach(g => totalRealized += g.gainLoss.toNumber());
        console.log(`Total Realized Gain: $${totalRealized.toFixed(2)}`);

        // Estimate prices
        const prices: Record<string, number> = {};
        transactions.forEach(tx => {
            if (tx.price.gt(0)) prices[tx.ticker] = tx.price.toNumber();
        });

        const { summary, positions } = calculateUnrealized(currentHoldings, prices);
        console.log(`Total Unrealized Gain: $${summary.totalUnrealizedGain.toFixed(2)}`);
        console.log(`Total Unrealized Loss: $${summary.totalUnrealizedLoss.toFixed(2)}`);
        console.log(`Net Unrealized P/L: $${summary.netUnrealizedPL.toFixed(2)}`);

        const harvestOps = findHarvestingOpportunities(positions, transactions);
        console.log(`Harvest Opportunities: ${harvestOps.length}`);
        harvestOps.forEach(op => {
            console.log(`${op.ticker}: $${op.unrealizedPL.toFixed(2)} (Wash Sale Risk: ${op.washSaleWarning})`);
        });
    }
});
