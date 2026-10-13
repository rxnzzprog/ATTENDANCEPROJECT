// Global Application Router and State Controller
document.addEventListener('DOMContentLoaded', () => {
    // Apply initial user preferences on load
    applyUserPreferences();

    // Check user authentication status on initial load
    checkAuth();

    // Login Form Submit Event
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const u = document.getElementById('username').value;
            const p = document.getElementById('password').value;
            loginUser(u, p);
        });
    }

    // Update real-time clock header
    setInterval(() => {
        const timeSpan = document.getElementById('current-time-display');
        if (timeSpan) {
            timeSpan.innerHTML = `<i class="fa-regular fa-clock"></i> ${new Date().toLocaleString()}`;
        }
    }, 1000);
});

// User Preference Manager (Theme & Text Size)
function applyUserPreferences(username) {
    if (!username && window.currentUser) username = window.currentUser.username;
    if (!username) username = 'default';

    let prefs = { theme: 'light', textSize: 'normal' };
    try {
        const saved = localStorage.getItem('qr_prefs_' + username);
        if (saved) {
            prefs = JSON.parse(saved);
        }
    } catch(e) {}

    // Apply Dark / Light Theme
    if (prefs.theme === 'dark') {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }

    // Apply Text Accessibility Scale
    document.body.classList.remove('text-small', 'text-normal', 'text-large');
    document.body.classList.add('text-' + (prefs.textSize || 'normal'));

    return prefs;
}

// Switch view panels dynamically
function switchNav(viewName) {
    // Role-based access control guard on frontend
    const role = window.currentUser ? window.currentUser.role : null;
    const roleAllowedViews = {
        admin: ['admin-dashboard', 'admin-students', 'admin-teachers', 'admin-attendance', 'admin-subjects', 'admin-sections', 'admin-enrollments', 'reports', 'settings'],
        teacher: ['teacher-dashboard', 'teacher-attendance', 'teacher-profile', 'reports', 'settings'],
        student: ['student-dashboard', 'student-profile', 'student-scanner', 'student-history', 'settings']
    };

    if (role && roleAllowedViews[role]) {
        if (!roleAllowedViews[role].includes(viewName)) {
            showToast(`Access Denied: Your account role (${role}) cannot access this section.`, 'danger');
            const defaultView = roleAllowedViews[role][0];
            if (viewName !== defaultView) switchNav(defaultView);
            return;
        }
    }

    if (window.livePollInterval) clearInterval(window.livePollInterval);
    if (window.activeQrTimer) clearInterval(window.activeQrTimer);
    if (window.qrScannerInstance && viewName !== 'student-scanner') {
        try { window.qrScannerInstance.stop(); } catch(e){}
    }

    // Highlight active sidebar item
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    const activeNav = document.querySelector(`.nav-item[data-view="${viewName}"]`);
    if (activeNav) activeNav.classList.add('active');

    const heading = document.getElementById('page-heading');
    const subheading = document.getElementById('page-subheading');

    switch (viewName) {
        // ADMIN VIEWS
        case 'admin-dashboard':
            heading.innerText = 'Admin Dashboard';
            subheading.innerText = 'System overview and attendance statistics';
            renderAdminDashboard();
            break;
        case 'admin-students':
            heading.innerText = 'Manage Students';
            subheading.innerText = 'Add, edit, or remove student accounts';
            renderAdminStudents();
            break;
        case 'admin-teachers':
            heading.innerText = 'Manage Teachers';
            subheading.innerText = 'Add, edit, or remove faculty accounts';
            renderAdminTeachers();
            break;
        case 'admin-attendance':
            heading.innerText = 'Admin Attendance Records';
            subheading.innerText = 'View, search, and filter all system attendance records';
            if (typeof renderAdminAttendance === 'function') renderAdminAttendance();
            break;
        case 'admin-subjects':
            heading.innerText = 'Manage Subjects';
            subheading.innerText = 'Assign subjects to course programs and teachers';
            renderAdminSubjects();
            break;
        case 'admin-sections':
            heading.innerText = 'Manage Class Sections';
            subheading.innerText = 'Add, edit, or remove academic class sections';
            renderAdminSections();
            break;
        case 'admin-enrollments':
            heading.innerText = 'Student Enrollments';
            subheading.innerText = 'Enroll students into subjects and sections';
            renderAdminEnrollments();
            break;

        // TEACHER VIEWS
        case 'teacher-dashboard':
            heading.innerText = 'Teacher Portal';
            subheading.innerText = 'View assigned classes and manage QR attendance sessions';
            renderTeacherDashboard();
            break;
        case 'teacher-attendance':
            heading.innerText = 'Class Attendance Records';
            subheading.innerText = 'View and filter attendance logs for your authorized sessions';
            if (typeof renderTeacherAttendance === 'function') renderTeacherAttendance();
            break;
        case 'teacher-profile':
            heading.innerText = 'Teacher Profile';
            subheading.innerText = 'View your faculty account details and department info';
            renderTeacherProfile();
            break;

        // STUDENT VIEWS
        case 'student-dashboard':
            heading.innerText = 'Student Portal';
            subheading.innerText = 'Track your attendance records and enrolled subjects';
            renderStudentDashboard();
            break;
        case 'student-profile':
            heading.innerText = 'Student Profile';
            subheading.innerText = 'View your academic account and enrollment details';
            renderStudentProfile();
            break;
        case 'student-scanner':
            heading.innerText = 'Scan QR Attendance';
            subheading.innerText = 'Use your camera to scan your teacher\'s QR code';
            renderStudentScanner();
            break;
        case 'student-history':
            heading.innerText = 'My Attendance History';
            subheading.innerText = 'Complete record log of all your scanned classes';
            renderStudentHistory();
            break;

        // SHARED REPORTS VIEW
        case 'reports':
            heading.innerText = 'Attendance Reports';
            subheading.innerText = 'Generate and export comprehensive attendance reports and summary statistics';
            renderReportsView();
            break;

        // SETTINGS & ACCESSIBILITY VIEW
        case 'settings':
            heading.innerText = 'Settings & Accessibility';
            subheading.innerText = 'Customize system theme mode and text display preferences';
            renderSettingsView();
            break;

        default:
            if (role === 'teacher') switchNav('teacher-dashboard');
            else if (role === 'student') switchNav('student-dashboard');
            else switchNav('admin-dashboard');
    }
}

