import { Decimal } from 'decimal.js';
import { Transaction } from './finance';

export const DEBUG_TRANSACTIONS: Transaction[] = [
    {
        date: new Date('2023-01-15'),
        ticker: 'AAPL',
        type: 'BUY',
        quantity: new Decimal(10),
        price: new Decimal(150.00),
        amount: new Decimal(-1500.00),
        original: {}
    },
    {
        date: new Date('2023-03-10'),
        ticker: 'GOOGL',
        type: 'BUY',
        quantity: new Decimal(5),
        price: new Decimal(100.00),
        amount: new Decimal(-500.00),
        original: {}
    },
    {
        date: new Date('2023-06-20'),
        ticker: 'TSLA',
        type: 'BUY',
        quantity: new Decimal(20),
        price: new Decimal(250.00),
        amount: new Decimal(-5000.00),
        original: {}
    },
    {
        date: new Date('2023-11-05'),
        ticker: 'MSFT',
        type: 'BUY',
        quantity: new Decimal(15),
        price: new Decimal(300.00),
        amount: new Decimal(-4500.00),
        original: {}
    },
    {
        date: new Date('2023-12-01'),
        ticker: 'AAPL',
        type: 'BUY',
        quantity: new Decimal(5),
        price: new Decimal(180.00),
        amount: new Decimal(-900.00),
        original: {}
    },
    // A recent buy to trigger wash sale warning if we were to sell
    {
        date: new Date(), // Today
        ticker: 'TSLA',
        type: 'BUY',
        quantity: new Decimal(2),
        price: new Decimal(240.00),
        amount: new Decimal(-480.00),
        original: {}
    },
    // Explicit Loss Opportunity (TLH)
    // Buy High
    {
        date: new Date('2023-01-01'),
        ticker: 'TLH_OPP',
        type: 'BUY',
        quantity: new Decimal(10),
        price: new Decimal(100.00),
        amount: new Decimal(-1000.00),
        original: {}
    },
    // Buy Low (Sets Market Price)
    {
        date: new Date(),
        ticker: 'TLH_OPP',
        type: 'BUY',
        quantity: new Decimal(1),
        price: new Decimal(50.00),
        amount: new Decimal(-50.00),
        original: {}
    },
    // Explicit Balancing Opportunity (Gain)
    // Buy Low
    {
        date: new Date('2023-01-01'),
        ticker: 'BAL_OPP',
        type: 'BUY',
        quantity: new Decimal(10),
        price: new Decimal(50.00),
        amount: new Decimal(-500.00),
        original: {}
    },
    // Buy High (Sets Market Price)
    {
        date: new Date(),
        ticker: 'BAL_OPP',
        type: 'BUY',
        quantity: new Decimal(1),
        price: new Decimal(100.00),
        amount: new Decimal(-100.00),
        original: {}
    }
];
