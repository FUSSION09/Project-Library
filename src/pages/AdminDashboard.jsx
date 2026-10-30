import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import { getDaysDiff, getFormattedToday } from '../utils/dateUtils';
import StudentModal from '../components/StudentModal';
import ChangePasswordModal from '../components/ChangePasswordModal';
import ReceiptModal from '../components/ReceiptModal';

export default function AdminDashboard() {
    const navigate = useNavigate();
    const formattedToday = getFormattedToday();

    const [dbStudents, setDbStudents] = useState([]);
    const [pendingStudents, setPendingStudents] = useState([]);
    const [pastMembers, setPastMembers] = useState([]);
    const [seatMapping, setSeatMapping] = useState({});

    const [currentView, setCurrentView] = useState('active'); // 'active' | 'pending' | 'past'
    const [shiftFilter, setShiftFilter] = useState('All');
    const [statusFilter, setStatusFilter] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');

    const [isSeatsVisible, setIsSeatsVisible] = useState(false);
    const [isRevenueVisible, setIsRevenueVisible] = useState(false);
    const [visibleFees, setVisibleFees] = useState({});
    const [visiblePasswords, setVisiblePasswords] = useState({});

    // Modals
    const [studentModalOpen, setStudentModalOpen] = useState(false);
    const [studentToEdit, setStudentToEdit] = useState(null);

    const [changePwdModalOpen, setChangePwdModalOpen] = useState(false);
    const [passwordStudent, setPasswordStudent] = useState(null);

    const [receiptModalOpen, setReceiptModalOpen] = useState(false);
    const [activeReceiptData, setActiveReceiptData] = useState(null);

    useEffect(() => {
        if (localStorage.getItem('isLoggedIn') !== 'true') {
            navigate('/login');
            return;
        }
        fetchData();
    }, [navigate]);

    const fetchData = async () => {
        try {
            const [studentsRes, pendingRes, pastRes, seatRes] = await Promise.all([
                api.getStudents().catch(() => []),
                api.getPendingRegistrations().catch(() => []),
                api.getPastMembers().catch(() => []),
                api.getSeatShiftStatus().catch(() => ({ seatMapping: {} }))
            ]);

            // Sync with local client storage so deleted students NEVER reappear on page refresh
            let locallyDeleted = [];
            try {
                locallyDeleted = JSON.parse(localStorage.getItem('deletedStudentIds') || '[]');
            } catch (e) {
                locallyDeleted = [];
            }

            let locallyArchived = [];
            try {
                locallyArchived = JSON.parse(localStorage.getItem('archivedPastMembers') || '[]');
            } catch (e) {
                locallyArchived = [];
            }

            const rawActive = Array.isArray(studentsRes) ? studentsRes : [];
            const activeFiltered = rawActive.filter(s => !locallyDeleted.includes(String(s.id)));

            const rawPast = Array.isArray(pastRes) ? pastRes : [];
            const pastMap = new Map();
            rawPast.forEach(p => pastMap.set(String(p.id), p));
            locallyArchived.forEach(p => {
                if (!pastMap.has(String(p.id))) {
                    pastMap.set(String(p.id), p);
                }
            });
            const pastMerged = Array.from(pastMap.values());

            setDbStudents(activeFiltered);
            setPendingStudents(Array.isArray(pendingRes) ? pendingRes : []);
            setPastMembers(pastMerged);
            setSeatMapping(seatRes.seatMapping || {});
        } catch (err) {
            console.error('Error fetching admin data:', err);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('isLoggedIn');
        navigate('/login');
    };

    // Revenue calculation
    const calculatedRevenue = dbStudents.reduce((acc, student) => {
        return acc + (Number(student.fee) || 0);
    }, 0);

    // Save Student (Add / Edit)
    const handleSaveStudent = async (formData, id) => {
        if (id) {
            try {
                const locallyDeleted = JSON.parse(localStorage.getItem('deletedStudentIds') || '[]');
                const filtered = locallyDeleted.filter(x => String(x) !== String(id));
                localStorage.setItem('deletedStudentIds', JSON.stringify(filtered));
            } catch (e) {}
        }
        const data = await api.saveStudent(formData, id);
        if (data.success || !data.error) {
            await fetchData();
            alert(id ? 'Student details updated successfully!' : 'Student added successfully!');
        } else {
            alert('Failed to save changes: ' + (data.error || data.message || 'Unknown error'));
        }
    };

    // Update Password
    const handleSavePassword = async (id, newPassword) => {
        const res = await api.updateStudentPassword(id, newPassword);
        if (res.success) {
            setDbStudents(prev => prev.map(s => String(s.id) === String(id) ? { ...s, password: newPassword } : s));
            alert('Password updated successfully!');
        } else {
            throw new Error(res.message || 'Failed to update password');
        }
    };

    // Adjust Leave
    const handleAdjustLeave = async (student) => {
        const days = prompt(`Extend due date for ${student.name}\nCurrent: ${student.dueDate}\nEnter number of days:`);
        if (days && !isNaN(days) && parseInt(days) > 0) {
            try {
                const data = await api.adjustLeave(student.id, parseInt(days));
                if (data.success) {
                    alert(`Due date updated to ${data.newDueDate}`);
                    fetchData();
                } else {
                    alert('Failed to adjust due date: ' + (data.message || 'Unknown error'));
                }
            } catch (err) {
                console.error(err);
                alert('Error adjusting due date.');
            }
        }
    };

    // Delete student
    const handleDeleteStudent = async (id) => {
        if (!confirm('Are you sure you want to move this student to past members?')) return;
        try {
            const studentToDelete = dbStudents.find(s => String(s.id) === String(id));
            const archived = studentToDelete ? {
                ...studentToDelete,
                deleted_at: new Date().toISOString()
            } : null;

            // Immediately track deletion in localStorage so refreshes remain consistent
            try {
                const locallyDeleted = JSON.parse(localStorage.getItem('deletedStudentIds') || '[]');
                if (!locallyDeleted.includes(String(id))) {
                    locallyDeleted.push(String(id));
                    localStorage.setItem('deletedStudentIds', JSON.stringify(locallyDeleted));
                }

                if (archived) {
                    const locallyArchived = JSON.parse(localStorage.getItem('archivedPastMembers') || '[]');
                    const updatedArchived = [archived, ...locallyArchived.filter(p => String(p.id) !== String(id))];
                    localStorage.setItem('archivedPastMembers', JSON.stringify(updatedArchived));
                }
            } catch (storageErr) {
                console.warn('localStorage update failed:', storageErr);
            }

            if (archived) {
                setDbStudents(prev => prev.filter(s => String(s.id) !== String(id)));
                setPastMembers(prev => [archived, ...prev.filter(p => String(p.id) !== String(id))]);
            }

            const res = await api.deleteStudent(id);
            if (res && (res.error || res.success === false)) {
                console.warn('Backend delete response:', res.error);
            }

            await fetchData();
            alert('Student moved to past members successfully.');
        } catch (err) {
            console.error('Error deleting student:', err);
            alert('Error deleting student: ' + (err.message || 'Unknown error'));
        }
    };

    // Excel Upload
    const handleExcelUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
            alert('Processing Excel file...');
            const data = await api.uploadExcel(file);
            if (data.success) {
                alert(`Imported ${data.count} students.`);
                fetchData();
            } else {
                alert('Upload failed: ' + data.message);
            }
        } catch (err) {
            console.error('Upload error:', err);
            alert('Server error during upload.');
        } finally {
            e.target.value = '';
        }
    };

    // Pending Approvals
    const handleApprove = async (id) => {
        if (!confirm('Approve this registration?')) return;
        try {
            const data = await api.approveRegistration(id);
            if (data.success) {
                fetchData();
            } else {
                alert('Approval failed: ' + data.message);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleReject = async (id) => {
        if (!confirm('Reject and delete registration?')) return;
        try {
            await api.rejectRegistration(id);
            fetchData();
        } catch (err) {
            console.error(err);
        }
    };

    // Receipts
    const handlePrintReceipt = (student) => {
        const receiptNo = 'FL-REC-' + (student.seatNo || 'GEN') + '-' + Date.now().toString().slice(-6);
        const paymentDate = student.lastPaid || formattedToday;
        const feeVal = Number(student.fee) || 0;

        const receiptData = {
            student_id: student.id,
            receipt_no: receiptNo,
            student_name: student.name,
            mobile: student.mobile || '',
            seat_no: student.seatNo || 'Unassigned',
            shift: student.shift || '12 Hours',
            plan: student.plan || 'Monthly',
            mode: student.mode || 'Cash',
            fee: feeVal,
            payment_date: paymentDate,
            due_date: student.dueDate || '-'
        };

        setActiveReceiptData(receiptData);
        setReceiptModalOpen(true);

        api.saveReceipt(receiptData).catch(e => console.warn('Receipt sync error:', e));
    };

    // WhatsApp Reminders
    const sendWhatsAppReminder = (student) => {
        const msg = `Dear *${student.name}*,\n\nThis is a friendly reminder from *Friends Library* that your membership fee of *₹${student.fee}* is due on *${student.dueDate}* for Seat *${student.seatNo}*.\n\nPlease clear the dues to ensure uninterrupted access.\n\nThank you!`;
        const phone = student.mobile ? ('91' + student.mobile.replace(/\D/g, '').slice(-10)) : '';
        const url = phone ? `https://wa.me/${phone}?text=${encodeURIComponent(msg)}` : `https://wa.me/?text=${encodeURIComponent(msg)}`;
        window.open(url, '_blank');
    };

    const sendConsultationWhatsApp = (student) => {
        const msg = `Hello ${student.name},\n\nWe received your request for Friends Library registration with a *Customized Membership Plan*.\n\nCould you please let us know your preferred daily timings and duration?`;
        const phone = student.mobile ? ('91' + student.mobile.replace(/\D/g, '').slice(-10)) : '';
        const url = phone ? `https://wa.me/${phone}?text=${encodeURIComponent(msg)}` : `https://wa.me/?text=${encodeURIComponent(msg)}`;
        window.open(url, '_blank');
    };

    // Filtering
    let targetSource = dbStudents;
    if (currentView === 'pending') targetSource = pendingStudents;
    else if (currentView === 'past') targetSource = pastMembers;

    const filteredData = targetSource.filter(student => {
        if (shiftFilter !== 'All' && student.shift !== shiftFilter) return false;
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            const nameMatch = (student.name || '').toLowerCase().includes(query);
            const mobileMatch = (student.mobile || '').includes(query);
            const seatMatch = (student.seatNo || student.seat_no || '').toLowerCase().includes(query);
            if (!nameMatch && !mobileMatch && !seatMatch) return false;
        }
        if (currentView === 'active') {
            const daysDiff = getDaysDiff(student.dueDate || student.due_date);
            let currentStatus = 'Safe';
            if (daysDiff < 0) currentStatus = 'Overdue';
            else if (daysDiff <= 3) currentStatus = 'Due Soon';
            if (statusFilter !== 'All' && currentStatus !== statusFilter) return false;
        }
        return true;
    });

    // Seat names generation for layout
    const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];
    const allSeatNames = [];
    rows.forEach(row => {
        const maxSeats = (row === 'I') ? 13 : 10;
        for (let i = 1; i <= maxSeats; i++) {
            allSeatNames.push(`${row}${i}`);
        }
    });
    Object.keys(seatMapping).forEach(extraSeat => {
        if (!allSeatNames.includes(extraSeat) && extraSeat !== 'Pending') {
            allSeatNames.push(extraSeat);
        }
    });

    return (
        <div className="bg-slate-50 text-slate-800 min-h-screen flex flex-col font-sans">
            {/* Top Navigation */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-16">
                    <Link to="/" className="flex items-center space-x-3 hover:opacity-90 transition">
                        <div className="bg-indigo-600 text-white p-2 rounded-lg">
                            <i className="fa-solid fa-server text-lg"></i>
                        </div>
                        <div>
                            <span className="font-bold text-slate-900 leading-tight block">Friends Library</span>
                            <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Admin Management</span>
                        </div>
                    </Link>

                    <div className="flex items-center space-x-2 sm:space-x-3">
                        <button
                            type="button"
                            onClick={() => setIsSeatsVisible(!isSeatsVisible)}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center transition border border-slate-300"
                        >
                            <i className="fa-solid fa-chair mr-1.5 text-indigo-600"></i>
                            {isSeatsVisible ? 'Hide Seats' : 'View Seats'}
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                setStudentToEdit(null);
                                setStudentModalOpen(true);
                            }}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center transition shadow-sm"
                        >
                            <i className="fa-solid fa-plus mr-1.5"></i> Add Student
                        </button>

                        <label className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center cursor-pointer transition shadow-sm">
                            <i className="fa-solid fa-file-excel mr-1.5"></i> Bulk Upload
                            <input
                                type="file"
                                id="excelUpload"
                                accept=".xlsx,.xls,.csv"
                                onChange={handleExcelUpload}
                                className="hidden"
                            />
                        </label>

                        <button
                            type="button"
                            onClick={handleLogout}
                            className="text-slate-500 hover:text-red-600 p-2 text-sm transition"
                            title="Logout"
                        >
                            <i className="fa-solid fa-arrow-right-from-bracket"></i>
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="grow p-3 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-5">
                {/* Seat Layout View */}
                {isSeatsVisible && (
                    <div className="bg-white p-4 sm:p-6 rounded-xl border border-slate-200 shadow-sm transition-all duration-300">
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="font-bold text-slate-800 text-sm flex items-center">
                                <i className="fa-solid fa-map-location-dot text-indigo-600 mr-2"></i> Live Seat Occupancy
                            </h3>
                            <div className="flex items-center space-x-3 text-xs font-medium text-slate-600" id="seat-legend">
                                <span className="flex items-center"><span className="w-2.5 h-2.5 rounded bg-emerald-100 border border-emerald-300 mr-1.5"></span> Available</span>
                                <span className="flex items-center"><span className="w-2.5 h-2.5 rounded bg-red-100 border border-red-300 mr-1.5"></span> Occupied</span>
                            </div>
                        </div>

                        <div id="seat-grid" className="grid grid-cols-2 sm:grid-cols-5 md:grid-cols-10 gap-2.5 mt-4">
                            {allSeatNames.map(seatName => {
                                const occ = seatMapping[seatName];
                                if (occ) {
                                    return (
                                        <div key={seatName} className="p-2 sm:p-2.5 rounded-lg border text-center transition flex flex-col justify-between h-20 bg-red-50 border-red-200 text-red-900 shadow-sm">
                                            <div className="flex justify-between items-center text-[10px] font-bold">
                                                <span>{seatName}</span>
                                                <i className="fa-solid fa-user-lock text-red-400"></i>
                                            </div>
                                            <div className="truncate text-xs font-semibold" title={occ.name}>{occ.name}</div>
                                            <div className="text-[9px] text-red-700 truncate">{occ.shift}</div>
                                        </div>
                                    );
                                }
                                return (
                                    <div key={seatName} className="p-2 sm:p-2.5 rounded-lg border text-center transition flex flex-col justify-between h-20 bg-white border-emerald-200 text-emerald-800 hover:border-emerald-400">
                                        <div className="flex justify-between items-center text-[10px] font-bold">
                                            <span>{seatName}</span>
                                            <i className="fa-solid fa-chair text-emerald-400"></i>
                                        </div>
                                        <div className="text-[11px] text-emerald-600 font-medium">Available</div>
                                        <div className="text-[9px] text-slate-400">Open</div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Metrics & Statistics */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Students</span>
                        <div className="text-2xl font-black text-slate-900 mt-2" id="stat-total">{dbStudents.length}</div>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Monthly Profit</span>
                            <button
                                type="button"
                                onClick={() => setIsRevenueVisible(!isRevenueVisible)}
                                className="text-slate-400 hover:text-slate-600 p-1"
                                title="Show / Hide Profit"
                            >
                                <i id="total-revenue-icon" className={`fa-solid ${isRevenueVisible ? 'fa-eye-slash' : 'fa-eye'} text-xs`}></i>
                            </button>
                        </div>
                        <div className="text-2xl font-black text-emerald-600 mt-2" id="stat-profit">
                            {isRevenueVisible ? `₹${calculatedRevenue.toLocaleString('en-IN')}` : '₹••••'}
                        </div>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">6 Hours Shift</span>
                        <div className="text-2xl font-black text-indigo-600 mt-2" id="stat-6h">
                            {dbStudents.filter(s => s.shift === '6 Hours').length}
                        </div>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">12 Hours Shift</span>
                        <div className="text-2xl font-black text-indigo-600 mt-2" id="stat-12h">
                            {dbStudents.filter(s => s.shift === '12 Hours').length}
                        </div>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between col-span-2 sm:col-span-1">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">24 Hours Shift</span>
                        <div className="text-2xl font-black text-indigo-600 mt-2" id="stat-24h">
                            {dbStudents.filter(s => s.shift === '24 Hours').length}
                        </div>
                    </div>
                </div>

                {/* Filter and Search Bar Controls */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
                    {/* View Switcher Tabs */}
                    <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-300 text-center">
                        <button
                            type="button"
                            id="tab-active"
                            onClick={() => setCurrentView('active')}
                            className={`flex-1 px-2.5 py-1 text-xs font-semibold rounded-md transition ${
                                currentView === 'active' ? 'bg-indigo-600 text-white' : 'text-slate-600'
                            }`}
                        >
                            Active
                        </button>
                        <button
                            type="button"
                            id="tab-pending"
                            onClick={() => setCurrentView('pending')}
                            className={`flex-1 px-2.5 py-1 text-xs font-semibold rounded-md transition ${
                                currentView === 'pending' ? 'bg-amber-600 text-white' : 'text-slate-600'
                            }`}
                        >
                            Pending
                        </button>
                        <button
                            type="button"
                            id="tab-past"
                            onClick={() => setCurrentView('past')}
                            className={`flex-1 px-2.5 py-1 text-xs font-semibold rounded-md transition ${
                                currentView === 'past' ? 'bg-slate-800 text-white' : 'text-slate-600'
                            }`}
                        >
                            Past
                        </button>
                    </div>

                    {/* Search and Dropdown Filters */}
                    <div className="flex flex-wrap items-center gap-2.5">
                        <div className="relative grow sm:grow-0 sm:w-64">
                            <i className="fa-solid fa-magnifying-glass absolute left-3 top-2.5 text-slate-400 text-xs"></i>
                            <input
                                type="text"
                                id="search-bar"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search by name, mobile, seat..."
                                className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500 bg-slate-50"
                            />
                        </div>

                        <select
                            id="filter-shift"
                            value={shiftFilter}
                            onChange={(e) => setShiftFilter(e.target.value)}
                            className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none bg-slate-50 text-slate-700"
                        >
                            <option value="All">All Shifts</option>
                            <option value="6 Hours">6 Hours</option>
                            <option value="12 Hours">12 Hours</option>
                            <option value="24 Hours">24 Hours</option>
                        </select>

                        {currentView === 'active' && (
                            <select
                                id="filter-status"
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none bg-slate-50 text-slate-700"
                            >
                                <option value="All">All Statuses</option>
                                <option value="Due Soon">Due in 3 Days (Yellow)</option>
                                <option value="Overdue">Overdue / Red</option>
                                <option value="Safe">Safe / Paid</option>
                            </select>
                        )}
                    </div>
                </div>

                {/* Table Container */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto table-container">
                        <table className="w-full text-left border-collapse whitespace-nowrap">
                            <thead className="bg-slate-800 text-white text-xs uppercase tracking-wider">
                                <tr>
                                    <th className="px-3 py-3">Photo</th>
                                    <th className="px-3 py-3">Seat</th>
                                    <th className="px-3 py-3">Name</th>
                                    <th className="px-3 py-3">Shift</th>
                                    <th className="px-3 py-3">Mobile</th>
                                    <th className="px-3 py-3">Aadhaar</th>
                                    <th className="px-3 py-3">
                                        {currentView === 'past' ? 'Deleted At' : currentView === 'pending' ? 'Submitted At' : 'Joining Date'}
                                    </th>
                                    <th className="px-3 py-3">Plan</th>
                                    <th className="px-3 py-3">Card No</th>
                                    <th className="px-3 py-3">Fee</th>
                                    {currentView === 'active' && <th className="px-3 py-3">Password</th>}
                                    <th className="px-3 py-3">Mode</th>
                                    <th className="px-3 py-3">Last Paid</th>
                                    <th className="px-3 py-3">Due Date</th>
                                    <th className="px-3 py-3 text-center">
                                        {currentView === 'pending' ? 'Approval Action' : 'Actions'}
                                    </th>
                                </tr>
                            </thead>
                            <tbody id="student-table-body" className="text-sm divide-y divide-slate-200 text-slate-700">
                                {filteredData.length === 0 ? (
                                    <tr>
                                        <td colSpan={currentView === 'active' ? 15 : 14} className="text-center py-8 text-slate-500">
                                            No student records found matching the filter criteria.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredData.map(student => {
                                        const daysDiff = getDaysDiff(student.dueDate);
                                        let rowBgClass = 'bg-white hover:bg-slate-50';

                                        if (currentView === 'active') {
                                            if (daysDiff < 0) rowBgClass = 'bg-red-50 text-red-900';
                                            else if (daysDiff <= 3) rowBgClass = 'bg-amber-50 text-amber-900';
                                        } else if (currentView === 'pending' && student.plan === 'Customize') {
                                            rowBgClass = 'bg-indigo-50 border-l-4 border-indigo-500 font-medium text-indigo-900';
                                        }

                                        const photoUrl = student.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(student.name)}&background=4f46e5&color=fff`;
                                        const isFeeRevealed = visibleFees[student.id];
                                        const isPasswordRevealed = visiblePasswords[student.id];

                                        return (
                                            <tr key={student.id} className={`border-b border-slate-200 ${rowBgClass}`}>
                                                <td className="px-3 py-2.5">
                                                    <img src={photoUrl} alt={student.name} className="w-8 h-8 rounded-full object-cover" />
                                                </td>
                                                <td className="px-3 py-2.5 font-bold">{student.seatNo || student.seat_no}</td>
                                                <td className="px-3 py-2.5 font-medium">{student.name}</td>
                                                <td className="px-3 py-2.5 text-xs">{student.shift}</td>
                                                <td className="px-3 py-2.5 text-xs">{student.mobile}</td>
                                                <td className="px-3 py-2.5 text-xs">{student.aadhar || student.aadhaar || '-'}</td>
                                                <td className="px-3 py-2.5 text-xs">
                                                    {currentView === 'past'
                                                        ? (student.deleted_at ? student.deleted_at.substring(0, 10) : '-')
                                                        : (student.joiningDate || student.joining_date || '-')}
                                                </td>
                                                <td className="px-3 py-2.5 text-xs font-bold text-indigo-700">{student.plan}</td>
                                                <td className="px-3 py-2.5 text-xs">{student.cardNo || student.card_no || '-'}</td>
                                                <td className="px-3 py-2.5 font-semibold text-emerald-600">
                                                    {currentView === 'active' ? (
                                                        <>
                                                            <span>{isFeeRevealed ? `₹${Number(student.fee).toLocaleString('en-IN')}` : '₹••••'}</span>
                                                            <button
                                                                type="button"
                                                                onClick={() => setVisibleFees(prev => ({ ...prev, [student.id]: !prev[student.id] }))}
                                                                className="ml-1 text-slate-400 hover:text-slate-600"
                                                            >
                                                                <i className={`fa-solid ${isFeeRevealed ? 'fa-eye-slash' : 'fa-eye'} text-xs`}></i>
                                                            </button>
                                                        </>
                                                    ) : (
                                                        `₹${student.fee}`
                                                    )}
                                                </td>

                                                {currentView === 'active' && (
                                                    <td className="px-3 py-2.5 text-xs font-mono">
                                                        <div className="flex items-center space-x-1.5">
                                                            <span className={`text-slate-700 font-semibold ${isPasswordRevealed ? '' : 'tracking-wider'}`}>
                                                                {isPasswordRevealed ? (student.password || '123456') : '••••••••'}
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={() => setVisiblePasswords(prev => ({ ...prev, [student.id]: !prev[student.id] }))}
                                                                className="text-slate-400 hover:text-indigo-600 p-1 transition"
                                                                title="Show / Hide Password"
                                                            >
                                                                <i className={`fa-solid ${isPasswordRevealed ? 'fa-eye' : 'fa-eye-slash'} text-xs`}></i>
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setPasswordStudent(student);
                                                                    setChangePwdModalOpen(true);
                                                                }}
                                                                className="text-indigo-600 hover:text-indigo-800 p-1 transition"
                                                                title="Edit Password"
                                                            >
                                                                <i className="fa-solid fa-key text-xs"></i>
                                                            </button>
                                                        </div>
                                                    </td>
                                                )}

                                                <td className="px-3 py-2.5 text-xs">{student.mode || student.payment_mode || 'Cash'}</td>
                                                <td className="px-3 py-2.5 text-xs">{student.lastPaid || student.last_paid}</td>
                                                <td className="px-3 py-2.5 font-bold text-xs">{student.dueDate || student.due_date}</td>

                                                {/* Actions Column */}
                                                <td className="px-3 py-2.5 text-center whitespace-nowrap">
                                                    {currentView === 'active' && (
                                                        <>
                                                            {daysDiff <= 3 && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => sendWhatsAppReminder(student)}
                                                                    className="text-emerald-600 hover:text-emerald-800 p-1 mr-1.5"
                                                                    title="Send WhatsApp Reminder"
                                                                >
                                                                    <i className="fa-brands fa-whatsapp text-lg"></i>
                                                                </button>
                                                            )}
                                                            <button
                                                                type="button"
                                                                onClick={() => handlePrintReceipt(student)}
                                                                className="text-indigo-600 hover:text-indigo-800 p-1 mr-1"
                                                                title="View & Print Receipt"
                                                            >
                                                                <i className="fa-solid fa-receipt"></i>
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleAdjustLeave(student)}
                                                                className="text-amber-500 hover:text-amber-700 p-1 mr-1"
                                                                title="Adjust Leave"
                                                            >
                                                                <i className="fa-solid fa-calendar-plus"></i>
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setStudentToEdit(student);
                                                                    setStudentModalOpen(true);
                                                                }}
                                                                className="text-indigo-600 hover:text-indigo-800 p-1 mr-1"
                                                                title="Edit"
                                                            >
                                                                <i className="fa-solid fa-pen-to-square"></i>
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDeleteStudent(student.id)}
                                                                className="text-red-500 hover:text-red-700 p-1"
                                                                title="Delete"
                                                            >
                                                                <i className="fa-solid fa-trash-can"></i>
                                                            </button>
                                                        </>
                                                    )}

                                                    {currentView === 'pending' && (
                                                        <>
                                                            {student.plan === 'Customize' && (
                                                                <>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => sendConsultationWhatsApp(student)}
                                                                        className="text-emerald-600 hover:text-emerald-800 p-1 mr-1"
                                                                        title="Consult via WhatsApp"
                                                                    >
                                                                        <i className="fa-brands fa-whatsapp text-lg"></i>
                                                                    </button>
                                                                    <a
                                                                        href={`tel:${student.mobile}`}
                                                                        className="text-blue-500 hover:text-blue-700 p-1 mr-3"
                                                                        title="Call Student"
                                                                    >
                                                                        <i className="fa-solid fa-phone"></i>
                                                                    </a>
                                                                </>
                                                            )}
                                                            <button
                                                                type="button"
                                                                onClick={() => handleApprove(student.id)}
                                                                className="bg-emerald-600 text-white px-2.5 py-1 rounded text-xs mr-1"
                                                                title="Approve"
                                                            >
                                                                <i className="fa-solid fa-check"></i>
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleReject(student.id)}
                                                                className="bg-red-600 text-white px-2.5 py-1 rounded text-xs"
                                                                title="Reject"
                                                            >
                                                                <i className="fa-solid fa-xmark"></i>
                                                            </button>
                                                        </>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>

            {/* Modals */}
            <StudentModal
                isOpen={studentModalOpen}
                onClose={() => setStudentModalOpen(false)}
                onSave={handleSaveStudent}
                studentToEdit={studentToEdit}
            />

            <ChangePasswordModal
                isOpen={changePwdModalOpen}
                onClose={() => setChangePwdModalOpen(false)}
                onSave={handleSavePassword}
                student={passwordStudent}
            />

            <ReceiptModal
                isOpen={receiptModalOpen}
                onClose={() => setReceiptModalOpen(false)}
                receiptData={activeReceiptData}
            />
        </div>
    );
}


