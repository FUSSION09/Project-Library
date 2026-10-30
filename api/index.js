const express = require('express');
const cors = require('cors');
const multer = require('multer');
const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize Supabase Client if credentials are provided
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
let supabase = null;

if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
    try {
        supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        console.log('[Database] Connected to Supabase Cloud.');
    } catch (e) {
        console.warn('[Database] Failed to init Supabase client, falling back to local data store:', e.message);
    }
} else {
    console.log('[Database] Running in local mode using data/students.json.');
}

// Local storage fallback
const getDataDir = () => {
    if (process.env.DATA_DIR) return path.resolve(process.env.DATA_DIR);
    if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
        return path.join('/tmp', 'data');
    }
    return path.join(__dirname, '..', 'data');
};
const getStudentsJsonPath = () => path.join(getDataDir(), 'students.json');
const getPastJsonPath = () => path.join(getDataDir(), 'past_members.json');
const getReceiptsJsonPath = () => path.join(getDataDir(), 'receipts.json');
const getUploadDir = () => process.env.UPLOAD_DIR ? path.resolve(process.env.UPLOAD_DIR) : path.join(__dirname, '..', 'public', 'uploads');

// Static require ensures bundlers (@vercel/nft) package JSON datasets into serverless bundles
let bundledStudents = [];
try {
    bundledStudents = require('../data/students.json');
} catch (e) {
    bundledStudents = [];
}
let bundledPastMembers = [];
try {
    bundledPastMembers = require('../data/past_members.json');
} catch (e) {
    bundledPastMembers = [];
}
let bundledReceipts = [];
try {
    bundledReceipts = require('../data/receipts.json');
} catch (e) {
    bundledReceipts = [];
}

let localStudents = [];
let localPastMembers = [];
let localPending = [];
let localReceipts = [];

// Helper function to extract password from record or remarks fallback
function extractStudentPassword(student) {
    if (!student) return '123456';
    if (student.password && String(student.password).trim()) {
        return String(student.password).trim();
    }
    if (student.remarks) {
        const match = String(student.remarks).match(/\[PWD:([^\]]+)\]/);
        if (match && match[1]) return match[1].trim();
    }
    return '123456';
}

// Clean remarks string from internal [PWD:...] marker
function cleanStudentRemarks(remarks) {
    if (!remarks) return '';
    return String(remarks).replace(/\[PWD:[^\]]+\]\s*/g, '').trim();
}

// Normalize student object for cross-compatibility between CamelCase and Snake_Case
function normalizeStudent(s) {
    if (!s) return s;
    return {
        ...s,
        id: s.id,
        name: s.name || '',
        mobile: s.mobile || '',
        shift: s.shift || '12 Hours',
        seatNo: s.seatNo || s.seat_no || '',
        seat_no: s.seatNo || s.seat_no || '',
        plan: s.plan || 'Monthly',
        fee: s.fee !== undefined ? s.fee : 0,
        mode: s.mode || s.payment_mode || 'Cash',
        payment_mode: s.mode || s.payment_mode || 'Cash',
        lastPaid: s.lastPaid || s.last_paid || '',
        last_paid: s.lastPaid || s.last_paid || '',
        joiningDate: s.joiningDate || s.joining_date || '',
        joining_date: s.joiningDate || s.joining_date || '',
        dueDate: s.dueDate || s.due_date || '',
        due_date: s.dueDate || s.due_date || '',
        cardNo: s.cardNo || s.card_no || '',
        card_no: s.cardNo || s.card_no || '',
        aadhar: s.aadhar || s.aadhaar || '',
        aadhaar: s.aadhar || s.aadhaar || '',
        photo: s.photo || '',
        password: extractStudentPassword(s),
        remarks: cleanStudentRemarks(s.remarks)
    };
}

function initDataDirectory() {
    try {
        const dir = getDataDir();
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        const studentsPath = getStudentsJsonPath();
        const pastPath = getPastJsonPath();
        const receiptsPath = getReceiptsJsonPath();

        if (!fs.existsSync(studentsPath) && Array.isArray(bundledStudents) && bundledStudents.length > 0) {
            fs.writeFileSync(studentsPath, JSON.stringify(bundledStudents, null, 2), 'utf8');
        }
        if (!fs.existsSync(pastPath)) {
            fs.writeFileSync(pastPath, JSON.stringify(bundledPastMembers || [], null, 2), 'utf8');
        }
        if (!fs.existsSync(receiptsPath) && Array.isArray(bundledReceipts) && bundledReceipts.length > 0) {
            fs.writeFileSync(receiptsPath, JSON.stringify(bundledReceipts, null, 2), 'utf8');
        }
    } catch (e) {
        console.warn('Could not initialize data directory:', e.message);
    }
}

function loadLocalData() {
    try {
        initDataDirectory();
        const studentsJsonPath = getStudentsJsonPath();
        const pastJsonPath = getPastJsonPath();
        const receiptsJsonPath = getReceiptsJsonPath();

        let loadedStudents = null;
        if (fs.existsSync(studentsJsonPath)) {
            try {
                loadedStudents = JSON.parse(fs.readFileSync(studentsJsonPath, 'utf8'));
            } catch (e) {
                console.error('Failed reading students.json from disk:', e);
            }
        }
        if (!Array.isArray(loadedStudents) || loadedStudents.length === 0) {
            loadedStudents = Array.isArray(bundledStudents) ? bundledStudents : [];
        }
        localStudents = loadedStudents.map(s => normalizeStudent(s));

        let loadedPast = null;
        if (fs.existsSync(pastJsonPath)) {
            try {
                loadedPast = JSON.parse(fs.readFileSync(pastJsonPath, 'utf8'));
            } catch (e) {
                console.error('Failed reading past_members.json from disk:', e);
            }
        }
        if (!Array.isArray(loadedPast)) {
            loadedPast = Array.isArray(bundledPastMembers) ? bundledPastMembers : [];
        }
        localPastMembers = loadedPast.map(s => normalizeStudent(s));

        localPending = [];

        let loadedReceipts = null;
        if (fs.existsSync(receiptsJsonPath)) {
            try {
                loadedReceipts = JSON.parse(fs.readFileSync(receiptsJsonPath, 'utf8'));
            } catch (e) {
                console.error('Failed reading receipts.json from disk:', e);
            }
        }
        if (!Array.isArray(loadedReceipts) || loadedReceipts.length === 0) {
            if (Array.isArray(bundledReceipts) && bundledReceipts.length > 0) {
                loadedReceipts = bundledReceipts;
            } else {
                loadedReceipts = localStudents.filter(s => (s.lastPaid || s.last_paid) && s.fee).map((s, idx) => ({
                    id: idx + 1,
                    student_id: s.id,
                    receipt_no: `FL-REC-${String(100000 + idx)}`,
                    student_name: s.name,
                    mobile: s.mobile || '',
                    seat_no: s.seatNo,
                    shift: s.shift || '12 Hours',
                    fee: Number(s.fee),
                    mode: s.mode || 'Cash',
                    plan: s.plan || 'Monthly',
                    payment_date: s.lastPaid,
                    due_date: s.dueDate || ''
                }));
            }
        }
        localReceipts = loadedReceipts;
    } catch (err) {
        console.error('Error loading local dataset:', err);
    }
}

