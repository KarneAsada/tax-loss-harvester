import React, { useCallback } from 'react';
import { Upload } from 'lucide-react';

interface FileUploadProps {
    onUpload: (file: File) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onUpload }) => {
    const handleDrop = useCallback(
        (e: React.DragEvent<HTMLDivElement>) => {
            e.preventDefault();
            e.stopPropagation();
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                onUpload(e.dataTransfer.files[0]);
            }
        },
        [onUpload]
    );

    const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            if (e.target.files && e.target.files[0]) {
                onUpload(e.target.files[0]);
            }
        },
        [onUpload]
    );

    return (
        <div className="space-y-8">
            {/* App Purpose Section */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center mb-4">
                    <span className="text-2xl mr-3">🌾</span>
                    <h2 className="text-xl font-semibold text-gray-900">Optimize Your Portfolio Taxes</h2>
                </div>
                <p className="text-gray-600 mb-4">
                    This tool helps you analyze your Robinhood portfolio to find tax-saving opportunities.
                </p>
                <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-primary-50 p-4 rounded-md border border-primary-100">
                        <h3 className="font-medium text-primary-900 mb-1">💰 Tax Loss Harvesting</h3>
                        <p className="text-sm text-primary-800">
                            Identify positions with unrealized losses to offset gains and reduce your tax bill.
                        </p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-md border border-green-100">
                        <h3 className="font-medium text-green-900 mb-1">⚖️ Stock Balancing</h3>
                        <p className="text-sm text-green-800">
                            Find opportunities to rebalance your portfolio by realizing gains strategically.
                        </p>
                    </div>
                </div>
                <div className="mt-4 flex items-center text-xs text-gray-500 bg-gray-50 p-2 rounded">
                    <span className="mr-2">🔒</span>
                    <span><strong>Privacy First:</strong> Your data is processed entirely in your browser and never uploaded to our servers.</span>
                </div>
            </div>

            <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-primary-500 hover:bg-primary-50 transition-all cursor-pointer bg-white"
            >
                <input
                    type="file"
                    accept=".csv"
                    onChange={handleChange}
                    className="hidden"
                    id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
                    <Upload className="w-12 h-12 text-gray-400 mb-4" />
                    <p className="text-lg font-medium text-gray-700">
                        Drop your Robinhood CSV here
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                        or click to select file
                    </p>
                </label>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 mb-4">How to use</h3>
                <ol className="list-decimal list-inside space-y-2 text-gray-600">
                    <li>
                        <strong>Export your data from Robinhood:</strong>
                        <ul className="list-disc list-inside ml-6 mt-1 text-sm">
                            <li>Go to <strong>Account</strong> → <strong>Reports and statements</strong></li>
                            <li>Generate a report from the beginning of your account to today.</li>
                            <li>Download the CSV file.</li>
                        </ul>
                    </li>
                    <li>Upload the CSV file above.</li>
                    <li>The app will calculate your realized/unrealized gains and identify tax-loss harvesting opportunities.</li>
                </ol>
                <p className="mt-4 text-sm text-gray-500 italic">
                    Note: This tool runs entirely in your browser. Your financial data is never uploaded to any server. A proxy server is used to fetch stock prices.
                </p>
            </div>
        </div>
    );
};
