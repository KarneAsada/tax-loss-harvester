const http = require('http');

const options = {
    hostname: 'localhost',
    port: 5173,
    path: '/api/yahoo/v7/finance/quote?symbols=AAPL',
    method: 'GET',
};

const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        try {
            const parsed = JSON.parse(data);
            const result = parsed.quoteResponse?.result?.[0];
            if (result && result.symbol === 'AAPL' && result.regularMarketPrice) {
                console.log('SUCCESS: Fetched AAPL price:', result.regularMarketPrice);
                process.exit(0);
            } else {
                console.error('FAILURE: Unexpected response structure:', data.substring(0, 200));
                process.exit(1);
            }
        } catch (e) {
            console.error('FAILURE: Could not parse JSON:', e.message);
            console.error('Raw Data:', data.substring(0, 200));
            process.exit(1);
        }
    });
});

req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
    process.exit(1);
});

req.end();
