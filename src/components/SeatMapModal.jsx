import React, { useEffect, useState } from 'react';
import { api } from '../services/api';

export default function SeatMapModal({ isOpen, onClose, onSelectSeat, selectedSeat }) {
    const [seatMapping, setSeatMapping] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isOpen) {
            loadSeats();
        }
    }, [isOpen]);

    const loadSeats = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await api.getSeatShiftStatus();
            setSeatMapping(data.seatMapping || {});
        } catch (err) {
            console.error('Error loading seat status:', err);
            setError('Failed to load seat data. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

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
        <div id="seatModal" className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-6">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[95vh] flex flex-col overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 shrink-0">
                    <div>
                        <h3 className="text-base sm:text-lg font-bold text-slate-800">Select Available Seat</h3>
                        <div className="flex items-center space-x-4 text-[10px] sm:text-xs font-medium text-slate-600 mt-1">
                            <span className="flex items-center">
                                <span className="w-2.5 h-2.5 rounded bg-emerald-100 border border-emerald-300 mr-1.5"></span> Available
                            </span>
                            <span className="flex items-center">
                                <span className="w-2.5 h-2.5 rounded bg-red-50 border border-red-200 mr-1.5 opacity-60"></span> Occupied
                            </span>
                        </div>
                    </div>
                    <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700 transition p-1">
                        <i className="fa-solid fa-xmark text-xl"></i>
                    </button>
                </div>

                <div className="p-4 sm:p-6 overflow-y-auto bg-slate-100">
                    {loading && (
                        <div className="text-center text-xs text-slate-500 mb-4" id="seatLoading">
                            <i className="fa-solid fa-circle-notch fa-spin text-indigo-500 text-2xl mb-2"></i>
                            <br />Loading live seat data...
                        </div>
                    )}
                    {error && (
                        <div className="text-center text-red-500 text-sm mb-4">
                            {error}
                        </div>
                    )}

                    <div id="public-seat-grid" className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-10 gap-2.5">
                        {allSeatNames.map(seatName => {
                            const isOccupied = !!seatMapping[seatName];
                            const isSelected = selectedSeat === seatName;

                            if (isOccupied) {
                                return (
                                    <div
                                        key={seatName}
                                        className="p-2 sm:p-3 rounded-lg text-center text-xs font-semibold flex flex-col items-center justify-center border bg-red-50 border-red-200 text-red-400 opacity-60 cursor-not-allowed"
                                    >
                                        <i className="fa-solid fa-user-lock text-sm sm:text-base mb-1"></i>
                                        <span className="font-bold text-[10px] sm:text-xs">{seatName}</span>
                                    </div>
                                );
                            }

                            return (
                                <button
                                    type="button"
                                    key={seatName}
                                    onClick={() => {
                                        onSelectSeat(seatName);
                                        onClose();
                                    }}
                                    className={`p-2 sm:p-3 rounded-lg text-center text-xs font-semibold flex flex-col items-center justify-center border transition-all cursor-pointer shadow-sm group ${
                                        isSelected 
                                            ? 'bg-indigo-600 text-white border-indigo-700 ring-2 ring-indigo-400' 
                                            : 'bg-white border-emerald-300 text-emerald-700 hover:bg-emerald-500 hover:text-white hover:border-emerald-600'
                                    }`}
                                >
                                    <i className="fa-solid fa-chair text-sm sm:text-base mb-1 group-hover:scale-110 transition-transform"></i>
                                    <span className="font-bold text-[10px] sm:text-xs">{seatName}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}