function saveLocalData() {
    try {
        const dir = getDataDir();
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(getStudentsJsonPath(), JSON.stringify(localStudents, null, 2), 'utf8');
        fs.writeFileSync(getPastJsonPath(), JSON.stringify(localPastMembers, null, 2), 'utf8');
    } catch (err) {
        console.warn('Local file write skipped (read-only environment):', err.message);
    }
}

function saveLocalReceipts() {
    try {
        const dir = getDataDir();
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(getReceiptsJsonPath(), JSON.stringify(localReceipts, null, 2), 'utf8');
    } catch (err) {
        console.warn('Local receipt write skipped (read-only environment):', err.message);
    }
}

loadLocalData();

// Use memory storage for file uploads
const upload = multer({ storage: multer.memoryStorage() });

// Helper function to upload photos to Supabase Storage
async function uploadToSupabase(file) {
    if (!file) return null;
    if (!supabase) return null;

    const cleanFileName = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    const { error } = await supabase.storage
        .from('student-photos')
        .upload(cleanFileName, file.buffer, {
            contentType: file.mimetype,
            upsert: false
        });

    if (error) {
        console.error('Storage upload error:', error);
        return null;
    }

    const { data: publicUrlData } = supabase.storage
        .from('student-photos')
        .getPublicUrl(cleanFileName);

    return publicUrlData.publicUrl;
}

// 1. Admin Login
app.post('/api/login', async(req, res) => {
    const { username, password } = req.body || {};
    const trimmedUser = (username || '').trim();
    const trimmedPass = (password || '').trim();

    // Primary Admin Credentials
    const isMasterAdmin = (trimmedUser === 'admin@friendslibrary.com' && trimmedPass === 'Tarun@2604');

    if (isMasterAdmin) {
        return res.json({ success: true, message: 'Login successful' });
    }

    if (supabase) {
        const { data, error } = await supabase
            .from('admins')
            .select('*')
            .eq('username', trimmedUser)
            .eq('password', trimmedPass);

        if (!error && data && data.length > 0) {
            return res.json({ success: true, message: 'Login successful' });
        }
    }

    return res.status(401).json({ success: false, message: 'Invalid credentials' });
});

// Helper to find student by 10-digit mobile phone
function findStudentByPhone(studentList, phoneInput) {
    if (!phoneInput) return null;
    const clean = phoneInput.replace(/\D/g, '').slice(-10);
    if (!clean) return null;
    return studentList.find(s => {
        if (!s.mobile) return false;
        const sClean = s.mobile.replace(/\D/g, '');
        return sClean.includes(clean);
    });
}

// 1a. Student Login with Password
app.post('/api/student/login', async (req, res) => {
    try {
        const { mobile, password } = req.body || {};
        if (!mobile || !password) {
            return res.status(400).json({ success: false, message: 'Mobile number and password are required.' });
        }

        const cleanMobile = mobile.replace(/\D/g, '').slice(-10);
        let student = null;

        if (supabase) {
            const { data, error } = await supabase.from('students').select('*');
            if (!error && Array.isArray(data) && data.length > 0) {
                student = findStudentByPhone(data, cleanMobile);
            }
        }
        if (!student) {
            student = findStudentByPhone(localStudents, cleanMobile);
        }

        if (!student) {
            return res.status(404).json({ success: false, message: 'This mobile number is not registered with Friends Library.' });
        }

        const expectedPassword = extractStudentPassword(student);
        if (expectedPassword !== String(password).trim()) {
            return res.status(401).json({ success: false, message: 'Incorrect password. Please verify or use "Forgot Password".' });
        }

        student.password = expectedPassword;
        student.remarks = cleanStudentRemarks(student.remarks);

        res.json({
            success: true,
            message: `Welcome, ${student.name}!`,
            student
        });
    } catch (err) {
        console.error('Student login error:', err);
        res.status(500).json({ success: false, message: 'Server error during student login.' });
    }
});

// 1b. Update Student Password (Admin)
app.put('/api/students/:id/password', async (req, res) => {
    try {
        const id = req.params.id;
        const { password } = req.body || {};

        if (!password || !password.trim()) {
            return res.status(400).json({ success: false, message: 'Password cannot be empty.' });
        }

        const newPassword = password.trim();

        if (supabase) {
            const { error } = await supabase
                .from('students')
                .update({ password: newPassword })
                .eq('id', id);

            if (error) {
                console.warn('[Supabase] "password" column update failed, applying remarks fallback:', error.message);
                const { data: sData, error: sErr } = await supabase
                    .from('students')
                    .select('remarks')
                    .eq('id', id)
                    .single();

                if (sErr || !sData) {
                    return res.status(404).json({ success: false, message: 'Student not found in database.' });
                }

                const cleanedRemarks = cleanStudentRemarks(sData.remarks);
                const updatedRemarks = cleanedRemarks ? `${cleanedRemarks} [PWD:${newPassword}]` : `[PWD:${newPassword}]`;

                const { error: remErr } = await supabase
                    .from('students')
                    .update({ remarks: updatedRemarks })
                    .eq('id', id);

                if (remErr) {
                    return res.status(500).json({ success: false, message: remErr.message });
                }
            }
            return res.json({ success: true, message: 'Password updated successfully!', password: newPassword });
        }

        const student = localStudents.find(s => String(s.id) === String(id) || String(s.numericId) === String(id));
        if (!student) {
            return res.status(404).json({ success: false, message: 'Student not found.' });
        }

        student.password = newPassword;
        saveLocalData();
        res.json({ success: true, message: 'Password updated successfully!', password: newPassword });
    } catch (err) {
        console.error('Password update error:', err);
        res.status(500).json({ success: false, message: 'Server error updating password.' });
    }
});

