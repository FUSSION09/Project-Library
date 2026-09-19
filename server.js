const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const xlsx = require('xlsx'); 
const app = express();
const PORT = 3000;

app.use(cors()); 
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));

const uploadDir = './uploads';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) { cb(null, 'uploads/') },
    filename: function (req, file, cb) { cb(null, Date.now() + path.extname(file.originalname)) }
});
const upload = multer({ storage: storage });

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Anjali1@',
    database: 'library_db' 
});

db.connect((err) => {
    if (err) {
        console.error("MySQL Connection Error:", err.message);
        return;
    }
    console.log("Connected to the MySQL database.");

    const createAdminsTable = `CREATE TABLE IF NOT EXISTS admins (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) UNIQUE,
        password VARCHAR(255)
    )`;
    
    const createStudentsTable = `CREATE TABLE IF NOT EXISTS students (
        id INT AUTO_INCREMENT PRIMARY KEY,
        photo VARCHAR(255),
        seatNo VARCHAR(50), name VARCHAR(255), shift VARCHAR(50), 
        mobile VARCHAR(20), aadhar VARCHAR(20), 
        joiningDate VARCHAR(50), plan VARCHAR(50), cardNo VARCHAR(50), 
        fee INT, mode VARCHAR(50), lastPaid VARCHAR(50), dueDate VARCHAR(50), remarks VARCHAR(255)
    )`;

    const createPastMembersTable = `CREATE TABLE IF NOT EXISTS past_members (
        id INT,
        photo VARCHAR(255),
        seatNo VARCHAR(50), 
        name VARCHAR(255), 
        shift VARCHAR(50), 
        mobile VARCHAR(20), 
        aadhar VARCHAR(20), 
        joiningDate VARCHAR(50), 
        plan VARCHAR(50), 
        cardNo VARCHAR(50), 
        fee INT, 
        mode VARCHAR(50), 
        lastPaid VARCHAR(50), 
        dueDate VARCHAR(50), 
        remarks VARCHAR(255),
        deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`;

    const createReceiptsTable = `CREATE TABLE IF NOT EXISTS receipts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_id INT,
        receipt_no VARCHAR(50),
        student_name VARCHAR(255),
        seat_no VARCHAR(50),
        fee INT,
        mode VARCHAR(50),
        plan VARCHAR(50),
        payment_date VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`;

    const createPendingTable = `CREATE TABLE IF NOT EXISTS pending_registrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        photo VARCHAR(255),
        seatNo VARCHAR(50), 
        name VARCHAR(255), 
        shift VARCHAR(50), 
        mobile VARCHAR(20), 
        aadhar VARCHAR(20), 
        joiningDate VARCHAR(50), 
        plan VARCHAR(50), 
        cardNo VARCHAR(50), 
        fee INT, 
        mode VARCHAR(50), 
        lastPaid VARCHAR(50), 
        dueDate VARCHAR(50), 
        remarks VARCHAR(255),
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`;

    db.query(createAdminsTable, (err) => {
        if (err) console.error(err);
        db.query(`INSERT IGNORE INTO admins (username, password) VALUES ('admin', 'password123')`);
    });

    db.query(createStudentsTable, (err) => { if (err) console.error(err); });
    db.query(createPastMembersTable, (err) => { if (err) console.error(err); });
    db.query(createReceiptsTable, (err) => { if (err) console.error(err); });
    db.query(createPendingTable, (err) => { if (err) console.error(err); });
});

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    db.query(`SELECT * FROM admins WHERE username = ? AND password = ?`, [username, password], (err, results) => {
        if (err) return res.status(500).json({ success: false, message: "Database error" });
        if (results.length > 0) res.json({ success: true, message: "Login successful!" });
        else res.status(401).json({ success: false, message: "Invalid username or password" });
    });
});

