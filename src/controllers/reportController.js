const db = require('../config/db');

// Generate aggregated attendance reports with filtering options
async function getReports(req, res, next) {
    try {
        const { date_from, date_to, range, subject_id, section_id, course_id, student_id, teacher_id, status, search } = req.query;

        let whereConditions = [];
        let queryParams = [];

        // Role-based filtering constraints
        if (req.user.role === 'teacher') {
            whereConditions.push('sess.teacher_id = ?');
            queryParams.push(req.user.profileId);
        } else if (req.user.role === 'student') {
            whereConditions.push('ar.student_id = ?');
            queryParams.push(req.user.profileId);
        } else if (teacher_id) {
            whereConditions.push('sess.teacher_id = ?');
            queryParams.push(teacher_id);
        }

        // Date Range Filtering
        const today = new Date().toISOString().split('T')[0];
        if (range === 'daily') {
            whereConditions.push("(ar.date = ? OR DATE(ar.scanned_at) = ?)");
            queryParams.push(today, today);
        } else if (range === 'weekly') {
            const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            whereConditions.push("(ar.date >= ? OR DATE(ar.scanned_at) >= ?)");
            queryParams.push(lastWeek, lastWeek);
        } else if (range === 'monthly') {
            const lastMonth = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            whereConditions.push("(ar.date >= ? OR DATE(ar.scanned_at) >= ?)");
            queryParams.push(lastMonth, lastMonth);
        } else if (date_from && date_to) {
            whereConditions.push("(ar.date BETWEEN ? AND ? OR DATE(ar.scanned_at) BETWEEN ? AND ?)");
            queryParams.push(date_from, date_to, date_from, date_to);
        } else if (date_from) {
            whereConditions.push("(ar.date >= ? OR DATE(ar.scanned_at) >= ?)");
            queryParams.push(date_from, date_from);
        } else if (date_to) {
            whereConditions.push("(ar.date <= ? OR DATE(ar.scanned_at) <= ?)");
            queryParams.push(date_to, date_to);
        }

        if (subject_id) {
            whereConditions.push("sess.subject_id = ?");
            queryParams.push(subject_id);
        }
        if (section_id) {
            whereConditions.push("sess.section_id = ?");
            queryParams.push(section_id);
        }
        if (course_id) {
            whereConditions.push("st.course_id = ?");
            queryParams.push(course_id);
        }
        if (student_id) {
            whereConditions.push("ar.student_id = ?");
            queryParams.push(student_id);
        }
        if (status) {
            whereConditions.push("ar.status = ?");
            queryParams.push(status);
        }
        if (search && search.trim() !== '') {
            const searchTerm = `%${search.trim()}%`;
            whereConditions.push("(st.student_code LIKE ? OR st.first_name LIKE ? OR st.last_name LIKE ?)");
            queryParams.push(searchTerm, searchTerm, searchTerm);
        }

        const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

        // Query detailed record logs
        const records = await db.query(`
            SELECT ar.id, ar.date, ar.time, ar.status, ar.scanned_at, ar.remarks,
                   st.student_code, st.first_name as student_first, st.last_name as student_last,
                   c.course_code, sec.section_name,
                   sub.subject_code, sub.subject_name,
                   t.first_name as teacher_first, t.last_name as teacher_last
            FROM attendance_records ar
            JOIN attendance_sessions sess ON ar.session_id = sess.id
            JOIN students st ON ar.student_id = st.id
            LEFT JOIN courses c ON st.course_id = c.id
            JOIN sections sec ON sess.section_id = sec.id
            JOIN subjects sub ON sess.subject_id = sub.id
            JOIN teachers t ON sess.teacher_id = t.id
            ${whereClause}
            ORDER BY ar.scanned_at DESC
        `, queryParams);

        // Calculate summary statistics
        let presentCount = 0;
        let lateCount = 0;
        let absentCount = 0;
        const studentSet = new Set();
        const sessionSet = new Set();

        records.forEach(r => {
            if (r.status === 'Present') presentCount++;
            else if (r.status === 'Late') lateCount++;
            else if (r.status === 'Absent') absentCount++;
            if (r.student_code) studentSet.add(r.student_code);
            if (r.session_id) sessionSet.add(r.session_id);
        });

        const totalRecords = records.length;
        const overallRate = totalRecords > 0 ? Math.round(((presentCount + lateCount) / totalRecords) * 100) : 100;

        res.json({
            success: true,
            summary: {
                totalRecords,
                totalSessions: sessionSet.size || totalRecords,
                totalStudents: studentSet.size,
                presentCount,
                lateCount,
                absentCount,
                overallRate
            },
            records
        });
    } catch (err) {
        next(err);
    }
}

