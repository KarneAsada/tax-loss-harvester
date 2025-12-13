# Tax Loss Harvester

A client-side tool to analyze your stock portfolio for tax loss harvesting opportunities.

## How it Works

1.  **Export Data**: Export your "Positions" CSV from your brokerage account (only Robinhood is currently supported).
2.  **Upload**: Drag and drop the CSV file into the Tax Loss Harvester dashboard.
3.  **Analyze**: The app processes your positions locally and fetching current market prices to identify:
    *   **Harvesting Candidates**: Positions with unrealized losses.
    *   **Balancing Candidates**: Positions with unrealized gains.
4.  **Simulate**: Toggle positions to see how harvesting or balancing would impact your net realized gain/loss for the year.

## Privacy & Security

**Your financial data never leaves your browser.**

*   **Client-Side Processing**: All CSV parsing and data analysis happens entirely within your web browser using JavaScript.
*   **No Database**: We do not store your portfolio data on any server.
*   **API Usage**: The app only communicates with external APIs (like Finnhub) to fetch *anonymous* real-time stock prices. It does not send your holding quantities or account value.

## Contributing

Found a bug or have an idea for improvement?

*   **Open a Pull Request**: Contributions are welcome! 
*   **Report an Issue**: Let us know about any bugs or feature requests on our [GitHub Issues page](https://github.com/KarneAsada/tax-loss-harvester/issues).


