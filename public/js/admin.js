// Admin Dashboard Controller
async function renderAdminDashboard() {
    const content = document.getElementById('view-content');
    content.innerHTML = `
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-icon blue"><i class="fa-solid fa-user-graduate"></i></div>
                <div class="stat-details">
                    <h3 id="stat-students">0</h3>
                    <p>Total Students</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon purple"><i class="fa-solid fa-chalkboard-user"></i></div>
                <div class="stat-details">
                    <h3 id="stat-teachers">0</h3>
                    <p>Total Teachers</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon green"><i class="fa-solid fa-book-open"></i></div>
                <div class="stat-details">
                    <h3 id="stat-subjects">0</h3>
                    <p>Total Subjects</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon amber"><i class="fa-solid fa-chart-pie"></i></div>
                <div class="stat-details">
                    <h3 id="stat-rate">0%</h3>
                    <p>System Attendance Rate</p>
                </div>
            </div>
        </div>

        <div class="card">
            <div class="card-header">
                <h3><i class="fa-solid fa-bolt"></i> Quick System Controls</h3>
            </div>
            <div class="card-body" style="display: flex; gap: 12px; flex-wrap: wrap;">
                <button class="btn btn-primary" onclick="switchNav('admin-students')"><i class="fa-solid fa-user-plus"></i> Manage Students</button>
                <button class="btn btn-primary" onclick="switchNav('admin-teachers')"><i class="fa-solid fa-user-tie"></i> Manage Teachers</button>
                <button class="btn btn-secondary" onclick="switchNav('admin-subjects')"><i class="fa-solid fa-book"></i> Manage Subjects</button>
                <button class="btn btn-secondary" onclick="switchNav('admin-sections')"><i class="fa-solid fa-layer-group"></i> Manage Sections</button>
                <button class="btn btn-secondary" onclick="switchNav('admin-enrollments')"><i class="fa-solid fa-user-check"></i> Manage Enrollments</button>
                <button class="btn btn-success" onclick="switchNav('reports')"><i class="fa-solid fa-file-invoice"></i> View Attendance Reports</button>
            </div>
        </div>
    `;

    try {
        const res = await apiFetch('/api/admin/stats');
        if (res && res.success) {
            document.getElementById('stat-students').innerText = res.stats.totalStudents;
            document.getElementById('stat-teachers').innerText = res.stats.totalTeachers;
            document.getElementById('stat-subjects').innerText = res.stats.totalSubjects;
            document.getElementById('stat-rate').innerText = res.stats.attendanceRate + '%';
        }
    } catch(e) {
        console.error(e);
    }
}

// Global cache for modal dropdowns
let cachedStudents = [];
let cachedTeachers = [];
let cachedSubjects = [];
let cachedSections = [];
let cachedCourses = [];

// Students Management
async function renderAdminStudents() {
    const content = document.getElementById('view-content');
    content.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h3><i class="fa-solid fa-users"></i> Student Accounts</h3>
                <button class="btn btn-primary" onclick="openAddStudentModal()"><i class="fa-solid fa-plus"></i> Add Student</button>
            </div>
            <div class="card-body table-responsive">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Student Code</th>
                            <th>Full Name</th>
                            <th>Username</th>
                            <th>Email</th>
                            <th>Course</th>
                            <th>Section</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="students-table-body">
                        <tr><td colspan="7">Loading students...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;

    try {
        const res = await apiFetch('/api/admin/students');
        const tbody = document.getElementById('students-table-body');
        if (res && res.success) {
            cachedStudents = res.students;
            if (res.students.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7">No student accounts found.</td></tr>';
                return;
            }
            tbody.innerHTML = res.students.map(s => `
                <tr>
                    <td><strong>${escapeHtml(s.student_code)}</strong></td>
                    <td>${escapeHtml(s.first_name)} ${escapeHtml(s.last_name)}</td>
                    <td><span class="badge badge-info">${escapeHtml(s.username)}</span></td>
                    <td>${escapeHtml(s.email)}</td>
                    <td>${escapeHtml(s.course_code || 'N/A')}</td>
                    <td>${escapeHtml(s.section_name || 'N/A')}</td>
                    <td>
                        <button class="btn btn-secondary" style="padding: 4px 8px; font-size: 12px; margin-right: 4px;" onclick="openEditStudentModal(${s.id})" title="Edit"><i class="fa-solid fa-pen-to-square"></i></button>
                        <button class="btn btn-danger" style="padding: 4px 8px; font-size: 12px;" onclick="deleteStudent(${s.id})" title="Delete"><i class="fa-solid fa-trash"></i></button>
                    </td>
                </tr>
            `).join('');
        }
    } catch (e) {
        console.error(e);
    }
}

