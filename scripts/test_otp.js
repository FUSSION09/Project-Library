const http = require('http');
const app = require('../api/index.js');

const server = app.listen(3002, async () => {
    console.log('Testing OTP endpoints on port 3002...');

    function post(path, body) {
        return new Promise((resolve, reject) => {
            const dataStr = JSON.stringify(body);
            const req = http.request({
                hostname: 'localhost',
                port: 3002,
                path: path,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(dataStr)
                }
            }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(data) }));
            });
            req.on('error', reject);
            req.write(dataStr);
            req.end();
        });
    }

    try {
        // Test 1: Invalid number
        const resInvalid = await post('/api/student/send-otp', { mobile: '1111111111' });
        console.log('Test 1 (Invalid mobile): status', resInvalid.status, resInvalid.body.message);
        if (resInvalid.status !== 404) throw new Error('Expected 404 for unknown number');

        // Test 2: Valid registered mobile (Neeru Yadav: 9289572374)
        const resSend = await post('/api/student/send-otp', { mobile: '9289572374' });
        console.log('Test 2 (Send OTP): status', resSend.status, 'student:', resSend.body.studentName, 'demoOtp:', resSend.body.demoOtp);
        if (!resSend.body.demoOtp) throw new Error('demoOtp not returned');
        const generatedOtp = resSend.body.demoOtp;

        // Test 3: Wrong OTP
        const resWrong = await post('/api/student/verify-otp', { mobile: '9289572374', otp: '000000' });
        console.log('Test 3 (Wrong OTP): status', resWrong.status, resWrong.body.message);
        if (resWrong.status !== 400) throw new Error('Expected 400 for wrong OTP');

        // Test 4: Correct OTP
        const resVerify = await post('/api/student/verify-otp', { mobile: '9289572374', otp: generatedOtp });
        console.log('Test 4 (Correct OTP): status', resVerify.status, 'student:', resVerify.body.student.name);
        if (!resVerify.body.success) throw new Error('Expected success for correct OTP');

        console.log('\nALL OTP TESTS PASSED 100%!');
    } catch (err) {
        console.error('OTP Test failed:', err);
    } finally {
        server.close();
    }
});