// 1c. Student Change Password (Self-service from Student Portal)
app.post('/api/student/change-password', async (req, res) => {
    try {
        const { mobile, currentPassword, newPassword } = req.body || {};

        if (!mobile || !currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Mobile number, current password, and new password are required.'
            });
        }

        const trimmedNew = String(newPassword).trim();
        if (trimmedNew.length < 4) {
            return res.status(400).json({
                success: false,
                message: 'New password must be at least 4 characters long.'
            });
        }

        const cleanMobile = mobile.replace(/\D/g, '').slice(-10);
        let student = null;

        if (supabase) {
            const { data, error } = await supabase.from('students').select('*');
            if (!error && Array.isArray(data) && data.length > 0) {
                student = findStudentByPhone(data, cleanMobile);
            }
        }
        if (!student) {
            student = findStudentByPhone(localStudents, cleanMobile);
        }

        if (!student) {
            return res.status(404).json({ success: false, message: 'Student not found with this mobile number.' });
        }

        const existingPassword = extractStudentPassword(student);
        if (existingPassword !== String(currentPassword).trim()) {
            return res.status(401).json({
                success: false,
                message: 'Current password is incorrect. Please check and try again.'
            });
        }

        if (supabase) {
            const { error } = await supabase
                .from('students')
                .update({ password: trimmedNew })
                .eq('id', student.id);

            if (error) {
                console.warn('[Supabase] "password" column update failed during self-service, applying remarks fallback:', error.message);
                const cleanedRemarks = cleanStudentRemarks(student.remarks);
                const updatedRemarks = cleanedRemarks ? `${cleanedRemarks} [PWD:${trimmedNew}]` : `[PWD:${trimmedNew}]`;

                const { error: remErr } = await supabase
                    .from('students')
                    .update({ remarks: updatedRemarks })
                    .eq('id', student.id);

                if (remErr) {
                    return res.status(500).json({ success: false, message: remErr.message });
                }
            }
            return res.json({ success: true, message: 'Password changed successfully! Please use your new password next time.' });
        }

        student.password = trimmedNew;
        saveLocalData();
        return res.json({ success: true, message: 'Password changed successfully! Please use your new password next time.' });
    } catch (err) {
        console.error('Student change password error:', err);
        res.status(500).json({ success: false, message: 'Server error while updating password.' });
    }
});

// 2. Fetch Active Students
app.get('/api/students', async(req, res) => {
    try {
        if (supabase) {
            const { data, error } = await supabase
                .from('students')
                .select('*')
                .order('id', { ascending: false });

            if (!error && Array.isArray(data) && data.length > 0) {
                return res.json(data.map(s => normalizeStudent(s)));
            }
            if (error) {
                console.warn('[Supabase] Error fetching students, falling back to local dataset:', error.message);
            }
            if (localStudents && localStudents.length > 0) {
                return res.json(localStudents);
            }
        }

        if (!localStudents || localStudents.length === 0) {
            loadLocalData();
        }
        return res.json(localStudents);
    } catch (err) {
        console.error('Error fetching students:', err);
        return res.json(localStudents);
    }
});

// 3. Fetch Past Members
app.get('/api/past-members', async(req, res) => {
    try {
        if (supabase) {
            const { data, error } = await supabase
                .from('past_members')
                .select('*')
                .order('deleted_at', { ascending: false });

            if (!error && Array.isArray(data) && data.length > 0) {
                return res.json(data.map(s => normalizeStudent(s)));
            }
            if (error) {
                console.warn('[Supabase] Error fetching past members, falling back to local dataset:', error.message);
            }
            if (localPastMembers) {
                return res.json(localPastMembers);
            }
        }

        if (!localPastMembers) {
            loadLocalData();
        }
        return res.json(localPastMembers || []);
    } catch (err) {
        console.error('Error fetching past members:', err);
        return res.json(localPastMembers || []);
    }
});

// 4. Fetch Receipts
app.get('/api/receipts', async(req, res) => {
    try {
        const { student_id, mobile } = req.query || {};

        let receipts = [];
        if (supabase) {
            const { data, error } = await supabase
                .from('receipts')
                .select('*')
                .order('id', { ascending: false });

            if (!error && Array.isArray(data) && data.length > 0) {
                receipts = data;
            }
        }
        if (!receipts || receipts.length === 0) {
            receipts = localReceipts || [];
        }

        if (student_id || mobile) {
            const cleanMobile = mobile ? String(mobile).replace(/\D/g, '').slice(-10) : null;
            receipts = receipts.filter(r => {
                if (student_id && String(r.student_id) === String(student_id)) return true;
                if (cleanMobile && r.mobile && String(r.mobile).replace(/\D/g, '').includes(cleanMobile)) return true;
                return false;
            });
        }

        res.json(receipts);
    } catch (err) {
        console.error('Error fetching receipts:', err);
        res.status(500).json({ error: 'Server error fetching receipts' });
    }
});

// 4b. Fetch Current / Latest Student Receipt by Student ID
app.get('/api/students/:id/receipt', async(req, res) => {
    try {
        const id = req.params.id;
        let student = null;
        if (supabase) {
            const { data, error } = await supabase.from('students').select('*').eq('id', id).single();
            if (!error && data) student = data;
        } else {
            student = localStudents.find(s => String(s.id) === String(id) || String(s.numericId) === String(id));
        }

        if (!student) {
            return res.status(404).json({ success: false, message: 'Student record not found.' });
        }

        let receipts = [];
        if (supabase) {
            const { data } = await supabase.from('receipts').select('*').eq('student_id', id).order('id', { ascending: false });
            receipts = data || [];
        } else {
            receipts = (localReceipts || []).filter(r => String(r.student_id) === String(id));
        }

        const feeVal = Number(student.fee) || 0;
        let latestReceipt = receipts.length > 0 ? receipts[0] : null;

        // If no receipt exists or latest fee doesn't match current updated fee, create/return current active receipt
        if (!latestReceipt || Number(latestReceipt.fee) !== feeVal) {
            const receiptNo = `FL-REC-${student.seatNo || 'GEN'}-${Date.now().toString().slice(-6)}`;
            latestReceipt = {
                student_id: student.id,
                receipt_no: receiptNo,
                student_name: student.name,
                seat_no: student.seatNo || 'Unassigned',
                fee: feeVal,
                mode: student.mode || 'Cash',
                plan: student.plan || 'Monthly',
                payment_date: student.lastPaid || new Date().toISOString().split('T')[0],
                mobile: student.mobile || '',
                shift: student.shift || '12 Hours',
                due_date: student.dueDate || ''
            };
        }

        res.json({ success: true, receipt: latestReceipt });
    } catch (err) {
        console.error('Error getting student receipt:', err);
        res.status(500).json({ success: false, message: 'Server error retrieving receipt.' });
    }
});

