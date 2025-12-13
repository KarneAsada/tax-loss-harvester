import Papa from 'papaparse';
import { Decimal } from 'decimal.js';
import { Transaction } from '../finance';
import { TransactionParser } from './types';

interface RobinhoodTransaction {
    "Activity Date": string;
    "Process Date": string;
    "Settle Date": string;
    "Instrument": string;
    "Description": string;
    "Trans Code": string;
    "Quantity": string;
    "Price": string;
    "Amount": string;
}

export const RobinhoodParser: TransactionParser = {
    name: 'Robinhood CSV',

    canParse(_file: File, headerRow: string[]): boolean {
        // Check for specific Robinhood columns
        const required = ["Activity Date", "Process Date", "Instrument", "Trans Code"];
        return required.every(col => headerRow.includes(col));
    },

    parse(file: File): Promise<Transaction[]> {
        return new Promise((resolve, reject) => {
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    const rhTransactions = results.data as RobinhoodTransaction[];
                    const transactions = rhTransactions
                        .map(normalizeTransaction)
                        .filter((tx): tx is Transaction => tx !== null);

                    // Sort chronologically
                    transactions.sort((a, b) => a.date.getTime() - b.date.getTime());

                    resolve(transactions);
                },
                error: (error) => {
                    reject(error);
                },
            });
        });
    }
};

const normalizeTransaction = (rhTx: RobinhoodTransaction): Transaction | null => {
    const transCode = rhTx["Trans Code"]?.toUpperCase();

    // Filter out irrelevant codes
    const ignoredCodes = ['CDIV', 'SLIP', 'SPL', 'OEXP', 'BTO', 'STO', 'INT', 'ACH', 'GDBP', 'GMPC', 'GOLD', 'MISC', 'FUTSWP'];
    if (ignoredCodes.includes(transCode) || !transCode) {
        return null;
    }

    let type: 'BUY' | 'SELL' | 'OTHER' = 'OTHER';
    if (transCode === 'BUY') type = 'BUY';
    else if (transCode === 'SELL') type = 'SELL';
    else return null;

    const cleanNumber = (str: string) => {
        if (!str) return new Decimal(0);
        return new Decimal(str.replace(/[$,()]/g, ''));
    };

    const quantity = cleanNumber(rhTx.Quantity);
    const price = cleanNumber(rhTx.Price);
    const amount = cleanNumber(rhTx.Amount);

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
