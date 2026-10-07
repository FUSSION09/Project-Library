const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const {
    setupTestEnvironment,
    teardownTestEnvironment,
    apiRequest
} = require('./helpers/test_server.js');

describe('Student Self-Registration and Approval Workflow API Suite', () => {
    before(async () => {
        await setupTestEnvironment();
    });

    after(async () => {
        await teardownTestEnvironment();
    });

    let pendingApplicantId = null;

    it('should allow a prospective student to submit registration via /api/register', async () => {
        const registrationData = {
            name: 'Pooja Sharma',
            mobile: '9871122334',
            shift: '6 Hours',
            seatNo: 'B5',
            aadhar: '998877665544',
            joiningDate: '2026-10-06',
            plan: 'Monthly',
            fee: 1000,
            mode: 'UPI',
            lastPaid: '2026-10-06',
            dueDate: '2026-11-06',
            remarks: 'Prefers morning quiet study'
        };

        const res = await apiRequest('/api/register', {
            method: 'POST',
            body: registrationData
        });

        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.body.success, true);
        assert.strictEqual(res.body.message, 'Registration submitted successfully!');
    });

    it('should reject registration when student name is missing', async () => {
        const res = await apiRequest('/api/register', {
            method: 'POST',
            body: { mobile: '9871122334', shift: '6 Hours' }
        });

        assert.strictEqual(res.status, 400);
        assert.strictEqual(res.body.success, false);
        assert.match(res.body.error, /name is required/i);
    });

    it('should reject registration when mobile number is invalid or too short', async () => {
        const res = await apiRequest('/api/register', {
            method: 'POST',
            body: { name: 'Valid Name', mobile: '9999' }
        });

        assert.strictEqual(res.status, 400);
        assert.strictEqual(res.body.success, false);
        assert.match(res.body.error, /mobile number is required/i);
    });

    it('should list submitted applications via /api/pending-registrations', async () => {
        const res = await apiRequest('/api/pending-registrations');

        assert.strictEqual(res.status, 200);
        assert.ok(Array.isArray(res.body));
        assert.ok(res.body.length >= 1);

        const applicant = res.body.find(p => p.mobile === '9871122334');
        assert.ok(applicant);
        assert.strictEqual(applicant.name, 'Pooja Sharma');
        assert.strictEqual(applicant.seatNo, 'B5');
        assert.strictEqual(applicant.fee, 1000);
        pendingApplicantId = applicant.id;
    });

    it('should approve pending registration, create active student, and issue receipt', async () => {
        assert.ok(pendingApplicantId);

        const approveRes = await apiRequest(`/api/approve-registration/${pendingApplicantId}`, {
            method: 'POST'
        });

        assert.strictEqual(approveRes.status, 200);
        assert.strictEqual(approveRes.body.success, true);
        assert.strictEqual(approveRes.body.message, 'Student approved successfully');

        // Verify applicant removed from pending list
        const pendingRes = await apiRequest('/api/pending-registrations');
        const foundPending = pendingRes.body.find(p => String(p.id) === String(pendingApplicantId));
        assert.strictEqual(foundPending, undefined);

        // Verify applicant added to active students
        const studentsRes = await apiRequest('/api/students');
        const approvedStudent = studentsRes.body.find(s => s.mobile === '9871122334');
        assert.ok(approvedStudent);
        assert.strictEqual(approvedStudent.name, 'Pooja Sharma');
        assert.strictEqual(approvedStudent.seatNo, 'B5');

        // Verify receipt created
        const receiptsRes = await apiRequest('/api/receipts');
        const receipt = receiptsRes.body.find(r => r.student_name === 'Pooja Sharma');
        assert.ok(receipt);
        assert.strictEqual(receipt.fee, 1000);
        assert.strictEqual(receipt.seat_no, 'B5');
    });

    it('should return 404 when approving non-existent pending registration', async () => {
        const res = await apiRequest('/api/approve-registration/999999999', {
            method: 'POST'
        });

        assert.strictEqual(res.status, 404);
        assert.strictEqual(res.body.success, false);
    });

    it('should allow admin to reject and remove a pending registration', async () => {
        // Register another applicant to test rejection
        await apiRequest('/api/register', {
            method: 'POST',
            body: {
                name: 'Reject Me',
                mobile: '9111111111',
                shift: '12 Hours',
                fee: 1500
            }
        });

        const pendingRes = await apiRequest('/api/pending-registrations');
        const toReject = pendingRes.body.find(p => p.mobile === '9111111111');
        assert.ok(toReject);

        const deleteRes = await apiRequest(`/api/pending-registrations/${toReject.id}`, {
            method: 'DELETE'
        });

        assert.strictEqual(deleteRes.status, 200);
        assert.strictEqual(deleteRes.body.success, true);

        // Verify removed
        const finalPendingRes = await apiRequest('/api/pending-registrations');
        const stillExists = finalPendingRes.body.find(p => p.mobile === '9111111111');
        assert.strictEqual(stillExists, undefined);
    });
});
