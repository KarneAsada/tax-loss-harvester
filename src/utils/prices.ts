const CACHE_KEY = 'tax_loss_harvester_prices';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
const PROXY_URL = '/api/price'; // Relative path for same-origin

interface CachedPrice {
    price: number;
    timestamp: number;
}

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const fetchWithRetry = async (url: string, retries = 10, backoff = 1000): Promise<Response> => {
    try {
        const response = await fetch(url);

        if (response.status === 429) {
            if (retries === 0) throw new Error('Max retries exceeded for rate limit');
            console.warn(`Rate limited. Retrying in ${backoff}ms...`);
            await wait(backoff);
            return fetchWithRetry(url, retries - 1, backoff * 2);
        }

        return response;
    } catch (error) {
        if (retries === 0) throw error;
        // If it's a network error, we might also want to retry, but requirement specifically mentioned 429.
        // However, for robustness, let's retry on fetch failures too if needed, but strict reading of req says "If the rate limit is breached... retry".
        // So I'll stick to 429 handling primarily, but standard fetch retry is good practice.
        // For now, I'll just rethrow if it's not 429-related logic or if fetch throws (network error).
        throw error;
    }
};

export const fetchPrices = async (
    tickers: string[],
    onProgress?: (progress: number) => void
): Promise<Record<string, number>> => {
    if (tickers.length === 0) return {};

    const prices: Record<string, number> = {};
    const now = Date.now();

    // Load cache
    let cache: Record<string, CachedPrice> = {};
    try {
        const cachedData = localStorage.getItem(CACHE_KEY);
        if (cachedData) {
            cache = JSON.parse(cachedData);
        }
    } catch (e) {
        console.warn('Failed to parse price cache', e);
    }

    // Identify missing or expired tickers
    const tickersToFetch: string[] = [];
    const uniqueTickers = Array.from(new Set(tickers));

    uniqueTickers.forEach(ticker => {
        const cached = cache[ticker];
        if (cached && (now - cached.timestamp < CACHE_DURATION)) {
            prices[ticker] = cached.price;
        } else {
            tickersToFetch.push(ticker);
        }
    });

    if (tickersToFetch.length === 0) {
        if (onProgress) onProgress(100);
        return prices;
    }

    // Fetch missing tickers
    // We fetch one by one because our proxy takes a single symbol
    // To speed it up, we could run in parallel, but we need to be careful about our own rate limit (60/min).
    // If we blast 100 requests, we'll hit the limit immediately.
    // The proxy enforces 60/min.
    // So we should throttle our requests to avoid hitting the 429s constantly, 
    // OR just rely on the retry logic.
    // Relying on retry logic with exponential backoff is what was asked.

    // However, if we have 100 tickers, and we fire them all, the first 60 might succeed (if the proxy allows bursts, but my implementation uses a simple counter).
    // My proxy implementation: `if (rateLimitCount >= 60) return 429`.
    // So if I send 100 requests in parallel, 60 will pass, 40 will fail with 429.
    // Then those 40 will retry after 1s, 2s, 4s...
    // This seems acceptable per requirements.

    let completed = 0;
    const total = tickersToFetch.length;

    // We can use a concurrency limit to be nice, but let's just use `Promise.all` with the retry logic handling the backpressure.
    // Actually, `Promise.all` might be too aggressive if we have THOUSANDS.
    // Let's do chunks of 10 to be reasonable.

    const chunkSize = 10;
    for (let i = 0; i < tickersToFetch.length; i += chunkSize) {
        const chunk = tickersToFetch.slice(i, i + chunkSize);

        await Promise.all(chunk.map(async (symbol) => {
            try {
                const response = await fetchWithRetry(`${PROXY_URL}/?symbol=${symbol}`);
                if (!response.ok) {
                    console.error(`Failed to fetch price for ${symbol}: ${response.statusText}`);
                    return;
                }

                const data = await response.json();
                if (data.price) {
                    prices[symbol] = data.price;
                    // Update cache
                    cache[symbol] = {
                        price: data.price,
                        timestamp: now
                    };
                }
            } catch (e) {
                console.error(`Error fetching price for ${symbol}`, e);
            } finally {
                completed++;
                if (onProgress) onProgress(Math.round((completed / total) * 100));
            }
        }));
    }

    // Save updated cache
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch (e) {
        console.warn('Failed to save price cache', e);
    }

    return prices;
};
