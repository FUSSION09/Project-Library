const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const {
    setupTestEnvironment,
    teardownTestEnvironment,
    apiRequest
} = require('./helpers/test_server.js');

describe('Static Assets and Security Headers Suite', () => {
    before(async () => {
        await setupTestEnvironment();
    });

    after(async () => {
        await teardownTestEnvironment();
    });

    it('should include anti-caching security headers on responses', async () => {
        const res = await apiRequest('/');

        const cacheControl = res.headers.get('cache-control');
        const pragma = res.headers.get('pragma');

        assert.ok(cacheControl, 'Cache-Control header must be present');
        assert.match(cacheControl, /no-store/i);
        assert.match(cacheControl, /no-cache/i);
        assert.strictEqual(pragma, 'no-cache');
    });

    it('should serve the public landing page (index.html) at root /', async () => {
        const res = await apiRequest('/');

        assert.strictEqual(res.status, 200);
        assert.ok(typeof res.body === 'string');
        assert.match(res.body, /<title>Friends Library/i);
    });

    it('should serve admin portal (/admin.html)', async () => {
        const res = await apiRequest('/admin.html');

        assert.strictEqual(res.status, 200);
        assert.ok(typeof res.body === 'string');
        assert.match(res.body, /Admin Dashboard/i);
    });

    it('should serve student portal (/student.html)', async () => {
        const res = await apiRequest('/student.html');

        assert.strictEqual(res.status, 200);
        assert.ok(typeof res.body === 'string');
        assert.match(res.body, /Student Portal/i);
    });

    it('should serve staff login portal (/login.html)', async () => {
        const res = await apiRequest('/login.html');

        assert.strictEqual(res.status, 200);
        assert.ok(typeof res.body === 'string');
        assert.match(res.body, /Staff Login/i);
    });

    it('should serve student registration portal (/register.html)', async () => {
        const res = await apiRequest('/register.html');

        assert.strictEqual(res.status, 200);
        assert.ok(typeof res.body === 'string');
        assert.match(res.body, /Student Registration/i);
    });

    it('should serve static banner/gallery images (e.g. /p1.png)', async () => {
        const res = await apiRequest('/p1.png');

        assert.strictEqual(res.status, 200);
        const contentType = res.headers.get('content-type');
        assert.match(contentType, /image/i);
    });
});