async function openAddStudentModal() {
    const courses = (await apiFetch('/api/admin/courses')).courses || [];
    const sections = (await apiFetch('/api/admin/sections')).sections || [];

    const courseOptions = courses.map(c => `<option value="${c.id}">${c.course_code} - ${c.course_name}</option>`).join('');
    const sectionOptions = sections.map(s => `<option value="${s.id}">${s.course_code} : ${s.section_name}</option>`).join('');

    const html = `
        <form id="add-student-form">
            <div class="form-group">
                <label>Student Code</label>
                <input type="text" id="m-student-code" class="form-control" placeholder="e.g. S-2026-105" required>
            </div>
            <div class="form-group">
                <label>First Name</label>
                <input type="text" id="m-first-name" class="form-control" required>
            </div>
            <div class="form-group">
                <label>Last Name</label>
                <input type="text" id="m-last-name" class="form-control" required>
            </div>
            <div class="form-group">
                <label>Email</label>
                <input type="email" id="m-email" class="form-control" required>
            </div>
            <div class="form-group">
                <label>Course</label>
                <select id="m-course-id" class="form-control" required>${courseOptions}</select>
            </div>
            <div class="form-group">
                <label>Section</label>
                <select id="m-section-id" class="form-control" required>${sectionOptions}</select>
            </div>
            <div class="form-group">
                <label>Login Username</label>
                <input type="text" id="m-username" class="form-control" placeholder="e.g. alex.smith" required>
            </div>
            <div class="form-group">
                <label>Login Password</label>
                <input type="password" id="m-password" class="form-control" placeholder="Default password" required>
            </div>
            <button type="submit" class="btn btn-primary btn-block">Save Student</button>
        </form>
    `;

    openModal('Create Student Account', html);

    document.getElementById('add-student-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
            student_code: document.getElementById('m-student-code').value,
            first_name: document.getElementById('m-first-name').value,
            last_name: document.getElementById('m-last-name').value,
            email: document.getElementById('m-email').value,
            course_id: document.getElementById('m-course-id').value,
            section_id: document.getElementById('m-section-id').value,
            username: document.getElementById('m-username').value,
            password: document.getElementById('m-password').value
        };

        const res = await apiFetch('/api/admin/students', 'POST', payload);
        if (res && res.success) {
            showToast('Student account created!', 'success');
            closeModal();
            renderAdminStudents();
        } else {
            showToast(res.message || 'Error creating student', 'danger');
        }
    });
}

async function openEditStudentModal(id) {
    const s = cachedStudents.find(item => item.id === id);
    if (!s) return;

    const courses = (await apiFetch('/api/admin/courses')).courses || [];
    const sections = (await apiFetch('/api/admin/sections')).sections || [];

    const courseOptions = courses.map(c => `<option value="${c.id}" ${c.id === s.course_id ? 'selected' : ''}>${c.course_code} - ${c.course_name}</option>`).join('');
    const sectionOptions = sections.map(sec => `<option value="${sec.id}" ${sec.id === s.section_id ? 'selected' : ''}>${sec.course_code} : ${sec.section_name}</option>`).join('');

    const html = `
        <form id="edit-student-form">
            <div class="form-group">
                <label>Student Code</label>
                <input type="text" id="m-edit-student-code" class="form-control" value="${escapeHtml(s.student_code)}" required>
            </div>
            <div class="form-group">
                <label>First Name</label>
                <input type="text" id="m-edit-first-name" class="form-control" value="${escapeHtml(s.first_name)}" required>
            </div>
            <div class="form-group">
                <label>Last Name</label>
                <input type="text" id="m-edit-last-name" class="form-control" value="${escapeHtml(s.last_name)}" required>
            </div>
            <div class="form-group">
                <label>Email</label>
                <input type="email" id="m-edit-email" class="form-control" value="${escapeHtml(s.email)}" required>
            </div>
            <div class="form-group">
                <label>Course</label>
                <select id="m-edit-course-id" class="form-control" required>${courseOptions}</select>
            </div>
            <div class="form-group">
                <label>Section</label>
                <select id="m-edit-section-id" class="form-control" required>${sectionOptions}</select>
            </div>
            <div class="form-group">
                <label>Login Username</label>
                <input type="text" id="m-edit-username" class="form-control" value="${escapeHtml(s.username)}" required>
            </div>
            <div class="form-group">
                <label>New Password (leave blank to keep current)</label>
                <input type="password" id="m-edit-password" class="form-control" placeholder="Optional new password">
            </div>
            <button type="submit" class="btn btn-primary btn-block">Update Student</button>
        </form>
    `;

    openModal(`Edit Student: ${escapeHtml(s.first_name)} ${escapeHtml(s.last_name)}`, html);

    document.getElementById('edit-student-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
            student_code: document.getElementById('m-edit-student-code').value,
            first_name: document.getElementById('m-edit-first-name').value,
            last_name: document.getElementById('m-edit-last-name').value,
            email: document.getElementById('m-edit-email').value,
            course_id: document.getElementById('m-edit-course-id').value,
            section_id: document.getElementById('m-edit-section-id').value,
            username: document.getElementById('m-edit-username').value,
            password: document.getElementById('m-edit-password').value
        };

        const res = await apiFetch(`/api/admin/students/${id}`, 'PUT', payload);
        if (res && res.success) {
            showToast('Student details updated successfully!', 'success');
            closeModal();
            renderAdminStudents();
        } else {
            showToast(res.message || 'Error updating student', 'danger');
        }
    });
}

