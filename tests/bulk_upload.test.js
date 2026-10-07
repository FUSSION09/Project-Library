const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const xlsx = require('xlsx');
const {
    setupTestEnvironment,
    teardownTestEnvironment,
    apiRequest
} = require('./helpers/test_server.js');

describe('Excel Bulk Upload API Suite (/api/students/bulk-upload)', () => {
    before(async () => {
        await setupTestEnvironment();
    });

    after(async () => {
        await teardownTestEnvironment();
    });

    it('should reject bulk upload if no file is attached', async () => {
        const res = await apiRequest('/api/students/bulk-upload', {
            method: 'POST'
        });

        assert.strictEqual(res.status, 400);
        assert.strictEqual(res.body.success, false);
        assert.match(res.body.message, /No file uploaded/i);
    });

    it('should successfully parse Excel file and import students in bulk', async () => {
        // Create an in-memory workbook with XLSX
        const rows = [
            {
                'Seat No': 'D1',
                'Name of Student': 'Bulk Student Alpha',
                'Shift': '12 Hours',
                'Mobile No': '9898000001',
                'Adhar Number': '111122223333',
                'Joining Date': '2026-10-06',
                'Plan': 'Monthly',
                'Card no.': 'CRD-D1',
                'Fee': 1400,
                'Mode': 'Cash',
                'Last Payment Date': '2026-10-06',
                'Due Date': '2026-11-06',
                'Remarks': 'Imported via bulk test'
            },
            {
                'Seat No': 'D2',
                'Name of Student': 'Bulk Student Beta',
                'Shift': '6 Hours',
                'Mobile No': '9898000002',
                'Adhar Number': '444455556666',
                'Joining Date': '2026-10-06',
                'Plan': 'Monthly',
                'Card no.': 'CRD-D2',
                'Fee': 900,
                'Mode': 'UPI',
                'Last Payment Date': '2026-10-06',
                'Due Date': '2026-11-06',
                'Remarks': 'Imported via bulk test'
            }
        ];

        const workbook = xlsx.utils.book_new();
        const worksheet = xlsx.utils.json_to_sheet(rows);
        xlsx.utils.book_append_sheet(workbook, worksheet, 'Students');
        const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

        // Use global FormData and Blob in Node
        const formData = new FormData();
        formData.append('excel', new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), 'test_students.xlsx');

        const res = await apiRequest('/api/students/bulk-upload', {
            method: 'POST',
            body: formData
        });

        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.body.success, true);
        assert.strictEqual(res.body.count, 2);

        // Verify imported students appear in students list
        const listRes = await apiRequest('/api/students');
        const alpha = listRes.body.find(s => s.mobile === '9898000001');
        const beta = listRes.body.find(s => s.mobile === '9898000002');

        assert.ok(alpha);
        assert.strictEqual(alpha.name, 'Bulk Student Alpha');
        assert.strictEqual(alpha.seatNo, 'D1');
        assert.strictEqual(alpha.fee, 1400);

        assert.ok(beta);
        assert.strictEqual(beta.name, 'Bulk Student Beta');
        assert.strictEqual(beta.seatNo, 'D2');
        assert.strictEqual(beta.fee, 900);
    });
});
