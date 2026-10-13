const QRCode = require('qrcode');
const crypto = require('crypto');
const db = require('../config/db');

// Get Teacher Profile Details
async function getTeacherProfile(req, res, next) {
    try {
        const teacherId = req.user.profileId;
        if (!teacherId) {
            return res.status(400).json({ success: false, message: 'Teacher profile not found.' });
        }

        const teachers = await db.query(`
            SELECT t.*, u.username 
            FROM teachers t
            JOIN users u ON t.user_id = u.id
            WHERE t.id = ?
        `, [teacherId]);

        if (teachers.length === 0) {
            return res.status(404).json({ success: false, message: 'Teacher profile details not found.' });
        }

        res.json({ success: true, profile: teachers[0] });
    } catch (err) {
        next(err);
    }
}

// Get assigned subjects and sections for the logged-in teacher
async function getAssignedClasses(req, res, next) {
    try {
        const teacherId = req.user.profileId;
        if (!teacherId) {
            return res.status(400).json({ success: false, message: 'Teacher profile not found for this user.' });
        }

        const subjects = await db.query(`
            SELECT sub.*, c.course_code, c.course_name
            FROM subjects sub
            JOIN courses c ON sub.course_id = c.id
            WHERE sub.teacher_id = ?
        `, [teacherId]);

        // Get sections linked to the teacher's subject courses
        const sections = await db.query(`
            SELECT DISTINCT sec.*, c.course_code
            FROM sections sec
            JOIN courses c ON sec.course_id = c.id
            JOIN subjects sub ON sub.course_id = c.id
            WHERE sub.teacher_id = ?
        `, [teacherId]);

        res.json({
            success: true,
            subjects,
            sections
        });
    } catch (err) {
        next(err);
    }
}

// Create a new QR Attendance Session
async function createAttendanceSession(req, res, next) {
    try {
        const teacherId = req.user.profileId;
        const { subject_id, section_id, duration_minutes = 10 } = req.body;

        if (!subject_id || !section_id) {
            return res.status(400).json({ success: false, message: 'Subject and Section are required.' });
        }

        // Verify that subject belongs to this teacher
        const subjectCheck = await db.query('SELECT * FROM subjects WHERE id = ? AND teacher_id = ?', [subject_id, teacherId]);
        if (subjectCheck.length === 0) {
            return res.status(403).json({ success: false, message: 'You are not assigned to teach this subject.' });
        }

        // Close any existing active sessions for this subject and section
        await db.query(`
            UPDATE attendance_sessions 
            SET status = 'closed' 
            WHERE subject_id = ? AND section_id = ? AND status = 'active'
        `, [subject_id, section_id]);

        // Generate unique 32-character random session token
        const sessionToken = crypto.randomBytes(16).toString('hex');

        // Calculate expiration timestamp
        const now = new Date();
        const expiresAt = new Date(now.getTime() + parseInt(duration_minutes) * 60 * 1000);
        const expiresAtFormatted = expiresAt.toISOString();

        // Insert new session into database
        const sessionRes = await db.query(`
            INSERT INTO attendance_sessions (subject_id, section_id, teacher_id, session_token, expires_at, status)
            VALUES (?, ?, ?, ?, ?, 'active')
        `, [subject_id, section_id, teacherId, sessionToken, expiresAtFormatted]);

        const sessionId = sessionRes.insertId;

        // Generate QR code data URL (contains JSON payload with sessionToken)
        const qrPayload = JSON.stringify({
            sessionId: sessionId,
            token: sessionToken,
            subjectId: subject_id,
            sectionId: section_id
        });

        const qrCodeDataUrl = await QRCode.toDataURL(qrPayload, {
            errorCorrectionLevel: 'H',
            margin: 2,
            width: 350,
            color: {
                dark: '#0f172a',
                light: '#ffffff'
            }
        });

        res.status(201).json({
            success: true,
            message: 'Attendance session started successfully!',
            session: {
                id: sessionId,
                subjectId: subject_id,
                sectionId: section_id,
                token: sessionToken,
                qrCodeUrl: qrCodeDataUrl,
                durationMinutes: duration_minutes,
                expiresAt: expiresAt,
                status: 'active'
            }
        });
    } catch (err) {
        next(err);
    }
}

