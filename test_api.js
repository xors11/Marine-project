const http = require('http');
http.get('http://localhost:5000/api/fisheries?region=Indian+Ocean&simulate=true', (res) => {
    let rawData = '';
    res.on('data', (chunk) => { rawData += chunk; });
    res.on('end', () => {
        try {
            console.log(rawData);
        } catch (e) {
            console.error(e.message);
        }
    });
});