// Get filter option dropdowns (Subjects, Sections, Teachers) based on current user role
async function getFilterOptions(req, res, next) {
    try {
        let subjects = [];
        let sections = [];
        let teachers = [];

        if (req.user.role === 'teacher') {
            const teacherId = req.user.profileId;
            subjects = await db.query('SELECT DISTINCT id, subject_code, subject_name FROM subjects WHERE teacher_id = ? ORDER BY subject_code ASC', [teacherId]);
            sections = await db.query(`
                SELECT DISTINCT sec.id, sec.section_name, c.course_code 
                FROM sections sec
                JOIN courses c ON sec.course_id = c.id
                JOIN subjects sub ON sub.course_id = c.id
                WHERE sub.teacher_id = ?
                ORDER BY sec.section_name ASC
            `, [teacherId]);
        } else {
            subjects = await db.query('SELECT id, subject_code, subject_name FROM subjects ORDER BY subject_code ASC');
            sections = await db.query(`
                SELECT sec.id, sec.section_name, c.course_code 
                FROM sections sec 
                JOIN courses c ON sec.course_id = c.id 
                ORDER BY sec.section_name ASC
            `);
            teachers = await db.query('SELECT id, first_name, last_name, teacher_code FROM teachers ORDER BY last_name ASC');
        }

        res.json({
            success: true,
            subjects,
            sections,
            teachers
        });
    } catch (err) {
        next(err);
    }
}

// Export attendance report as CSV download
async function exportCSV(req, res, next) {
    try {
        const { date_from, date_to, range, subject_id, section_id, teacher_id, status, search } = req.query;

        let whereConditions = [];
        let queryParams = [];

        if (req.user.role === 'teacher') {
            whereConditions.push('sess.teacher_id = ?');
            queryParams.push(req.user.profileId);
        } else if (req.user.role === 'student') {
            whereConditions.push('ar.student_id = ?');
            queryParams.push(req.user.profileId);
        } else if (teacher_id) {
            whereConditions.push('sess.teacher_id = ?');
            queryParams.push(teacher_id);
        }

        const today = new Date().toISOString().split('T')[0];
        if (range === 'daily') {
            whereConditions.push("(ar.date = ? OR DATE(ar.scanned_at) = ?)");
            queryParams.push(today, today);
        } else if (range === 'weekly') {
            const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            whereConditions.push("(ar.date >= ? OR DATE(ar.scanned_at) >= ?)");
            queryParams.push(lastWeek, lastWeek);
        } else if (range === 'monthly') {
            const lastMonth = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            whereConditions.push("(ar.date >= ? OR DATE(ar.scanned_at) >= ?)");
            queryParams.push(lastMonth, lastMonth);
        } else if (date_from && date_to) {
            whereConditions.push("(ar.date BETWEEN ? AND ? OR DATE(ar.scanned_at) BETWEEN ? AND ?)");
            queryParams.push(date_from, date_to, date_from, date_to);
        }

        if (subject_id) {
            whereConditions.push("sess.subject_id = ?");
            queryParams.push(subject_id);
        }
        if (section_id) {
            whereConditions.push("sess.section_id = ?");
            queryParams.push(section_id);
        }
        if (status) {
            whereConditions.push("ar.status = ?");
            queryParams.push(status);
        }
        if (search && search.trim() !== '') {
            const searchTerm = `%${search.trim()}%`;
            whereConditions.push("(st.student_code LIKE ? OR st.first_name LIKE ? OR st.last_name LIKE ?)");
            queryParams.push(searchTerm, searchTerm, searchTerm);
        }

        const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

        const records = await db.query(`
            SELECT ar.id, ar.date, ar.time, ar.status, ar.scanned_at, ar.remarks,
                   st.student_code, st.first_name as student_first, st.last_name as student_last,
                   c.course_code, sec.section_name,
                   sub.subject_code, sub.subject_name,
                   t.first_name as teacher_first, t.last_name as teacher_last
            FROM attendance_records ar
            JOIN attendance_sessions sess ON ar.session_id = sess.id
            JOIN students st ON ar.student_id = st.id
            LEFT JOIN courses c ON st.course_id = c.id
            JOIN sections sec ON sess.section_id = sec.id
            JOIN subjects sub ON sess.subject_id = sub.id
            JOIN teachers t ON sess.teacher_id = t.id
            ${whereClause}
            ORDER BY ar.scanned_at DESC
        `, queryParams);

        // Build CSV string
        let csvContent = 'Record ID,Student Code,Student Name,Course,Section,Subject Code,Subject Name,Teacher,Date,Time,Status,Scanned At,Remarks\n';

        records.forEach(r => {
            const studentName = `"${r.student_first} ${r.student_last}"`;
            const subjectName = `"${r.subject_name}"`;
            const teacherName = `"Prof. ${r.teacher_first} ${r.teacher_last}"`;
            const recDate = r.date || new Date(r.scanned_at).toISOString().split('T')[0];
            const recTime = r.time || new Date(r.scanned_at).toTimeString().split(' ')[0];
            const scannedAt = new Date(r.scanned_at).toLocaleString();
            csvContent += `${r.id},${r.student_code},${studentName},${r.course_code || ''},${r.section_name},${r.subject_code},${subjectName},${teacherName},${recDate},${recTime},${r.status},"${scannedAt}","${r.remarks}"\n`;
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=attendance_report.csv');
        res.send(csvContent);
    } catch (err) {
        next(err);
    }
}

module.exports = {
    getReports,
    getFilterOptions,
    exportCSV
};

