import React, { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { numberToWordsINR } from '../utils/numberToWords';

export default function ReceiptModal({ isOpen, onClose, receiptData }) {
    const printAreaRef = useRef(null);
    const [downloading, setDownloading] = useState(false);

    if (!isOpen || !receiptData) return null;

    const r = receiptData;
    const feeVal = Number(r.fee) || 0;
    const words = numberToWordsINR(feeVal);

    const handlePrint = () => {
        window.print();
    };

    const handleDownloadImage = async () => {
        if (!printAreaRef.current) {
            window.print();
            return;
        }
        setDownloading(true);
        try {
            const canvas = await html2canvas(printAreaRef.current, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff'
            });
            const rNo = (r.receipt_no || 'Receipt').replace(/[^a-zA-Z0-9_-]/g, '_');
            const link = document.createElement('a');
            link.download = `Friends_Library_${rNo}.png`;
            link.href = canvas.toDataURL('image/png');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err) {
            console.error('Error generating receipt image:', err);
            window.print();
        } finally {
            setDownloading(false);
        }
    };

    const handleShareWhatsApp = () => {
        const msg = `Hello *${r.student_name}*,\n\nHere is your official fee payment receipt from *Friends Library*:\n\n📄 *Receipt No:* ${r.receipt_no}\n📅 *Payment Date:* ${r.payment_date}\n💺 *Seat No:* ${r.seat_no}\n⏱️ *Shift:* ${r.shift}\n📦 *Plan:* ${r.plan}\n💰 *Amount Paid:* ₹${feeVal.toLocaleString('en-IN')} (${words})\n⏳ *Valid Till:* ${r.due_date}\n💳 *Payment Mode:* ${r.mode}\n✅ *Status:* PAID\n\nThank you for choosing Friends Library!`;
        
        const targetPhone = r.mobile ? ('91' + r.mobile.replace(/\D/g, '').slice(-10)) : '';
        const waUrl = targetPhone 
            ? `https://wa.me/${targetPhone}?text=${encodeURIComponent(msg)}`
            : `https://wa.me/?text=${encodeURIComponent(msg)}`;
        window.open(waUrl, '_blank');
    };

    return (
        <div id="receiptModal" className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden my-auto animate-in fade-in zoom-in duration-150">
                {/* Header - Non printable */}
                <div className="px-5 py-3.5 border-b border-slate-200 flex justify-between items-center bg-slate-50 no-print">
                    <h3 className="font-bold text-slate-800 text-sm flex items-center">
                        <i className="fa-solid fa-receipt text-indigo-600 mr-2"></i> Official Fee Receipt
                    </h3>
                    <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700 text-sm p-1">
                        <i className="fa-solid fa-xmark text-lg"></i>
                    </button>
                </div>

                {/* Printable Receipt Area */}
                <div className="p-6 bg-slate-100 flex justify-center">
                    <div ref={printAreaRef} id="receiptPrintArea" className="bg-white w-full max-w-lg p-6 sm:p-8 rounded-xl border border-slate-200 shadow-sm text-slate-800 font-sans">
                        {/* Header Branding */}
                        <div className="flex justify-between items-start border-b-2 border-indigo-600 pb-4">
                            <div>
                                <h1 className="text-2xl font-extrabold text-indigo-700 tracking-tight leading-tight">FRIENDS LIBRARY</h1>
                                <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider mt-0.5">Premier Silent Reading Hall</p>
                                <p className="text-[10px] text-slate-500 mt-1 leading-snug">
                                    2nd Floor, HSIIDC Market, SCO T-14, Sector 1<br />
                                    Manesar, Gurugram, Haryana - 122051<br />
                                    Phone: +91 88829 42599
                                </p>
                            </div>
                            <div className="text-right">
                                <span className="inline-block bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-extrabold px-2.5 py-1 rounded uppercase tracking-wider mb-2">
                                    Payment Receipt
                                </span>
                                <p className="text-[11px] text-slate-500">Receipt No: <strong id="rcpt-no" className="text-slate-800 font-mono">{r.receipt_no}</strong></p>
                                <p className="text-[11px] text-slate-500">Date: <strong id="rcpt-date" className="text-slate-800">{r.payment_date}</strong></p>
                            </div>
                        </div>

                        {/* Student Details Grid */}
                        <div className="py-4 border-b border-slate-200">
                            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                                <div><span className="text-slate-500">Student Name:</span> <strong id="rcpt-student-name" className="text-slate-900">{r.student_name}</strong></div>
                                <div><span className="text-slate-500">Mobile No:</span> <strong id="rcpt-mobile" className="text-slate-900">{r.mobile ? `+91 ${r.mobile}` : 'N/A'}</strong></div>
                                <div><span className="text-slate-500">Seat Number:</span> <strong id="rcpt-seat" className="text-indigo-700 font-bold">{r.seat_no || 'Unassigned'}</strong></div>
                                <div><span className="text-slate-500">Daily Shift:</span> <strong id="rcpt-shift" className="text-slate-900">{r.shift || '12 Hours'}</strong></div>
                                <div><span className="text-slate-500">Plan Duration:</span> <strong id="rcpt-plan" className="text-slate-900">{r.plan || 'Monthly'}</strong></div>
                                <div><span className="text-slate-500">Valid Till (Due):</span> <strong id="rcpt-due" className="text-rose-600 font-bold">{r.due_date || '-'}</strong></div>
                            </div>
                        </div>

                        {/* Fee Table */}
                        <div className="py-4 border-b border-slate-200">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                                        <th className="pb-2">Description</th>
                                        <th className="pb-2 text-center">Payment Mode</th>
                                        <th className="pb-2 text-right">Amount (INR)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td id="rcpt-desc" className="py-2.5 font-medium text-slate-800">
                                            Library Reading Hall Membership ({r.plan || 'Monthly'} - {r.shift || '12 Hours'})
                                        </td>
                                        <td id="rcpt-mode" className="py-2.5 text-center font-semibold text-slate-700">{r.mode || 'Cash'}</td>
                                        <td id="rcpt-amount" className="py-2.5 text-right font-bold text-slate-900">₹{feeVal.toLocaleString('en-IN')}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* Total & Words */}
                        <div className="py-3 flex justify-between items-start text-xs border-b border-slate-200">
                            <div className="italic text-slate-500 max-w-[280px]" id="rcpt-words">
                                Amount in words: {words}
                            </div>
                            <div className="text-right">
                                <span className="text-slate-500">Total Paid: </span>
                                <strong id="rcpt-total" className="text-base text-indigo-700 font-extrabold">₹{feeVal.toLocaleString('en-IN')}</strong>
                            </div>
                        </div>

                        {/* Footer & Signature */}
                        <div className="pt-6 flex justify-between items-end text-[10px] text-slate-500">
                            <div>
                                <p className="text-emerald-600 font-bold flex items-center mb-1">
                                    <i className="fa-solid fa-circle-check mr-1"></i> STATUS: PAID IN FULL
                                </p>
                                <p>This is a computer-generated receipt.</p>
                                <p>Fees once paid are non-refundable & non-transferable.</p>
                            </div>
                            <div className="text-center">
                                <div className="w-32 border-b border-slate-400 mb-1"></div>
                                <span className="font-semibold text-slate-700">Authorized Signatory</span>
                                <p className="text-[9px] text-slate-400">Friends Library</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Controls - Non printable */}
                <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex justify-between items-center no-print">
                    <button
                        type="button"
                        onClick={handleShareWhatsApp}
                        className="text-emerald-700 hover:text-emerald-800 font-semibold text-xs flex items-center bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-lg transition"
                    >
                        <i className="fa-brands fa-whatsapp text-sm mr-1.5"></i> WhatsApp
                    </button>
                    <div className="space-x-2">
                        <button
                            type="button"
                            onClick={handleDownloadImage}
                            disabled={downloading}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-3.5 py-1.5 rounded-lg transition shadow-sm inline-flex items-center disabled:opacity-50"
                        >
                            <i className={`fa-solid ${downloading ? 'fa-spinner fa-spin' : 'fa-file-arrow-down'} mr-1.5`}></i>
                            {downloading ? 'Downloading...' : 'Download PNG'}
                        </button>
                        <button
                            type="button"
                            onClick={handlePrint}
                            className="bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs px-3.5 py-1.5 rounded-lg transition shadow-sm inline-flex items-center"
                        >
                            <i className="fa-solid fa-print mr-1.5"></i> Print / PDF
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

