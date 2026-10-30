const fs = require('fs');
const path = require('path');
const express = require('express');
const app = require('./api/index.js');

const PORT = process.env.PORT || 3000;

// Prevent caching for HTML/dashboard pages to protect logout and back-button navigation
app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
});

// Serve static frontend assets from dist directory (built output) and public directory
if (fs.existsSync(path.join(__dirname, 'dist'))) {
    app.use(express.static(path.join(__dirname, 'dist')));
}
app.use(express.static(path.join(__dirname, 'public')));

// Fallback routes for React SPA
app.get(['/', '/admin', '/student', '/login', '/register'], (req, res) => {
    const indexPath = fs.existsSync(path.join(__dirname, 'dist', 'index.html'))
        ? path.join(__dirname, 'dist', 'index.html')
        : path.join(__dirname, 'public', 'index.html');
    res.sendFile(indexPath);
});

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`====================================================`);
        console.log(` Friends Library Management System is running!`);
        console.log(` Web Address:    http://localhost:${PORT}`);
        console.log(` Admin Portal:   http://localhost:${PORT}/admin.html`);
        console.log(` Student Portal: http://localhost:${PORT}/student.html`);
        console.log(` Registration:   http://localhost:${PORT}/register.html`);
        console.log(`====================================================`);
    });
}

module.exports = app;
