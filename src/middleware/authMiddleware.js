const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'qr_attendance_super_secret_jwt_key_2026_college_project';

// Middleware to authenticate JWT tokens
function authenticateToken(req, res, next) {
    let token = null;

    // Check Authorization header (Bearer token)
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
        // Check HttpOnly cookies
        token = req.cookies.token;
    }

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Access denied. Authentication token required.'
        });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // Contains { id, username, role, profileId }
        next();
    } catch (err) {
        return res.status(403).json({
            success: false,
            message: 'Invalid or expired token. Please log in again.'
        });
    }
}

// Middleware to enforce specific roles (e.g. requireRole('admin'), requireRole('teacher'))
function requireRole(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized access.'
            });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `Forbidden. Requires one of the following roles: ${allowedRoles.join(', ')}`
            });
        }

        next();
    };
}

module.exports = {
    authenticateToken,
    requireRole
};
