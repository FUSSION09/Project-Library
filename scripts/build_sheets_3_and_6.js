const fs = require('fs');
const path = require('path');
const xlsx = require('d:/Project Library/node_modules/xlsx');

const excelPath = 'C:/Users/Lenovo/Downloads/FRIENDS LIBRARY DATA.xlsx';
const wb = xlsx.readFile(excelPath);

function excelDateToString(val) {
    if (!val) return '';
    if (typeof val === 'string' && val.match(/^\d{4}-\d{2}-\d{2}$/)) return val;
    if (typeof val === 'number') {
        const d = new Date(Math.round((val - 25569) * 86400 * 1000));
        return d.toISOString().split('T')[0];
    }
    return String(val);
}

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

// Seat enrichment lookup from Sheet 1 & Sheet 2
const seatLookup = new Map();
['Sheet1', 'Sheet2'].forEach(sheetName => {
    const ws = wb.Sheets[sheetName];
    if (!ws) return;
    const rows = xlsx.utils.sheet_to_json(ws, { header: 1 });
    rows.forEach(r => {
        if (!r || r.length < 12) return;
        const name = String(r[1] || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
        const phone = String(r[2] || '').replace(/\D/g, '').slice(-10);
        const seat = normalizeSeat(String(r[11] || ''));
        if (seat && seat !== 'Pending') {
            if (phone) seatLookup.set(phone, seat);
            if (name) seatLookup.set(name, seat);
        }
    });
});

function parseSheet(sheetName, shiftName) {
    const ws = wb.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(ws, { header: 1 });
    const rows = [];
    for (let i = 2; i < data.length; i++) {
        const r = data[i];
        if (!r || r.length === 0 || !r[1]) continue;
        const name = String(r[1] || '').trim();
        const mobile = String(r[2] || '').trim();
        const phoneClean = mobile.replace(/\D/g, '').slice(-10);
        const nameClean = name.toLowerCase().replace(/[^a-z0-9]/g, '');

        let seat = normalizeSeat(String(r[5] || ''));
        if (!seat || seat === 'Pending') {
            seat = seatLookup.get(phoneClean) || seatLookup.get(nameClean) || 'Pending';
        }

        const monthlyVal = String(r[4] || '').trim();
        let plan = 'Monthly';
        if (monthlyVal === '3') plan = 'Quarterly';
        else if (monthlyVal === '2') plan = 'Customize';
        else if (monthlyVal === '6') plan = 'Half-Yearly';
        else if (monthlyVal === '12') plan = 'Yearly';

        let mode = 'Cash';
        if (r[9]) mode = 'UPI';
        else if (r[8]) mode = 'Cash';

        rows.push({
            name,
            mobile,
            shift: shiftName,
            aadhar: String(r[3] || '').trim(),
            seatNo: seat,
            cardNo: String(r[6] || '').trim(),
            plan,
            fee: cleanFee(r[7]),
            mode,
            lastPaid: excelDateToString(r[10]),
            joiningDate: excelDateToString(r[11]),
            dueDate: excelDateToString(r[12]),
            dueStatus: String(r[13] || '').trim(),
            remarks: String(r[14] || '').trim()
        });
    }
    return rows;
}

const sheet3List = parseSheet('Sheet3', '12 Hours');
const sheet6List = parseSheet('Sheet6', '6 Hours');

console.log('Sheet 3 count:', sheet3List.length);
console.log('Sheet 6 count:', sheet6List.length);

const combinedActive = [...sheet3List, ...sheet6List];
combinedActive.forEach((s, idx) => {
    s.id = idx + 1;
    s.numericId = idx + 1;
});

// Format for bulk upload
function toBulkRows(list) {
    return list.map(s => ({
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
}

// 1. Save data/sheet3_12hr_students.xlsx & .csv
const wb3 = xlsx.utils.book_new();
const ws3 = xlsx.utils.json_to_sheet(toBulkRows(sheet3List));
xlsx.utils.book_append_sheet(wb3, ws3, '12 Hr Students');
xlsx.writeFile(wb3, path.join(__dirname, '..', 'data', 'sheet3_12hr_students.xlsx'));
fs.writeFileSync(path.join(__dirname, '..', 'data', 'sheet3_12hr_students.csv'), xlsx.utils.sheet_to_csv(ws3), 'utf8');

// 2. Save data/sheet6_6hr_students.xlsx & .csv
const wb6 = xlsx.utils.book_new();
const ws6 = xlsx.utils.json_to_sheet(toBulkRows(sheet6List));
xlsx.utils.book_append_sheet(wb6, ws6, '6 Hr Students');
xlsx.writeFile(wb6, path.join(__dirname, '..', 'data', 'sheet6_6hr_students.xlsx'));
fs.writeFileSync(path.join(__dirname, '..', 'data', 'sheet6_6hr_students.csv'), xlsx.utils.sheet_to_csv(ws6), 'utf8');

// 3. Save data/active_students_sheet3_and_6.xlsx & .csv & .json
const wbActive = xlsx.utils.book_new();
const wsActive = xlsx.utils.json_to_sheet(toBulkRows(combinedActive));
xlsx.utils.book_append_sheet(wbActive, wsActive, 'Active Students');
xlsx.writeFile(wbActive, path.join(__dirname, '..', 'data', 'active_students_sheet3_and_6.xlsx'));
fs.writeFileSync(path.join(__dirname, '..', 'data', 'active_students_sheet3_and_6.csv'), xlsx.utils.sheet_to_csv(wsActive), 'utf8');
fs.writeFileSync(path.join(__dirname, '..', 'data', 'active_students_sheet3_and_6.json'), JSON.stringify(combinedActive, null, 2), 'utf8');

// 4. Update data/students.json and data/students.xlsx so the active dashboard displays Sheet 3 and Sheet 6!
fs.writeFileSync(path.join(__dirname, '..', 'data', 'students.json'), JSON.stringify(combinedActive, null, 2), 'utf8');
xlsx.writeFile(wbActive, path.join(__dirname, '..', 'data', 'students.xlsx'));
fs.writeFileSync(path.join(__dirname, '..', 'data', 'students.csv'), xlsx.utils.sheet_to_csv(wsActive), 'utf8');

// 5. Update past_members.json with non-active historical members from Sheet 1 & Sheet 2
const activePhones = new Set(combinedActive.map(s => s.mobile.replace(/\D/g, '').slice(-10)).filter(Boolean));
const activeNames = new Set(combinedActive.map(s => s.name.toLowerCase().replace(/[^a-z0-9]/g, '')));

const pastList = [];
['Sheet1', 'Sheet2'].forEach(sheetName => {
    const ws = wb.Sheets[sheetName];
    if (!ws) return;
    const rows = xlsx.utils.sheet_to_json(ws, { header: 1 });
    for (let i = 2; i < rows.length; i++) {
        const r = rows[i];
        if (!r || !r[1]) continue;
        const name = String(r[1] || '').trim();
        const mobile = String(r[2] || '').trim();
        const phoneClean = mobile.replace(/\D/g, '').slice(-10);
        const nameClean = name.toLowerCase().replace(/[^a-z0-9]/g, '');

        if (!activePhones.has(phoneClean) && !activeNames.has(nameClean)) {
            const alreadyInPast = pastList.some(p => p.mobile && phoneClean ? p.mobile.includes(phoneClean) : p.name.toLowerCase() === name.toLowerCase());
            if (!alreadyInPast) {
                pastList.push({
                    id: pastList.length + 100,
                    name,
                    mobile,
                    shift: r[3] && String(r[3]).toUpperCase() === 'YES' ? '6 Hours' : (r[5] && String(r[5]).toUpperCase() === 'YES' ? '24 Hours' : '12 Hours'),
                    aadhar: String(r[6] || '').trim(),
                    seatNo: normalizeSeat(String(r[11] || '')),
                    cardNo: String(r[12] || '').trim(),
                    plan: 'Monthly',
                    fee: cleanFee(r[14]),
                    mode: 'Cash',
                    lastPaid: excelDateToString(r[15]),
                    joiningDate: excelDateToString(r[16]),
                    dueDate: excelDateToString(r[17]),
                    remarks: String(r[19] || '').trim() || 'Past member (Sheet 1/2)'
                });
            }
        }
    }
});

fs.writeFileSync(path.join(__dirname, '..', 'data', 'past_members.json'), JSON.stringify(pastList, null, 2), 'utf8');
console.log('Saved data/past_members.json (' + pastList.length + ' past members)');

// 6. Generate supabase_seed_sheets_3_and_6.sql
function escapeSql(str) {
    if (!str) return "''";
    return "'" + String(str).replace(/'/g, "''") + "'";
}

let sql = `-- ==============================================================
-- Friends Library - Sheet 3 (12Hr) & Sheet 6 (6Hr) Seed Script
-- Total Active Members: ${combinedActive.length}
-- ==============================================================

-- 1. Create Admins Table & Default Admin
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

-- 3. Insert 46 Active Students from Sheet 3 and Sheet 6
INSERT INTO students (id, "seatNo", name, shift, mobile, aadhar, "joiningDate", plan, "cardNo", fee, mode, "lastPaid", "dueDate", remarks)
VALUES
`;

const valuesList = combinedActive.map(s => {
    return `(${s.id}, ${escapeSql(s.seatNo)}, ${escapeSql(s.name)}, ${escapeSql(s.shift)}, ${escapeSql(s.mobile)}, ${escapeSql(s.aadhar)}, ${escapeSql(s.joiningDate)}, ${escapeSql(s.plan)}, ${escapeSql(s.cardNo)}, ${s.fee}, ${escapeSql(s.mode)}, ${escapeSql(s.lastPaid)}, ${escapeSql(s.dueDate)}, ${escapeSql(s.remarks)})`;
});

sql += valuesList.join(',\n') + `\nON CONFLICT (id) DO UPDATE SET\n  "seatNo" = EXCLUDED."seatNo",\n  name = EXCLUDED.name,\n  shift = EXCLUDED.shift,\n  mobile = EXCLUDED.mobile,\n  "joiningDate" = EXCLUDED."joiningDate",\n  plan = EXCLUDED.plan,\n  fee = EXCLUDED.fee,\n  mode = EXCLUDED.mode,\n  "lastPaid" = EXCLUDED."lastPaid",\n  "dueDate" = EXCLUDED."dueDate",\n  remarks = EXCLUDED.remarks;\n\n`;

sql += `SELECT setval(pg_get_serial_sequence('students', 'id'), coalesce(max(id), 1)) FROM students;\n`;

fs.writeFileSync(path.join(__dirname, '..', 'data', 'supabase_seed_sheets_3_and_6.sql'), sql, 'utf8');

console.log('Successfully created all Sheet 3 and Sheet 6 data files!');
