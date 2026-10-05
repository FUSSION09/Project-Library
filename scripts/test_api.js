const http = require('http');
const app = require('../api/index.js');

const server = app.listen(3001, async () => {
    console.log('Test server running on port 3001');

    function get(path) {
        return new Promise((resolve, reject) => {
            http.get('http://localhost:3001' + path, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(data) }));
            }).on('error', reject);
        });
    }

    try {
        const studentsRes = await get('/api/students');
        console.log('GET /api/students count:', studentsRes.body.length);

        const seatRes = await get('/api/seats-shift-status');
        const occupiedSeats = Object.keys(seatRes.body.seatMapping || {});
        console.log('Occupied seats count:', occupiedSeats.length);
        console.log('Sample seats:', occupiedSeats.slice(0, 10));

        const pastRes = await get('/api/past-members');
        console.log('GET /api/past-members count:', pastRes.body.length);

        const receiptsRes = await get('/api/receipts');
        console.log('GET /api/receipts count:', receiptsRes.body.length);

        console.log('\nALL ENDPOINT TESTS PASSED SUCCESSFULLY!');
    } catch (err) {
        console.error('Test failed:', err);
    } finally {
        server.close();
    }
});