// 5. Save Receipt
app.post('/api/receipts', async(req, res) => {
    try {
        const {
            student_id,
            receipt_no,
            student_name,
            seat_no,
            fee,
            mode,
            plan,
            payment_date,
            mobile,
            shift,
            due_date
        } = req.body || {};

        const parsedFee = (fee !== undefined && !isNaN(Number(fee))) ? Number(fee) : 0;
        const finalReceiptNo = receipt_no || `FL-REC-${Date.now().toString().slice(-6)}`;
        const finalDate = payment_date || new Date().toISOString().split('T')[0];

        const receiptRecord = {
            student_id,
            receipt_no: finalReceiptNo,
            student_name: student_name || '',
            seat_no: seat_no || '',
            fee: parsedFee,
            mode: mode || 'Cash',
            plan: plan || 'Monthly',
            payment_date: finalDate,
            mobile: mobile || '',
            shift: shift || '',
            due_date: due_date || ''
        };

        if (supabase) {
            const basePayload = {
                student_id,
                receipt_no: finalReceiptNo,
                student_name: receiptRecord.student_name,
                seat_no: receiptRecord.seat_no,
                fee: parsedFee,
                mode: receiptRecord.mode,
                plan: receiptRecord.plan,
                payment_date: finalDate
            };

            let { data, error } = await supabase.from('receipts').insert([receiptRecord]).select();
            if (error) {
                // If extra columns aren't defined in Supabase receipts table, insert base payload
                const retry = await supabase.from('receipts').insert([basePayload]).select();
                if (retry.error) return res.status(500).json({ error: retry.error.message });
                data = retry.data;
            }

            return res.json({ success: true, message: 'Receipt saved successfully', receipt: (data && data[0]) || basePayload });
        }

        const newReceipt = {
            id: localReceipts.length + 1,
            ...receiptRecord
        };
        localReceipts.unshift(newReceipt);
        saveLocalReceipts();
        res.json({ success: true, message: 'Receipt saved successfully', receipt: newReceipt });
    } catch (err) {
        console.error('Error saving receipt:', err);
        res.status(500).json({ success: false, message: 'Server error saving receipt' });
    }
});

// 6. Live Seat Shift Status
app.get('/api/seats-shift-status', async(req, res) => {
    try {
        let students = [];
        if (supabase) {
            const { data, error } = await supabase
                .from('students')
                .select('id, "seatNo", name, shift, "lastPaid", "dueDate"');

            if (!error && Array.isArray(data) && data.length > 0) {
                students = data.map(s => normalizeStudent(s));
            }
        }
        if (!students || students.length === 0) {
            students = localStudents;
        }

        const seatMapping = {};
        students.forEach(student => {
            const seat = student.seatNo || student.seat_no;
            if (!seat || seat === 'Pending') return;
            seatMapping[seat] = {
                occupied: true,
                studentName: student.name,
                shift: student.shift,
                studentId: student.id
            };
        });

        res.json({ seatMapping });
    } catch (err) {
        console.error('Error fetching seat shift status:', err);
        res.json({ seatMapping: {} });
    }
});

// 7. Public Student Registration
app.post('/api/register', upload.single('photo'), async(req, res) => {
    try {
        const { seatNo, name, shift, mobile, aadhar, joiningDate, plan, cardNo, fee, mode, lastPaid, dueDate, remarks } = req.body || {};
        
        if (!name || !name.trim()) {
            return res.status(400).json({ success: false, error: 'Student name is required.' });
        }
        const cleanMobile = (mobile || '').replace(/\D/g, '').slice(-10);
        if (!cleanMobile || cleanMobile.length < 10) {
            return res.status(400).json({ success: false, error: 'Valid 10-digit mobile number is required.' });
        }

        let photoUrl = null;
        if (req.file) {
            if (supabase) {
                photoUrl = await uploadToSupabase(req.file);
            } else {
                const uploadDir = getUploadDir();
                if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
                const photoFileName = `${Date.now()}-${req.file.originalname.replace(/[^a-zA-Z0-9.]/g, '_')}`;
                fs.writeFileSync(path.join(uploadDir, photoFileName), req.file.buffer);
                photoUrl = `/uploads/${photoFileName}`;
            }
        }

        const pendingRecord = {
            id: Date.now(),
            photo: photoUrl,
            seatNo: seatNo || 'Pending',
            name: name.trim(),
            shift: shift || '12 Hours',
            mobile: cleanMobile,
            aadhar: aadhar ? aadhar.trim() : '',
            joiningDate: joiningDate || new Date().toISOString().split('T')[0],
            plan: plan || 'Monthly',
            cardNo: cardNo ? cardNo.trim() : '',
            fee: (fee !== undefined && !isNaN(Number(fee))) ? Number(fee) : 0,
            mode: mode || 'Cash',
            lastPaid: lastPaid || '',
            dueDate: dueDate || '',
            remarks: remarks ? remarks.trim() : '',
            submitted_at: new Date().toISOString()
        };

        if (supabase) {
            const { error } = await supabase.from('pending_registrations').insert([pendingRecord]);
            if (error) return res.status(500).json({ success: false, error: error.message });
            return res.json({ success: true, message: 'Registration submitted successfully!' });
        }

        localPending.unshift(pendingRecord);
        res.json({ success: true, message: 'Registration submitted successfully!' });
    } catch (err) {
        console.error('Registration error:', err);
        res.status(500).json({ success: false, error: err.message || 'Server error during registration.' });
    }
});

// 8. Pending Registrations List
app.get('/api/pending-registrations', async(req, res) => {
    if (supabase) {
        const { data, error } = await supabase
            .from('pending_registrations')
            .select('*')
            .order('submitted_at', { ascending: false });

        if (error) return res.status(500).json({ error: error.message });
        return res.json(data);
    }

    res.json(localPending);
});