async function deleteStudent(id) {
    if (!confirm('Are you sure you want to delete this student account?')) return;
    const res = await apiFetch(`/api/admin/students/${id}`, 'DELETE');
    if (res && res.success) {
        showToast('Student deleted.', 'success');
        renderAdminStudents();
    }
}

// Teachers Management
async function renderAdminTeachers() {
    const content = document.getElementById('view-content');
    content.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h3><i class="fa-solid fa-chalkboard-user"></i> Faculty / Teacher Accounts</h3>
                <button class="btn btn-primary" onclick="openAddTeacherModal()"><i class="fa-solid fa-plus"></i> Add Teacher</button>
            </div>
            <div class="card-body table-responsive">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Teacher Code</th>
                            <th>Full Name</th>
                            <th>Username</th>
                            <th>Email</th>
                            <th>Department</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="teachers-table-body">
                        <tr><td colspan="6">Loading teachers...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;

    try {
        const res = await apiFetch('/api/admin/teachers');
        const tbody = document.getElementById('teachers-table-body');
        if (res && res.success) {
            cachedTeachers = res.teachers;
            tbody.innerHTML = res.teachers.map(t => `
                <tr>
                    <td><strong>${escapeHtml(t.teacher_code)}</strong></td>
                    <td>Prof. ${escapeHtml(t.first_name)} ${escapeHtml(t.last_name)}</td>
                    <td><span class="badge badge-info">${escapeHtml(t.username)}</span></td>
                    <td>${escapeHtml(t.email)}</td>
                    <td>${escapeHtml(t.department)}</td>
                    <td>
                        <button class="btn btn-secondary" style="padding: 4px 8px; font-size: 12px; margin-right: 4px;" onclick="openEditTeacherModal(${t.id})" title="Edit"><i class="fa-solid fa-pen-to-square"></i></button>
                        <button class="btn btn-danger" style="padding: 4px 8px; font-size: 12px;" onclick="deleteTeacher(${t.id})" title="Delete"><i class="fa-solid fa-trash"></i></button>
                    </td>
                </tr>
            `).join('');
        }
    } catch (e) {
        console.error(e);
    }
}

async function openAddTeacherModal() {
    const html = `
        <form id="add-teacher-form">
            <div class="form-group">
                <label>Teacher Code</label>
                <input type="text" id="m-teacher-code" class="form-control" placeholder="e.g. T-2026-002" required>
            </div>
            <div class="form-group">
                <label>First Name</label>
                <input type="text" id="m-t-first" class="form-control" required>
            </div>
            <div class="form-group">
                <label>Last Name</label>
                <input type="text" id="m-t-last" class="form-control" required>
            </div>
            <div class="form-group">
                <label>Email</label>
                <input type="email" id="m-t-email" class="form-control" required>
            </div>
            <div class="form-group">
                <label>Department</label>
                <input type="text" id="m-t-dept" class="form-control" value="College of Computer Studies" required>
            </div>
            <div class="form-group">
                <label>Username</label>
                <input type="text" id="m-t-username" class="form-control" required>
            </div>
            <div class="form-group">
                <label>Password</label>
                <input type="password" id="m-t-password" class="form-control" required>
            </div>
            <button type="submit" class="btn btn-primary btn-block">Save Teacher</button>
        </form>
    `;
    openModal('Create Teacher Account', html);

    document.getElementById('add-teacher-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
            teacher_code: document.getElementById('m-teacher-code').value,
            first_name: document.getElementById('m-t-first').value,
            last_name: document.getElementById('m-t-last').value,
            email: document.getElementById('m-t-email').value,
            department: document.getElementById('m-t-dept').value,
            username: document.getElementById('m-t-username').value,
            password: document.getElementById('m-t-password').value
        };

        const res = await apiFetch('/api/admin/teachers', 'POST', payload);
        if (res && res.success) {
            showToast('Teacher created!', 'success');
            closeModal();
            renderAdminTeachers();
        } else {
            showToast(res.message || 'Error creating teacher', 'danger');
        }
    });
}