app.get('/api/students', (req, res) => {
    db.query(`SELECT * FROM students`, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.get('/api/past-members', (req, res) => {
    db.query(`SELECT * FROM past_members ORDER BY deleted_at DESC`, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.get('/api/receipts', (req, res) => {
    db.query(`SELECT * FROM receipts ORDER BY id DESC`, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.get('/api/receipts/student/:id', (req, res) => {
    db.query(`SELECT * FROM receipts WHERE student_id = ? ORDER BY id DESC`, [req.params.id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.get('/api/seats-shift-status', (req, res) => {
    db.query(`SELECT id, seatNo, name, shift, lastPaid, dueDate FROM students`, (err, students) => {
        if (err) return res.status(500).json({ error: err.message });

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
});

app.post('/api/receipts', (req, res) => {
    const { student_id, receipt_no, student_name, seat_no, fee, mode, plan, payment_date } = req.body;
    const query = `INSERT INTO receipts (student_id, receipt_no, student_name, seat_no, fee, mode, plan, payment_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
    db.query(query, [student_id, receipt_no, student_name, seat_no, fee, mode, plan, payment_date], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, message: "Receipt saved successfully" });
    });
});

app.post('/api/register', upload.single('photo'), (req, res) => {
    const { seatNo, name, shift, mobile, aadhar, joiningDate, plan, cardNo, fee, mode, lastPaid, dueDate, remarks } = req.body;
    const photoPath = req.file ? `/uploads/${req.file.filename}` : null;

    const query = `INSERT INTO pending_registrations (photo, seatNo, name, shift, mobile, aadhar, joiningDate, plan, cardNo, fee, mode, lastPaid, dueDate, remarks) 
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    
    db.query(query, [photoPath, seatNo || 'Pending', name, shift, mobile, aadhar, joiningDate, plan, cardNo || '', fee, mode, lastPaid, dueDate, remarks || ''], (err, result) => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        res.json({ success: true, message: "Registration submitted successfully! Pending admin approval." });
    });
});

app.get('/api/pending-registrations', (req, res) => {
    db.query(`SELECT * FROM pending_registrations ORDER BY submitted_at DESC`, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.post('/api/approve-registration/:id', (req, res) => {
    const pendingId = req.params.id;

    db.query(`SELECT * FROM pending_registrations WHERE id = ?`, [pendingId], (err, rows) => {
        if (err || rows.length === 0) return res.status(404).json({ success: false, message: "Pending registration not found." });

        const student = rows[0];

        const insertQuery = `INSERT INTO students (photo, seatNo, name, shift, mobile, aadhar, joiningDate, plan, cardNo, fee, mode, lastPaid, dueDate, remarks) 
                             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        
        db.query(insertQuery, [
            student.photo, student.seatNo, student.name, student.shift, student.mobile, student.aadhar, 
            student.joiningDate, student.plan, student.cardNo, student.fee, student.mode, student.lastPaid, student.dueDate, student.remarks
        ], (insertErr, insertResult) => {
            if (insertErr) return res.status(500).json({ success: false, error: insertErr.message });

            const newStudentId = insertResult.insertId;

            const receiptNo = `REC-${Date.now().toString().slice(-6)}`;
            db.query(`INSERT INTO receipts (student_id, receipt_no, student_name, seat_no, fee, mode, plan, payment_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, 
            [newStudentId, receiptNo, student.name, student.seatNo, student.fee, student.mode, student.plan, student.lastPaid], (receiptErr) => {
                if (receiptErr) console.error("Error auto-generating receipt:", receiptErr.message);
            });

            db.query(`DELETE FROM pending_registrations WHERE id = ?`, [pendingId], (delErr) => {
                if (delErr) console.error("Error clearing pending record:", delErr);
                res.json({ success: true, message: "Student approved and added to live database successfully!" });
            });
        });
    });
});

app.delete('/api/pending-registrations/:id', (req, res) => {
    db.query(`DELETE FROM pending_registrations WHERE id = ?`, [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, message: "Pending registration rejected." });
    });
});

app.post('/api/students', upload.single('photo'), (req, res) => {
    const { seatNo, name, shift, mobile, aadhar, joiningDate, plan, cardNo, fee, mode, lastPaid, dueDate, remarks } = req.body;
    const photoPath = req.file ? `/uploads/${req.file.filename}` : null;

    const query = `INSERT INTO students (photo, seatNo, name, shift, mobile, aadhar, joiningDate, plan, cardNo, fee, mode, lastPaid, dueDate, remarks) 
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    
    db.query(query, [photoPath, seatNo, name, shift, mobile, aadhar, joiningDate, plan, cardNo, fee, mode, lastPaid, dueDate, remarks], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        
        const receiptNo = `REC-${Date.now().toString().slice(-6)}`;
        db.query(`INSERT INTO receipts (student_id, receipt_no, student_name, seat_no, fee, mode, plan, payment_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, 
        [result.insertId, receiptNo, name, seatNo, fee, mode, plan, lastPaid || new Date().toISOString().split('T')[0]]);

        res.json({ success: true, id: result.insertId, message: "Student added successfully" });
    });
});

app.put('/api/students/:id', upload.single('photo'), (req, res) => {
    const { seatNo, name, shift, mobile, aadhar, joiningDate, plan, cardNo, fee, mode, lastPaid, dueDate, remarks } = req.body;
    const id = req.params.id;

    let query = `UPDATE students SET seatNo=?, name=?, shift=?, mobile=?, aadhar=?, joiningDate=?, plan=?, cardNo=?, fee=?, mode=?, lastPaid=?, dueDate=?, remarks=?`;
    let params = [seatNo, name, shift, mobile, aadhar, joiningDate, plan, cardNo, fee, mode, lastPaid, dueDate, remarks];

    if (req.file) {
        const photoPath = `/uploads/${req.file.filename}`;
        query = `UPDATE students SET photo=?, ` + query.substring(14);
        params.unshift(photoPath);
    }
    query += ` WHERE id=?`;
    params.push(id);

    db.query(query, params, (err) => {
        if (err) return res.status(500).json({ error: err.message });

        const receiptNo = `REC-${Date.now().toString().slice(-6)}`;
        db.query(`INSERT INTO receipts (student_id, receipt_no, student_name, seat_no, fee, mode, plan, payment_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, 
        [id, receiptNo, name, seatNo, fee, mode, plan, lastPaid || new Date().toISOString().split('T')[0]], (receiptErr) => {
            if (receiptErr) console.error("Error auto-generating receipt:", receiptErr.message);
            res.json({ success: true, message: "Student updated and receipt generated automatically" });
        });
    });
});

// NEW ENDPOINT: Adjust Leave / Extend Due Date
app.put('/api/students/:id/adjust-leave', (req, res) => {
    const id = req.params.id;
    const { daysToAdjust } = req.body;

    db.query(`SELECT dueDate, remarks FROM students WHERE id = ?`, [id], (err, rows) => {
        if(err || rows.length === 0) return res.status(500).json({error: "Student not found"});
        
        let currentDue = new Date(rows[0].dueDate);
        currentDue.setDate(currentDue.getDate() + parseInt(daysToAdjust));
        
        const newDueStr = currentDue.toISOString().split('T')[0];
        const newRemarks = rows[0].remarks ? rows[0].remarks + ` | Extended ${daysToAdjust} days` : `Extended ${daysToAdjust} days`;

        db.query(`UPDATE students SET dueDate=?, remarks=? WHERE id=?`, [newDueStr, newRemarks, id], (updateErr) => {
            if (updateErr) return res.status(500).json({ error: updateErr.message });
            res.json({ success: true, newDueDate: newDueStr, message: "Leave adjusted successfully" });
        });
    });
});

app.delete('/api/students/:id', (req, res) => {
    db.query(`DELETE FROM students WHERE id = ?`, [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, message: "Student deleted and archived successfully" });
    });
});

app.post('/api/students/bulk-upload', upload.single('excel'), (req, res) => {
    if (!req.file) return res.status(400).json({ success: false, message: "No file uploaded" });

    try {
        const workbook = xlsx.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0]; 
        const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

        if (data.length === 0) {
            fs.unlinkSync(req.file.path);
            return res.status(400).json({ success: false, message: "Excel file is empty" });
        }

        const query = `INSERT INTO students (seatNo, name, shift, mobile, aadhar, joiningDate, plan, cardNo, fee, mode, lastPaid, dueDate, remarks) VALUES ?`;
        
        const values = data.map(row => [
            row.SeatNo || '', 
            row.Name || '', 
            row.Shift || '6 Hours', 
            row.Mobile || '', 
            row.Aadhar || '', 
            row.JoiningDate || '',
            row.Plan || 'Monthly', 
            row.CardNo || '', 
            row.Fee || 0, 
            row.Mode || 'Cash', 
            row.LastPaid || '', 
            row.DueDate || '', 
            row.Remarks || ''
        ]);

        db.query(query, [values], (err, result) => {
            fs.unlinkSync(req.file.path);
            if (err) return res.status(500).json({ success: false, message: "Database error during upload." });
            res.json({ success: true, message: "Bulk upload successful!", count: result.affectedRows });
        });

    } catch (error) {
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        res.status(500).json({ success: false, message: "Failed to process Excel file." });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});