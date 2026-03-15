const axios = require('axios');
const https = require('https');

async function test() {
    const url = "https://marine-api.open-meteo.com/v1/marine?latitude=-2&longitude=81&hourly=wave_height&past_days=1&forecast_days=1";

    try {
        console.log('Testing default axios...');
        await axios.get(url, { timeout: 3000 });
        console.log('Default: Success!');
    } catch (e) { console.log('Default error:', e.message); }

    try {
        console.log('\nTesting axios with custom httpsAgent (family: 4)...');
        const agent = new https.Agent({ family: 4 });
        await axios.get(url, { httpsAgent: agent, timeout: 5000 });
        console.log('Agent: Success!');
    } catch (e) { console.log('Agent error:', e.message); }

    try {
        console.log('\nTesting axios with User-Agent...');
        await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 5000 });
        console.log('UA: Success!');
    } catch (e) { console.log('UA error:', e.message); }
}

test();