// 9. Approve Registration
app.post('/api/approve-registration/:id', async(req, res) => {
    const pendingId = req.params.id;

    if (supabase) {
        const { data: pendingRows, error: findError } = await supabase
            .from('pending_registrations')
            .select('*')
            .eq('id', pendingId);

        if (findError || !pendingRows || pendingRows.length === 0) {
            return res.status(404).json({ success: false, message: 'Pending record not found' });
        }

        const student = pendingRows[0];
        let approvePayload = {
            photo: student.photo,
            seatNo: student.seatNo,
            name: student.name,
            shift: student.shift,
            mobile: student.mobile,
            aadhar: student.aadhar,
            joiningDate: student.joiningDate,
            plan: student.plan,
            cardNo: student.cardNo,
            fee: student.fee,
            mode: student.mode,
            lastPaid: student.lastPaid,
            dueDate: student.dueDate,
            remarks: student.remarks,
            password: student.password || '123456'
        };

        let { data: insertedStudent, error: insertError } = await supabase
            .from('students')
            .insert([approvePayload])
            .select();

        if (insertError && insertError.message && insertError.message.includes("'password' column")) {
            const pwdToSave = approvePayload.password;
            delete approvePayload.password;
            if (pwdToSave) {
                const cleanedRem = cleanStudentRemarks(approvePayload.remarks);
                approvePayload.remarks = cleanedRem ? `${cleanedRem} [PWD:${pwdToSave}]` : `[PWD:${pwdToSave}]`;
            }
            const retry = await supabase.from('students').insert([approvePayload]).select();
            insertedStudent = retry.data;
            insertError = retry.error;
        }

        if (insertError) return res.status(500).json({ success: false, error: insertError.message });

        const newStudent = insertedStudent[0];
        const receiptNo = `REC-${Date.now().toString().slice(-6)}`;

        await supabase.from('receipts').insert([{
            student_id: newStudent.id,
            receipt_no: receiptNo,
            student_name: newStudent.name,
            seat_no: newStudent.seatNo,
            fee: newStudent.fee,
            mode: newStudent.mode,
            plan: newStudent.plan,
            payment_date: newStudent.lastPaid
        }]);

        await supabase.from('pending_registrations').delete().eq('id', pendingId);
        return res.json({ success: true, message: 'Student approved successfully' });
    }

    const index = localPending.findIndex(p => String(p.id) === String(pendingId));
    if (index === -1) return res.status(404).json({ success: false, message: 'Pending record not found' });

    const student = localPending.splice(index, 1)[0];
    student.id = localStudents.length > 0 ? Math.max(...localStudents.map(s => s.id || 0)) + 1 : 1;
    student.password = student.password || '123456';
    localStudents.unshift(student);
    saveLocalData();

    const receiptNo = `REC-${Date.now().toString().slice(-6)}`;
    localReceipts.unshift({
        id: localReceipts.length + 1,
        student_id: student.id,
        receipt_no: receiptNo,
        student_name: student.name,
        seat_no: student.seatNo,
        fee: student.fee,
        mode: student.mode,
        plan: student.plan,
        payment_date: student.lastPaid || new Date().toISOString().split('T')[0]
    });

    res.json({ success: true, message: 'Student approved successfully' });
});

// 10. Reject Pending Registration
app.delete('/api/pending-registrations/:id', async(req, res) => {
    const id = req.params.id;
    if (supabase) {
        const { error } = await supabase.from('pending_registrations').delete().eq('id', id);
        if (error) return res.status(500).json({ error: error.message });
        return res.json({ success: true });
    }

    localPending = localPending.filter(p => String(p.id) !== String(id));
    res.json({ success: true });
});

// 11. Add Student (Direct Admin)
app.post('/api/students', upload.single('photo'), async(req, res) => {
    try {
        const { seatNo, name, shift, mobile, aadhar, joiningDate, plan, cardNo, fee, mode, lastPaid, dueDate, remarks, password } = req.body || {};
        
        if (!name || !name.trim()) {
            return res.status(400).json({ success: false, error: 'Student name is required.' });
        }
        const cleanMobile = (mobile || '').replace(/\D/g, '').slice(-10);
        if (!cleanMobile || cleanMobile.length < 10) {
            return res.status(400).json({ success: false, error: 'Valid 10-digit mobile number is required.' });
        }

        let photoUrl = null;
        if (req.file) {
            if (supabase) {
                photoUrl = await uploadToSupabase(req.file);
            } else {
                const uploadDir = getUploadDir();
                if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
                const photoFileName = `${Date.now()}-${req.file.originalname.replace(/[^a-zA-Z0-9.]/g, '_')}`;
                fs.writeFileSync(path.join(uploadDir, photoFileName), req.file.buffer);
                photoUrl = `/uploads/${photoFileName}`;
            }
        }

        const studentPassword = (password && password.trim()) ? password.trim() : '123456';
        const parsedFee = (fee !== undefined && !isNaN(Number(fee))) ? Number(fee) : 0;
        const cleanAadhar = aadhar ? aadhar.trim() : '';

        if (supabase) {
            let studentPayload = {
                photo: photoUrl,
                seatNo: seatNo || 'Pending',
                name: name.trim(),
                shift: shift || '12 Hours',
                mobile: cleanMobile,
                aadhar: cleanAadhar,
                joiningDate: joiningDate || new Date().toISOString().split('T')[0],
                plan: plan || 'Monthly',
                cardNo: cardNo ? cardNo.trim() : '',
                fee: parsedFee,
                mode: mode || 'Cash',
                lastPaid: lastPaid || '',
                dueDate: dueDate || '',
                remarks: remarks ? remarks.trim() : '',
                password: studentPassword
            };

            let { data, error } = await supabase.from('students').insert([studentPayload]).select();

            if (error && error.message && error.message.includes("'password' column")) {
                console.warn('[Supabase] "password" column not found in students table. Retrying insert with remarks fallback...');
                delete studentPayload.password;
                if (studentPassword) {
                    const cleanedRem = cleanStudentRemarks(studentPayload.remarks);
                    studentPayload.remarks = cleanedRem ? `${cleanedRem} [PWD:${studentPassword}]` : `[PWD:${studentPassword}]`;
                }
                const retry = await supabase.from('students').insert([studentPayload]).select();
                data = retry.data;
                error = retry.error;
            }

            if (error) return res.status(500).json({ success: false, error: error.message });

            const newStudent = data[0];
            const receiptNo = `REC-${Date.now().toString().slice(-6)}`;
            await supabase.from('receipts').insert([{
                student_id: newStudent.id,
                receipt_no: receiptNo,
                student_name: name,
                seat_no: seatNo,
                fee: parsedFee,
                mode: mode || 'Cash',
                plan: plan || 'Monthly',
                payment_date: lastPaid || new Date().toISOString().split('T')[0]
            }]);

            return res.json({ success: true, id: newStudent.id });
        }

        const newId = localStudents.length > 0 ? Math.max(...localStudents.map(s => Number(s.id) || 0)) + 1 : 1;
        const newStudent = {
            id: newId,
            numericId: newId,
            photo: photoUrl,
            seatNo: seatNo || 'Pending',
            name: name.trim(),
            shift: shift || '12 Hours',
            mobile: cleanMobile,
            aadhar: cleanAadhar,
            joiningDate: joiningDate || new Date().toISOString().split('T')[0],
            plan: plan || 'Monthly',
            cardNo: cardNo ? cardNo.trim() : '',
            fee: parsedFee,
            mode: mode || 'Cash',
            lastPaid: lastPaid || '',
            dueDate: dueDate || '',
            remarks: remarks ? remarks.trim() : '',
            password: studentPassword
        };

        localStudents.unshift(newStudent);
        saveLocalData();

        const receiptNo = `REC-${Date.now().toString().slice(-6)}`;
        localReceipts.unshift({
            id: localReceipts.length + 1,
            student_id: newId,
            receipt_no: receiptNo,
            student_name: name,
            seat_no: seatNo,
            fee: parsedFee,
            mode: mode || 'Cash',
            plan: plan || 'Monthly',
            payment_date: lastPaid || new Date().toISOString().split('T')[0]
        });

        res.json({ success: true, id: newId });
    } catch (err) {
        console.error('Error adding student:', err);
        res.status(500).json({ success: false, error: err.message || 'Server error adding student' });
    }
});

