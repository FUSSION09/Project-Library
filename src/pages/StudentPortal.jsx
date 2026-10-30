import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { getDaysDiff, getFormattedToday } from '../utils/dateUtils';
import ForgotPasswordModal from '../components/ForgotPasswordModal';
import ReceiptModal from '../components/ReceiptModal';
import html2canvas from 'html2canvas';

export default function StudentPortal() {
    const formattedToday = getFormattedToday();

    const [mobile, setMobile] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loginLoading, setLoginLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const [studentData, setStudentData] = useState(null);
    const [receiptsList, setReceiptsList] = useState([]);

    // Modals
    const [forgotPwdModalOpen, setForgotPwdModalOpen] = useState(false);
    const [studentChangePwdOpen, setStudentChangePwdOpen] = useState(false);
    const [receiptModalOpen, setReceiptModalOpen] = useState(false);
    const [activeReceipt, setActiveReceipt] = useState(null);

    // Change Password Form State
    const [currPassword, setCurrPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurr, setShowCurr] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConf, setShowConf] = useState(false);
    const [pwdAlert, setPwdAlert] = useState({ text: '', type: 'error' });
    const [pwdUpdating, setPwdUpdating] = useState(false);

    useEffect(() => {
        const savedMobile = localStorage.getItem('studentMobile');
        if (savedMobile) {
            autoLogin(savedMobile);
        }
    }, []);

    const autoLogin = async (phone) => {
        try {
            const students = await api.getStudents();
            const cleanPhone = phone.replace(/\D/g, '').slice(-10);
            const found = (students || []).find(s => s.mobile && s.mobile.replace(/\D/g, '').includes(cleanPhone));
            if (found) {
                setStudentData(found);
                loadStudentReceipts(found);
            } else {
                localStorage.removeItem('studentMobile');
            }
        } catch (err) {
            console.error('Auto login error:', err);
        }
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setErrorMessage('');
        const cleanMobile = mobile.replace(/\D/g, '').slice(-10);
        if (cleanMobile.length !== 10) {
            setErrorMessage('Please enter a valid 10-digit registered mobile number.');
            return;
        }

        if (!password) {
            setErrorMessage('Please enter your password.');
            return;
        }

        setLoginLoading(true);
        try {
            const data = await api.studentLogin(cleanMobile, password.trim());
            if (data.success && data.student) {
                localStorage.setItem('studentMobile', data.student.mobile);
                setStudentData(data.student);
                loadStudentReceipts(data.student);
            } else {
                setErrorMessage(data.message || 'Invalid mobile number or password.');
            }
        } catch (err) {
            console.error('Login error:', err);
            setErrorMessage('Could not connect to library server. Please check your internet connection.');
        } finally {
            setLoginLoading(false);
        }
    };

    const loadStudentReceipts = async (student) => {
        const studentId = student.id;
        const studentMobile = student.mobile ? String(student.mobile).replace(/\D/g, '').slice(-10) : '';

        try {
            let receipts = await api.getReceipts({ student_id: studentId, mobile: studentMobile });
            if (!Array.isArray(receipts) || receipts.length === 0) {
                const all = await api.getReceipts();
                receipts = (all || []).filter(r =>
                    (r.student_id && String(r.student_id) === String(studentId)) ||
                    (studentMobile && r.mobile && String(r.mobile).replace(/\D/g, '').includes(studentMobile)) ||
                    (student.name && r.student_name && r.student_name.trim().toLowerCase() === student.name.trim().toLowerCase())
                );
            }

            const currentFee = Number(student.fee) || 0;
            const hasCurrentFeeReceipt = Array.isArray(receipts) && receipts.some(r => Number(r.fee) === currentFee);

            if (!hasCurrentFeeReceipt || receipts.length === 0) {
                const activeRec = {
                    id: 'current-active',
                    student_id: student.id,
                    receipt_no: 'FL-REC-' + (student.seatNo || 'GEN') + '-' + (student.lastPaid ? student.lastPaid.replace(/-/g, '') : Date.now().toString().slice(-6)),
                    payment_date: student.lastPaid || formattedToday,
                    student_name: student.name,
                    mobile: student.mobile || '',
                    seat_no: student.seatNo || 'Unassigned',
                    shift: student.shift || '12 Hours',
                    plan: student.plan || 'Monthly',
                    mode: student.mode || 'Cash',
                    fee: currentFee,
                    due_date: student.dueDate || '-'
                };
                receipts = [activeRec, ...(receipts || [])];
            }

            setReceiptsList(receipts);
        } catch (err) {
            console.error('Error fetching receipts:', err);
            const fallback = {
                id: 'current-active',
                student_id: student.id,
                receipt_no: 'FL-REC-' + (student.seatNo || 'GEN') + '-' + Date.now().toString().slice(-6),
                payment_date: student.lastPaid || formattedToday,
                student_name: student.name,
                mobile: student.mobile || '',
                seat_no: student.seatNo || 'Unassigned',
                shift: student.shift || '12 Hours',
                plan: student.plan || 'Monthly',
                mode: student.mode || 'Cash',
                fee: Number(student.fee) || 0,
                due_date: student.dueDate || '-'
            };
            setReceiptsList([fallback]);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('studentMobile');
        setStudentData(null);
        setMobile('');
        setPassword('');
    };

    // Change Password
    const handleChangePassword = async (e) => {
        e.preventDefault();
        setPwdAlert({ text: '', type: 'error' });

        if (!currPassword || !newPassword || !confirmPassword) {
            setPwdAlert({ text: 'All password fields are required.', type: 'error' });
            return;
        }

        if (newPassword !== confirmPassword) {
            setPwdAlert({ text: 'New password and confirm password do not match.', type: 'error' });
            return;
        }

        if (newPassword.length < 6) {
            setPwdAlert({ text: 'New password must be at least 6 characters long.', type: 'error' });
            return;
        }

        setPwdUpdating(true);
        try {
            const res = await api.studentChangePassword({
                mobile: studentData.mobile,
                currentPassword: currPassword,
                newPassword: newPassword
            });

            if (res.success) {
                setPwdAlert({ text: 'Password updated successfully! Logging you in with new password...', type: 'success' });
                setTimeout(() => {
                    setStudentChangePwdOpen(false);
                    setCurrPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                }, 1500);
            } else {
                setPwdAlert({ text: res.message || 'Failed to change password.', type: 'error' });
            }
        } catch (err) {
            console.error('Change password error:', err);
            setPwdAlert({ text: 'Cannot connect to server. Please try again.', type: 'error' });
        } finally {
            setPwdUpdating(false);
        }
    };

    const handleDirectDownload = async (receipt) => {
        setActiveReceipt(receipt);
        setReceiptModalOpen(true);
    };

    // Days difference and badge computation
    const daysDiff = studentData ? getDaysDiff(studentData.dueDate) : 999;
    let dueStatusBadge = {
        label: 'PAID & SAFE',
        bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        icon: 'fa-circle-check text-emerald-500'
    };

    if (daysDiff < 0) {
        dueStatusBadge = {
            label: 'PAYMENT OVERDUE',
            bg: 'bg-red-50 text-red-700 border-red-200 animate-pulse',
            icon: 'fa-triangle-exclamation text-red-500'
        };
    } else if (daysDiff <= 3) {
        dueStatusBadge = {
            label: `DUE IN ${daysDiff} DAYS`,
            bg: 'bg-amber-50 text-amber-700 border-amber-200',
            icon: 'fa-clock text-amber-500'
        };
    }

    const photoUrl = studentData?.photo || (studentData ? `https://ui-avatars.com/api/?name=${encodeURIComponent(studentData.name)}&background=4f46e5&color=fff` : '');

    return (
        <div className="bg-slate-50 min-h-screen flex flex-col font-sans">
            {/* Navigation Header */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 flex justify-between items-center h-16">
                    <Link to="/" className="flex items-center space-x-3 hover:opacity-90 transition">
                        <div className="bg-indigo-600 text-white p-2 rounded-lg">
                            <i className="fa-solid fa-user-graduate text-lg"></i>
                        </div>
                        <div>
                            <span className="font-bold text-slate-900 leading-tight block">Friends Library</span>
                            <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Student Portal</span>
                        </div>
                    </Link>

                    {studentData ? (
                        <div className="flex items-center space-x-3">
                            <button
                                type="button"
                                onClick={() => setStudentChangePwdOpen(true)}
                                className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-3 py-1.5 rounded-lg border border-slate-300 transition flex items-center"
                            >
                                <i className="fa-solid fa-key mr-1.5 text-indigo-600"></i> Change Password
                            </button>
                            <button
                                type="button"
                                onClick={handleLogout}
                                className="text-xs bg-red-50 hover:bg-red-100 text-red-600 font-semibold px-3 py-1.5 rounded-lg border border-red-200 transition flex items-center"
                            >
                                <i className="fa-solid fa-right-from-bracket mr-1.5"></i> Logout
                            </button>
                        </div>
                    ) : (
                        <Link to="/" className="text-xs text-slate-600 hover:text-indigo-600 flex items-center gap-1">
                            <i className="fa-solid fa-house"></i> Home
                        </Link>
                    )}
                </div>
            </header>

            {/* Main Area */}
            <main className="grow flex items-center justify-center p-4 sm:p-6">
                {!studentData ? (
                    /* LOGIN SECTION */
                    <div id="login-section" className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-6 sm:p-8">
                        <div className="text-center mb-6">
                            <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
                                <i className="fa-solid fa-user-lock text-2xl"></i>
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900">Student Sign In</h2>
                            <p className="text-slate-500 text-xs mt-1">Access your membership card, attendance, and official receipts.</p>
                        </div>

                        <form id="studentLoginForm" onSubmit={handleLogin} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Registered Mobile Number</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                        <i className="fa-solid fa-phone text-xs"></i>
                                    </div>
                                    <input
                                        type="tel"
                                        id="login-mobile"
                                        required
                                        value={mobile}
                                        onChange={(e) => setMobile(e.target.value)}
                                        placeholder="10-digit mobile number"
                                        className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-xl bg-slate-50 focus:outline-none focus:border-indigo-600 focus:bg-white transition"
                                    />
                                </div>
                            </div>

                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <label className="block text-xs font-semibold text-slate-700">Password</label>
                                    <button
                                        type="button"
                                        onClick={() => setForgotPwdModalOpen(true)}
                                        className="text-[11px] text-indigo-600 hover:underline"
                                    >
                                        Forgot Password?
                                    </button>
                                </div>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                        <i className="fa-solid fa-lock text-xs"></i>
                                    </div>
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        id="login-password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="w-full pl-9 pr-10 py-2 text-sm border border-slate-300 rounded-xl bg-slate-50 focus:outline-none focus:border-indigo-600 focus:bg-white transition"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                                    >
                                        <i className={`fa-regular ${showPassword ? 'fa-eye-slash' : 'fa-eye'} text-xs`}></i>
                                    </button>
                                </div>
                                <p className="text-[10px] text-slate-400 mt-1">Default password is <strong>123456</strong> if not changed.</p>
                            </div>

                            {errorMessage && (
                                <div className="p-3 rounded-xl bg-red-50 text-red-600 border border-red-200 text-xs flex items-center">
                                    <i className="fa-solid fa-circle-exclamation mr-2 shrink-0"></i>
                                    <span>{errorMessage}</span>
                                </div>
                            )}

                            <button
                                type="submit"
                                id="btn-login"
                                disabled={loginLoading}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-xl transition shadow-md text-sm flex items-center justify-center disabled:bg-indigo-400"
                            >
                                {loginLoading ? (
                                    <>
                                        <i className="fa-solid fa-spinner fa-spin mr-2"></i> Authenticating...
                                    </>
                                ) : (
                                    <>
                                        <i className="fa-solid fa-right-to-bracket mr-2 text-xs"></i> Sign In to Dashboard
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                ) : (
                    /* LOGGED-IN DASHBOARD SECTION */
                    <div className="w-full max-w-4xl space-y-6">
                        {/* Student Profile Card */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 flex flex-col md:flex-row items-center md:items-start justify-between gap-6">
                            <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-5 text-center sm:text-left">
                                <img
                                    src={photoUrl}
                                    alt={studentData.name}
                                    className="w-20 h-20 rounded-2xl object-cover border-2 border-indigo-100 shadow-sm"
                                />
                                <div>
                                    <div className="inline-block bg-indigo-50 text-indigo-700 font-bold text-[11px] px-2.5 py-0.5 rounded-full uppercase tracking-wider mb-1">
                                        Seat: {studentData.seatNo || 'Unassigned'}
                                    </div>
                                    <h1 className="text-2xl font-bold text-slate-900">{studentData.name}</h1>
                                    <div className="flex flex-wrap justify-center sm:justify-start gap-x-4 gap-y-1 text-xs text-slate-500 mt-1">
                                        <span><i className="fa-solid fa-phone mr-1"></i> +91 {studentData.mobile}</span>
                                        <span><i className="fa-solid fa-clock mr-1"></i> {studentData.shift}</span>
                                        <span><i className="fa-solid fa-calendar mr-1"></i> {studentData.plan} Plan</span>
                                    </div>
                                </div>
                            </div>

                            <div className={`px-4 py-3 rounded-xl border flex items-center space-x-2 text-xs font-bold ${dueStatusBadge.bg}`}>
                                <i className={`fa-solid ${dueStatusBadge.icon} text-base`}></i>
                                <span>{dueStatusBadge.label}</span>
                            </div>
                        </div>

                        {/* Details Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                <span className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">Joining Date</span>
                                <div className="text-sm font-bold text-slate-800 mt-1">{studentData.joiningDate || '-'}</div>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                <span className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">Last Payment</span>
                                <div className="text-sm font-bold text-slate-800 mt-1">{studentData.lastPaid || '-'}</div>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                <span className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">Payment Mode</span>
                                <div className="text-sm font-bold text-indigo-600 mt-1">{studentData.mode || 'Cash'}</div>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                <span className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">Next Due Date</span>
                                <div className={`text-sm font-bold mt-1 ${daysDiff < 0 ? 'text-red-600' : daysDiff <= 3 ? 'text-amber-600' : 'text-slate-800'}`}>
                                    {studentData.dueDate || '-'}
                                </div>
                            </div>
                        </div>

                        {/* Receipts History */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                                <h3 className="font-bold text-slate-800 text-sm flex items-center">
                                    <i className="fa-solid fa-receipt text-indigo-600 mr-2"></i> Payment Receipts History
                                </h3>
                                <span className="text-xs text-slate-500 font-medium">{receiptsList.length} receipt(s)</span>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs border-collapse whitespace-nowrap">
                                    <thead className="bg-slate-100 text-slate-600 uppercase font-semibold">
                                        <tr>
                                            <th className="px-6 py-3">Receipt No</th>
                                            <th className="px-6 py-3">Payment Date</th>
                                            <th className="px-6 py-3">Plan</th>
                                            <th className="px-6 py-3">Amount</th>
                                            <th className="px-6 py-3">Mode</th>
                                            <th className="px-6 py-3 text-center">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody id="receipts-table-body" className="divide-y divide-slate-200">
                                        {receiptsList.map((r, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-4 font-mono font-semibold text-slate-800">{r.receipt_no}</td>
                                                <td className="px-6 py-4 text-xs">{r.payment_date}</td>
                                                <td className="px-6 py-4 text-xs">{r.plan}</td>
                                                <td className="px-6 py-4 font-medium text-emerald-600">₹{Number(r.fee).toLocaleString('en-IN')}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                                                        r.mode === 'UPI' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'
                                                    }`}>
                                                        {r.mode}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center whitespace-nowrap">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDirectDownload(r)}
                                                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold mr-1.5 transition shadow-sm"
                                                        title="Direct Download"
                                                    >
                                                        <i className="fa-solid fa-file-arrow-down mr-1"></i> Download
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setActiveReceipt(r);
                                                            setReceiptModalOpen(true);
                                                        }}
                                                        className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition shadow-sm"
                                                        title="View & Print"
                                                    >
                                                        <i className="fa-solid fa-print mr-1"></i> Print / PDF
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* Student Change Password Modal */}
            {studentChangePwdOpen && (
                <div id="studentChangePasswordModal" className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-150">
                        <div className="px-5 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-slate-800 text-sm flex items-center">
                                <i className="fa-solid fa-lock text-indigo-600 mr-2"></i> Update Your Password
                            </h3>
                            <button type="button" onClick={() => setStudentChangePwdOpen(false)} className="text-slate-400 hover:text-slate-700 p-1">
                                <i className="fa-solid fa-xmark text-lg"></i>
                            </button>
                        </div>

                        <form id="studentChangePwdForm" onSubmit={handleChangePassword} className="p-5 space-y-4">
                            {pwdAlert.text && (
                                <div className={`p-3 rounded-lg text-xs flex items-center space-x-2 border ${
                                    pwdAlert.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'
                                }`}>
                                    <i className={`fa-solid ${pwdAlert.type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'} mr-1`}></i>
                                    <span>{pwdAlert.text}</span>
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Current Password</label>
                                <div className="relative">
                                    <input
                                        type={showCurr ? 'text' : 'password'}
                                        id="st-current-pwd"
                                        required
                                        value={currPassword}
                                        onChange={(e) => setCurrPassword(e.target.value)}
                                        className="w-full border border-slate-300 rounded-lg pl-3 pr-10 py-2 text-sm focus:outline-none focus:border-indigo-500"
                                        placeholder="••••••••"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowCurr(!showCurr)}
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                                    >
                                        <i className={`fa-solid ${showCurr ? 'fa-eye' : 'fa-eye-slash'} text-xs`}></i>
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">New Password</label>
                                <div className="relative">
                                    <input
                                        type={showNew ? 'text' : 'password'}
                                        id="st-new-pwd"
                                        required
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="w-full border border-slate-300 rounded-lg pl-3 pr-10 py-2 text-sm focus:outline-none focus:border-indigo-500"
                                        placeholder="Min 6 characters"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowNew(!showNew)}
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                                    >
                                        <i className={`fa-solid ${showNew ? 'fa-eye' : 'fa-eye-slash'} text-xs`}></i>
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Confirm New Password</label>
                                <div className="relative">
                                    <input
                                        type={showConf ? 'text' : 'password'}
                                        id="st-confirm-pwd"
                                        required
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full border border-slate-300 rounded-lg pl-3 pr-10 py-2 text-sm focus:outline-none focus:border-indigo-500"
                                        placeholder="Re-enter new password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConf(!showConf)}
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                                    >
                                        <i className={`fa-solid ${showConf ? 'fa-eye' : 'fa-eye-slash'} text-xs`}></i>
                                    </button>
                                </div>
                            </div>

                            <div className="pt-2 flex justify-end space-x-2">
                                <button
                                    type="button"
                                    onClick={() => setStudentChangePwdOpen(false)}
                                    className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    id="btn-st-save-pwd"
                                    disabled={pwdUpdating}
                                    className="px-4 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition shadow-sm disabled:bg-indigo-400"
                                >
                                    {pwdUpdating ? 'Updating...' : 'Update Password'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ForgotPasswordModal
                isOpen={forgotPwdModalOpen}
                onClose={() => setForgotPwdModalOpen(false)}
            />

            <ReceiptModal
                isOpen={receiptModalOpen}
                onClose={() => setReceiptModalOpen(false)}
                receiptData={activeReceipt}
            />
        </div>
    );
}

