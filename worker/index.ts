export interface Env {
    FINNHUB_CACHE: KVNamespace;
    FINNHUB_API_KEY: string;
    ASSETS: Fetcher;
}

export default {
    async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const _ctx = ctx;
        const url = new URL(request.url);

        // Version endpoint
        if (url.pathname === '/__version') {
            // Read version from package.json
            // In production, this will be bundled; in dev, it will be read from disk
            const version = await import('../package.json').then(m => m.default.version);

            return new Response(JSON.stringify({
                version,
                timestamp: new Date().toISOString(),
            }), {
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // API Route for prices
        if (url.pathname.startsWith('/api/price')) {
            try {
                return await handlePriceRequest(request, env);
            } catch (e: unknown) {
                const errorMessage = e instanceof Error ? e.message : String(e);
                const errorStack = e instanceof Error ? e.stack : '';
                return new Response(`Worker Error: ${errorMessage}\n${errorStack}`, { status: 500 });
            }
        }

        // Serve Static Assets (React App)
        try {
            return await env.ASSETS.fetch(request);
        } catch (e: unknown) {
            const errorMessage = e instanceof Error ? e.message : String(e);
            return new Response(`Asset Error: ${errorMessage}`, { status: 500 });
        }
    },
};

async function handlePriceRequest(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const symbol = url.searchParams.get('symbol');

    if (!symbol) {
        console.error('Price lookup failed: Missing symbol parameter');
        return new Response('Missing symbol parameter', { status: 400 });
    }

    // 1. Check Cache
    const cachedPrice = await env.FINNHUB_CACHE.get(symbol);
    if (cachedPrice) {
        console.log(`Price lookup [CACHE]: ${symbol} = ${cachedPrice}`);
        return new Response(JSON.stringify({ price: parseFloat(cachedPrice), source: 'cache' }), {
            headers: { 'Content-Type': 'application/json' },
        });
    }

    // 2. Rate Limiting
    const currentMinute = Math.floor(Date.now() / 60000);
    const rateLimitKey = `ratelimit:${currentMinute}`;

    const rateLimitCountStr = await env.FINNHUB_CACHE.get(rateLimitKey);
    const rateLimitCount = rateLimitCountStr ? parseInt(rateLimitCountStr) : 0;

    if (rateLimitCount >= 60) {
        console.warn(`Price lookup [RATE LIMIT]: ${symbol} failed due to rate limiting`);
        return new Response('Rate limit exceeded', { status: 429 });
    }

    // Increment (optimistic)
    await env.FINNHUB_CACHE.put(rateLimitKey, (rateLimitCount + 1).toString(), { expirationTtl: 120 });


    // 3. Fetch from Finnhub
    console.log(`Price lookup [FETCH]: Fetching ${symbol} from Finnhub...`);
    const finnhubUrl = `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${env.FINNHUB_API_KEY}`;
    const response = await fetch(finnhubUrl);

    if (!response.ok) {
        console.error(`Price lookup [ERROR]: Finnhub error for ${symbol}: ${response.statusText}`);
        return new Response(`Finnhub error: ${response.statusText}`, { status: response.status });
    }

    const data = await response.json() as { c?: number, [key: string]: unknown };

    if (data.c) {
        console.log(`Price lookup [SUCCESS]: ${symbol} = ${data.c}`);
        // 4. Cache Result (24h)
        await env.FINNHUB_CACHE.put(symbol, data.c.toString(), { expirationTtl: 86400 });

        return new Response(JSON.stringify({ price: data.c, source: 'finnhub' }), {
            headers: { 'Content-Type': 'application/json' },
        });
    } else {
        console.warn(`Price lookup [NO DATA]: Finnhub returned no price for ${symbol}`, data);
        return new Response(JSON.stringify(data), {
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
