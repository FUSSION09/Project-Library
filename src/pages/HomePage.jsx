import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function HomePage() {
    return (
        <div className="bg-slate-50 text-slate-800 antialiased selection:bg-indigo-500 selection:text-white min-h-screen flex flex-col">
            <Navbar />

            {/* Hero Section */}
            <section className="relative pt-28 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
                <div className="absolute inset-0 z-0">
                    <img src="/p1.png" alt="Library Study Space" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-slate-900/80 mix-blend-multiply"></div>
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent"></div>
                </div>

                <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center mt-4">
                    <div className="inline-flex items-center space-x-2 sm:space-x-3 bg-white/20 backdrop-blur-md border border-white/30 text-white px-5 py-2.5 sm:px-6 sm:py-3 rounded-full text-sm sm:text-lg font-bold mb-8 shadow-xl">
                        <span className="flex h-3 w-3 sm:h-4 sm:w-4 rounded-full bg-emerald-400 animate-pulse border-2 border-emerald-200"></span>
                        <span className="tracking-wide">Open 24 Hours</span>
                    </div>

                    <h1 className="text-4xl sm:text-5xl lg:text-7xl font-extrabold text-white tracking-tight mb-6">
                        Your Focus.<br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">Our Environment.</span>
                    </h1>
                    <p className="mt-4 max-w-2xl mx-auto text-lg sm:text-xl text-slate-300 font-light mb-10">
                        The premier silent reading space at HSIIDC Market, Sector 1, Manesar. Designed for UPSC, SSC, CA, and university students demanding a distraction-free, premium study environment.
                    </p>
                    <div className="flex flex-col sm:flex-row justify-center gap-4">
                        <Link to="/register" className="bg-indigo-500 hover:bg-indigo-600 border border-indigo-400/50 text-white font-semibold text-lg px-8 py-4 rounded-xl transition shadow-xl shadow-indigo-600/30 flex items-center justify-center">
                            Book Your Seat <i className="fa-solid fa-arrow-right ml-2"></i>
                        </Link>
                        <a href="#location" className="bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white font-semibold text-lg px-8 py-4 rounded-xl transition flex items-center justify-center">
                            <i className="fa-solid fa-location-dot mr-2"></i> View Location
                        </a>
                    </div>
                </div>
            </section>

            {/* Facilities Section */}
            <section id="facilities" className="py-20 bg-slate-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-bold text-slate-900">Premium Facilities</h2>
                        <p className="mt-4 text-slate-500 max-w-2xl mx-auto">Everything you need to maintain peak concentration for hours.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition group">
                            <div className="bg-indigo-50 w-14 h-14 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <i className="fa-solid fa-wifi text-2xl text-indigo-600"></i>
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">High-Speed Wi-Fi</h3>
                            <p className="text-slate-500 text-sm leading-relaxed">Dedicated leased line ensuring seamless video lectures and uninterrupted online mock tests.</p>
                        </div>
                        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition group">
                            <div className="bg-indigo-50 w-14 h-14 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <i className="fa-solid fa-snowflake text-2xl text-indigo-600"></i>
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">Fully Air-Conditioned</h3>
                            <p className="text-slate-500 text-sm leading-relaxed">Maintained at the perfect temperature year-round for maximum comfort during long study sessions.</p>
                        </div>
                        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition group">
                            <div className="bg-indigo-50 w-14 h-14 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <i className="fa-solid fa-chair text-2xl text-indigo-600"></i>
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">Ergonomic Seating</h3>
                            <p className="text-slate-500 text-sm leading-relaxed">Spacious desks with individual lighting, power sockets, and posture-supporting executive chairs.</p>
                        </div>
                        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition group">
                            <div className="bg-indigo-50 w-14 h-14 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <i className="fa-solid fa-mug-hot text-2xl text-indigo-600"></i>
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">Pantry & Dining Area</h3>
                            <p className="text-slate-500 text-sm leading-relaxed">A dedicated, hygienic space to eat your lunch, make coffee, and take refreshing breaks away from the study zone.</p>
                        </div>
                        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition group">
                            <div className="bg-indigo-50 w-14 h-14 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <i className="fa-solid fa-glass-water text-2xl text-indigo-600"></i>
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">RO Drinking Water</h3>
                            <p className="text-slate-500 text-sm leading-relaxed">Unlimited access to chilled, purified RO drinking water to keep you hydrated and alert.</p>
                        </div>
                        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition group">
                            <div className="bg-indigo-50 w-14 h-14 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <i className="fa-solid fa-newspaper text-2xl text-indigo-600"></i>
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">Daily Newspapers</h3>
                            <p className="text-slate-500 text-sm leading-relaxed">Complimentary daily English and Hindi national newspapers and monthly current affairs magazines.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Photo Gallery Section */}
            <section id="gallery" className="py-20 bg-slate-900 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
                        <div>
                            <h2 className="text-3xl font-bold text-white">Inside Friends Library</h2>
                            <p className="mt-2 text-slate-400">A glimpse of our premium infrastructure and seating.</p>
                        </div>
                        <Link to="/register" className="hidden md:inline-block bg-indigo-500 hover:bg-indigo-600 text-white font-medium px-6 py-2.5 rounded-lg transition">
                            Reserve Your Seat
                        </Link>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="rounded-2xl overflow-hidden h-64 border border-slate-700 relative group">
                            <img src="/p1.png" alt="Main Study Area" className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent flex items-end p-4">
                                <span className="font-semibold text-sm text-white">Main Study Area</span>
                            </div>
                        </div>
                        <div className="rounded-2xl overflow-hidden h-64 border border-slate-700 relative group">
                            <img src="/p2.png" alt="Building Entrance" className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent flex items-end p-4">
                                <span className="font-semibold text-sm text-white">Building</span>
                            </div>
                        </div>
                        <div className="rounded-2xl overflow-hidden h-64 border border-slate-700 relative group">
                            <img src="/p4.png" alt="Hygienic Washrooms" className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent flex items-end p-4">
                                <span className="font-semibold text-sm text-white">Washrooms</span>
                            </div>
                        </div>
                        <div className="rounded-2xl overflow-hidden h-64 border border-slate-700 relative group">
                            <img src="/p3.png" alt="Pantry and Dining" className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent flex items-end p-4">
                                <span className="font-semibold text-sm text-white">Pantry & Break Area</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Google Reviews Section */}
            <section id="reviews" className="py-20 bg-white border-b border-slate-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
                        <div>
                            <h2 className="text-3xl font-bold text-slate-900">What Students Say</h2>
                            <p className="mt-2 text-slate-500">Real verified feedback from Google Reviews.</p>
                        </div>
                        <div className="flex items-center space-x-4 bg-slate-50 border border-slate-200 px-6 py-3 rounded-2xl shadow-sm">
                            <div className="text-4xl font-extrabold text-slate-900">5.0</div>
                            <div>
                                <div className="flex text-amber-400 text-sm">
                                    <i className="fa-solid fa-star"></i>
                                    <i className="fa-solid fa-star"></i>
                                    <i className="fa-solid fa-star"></i>
                                    <i className="fa-solid fa-star"></i>
                                    <i className="fa-solid fa-star"></i>
                                </div>
                                <div className="text-xs font-medium text-slate-500 mt-1">Excellent on Google</div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition">
                            <div className="flex items-center mb-4">
                                <img src="https://ui-avatars.com/api/?name=Naresh+Deshi&background=f1f5f9&color=334155" alt="Naresh Deshi" className="w-10 h-10 rounded-full mr-3" />
                                <div>
                                    <h4 className="text-sm font-bold text-slate-900">Naresh Deshi</h4>
                                    <div className="flex text-amber-400 text-[10px] mt-0.5">
                                        <i className="fa-solid fa-star"></i>
                                        <i className="fa-solid fa-star"></i>
                                        <i className="fa-solid fa-star"></i>
                                        <i className="fa-solid fa-star"></i>
                                        <i className="fa-solid fa-star"></i>
                                    </div>
                                </div>
                            </div>
                            <p className="text-sm text-slate-600 italic">"Reasonably priced. No extra fees. The environment of the library is very peaceful and much comfortable. The management is extremely cooperative."</p>
                        </div>

                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition">
                            <div className="flex items-center mb-4">
                                <img src="https://ui-avatars.com/api/?name=Divya+Sharma&background=f1f5f9&color=334155" alt="Divya Sharma" className="w-10 h-10 rounded-full mr-3" />
                                <div>
                                    <h4 className="text-sm font-bold text-slate-900">Divya S.</h4>
                                    <div className="flex text-amber-400 text-[10px] mt-0.5">
                                        <i className="fa-solid fa-star"></i>
                                        <i className="fa-solid fa-star"></i>
                                        <i className="fa-solid fa-star"></i>
                                        <i className="fa-solid fa-star"></i>
                                        <i className="fa-solid fa-star"></i>
                                    </div>
                                </div>
                            </div>
                            <p className="text-sm text-slate-600 italic">"Best library in this area. Clean washrooms, well-maintained hygiene, and the AC is always working properly. Best facilities provided."</p>
                        </div>

                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition">
                            <div className="flex items-center mb-4">
                                <img src="https://ui-avatars.com/api/?name=Akash+Kumar&background=f1f5f9&color=334155" alt="Akash Kumar" className="w-10 h-10 rounded-full mr-3" />
                                <div>
                                    <h4 className="text-sm font-bold text-slate-900">Akash Kumar</h4>
                                    <div className="flex text-amber-400 text-[10px] mt-0.5">
                                        <i className="fa-solid fa-star"></i>
                                        <i className="fa-solid fa-star"></i>
                                        <i className="fa-solid fa-star"></i>
                                        <i className="fa-solid fa-star"></i>
                                        <i className="fa-solid fa-star"></i>
                                    </div>
                                </div>
                            </div>
                            <p className="text-sm text-slate-600 italic">"Good experience! All facilities available -&gt; mineral water, newspapers, full speed net, proper working AC. Very good environment for students."</p>
                        </div>
                    </div>
                </div>
            </section>

            <Footer />
        </div>
    );
}