// Get live active session and list of scanned students
async function getActiveSessionDetails(req, res, next) {
    try {
        const teacherId = req.user.profileId;
        const { subject_id, section_id } = req.query;

        if (!subject_id || !section_id) {
            return res.status(400).json({ success: false, message: 'Subject and Section IDs are required.' });
        }

        const sessions = await db.query(`
            SELECT s.*, sub.subject_code, sub.subject_name, sec.section_name 
            FROM attendance_sessions s
            JOIN subjects sub ON s.subject_id = sub.id
            JOIN sections sec ON s.section_id = sec.id
            WHERE s.subject_id = ? AND s.section_id = ? AND s.teacher_id = ? AND s.status = 'active'
            ORDER BY s.id DESC LIMIT 1
        `, [subject_id, section_id, teacherId]);

        if (sessions.length === 0) {
            return res.json({ success: true, activeSession: null, scannedStudents: [] });
        }

        const session = sessions[0];

        // Check if session has expired
        if (new Date(session.expires_at) < new Date()) {
            await db.query("UPDATE attendance_sessions SET status = 'expired' WHERE id = ?", [session.id]);
            session.status = 'expired';
        }

        // Fetch scanned students for this session
        const scannedStudents = await db.query(`
            SELECT ar.id as record_id, ar.status, ar.scanned_at, ar.remarks,
                   st.student_code, st.first_name, st.last_name, st.email
            FROM attendance_records ar
            JOIN students st ON ar.student_id = st.id
            WHERE ar.session_id = ?
            ORDER BY ar.scanned_at DESC
        `, [session.id]);

        // Also fetch list of all enrolled students for manual marking
        const enrolledStudents = await db.query(`
            SELECT st.id as student_id, st.student_code, st.first_name, st.last_name, st.email
            FROM enrollments e
            JOIN students st ON e.student_id = st.id
            WHERE e.subject_id = ? AND e.section_id = ?
            ORDER BY st.last_name ASC
        `, [subject_id, section_id]);

        res.json({
            success: true,
            activeSession: session,
            scannedStudents,
            enrolledStudents
        });
    } catch (err) {
        next(err);
    }
}

// Close an active session manually
async function closeSession(req, res, next) {
    try {
        const { id } = req.params;
        const teacherId = req.user.profileId;

        await db.query("UPDATE attendance_sessions SET status = 'closed' WHERE id = ? AND teacher_id = ?", [id, teacherId]);
        res.json({ success: true, message: 'Attendance session closed.' });
    } catch (err) {
        next(err);
    }
}

// Manually mark or edit student attendance
async function manualMarkAttendance(req, res, next) {
    try {
        const { session_id, student_id, status, remarks } = req.body;

        if (!session_id || !student_id || !status) {
            return res.status(400).json({ success: false, message: 'Session, Student, and Status are required.' });
        }

        // Check if record exists
        const existing = await db.query('SELECT * FROM attendance_records WHERE session_id = ? AND student_id = ?', [session_id, student_id]);

        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const timeStr = now.toTimeString().split(' ')[0];

        if (existing.length > 0) {
            await db.query(
                `UPDATE attendance_records SET status = ?, remarks = ?, date = ?, time = ?, scanned_at = CURRENT_TIMESTAMP WHERE id = ?`,
                [status, remarks || 'Manually updated by Teacher', dateStr, timeStr, existing[0].id]
            );
        } else {
            await db.query(
                `INSERT INTO attendance_records (session_id, student_id, date, time, status, remarks) VALUES (?, ?, ?, ?, ?, ?)`,
                [session_id, student_id, dateStr, timeStr, status, remarks || 'Manually marked by Teacher']
            );
        }

        res.json({ success: true, message: 'Attendance record updated successfully.' });
    } catch (err) {
        next(err);
    }
}

