const path = require('path');
const xlsx = require('d:/Project Library/node_modules/xlsx');
const fs = require('fs');

const wb = xlsx.readFile('C:/Users/Lenovo/Downloads/FRIENDS LIBRARY DATA.xlsx');

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

// Build seat enrichment lookup from Sheet 1 and Sheet 2
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

console.log('Enrichment seat lookup entries:', seatLookup.size);

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

const s3 = parseSheet('Sheet3', '12 Hours');
const s6 = parseSheet('Sheet6', '6 Hours');

console.log('\n--- Sheet 3 (12 Hours) parsed (' + s3.length + ') ---');
s3.forEach((s, idx) => console.log(`${idx+1}. [${s.shift}] Seat:${s.seatNo} | ${s.name} (${s.mobile}) | ₹${s.fee} | Plan:${s.plan} | Last:${s.lastPaid} | Due:${s.dueDate} | Rem:${s.remarks}`));

console.log('\n--- Sheet 6 (6 Hours) parsed (' + s6.length + ') ---');
s6.forEach((s, idx) => console.log(`${idx+1}. [${s.shift}] Seat:${s.seatNo} | ${s.name} (${s.mobile}) | ₹${s.fee} | Plan:${s.plan} | Last:${s.lastPaid} | Due:${s.dueDate} | Rem:${s.remarks}`));