// 12. Update Student
app.put('/api/students/:id', upload.single('photo'), async(req, res) => {
    try {
        const id = req.params.id;
        const { seatNo, name, shift, mobile, aadhar, joiningDate, plan, cardNo, fee, mode, lastPaid, dueDate, remarks, password } = req.body;

        const updatePayload = {};
        if (seatNo !== undefined) updatePayload.seatNo = seatNo;
        if (name !== undefined) updatePayload.name = name;
        if (shift !== undefined) updatePayload.shift = shift;
        if (mobile !== undefined) updatePayload.mobile = mobile;
        if (aadhar !== undefined) updatePayload.aadhar = aadhar.trim();
        if (joiningDate !== undefined) updatePayload.joiningDate = joiningDate;
        if (plan !== undefined) updatePayload.plan = plan;
        if (cardNo !== undefined) updatePayload.cardNo = cardNo;
        if (fee !== undefined && !isNaN(Number(fee))) updatePayload.fee = Number(fee);
        if (mode !== undefined) updatePayload.mode = mode;
        if (lastPaid !== undefined) updatePayload.lastPaid = lastPaid;
        if (dueDate !== undefined) updatePayload.dueDate = dueDate;
        if (remarks !== undefined) updatePayload.remarks = remarks;
        if (password && password.trim()) updatePayload.password = password.trim();

        if (req.file) {
            if (supabase) {
                updatePayload.photo = await uploadToSupabase(req.file);
            } else {
                const uploadDir = getUploadDir();
                if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
                const photoFileName = `${Date.now()}-${req.file.originalname.replace(/[^a-zA-Z0-9.]/g, '_')}`;
                fs.writeFileSync(path.join(uploadDir, photoFileName), req.file.buffer);
                updatePayload.photo = `/uploads/${photoFileName}`;
            }
        }

        if (supabase) {
            let updateData = { ...updatePayload };
            let { error } = await supabase.from('students').update(updateData).eq('id', id);

            if (error && error.message && error.message.includes("'password' column")) {
                console.warn('[Supabase] "password" column not found in students table. Retrying update with remarks fallback...');
                const passToSave = updateData.password;
                delete updateData.password;
                if (passToSave) {
                    const existingRem = updateData.remarks !== undefined ? updateData.remarks : '';
                    const cleanedRem = cleanStudentRemarks(existingRem);
                    updateData.remarks = cleanedRem ? `${cleanedRem} [PWD:${passToSave}]` : `[PWD:${passToSave}]`;
                }
                const retry = await supabase.from('students').update(updateData).eq('id', id);
                error = retry.error;
            }

            if (error) return res.status(500).json({ success: false, error: error.message });

            // If fee or payment info was updated, record receipt with updated fee
            if (updatePayload.fee !== undefined || updatePayload.lastPaid !== undefined || updatePayload.plan !== undefined) {
                try {
                    const { data: refreshedStudentList } = await supabase.from('students').select('*').eq('id', id);
                    const s = (refreshedStudentList && refreshedStudentList[0]) || { id, ...updatePayload };
                    const finalFee = (updatePayload.fee !== undefined) ? Number(updatePayload.fee) : Number(s.fee || 0);
                    const finalReceiptNo = `FL-REC-${(s.seatNo || 'GEN')}-${Date.now().toString().slice(-6)}`;
                    const finalPaymentDate = s.lastPaid || new Date().toISOString().split('T')[0];

                    const receiptRecord = {
                        student_id: s.id,
                        receipt_no: finalReceiptNo,
                        student_name: s.name || '',
                        seat_no: s.seatNo || '',
                        fee: finalFee,
                        mode: s.mode || 'Cash',
                        plan: s.plan || 'Monthly',
                        payment_date: finalPaymentDate,
                        mobile: s.mobile || '',
                        shift: s.shift || '',
                        due_date: s.dueDate || ''
                    };

                    let { error: rcptErr } = await supabase.from('receipts').insert([receiptRecord]);
                    if (rcptErr) {
                        await supabase.from('receipts').insert([{
                            student_id: s.id,
                            receipt_no: finalReceiptNo,
                            student_name: s.name || '',
                            seat_no: s.seatNo || '',
                            fee: finalFee,
                            mode: s.mode || 'Cash',
                            plan: s.plan || 'Monthly',
                            payment_date: finalPaymentDate
                        }]);
                    }
                } catch (rErr) {
                    console.warn('Could not auto-insert receipt during student update:', rErr);
                }
            }

            return res.json({ success: true, message: 'Student updated successfully' });
        }

        const student = localStudents.find(s => String(s.id) === String(id) || String(s.numericId) === String(id));
        if (!student) return res.status(404).json({ success: false, error: `Student with ID ${id} not found.` });

        Object.assign(student, updatePayload);
        saveLocalData();

        // If fee or payment info was updated, record receipt with updated fee
        if (updatePayload.fee !== undefined || updatePayload.lastPaid !== undefined || updatePayload.plan !== undefined) {
            const finalFee = Number(student.fee) || 0;
            const finalReceiptNo = `FL-REC-${(student.seatNo || 'GEN')}-${Date.now().toString().slice(-6)}`;
            const finalPaymentDate = student.lastPaid || new Date().toISOString().split('T')[0];

            const receiptRecord = {
                id: localReceipts.length + 1,
                student_id: student.id,
                receipt_no: finalReceiptNo,
                student_name: student.name || '',
                seat_no: student.seatNo || '',
                fee: finalFee,
                mode: student.mode || 'Cash',
                plan: student.plan || 'Monthly',
                payment_date: finalPaymentDate,
                mobile: student.mobile || '',
                shift: student.shift || '',
                due_date: student.dueDate || ''
            };

            localReceipts.unshift(receiptRecord);
            saveLocalReceipts();
        }

        res.json({ success: true, message: 'Student updated successfully', student });
    } catch (err) {
        console.error('Error updating student:', err);
        res.status(500).json({ success: false, error: err.message || 'Server error updating student.' });
    }
});

