import React from 'react';
import { PortfolioSummary } from '../utils/finance';
import { Decimal } from 'decimal.js';

interface DashboardProps {
    summary: PortfolioSummary;
}

import { formatCurrency } from '../utils/format';

const Card: React.FC<{ title: string; value: Decimal; isCurrency?: boolean; color?: string }> = ({
    title,
    value,
    isCurrency = true,
    color = 'text-gray-900',
}) => (
    <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
            <dd className={`mt-1 text-3xl font-semibold tracking-tight ${color}`}>
                {isCurrency ? formatCurrency(value) : value.toString()}
            </dd>
        </div>
    </div>
);

export const Dashboard: React.FC<DashboardProps> = ({ summary }) => {
    return (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <Card
                title="Total Realized Gain"
                value={summary.totalRealizedGain}
                color={summary.totalRealizedGain.gte(0) ? 'text-primary-600' : 'text-red-600'}
            />
            <Card
                title="Total Unrealized Gain"
                value={summary.totalUnrealizedGain}
                color="text-primary-600"
            />
            <Card
                title="Total Unrealized Loss"
                value={summary.totalUnrealizedLoss}
                color="text-red-600"
            />
            <Card
                title="Net Unrealized P/L"
                value={summary.netUnrealizedPL}
                color={summary.netUnrealizedPL.gte(0) ? 'text-primary-600' : 'text-red-600'}
            />
            <Card
                title="Max Harvestable Loss"
                value={summary.maxHarvestableLoss}
                color="text-red-600"
            />
            <Card
                title="Net Gain If Harvested"
                value={summary.netGainIfHarvested}
                color={summary.netGainIfHarvested.gte(0) ? 'text-primary-600' : 'text-red-600'}
            />
        </div>
    );
};