// Render Navigation Items Based on Logged-In User Role
function setupSidebarNav() {
    const role = window.currentUser.role;
    const nav = document.getElementById('sidebar-nav');
    
    document.getElementById('user-display-name').innerText = window.currentUser.username;
    document.getElementById('user-display-role').innerText = role.toUpperCase();
    document.getElementById('user-avatar').innerText = window.currentUser.username.charAt(0).toUpperCase();
    document.getElementById('role-badge').innerText = role.toUpperCase();

    let items = [];

    if (role === 'admin') {
        items = [
            { view: 'admin-dashboard', label: 'Dashboard', icon: 'fa-gauge' },
            { view: 'admin-students', label: 'Students', icon: 'fa-user-graduate' },
            { view: 'admin-teachers', label: 'Faculty / Teachers', icon: 'fa-chalkboard-user' },
            { view: 'admin-attendance', label: 'Attendance Records', icon: 'fa-clipboard-user' },
            { view: 'reports', label: 'Attendance Reports', icon: 'fa-file-invoice' },
            { view: 'admin-subjects', label: 'Subjects Directory', icon: 'fa-book' },
            { view: 'admin-sections', label: 'Class Sections', icon: 'fa-layer-group' },
            { view: 'admin-enrollments', label: 'Student Enrollments', icon: 'fa-user-check' },
            { view: 'settings', label: 'Settings', icon: 'fa-gear' }
        ];
    } else if (role === 'teacher') {
        items = [
            { view: 'teacher-dashboard', label: 'Dashboard', icon: 'fa-gauge' },
            { view: 'teacher-attendance', label: 'Attendance Records', icon: 'fa-clipboard-user' },
            { view: 'reports', label: 'Class Reports', icon: 'fa-chart-line' },
            { view: 'teacher-profile', label: 'My Profile', icon: 'fa-id-card' },
            { view: 'settings', label: 'Settings', icon: 'fa-gear' }
        ];
    } else if (role === 'student') {
        items = [
            { view: 'student-dashboard', label: 'Dashboard', icon: 'fa-house' },
            { view: 'student-scanner', label: 'Scan QR Attendance', icon: 'fa-camera' },
            { view: 'student-history', label: 'Attendance History', icon: 'fa-clock-rotate-left' },
            { view: 'student-profile', label: 'My Profile', icon: 'fa-id-card' },
            { view: 'settings', label: 'Settings', icon: 'fa-gear' }
        ];
    }

    nav.innerHTML = items.map(item => `
        <a class="nav-item" data-view="${item.view}" onclick="switchNav('${item.view}')">
            <i class="fa-solid ${item.icon}"></i>
            <span>${item.label}</span>
        </a>
    `).join('');

    // Default view
    if (role === 'admin') switchNav('admin-dashboard');
    else if (role === 'teacher') switchNav('teacher-dashboard');
    else if (role === 'student') switchNav('student-dashboard');
}