async function openEditTeacherModal(id) {
    const t = cachedTeachers.find(item => item.id === id);
    if (!t) return;

    const html = `
        <form id="edit-teacher-form">
            <div class="form-group">
                <label>Teacher Code</label>
                <input type="text" id="m-edit-teacher-code" class="form-control" value="${escapeHtml(t.teacher_code)}" required>
            </div>
            <div class="form-group">
                <label>First Name</label>
                <input type="text" id="m-edit-t-first" class="form-control" value="${escapeHtml(t.first_name)}" required>
            </div>
            <div class="form-group">
                <label>Last Name</label>
                <input type="text" id="m-edit-t-last" class="form-control" value="${escapeHtml(t.last_name)}" required>
            </div>
            <div class="form-group">
                <label>Email</label>
                <input type="email" id="m-edit-t-email" class="form-control" value="${escapeHtml(t.email)}" required>
            </div>
            <div class="form-group">
                <label>Department</label>
                <input type="text" id="m-edit-t-dept" class="form-control" value="${escapeHtml(t.department)}" required>
            </div>
            <div class="form-group">
                <label>Username</label>
                <input type="text" id="m-edit-t-username" class="form-control" value="${escapeHtml(t.username)}" required>
            </div>
            <div class="form-group">
                <label>New Password (leave blank to keep current)</label>
                <input type="password" id="m-edit-t-password" class="form-control" placeholder="Optional new password">
            </div>
            <button type="submit" class="btn btn-primary btn-block">Update Teacher</button>
        </form>
    `;
    openModal(`Edit Teacher: Prof. ${escapeHtml(t.first_name)} ${escapeHtml(t.last_name)}`, html);

    document.getElementById('edit-teacher-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
            teacher_code: document.getElementById('m-edit-teacher-code').value,
            first_name: document.getElementById('m-edit-t-first').value,
            last_name: document.getElementById('m-edit-t-last').value,
            email: document.getElementById('m-edit-t-email').value,
            department: document.getElementById('m-edit-t-dept').value,
            username: document.getElementById('m-edit-t-username').value,
            password: document.getElementById('m-edit-t-password').value
        };

        const res = await apiFetch(`/api/admin/teachers/${id}`, 'PUT', payload);
        if (res && res.success) {
            showToast('Teacher details updated!', 'success');
            closeModal();
            renderAdminTeachers();
        } else {
            showToast(res.message || 'Error updating teacher', 'danger');
        }
    });
}

async function deleteTeacher(id) {
    if (!confirm('Delete this teacher account?')) return;
    const res = await apiFetch(`/api/admin/teachers/${id}`, 'DELETE');
    if (res && res.success) {
        showToast('Teacher deleted.', 'success');
        renderAdminTeachers();
    }
}

// Subjects Management
async function renderAdminSubjects() {
    const content = document.getElementById('view-content');
    content.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h3><i class="fa-solid fa-book"></i> Subjects Directory</h3>
                <button class="btn btn-primary" onclick="openAddSubjectModal()"><i class="fa-solid fa-plus"></i> Add Subject</button>
            </div>
            <div class="card-body table-responsive">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Subject Code</th>
                            <th>Subject Name</th>
                            <th>Course</th>
                            <th>Assigned Teacher</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="subjects-table-body">
                        <tr><td colspan="5">Loading subjects...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;

    try {
        const res = await apiFetch('/api/admin/subjects');
        const tbody = document.getElementById('subjects-table-body');
        if (res && res.success) {
            cachedSubjects = res.subjects;
            tbody.innerHTML = res.subjects.map(s => `
                <tr>
                    <td><strong>${escapeHtml(s.subject_code)}</strong></td>
                    <td>${escapeHtml(s.subject_name)}</td>
                    <td>${escapeHtml(s.course_code)}</td>
                    <td>Prof. ${escapeHtml(s.teacher_first || '')} ${escapeHtml(s.teacher_last || '')}</td>
                    <td>
                        <button class="btn btn-secondary" style="padding: 4px 8px; font-size: 12px; margin-right: 4px;" onclick="openEditSubjectModal(${s.id})" title="Edit"><i class="fa-solid fa-pen-to-square"></i></button>
                        <button class="btn btn-danger" style="padding: 4px 8px; font-size: 12px;" onclick="deleteSubject(${s.id})" title="Delete"><i class="fa-solid fa-trash"></i></button>
                    </td>
                </tr>
            `).join('');
        }
    } catch (e) {
        console.error(e);
    }
}

async function openAddSubjectModal() {
    const courses = (await apiFetch('/api/admin/courses')).courses || [];
    const teachers = (await apiFetch('/api/admin/teachers')).teachers || [];

    const courseOptions = courses.map(c => `<option value="${c.id}">${c.course_code} - ${c.course_name}</option>`).join('');
    const teacherOptions = teachers.map(t => `<option value="${t.id}">Prof. ${t.first_name} ${t.last_name}</option>`).join('');

    const html = `
        <form id="add-subject-form">
            <div class="form-group">
                <label>Subject Code</label>
                <input type="text" id="m-sub-code" class="form-control" placeholder="e.g. IT302" required>
            </div>
            <div class="form-group">
                <label>Subject Name</label>
                <input type="text" id="m-sub-name" class="form-control" placeholder="e.g. Systems Analysis and Design" required>
            </div>
            <div class="form-group">
                <label>Course Program</label>
                <select id="m-sub-course" class="form-control" required>${courseOptions}</select>
            </div>
            <div class="form-group">
                <label>Assign Teacher</label>
                <select id="m-sub-teacher" class="form-control" required>${teacherOptions}</select>
            </div>
            <button type="submit" class="btn btn-primary btn-block">Create Subject</button>
        </form>
    `;
    openModal('Create Subject', html);

    document.getElementById('add-subject-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
            subject_code: document.getElementById('m-sub-code').value,
            subject_name: document.getElementById('m-sub-name').value,
            course_id: document.getElementById('m-sub-course').value,
            teacher_id: document.getElementById('m-sub-teacher').value
        };

        const res = await apiFetch('/api/admin/subjects', 'POST', payload);
        if (res && res.success) {
            showToast('Subject created!', 'success');
            closeModal();
            renderAdminSubjects();
        } else {
            showToast(res.message || 'Error creating subject', 'danger');
        }
    });
}

