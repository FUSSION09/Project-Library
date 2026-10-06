const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Error: Please provide SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.');
    console.error('Usage:');
    console.error('  $env:SUPABASE_URL="https://your-project.supabase.co"; $env:SUPABASE_SERVICE_ROLE_KEY="your-key"; node scripts/seed_supabase.js');
    console.error('\nAlternatively, you can copy and run the generated "supabase_seed.sql" directly in the Supabase SQL Editor.');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function seed() {
    console.log('Starting Supabase seed...');
    const studentsPath = path.join(__dirname, '..', 'data', 'students.json');
    const students = JSON.parse(fs.readFileSync(studentsPath, 'utf8'));

    // 1. Ensure admin exists
    const { error: adminErr } = await supabase.from('admins').upsert([{ username: 'admin@friendslibrary.com', password: 'Tarun@2604' }]);
    if (adminErr) console.warn('Admin upsert notice:', adminErr.message);
    else console.log('Admin account ensured (admin@friendslibrary.com / Tarun@2604).');

    // 2. Insert students
    console.log(`Inserting ${students.length} students into Supabase...`);
    const records = students.map(s => ({
        id: s.numericId,
        seatNo: s.seatNo,
        name: s.name,
        shift: s.shift,
        mobile: s.mobile,
        aadhar: s.aadhar,
        joiningDate: s.joiningDate,
        plan: s.plan,
        cardNo: s.cardNo,
        fee: s.fee,
        mode: s.mode,
        lastPaid: s.lastPaid,
        dueDate: s.dueDate,
        remarks: s.remarks
    }));

    const { data, error } = await supabase.from('students').upsert(records);
    if (error) {
        console.error('Error seeding students:', error.message);
        process.exit(1);
    }

    console.log(`Successfully seeded ${records.length} students into Supabase!`);
}

seed();
