import React, { useState, useEffect } from 'react';

export default function ChangePasswordModal({ isOpen, onClose, onSave, student }) {
    const [newPassword, setNewPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [alertMsg, setAlertMsg] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (student) {
            setNewPassword(student.password || '123456');
            setShowPassword(false);
            setAlertMsg('');
        }
    }, [student, isOpen]);

    if (!isOpen || !student) return null;

    const handleSave = async () => {
        const trimmed = newPassword.trim();
        if (!trimmed) {
            setAlertMsg('Password cannot be empty.');
            return;
        }
        setSaving(true);
        setAlertMsg('');
        try {
            await onSave(student.id, trimmed);
            onClose();
        } catch (err) {
            setAlertMsg(err.message || 'Failed to update password.');
        } finally {
            setSaving(false);
        }
    };

    const generateRandomPassword = () => {
        const chars = '0123456789abcdefghijklmnopqrstuvwxyz';
        let rand = '';
        for (let i = 0; i < 6; i++) {
            rand += chars[Math.floor(Math.random() * chars.length)];
        }
        setNewPassword(rand);
    };

    return (
        <div id="changePasswordModal" className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-150">
                <div className="px-5 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-slate-800 text-sm flex items-center">
                        <i className="fa-solid fa-key text-indigo-600 mr-2"></i> Change Student Password
                    </h3>
                    <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1">
                        <i className="fa-solid fa-xmark text-lg"></i>
                    </button>
                </div>

                <div className="p-5 space-y-4">
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                        <div id="change-pwd-student-name" className="font-bold text-sm text-slate-900">{student.name}</div>
                        <div id="change-pwd-student-info" className="text-xs text-slate-500">Seat: {student.seatNo || 'N/A'}</div>
                    </div>

                    <div id="change-pwd-alert" className={`${alertMsg ? '' : 'hidden'} p-2 rounded text-xs bg-red-50 text-red-600 border border-red-200`}>
                        {alertMsg}
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">New Password</label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                id="change-pwd-input"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full border border-slate-300 rounded-lg pl-3 pr-10 py-2 text-sm focus:outline-none focus:border-indigo-500"
                                placeholder="Enter 6-digit or custom password"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                            >
                                <i id="change-pwd-eye-icon" className={`fa-solid ${showPassword ? 'fa-eye' : 'fa-eye-slash'}`}></i>
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2 text-xs">
                        <span className="text-slate-500 self-center">Presets:</span>
                        <button type="button" onClick={() => setNewPassword('123456')} className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-300">
                            123456
                        </button>
                        <button type="button" onClick={generateRandomPassword} className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded border border-indigo-200">
                            Generate Random
                        </button>
                    </div>
                </div>

                <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex justify-end space-x-2">
                    <button type="button" onClick={onClose} className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition">
                        Cancel
                    </button>
                    <button
                        type="button"
                        id="btn-save-new-pwd"
                        onClick={handleSave}
                        disabled={saving}
                        className="px-4 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition shadow-sm disabled:bg-indigo-400"
                    >
                        {saving ? 'Saving...' : 'Update Password'}
                    </button>
                </div>
            </div>
        </div>
    );
}

