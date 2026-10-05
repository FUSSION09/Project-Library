const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

// Raw CSV data passed from the user
const rawDataPath = path.join(__dirname, '..', 'data', 'source_raw_data.csv');
const scratchRaw = path.join('C:', 'Users', 'Lenovo', '.gemini', 'antigravity', 'brain', '2c77e4ce-278c-48d3-b324-45bb2584a726', 'scratch', 'raw_data.csv');

// Also save source_raw_data.csv into data/ directory for permanent reference
const rawCSV = fs.readFileSync(scratchRaw, 'utf8');
fs.writeFileSync(rawDataPath, rawCSV, 'utf8');

const lines = rawCSV.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);

function parseCSVLine(text) {
    const res = [];
    let insideQuotes = false;
    let field = '';
    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (c === '"') {
            insideQuotes = !insideQuotes;
        } else if (c === ',' && !insideQuotes) {
            res.push(field.trim());
            field = '';
        } else {
            field += c;
        }
    }
    res.push(field.trim());
    return res;
}

let currentSection = 1;
const sec1 = [], sec2 = [], sec3 = [], sec4 = [];

for (const line of lines) {
    if (line.includes('FESS REPORT SHEET')) { currentSection = 2; continue; }
    if (line.includes('12 hr students')) { currentSection = 3; continue; }
    if (line.includes('6 Hrs Shift students Data')) { currentSection = 4; continue; }
    if (line.startsWith('S.no')) continue;
    if (currentSection === 1) sec1.push(parseCSVLine(line));
    else if (currentSection === 2) sec2.push(parseCSVLine(line));
    else if (currentSection === 3) sec3.push(parseCSVLine(line));
    else if (currentSection === 4) sec4.push(parseCSVLine(line));
}

// Helpers
function normalizeSeat(seat) {
    if (!seat) return '';
    seat = seat.trim();
    const match = seat.match(/^([A-Za-z])-?0?(\d+)$/);
    if (match) return `${match[1].toUpperCase()}${match[2]}`;
    if (seat.toUpperCase() === 'N.R' || seat.toUpperCase() === 'NR') return 'NR';
    return seat;
}

function cleanFee(fee) {
    if (!fee) return 0;
    const match = String(fee).match(/(\d+)/);
    return match ? parseInt(match[1]) : 0;
}

function getCanonicalId(name, mobile) {
    const normName = (name || '').toLowerCase().replace(/[^a-z]/g, '');
    const cleanPhone = (mobile || '').replace(/\D/g, '').slice(-10);
    
    // Known aliases across sections
    if (normName.includes('akshayghule') || normName.includes('akshaybhau')) return 'akshay_bhau_7030276291';
    if (normName.includes('vidhiyadav')) return 'vidhi_yadav';
    if (normName.includes('rishabsharma')) return 'rishab_sharma';
    if (normName.includes('radheysahu')) return 'radhey_sahu';
    
    if (cleanPhone) return `phone_${cleanPhone}`;
    return `name_${normName}`;
}

const masterMap = new Map();

function getOrCreate(name, mobile) {
    const id = getCanonicalId(name, mobile);
    if (!masterMap.has(id)) {
        masterMap.set(id, {
            id,
            seatNo: '',
            name: (name || '').trim(),
            shift: '12 Hours',
            mobile: (mobile || '').trim(),
            aadhar: '',
            joiningDate: '',
            plan: 'Monthly',
            cardNo: '',
            fee: 0,
            mode: 'Cash',
            lastPaid: '',
            dueDate: '',
            remarks: '',
            months: { may: '', june: '', july: '', aug: '', sep: '', oct: '', nov: '', dec: '' }
        });
    }
    return masterMap.get(id);
}

// 1. Process Section 1
sec1.forEach(r => {
    const s = getOrCreate(r[1], r[2]);
    if (r[1]) s.name = r[1].trim();
    if (r[2]) s.mobile = r[2].trim();
    if (r[3] && r[3].toUpperCase() === 'YES') s.shift = '6 Hours';
    if (r[4] && r[4].toUpperCase() === 'YES') s.shift = '12 Hours';
    if (r[5] && r[5].toUpperCase() === 'YES') s.shift = '24 Hours';
    if (r[6]) s.aadhar = r[6].trim();
    if (r[11]) s.seatNo = normalizeSeat(r[11]);
    if (r[12]) s.cardNo = r[12].trim();
    if (r[13] && r[13].toUpperCase() === 'YES') s.plan = 'Customize';
});

