const mysql = require('mysql2/promise');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

let dbDriver = process.env.DB_DRIVER || 'sqlite';
let pool = null;
let sqliteDb = null;

// Database helper that handles parameterized queries for both MySQL and SQLite
async function initDatabase() {
    console.log(`[Database] Initializing connection (Driver: ${dbDriver})...`);

    if (dbDriver === 'mysql') {
        try {
            pool = mysql.createPool({
                host: process.env.DB_HOST || '127.0.0.1',
                port: process.env.DB_PORT || 3306,
                user: process.env.DB_USER || 'root',
                password: process.env.DB_PASSWORD || '',
                database: process.env.DB_NAME || 'qr_attendance_db',
                waitForConnections: true,
                connectionLimit: 10,
                queueLimit: 0
            });
            // Test MySQL connection
            const connection = await pool.getConnection();
            connection.release();
            console.log('[Database] Connected successfully to MySQL server.');
            await setupTablesAndSeedMySQL();
            return;
        } catch (err) {
            console.warn('[Database] MySQL connection failed. Falling back to SQLite database.', err.message);
            dbDriver = 'sqlite';
        }
    }

    // SQLite Fallback
    const dbPath = path.join(__dirname, '../../qr_attendance.sqlite');
    sqliteDb = new sqlite3.Database(dbPath, async (err) => {
        if (err) {
            console.error('[Database] Failed to open SQLite database:', err.message);
        } else {
            console.log(`[Database] SQLite database opened at: ${dbPath}`);
            await setupTablesAndSeedSQLite();
        }
    });
}

// Convert MySQL SQL placeholders (?) to SQLite compatible queries
function prepareSqliteQuery(sql) {
    // Basic compatibility helper
    return sql
        .replace(/AUTO_INCREMENT/gi, 'AUTOINCREMENT')
        .replace(/DATETIME DEFAULT CURRENT_TIMESTAMP/gi, 'DATETIME DEFAULT CURRENT_TIMESTAMP')
        .replace(/ENUM\([^)]+\)/gi, 'TEXT');
}

// Unified Query Execution Helper
async function query(sql, params = []) {
    if (dbDriver === 'mysql' && pool) {
        const [rows] = await pool.execute(sql, params);
        // Normalize MySQL insert result to include insertId
        return rows;
    } else if (sqliteDb) {
        return new Promise((resolve, reject) => {
            const preparedSql = prepareSqliteQuery(sql);
            const trimmedSql = preparedSql.trim().toUpperCase();

            if (trimmedSql.startsWith('SELECT') || trimmedSql.startsWith('PRAGMA')) {
                sqliteDb.all(preparedSql, params, (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                });
            } else {
                sqliteDb.run(preparedSql, params, function (err) {
                    if (err) reject(err);
                    else resolve({ insertId: this.lastID, affectedRows: this.changes });
                });
            }
        });
    } else {
        throw new Error('Database connection is not initialized.');
    }
}

// Automatic Schema & Seed Initialization for MySQL
async function setupTablesAndSeedMySQL() {
    try {
        const schemaPath = path.join(__dirname, '../../schema.sql');
        const seedPath = path.join(__dirname, '../../seed.sql');

        if (fs.existsSync(schemaPath)) {
            const schemaSql = fs.readFileSync(schemaPath, 'utf8');
            const statements = schemaSql.split(';').filter(stmt => stmt.trim().length > 0);
            for (let stmt of statements) {
                if (!stmt.toLowerCase().includes('create database') && !stmt.toLowerCase().includes('use ')) {
                    await pool.query(stmt);
                }
            }
        }
        await seedDefaultUsers();
    } catch (err) {
        console.error('[Database] Error setting up MySQL tables:', err.message);
    }
}

