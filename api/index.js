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
const studentsJsonPath = path.join(__dirname, '..', 'data', 'students.json');
const pastJsonPath = path.join(__dirname, '..', 'data', 'past_members.json');

let localStudents = [];
let localPastMembers = [];
let localPending = [];
let localReceipts = [];

function loadLocalData() {
    try {
        if (fs.existsSync(studentsJsonPath)) {
            localStudents = JSON.parse(fs.readFileSync(studentsJsonPath, 'utf8'));
            localStudents.forEach(s => {
                if (!s.password) s.password = '123456';
            });
        }
        if (fs.existsSync(pastJsonPath)) {
            localPastMembers = JSON.parse(fs.readFileSync(pastJsonPath, 'utf8'));
        }
        localReceipts = localStudents.filter(s => s.lastPaid && s.fee).map((s, idx) => ({
            id: idx + 1,
            student_id: s.id,
            receipt_no: `REC-${String(100000 + idx)}`,
            student_name: s.name,
            seat_no: s.seatNo,
            fee: Number(s.fee),
            mode: s.mode || 'Cash',
            plan: s.plan || 'Monthly',
            payment_date: s.lastPaid
        }));
    } catch (err) {
        console.error('Error loading local dataset:', err);
    }
}

function saveLocalData() {
    try {
        fs.writeFileSync(studentsJsonPath, JSON.stringify(localStudents, null, 2), 'utf8');
        fs.writeFileSync(pastJsonPath, JSON.stringify(localPastMembers, null, 2), 'utf8');
    } catch (err) {
        console.error('Error writing to local dataset:', err);
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
    const { username, password } = req.body;
    if (supabase) {
        const { data, error } = await supabase
            .from('admins')
            .select('*')
            .eq('username', username)
            .eq('password', password);

        if (error || !data || data.length === 0) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
        return res.json({ success: true, message: 'Login successful' });
    }

    // Local admin authentication fallback
    if (username === 'admin' && password === 'password123') {
        return res.json({ success: true, message: 'Login successful' });
    }
    res.status(401).json({ success: false, message: 'Invalid credentials' });
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
        const { mobile, password } = req.body;
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

        const expectedPassword = student.password ? String(student.password).trim() : '123456';
        if (expectedPassword !== String(password).trim()) {
            return res.status(401).json({ success: false, message: 'Incorrect password. Please verify or use "Forgot Password".' });
        }

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
        const { password } = req.body;

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
                if (error.message && error.message.includes("'password' column")) {
                    return res.status(400).json({
                        success: false,
                        message: "The 'password' column has not been added to your Supabase 'students' table yet. Run: ALTER TABLE students ADD COLUMN IF NOT EXISTS password TEXT DEFAULT '123456'; in Supabase SQL Editor."
                    });
                }
                return res.status(500).json({ success: false, message: error.message });
            }
            return res.json({ success: true, message: 'Password updated successfully!', password: newPassword });
        }

        const student = localStudents.find(s => String(s.id) === String(id));
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