// 13. Adjust Leave / Extend Due Date
app.put('/api/students/:id/adjust-leave', async(req, res) => {
    const id = req.params.id;
    const { daysToAdjust } = req.body || {};

    const days = parseInt(daysToAdjust, 10);
    if (isNaN(days) || days <= 0) {
        return res.status(400).json({ success: false, error: 'daysToAdjust must be a valid positive number.' });
    }

    if (supabase) {
        const { data, error } = await supabase.from('students').select('*').eq('id', id).single();
        if (error || !data) return res.status(500).json({ error: 'Student not found' });

        let currentDue = new Date(data.dueDate);
        if (isNaN(currentDue.getTime())) currentDue = new Date();
        currentDue.setDate(currentDue.getDate() + days);
        const newDueStr = currentDue.toISOString().split('T')[0];
        const newRemarks = data.remarks ? `${data.remarks} | Extended ${days} days` : `Extended ${days} days`;

        const { error: updateErr } = await supabase
            .from('students')
            .update({ dueDate: newDueStr, remarks: newRemarks })
            .eq('id', id);

        if (updateErr) return res.status(500).json({ error: updateErr.message });
        return res.json({ success: true, newDueDate: newDueStr });
    }

    const student = localStudents.find(s => String(s.id) === String(id) || String(s.numericId) === String(id));
    if (!student) return res.status(404).json({ error: 'Student not found' });

    let currentDue = new Date(student.dueDate || new Date());
    if (isNaN(currentDue.getTime())) currentDue = new Date();
    currentDue.setDate(currentDue.getDate() + days);
    const newDueStr = currentDue.toISOString().split('T')[0];
    student.dueDate = newDueStr;
    student.remarks = student.remarks ? `${student.remarks} | Extended ${days} days` : `Extended ${days} days`;
    saveLocalData();

    res.json({ success: true, newDueDate: newDueStr });
});

// 14. Delete / Archive Student
app.delete('/api/students/:id', async(req, res) => {
    try {
        const id = req.params.id;
        let student = null;

        if (supabase) {
            try {
                const { data } = await supabase.from('students').select('*').eq('id', id).single();
                if (data) student = data;
            } catch (e) {
                console.warn('[Supabase] Error finding student for deletion:', e.message);
            }
        }

        if (!student) {
            const localIdx = localStudents.findIndex(s => String(s.id) === String(id) || String(s.numericId) === String(id));
            if (localIdx !== -1) {
                student = localStudents[localIdx];
            }
        }

        if (!student) {
            return res.status(404).json({ success: false, error: 'Student not found' });
        }

        const archivedStudent = {
            ...normalizeStudent(student),
            deleted_at: new Date().toISOString()
        };

        if (supabase) {
            try {
                const { error: insErr } = await supabase.from('past_members').insert([{
                    id: archivedStudent.id,
                    photo: archivedStudent.photo || '',
                    seatNo: archivedStudent.seatNo || '',
                    seat_no: archivedStudent.seatNo || '',
                    name: archivedStudent.name,
                    shift: archivedStudent.shift || '12 Hours',
                    mobile: archivedStudent.mobile || '',
                    aadhar: archivedStudent.aadhar || '',
                    joiningDate: archivedStudent.joiningDate || '',
                    joining_date: archivedStudent.joiningDate || '',
                    plan: archivedStudent.plan || 'Monthly',
                    cardNo: archivedStudent.cardNo || '',
                    card_no: archivedStudent.cardNo || '',
                    fee: Number(archivedStudent.fee) || 0,
                    mode: archivedStudent.mode || 'Cash',
                    payment_mode: archivedStudent.mode || 'Cash',
                    lastPaid: archivedStudent.lastPaid || '',
                    last_paid: archivedStudent.lastPaid || '',
                    dueDate: archivedStudent.dueDate || '',
                    due_date: archivedStudent.dueDate || '',
                    remarks: archivedStudent.remarks || '',
                    deleted_at: archivedStudent.deleted_at
                }]);
                if (insErr) {
                    console.warn('[Supabase] past_members insert retry with minimal columns:', insErr.message);
                    await supabase.from('past_members').insert([{
                        name: archivedStudent.name,
                        mobile: archivedStudent.mobile || '',
                        shift: archivedStudent.shift,
                        fee: Number(archivedStudent.fee) || 0,
                        deleted_at: archivedStudent.deleted_at
                    }]);
                }
            } catch (e) {
                console.warn('[Supabase] Error archiving to past_members table:', e.message);
            }

            try {
                await supabase.from('students').delete().eq('id', id);
            } catch (delErr) {
                console.warn('[Supabase] Error deleting from students table:', delErr.message);
            }
        }

        // Always update local storage and memory
        const localIdx = localStudents.findIndex(s => String(s.id) === String(id) || String(s.numericId) === String(id));
        if (localIdx !== -1) {
            localStudents.splice(localIdx, 1);
        }
        localPastMembers = [archivedStudent, ...localPastMembers.filter(p => String(p.id) !== String(archivedStudent.id))];
        saveLocalData();

        return res.json({ success: true, message: 'Archived successfully', student: archivedStudent });
    } catch (err) {
        console.error('Delete student error:', err);
        return res.status(500).json({ success: false, error: 'Internal server error while archiving student' });
    }
});

