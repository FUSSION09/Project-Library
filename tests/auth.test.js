const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const {
    setupTestEnvironment,
    teardownTestEnvironment,
    apiRequest,
    initialFixtureStudents
} = require('./helpers/test_server.js');

describe('Authentication API Suite', () => {
    before(async () => {
        await setupTestEnvironment();
    });

    after(async () => {
        await teardownTestEnvironment();
    });

    describe('Admin Authentication (/api/login)', () => {
        it('should login successfully with valid admin credentials', async () => {
            const res = await apiRequest('/api/login', {
                method: 'POST',
                body: {
                    username: 'admin@friendslibrary.com',
                    password: 'Tarun@2604'
                }
            });

            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.success, true);
            assert.strictEqual(res.body.message, 'Login successful');
        });

        it('should login successfully when admin credentials have surrounding whitespace', async () => {
            const res = await apiRequest('/api/login', {
                method: 'POST',
                body: {
                    username: '  admin@friendslibrary.com  ',
                    password: '  Tarun@2604  '
                }
            });

            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.success, true);
        });

        it('should reject login with incorrect password', async () => {
            const res = await apiRequest('/api/login', {
                method: 'POST',
                body: {
                    username: 'admin@friendslibrary.com',
                    password: 'WrongPassword'
                }
            });

            assert.strictEqual(res.status, 401);
            assert.strictEqual(res.body.success, false);
            assert.strictEqual(res.body.message, 'Invalid credentials');
        });

        it('should reject login with unrecognized username', async () => {
            const res = await apiRequest('/api/login', {
                method: 'POST',
                body: {
                    username: 'intruder@test.com',
                    password: 'Tarun@2604'
                }
            });

            assert.strictEqual(res.status, 401);
            assert.strictEqual(res.body.success, false);
            assert.strictEqual(res.body.message, 'Invalid credentials');
        });

        it('should reject login with missing credentials', async () => {
            const res = await apiRequest('/api/login', {
                method: 'POST',
                body: {}
            });

            assert.strictEqual(res.status, 401);
            assert.strictEqual(res.body.success, false);
        });
    });

    describe('Student Authentication (/api/student/login)', () => {
        it('should login successfully with valid mobile and custom password', async () => {
            const targetStudent = initialFixtureStudents[0];
            const res = await apiRequest('/api/student/login', {
                method: 'POST',
                body: {
                    mobile: targetStudent.mobile,
                    password: targetStudent.password
                }
            });

            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.success, true);
            assert.strictEqual(res.body.student.id, targetStudent.id);
            assert.strictEqual(res.body.student.name, targetStudent.name);
            assert.strictEqual(res.body.student.seatNo, targetStudent.seatNo);
        });

        it('should login successfully with default password (123456)', async () => {
            const targetStudent = initialFixtureStudents[1];
            const res = await apiRequest('/api/student/login', {
                method: 'POST',
                body: {
                    mobile: targetStudent.mobile,
                    password: '123456'
                }
            });

            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.success, true);
            assert.strictEqual(res.body.student.id, targetStudent.id);
        });

        it('should support formatted phone numbers with spaces and +91 prefix', async () => {
            const targetStudent = initialFixtureStudents[0];
            const formattedPhone = `+91 ${targetStudent.mobile.slice(0, 5)} ${targetStudent.mobile.slice(5)}`;
            const res = await apiRequest('/api/student/login', {
                method: 'POST',
                body: {
                    mobile: formattedPhone,
                    password: targetStudent.password
                }
            });

            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.success, true);
            assert.strictEqual(res.body.student.id, targetStudent.id);
        });

        it('should reject login when student password is incorrect', async () => {
            const targetStudent = initialFixtureStudents[0];
            const res = await apiRequest('/api/student/login', {
                method: 'POST',
                body: {
                    mobile: targetStudent.mobile,
                    password: 'BadPassword123'
                }
            });

            assert.strictEqual(res.status, 401);
            assert.strictEqual(res.body.success, false);
            assert.match(res.body.message, /Incorrect password/i);
        });

        it('should return 404 when phone number is not registered', async () => {
            const res = await apiRequest('/api/student/login', {
                method: 'POST',
                body: {
                    mobile: '9999999999',
                    password: '123456'
                }
            });

            assert.strictEqual(res.status, 404);
            assert.strictEqual(res.body.success, false);
            assert.match(res.body.message, /not registered/i);
        });

        it('should return 400 when missing mobile or password', async () => {
            const resMissingPass = await apiRequest('/api/student/login', {
                method: 'POST',
                body: { mobile: '9876543210' }
            });
            assert.strictEqual(resMissingPass.status, 400);

            const resMissingMobile = await apiRequest('/api/student/login', {
                method: 'POST',
                body: { password: '123456' }
            });
            assert.strictEqual(resMissingMobile.status, 400);
        });
    });

    describe('Student Self-Service Change Password (/api/student/change-password)', () => {
        it('should change password successfully with valid current password and allow login with new password', async () => {
            const targetStudent = initialFixtureStudents[0];
            const newPassword = 'SecureStudentPass#99';

            const res = await apiRequest('/api/student/change-password', {
                method: 'POST',
                body: {
                    mobile: targetStudent.mobile,
                    currentPassword: targetStudent.password,
                    newPassword: newPassword
                }
            });

            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.success, true);
            assert.match(res.body.message, /Password changed successfully/i);

            // Verify login with old password fails
            const failedLogin = await apiRequest('/api/student/login', {
                method: 'POST',
                body: {
                    mobile: targetStudent.mobile,
                    password: targetStudent.password
                }
            });
            assert.strictEqual(failedLogin.status, 401);

            // Verify login with new password succeeds
            const successLogin = await apiRequest('/api/student/login', {
                method: 'POST',
                body: {
                    mobile: targetStudent.mobile,
                    password: newPassword
                }
            });
            assert.strictEqual(successLogin.status, 200);
            assert.strictEqual(successLogin.body.success, true);
            assert.strictEqual(successLogin.body.student.id, targetStudent.id);
        });

        it('should reject password change when current password is incorrect', async () => {
            const targetStudent = initialFixtureStudents[1];
            const res = await apiRequest('/api/student/change-password', {
                method: 'POST',
                body: {
                    mobile: targetStudent.mobile,
                    currentPassword: 'WrongPassword999',
                    newPassword: 'BrandNewPass123'
                }
            });

            assert.strictEqual(res.status, 401);
            assert.strictEqual(res.body.success, false);
            assert.match(res.body.message, /Current password is incorrect/i);
        });

        it('should reject password change when new password is too short', async () => {
            const targetStudent = initialFixtureStudents[1];
            const res = await apiRequest('/api/student/change-password', {
                method: 'POST',
                body: {
                    mobile: targetStudent.mobile,
                    currentPassword: '123456',
                    newPassword: '12'
                }
            });

            assert.strictEqual(res.status, 400);
            assert.strictEqual(res.body.success, false);
            assert.match(res.body.message, /at least 4 characters/i);
        });

        it('should return 400 when missing required fields', async () => {
            const res = await apiRequest('/api/student/change-password', {
                method: 'POST',
                body: { mobile: '9876543210', newPassword: 'Pass' }
            });

            assert.strictEqual(res.status, 400);
            assert.strictEqual(res.body.success, false);
        });

        it('should return 404 when student is not found', async () => {
            const res = await apiRequest('/api/student/change-password', {
                method: 'POST',
                body: {
                    mobile: '9999999999',
                    currentPassword: '123456',
                    newPassword: 'NewPass#123'
                }
            });

            assert.strictEqual(res.status, 404);
            assert.strictEqual(res.body.success, false);
        });
    });
});

