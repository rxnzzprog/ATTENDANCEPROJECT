// Teacher Dashboard Controller
async function renderTeacherDashboard() {
    const content = document.getElementById('view-content');
    content.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h3><i class="fa-solid fa-chalkboard-user"></i> My Assigned Subjects & Classes</h3>
                <button class="btn btn-primary" onclick="openStartSessionModal()"><i class="fa-solid fa-qrcode"></i> Start QR Session</button>
            </div>
            <div class="card-body">
                <div id="assigned-classes-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px;">
                    <p>Loading assigned subjects...</p>
                </div>
            </div>
        </div>

        <div id="active-session-wrapper"></div>
    `;

    try {
        const res = await apiFetch('/api/teacher/classes');
        const grid = document.getElementById('assigned-classes-grid');

        if (res && res.success) {
            if (res.subjects.length === 0) {
                grid.innerHTML = '<p>No subjects currently assigned to you.</p>';
                return;
            }

            grid.innerHTML = res.subjects.map(s => `
                <div style="background: var(--slate-50); border: 1px solid var(--slate-200); border-radius: var(--radius-md); padding: 20px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                        <span class="badge badge-info">${escapeHtml(s.course_code)}</span>
                        <span style="font-weight: 700; color: var(--primary); font-size: 14px;">${escapeHtml(s.subject_code)}</span>
                    </div>
                    <h4 style="font-size: 16px; font-weight: 700; margin-bottom: 6px;">${escapeHtml(s.subject_name)}</h4>
                    <p style="font-size: 13px; color: var(--slate-600); margin-bottom: 16px;">Assigned Faculty: ${window.currentUser.username}</p>
                    <button class="btn btn-primary btn-block" onclick="openStartSessionModal(${s.id})">
                        <i class="fa-solid fa-play"></i> Launch QR Code Session
                    </button>
                </div>
            `).join('');
        }
    } catch(e) {
        console.error(e);
    }
}

// Render Teacher Profile Details
async function renderTeacherProfile() {
    const content = document.getElementById('view-content');
    content.innerHTML = `
        <div class="card" style="max-width: 650px; margin: 0 auto;">
            <div class="card-header">
                <h3><i class="fa-solid fa-id-card"></i> Faculty Profile</h3>
            </div>
            <div class="card-body" id="teacher-profile-body">
                <p>Loading profile information...</p>
            </div>
        </div>
    `;

    try {
        const res = await apiFetch('/api/teacher/profile');
        const container = document.getElementById('teacher-profile-body');

        if (res && res.success && res.profile) {
            const p = res.profile;
            container.innerHTML = `
                <div style="display: flex; align-items: center; gap: 20px; margin-bottom: 24px; padding-bottom: 20px; border-bottom: 1px solid var(--slate-200);">
                    <div style="width: 70px; height: 70px; border-radius: 50%; background: linear-gradient(135deg, var(--primary), var(--secondary)); color: white; display: flex; align-items: center; justify-content: center; font-size: 28px; font-weight: 800;">
                        ${escapeHtml((p.first_name || 'T').charAt(0))}
                    </div>
                    <div>
                        <h2 style="font-size: 22px; font-weight: 800; color: var(--slate-900);">Prof. ${escapeHtml(p.first_name)} ${escapeHtml(p.last_name)}</h2>
                        <span class="badge badge-info">${escapeHtml(p.teacher_code)}</span>
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px;">
                    <div style="background: var(--slate-50); padding: 14px; border-radius: var(--radius-sm); border: 1px solid var(--slate-200);">
                        <span style="font-size: 12px; color: var(--slate-600); display: block;">Username</span>
                        <strong style="font-size: 15px; color: var(--slate-900);">${escapeHtml(p.username)}</strong>
                    </div>
                    <div style="background: var(--slate-50); padding: 14px; border-radius: var(--radius-sm); border: 1px solid var(--slate-200);">
                        <span style="font-size: 12px; color: var(--slate-600); display: block;">Email Address</span>
                        <strong style="font-size: 15px; color: var(--slate-900);">${escapeHtml(p.email)}</strong>
                    </div>
                    <div style="background: var(--slate-50); padding: 14px; border-radius: var(--radius-sm); border: 1px solid var(--slate-200); grid-column: 1 / -1;">
                        <span style="font-size: 12px; color: var(--slate-600); display: block;">Department / College</span>
                        <strong style="font-size: 15px; color: var(--slate-900);">${escapeHtml(p.department || 'College of Computer Studies')}</strong>
                    </div>
                </div>
            `;
        } else {
            container.innerHTML = '<p class="text-danger">Failed to load profile details.</p>';
        }
    } catch (e) {
        console.error(e);
    }
}

// Open Modal to Start QR Code Attendance Session
async function openStartSessionModal(preselectedSubjectId = null) {
    const res = await apiFetch('/api/teacher/classes');
    if (!res || !res.success) {
        showToast('Failed to load class list', 'danger');
        return;
    }

    const subjects = res.subjects || [];
    const sections = res.sections || [];

    if (subjects.length === 0 || sections.length === 0) {
        showToast('You must have assigned subjects and sections to start a session.', 'warning');
        return;
    }

    const subjectOptions = subjects.map(s => 
        `<option value="${s.id}" ${s.id == preselectedSubjectId ? 'selected' : ''}>${s.subject_code} - ${s.subject_name}</option>`
    ).join('');

    const sectionOptions = sections.map(sec => 
        `<option value="${sec.id}">${sec.course_code} : ${sec.section_name}</option>`
    ).join('');

    const html = `
        <form id="start-session-form">
            <div class="form-group">
                <label>Subject</label>
                <select id="m-sess-subject" class="form-control" required>${subjectOptions}</select>
            </div>
            <div class="form-group">
                <label>Class Section</label>
                <select id="m-sess-section" class="form-control" required>${sectionOptions}</select>
            </div>
            <div class="form-group">
                <label>QR Expiration Duration (Minutes)</label>
                <select id="m-sess-duration" class="form-control" required>
                    <option value="5">5 Minutes</option>
                    <option value="10" selected>10 Minutes</option>
                    <option value="15">15 Minutes</option>
                    <option value="30">30 Minutes</option>
                    <option value="60">1 Hour</option>
                </select>
            </div>
            <button type="submit" class="btn btn-primary btn-block">Generate QR Code</button>
        </form>
    `;

    openModal('Launch QR Attendance Session', html);

    document.getElementById('start-session-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
            subject_id: document.getElementById('m-sess-subject').value,
            section_id: document.getElementById('m-sess-section').value,
            duration_minutes: document.getElementById('m-sess-duration').value
        };

        const createRes = await apiFetch('/api/teacher/session/create', 'POST', payload);
        if (createRes && createRes.success) {
            showToast('Attendance Session Launched!', 'success');
            closeModal();
            renderActiveSessionView(createRes.session);
        } else {
            showToast(createRes.message || 'Failed to start session', 'danger');
        }
    });
}

// Display Live Session QR Code and Real-Time Student Scans
function renderActiveSessionView(session) {
    const content = document.getElementById('view-content');
    if (window.activeQrTimer) clearInterval(window.activeQrTimer);
    if (window.livePollInterval) clearInterval(window.livePollInterval);

    content.innerHTML = `
        <div class="qr-session-container">
            <div class="qr-card-display">
                <span class="badge badge-success"><i class="fa-solid fa-circle"></i> ACTIVE SESSION</span>
                <h2 style="font-size: 20px; font-weight: 800; margin-top: 10px;">Scan to Mark Attendance</h2>
                <div class="qr-image-wrapper">
                    <img src="${session.qrCodeUrl}" alt="Session QR Code">
                </div>
                <br>
                <div class="timer-badge">
                    <i class="fa-regular fa-clock"></i> Expires in: <span id="session-countdown">--:--</span>
                </div>
                <div style="margin-top: 20px;">
                    <button class="btn btn-danger btn-block" onclick="closeCurrentSession(${session.id})">
                        <i class="fa-solid fa-stop"></i> End Session Now
                    </button>
                </div>
            </div>

            <div class="card">
                <div class="card-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                    <div>
                        <h3 style="margin-bottom: 4px;"><i class="fa-solid fa-users"></i> Live Scanned Students</h3>
                        <span class="badge badge-success" style="font-size: 13px;">Present: <span id="scanned-present-count">0</span></span>
                        <span class="badge badge-info" style="font-size: 13px;">Total Scanned: <span id="scanned-count">0</span></span>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button class="btn btn-secondary" style="font-size: 12px;" onclick="window.refreshActiveSessionScans && window.refreshActiveSessionScans()">
                            <i class="fa-solid fa-rotate-right"></i> Refresh
                        </button>
                        <button class="btn btn-primary" style="font-size: 12px;" onclick="openManualMarkModal(${session.subjectId}, ${session.sectionId}, ${session.id})">
                            <i class="fa-solid fa-user-pen"></i> Manual Mark
                        </button>
                    </div>
                </div>
                <div class="card-body table-responsive">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Student ID</th>
                                <th>Student Name</th>
                                <th>Date</th>
                                <th>Time</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody id="scanned-students-tbody">
                            <tr><td colspan="5">Waiting for students to scan...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    // Start Live Countdown Timer
    const expiresAt = new Date(session.expiresAt).getTime();
    window.activeQrTimer = setInterval(() => {
        const now = new Date().getTime();
        const diff = expiresAt - now;

        if (diff <= 0) {
            clearInterval(window.activeQrTimer);
            document.getElementById('session-countdown').innerText = 'EXPIRED';
            showToast('Attendance Session Expired.', 'warning');
        } else {
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);
            document.getElementById('session-countdown').innerText = 
                `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
    }, 1000);

    // Start Live Polling for Scanned Students
    const pollScans = async () => {
        try {
            const res = await apiFetch(`/api/teacher/session/active?subject_id=${session.subjectId}&section_id=${session.sectionId}`);
            if (res && res.success && res.scannedStudents) {
                const totalScans = res.scannedStudents.length;
                const presentCount = res.scannedStudents.filter(s => s.status === 'Present').length;
                
                const countEl = document.getElementById('scanned-count');
                const presentEl = document.getElementById('scanned-present-count');
                if (countEl) countEl.innerText = totalScans;
                if (presentEl) presentEl.innerText = presentCount;

                const tbody = document.getElementById('scanned-students-tbody');
                if (tbody) {
                    if (res.scannedStudents.length === 0) {
                        tbody.innerHTML = '<tr><td colspan="5">No students have scanned yet.</td></tr>';
                    } else {
                        tbody.innerHTML = res.scannedStudents.map(st => {
                            const scanDate = st.scanned_at ? new Date(st.scanned_at) : new Date();
                            const formattedDate = scanDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
                            const formattedTime = scanDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                            
                            return `
                                <tr>
                                    <td><strong>${escapeHtml(st.student_code || st.student_id)}</strong></td>
                                    <td>${escapeHtml(st.first_name)} ${escapeHtml(st.last_name)}</td>
                                    <td>${formattedDate}</td>
                                    <td>${formattedTime}</td>
                                    <td><span class="badge ${st.status === 'Present' ? 'badge-success' : 'badge-warning'}">${st.status}</span></td>
                                </tr>
                            `;
                        }).join('');
                    }
                }
            }
        } catch(e) {}
    };

    window.refreshActiveSessionScans = pollScans;
    pollScans();
    window.livePollInterval = setInterval(pollScans, 3000);
}

async function closeCurrentSession(sessionId) {
    if (!confirm('Are you sure you want to end this attendance session?')) return;
    const res = await apiFetch(`/api/teacher/session/${sessionId}/close`, 'PUT');
    if (res && res.success) {
        if (window.activeQrTimer) clearInterval(window.activeQrTimer);
        if (window.livePollInterval) clearInterval(window.livePollInterval);
        showToast('Session ended.', 'info');
        renderTeacherDashboard();
    }
}

async function openManualMarkModal(subjectId, sectionId, sessionId) {
    const res = await apiFetch(`/api/teacher/session/active?subject_id=${subjectId}&section_id=${sectionId}`);
    if (!res || !res.enrolledStudents) {
        showToast('Could not load enrolled students', 'danger');
        return;
    }

    const studentOptions = res.enrolledStudents.map(st => `<option value="${st.student_id}">${st.student_code} - ${st.first_name} ${st.last_name}</option>`).join('');

    const html = `
        <form id="manual-mark-form">
            <div class="form-group">
                <label>Select Student</label>
                <select id="m-man-student" class="form-control" required>${studentOptions}</select>
            </div>
            <div class="form-group">
                <label>Attendance Status</label>
                <select id="m-man-status" class="form-control" required>
                    <option value="Present">Present</option>
                    <option value="Late">Late</option>
                    <option value="Absent">Absent</option>
                </select>
            </div>
            <div class="form-group">
                <label>Remarks</label>
                <input type="text" id="m-man-remarks" class="form-control" value="Manually marked by Teacher">
            </div>
            <button type="submit" class="btn btn-primary btn-block">Save Attendance</button>
        </form>
    `;

    openModal('Manual Student Attendance Override', html);

    document.getElementById('manual-mark-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
            session_id: sessionId,
            student_id: document.getElementById('m-man-student').value,
            status: document.getElementById('m-man-status').value,
            remarks: document.getElementById('m-man-remarks').value
        };

        const markRes = await apiFetch('/api/teacher/attendance/manual', 'POST', payload);
        if (markRes && markRes.success) {
            showToast('Attendance recorded manually!', 'success');
            closeModal();
        } else {
            showToast(markRes.message || 'Error updating attendance', 'danger');
        }
    });
}

// Render Teacher Attendance Records Management View
async function renderTeacherAttendance() {
    const content = document.getElementById('view-content');
    content.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h3><i class="fa-solid fa-clipboard-user"></i> Class Attendance Records</h3>
            </div>
            <div class="card-body">
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px; margin-bottom: 16px;">
                    <div class="form-group" style="margin-bottom: 0;">
                        <label>Search Student</label>
                        <input type="text" id="t-att-search" class="form-control" placeholder="Student name or ID...">
                    </div>
                    <div class="form-group" style="margin-bottom: 0;">
                        <label>Subject</label>
                        <select id="t-att-subject" class="form-control">
                            <option value="">All Subjects</option>
                        </select>
                    </div>
                    <div class="form-group" style="margin-bottom: 0;">
                        <label>Class Section</label>
                        <select id="t-att-section" class="form-control">
                            <option value="">All Sections</option>
                        </select>
                    </div>
                    <div class="form-group" style="margin-bottom: 0;">
                        <label>Status</label>
                        <select id="t-att-status" class="form-control">
                            <option value="">All Statuses</option>
                            <option value="Present">Present</option>
                            <option value="Late">Late</option>
                            <option value="Absent">Absent</option>
                        </select>
                    </div>
                    <div class="form-group" style="margin-bottom: 0;">
                        <label>Date From</label>
                        <input type="date" id="t-att-date-from" class="form-control">
                    </div>
                    <div class="form-group" style="margin-bottom: 0;">
                        <label>Date To</label>
                        <input type="date" id="t-att-date-to" class="form-control">
                    </div>
                </div>

                <div style="display: flex; gap: 10px; margin-bottom: 20px;">
                    <button class="btn btn-primary" onclick="fetchTeacherAttendance()"><i class="fa-solid fa-magnifying-glass"></i> Filter Records</button>
                    <button class="btn btn-secondary" onclick="resetTeacherAttendanceFilters()"><i class="fa-solid fa-rotate-left"></i> Reset</button>
                </div>

                <div class="stats-grid" style="margin-bottom: 24px;">
                    <div class="stat-card">
                        <div class="stat-icon green"><i class="fa-solid fa-user-check"></i></div>
                        <div class="stat-details">
                            <h3 id="t-stat-present">0</h3>
                            <p>Total Students Present</p>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon amber"><i class="fa-solid fa-clock"></i></div>
                        <div class="stat-details">
                            <h3 id="t-stat-late">0</h3>
                            <p>Total Students Late</p>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon red" style="background: #fee2e2; color: #dc2626;"><i class="fa-solid fa-user-xmark"></i></div>
                        <div class="stat-details">
                            <h3 id="t-stat-absent">0</h3>
                            <p>Total Students Absent</p>
                        </div>
                    </div>
                </div>

                <div class="table-responsive">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Student ID</th>
                                <th>Student Name</th>
                                <th>Subject</th>
                                <th>Section</th>
                                <th>Date</th>
                                <th>Time</th>
                                <th>Status</th>
                                <th>Remarks</th>
                            </tr>
                        </thead>
                        <tbody id="t-attendance-tbody">
                            <tr><td colspan="8">Loading class attendance records...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    // Populate subject & section filter dropdowns for teacher
    try {
        const clsRes = await apiFetch('/api/teacher/classes');
        if (clsRes && clsRes.success) {
            const subSel = document.getElementById('t-att-subject');
            const secSel = document.getElementById('t-att-section');

            if (subSel && clsRes.subjects) {
                clsRes.subjects.forEach(s => {
                    subSel.innerHTML += `<option value="${s.id}">${escapeHtml(s.subject_code)} - ${escapeHtml(s.subject_name)}</option>`;
                });
            }
            if (secSel && clsRes.sections) {
                clsRes.sections.forEach(sec => {
                    secSel.innerHTML += `<option value="${sec.id}">${escapeHtml(sec.course_code || '')} : ${escapeHtml(sec.section_name)}</option>`;
                });
            }
        }
    } catch(e) {}

    fetchTeacherAttendance();
}

async function fetchTeacherAttendance() {
    const search = document.getElementById('t-att-search') ? document.getElementById('t-att-search').value : '';
    const subjectId = document.getElementById('t-att-subject') ? document.getElementById('t-att-subject').value : '';
    const sectionId = document.getElementById('t-att-section') ? document.getElementById('t-att-section').value : '';
    const status = document.getElementById('t-att-status') ? document.getElementById('t-att-status').value : '';
    const dateFrom = document.getElementById('t-att-date-from') ? document.getElementById('t-att-date-from').value : '';
    const dateTo = document.getElementById('t-att-date-to') ? document.getElementById('t-att-date-to').value : '';

    let params = [];
    if (search) params.push(`search=${encodeURIComponent(search)}`);
    if (subjectId) params.push(`subject_id=${encodeURIComponent(subjectId)}`);
    if (sectionId) params.push(`section_id=${encodeURIComponent(sectionId)}`);
    if (status) params.push(`status=${encodeURIComponent(status)}`);
    if (dateFrom) params.push(`date_from=${encodeURIComponent(dateFrom)}`);
    if (dateTo) params.push(`date_to=${encodeURIComponent(dateTo)}`);

    const url = '/api/teacher/attendance?' + params.join('&');

    try {
        const res = await apiFetch(url);
        const tbody = document.getElementById('t-attendance-tbody');

        if (res && res.success) {
            document.getElementById('t-stat-present').innerText = res.counts.present;
            document.getElementById('t-stat-late').innerText = res.counts.late;
            document.getElementById('t-stat-absent').innerText = res.counts.absent;

            if (!res.records || res.records.length === 0) {
                tbody.innerHTML = '<tr><td colspan="8">No attendance records found for your classes.</td></tr>';
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
                        <td>${escapeHtml(r.subject_code)} - ${escapeHtml(r.subject_name)}</td>
                        <td><span class="badge badge-info">${escapeHtml(r.section_name)}</span></td>
                        <td>${formattedDate}</td>
                        <td>${formattedTime}</td>
                        <td><span class="badge ${r.status === 'Present' ? 'badge-success' : (r.status === 'Late' ? 'badge-warning' : 'badge-danger')}">${r.status}</span></td>
                        <td><small>${escapeHtml(r.remarks || 'Scanned via QR Code')}</small></td>
                    </tr>
                `;
            }).join('');
        } else {
            if (tbody) tbody.innerHTML = '<tr><td colspan="8" class="text-danger">Failed to load attendance records.</td></tr>';
        }
    } catch(e) {
        console.error('Teacher attendance error:', e);
    }
}

function resetTeacherAttendanceFilters() {
    if (document.getElementById('t-att-search')) document.getElementById('t-att-search').value = '';
    if (document.getElementById('t-att-subject')) document.getElementById('t-att-subject').value = '';
    if (document.getElementById('t-att-section')) document.getElementById('t-att-section').value = '';
    if (document.getElementById('t-att-status')) document.getElementById('t-att-status').value = '';
    if (document.getElementById('t-att-date-from')) document.getElementById('t-att-date-from').value = '';
    if (document.getElementById('t-att-date-to')) document.getElementById('t-att-date-to').value = '';
    fetchTeacherAttendance();
}

