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
const getDataDir = () => process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(__dirname, '..', 'data');
const getStudentsJsonPath = () => path.join(getDataDir(), 'students.json');
const getPastJsonPath = () => path.join(getDataDir(), 'past_members.json');
const getReceiptsJsonPath = () => path.join(getDataDir(), 'receipts.json');
const getUploadDir = () => process.env.UPLOAD_DIR ? path.resolve(process.env.UPLOAD_DIR) : path.join(__dirname, '..', 'public', 'uploads');

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

function loadLocalData() {
    try {
        const studentsJsonPath = getStudentsJsonPath();
        const pastJsonPath = getPastJsonPath();
        const receiptsJsonPath = getReceiptsJsonPath();

        if (fs.existsSync(studentsJsonPath)) {
            localStudents = JSON.parse(fs.readFileSync(studentsJsonPath, 'utf8'));
            localStudents.forEach(s => {
                s.password = extractStudentPassword(s);
            });
        } else {
            localStudents = [];
        }

        if (fs.existsSync(pastJsonPath)) {
            localPastMembers = JSON.parse(fs.readFileSync(pastJsonPath, 'utf8'));
        } else {
            localPastMembers = [];
        }

        localPending = [];

        if (fs.existsSync(receiptsJsonPath)) {
            localReceipts = JSON.parse(fs.readFileSync(receiptsJsonPath, 'utf8'));
        } else {
            localReceipts = localStudents.filter(s => s.lastPaid && s.fee).map((s, idx) => ({
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
            saveLocalReceipts();
        }
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
        console.error('Error writing to local dataset:', err);
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
        console.error('Error writing to receipts dataset:', err);
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
            if (error) return res.status(500).json({ success: false, message: error.message });
            student = findStudentByPhone(data || [], cleanMobile);
        } else {
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
            if (error) return res.status(500).json({ success: false, message: error.message });
            student = findStudentByPhone(data || [], cleanMobile);
        } else {
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
    if (supabase) {
        const { data, error } = await supabase
            .from('students')
            .select('*')
            .order('id', { ascending: false });

        if (error) return res.status(500).json({ error: error.message });
        (data || []).forEach(s => {
            s.password = extractStudentPassword(s);
            s.remarks = cleanStudentRemarks(s.remarks);
        });
        return res.json(data);
    }

    localStudents.forEach(s => {
        s.password = extractStudentPassword(s);
    });
    res.json(localStudents);
});

// 3. Fetch Past Members
app.get('/api/past-members', async(req, res) => {
    if (supabase) {
        const { data, error } = await supabase
            .from('past_members')
            .select('*')
            .order('deleted_at', { ascending: false });

        if (error) return res.status(500).json({ error: error.message });
        (data || []).forEach(s => {
            s.remarks = cleanStudentRemarks(s.remarks);
        });
        return res.json(data);
    }

    res.json(localPastMembers);
});

// 4. Fetch Receipts
app.get('/api/receipts', async(req, res) => {
    if (supabase) {
        const { data, error } = await supabase
            .from('receipts')
            .select('*')
            .order('id', { ascending: false });

        if (error) return res.status(500).json({ error: error.message });
        return res.json(data);
    }

    res.json(localReceipts);
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
    let students = [];
    if (supabase) {
        const { data, error } = await supabase
            .from('students')
            .select('id, "seatNo", name, shift, "lastPaid", "dueDate"');

        if (error) return res.status(500).json({ error: error.message });
        students = data;
    } else {
        students = localStudents;
    }

    const seatMapping = {};
    students.forEach(student => {
        const seat = student.seatNo;
        if (!seat || seat === 'Pending') return;
        seatMapping[seat] = {
            occupied: true,
            studentName: student.name,
            shift: student.shift,
            studentId: student.id
        };
    });

    res.json({ seatMapping });
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

            return res.json({ success: true, message: 'Student updated successfully' });
        }

        const student = localStudents.find(s => String(s.id) === String(id) || String(s.numericId) === String(id));
        if (!student) return res.status(404).json({ success: false, error: `Student with ID ${id} not found.` });

        Object.assign(student, updatePayload);
        saveLocalData();

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
    const id = req.params.id;

    if (supabase) {
        const { data: student, error: fetchErr } = await supabase.from('students').select('*').eq('id', id).single();
        if (fetchErr || !student) return res.status(404).json({ error: 'Student not found' });

        await supabase.from('past_members').insert([{
            id: student.id,
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
            remarks: student.remarks
        }]);

        await supabase.from('students').delete().eq('id', id);
        return res.json({ success: true, message: 'Archived successfully' });
    }

    const index = localStudents.findIndex(s => String(s.id) === String(id) || String(s.numericId) === String(id));
    if (index === -1) return res.status(404).json({ error: 'Student not found' });

    const student = localStudents.splice(index, 1)[0];
    student.deleted_at = new Date().toISOString();
    localPastMembers.unshift(student);
    saveLocalData();

    res.json({ success: true, message: 'Archived successfully' });
});

// 15. Bulk Upload Excel
app.post('/api/students/bulk-upload', upload.single('excel'), async(req, res) => {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

    try {
        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

        const records = rows.map((row, idx) => ({
            seatNo: row.SeatNo || row['Seat No'] || '',
            name: row.Name || row['Name of Student'] || row['Name of Students'] || '',
            shift: row.Shift || '12 Hours',
            mobile: String(row.Mobile || row['Mobile No'] || row['Mobile No.'] || ''),
            aadhar: String(row.Aadhar || row['Adhar Number'] || ''),
            joiningDate: row.JoiningDate || row['Joining Date'] || row.JOIN || '',
            plan: row.Plan || 'Monthly',
            cardNo: String(row.CardNo || row['Card no.'] || ''),
            fee: Number(row.Fee || row.FESS) || 0,
            mode: row.Mode || 'Cash',
            lastPaid: row.LastPaid || row['Last Payment Date'] || '',
            dueDate: row.DueDate || row['Due Date'] || '',
            remarks: row.Remarks || row.REMARK || ''
        }));

        if (supabase) {
            const { error } = await supabase.from('students').insert(records);
            if (error) return res.status(500).json({ success: false, message: error.message });
            return res.json({ success: true, count: records.length });
        }

        let maxId = localStudents.length > 0 ? Math.max(...localStudents.map(s => s.id || 0)) : 0;
        records.forEach(r => {
            maxId++;
            r.id = maxId;
            r.numericId = maxId;
            localStudents.push(r);
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