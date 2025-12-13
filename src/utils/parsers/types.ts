import { Transaction } from '../finance';

export interface TransactionParser {
    name: string;
    canParse(file: File, headerRow: string[]): boolean;
    parse(file: File): Promise<Transaction[]>;
}