async function openEditSubjectModal(id) {
    const s = cachedSubjects.find(item => item.id === id);
    if (!s) return;

    const courses = (await apiFetch('/api/admin/courses')).courses || [];
    const teachers = (await apiFetch('/api/admin/teachers')).teachers || [];

    const courseOptions = courses.map(c => `<option value="${c.id}" ${c.id === s.course_id ? 'selected' : ''}>${c.course_code} - ${c.course_name}</option>`).join('');
    const teacherOptions = teachers.map(t => `<option value="${t.id}" ${t.id === s.teacher_id ? 'selected' : ''}>Prof. ${t.first_name} ${t.last_name}</option>`).join('');

    const html = `
        <form id="edit-subject-form">
            <div class="form-group">
                <label>Subject Code</label>
                <input type="text" id="m-edit-sub-code" class="form-control" value="${escapeHtml(s.subject_code)}" required>
            </div>
            <div class="form-group">
                <label>Subject Name</label>
                <input type="text" id="m-edit-sub-name" class="form-control" value="${escapeHtml(s.subject_name)}" required>
            </div>
            <div class="form-group">
                <label>Course Program</label>
                <select id="m-edit-sub-course" class="form-control" required>${courseOptions}</select>
            </div>
            <div class="form-group">
                <label>Assign Teacher</label>
                <select id="m-edit-sub-teacher" class="form-control" required>${teacherOptions}</select>
            </div>
            <button type="submit" class="btn btn-primary btn-block">Update Subject</button>
        </form>
    `;
    openModal(`Edit Subject: ${escapeHtml(s.subject_code)}`, html);

    document.getElementById('edit-subject-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
            subject_code: document.getElementById('m-edit-sub-code').value,
            subject_name: document.getElementById('m-edit-sub-name').value,
            course_id: document.getElementById('m-edit-sub-course').value,
            teacher_id: document.getElementById('m-edit-sub-teacher').value
        };

        const res = await apiFetch(`/api/admin/subjects/${id}`, 'PUT', payload);
        if (res && res.success) {
            showToast('Subject updated!', 'success');
            closeModal();
            renderAdminSubjects();
        } else {
            showToast(res.message || 'Error updating subject', 'danger');
        }
    });
}

async function deleteSubject(id) {
    if (!confirm('Are you sure you want to delete this subject?')) return;
    const res = await apiFetch(`/api/admin/subjects/${id}`, 'DELETE');
    if (res && res.success) {
        showToast('Subject deleted.', 'success');
        renderAdminSubjects();
    }
}

// Class Sections Management
async function renderAdminSections() {
    const content = document.getElementById('view-content');
    content.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h3><i class="fa-solid fa-layer-group"></i> Class Sections Management</h3>
                <button class="btn btn-primary" onclick="openAddSectionModal()"><i class="fa-solid fa-plus"></i> Add Section</button>
            </div>
            <div class="card-body table-responsive">
                <table class="table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Section Name</th>
                            <th>Associated Course</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="sections-table-body">
                        <tr><td colspan="4">Loading sections...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;

    try {
        const res = await apiFetch('/api/admin/sections');
        const tbody = document.getElementById('sections-table-body');
        if (res && res.success) {
            cachedSections = res.sections;
            if (res.sections.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4">No sections found.</td></tr>';
                return;
            }
            tbody.innerHTML = res.sections.map(sec => `
                <tr>
                    <td>#${sec.id}</td>
                    <td><strong>${escapeHtml(sec.section_name)}</strong></td>
                    <td><span class="badge badge-info">${escapeHtml(sec.course_code || 'N/A')}</span></td>
                    <td>
                        <button class="btn btn-secondary" style="padding: 4px 8px; font-size: 12px; margin-right: 4px;" onclick="openEditSectionModal(${sec.id})" title="Edit"><i class="fa-solid fa-pen-to-square"></i></button>
                        <button class="btn btn-danger" style="padding: 4px 8px; font-size: 12px;" onclick="deleteSection(${sec.id})" title="Delete"><i class="fa-solid fa-trash"></i></button>
                    </td>
                </tr>
            `).join('');
        }
    } catch (e) {
        console.error(e);
    }
}

