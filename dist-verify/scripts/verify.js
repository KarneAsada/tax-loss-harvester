"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const papaparse_1 = __importDefault(require("papaparse"));
const path_1 = __importDefault(require("path"));
const finance_1 = require("../src/utils/finance");
const csvPath = path_1.default.resolve(__dirname, '../../../example-robinhood-report.csv');
console.log(`Reading CSV from ${csvPath}`);
const csvContent = fs_1.default.readFileSync(csvPath, 'utf-8');
papaparse_1.default.parse(csvContent, {
    header: true,
    skipEmptyLines: true,
    complete: (results) => {
        const data = results.data;
        console.log(`Parsed ${data.length} rows`);
        const transactions = (0, finance_1.processTransactions)(data);
        console.log(`Processed ${transactions.length} transactions`);
        const { currentHoldings, realizedGains } = (0, finance_1.calculateFIFO)(transactions);
        console.log(`Realized Gains Events: ${realizedGains.length}`);
        let totalRealized = 0;
        realizedGains.forEach(g => totalRealized += g.gainLoss.toNumber());
        console.log(`Total Realized Gain: $${totalRealized.toFixed(2)}`);
        // Estimate prices
        const prices = {};
        transactions.forEach(tx => {
            if (tx.price.gt(0))
                prices[tx.ticker] = tx.price.toNumber();
        });
        const { summary, positions } = (0, finance_1.calculateUnrealized)(currentHoldings, prices);
        console.log(`Total Unrealized Gain: $${summary.totalUnrealizedGain.toFixed(2)}`);
        console.log(`Total Unrealized Loss: $${summary.totalUnrealizedLoss.toFixed(2)}`);
        console.log(`Net Unrealized P/L: $${summary.netUnrealizedPL.toFixed(2)}`);
        const harvestOps = (0, finance_1.findHarvestingOpportunities)(positions, transactions);
        console.log(`Harvest Opportunities: ${harvestOps.length}`);
        harvestOps.forEach(op => {
            console.log(`${op.ticker}: $${op.unrealizedPL.toFixed(2)} (Wash Sale Risk: ${op.washSaleWarning})`);
        });
    }
});
