import http from 'http';
import fs from 'fs';

http.get('http://localhost:4000/api/categories', (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        fs.writeFileSync('api_response.json', data);
        console.log('Response saved to api_response.json');
    });
}).on('error', (err) => {
    console.error('Fetch failed:', err);
});