async function openAddSectionModal() {
    const courses = (await apiFetch('/api/admin/courses')).courses || [];
    const courseOptions = courses.map(c => `<option value="${c.id}">${c.course_code} - ${c.course_name}</option>`).join('');

    const html = `
        <form id="add-section-form">
            <div class="form-group">
                <label>Section Name</label>
                <input type="text" id="m-sec-name" class="form-control" placeholder="e.g. BSCS-3A" required>
            </div>
            <div class="form-group">
                <label>Course Program</label>
                <select id="m-sec-course" class="form-control" required>${courseOptions}</select>
            </div>
            <button type="submit" class="btn btn-primary btn-block">Create Section</button>
        </form>
    `;
    openModal('Create Class Section', html);

    document.getElementById('add-section-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
            section_name: document.getElementById('m-sec-name').value,
            course_id: document.getElementById('m-sec-course').value
        };

        const res = await apiFetch('/api/admin/sections', 'POST', payload);
        if (res && res.success) {
            showToast('Section created!', 'success');
            closeModal();
            renderAdminSections();
        } else {
            showToast(res.message || 'Error creating section', 'danger');
        }
    });
}

async function openEditSectionModal(id) {
    const sec = cachedSections.find(item => item.id === id);
    if (!sec) return;

    const courses = (await apiFetch('/api/admin/courses')).courses || [];
    const courseOptions = courses.map(c => `<option value="${c.id}" ${c.id === sec.course_id ? 'selected' : ''}>${c.course_code} - ${c.course_name}</option>`).join('');

    const html = `
        <form id="edit-section-form">
            <div class="form-group">
                <label>Section Name</label>
                <input type="text" id="m-edit-sec-name" class="form-control" value="${escapeHtml(sec.section_name)}" required>
            </div>
            <div class="form-group">
                <label>Course Program</label>
                <select id="m-edit-sec-course" class="form-control" required>${courseOptions}</select>
            </div>
            <button type="submit" class="btn btn-primary btn-block">Update Section</button>
        </form>
    `;
    openModal(`Edit Section: ${escapeHtml(sec.section_name)}`, html);

    document.getElementById('edit-section-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
            section_name: document.getElementById('m-edit-sec-name').value,
            course_id: document.getElementById('m-edit-sec-course').value
        };

        const res = await apiFetch(`/api/admin/sections/${id}`, 'PUT', payload);
        if (res && res.success) {
            showToast('Section updated!', 'success');
            closeModal();
            renderAdminSections();
        } else {
            showToast(res.message || 'Error updating section', 'danger');
        }
    });
}

async function deleteSection(id) {
    if (!confirm('Are you sure you want to delete this class section?')) return;
    const res = await apiFetch(`/api/admin/sections/${id}`, 'DELETE');
    if (res && res.success) {
        showToast('Section deleted.', 'success');
        renderAdminSections();
    }
}

// Enrollments Management
async function renderAdminEnrollments() {
    const content = document.getElementById('view-content');
    content.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h3><i class="fa-solid fa-user-check"></i> Student Subject Enrollments</h3>
                <button class="btn btn-primary" onclick="openEnrollStudentModal()"><i class="fa-solid fa-plus"></i> Enroll Student</button>
            </div>
            <div class="card-body table-responsive">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Student</th>
                            <th>Section</th>
                            <th>Enrolled Subject</th>
                            <th>Enrolled Date</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody id="enrollments-table-body">
                        <tr><td colspan="5">Loading enrollments...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;

    try {
        const res = await apiFetch('/api/admin/enrollments');
        const tbody = document.getElementById('enrollments-table-body');
        if (res && res.success) {
            tbody.innerHTML = res.enrollments.map(e => `
                <tr>
                    <td><strong>${escapeHtml(e.student_code)}</strong> - ${escapeHtml(e.first_name)} ${escapeHtml(e.last_name)}</td>
                    <td><span class="badge badge-info">${escapeHtml(e.section_name)}</span></td>
                    <td>${escapeHtml(e.subject_code)} : ${escapeHtml(e.subject_name)}</td>
                    <td>${new Date(e.enrolled_at).toLocaleDateString()}</td>
                    <td>
                        <button class="btn btn-danger" style="padding: 4px 8px; font-size: 12px;" onclick="removeEnrollment(${e.id})" title="Delete"><i class="fa-solid fa-trash"></i></button>
                    </td>
                </tr>
            `).join('');
        }
    } catch (e) {
        console.error(e);
    }
}

async function openEnrollStudentModal() {
    const students = (await apiFetch('/api/admin/students')).students || [];
    const subjects = (await apiFetch('/api/admin/subjects')).subjects || [];
    const sections = (await apiFetch('/api/admin/sections')).sections || [];

    const studentOptions = students.map(s => `<option value="${s.id}">${s.student_code} - ${s.first_name} ${s.last_name}</option>`).join('');
    const subjectOptions = subjects.map(sub => `<option value="${sub.id}">${sub.subject_code} - ${sub.subject_name}</option>`).join('');
    const sectionOptions = sections.map(sec => `<option value="${sec.id}">${sec.course_code} : ${sec.section_name}</option>`).join('');

    const html = `
        <form id="enroll-form">
            <div class="form-group">
                <label>Select Student</label>
                <select id="m-enr-student" class="form-control" required>${studentOptions}</select>
            </div>
            <div class="form-group">
                <label>Select Subject</label>
                <select id="m-enr-subject" class="form-control" required>${subjectOptions}</select>
            </div>
            <div class="form-group">
                <label>Select Class Section</label>
                <select id="m-enr-section" class="form-control" required>${sectionOptions}</select>
            </div>
            <button type="submit" class="btn btn-primary btn-block">Enroll Student</button>
        </form>
    `;
    openModal('Enroll Student in Subject', html);

    document.getElementById('enroll-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
            student_id: document.getElementById('m-enr-student').value,
            subject_id: document.getElementById('m-enr-subject').value,
            section_id: document.getElementById('m-enr-section').value
        };

        const res = await apiFetch('/api/admin/enrollments', 'POST', payload);
        if (res && res.success) {
            showToast('Student enrolled!', 'success');
            closeModal();
            renderAdminEnrollments();
        } else {
            showToast(res.message || 'Error enrolling student', 'danger');
        }
    });
}

