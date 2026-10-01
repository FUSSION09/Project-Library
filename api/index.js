const express = require('express');
const cors = require('cors');
const multer = require('multer');
const xlsx = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize Supabase Client
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Use memory storage for serverless environments
const upload = multer({ storage: multer.memoryStorage() });

// Helper function to upload photos to Supabase Storage
async function uploadToSupabase(file) {
    if (!file) return null;
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
    const { data, error } = await supabase
        .from('admins')
        .select('*')
        .eq('username', username)
        .eq('password', password);

    if (error || !data || data.length === 0) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    res.json({ success: true, message: 'Login successful' });
});

// 2. Fetch Active Students
app.get('/api/students', async(req, res) => {
    const { data, error } = await supabase
        .from('students')
        .select('*')
        .order('id', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// 3. Fetch Past Members
app.get('/api/past-members', async(req, res) => {
    const { data, error } = await supabase
        .from('past_members')
        .select('*')
        .order('deleted_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// 4. Fetch Receipts
app.get('/api/receipts', async(req, res) => {
    const { data, error } = await supabase
        .from('receipts')
        .select('*')
        .order('id', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// 5. Save Receipt
app.post('/api/receipts', async(req, res) => {
    const { student_id, receipt_no, student_name, seat_no, fee, mode, plan, payment_date } = req.body;
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
    res.json({ success: true, message: 'Receipt saved successfully' });
});

// 6. Live Seat Shift Status
app.get('/api/seats-shift-status', async(req, res) => {
    const { data: students, error } = await supabase
        .from('students')
        .select('id, "seatNo", name, shift, "lastPaid", "dueDate"');

    if (error) return res.status(500).json({ error: error.message });

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
    const { seatNo, name, shift, mobile, aadhar, joiningDate, plan, cardNo, fee, mode, lastPaid, dueDate, remarks } = req.body;
    const photoUrl = await uploadToSupabase(req.file);

    const { error } = await supabase.from('pending_registrations').insert([{
        photo: photoUrl,
        seatNo: seatNo || 'Pending',
        name,
        shift,
        mobile,
        aadhar,
        joiningDate,
        plan,
        cardNo: cardNo || '',
        fee: fee ? Number(fee) : 0,
        mode,
        lastPaid,
        dueDate,
        remarks: remarks || ''
    }]);

    if (error) return res.status(500).json({ success: false, error: error.message });
    res.json({ success: true, message: 'Registration submitted successfully!' });
});

// 8. Pending Registrations List
app.get('/api/pending-registrations', async(req, res) => {
    const { data, error } = await supabase
        .from('pending_registrations')
        .select('*')
        .order('submitted_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// 9. Approve Registration
app.post('/api/approve-registration/:id', async(req, res) => {
    const pendingId = req.params.id;

    const { data: pendingRows, error: findError } = await supabase
        .from('pending_registrations')
        .select('*')
        .eq('id', pendingId);

    if (findError || !pendingRows || pendingRows.length === 0) {
        return res.status(404).json({ success: false, message: 'Pending record not found' });
    }

    const student = pendingRows[0];
    const { data: insertedStudent, error: insertError } = await supabase
        .from('students')
        .insert([{
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
        }])
        .select();

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
    res.json({ success: true, message: 'Student approved successfully' });
});

// 10. Reject Pending Registration
app.delete('/api/pending-registrations/:id', async(req, res) => {
    const { error } = await supabase.from('pending_registrations').delete().eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
});

// 11. Add Student (Direct Admin)
app.post('/api/students', upload.single('photo'), async(req, res) => {
    const { seatNo, name, shift, mobile, aadhar, joiningDate, plan, cardNo, fee, mode, lastPaid, dueDate, remarks } = req.body;
    const photoUrl = await uploadToSupabase(req.file);

    const { data, error } = await supabase.from('students').insert([{
        photo: photoUrl,
        seatNo,
        name,
        shift,
        mobile,
        aadhar,
        joiningDate,
        plan,
        cardNo: cardNo || '',
        fee: fee ? Number(fee) : 0,
        mode,
        lastPaid,
        dueDate,
        remarks: remarks || ''
    }]).select();

    if (error) return res.status(500).json({ error: error.message });

    const newStudent = data[0];
    const receiptNo = `REC-${Date.now().toString().slice(-6)}`;
    await supabase.from('receipts').insert([{
        student_id: newStudent.id,
        receipt_no: receiptNo,
        student_name: name,
        seat_no: seatNo,
        fee: Number(fee),
        mode,
        plan,
        payment_date: lastPaid
    }]);

    res.json({ success: true, id: newStudent.id });
});

// 12. Update Student
app.put('/api/students/:id', upload.single('photo'), async(req, res) => {
    const id = req.params.id;
    const { seatNo, name, shift, mobile, aadhar, joiningDate, plan, cardNo, fee, mode, lastPaid, dueDate, remarks } = req.body;

    const updatePayload = {
        seatNo,
        name,
        shift,
        mobile,
        aadhar,
        joiningDate,
        plan,
        cardNo,
        fee: Number(fee),
        mode,
        lastPaid,
        dueDate,
        remarks
    };

    if (req.file) {
        updatePayload.photo = await uploadToSupabase(req.file);
    }

    const { error } = await supabase.from('students').update(updatePayload).eq('id', id);
    if (error) return res.status(500).json({ error: error.message });

    res.json({ success: true, message: 'Student updated successfully' });
});

// 13. Adjust Leave / Extend Due Date
app.put('/api/students/:id/adjust-leave', async(req, res) => {
    const id = req.params.id;
    const { daysToAdjust } = req.body;

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
    res.json({ success: true, newDueDate: newDueStr });
});

// 14. Delete / Archive Student
app.delete('/api/students/:id', async(req, res) => {
    const id = req.params.id;

    const { data: student, error: fetchErr } = await supabase.from('students').select('*').eq('id', id).single();
    if (fetchErr || !student) return res.status(404).json({ error: 'Student not found' });

    // Copy to past_members
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
    res.json({ success: true, message: 'Archived successfully' });
});

// 15. Bulk Upload Excel
app.post('/api/students/bulk-upload', upload.single('excel'), async(req, res) => {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

    try {
        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

        const records = rows.map(row => ({
            seatNo: row.SeatNo || '',
            name: row.Name || '',
            shift: row.Shift || '6 Hours',
            mobile: String(row.Mobile || ''),
            aadhar: String(row.Aadhar || ''),
            joiningDate: row.JoiningDate || '',
            plan: row.Plan || 'Monthly',
            cardNo: row.CardNo || '',
            fee: Number(row.Fee) || 0,
            mode: row.Mode || 'Cash',
            lastPaid: row.LastPaid || '',
            dueDate: row.DueDate || '',
            remarks: row.Remarks || ''
        }));

        const { error } = await supabase.from('students').insert(records);
        if (error) return res.status(500).json({ success: false, message: error.message });

        res.json({ success: true, count: records.length });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Processing failed' });
    }
});

module.exports = app;