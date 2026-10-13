const bcrypt = require('bcryptjs');
const db = require('../config/db');

// Admin Dashboard Summary Statistics
async function getDashboardStats(req, res, next) {
    try {
        const studentCount = (await db.query('SELECT COUNT(*) as count FROM students'))[0].count;
        const teacherCount = (await db.query('SELECT COUNT(*) as count FROM teachers'))[0].count;
        const courseCount = (await db.query('SELECT COUNT(*) as count FROM courses'))[0].count;
        const subjectCount = (await db.query('SELECT COUNT(*) as count FROM subjects'))[0].count;
        const sessionCount = (await db.query('SELECT COUNT(*) as count FROM attendance_sessions'))[0].count;
        const recordCount = (await db.query('SELECT COUNT(*) as count FROM attendance_records'))[0].count;
        const presentCount = (await db.query("SELECT COUNT(*) as count FROM attendance_records WHERE status = 'Present' OR status = 'Late'"))[0].count;

        const attendanceRate = recordCount > 0 ? Math.round((presentCount / recordCount) * 100) : 100;

        res.json({
            success: true,
            stats: {
                totalStudents: studentCount,
                totalTeachers: teacherCount,
                totalCourses: courseCount,
                totalSubjects: subjectCount,
                totalSessions: sessionCount,
                totalRecords: recordCount,
                attendanceRate: attendanceRate
            }
        });
    } catch (err) {
        next(err);
    }
}

// ---------------------------------------------------------
// STUDENT MANAGEMENT CRUD
// ---------------------------------------------------------
async function getAllStudents(req, res, next) {
    try {
        const students = await db.query(`
            SELECT s.*, u.username, c.course_code, c.course_name, sec.section_name 
            FROM students s
            JOIN users u ON s.user_id = u.id
            LEFT JOIN courses c ON s.course_id = c.id
            LEFT JOIN sections sec ON s.section_id = sec.id
            ORDER BY s.id DESC
        `);
        res.json({ success: true, students });
    } catch (err) {
        next(err);
    }
}