async function removeEnrollment(id) {
    if (!confirm('Remove this enrollment record?')) return;
    const res = await apiFetch(`/api/admin/enrollments/${id}`, 'DELETE');
    if (res && res.success) {
        showToast('Enrollment removed.', 'success');
        renderAdminEnrollments();
    }
}

// ---------------------------------------------------------
// ADMIN ATTENDANCE MANAGEMENT VIEW
// ---------------------------------------------------------
async function renderAdminAttendance() {
    const content = document.getElementById('view-content');
    content.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h3><i class="fa-solid fa-clipboard-user"></i> Master Attendance Management Records</h3>
            </div>
            <div class="card-body">
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 14px; margin-bottom: 16px;">
                    <div class="form-group" style="margin-bottom: 0;">
                        <label>Search Student</label>
                        <input type="text" id="adm-att-search" class="form-control" placeholder="Name or code...">
                    </div>
                    <div class="form-group" style="margin-bottom: 0;">
                        <label>Faculty / Teacher</label>
                        <select id="adm-att-teacher" class="form-control">
                            <option value="">All Teachers</option>
                        </select>
                    </div>
                    <div class="form-group" style="margin-bottom: 0;">
                        <label>Subject</label>
                        <select id="adm-att-subject" class="form-control">
                            <option value="">All Subjects</option>
                        </select>
                    </div>
                    <div class="form-group" style="margin-bottom: 0;">
                        <label>Section</label>
                        <select id="adm-att-section" class="form-control">
                            <option value="">All Sections</option>
                        </select>
                    </div>
                    <div class="form-group" style="margin-bottom: 0;">
                        <label>Status</label>
                        <select id="adm-att-status" class="form-control">
                            <option value="">All Statuses</option>
                            <option value="Present">Present</option>
                            <option value="Late">Late</option>
                            <option value="Absent">Absent</option>
                        </select>
                    </div>
                    <div class="form-group" style="margin-bottom: 0;">
                        <label>Date From</label>
                        <input type="date" id="adm-att-date-from" class="form-control">
                    </div>
                    <div class="form-group" style="margin-bottom: 0;">
                        <label>Date To</label>
                        <input type="date" id="adm-att-date-to" class="form-control">
                    </div>
                </div>

                <div style="display: flex; gap: 10px; margin-bottom: 20px;">
                    <button class="btn btn-primary" onclick="fetchAdminAttendance()"><i class="fa-solid fa-magnifying-glass"></i> Filter Master Records</button>
                    <button class="btn btn-secondary" onclick="resetAdminAttendanceFilters()"><i class="fa-solid fa-rotate-left"></i> Reset</button>
                </div>

                <div class="stats-grid" style="margin-bottom: 24px;">
                    <div class="stat-card">
                        <div class="stat-icon blue"><i class="fa-solid fa-list-check"></i></div>
                        <div class="stat-details">
                            <h3 id="adm-stat-total">0</h3>
                            <p>Total Records</p>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon green"><i class="fa-solid fa-user-check"></i></div>
                        <div class="stat-details">
                            <h3 id="adm-stat-present">0</h3>
                            <p>Total Present</p>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon amber"><i class="fa-solid fa-clock"></i></div>
                        <div class="stat-details">
                            <h3 id="adm-stat-late">0</h3>
                            <p>Total Late</p>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon red" style="background: #fee2e2; color: #dc2626;"><i class="fa-solid fa-user-xmark"></i></div>
                        <div class="stat-details">
                            <h3 id="adm-stat-absent">0</h3>
                            <p>Total Absent</p>
                        </div>
                    </div>
                </div>

                <div class="table-responsive">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Student Code</th>
                                <th>Student Name</th>
                                <th>Course & Section</th>
                                <th>Subject</th>
                                <th>Assigned Teacher</th>
                                <th>Date & Time</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody id="adm-attendance-tbody">
                            <tr><td colspan="7">Loading all system attendance records...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    // Populate filter option dropdowns
    try {
        const teachers = (await apiFetch('/api/admin/teachers')).teachers || [];
        const subjects = (await apiFetch('/api/admin/subjects')).subjects || [];
        const sections = (await apiFetch('/api/admin/sections')).sections || [];

        const teachSel = document.getElementById('adm-att-teacher');
        const subSel = document.getElementById('adm-att-subject');
        const secSel = document.getElementById('adm-att-section');

        if (teachSel) {
            teachers.forEach(t => teachSel.innerHTML += `<option value="${t.id}">Prof. ${escapeHtml(t.first_name)} ${escapeHtml(t.last_name)}</option>`);
        }
        if (subSel) {
            subjects.forEach(s => subSel.innerHTML += `<option value="${s.id}">${escapeHtml(s.subject_code)} - ${escapeHtml(s.subject_name)}</option>`);
        }
        if (secSel) {
            sections.forEach(sec => secSel.innerHTML += `<option value="${sec.id}">${escapeHtml(sec.course_code || '')} : ${escapeHtml(sec.section_name)}</option>`);
        }
    } catch(e) {}

    fetchAdminAttendance();
}

