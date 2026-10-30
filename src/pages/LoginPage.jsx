import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';

export default function LoginPage() {
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (localStorage.getItem('isLoggedIn') === 'true') {
            navigate('/admin');
        }
    }, [navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMsg('');
        setLoading(true);

        const cleanUsername = username.trim();
        const cleanPassword = password.trim();

        try {
            const data = await api.adminLogin(cleanUsername, cleanPassword);
            if (data.success) {
                localStorage.setItem('isLoggedIn', 'true');
                navigate('/admin');
            } else {
                setErrorMsg(data.message || 'Invalid credentials. Please try again.');
            }
        } catch (err) {
            console.error('Connection Error:', err);
            setErrorMsg('Cannot connect to server. Please try again later.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-slate-50 min-h-screen flex">
            {/* Left Side: Internal Branding */}
            <div className="hidden lg:flex lg:w-1/2 relative bg-slate-900 overflow-hidden">
                <img
                    src="https://images.unsplash.com/photo-1507842217343-583bb7270b66?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80"
                    alt="Library Books"
                    className="absolute inset-0 w-full h-full object-cover opacity-20 mix-blend-overlay grayscale"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/90 to-transparent"></div>

                <div className="relative z-10 flex flex-col justify-between p-12 h-full w-full">
                    <Link to="/" className="flex items-center space-x-3 text-white hover:opacity-90 transition cursor-pointer" title="Go to Home Page">
                        <div className="bg-indigo-600 p-2.5 rounded-xl shadow-lg">
                            <i className="fa-solid fa-server text-xl"></i>
                        </div>
                        <span className="text-2xl font-bold tracking-tight">Friends Library</span>
                    </Link>

                    <div className="space-y-6 text-white max-w-lg">
                        <h1 className="text-4xl font-bold leading-tight">Internal Staff Portal</h1>
                        <p className="text-slate-300 text-lg font-light leading-relaxed">
                            Strictly authorized access only. Manage student records, seating, and financial databases from the centralized control panel.
                        </p>
                    </div>

                    <div className="text-slate-500 text-sm">
                        &copy; 2026 Friends Library Management System
                    </div>
                </div>
            </div>

            {/* Right Side: Secure Login Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 relative bg-white">
                <Link to="/" className="absolute top-8 left-8 flex lg:hidden items-center space-x-3 text-slate-900 hover:opacity-80 transition cursor-pointer" title="Go to Home Page">
                    <div className="bg-indigo-600 text-white p-2 rounded-lg shadow-md">
                        <i className="fa-solid fa-server"></i>
                    </div>
                    <span className="text-xl font-bold tracking-tight">Friends Library</span>
                </Link>

                <div className="w-full max-w-md space-y-8">
                    <div>
                        <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Staff Login</h2>
                        <p className="text-slate-500 mt-2">Enter your credentials to access the management dashboard.</p>
                    </div>

                    <form id="loginForm" onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-1.5">
                            <label htmlFor="username" className="block text-sm font-medium text-slate-700">Admin ID</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <i className="fa-solid fa-user-shield text-slate-400"></i>
                                </div>
                                <input
                                    type="text"
                                    id="username"
                                    name="username"
                                    required
                                    autoComplete="off"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-xl bg-slate-50 text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 focus:bg-white transition-all"
                                    placeholder="e.g. admin@friendslibrary.com"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label htmlFor="password" className="block text-sm font-medium text-slate-700">Password</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <i className="fa-solid fa-lock text-slate-400"></i>
                                </div>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    id="password"
                                    name="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="block w-full pl-10 pr-10 py-2.5 border border-slate-300 rounded-xl bg-slate-50 text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 focus:bg-white transition-all"
                                    placeholder="••••••••"
                                />
                                <div
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer text-slate-400 hover:text-slate-600 transition"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    <i className={`fa-regular ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`} id="toggleIcon"></i>
                                </div>
                            </div>
                        </div>

                        {errorMsg && (
                            <div id="error-msg" className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl flex items-center">
                                <i className="fa-solid fa-circle-exclamation mr-2 flex-shrink-0"></i>
                                <span id="error-text">{errorMsg}</span>
                            </div>
                        )}

                        <div>
                            <button
                                type="submit"
                                id="submitBtn"
                                disabled={loading}
                                className="w-full flex justify-center items-center bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-xl transition-all shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600 disabled:bg-indigo-400 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <>
                                        <i className="fa-solid fa-spinner fa-spin mr-2"></i> Authenticating...
                                    </>
                                ) : (
                                    'Authenticate & Login'
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

