const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');

describe('Data Integrity and Storage Validation Suite', () => {
    const studentsPath = path.join(__dirname, '..', 'data', 'students.json');
    const pastPath = path.join(__dirname, '..', 'data', 'past_members.json');

    describe('Active Students File (data/students.json)', () => {
        it('should exist and parse as valid JSON array', () => {
            assert.ok(fs.existsSync(studentsPath), 'data/students.json must exist');
            const content = fs.readFileSync(studentsPath, 'utf8');
            const data = JSON.parse(content);
            assert.ok(Array.isArray(data), 'students.json must contain an array');
            assert.ok(data.length > 0, 'students.json should have student records');
        });

        it('should adhere to required schema for every student record', () => {
            const students = JSON.parse(fs.readFileSync(studentsPath, 'utf8'));
            const allowedShifts = ['6 Hours', '12 Hours', '24 Hours'];

            students.forEach((student, index) => {
                const label = `Student at index ${index} (${student.name || 'Unnamed'})`;
                
                assert.ok(student.id !== undefined, `${label} must have an id`);
                assert.ok(typeof student.name === 'string' && student.name.trim().length > 0, `${label} must have a non-empty name`);
                assert.ok(typeof student.mobile === 'string', `${label} mobile must be a string`);
                
                // Phone number check (must be 10 digits for all active students)
                const cleanPhone = (student.mobile || '').replace(/\D/g, '');
                assert.ok(cleanPhone.length >= 10, `${label} mobile must have at least 10 digits`);

                // Shift check
                assert.ok(allowedShifts.includes(student.shift), `${label} shift '${student.shift}' must be valid`);

                // Fee check
                assert.ok(typeof student.fee === 'number' && !isNaN(student.fee) && student.fee >= 0, `${label} fee must be non-negative number`);

                // Password check
                if (student.password) {
                    assert.ok(typeof student.password === 'string' || typeof student.password === 'number');
                }
            });
        });

        it('should have unique IDs across all active students', () => {
            const students = JSON.parse(fs.readFileSync(studentsPath, 'utf8'));
            const idSet = new Set();

            students.forEach((student, index) => {
                assert.ok(!idSet.has(student.id), `Duplicate student ID ${student.id} found at index ${index}`);
                idSet.add(student.id);
            });
        });

        it('should not contain duplicate occupied seat assignments within the same shift', () => {
            const students = JSON.parse(fs.readFileSync(studentsPath, 'utf8'));
            const occupiedMap = new Map();

            students.forEach(student => {
                const seat = (student.seatNo || '').trim().toUpperCase();
                if (!seat || seat === 'PENDING') return;

                const key = `${student.shift}:::${seat}`;
                assert.ok(!occupiedMap.has(key), `Conflict: Seat ${seat} is assigned to both '${occupiedMap.get(key)}' and '${student.name}' for shift '${student.shift}'`);
                occupiedMap.set(key, student.name);
            });
        });

        it('should ensure all active students have valid 10-digit mobile numbers', () => {
            const students = JSON.parse(fs.readFileSync(studentsPath, 'utf8'));
            const missingMobile = students.filter(s => !s.mobile || s.mobile.replace(/\D/g, '').length < 10);
            assert.strictEqual(missingMobile.length, 0, 'All active students must have valid 10-digit mobile numbers');
        });
    });

    describe('Past Members File (data/past_members.json)', () => {
        it('should exist and parse as valid JSON array', () => {
            assert.ok(fs.existsSync(pastPath), 'data/past_members.json must exist');
            const content = fs.readFileSync(pastPath, 'utf8');
            const data = JSON.parse(content);
            assert.ok(Array.isArray(data), 'past_members.json must contain an array');
        });

        it('should retain legacy and archived records with financial history (e.g. Shri ram hardware)', () => {
            const pastMembers = JSON.parse(fs.readFileSync(pastPath, 'utf8'));
            const foundArchived = pastMembers.find(m => m.name === 'Shri ram hardware');
            assert.ok(foundArchived, 'Shri ram hardware should be archived in past_members');
            assert.strictEqual(foundArchived.fee, 800);
            assert.strictEqual(foundArchived.mode, 'Cash');
        });

        it('should retain essential identification fields for archived members', () => {
            const pastMembers = JSON.parse(fs.readFileSync(pastPath, 'utf8'));

            pastMembers.forEach((member, index) => {
                const label = `Past member at index ${index}`;
                assert.ok(member.id !== undefined, `${label} must have an id`);
                assert.ok(typeof member.name === 'string' && member.name.trim().length > 0, `${label} must have a name`);
            });
        });
    });
});
