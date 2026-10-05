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

// Serve static frontend assets from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Fallback route for HTML pages
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(` Friends Library Management System is running!`);
    console.log(` Web Address:    http://localhost:${PORT}`);
    console.log(` Admin Portal:   http://localhost:${PORT}/admin.html`);
    console.log(` Student Portal: http://localhost:${PORT}/student.html`);
    console.log(` Registration:   http://localhost:${PORT}/register.html`);
    console.log(`====================================================`);
});

module.exports = app;
