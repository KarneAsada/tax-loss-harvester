# Project GEMINI

## Contribution Guidelines

### Setup
1.  **Install Dependencies**:
    ```bash
    npm install
    ```
    Ensure you are using the Node.js version specified in `.nvmrc` or `package.json` (engines).

### Development
1.  **Start Local Server**:
    ```bash
    npm run dev
    ```
    This will start the Vite development server.

2.  **Linting**:
    ```bash
    npm run lint
    ```
    Run this before committing to ensure code quality.

### Workflow

1.  **Branching**:
    -   Create a new branch for every task or feature.
    -   Use descriptive branch names (e.g., `feat/add-login`, `fix/header-styling`).

2.  **Pull Requests**:
    -   Open a Pull Request (PR) when your changes are complete.
    -   Ensure all checks pass before merging.
    -   Squash and merge is preferred to keep the history clean.


### Debug Route
The application includes a debug route to test the UI with populated mock data without needing to upload a file.

1.  **Accessing the Debug Route**:
    Navigate to `/#/debug` (e.g., `http://localhost:5173/#/debug`).
    
    > **Note**: This route loads the `PortfolioDashboard` with `DEBUG_TRANSACTIONS` data, bypassing the file upload screen.

2.  **Usage**:
    -   Use this route to verify UI changes in the Dashboard, Harvesting Table, and Holdings Table.
    -   It is useful for visual regression testing and ensuring components render correctly with sample data.

## Deployment

The project is deployed using Cloudflare Wrangler.

1.  **Build & Deploy**:
    ```bash
    npm run deploy
    ```
    This script runs `tsc` (TypeScript compiler) and `vite build` to generate the production assets in `dist/`, then deploys them using `wrangler deploy`.

2.  **Configuration**:
    -   Deployment settings are in `wrangler.toml`.
    -   The app is configured to deploy to `harvester.v.ibe.dev`.
    -   It uses a KV namespace `FINNHUB_CACHE` and environment variables like `FINNHUB_API_KEY`.
