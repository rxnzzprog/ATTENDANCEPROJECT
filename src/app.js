require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const db = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

// Express App Initialization
const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors({
    origin: true,
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve Static Frontend Assets
app.use(express.static(path.join(__dirname, '../public')));

// API Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/teacher', require('./routes/teacherRoutes'));
app.use('/api/student', require('./routes/studentRoutes'));
app.use('/api/attendance', require('./routes/attendanceRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));

// Health Check Endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'online',
        message: 'QR Attendance System API is running smoothly',
        timestamp: new Date(),
        dbDriver: db.getDriver()
    });
});

// Single Page Application (SPA) Fallback
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Global Error Handler
app.use(errorHandler);

// Start Server and Initialize Database
async function startServer() {
    try {
        await db.initDatabase();
        app.listen(PORT, () => {
            console.log(`=======================================================`);
            console.log(`🚀 QR Attendance System Server is running on port ${PORT}`);
            console.log(`🌐 Local Access URL: http://localhost:${PORT}`);
            console.log(`=======================================================`);
        });
    } catch (err) {
        console.error('Failed to start server:', err);
    }
}

startServer();
