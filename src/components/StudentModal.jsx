import React, { useState, useEffect } from 'react';
import { getFormattedToday } from '../utils/dateUtils';
import SeatMapModal from './SeatMapModal';

export default function StudentModal({ isOpen, onClose, onSave, studentToEdit }) {
    const formattedToday = getFormattedToday();

    const [formData, setFormData] = useState({
        id: '',
        name: '',
        mobile: '',
        aadhar: '',
        seatNo: '',
        shift: '12 Hours',
        plan: 'Monthly',
        cardNo: '',
        fee: '',
        mode: 'Cash',
        joiningDate: formattedToday,
        lastPaid: formattedToday,
        dueDate: '',
        remarks: '',
        password: '123456'
    });

    const [photoFile, setPhotoFile] = useState(null);
    const [showPassword, setShowPassword] = useState(false);
    const [saving, setSaving] = useState(false);
    const [seatModalOpen, setSeatModalOpen] = useState(false);

    useEffect(() => {
        if (studentToEdit) {
            setFormData({
                id: studentToEdit.id || '',
                name: studentToEdit.name || '',
                mobile: studentToEdit.mobile || '',
                aadhar: studentToEdit.aadhar || '',
                seatNo: studentToEdit.seatNo || '',
                shift: studentToEdit.shift || '12 Hours',
                plan: studentToEdit.plan || 'Monthly',
                cardNo: studentToEdit.cardNo || '',
                fee: studentToEdit.fee !== undefined && studentToEdit.fee !== null ? studentToEdit.fee : '',
                mode: studentToEdit.mode || 'Cash',
                joiningDate: studentToEdit.joiningDate || formattedToday,
                lastPaid: studentToEdit.lastPaid || formattedToday,
                dueDate: studentToEdit.dueDate || '',
                remarks: studentToEdit.remarks || '',
                password: studentToEdit.password || '123456'
            });
        } else {
            setFormData({
                id: '',
                name: '',
                mobile: '',
                aadhar: '',
                seatNo: '',
                shift: '12 Hours',
                plan: 'Monthly',
                cardNo: '',
                fee: '',
                mode: 'Cash',
                joiningDate: formattedToday,
                lastPaid: formattedToday,
                dueDate: '',
                remarks: '',
                password: '123456'
            });
        }
        setPhotoFile(null);
        setShowPassword(false);
    }, [studentToEdit, isOpen]);

    if (!isOpen) return null;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        const submitData = new FormData();
        Object.keys(formData).forEach(key => {
            submitData.append(key, formData[key]);
        });
        if (photoFile) {
            submitData.append('photo', photoFile);
        }

        try {
            await onSave(submitData, formData.id || null);
            onClose();
        } catch (err) {
            console.error('Save error:', err);
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <div id="studentModal" className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3">
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden max-h-[92vh] flex flex-col">
                    <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 shrink-0">
                        <h3 id="modalTitle" className="text-lg font-bold text-slate-800">
                            {formData.id ? 'Edit Student' : 'Add Student'}
                        </h3>
                        <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700 transition">
                            <i className="fa-solid fa-xmark text-xl"></i>
                        </button>
                    </div>

                    <div className="p-6 overflow-y-auto">
                        <form id="studentForm" onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4" encType="multipart/form-data">
                            <input type="hidden" id="studentId" name="studentId" value={formData.id} />

                            <div className="sm:col-span-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Student Photograph</label>
                                <input
                                    type="file"
                                    id="add-photo"
                                    accept="image/*"
                                    onChange={(e) => setPhotoFile(e.target.files[0] || null)}
                                    className="w-full text-sm text-slate-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Seat Number</label>
                                <div className="flex gap-1.5">
                                    <input
                                        type="text"
                                        id="add-seatNo"
                                        name="seatNo"
                                        value={formData.seatNo}
                                        onChange={handleChange}
                                        required
                                        placeholder="e.g. A1"
                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setSeatModalOpen(true)}
                                        className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3 py-2 rounded-lg text-xs font-semibold border border-indigo-200 transition whitespace-nowrap"
                                        title="View Seat Layout"
                                    >
                                        <i className="fa-solid fa-map-location-dot"></i> Map
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Full Name</label>
                                <input
                                    type="text"
                                    id="add-name"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    required
                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Shift Duration</label>
                                <select
                                    id="add-shift"
                                    name="shift"
                                    value={formData.shift}
                                    onChange={handleChange}
                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                                >
                                    <option value="6 Hours">6 Hours</option>
                                    <option value="12 Hours">12 Hours</option>
                                    <option value="24 Hours">24 Hours</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Mobile Number</label>
                                <input
                                    type="text"
                                    id="add-mobile"
                                    name="mobile"
                                    value={formData.mobile}
                                    onChange={handleChange}
                                    required
                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Aadhaar Card No (Optional)</label>
                                <input
                                    type="text"
                                    id="add-aadhar"
                                    name="aadhar"
                                    value={formData.aadhar}
                                    onChange={handleChange}
                                    placeholder="12-digit number (Optional)"
                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Joining Date</label>
                                <input
                                    type="date"
                                    id="add-joiningDate"
                                    name="joiningDate"
                                    value={formData.joiningDate}
                                    onChange={handleChange}
                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Membership Plan</label>
                                <select
                                    id="add-plan"
                                    name="plan"
                                    value={formData.plan}
                                    onChange={handleChange}
                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                                >
                                    <option value="Monthly">Monthly</option>
                                    <option value="Quarterly">Quarterly</option>
                                    <option value="Half-Yearly">Half-Yearly</option>
                                    <option value="Yearly">Yearly</option>
                                    <option value="Customize">Customize</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Card / Roll Number</label>
                                <input
                                    type="text"
                                    id="add-cardNo"
                                    name="cardNo"
                                    value={formData.cardNo}
                                    onChange={handleChange}
                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Fees Paid (₹)</label>
                                <input
                                    type="number"
                                    id="add-fee"
                                    name="fee"
                                    value={formData.fee}
                                    onChange={handleChange}
                                    required
                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Payment Mode</label>
                                <select
                                    id="add-mode"
                                    name="mode"
                                    value={formData.mode}
                                    onChange={handleChange}
                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                                >
                                    <option value="UPI">UPI / Online</option>
                                    <option value="Cash">Cash</option>
                                    <option value="Pending">Pending</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Last Payment Date</label>
                                <input
                                    type="date"
                                    id="add-lastPaid"
                                    name="lastPaid"
                                    value={formData.lastPaid}
                                    onChange={handleChange}
                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Next Payment Due Date</label>
                                <input
                                    type="date"
                                    id="add-dueDate"
                                    name="dueDate"
                                    value={formData.dueDate}
                                    onChange={handleChange}
                                    required
                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                                />
                            </div>

                            <div className="sm:col-span-2">
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Student Portal Password</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        id="add-password"
                                        name="password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        required
                                        placeholder="Default: 123456"
                                        className="w-full border border-slate-300 rounded-lg pl-3 pr-10 py-2 text-sm focus:outline-none focus:border-indigo-500"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                                    >
                                        <i id="modal-pwd-eye" className={`fa-solid ${showPassword ? 'fa-eye' : 'fa-eye-slash'} text-xs`}></i>
                                    </button>
                                </div>
                            </div>

                            <div className="sm:col-span-2">
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Remarks</label>
                                <textarea
                                    id="add-remarks"
                                    name="remarks"
                                    value={formData.remarks}
                                    onChange={handleChange}
                                    rows="2"
                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                                    placeholder="e.g. Paid 3 months in advance"
                                ></textarea>
                            </div>
                        </form>
                    </div>

                    <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex justify-end space-x-3 shrink-0">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-xl transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            form="studentForm"
                            disabled={saving}
                            className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition shadow-md disabled:bg-indigo-400"
                        >
                            {saving ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                </div>
            </div>

            <SeatMapModal
                isOpen={seatModalOpen}
                onClose={() => setSeatModalOpen(false)}
                onSelectSeat={(seat) => setFormData(prev => ({ ...prev, seatNo: seat }))}
                selectedSeat={formData.seatNo}
            />
        </>
    );
}

