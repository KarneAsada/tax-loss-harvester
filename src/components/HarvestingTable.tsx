import React from 'react';
import { HarvestOpportunity } from '../utils/finance';
import { AlertTriangle } from 'lucide-react';

interface HarvestingTableProps {
    opportunities: HarvestOpportunity[];
    onToggleSale: (ticker: string) => void;
    onToggleAll: (selectAll: boolean) => void;
    selectedTickers: Set<string>;
}

import { formatCurrency } from '../utils/format';

export const HarvestingTable: React.FC<HarvestingTableProps> = ({ opportunities, onToggleSale, onToggleAll, selectedTickers }) => {
    const allSelected = opportunities.length > 0 && selectedTickers.size === opportunities.length;
    const someSelected = selectedTickers.size > 0 && selectedTickers.size < opportunities.length;

    return (
        <div className="flex flex-col">
            <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
                    <div className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-secondary-50">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        <input
                                            type="checkbox"
                                            checked={allSelected}
                                            ref={input => { if (input) input.indeterminate = someSelected; }}
                                            onChange={(e) => onToggleAll(e.target.checked)}
                                            className="focus:ring-primary-500 h-4 w-4 text-primary-600 border-gray-300 rounded"
                                        />
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Ticker
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Unrealized Loss
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Market Value (Proceeds)
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Wash Sale Risk
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {opportunities.map((opp) => (
                                    <tr key={opp.ticker} className={selectedTickers.has(opp.ticker) ? 'bg-primary-50' : 'hover:bg-gray-50 transition-colors'}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <input
                                                type="checkbox"
                                                checked={selectedTickers.has(opp.ticker)}
                                                onChange={() => onToggleSale(opp.ticker)}
                                                className="focus:ring-primary-500 h-4 w-4 text-primary-600 border-gray-300 rounded"
                                            />
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {opp.ticker}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 text-right font-medium">
                                            {formatCurrency(opp.unrealizedPL)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                                            {formatCurrency(opp.marketValue)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {opp.washSaleWarning && (
                                                <div className="flex items-center text-yellow-600">
                                                    <AlertTriangle className="w-4 h-4 mr-1" />
                                                    <span>Recent Buy ({opp.recentBuyDate?.toLocaleDateString()})</span>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};
