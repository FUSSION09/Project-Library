import React, { useState } from 'react';

export default function ForgotPasswordModal({ isOpen, onClose }) {
    const [mobile, setMobile] = useState('');
    const [name, setName] = useState('');
    const [newPassword, setNewPassword] = useState('');

    if (!isOpen) return null;

    const handleSendWhatsApp = () => {
        const cleanMobile = mobile.replace(/\D/g, '').slice(-10);
        if (cleanMobile.length !== 10) {
            alert('Please enter your valid 10-digit registered mobile number.');
            return;
        }

        if (!newPassword) {
            alert('Please enter the new password you want to set.');
            return;
        }

        let message = `Hello Admin,\n\nI forgot my password for Friends Library student portal.\n\n*Registered Mobile:* +91 ${cleanMobile}`;
        if (name) {
            message += `\n*Student Name:* ${name}`;
        }
        message += `\n*Please change my password to:* ${newPassword}\n\nThank you!`;

        const adminPhone = '918882942599';
        const waUrl = `https://wa.me/${adminPhone}?text=${encodeURIComponent(message)}`;
        window.open(waUrl, '_blank');
        onClose();
    };

    return (
        <div id="forgotPasswordModal" className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-150">
                <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-slate-800 text-sm flex items-center">
                        <i className="fa-solid fa-key text-indigo-600 mr-2"></i> Reset Your Password
                    </h3>
                    <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1">
                        <i className="fa-solid fa-xmark text-lg"></i>
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <p className="text-xs text-slate-500">
                        Enter your registered mobile number and desired new password. An automated WhatsApp message will open to the Admin for instant verification and update.
                    </p>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Registered Mobile Number *</label>
                        <input
                            type="tel"
                            value={mobile}
                            onChange={(e) => setMobile(e.target.value)}
                            placeholder="e.g. 9876543210"
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Your Full Name (Optional)</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Rahul Sharma"
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Desired New Password *</label>
                        <input
                            type="text"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="e.g. 123456 or library123"
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                        />
                    </div>
                </div>

                <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex justify-end space-x-2">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition">
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSendWhatsApp}
                        className="px-4 py-2 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition shadow-sm flex items-center"
                    >
                        <i className="fa-brands fa-whatsapp mr-1.5 text-sm"></i> Request via WhatsApp
                    </button>
                </div>
            </div>
        </div>
    );
}