// View history of all past sessions for a teacher
async function getSessionHistory(req, res, next) {
    try {
        const teacherId = req.user.profileId;
        const history = await db.query(`
            SELECT s.*, sub.subject_code, sub.subject_name, sec.section_name,
                   (SELECT COUNT(*) FROM attendance_records WHERE session_id = s.id) as total_scans,
                   (SELECT COUNT(*) FROM attendance_records WHERE session_id = s.id AND status = 'Present') as present_count,
                   (SELECT COUNT(*) FROM attendance_records WHERE session_id = s.id AND status = 'Late') as late_count
            FROM attendance_sessions s
            JOIN subjects sub ON s.subject_id = sub.id
            JOIN sections sec ON s.section_id = sec.id
            WHERE s.teacher_id = ?
            ORDER BY s.created_at DESC
        `, [teacherId]);

        res.json({ success: true, history });
    } catch (err) {
        next(err);
    }
}

// Get filtered attendance records for teacher's own authorized sessions
async function getTeacherAttendanceRecords(req, res, next) {
    try {
        const teacherId = req.user.profileId;
        const { search, subject_id, section_id, date_from, date_to, status } = req.query;

        let whereConditions = ['sess.teacher_id = ?'];
        let queryParams = [teacherId];

        if (subject_id) {
            whereConditions.push('sess.subject_id = ?');
            queryParams.push(subject_id);
        }

        if (section_id) {
            whereConditions.push('sess.section_id = ?');
            queryParams.push(section_id);
        }

        if (status) {
            whereConditions.push('ar.status = ?');
            queryParams.push(status);
        }

        if (date_from && date_to) {
            whereConditions.push('ar.date BETWEEN ? AND ?');
            queryParams.push(date_from, date_to);
        } else if (date_from) {
            whereConditions.push('ar.date >= ?');
            queryParams.push(date_from);
        } else if (date_to) {
            whereConditions.push('ar.date <= ?');
            queryParams.push(date_to);
        }

        if (search && search.trim() !== '') {
            const searchTerm = `%${search.trim()}%`;
            whereConditions.push('(st.student_code LIKE ? OR st.first_name LIKE ? OR st.last_name LIKE ?)');
            queryParams.push(searchTerm, searchTerm, searchTerm);
        }

        const whereClause = 'WHERE ' + whereConditions.join(' AND ');

        const records = await db.query(`
            SELECT ar.id as attendance_id, ar.session_id, ar.date, ar.time, ar.status, ar.scanned_at, ar.remarks,
                   st.id as student_id, st.student_code, st.first_name as student_first, st.last_name as student_last, st.email,
                   sub.id as subject_id, sub.subject_code, sub.subject_name,
                   sec.id as section_id, sec.section_name
            FROM attendance_records ar
            JOIN attendance_sessions sess ON ar.session_id = sess.id
            JOIN students st ON ar.student_id = st.id
            JOIN subjects sub ON sess.subject_id = sub.id
            JOIN sections sec ON sess.section_id = sec.id
            ${whereClause}
            ORDER BY ar.scanned_at DESC
        `, queryParams);

        let presentCount = 0;
        let lateCount = 0;
        let absentCount = 0;

        records.forEach(r => {
            if (r.status === 'Present') presentCount++;
            else if (r.status === 'Late') lateCount++;
            else if (r.status === 'Absent') absentCount++;
        });

        res.json({
            success: true,
            records,
            counts: {
                total: records.length,
                present: presentCount,
                late: lateCount,
                absent: absentCount
            }
        });
    } catch (err) {
        next(err);
    }
}

module.exports = {
    getTeacherProfile,
    getAssignedClasses,
    createAttendanceSession,
    getActiveSessionDetails,
    closeSession,
    manualMarkAttendance,
    getSessionHistory,
    getTeacherAttendanceRecords
};

