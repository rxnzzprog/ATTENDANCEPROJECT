-- =========================================================
-- DEMO SEED DATA FOR QR CODE ATTENDANCE MANAGEMENT SYSTEM
-- Passwords for default accounts:
-- admin -> admin123
-- prof.smith -> teacher123
-- john.doe -> student123
-- jane.smith -> student123
-- =========================================================

-- 1. Insert Courses
INSERT INTO courses (id, course_code, course_name, description) VALUES
(1, 'BSCS', 'Bachelor of Science in Computer Science', 'Focuses on software engineering and algorithms'),
(2, 'BSIT', 'Bachelor of Science in Information Technology', 'Focuses on web development, databases, and network administration')
ON DUPLICATE KEY UPDATE course_name=VALUES(course_name);

-- 2. Insert Sections
INSERT INTO sections (id, section_name, course, year_level, course_id) VALUES
(1, 'BSCS-3A', 'BSCS', '3rd Year', 1),
(2, 'BSIT-2B', 'BSIT', '2nd Year', 2)
ON DUPLICATE KEY UPDATE section_name=VALUES(section_name);

-- 3. Insert Users (Passwords hashed with bcrypt: admin123, teacher123, student123)
INSERT INTO users (id, username, password_hash, role) VALUES
(1, 'admin', '$2a$10$X.1XMXSLyiI7MgBS6ePIluNOe9GB3XtleiY1fTE9pPhAdxyRibaGO', 'admin'),
(2, 'prof.smith', '$2a$10$8iwd8TW0h3QWb.ewQY3tDeGlNF80Qmsxz6GPqgjvjnQ3/lzjeD8Bm', 'teacher'),
(3, 'john.doe', '$2a$10$qxyg8z4pghT/C40DZWiue.iLn8Apzs9HJ6gWtAyN5yWRJHAJi0dCa', 'student'),
(4, 'jane.smith', '$2a$10$qxyg8z4pghT/C40DZWiue.iLn8Apzs9HJ6gWtAyN5yWRJHAJi0dCa', 'student')
ON DUPLICATE KEY UPDATE username=VALUES(username);

-- 4. Insert Teachers
INSERT INTO teachers (id, user_id, teacher_id, teacher_code, first_name, last_name, email, department) VALUES
(1, 2, 'T-2026-001', 'T-2026-001', 'Alan', 'Smith', 'alan.smith@college.edu', 'College of Computer Studies')
ON DUPLICATE KEY UPDATE teacher_id=VALUES(teacher_id);

-- 5. Insert Students
INSERT INTO students (id, user_id, student_id, student_code, first_name, last_name, course, year_level, section, email, course_id, section_id) VALUES
(1, 3, 'S-2026-101', 'S-2026-101', 'John', 'Doe', 'BSCS', '3rd Year', 'BSCS-3A', 'john.doe@student.college.edu', 1, 1),
(2, 4, 'S-2026-102', 'S-2026-102', 'Jane', 'Smith', 'BSIT', '2nd Year', 'BSIT-2B', 'jane.smith@student.college.edu', 2, 2)
ON DUPLICATE KEY UPDATE student_id=VALUES(student_id);

-- 6. Insert Subjects
INSERT INTO subjects (id, subject_code, subject_name, course_id, teacher_id) VALUES
(1, 'IT101', 'Web Systems & Technologies', 2, 1),
(2, 'CS201', 'Database Management Systems', 1, 1)
ON DUPLICATE KEY UPDATE subject_code=VALUES(subject_code);

-- 7. Insert Enrollments
INSERT INTO enrollments (id, student_id, subject_id, section_id) VALUES
(1, 1, 2, 1),
(2, 2, 1, 2)
ON DUPLICATE KEY UPDATE id=id;
