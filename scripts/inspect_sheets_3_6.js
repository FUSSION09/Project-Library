const xlsx = require('d:/Project Library/node_modules/xlsx');

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

function parseSheet(sheetName, shiftName) {
    const ws = wb.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(ws, { header: 1 });
    // Row 0 is title, Row 1 is header
    const rows = [];
    for (let i = 2; i < data.length; i++) {
        const r = data[i];
        if (!r || r.length === 0 || !r[1]) continue; // skip blank
        rows.push({
            sno: r[0],
            name: String(r[1] || '').trim(),
            mobile: String(r[2] || '').trim(),
            adhar: String(r[3] || '').trim(),
            monthly: r[4] !== undefined ? String(r[4]).trim() : '',
            seatNo: String(r[5] || '').trim(),
            cardNo: String(r[6] || '').trim(),
            fee: r[7] !== undefined ? String(r[7]).trim() : '',
            cash: r[8] !== undefined ? String(r[8]).trim() : '',
            upi: r[9] !== undefined ? String(r[9]).trim() : '',
            lastPaid: excelDateToString(r[10]),
            joiningDate: excelDateToString(r[11]),
            dueDate: excelDateToString(r[12]),
            dueStatus: r[13] !== undefined ? String(r[13]).trim() : '',
            remarks: r[14] !== undefined ? String(r[14]).trim() : '',
            shift: shiftName
        });
    }
    return rows;
}

const sheet3Rows = parseSheet('Sheet3', '12 Hours');
const sheet6Rows = parseSheet('Sheet6', '6 Hours');

console.log('Sheet 3 (12 Hours) students count:', sheet3Rows.length);
sheet3Rows.forEach((s, i) => {
    console.log(`${i+1}. [${s.shift}] ${s.name} | Phone: ${s.mobile} | Seat: ${s.seatNo || '-'} | Fee: ₹${s.fee} | Last: ${s.lastPaid} | Join: ${s.joiningDate} | Due: ${s.dueDate} | Rem: ${s.remarks}`);
});

console.log('\nSheet 6 (6 Hours) students count:', sheet6Rows.length);
sheet6Rows.forEach((s, i) => {
    console.log(`${i+1}. [${s.shift}] ${s.name} | Phone: ${s.mobile} | Seat: ${s.seatNo || '-'} | Fee: ₹${s.fee} | Last: ${s.lastPaid} | Join: ${s.joiningDate} | Due: ${s.dueDate} | Rem: ${s.remarks}`);
});