// 2. Fetch Active Students
app.get('/api/students', async(req, res) => {
    if (supabase) {
        const { data, error } = await supabase
            .from('students')
            .select('*')
            .order('id', { ascending: false });

        if (error) return res.status(500).json({ error: error.message });
        return res.json(data);
    }

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
    const { student_id, receipt_no, student_name, seat_no, fee, mode, plan, payment_date } = req.body;
    if (supabase) {
        const { error } = await supabase.from('receipts').insert([{
            student_id,
            receipt_no,
            student_name,
            seat_no,
            fee,
            mode,
            plan,
            payment_date
        }]);

        if (error) return res.status(500).json({ error: error.message });
        return res.json({ success: true, message: 'Receipt saved successfully' });
    }

    const newReceipt = {
        id: localReceipts.length + 1,
        student_id,
        receipt_no,
        student_name,
        seat_no,
        fee: Number(fee),
        mode,
        plan,
        payment_date
    };
    localReceipts.unshift(newReceipt);
    res.json({ success: true, message: 'Receipt saved successfully' });
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
        const { seatNo, name, shift, mobile, aadhar, joiningDate, plan, cardNo, fee, mode, lastPaid, dueDate, remarks } = req.body;
        
        let photoUrl = null;
        if (req.file) {
            if (supabase) {
                photoUrl = await uploadToSupabase(req.file);
            } else {
                const uploadDir = path.join(__dirname, '..', 'public', 'uploads');
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
            name: name ? name.trim() : 'Anonymous',
            shift: shift || '12 Hours',
            mobile: mobile ? mobile.trim() : '',
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
            delete approvePayload.password;
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
        const { seatNo, name, shift, mobile, aadhar, joiningDate, plan, cardNo, fee, mode, lastPaid, dueDate, remarks, password } = req.body;
        
        let photoUrl = null;
        if (req.file) {
            if (supabase) {
                photoUrl = await uploadToSupabase(req.file);
            } else {
                const uploadDir = path.join(__dirname, '..', 'public', 'uploads');
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
                name: name ? name.trim() : '',
                shift: shift || '12 Hours',
                mobile: mobile ? mobile.trim() : '',
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
                console.warn('[Supabase] "password" column not found in students table. Retrying insert without password...');
                delete studentPayload.password;
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
            name: name ? name.trim() : '',
            shift: shift || '12 Hours',
            mobile: mobile ? mobile.trim() : '',
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

        const updatePayload = {
            seatNo: seatNo !== undefined ? seatNo : '',
            name: name !== undefined ? name : '',
            shift: shift || '12 Hours',
            mobile: mobile !== undefined ? mobile : '',
            aadhar: aadhar ? aadhar.trim() : '',
            joiningDate: joiningDate || '',
            plan: plan || 'Monthly',
            cardNo: cardNo || '',
            fee: (fee !== undefined && !isNaN(Number(fee))) ? Number(fee) : 0,
            mode: mode || 'Cash',
            lastPaid: lastPaid || '',
            dueDate: dueDate || '',
            remarks: remarks || ''
        };

        if (password && password.trim()) {
            updatePayload.password = password.trim();
        }

        if (req.file) {
            if (supabase) {
                updatePayload.photo = await uploadToSupabase(req.file);
            } else {
                const uploadDir = path.join(__dirname, '..', 'public', 'uploads');
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
                console.warn('[Supabase] "password" column not found in students table. Retrying update without password...');
                delete updateData.password;
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
    const { daysToAdjust } = req.body;

    if (supabase) {
        const { data, error } = await supabase.from('students').select('*').eq('id', id).single();
        if (error || !data) return res.status(500).json({ error: 'Student not found' });

        const currentDue = new Date(data.dueDate);
        currentDue.setDate(currentDue.getDate() + parseInt(daysToAdjust));
        const newDueStr = currentDue.toISOString().split('T')[0];
        const newRemarks = data.remarks ? `${data.remarks} | Extended ${daysToAdjust} days` : `Extended ${daysToAdjust} days`;

        const { error: updateErr } = await supabase
            .from('students')
            .update({ dueDate: newDueStr, remarks: newRemarks })
            .eq('id', id);

        if (updateErr) return res.status(500).json({ error: updateErr.message });
        return res.json({ success: true, newDueDate: newDueStr });
    }

    const student = localStudents.find(s => String(s.id) === String(id));
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const currentDue = new Date(student.dueDate || new Date());
    currentDue.setDate(currentDue.getDate() + parseInt(daysToAdjust));
    const newDueStr = currentDue.toISOString().split('T')[0];
    student.dueDate = newDueStr;
    student.remarks = student.remarks ? `${student.remarks} | Extended ${daysToAdjust} days` : `Extended ${daysToAdjust} days`;
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

    const index = localStudents.findIndex(s => String(s.id) === String(id));
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

module.exports = app;