async function fetchAdminAttendance() {
    const search = document.getElementById('adm-att-search') ? document.getElementById('adm-att-search').value : '';
    const teacherId = document.getElementById('adm-att-teacher') ? document.getElementById('adm-att-teacher').value : '';
    const subjectId = document.getElementById('adm-att-subject') ? document.getElementById('adm-att-subject').value : '';
    const sectionId = document.getElementById('adm-att-section') ? document.getElementById('adm-att-section').value : '';
    const status = document.getElementById('adm-att-status') ? document.getElementById('adm-att-status').value : '';
    const dateFrom = document.getElementById('adm-att-date-from') ? document.getElementById('adm-att-date-from').value : '';
    const dateTo = document.getElementById('adm-att-date-to') ? document.getElementById('adm-att-date-to').value : '';

    let params = [];
    if (search) params.push(`search=${encodeURIComponent(search)}`);
    if (teacherId) params.push(`teacher_id=${encodeURIComponent(teacherId)}`);
    if (subjectId) params.push(`subject_id=${encodeURIComponent(subjectId)}`);
    if (sectionId) params.push(`section_id=${encodeURIComponent(sectionId)}`);
    if (status) params.push(`status=${encodeURIComponent(status)}`);
    if (dateFrom) params.push(`date_from=${encodeURIComponent(dateFrom)}`);
    if (dateTo) params.push(`date_to=${encodeURIComponent(dateTo)}`);

    const url = '/api/admin/attendance?' + params.join('&');

    try {
        const res = await apiFetch(url);
        const tbody = document.getElementById('adm-attendance-tbody');

        if (res && res.success) {
            document.getElementById('adm-stat-total').innerText = res.summary.totalRecords;
            document.getElementById('adm-stat-present').innerText = res.summary.presentCount;
            document.getElementById('adm-stat-late').innerText = res.summary.lateCount;
            document.getElementById('adm-stat-absent').innerText = res.summary.absentCount;

            if (!res.records || res.records.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7">No attendance records match the selected filters.</td></tr>';
                return;
            }

            tbody.innerHTML = res.records.map(r => {
                const scanDate = r.scanned_at ? new Date(r.scanned_at) : new Date();
                const formattedDate = r.date || scanDate.toLocaleDateString();
                const formattedTime = r.time || scanDate.toLocaleTimeString();

                return `
                    <tr>
                        <td><strong>${escapeHtml(r.student_code)}</strong></td>
                        <td>${escapeHtml(r.student_first)} ${escapeHtml(r.student_last)}</td>
                        <td>${escapeHtml(r.course_code || '')} : ${escapeHtml(r.section_name)}</td>
                        <td>${escapeHtml(r.subject_code)} - ${escapeHtml(r.subject_name)}</td>
                        <td>Prof. ${escapeHtml(r.teacher_first)} ${escapeHtml(r.teacher_last)}</td>
                        <td>${formattedDate} ${formattedTime}</td>
                        <td><span class="badge ${r.status === 'Present' ? 'badge-success' : (r.status === 'Late' ? 'badge-warning' : 'badge-danger')}">${r.status}</span></td>
                    </tr>
                `;
            }).join('');
        } else {
            if (tbody) tbody.innerHTML = '<tr><td colspan="7" class="text-danger">Failed to load system attendance records.</td></tr>';
        }
    } catch(e) {
        console.error('Admin attendance error:', e);
    }
}

function resetAdminAttendanceFilters() {
    if (document.getElementById('adm-att-search')) document.getElementById('adm-att-search').value = '';
    if (document.getElementById('adm-att-teacher')) document.getElementById('adm-att-teacher').value = '';
    if (document.getElementById('adm-att-subject')) document.getElementById('adm-att-subject').value = '';
    if (document.getElementById('adm-att-section')) document.getElementById('adm-att-section').value = '';
    if (document.getElementById('adm-att-status')) document.getElementById('adm-att-status').value = '';
    if (document.getElementById('adm-att-date-from')) document.getElementById('adm-att-date-from').value = '';
    if (document.getElementById('adm-att-date-to')) document.getElementById('adm-att-date-to').value = '';
    fetchAdminAttendance();
}