async function createStudent(req, res, next) {
    try {
        const { username, password, student_code, first_name, last_name, email, course_id, section_id } = req.body;

        if (!username || !password || !student_code || !first_name || !last_name || !email || !course_id || !section_id) {
            return res.status(400).json({ success: false, message: 'All student fields are required.' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // 1. Insert into users table
        const userRes = await db.query(
            'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
            [username.trim(), hashedPassword, 'student']
        );
        const userId = userRes.insertId;

        // 2. Insert into students table
        const studentRes = await db.query(
            `INSERT INTO students (user_id, student_code, first_name, last_name, email, course_id, section_id) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [userId, student_code.trim(), first_name.trim(), last_name.trim(), email.trim(), course_id, section_id]
        );

        res.status(201).json({
            success: true,
            message: 'Student account created successfully.',
            studentId: studentRes.insertId
        });
    } catch (err) {
        next(err);
    }
}

async function updateStudent(req, res, next) {
    try {
        const { id } = req.params;
        const { student_code, first_name, last_name, email, course_id, section_id, username, password } = req.body;

        const student = (await db.query('SELECT * FROM students WHERE id = ?', [id]))[0];
        if (!student) {
            return res.status(404).json({ success: false, message: 'Student not found.' });
        }

        await db.query(
            `UPDATE students SET student_code = ?, first_name = ?, last_name = ?, email = ?, course_id = ?, section_id = ? WHERE id = ?`,
            [student_code ? student_code.trim() : student.student_code, first_name.trim(), last_name.trim(), email.trim(), course_id, section_id, id]
        );

        if (username && username.trim() !== '') {
            await db.query('UPDATE users SET username = ? WHERE id = ?', [username.trim(), student.user_id]);
        }

        if (password && password.trim() !== '') {
            const hashedPassword = await bcrypt.hash(password, 10);
            await db.query('UPDATE users SET password_hash = ? WHERE id = ?', [hashedPassword, student.user_id]);
        }

        res.json({ success: true, message: 'Student details updated successfully.' });
    } catch (err) {
        next(err);
    }
}

async function deleteStudent(req, res, next) {
    try {
        const { id } = req.params;
        const student = (await db.query('SELECT * FROM students WHERE id = ?', [id]))[0];
        if (!student) {
            return res.status(404).json({ success: false, message: 'Student not found.' });
        }

        // Delete user (Cascades to student profile and enrollments)
        await db.query('DELETE FROM users WHERE id = ?', [student.user_id]);
        res.json({ success: true, message: 'Student account deleted successfully.' });
    } catch (err) {
        next(err);
    }
}

// ---------------------------------------------------------
// TEACHER MANAGEMENT CRUD
// ---------------------------------------------------------
async function getAllTeachers(req, res, next) {
    try {
        const teachers = await db.query(`
            SELECT t.*, u.username 
            FROM teachers t
            JOIN users u ON t.user_id = u.id
            ORDER BY t.id DESC
        `);
        res.json({ success: true, teachers });
    } catch (err) {
        next(err);
    }
}

async function createTeacher(req, res, next) {
    try {
        const { username, password, teacher_code, first_name, last_name, email, department } = req.body;

        if (!username || !password || !teacher_code || !first_name || !last_name || !email) {
            return res.status(400).json({ success: false, message: 'All teacher fields are required.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const userRes = await db.query(
            'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
            [username.trim(), hashedPassword, 'teacher']
        );

        const teacherRes = await db.query(
            `INSERT INTO teachers (user_id, teacher_code, first_name, last_name, email, department) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [userRes.insertId, teacher_code.trim(), first_name.trim(), last_name.trim(), email.trim(), department || 'College of Computer Studies']
        );

        res.status(201).json({
            success: true,
            message: 'Teacher account created successfully.',
            teacherId: teacherRes.insertId
        });
    } catch (err) {
        next(err);
    }
}

async function updateTeacher(req, res, next) {
    try {
        const { id } = req.params;
        const { teacher_code, first_name, last_name, email, department, username, password } = req.body;

        const teacher = (await db.query('SELECT * FROM teachers WHERE id = ?', [id]))[0];
        if (!teacher) {
            return res.status(404).json({ success: false, message: 'Teacher not found.' });
        }

        await db.query(
            `UPDATE teachers SET teacher_code = ?, first_name = ?, last_name = ?, email = ?, department = ? WHERE id = ?`,
            [teacher_code ? teacher_code.trim() : teacher.teacher_code, first_name.trim(), last_name.trim(), email.trim(), department, id]
        );

        if (username && username.trim() !== '') {
            await db.query('UPDATE users SET username = ? WHERE id = ?', [username.trim(), teacher.user_id]);
        }

        if (password && password.trim() !== '') {
            const hashedPassword = await bcrypt.hash(password, 10);
            await db.query('UPDATE users SET password_hash = ? WHERE id = ?', [hashedPassword, teacher.user_id]);
        }

        res.json({ success: true, message: 'Teacher details updated successfully.' });
    } catch (err) {
        next(err);
    }
}

async function deleteTeacher(req, res, next) {
    try {
        const { id } = req.params;
        const teacher = (await db.query('SELECT * FROM teachers WHERE id = ?', [id]))[0];
        if (!teacher) {
            return res.status(404).json({ success: false, message: 'Teacher not found.' });
        }

        await db.query('DELETE FROM users WHERE id = ?', [teacher.user_id]);
        res.json({ success: true, message: 'Teacher account deleted successfully.' });
    } catch (err) {
        next(err);
    }
}

// ---------------------------------------------------------
// COURSES, SECTIONS, AND SUBJECTS MANAGEMENT
// ---------------------------------------------------------
async function getAllCourses(req, res, next) {
    try {
        const courses = await db.query('SELECT * FROM courses ORDER BY id ASC');
        res.json({ success: true, courses });
    } catch (err) {
        next(err);
    }
}

async function createCourse(req, res, next) {
    try {
        const { course_code, course_name, description } = req.body;
        if (!course_code || !course_name) {
            return res.status(400).json({ success: false, message: 'Course code and name are required.' });
        }
        await db.query('INSERT INTO courses (course_code, course_name, description) VALUES (?, ?, ?)',
            [course_code.trim(), course_name.trim(), description || '']);
        res.status(201).json({ success: true, message: 'Course created successfully.' });
    } catch (err) {
        next(err);
    }
}

async function getAllSections(req, res, next) {
    try {
        const sections = await db.query(`
            SELECT sec.*, c.course_code, c.course_name 
            FROM sections sec
            JOIN courses c ON sec.course_id = c.id
            ORDER BY sec.id ASC
        `);
        res.json({ success: true, sections });
    } catch (err) {
        next(err);
    }
}

async function createSection(req, res, next) {
    try {
        const { section_name, course_id } = req.body;
        if (!section_name || !course_id) {
            return res.status(400).json({ success: false, message: 'Section name and course ID are required.' });
        }
        await db.query('INSERT INTO sections (section_name, course_id) VALUES (?, ?)', [section_name.trim(), course_id]);
        res.status(201).json({ success: true, message: 'Section created successfully.' });
    } catch (err) {
        next(err);
    }
}

async function updateSection(req, res, next) {
    try {
        const { id } = req.params;
        const { section_name, course_id } = req.body;

        const section = (await db.query('SELECT * FROM sections WHERE id = ?', [id]))[0];
        if (!section) {
            return res.status(404).json({ success: false, message: 'Section not found.' });
        }

        await db.query(
            'UPDATE sections SET section_name = ?, course_id = ? WHERE id = ?',
            [section_name.trim(), course_id, id]
        );

        res.json({ success: true, message: 'Section updated successfully.' });
    } catch (err) {
        next(err);
    }
}

async function deleteSection(req, res, next) {
    try {
        const { id } = req.params;
        await db.query('DELETE FROM sections WHERE id = ?', [id]);
        res.json({ success: true, message: 'Section deleted successfully.' });
    } catch (err) {
        next(err);
    }
}

async function getAllSubjects(req, res, next) {
    try {
        const subjects = await db.query(`
            SELECT sub.*, c.course_code, t.first_name as teacher_first, t.last_name as teacher_last 
            FROM subjects sub
            LEFT JOIN courses c ON sub.course_id = c.id
            LEFT JOIN teachers t ON sub.teacher_id = t.id
            ORDER BY sub.id ASC
        `);
        res.json({ success: true, subjects });
    } catch (err) {
        next(err);
    }
}

async function createSubject(req, res, next) {
    try {
        const { subject_code, subject_name, course_id, teacher_id } = req.body;
        if (!subject_code || !subject_name || !course_id || !teacher_id) {
            return res.status(400).json({ success: false, message: 'All subject fields are required.' });
        }
        await db.query(
            'INSERT INTO subjects (subject_code, subject_name, course_id, teacher_id) VALUES (?, ?, ?, ?)',
            [subject_code.trim(), subject_name.trim(), course_id, teacher_id]
        );
        res.status(201).json({ success: true, message: 'Subject created successfully.' });
    } catch (err) {
        next(err);
    }
}

async function updateSubject(req, res, next) {
    try {
        const { id } = req.params;
        const { subject_code, subject_name, course_id, teacher_id } = req.body;

        const subject = (await db.query('SELECT * FROM subjects WHERE id = ?', [id]))[0];
        if (!subject) {
            return res.status(404).json({ success: false, message: 'Subject not found.' });
        }

        await db.query(
            'UPDATE subjects SET subject_code = ?, subject_name = ?, course_id = ?, teacher_id = ? WHERE id = ?',
            [subject_code.trim(), subject_name.trim(), course_id, teacher_id, id]
        );

        res.json({ success: true, message: 'Subject updated successfully.' });
    } catch (err) {
        next(err);
    }
}

async function deleteSubject(req, res, next) {
    try {
        const { id } = req.params;
        await db.query('DELETE FROM subjects WHERE id = ?', [id]);
        res.json({ success: true, message: 'Subject deleted successfully.' });
    } catch (err) {
        next(err);
    }
}

// ---------------------------------------------------------
// ENROLLMENTS MANAGEMENT
// ---------------------------------------------------------
async function getAllEnrollments(req, res, next) {
    try {
        const enrollments = await db.query(`
            SELECT e.*, s.student_code, s.first_name, s.last_name, sub.subject_code, sub.subject_name, sec.section_name
            FROM enrollments e
            JOIN students s ON e.student_id = s.id
            JOIN subjects sub ON e.subject_id = sub.id
            JOIN sections sec ON e.section_id = sec.id
            ORDER BY e.id DESC
        `);
        res.json({ success: true, enrollments });
    } catch (err) {
        next(err);
    }
}

async function enrollStudent(req, res, next) {
    try {
        const { student_id, subject_id, section_id } = req.body;
        if (!student_id || !subject_id || !section_id) {
            return res.status(400).json({ success: false, message: 'Student, Subject, and Section are required.' });
        }
        await db.query(
            'INSERT INTO enrollments (student_id, subject_id, section_id) VALUES (?, ?, ?)',
            [student_id, subject_id, section_id]
        );
        res.status(201).json({ success: true, message: 'Student enrolled in subject successfully.' });
    } catch (err) {
        next(err);
    }
}

async function removeEnrollment(req, res, next) {
    try {
        const { id } = req.params;
        await db.query('DELETE FROM enrollments WHERE id = ?', [id]);
        res.json({ success: true, message: 'Enrollment removed successfully.' });
    } catch (err) {
        next(err);
    }
}

// ---------------------------------------------------------
// ADMIN ATTENDANCE RECORDS MANAGEMENT
// ---------------------------------------------------------
async function getAdminAttendanceRecords(req, res, next) {
    try {
        const { search, date_from, date_to, teacher_id, subject_id, section_id, status } = req.query;

        let whereConditions = [];
        let queryParams = [];

        if (teacher_id) {
            whereConditions.push('sess.teacher_id = ?');
            queryParams.push(teacher_id);
        }

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

        const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

        const records = await db.query(`
            SELECT ar.id as attendance_id, ar.session_id, ar.date, ar.time, ar.status, ar.scanned_at, ar.remarks,
                   st.id as student_id, st.student_code, st.first_name as student_first, st.last_name as student_last, st.email,
                   c.course_code, sec.section_name,
                   sub.subject_code, sub.subject_name,
                   t.id as teacher_id, t.first_name as teacher_first, t.last_name as teacher_last
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
            summary: {
                totalRecords: records.length,
                presentCount,
                lateCount,
                absentCount
            },
            records
        });
    } catch (err) {
        next(err);
    }
}

module.exports = {
    getDashboardStats,
    getAllStudents,
    createStudent,
    updateStudent,
    deleteStudent,
    getAllTeachers,
    createTeacher,
    updateTeacher,
    deleteTeacher,
    getAllCourses,
    createCourse,
    getAllSections,
    createSection,
    updateSection,
    deleteSection,
    getAllSubjects,
    createSubject,
    updateSubject,
    deleteSubject,
    getAllEnrollments,
    enrollStudent,
    removeEnrollment,
    getAdminAttendanceRecords
};

