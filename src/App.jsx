import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AdminDashboard from './pages/AdminDashboard';
import StudentPortal from './pages/StudentPortal';
import InstallAppPopup from './components/InstallAppPopup';

export default function App() {
    return (
        <>
            <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/index.html" element={<HomePage />} />

                <Route path="/login" element={<LoginPage />} />
                <Route path="/login.html" element={<LoginPage />} />

                <Route path="/register" element={<RegisterPage />} />
                <Route path="/register.html" element={<RegisterPage />} />

                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin.html" element={<AdminDashboard />} />

                <Route path="/student" element={<StudentPortal />} />
                <Route path="/student.html" element={<StudentPortal />} />

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            <InstallAppPopup />
        </>
    );
}
