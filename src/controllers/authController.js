const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'qr_attendance_super_secret_jwt_key_2026_college_project';

// Login User & Generate JWT Token
async function login(req, res, next) {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide both username and password.'
            });
        }

        // Find user by username
        const users = await db.query('SELECT * FROM users WHERE username = ?', [username.trim()]);
        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Invalid username or password.'
            });
        }

        const user = users[0];

        // Compare password hash
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid username or password.'
            });
        }

        // Fetch associated profile ID depending on user role
        let profileId = null;
        let profileDetails = {};

        if (user.role === 'student') {
            const students = await db.query(
                `SELECT s.*, c.course_code, sec.section_name 
                 FROM students s 
                 LEFT JOIN courses c ON s.course_id = c.id 
                 LEFT JOIN sections sec ON s.section_id = sec.id 
                 WHERE s.user_id = ?`, 
                [user.id]
            );
            if (students.length > 0) {
                profileId = students[0].id;
                profileDetails = students[0];
            }
        } else if (user.role === 'teacher') {
            const teachers = await db.query('SELECT * FROM teachers WHERE user_id = ?', [user.id]);
            if (teachers.length > 0) {
                profileId = teachers[0].id;
                profileDetails = teachers[0];
            }
        }

        // Generate JWT token containing user details
        const tokenPayload = {
            id: user.id,
            username: user.username,
            role: user.role,
            profileId: profileId
        };

        const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '24h' });

        // Set HttpOnly cookie
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 24 * 60 * 60 * 1000 // 24 hours
        });

        res.json({
            success: true,
            message: 'Login successful!',
            token: token,
            user: {
                id: user.id,
                username: user.username,
                role: user.role,
                profileId: profileId,
                details: profileDetails
            }
        });
    } catch (err) {
        next(err);
    }
}

// Logout User
async function logout(req, res) {
    res.clearCookie('token');
    res.json({
        success: true,
        message: 'Logged out successfully.'
    });
}

// Get Logged-in User Profile Info
async function getMe(req, res, next) {
    try {
        const userId = req.user.id;
        const users = await db.query('SELECT id, username, role, created_at FROM users WHERE id = ?', [userId]);
        
        if (users.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        const user = users[0];
        let profileDetails = null;

        if (user.role === 'student') {
            const students = await db.query(
                `SELECT s.*, c.course_code, c.course_name, sec.section_name 
                 FROM students s 
                 LEFT JOIN courses c ON s.course_id = c.id 
                 LEFT JOIN sections sec ON s.section_id = sec.id 
                 WHERE s.user_id = ?`,
                [userId]
            );
            profileDetails = students[0] || null;
        } else if (user.role === 'teacher') {
            const teachers = await db.query('SELECT * FROM teachers WHERE user_id = ?', [userId]);
            profileDetails = teachers[0] || null;
        }

        res.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                role: user.role,
                profileId: profileDetails ? profileDetails.id : null,
                details: profileDetails
            }
        });
    } catch (err) {
        next(err);
    }
}

module.exports = {
    login,
    logout,
    getMe
};
