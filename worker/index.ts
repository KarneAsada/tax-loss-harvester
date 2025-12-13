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
        return new Response('Missing symbol parameter', { status: 400 });
    }

    // 1. Check Cache
    const cachedPrice = await env.FINNHUB_CACHE.get(symbol);
    if (cachedPrice) {
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
        return new Response('Rate limit exceeded', { status: 429 });
    }

    // Increment (optimistic)
    await env.FINNHUB_CACHE.put(rateLimitKey, (rateLimitCount + 1).toString(), { expirationTtl: 120 });


    // 3. Fetch from Finnhub
    const finnhubUrl = `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${env.FINNHUB_API_KEY}`;
    const response = await fetch(finnhubUrl);

    if (!response.ok) {
        return new Response(`Finnhub error: ${response.statusText}`, { status: response.status });
    }

    const data = await response.json() as { c?: number, [key: string]: unknown };

    if (data.c) {
        // 4. Cache Result (24h)
        await env.FINNHUB_CACHE.put(symbol, data.c.toString(), { expirationTtl: 86400 });

        return new Response(JSON.stringify({ price: data.c, source: 'finnhub' }), {
            headers: { 'Content-Type': 'application/json' },
        });
    } else {
        return new Response(JSON.stringify(data), {
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
