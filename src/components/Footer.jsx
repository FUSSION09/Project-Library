import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
    return (
        <footer id="location" className="bg-slate-900 text-slate-300 pt-16 pb-8 border-t-[8px] border-indigo-600">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12">
                    <div>
                        <div className="flex items-center space-x-3 mb-6">
                            <div className="bg-indigo-500 text-white p-2 rounded-lg">
                                <i className="fa-solid fa-book-open-reader text-lg"></i>
                            </div>
                            <span className="text-3xl font-extrabold text-white">Friends Library</span>
                        </div>
                        <p className="text-sm text-slate-400 leading-relaxed mb-8 max-w-md">
                            Empowering students with a disciplined, focused, and premium infrastructure to help achieve their academic and professional goals in Manesar.
                        </p>
                        <div className="space-y-4 text-sm bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
                            <div className="flex items-start">
                                <div className="bg-slate-800 p-2 rounded-lg mr-4 text-indigo-400">
                                    <i className="fa-solid fa-location-dot"></i>
                                </div>
                                <div>
                                    <h5 className="text-white font-semibold mb-1">Our Address</h5>
                                    <span>2nd Floor, HSIIDC Market,<br />SCO T-14, Sector 1,<br />Manesar, Gurugram, Haryana - 122051</span>
                                </div>
                            </div>
                            <div className="flex items-center">
                                <div className="bg-slate-800 p-2 rounded-lg mr-4 text-indigo-400">
                                    <i className="fa-solid fa-phone"></i>
                                </div>
                                <div>
                                    <h5 className="text-white font-semibold">Phone</h5>
                                    <span>+91 88829 42599</span>
                                </div>
                            </div>
                            <div className="flex items-center">
                                <div className="bg-slate-800 p-2 rounded-lg mr-4 text-indigo-400">
                                    <i className="fa-solid fa-envelope"></i>
                                </div>
                                <div>
                                    <h5 className="text-white font-semibold">Email</h5>
                                    <span>friendslibrrary@gmail.com</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="h-80 sm:h-full min-h-[300px] rounded-2xl overflow-hidden shadow-2xl border-4 border-slate-800 relative">
                        <iframe 
                            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3510.7752419652306!2d76.94621029999999!3d28.365644!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x390d3d8b7b00b859%3A0xbd0acb9729c6edf8!2sFriends%20library!5e0!3m2!1sen!2sin!4v1791041780963!5m2!1sen!2sin"
                            width="100%" 
                            height="100%" 
                            style={{ border: 0 }} 
                            allowFullScreen="" 
                            loading="lazy" 
                            referrerPolicy="no-referrer-when-downgrade"
                            title="Friends Library Location Map"
                        />
                    </div>
                </div>

                <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center text-xs">
                    <p>&copy; 2026 Friends Library, Manesar. All rights reserved.</p>
                    <div className="flex space-x-6 mt-4 md:mt-0">
                        <Link to="/login" className="hover:text-indigo-400 transition font-medium">
                            <i className="fa-solid fa-shield-halved mr-1"></i> Admin Login
                        </Link>
                        <Link to="/student" className="hover:text-indigo-400 transition font-medium">
                            <i className="fa-solid fa-user-graduate mr-1"></i> Student Portal
                        </Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}

