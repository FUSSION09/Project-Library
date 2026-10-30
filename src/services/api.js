const API_BASE = '/api';

export const api = {
    // Auth
    async adminLogin(username, password) {
        const res = await fetch(`${API_BASE}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        return res.json();
    },

    async studentLogin(mobile, password) {
        const res = await fetch(`${API_BASE}/student/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mobile, password })
        });
        return res.json();
    },

    async studentChangePassword(payload) {
        const res = await fetch(`${API_BASE}/student/change-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        return res.json();
    },

    // Students
    async getStudents() {
        const res = await fetch(`${API_BASE}/students`);
        return res.json();
    },

    async saveStudent(formData, id = null) {
        const method = id ? 'PUT' : 'POST';
        const url = id ? `${API_BASE}/students/${id}` : `${API_BASE}/students`;
        const res = await fetch(url, {
            method,
            body: formData
        });
        return res.json();
    },

    async updateStudentPassword(id, password) {
        const res = await fetch(`${API_BASE}/students/${encodeURIComponent(id)}/password`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });
        return res.json();
    },

    async adjustLeave(id, daysToAdjust) {
        const res = await fetch(`${API_BASE}/students/${id}/adjust-leave`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ daysToAdjust })
        });
        return res.json();
    },

    async deleteStudent(id) {
        const res = await fetch(`${API_BASE}/students/${id}`, {
            method: 'DELETE'
        });
        return res.json();
    },

    async uploadExcel(file) {
        const formData = new FormData();
        formData.append('excel', file);
        const res = await fetch(`${API_BASE}/students/bulk-upload`, {
            method: 'POST',
            body: formData
        });
        return res.json();
    },

    // Registrations
    async registerStudent(formData) {
        const res = await fetch(`${API_BASE}/register`, {
            method: 'POST',
            body: formData
        });
        return res.json();
    },

    async getPendingRegistrations() {
        const res = await fetch(`${API_BASE}/pending-registrations`);
        return res.json();
    },

    async approveRegistration(id) {
        const res = await fetch(`${API_BASE}/approve-registration/${id}`, {
            method: 'POST'
        });
        return res.json();
    },

    async rejectRegistration(id) {
        const res = await fetch(`${API_BASE}/pending-registrations/${id}`, {
            method: 'DELETE'
        });
        return res.json();
    },

    // Past Members
    async getPastMembers() {
        const res = await fetch(`${API_BASE}/past-members`);
        return res.json();
    },

    // Seats & Receipts
    async getSeatShiftStatus() {
        const res = await fetch(`${API_BASE}/seats-shift-status`);
        return res.json();
    },

    async getReceipts(params = {}) {
        const query = new URLSearchParams(params).toString();
        const url = query ? `${API_BASE}/receipts?${query}` : `${API_BASE}/receipts`;
        const res = await fetch(url);
        return res.json();
    },

    async saveReceipt(receiptData) {
        const res = await fetch(`${API_BASE}/receipts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(receiptData)
        });
        return res.json();
    }
};

