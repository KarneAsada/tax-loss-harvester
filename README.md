# Tax Loss Harvester

A client-side tool to analyze your stock portfolio for tax loss harvesting opportunities.

## Installation & Setup

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/KarneAsada/tax-loss-harvester.git
    cd tax-loss-harvester
    ```

2.  **Install Dependencies**:
    ```bash
    npm install
    ```

3.  **Configure Environment**:
    -   Get a free API key from [Finnhub](https://finnhub.io/).
    -   Create a `.env` file in the root directory:
        ```bash
        echo "FINNHUB_API_KEY=your_actual_api_key" > .env
        ```
    -   **Important**: For local Cloudflare Worker development (`npm run preview`), also create `.dev.vars`:
        ```bash
        echo "FINNHUB_API_KEY=your_actual_api_key" > .dev.vars
        ```

4.  **Run Locally**:
    ```bash
    npm run dev
    ```

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

## Versioning & Deployment

### Automatic Releases

Every merge to the `main` branch automatically:
- Deploys to staging (`https://harvester.stage.v.ibe.dev`)
- Bumps the patch version in `package.json`
- Creates a git tag (e.g., `v1.2.3`)
- Generates a GitHub release with changelog

### Checking Deployed Versions

To check which version is deployed in each environment:

**Staging:**
```bash
curl https://harvester.stage.v.ibe.dev/__version
```

**Production:**
```bash
curl https://harvester.v.ibe.dev/__version
```

### Comparing Environments

To compare staging vs production versions, run the "Compare Versions" workflow in GitHub Actions:
1. Go to the Actions tab
2. Select "Compare Versions"
3. Click "Run workflow"

The workflow will display which version is deployed in each environment and whether they're in sync.

### Promoting to Production

Production deployments are manual. To promote staging to production:
1. Go to the Actions tab
2. Select "Promote to Production"
3. Click "Run workflow"

### Reverting Production

If a production deployment needs to be rolled back:
1. Go to the Actions tab
2. Select "Revert Promotion"
3. Click "Run workflow"
4. (Optional) Enter a specific version tag to revert to. If left blank, it will automatically revert to the version immediately preceding the current production version.

## Contributing

Found a bug or have an idea for improvement?

*   **Open a Pull Request**: Contributions are welcome! 
*   **Report an Issue**: Let us know about any bugs or feature requests on our [GitHub Issues page](https://github.com/KarneAsada/tax-loss-harvester/issues).


