const db = require('../config/db');

// Get Profile Info for logged-in Student
async function getStudentProfile(req, res, next) {
    try {
        const studentId = req.user.profileId;
        if (!studentId) {
            return res.status(400).json({ success: false, message: 'Student profile not found.' });
        }

        const students = await db.query(`
            SELECT s.*, u.username, c.course_code, c.course_name, sec.section_name
            FROM students s
            JOIN users u ON s.user_id = u.id
            LEFT JOIN courses c ON s.course_id = c.id
            LEFT JOIN sections sec ON s.section_id = sec.id
            WHERE s.id = ?
        `, [studentId]);

        if (students.length === 0) {
            return res.status(404).json({ success: false, message: 'Student details not found.' });
        }

        res.json({ success: true, profile: students[0] });
    } catch (err) {
        next(err);
    }
}

// Get enrolled subjects with calculated attendance percentage per subject
async function getEnrolledSubjects(req, res, next) {
    try {
        const studentId = req.user.profileId;

        const subjects = await db.query(`
            SELECT sub.*, c.course_code, t.first_name as teacher_first, t.last_name as teacher_last,
                   (SELECT COUNT(*) 
                    FROM attendance_sessions sess 
                    WHERE sess.subject_id = sub.id AND sess.section_id = e.section_id) as total_sessions,
                   (SELECT COUNT(*) 
                    FROM attendance_records rec 
                    JOIN attendance_sessions sess ON rec.session_id = sess.id 
                    WHERE rec.student_id = ? AND sess.subject_id = sub.id AND (rec.status = 'Present' OR rec.status = 'Late')) as attended_sessions
            FROM enrollments e
            JOIN subjects sub ON e.subject_id = sub.id
            JOIN courses c ON sub.course_id = c.id
            JOIN teachers t ON sub.teacher_id = t.id
            WHERE e.student_id = ?
        `, [studentId, studentId]);

        // Add attendance percentage calculation to each subject
        const formattedSubjects = subjects.map(s => {
            const total = parseInt(s.total_sessions || 0);
            const attended = parseInt(s.attended_sessions || 0);
            const percentage = total > 0 ? Math.round((attended / total) * 100) : 100;
            return {
                ...s,
                total_sessions: total,
                attended_sessions: attended,
                attendance_percentage: percentage
            };
        });

        res.json({ success: true, subjects: formattedSubjects });
    } catch (err) {
        next(err);
    }
}

// Get full student attendance history log
async function getAttendanceHistory(req, res, next) {
    try {
        const studentId = req.user.profileId;

        const history = await db.query(`
            SELECT ar.id, ar.status, ar.scanned_at, ar.remarks,
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

        res.json({ success: true, history });
    } catch (err) {
        next(err);
    }
}

// Get overall attendance statistics summary for student
async function getAttendanceStats(req, res, next) {
    try {
        const studentId = req.user.profileId;

        const records = await db.query(`
            SELECT status, COUNT(*) as count 
            FROM attendance_records 
            WHERE student_id = ? 
            GROUP BY status
        `, [studentId]);

        let present = 0;
        let late = 0;
        let absent = 0;

        records.forEach(r => {
            if (r.status === 'Present') present = parseInt(r.count);
            if (r.status === 'Late') late = parseInt(r.count);
            if (r.status === 'Absent') absent = parseInt(r.count);
        });

        const totalScans = present + late + absent;
        const overallPercentage = totalScans > 0 ? Math.round(((present + late) / totalScans) * 100) : 100;

        res.json({
            success: true,
            stats: {
                totalScans,
                present,
                late,
                absent,
                overallPercentage
            }
        });
    } catch (err) {
        next(err);
    }
}

module.exports = {
    getStudentProfile,
    getEnrolledSubjects,
    getAttendanceHistory,
    getAttendanceStats
};