// Show/Hide Unauthenticated vs Authenticated Layouts
function showAppView() {
    document.getElementById('auth-container').style.display = 'none';
    document.getElementById('app-container').style.display = 'flex';
    if (window.currentUser) {
        applyUserPreferences(window.currentUser.username);
    }
    setupSidebarNav();
}

function showLoginView() {
    document.getElementById('app-container').style.display = 'none';
    document.getElementById('auth-container').style.display = 'flex';
    applyUserPreferences('default');
}


// Global API Fetch Helper
async function apiFetch(url, method = 'GET', body = null) {
    const token = localStorage.getItem('token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);

    const fullUrl = typeof getApiUrl === 'function' ? getApiUrl(url) : url;
    const res = await fetch(fullUrl, options);
    if (res.status === 401 || res.status === 403) {
        // If unauthorized, logout
        if (res.status === 401 && !url.includes('/api/auth/me')) {
            logout();
        }
    }
    return await res.json();
}

// Toast Notification Manager
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = 'fa-circle-info';
    if (type === 'success') icon = 'fa-circle-check';
    if (type === 'danger') icon = 'fa-circle-xmark';
    if (type === 'warning') icon = 'fa-triangle-exclamation';

    toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${escapeHtml(message)}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 4000);
}

// Modal Form Manager
function openModal(title, htmlContent) {
    document.getElementById('modal-title').innerText = title;
    document.getElementById('modal-body').innerHTML = htmlContent;
    document.getElementById('form-modal').classList.add('active');
}

function closeModal() {
    document.getElementById('form-modal').classList.remove('active');
}

