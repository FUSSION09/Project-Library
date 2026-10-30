import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { getFormattedToday } from '../utils/dateUtils';
import SeatMapModal from '../components/SeatMapModal';

export default function RegisterPage() {
    const formattedToday = getFormattedToday();

    const [name, setName] = useState('');
    const [mobile, setMobile] = useState('');
    const [aadhar, setAadhar] = useState('');
    const [seatNo, setSeatNo] = useState('');
    const [shift, setShift] = useState('6 Hours');
    const [plan, setPlan] = useState('Monthly');
    const [photoFile, setPhotoFile] = useState(null);

    const [seatModalOpen, setSeatModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!seatNo) {
            alert('Please select a seat from the map before submitting.');
            return;
        }

        setSubmitting(true);
        setSuccessMsg('');

        const formData = new FormData();
        formData.append('name', name);
        formData.append('mobile', mobile);
        formData.append('aadhar', aadhar);
        formData.append('seatNo', seatNo);
        formData.append('shift', shift);
        formData.append('plan', plan);
        formData.append('fee', '0');
        formData.append('mode', 'Pending');
        formData.append('joiningDate', formattedToday);
        formData.append('lastPaid', formattedToday);

        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 30);
        formData.append('dueDate', dueDate.toISOString().split('T')[0]);

        if (photoFile) {
            formData.append('photo', photoFile);
        }

        try {
            const data = await api.registerStudent(formData);
            if (data.success) {
                if (plan === 'Customize') {
                    setSuccessMsg('Registration submitted! Admin will consult you soon to finalize your custom plan.');
                } else {
                    setSuccessMsg('Registration submitted successfully! Awaiting admin approval.');
                }
                setName('');
                setMobile('');
                setAadhar('');
                setSeatNo('');
                setShift('6 Hours');
                setPlan('Monthly');
                setPhotoFile(null);
                window.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
                alert('Submission failed: ' + (data.error || 'Unknown error'));
            }
        } catch (err) {
            console.error('Registration error:', err);
            alert('Server connection error. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const submitBtnText = submitting
        ? 'Submitting...'
        : plan === 'Customize'
        ? 'Submit (Admin will consult you soon)'
        : 'Submit Registration for Approval';

    return (
        <div className="bg-slate-50 min-h-screen flex items-center justify-center p-4 sm:p-6">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden border border-slate-200">
                <div className="px-6 py-5 sm:px-8 sm:py-6 bg-slate-900 text-white flex items-center justify-between">
                    <Link to="/" className="flex items-center space-x-3 hover:opacity-90 transition cursor-pointer" title="Go to Home Page">
                        <div className="bg-indigo-500 p-2 sm:p-2.5 rounded-xl">
                            <i className="fa-solid fa-book-open text-lg"></i>
                        </div>
                        <div>
                            <span className="text-base sm:text-lg font-bold tracking-wide block leading-tight">Friends Library</span>
                            <span className="text-[11px] sm:text-xs text-slate-400 mt-0.5 block">Student Registration</span>
                        </div>
                    </Link>
                    <Link to="/" className="text-xs text-slate-300 hover:text-white flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-700 transition">
                        <i className="fa-solid fa-house"></i> Home
                    </Link>
                </div>

                <div className="p-6 sm:p-8">
                    <form id="publicRegisterForm" onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6" encType="multipart/form-data">
                        <div className="space-y-4 md:col-span-2">
                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Student Photograph</label>
                                <input
                                    type="file"
                                    id="reg-photo"
                                    accept="image/*"
                                    onChange={(e) => setPhotoFile(e.target.files[0] || null)}
                                    className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">Full Name</label>
                            <input
                                type="text"
                                id="reg-name"
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">Mobile Number</label>
                            <input
                                type="text"
                                id="reg-mobile"
                                required
                                value={mobile}
                                onChange={(e) => setMobile(e.target.value)}
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">
                                Aadhaar Number <span className="text-slate-400 font-normal">(Optional)</span>
                            </label>
                            <input
                                type="text"
                                id="reg-aadhar"
                                value={aadhar}
                                onChange={(e) => setAadhar(e.target.value)}
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                                placeholder="12-Digit UID (Optional)"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">Requested Seat No</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    id="reg-seatNo"
                                    readOnly
                                    required
                                    value={seatNo}
                                    placeholder="Click to select ->"
                                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none text-indigo-700 font-bold cursor-not-allowed"
                                />
                                <button
                                    type="button"
                                    onClick={() => setSeatModalOpen(true)}
                                    className="bg-indigo-100 hover:bg-indigo-200 text-indigo-700 px-3 py-2 rounded-lg text-sm font-semibold transition whitespace-nowrap shadow-sm border border-indigo-200"
                                >
                                    <i className="fa-solid fa-map-location-dot"></i> Map
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">Shift</label>
                            <select
                                id="reg-shift"
                                value={shift}
                                onChange={(e) => setShift(e.target.value)}
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                            >
                                <option value="6 Hours">6 Hours</option>
                                <option value="12 Hours">12 Hours</option>
                                <option value="24 Hours">24 Hours</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">Membership Plan</label>
                            <select
                                id="reg-plan"
                                value={plan}
                                onChange={(e) => setPlan(e.target.value)}
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                            >
                                <option value="Monthly">Monthly</option>
                                <option value="Quarterly">Quarterly</option>
                                <option value="Half-Yearly">Half-Yearly</option>
                                <option value="Yearly">Yearly</option>
                                <option value="Customize">Customize</option>
                            </select>
                        </div>

                        <div className="md:col-span-2 mt-2">
                            <button
                                type="submit"
                                id="submitRegBtn"
                                disabled={submitting}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 rounded-xl transition shadow-md text-sm disabled:bg-indigo-400"
                            >
                                {submitting && <i className="fa-solid fa-circle-notch fa-spin mr-2"></i>}
                                {submitBtnText}
                            </button>
                        </div>
                    </form>

                    {successMsg && (
                        <div id="success-msg" className="mt-4 p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-xl text-center font-medium">
                            <i className="fa-solid fa-circle-check mr-1.5"></i>
                            {successMsg}
                        </div>
                    )}
                </div>
            </div>

            <SeatMapModal
                isOpen={seatModalOpen}
                onClose={() => setSeatModalOpen(false)}
                onSelectSeat={(seat) => setSeatNo(seat)}
                selectedSeat={seatNo}
            />
        </div>
    );
}