// 2. Process Section 2 (FESS REPORT SHEET)
sec2.forEach(r => {
    const s = getOrCreate(r[1], r[2]);
    if (r[1]) s.name = r[1].trim();
    if (r[2]) s.mobile = r[2].trim();
    if (r[3] && r[3].toUpperCase() === 'YES') s.shift = '6 Hours';
    if (r[4] && r[4].toUpperCase() === 'YES') s.shift = '12 Hours';
    if (r[5] && r[5].toUpperCase() === 'YES') s.shift = '24 Hours';
    if (r[6]) s.aadhar = r[6].trim();
    if (r[8] && (r[8] === '3' || r[8].toUpperCase() === 'YES')) s.plan = 'Quarterly';
    if (r[9] && (r[9] === '6' || r[9].toUpperCase() === 'YES')) s.plan = 'Half-Yearly';
    if (r[10] && (r[10] === '12' || r[10].toUpperCase() === 'YES')) s.plan = 'Yearly';
    if (r[11]) s.seatNo = normalizeSeat(r[11]);
    if (r[12]) s.cardNo = r[12].trim();
    if (r[13] && r[13].toUpperCase() === 'YES') s.plan = 'Customize';
    if (r[14]) s.fee = cleanFee(r[14]);
    if (r[15]) s.lastPaid = r[15].trim();
    if (r[16]) s.joiningDate = r[16].trim();
    if (r[17]) s.dueDate = r[17].trim();
    if (r[19]) s.remarks = r[19].trim();
    
    // Month-by-month payments
    s.months = {
        may: r[20] || '',
        june: r[21] || '',
        july: r[22] || '',
        aug: r[23] || '',
        sep: r[24] || '',
        oct: r[25] || '',
        nov: r[26] || '',
        dec: r[27] || ''
    };
});

// 3. Process Section 3 (12 hr updated)
sec3.forEach(r => {
    const s = getOrCreate(r[1], r[2]);
    if (r[1]) s.name = r[1].trim();
    if (r[2]) s.mobile = r[2].trim();
    s.shift = '12 Hours';
    if (r[3]) s.aadhar = r[3].trim();
    if (r[4] === '3') s.plan = 'Quarterly';
    if (r[5]) s.seatNo = normalizeSeat(r[5]);
    if (r[6]) s.cardNo = r[6].trim();
    if (r[7]) s.fee = cleanFee(r[7]);
    if (r[9]) s.mode = 'UPI';
    else if (r[8]) s.mode = 'Cash';
    if (r[10]) s.lastPaid = r[10].trim();
    if (r[11]) s.joiningDate = r[11].trim();
    if (r[12]) s.dueDate = r[12].trim();
    if (r[14]) {
        s.remarks = r[14].trim(); // Latest remark overrides older
    }
});

// 4. Process Section 4 (6 hr updated)
sec4.forEach(r => {
    const s = getOrCreate(r[1], r[2]);
    if (r[1]) s.name = r[1].trim();
    if (r[2]) s.mobile = r[2].trim();
    s.shift = '6 Hours';
    if (r[3]) s.aadhar = r[3].trim();
    if (r[4] === '2') s.plan = 'Customize';
    if (r[4] === '3') s.plan = 'Quarterly';
    if (r[5]) s.seatNo = normalizeSeat(r[5]);
    if (r[6]) s.cardNo = r[6].trim();
    if (r[7]) s.fee = cleanFee(r[7]);
    if (r[9]) s.mode = 'UPI';
    else if (r[8]) s.mode = 'Cash';
    if (r[10]) s.lastPaid = r[10].trim();
    if (r[11]) s.joiningDate = r[11].trim();
    if (r[12]) s.dueDate = r[12].trim();
    if (r[14]) {
        s.remarks = r[14].trim(); // Latest remark overrides older
    }
});

const allStudents = Array.from(masterMap.values());

// Generate numerical IDs (1 to 97)
allStudents.forEach((s, idx) => {
    s.numericId = idx + 1;
    // Set sensible defaults if empty
    if (!s.seatNo) s.seatNo = 'Pending';
    if (!s.joiningDate && s.lastPaid) s.joiningDate = s.lastPaid;
    if (!s.lastPaid && s.joiningDate) s.lastPaid = s.joiningDate;
});