// 15. Bulk Upload Excel
app.post('/api/students/bulk-upload', upload.single('excel'), async(req, res) => {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

    try {
        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const records = [];

        function formatDate(val) {
            if (!val) return '';
            if (typeof val === 'number') {
                try { return xlsx.SSF.format('yyyy-mm-dd', val); } catch (e) {}
            }
            if (typeof val === 'string' && val.trim().match(/^\d{4}-\d{2}-\d{2}$/)) return val.trim();
            return String(val).trim();
        }

        workbook.SheetNames.forEach(sheetName => {
            const sheet = workbook.Sheets[sheetName];
            if (!sheet) return;

            const rawMatrix = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });
            if (!rawMatrix || rawMatrix.length === 0) return;

            let headerRowIndex = 0;
            let defaultShift = '12 Hours';

            const titleText = (rawMatrix[0] || []).join(' ').toLowerCase();
            if (titleText.includes('6 hr') || titleText.includes('6 hrs') || sheetName.toLowerCase().includes('6 hr')) {
                defaultShift = '6 Hours';
            } else if (titleText.includes('12 hr') || titleText.includes('12 hrs') || sheetName.toLowerCase().includes('12 hr')) {
                defaultShift = '12 Hours';
            } else if (titleText.includes('24 hr') || titleText.includes('24 hrs') || sheetName.toLowerCase().includes('24 hr')) {
                defaultShift = '24 Hours';
            }

            const row0Cells = (rawMatrix[0] || []).filter(c => String(c).trim() !== '');
            if (row0Cells.length <= 3 && rawMatrix.length > 1) {
                headerRowIndex = 1;
            }

            const headers = (rawMatrix[headerRowIndex] || []).map(h => String(h || '').trim());
            const dataRows = rawMatrix.slice(headerRowIndex + 1);

            dataRows.forEach(row => {
                if (!row || row.length === 0) return;
                const obj = {};
                headers.forEach((h, colIdx) => {
                    if (h) obj[h] = row[colIdx];
                });

                const name = obj.Name || obj['Name of Student'] || obj['Name of Students'] || obj['Name of Students '] || '';
                if (!name || String(name).trim() === '') return;

                let mobile = String(obj.Mobile || obj['Mobile No'] || obj['Mobile No.'] || obj['Mobile No. '] || '').replace(/\D/g, '');
                if (mobile.length > 10) mobile = mobile.slice(-10);

                let seat = String(obj.SeatNo || obj['Seat No'] || obj['Seat No.'] || '').trim();
                if (!seat || seat === 'null' || seat === 'undefined') seat = '';

                let fee = obj.Fee || obj.FESS || obj.Fees || 0;
                if (typeof fee === 'string') {
                    const match = fee.match(/\d+/);
                    fee = match ? Number(match[0]) : 0;
                }
                fee = Number(fee) || 0;

                let mode = 'Cash';
                if (obj.UPI || obj.Upi || obj.upi || obj['UPI '] || obj['Upi ']) {
                    const upiVal = String(obj.UPI || obj.Upi || obj.upi || '').trim().toUpperCase();
                    if (upiVal === 'Y' || upiVal === 'YES' || upiVal.length > 0) mode = 'UPI';
                }
                if (obj.Mode) mode = obj.Mode;

                let plan = obj.Plan || 'Monthly';
                if (obj['Monthly '] || obj.Monthly) {
                    const mVal = String(obj['Monthly '] || obj.Monthly).trim();
                    if (mVal === '2') plan = '2 Months';
                    else if (mVal === '3') plan = 'Quarterly';
                }

                let remarks = String(obj.Remarks || obj.REMARK || obj.Remark || '').trim();

                records.push({
                    name: String(name).trim(),
                    mobile: mobile,
                    aadhar: String(obj.Aadhar || obj['Adhar Number'] || '').trim(),
                    seatNo: seat,
                    shift: obj.Shift || defaultShift,
                    plan: plan,
                    cardNo: String(obj.CardNo || obj['Card no.'] || '').trim(),
                    fee: fee,
                    mode: mode,
                    lastPaid: formatDate(obj.LastPaid || obj['Last Payment Date']),
                    joiningDate: formatDate(obj.JoiningDate || obj['Joining Date'] || obj.JOIN),
                    dueDate: formatDate(obj.DueDate || obj['Due Date']),
                    remarks: remarks
                });
            });
        });

        if (supabase) {
            for (const r of records) {
                if (r.mobile) {
                    const { data: existing } = await supabase.from('students').select('*').eq('mobile', r.mobile).single();
                    if (existing) {
                        const updatePayload = {
                            lastPaid: r.lastPaid || existing.lastPaid,
                            dueDate: r.dueDate || existing.dueDate,
                            fee: r.fee || existing.fee,
                            mode: r.mode || existing.mode,
                            remarks: r.remarks ? `${existing.remarks ? existing.remarks + ' | ' : ''}${r.remarks}` : existing.remarks
                        };
                        if (r.seatNo) updatePayload.seatNo = r.seatNo;
                        await supabase.from('students').update(updatePayload).eq('id', existing.id);
                        continue;
                    }
                }
                await supabase.from('students').insert([r]);
            }
            return res.json({ success: true, count: records.length });
        }

        let maxId = localStudents.length > 0 ? Math.max(...localStudents.map(s => Number(s.id) || 0)) : 0;
        records.forEach(r => {
            if (!r.mobile || r.mobile.length < 10) {
                const foundPast = localPastMembers.find(m => m.name.toLowerCase() === r.name.toLowerCase());
                if (!foundPast) {
                    maxId++;
                    localPastMembers.push({ ...r, id: maxId, numericId: maxId, deleted_at: new Date().toISOString() });
                }
                return;
            }

            const existingIdx = localStudents.findIndex(s => s.mobile === r.mobile);
            if (existingIdx !== -1) {
                const existing = localStudents[existingIdx];
                existing.lastPaid = r.lastPaid || existing.lastPaid;
                existing.dueDate = r.dueDate || existing.dueDate;
                existing.fee = (r.fee !== undefined && r.fee !== null && r.fee > 0) ? r.fee : existing.fee;
                existing.mode = r.mode || existing.mode;
                if (r.plan) existing.plan = r.plan;
                if (r.remarks) existing.remarks = r.remarks;
                if (r.seatNo && r.seatNo !== 'Pending') existing.seatNo = r.seatNo;
                if (r.aadhar && !existing.aadhar) existing.aadhar = r.aadhar;
            } else {
                maxId++;
                localStudents.push({
                    id: maxId,
                    numericId: maxId,
                    seatNo: r.seatNo || 'Pending',
                    name: r.name,
                    shift: r.shift,
                    mobile: r.mobile,
                    aadhar: r.aadhar || '',
                    joiningDate: r.joiningDate || new Date().toISOString().split('T')[0],
                    plan: r.plan || 'Monthly',
                    cardNo: r.cardNo || '',
                    fee: r.fee || 0,
                    mode: r.mode || 'Cash',
                    lastPaid: r.lastPaid || new Date().toISOString().split('T')[0],
                    dueDate: r.dueDate || '',
                    remarks: r.remarks || '',
                    password: '123456'
                });
            }
        });
        saveLocalData();

        res.json({ success: true, count: records.length });
    } catch (err) {
        console.error('Bulk upload error:', err);
        res.status(500).json({ success: false, message: 'Processing failed' });
    }
});

app.loadLocalData = loadLocalData;
app.resetLocalState = function() {
    localStudents = [];
    localPastMembers = [];
    localPending = [];
    localReceipts = [];
    loadLocalData();
};

module.exports = app;