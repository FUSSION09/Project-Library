const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const {
    setupTestEnvironment,
    teardownTestEnvironment,
    apiRequest,
    initialFixtureStudents
} = require('./helpers/test_server.js');

describe('Students Management API Suite', () => {
    before(async () => {
        await setupTestEnvironment();
    });

    after(async () => {
        await teardownTestEnvironment();
    });

    describe('Fetch Students (/api/students)', () => {
        it('should return the active student list with 200 status', async () => {
            const res = await apiRequest('/api/students');

            assert.strictEqual(res.status, 200);
            assert.ok(Array.isArray(res.body));
            assert.strictEqual(res.body.length, initialFixtureStudents.length);

            const student = res.body[0];
            assert.ok(student.id);
            assert.ok(student.name);
            assert.ok(student.mobile);
            assert.ok(student.seatNo);
            assert.ok(student.shift);
        });
    });

    describe('Create Student (/api/students)', () => {
        it('should create a new student and auto-generate initial receipt', async () => {
            const newStudentPayload = {
                name: 'Anil Kumar',
                mobile: '9811223344',
                shift: '12 Hours',
                seatNo: 'C4',
                cardNo: 'CRD-999',
                fee: 1400,
                mode: 'UPI',
                plan: 'Monthly',
                joiningDate: '2026-10-05',
                lastPaid: '2026-10-05',
                dueDate: '2026-11-05',
                remarks: 'New enrollment',
                password: 'CustomPass@2026'
            };

            const res = await apiRequest('/api/students', {
                method: 'POST',
                body: newStudentPayload
            });

            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.success, true);
            assert.ok(res.body.id);
            const createdId = res.body.id;

            // Verify in active list
            const listRes = await apiRequest('/api/students');
            const found = listRes.body.find(s => s.id === createdId);
            assert.ok(found);
            assert.strictEqual(found.name, 'Anil Kumar');
            assert.strictEqual(found.seatNo, 'C4');
            assert.strictEqual(found.fee, 1400);

            // Verify receipt was generated
            const receiptsRes = await apiRequest('/api/receipts');
            const receipt = receiptsRes.body.find(r => r.student_id === createdId);
            assert.ok(receipt);
            assert.strictEqual(receipt.student_name, 'Anil Kumar');
            assert.strictEqual(receipt.fee, 1400);
            assert.match(receipt.receipt_no, /^REC-/);
        });

        it('should reject creation when student name is missing', async () => {
            const res = await apiRequest('/api/students', {
                method: 'POST',
                body: { mobile: '9876543210', shift: '12 Hours' }
            });

            assert.strictEqual(res.status, 400);
            assert.strictEqual(res.body.success, false);
            assert.match(res.body.error, /name is required/i);
        });

        it('should reject creation when mobile number is missing or invalid', async () => {
            const res = await apiRequest('/api/students', {
                method: 'POST',
                body: { name: 'Valid Name', mobile: '123' }
            });

            assert.strictEqual(res.status, 400);
            assert.strictEqual(res.body.success, false);
            assert.match(res.body.error, /mobile number is required/i);
        });
    });

    describe('Update Student (/api/students/:id)', () => {
        it('should update student details successfully', async () => {
            const target = initialFixtureStudents[0];
            const updatePayload = {
                name: 'Test Student One Updated',
                seatNo: 'A5',
                shift: '24 Hours',
                fee: 2200,
                plan: 'Monthly',
                remarks: 'Shift upgraded to 24 hours'
            };

            const res = await apiRequest(`/api/students/${target.id}`, {
                method: 'PUT',
                body: updatePayload
            });

            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.success, true);

            const listRes = await apiRequest('/api/students');
            const updated = listRes.body.find(s => s.id === target.id);
            assert.ok(updated);
            assert.strictEqual(updated.name, 'Test Student One Updated');
            assert.strictEqual(updated.seatNo, 'A5');
            assert.strictEqual(updated.shift, '24 Hours');
            assert.strictEqual(updated.fee, 2200);
        });

        it('should return 404 when updating non-existent student', async () => {
            const res = await apiRequest('/api/students/99999', {
                method: 'PUT',
                body: { name: 'Ghost' }
            });

            assert.strictEqual(res.status, 404);
            assert.strictEqual(res.body.success, false);
        });
    });

    describe('Update Student Password (/api/students/:id/password)', () => {
        it('should update password and allow login with the new password', async () => {
            const target = initialFixtureStudents[0];
            const newPassword = 'NewlyChangedPass#123';

            const res = await apiRequest(`/api/students/${target.id}/password`, {
                method: 'PUT',
                body: { password: newPassword }
            });

            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.success, true);
            assert.strictEqual(res.body.password, newPassword);

            // Test login with old password fails
            const failedLogin = await apiRequest('/api/student/login', {
                method: 'POST',
                body: { mobile: target.mobile, password: target.password }
            });
            assert.strictEqual(failedLogin.status, 401);

            // Test login with new password succeeds
            const successLogin = await apiRequest('/api/student/login', {
                method: 'POST',
                body: { mobile: target.mobile, password: newPassword }
            });
            assert.strictEqual(successLogin.status, 200);
            assert.strictEqual(successLogin.body.success, true);
        });

        it('should return 400 when updating password with empty value', async () => {
            const target = initialFixtureStudents[0];
            const res = await apiRequest(`/api/students/${target.id}/password`, {
                method: 'PUT',
                body: { password: '   ' }
            });

            assert.strictEqual(res.status, 400);
            assert.strictEqual(res.body.success, false);
            assert.match(res.body.message, /empty/i);
        });

        it('should return 404 when updating password for non-existent student', async () => {
            const res = await apiRequest('/api/students/99999/password', {
                method: 'PUT',
                body: { password: 'NewPass' }
            });

            assert.strictEqual(res.status, 404);
            assert.strictEqual(res.body.success, false);
        });
    });

    describe('Adjust Leave / Extend Due Date (/api/students/:id/adjust-leave)', () => {
        it('should extend due date by specified number of days', async () => {
            const target = initialFixtureStudents[1]; // dueDate is '2026-11-02'
            const res = await apiRequest(`/api/students/${target.id}/adjust-leave`, {
                method: 'PUT',
                body: { daysToAdjust: 7 }
            });

            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.success, true);
            assert.strictEqual(res.body.newDueDate, '2026-11-09');

            const listRes = await apiRequest('/api/students');
            const updated = listRes.body.find(s => s.id === target.id);
            assert.strictEqual(updated.dueDate, '2026-11-09');
            assert.match(updated.remarks, /Extended 7 days/);
        });

        it('should return 404 when adjusting leave for non-existent student', async () => {
            const res = await apiRequest('/api/students/99999/adjust-leave', {
                method: 'PUT',
                body: { daysToAdjust: 5 }
            });

            assert.strictEqual(res.status, 404);
            assert.strictEqual(res.body.error, 'Student not found');
        });

        it('should return 400 when daysToAdjust is invalid or non-positive', async () => {
            const target = initialFixtureStudents[0];
            const res = await apiRequest(`/api/students/${target.id}/adjust-leave`, {
                method: 'PUT',
                body: { daysToAdjust: 'invalid' }
            });

            assert.strictEqual(res.status, 400);
            assert.strictEqual(res.body.success, false);
            assert.match(res.body.error, /positive/i);
        });
    });

    describe('Delete and Archive Student (/api/students/:id)', () => {
        it('should archive student to past_members and remove from active students', async () => {
            const target = initialFixtureStudents[1];
            const res = await apiRequest(`/api/students/${target.id}`, {
                method: 'DELETE'
            });

            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.success, true);
            assert.strictEqual(res.body.message, 'Archived successfully');

            // Verify active list no longer includes student
            const activeRes = await apiRequest('/api/students');
            const foundActive = activeRes.body.find(s => s.id === target.id);
            assert.strictEqual(foundActive, undefined);

            // Verify past members list includes student with deleted_at
            const pastRes = await apiRequest('/api/past-members');
            const foundPast = pastRes.body.find(s => s.id === target.id);
            assert.ok(foundPast);
            assert.ok(foundPast.deleted_at);
        });

        it('should return 404 when deleting non-existent student', async () => {
            const res = await apiRequest('/api/students/99999', {
                method: 'DELETE'
            });

            assert.strictEqual(res.status, 404);
            assert.strictEqual(res.body.error, 'Student not found');
        });
    });
});