// Identify active vs terminated
const activeStudents = [];
const pastMembers = [];

allStudents.forEach(s => {
    // If student has explicit remark to terminate or leave (and didn't re-join like Harsh Kumar):
    if (/terminate|leave|remove his books/i.test(s.remarks) && !s.remarks.includes('check msg for fees')) {
        pastMembers.push(s);
    } else {
        activeStudents.push(s);
    }
});

console.log(`Consolidated: Total: ${allStudents.length}, Active: ${activeStudents.length}, Past/Terminated: ${pastMembers.length}`);

// 1. Save data/students.json
const studentsJsonPath = path.join(__dirname, '..', 'data', 'students.json');
fs.writeFileSync(studentsJsonPath, JSON.stringify(allStudents, null, 2), 'utf8');
console.log('Saved data/students.json');

// 2. Save data/past_members.json
const pastJsonPath = path.join(__dirname, '..', 'data', 'past_members.json');
fs.writeFileSync(pastJsonPath, JSON.stringify(pastMembers, null, 2), 'utf8');
console.log('Saved data/past_members.json');

// 3. Save data/students.xlsx (formatted for Admin Bulk Upload)
// Format expected: SeatNo, Name, Shift, Mobile, Aadhar, JoiningDate, Plan, CardNo, Fee, Mode, LastPaid, DueDate, Remarks
const bulkRows = allStudents.map(s => ({
    SeatNo: s.seatNo,
    Name: s.name,
    Shift: s.shift,
    Mobile: s.mobile,
    Aadhar: s.aadhar,
    JoiningDate: s.joiningDate,
    Plan: s.plan,
    CardNo: s.cardNo,
    Fee: s.fee,
    Mode: s.mode,
    LastPaid: s.lastPaid,
    DueDate: s.dueDate,
    Remarks: s.remarks
}));

const wb = xlsx.utils.book_new();
const ws = xlsx.utils.json_to_sheet(bulkRows);
xlsx.utils.book_append_sheet(wb, ws, 'Students');
const excelPath = path.join(__dirname, '..', 'data', 'students.xlsx');
xlsx.writeFile(wb, excelPath);
console.log('Saved data/students.xlsx');

// 4. Save data/students.csv
const csvContent = xlsx.utils.sheet_to_csv(ws);
const csvPath = path.join(__dirname, '..', 'data', 'students.csv');
fs.writeFileSync(csvPath, csvContent, 'utf8');
console.log('Saved data/students.csv');

// 5. Save data/fees_report_master.xlsx (includes monthly tracking MAY..DEC)
const masterFeeRows = allStudents.map(s => ({
    'S.No': s.numericId,
    'Name of Student': s.name,
    'Mobile No': s.mobile,
    'Shift': s.shift,
    'Seat No': s.seatNo,
    'Card No': s.cardNo,
    'Plan': s.plan,
    'Fee (₹)': s.fee,
    'Mode': s.mode,
    'Joining Date': s.joiningDate,
    'Last Payment Date': s.lastPaid,
    'Due Date': s.dueDate,
    'Remarks': s.remarks,
    'May': s.months.may,
    'June': s.months.june,
    'July': s.months.july,
    'Aug': s.months.aug,
    'Sep': s.months.sep,
    'Oct': s.months.oct,
    'Nov': s.months.nov,
    'Dec': s.months.dec
}));

const wbFee = xlsx.utils.book_new();
const wsFee = xlsx.utils.json_to_sheet(masterFeeRows);
xlsx.utils.book_append_sheet(wbFee, wsFee, 'Fee Report Master');
const feeExcelPath = path.join(__dirname, '..', 'data', 'fees_report_master.xlsx');
xlsx.writeFile(wbFee, feeExcelPath);
console.log('Saved data/fees_report_master.xlsx');

const feeCsvContent = xlsx.utils.sheet_to_csv(wsFee);
const feeCsvPath = path.join(__dirname, '..', 'data', 'fees_report_master.csv');
fs.writeFileSync(feeCsvPath, feeCsvContent, 'utf8');
console.log('Saved data/fees_report_master.csv');

