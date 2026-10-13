const db = require('../config/db');

// Core API: Validate QR Code and Record Student Attendance
async function processQRScan(req, res, next) {
    try {
        const studentId = req.user.profileId;
        const { token, payload } = req.body;

        if (!studentId) {
            return res.status(403).json({
                success: false,
                message: 'Forbidden. Only logged-in students can scan attendance QR codes.'
            });
        }

        // Handle raw string or JSON payload from scanner
        let sessionToken = token;
        if (!sessionToken && payload) {
            try {
                const parsed = typeof payload === 'string' ? JSON.parse(payload) : payload;
                sessionToken = parsed.token || parsed.sessionToken;
            } catch (e) {
                sessionToken = payload; // Fallback to raw string
            }
        }

        if (!sessionToken) {
            return res.status(400).json({
                success: false,
                message: 'Invalid QR code. Missing attendance token.'
            });
        }

        // STEP 1: Find active attendance session by token
        const sessions = await db.query(`
            SELECT s.*, sub.subject_code, sub.subject_name, sec.section_name,
                   t.first_name as teacher_first, t.last_name as teacher_last
            FROM attendance_sessions s
            JOIN subjects sub ON s.subject_id = sub.id
            JOIN sections sec ON s.section_id = sec.id
            JOIN teachers t ON s.teacher_id = t.id
            WHERE s.session_token = ?
        `, [sessionToken.trim()]);

        if (sessions.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Invalid QR code. Attendance session not found.'
            });
        }

        const session = sessions[0];
        const now = new Date();
        let expiresAtStr = session.expires_at;
        if (typeof expiresAtStr === 'string' && !expiresAtStr.includes('T') && !expiresAtStr.includes('Z')) {
            expiresAtStr = expiresAtStr.replace(' ', 'T') + 'Z';
        }
        const expiresAt = new Date(expiresAtStr);

        // STEP 2: Check if session is closed or expired
        if (session.status === 'closed') {
            return res.status(400).json({
                success: false,
                message: 'Attendance session has expired or is closed.'
            });
        }

        if (now > expiresAt) {
            // Update session status to expired
            await db.query("UPDATE attendance_sessions SET status = 'expired' WHERE id = ?", [session.id]);
            return res.status(400).json({
                success: false,
                message: 'Attendance session has expired or is closed.'
            });
        }

        // STEP 3: Verify Student Enrollment in this Subject & Section
        const enrollments = await db.query(`
            SELECT * FROM enrollments 
            WHERE student_id = ? AND subject_id = ? AND section_id = ?
        `, [studentId, session.subject_id, session.section_id]);

        if (enrollments.length === 0) {
            return res.status(403).json({
                success: false,
                message: 'You are not enrolled in this class.'
            });
        }

        // STEP 4: Prevent Duplicate Attendance for the Same Session
        const existingRecord = await db.query(`
            SELECT * FROM attendance_records 
            WHERE session_id = ? AND student_id = ?
        `, [session.id, studentId]);

        if (existingRecord.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'Attendance already recorded for this session.'
            });
        }

        // STEP 5: Determine Attendance Status ('Present' vs 'Late')
        let attendanceStatus = 'Present';
        const createdAt = new Date(session.created_at);
        const totalDurationMs = expiresAt.getTime() - createdAt.getTime();
        const elapsedMs = now.getTime() - createdAt.getTime();

        if (totalDurationMs > 0 && elapsedMs > (totalDurationMs * 0.7)) {
            attendanceStatus = 'Late';
        }

        // STEP 6: Format Date & Time and Insert Attendance Record
        const dateStr = now.toISOString().split('T')[0];
        const timeStr = now.toTimeString().split(' ')[0];

        const recordRes = await db.query(`
            INSERT INTO attendance_records (session_id, student_id, date, time, status, remarks)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [session.id, studentId, dateStr, timeStr, attendanceStatus, 'Scanned via QR Code']);

        res.status(201).json({
            success: true,
            message: `Attendance recorded successfully as ${attendanceStatus}!`,
            attendance: {
                recordId: recordRes.insertId,
                subjectCode: session.subject_code,
                subjectName: session.subject_name,
                sectionName: session.section_name,
                teacherName: `${session.teacher_first} ${session.teacher_last}`,
                status: attendanceStatus,
                date: dateStr,
                time: timeStr,
                timestamp: now.toISOString()
            }
        });

    } catch (err) {
        next(err);
    }
}

// Get logged-in student's attendance records
async function getMyRecords(req, res, next) {
    try {
        const studentId = req.user.profileId;
        const history = await db.query(`
            SELECT ar.id, ar.date, ar.time, ar.status, ar.scanned_at, ar.remarks,
                   sub.subject_code, sub.subject_name,
                   sec.section_name,
                   t.first_name as teacher_first, t.last_name as teacher_last
            FROM attendance_records ar
            JOIN attendance_sessions sess ON ar.session_id = sess.id
            JOIN subjects sub ON sess.subject_id = sub.id
            JOIN sections sec ON sess.section_id = sec.id
            JOIN teachers t ON sess.teacher_id = t.id
            WHERE ar.student_id = ?
            ORDER BY ar.scanned_at DESC
        `, [studentId]);

        res.json({ success: true, records: history, history });
    } catch (err) {
        next(err);
    }
}

// Get records for a specific session (Teacher view)
async function getSessionRecords(req, res, next) {
    try {
        const { id } = req.params;
        const records = await db.query(`
            SELECT ar.id as record_id, ar.date, ar.time, ar.status, ar.scanned_at, ar.remarks,
                   st.id as student_db_id, st.student_code as student_id, st.student_code, st.first_name, st.last_name, st.email
            FROM attendance_records ar
            JOIN students st ON ar.student_id = st.id
            WHERE ar.session_id = ?
            ORDER BY ar.scanned_at DESC
        `, [id]);

        const presentCount = records.filter(r => r.status === 'Present').length;
        const lateCount = records.filter(r => r.status === 'Late').length;

        res.json({
            success: true,
            records,
            counts: {
                total: records.length,
                present: presentCount,
                late: lateCount
            }
        });
    } catch (err) {
        next(err);
    }
}

module.exports = {
    processQRScan,
    getMyRecords,
    getSessionRecords
};