// Automatic Schema & Seed Initialization for SQLite
async function setupTablesAndSeedSQLite() {
    try {
        await query(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                role TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await query(`
            CREATE TABLE IF NOT EXISTS courses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                course_code TEXT UNIQUE NOT NULL,
                course_name TEXT NOT NULL,
                description TEXT
            )
        `);

        await query(`
            CREATE TABLE IF NOT EXISTS sections (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                section_name TEXT NOT NULL,
                course TEXT,
                year_level TEXT,
                course_id INTEGER,
                FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
            )
        `);

        await query(`
            CREATE TABLE IF NOT EXISTS students (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER UNIQUE NOT NULL,
                student_id TEXT UNIQUE NOT NULL,
                student_code TEXT,
                first_name TEXT NOT NULL,
                last_name TEXT NOT NULL,
                course TEXT,
                year_level TEXT,
                section TEXT,
                email TEXT,
                course_id INTEGER,
                section_id INTEGER,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL,
                FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE SET NULL
            )
        `);

        await query(`
            CREATE TABLE IF NOT EXISTS teachers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER UNIQUE NOT NULL,
                teacher_id TEXT UNIQUE NOT NULL,
                teacher_code TEXT,
                first_name TEXT NOT NULL,
                last_name TEXT NOT NULL,
                email TEXT,
                department TEXT DEFAULT 'College of Computer Studies',
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

        await query(`
            CREATE TABLE IF NOT EXISTS subjects (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                subject_code TEXT UNIQUE NOT NULL,
                subject_name TEXT NOT NULL,
                course_id INTEGER,
                teacher_id INTEGER,
                FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL,
                FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL
            )
        `);

        await query(`
            CREATE TABLE IF NOT EXISTS enrollments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                student_id INTEGER NOT NULL,
                subject_id INTEGER NOT NULL,
                section_id INTEGER NOT NULL,
                enrolled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(student_id, subject_id, section_id)
            )
        `);

        await query(`
            CREATE TABLE IF NOT EXISTS attendance_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                subject_id INTEGER NOT NULL,
                section_id INTEGER NOT NULL,
                teacher_id INTEGER NOT NULL,
                session_token TEXT UNIQUE NOT NULL,
                start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
                end_time DATETIME,
                expires_at DATETIME,
                status TEXT DEFAULT 'active',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await query(`
            CREATE TABLE IF NOT EXISTS attendance_records (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id INTEGER NOT NULL,
                student_id INTEGER NOT NULL,
                date DATE,
                time TIME,
                status TEXT DEFAULT 'Present',
                scanned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                remarks TEXT DEFAULT 'Scanned via QR Code',
                UNIQUE(session_id, student_id)
            )
        `);

        // Migration helper: ensure date & time columns exist on pre-existing databases
        try {
            const columns = await query("PRAGMA table_info(attendance_records)");
            const colNames = columns.map(c => c.name);
            if (!colNames.includes('date')) {
                await query("ALTER TABLE attendance_records ADD COLUMN date DATE");
            }
            if (!colNames.includes('time')) {
                await query("ALTER TABLE attendance_records ADD COLUMN time TIME");
            }
        } catch (e) {
            console.warn('[Database] Column migration note:', e.message);
        }

        await seedDefaultUsers();
    } catch (err) {
        console.error('[Database] Error setting up SQLite tables:', err.message);
    }
}

// Seed default Admin, Teacher, Student accounts if none exist
async function seedDefaultUsers() {
    try {
        const users = await query('SELECT count(*) as count FROM users');
        const userCount = users[0].count || users[0]['count(*)'] || 0;

        if (userCount === 0) {
            console.log('[Database] Seeding default accounts (admin, teacher, student)...');

            const hashedAdmin = await bcrypt.hash('admin123', 10);
            const hashedTeacher = await bcrypt.hash('teacher123', 10);
            const hashedStudent = await bcrypt.hash('student123', 10);

            // 1. Admin
            const adminRes = await query('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)', ['admin', hashedAdmin, 'admin']);

            // 2. Courses & Sections
            const c1 = await query('INSERT INTO courses (course_code, course_name, description) VALUES (?, ?, ?)', ['BSCS', 'Bachelor of Science in Computer Science', 'Focuses on software engineering and algorithms']);
            const c2 = await query('INSERT INTO courses (course_code, course_name, description) VALUES (?, ?, ?)', ['BSIT', 'Bachelor of Science in Information Technology', 'Focuses on web systems and databases']);

            const course1Id = c1.insertId || 1;
            const course2Id = c2.insertId || 2;

            const s1 = await query('INSERT INTO sections (section_name, course, year_level, course_id) VALUES (?, ?, ?, ?)', ['BSCS-3A', 'BSCS', '3rd Year', course1Id]);
            const s2 = await query('INSERT INTO sections (section_name, course, year_level, course_id) VALUES (?, ?, ?, ?)', ['BSIT-2B', 'BSIT', '2nd Year', course2Id]);

            const section1Id = s1.insertId || 1;
            const section2Id = s2.insertId || 2;

            // 3. Teacher
            const tUser = await query('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)', ['prof.smith', hashedTeacher, 'teacher']);
            const teacherRes = await query('INSERT INTO teachers (user_id, teacher_id, teacher_code, first_name, last_name, email, department) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [tUser.insertId || 2, 'T-2026-001', 'T-2026-001', 'Alan', 'Smith', 'alan.smith@college.edu', 'College of Computer Studies']);

            const teacherId = teacherRes.insertId || 1;

            // 4. Students
            const stUser1 = await query('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)', ['john.doe', hashedStudent, 'student']);
            const student1Res = await query('INSERT INTO students (user_id, student_id, student_code, first_name, last_name, course, year_level, section, email, course_id, section_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [stUser1.insertId || 3, 'S-2026-101', 'S-2026-101', 'John', 'Doe', 'BSCS', '3rd Year', 'BSCS-3A', 'john.doe@student.college.edu', course1Id, section1Id]);

            const stUser2 = await query('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)', ['jane.smith', hashedStudent, 'student']);
            const student2Res = await query('INSERT INTO students (user_id, student_id, student_code, first_name, last_name, course, year_level, section, email, course_id, section_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [stUser2.insertId || 4, 'S-2026-102', 'S-2026-102', 'Jane', 'Smith', 'BSIT', '2nd Year', 'BSIT-2B', 'jane.smith@student.college.edu', course2Id, section2Id]);

            const student1Id = student1Res.insertId || 1;
            const student2Id = student2Res.insertId || 2;

            // 5. Subjects
            const sub1 = await query('INSERT INTO subjects (subject_code, subject_name, course_id, teacher_id) VALUES (?, ?, ?, ?)', ['IT101', 'Web Systems & Technologies', course2Id, teacherId]);
            const sub2 = await query('INSERT INTO subjects (subject_code, subject_name, course_id, teacher_id) VALUES (?, ?, ?, ?)', ['CS201', 'Database Management Systems', course1Id, teacherId]);

            const sub1Id = sub1.insertId || 1;
            const sub2Id = sub2.insertId || 2;

            // 6. Enrollments
            await query('INSERT INTO enrollments (student_id, subject_id, section_id) VALUES (?, ?, ?)', [student1Id, sub2Id, section1Id]);
            await query('INSERT INTO enrollments (student_id, subject_id, section_id) VALUES (?, ?, ?)', [student2Id, sub1Id, section2Id]);

            console.log('[Database] Default seed data initialized successfully!');
        }
    } catch (err) {
        console.error('[Database] Seeding error:', err.message);
    }
}

module.exports = {
    initDatabase,
    query,
    getDriver: () => dbDriver
};