// 6. Generate supabase_seed.sql
function escapeSql(str) {
    if (!str) return "''";
    return "'" + String(str).replace(/'/g, "''") + "'";
}

let sql = `-- ==============================================================
-- Friends Library Management System - Database Seed Script
-- Auto-generated from consolidated master data
-- ==============================================================

-- 1. Create Admins Table (if not exists) & default admin
CREATE TABLE IF NOT EXISTS admins (
    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL
);

INSERT INTO admins (username, password)
VALUES ('admin', 'password123')
ON CONFLICT (username) DO UPDATE SET password = EXCLUDED.password;

-- 2. Create Students Table
CREATE TABLE IF NOT EXISTS students (
    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    photo TEXT,
    "seatNo" TEXT,
    name TEXT NOT NULL,
    shift TEXT,
    mobile TEXT,
    aadhar TEXT,
    "joiningDate" TEXT,
    plan TEXT,
    "cardNo" TEXT,
    fee NUMERIC,
    mode TEXT,
    "lastPaid" TEXT,
    "dueDate" TEXT,
    remarks TEXT
);

-- 3. Create Past Members Table
CREATE TABLE IF NOT EXISTS past_members (
    id BIGINT PRIMARY KEY,
    photo TEXT,
    "seatNo" TEXT,
    name TEXT NOT NULL,
    shift TEXT,
    mobile TEXT,
    aadhar TEXT,
    "joiningDate" TEXT,
    plan TEXT,
    "cardNo" TEXT,
    fee NUMERIC,
    mode TEXT,
    "lastPaid" TEXT,
    "dueDate" TEXT,
    remarks TEXT,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. Create Pending Registrations Table
CREATE TABLE IF NOT EXISTS pending_registrations (
    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    photo TEXT,
    "seatNo" TEXT,
    name TEXT NOT NULL,
    shift TEXT,
    mobile TEXT,
    aadhar TEXT,
    "joiningDate" TEXT,
    plan TEXT,
    "cardNo" TEXT,
    fee NUMERIC,
    mode TEXT,
    "lastPaid" TEXT,
    "dueDate" TEXT,
    remarks TEXT,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 5. Create Receipts Table
CREATE TABLE IF NOT EXISTS receipts (
    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    student_id BIGINT,
    receipt_no TEXT,
    student_name TEXT,
    seat_no TEXT,
    fee NUMERIC,
    mode TEXT,
    plan TEXT,
    payment_date TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 6. Insert All 97 Students
INSERT INTO students (id, "seatNo", name, shift, mobile, aadhar, "joiningDate", plan, "cardNo", fee, mode, "lastPaid", "dueDate", remarks)
VALUES
`;

const valuesList = allStudents.map(s => {
    return `(${s.numericId}, ${escapeSql(s.seatNo)}, ${escapeSql(s.name)}, ${escapeSql(s.shift)}, ${escapeSql(s.mobile)}, ${escapeSql(s.aadhar)}, ${escapeSql(s.joiningDate)}, ${escapeSql(s.plan)}, ${escapeSql(s.cardNo)}, ${s.fee}, ${escapeSql(s.mode)}, ${escapeSql(s.lastPaid)}, ${escapeSql(s.dueDate)}, ${escapeSql(s.remarks)})`;
});

sql += valuesList.join(',\n') + `\nON CONFLICT (id) DO UPDATE SET\n  "seatNo" = EXCLUDED."seatNo",\n  name = EXCLUDED.name,\n  shift = EXCLUDED.shift,\n  mobile = EXCLUDED.mobile,\n  "joiningDate" = EXCLUDED."joiningDate",\n  plan = EXCLUDED.plan,\n  fee = EXCLUDED.fee,\n  mode = EXCLUDED.mode,\n  "lastPaid" = EXCLUDED."lastPaid",\n  "dueDate" = EXCLUDED."dueDate",\n  remarks = EXCLUDED.remarks;\n\n`;

// Update identity sequence
sql += `SELECT setval(pg_get_serial_sequence('students', 'id'), coalesce(max(id), 1)) FROM students;\n`;

const sqlPath = path.join(__dirname, '..', 'supabase_seed.sql');
fs.writeFileSync(sqlPath, sql, 'utf8');
console.log('Saved supabase_seed.sql');

console.log('All files generated successfully!');
