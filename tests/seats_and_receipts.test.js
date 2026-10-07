const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const {
    setupTestEnvironment,
    teardownTestEnvironment,
    apiRequest,
    initialFixtureStudents,
    initialFixturePastMembers
} = require('./helpers/test_server.js');

describe('Seats, Receipts, and Past Members API Suite', () => {
    before(async () => {
        await setupTestEnvironment();
    });

    after(async () => {
        await teardownTestEnvironment();
    });

    describe('Live Seat Shift Status (/api/seats-shift-status)', () => {
        it('should return real-time seat assignment mappings', async () => {
            const res = await apiRequest('/api/seats-shift-status');

            assert.strictEqual(res.status, 200);
            assert.ok(res.body.seatMapping);
            const mapping = res.body.seatMapping;

            // Student 1 is on A1
            assert.ok(mapping['A1']);
            assert.strictEqual(mapping['A1'].occupied, true);
            assert.strictEqual(mapping['A1'].studentName, initialFixtureStudents[0].name);
            assert.strictEqual(mapping['A1'].shift, initialFixtureStudents[0].shift);
            assert.strictEqual(mapping['A1'].studentId, initialFixtureStudents[0].id);

            // Student 2 is on B2
            assert.ok(mapping['B2']);
            assert.strictEqual(mapping['B2'].occupied, true);
            assert.strictEqual(mapping['B2'].studentName, initialFixtureStudents[1].name);
        });
    });

    describe('Receipts API (/api/receipts)', () => {
        it('should return initial receipts list generated from active members', async () => {
            const res = await apiRequest('/api/receipts');

            assert.strictEqual(res.status, 200);
            assert.ok(Array.isArray(res.body));
            assert.ok(res.body.length >= 2);

            const receipt = res.body[0];
            assert.ok(receipt.receipt_no);
            assert.ok(receipt.student_name);
            assert.ok(typeof receipt.fee === 'number');
            assert.ok(receipt.mode);
        });

        it('should save a manual receipt record via POST /api/receipts', async () => {
            const manualReceipt = {
                student_id: 101,
                receipt_no: 'REC-MANUAL-001',
                student_name: 'Test Student One',
                seat_no: 'A1',
                fee: 1500,
                mode: 'UPI',
                plan: 'Monthly',
                payment_date: '2026-10-06'
            };

            const res = await apiRequest('/api/receipts', {
                method: 'POST',
                body: manualReceipt
            });

            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.success, true);
            assert.strictEqual(res.body.message, 'Receipt saved successfully');

            // Verify in list
            const listRes = await apiRequest('/api/receipts');
            const found = listRes.body.find(r => r.receipt_no === 'REC-MANUAL-001');
            assert.ok(found);
            assert.strictEqual(found.fee, 1500);
            assert.strictEqual(found.student_name, 'Test Student One');
        });
    });

    describe('Past Members API (/api/past-members)', () => {
        it('should return list of archived members with 200 status', async () => {
            const res = await apiRequest('/api/past-members');

            assert.strictEqual(res.status, 200);
            assert.ok(Array.isArray(res.body));
            assert.strictEqual(res.body.length, initialFixturePastMembers.length);

            const member = res.body[0];
            assert.strictEqual(member.id, initialFixturePastMembers[0].id);
            assert.strictEqual(member.name, initialFixturePastMembers[0].name);
            assert.strictEqual(member.seatNo, initialFixturePastMembers[0].seatNo);
        });
    });
});