// HTML XSS Escaper Helper
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Shared Attendance Reports Controller (Filtering by Date, Subject, Section, Teacher, Status, Export CSV & Print)
async function renderReportsView() {
    const role = window.currentUser ? window.currentUser.role : 'student';
    const content = document.getElementById('view-content');

    content.innerHTML = `
        <div class="card no-print">
            <div class="card-header">
                <h3><i class="fa-solid fa-filter"></i> Attendance Reports & Filters</h3>
            </div>
            <div class="card-body">
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px; margin-bottom: 16px;">
                    <div class="form-group" style="margin-bottom: 0;">
                        <label>Date Range Presets</label>
                        <select id="rep-filter-range" class="form-control" onchange="toggleCustomDates()">
                            <option value="">All Time</option>
                            <option value="daily">Today (Daily)</option>
                            <option value="weekly">Last 7 Days (Weekly)</option>
                            <option value="monthly">Last 30 Days (Monthly)</option>
                            <option value="custom">Custom Date Range...</option>
                        </select>
                    </div>

                    <div class="form-group custom-date-group" style="margin-bottom: 0; display: none;">
                        <label>Date From</label>
                        <input type="date" id="rep-filter-from" class="form-control">
                    </div>

                    <div class="form-group custom-date-group" style="margin-bottom: 0; display: none;">
                        <label>Date To</label>
                        <input type="date" id="rep-filter-to" class="form-control">
                    </div>

                    <div class="form-group" style="margin-bottom: 0;">
                        <label>Subject</label>
                        <select id="rep-filter-subject" class="form-control">
                            <option value="">All Subjects</option>
                        </select>
                    </div>

                    <div class="form-group" style="margin-bottom: 0;">
                        <label>Section</label>
                        <select id="rep-filter-section" class="form-control">
                            <option value="">All Sections</option>
                        </select>
                    </div>

                    ${role === 'admin' ? `
                    <div class="form-group" style="margin-bottom: 0;">
                        <label>Teacher</label>
                        <select id="rep-filter-teacher" class="form-control">
                            <option value="">All Faculty</option>
                        </select>
                    </div>
                    ` : ''}

                    <div class="form-group" style="margin-bottom: 0;">
                        <label>Status</label>
                        <select id="rep-filter-status" class="form-control">
                            <option value="">All Statuses</option>
                            <option value="Present">Present</option>
                            <option value="Late">Late</option>
                            <option value="Absent">Absent</option>
                        </select>
                    </div>

                    <div class="form-group" style="margin-bottom: 0;">
                        <label>Search Student</label>
                        <input type="text" id="rep-filter-search" class="form-control" placeholder="Student name or code...">
                    </div>
                </div>

                <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                    <button class="btn btn-primary" onclick="fetchFilteredReports()"><i class="fa-solid fa-magnifying-glass"></i> Apply Filters</button>
                    <button class="btn btn-secondary" onclick="resetReportFilters()"><i class="fa-solid fa-rotate-left"></i> Reset</button>
                    <button class="btn btn-success" style="margin-left: auto;" onclick="downloadCSVReport()"><i class="fa-solid fa-file-excel"></i> Export CSV</button>
                    <button class="btn btn-secondary" onclick="window.print()"><i class="fa-solid fa-print"></i> Print Report</button>
                </div>
            </div>
        </div>

        <div class="stats-grid" id="report-summary-grid">
            <div class="stat-card">
                <div class="stat-icon blue"><i class="fa-solid fa-list-check"></i></div>
                <div class="stat-details">
                    <h3 id="rep-total">0</h3>
                    <p>Total Attendance Logged</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon green"><i class="fa-solid fa-user-check"></i></div>
                <div class="stat-details">
                    <h3 id="rep-present">0</h3>
                    <p>Present Count</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon amber"><i class="fa-solid fa-clock"></i></div>
                <div class="stat-details">
                    <h3 id="rep-late">0</h3>
                    <p>Late Count</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon purple"><i class="fa-solid fa-chart-line"></i></div>
                <div class="stat-details">
                    <h3 id="rep-rate">0%</h3>
                    <p>Overall Attendance Rate</p>
                </div>
            </div>
        </div>

        <div class="card">
            <div class="card-header">
                <h3><i class="fa-solid fa-table"></i> Attendance Records Log</h3>
            </div>
            <div class="card-body table-responsive">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Student Code</th>
                            <th>Student Name</th>
                            <th>Course & Section</th>
                            <th>Subject</th>
                            <th>Teacher</th>
                            <th>Scanned Date & Time</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody id="report-records-tbody">
                        <tr><td colspan="7">Loading report records...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;

    // Load filter options (subjects, sections, teachers)
    try {
        const optRes = await apiFetch('/api/reports/filters');
        if (optRes && optRes.success) {
            const subSel = document.getElementById('rep-filter-subject');
            const secSel = document.getElementById('rep-filter-section');
            const teachSel = document.getElementById('rep-filter-teacher');

            if (subSel && optRes.subjects) {
                optRes.subjects.forEach(s => {
                    subSel.innerHTML += `<option value="${s.id}">${escapeHtml(s.subject_code)} - ${escapeHtml(s.subject_name)}</option>`;
                });
            }
            if (secSel && optRes.sections) {
                optRes.sections.forEach(sec => {
                    secSel.innerHTML += `<option value="${sec.id}">${escapeHtml(sec.course_code || '')} : ${escapeHtml(sec.section_name)}</option>`;
                });
            }
            if (teachSel && optRes.teachers) {
                optRes.teachers.forEach(t => {
                    teachSel.innerHTML += `<option value="${t.id}">Prof. ${escapeHtml(t.first_name)} ${escapeHtml(t.last_name)}</option>`;
                });
            }
        }
    } catch(e) {}

    fetchFilteredReports();
}

function toggleCustomDates() {
    const range = document.getElementById('rep-filter-range').value;
    const customGroups = document.querySelectorAll('.custom-date-group');
    customGroups.forEach(g => g.style.display = (range === 'custom' ? 'block' : 'none'));
}

function resetReportFilters() {
    document.getElementById('rep-filter-range').value = '';
    toggleCustomDates();
    if (document.getElementById('rep-filter-from')) document.getElementById('rep-filter-from').value = '';
    if (document.getElementById('rep-filter-to')) document.getElementById('rep-filter-to').value = '';
    document.getElementById('rep-filter-subject').value = '';
    document.getElementById('rep-filter-section').value = '';
    if (document.getElementById('rep-filter-teacher')) document.getElementById('rep-filter-teacher').value = '';
    document.getElementById('rep-filter-status').value = '';
    document.getElementById('rep-filter-search').value = '';
    fetchFilteredReports();
}

async function fetchFilteredReports() {
    const range = document.getElementById('rep-filter-range') ? document.getElementById('rep-filter-range').value : '';
    const dateFrom = document.getElementById('rep-filter-from') ? document.getElementById('rep-filter-from').value : '';
    const dateTo = document.getElementById('rep-filter-to') ? document.getElementById('rep-filter-to').value : '';
    const subjectId = document.getElementById('rep-filter-subject') ? document.getElementById('rep-filter-subject').value : '';
    const sectionId = document.getElementById('rep-filter-section') ? document.getElementById('rep-filter-section').value : '';
    const teacherId = document.getElementById('rep-filter-teacher') ? document.getElementById('rep-filter-teacher').value : '';
    const status = document.getElementById('rep-filter-status') ? document.getElementById('rep-filter-status').value : '';
    const search = document.getElementById('rep-filter-search') ? document.getElementById('rep-filter-search').value : '';

    let queryParams = [];
    if (range && range !== 'custom') queryParams.push(`range=${encodeURIComponent(range)}`);
    if (range === 'custom' && dateFrom && dateTo) {
        queryParams.push(`date_from=${encodeURIComponent(dateFrom)}`);
        queryParams.push(`date_to=${encodeURIComponent(dateTo)}`);
    }
    if (subjectId) queryParams.push(`subject_id=${encodeURIComponent(subjectId)}`);
    if (sectionId) queryParams.push(`section_id=${encodeURIComponent(sectionId)}`);
    if (teacherId) queryParams.push(`teacher_id=${encodeURIComponent(teacherId)}`);
    if (status) queryParams.push(`status=${encodeURIComponent(status)}`);
    if (search) queryParams.push(`search=${encodeURIComponent(search)}`);

    const url = '/api/reports/data?' + queryParams.join('&');

    try {
        const res = await apiFetch(url);
        const tbody = document.getElementById('report-records-tbody');

        if (res && res.success) {
            document.getElementById('rep-total').innerText = res.summary.totalRecords;
            document.getElementById('rep-present').innerText = res.summary.presentCount;
            document.getElementById('rep-late').innerText = res.summary.lateCount;
            document.getElementById('rep-rate').innerText = res.summary.overallRate + '%';

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
            if (tbody) tbody.innerHTML = '<tr><td colspan="7" class="text-danger">Failed to load reports data.</td></tr>';
        }
    } catch (e) {
        console.error('Fetch reports error:', e);
    }
}

function downloadCSVReport() {
    const range = document.getElementById('rep-filter-range') ? document.getElementById('rep-filter-range').value : '';
    const dateFrom = document.getElementById('rep-filter-from') ? document.getElementById('rep-filter-from').value : '';
    const dateTo = document.getElementById('rep-filter-to') ? document.getElementById('rep-filter-to').value : '';
    const subjectId = document.getElementById('rep-filter-subject') ? document.getElementById('rep-filter-subject').value : '';
    const sectionId = document.getElementById('rep-filter-section') ? document.getElementById('rep-filter-section').value : '';
    const teacherId = document.getElementById('rep-filter-teacher') ? document.getElementById('rep-filter-teacher').value : '';
    const status = document.getElementById('rep-filter-status') ? document.getElementById('rep-filter-status').value : '';
    const search = document.getElementById('rep-filter-search') ? document.getElementById('rep-filter-search').value : '';

    let queryParams = [];
    if (range && range !== 'custom') queryParams.push(`range=${encodeURIComponent(range)}`);
    if (range === 'custom' && dateFrom && dateTo) {
        queryParams.push(`date_from=${encodeURIComponent(dateFrom)}`);
        queryParams.push(`date_to=${encodeURIComponent(dateTo)}`);
    }
    if (subjectId) queryParams.push(`subject_id=${encodeURIComponent(subjectId)}`);
    if (sectionId) queryParams.push(`section_id=${encodeURIComponent(sectionId)}`);
    if (teacherId) queryParams.push(`teacher_id=${encodeURIComponent(teacherId)}`);
    if (status) queryParams.push(`status=${encodeURIComponent(status)}`);
    if (search) queryParams.push(`search=${encodeURIComponent(search)}`);

    const url = '/api/reports/export/csv?' + queryParams.join('&');
    window.location.href = url;
}

// ---------------------------------------------------------
// SETTINGS & ACCESSIBILITY CONTROLLER
// ---------------------------------------------------------
function renderSettingsView() {
    const username = window.currentUser ? window.currentUser.username : 'default';
    const currentPrefs = applyUserPreferences(username);

    let activeTheme = currentPrefs.theme || 'light';
    let activeSize = currentPrefs.textSize || 'normal';

    const content = document.getElementById('view-content');
    content.innerHTML = `
        <div class="card settings-card" style="max-width: 720px; margin: 0 auto;">
            <div class="card-header">
                <h3><i class="fa-solid fa-sliders"></i> System Settings & Accessibility</h3>
            </div>
            <div class="card-body">
                
                <!-- SECTION 1: APPEARANCE THEME -->
                <div style="margin-bottom: 28px;">
                    <h4 style="font-size: 16px; font-weight: 700; margin-bottom: 6px;"><i class="fa-solid fa-palette"></i> Appearance</h4>
                    <p style="font-size: 13px; color: var(--slate-600); margin-bottom: 14px;">Select your preferred display theme for the application user interface.</p>
                    
                    <div style="font-weight: 600; font-size: 13px; margin-bottom: 8px;">Theme Mode:</div>
                    <div class="theme-selector-grid">
                        <button type="button" class="theme-option-btn ${activeTheme === 'light' ? 'active' : ''}" onclick="selectThemeOption('light')">
                            <i class="fa-solid fa-sun" style="font-size: 22px; margin-bottom: 6px; display: block; color: #f59e0b;"></i>
                            Light Mode
                        </button>
                        <button type="button" class="theme-option-btn ${activeTheme === 'dark' ? 'active' : ''}" onclick="selectThemeOption('dark')">
                            <i class="fa-solid fa-moon" style="font-size: 22px; margin-bottom: 6px; display: block; color: #818cf8;"></i>
                            Dark Mode
                        </button>
                    </div>
                </div>

                <!-- SECTION 2: ACCESSIBILITY TEXT SIZE -->
                <div style="margin-bottom: 28px; padding-top: 20px; border-top: 1px solid var(--slate-200);">
                    <h4 style="font-size: 16px; font-weight: 700; margin-bottom: 6px;"><i class="fa-solid fa-universal-access"></i> Accessibility</h4>
                    <p style="font-size: 13px; color: var(--slate-600); margin-bottom: 14px;">Adjust the system text display size for enhanced readability across all views.</p>
                    
                    <div style="font-weight: 600; font-size: 13px; margin-bottom: 8px;">Text Size Options:</div>
                    <div class="size-selector-grid">
                        <button type="button" class="size-option-btn ${activeSize === 'small' ? 'active' : ''}" onclick="selectSizeOption('small')">
                            <span style="font-size: 12px; font-weight: 800; display: block; margin-bottom: 4px;">A−</span>
                            Small (90%)
                        </button>
                        <button type="button" class="size-option-btn ${activeSize === 'normal' ? 'active' : ''}" onclick="selectSizeOption('normal')">
                            <span style="font-size: 15px; font-weight: 800; display: block; margin-bottom: 4px;">A</span>
                            Normal (100%)
                        </button>
                        <button type="button" class="size-option-btn ${activeSize === 'large' ? 'active' : ''}" onclick="selectSizeOption('large')">
                            <span style="font-size: 19px; font-weight: 800; display: block; margin-bottom: 4px;">A+</span>
                            Large (115%)
                        </button>
                    </div>
                </div>

                <!-- SECTION 3: LIVE INTERACTIVE PREVIEW BOX -->
                <div style="margin-bottom: 28px;">
                    <div style="font-weight: 600; font-size: 13px; margin-bottom: 8px;"><i class="fa-solid fa-eye"></i> Live Theme & Text Preview:</div>
                    <div class="preview-box">
                        <h4 style="margin-bottom: 6px;">QR Attendance Portal Sample Card</h4>
                        <p style="margin-bottom: 12px;">This live preview box updates instantly to reflect your selected Theme and Text Size preferences across buttons, inputs, labels, and badges.</p>
                        <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
                            <span class="badge badge-success"><i class="fa-solid fa-check"></i> Present</span>
                            <span class="badge badge-warning"><i class="fa-solid fa-clock"></i> Late</span>
                            <span class="badge badge-danger"><i class="fa-solid fa-xmark"></i> Absent</span>
                            <button class="btn btn-primary" style="margin-left: auto;" onclick="showToast('Sample button clicked!', 'info')"><i class="fa-solid fa-check"></i> Sample Button</button>
                        </div>
                    </div>
                </div>

                <!-- SECTION 4: SAVE & RESET PREFERENCES BUTTONS -->
                <div style="padding-top: 16px; border-top: 1px solid var(--slate-200); display: flex; gap: 12px; justify-content: flex-end; flex-wrap: wrap;">
                    <button class="btn btn-secondary" onclick="resetSettingsView()"><i class="fa-solid fa-rotate-left"></i> Reset Defaults</button>
                    <button class="btn btn-primary" onclick="saveCurrentPreferences()"><i class="fa-solid fa-floppy-disk"></i> Save Preferences</button>
                </div>

            </div>
        </div>
    `;

    window.tempSelectedTheme = activeTheme;
    window.tempSelectedSize = activeSize;
}

function selectThemeOption(theme) {
    window.tempSelectedTheme = theme;
    document.querySelectorAll('.theme-option-btn').forEach(btn => btn.classList.remove('active'));
    
    const btns = document.querySelectorAll('.theme-option-btn');
    if (theme === 'light' && btns[0]) btns[0].classList.add('active');
    if (theme === 'dark' && btns[1]) btns[1].classList.add('active');

    // Immediate Theme Switching (no refresh required)
    if (theme === 'dark') {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
}

function selectSizeOption(size) {
    window.tempSelectedSize = size;
    document.querySelectorAll('.size-option-btn').forEach(btn => btn.classList.remove('active'));

    const btns = document.querySelectorAll('.size-option-btn');
    if (size === 'small' && btns[0]) btns[0].classList.add('active');
    if (size === 'normal' && btns[1]) btns[1].classList.add('active');
    if (size === 'large' && btns[2]) btns[2].classList.add('active');

    // Immediate Text Size Switching (no refresh required)
    document.body.classList.remove('text-small', 'text-normal', 'text-large');
    document.body.classList.add('text-' + size);
}

function saveCurrentPreferences() {
    try {
        const username = window.currentUser ? window.currentUser.username : 'default';
        const prefs = {
            theme: window.tempSelectedTheme || 'light',
            textSize: window.tempSelectedSize || 'normal'
        };
        localStorage.setItem('qr_prefs_' + username, JSON.stringify(prefs));
        applyUserPreferences(username);
        showToast('Preferences saved successfully!', 'success');
    } catch (err) {
        console.error('Save preferences error:', err);
        showToast('Unable to save preferences. Please try again.', 'danger');
    }
}

function resetSettingsView() {
    window.tempSelectedTheme = 'light';
    window.tempSelectedSize = 'normal';
    selectThemeOption('light');
    selectSizeOption('normal');
    saveCurrentPreferences();
}


