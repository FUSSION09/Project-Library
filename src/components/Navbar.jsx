import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

export default function Navbar() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();

    const scrollToSection = (e, targetId) => {
        e.preventDefault();
        setMobileMenuOpen(false);

        const isHome = location.pathname === '/' || location.pathname === '/index.html';

        if (!isHome) {
            navigate(`/${targetId}`);
            return;
        }

        const element = document.querySelector(targetId);
        if (element) {
            const navOffset = 80;
            const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
            const targetPosition = elementPosition - navOffset;

            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });

            window.history.pushState(null, '', targetId);
        }
    };

    return (
        <nav className="fixed w-full z-50 bg-white/85 backdrop-blur-md border-b border-slate-200 transition-all duration-300">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16 sm:h-20 relative">

                    {/* MOBILE VIEW: Left Hamburger Menu Button */}
                    <button 
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
                        className="sm:hidden text-slate-800 p-1 text-2xl hover:text-indigo-600 focus:outline-none z-20 shrink-0 transition-transform active:scale-95"
                        aria-label="Toggle navigation menu"
                    >
                        <i className={`fa-solid ${mobileMenuOpen ? 'fa-xmark' : 'fa-bars'}`}></i>
                    </button>

                    {/* DESKTOP VIEW: Left Logo & Address */}
                    <Link to="/" className="hidden sm:flex items-center space-x-3 min-w-0 z-20 hover:opacity-90 transition cursor-pointer" title="Friends Library Home">
                        <div className="bg-indigo-600 text-white p-2.5 rounded-xl shadow-lg shadow-indigo-600/20 shrink-0">
                            <i className="fa-solid fa-book-open-reader text-xl"></i>
                        </div>
                        <div className="flex flex-col justify-center min-w-0">
                            <span className="block text-xl font-bold text-slate-900 leading-tight truncate">Friends Library</span>
                            <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider leading-tight mt-0.5 truncate">Sector 1, Manesar</span>
                            <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider leading-tight truncate">Gurugram</span>
                        </div>
                    </Link>

                    {/* MOBILE VIEW: Centered Library Name */}
                    <Link to="/" className="absolute left-1/2 transform -translate-x-1/2 sm:hidden z-10 flex flex-col items-center text-center w-full hover:opacity-90 transition cursor-pointer" title="Friends Library Home">
                        <span className="block text-[15px] font-extrabold text-slate-900 leading-tight tracking-tight">Friends Library</span>
                        <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-tight mt-0.5">Sector 1, Manesar</span>
                        <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-tight">Gurugram</span>
                    </Link>

                    {/* DESKTOP VIEW: Center Menu Links with Smooth Scroll Transition */}
                    <div className="hidden lg:flex space-x-8 items-center absolute left-1/2 transform -translate-x-1/2 z-10">
                        <button
                            type="button"
                            onClick={(e) => scrollToSection(e, '#facilities')}
                            className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors duration-200 cursor-pointer relative py-1 group"
                        >
                            <span>Facilities</span>
                            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-indigo-600 transition-all duration-300 group-hover:w-full"></span>
                        </button>

                        <button
                            type="button"
                            onClick={(e) => scrollToSection(e, '#gallery')}
                            className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors duration-200 cursor-pointer relative py-1 group"
                        >
                            <span>Gallery</span>
                            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-indigo-600 transition-all duration-300 group-hover:w-full"></span>
                        </button>

                        <button
                            type="button"
                            onClick={(e) => scrollToSection(e, '#reviews')}
                            className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors duration-200 cursor-pointer relative py-1 group"
                        >
                            <span>Reviews</span>
                            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-indigo-600 transition-all duration-300 group-hover:w-full"></span>
                        </button>

                        <button
                            type="button"
                            onClick={(e) => scrollToSection(e, '#location')}
                            className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors duration-200 cursor-pointer relative py-1 group"
                        >
                            <span>Location</span>
                            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-indigo-600 transition-all duration-300 group-hover:w-full"></span>
                        </button>
                    </div>

                    {/* Right Action Buttons */}
                    <div className="flex space-x-3 items-center shrink-0 z-20">
                        <Link to="/student" className="hidden sm:inline-flex text-sm font-bold text-indigo-600 hover:text-indigo-700 transition px-3">
                            Member Login
                        </Link>
                        <Link to="/register" className="bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] sm:text-sm font-bold px-3.5 py-1.5 sm:px-5 sm:py-2.5 rounded-lg sm:rounded-xl transition shadow-md shadow-indigo-600/20 whitespace-nowrap active:scale-95">
                            Join Now
                        </Link>
                    </div>
                </div>
            </div>

            {/* MOBILE VIEW: Dropdown Menu */}
            {mobileMenuOpen && (
                <div id="mobile-menu" className="sm:hidden absolute top-full left-0 w-full bg-white border-t border-slate-200 shadow-2xl pb-5 pt-3 px-6 flex flex-col space-y-4 z-50 animate-in slide-in-from-top-2 duration-200">
                    <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="flex items-center text-slate-800 font-bold text-sm bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <div className="bg-indigo-100 text-indigo-600 w-8 h-8 rounded flex items-center justify-center mr-3">
                            <i className="fa-solid fa-shield-halved"></i>
                        </div>
                        Admin Login
                    </Link>
                    <Link to="/student" onClick={() => setMobileMenuOpen(false)} className="flex items-center text-slate-800 font-bold text-sm bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <div className="bg-indigo-100 text-indigo-600 w-8 h-8 rounded flex items-center justify-center mr-3">
                            <i className="fa-solid fa-user-graduate"></i>
                        </div>
                        Student Portal
                    </Link>

                    <hr className="border-slate-200 my-2" />

                    <button
                        type="button"
                        onClick={(e) => scrollToSection(e, '#facilities')}
                        className="text-slate-600 hover:text-indigo-600 text-sm font-semibold flex items-center text-left py-1"
                    >
                        <i className="fa-solid fa-check w-6 text-slate-400"></i> Facilities
                    </button>
                    <button
                        type="button"
                        onClick={(e) => scrollToSection(e, '#gallery')}
                        className="text-slate-600 hover:text-indigo-600 text-sm font-semibold flex items-center text-left py-1"
                    >
                        <i className="fa-solid fa-image w-6 text-slate-400"></i> Gallery
                    </button>
                    <button
                        type="button"
                        onClick={(e) => scrollToSection(e, '#reviews')}
                        className="text-slate-600 hover:text-indigo-600 text-sm font-semibold flex items-center text-left py-1"
                    >
                        <i className="fa-solid fa-star w-6 text-slate-400"></i> Reviews
                    </button>
                    <button
                        type="button"
                        onClick={(e) => scrollToSection(e, '#location')}
                        className="text-slate-600 hover:text-indigo-600 text-sm font-semibold flex items-center text-left py-1"
                    >
                        <i className="fa-solid fa-location-dot w-6 text-slate-400"></i> Location
                    </button>
                </div>
            )}
        </nav>
    );
}
