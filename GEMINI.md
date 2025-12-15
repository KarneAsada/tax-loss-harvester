# Project GEMINI

## Contribution Guidelines

### Setup
1.  **Install Dependencies**:
    ```bash
    npm install
    ```
    Ensure you are using the Node.js version specified in `.nvmrc` or `package.json` (engines).

2.  **Environment Setup**:
    -   Create a `.env` file in the root directory:
        ```bash
        cp .env.example .env # If an example exists, or create new
        ```
    -   Add your Finnhub API key:
        ```
        FINNHUB_API_KEY=your_api_key_here
        ```
    -   **For Local Worker Development (`wrangler dev`)**:
        -   Create a `.dev.vars` file (required for Cloudflare Workers secrets locally).
        -   Add the same key:
            ```
            FINNHUB_API_KEY=your_api_key_here
            ```

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

1.  **Worktrees & Branching**:
    -   **CRITICAL**: You MUST use `git worktree` for each new conversation or task to isolate your environment.
    -   Create a new worktree for the task: `git worktree add -b <branch-name> ../<folder-name> <base-branch>`.
    -   Use descriptive branch names (e.g., `feat/add-login`, `fix/header-styling`).
    -   NEVER work directly on `main` or in the main worktree for feature work.

2.  **Pull Requests**:
    -   Open a Pull Request (PR) when your changes are complete.
    -   Push the branch and use the GitHub CLI or web interface to create the PR.
    -   Return a link to the PR in the chat.


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
