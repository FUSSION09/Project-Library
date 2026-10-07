const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');

describe('Frontend HTML & Client Interface Smoke Tests', () => {
    const publicDir = path.join(__dirname, '..', 'public');

    function readHtml(filename) {
        const filePath = path.join(publicDir, filename);
        assert.ok(fs.existsSync(filePath), `${filename} must exist in public/`);
        return fs.readFileSync(filePath, 'utf8');
    }

    describe('Admin Portal (public/admin.html)', () => {
        it('should contain all required management UI elements and IDs', () => {
            const html = readHtml('admin.html');

            const requiredElements = [
                'id="student-table-body"',
                'id="search-bar"',
                'id="filter-shift"',
                'id="filter-status"',
                'id="studentModal"',
                'id="studentForm"',
                'id="studentId"',
                'id="changePasswordModal"',
                'id="change-pwd-input"',
                'id="excelUpload"'
            ];

            requiredElements.forEach(elem => {
                assert.ok(html.includes(elem), `admin.html is missing required element: ${elem}`);
            });
        });
    });

    describe('Student Portal (public/student.html)', () => {
        it('should contain student authentication and dashboard elements', () => {
            const html = readHtml('student.html');

            const requiredElements = [
                'id="login-section"',
                'id="studentLoginForm"',
                'id="login-mobile"',
                'id="login-password"',
                'id="btn-login"',
                'id="forgotPasswordModal"'
            ];

            requiredElements.forEach(elem => {
                assert.ok(html.includes(elem), `student.html is missing required element: ${elem}`);
            });
        });
    });

    describe('Staff Login Page (public/login.html)', () => {
        it('should contain staff credentials inputs and action button', () => {
            const html = readHtml('login.html');

            assert.ok(html.includes('id="loginForm"') || html.includes('type="password"'), 'login.html must have password input');
            assert.ok(html.includes('id="username"') || html.includes('type="text"') || html.includes('type="email"'), 'login.html must have user input');
            assert.ok(html.includes('type="submit"') || html.includes('button'), 'login.html must have submit action');
        });
    });

    describe('Registration Portal (public/register.html)', () => {
        it('should contain student registration form and required input fields', () => {
            const html = readHtml('register.html');

            const requiredElements = [
                'id="publicRegisterForm"',
                'id="reg-name"',
                'id="reg-mobile"',
                'id="reg-shift"',
                'id="reg-plan"',
                'id="reg-seatNo"',
                'id="submitRegBtn"'
            ];

            requiredElements.forEach(elem => {
                assert.ok(html.includes(elem), `register.html is missing required element: ${elem}`);
            });
        });
    });
});
