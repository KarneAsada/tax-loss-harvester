import { useState, useEffect, useMemo, useCallback } from 'react';
import { Decimal } from 'decimal.js';
import {
    Transaction,
    Lot,
    PortfolioSummary,
    RealizedGainLoss,
    calculateFIFO,
    calculateUnrealized,
    findHarvestingOpportunities,
    findBalancingOpportunities,
    processTransactions
} from '../utils/finance';
import { fetchPrices } from '../utils/prices';

export const usePortfolio = (initialTransactions: Transaction[] = []) => {
    const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);
    const [holdings, setHoldings] = useState<Record<string, Lot[]>>({});
    const [realizedGains, setRealizedGains] = useState<RealizedGainLoss[]>([]);
    const [prices, setPrices] = useState<Record<string, number>>({});
    const [selectedHarvestTickers, setSelectedHarvestTickers] = useState<Set<string>>(new Set());
    const [selectedBalancingTickers, setSelectedBalancingTickers] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(false);
    const [fetchingPrices, setFetchingPrices] = useState(false);
    const [fetchProgress, setFetchProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);

    // Initialize if initialTransactions are provided
    useEffect(() => {
        if (initialTransactions.length > 0) {
            processData(initialTransactions);
        }
    }, [initialTransactions]); // Only re-run if the *reference* changes, which should be stable for debug data

    const processData = (txs: Transaction[]) => {
        const processed = processTransactions(txs);
        setTransactions(processed);

        const { currentHoldings, realizedGains: gains } = calculateFIFO(processed);
        setHoldings(currentHoldings);
        setRealizedGains(gains);

        // Estimate initial prices from last transaction
        const estimatedPrices: Record<string, number> = {};
        processed.forEach(tx => {
            if (tx.price.gt(0)) {
                estimatedPrices[tx.ticker] = tx.price.toNumber();
            }
        });
        setPrices(estimatedPrices);
    };

    const handleFileUpload = async (file: File) => {
        setLoading(true);
        setError(null);
        try {
            const { parseCSV } = await import('../utils/finance'); // Dynamic import to avoid circular dep if any, or just standard import
            const rawData = await parseCSV(file);
            processData(rawData);
        } catch (err) {
            setError('Failed to parse CSV. Please check the format.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleFetchPrices = useCallback(async () => {
        setFetchingPrices(true);
        setFetchProgress(0);
        try {
            const tickers = Object.keys(holdings).filter(ticker => holdings[ticker].length > 0);
            const newPrices = await fetchPrices(tickers, (progress) => {
                setFetchProgress(progress);
            });

            // Merge with existing prices, new prices take precedence
            setPrices(prev => ({
                ...prev,
                ...newPrices
            }));
        } catch (err) {
            console.error("Failed to fetch prices", err);
            // Optional: set an error state to show to user
        } finally {
            setFetchingPrices(false);
            setFetchProgress(0);
        }
    }, [holdings]);

    // Auto-fetch prices when holdings are loaded
    useEffect(() => {
        if (Object.keys(holdings).length > 0) {
            handleFetchPrices();
        }
    }, [holdings, handleFetchPrices]);


    const { positions, summary, opportunities, balancingOpportunities } = useMemo(() => {
        const { positions, summary: baseSummary } = calculateUnrealized(holdings, prices);

        // Calculate totals
        let totalRealizedGain = new Decimal(0);
        realizedGains.forEach(g => {
            totalRealizedGain = totalRealizedGain.plus(g.gainLoss);
        });

        // Calculate simulation
        let harvestableLoss = new Decimal(0);
        selectedHarvestTickers.forEach(ticker => {
            const pos = positions[ticker];
            if (pos && pos.unrealizedPL.isNegative()) {
                harvestableLoss = harvestableLoss.plus(pos.unrealizedPL);
            }
        });

        let harvestableGain = new Decimal(0);
        selectedBalancingTickers.forEach(ticker => {
            const pos = positions[ticker];
            if (pos && pos.unrealizedPL.isPositive()) {
                harvestableGain = harvestableGain.plus(pos.unrealizedPL);
            }
        });

        const netGainIfHarvested = totalRealizedGain.plus(harvestableLoss).plus(harvestableGain);

        const fullSummary: PortfolioSummary = {
            ...baseSummary,
            totalRealizedGain,
            netGainIfHarvested,
        };

        const opportunities = findHarvestingOpportunities(positions, transactions);
        const balancingOpportunities = findBalancingOpportunities(positions);

        return { positions, summary: fullSummary, opportunities, balancingOpportunities };
    }, [holdings, prices, realizedGains, transactions, selectedHarvestTickers, selectedBalancingTickers]);

    const toggleHarvest = (ticker: string) => {
        const newSet = new Set(selectedHarvestTickers);
        if (newSet.has(ticker)) {
            newSet.delete(ticker);
        } else {
            newSet.add(ticker);
        }
        setSelectedHarvestTickers(newSet);
    };

    const toggleAllHarvest = (selectAll: boolean) => {
        if (selectAll) {
            const allTickers = opportunities.map(op => op.ticker);
            setSelectedHarvestTickers(new Set(allTickers));
        } else {
            setSelectedHarvestTickers(new Set());
        }
    };

    const toggleBalancing = (ticker: string) => {
        const newSet = new Set(selectedBalancingTickers);
        if (newSet.has(ticker)) {
            newSet.delete(ticker);
        } else {
            newSet.add(ticker);
        }
        setSelectedBalancingTickers(newSet);
    };

    const toggleAllBalancing = (selectAll: boolean) => {
        if (selectAll) {
            const allTickers = balancingOpportunities.map(op => op.ticker);
            setSelectedBalancingTickers(new Set(allTickers));
        } else {
            setSelectedBalancingTickers(new Set());
        }
    };

    const reset = () => {
        setTransactions([]);
        setHoldings({});
        setRealizedGains([]);
        setPrices({});
        setSelectedHarvestTickers(new Set());
        setSelectedBalancingTickers(new Set());
    };

    return {
        transactions,
        holdings,
        prices,
        loading,
        fetchingPrices,
        fetchProgress,
        error,
        positions,
        summary,
        opportunities,
        balancingOpportunities,
        selectedHarvestTickers,
        selectedBalancingTickers,
        handleFileUpload,
        handleFetchPrices,
        toggleHarvest,
        toggleAllHarvest,
        toggleBalancing,
        toggleAllBalancing,
        reset
    };
};
