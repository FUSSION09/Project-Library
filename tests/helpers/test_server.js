const path = require('path');
const fs = require('fs');
const os = require('os');
const app = require('../../server.js');

let currentTestDir = null;
let runningServer = null;
let serverPort = null;

const initialFixtureStudents = [
    {
        id: 101,
        numericId: 101,
        name: 'Test Student One',
        mobile: '9876543210',
        shift: '12 Hours',
        aadhar: '123456789012',
        seatNo: 'A1',
        cardNo: 'CARD01',
        plan: 'Monthly',
        fee: 1500,
        mode: 'UPI',
        lastPaid: '2026-10-01',
        joiningDate: '2026-10-01',
        dueDate: '2026-11-01',
        remarks: 'Test member',
        password: 'secretpassword'
    },
    {
        id: 102,
        numericId: 102,
        name: 'Test Student Two',
        mobile: '9123456780',
        shift: '6 Hours',
        aadhar: '',
        seatNo: 'B2',
        cardNo: 'CARD02',
        plan: 'Monthly',
        fee: 1000,
        mode: 'Cash',
        lastPaid: '2026-10-02',
        joiningDate: '2026-10-02',
        dueDate: '2026-11-02',
        remarks: '',
        password: '123456'
    }
];

const initialFixturePastMembers = [
    {
        id: 99,
        name: 'Old Alumnus',
        mobile: '9000000000',
        shift: '12 Hours',
        seatNo: 'C3',
        deleted_at: '2026-09-01T00:00:00.000Z'
    }
];

async function setupTestEnvironment() {
    // Create dedicated isolated temp directory for test run
    currentTestDir = fs.mkdtempSync(path.join(os.tmpdir(), 'library-test-'));
    const uploadDir = path.join(currentTestDir, 'uploads');
    fs.mkdirSync(uploadDir, { recursive: true });

    // Seed mock fixtures into temp directory
    fs.writeFileSync(
        path.join(currentTestDir, 'students.json'),
        JSON.stringify(initialFixtureStudents, null, 2),
        'utf8'
    );
    fs.writeFileSync(
        path.join(currentTestDir, 'past_members.json'),
        JSON.stringify(initialFixturePastMembers, null, 2),
        'utf8'
    );

    // Direct app to isolated temp data store
    process.env.DATA_DIR = currentTestDir;
    process.env.UPLOAD_DIR = uploadDir;
    app.resetLocalState();

    // Start ephemeral test server on random free port
    await new Promise((resolve) => {
        runningServer = app.listen(0, '127.0.0.1', () => {
            serverPort = runningServer.address().port;
            resolve();
        });
    });

    return {
        port: serverPort,
        baseUrl: `http://127.0.0.1:${serverPort}`,
        testDir: currentTestDir
    };
}

async function teardownTestEnvironment() {
    if (runningServer) {
        await new Promise((resolve) => runningServer.close(resolve));
        runningServer = null;
    }

    if (currentTestDir && fs.existsSync(currentTestDir)) {
        try {
            fs.rmSync(currentTestDir, { recursive: true, force: true });
        } catch (e) {
            // ignore temp cleanup error on windows if handle delayed
        }
        currentTestDir = null;
    }

    delete process.env.DATA_DIR;
    delete process.env.UPLOAD_DIR;
    app.resetLocalState();
}

async function apiRequest(endpoint, options = {}) {
    if (!runningServer) {
        throw new Error('Test server is not running. Call setupTestEnvironment() first.');
    }

    const url = `http://127.0.0.1:${serverPort}${endpoint}`;
    const headers = { ...(options.headers || {}) };

    if (options.body && typeof options.body === 'object' && !(options.body instanceof Buffer) && !(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify(options.body);
    }

    const res = await fetch(url, {
        ...options,
        headers
    });

    let body = null;
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
        body = await res.json();
    } else {
        body = await res.text();
    }

    return {
        status: res.status,
        headers: res.headers,
        body
    };
}

module.exports = {
    setupTestEnvironment,
    teardownTestEnvironment,
    apiRequest,
    initialFixtureStudents,
    initialFixturePastMembers
};
