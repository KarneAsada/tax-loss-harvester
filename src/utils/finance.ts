import Papa from 'papaparse';
import { Decimal } from 'decimal.js';

export interface Transaction {
    date: Date;
    ticker: string;
    type: 'BUY' | 'SELL' | 'OTHER';
    quantity: Decimal;
    price: Decimal;
    amount: Decimal;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    original: any; // Relaxed type since it depends on the parser
}

import { RobinhoodParser } from './parsers/robinhood';
import { TransactionParser } from './parsers/types';

const PARSERS: TransactionParser[] = [
    RobinhoodParser,
];

export const parseCSV = (file: File): Promise<Transaction[]> => {
    return new Promise((resolve, reject) => {
        // First, just parse the header to detect the format
        Papa.parse(file, {
            header: true,
            preview: 1,
            step: async (results, parser) => {
                const header = results.meta.fields || [];
                const matchingParser = PARSERS.find(p => p.canParse(file, header));

                parser.abort(); // Stop parsing preview

                if (matchingParser) {
                    try {
                        const transactions = await matchingParser.parse(file);
                        resolve(transactions);
                    } catch (e) {
                        reject(e);
                    }
                } else {
                    reject(new Error("Unknown CSV format. Could not find a matching parser."));
                }
            },
            error: (error) => {
                reject(error);
            },
        });
    });
};

// Deprecated: normalizeTransaction and processTransactions are now handled inside specific parsers
// Keeping processTransactions for backward compatibility if needed, but it's effectively a pass-through now
// or we can remove it if we update App.tsx to use the result of parseCSV directly (which returns Transaction[])

export const processTransactions = (transactions: Transaction[]): Transaction[] => {
    // Already processed by the parser, just ensuring sort order if needed, but parsers should handle it.
    return transactions;
};

export interface Lot {
    date: Date;
    quantity: Decimal;
    unitCost: Decimal;
    totalCost: Decimal;
}

export interface RealizedGainLoss {
    date: Date;
    ticker: string;
    quantitySold: Decimal;
    proceeds: Decimal;
    costBasis: Decimal;
    gainLoss: Decimal;
    term: 'SHORT' | 'LONG'; // Simplified, usually based on 1 year hold
}

export interface CostBasisResult {
    realizedGains: RealizedGainLoss[];
    currentHoldings: Record<string, Lot[]>;
}

export const calculateFIFO = (transactions: Transaction[]): CostBasisResult => {
    const holdings: Record<string, Lot[]> = {};
    const realizedGains: RealizedGainLoss[] = [];

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
        } else if (tx.type === 'SELL') {
            let quantityToSell = tx.quantity;
            let costBasis = new Decimal(0);
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
                } else {
                    // Partial lot consumption
                    const portionCost = lot.unitCost.times(quantityToSell);
                    costBasis = costBasis.plus(portionCost);

                    // Update lot
                    lot.quantity = lot.quantity.minus(quantityToSell);
                    lot.totalCost = lot.totalCost.minus(portionCost);
                    quantityToSell = new Decimal(0);
                }
            }

            if (quantityToSell.gt(0)) {
                console.warn(`Sold more ${tx.ticker} than held!`, {
                    message: `Attempted to sell ${tx.quantity} ${tx.ticker}. Remaining unsold: ${quantityToSell}`,
                    ticker: tx.ticker,
                    date: tx.date,
                    attemptedSellQuantity: tx.quantity.toString(),
                    remainingUnsold: quantityToSell.toString(),
                    transaction: tx,
                    recommendedAction: "Check your CSV for missing BUY transactions or stock splits that might have increased your holdings."
                });
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

export interface Position {
    ticker: string;
    quantity: Decimal;
    costBasis: Decimal;
    avgCost: Decimal;
    currentPrice: Decimal;
    marketValue: Decimal;
    unrealizedPL: Decimal;
    unrealizedPLPercent: Decimal;
}

export interface PortfolioSummary {
    totalRealizedGain: Decimal;
    totalUnrealizedGain: Decimal;
    totalUnrealizedLoss: Decimal;
    netUnrealizedPL: Decimal;
    maxHarvestableLoss: Decimal;
    netGainIfHarvested: Decimal;
}

export const calculateUnrealized = (
    currentHoldings: Record<string, Lot[]>,
    currentPrices: Record<string, number>
): { positions: Record<string, Position>; summary: Omit<PortfolioSummary, 'totalRealizedGain' | 'netGainIfHarvested'> } => {
    const positions: Record<string, Position> = {};
    let totalUnrealizedGain = new Decimal(0);
    let totalUnrealizedLoss = new Decimal(0);

    for (const ticker in currentHoldings) {
        const lots = currentHoldings[ticker];
        if (lots.length === 0) continue;

        let quantity = new Decimal(0);
        let costBasis = new Decimal(0);

        for (const lot of lots) {
            quantity = quantity.plus(lot.quantity);
            costBasis = costBasis.plus(lot.totalCost);
        }

        if (quantity.eq(0)) continue;

        const avgCost = costBasis.div(quantity);
        const priceVal = currentPrices[ticker] || 0;
        const currentPrice = new Decimal(priceVal);
        const marketValue = quantity.times(currentPrice);
        let unrealizedPL = marketValue.minus(costBasis);

        // Fix negative zero
        if (unrealizedPL.eq(0)) {
            unrealizedPL = new Decimal(0);
        }

        const unrealizedPLPercent = costBasis.eq(0) ? new Decimal(0) : unrealizedPL.div(costBasis).times(100);

        if (unrealizedPL.gt(0)) {
            totalUnrealizedGain = totalUnrealizedGain.plus(unrealizedPL);
        } else {
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

export interface HarvestOpportunity extends Position {
    washSaleWarning: boolean;
    recentBuyDate?: Date;
}

export const findHarvestingOpportunities = (
    positions: Record<string, Position>,
    transactions: Transaction[],
    targetDate: Date = new Date()
): HarvestOpportunity[] => {
    const opportunities: HarvestOpportunity[] = [];

    for (const ticker in positions) {
        const pos = positions[ticker];
        if (pos.unrealizedPL.isNegative()) {
            // Check for wash sale risk: any BUY in [targetDate - 30d, targetDate]
            // Note: We strictly check for recent buys. Future buys are up to the user.
            const thirtyDaysAgo = new Date(targetDate);
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const recentBuy = transactions.find(tx =>
                tx.ticker === ticker &&
                tx.type === 'BUY' &&
                tx.date >= thirtyDaysAgo &&
                tx.date <= targetDate
            );

            opportunities.push({
                ...pos,
                washSaleWarning: !!recentBuy,
                recentBuyDate: recentBuy?.date
            });
        }
    }

    // Sort by most negative unrealized PL (largest loss first)
    return opportunities.sort((a, b) => a.unrealizedPL.minus(b.unrealizedPL).toNumber());
};

export const findBalancingOpportunities = (
    positions: Record<string, Position>
): Position[] => {
    const opportunities: Position[] = [];

    for (const ticker in positions) {
        const pos = positions[ticker];
        // For balancing, we look for gains
        if (pos.unrealizedPL.isPositive() && !pos.unrealizedPL.isZero()) {
            opportunities.push(pos);
        }
    }

    // Sort by largest gain first (descending)
    return opportunities.sort((a, b) => b.unrealizedPL.minus(a.unrealizedPL).toNumber());
};
