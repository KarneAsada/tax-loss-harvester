"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.findHarvestingOpportunities = exports.calculateUnrealized = exports.calculateFIFO = exports.processTransactions = exports.normalizeTransaction = exports.parseCSV = void 0;
const papaparse_1 = __importDefault(require("papaparse"));
const decimal_js_1 = require("decimal.js");
const parseCSV = (file) => {
    return new Promise((resolve, reject) => {
        papaparse_1.default.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                resolve(results.data);
            },
            error: (error) => {
                reject(error);
            },
        });
    });
};
exports.parseCSV = parseCSV;
const normalizeTransaction = (rhTx) => {
    var _a;
    const transCode = (_a = rhTx["Trans Code"]) === null || _a === void 0 ? void 0 : _a.toUpperCase();
    // Filter out irrelevant codes
    const ignoredCodes = ['CDIV', 'SLIP', 'SPL', 'OEXP', 'BTO', 'STO', 'INT', 'ACH', 'GDBP', 'GMPC', 'GOLD', 'MISC', 'FUTSWP'];
    if (ignoredCodes.includes(transCode) || !transCode) {
        return null;
    }
    // We only care about BUY and SELL for now, maybe others later if needed for cash balance but spec focuses on gains
    // Actually, spec says: Buys: Trans Code == "BUY", Sells: Trans Code == "SELL"
    // And ignore others.
    let type = 'OTHER';
    if (transCode === 'BUY')
        type = 'BUY';
    else if (transCode === 'SELL')
        type = 'SELL';
    else
        return null; // Ignore non-buy/sell for now as per spec
    // Parse numbers
    const cleanNumber = (str) => {
        if (!str)
            return new decimal_js_1.Decimal(0);
        return new decimal_js_1.Decimal(str.replace(/[$,()]/g, ''));
    };
    const quantity = cleanNumber(rhTx.Quantity);
    const price = cleanNumber(rhTx.Price);
    const amount = cleanNumber(rhTx.Amount);
    // Date priority: Settle Date > Activity Date
    const dateStr = rhTx["Settle Date"] || rhTx["Activity Date"];
    const date = new Date(dateStr);
    return {
        date,
        ticker: rhTx.Instrument,
        type,
        quantity,
        price,
        amount,
        original: rhTx
    };
};
exports.normalizeTransaction = normalizeTransaction;
const processTransactions = (rhTransactions) => {
    const transactions = rhTransactions
        .map(exports.normalizeTransaction)
        .filter((tx) => tx !== null);
    // Sort chronologically
    transactions.sort((a, b) => a.date.getTime() - b.date.getTime());
    return transactions;
};
exports.processTransactions = processTransactions;
const calculateFIFO = (transactions) => {
    const holdings = {};
    const realizedGains = [];
    for (const tx of transactions) {
        if (!holdings[tx.ticker]) {
            holdings[tx.ticker] = [];
        }
        if (tx.type === 'BUY') {
            holdings[tx.ticker].push({
                date: tx.date,
                quantity: tx.quantity,
                unitCost: tx.price,
                totalCost: tx.amount.abs(), // Amount is negative for buys usually, but we want cost
            });
        }
        else if (tx.type === 'SELL') {
            let quantityToSell = tx.quantity;
            let costBasis = new decimal_js_1.Decimal(0);
            const saleProceeds = tx.amount; // Usually positive for sells
            // FIFO Logic
            const lots = holdings[tx.ticker];
            while (quantityToSell.gt(0) && lots.length > 0) {
                const lot = lots[0]; // Oldest lot
                if (lot.quantity.lte(quantityToSell)) {
                    // Consume entire lot
                    costBasis = costBasis.plus(lot.totalCost);
                    quantityToSell = quantityToSell.minus(lot.quantity);
                    lots.shift(); // Remove lot
                }
                else {
                    // Partial lot consumption
                    const portionCost = lot.unitCost.times(quantityToSell);
                    costBasis = costBasis.plus(portionCost);
                    // Update lot
                    lot.quantity = lot.quantity.minus(quantityToSell);
                    lot.totalCost = lot.totalCost.minus(portionCost);
                    quantityToSell = new decimal_js_1.Decimal(0);
                }
            }
            if (quantityToSell.gt(0)) {
                console.warn(`Sold more ${tx.ticker} than held! Remaining: ${quantityToSell.toString()}`);
                // In a real app we might handle short selling, but for this basic version we just warn
            }
            const gainLoss = saleProceeds.minus(costBasis);
            realizedGains.push({
                date: tx.date,
                ticker: tx.ticker,
                quantitySold: tx.quantity,
                proceeds: saleProceeds,
                costBasis,
                gainLoss,
                term: 'SHORT', // TODO: Calculate term based on lot dates if needed
            });
        }
    }
    return {
        realizedGains,
        currentHoldings: holdings,
    };
};
exports.calculateFIFO = calculateFIFO;
const calculateUnrealized = (currentHoldings, currentPrices) => {
    const positions = {};
    let totalUnrealizedGain = new decimal_js_1.Decimal(0);
    let totalUnrealizedLoss = new decimal_js_1.Decimal(0);
    for (const ticker in currentHoldings) {
        const lots = currentHoldings[ticker];
        if (lots.length === 0)
            continue;
        let quantity = new decimal_js_1.Decimal(0);
        let costBasis = new decimal_js_1.Decimal(0);
        for (const lot of lots) {
            quantity = quantity.plus(lot.quantity);
            costBasis = costBasis.plus(lot.totalCost);
        }
        if (quantity.eq(0))
            continue;
        const avgCost = costBasis.div(quantity);
        const priceVal = currentPrices[ticker] || 0;
        const currentPrice = new decimal_js_1.Decimal(priceVal);
        const marketValue = quantity.times(currentPrice);
        const unrealizedPL = marketValue.minus(costBasis);
        const unrealizedPLPercent = costBasis.eq(0) ? new decimal_js_1.Decimal(0) : unrealizedPL.div(costBasis).times(100);
        if (unrealizedPL.gt(0)) {
            totalUnrealizedGain = totalUnrealizedGain.plus(unrealizedPL);
        }
        else {
            totalUnrealizedLoss = totalUnrealizedLoss.plus(unrealizedPL); // This will be negative
        }
        positions[ticker] = {
            ticker,
            quantity,
            costBasis,
            avgCost,
            currentPrice,
            marketValue,
            unrealizedPL,
            unrealizedPLPercent,
        };
    }
    const netUnrealizedPL = totalUnrealizedGain.plus(totalUnrealizedLoss);
    // Max harvestable loss is the sum of all negative unrealized PLs
    // Since totalUnrealizedLoss is already the sum of negative PLs, it is the max harvestable loss (as a negative number)
    const maxHarvestableLoss = totalUnrealizedLoss;
    return {
        positions,
        summary: {
            totalUnrealizedGain,
            totalUnrealizedLoss,
            netUnrealizedPL,
            maxHarvestableLoss,
        }
    };
};
exports.calculateUnrealized = calculateUnrealized;
const findHarvestingOpportunities = (positions, transactions, targetDate = new Date()) => {
    const opportunities = [];
    for (const ticker in positions) {
        const pos = positions[ticker];
        if (pos.unrealizedPL.isNegative()) {
            // Check for wash sale risk: any BUY in [targetDate - 30d, targetDate]
            // Note: We strictly check for recent buys. Future buys are up to the user.
            const thirtyDaysAgo = new Date(targetDate);
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const recentBuy = transactions.find(tx => tx.ticker === ticker &&
                tx.type === 'BUY' &&
                tx.date >= thirtyDaysAgo &&
                tx.date <= targetDate);
            opportunities.push({
                ...pos,
                washSaleWarning: !!recentBuy,
                recentBuyDate: recentBuy === null || recentBuy === void 0 ? void 0 : recentBuy.date
            });
        }
    }
    // Sort by most negative unrealized PL (largest loss first)
    return opportunities.sort((a, b) => a.unrealizedPL.minus(b.unrealizedPL).toNumber());
};
exports.findHarvestingOpportunities = findHarvestingOpportunities;
